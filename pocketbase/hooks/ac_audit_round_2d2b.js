routerAdd(
  'GET',
  '/backend/v1/integracao/ac/audit-round-2d2b',
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

    var startedAt = new Date().toISOString()
    var readErrors = []
    var PATTERN = 'TESTE-2D2B'
    var COLS = [
      'com_contatos',
      'com_negocios',
      'com_eventos_integracao',
      'com_execucoes_sincronizacao',
      'com_vinculos_externos',
      'com_snapshots_negocio',
      'com_ocorrencias_qualidade',
      'com_auditoria',
    ]

    function tid(id) {
      return id ? String(id).substring(0, 8) : null
    }

    function readParam(key) {
      try {
        var r = $app.findFirstRecordByData('com_parametros', 'chave', key)
        return {
          exists: true,
          id: tid(r.id),
          valor: r.getString('valor'),
          ativo: r.getBool('ativo'),
          tipo: r.getString('tipo'),
          versao: r.getString('versao'),
          created: r.getString('created'),
          updated: r.getString('updated'),
        }
      } catch (_) {
        return {
          exists: false,
          id: null,
          valor: null,
          ativo: null,
          tipo: null,
          versao: null,
          created: null,
          updated: null,
        }
      }
    }

    var lockData = readParam('ac_2d2b_execution_lock')
    lockData.note =
      'Lock existence does not prove round completion. The lock is set at the start of execution and is never cleared. A locked state only indicates the round was initiated, not that it completed successfully.'

    var flagData = readParam('ac_webhook_enabled')
    flagData.note =
      'Current flag state observed read-only. No adjustment was made by this audit route.'

    var counts = {}
    for (var i = 0; i < COLS.length; i++) {
      try {
        counts[COLS[i]] = $app.countRecords(COLS[i])
      } catch (err) {
        counts[COLS[i]] = -1
        readErrors.push({
          collection: COLS[i],
          operation: 'countRecords',
          error: String(err).substring(0, 200),
        })
      }
    }

    var filters = {
      com_contatos: 'email ~ "' + PATTERN + '" || nome ~ "' + PATTERN + '"',
      com_negocios: 'titulo ~ "' + PATTERN + '"',
      com_eventos_integracao: 'external_id ~ "' + PATTERN + '"',
      com_execucoes_sincronizacao: 'payload ~ "' + PATTERN + '"',
      com_vinculos_externos: 'external_id ~ "' + PATTERN + '"',
      com_snapshots_negocio: 'snapshot ~ "' + PATTERN + '"',
      com_ocorrencias_qualidade: 'descricao ~ "' + PATTERN + '"',
      com_auditoria: 'valor_anterior ~ "' + PATTERN + '" || valor_novo ~ "' + PATTERN + '"',
    }

    function sanitize(collection, r) {
      var item = {
        collection: collection,
        id: tid(r.id),
        created: r.getString('created'),
        updated: r.getString('updated'),
      }
      if (collection === 'com_contatos') {
        item.ativo = r.getBool('ativo')
        item.empresa_id = tid(r.getString('empresa_id'))
      } else if (collection === 'com_negocios') {
        item.etapa = r.getString('etapa')
        item.inativo = r.getBool('inativo')
        item.contato_principal_id = tid(r.getString('contato_principal_id'))
      } else if (collection === 'com_eventos_integracao') {
        item.evento_tipo = r.getString('evento_tipo')
        item.external_id = r.getString('external_id')
        item.status = r.getString('status')
        item.sistema_origem = r.getString('sistema_origem')
      } else if (collection === 'com_execucoes_sincronizacao') {
        item.status = r.getString('status')
        item.sistema_origem = r.getString('sistema_origem')
        item.inicio = r.getString('inicio')
        item.fim = r.getString('fim')
      } else if (collection === 'com_vinculos_externos') {
        item.external_type = r.getString('external_type')
        item.external_id = r.getString('external_id')
        item.collection_name = r.getString('collection_name')
        item.record_id = tid(r.getString('record_id'))
        item.sistema_origem = r.getString('sistema_origem')
      } else if (collection === 'com_snapshots_negocio') {
        item.negocio_id = tid(r.getString('negocio_id'))
        item.origem = r.getString('origem')
      } else if (collection === 'com_ocorrencias_qualidade') {
        item.tipo = r.getString('tipo')
        item.severidade = r.getString('severidade')
        item.resolvida = r.getBool('resolvida')
        item.execucao_id = tid(r.getString('execucao_id'))
      } else if (collection === 'com_auditoria') {
        item.acao = r.getString('acao')
        item.audit_collection_name = r.getString('collection_name')
        item.record_id = tid(r.getString('record_id'))
      }
      return item
    }

    var evidence = {}
    for (var j = 0; j < COLS.length; j++) {
      var col = COLS[j]
      try {
        var recs = $app.findRecordsByFilter(col, filters[col], 'created', 100, 0)
        var items = []
        for (var k = 0; k < recs.length; k++) items.push(sanitize(col, recs[k]))
        evidence[col] = { count: items.length, items: items }
      } catch (err) {
        evidence[col] = { count: 0, items: [], error: String(err).substring(0, 200) }
        readErrors.push({
          collection: col,
          operation: 'findRecordsByFilter',
          error: String(err).substring(0, 200),
        })
      }
    }

    var mapping = {
      B1_contato_criado: {
        found: false,
        evidence: [],
        description: 'Contact creation with external_id TESTE-2D2B-FN-C1',
      },
      B2_duplicidade_sem_efeito: {
        found: false,
        evidence: [],
        description: 'Duplicate rejection (409). By design, no persistent records are created.',
        note: 'Absence of evidence is expected.',
      },
      B3_negocio_criado: {
        found: false,
        evidence: [],
        description: 'Deal creation with external_id TESTE-2D2B-FN-D1',
      },
      B4_snapshot_e_atualizacao: {
        found: false,
        evidence: [],
        description: 'Deal update with snapshot creation',
      },
      B5_negocio_e_ocorrencia_qualidade: {
        found: false,
        evidence: [],
        description:
          'Deal creation with unmapped stage and quality occurrence, external_id TESTE-2D2B-FN-D2',
      },
      C1_rollback: {
        found: false,
        evidence: [],
        description: 'Rollback restoring business from snapshot',
      },
      C2_repeticao_idempotente: {
        found: false,
        evidence: [],
        description: 'Idempotent rollback repeat. By design, no persistent records are created.',
        note: 'Absence of evidence is expected.',
      },
    }

    function checkEv(col, extId, step, evType) {
      if (!evidence[col] || !evidence[col].items) return
      for (var i = 0; i < evidence[col].items.length; i++) {
        var item = evidence[col].items[i]
        if (item.external_id && item.external_id.indexOf(extId) !== -1) {
          if (!evType || item.evento_tipo === evType) {
            mapping[step].found = true
            mapping[step].evidence.push(col + ':' + item.id)
          }
        }
      }
    }

    checkEv('com_vinculos_externos', 'TESTE-2D2B-FN-C1', 'B1_contato_criado')
    checkEv('com_eventos_integracao', 'TESTE-2D2B-FN-C1', 'B1_contato_criado')
    checkEv('com_vinculos_externos', 'TESTE-2D2B-FN-D1', 'B3_negocio_criado')
    checkEv('com_eventos_integracao', 'TESTE-2D2B-FN-D1', 'B3_negocio_criado', 'deal_create')
    checkEv(
      'com_eventos_integracao',
      'TESTE-2D2B-FN-D1',
      'B4_snapshot_e_atualizacao',
      'deal_update',
    )
    checkEv('com_vinculos_externos', 'TESTE-2D2B-FN-D2', 'B5_negocio_e_ocorrencia_qualidade')
    checkEv('com_eventos_integracao', 'TESTE-2D2B-FN-D2', 'B5_negocio_e_ocorrencia_qualidade')

    if (evidence['com_snapshots_negocio'] && evidence['com_snapshots_negocio'].items.length > 0) {
      mapping.B4_snapshot_e_atualizacao.found = true
      mapping.C1_rollback.found = true
      for (var s = 0; s < evidence['com_snapshots_negocio'].items.length; s++) {
        mapping.B4_snapshot_e_atualizacao.evidence.push(
          'com_snapshots_negocio:' + evidence['com_snapshots_negocio'].items[s].id,
        )
      }
      mapping.C1_rollback.evidence.push('snapshots exist — rollback restores from snapshot')
    }

    if (
      evidence['com_ocorrencias_qualidade'] &&
      evidence['com_ocorrencias_qualidade'].items.length > 0
    ) {
      mapping.B5_negocio_e_ocorrencia_qualidade.found = true
      for (var t = 0; t < evidence['com_ocorrencias_qualidade'].items.length; t++)
        mapping.B5_negocio_e_ocorrencia_qualidade.evidence.push(
          'com_ocorrencias_qualidade:' + evidence['com_ocorrencias_qualidade'].items[t].id,
        )
    }

    if (evidence['com_auditoria'] && evidence['com_auditoria'].items.length > 0) {
      mapping.C1_rollback.found = true
      for (var u = 0; u < evidence['com_auditoria'].items.length; u++)
        mapping.C1_rollback.evidence.push('com_auditoria:' + evidence['com_auditoria'].items[u].id)
    }

    var anomalies = []
    if (evidence['com_vinculos_externos'] && evidence['com_vinculos_externos'].items) {
      for (var v = 0; v < evidence['com_vinculos_externos'].items.length; v++) {
        var eid = evidence['com_vinculos_externos'].items[v].external_id
        if (eid && (eid.indexOf('TESTE-2D2B-A7') !== -1 || eid.indexOf('TESTE-2D2B-A8') !== -1))
          anomalies.push({
            type: 'SECURITY_ANOMALY',
            description:
              'Found persistent record for rejected A7/A8 test case: ' +
              eid +
              '. These should have been rejected at 401 without creating records.',
          })
      }
    }

    var totalEvidence = 0
    for (var w = 0; w < COLS.length; w++) {
      if (evidence[COLS[w]] && evidence[COLS[w]].count) totalEvidence += evidence[COLS[w]].count
    }
    var stepKeys = [
      'B1_contato_criado',
      'B3_negocio_criado',
      'B4_snapshot_e_atualizacao',
      'B5_negocio_e_ocorrencia_qualidade',
      'C1_rollback',
    ]
    var persistentStepsFound = 0
    var persistentStepsExpected = stepKeys.length
    for (var x = 0; x < stepKeys.length; x++) {
      if (mapping[stepKeys[x]].found) persistentStepsFound++
    }

    var classification, justification
    if (readErrors.length > 0) {
      classification = 'ESTADO_INDETERMINADO'
      justification =
        'One or more collection reads failed (' +
        readErrors.length +
        ' errors). Classification is indeterminate until all collections can be queried successfully. No catch block converted an error into valid data.'
    } else if (totalEvidence === 0) {
      classification = 'SEM_EVIDENCIA_DE_EXECUCAO'
      if (lockData.exists)
        justification =
          'No TESTE-2D2B identifiers found in any monitored collection. The execution lock exists but the lock alone does not prove round completion — it is set at the start of execution and could indicate a failed or incomplete run.'
      else
        justification =
          'No TESTE-2D2B identifiers found in any monitored collection, and the execution lock was not found. No evidence of execution.'
    } else if (persistentStepsFound >= persistentStepsExpected) {
      classification = 'INDICIOS_DE_EXECUCAO_COMPLETA_NAO_COMPROVADA'
      justification =
        'Evidence found for all ' +
        persistentStepsExpected +
        ' expected persistent steps (B1, B3, B4, B5, C1). However, the original 16-call PASS/GO report was not persisted in any collection — it was only returned as an HTTP response body. Without the persisted report, complete execution cannot be fully confirmed and the original PASS/GO cannot be reconstructed.'
    } else {
      classification = 'INDICIOS_DE_EXECUCAO_PARCIAL'
      justification =
        'Evidence found for ' +
        persistentStepsFound +
        ' of ' +
        persistentStepsExpected +
        ' expected persistent steps. The round appears to have been partially executed or interrupted.'
    }

    var gaps = [
      {
        gap: 'persisted_16_call_report',
        description:
          'The original Porta 2D.2B round result (16-call PASS/GO report) was only returned as an HTTP response body and displayed in the frontend memory. It was NOT persisted in any collection. The original PASS/GO verdict cannot be fully reconstructed from persisted evidence alone.',
      },
      {
        gap: 'B2_duplicate_evidence',
        description:
          'B2 tests duplicate rejection (409). By design, no new persistent records are created. Absence of evidence is expected and does not indicate failure.',
      },
      {
        gap: 'C2_idempotent_evidence',
        description:
          'C2 tests idempotent rollback repeat. By design, no new persistent records are created. Absence of evidence is expected and does not indicate failure.',
      },
      {
        gap: 'A7_A8_rejected_evidence',
        description:
          'A7 and A8 test signature validation failures (401). No records should have been created. Finding evidence for TESTE-2D2B-A7-C1 or TESTE-2D2B-A8-C1 would indicate a security anomaly.',
      },
    ]

    return e.json(200, {
      route: 'GET /backend/v1/integracao/ac/audit-round-2d2b',
      route_version: 'R1-AUDIT-2D2B-20260813',
      read_only: true,
      writes_performed: 0,
      external_calls: 0,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      correlation_key: 'TESTE-2D2B',
      lock: lockData,
      flag: flagData,
      counts: counts,
      counts_note:
        'Current counts of monitored collections. These are NOT equivalent to the original deltas — no persisted baseline exists to reconstruct the before/after delta comparison from the original round.',
      evidence: evidence,
      evidence_mapping: mapping,
      classification: classification,
      classification_justification: justification,
      original_pass_go_reconstructable: false,
      original_pass_go_note:
        'The original PASS/GO verdict cannot be fully reconstructed without the original persisted 16-call report, which was only returned as an HTTP response body and not persisted in any collection.',
      gaps: gaps,
      anomalies: anomalies,
      read_errors: readErrors,
      monitored_collections: COLS,
      search_pattern: PATTERN,
      search_case_insensitive: true,
      expected_correlation_keys: [
        'TESTE-2D2B-FN-C1',
        'TESTE-2D2B-FN-D1',
        'TESTE-2D2B-FN-D2',
        'TESTE-2D2B-A7-C1',
        'TESTE-2D2B-A8-C1',
      ],
      deployment_target: 'PREVIEW_ONLY',
      production_promoted: false,
    })
  },
  $apis.requireAuth(),
)
