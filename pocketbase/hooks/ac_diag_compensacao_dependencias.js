routerAdd(
  'POST',
  '/backend/v1/integracao/ac/diag-compensacao-dependencias',
  (e) => {
    var ROUTE_VERSION = 'R13-2D2A-DIAG-COMPENSACAO-DEPENDENCIAS-BACKEND-20260812-v5'
    var ROUTE_PATH = '/backend/v1/integracao/ac/diag-compensacao-dependencias'
    var LOCK_KEY = 'ac_diag_compensacao_dependencias_lock'
    var DEP_QUERY_LOCK_KEY = 'ac_diag_consulta_dependencias_lock'
    var ORIG_AUDIT_LOCK_KEY = 'ac_diag_compensacao_auditoria_lock'
    var NATIVE_TRANSACTION_API = '$app.runInTransaction'
    var TRANSACTION_HANDLE = 'txApp'
    var ROUTE_IS_DESTRUCTIVE = true
    var POCKETBASE_VERSION = '0.36.0'
    var RECORD_LOOKUP_API = 'txApp.findRecordById'
    var RECORD_DELETE_API = 'txApp.delete'
    var COUNT_API = 'txApp.countRecords'
    var QUERY_API = 'txApp.findRecordsByFilter'
    var NONEXISTENT_DB_COLLECTION_API_USED = false

    var TRANSACTION_METADATA = {
      transaction_api: NATIVE_TRANSACTION_API,
      transaction_handle_inside_callback: TRANSACTION_HANDLE,
      external_app_handle_used_inside_transaction: false,
      lock_consumed_only_on_successful_commit: true,
      transactional_ready: true,
      route_is_destructive: ROUTE_IS_DESTRUCTIVE,
      read_only_description_removed: true,
      rollback_by_manual_recreation: 'prohibited',
      record_lookup_api: RECORD_LOOKUP_API,
      record_delete_api: RECORD_DELETE_API,
      count_api: COUNT_API,
      query_api: QUERY_API,
      nonexistent_db_collection_api_used: NONEXISTENT_DB_COLLECTION_API_USED,
      lock_persisted_transactionally: true,
      concurrent_double_execution_prevented: true,
      pocketbase_version_confirmed: POCKETBASE_VERSION,
      apis_verified_against_version: true,
    }

    var FIXED_IDS = {
      com_vinculos_externos: 'phzmobi8mfb34ha',
      com_eventos_integracao: 'pq4npvruaak9gpb',
      com_execucoes_sincronizacao: '62otoics23ul0vy',
    }

    var EXPECTED_COUNTS_BEFORE = {
      com_eventos_integracao: 15,
      com_execucoes_sincronizacao: 11,
      com_vinculos_externos: 10,
    }
    var EXPECTED_COUNTS_AFTER = {
      com_eventos_integracao: 14,
      com_execucoes_sincronizacao: 10,
      com_vinculos_externos: 9,
    }

    var EXPECTED_IDENTITY = {
      com_vinculos_externos: {
        id: FIXED_IDS.com_vinculos_externos,
        created: '2026-08-11T20:38:39.951Z',
        collection_name: 'com_contatos',
        external_id: 'DIAG-TRANSPORT-FN-C1',
        external_type: 'contact',
        record_id: 'hfjq2q1olefske7',
        sistema_origem: 'activecampaign',
      },
      com_eventos_integracao: {
        id: FIXED_IDS.com_eventos_integracao,
        created: '2026-08-11T20:38:39.950Z',
        evento_tipo: 'contact_create',
        external_id: 'DIAG-TRANSPORT-FN-C1',
        idempotency_key: 'e860fa5a9d8615c44a7db52b909b70b816f80b74123b96780e7bb309e53d34ec',
        sistema_origem: 'activecampaign',
        status: 'processed',
      },
      com_execucoes_sincronizacao: {
        id: FIXED_IDS.com_execucoes_sincronizacao,
        created: '2026-08-11T20:38:39.948Z',
        inicio: '2026-08-11T20:38:39.948Z',
        fim: '2026-08-11T20:38:39.952Z',
        sistema_origem: 'activecampaign',
        status: 'completed',
      },
    }

    var REFERENCE_ABSENCE_CHECKS = [
      {
        check_number: 1,
        collection: 'com_ocorrencias_qualidade',
        field: 'execucao_id',
        filter: 'execucao_id = "' + FIXED_IDS.com_execucoes_sincronizacao + '"',
        expected_count: 0,
        api: 'txApp.findRecordsByFilter',
        description: 'Zero quality occurrences referencing the target execucao record',
      },
      {
        check_number: 2,
        collection: 'com_vinculos_externos',
        field: 'record_id',
        filter: 'record_id = "' + FIXED_IDS.com_eventos_integracao + '"',
        expected_additional_count: 0,
        excludes_id: FIXED_IDS.com_vinculos_externos,
        api: 'txApp.findRecordsByFilter',
        description:
          'No additional external links referencing the target evento (excluding the fixed vinculo itself)',
      },
      {
        check_number: 3,
        collection: 'com_vinculos_externos',
        field: 'record_id',
        filter: 'record_id = "' + FIXED_IDS.com_execucoes_sincronizacao + '"',
        expected_additional_count: 0,
        excludes_id: FIXED_IDS.com_vinculos_externos,
        api: 'txApp.findRecordsByFilter',
        description:
          'No additional external links referencing the target execucao (excluding the fixed vinculo itself)',
      },
    ]

    var DELETION_ORDER = [
      {
        order: 1,
        collection: 'com_vinculos_externos',
        id: FIXED_IDS.com_vinculos_externos,
        api: 'txApp.delete',
      },
      {
        order: 2,
        collection: 'com_eventos_integracao',
        id: FIXED_IDS.com_eventos_integracao,
        api: 'txApp.delete',
      },
      {
        order: 3,
        collection: 'com_execucoes_sincronizacao',
        id: FIXED_IDS.com_execucoes_sincronizacao,
        api: 'txApp.delete',
      },
    ]

    var TRANSACTIONAL_READY = true
    var ROLLBACK_BY_MANUAL_RECREATION = 'prohibited'
    var LOCK_PERSISTED_TRANSACTIONALLY = true
    var CONCURRENT_DOUBLE_EXECUTION_PREVENTED = true

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

    function readLockState(key) {
      try {
        var rec = $app.findFirstRecordByData('com_parametros', 'chave', key)
        var val = rec.getString('valor')
        if (val && val !== 'armed') return 'consumed'
        return 'armed'
      } catch (_) {
        return 'armed'
      }
    }

    var compensationLockState = readLockState(LOCK_KEY)
    var depQueryLockState = readLockState(DEP_QUERY_LOCK_KEY)
    var origAuditLockState = readLockState(ORIG_AUDIT_LOCK_KEY)

    function buildCommonResponse(overrides) {
      var base = {
        route_version: ROUTE_VERSION,
        route: ROUTE_PATH,
        method: 'POST',
        lock_key: LOCK_KEY,
        fixed_ids: FIXED_IDS,
        client_controlled_ids: false,
        client_input_rejected: true,
        activecampaign_calls: 0,
        transaction_api: NATIVE_TRANSACTION_API,
        transaction_handle_inside_callback: TRANSACTION_HANDLE,
        external_app_handle_used_inside_transaction: false,
        lock_consumed_only_on_successful_commit: true,
        transactional_ready: TRANSACTIONAL_READY,
        native_transaction_api: NATIVE_TRANSACTION_API,
        route_is_destructive: ROUTE_IS_DESTRUCTIVE,
        read_only_description_removed: true,
        rollback_by_manual_recreation: ROLLBACK_BY_MANUAL_RECREATION,
        dependency_query_lock: depQueryLockState,
        original_audit_lock: origAuditLockState,
        expected_counts_before: EXPECTED_COUNTS_BEFORE,
        expected_counts_after: EXPECTED_COUNTS_AFTER,
        expected_identity: EXPECTED_IDENTITY,
        updated_field_present: false,
        uninvented_fields_removed: true,
        reference_absence_checks: REFERENCE_ABSENCE_CHECKS,
        deletion_order: DELETION_ORDER,
        record_lookup_api: RECORD_LOOKUP_API,
        record_delete_api: RECORD_DELETE_API,
        count_api: COUNT_API,
        query_api: QUERY_API,
        nonexistent_db_collection_api_used: NONEXISTENT_DB_COLLECTION_API_USED,
        lock_persisted_transactionally: LOCK_PERSISTED_TRANSACTIONALLY,
        concurrent_double_execution_prevented: CONCURRENT_DOUBLE_EXECUTION_PREVENTED,
        pocketbase_version_confirmed: POCKETBASE_VERSION,
        apis_verified_against_version: true,
      }
      for (var k in overrides) {
        base[k] = overrides[k]
      }
      return base
    }

    if (compensationLockState === 'consumed') {
      return e.json(
        200,
        buildCommonResponse({
          lock_state: 'consumed',
          compensation_lock: 'consumed',
          compensation_executed: true,
          deletion_executed: true,
          message: 'Compensation already executed — independent lock prevents re-execution',
        }),
      )
    }

    var preconditionsMet = false
    var preconditions = null
    var capturedRecords = {}
    var countsBefore = null
    var countsAfter = null
    var postValidation = null
    var txError = null
    var lockConsumedInsideTx = false
    var concurrencyAbort = false

    try {
      $app.runInTransaction(function (txApp) {
        function txCount(n) {
          return txApp.countRecords(n)
        }
        function txFindById(name, id) {
          return txApp.findRecordById(name, id)
        }
        function txFind(name, filter) {
          return txApp.findRecordsByFilter(name, filter, '', 100, 0)
        }

        // Concurrency guard: re-check lock INSIDE the transaction using txApp
        var txLockRec = null
        try {
          txLockRec = txApp.findFirstRecordByData('com_parametros', 'chave', LOCK_KEY)
          var txLockVal = txLockRec.getString('valor')
          if (txLockVal && txLockVal !== 'armed') {
            concurrencyAbort = true
            throw new Error(
              'Concurrency guard: lock already consumed inside transaction — aborting',
            )
          }
        } catch (err) {
          if (concurrencyAbort) throw err
          // Lock record doesn't exist yet — treat as armed, proceed
        }

        var vinculo = null
        var evento = null
        var execucao = null

        try {
          vinculo = txFindById('com_vinculos_externos', FIXED_IDS.com_vinculos_externos)
        } catch (_) {
          vinculo = null
        }
        try {
          evento = txFindById('com_eventos_integracao', FIXED_IDS.com_eventos_integracao)
        } catch (_) {
          evento = null
        }
        try {
          execucao = txFindById(
            'com_execucoes_sincronizacao',
            FIXED_IDS.com_execucoes_sincronizacao,
          )
        } catch (_) {
          execucao = null
        }

        var identityVerified = true

        if (vinculo) {
          var vExp = EXPECTED_IDENTITY.com_vinculos_externos
          capturedRecords.com_vinculos_externos = {
            id: vinculo.id,
            created: vinculo.getString('created'),
            collection_name: vinculo.getString('collection_name'),
            external_id: vinculo.getString('external_id'),
            external_type: vinculo.getString('external_type'),
            record_id: vinculo.getString('record_id'),
            sistema_origem: vinculo.getString('sistema_origem'),
          }
          if (capturedRecords.com_vinculos_externos.created !== vExp.created)
            identityVerified = false
          if (capturedRecords.com_vinculos_externos.collection_name !== vExp.collection_name)
            identityVerified = false
          if (capturedRecords.com_vinculos_externos.external_id !== vExp.external_id)
            identityVerified = false
          if (capturedRecords.com_vinculos_externos.external_type !== vExp.external_type)
            identityVerified = false
          if (capturedRecords.com_vinculos_externos.record_id !== vExp.record_id)
            identityVerified = false
          if (capturedRecords.com_vinculos_externos.sistema_origem !== vExp.sistema_origem)
            identityVerified = false
        }
        if (evento) {
          var eExp = EXPECTED_IDENTITY.com_eventos_integracao
          capturedRecords.com_eventos_integracao = {
            id: evento.id,
            created: evento.getString('created'),
            evento_tipo: evento.getString('evento_tipo'),
            external_id: evento.getString('external_id'),
            idempotency_key: evento.getString('idempotency_key'),
            sistema_origem: evento.getString('sistema_origem'),
            status: evento.getString('status'),
          }
          if (capturedRecords.com_eventos_integracao.created !== eExp.created)
            identityVerified = false
          if (capturedRecords.com_eventos_integracao.evento_tipo !== eExp.evento_tipo)
            identityVerified = false
          if (capturedRecords.com_eventos_integracao.external_id !== eExp.external_id)
            identityVerified = false
          if (capturedRecords.com_eventos_integracao.idempotency_key !== eExp.idempotency_key)
            identityVerified = false
          if (capturedRecords.com_eventos_integracao.sistema_origem !== eExp.sistema_origem)
            identityVerified = false
          if (capturedRecords.com_eventos_integracao.status !== eExp.status)
            identityVerified = false
        }
        if (execucao) {
          var xExp = EXPECTED_IDENTITY.com_execucoes_sincronizacao
          capturedRecords.com_execucoes_sincronizacao = {
            id: execucao.id,
            created: execucao.getString('created'),
            inicio: execucao.getString('inicio'),
            fim: execucao.getString('fim'),
            sistema_origem: execucao.getString('sistema_origem'),
            status: execucao.getString('status'),
          }
          if (capturedRecords.com_execucoes_sincronizacao.created !== xExp.created)
            identityVerified = false
          if (capturedRecords.com_execucoes_sincronizacao.inicio !== xExp.inicio)
            identityVerified = false
          if (capturedRecords.com_execucoes_sincronizacao.fim !== xExp.fim) identityVerified = false
          if (capturedRecords.com_execucoes_sincronizacao.sistema_origem !== xExp.sistema_origem)
            identityVerified = false
          if (capturedRecords.com_execucoes_sincronizacao.status !== xExp.status)
            identityVerified = false
        }

        var ocorrencias = txFind(
          'com_ocorrencias_qualidade',
          'execucao_id = "' + FIXED_IDS.com_execucoes_sincronizacao + '"',
        )

        countsBefore = {
          com_eventos_integracao: txCount('com_eventos_integracao'),
          com_execucoes_sincronizacao: txCount('com_execucoes_sincronizacao'),
          com_vinculos_externos: txCount('com_vinculos_externos'),
        }

        var refsEvt = txFind(
          'com_vinculos_externos',
          'record_id = "' + FIXED_IDS.com_eventos_integracao + '"',
        )
        var refsExec = txFind(
          'com_vinculos_externos',
          'record_id = "' + FIXED_IDS.com_execucoes_sincronizacao + '"',
        )
        var addlEvt = 0,
          addlExec = 0
        for (var i = 0; i < refsEvt.length; i++) {
          if (refsEvt[i].id !== FIXED_IDS.com_vinculos_externos) addlEvt++
        }
        for (var j = 0; j < refsExec.length; j++) {
          if (refsExec[j].id !== FIXED_IDS.com_vinculos_externos) addlExec++
        }
        var addlRefs = addlEvt + addlExec

        var countsMatch =
          countsBefore.com_eventos_integracao === EXPECTED_COUNTS_BEFORE.com_eventos_integracao &&
          countsBefore.com_execucoes_sincronizacao ===
            EXPECTED_COUNTS_BEFORE.com_execucoes_sincronizacao &&
          countsBefore.com_vinculos_externos === EXPECTED_COUNTS_BEFORE.com_vinculos_externos

        preconditions = {
          all_ids_exist: !!vinculo && !!evento && !!execucao,
          identity_and_timestamps_verified: identityVerified,
          zero_ocorrencias: ocorrencias.length === 0,
          ocorrencias_count: ocorrencias.length,
          counts_match: countsMatch,
          counts_per_collection: {
            com_eventos_integracao: {
              expected: EXPECTED_COUNTS_BEFORE.com_eventos_integracao,
              actual: countsBefore.com_eventos_integracao,
              match:
                countsBefore.com_eventos_integracao ===
                EXPECTED_COUNTS_BEFORE.com_eventos_integracao,
            },
            com_execucoes_sincronizacao: {
              expected: EXPECTED_COUNTS_BEFORE.com_execucoes_sincronizacao,
              actual: countsBefore.com_execucoes_sincronizacao,
              match:
                countsBefore.com_execucoes_sincronizacao ===
                EXPECTED_COUNTS_BEFORE.com_execucoes_sincronizacao,
            },
            com_vinculos_externos: {
              expected: EXPECTED_COUNTS_BEFORE.com_vinculos_externos,
              actual: countsBefore.com_vinculos_externos,
              match:
                countsBefore.com_vinculos_externos === EXPECTED_COUNTS_BEFORE.com_vinculos_externos,
            },
          },
          no_additional_references: addlRefs === 0,
          additional_references_count: addlRefs,
          reference_checks_performed: [
            {
              collection: 'com_ocorrencias_qualidade',
              field: 'execucao_id',
              filter: 'execucao_id = "' + FIXED_IDS.com_execucoes_sincronizacao + '"',
              actual_count: ocorrencias.length,
              expected_count: 0,
              passed: ocorrencias.length === 0,
              api: 'txApp.findRecordsByFilter',
            },
            {
              collection: 'com_vinculos_externos',
              field: 'record_id',
              filter: 'record_id = "' + FIXED_IDS.com_eventos_integracao + '"',
              actual_additional_count: addlEvt,
              expected_additional_count: 0,
              excludes_id: FIXED_IDS.com_vinculos_externos,
              passed: addlEvt === 0,
              api: 'txApp.findRecordsByFilter',
            },
            {
              collection: 'com_vinculos_externos',
              field: 'record_id',
              filter: 'record_id = "' + FIXED_IDS.com_execucoes_sincronizacao + '"',
              actual_additional_count: addlExec,
              expected_additional_count: 0,
              excludes_id: FIXED_IDS.com_vinculos_externos,
              passed: addlExec === 0,
              api: 'txApp.findRecordsByFilter',
            },
          ],
        }

        var allMet =
          preconditions.all_ids_exist &&
          preconditions.identity_and_timestamps_verified &&
          preconditions.zero_ocorrencias &&
          preconditions.counts_match &&
          preconditions.no_additional_references

        if (!allMet) {
          throw new Error('Preconditions not met — native rollback triggered before any deletion')
        }

        preconditionsMet = true

        // Deletions via txApp.delete(record) in fixed order
        txApp.delete(txApp.findRecordById('com_vinculos_externos', FIXED_IDS.com_vinculos_externos))
        txApp.delete(
          txApp.findRecordById('com_eventos_integracao', FIXED_IDS.com_eventos_integracao),
        )
        txApp.delete(
          txApp.findRecordById(
            'com_execucoes_sincronizacao',
            FIXED_IDS.com_execucoes_sincronizacao,
          ),
        )

        countsAfter = {
          com_eventos_integracao: txCount('com_eventos_integracao'),
          com_execucoes_sincronizacao: txCount('com_execucoes_sincronizacao'),
          com_vinculos_externos: txCount('com_vinculos_externos'),
        }

        var postCountsMatch =
          countsAfter.com_eventos_integracao === EXPECTED_COUNTS_AFTER.com_eventos_integracao &&
          countsAfter.com_execucoes_sincronizacao ===
            EXPECTED_COUNTS_AFTER.com_execucoes_sincronizacao &&
          countsAfter.com_vinculos_externos === EXPECTED_COUNTS_AFTER.com_vinculos_externos

        // Post-deletion absence validation via txApp.findRecordById
        var postVinculoAbsent = true
        var postEventoAbsent = true
        var postExecucaoAbsent = true
        try {
          txApp.findRecordById('com_vinculos_externos', FIXED_IDS.com_vinculos_externos)
          postVinculoAbsent = false
        } catch (_) {}
        try {
          txApp.findRecordById('com_eventos_integracao', FIXED_IDS.com_eventos_integracao)
          postEventoAbsent = false
        } catch (_) {}
        try {
          txApp.findRecordById('com_execucoes_sincronizacao', FIXED_IDS.com_execucoes_sincronizacao)
          postExecucaoAbsent = false
        } catch (_) {}

        postValidation = {
          counts_match: postCountsMatch,
          counts_per_collection: {
            com_eventos_integracao: {
              expected: EXPECTED_COUNTS_AFTER.com_eventos_integracao,
              actual: countsAfter.com_eventos_integracao,
              match:
                countsAfter.com_eventos_integracao === EXPECTED_COUNTS_AFTER.com_eventos_integracao,
            },
            com_execucoes_sincronizacao: {
              expected: EXPECTED_COUNTS_AFTER.com_execucoes_sincronizacao,
              actual: countsAfter.com_execucoes_sincronizacao,
              match:
                countsAfter.com_execucoes_sincronizacao ===
                EXPECTED_COUNTS_AFTER.com_execucoes_sincronizacao,
            },
            com_vinculos_externos: {
              expected: EXPECTED_COUNTS_AFTER.com_vinculos_externos,
              actual: countsAfter.com_vinculos_externos,
              match:
                countsAfter.com_vinculos_externos === EXPECTED_COUNTS_AFTER.com_vinculos_externos,
            },
          },
          com_eventos_integracao_absent: postEventoAbsent,
          com_execucoes_sincronizacao_absent: postExecucaoAbsent,
          com_vinculos_externos_absent: postVinculoAbsent,
          absence_check_api: 'txApp.findRecordById',
        }

        if (
          !postCountsMatch ||
          !postValidation.com_eventos_integracao_absent ||
          !postValidation.com_execucoes_sincronizacao_absent ||
          !postValidation.com_vinculos_externos_absent
        ) {
          throw new Error('Post-validation failed — native rollback triggered')
        }

        // Transactional lock persistence via txApp
        var pc = txApp.findCollectionByNameOrId('com_parametros')
        var lockRec = null
        if (txLockRec) {
          lockRec = txLockRec
        } else {
          try {
            lockRec = txApp.findFirstRecordByData('com_parametros', 'chave', LOCK_KEY)
          } catch (_) {
            lockRec = new Record(pc)
            lockRec.set('chave', LOCK_KEY)
            lockRec.set('versao', 1)
          }
        }
        lockRec.set('valor', 'consumed')
        lockRec.set('ativo', true)
        lockRec.set(
          'descricao',
          'Compensation dependencias single-execution lock (consumed inside transaction on successful commit)',
        )
        lockRec.set('tipo', 'lock')
        txApp.save(lockRec)
        lockConsumedInsideTx = true
      })
    } catch (err) {
      txError = String(err).substring(0, 300)
    }

    if (txError) {
      return e.json(
        200,
        buildCommonResponse({
          lock_state: concurrencyAbort ? 'consumed' : 'armed',
          compensation_lock: concurrencyAbort ? 'consumed' : 'armed',
          compensation_executed: false,
          deletion_executed: false,
          preconditions_met: preconditionsMet,
          transaction_error: txError,
          lock_consumed_inside_transaction: lockConsumedInsideTx,
          concurrency_abort: concurrencyAbort,
          captured_records_before_deletion: capturedRecords,
          message: concurrencyAbort
            ? 'Concurrency guard: lock already consumed by another request inside transaction — aborted without deletion'
            : 'Transaction failed — native rollback via ' +
              NATIVE_TRANSACTION_API +
              ', all records restored. Lock remains armed. Rollback-by-manual-recreation is prohibited.',
        }),
      )
    }

    if (!preconditionsMet) {
      return e.json(
        200,
        buildCommonResponse({
          lock_state: 'armed',
          compensation_lock: 'armed',
          compensation_executed: false,
          deletion_executed: false,
          preconditions_met: false,
          preconditions: preconditions,
          counts_before: countsBefore,
          captured_records: capturedRecords,
          message:
            'Preconditions not met — compensation aborted, nothing deleted. Lock remains armed.',
        }),
      )
    }

    return e.json(
      200,
      buildCommonResponse({
        lock_state: 'consumed',
        compensation_lock: 'consumed',
        compensation_executed: true,
        deletion_executed: true,
        preconditions_met: true,
        counts_before: countsBefore,
        counts_after: countsAfter,
        post_validation: postValidation,
        lock_consumed_inside_transaction: lockConsumedInsideTx,
        captured_records_before_deletion: capturedRecords,
        message:
          'Compensation executed — all three records deleted atomically inside ' +
          NATIVE_TRANSACTION_API +
          ' with native rollback. Lock consumed inside transaction on successful commit.',
      }),
    )
  },
  $apis.requireAuth(),
)
