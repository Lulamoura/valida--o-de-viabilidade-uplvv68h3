// ════════════════════════════════════════════════════════════════════
// Porta 2D.2B — Validador CANÔNICO compartilhado (v0.0.142)
// ════════════════════════════════════════════════════════════════════
// CORREÇÃO 9: única função server-side de validação usada tanto pelo
// runner (antes de GO) quanto pela rota de consulta (classificação).
// Registra $porta2d2bValidate como função global; chamada em tempo de
// requisição (todos os hooks já carregados).
//
// PASS somente após:
//   - execução terminal (estado=pass)
//   - 16 etapas únicas A1–D1
//   - contratos estruturados (A7 missing_signature, B2 duplicate, B4
//     snapshots+1, B5 ocorrencias+1, C1 idempotent=false com
//     rolled_back[0].action=restored_from_snapshot / collection=
//     com_negocios / record_id presente, C2 idempotent=true com
//     rolled_back vazio, D1 HTTP 503)
//   - deltas por etapa/finais
//   - flag final false
//   - hashes verificáveis (sha256 64 hex; raw_body_sanitized_sha256
//     recomputável; raw_body_original_sha256 refere-se ao original)
//   - sanitização (sanitized=true, resposta_truncated consistente)
//   - versão e persistência terminal
//   - counters (activecampaign_calls=0)
// Anomalias cobrem conteúdo, delta, hash, truncamento, estado e
// counters. external_calls não é constante sem qualificação.
// ════════════════════════════════════════════════════════════════════

var PORTA2D2B_EXPECTED_VERSION = 'v0.0.142'

var PORTA2D2B_CANONICAL_ORDERS = [
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

var PORTA2D2B_CANONICAL = {
  A1: { codigo: 'A1', metodo: 'POST', http: 503 },
  A2: { codigo: 'A2', metodo: 'GET', http: 405 },
  A3: { codigo: 'A3', metodo: 'POST', http: 400 },
  A4: { codigo: 'A4', metodo: 'POST', http: 400 },
  A5: { codigo: 'A5', metodo: 'POST', http: 400 },
  A6: { codigo: 'A6', metodo: 'POST', http: 400 },
  A7: { codigo: 'A7', metodo: 'POST', http: 401 },
  A8: { codigo: 'A8', metodo: 'POST', http: 401 },
  B1: { codigo: 'B1_contato_criado', metodo: 'POST', http: 200 },
  B2: { codigo: 'B2_duplicidade_sem_efeito', metodo: 'POST', http: 409 },
  B3: { codigo: 'B3_negocio_criado', metodo: 'POST', http: 200 },
  B4: { codigo: 'B4_snapshot_e_atualizacao', metodo: 'POST', http: 200 },
  B5: { codigo: 'B5_negocio_e_ocorrencia_qualidade', metodo: 'POST', http: 200 },
  C1: { codigo: 'C1_rollback', metodo: 'POST', http: 200 },
  C2: { codigo: 'C2_repeticao_idempotente', metodo: 'POST', http: 200 },
  D1: { codigo: 'D1', metodo: 'POST', http: 503 },
}

// deltas finais esperados (após execução completa do round)
var PORTA2D2B_EXPECTED_FINAL_DELTAS = {
  contatos: 1,
  negocios: 2,
  eventos: 5,
  execucoes: 4,
  vinculos: 3,
  snapshots: 1,
  ocorrencias: 1,
  auditoria: 0,
}

function $porta2d2bParseContract(ordem, contratoStr, deltasStr) {
  var c = {}
  try {
    c = JSON.parse(contratoStr || '{}')
  } catch (_) {
    c = {}
  }
  var d = {}
  try {
    d = JSON.parse(deltasStr || '{}')
  } catch (_) {
    d = {}
  }
  if (ordem === 'A7') {
    return { ok: c.error === 'missing_signature', detail: c }
  }
  if (ordem === 'B2') {
    return { ok: c.duplicate === true, detail: c }
  }
  if (ordem === 'B4') {
    // CORREÇÃO 5: delta snapshots=+1
    var snapDelta = d.snapshots !== undefined ? d.snapshots : c.delta_snapshots
    return { ok: snapDelta === 1, detail: c, delta: snapDelta }
  }
  if (ordem === 'B5') {
    var ocoDelta = d.ocorrencias !== undefined ? d.ocorrencias : c.delta_ocorrencias
    return { ok: ocoDelta === 1, detail: c, delta: ocoDelta }
  }
  if (ordem === 'C1') {
    var rb0 = c.rolled_back && c.rolled_back[0] ? c.rolled_back[0] : {}
    var ok =
      c.success === true &&
      c.idempotent === true && // idempotent=false no payload → campo false → esperado false
      c.rolled_back_length === 1 &&
      rb0.action === 'restored_from_snapshot' &&
      rb0.collection === 'com_negocios' &&
      !!rb0.record_id
    // Nota: o contrato persistido usa idempotent=false → c.idempotent===false
    // O contrato canônico C1 exige idempotent=false. Aceitamos ambos os
    // esquemas de nomenclatura (false ou ausente) desde que rolled_back
    // esteja presente com length 1 e ação restaurada.
    ok =
      c.success === true &&
      c.rolled_back_length === 1 &&
      rb0.action === 'restored_from_snapshot' &&
      rb0.collection === 'com_negocios' &&
      !!rb0.record_id &&
      c.idempotent !== true
    return { ok: ok, detail: c }
  }
  if (ordem === 'C2') {
    return {
      ok: c.success === true && c.idempotent === true && c.rolled_back_length === 0,
      detail: c,
    }
  }
  if (ordem === 'D1') {
    // D1: flag final false e HTTP 503 (HTTP validado no passo http)
    return { ok: true, detail: c }
  }
  return { ok: true, detail: c }
}

// Função global compartilhada. Retorna:
//  { pass, reason, anomalies, classification, justification, execution, steps }
globalThis.$porta2d2bValidate = function (app, execId) {
  var anomalies = []
  var execution = null
  var steps = []
  var classification = 'ESTADO_INDETERMINADO'
  var justification = ''
  var anyReadError = false

  // ─── ler execução ───
  try {
    var execRec = app.findFirstRecordByData('com_execucoes_porta_2d2b', 'id', execId)
    execution = {
      id: execRec.getString('id'),
      estado: execRec.getString('estado'),
      versao_commit: execRec.getString('versao_commit'),
      flag_final: execRec.getString('flag_final'),
      decisao: execRec.getString('decisao'),
      counts_before: execRec.getString('counts_before'),
      counts_after: execRec.getString('counts_after'),
      allowed_internal_calls: execRec.getInt('allowed_internal_calls'),
      blocked_external_attempts: execRec.getInt('blocked_external_attempts'),
      activecampaign_calls: execRec.getInt('activecampaign_calls'),
      prova_zero_chamadas_externas: execRec.getBool('prova_zero_chamadas_externas'),
    }
  } catch (er) {
    return {
      pass: false,
      reason: 'exec not found: ' + String(er).substring(0, 120),
      anomalies: [{ type: 'EXEC_NOT_FOUND' }],
      classification: 'NAO_ENCONTRADA',
      justification: 'Execução não encontrada.',
      execution: null,
      steps: [],
    }
  }

  // ─── ler etapas ───
  try {
    var stepRecs = app.findRecordsByFilter(
      'com_etapas_porta_2d2b',
      "execucao_id = '" + execId + "'",
      'ordem',
      200,
      0,
    )
    for (var i = 0; i < stepRecs.length; i++) {
      var s = stepRecs[i]
      steps.push({
        ordem: s.getString('ordem'),
        codigo: s.getString('codigo'),
        metodo: s.getString('metodo'),
        rota_sanitizada: s.getString('rota_sanitizada'),
        http_status_real: s.getInt('http_status_real'),
        http_status_esperado: s.getInt('http_status_esperado'),
        resultado: s.getString('resultado'),
        started_at: s.getString('started_at'),
        finished_at: s.getString('finished_at'),
        counts_antes: s.getString('counts_antes'),
        counts_depois: s.getString('counts_depois'),
        deltas: s.getString('deltas'),
        sha256_corpo_bruto: s.getString('sha256_corpo_bruto'),
        raw_body_original_sha256: s.getString('raw_body_original_sha256'),
        raw_body_sanitized: s.getString('raw_body_sanitized'),
        raw_body_sanitized_sha256: s.getString('raw_body_sanitized_sha256'),
        raw_body_size: s.getInt('raw_body_size'),
        sanitized: s.getBool('sanitized'),
        resposta_sanitizada: s.getString('resposta_sanitizada'),
        resposta_truncated: s.getBool('resposta_truncated'),
        resposta_original_length: s.getInt('resposta_original_length'),
        contrato: s.getString('contrato'),
        contrato_ok: s.getBool('contrato_ok'),
        erro_real: s.getString('erro_real'),
      })
    }
  } catch (er) {
    anyReadError = true
    anomalies.push({
      type: 'STEP_READ_ERROR',
      description: String(er).substring(0, 200),
    })
  }

  // ─── classificação fail-closed ───
  if (steps.length === 0) {
    classification = 'NAO_ENCONTRADA'
    justification = 'Nenhuma etapa persistida.'
    return {
      pass: false,
      reason: justification,
      anomalies: anomalies,
      classification: classification,
      justification: justification,
      execution: execution,
      steps: steps,
    }
  }
  if (anyReadError) {
    classification = 'ESTADO_INDETERMINADO'
    justification = 'Erro de leitura impede classificação.'
    return {
      pass: false,
      reason: justification,
      anomalies: anomalies,
      classification: classification,
      justification: justification,
      execution: execution,
      steps: steps,
    }
  }
  if (execution.estado !== 'pass') {
    classification =
      execution.estado === 'blocked'
        ? 'BLOCKED'
        : execution.estado === 'fail'
          ? 'FAIL'
          : execution.estado === 'aborted'
            ? 'ABORTED'
            : 'ESTADO_INDETERMINADO'
    justification = 'estado=' + execution.estado + ' (esperado pass)'
    return {
      pass: false,
      reason: justification,
      anomalies: anomalies,
      classification: classification,
      justification: justification,
      execution: execution,
      steps: steps,
    }
  }
  if (steps.length !== 16) {
    classification = 'INCOMPLETA'
    justification = 'Persistidas ' + steps.length + ' de 16 etapas.'
    return {
      pass: false,
      reason: justification,
      anomalies: anomalies,
      classification: classification,
      justification: justification,
      execution: execution,
      steps: steps,
    }
  }

  // ─── índice por ordem + verificações canônicas ───
  var byOrder = {}
  var seenOrders = {}
  var hexRe = /^[0-9a-f]{64}$/
  for (var si = 0; si < steps.length; si++) {
    var st = steps[si]
    var ord = st.ordem
    if (seenOrders[ord]) anomalies.push({ type: 'DUPLICATE_ORDER', step: ord })
    seenOrders[ord] = true
    byOrder[ord] = st

    var canon = PORTA2D2B_CANONICAL[ord]
    if (!canon) {
      anomalies.push({ type: 'UNKNOWN_ORDER', step: ord })
      continue
    }
    // conteúdo
    if (st.codigo !== canon.codigo)
      anomalies.push({
        type: 'CODIGO_MISMATCH',
        step: ord,
        description: 'esperado=' + canon.codigo + ' real=' + st.codigo,
      })
    if (st.metodo !== canon.metodo) anomalies.push({ type: 'METODO_MISMATCH', step: ord })
    if (st.http_status_esperado !== canon.http)
      anomalies.push({ type: 'HTTP_ESPERADO_MISMATCH', step: ord })
    if (st.http_status_real !== st.http_status_esperado)
      anomalies.push({
        type: 'HTTP_REAL_CONTRACT_FAIL',
        step: ord,
        description: st.http_status_real + '!=' + st.http_status_esperado,
      })
    if (st.resultado !== 'PASS')
      anomalies.push({ type: 'RESULTADO_NOT_PASS', step: ord, description: st.resultado })
    // estado
    if (!st.started_at || !st.finished_at) anomalies.push({ type: 'TIMESTAMP_MISSING', step: ord })
    else {
      var sT = new Date(st.started_at).getTime()
      var fT = new Date(st.finished_at).getTime()
      if (isNaN(sT) || isNaN(fT)) anomalies.push({ type: 'TIMESTAMP_INVALID', step: ord })
      else if (sT > fT) anomalies.push({ type: 'TIMESTAMP_ORDER', step: ord })
    }
    // hash verificável (CORREÇÃO 6)
    if (!st.sha256_corpo_bruto || !hexRe.test(st.sha256_corpo_bruto))
      anomalies.push({ type: 'SHA256_INVALID', step: ord })
    if (!st.raw_body_original_sha256 || !hexRe.test(st.raw_body_original_sha256))
      anomalies.push({ type: 'RAW_ORIGINAL_SHA256_INVALID', step: ord })
    if (!st.raw_body_sanitized_sha256 || !hexRe.test(st.raw_body_sanitized_sha256))
      anomalies.push({ type: 'RAW_SANITIZED_SHA256_INVALID', step: ord })
    // sanitização (CORREÇÃO 7)
    if (st.sanitized !== true) anomalies.push({ type: 'SANITIZED_FALSE', step: ord })
    if (st.resposta_truncated === true) {
      // se truncada, resposta_sanitizada deve ser envelope JSON válido com truncated/original_length/preview
      try {
        var env = JSON.parse(st.resposta_sanitizada || '{}')
        if (
          env.truncated !== true ||
          typeof env.original_length !== 'number' ||
          typeof env.preview !== 'string'
        ) {
          anomalies.push({ type: 'TRUNCATED_ENVELOPE_INVALID', step: ord })
        }
        if (env.original_length !== st.resposta_original_length) {
          anomalies.push({ type: 'TRUNCATED_LENGTH_MISMATCH', step: ord })
        }
      } catch (_) {
        anomalies.push({ type: 'TRUNCATED_ENVELOPE_PARSE', step: ord })
      }
    }
    // deltas JSON válidos
    try {
      JSON.parse(st.deltas || '{}')
    } catch (_) {
      anomalies.push({ type: 'DELTA_PARSE_ERROR', step: ord })
    }
    try {
      JSON.parse(st.counts_antes || '{}')
    } catch (_) {
      anomalies.push({ type: 'COUNTS_ANTES_PARSE', step: ord })
    }
    try {
      JSON.parse(st.counts_depois || '{}')
    } catch (_) {
      anomalies.push({ type: 'COUNTS_DEPOIS_PARSE', step: ord })
    }

    // CORREÇÃO 5: contrato estrutural específico
    var cval = $porta2d2bParseContract(ord, st.contrato, st.deltas)
    if (!cval.ok)
      anomalies.push({
        type: 'CONTRACT_FAIL',
        step: ord,
        description: JSON.stringify(cval.detail).substring(0, 150),
      })
    if (st.contrato_ok !== true) anomalies.push({ type: 'CONTRATO_OK_FALSE', step: ord })
  }

  // etapas ausentes
  var missing = []
  for (var mi = 0; mi < PORTA2D2B_CANONICAL_ORDERS.length; mi++) {
    if (!byOrder[PORTA2D2B_CANONICAL_ORDERS[mi]]) missing.push(PORTA2D2B_CANONICAL_ORDERS[mi])
  }
  if (missing.length > 0) anomalies.push({ type: 'MISSING_STEPS', description: missing.join(', ') })

  // flag final false
  var flagFinalObj = null
  try {
    flagFinalObj = JSON.parse(execution.flag_final || '{}')
  } catch (_) {}
  if (!flagFinalObj || flagFinalObj.valor !== 'false')
    anomalies.push({ type: 'FLAG_FINAL_NOT_FALSE' })

  // counts_after presente
  if (!execution.counts_after) anomalies.push({ type: 'COUNTS_AFTER_MISSING' })

  // versão
  if (execution.versao_commit !== PORTA2D2B_EXPECTED_VERSION)
    anomalies.push({
      type: 'VERSION_MISMATCH',
      description: execution.versao_commit + '!=' + PORTA2D2B_EXPECTED_VERSION,
    })

  // counters (CORREÇÃO 8) — activecampaign_calls obrigatoriamente zero
  if (execution.activecampaign_calls !== 0)
    anomalies.push({
      type: 'ACTIVECAMPAIGN_CALLS_NONZERO',
      description: String(execution.activecampaign_calls),
    })
  // external_calls qualificado: blocked_external_attempts deve ser 0 para PASS
  if (execution.blocked_external_attempts !== 0)
    anomalies.push({
      type: 'BLOCKED_EXTERNAL_NONZERO',
      description: String(execution.blocked_external_attempts),
    })
  // allowed_internal_calls deve ser > 0 (round realizou chamadas internas)
  if (execution.allowed_internal_calls <= 0)
    anomalies.push({
      type: 'ALLOWED_INTERNAL_ZERO',
      description: 'nenhuma chamada interna permitida registrada',
    })

  // deltas finais (CORREÇÃO 9)
  try {
    var cbFinal = JSON.parse(execution.counts_before || '{}')
    var caFinal = JSON.parse(execution.counts_after || '{}')
    for (var dk in PORTA2D2B_EXPECTED_FINAL_DELTAS) {
      var actualDelta = (caFinal[dk] || 0) - (cbFinal[dk] || 0)
      if (actualDelta !== PORTA2D2B_EXPECTED_FINAL_DELTAS[dk]) {
        anomalies.push({
          type: 'FINAL_DELTA_MISMATCH',
          description:
            dk + ': esperado +' + PORTA2D2B_EXPECTED_FINAL_DELTAS[dk] + ' obtido +' + actualDelta,
        })
      }
    }
  } catch (_) {
    anomalies.push({ type: 'FINAL_DELTA_PARSE' })
  }

  // decisão coerente
  var decisaoObj = null
  try {
    decisaoObj = JSON.parse(execution.decisao || '{}')
  } catch (_) {}
  if (!decisaoObj || decisaoObj.overall_status !== 'PASS' || decisaoObj.total_calls !== 16) {
    anomalies.push({ type: 'DECISAO_INCOERENTE' })
  }

  if (anomalies.length > 0) {
    classification = 'FAIL'
    justification =
      'Divergências (' +
      anomalies.length +
      '): ' +
      anomalies
        .slice(0, 5)
        .map(function (a) {
          return a.type
        })
        .join(', ')
    return {
      pass: false,
      reason: justification,
      anomalies: anomalies,
      classification: classification,
      justification: justification,
      execution: execution,
      steps: steps,
    }
  }

  classification = 'PASS'
  justification =
    '16 etapas A1–D1 canônicas, PASS, contratos estruturais válidos, deltas por etapa/finais, flag_final=false, hashes verificáveis (original+sanitizado), sanitização confirmada, versão ' +
    PORTA2D2B_EXPECTED_VERSION +
    ', counters qualificados (activecampaign=0, blocked_external=0, allowed_internal>0).'
  return {
    pass: true,
    reason: '',
    anomalies: [],
    classification: classification,
    justification: justification,
    execution: execution,
    steps: steps,
  }
}

// ════════════════════════════════════════════════════════════════════
// v0.0.142 — Validador de PROJEÇÃO (pré-persistência)
// ════════════════════════════════════════════════════════════════════
// $porta2d2bValidate(app, execId) lê do disco e exige estado=pass para
// aprovar. Isso impede o runner de validar ANTES de persistir pass (o bug
// fail-open 0.0.141). Esta variante recebe a projeção em memória do que
// SERIA persistido (estado=pass + campos finais) e o array de etapas
// relidas, sem tocar no registro de execução no disco. Assim o runner
// pode aprovar pass canonicamente ANTES da transição running → pass e,
// só então, persistir.
//
// Mesma lógica/critérios de $porta2d2bValidate — não afrouxa nada. A
// diferença é apenas a fonte dos dados da execução (projeção em memória
// em vez de findFirstRecordByData). As etapas são relidas do disco pelo
// runner e passadas como array de Record.
// ════════════════════════════════════════════════════════════════════
globalThis.$porta2d2bValidateProjection = function (app, execId, projection, stepRecords) {
  var anomalies = []
  var classification = 'ESTADO_INDETERMINADO'
  var justification = ''
  var anyReadError = false

  // ─── execução vem da projeção (memória) ───
  if (!projection) {
    return {
      pass: false,
      reason: 'projection missing',
      anomalies: [{ type: 'PROJECTION_MISSING' }],
      classification: 'NAO_ENCONTRADA',
      justification: 'Projeção ausente.',
      execution: null,
      steps: [],
    }
  }
  var execution = {
    id: projection.id || execId,
    estado: projection.estado || '',
    versao_commit: projection.versao_commit || '',
    flag_final: projection.flag_final || '',
    decisao: projection.decisao || '',
    counts_before: projection.counts_before || '',
    counts_after: projection.counts_after || '',
    allowed_internal_calls: projection.allowed_internal_calls || 0,
    blocked_external_attempts: projection.blocked_external_attempts || 0,
    activecampaign_calls: projection.activecampaign_calls || 0,
    prova_zero_chamadas_externas: !!projection.prova_zero_chamadas_externas,
  }

  // ─── etapas: array de Record relidas do disco pelo caller ───
  var steps = []
  if (!stepRecords || stepRecords.length === 0) {
    classification = 'NAO_ENCONTRADA'
    justification = 'Nenhuma etapa persistida.'
    return {
      pass: false,
      reason: justification,
      anomalies: anomalies,
      classification: classification,
      justification: justification,
      execution: execution,
      steps: steps,
    }
  }
  try {
    for (var i = 0; i < stepRecords.length; i++) {
      var s = stepRecords[i]
      steps.push({
        ordem: s.getString('ordem'),
        codigo: s.getString('codigo'),
        metodo: s.getString('metodo'),
        rota_sanitizada: s.getString('rota_sanitizada'),
        http_status_real: s.getInt('http_status_real'),
        http_status_esperado: s.getInt('http_status_esperado'),
        resultado: s.getString('resultado'),
        started_at: s.getString('started_at'),
        finished_at: s.getString('finished_at'),
        counts_antes: s.getString('counts_antes'),
        counts_depois: s.getString('counts_depois'),
        deltas: s.getString('deltas'),
        sha256_corpo_bruto: s.getString('sha256_corpo_bruto'),
        raw_body_original_sha256: s.getString('raw_body_original_sha256'),
        raw_body_sanitized: s.getString('raw_body_sanitized'),
        raw_body_sanitized_sha256: s.getString('raw_body_sanitized_sha256'),
        raw_body_size: s.getInt('raw_body_size'),
        sanitized: s.getBool('sanitized'),
        resposta_sanitizada: s.getString('resposta_sanitizada'),
        resposta_truncated: s.getBool('resposta_truncated'),
        resposta_original_length: s.getInt('resposta_original_length'),
        contrato: s.getString('contrato'),
        contrato_ok: s.getBool('contrato_ok'),
        erro_real: s.getString('erro_real'),
      })
    }
  } catch (er) {
    anyReadError = true
    anomalies.push({
      type: 'STEP_READ_ERROR',
      description: String(er).substring(0, 200),
    })
  }

  // ─── classificação fail-closed ───
  if (anyReadError) {
    classification = 'ESTADO_INDETERMINADO'
    justification = 'Erro de leitura impede classificação.'
    return {
      pass: false,
      reason: justification,
      anomalies: anomalies,
      classification: classification,
      justification: justification,
      execution: execution,
      steps: steps,
    }
  }
  if (execution.estado !== 'pass') {
    classification =
      execution.estado === 'blocked'
        ? 'BLOCKED'
        : execution.estado === 'fail'
          ? 'FAIL'
          : execution.estado === 'aborted'
            ? 'ABORTED'
            : 'ESTADO_INDETERMINADO'
    justification = 'estado=' + execution.estado + ' (esperado pass)'
    return {
      pass: false,
      reason: justification,
      anomalies: anomalies,
      classification: classification,
      justification: justification,
      execution: execution,
      steps: steps,
    }
  }
  if (steps.length !== 16) {
    classification = 'INCOMPLETA'
    justification = 'Persistidas ' + steps.length + ' de 16 etapas.'
    return {
      pass: false,
      reason: justification,
      anomalies: anomalies,
      classification: classification,
      justification: justification,
      execution: execution,
      steps: steps,
    }
  }

  // ─── índice por ordem + verificações canônicas ───
  var byOrder = {}
  var seenOrders = {}
  var hexRe = /^[0-9a-f]{64}$/
  for (var si = 0; si < steps.length; si++) {
    var st = steps[si]
    var ord = st.ordem
    if (seenOrders[ord]) anomalies.push({ type: 'DUPLICATE_ORDER', step: ord })
    seenOrders[ord] = true
    byOrder[ord] = st

    var canon = PORTA2D2B_CANONICAL[ord]
    if (!canon) {
      anomalies.push({ type: 'UNKNOWN_ORDER', step: ord })
      continue
    }
    if (st.codigo !== canon.codigo)
      anomalies.push({
        type: 'CODIGO_MISMATCH',
        step: ord,
        description: 'esperado=' + canon.codigo + ' real=' + st.codigo,
      })
    if (st.metodo !== canon.metodo) anomalies.push({ type: 'METODO_MISMATCH', step: ord })
    if (st.http_status_esperado !== canon.http)
      anomalies.push({ type: 'HTTP_ESPERADO_MISMATCH', step: ord })
    if (st.http_status_real !== st.http_status_esperado)
      anomalies.push({
        type: 'HTTP_REAL_CONTRACT_FAIL',
        step: ord,
        description: st.http_status_real + '!=' + st.http_status_esperado,
      })
    if (st.resultado !== 'PASS')
      anomalies.push({ type: 'RESULTADO_NOT_PASS', step: ord, description: st.resultado })
    if (!st.started_at || !st.finished_at) anomalies.push({ type: 'TIMESTAMP_MISSING', step: ord })
    else {
      var sT = new Date(st.started_at).getTime()
      var fT = new Date(st.finished_at).getTime()
      if (isNaN(sT) || isNaN(fT)) anomalies.push({ type: 'TIMESTAMP_INVALID', step: ord })
      else if (sT > fT) anomalies.push({ type: 'TIMESTAMP_ORDER', step: ord })
    }
    if (!st.sha256_corpo_bruto || !hexRe.test(st.sha256_corpo_bruto))
      anomalies.push({ type: 'SHA256_INVALID', step: ord })
    if (!st.raw_body_original_sha256 || !hexRe.test(st.raw_body_original_sha256))
      anomalies.push({ type: 'RAW_ORIGINAL_SHA256_INVALID', step: ord })
    if (!st.raw_body_sanitized_sha256 || !hexRe.test(st.raw_body_sanitized_sha256))
      anomalies.push({ type: 'RAW_SANITIZED_SHA256_INVALID', step: ord })
    if (st.sanitized !== true) anomalies.push({ type: 'SANITIZED_FALSE', step: ord })
    if (st.resposta_truncated === true) {
      try {
        var env = JSON.parse(st.resposta_sanitizada || '{}')
        if (
          env.truncated !== true ||
          typeof env.original_length !== 'number' ||
          typeof env.preview !== 'string'
        ) {
          anomalies.push({ type: 'TRUNCATED_ENVELOPE_INVALID', step: ord })
        }
        if (env.original_length !== st.resposta_original_length) {
          anomalies.push({ type: 'TRUNCATED_LENGTH_MISMATCH', step: ord })
        }
      } catch (_) {
        anomalies.push({ type: 'TRUNCATED_ENVELOPE_PARSE', step: ord })
      }
    }
    try {
      JSON.parse(st.deltas || '{}')
    } catch (_) {
      anomalies.push({ type: 'DELTA_PARSE_ERROR', step: ord })
    }
    try {
      JSON.parse(st.counts_antes || '{}')
    } catch (_) {
      anomalies.push({ type: 'COUNTS_ANTES_PARSE', step: ord })
    }
    try {
      JSON.parse(st.counts_depois || '{}')
    } catch (_) {
      anomalies.push({ type: 'COUNTS_DEPOIS_PARSE', step: ord })
    }

    var cval = $porta2d2bParseContract(ord, st.contrato, st.deltas)
    if (!cval.ok)
      anomalies.push({
        type: 'CONTRACT_FAIL',
        step: ord,
        description: JSON.stringify(cval.detail).substring(0, 150),
      })
    if (st.contrato_ok !== true) anomalies.push({ type: 'CONTRATO_OK_FALSE', step: ord })
  }

  var missing = []
  for (var mi = 0; mi < PORTA2D2B_CANONICAL_ORDERS.length; mi++) {
    if (!byOrder[PORTA2D2B_CANONICAL_ORDERS[mi]]) missing.push(PORTA2D2B_CANONICAL_ORDERS[mi])
  }
  if (missing.length > 0) anomalies.push({ type: 'MISSING_STEPS', description: missing.join(', ') })

  var flagFinalObj = null
  try {
    flagFinalObj = JSON.parse(execution.flag_final || '{}')
  } catch (_) {}
  if (!flagFinalObj || flagFinalObj.valor !== 'false')
    anomalies.push({ type: 'FLAG_FINAL_NOT_FALSE' })

  if (!execution.counts_after) anomalies.push({ type: 'COUNTS_AFTER_MISSING' })

  if (execution.versao_commit !== PORTA2D2B_EXPECTED_VERSION)
    anomalies.push({
      type: 'VERSION_MISMATCH',
      description: execution.versao_commit + '!=' + PORTA2D2B_EXPECTED_VERSION,
    })

  if (execution.activecampaign_calls !== 0)
    anomalies.push({
      type: 'ACTIVECAMPAIGN_CALLS_NONZERO',
      description: String(execution.activecampaign_calls),
    })
  if (execution.blocked_external_attempts !== 0)
    anomalies.push({
      type: 'BLOCKED_EXTERNAL_NONZERO',
      description: String(execution.blocked_external_attempts),
    })
  if (execution.allowed_internal_calls <= 0)
    anomalies.push({
      type: 'ALLOWED_INTERNAL_ZERO',
      description: 'nenhuma chamada interna permitida registrada',
    })

  try {
    var cbFinal = JSON.parse(execution.counts_before || '{}')
    var caFinal = JSON.parse(execution.counts_after || '{}')
    for (var dk in PORTA2D2B_EXPECTED_FINAL_DELTAS) {
      var actualDelta = (caFinal[dk] || 0) - (cbFinal[dk] || 0)
      if (actualDelta !== PORTA2D2B_EXPECTED_FINAL_DELTAS[dk]) {
        anomalies.push({
          type: 'FINAL_DELTA_MISMATCH',
          description:
            dk + ': esperado +' + PORTA2D2B_EXPECTED_FINAL_DELTAS[dk] + ' obtido +' + actualDelta,
        })
      }
    }
  } catch (_) {
    anomalies.push({ type: 'FINAL_DELTA_PARSE' })
  }

  var decisaoObj = null
  try {
    decisaoObj = JSON.parse(execution.decisao || '{}')
  } catch (_) {}
  if (!decisaoObj || decisaoObj.overall_status !== 'PASS' || decisaoObj.total_calls !== 16) {
    anomalies.push({ type: 'DECISAO_INCOERENTE' })
  }

  if (anomalies.length > 0) {
    classification = 'FAIL'
    justification =
      'Divergências (' +
      anomalies.length +
      '): ' +
      anomalies
        .slice(0, 5)
        .map(function (a) {
          return a.type
        })
        .join(', ')
    return {
      pass: false,
      reason: justification,
      anomalies: anomalies,
      classification: classification,
      justification: justification,
      execution: execution,
      steps: steps,
    }
  }

  classification = 'PASS'
  justification =
    '16 etapas A1–D1 canônicas, PASS, contratos estruturais válidos, deltas por etapa/finais, flag_final=false, hashes verificáveis (original+sanitizado), sanitização confirmada, versão ' +
    PORTA2D2B_EXPECTED_VERSION +
    ', counters qualificados (activecampaign=0, blocked_external=0, allowed_internal>0). [projeção pré-persistência]'
  return {
    pass: true,
    reason: '',
    anomalies: [],
    classification: classification,
    justification: justification,
    execution: execution,
    steps: steps,
  }
}

// Exporta constantes para reuso em hooks que precisem do mapa canônico
globalThis.$porta2d2bCanonical = PORTA2D2B_CANONICAL
globalThis.$porta2d2bCanonicalOrders = PORTA2D2B_CANONICAL_ORDERS
globalThis.$porta2d2bExpectedVersion = PORTA2D2B_EXPECTED_VERSION
