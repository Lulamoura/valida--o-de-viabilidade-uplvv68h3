routerAdd(
  'POST',
  '/backend/v1/integracao/ac/rollback',
  (e) => {
    // ═══ ACTIVATION FLAG: server-side parameter (never exposed to frontend) ═══
    var ROLLBACK_ENABLED = false
    try {
      var _flagParam = $app.findFirstRecordByData('com_parametros', 'chave', 'ac_webhook_enabled')
      if (_flagParam && _flagParam.getString('valor') === 'true' && _flagParam.getBool('ativo'))
        ROLLBACK_ENABLED = true
    } catch (_) {}
    if (!ROLLBACK_ENABLED) {
      return e.json(503, {
        error: 'Rollback desabilitado',
        stage: 'porta-2d-etapa-2a',
        enabled: false,
      })
    }

    var authId = e.auth ? e.auth.id : ''
    if (!authId) return e.unauthorizedError('Autenticacao necessaria')

    var isSuperAdmin = false
    try {
      var authPerfilId = e.auth.getString('perfil_id')
      if (authPerfilId) {
        var perfilRec = $app.findRecordById('com_perfis', authPerfilId)
        if (perfilRec.getString('slug') === 'superadministrador') isSuperAdmin = true
      }
    } catch (_) {}
    if (!isSuperAdmin) {
      try {
        var saPerfil = $app.findFirstRecordByData('com_perfis', 'slug', 'superadministrador')
        if (saPerfil) {
          var saBindings = $app.findRecordsByFilter(
            'com_usuarios_equipes',
            "usuario_id = '" + authId + "' && perfil_id = '" + saPerfil.id + "' && ativo = true",
            '',
            1,
            0,
          )
          if (saBindings && saBindings.length > 0) isSuperAdmin = true
        }
      } catch (_) {}
    }
    if (!isSuperAdmin) return e.forbiddenError('Apenas superadministrador pode executar rollback')

    var body = e.requestInfo().body || {}
    var externalId = body.external_id || ''
    var entityType = body.entity_type || ''
    var sistemaOrigem = 'activecampaign'

    if (!externalId || !entityType) {
      return e.badRequestError('external_id e entity_type sao obrigatorios')
    }

    // ═══ LOCATE RECORDS VIA COMPOSITE EXTERNAL LINK + record_id ═══
    var vinculos = []
    try {
      vinculos = $app.findRecordsByFilter(
        'com_vinculos_externos',
        "sistema_origem = '" +
          sistemaOrigem +
          "' && external_type = '" +
          entityType +
          "' && external_id = '" +
          externalId +
          "'",
        '-created',
        500,
        0,
      )
    } catch (_) {}

    if (vinculos.length === 0) {
      return e.json(404, {
        error: 'Nenhum vinculo externo encontrado para a entidade especificada',
      })
    }

    var rolledBack = []

    for (var i = 0; i < vinculos.length; i++) {
      var vinculo = vinculos[i]
      var collectionName = vinculo.getString('collection_name')
      var recordId = vinculo.getString('record_id')

      var record = null
      try {
        record = $app.findRecordById(collectionName, recordId)
      } catch (_) {}
      if (!record) continue

      // For negocios: restore from latest immutable snapshot
      if (collectionName === 'com_negocios') {
        var snapshots = []
        try {
          snapshots = $app.findRecordsByFilter(
            'com_snapshots_negocio',
            "negocio_id = '" + recordId + "'",
            '-created',
            1,
            0,
          )
        } catch (_) {}

        if (snapshots.length > 0) {
          var snapData = JSON.parse(snapshots[0].getString('snapshot') || '{}')
          if (snapData.titulo) record.set('titulo', snapData.titulo)
          if (snapData.etapa) record.set('etapa', snapData.etapa)
          if (snapData.resultado) record.set('resultado', snapData.resultado)
          $app.save(record)

          // Create compensating event
          var evCol = $app.findCollectionByNameOrId('com_eventos_integracao')
          var compEv = new Record(evCol)
          compEv.set('sistema_origem', sistemaOrigem)
          compEv.set('evento_tipo', 'rollback')
          compEv.set('external_id', externalId)
          compEv.set(
            'idempotency_key',
            $security.sha256(
              sistemaOrigem + '|rollback|' + externalId + '|' + recordId + '|' + Date.now(),
            ),
          )
          compEv.set(
            'payload',
            JSON.stringify({
              entity_type: entityType,
              record_id: recordId,
              snapshot_id: snapshots[0].id,
            }),
          )
          compEv.set('status', 'rollback_executed')
          $app.save(compEv)

          rolledBack.push({
            collection: collectionName,
            record_id: recordId,
            restored_from_snapshot: snapshots[0].id,
            compensating_event: compEv.id,
          })
        } else {
          rolledBack.push({
            collection: collectionName,
            record_id: recordId,
            restored: false,
            reason: 'No snapshot available for restoration',
          })
        }
      } else {
        // For non-business entities: mark as inactive (no physical delete)
        try {
          record.set('ativo', false)
          $app.save(record)
          rolledBack.push({
            collection: collectionName,
            record_id: recordId,
            action: 'deactivated',
          })
        } catch (_) {
          rolledBack.push({
            collection: collectionName,
            record_id: recordId,
            restored: false,
            reason: 'Could not deactivate record',
          })
        }
      }
    }

    return e.json(200, {
      success: true,
      external_id: externalId,
      entity_type: entityType,
      rolled_back: rolledBack,
      note: 'No physical deletes performed. History preserved via snapshots and compensating events.',
    })
  },
  $apis.requireAuth(),
)
