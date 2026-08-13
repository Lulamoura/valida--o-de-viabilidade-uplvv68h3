routerAdd(
  'POST',
  '/backend/v1/integracao/ac/run-round-2d2b',
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

    var execId = $security.randomStringWithAlphabet(32, 'abcdefghijklmnopqrstuvwxyz0123456789')
    var runnerVersion = 'R2-RUNNER-2D2B-20260813-INSTRUMENTED'
    var evidenceCol = null
    var execCol = null
    try {
      evidenceCol = $app.findCollectionByNameOrId('com_etapas_porta_2d2b')
    } catch (_) {}
    try {
      execCol = $app.findCollectionByNameOrId('com_execucoes_porta_2d2b')
    } catch (_) {}
    var execRecord = null
    var terminalSaved = false
    var runningSet = false

    var lockKey = 'ac_2d2b_execution_lock'
    try {
      var exLock = $app.findFirstRecordByData('com_parametros', 'chave', lockKey)
      if (exLock && exLock.getString('valor') === 'locked' && exLock.getBool('ativo')) {
        return e.json(200, {
          executed: true,
          locked: true,
          message: '2D.2B already executed — single-execution lock prevents re-execution',
          activecampaign_calls: 0,
        })
      }
    } catch (_) {}
    try {
      var pc0 = $app.findCollectionByNameOrId('com_parametros')
      var lkRec
      try {
        lkRec = $app.findFirstRecordByData('com_parametros', 'chave', lockKey)
      } catch (_) {
        lkRec = new Record(pc0)
        lkRec.set('chave', lockKey)
        lkRec.set('versao', 1)
      }
      lkRec.set('valor', 'locked')
      lkRec.set('ativo', true)
      lkRec.set('descricao', 'Single-execution lock for Porta 2D.2B')
      lkRec.set('tipo', 'lock')
      $app.save(lkRec)
    } catch (_) {}

    var baseUrl = ($secrets.get('PB_INSTANCE_URL') || '').replace(/\/$/, '')
    var whSecret = $secrets.get('AC_WEBHOOK_SECRET') || ''
    var authHdr = e.request.header.get('Authorization') || ''
    var startedAt = new Date().toISOString()
    var correlationKey = 'TESTE-2D2B'

    if (!baseUrl) return e.json(500, { error: 'PB_INSTANCE_URL not configured' })
    if (!whSecret) return e.json(500, { error: 'AC_WEBHOOK_SECRET not configured' })

    function readFlag() {
      try {
        var r = $app.findFirstRecordByData('com_parametros', 'chave', 'ac_webhook_enabled')
        return { valor: r.getString('valor'), ativo: r.getBool('ativo'), error: null }
      } catch (er) {
        return { valor: null, ativo: null, error: String(er).substring(0, 200) }
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
        return { success: true, reRead: readFlag() }
      } catch (er) {
        return { success: false, error: String(er).substring(0, 200), reRead: null }
      }
    }
    function sc(n) {
      try {
        return $app.countRecords(n)
      } catch (_) {
        return -1
      }
    }
    function gc() {
      return {
        contatos: sc('com_contatos'),
        negocios: sc('com_negocios'),
        eventos: sc('com_eventos_integracao'),
        execucoes: sc('com_execucoes_sincronizacao'),
        vinculos: sc('com_vinculos_externos'),
        snapshots: sc('com_snapshots_negocio'),
        ocorrencias: sc('com_ocorrencias_qualidade'),
        auditoria: sc('com_auditoria'),
      }
    }
    function nowTs() {
      return new Date().toISOString()
    }
    function signBody(s) {
      return $security.hs256(s, whSecret)
    }
    function callWH(m, h, b) {
      try {
        var res = $http.send({
          url: baseUrl + '/backend/v1/integracao/ac/webhook',
          method: m,
          headers: h,
          body: b || '',
          timeout: 15,
        })
        var j = {}
        try {
          j = res.json || {}
        } catch (_) {}
        return { status: res.statusCode, json: j }
      } catch (er) {
        return { status: 0, json: { error: String(er).substring(0, 100) } }
      }
    }
    function callRB(b, sig) {
      try {
        var res = $http.send({
          url: baseUrl + '/backend/v1/integracao/ac/rollback',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: authHdr,
            'X-AC-Signature': sig,
          },
          body: b,
          timeout: 15,
        })
        var j = {}
        try {
          j = res.json || {}
        } catch (_) {}
        return { status: res.statusCode, json: j }
      } catch (er) {
        return { status: 0, json: { error: String(er).substring(0, 100) } }
      }
    }
    function rc(id, m, u, exp, act, resp, cb, ca, pass) {
      callResults.push({
        call: id,
        method: m,
        url: u,
        expected_status: exp,
        actual_status: act,
        response: JSON.stringify(resp).substring(0, 500),
        counts_before: cb,
        counts_after: ca,
        passed: pass,
      })
    }
    function truncId(s) {
      return s ? String(s).substring(0, 8) : ''
    }
    function computeDeltas(before, after) {
      var d = {}
      var keys = [
        'contatos',
        'negocios',
        'eventos',
        'execucoes',
        'vinculos',
        'snapshots',
        'ocorrencias',
        'auditoria',
      ]
      for (var i = 0; i < keys.length; i++) {
        d[keys[i]] = (after[keys[i]] || 0) - (before[keys[i]] || 0)
      }
      return d
    }
    function sanitizeForPersistence(obj) {
      if (obj === null || obj === undefined) return obj
      if (typeof obj !== 'object') return obj
      if (Array.isArray(obj)) {
        var arr = []
        for (var ai = 0; ai < obj.length; ai++) arr.push(sanitizeForPersistence(obj[ai]))
        return arr
      }
      var FORBIDDEN = {
        email: true,
        phone: true,
        token: true,
        signature: true,
        secret: true,
        Authorization: true,
        authorization: true,
        password: true,
        apikey: true,
        apiKey: true,
      }
      var out = {}
      for (var key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          if (FORBIDDEN[key]) continue
          out[key] = sanitizeForPersistence(obj[key])
        }
      }
      return out
    }
    function persistStep(
      ordem,
      codigo,
      metodo,
      rota,
      sAt,
      fAt,
      httpReal,
      httpEsp,
      pass,
      cb,
      ca,
      respJson,
      erro,
      idsCorr,
    ) {
      if (!evidenceCol || !execRecord) return
      try {
        var step = new Record(evidenceCol)
        step.set('id', execId + '_' + ordem)
        step.set('execucao_id', execId)
        step.set('ordem', ordem)
        step.set('codigo', codigo)
        step.set('metodo', metodo)
        step.set('rota_sanitizada', rota)
        step.set('started_at', sAt)
        step.set('finished_at', fAt)
        step.set('http_status_real', httpReal)
        step.set('http_status_esperado', httpEsp)
        step.set('resultado', pass ? 'PASS' : 'FAIL')
        step.set('counts_antes', JSON.stringify(cb || {}))
        step.set('counts_depois', JSON.stringify(ca || {}))
        step.set('deltas', JSON.stringify(computeDeltas(cb || {}, ca || {})))
        step.set('ids_correlacao_sanitizados', JSON.stringify(idsCorr || []))
        var sanitizedResp = sanitizeForPersistence(respJson || {})
        step.set('sha256_corpo_bruto', $security.sha256(JSON.stringify(respJson || {})))
        step.set('resposta_sanitizada', JSON.stringify(sanitizedResp).substring(0, 2000))
        step.set('erro_real', erro || '')
        $app.save(step)
      } catch (er) {
        console.log('evidence persistStep error ' + ordem + ': ' + String(er).substring(0, 200))
      }
    }
    function safeUpdateExec(fields) {
      if (!execRecord) return
      try {
        for (var k in fields) {
          if (Object.prototype.hasOwnProperty.call(fields, k)) {
            execRecord.set(k, fields[k])
          }
        }
        $app.save(execRecord)
      } catch (er1) {
        try {
          $app.save(execRecord)
        } catch (er2) {
          console.log('evidence safeUpdateExec error: ' + String(er2).substring(0, 200))
        }
      }
    }
    function checkTerminal() {
      if (!execRecord || terminalSaved) return
      if (!runningSet) {
        runningSet = true
        safeUpdateExec({ estado: 'running' })
      }
      if (overallStatus === 'STOP' || overallStatus === 'BLOCKED') {
        terminalSaved = true
        safeUpdateExec({
          estado: overallStatus === 'BLOCKED' ? 'blocked' : 'fail',
          finished_at: new Date().toISOString(),
          counts_after: JSON.stringify(countsAfter || gc()),
          flag_final: JSON.stringify(flagFinal || readFlag()),
          decisao: JSON.stringify({
            porta: '2D.2B',
            overall_status: overallStatus,
            go_no_go: 'NO-GO',
            stop_reason: stopReason,
            total_calls: callResults.length,
          }),
        })
      }
    }

    var overallStatus = 'PASS',
      stopReason = null,
      callResults = [],
      evidenceIds = []
    var flagBefore = readFlag(),
      flagDuring = null,
      flagFinal = null,
      finalProbeStatus = null
    var countsBefore = gc(),
      countsAfter = null

    // Persistir abertura da execução (antes da primeira chamada)
    if (execCol) {
      try {
        execRecord = new Record(execCol)
        execRecord.set('id', execId)
        execRecord.set('runner_version', runnerVersion)
        execRecord.set('correlation_key', 'TESTE-2D2B')
        execRecord.set('estado', 'started')
        execRecord.set('started_at', startedAt)
        execRecord.set('counts_before', JSON.stringify(countsBefore))
        execRecord.set('flag_before', JSON.stringify(flagBefore))
        execRecord.set('prova_zero_chamadas_externas', true)
        execRecord.set('versao_commit', runnerVersion)
        $app.save(execRecord)
      } catch (er) {
        console.log('evidence exec open error: ' + String(er).substring(0, 200))
        try {
          $app.save(execRecord)
        } catch (_) {}
      }
    }

    var disRes = setWH(false)
    if (!disRes.success) {
      overallStatus = 'BLOCKED'
      stopReason = 'Failed to disable flag initially: ' + disRes.error
    }

    if (overallStatus === 'PASS') {
      var cb1 = gc()
      var r1 = callWH('POST', { 'Content-Type': 'application/json' }, '{}')
      var ca1 = gc()
      var a1p = r1.status === 503
      rc('A1', 'POST', '/webhook', 503, r1.status, r1.json, cb1, ca1, a1p)
      if (!a1p) {
        overallStatus = 'STOP'
        stopReason = 'A1: expected 503 got ' + r1.status
      }
      persistStep(
        'A1',
        'A1',
        'POST',
        '/backend/v1/integracao/ac/webhook',
        startedAt,
        nowTs(),
        r1.status,
        503,
        a1p,
        cb1,
        ca1,
        r1.json,
        a1p ? '' : 'Expected 503 got ' + r1.status,
        [],
      )
      checkTerminal()
    }
    if (overallStatus === 'PASS') {
      var enRes = setWH(true)
      if (!enRes.success) {
        overallStatus = 'BLOCKED'
        stopReason = 'Failed to enable flag: ' + enRes.error
      }
      flagDuring = readFlag()
      checkTerminal()
    }
    if (overallStatus === 'PASS') {
      var cb2 = gc()
      var r2 = callWH('GET', {}, '')
      var ca2 = gc()
      var a2p = r2.status === 405
      rc('A2', 'GET', '/webhook', 405, r2.status, r2.json, cb2, ca2, a2p)
      if (!a2p) {
        overallStatus = 'STOP'
        stopReason = 'A2: expected 405 got ' + r2.status
      }
      persistStep(
        'A2',
        'A2',
        'GET',
        '/backend/v1/integracao/ac/webhook',
        startedAt,
        nowTs(),
        r2.status,
        405,
        a2p,
        cb2,
        ca2,
        r2.json,
        a2p ? '' : 'Expected 405 got ' + r2.status,
        [],
      )
      checkTerminal()
    }
    if (overallStatus === 'PASS') {
      var cb3 = gc()
      var r3 = callWH('POST', { 'Content-Type': 'text/plain' }, '{}')
      var ca3 = gc()
      var a3p = r3.status === 400
      rc('A3', 'POST', '/webhook', 400, r3.status, r3.json, cb3, ca3, a3p)
      if (!a3p) {
        overallStatus = 'STOP'
        stopReason = 'A3: expected 400 got ' + r3.status
      }
      persistStep(
        'A3',
        'A3',
        'POST',
        '/backend/v1/integracao/ac/webhook',
        startedAt,
        nowTs(),
        r3.status,
        400,
        a3p,
        cb3,
        ca3,
        r3.json,
        a3p ? '' : 'Expected 400 got ' + r3.status,
        [],
      )
      checkTerminal()
    }
    if (overallStatus === 'PASS') {
      var a4b = JSON.stringify({ timestamp: nowTs() })
      var a4s = signBody(a4b)
      var cb4 = gc()
      var r4 = callWH('POST', { 'Content-Type': 'application/json', 'X-AC-Signature': a4s }, a4b)
      var ca4 = gc()
      var a4p = r4.status === 400
      rc('A4', 'POST', '/webhook', 400, r4.status, r4.json, cb4, ca4, a4p)
      if (!a4p) {
        overallStatus = 'STOP'
        stopReason = 'A4: expected 400 got ' + r4.status
      }
      persistStep(
        'A4',
        'A4',
        'POST',
        '/backend/v1/integracao/ac/webhook',
        startedAt,
        nowTs(),
        r4.status,
        400,
        a4p,
        cb4,
        ca4,
        r4.json,
        a4p ? '' : 'Expected 400 got ' + r4.status,
        [],
      )
      checkTerminal()
    }
    if (overallStatus === 'PASS') {
      var a5b = 'not-json{'
      var a5s = signBody(a5b)
      var cb5 = gc()
      var r5 = callWH('POST', { 'Content-Type': 'application/json', 'X-AC-Signature': a5s }, a5b)
      var ca5 = gc()
      var a5p = r5.status === 400
      rc('A5', 'POST', '/webhook', 400, r5.status, r5.json, cb5, ca5, a5p)
      if (!a5p) {
        overallStatus = 'STOP'
        stopReason = 'A5: expected 400 got ' + r5.status
      }
      persistStep(
        'A5',
        'A5',
        'POST',
        '/backend/v1/integracao/ac/webhook',
        startedAt,
        nowTs(),
        r5.status,
        400,
        a5p,
        cb5,
        ca5,
        r5.json,
        a5p ? '' : 'Expected 400 got ' + r5.status,
        [],
      )
      checkTerminal()
    }
    if (overallStatus === 'PASS') {
      var a6p_ = { timestamp: nowTs(), data: new Array(300000).join('x') }
      var a6b = JSON.stringify(a6p_)
      var a6s = signBody(a6b)
      var cb6 = gc()
      var r6 = callWH('POST', { 'Content-Type': 'application/json', 'X-AC-Signature': a6s }, a6b)
      var ca6 = gc()
      var a6p = r6.status === 400
      rc('A6', 'POST', '/webhook', 400, r6.status, r6.json, cb6, ca6, a6p)
      if (!a6p) {
        overallStatus = 'STOP'
        stopReason = 'A6: expected 400 got ' + r6.status
      }
      persistStep(
        'A6',
        'A6',
        'POST',
        '/backend/v1/integracao/ac/webhook',
        startedAt,
        nowTs(),
        r6.status,
        400,
        a6p,
        cb6,
        ca6,
        r6.json,
        a6p ? '' : 'Expected 400 got ' + r6.status,
        [],
      )
      checkTerminal()
    }
    if (overallStatus === 'PASS') {
      var a7p_ = {
        type: 'contact_create',
        timestamp: nowTs(),
        contact: {
          id: 'TESTE-2D2B-A7-C1',
          firstName: '[TESTE]',
          lastName: '2D2B NoSig',
          email: 'teste-2d2b-a7@teste.local',
          phone: '+5511999999999',
        },
      }
      var a7b = JSON.stringify(a7p_)
      var cb7 = gc()
      var r7 = callWH('POST', { 'Content-Type': 'application/json' }, a7b)
      var ca7 = gc()
      var a7p = r7.status === 401 && r7.json.error === 'missing_signature'
      rc('A7', 'POST', '/webhook', 401, r7.status, r7.json, cb7, ca7, a7p)
      if (!a7p) {
        overallStatus = 'STOP'
        stopReason = 'A7: expected 401 missing_signature got ' + r7.status
      }
      persistStep(
        'A7',
        'A7',
        'POST',
        '/backend/v1/integracao/ac/webhook',
        startedAt,
        nowTs(),
        r7.status,
        401,
        a7p,
        cb7,
        ca7,
        r7.json,
        a7p ? '' : 'Expected 401 missing_signature got ' + r7.status,
        [],
      )
      checkTerminal()
    }
    if (overallStatus === 'PASS') {
      var a8p_ = {
        type: 'contact_create',
        timestamp: nowTs(),
        contact: {
          id: 'TESTE-2D2B-A8-C1',
          firstName: '[TESTE]',
          lastName: '2D2B BadSig',
          email: 'teste-2d2b-a8@teste.local',
          phone: '+5511999999999',
        },
      }
      var a8b = JSON.stringify(a8p_)
      var cb8 = gc()
      var r8 = callWH(
        'POST',
        { 'Content-Type': 'application/json', 'X-AC-Signature': 'invalido' },
        a8b,
      )
      var ca8 = gc()
      var a8p = r8.status === 401
      rc('A8', 'POST', '/webhook', 401, r8.status, r8.json, cb8, ca8, a8p)
      if (!a8p) {
        overallStatus = 'STOP'
        stopReason = 'A8: expected 401 got ' + r8.status
      }
      persistStep(
        'A8',
        'A8',
        'POST',
        '/backend/v1/integracao/ac/webhook',
        startedAt,
        nowTs(),
        r8.status,
        401,
        a8p,
        cb8,
        ca8,
        r8.json,
        a8p ? '' : 'Expected 401 got ' + r8.status,
        [],
      )
      checkTerminal()
    }

    var b1Body = '',
      b1Sig = ''
    if (overallStatus === 'PASS') {
      var b1p_ = {
        type: 'contact_create',
        timestamp: nowTs(),
        contact: {
          id: 'TESTE-2D2B-FN-C1',
          firstName: '[TESTE]',
          lastName: '2D2B Contact',
          email: 'teste-2d2b@teste.local',
          phone: '+5511999999999',
        },
      }
      b1Body = JSON.stringify(b1p_)
      b1Sig = signBody(b1Body)
      var cbB1 = gc()
      var rB1 = callWH(
        'POST',
        { 'Content-Type': 'application/json', 'X-AC-Signature': b1Sig },
        b1Body,
      )
      var caB1 = gc()
      var b1p = rB1.status === 200
      rc('B1', 'POST', '/webhook', 200, rB1.status, rB1.json, cbB1, caB1, b1p)
      if (rB1.status === 200 && rB1.json.event_id)
        evidenceIds.push({
          collection: 'com_eventos_integracao',
          id: String(rB1.json.event_id).substring(0, 8),
        })
      if (!b1p) {
        overallStatus = 'STOP'
        stopReason = 'B1: expected 200 got ' + rB1.status
      }
      persistStep(
        'B1',
        'B1_contato_criado',
        'POST',
        '/backend/v1/integracao/ac/webhook',
        startedAt,
        nowTs(),
        rB1.status,
        200,
        b1p,
        cbB1,
        caB1,
        rB1.json,
        b1p ? '' : 'Expected 200 got ' + rB1.status,
        rB1.json && rB1.json.event_id ? [truncId(String(rB1.json.event_id))] : [],
      )
      checkTerminal()
    }
    if (overallStatus === 'PASS') {
      var cbB2 = gc()
      var rB2 = callWH(
        'POST',
        { 'Content-Type': 'application/json', 'X-AC-Signature': b1Sig },
        b1Body,
      )
      var caB2 = gc()
      var b2p = rB2.status === 409 && rB2.json.duplicate === true
      rc('B2', 'POST', '/webhook', 409, rB2.status, rB2.json, cbB2, caB2, b2p)
      if (!b2p) {
        overallStatus = 'STOP'
        stopReason = 'B2: expected 409 duplicate got ' + rB2.status
      }
      persistStep(
        'B2',
        'B2_duplicidade_sem_efeito',
        'POST',
        '/backend/v1/integracao/ac/webhook',
        startedAt,
        nowTs(),
        rB2.status,
        409,
        b2p,
        cbB2,
        caB2,
        rB2.json,
        b2p ? '' : 'Expected 409 duplicate got ' + rB2.status,
        [],
      )
      checkTerminal()
    }
    var b3Body = '',
      b3Sig = ''
    if (overallStatus === 'PASS') {
      var b3p_ = {
        type: 'deal_create',
        timestamp: nowTs(),
        deal: {
          id: 'TESTE-2D2B-FN-D1',
          title: '[TESTE] 2D2B Negocio',
          value: 10000,
          stage: 'prospects',
        },
      }
      b3Body = JSON.stringify(b3p_)
      b3Sig = signBody(b3Body)
      var cbB3 = gc()
      var rB3 = callWH(
        'POST',
        { 'Content-Type': 'application/json', 'X-AC-Signature': b3Sig },
        b3Body,
      )
      var caB3 = gc()
      var b3p = rB3.status === 200
      rc('B3', 'POST', '/webhook', 200, rB3.status, rB3.json, cbB3, caB3, b3p)
      if (rB3.status === 200 && rB3.json.event_id)
        evidenceIds.push({
          collection: 'com_eventos_integracao',
          id: String(rB3.json.event_id).substring(0, 8),
        })
      if (!b3p) {
        overallStatus = 'STOP'
        stopReason = 'B3: expected 200 got ' + rB3.status
      }
      persistStep(
        'B3',
        'B3_negocio_criado',
        'POST',
        '/backend/v1/integracao/ac/webhook',
        startedAt,
        nowTs(),
        rB3.status,
        200,
        b3p,
        cbB3,
        caB3,
        rB3.json,
        b3p ? '' : 'Expected 200 got ' + rB3.status,
        rB3.json && rB3.json.event_id ? [truncId(String(rB3.json.event_id))] : [],
      )
      checkTerminal()
    }
    if (overallStatus === 'PASS') {
      var b4p_ = {
        type: 'deal_update',
        timestamp: nowTs(),
        deal: {
          id: 'TESTE-2D2B-FN-D1',
          title: '[TESTE] 2D2B Negocio Atualizado',
          value: 15000,
          stage: 'producao_proposta',
        },
      }
      var b4b = JSON.stringify(b4p_)
      var b4s = signBody(b4b)
      var cbB4 = gc()
      var rB4 = callWH('POST', { 'Content-Type': 'application/json', 'X-AC-Signature': b4s }, b4b)
      var caB4 = gc()
      var b4p = rB4.status === 200 && caB4.snapshots - cbB4.snapshots > 0
      rc('B4', 'POST', '/webhook', 200, rB4.status, rB4.json, cbB4, caB4, b4p)
      if (rB4.status === 200 && rB4.json.event_id)
        evidenceIds.push({
          collection: 'com_eventos_integracao',
          id: String(rB4.json.event_id).substring(0, 8),
        })
      if (!b4p) {
        overallStatus = 'STOP'
        stopReason = 'B4: expected 200 with snapshot got ' + rB4.status
      }
      persistStep(
        'B4',
        'B4_snapshot_e_atualizacao',
        'POST',
        '/backend/v1/integracao/ac/webhook',
        startedAt,
        nowTs(),
        rB4.status,
        200,
        b4p,
        cbB4,
        caB4,
        rB4.json,
        b4p ? '' : 'Expected 200 with snapshot got ' + rB4.status,
        rB4.json && rB4.json.event_id ? [truncId(String(rB4.json.event_id))] : [],
      )
      checkTerminal()
    }
    if (overallStatus === 'PASS') {
      var b5p_ = {
        type: 'deal_create',
        timestamp: nowTs(),
        deal: {
          id: 'TESTE-2D2B-FN-D2',
          title: '[TESTE] 2D2B Sem Map',
          value: 5000,
          stage: 'unmapped_stage_xyz',
        },
      }
      var b5b = JSON.stringify(b5p_)
      var b5s = signBody(b5b)
      var cbB5 = gc()
      var rB5 = callWH('POST', { 'Content-Type': 'application/json', 'X-AC-Signature': b5s }, b5b)
      var caB5 = gc()
      var b5p = rB5.status === 200 && caB5.ocorrencias - cbB5.ocorrencias > 0
      rc('B5', 'POST', '/webhook', 200, rB5.status, rB5.json, cbB5, caB5, b5p)
      if (rB5.status === 200 && rB5.json.event_id)
        evidenceIds.push({
          collection: 'com_eventos_integracao',
          id: String(rB5.json.event_id).substring(0, 8),
        })
      if (!b5p) {
        overallStatus = 'STOP'
        stopReason = 'B5: expected 200 with quality occurrence got ' + rB5.status
      }
      persistStep(
        'B5',
        'B5_negocio_e_ocorrencia_qualidade',
        'POST',
        '/backend/v1/integracao/ac/webhook',
        startedAt,
        nowTs(),
        rB5.status,
        200,
        b5p,
        cbB5,
        caB5,
        rB5.json,
        b5p ? '' : 'Expected 200 with quality occurrence got ' + rB5.status,
        rB5.json && rB5.json.event_id ? [truncId(String(rB5.json.event_id))] : [],
      )
      checkTerminal()
    }

    var c1Body = '',
      c1Sig = ''
    if (overallStatus === 'PASS') {
      var c1p_ = { entity_type: 'business', external_id: 'TESTE-2D2B-FN-D1', timestamp: nowTs() }
      c1Body = JSON.stringify(c1p_)
      c1Sig = signBody(c1Body)
      var cbC1 = gc()
      var rC1 = callRB(c1Body, c1Sig)
      var caC1 = gc()
      var c1p =
        rC1.status === 200 &&
        rC1.json.success === true &&
        rC1.json.idempotent === false &&
        rC1.json.rolled_back &&
        rC1.json.rolled_back.length === 1 &&
        rC1.json.rolled_back[0].action === 'restored_from_snapshot' &&
        rC1.json.rolled_back[0].collection === 'com_negocios' &&
        rC1.json.rolled_back[0].record_id
      rc('C1', 'POST', '/rollback', 200, rC1.status, rC1.json, cbC1, caC1, c1p)
      if (!c1p) {
        overallStatus = 'STOP'
        stopReason =
          'C1: contract violation — status=' +
          rC1.status +
          ' body=' +
          JSON.stringify(rC1.json).substring(0, 200)
      }
      persistStep(
        'C1',
        'C1_rollback',
        'POST',
        '/backend/v1/integracao/ac/rollback',
        startedAt,
        nowTs(),
        rC1.status,
        200,
        c1p,
        cbC1,
        caC1,
        rC1.json,
        c1p ? '' : 'C1: contract violation — status=' + rC1.status,
        [],
      )
      checkTerminal()
    }
    if (overallStatus === 'PASS') {
      var cbC2 = gc()
      var rC2 = callRB(c1Body, c1Sig)
      var caC2 = gc()
      var c2p =
        rC2.status === 200 &&
        rC2.json.success === true &&
        rC2.json.idempotent === true &&
        rC2.json.rolled_back &&
        rC2.json.rolled_back.length === 0
      rc('C2', 'POST', '/rollback', 200, rC2.status, rC2.json, cbC2, caC2, c2p)
      if (!c2p) {
        overallStatus = 'STOP'
        stopReason =
          'C2: contract violation — status=' +
          rC2.status +
          ' body=' +
          JSON.stringify(rC2.json).substring(0, 200)
      }
      persistStep(
        'C2',
        'C2_repeticao_idempotente',
        'POST',
        '/backend/v1/integracao/ac/rollback',
        startedAt,
        nowTs(),
        rC2.status,
        200,
        c2p,
        cbC2,
        caC2,
        rC2.json,
        c2p ? '' : 'C2: contract violation — status=' + rC2.status,
        [],
      )
      checkTerminal()
    }

    var restoreRes = setWH(false)
    flagFinal = readFlag()
    if (!restoreRes.success && overallStatus === 'PASS') {
      overallStatus = 'BLOCKED'
      stopReason = 'Failed to restore flag: ' + restoreRes.error
    }
    if (flagFinal.valor !== 'false' && overallStatus === 'PASS') {
      overallStatus = 'BLOCKED'
      stopReason = 'Flag not restored to false'
    }
    checkTerminal()

    {
      var cbD1 = gc()
      var rD1 = callWH('POST', { 'Content-Type': 'application/json' }, '{}')
      finalProbeStatus = rD1.status
      var d1p = rD1.status === 503
      var caD1 = gc()
      rc('D1', 'POST', '/webhook', 503, rD1.status, rD1.json, gc(), gc(), d1p)
      if (!d1p && overallStatus === 'PASS') {
        overallStatus = 'STOP'
        stopReason = 'D1: expected 503 got ' + rD1.status
      }
      persistStep(
        'D1',
        'D1',
        'POST',
        '/backend/v1/integracao/ac/webhook',
        startedAt,
        nowTs(),
        rD1.status,
        503,
        d1p,
        cbD1,
        caD1,
        rD1.json,
        d1p ? '' : 'Expected 503 got ' + rD1.status,
        [],
      )
      checkTerminal()
    }

    countsAfter = gc()
    var deltas = {},
      expectedDeltas = {
        contatos: 1,
        negocios: 2,
        eventos: 5,
        execucoes: 4,
        vinculos: 3,
        snapshots: 1,
        ocorrencias: 1,
        auditoria: 0,
      }
    var deltaMatch = true,
      deltaMismatches = []
    for (var dk in expectedDeltas) {
      deltas[dk] = countsAfter[dk] - countsBefore[dk]
      if (deltas[dk] !== expectedDeltas[dk]) {
        deltaMatch = false
        deltaMismatches.push(dk + ': expected +' + expectedDeltas[dk] + ' got +' + deltas[dk])
      }
    }
    if (!deltaMatch && overallStatus === 'PASS') {
      overallStatus = 'STOP'
      stopReason = 'Delta mismatch: ' + deltaMismatches.join(', ')
    }

    // Persistir estado terminal da execução
    if (execRecord && !terminalSaved) {
      var terminalEstado = 'pass'
      if (overallStatus === 'STOP') terminalEstado = 'fail'
      else if (overallStatus === 'BLOCKED') terminalEstado = 'blocked'
      var decisaoFinal = JSON.stringify({
        porta: '2D.2B',
        overall_status: overallStatus,
        go_no_go: overallStatus === 'PASS' ? 'GO' : 'NO-GO',
        stop_reason: stopReason,
        total_calls: callResults.length,
        delta_match: deltaMatch,
      })
      safeUpdateExec({
        estado: terminalEstado,
        finished_at: new Date().toISOString(),
        counts_after: JSON.stringify(countsAfter || {}),
        flag_final: JSON.stringify(flagFinal),
        decisao: decisaoFinal,
      })
    } else if (execRecord && terminalSaved) {
      // Já terminal — atualiza apenas dados finais, sem mudar estado/finished_at
      var decisaoFinal2 = JSON.stringify({
        porta: '2D.2B',
        overall_status: overallStatus,
        go_no_go: overallStatus === 'PASS' ? 'GO' : 'NO-GO',
        stop_reason: stopReason,
        total_calls: callResults.length,
        delta_match: deltaMatch,
      })
      safeUpdateExec({
        counts_after: JSON.stringify(countsAfter || {}),
        flag_final: JSON.stringify(flagFinal),
        decisao: decisaoFinal2,
      })
    }

    return e.json(200, {
      porta: '2D.2B',
      correlation_key: correlationKey,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      overall_status: overallStatus,
      go_no_go: overallStatus === 'PASS' ? 'GO' : 'NO-GO',
      stop_reason: stopReason,
      calls: callResults,
      counts_before: countsBefore,
      counts_after: countsAfter,
      deltas: deltas,
      expected_deltas: expectedDeltas,
      delta_match: deltaMatch,
      flag_before: flagBefore,
      flag_during: flagDuring,
      flag_final: flagFinal,
      final_probe_status: finalProbeStatus,
      evidence_ids: evidenceIds,
      activecampaign_calls: 0,
      synthetic_only: true,
      records_removed: false,
      single_execution: true,
      total_calls: callResults.length,
    })
  },
  $apis.requireAuth(),
)
