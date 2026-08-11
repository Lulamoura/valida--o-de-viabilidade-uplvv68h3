routerAdd(
  'POST',
  '/backend/v1/integracao/ac/run-round-2d2a-r3',
  (e) => {
    var authId = e.auth ? e.auth.id : ''
    if (!authId) return e.unauthorizedError('Auth necessaria')
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

    var reqBody = e.requestInfo().body || {}
    var mode = reqBody.mode || 'security-only'
    if (mode !== 'security-only' && mode !== 'full') mode = 'security-only'

    var ts = new Date().toISOString().replace(/[:.]/g, '-')
    var nonce = $security.randomString(8)
    var correlationKey = 'TESTE-2D2A-R3-' + ts + '-' + nonce

    var baseUrl = ($secrets.get('PB_INSTANCE_URL') || '').replace(/\/$/, '')
    var whSecret = $secrets.get('AC_WEBHOOK_SECRET') || ''
    var authHdr = e.request.header.get('Authorization') || ''

    function canonicalize(obj) {
      if (obj === null || obj === undefined) return 'null'
      if (typeof obj !== 'object') return JSON.stringify(obj)
      if (Array.isArray(obj)) {
        var items = []
        for (var i = 0; i < obj.length; i++) items.push(canonicalize(obj[i]))
        return '[' + items.join(',') + ']'
      }
      var keys = Object.keys(obj)
        .filter(function (k) {
          return obj[k] !== undefined
        })
        .sort()
      var parts = []
      for (var i = 0; i < keys.length; i++)
        parts.push(JSON.stringify(keys[i]) + ':' + canonicalize(obj[keys[i]]))
      return '{' + parts.join(',') + '}'
    }
    function sign(payload) {
      var c = canonicalize(payload)
      return {
        headers: {
          'Content-Type': 'application/json',
          'X-AC-Signature': $security.hs256(c, whSecret),
        },
        body: JSON.stringify(payload),
      }
    }
    function callWH(method, headers, bodyStr) {
      try {
        var res = $http.send({
          url: baseUrl + '/backend/v1/integracao/ac/webhook',
          method: method,
          headers: headers,
          body: bodyStr || '',
          timeout: 15,
        })
        var j = {}
        try {
          j = res.json || {}
        } catch (_) {}
        return { status: res.statusCode, json: j }
      } catch (err) {
        return { status: 0, json: { error: String(err).substring(0, 100) } }
      }
    }
    function callRB(extId, extType) {
      try {
        var res = $http.send({
          url: baseUrl + '/backend/v1/integracao/ac/rollback',
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: authHdr },
          body: JSON.stringify({ external_id: extId, entity_type: extType }),
          timeout: 15,
        })
        var j = {}
        try {
          j = res.json || {}
        } catch (_) {}
        return { status: res.statusCode, json: j }
      } catch (err) {
        return { status: 0, json: { error: String(err).substring(0, 100) } }
      }
    }
    function setWH(en) {
      try {
        var pc = $app.findCollectionByNameOrId('com_parametros')
        var fr
        try {
          fr = $app.findFirstRecordByData('com_parametros', 'chave', 'ac_webhook_enabled')
        } catch (_) {
          fr = new Record(pc)
          fr.set('chave', 'ac_webhook_enabled')
          fr.set('versao', 1)
        }
        fr.set('valor', en ? 'true' : 'false')
        fr.set('ativo', en)
        fr.set('descricao', 'Flag server-side webhook AC')
        fr.set('tipo', 'boolean')
        $app.save(fr)
      } catch (_) {}
    }
    function sc(n) {
      try {
        return $app.countRecords(n)
      } catch (_) {
        return -1
      }
    }
    function getCounts() {
      return {
        eventos: sc('com_eventos_integracao'),
        execucoes: sc('com_execucoes_sincronizacao'),
        vinculos: sc('com_vinculos_externos'),
        ocorrencias: sc('com_ocorrencias_qualidade'),
        snapshots: sc('com_snapshots_negocio'),
        negocios: sc('com_negocios'),
      }
    }
    function countsEq(a, b) {
      return (
        a.eventos === b.eventos &&
        a.execucoes === b.execucoes &&
        a.vinculos === b.vinculos &&
        a.ocorrencias === b.ocorrencias &&
        a.snapshots === b.snapshots &&
        a.negocios === b.negocios
      )
    }

    var beforeCounts = getCounts()
    var tests = []
    var stopReason = null
    var functionalResults = null

    try {
      setWH(true)

      var cb1 = getCounts()
      var r1 = callWH(
        'POST',
        { 'Content-Type': 'application/json' },
        JSON.stringify({ type: 'test', contact: { id: correlationKey + '-T1' } }),
      )
      var ca1 = getCounts()
      tests.push({
        testName: '1_signature_absent',
        expected: 401,
        actual: r1.status,
        passed: r1.status === 401,
        countsUnchanged: countsEq(cb1, ca1),
        beforeCounts: cb1,
        afterCounts: ca1,
      })
      if (r1.status !== 401) stopReason = 'Test 1 FAIL: expected 401 got ' + r1.status

      if (!stopReason) {
        var s2 = sign({ type: 'test', contact: { id: correlationKey + '-T2' } })
        var cb2 = getCounts()
        var r2 = callWH(
          'POST',
          { 'Content-Type': 'text/plain', 'X-AC-Signature': s2.headers['X-AC-Signature'] },
          s2.body,
        )
        var ca2 = getCounts()
        tests.push({
          testName: '2_invalid_content_type',
          expected: 400,
          actual: r2.status,
          passed: r2.status === 400,
          countsUnchanged: countsEq(cb2, ca2),
          beforeCounts: cb2,
          afterCounts: ca2,
        })
        if (r2.status !== 400) stopReason = 'Test 2 FAIL: expected 400 got ' + r2.status
      }

      if (!stopReason) {
        var s3 = sign({
          type: 'test',
          contact: { id: correlationKey + '-T3' },
          data: new Array(300000).join('x'),
        })
        var cb3 = getCounts()
        var r3 = callWH('POST', s3.headers, s3.body)
        var ca3 = getCounts()
        tests.push({
          testName: '3_oversized_payload',
          expected: 400,
          actual: r3.status,
          passed: r3.status === 400,
          countsUnchanged: countsEq(cb3, ca3),
          beforeCounts: cb3,
          afterCounts: ca3,
        })
        if (r3.status !== 400) stopReason = 'Test 3 FAIL: expected 400 got ' + r3.status
      }

      if (!stopReason) {
        var s4 = sign({
          type: 'contact_create',
          contact: { id: correlationKey + '-T4' },
          timestamp: new Date(Date.now() + 600000).toISOString(),
        })
        var cb4 = getCounts()
        var r4 = callWH('POST', s4.headers, s4.body)
        var ca4 = getCounts()
        tests.push({
          testName: '4_invalid_timestamp',
          expected: 400,
          actual: r4.status,
          passed: r4.status === 400,
          countsUnchanged: countsEq(cb4, ca4),
          beforeCounts: cb4,
          afterCounts: ca4,
        })
        if (r4.status !== 400) stopReason = 'Test 4 FAIL: expected 400 got ' + r4.status
      }

      var validSigned = null
      if (!stopReason) {
        validSigned = sign({
          type: 'contact_create',
          contact: {
            id: correlationKey + '-VALID',
            firstName: '[TESTE]',
            lastName: 'R3Valid',
            email: 'teste-r3@teste.local',
          },
        })
        var cb6 = getCounts()
        var r6 = callWH('POST', validSigned.headers, validSigned.body)
        var ca6 = getCounts()
        tests.push({
          testName: '6_valid_request',
          expected: 200,
          actual: r6.status,
          passed: r6.status === 200,
          beforeCounts: cb6,
          afterCounts: ca6,
        })
        if (r6.status !== 200) stopReason = 'Test 6 FAIL: expected 200 got ' + r6.status
      }

      if (!stopReason && validSigned) {
        var cb5 = getCounts()
        var r5 = callWH('POST', validSigned.headers, validSigned.body)
        var ca5 = getCounts()
        tests.push({
          testName: '5_replay',
          expected: 409,
          actual: r5.status,
          passed: r5.status === 409 && r5.json.duplicate === true,
          countsUnchanged: countsEq(cb5, ca5),
          beforeCounts: cb5,
          afterCounts: ca5,
        })
        if (r5.status !== 409) stopReason = 'Test 5 FAIL: expected 409 got ' + r5.status
      }

      var ordered = []
      var names = [
        '1_signature_absent',
        '2_invalid_content_type',
        '3_oversized_payload',
        '4_invalid_timestamp',
        '5_replay',
        '6_valid_request',
      ]
      for (var ni = 0; ni < names.length; ni++) {
        for (var ti = 0; ti < tests.length; ti++) {
          if (tests[ti].testName === names[ni]) {
            ordered.push(tests[ti])
            break
          }
        }
      }
      tests = ordered

      if (mode === 'full' && !stopReason) {
        var fn = {}
        var cp = sign({
          type: 'contact_create',
          contact: {
            id: correlationKey + '-FN-C1',
            firstName: '[TESTE]',
            lastName: 'R3Contact',
            email: 'teste-r3-fn@teste.local',
            phone: '+5511999999999',
          },
        })
        var fcb1 = getCounts()
        var fr1 = callWH('POST', cp.headers, cp.body)
        var fca1 = getCounts()
        fn.contact_create = {
          status: fr1.status,
          pass: fr1.status === 200,
          beforeCounts: fcb1,
          afterCounts: fca1,
        }
        if (fr1.status !== 200) stopReason = 'FN contact_create FAIL'

        if (!stopReason) {
          var dp = sign({
            type: 'deal_create',
            deal: {
              id: correlationKey + '-FN-D1',
              title: '[TESTE] R3 Negocio',
              value: 10000,
              stage: 'prospects',
            },
          })
          var fcb2 = getCounts()
          var fr2 = callWH('POST', dp.headers, dp.body)
          var fca2 = getCounts()
          fn.deal_create = {
            status: fr2.status,
            pass: fr2.status === 200,
            beforeCounts: fcb2,
            afterCounts: fca2,
          }
          if (fr2.status !== 200) stopReason = 'FN deal_create FAIL'

          if (!stopReason) {
            var up = sign({
              type: 'deal_update',
              deal: {
                id: correlationKey + '-FN-D1',
                title: '[TESTE] R3 Atualizado',
                value: 15000,
                stage: 'producao_proposta',
              },
            })
            var fcb3 = getCounts()
            var fr3 = callWH('POST', up.headers, up.body)
            var fca3 = getCounts()
            var snapCt = fca3.snapshots - fcb3.snapshots
            fn.deal_update = {
              status: fr3.status,
              pass: fr3.status === 200 && snapCt > 0,
              snapshotsCreated: snapCt,
              beforeCounts: fcb3,
              afterCounts: fca3,
            }
            if (fr3.status !== 200 || snapCt <= 0) stopReason = 'FN deal_update FAIL'

            if (!stopReason) {
              var um = sign({
                type: 'deal_create',
                deal: {
                  id: correlationKey + '-FN-D2',
                  title: '[TESTE] R3 Sem Map',
                  value: 5000,
                  stage: 'unmapped_stage_xyz',
                },
              })
              var fcb4 = getCounts()
              var fr4 = callWH('POST', um.headers, um.body)
              var fca4 = getCounts()
              fn.unmapped_stage = {
                status: fr4.status,
                pass: fr4.status === 200 && fca4.ocorrencias > fcb4.ocorrencias,
                beforeCounts: fcb4,
                afterCounts: fca4,
              }
              if (fr4.status !== 200 || fca4.ocorrencias <= fcb4.ocorrencias)
                stopReason = 'FN unmapped_stage FAIL'

              if (!stopReason) {
                var fcb5 = getCounts()
                var rbRes = callRB(correlationKey + '-FN-D1', 'business')
                var fca5 = getCounts()
                fn.rollback = {
                  status: rbRes.status,
                  pass: rbRes.status === 200,
                  beforeCounts: fcb5,
                  afterCounts: fca5,
                }
                if (rbRes.status !== 200) stopReason = 'FN rollback FAIL'
              }
            }
          }
        }
        functionalResults = fn
      }
    } finally {
      setWH(false)
    }

    var afterCounts = getCounts()

    return e.json(200, {
      httpStatus: stopReason ? 500 : 200,
      correlationKey: correlationKey,
      mode: mode,
      tests: tests,
      stopReason: stopReason,
      webhookActive: false,
      beforeCounts: beforeCounts,
      afterCounts: afterCounts,
      flagFinal: false,
      functionalResults: functionalResults,
    })
  },
  $apis.requireAuth(),
)
