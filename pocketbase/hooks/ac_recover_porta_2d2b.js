// ════════════════════════════════════════════════════════════════════
// G32 — Hook TEMPORÁRIO de recuperação one-shot da Porta 2D.2B.
//
// Contém DUAS rotas routerAdd, ambas com $apis.requireAuth('users')
// como 4º argumento:
//   1. POST /backend/v1/integracao/ac/recover-2d2b        — executa
//   2. GET  /backend/v1/integracao/ac/recover-2d2b-status — read-only
//
// PRESERVAÇÕES:
//   - NÃO altera runner, health, evidence, validateCore, hooks de
//     imutabilidade, migrations, schema, frontend, testes.
//   - NÃO cria etapas; NÃO altera coleções de negócio.
//   - NÃO chama runner, webhook, rollback, ActiveCampaign.
//   - NÃO executa nenhuma rota, NÃO faz deploy, NÃO bump de versão.
//   - NÃO menciona "rollback parcial".
// ════════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════════
// ROTA 1/2 — POST /backend/v1/integracao/ac/recover-2d2b
// ════════════════════════════════════════════════════════════════════
routerAdd(
  'POST',
  '/backend/v1/integracao/ac/recover-2d2b',
  function (e) {
    // CONSTANTES HARDCODED (inline — top-level vars não são acessíveis em callbacks no JSVM)
    var RECOVER_EXEC_ID = '1y2v99dapopm5wla66iysd5wky1tnb8t'
    var RECOVER_LOCK_ID = 'ibc2cgk9u4hw5rf'
    var RECOVER_LOCK_KEY = 'ac_2d2b_execution_lock'
    var RECOVER_LATCH_KEY = 'ac_2d2b_recovery_executed'
    var RECOVER_WEBHOOK_KEY = 'ac_webhook_enabled'
    // ─── VERIFICAÇÃO DE SUPERADMIN (copiada literalmente do runner) ───
    var authId = e.auth ? e.auth.id : ''
    if (!authId) return e.unauthorizedError('Autenticacao necessaria')
    var isSA = false
    try {
      var p = $app.findRecordById('com_perfis', e.auth.getString('perfil_id'))
      if (p && p.getString('slug') === 'superadministrador') isSA = true
    } catch (_) {}
    if (!isSA) {
      try {
        var sp = $app.findFirstRecordByData('com_perfis', 'slug', 'superadministrador')
        var bnd = $app.findRecordsByFilter(
          'com_usuarios_equipes',
          "usuario_id = '" + authId + "' && perfil_id = '" + sp.id + "' && ativo = true",
          '',
          1,
          0,
        )
        if (bnd && bnd.length > 0) isSA = true
      } catch (_) {}
    }
    if (!isSA) return e.forbiddenError('Apenas superadministrador')

    // ─── Declaração ANTES da transação ───
    var estadoBefore = null
    var lockBefore = null

    var result = {}
    try {
      $app.runInTransaction(function (txApp) {
        // a. reler execução por ID exato
        var exec = txApp.findRecordById('com_execucoes_porta_2d2b', RECOVER_EXEC_ID)

        // b. reler lock por ID exato
        var lock = txApp.findRecordById('com_parametros', RECOVER_LOCK_ID)

        // c. reler ac_webhook_enabled
        var whFlag = txApp.findFirstRecordByData('com_parametros', 'chave', RECOVER_WEBHOOK_KEY)

        // d. reler ou criar trava one-shot
        var latchColl = txApp.findCollectionByNameOrId('com_parametros')
        var latch = null
        try {
          latch = txApp.findFirstRecordByData('com_parametros', 'chave', RECOVER_LATCH_KEY)
        } catch (_) {
          latch = null
        }
        if (latch && latch.getString('valor') === 'committed') {
          throw new Error('RECOVER_PRECONDITION: recovery latch already committed')
        }
        var latchRecord = null
        if (latch) {
          latchRecord = latch
        } else {
          var newLatch = new Record(latchColl)
          newLatch.set('chave', RECOVER_LATCH_KEY)
          newLatch.set('tipo', 'lock')
          newLatch.set('valor', 'pending')
          newLatch.set('ativo', true)
          newLatch.set('versao', 1)
          txApp.save(newLatch)
          latchRecord = newLatch
        }

        // e. PRECONDIÇÕES:
        // 1. execução.id exato
        if (exec.getString('id') !== RECOVER_EXEC_ID) {
          throw new Error('RECOVER_PRECONDITION: exec.id=' + exec.getString('id'))
        }
        // 2. execução.estado === 'running'
        if (exec.getString('estado') !== 'running') {
          throw new Error(
            'RECOVER_PRECONDITION: estado=' + exec.getString('estado') + ' (expected running)',
          )
        }
        // 3. lock.id exato
        if (lock.getString('id') !== RECOVER_LOCK_ID) {
          throw new Error('RECOVER_PRECONDITION: lock.id=' + lock.getString('id'))
        }
        // 4. lock.chave === 'ac_2d2b_execution_lock'
        if (lock.getString('chave') !== RECOVER_LOCK_KEY) {
          throw new Error('RECOVER_PRECONDITION: lock.chave=' + lock.getString('chave'))
        }
        // 5. lock.valor === 'locked'
        if (lock.getString('valor') !== 'locked') {
          throw new Error('RECOVER_PRECONDITION: lock.valor=' + lock.getString('valor'))
        }
        // 6. lock.ativo === true
        if (lock.getBool('ativo') !== true) {
          throw new Error('RECOVER_PRECONDITION: lock.ativo=' + lock.getBool('ativo'))
        }
        // 7. lock.versao === 1
        if (lock.getInt('versao') !== 1) {
          throw new Error('RECOVER_PRECONDITION: lock.versao=' + lock.getInt('versao'))
        }
        // 8. webhook.valor === 'false'
        if (whFlag.getString('valor') !== 'false') {
          throw new Error('RECOVER_PRECONDITION: webhook.valor=' + whFlag.getString('valor'))
        }
        // 9. webhook.ativo === false
        if (whFlag.getBool('ativo') !== false) {
          throw new Error('RECOVER_PRECONDITION: webhook.ativo=' + whFlag.getBool('ativo'))
        }

        // ─── Captura before (atribuição, sem var) ───
        estadoBefore = exec.getString('estado')
        lockBefore = lock.getString('valor')

        // ─── MUTAÇÕES ───
        var now = new Date().toISOString()
        var versaoCommit = exec.getString('versao_commit')

        // flag_final
        var flagFinal = JSON.stringify({
          valor: whFlag.getString('valor'),
          ativo: whFlag.getBool('ativo'),
          error: null,
        })

        // SNAPSHOT DE RECUPERAÇÃO HONESTO (18 campos + 1 adicional)
        var snapshot = {
          porta: '2D.2B',
          overall_status: 'BLOCKED',
          go_no_go: 'NO-GO',
          stop_reason:
            'RECOVERY_MANUAL: execução bloqueada em A1 (' +
            versaoCommit +
            '). Fallback one-shot autorizado por superadmin. 0 etapas persistidas — chamadas originais não reconstruíveis.',
          classification: 'BLOCKED',
          classification_justification:
            'Recuperação manual honesta. snapshot_source=recovery_manual. Execução original running com 0 etapas, versao_commit=' +
            versaoCommit +
            '. validateCore não foi executado — classificação atribuída diretamente.',
          expected_version: versaoCommit,
          snapshot_source: 'recovery_manual',
          snapshot_version: versaoCommit,
          snapshot_at: now,
          delta_match: false,
          persist_failure: true,
          pass: false,
          total_calls: 0,
          anomalies: [
            {
              type: 'RECOVERY_MANUAL',
              description:
                'Execução terminalizada por recuperação one-shot em ' +
                now +
                '. A1 falhou ao persistir (HTTP 409, evidence_incomplete, SNAPSHOT_MALFORMED). Nenhuma etapa foi criada.',
            },
            {
              type: 'ORIGINAL_EXECUTION_INCOMPLETE',
              description:
                'Execução original (' +
                versaoCommit +
                ') parou em running com 0 etapas, decisao vazia e lock ativo. Motivo raiz: falha de persistência na etapa A1.',
            },
          ],
          canonical_map: {
            A1: { status: 'not_reconstructed', source: 'recovery_manual' },
            A2: { status: 'not_reconstructed', source: 'recovery_manual' },
            A3: { status: 'not_reconstructed', source: 'recovery_manual' },
            A4: { status: 'not_reconstructed', source: 'recovery_manual' },
            A5: { status: 'not_reconstructed', source: 'recovery_manual' },
            A6: { status: 'not_reconstructed', source: 'recovery_manual' },
            A7: { status: 'not_reconstructed', source: 'recovery_manual' },
            A8: { status: 'not_reconstructed', source: 'recovery_manual' },
            B1: { status: 'not_reconstructed', source: 'recovery_manual' },
            B2: { status: 'not_reconstructed', source: 'recovery_manual' },
            B3: { status: 'not_reconstructed', source: 'recovery_manual' },
            B4: { status: 'not_reconstructed', source: 'recovery_manual' },
            B5: { status: 'not_reconstructed', source: 'recovery_manual' },
            C1: { status: 'not_reconstructed', source: 'recovery_manual' },
            C2: { status: 'not_reconstructed', source: 'recovery_manual' },
            D1: { status: 'not_reconstructed', source: 'recovery_manual' },
          },
          expected_contracts: { status: 'not_evaluated', source: 'recovery_manual' },
          hash_declaration: { status: 'not_available', source: 'recovery_manual' },
          recovery_tool_version: 'v0.0.170-recovery',
        }

        // Aplicar mutações
        exec.set('estado', 'blocked')
        exec.set('finished_at', now)
        exec.set('flag_final', flagFinal)
        exec.set('decisao', JSON.stringify(snapshot))

        lock.set('valor', 'unlocked')
        lock.set('ativo', false)

        latchRecord.set('valor', 'committed')
        latchRecord.set('ativo', true)

        // Salvar
        txApp.save(exec)
        txApp.save(lock)
        txApp.save(latchRecord)

        // Releitura dentro da transação (fail-closed)
        var execReRead = txApp.findRecordById('com_execucoes_porta_2d2b', RECOVER_EXEC_ID)
        if (execReRead.getString('estado') !== 'blocked') {
          throw new Error('RECOVER_REREAD: exec.estado=' + execReRead.getString('estado'))
        }
        if (!execReRead.getString('finished_at')) {
          throw new Error('RECOVER_REREAD: finished_at ausente')
        }
        var decisaoReRead = null
        try {
          decisaoReRead = JSON.parse(execReRead.getString('decisao') || '{}')
        } catch (_) {}
        if (!decisaoReRead || decisaoReRead.snapshot_source !== 'recovery_manual') {
          throw new Error(
            'RECOVER_REREAD: decisao snapshot_source=' +
              (decisaoReRead ? decisaoReRead.snapshot_source : 'null'),
          )
        }
        if (!decisaoReRead.canonical_map || !decisaoReRead.canonical_map.A1) {
          throw new Error('RECOVER_REREAD: canonical_map incompleto')
        }

        var lockReRead = txApp.findRecordById('com_parametros', RECOVER_LOCK_ID)
        if (lockReRead.getString('valor') !== 'unlocked') {
          throw new Error('RECOVER_REREAD: lock.valor=' + lockReRead.getString('valor'))
        }
        if (lockReRead.getBool('ativo') !== false) {
          throw new Error('RECOVER_REREAD: lock.ativo=' + lockReRead.getBool('ativo'))
        }

        var latchReRead = txApp.findFirstRecordByData('com_parametros', 'chave', RECOVER_LATCH_KEY)
        if (latchReRead.getString('valor') !== 'committed') {
          throw new Error('RECOVER_REREAD: latch.valor=' + latchReRead.getString('valor'))
        }

        result.transaction_committed = true
      })
    } catch (txErr) {
      return e.json(409, {
        error: 'recovery_failed',
        message: String(txErr).substring(0, 500),
        precondicoes_ok: false,
        writes_performed: 0,
      })
    }

    // ─── FORA DA TRANSAÇÃO: releitura estrita pós-commit ───
    var execFinal = null,
      lockFinal = null,
      whFinal = null,
      latchFinal = null
    try {
      execFinal = $app.findRecordById('com_execucoes_porta_2d2b', RECOVER_EXEC_ID)
    } catch (_) {}
    try {
      lockFinal = $app.findRecordById('com_parametros', RECOVER_LOCK_ID)
    } catch (_) {}
    try {
      whFinal = $app.findFirstRecordByData('com_parametros', 'chave', RECOVER_WEBHOOK_KEY)
    } catch (_) {}
    try {
      latchFinal = $app.findFirstRecordByData('com_parametros', 'chave', RECOVER_LATCH_KEY)
    } catch (_) {}

    var snapshotFinal = null
    var decisionParseable = false
    var snapshotSourceFinal = null
    var snapshotVersionFinal = null
    try {
      snapshotFinal = JSON.parse(execFinal ? execFinal.getString('decisao') || '{}' : '{}')
      decisionParseable = !!snapshotFinal.snapshot_source
      snapshotSourceFinal = snapshotFinal.snapshot_source || null
      snapshotVersionFinal = snapshotFinal.snapshot_version || null
    } catch (_) {}

    // ─── Predicado completo calculado sobre releituras pós-commit ───
    var committed =
      !!execFinal &&
      execFinal.getString('estado') === 'blocked' &&
      !!execFinal.getString('finished_at') &&
      decisionParseable &&
      snapshotSourceFinal === 'recovery_manual' &&
      snapshotVersionFinal === (execFinal.getString('versao_commit') || null) &&
      !!lockFinal &&
      lockFinal.getString('valor') === 'unlocked' &&
      lockFinal.getBool('ativo') === false &&
      lockFinal.getInt('versao') === 1 &&
      !!whFinal &&
      whFinal.getString('valor') === 'false' &&
      whFinal.getBool('ativo') === false &&
      !!latchFinal &&
      latchFinal.getString('valor') === 'committed' &&
      latchFinal.getBool('ativo') === true

    if (!committed) {
      return e.json(409, {
        error: 'recovery_inconsistent',
        message:
          'Estado pós-commit inesperado; não inferir sucesso nem falha; investigar via GET read-only.',
        transaction_committed: null,
        state_ambiguous: true,
        details: {
          execution_id: RECOVER_EXEC_ID,
          estado: execFinal ? execFinal.getString('estado') : null,
          finished_at_present: execFinal ? !!execFinal.getString('finished_at') : null,
          decision_parseable: decisionParseable,
          snapshot_source: snapshotSourceFinal,
          snapshot_version: snapshotVersionFinal,
          exec_versao_commit: execFinal ? execFinal.getString('versao_commit') : null,
          lock_id: RECOVER_LOCK_ID,
          lock_valor: lockFinal ? lockFinal.getString('valor') : null,
          lock_ativo: lockFinal ? lockFinal.getBool('ativo') : null,
          lock_versao: lockFinal ? lockFinal.getInt('versao') : null,
          webhook_valor: whFinal ? whFinal.getString('valor') : null,
          webhook_ativo: whFinal ? whFinal.getBool('ativo') : null,
          one_shot_valor: latchFinal ? latchFinal.getString('valor') : null,
          one_shot_ativo: latchFinal ? latchFinal.getBool('ativo') : null,
          external_calls: 0,
        },
      })
    }

    // ─── Predicado true → HTTP 200 ───
    return e.json(200, {
      recovery: '2d2b_one_shot',
      execution_id: RECOVER_EXEC_ID,
      estado_before: estadoBefore,
      estado_after: execFinal.getString('estado'),
      finished_at: execFinal.getString('finished_at'),
      snapshot_source: snapshotSourceFinal,
      snapshot_version: snapshotVersionFinal,
      lock_id: RECOVER_LOCK_ID,
      lock_before: lockBefore,
      lock_after: lockFinal.getString('valor'),
      lock_ativo_after: lockFinal.getBool('ativo'),
      webhook_valor: whFinal.getString('valor'),
      webhook_ativo: whFinal.getBool('ativo'),
      one_shot_valor: latchFinal.getString('valor'),
      transaction_committed: true,
      activecampaign_calls: 0,
      external_calls: 0,
      runner_called: false,
      webhook_called: false,
      rollback_called: false,
    })
  },
  $apis.requireAuth('users'),
)

// ════════════════════════════════════════════════════════════════════
// ROTA 2/2 — GET /backend/v1/integracao/ac/recover-2d2b-status
// ════════════════════════════════════════════════════════════════════
routerAdd(
  'GET',
  '/backend/v1/integracao/ac/recover-2d2b-status',
  function (e) {
    // CONSTANTES HARDCODED (inline — top-level vars não são acessíveis em callbacks no JSVM)
    var RECOVER_EXEC_ID = '1y2v99dapopm5wla66iysd5wky1tnb8t'
    var RECOVER_LOCK_ID = 'ibc2cgk9u4hw5rf'
    var RECOVER_LOCK_KEY = 'ac_2d2b_execution_lock'
    var RECOVER_LATCH_KEY = 'ac_2d2b_recovery_executed'
    var RECOVER_WEBHOOK_KEY = 'ac_webhook_enabled'
    // ─── VERIFICAÇÃO DE SUPERADMIN (copiada literalmente do runner) ───
    var authId = e.auth ? e.auth.id : ''
    if (!authId) return e.unauthorizedError('Autenticacao necessaria')
    var isSA = false
    try {
      var p = $app.findRecordById('com_perfis', e.auth.getString('perfil_id'))
      if (p && p.getString('slug') === 'superadministrador') isSA = true
    } catch (_) {}
    if (!isSA) {
      try {
        var sp = $app.findFirstRecordByData('com_perfis', 'slug', 'superadministrador')
        var bnd = $app.findRecordsByFilter(
          'com_usuarios_equipes',
          "usuario_id = '" + authId + "' && perfil_id = '" + sp.id + "' && ativo = true",
          '',
          1,
          0,
        )
        if (bnd && bnd.length > 0) isSA = true
      } catch (_) {}
    }
    if (!isSA) return e.forbiddenError('Apenas superadministrador')

    var exec = null
    try {
      exec = $app.findRecordById('com_execucoes_porta_2d2b', RECOVER_EXEC_ID)
    } catch (_) {}

    var lock = null
    try {
      lock = $app.findRecordById('com_parametros', RECOVER_LOCK_ID)
    } catch (_) {}

    var whFlag = null
    try {
      whFlag = $app.findFirstRecordByData('com_parametros', 'chave', RECOVER_WEBHOOK_KEY)
    } catch (_) {}

    var latch = null
    try {
      latch = $app.findFirstRecordByData('com_parametros', 'chave', RECOVER_LATCH_KEY)
    } catch (_) {}

    var decisionParseable = false
    var snapshotSource = null
    var snapshotVersion = null
    try {
      var d = JSON.parse(exec ? exec.getString('decisao') || '{}' : '{}')
      decisionParseable = !!d.snapshot_source
      snapshotSource = d.snapshot_source || null
      snapshotVersion = d.snapshot_version || null
    } catch (_) {}

    var recoveryCommitted =
      !!exec &&
      exec.getString('estado') === 'blocked' &&
      !!exec.getString('finished_at') &&
      decisionParseable &&
      snapshotSource === 'recovery_manual' &&
      snapshotVersion === (exec.getString('versao_commit') || null) &&
      !!lock &&
      lock.getString('valor') === 'unlocked' &&
      lock.getBool('ativo') === false &&
      lock.getInt('versao') === 1 &&
      !!whFlag &&
      whFlag.getString('valor') === 'false' &&
      whFlag.getBool('ativo') === false &&
      !!latch &&
      latch.getString('valor') === 'committed' &&
      latch.getBool('ativo') === true

    return e.json(200, {
      route: 'GET /backend/v1/integracao/ac/recover-2d2b-status',
      read_only: true,
      writes_performed: 0,
      external_calls: 0,
      execution_id: RECOVER_EXEC_ID,
      estado: exec ? exec.getString('estado') : null,
      finished_at_present: exec ? !!exec.getString('finished_at') : null,
      decision_parseable: decisionParseable,
      snapshot_source: snapshotSource,
      snapshot_version: snapshotVersion,
      execution_versao_commit: exec ? exec.getString('versao_commit') : null,
      lock_id: RECOVER_LOCK_ID,
      lock_valor: lock ? lock.getString('valor') : null,
      lock_ativo: lock ? lock.getBool('ativo') : null,
      lock_versao: lock ? lock.getInt('versao') : null,
      webhook_valor: whFlag ? whFlag.getString('valor') : null,
      webhook_ativo: whFlag ? whFlag.getBool('ativo') : null,
      one_shot_valor: latch ? latch.getString('valor') : null,
      recovery_committed: recoveryCommitted,
    })
  },
  $apis.requireAuth('users'),
)
