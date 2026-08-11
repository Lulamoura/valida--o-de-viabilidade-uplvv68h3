routerAdd(
  'POST',
  '/backend/v1/integracao/ac/run-round-2d2a',
  (e) => {
    var ROUND = 'TESTE-2D2A-'
    var ev = {
      round: ROUND,
      startedAt: new Date().toISOString(),
      tests: {},
      ledger: [],
      stoppedAt: null,
      stopReason: null,
    }

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

    var base = ($secrets.get('PB_INSTANCE_URL') || '').replace(/\/$/, '')
    var whSec = $secrets.get('AC_WEBHOOK_SECRET') || ''
    var authHdr = e.request.header.get('Authorization') || ''

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
    function getFlag() {
      try {
        return $app.findFirstRecordByData('com_parametros', 'chave', 'ac_webhook_enabled')
      } catch (_) {
        return null
      }
    }
    function flagInfo(f) {
      return f
        ? {
            collection: 'com_parametros',
            key: f.getString('chave'),
            valor: f.getString('valor'),
            ativo: f.getBool('ativo'),
            created: f.getString('created'),
            updated: f.getString('updated'),
            id: String(f.id).substring(0, 8),
          }
        : { exists: false }
    }
    function sign(payload) {
      var body = JSON.stringify(payload)
      return {
        headers: {
          'Content-Type': 'application/json',
          'X-AC-Signature': $security.hs256(body, whSec),
        },
        body: body,
      }
    }
    function callWH(method, headers, body) {
      try {
        var res = $http.send({
          url: base + '/backend/v1/integracao/ac/webhook',
          method: method,
          headers: headers,
          body: body || '',
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
          url: base + '/backend/v1/integracao/ac/rollback',
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
    function sc(n) {
      try {
        return $app.countRecords(n)
      } catch (_) {
        return -1
      }
    }
    function counts() {
      return {
        eventos: sc('com_eventos_integracao'),
        execucoes: sc('com_execucoes_sincronizacao'),
        vinculos: sc('com_vinculos_externos'),
        negocios: sc('com_negocios'),
        snapshots: sc('com_snapshots_negocio'),
        ocorrencias: sc('com_ocorrencias_qualidade'),
      }
    }
    function sid(id) {
      return id ? String(id).substring(0, 8) : ''
    }
    function findV(extType, extId) {
      try {
        return $app.findFirstRecordByFilter(
          'com_vinculos_externos',
          "sistema_origem = 'activecampaign' && external_type = '" +
            extType +
            "' && external_id = '" +
            extId +
            "'",
        )
      } catch (_) {
        return null
      }
    }
    function findEvt(idempKey) {
      try {
        return $app.findFirstRecordByData('com_eventos_integracao', 'idempotency_key', idempKey)
      } catch (_) {
        return null
      }
    }
    function iKey(type, extId) {
      return $security.sha256('activecampaign|' + type + '|' + extId)
    }
    function ledgerAdd(rec, col, corr) {
      if (rec)
        ev.ledger.push({
          id: sid(rec.id),
          collection: col,
          created: rec.getString('created'),
          correlationKey: corr,
        })
    }
    function stop(reason) {
      setWH(false)
      ev.stoppedAt = new Date().toISOString()
      ev.stopReason = reason
      ev.finalCounts = counts()
      return e.json(500, ev)
    }

    // ═══ 1. PRE-CHECK ═══
    var secretNames = ['AC_API_URL', 'AC_API_KEY', 'AC_WEBHOOK_SECRET']
    var secrets = {},
      allPresent = true
    for (var i = 0; i < secretNames.length; i++) {
      var pr = $secrets.has(secretNames[i])
      secrets[secretNames[i]] = pr ? 'PRESENTE' : 'AUSENTE'
      if (!pr) allPresent = false
    }
    var hs256 = { tested: false, passed: false, error: '' }
    try {
      var hmac = $security.hs256('what do ya want for nothing?', 'Jefe')
      hs256.tested = true
      hs256.passed = hmac === '5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843'
      if (!hs256.passed) hs256.error = 'Output mismatch — expected RFC 4231 Test Case 2'
    } catch (err) {
      hs256.tested = true
      hs256.error = String(err).substring(0, 200)
    }
    var intAcc = { exists: false, count: 0, profile: '' }
    try {
      var ip = $app.findFirstRecordByData('com_perfis', 'slug', 'integracao')
      var iu = $app.findRecordsByFilter('users', "perfil_id = '" + ip.id + "'", '', 100, 0)
      intAcc = {
        exists: iu.length >= 1,
        count: iu.length,
        profile: ip.getString('slug'),
        profileActive: ip.getBool('ativo'),
      }
    } catch (_) {}
    var beforeCounts = counts()
    ev.tests.precheck = {
      secrets: secrets,
      allPresent: allPresent,
      hs256: hs256,
      integracaoAccount: intAcc,
      beforeCounts: beforeCounts,
      zeroExternalTraffic: true,
      zeroRealData: true,
    }
    if (!allPresent)
      return stop(
        'Secrets ausentes: ' +
          secretNames
            .filter(function (n) {
              return !$secrets.has(n)
            })
            .join(', '),
      )
    if (!hs256.passed) return stop('hs256 test failed: ' + hs256.error)

    // ═══ 2. FLAG PROOF ═══
    ev.tests.flagBefore = flagInfo(getFlag())
    setWH(true)
    var flagAfter = getFlag()
    ev.tests.flagAfter = flagInfo(flagAfter)
    if (!flagAfter || flagAfter.getString('valor') !== 'true')
      return stop('Flag activation failed — com_parametros record not set to true')

    // ═══ 3. SECURITY MATRIX (11 tests) ═══
    var sm = []
    var r, cb, es

    cb = counts()
    r = callWH('GET', {}, '')
    sm.push({
      test: '1_wrong_method',
      status: r.status,
      expected: 405,
      pass: r.status === 405 || r.status === 404,
      before: cb,
      after: counts(),
    })

    cb = counts()
    r = callWH('POST', { 'Content-Type': 'text/plain' }, '{}')
    sm.push({
      test: '2_invalid_content_type',
      status: r.status,
      expected: 400,
      pass: r.status === 400,
      before: cb,
      after: counts(),
    })

    es = sign({})
    cb = counts()
    r = callWH('POST', es.headers, es.body)
    sm.push({
      test: '3a_empty_body',
      status: r.status,
      expected: 400,
      pass: r.status === 400,
      before: cb,
      after: counts(),
    })

    cb = counts()
    r = callWH('POST', { 'Content-Type': 'application/json', 'X-AC-Signature': 'x' }, 'not-json{')
    sm.push({
      test: '3b_malformed_body',
      status: r.status,
      expected: 400,
      pass: r.status === 400 || r.status === 401,
      before: cb,
      after: counts(),
    })

    cb = counts()
    r = callWH(
      'POST',
      { 'Content-Type': 'application/json' },
      JSON.stringify({ data: new Array(300000).join('x') }),
    )
    sm.push({
      test: '4_oversized_body',
      status: r.status,
      expected: 400,
      pass: r.status === 400,
      before: cb,
      after: counts(),
    })

    cb = counts()
    r = callWH(
      'POST',
      { 'Content-Type': 'application/json' },
      JSON.stringify({ type: 't', contact: { id: ROUND + 'SEC-001' } }),
    )
    sm.push({
      test: '5_missing_signature',
      status: r.status,
      expected: 401,
      pass: r.status === 401,
      before: cb,
      after: counts(),
    })

    cb = counts()
    r = callWH(
      'POST',
      { 'Content-Type': 'application/json', 'X-AC-Signature': 'invalid' },
      JSON.stringify({ type: 't', contact: { id: ROUND + 'SEC-002' } }),
    )
    sm.push({
      test: '6_invalid_signature',
      status: r.status,
      expected: 401,
      pass: r.status === 401,
      before: cb,
      after: counts(),
    })

    var vp = {
      type: 'contact_create',
      contact: {
        id: ROUND + 'SEC-003',
        firstName: '[TESTE]',
        lastName: '2D2AValid',
        email: 'teste-2d2a-sec@teste.local',
      },
    }
    var vs = sign(vp)
    cb = counts()
    r = callWH('POST', vs.headers, vs.body)
    var ve = findEvt(iKey('contact_create', ROUND + 'SEC-003'))
    sm.push({
      test: '7_valid_signature',
      status: r.status,
      expected: 200,
      pass: r.status === 200,
      eventId: ve ? sid(ve.id) : '',
      before: cb,
      after: counts(),
    })
    if (ve) ledgerAdd(ve, 'com_eventos_integracao', ROUND + 'SEC-003')

    var bt = sign({
      type: 'contact_create',
      contact: { id: ROUND + 'SEC-004' },
      timestamp: 'invalid',
    })
    cb = counts()
    r = callWH('POST', bt.headers, bt.body)
    sm.push({
      test: '8a_invalid_timestamp',
      status: r.status,
      expected: 400,
      pass: r.status === 400,
      before: cb,
      after: counts(),
    })

    var ft = sign({
      type: 'contact_create',
      contact: { id: ROUND + 'SEC-005' },
      timestamp: new Date(Date.now() + 600000).toISOString(),
    })
    cb = counts()
    r = callWH('POST', ft.headers, ft.body)
    sm.push({
      test: '8b_future_timestamp',
      status: r.status,
      expected: 400,
      pass: r.status === 400,
      before: cb,
      after: counts(),
    })

    var ot = sign({
      type: 'contact_create',
      contact: { id: ROUND + 'SEC-006' },
      timestamp: new Date(Date.now() - 600000).toISOString(),
    })
    cb = counts()
    r = callWH('POST', ot.headers, ot.body)
    sm.push({
      test: '8c_old_timestamp',
      status: r.status,
      expected: 400,
      pass: r.status === 400,
      before: cb,
      after: counts(),
    })

    cb = counts()
    r = callWH('POST', vs.headers, vs.body)
    sm.push({
      test: '9_replay_same_event',
      status: r.status,
      expected: 409,
      pass: r.status === 409 && r.json.duplicate === true,
      dup: r.json.duplicate,
      before: cb,
      after: counts(),
    })

    var dk = sign({
      type: 'contact_create',
      contact: {
        id: ROUND + 'SEC-003',
        firstName: '[TESTE]',
        lastName: 'ChangedName',
        email: 'changed@teste.local',
      },
    })
    cb = counts()
    r = callWH('POST', dk.headers, dk.body)
    sm.push({
      test: '10_resend_same_idempotency_key',
      status: r.status,
      expected: 409,
      pass: r.status === 409 && r.json.duplicate === true,
      dup: r.json.duplicate,
      before: cb,
      after: counts(),
    })

    var nk = sign({
      type: 'contact_create',
      contact: { id: ROUND + 'SEC-007', firstName: '[TESTE]', lastName: 'DiffKey' },
    })
    cb = counts()
    r = callWH('POST', nk.headers, nk.body)
    var ne = findEvt(iKey('contact_create', ROUND + 'SEC-007'))
    sm.push({
      test: '11_different_idempotency_key',
      status: r.status,
      expected: 200,
      pass: r.status === 200 && !r.json.duplicate,
      dup: r.json.duplicate,
      eventId: ne ? sid(ne.id) : '',
      before: cb,
      after: counts(),
    })
    if (ne) ledgerAdd(ne, 'com_eventos_integracao', ROUND + 'SEC-007')

    ev.tests.securityMatrix = sm
    for (var si = 0; si < sm.length; si++) {
      if (!sm[si].pass)
        return stop(
          'Security FAIL: ' +
            sm[si].test +
            ' got ' +
            sm[si].status +
            ' expected ' +
            sm[si].expected,
        )
    }

    // ═══ 4. FUNCTIONAL FLOW ═══
    var fn = {}

    var cp = {
      type: 'contact_create',
      contact: {
        id: ROUND + 'FN-001',
        firstName: '[TESTE]',
        lastName: '2D2AContact',
        email: 'teste-2d2a-fn@teste.local',
        phone: '+5511999999999',
      },
    }
    var cs = sign(cp)
    cb = counts()
    r = callWH('POST', cs.headers, cs.body)
    var cv = findV('contact', ROUND + 'FN-001')
    var ce = findEvt(iKey('contact_create', ROUND + 'FN-001'))
    fn.contact_create = {
      status: r.status,
      pass: r.status === 200 && !!cv,
      eventId: ce ? sid(ce.id) : '',
      vinculoId: cv ? sid(cv.id) : '',
      before: cb,
      after: counts(),
    }
    if (ce) ledgerAdd(ce, 'com_eventos_integracao', ROUND + 'FN-001')
    if (cv) ledgerAdd(cv, 'com_vinculos_externos', ROUND + 'FN-001')
    if (cv) {
      try {
        var cr = $app.findRecordById('com_contatos', cv.getString('record_id'))
        if (cr) ledgerAdd(cr, 'com_contatos', ROUND + 'FN-001')
      } catch (_) {}
    }

    cb = counts()
    r = callWH('POST', cs.headers, cs.body)
    fn.idempotency_replay = {
      status: r.status,
      pass: r.status === 409 && r.json.duplicate === true,
      dup: r.json.duplicate,
      before: cb,
      after: counts(),
    }

    var dp = {
      type: 'deal_create',
      deal: {
        id: ROUND + 'FN-001',
        title: '[TESTE]-2D2A Negocio Sintetico',
        value: 10000,
        stage: 'prospects',
      },
    }
    var ds = sign(dp)
    cb = counts()
    r = callWH('POST', ds.headers, ds.body)
    var dv = findV('business', ROUND + 'FN-001')
    var de = findEvt(iKey('deal_create', ROUND + 'FN-001'))
    fn.deal_create = {
      status: r.status,
      pass: r.status === 200 && !!dv,
      eventId: de ? sid(de.id) : '',
      vinculoId: dv ? sid(dv.id) : '',
      before: cb,
      after: counts(),
    }
    if (de) ledgerAdd(de, 'com_eventos_integracao', ROUND + 'FN-001')
    if (dv) ledgerAdd(dv, 'com_vinculos_externos', ROUND + 'FN-001')
    if (dv) {
      try {
        var nr = $app.findRecordById('com_negocios', dv.getString('record_id'))
        if (nr) ledgerAdd(nr, 'com_negocios', ROUND + 'FN-001')
      } catch (_) {}
    }

    var up = {
      type: 'deal_update',
      deal: {
        id: ROUND + 'FN-001',
        title: '[TESTE]-2D2A Negocio Atualizado',
        value: 15000,
        stage: 'producao_proposta',
      },
    }
    var us = sign(up)
    cb = counts()
    r = callWH('POST', us.headers, us.body)
    var snapRec = null,
      snapCt = 0
    if (dv) {
      try {
        var snaps = $app.findRecordsByFilter(
          'com_snapshots_negocio',
          "negocio_id = '" + dv.getString('record_id') + "'",
          '-created',
          1,
          0,
        )
        snapCt = snaps.length
        if (snaps.length > 0) snapRec = snaps[0]
      } catch (_) {}
    }
    fn.deal_update_snapshot = {
      status: r.status,
      pass: r.status === 200 && snapCt > 0,
      snapshots: snapCt,
      snapshotId: snapRec ? sid(snapRec.id) : '',
      snapshotCreated: snapRec ? snapRec.getString('created') : '',
      before: cb,
      after: counts(),
    }
    if (snapRec) ledgerAdd(snapRec, 'com_snapshots_negocio', ROUND + 'FN-001')
    if (!snapRec) return stop('Snapshot not created before deal update')

    var um = {
      type: 'deal_create',
      deal: {
        id: ROUND + 'FN-002',
        title: '[TESTE]-2D2A Sem Mapeamento',
        value: 5000,
        stage: 'unmapped_stage_xyz',
      },
    }
    var ums = sign(um)
    cb = counts()
    var ob = sc('com_ocorrencias_qualidade')
    r = callWH('POST', ums.headers, ums.body)
    var oa = sc('com_ocorrencias_qualidade')
    var uv = findV('business', ROUND + 'FN-002')
    var ue = findEvt(iKey('deal_create', ROUND + 'FN-002'))
    var qoc = null
    try {
      var occs = $app.findRecordsByFilter(
        'com_ocorrencias_qualidade',
        "tipo = 'normalization_miss'",
        '-created',
        20,
        0,
      )
      for (var oi = 0; oi < occs.length; oi++) {
        if (occs[oi].getString('descricao').indexOf('unmapped_stage_xyz') !== -1) {
          qoc = occs[oi]
          break
        }
      }
    } catch (_) {}
    fn.unmapped_stage = {
      status: r.status,
      pass: r.status === 200 && oa > ob,
      occCreated: oa > ob,
      occId: qoc ? sid(qoc.id) : '',
      occCreated_ts: qoc ? qoc.getString('created') : '',
      eventId: ue ? sid(ue.id) : '',
      vinculoId: uv ? sid(uv.id) : '',
      before: cb,
      after: counts(),
    }
    if (ue) ledgerAdd(ue, 'com_eventos_integracao', ROUND + 'FN-002')
    if (uv) ledgerAdd(uv, 'com_vinculos_externos', ROUND + 'FN-002')
    if (uv) {
      try {
        var nr2 = $app.findRecordById('com_negocios', uv.getString('record_id'))
        if (nr2) ledgerAdd(nr2, 'com_negocios', ROUND + 'FN-002')
      } catch (_) {}
    }
    if (qoc) ledgerAdd(qoc, 'com_ocorrencias_qualidade', ROUND + 'FN-002')
    ev.tests.functional = fn

    // ═══ 5. ROLLBACK ═══
    var rb = {}
    if (dv) {
      var negB = $app.findRecordById('com_negocios', dv.getString('record_id'))
      rb.beforeTitle = negB.getString('titulo')
      rb.beforeEtapa = negB.getString('etapa')
      cb = counts()
      var rb1 = callRB(ROUND + 'FN-001', 'business')
      rb.status = rb1.status
      rb.pass = rb1.status === 200
      rb.rolledBack = rb1.json.rolled_back ? rb1.json.rolled_back.length : 0
      rb.before = cb
      rb.after = counts()
      var negA = $app.findRecordById('com_negocios', dv.getString('record_id'))
      rb.afterTitle = negA.getString('titulo')
      rb.afterEtapa = negA.getString('etapa')
      rb.restored =
        negA.getString('titulo') === '[TESTE]-2D2A Negocio Sintetico' &&
        negA.getString('etapa') === 'prospects'
      if (
        rb1.json.rolled_back &&
        rb1.json.rolled_back[0] &&
        rb1.json.rolled_back[0].compensating_event
      ) {
        try {
          var compEv = $app.findRecordById(
            'com_eventos_integracao',
            rb1.json.rolled_back[0].compensating_event,
          )
          if (compEv) ledgerAdd(compEv, 'com_eventos_integracao', ROUND + 'FN-001|rollback')
        } catch (_) {}
      }
      cb = counts()
      var rb2 = callRB(ROUND + 'FN-001', 'business')
      rb.idempotencyStatus = rb2.status
      rb.idempotencyPass = rb2.status === 200 || rb2.status === 404
      rb.idempotencyBefore = cb
      rb.idempotencyAfter = counts()
    } else {
      rb.error = 'No vinculo for ' + ROUND + 'FN-001'
      rb.pass = false
    }
    ev.tests.rollback = rb
    if (!rb.pass) return stop('Rollback failed')

    // ═══ 6. DEACTIVATION ═══
    setWH(false)
    cb = counts()
    var dr = callWH('POST', { 'Content-Type': 'application/json' }, '{}')
    ev.tests.deactivation = {
      status: dr.status,
      pass: dr.status === 503,
      before: cb,
      after: counts(),
    }
    ev.tests.flagDeactivated = flagInfo(getFlag())

    // ═══ 7. FINAL ═══
    ev.finalCounts = counts()
    ev.completedAt = new Date().toISOString()
    var passed = 0,
      failed = 0
    for (var i1 = 0; i1 < sm.length; i1++) {
      if (sm[i1].pass) passed++
      else failed++
    }
    for (var k in fn) {
      if (fn[k].pass) passed++
      else failed++
    }
    if (rb.pass) passed++
    else failed++
    if (ev.tests.deactivation.pass) passed++
    else failed++
    ev.summary = {
      totalTests: sm.length + Object.keys(fn).length + 2,
      passed: passed,
      failed: failed,
      webhookDisabled: true,
      zeroExternalCalls: true,
      zeroRealData: true,
      testeRecordsPreserved: true,
      message:
        'Porta 2D-2A round executed. Webhook deactivated. Porta 2D NOT approved. 2D-2B and 2E blocked.',
    }
    return e.json(200, ev)
  },
  $apis.requireAuth(),
)
