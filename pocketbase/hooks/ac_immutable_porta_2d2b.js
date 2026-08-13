// CORREÇÃO 12 — Imutabilidade da evidência terminal da Porta 2D.2B.
//
// Após estado terminal (pass, fail, blocked, aborted) os registros de
// execução e etapas NÃO podem ser alterados nem apagados — inclusive por
// hooks server-side genéricos. Durante o round, apenas transições de estado
// válidas (started→running→pass/fail/blocked/aborted) e append único das
// etapas são permitidas.
//
// Este hook intercepta onRecordUpdateRequest e onRecordDeleteRequest nas duas
// coleções de evidência e bloqueia qualquer mutação de registro terminal.
onRecordUpdateRequest(function (e) {
  if (e.record && e.record.collection().name === 'com_execucoes_porta_2d2b') {
    var original = e.record.original()
    var prevEstado = ''
    try {
      prevEstado = original.getString('estado')
    } catch (_) {}
    var TERMINAL = { pass: true, fail: true, blocked: true, aborted: true }
    if (TERMINAL[prevEstado]) {
      throw new BadRequestError(
        'Evidência terminal (estado=' + prevEstado + ') é imutável — alteração bloqueada.',
      )
    }
    var nextEstado = ''
    try {
      nextEstado = e.record.getString('estado')
    } catch (_) {}
    var VALID = {
      started: true,
      running: true,
      pass: true,
      fail: true,
      blocked: true,
      aborted: true,
    }
    if (nextEstado && !VALID[nextEstado]) {
      throw new BadRequestError('Transição de estado inválida: ' + nextEstado)
    }
    var TRANSITIONS = {
      started: { running: true, blocked: true, aborted: true },
      running: { pass: true, fail: true, blocked: true, aborted: true },
    }
    if (prevEstado && TRANSITIONS[prevEstado] && nextEstado !== prevEstado) {
      if (!TRANSITIONS[prevEstado][nextEstado]) {
        throw new BadRequestError(
          'Transição de estado não permitida: ' + prevEstado + ' → ' + nextEstado,
        )
      }
    }
  }
  if (e.record && e.record.collection().name === 'com_etapas_porta_2d2b') {
    // Etapas são append-only — update de etapa existente é bloqueado.
    throw new BadRequestError('Etapas da evidência 2D.2B são append-only — update bloqueado.')
  }
}, 'com_execucoes_porta_2d2b')

onRecordUpdateRequest(function (e) {
  if (e.record && e.record.collection().name === 'com_etapas_porta_2d2b') {
    throw new BadRequestError('Etapas da evidência 2D.2B são append-only — update bloqueado.')
  }
}, 'com_etapas_porta_2d2b')

onRecordDeleteRequest(function (e) {
  if (e.record && e.record.collection().name === 'com_execucoes_porta_2d2b') {
    var estado = ''
    try {
      estado = e.record.getString('estado')
    } catch (_) {}
    var TERMINAL = { pass: true, fail: true, blocked: true, aborted: true }
    if (TERMINAL[estado]) {
      throw new BadRequestError(
        'Evidência terminal (estado=' + estado + ') não pode ser apagada — delete bloqueado.',
      )
    }
  }
  if (e.record && e.record.collection().name === 'com_etapas_porta_2d2b') {
    throw new BadRequestError(
      'Etapas da evidência 2D.2B não podem ser apagadas — delete bloqueado.',
    )
  }
}, 'com_execucoes_porta_2d2b')

onRecordDeleteRequest(function (e) {
  if (e.record && e.record.collection().name === 'com_etapas_porta_2d2b') {
    throw new BadRequestError(
      'Etapas da evidência 2D.2B não podem ser apagadas — delete bloqueado.',
    )
  }
}, 'com_etapas_porta_2d2b')
