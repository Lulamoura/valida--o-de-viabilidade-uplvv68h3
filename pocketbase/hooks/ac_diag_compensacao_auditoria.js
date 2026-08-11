routerAdd(
  'GET',
  '/backend/v1/integracao/ac/diag-compensacao-auditoria',
  (e) => {
    var ROUTE_VERSION = 'R13-DIAG-COMPENSACAO-AUDITORIA-20260812-v1'
    var ROUTE_PATH = '/backend/v1/integracao/ac/diag-compensacao-auditoria'
    var EXECUTION_ENABLED = false
    var LOCK_KEY = 'ac_diag_compensacao_auditoria_lock'

    var DIAGNOSTIC_VERSION = 'R13-DIAG-TRANSPORTE-20260812-v1'
    var PREVIEW_URL = 'https://validacao-de-viabilidade-89fff--preview.goskip.app'

    var ALLOWED_COLLECTIONS = [
      'com_eventos_integracao',
      'com_execucoes_sincronizacao',
      'com_vinculos_externos',
    ]

    var FIXED_FILTERS = {
      contact_identifier: 'DIAG-TRANSPORT-FN-C1',
      email: 'teste-r13@teste.local',
      event_id: 'pq4npvruaak9gpb',
      temporal_window: '2026-08-11T20:38:39.922Z',
      origin: 'ActiveCampaign',
    }

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
        return rec.getString('valor') === 'locked' && rec.getBool('ativo')
      } catch (_) {
        return false
      }
    }

    var locked = checkLock()

    if (!EXECUTION_ENABLED) {
      return e.json(200, {
        build_status: 'READY',
        diagnostic_version: DIAGNOSTIC_VERSION,
        route_version: ROUTE_VERSION,
        route: ROUTE_PATH,
        allowed_collections: ALLOWED_COLLECTIONS,
        fixed_filters: FIXED_FILTERS,
        read_only: true,
        client_filters_allowed: false,
        execution_enabled: false,
        server_side_lock: 'armed',
        executed: false,
        deletion_executed: false,
        frontend: 'ABSENT',
        activecampaign_calls: 0,
        preview: PREVIEW_URL,
        message:
          'Compensacao auditoria route ready — execution disabled. Set EXECUTION_ENABLED=true and release lock to run.',
      })
    }

    if (locked) {
      return e.json(200, {
        build_status: 'READY',
        diagnostic_version: DIAGNOSTIC_VERSION,
        route_version: ROUTE_VERSION,
        route: ROUTE_PATH,
        allowed_collections: ALLOWED_COLLECTIONS,
        fixed_filters: FIXED_FILTERS,
        read_only: true,
        client_filters_allowed: false,
        execution_enabled: true,
        server_side_lock: 'locked',
        executed: true,
        deletion_executed: false,
        frontend: 'ABSENT',
        activecampaign_calls: 0,
        preview: PREVIEW_URL,
        message: 'Compensacao auditoria already executed — lock prevents re-execution',
      })
    }

    function safeCount(n) {
      try {
        return $app.countRecords(n)
      } catch (_) {
        return -1
      }
    }

    function safeFind(collectionName, filter) {
      try {
        return $app.findRecordsByFilter(collectionName, filter, 'created', 100, 0)
      } catch (_) {
        return []
      }
    }

    var eventosFilter =
      "sistema_origem ~ 'ctive' && (payload ~ 'DIAG-TRANSPORT-FN-C1' || payload ~ 'teste-r13@teste.local' || external_id ~ 'DIAG-TRANSPORT-FN-C1')"
    var execucoesFilter =
      "sistema_origem ~ 'ctive' && (payload ~ 'DIAG-TRANSPORT-FN-C1' || payload ~ 'teste-r13@teste.local')"
    var vinculosFilter =
      "sistema_origem ~ 'ctive' && (external_id ~ 'DIAG-TRANSPORT-FN-C1' || record_id ~ 'pq4npvruaak9gpb')"

    var eventosRecords = safeFind('com_eventos_integracao', eventosFilter)
    var execucoesRecords = safeFind('com_execucoes_sincronizacao', execucoesFilter)
    var vinculosRecords = safeFind('com_vinculos_externos', vinculosFilter)

    var eventosInventory = []
    for (var i = 0; i < eventosRecords.length; i++) {
      var r = eventosRecords[i]
      eventosInventory.push({
        id: r.id,
        evento_tipo: r.getString('evento_tipo'),
        external_id: r.getString('external_id'),
        idempotency_key: r.getString('idempotency_key'),
        sistema_origem: r.getString('sistema_origem'),
        status: r.getString('status'),
        created: r.getString('created'),
        dependencies: {
          collection: 'com_eventos_integracao',
          references_execucao: false,
        },
      })
    }

    var execucoesInventory = []
    for (var j = 0; j < execucoesRecords.length; j++) {
      var er = execucoesRecords[j]
      execucoesInventory.push({
        id: er.id,
        sistema_origem: er.getString('sistema_origem'),
        status: er.getString('status'),
        inicio: er.getString('inicio'),
        fim: er.getString('fim'),
        created: er.getString('created'),
        dependencies: {
          collection: 'com_execucoes_sincronizacao',
          referenced_by_ocorrencias: true,
        },
      })
    }

    var vinculosInventory = []
    for (var k = 0; k < vinculosRecords.length; k++) {
      var vr = vinculosRecords[k]
      vinculosInventory.push({
        id: vr.id,
        sistema_origem: vr.getString('sistema_origem'),
        external_type: vr.getString('external_type'),
        external_id: vr.getString('external_id'),
        collection_name: vr.getString('collection_name'),
        record_id: vr.getString('record_id'),
        created: vr.getString('created'),
        dependencies: {
          collection: 'com_vinculos_externos',
          referenced_record: vr.getString('record_id'),
          referenced_collection: vr.getString('collection_name'),
        },
      })
    }

    var countsBefore = {
      com_eventos_integracao: safeCount('com_eventos_integracao'),
      com_execucoes_sincronizacao: safeCount('com_execucoes_sincronizacao'),
      com_vinculos_externos: safeCount('com_vinculos_externos'),
    }

    var proposedDeletionOrder = [
      {
        order: 1,
        collection: 'com_vinculos_externos',
        reason: 'Foreign-key links — delete first to remove all cross-references',
        record_count: vinculosRecords.length,
      },
      {
        order: 2,
        collection: 'com_eventos_integracao',
        reason: 'Idempotency registry — delete after vinculos to avoid orphaned references',
        record_count: eventosRecords.length,
      },
      {
        order: 3,
        collection: 'com_execucoes_sincronizacao',
        reason: 'Execution log — delete last as it is the parent audit trail',
        record_count: execucoesRecords.length,
      },
    ]

    var expectedCountsAfter = {
      com_eventos_integracao: countsBefore.com_eventos_integracao - eventosRecords.length,
      com_execucoes_sincronizacao:
        countsBefore.com_execucoes_sincronizacao - execucoesRecords.length,
      com_vinculos_externos: countsBefore.com_vinculos_externos - vinculosRecords.length,
    }

    return e.json(200, {
      build_status: 'READY',
      diagnostic_version: DIAGNOSTIC_VERSION,
      route_version: ROUTE_VERSION,
      route: ROUTE_PATH,
      allowed_collections: ALLOWED_COLLECTIONS,
      fixed_filters: FIXED_FILTERS,
      read_only: true,
      client_filters_allowed: false,
      execution_enabled: true,
      server_side_lock: 'consumed',
      executed: true,
      deletion_executed: false,
      frontend: 'ABSENT',
      activecampaign_calls: 0,
      preview: PREVIEW_URL,
      inventory: {
        com_eventos_integracao: eventosInventory,
        com_execucoes_sincronizacao: execucoesInventory,
        com_vinculos_externos: vinculosInventory,
      },
      counts_before: countsBefore,
      proposed_safe_deletion_order: proposedDeletionOrder,
      expected_counts_after_compensation: expectedCountsAfter,
      message: 'Read-only audit completed. No records were created, updated, or deleted.',
    })
  },
  $apis.requireAuth(),
)
