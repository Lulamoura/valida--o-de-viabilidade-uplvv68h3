routerAdd(
  'POST',
  '/backend/v1/integracao/ac/diag-compensacao-dependencias',
  (e) => {
    var ROUTE_VERSION = 'R13-2D2A-DIAG-COMPENSACAO-DEPENDENCIAS-BACKEND-20260812-v1'
    var ROUTE_PATH = '/backend/v1/integracao/ac/diag-compensacao-dependencias'
    var LOCK_KEY = 'ac_diag_compensacao_dependencias_lock'

    var FIXED_IDS = {
      com_vinculos_externos: 'phzmobi8mfb34ha',
      com_eventos_integracao: 'pq4npvruaak9gpb',
      com_execucoes_sincronizacao: '62otoics23ul0vy',
    }

    var EXPECTED_COUNTS_BEFORE = {
      com_vinculos_externos: 15,
      com_eventos_integracao: 11,
      com_execucoes_sincronizacao: 10,
    }
    var EXPECTED_COUNTS_AFTER = {
      com_vinculos_externos: 14,
      com_eventos_integracao: 10,
      com_execucoes_sincronizacao: 9,
    }

    var DIAGNOSTIC_WINDOW_START = '2026-08-11T20:38:39.900Z'
    var DIAGNOSTIC_WINDOW_END = '2026-08-11T20:38:40.000Z'
    var windowStartMs = new Date(DIAGNOSTIC_WINDOW_START).getTime()
    var windowEndMs = new Date(DIAGNOSTIC_WINDOW_END).getTime()

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
        var b = $app.findRecordsByFilter(
          'com_usuarios_equipes',
          "usuario_id = '" + authId + "' && perfil_id = '" + sp.id + "' && ativo = true",
          '',
          1,
          0,
        )
        if (b && b.length > 0) isSA = true
      } catch (_) {}
    }
    if (!isSA) return e.forbiddenError('Apenas superadministrador')

    function checkLock() {
      try {
        var rec = $app.findFirstRecordByData('com_parametros', 'chave', LOCK_KEY)
        return rec.getString('valor')
      } catch (_) {
        return 'armed'
      }
    }

    function engageLock() {
      try {
        var pc = $app.findCollectionByNameOrId('com_parametros')
        var fr
        try {
          fr = $app.findFirstRecordByData('com_parametros', 'chave', LOCK_KEY)
        } catch (_) {
          fr = new Record(pc)
          fr.set('chave', LOCK_KEY)
          fr.set('versao', 1)
        }
        fr.set('valor', 'consumed')
        fr.set('ativo', true)
        fr.set('descricao', 'Compensation dependencias single-execution lock (independent)')
        fr.set('tipo', 'lock')
        $app.save(fr)
        return true
      } catch (_) {
        return false
      }
    }

    var lockState = checkLock()

    if (lockState === 'consumed') {
      return e.json(200, {
        route_version: ROUTE_VERSION,
        route: ROUTE_PATH,
        method: 'POST',
        lock_state: 'consumed',
        lock_key: LOCK_KEY,
        fixed_ids: FIXED_IDS,
        client_input_rejected: true,
        compensation_executed: true,
        deletion_executed: true,
        activecampaign_calls: 0,
        message: 'Compensation already executed — independent lock prevents re-execution',
      })
    }

    function safeCount(n) {
      try {
        return $app.countRecords(n)
      } catch (_) {
        return -1
      }
    }
    function safeFindById(name, id) {
      try {
        return $app.findRecordById(name, id)
      } catch (_) {
        return null
      }
    }
    function safeFind(name, filter) {
      try {
        return $app.findRecordsByFilter(name, filter, '', 100, 0)
      } catch (_) {
        return []
      }
    }

    var vinculo = safeFindById('com_vinculos_externos', FIXED_IDS.com_vinculos_externos)
    var evento = safeFindById('com_eventos_integracao', FIXED_IDS.com_eventos_integracao)
    var execucao = safeFindById(
      'com_execucoes_sincronizacao',
      FIXED_IDS.com_execucoes_sincronizacao,
    )

    var preconditions = {
      all_ids_exist: !!vinculo && !!evento && !!execucao,
      vinculo_exists: !!vinculo,
      evento_exists: !!evento,
      execucao_exists: !!execucao,
    }

    var capturedRecords = {}
    var identityVerified = true

    if (vinculo) {
      var vCreated = vinculo.getString('created')
      var vMs = vCreated ? new Date(vCreated).getTime() : NaN
      var vInWindow = !isNaN(vMs) && vMs >= windowStartMs && vMs <= windowEndMs
      capturedRecords.com_vinculos_externos = {
        id: vinculo.id,
        sistema_origem: vinculo.getString('sistema_origem'),
        external_type: vinculo.getString('external_type'),
        external_id: vinculo.getString('external_id'),
        collection_name: vinculo.getString('collection_name'),
        record_id: vinculo.getString('record_id'),
        created: vCreated,
        updated: vinculo.getString('updated'),
      }
      if (!vInWindow) identityVerified = false
      preconditions.vinculo_timestamp_in_window = vInWindow
    }
    if (evento) {
      var eCreated = evento.getString('created')
      var eMs = eCreated ? new Date(eCreated).getTime() : NaN
      var eInWindow = !isNaN(eMs) && eMs >= windowStartMs && eMs <= windowEndMs
      capturedRecords.com_eventos_integracao = {
        id: evento.id,
        sistema_origem: evento.getString('sistema_origem'),
        evento_tipo: evento.getString('evento_tipo'),
        external_id: evento.getString('external_id'),
        idempotency_key: evento.getString('idempotency_key'),
        payload: evento.getString('payload'),
        status: evento.getString('status'),
        created: eCreated,
        updated: evento.getString('updated'),
      }
      if (!eInWindow) identityVerified = false
      preconditions.evento_timestamp_in_window = eInWindow
    }
    if (execucao) {
      var xCreated = execucao.getString('created')
      var xMs = xCreated ? new Date(xCreated).getTime() : NaN
      var xInWindow = !isNaN(xMs) && xMs >= windowStartMs && xMs <= windowEndMs
      capturedRecords.com_execucoes_sincronizacao = {
        id: execucao.id,
        sistema_origem: execucao.getString('sistema_origem'),
        status: execucao.getString('status'),
        payload: execucao.getString('payload'),
        erro: execucao.getString('erro'),
        inicio: execucao.getString('inicio'),
        fim: execucao.getString('fim'),
        created: xCreated,
        updated: execucao.getString('updated'),
      }
      if (!xInWindow) identityVerified = false
      preconditions.execucao_timestamp_in_window = xInWindow
    }
    preconditions.identity_and_timestamps_verified = identityVerified

    var ocorrencias = safeFind(
      'com_ocorrencias_qualidade',
      'execucao_id = "' + FIXED_IDS.com_execucoes_sincronizacao + '"',
    )
    preconditions.zero_ocorrencias = ocorrencias.length === 0
    preconditions.ocorrencias_count = ocorrencias.length

    var countsBefore = {
      com_vinculos_externos: safeCount('com_vinculos_externos'),
      com_eventos_integracao: safeCount('com_eventos_integracao'),
      com_execucoes_sincronizacao: safeCount('com_execucoes_sincronizacao'),
    }
    preconditions.counts_match =
      countsBefore.com_vinculos_externos === EXPECTED_COUNTS_BEFORE.com_vinculos_externos &&
      countsBefore.com_eventos_integracao === EXPECTED_COUNTS_BEFORE.com_eventos_integracao &&
      countsBefore.com_execucoes_sincronizacao ===
        EXPECTED_COUNTS_BEFORE.com_execucoes_sincronizacao

    var refsToEvento = safeFind(
      'com_vinculos_externos',
      'record_id = "' + FIXED_IDS.com_eventos_integracao + '"',
    )
    var refsToExecucao = safeFind(
      'com_vinculos_externos',
      'record_id = "' + FIXED_IDS.com_execucoes_sincronizacao + '"',
    )
    var additionalRefs = 0
    for (var i = 0; i < refsToEvento.length; i++) {
      if (refsToEvento[i].id !== FIXED_IDS.com_vinculos_externos) additionalRefs++
    }
    for (var j = 0; j < refsToExecucao.length; j++) {
      if (refsToExecucao[j].id !== FIXED_IDS.com_vinculos_externos) additionalRefs++
    }
    preconditions.no_additional_references = additionalRefs === 0
    preconditions.additional_references_count = additionalRefs

    var allPreconditionsMet =
      preconditions.all_ids_exist &&
      preconditions.identity_and_timestamps_verified &&
      preconditions.zero_ocorrencias &&
      preconditions.counts_match &&
      preconditions.no_additional_references

    if (!allPreconditionsMet) {
      return e.json(200, {
        route_version: ROUTE_VERSION,
        route: ROUTE_PATH,
        method: 'POST',
        lock_state: 'armed',
        lock_key: LOCK_KEY,
        fixed_ids: FIXED_IDS,
        client_input_rejected: true,
        compensation_executed: false,
        deletion_executed: false,
        activecampaign_calls: 0,
        preconditions_met: false,
        preconditions: preconditions,
        counts_before: countsBefore,
        expected_counts_before: EXPECTED_COUNTS_BEFORE,
        captured_records: capturedRecords,
        message: 'Preconditions not met — compensation aborted, nothing deleted',
      })
    }

    var deletionOrder = [
      { order: 1, collection: 'com_vinculos_externos', id: FIXED_IDS.com_vinculos_externos },
      { order: 2, collection: 'com_eventos_integracao', id: FIXED_IDS.com_eventos_integracao },
      {
        order: 3,
        collection: 'com_execucoes_sincronizacao',
        id: FIXED_IDS.com_execucoes_sincronizacao,
      },
    ]

    var txError = null
    try {
      $app.runInTransaction(function (txApp) {
        var v = txApp.findRecordById('com_vinculos_externos', FIXED_IDS.com_vinculos_externos)
        txApp.delete(v)
        var ev = txApp.findRecordById('com_eventos_integracao', FIXED_IDS.com_eventos_integracao)
        txApp.delete(ev)
        var ex = txApp.findRecordById(
          'com_execucoes_sincronizacao',
          FIXED_IDS.com_execucoes_sincronizacao,
        )
        txApp.delete(ex)
      })
    } catch (err) {
      txError = String(err).substring(0, 300)
    }

    if (txError) {
      return e.json(200, {
        route_version: ROUTE_VERSION,
        route: ROUTE_PATH,
        method: 'POST',
        lock_state: 'armed',
        lock_key: LOCK_KEY,
        fixed_ids: FIXED_IDS,
        client_input_rejected: true,
        compensation_executed: false,
        deletion_executed: false,
        activecampaign_calls: 0,
        preconditions_met: true,
        deletion_failed: true,
        transaction_error: txError,
        captured_records_before_deletion: capturedRecords,
        deletion_order: deletionOrder,
        message:
          'Deletion failed — transaction rolled back, all records restored to original state',
      })
    }

    var countsAfter = {
      com_vinculos_externos: safeCount('com_vinculos_externos'),
      com_eventos_integracao: safeCount('com_eventos_integracao'),
      com_execucoes_sincronizacao: safeCount('com_execucoes_sincronizacao'),
    }
    var postValidation = {
      counts_match:
        countsAfter.com_vinculos_externos === EXPECTED_COUNTS_AFTER.com_vinculos_externos &&
        countsAfter.com_eventos_integracao === EXPECTED_COUNTS_AFTER.com_eventos_integracao &&
        countsAfter.com_execucoes_sincronizacao ===
          EXPECTED_COUNTS_AFTER.com_execucoes_sincronizacao,
      vinculo_absent: !safeFindById('com_vinculos_externos', FIXED_IDS.com_vinculos_externos),
      evento_absent: !safeFindById('com_eventos_integracao', FIXED_IDS.com_eventos_integracao),
      execucao_absent: !safeFindById(
        'com_execucoes_sincronizacao',
        FIXED_IDS.com_execucoes_sincronizacao,
      ),
    }

    engageLock()

    return e.json(200, {
      route_version: ROUTE_VERSION,
      route: ROUTE_PATH,
      method: 'POST',
      lock_state: 'consumed',
      lock_key: LOCK_KEY,
      fixed_ids: FIXED_IDS,
      client_input_rejected: true,
      compensation_executed: true,
      deletion_executed: true,
      activecampaign_calls: 0,
      preconditions_met: true,
      deletion_order: deletionOrder,
      counts_before: countsBefore,
      counts_after: countsAfter,
      expected_counts_after: EXPECTED_COUNTS_AFTER,
      post_validation: postValidation,
      captured_records_before_deletion: capturedRecords,
      message: 'Compensation executed successfully — all three records deleted atomically',
    })
  },
  $apis.requireAuth(),
)
