routerAdd(
  'POST',
  '/backend/v1/integracao/tests',
  (e) => {
    var authId = e.auth ? e.auth.id : ''
    if (!authId) return e.unauthorizedError('Autenticacao necessaria')
    var isSA = e.hasSuperuserAuth()
    if (!isSA) {
      try {
        var pid = e.auth.getString('perfil_id')
        if (pid) {
          var pr = $app.findRecordById('com_perfis', pid)
          if (pr.getString('slug') === 'superadministrador') isSA = true
        }
      } catch (_) {}
    }
    if (!isSA) {
      try {
        var sa = $app.findFirstRecordByData('com_perfis', 'slug', 'superadministrador')
        var sb = $app.findRecordsByFilter(
          'com_usuarios_equipes',
          "usuario_id = '" + authId + "' && perfil_id = '" + sa.id + "' && ativo = true",
          '',
          1,
          0,
        )
        if (sb && sb.length > 0) isSA = true
      } catch (_) {}
    }
    if (!isSA) return e.forbiddenError('Apenas superadministrador')

    var secret = ''
    try {
      secret = $secrets.get('COMERCIAL_INTEGRACAO_PASSWORD') || ''
    } catch (_) {}
    if (!secret) return e.json(200, { status: 'BLOCKED: SECRET AUSENTE' })

    var TECH_EMAIL = 'integracao.comercial@pmaisservicos.com.br'
    var account = null
    try {
      account = $app.findAuthRecordByEmail('_pb_users_auth_', TECH_EMAIL)
    } catch (_) {
      return e.json(200, {
        status: 'BLOCKED: TECHNICAL_ACCOUNT_NOT_FOUND',
        message: 'Run bootstrap first',
      })
    }

    var accountProfileSlug = ''
    try {
      var ap = $app.findRecordById('com_perfis', account.getString('perfil_id'))
      accountProfileSlug = ap.getString('slug')
    } catch (_) {}

    var baseUrl = ($secrets.get('PB_INSTANCE_URL') || '').replace(/\/$/, '')
    var authRes = $http.send({
      url: baseUrl + '/api/collections/users/auth-with-password',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity: TECH_EMAIL, password: secret }),
      timeout: 15,
    })
    if (authRes.statusCode !== 200) {
      return e.json(200, {
        status: 'BLOCKED',
        reason: 'Auth failed',
        httpStatus: authRes.statusCode,
      })
    }
    var token = authRes.json.token

    var suToken = ''
    try {
      suToken = $secrets.get('PB_SUPERUSER_TOKEN') || ''
    } catch (_) {}

    function call(method, path, body) {
      var r = $http.send({
        url: baseUrl + '/api/collections/' + path,
        method: method,
        headers: { 'Content-Type': 'application/json', Authorization: token },
        body: body ? JSON.stringify(body) : '',
        timeout: 15,
      })
      return { status: r.statusCode, body: r.json || {} }
    }
    function suCall(method, path, body) {
      var r = $http.send({
        url: baseUrl + '/api/collections/' + path,
        method: method,
        headers: { 'Content-Type': 'application/json', Authorization: suToken },
        body: body ? JSON.stringify(body) : '',
        timeout: 15,
      })
      return { status: r.statusCode, body: r.json || {} }
    }
    function cleanup(col, id) {
      if (!id || !suToken) return
      try {
        $http.send({
          url: baseUrl + '/api/collections/' + col + '/records/' + id,
          method: 'DELETE',
          headers: { Authorization: suToken },
          timeout: 10,
        })
      } catch (_) {}
    }
    function sanitize(body) {
      if (!body || typeof body !== 'object') return body
      if (Array.isArray(body)) {
        var arr = []
        for (var ai = 0; ai < body.length; ai++) arr.push(sanitize(body[ai]))
        return arr
      }
      var out = {}
      for (var k in body) {
        if (k === 'token' || k === 'password' || k === 'passwordConfirm') continue
        var v = body[k]
        if (typeof v === 'string' && v.length > 200) out[k] = v.substring(0, 200) + '...'
        else if (v !== null && typeof v === 'object') out[k] = sanitize(v)
        else out[k] = v
      }
      return out
    }
    function countSu(col) {
      if (!suToken) return 0
      var r = suCall('GET', col + '/records?page=1&perPage=1')
      return r.body.totalItems || 0
    }
    function hasFieldErrors(body) {
      if (!body || !body.data || typeof body.data !== 'object') return false
      for (var k in body.data) {
        return true
      }
      return false
    }

    var accountBindings = []
    try {
      var bindings = $app.findRecordsByFilter(
        'com_usuarios_equipes',
        "usuario_id = '" + account.id + "'",
        '',
        500,
        0,
      )
      for (var bi = 0; bi < bindings.length; bi++) {
        accountBindings.push({ id: bindings[bi].id, ativo: bindings[bi].getBool('ativo') })
      }
    } catch (_) {}

    var integracaoProfile = null
    try {
      integracaoProfile = $app.findFirstRecordByData('com_perfis', 'slug', 'integracao')
    } catch (_) {}

    var usersWithIntegracao = []
    if (integracaoProfile) {
      try {
        var iu = $app.findRecordsByFilter(
          'users',
          "perfil_id = '" + integracaoProfile.id + "'",
          '',
          500,
          0,
        )
        for (var iu2 = 0; iu2 < iu.length; iu2++) {
          usersWithIntegracao.push({
            id: iu[iu2].id,
            name: iu[iu2].getString('name'),
            email: iu[iu2].getString('email'),
          })
        }
      } catch (_) {}
    }

    var duplicateAccounts = []
    for (var da = 0; da < usersWithIntegracao.length; da++) {
      if (usersWithIntegracao[da].id !== account.id) duplicateAccounts.push(usersWithIntegracao[da])
    }

    var spok = null
    try {
      var s = $app.findAuthRecordByEmail('_pb_users_auth_', 'spok@pmaisservicos.com.br')
      var sp = ''
      try {
        var spr = $app.findRecordById('com_perfis', s.getString('perfil_id'))
        sp = spr.getString('slug')
      } catch (_) {}
      spok = { id: s.id, name: s.getString('name'), perfil: sp, isIntegracao: sp === 'integracao' }
    } catch (_) {
      spok = { found: false }
    }

    var testNegocioId = ''
    if (suToken) {
      var testNegocio = suCall('POST', 'com_negocios/records', {
        titulo: '[TESTE] Integracao Tests',
        etapa: 'prospects',
        inativo: false,
      })
      testNegocioId = testNegocio.body.id || ''
    }

    var tests = []
    var ts = new Date().getTime()

    var intCols = [
      'com_contatos',
      'com_etapas',
      'com_alias_dimensoes',
      'com_vinculos_externos',
      'com_execucoes_sincronizacao',
      'com_eventos_integracao',
      'com_ocorrencias_qualidade',
    ]

    var createDefs = {
      com_contatos: { nome: '[TESTE] Integracao', email: 'teste@tmp.local', ativo: true },
      com_etapas: {
        external_id: '[TESTE]-BT-' + ts,
        codigo: 'TST',
        nome: '[TESTE]',
        ordem: 999,
        ativa: false,
      },
      com_alias_dimensoes: { dimensao: '[TESTE]', valor_original: 'x' },
      com_vinculos_externos: {
        sistema_origem: '[TESTE]',
        external_type: 't',
        external_id: 'bt-' + ts,
      },
      com_execucoes_sincronizacao: { sistema_origem: '[TESTE]', status: 'teste' },
      com_eventos_integracao: { sistema_origem: '[TESTE]', idempotency_key: 'bt-' + ts },
      com_ocorrencias_qualidade: { tipo: '[TESTE]', severidade: 'baixa', descricao: 'Teste' },
    }

    var updateDefs = {
      com_contatos: { nome: '[TESTE-UPDATE]' },
      com_etapas: { nome: '[TESTE-UPDATE]' },
      com_alias_dimensoes: { valor_original: '[TESTE-UPDATE]' },
      com_vinculos_externos: { external_id: '[TESTE-UPDATE-' + ts + ']' },
      com_execucoes_sincronizacao: { status: '[TESTE-UPDATE]' },
      com_eventos_integracao: { status: '[TESTE-UPDATE]' },
      com_ocorrencias_qualidade: { descricao: '[TESTE-UPDATE]' },
    }

    var createdIds = {}

    for (var i = 0; i < intCols.length; i++) {
      var lr = call('GET', intCols[i] + '/records?page=1&perPage=1')
      tests.push({
        test: 'List ' + intCols[i] + ' (allowed)',
        expected: 200,
        actual: lr.status,
        pass: lr.status === 200,
        responseBody: sanitize(lr.body),
      })
    }

    for (var j = 0; j < intCols.length; j++) {
      var col = intCols[j]
      var cr = call('POST', col + '/records', createDefs[col])
      var createOk = cr.status === 200 || cr.status === 201
      tests.push({
        test: 'Create ' + col + ' (allowed)',
        expected: '2xx',
        actual: cr.status,
        pass: createOk,
        realId: cr.body.id || '',
        responseBody: sanitize(cr.body),
      })
      if (cr.body.id) {
        createdIds[col] = cr.body.id
        var vr = call('GET', col + '/records/' + cr.body.id)
        tests.push({
          test: 'View ' + col + ' (allowed)',
          expected: 200,
          actual: vr.status,
          pass: vr.status === 200,
          realId: cr.body.id,
          responseBody: sanitize(vr.body),
        })
      }
    }

    for (var u = 0; u < intCols.length; u++) {
      var uc = intCols[u]
      var rid = createdIds[uc]
      if (!rid) {
        tests.push({
          test: 'Update ' + uc + ' (blocked)',
          expected: 'blocked',
          actual: 'NO_REAL_ID',
          pass: false,
        })
        tests.push({
          test: 'Delete ' + uc + ' (blocked)',
          expected: 'blocked',
          actual: 'NO_REAL_ID',
          pass: false,
        })
        continue
      }
      var before = call('GET', uc + '/records/' + rid)
      var ur = call('PATCH', uc + '/records/' + rid, updateDefs[uc])
      var after = call('GET', uc + '/records/' + rid)
      var recordUnchanged =
        before.status === 200 &&
        after.status === 200 &&
        JSON.stringify(before.body) === JSON.stringify(after.body)
      tests.push({
        test: 'Update ' + uc + ' (blocked)',
        expected: '403, record unchanged',
        actual: ur.status,
        pass: (ur.status === 403 || ur.status === 404) && recordUnchanged,
        realId: rid,
        recordUnchanged: recordUnchanged,
        responseBody: sanitize(ur.body),
      })
      var beforeCount = countSu(uc)
      var dr = call('DELETE', uc + '/records/' + rid)
      var afterCount = countSu(uc)
      var stillExists = call('GET', uc + '/records/' + rid)
      tests.push({
        test: 'Delete ' + uc + ' (blocked)',
        expected: '403, count unchanged, record exists',
        actual: dr.status,
        pass:
          (dr.status === 403 || dr.status === 404) &&
          afterCount === beforeCount &&
          stillExists.status === 200,
        realId: rid,
        beforeCount: beforeCount,
        afterCount: afterCount,
        recordStillExists: stillExists.status === 200,
        responseBody: sanitize(dr.body),
      })
      cleanup(uc, rid)
    }

    var sl = call('GET', 'com_snapshots_negocio/records?page=1&perPage=1')
    tests.push({
      test: 'List com_snapshots_negocio (allowed)',
      expected: 200,
      actual: sl.status,
      pass: sl.status === 200,
      responseBody: sanitize(sl.body),
    })
    var sv = call('GET', 'com_snapshots_negocio/records/00000000-0000-0000-0000-000000000000')
    tests.push({
      test: 'View com_snapshots_negocio (allowed)',
      expected: '200 or 404',
      actual: sv.status,
      pass: sv.status === 200 || sv.status === 404,
      responseBody: sanitize(sv.body),
    })

    var beforeSnapCount = countSu('com_snapshots_negocio')
    var scCreate
    if (testNegocioId) {
      scCreate = call('POST', 'com_snapshots_negocio/records', {
        negocio_id: testNegocioId,
        snapshot: '[TESTE]',
        origem: 'teste',
      })
    } else {
      scCreate = { status: 0, body: { error: 'No [TESTE] business available' } }
    }
    var afterSnapCount = countSu('com_snapshots_negocio')
    var snapGeneric400 = scCreate.status === 400 && !hasFieldErrors(scCreate.body)
    var snapCreatePass =
      (scCreate.status === 403 || snapGeneric400) && afterSnapCount === beforeSnapCount
    tests.push({
      test: 'Create com_snapshots_negocio (blocked)',
      expected: '403 or 400 (generic, count unchanged)',
      actual: scCreate.status,
      pass: testNegocioId ? snapCreatePass : null,
      notTestable: !testNegocioId,
      realId: testNegocioId,
      beforeCount: beforeSnapCount,
      afterCount: afterSnapCount,
      responseBody: sanitize(scCreate.body),
      note: testNegocioId ? '' : 'No [TESTE] business available',
    })

    var testSnapshotId = scCreate.body.id || ''
    if (testSnapshotId) {
      var su = call('PATCH', 'com_snapshots_negocio/records/' + testSnapshotId, {
        snapshot: '[TESTE-UPDATE]',
      })
      tests.push({
        test: 'Update com_snapshots_negocio (blocked)',
        expected: 403,
        actual: su.status,
        pass: su.status === 403,
        realId: testSnapshotId,
        responseBody: sanitize(su.body),
      })
      var sd = call('DELETE', 'com_snapshots_negocio/records/' + testSnapshotId)
      tests.push({
        test: 'Delete com_snapshots_negocio (blocked)',
        expected: 403,
        actual: sd.status,
        pass: sd.status === 403,
        realId: testSnapshotId,
        responseBody: sanitize(sd.body),
      })
      cleanup('com_snapshots_negocio', testSnapshotId)
    } else {
      tests.push({
        test: 'Update com_snapshots_negocio (blocked)',
        expected: 'NOT TESTABLE',
        actual: 'NOT TESTABLE',
        pass: null,
        notTestable: true,
        note: 'No [TESTE] snapshot exists (create is blocked)',
      })
      tests.push({
        test: 'Delete com_snapshots_negocio (blocked)',
        expected: 'NOT TESTABLE',
        actual: 'NOT TESTABLE',
        pass: null,
        notTestable: true,
        note: 'No [TESTE] snapshot exists (create is blocked)',
      })
    }

    var hl = call('GET', 'com_negocio_historico/records?page=1&perPage=1')
    var hlTotal = hl.body.totalItems || 0
    tests.push({
      test: 'List com_negocio_historico',
      expected: '403 or 200 with 0 items',
      actual: hl.status,
      pass: hl.status === 403 || (hl.status === 200 && hlTotal === 0),
      totalItems: hlTotal,
      responseBody: sanitize(hl.body),
    })

    var testHistoryId = ''
    if (suToken && testNegocioId) {
      var testHistory = suCall('POST', 'com_negocio_historico/records', {
        negocio_id: testNegocioId,
        justificativa: '[TESTE]',
        origem_alteracao: 'teste',
      })
      testHistoryId = testHistory.body.id || ''
    }
    if (testHistoryId) {
      var hv = call('GET', 'com_negocio_historico/records/' + testHistoryId)
      tests.push({
        test: 'View com_negocio_historico (real ID)',
        expected: '403 or 404',
        actual: hv.status,
        pass: hv.status === 403 || hv.status === 404,
        realId: testHistoryId,
        responseBody: sanitize(hv.body),
      })
    } else {
      tests.push({
        test: 'View com_negocio_historico (real ID)',
        expected: 'NOT TESTABLE',
        actual: 'NOT TESTABLE',
        pass: null,
        notTestable: true,
        note: 'No [TESTE] history record created',
      })
    }

    var beforeHistCount = countSu('com_negocio_historico')
    var hc
    if (testNegocioId) {
      hc = call('POST', 'com_negocio_historico/records', {
        negocio_id: testNegocioId,
        justificativa: '[TESTE]',
        origem_alteracao: 'teste',
      })
    } else {
      hc = { status: 0, body: { error: 'No [TESTE] business available' } }
    }
    var afterHistCount = countSu('com_negocio_historico')
    var hcGeneric400 = hc.status === 400 && !hasFieldErrors(hc.body)
    var hcPass = (hc.status === 403 || hcGeneric400) && afterHistCount === beforeHistCount
    tests.push({
      test: 'Create com_negocio_historico (blocked)',
      expected: '403 or 400 (generic, no field errors)',
      actual: hc.status,
      pass: testNegocioId ? hcPass : null,
      notTestable: !testNegocioId,
      beforeCount: beforeHistCount,
      afterCount: afterHistCount,
      hasFieldErrors: hasFieldErrors(hc.body),
      responseBody: sanitize(hc.body),
      note: testNegocioId ? '' : 'No [TESTE] business available',
    })
    if (testHistoryId) cleanup('com_negocio_historico', testHistoryId)
    if (hc.body.id) cleanup('com_negocio_historico', hc.body.id)

    var nc = call('POST', 'com_negocios/records', { titulo: '[TESTE] Blocked' })
    tests.push({
      test: 'Create com_negocios (blocked)',
      expected: 403,
      actual: nc.status,
      pass: nc.status === 403,
      responseBody: sanitize(nc.body),
    })
    if (nc.body.id) cleanup('com_negocios', nc.body.id)

    if (testNegocioId) {
      var negBefore = suCall('GET', 'com_negocios/records/' + testNegocioId)
      var nu = call('PATCH', 'com_negocios/records/' + testNegocioId, { titulo: '[TESTE-UPDATE]' })
      var negAfter = suCall('GET', 'com_negocios/records/' + testNegocioId)
      var negUnchanged =
        negBefore.status === 200 &&
        negAfter.status === 200 &&
        JSON.stringify(negBefore.body) === JSON.stringify(negAfter.body)
      tests.push({
        test: 'Update com_negocios (blocked, real ID)',
        expected: '403, record unchanged',
        actual: nu.status,
        pass: (nu.status === 403 || nu.status === 404) && negUnchanged,
        realId: testNegocioId,
        recordUnchanged: negUnchanged,
        responseBody: sanitize(nu.body),
      })
      var nd = call('DELETE', 'com_negocios/records/' + testNegocioId)
      var negStillExists = suCall('GET', 'com_negocios/records/' + testNegocioId)
      tests.push({
        test: 'Delete com_negocios (blocked)',
        expected: '403, record exists',
        actual: nd.status,
        pass: (nd.status === 403 || nd.status === 404) && negStillExists.status === 200,
        realId: testNegocioId,
        recordStillExists: negStillExists.status === 200,
        responseBody: sanitize(nd.body),
      })
    } else {
      tests.push({
        test: 'Update com_negocios (blocked, real ID)',
        expected: 'NOT TESTABLE',
        actual: 'NOT TESTABLE',
        pass: null,
        notTestable: true,
        note: 'No [TESTE] business created',
      })
      tests.push({
        test: 'Delete com_negocios (blocked)',
        expected: 'NOT TESTABLE',
        actual: 'NOT TESTABLE',
        pass: null,
        notTestable: true,
        note: 'No [TESTE] business created',
      })
    }
    cleanup('com_negocios', testNegocioId)

    var ac = call('POST', 'com_auditoria/records', {
      collection_name: '[TESTE]',
      record_id: 'test',
      acao: 'create',
    })
    tests.push({
      test: 'Create com_auditoria (blocked)',
      expected: 403,
      actual: ac.status,
      pass: ac.status === 403,
      responseBody: sanitize(ac.body),
    })
    var au = call('PATCH', 'com_auditoria/records/00000000-0000-0000-0000-000000000000', {
      valor_novo: '[TESTE]',
    })
    tests.push({
      test: 'Update com_auditoria (blocked)',
      expected: 403,
      actual: au.status,
      pass: au.status === 403,
      responseBody: sanitize(au.body),
    })
    var ad = call('DELETE', 'com_auditoria/records/00000000-0000-0000-0000-000000000000')
    tests.push({
      test: 'Delete com_auditoria (blocked)',
      expected: 403,
      actual: ad.status,
      pass: ad.status === 403,
      responseBody: sanitize(ad.body),
    })

    var uc2 = call('POST', 'users/records', {
      email: '[TESTE]@tmp.local',
      password: 'Skip@Pass',
      passwordConfirm: 'Skip@Pass',
      name: '[TESTE]',
    })
    tests.push({
      test: 'Create users (blocked)',
      expected: 403,
      actual: uc2.status,
      pass: uc2.status === 403,
      responseBody: sanitize(uc2.body),
    })
    if (uc2.body.id) cleanup('users', uc2.body.id)
    var pc = call('POST', 'com_perfis/records', { nome: '[TESTE]', slug: 'teste-' + ts })
    tests.push({
      test: 'Create com_perfis (blocked)',
      expected: 403,
      actual: pc.status,
      pass: pc.status === 403,
      responseBody: sanitize(pc.body),
    })
    if (pc.body.id) cleanup('com_perfis', pc.body.id)
    var pmc = call('POST', 'com_permissoes/records', {
      nome: '[TESTE]',
      slug: 'teste-' + ts,
      recurso: 'teste',
      acao: 'view',
    })
    tests.push({
      test: 'Create com_permissoes (blocked)',
      expected: 403,
      actual: pmc.status,
      pass: pmc.status === 403,
      responseBody: sanitize(pmc.body),
    })
    if (pmc.body.id) cleanup('com_permissoes', pmc.body.id)
    var ec = call('POST', 'com_equipes/records', { nome: '[TESTE]', slug: 'teste-' + ts })
    tests.push({
      test: 'Create com_equipes (blocked)',
      expected: 403,
      actual: ec.status,
      pass: ec.status === 403,
      responseBody: sanitize(ec.body),
    })
    if (ec.body.id) cleanup('com_equipes', ec.body.id)
    var prc = call('POST', 'com_parametros/records', {
      chave: 'teste-' + ts,
      valor: 'teste',
      versao: 1,
    })
    tests.push({
      test: 'Create com_parametros (blocked)',
      expected: 403,
      actual: prc.status,
      pass: prc.status === 403,
      responseBody: sanitize(prc.body),
    })
    if (prc.body.id) cleanup('com_parametros', prc.body.id)

    var blockedEmpty = [
      'com_negocios',
      'com_empresas',
      'com_perfis',
      'com_parametros',
      'com_usuarios_equipes',
    ]
    for (var m = 0; m < blockedEmpty.length; m++) {
      var er = call('GET', blockedEmpty[m] + '/records?page=1&perPage=1')
      var isEmpty =
        er.status === 200 && (er.body.totalItems === 0 || (er.body.items || []).length === 0)
      tests.push({
        test: 'List ' + blockedEmpty[m] + ' (blocked/empty)',
        expected: '200+empty or 403',
        actual: er.status + ':' + (er.body.totalItems || 0),
        pass: isEmpty || er.status === 403,
        responseBody: sanitize(er.body),
      })
    }

    var saNeg = suCall('GET', 'com_negocios/records?page=1&perPage=5')
    tests.push({
      test: 'Regression: Superadmin list negocios',
      expected: 200,
      actual: saNeg.status,
      pass: saNeg.status === 200,
      totalItems: saNeg.body.totalItems || 0,
    })
    var saEmp = suCall('GET', 'com_empresas/records?page=1&perPage=5')
    tests.push({
      test: 'Regression: Superadmin list empresas',
      expected: 200,
      actual: saEmp.status,
      pass: saEmp.status === 200,
      totalItems: saEmp.body.totalItems || 0,
    })
    tests.push({
      test: 'Isolation: Spok not integracao',
      expected: 'not integracao',
      actual: spok ? spok.perfil : 'not found',
      pass: spok && spok.perfil !== 'integracao',
    })
    tests.push({
      test: 'Isolation: Zero duplicate technical accounts',
      expected: 0,
      actual: duplicateAccounts.length,
      pass: duplicateAccounts.length === 0,
    })
    tests.push({
      test: 'Isolation: No team bindings',
      expected: 0,
      actual: accountBindings.length,
      pass: accountBindings.length === 0,
    })

    var passed = 0,
      failed = 0,
      notTestable = 0
    for (var t = 0; t < tests.length; t++) {
      if (tests[t].notTestable) notTestable++
      else if (tests[t].pass) passed++
      else failed++
    }

    return e.json(200, {
      timestamp: new Date().toISOString(),
      identity: { loginIdentifier: TECH_EMAIL, type: 'email' },
      bootstrap: {
        account: {
          id: account.id,
          name: account.getString('name'),
          email: TECH_EMAIL,
          profile: accountProfileSlug,
          ativo_comercial: account.getBool('ativo_comercial'),
        },
        duplicateAccounts: duplicateAccounts,
        teamBindings: accountBindings,
      },
      authentication: {
        httpStatus: authRes.statusCode,
        success: authRes.statusCode === 200,
        accountId: account.id,
        profileSlug: accountProfileSlug,
      },
      spok: spok,
      tests: tests,
      summary: {
        total: tests.length,
        passed: passed,
        failed: failed,
        notTestable: notTestable,
        allPassed: failed === 0,
      },
      porta2C: 'NOT_DECLARED_APPROVED',
      porta2D: 'BLOCKED',
    })
  },
  $apis.requireAuth(),
)
