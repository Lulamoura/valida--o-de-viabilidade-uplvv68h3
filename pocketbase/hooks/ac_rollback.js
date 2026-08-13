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

    // ═══ BODY SIZE: early rejection via Content-Length (defense in depth) ═══
    var contentLength = parseInt(e.request.header.get('Content-Length') || '0', 10)
    if (contentLength > 262144) {
      return e.badRequestError('Corpo da requisicao excede o limite de 256KB')
    }

    // ═══ RAW BODY: read before any parsing ═══
    var rawBody = toString(e.request.body)
    if (!rawBody) {
      return e.badRequestError('Corpo da requisicao vazio')
    }

    // ═══ SIGNATURE: identical contract to approved ac_webhook.js ═══
    var signature = e.request.header.get('X-AC-Signature') || ''
    if (!signature) {
      return e.json(401, { error: 'missing_signature', message: 'Assinatura ausente' })
    }

    var hexPattern = /^[0-9a-fA-F]{64}$/
    if (!hexPattern.test(signature)) {
      return e.json(401, {
        error: 'invalid_signature_format',
        message: 'Assinatura deve ser uma string hexadecimal de 64 caracteres',
      })
    }

    signature = signature.toLowerCase()

    var webhookSecret = $secrets.get('AC_WEBHOOK_SECRET') || ''
    if (!webhookSecret) {
      $app.logger().error('AC_WEBHOOK_SECRET not configured')
      return e.internalServerError('Configuracao do servidor ausente')
    }

    var expectedSig = $security.hs256(rawBody, webhookSecret)

    if (expectedSig.length !== signature.length) {
      return e.json(401, { error: 'invalid_signature', message: 'Assinatura invalida' })
    }
    var sigDiff = 0
    for (var si = 0; si < expectedSig.length; si++) {
      sigDiff |= expectedSig.charCodeAt(si) ^ signature.charCodeAt(si)
    }
    if (sigDiff !== 0) {
      return e.json(401, { error: 'invalid_signature', message: 'Assinatura invalida' })
    }

    // ═══ PARSE BODY ═══
    var body
    try {
      body = JSON.parse(rawBody)
    } catch (parseErr) {
      return e.badRequestError('Corpo da requisicao nao e JSON valido')
    }

    // ═══ TIMESTAMP: validate before any persistence (fail closed) ═══
    var eventTimestamp = body.timestamp || body.ts || ''
    if (!eventTimestamp) {
      return e.badRequestError('Timestamp obrigatorio ausente')
    }
    var eventTime = new Date(eventTimestamp).getTime()
    if (isNaN(eventTime)) {
      return e.badRequestError('Timestamp invalido')
    }
    if (Math.abs(Date.now() - eventTime) > 300000) {
      return e.badRequestError('Evento fora da janela de tempo permitida (5 minutos)')
    }

    var externalId = body.external_id || ''
    var entityType = body.entity_type || ''
    var sistemaOrigem = 'activecampaign'

    if (!externalId || !entityType) {
      return e.badRequestError('external_id e entity_type sao obrigatorios')
    }

    // ═══ LOCATE RECORDS VIA EXTERNAL LINK ═══
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

      // ═══ FAIL-CLOSED: no target record ═══
      if (!record) {
        return e.json(404, {
          error: 'Registro vinculado nao encontrado',
          collection: collectionName,
          record_id: recordId,
        })
      }

      // ═══ BUSINESS RESTORE: only com_negocios, fail-closed for missing snapshot ═══
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

        if (snapshots.length === 0) {
          return e.json(404, {
            error: 'Nenhum snapshot disponivel para restauracao',
            collection: collectionName,
            record_id: recordId,
          })
        }

        var snapshotId = snapshots[0].id
        var snapData = JSON.parse(snapshots[0].getString('snapshot') || '{}')

        // ═══ DETERMINISTIC IDEMPOTENCY KEY ═══
        var idempotencyKey = $security.sha256(
          sistemaOrigem +
            '|rollback|' +
            entityType +
            '|' +
            externalId +
            '|' +
            recordId +
            '|' +
            snapshotId,
        )

        // ═══ IDEMPOTENT EARLY RETURN ═══
        var existingCompEvent = null
        try {
          existingCompEvent = $app.findFirstRecordByData(
            'com_eventos_integracao',
            'idempotency_key',
            idempotencyKey,
          )
        } catch (_) {}

        if (existingCompEvent) {
          return e.json(200, {
            success: true,
            rolled_back: [],
            idempotent: true,
          })
        }

        // ═══ ATOMIC RESTORE: business restore + compensating event in one transaction ═══
        try {
          $app.runInTransaction(function (txApp) {
            // Restore business record from snapshot
            var txRecord = txApp.findRecordById('com_negocios', recordId)
            if (snapData.titulo) txRecord.set('titulo', snapData.titulo)
            if (snapData.etapa) txRecord.set('etapa', snapData.etapa)
            if (snapData.resultado) txRecord.set('resultado', snapData.resultado)
            txApp.save(txRecord)

            // Create single compensating event
            var evCol = txApp.findCollectionByNameOrId('com_eventos_integracao')
            var compEv = new Record(evCol)
            compEv.set('sistema_origem', sistemaOrigem)
            compEv.set('evento_tipo', 'rollback')
            compEv.set('external_id', externalId)
            compEv.set('idempotency_key', idempotencyKey)
            compEv.set(
              'payload',
              JSON.stringify({
                entity_type: entityType,
                record_id: recordId,
                snapshot_id: snapshotId,
              }),
            )
            compEv.set('status', 'rollback_executed')
            txApp.save(compEv)

            rolledBack.push({
              collection: collectionName,
              record_id: recordId,
              restored_from_snapshot: snapshotId,
              compensating_event: compEv.id,
            })
          })
        } catch (txErr) {
          return e.json(500, {
            error: 'Falha na restauracao atomica',
            detail: String(txErr).substring(0, 500),
          })
        }
      } else {
        // ═══ NON-BUSINESS ENTITIES: deactivate (no physical delete) ═══
        // For non-business entities, fail-closed if no 'ativo' field
        try {
          record.set('ativo', false)
          $app.save(record)
          rolledBack.push({
            collection: collectionName,
            record_id: recordId,
            action: 'deactivated',
          })
        } catch (_) {
          return e.json(500, {
            error: 'Nao foi possivel desativar o registro',
            collection: collectionName,
            record_id: recordId,
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
  $apis.bodyLimit(262144),
)
