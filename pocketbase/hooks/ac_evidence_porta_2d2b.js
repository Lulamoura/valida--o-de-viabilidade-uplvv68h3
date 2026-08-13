routerAdd(
  'GET',
  '/backend/v1/integracao/ac/evidence-porta-2d2b/:execId',
  (e) => {
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

    var execId = e.request.pathValue('execId') || ''
    if (!execId) return e.json(400, { error: 'missing_exec_id' })

    // Busca a execução pelo id exato
    var execution = null
    try {
      var execRec = $app.findFirstRecordByData('com_execucoes_porta_2d2b', 'id', execId)
      execution = {
        id: execRec.getString('id'),
        runner_version: execRec.getString('runner_version'),
        correlation_key: execRec.getString('correlation_key'),
        estado: execRec.getString('estado'),
        started_at: execRec.getString('started_at'),
        finished_at: execRec.getString('finished_at'),
        counts_before: execRec.getString('counts_before'),
        counts_after: execRec.getString('counts_after'),
        flag_before: execRec.getString('flag_before'),
        flag_final: execRec.getString('flag_final'),
        prova_zero_chamadas_externas: execRec.getBool('prova_zero_chamadas_externas'),
        versao_commit: execRec.getString('versao_commit'),
        decisao: execRec.getString('decisao'),
        created: execRec.getString('created'),
        updated: execRec.getString('updated'),
      }
    } catch (_) {
      // execução não encontrada
      return e.json(404, { error: 'execution_not_found' })
    }

    // Busca TODAS as etapas onde execucao_id = :execId, ordenadas por ordem
    var steps = []
    var readErrors = []
    try {
      var stepRecs = $app.findRecordsByFilter(
        'com_etapas_porta_2d2b',
        "execucao_id = '" + execId + "'",
        'ordem',
        200,
        0,
      )
      for (var i = 0; i < stepRecs.length; i++) {
        var s = stepRecs[i]
        steps.push({
          id: s.getString('id'),
          execucao_id: s.getString('execucao_id'),
          ordem: s.getString('ordem'),
          codigo: s.getString('codigo'),
          metodo: s.getString('metodo'),
          rota_sanitizada: s.getString('rota_sanitizada'),
          started_at: s.getString('started_at'),
          finished_at: s.getString('finished_at'),
          http_status_real: s.getInt('http_status_real'),
          http_status_esperado: s.getInt('http_status_esperado'),
          resultado: s.getString('resultado'),
          counts_antes: s.getString('counts_antes'),
          counts_depois: s.getString('counts_depois'),
          deltas: s.getString('deltas'),
          ids_correlacao_sanitizados: s.getString('ids_correlacao_sanitizados'),
          sha256_corpo_bruto: s.getString('sha256_corpo_bruto'),
          resposta_sanitizada: s.getString('resposta_sanitizada'),
          erro_real: s.getString('erro_real'),
          created: s.getString('created'),
          updated: s.getString('updated'),
        })
      }
    } catch (er) {
      readErrors.push({
        collection: 'com_etapas_porta_2d2b',
        operation: 'findRecordsByFilter',
        error: String(er).substring(0, 200),
      })
    }

    var TOTAL_STEPS_EXPECTED = 16
    var expectedOrders = [
      'A1',
      'A2',
      'A3',
      'A4',
      'A5',
      'A6',
      'A7',
      'A8',
      'B1',
      'B2',
      'B3',
      'B4',
      'B5',
      'C1',
      'C2',
      'D1',
    ]

    // Detecta read_error em counts_antes/counts_depois (valor -1 indica read error na origem)
    var anyReadError = readErrors.length > 0
    for (var r = 0; r < steps.length; r++) {
      try {
        var cb = JSON.parse(steps[r].counts_antes || '{}')
        var ca = JSON.parse(steps[r].counts_depois || '{}')
        var keys = [
          'contatos',
          'negocios',
          'eventos',
          'execucoes',
          'vinculos',
          'snapshots',
          'ocorrencias',
          'auditoria',
        ]
        for (var k = 0; k < keys.length; k++) {
          if (cb[keys[k]] === -1 || ca[keys[k]] === -1) {
            anyReadError = true
            break
          }
        }
        if (anyReadError) break
      } catch (_) {
        anyReadError = true
        break
      }
    }

    // Classificação
    var classification = ''
    var justification = ''
    var persistedOrders = {}
    for (var pi = 0; pi < steps.length; pi++) {
      persistedOrders[steps[pi].ordem] = steps[pi]
    }

    if (steps.length === 0) {
      classification = 'NAO_ENCONTRADA'
      justification =
        'Nenhuma etapa persistida encontrada para a execução ' +
        execId +
        '. A execução existe, mas nenhuma etapa foi gravada — pode indicar falha precoce ou execução interrompida antes da primeira persistência de etapa.'
    } else if (anyReadError) {
      classification = 'ESTADO_INDETERMINADO'
      justification =
        'Uma ou mais leituras de counts apresentaram erro (-1) ou falha de parse. A classificação não pode ser determinada com segurança.'
    } else {
      // Verifica ausências
      var missing = []
      for (var mi = 0; mi < expectedOrders.length; mi++) {
        if (!persistedOrders[expectedOrders[mi]]) missing.push(expectedOrders[mi])
      }
      // Verifica FAIL/BLOCKED
      var hasFail = false
      var hasBlocked = false
      var failedSteps = []
      for (var fi = 0; fi < steps.length; fi++) {
        if (steps[fi].resultado === 'FAIL') {
          hasFail = true
          failedSteps.push(steps[fi].ordem)
        }
        if (steps[fi].resultado === 'BLOCKED') {
          hasBlocked = true
          failedSteps.push(steps[fi].ordem)
        }
      }

      if (missing.length > 0) {
        if (hasFail || hasBlocked) {
          classification = hasBlocked ? 'BLOCKED' : 'FAIL'
          justification =
            'Etapa(s) com falha: ' +
            failedSteps.join(', ') +
            '. Etapa(s) ausente(s): ' +
            missing.join(', ') +
            '. Execução INCOMPLETA e com falha — jamais declarada PASS.'
        } else {
          classification = 'INCOMPLETA'
          justification =
            'Persistidas ' +
            steps.length +
            ' de ' +
            TOTAL_STEPS_EXPECTED +
            ' etapas. Etapa(s) ausente(s): ' +
            missing.join(', ') +
            '. Nenhuma etapa declarada FAIL/BLOCKED entre as persistidas, mas a ausência impede classificação PASS.'
        }
      } else if (hasFail || hasBlocked) {
        classification = hasBlocked ? 'BLOCKED' : 'FAIL'
        justification =
          'Todas as 16 etapas persistidas, porém etapa(s) com resultado FAIL/BLOCKED: ' +
          failedSteps.join(', ') +
          '. Execução não passou.'
      } else {
        // Todas as 16 presentes e todas PASS
        classification = 'PASS'
        justification =
          'Todas as ' +
          TOTAL_STEPS_EXPECTED +
          ' etapas (A1–A8, B1–B5, C1–C2, D1) estão persistidas e todas com resultado PASS. Evidência completa e verificável.'
      }
    }

    var canonical = {
      route: 'GET /backend/v1/integracao/ac/evidence-porta-2d2b/:execId',
      route_version: 'R2-EVIDENCE-2D2B-20260813',
      read_only: true,
      writes_performed: 0,
      external_calls: 0,
      queried_at: new Date().toISOString(),
      execution: execution,
      steps: steps,
      classification: classification,
      classification_justification: justification,
      total_steps_expected: TOTAL_STEPS_EXPECTED,
      total_steps_persisted: steps.length,
      anomalies: [],
      read_errors: readErrors,
      reconstruction_note:
        'Nenhuma inferência é realizada. Etapas ausentes resultam em classificação INCOMPLETA ou INDETERMINADA. PASS somente quando todas as 16 etapas estão persistidas e todas com resultado PASS.',
    }

    return e.json(200, canonical)
  },
  $apis.requireAuth(),
)
