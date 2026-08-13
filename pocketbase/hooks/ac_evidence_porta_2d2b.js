// ════════════════════════════════════════════════════════════════════
// Porta 2D.2B — Consulta de Evidência Persistida (v0.0.136)
// ════════════════════════════════════════════════════════════════════
// CORREÇÃO 10: classificação fail-closed com matriz completa de critérios
//   (a..n) e anomalies reais (não array vazio constante).
// CORREÇÃO 11: writes_performed distingue "GET não escreve" de "round
//   realizou escritas sintéticas"; prova_zero derivada do runner.
// Leitura exclusivamente server-side, autenticada, com verificação
// explícita de superadministrador. Coleções com rules=null (RBAC).
// ════════════════════════════════════════════════════════════════════
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

    var readErrors = []
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
      return e.json(404, { error: 'execution_not_found' })
    }

    var steps = []
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

    // ─── CORREÇÃO 9: mapa canônico imutável das 16 etapas ───
    var CANONICAL = {
      A1: {
        ordem: 'A1',
        codigo: 'A1',
        metodo: 'POST',
        rota: '/backend/v1/integracao/ac/webhook',
        http: 503,
      },
      A2: {
        ordem: 'A2',
        codigo: 'A2',
        metodo: 'GET',
        rota: '/backend/v1/integracao/ac/webhook',
        http: 405,
      },
      A3: {
        ordem: 'A3',
        codigo: 'A3',
        metodo: 'POST',
        rota: '/backend/v1/integracao/ac/webhook',
        http: 400,
      },
      A4: {
        ordem: 'A4',
        codigo: 'A4',
        metodo: 'POST',
        rota: '/backend/v1/integracao/ac/webhook',
        http: 400,
      },
      A5: {
        ordem: 'A5',
        codigo: 'A5',
        metodo: 'POST',
        rota: '/backend/v1/integracao/ac/webhook',
        http: 400,
      },
      A6: {
        ordem: 'A6',
        codigo: 'A6',
        metodo: 'POST',
        rota: '/backend/v1/integracao/ac/webhook',
        http: 400,
      },
      A7: {
        ordem: 'A7',
        codigo: 'A7',
        metodo: 'POST',
        rota: '/backend/v1/integracao/ac/webhook',
        http: 401,
      },
      A8: {
        ordem: 'A8',
        codigo: 'A8',
        metodo: 'POST',
        rota: '/backend/v1/integracao/ac/webhook',
        http: 401,
      },
      B1: {
        ordem: 'B1',
        codigo: 'B1_contato_criado',
        metodo: 'POST',
        rota: '/backend/v1/integracao/ac/webhook',
        http: 200,
      },
      B2: {
        ordem: 'B2',
        codigo: 'B2_duplicidade_sem_efeito',
        metodo: 'POST',
        rota: '/backend/v1/integracao/ac/webhook',
        http: 409,
      },
      B3: {
        ordem: 'B3',
        codigo: 'B3_negocio_criado',
        metodo: 'POST',
        rota: '/backend/v1/integracao/ac/webhook',
        http: 200,
      },
      B4: {
        ordem: 'B4',
        codigo: 'B4_snapshot_e_atualizacao',
        metodo: 'POST',
        rota: '/backend/v1/integracao/ac/webhook',
        http: 200,
      },
      B5: {
        ordem: 'B5',
        codigo: 'B5_negocio_e_ocorrencia_qualidade',
        metodo: 'POST',
        rota: '/backend/v1/integracao/ac/webhook',
        http: 200,
      },
      C1: {
        ordem: 'C1',
        codigo: 'C1_rollback',
        metodo: 'POST',
        rota: '/backend/v1/integracao/ac/rollback',
        http: 200,
      },
      C2: {
        ordem: 'C2',
        codigo: 'C2_repeticao_idempotente',
        metodo: 'POST',
        rota: '/backend/v1/integracao/ac/rollback',
        http: 200,
      },
      D1: {
        ordem: 'D1',
        codigo: 'D1',
        metodo: 'POST',
        rota: '/backend/v1/integracao/ac/webhook',
        http: 503,
      },
    }
    var CANONICAL_ORDERS = [
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
    var TOTAL_STEPS_EXPECTED = 16
    var EXPECTED_SCHEMA_VERSION = 'v0.0.136'

    // ─── CORREÇÃO 10: anomalies reais (não array vazio constante) ───
    var anomalies = []

    // detectar read errors de counts (-1) ou parse inválido
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
        anomalies.push({
          type: 'PARSE_ERROR',
          step: steps[r].ordem,
          description: 'counts_antes/counts_depois não é JSON válido',
        })
        break
      }
    }

    // índice por ordem
    var byOrder = {}
    for (var pi = 0; pi < steps.length; pi++) byOrder[steps[pi].ordem] = steps[pi]

    // verificações canônicas por etapa persistida
    for (var si = 0; si < steps.length; si++) {
      var st = steps[si]
      var canon = CANONICAL[st.ordem]
      if (!canon) {
        anomalies.push({
          type: 'UNKNOWN_ORDER',
          step: st.ordem,
          description: 'Ordem não consta no mapa canônico: ' + st.ordem,
        })
        continue
      }
      if (st.codigo !== canon.codigo)
        anomalies.push({
          type: 'CODIGO_MISMATCH',
          step: st.ordem,
          description: 'codigo esperado=' + canon.codigo + ' real=' + st.codigo,
        })
      if (st.metodo !== canon.metodo)
        anomalies.push({
          type: 'METODO_MISMATCH',
          step: st.ordem,
          description: 'metodo esperado=' + canon.metodo + ' real=' + st.metodo,
        })
      if (st.rota_sanitizada !== canon.rota)
        anomalies.push({
          type: 'ROTA_MISMATCH',
          step: st.ordem,
          description: 'rota esperada=' + canon.rota + ' real=' + st.rota_sanitizada,
        })
      if (st.http_status_esperado !== canon.http)
        anomalies.push({
          type: 'HTTP_ESPERADO_MISMATCH',
          step: st.ordem,
          description: 'http_esperado=' + canon.http + ' real=' + st.http_status_esperado,
        })
      // (f) http_status_real satisfaz contrato da etapa
      if (st.http_status_real !== st.http_status_esperado)
        anomalies.push({
          type: 'HTTP_REAL_CONTRACT_FAIL',
          step: st.ordem,
          description:
            'http_status_real=' + st.http_status_real + ' != esperado=' + st.http_status_esperado,
        })
      // (g) resultado literalmente PASS
      if (st.resultado !== 'PASS')
        anomalies.push({
          type: 'RESULTADO_NOT_PASS',
          step: st.ordem,
          description: 'resultado=' + st.resultado,
        })
      // (h) timestamps válidos e ordenados
      if (!st.started_at || !st.finished_at) {
        anomalies.push({
          type: 'TIMESTAMP_MISSING',
          step: st.ordem,
          description: 'started_at ou finished_at ausente',
        })
      } else {
        var sT = new Date(st.started_at).getTime()
        var fT = new Date(st.finished_at).getTime()
        if (isNaN(sT) || isNaN(fT))
          anomalies.push({
            type: 'TIMESTAMP_INVALID',
            step: st.ordem,
            description: 'timestamp inválido',
          })
        else if (sT > fT)
          anomalies.push({
            type: 'TIMESTAMP_ORDER',
            step: st.ordem,
            description: 'started_at > finished_at',
          })
      }
      // (i) sha256 64 hex
      var hexRe = /^[0-9a-f]{64}$/
      if (!st.sha256_corpo_bruto || !hexRe.test(st.sha256_corpo_bruto))
        anomalies.push({
          type: 'SHA256_INVALID',
          step: st.ordem,
          description:
            'sha256_corpo_bruto não é 64 hex: ' + String(st.sha256_corpo_bruto).substring(0, 20),
        })
    }

    // (c) exatamente uma ocorrência de cada ordem esperada
    var missing = []
    for (var mi = 0; mi < CANONICAL_ORDERS.length; mi++) {
      if (!byOrder[CANONICAL_ORDERS[mi]]) missing.push(CANONICAL_ORDERS[mi])
    }
    if (missing.length > 0)
      anomalies.push({
        type: 'MISSING_STEPS',
        description: 'Etapas ausentes: ' + missing.join(', '),
      })

    // (d) nenhum código ou ordem extra
    for (var ei = 0; ei < steps.length; ei++) {
      if (!CANONICAL[steps[ei].ordem]) {
        // já registrado acima
      }
    }
    // duplicidade de ordem
    var seenOrders = {}
    for (var di = 0; di < steps.length; di++) {
      var oo = steps[di].ordem
      if (seenOrders[oo])
        anomalies.push({ type: 'DUPLICATE_ORDER', step: oo, description: 'Ordem duplicada: ' + oo })
      seenOrders[oo] = true
    }

    // (j) counts/deltas JSON válidos
    for (var dj = 0; dj < steps.length; dj++) {
      try {
        JSON.parse(steps[dj].deltas || '{}')
      } catch (_) {
        anomalies.push({
          type: 'DELTA_PARSE_ERROR',
          step: steps[dj].ordem,
          description: 'deltas não é JSON válido',
        })
      }
    }

    // (k) flag final false + (l) decisão coerente
    var flagFinalObj = null
    try {
      flagFinalObj = JSON.parse(execution.flag_final || '{}')
    } catch (_) {}
    var decisaoObj = null
    try {
      decisaoObj = JSON.parse(execution.decisao || '{}')
    } catch (_) {}

    // ─── CORREÇÃO 10: classificação fail-closed ───
    var classification = ''
    var justification = ''

    if (steps.length === 0) {
      classification = 'NAO_ENCONTRADA'
      justification = 'Nenhuma etapa persistida para ' + execId + '.'
    } else if (anyReadError) {
      classification = 'ESTADO_INDETERMINADO'
      justification = 'Erro de leitura/parse impede classificação segura.'
    } else if (execution.estado !== 'pass') {
      classification =
        execution.estado === 'blocked'
          ? 'BLOCKED'
          : execution.estado === 'aborted'
            ? 'ABORTED'
            : execution.estado === 'fail'
              ? 'FAIL'
              : 'ESTADO_INDETERMINADO'
      justification = 'Estado terminal da execução=' + execution.estado + ' — não é pass.'
    } else if (steps.length !== TOTAL_STEPS_EXPECTED) {
      classification = 'INCOMPLETA'
      justification = 'Persistidas ' + steps.length + ' de ' + TOTAL_STEPS_EXPECTED + ' etapas.'
    } else if (missing.length > 0) {
      classification = 'INCOMPLETA'
      justification = 'Ordens ausentes: ' + missing.join(', ')
    } else if (anomalies.length > 0) {
      // qualquer divergência → nunca PASS
      classification = 'FAIL'
      justification =
        'Divergências detectadas (' +
        anomalies.length +
        '): ' +
        anomalies
          .slice(0, 5)
          .map(function (a) {
            return a.type
          })
          .join(', ')
    } else {
      // (k) flag final false
      if (!flagFinalObj || flagFinalObj.valor !== 'false') {
        classification = 'BLOCKED'
        justification = 'flag_final não é false.'
      } else if (
        !decisaoObj ||
        decisaoObj.overall_status !== 'PASS' ||
        decisaoObj.total_calls !== 16
      ) {
        classification = 'ESTADO_INDETERMINADO'
        justification = 'decisão persistida incoerente.'
      } else if (execution.versao_commit !== EXPECTED_SCHEMA_VERSION) {
        classification = 'ESTADO_INDETERMINADO'
        justification = 'versão/schema diferente do esperado (' + EXPECTED_SCHEMA_VERSION + ').'
      } else if (!execution.prova_zero_chamadas_externas) {
        classification = 'ESTADO_INDETERMINADO'
        justification = 'prova_zero_chamadas_externas=false — não derivada de contador real.'
      } else {
        classification = 'PASS'
        justification =
          'Todas as 16 etapas A1–D1 persistidas, canônicas, PASS, timestamps ordenados, sha256 válidos, flag_final=false, decisão coerente, schema esperado.'
      }
    }

    // CORREÇÃO 11: distinguir "GET não escreve" de "round realizou escritas"
    var roundWrites = 0
    try {
      roundWrites = decisaoObj && decisaoObj.total_calls ? decisaoObj.total_calls : steps.length
    } catch (_) {}
    var writesNote =
      'Esta GET de consulta NÃO realiza escritas (writes_performed=0). O round que originou esta evidência realizou escritas sintéticas em coleções internas (round_writes=' +
      roundWrites +
      '). Não confundir.'

    var canonical = {
      route: 'GET /backend/v1/integracao/ac/evidence-porta-2d2b/:execId',
      route_version: 'R2-EVIDENCE-2D2B-20260813-FAILCLOSED-v0.0.136',
      read_only: true,
      writes_performed: 0,
      writes_note: writesNote,
      round_writes: roundWrites,
      external_calls: 0,
      queried_at: new Date().toISOString(),
      schema_version_expected: EXPECTED_SCHEMA_VERSION,
      execution: execution,
      steps: steps,
      canonical_map: CANONICAL,
      classification: classification,
      classification_justification: justification,
      total_steps_expected: TOTAL_STEPS_EXPECTED,
      total_steps_persisted: steps.length,
      anomalies: anomalies,
      read_errors: readErrors,
      reconstruction_note:
        'PASS somente se TODOS os critérios (a..n) satisfeitos: estado=pass, 16 etapas, ordem/código/método/rota/HTTP canônicos, resultado=PASS, timestamps ordenados, sha256 64hex do raw body, deltas JSON válidos, flag_final=false, decisão coerente, zero erro de leitura/persistência/sanitização, schema esperado. Qualquer divergência → INCOMPLETA/ESTADO_INDETERMINADO/FAIL/BLOCKED, nunca PASS.',
    }

    return e.json(200, canonical)
  },
  $apis.requireAuth(),
)
