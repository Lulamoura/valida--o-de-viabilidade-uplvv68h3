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

    var integracaoProfile
    try {
      integracaoProfile = $app.findFirstRecordByData('com_perfis', 'slug', 'integracao')
    } catch (_) {
      return e.json(200, { status: 'BLOCKED: INTEGRACAO_PROFILE_NOT_FOUND' })
    }

    var accountProfileSlug = ''
    try {
      var ap = $app.findRecordById('com_perfis', account.getString('perfil_id'))
      accountProfileSlug = ap.getString('slug')
    } catch (_) {}

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

    var usersWithIntegracao = []
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

    var duplicateAccounts = []
    for (var da = 0; da < usersWithIntegracao.length; da++) {
      if (usersWithIntegracao[da].id !== account.id) {
        duplicateAccounts.push(usersWithIntegracao[da])
      }
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
    var ts = new Date().getTime()

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

    var tests = []
    var listCols = [
      'com_contatos',
      'com_etapas',
      'com_alias_dimensoes',
      'com_vinculos_externos',
      'com_execucoes_sincronizacao',
      'com_eventos_integracao',
      'com_snapshots_negocio',
      'com_ocorrencias_qualidade',
    ]
    for (var i = 0; i < listCols.length; i++) {
      var r = call('GET', listCols[i] + '/records?page=1&perPage=1')
      tests.push({
        test: 'List ' + listCols[i],
        expected: 200,
        actual: r.status,
        pass: r.status === 200,
      })
    }

    var createDefs = [
      ['com_contatos', { nome: '[TESTE] Integracao', email: 'teste@tmp.local', ativo: true }],
      [
        'com_etapas',
        {
          external_id: '[TESTE]-BT-' + ts,
          codigo: 'TST',
          nome: '[TESTE]',
          ordem: 999,
          ativa: false,
        },
      ],
      ['com_alias_dimensoes', { dimensao: '[TESTE]', valor_original: 'x' }],
      [
        'com_vinculos_externos',
        { sistema_origem: '[TESTE]', external_type: 't', external_id: 'bt-' + ts },
      ],
      ['com_execucoes_sincronizacao', { sistema_origem: '[TESTE]', status: 'teste' }],
      ['com_eventos_integracao', { sistema_origem: '[TESTE]', idempotency_key: 'bt-' + ts }],
      ['com_ocorrencias_qualidade', { tipo: '[TESTE]', severidade: 'baixa', descricao: 'Teste' }],
    ]
    for (var j = 0; j < createDefs.length; j++) {
      var col = createDefs[j][0]
      var cr = call('POST', col + '/records', createDefs[j][1])
      var createOk = cr.status === 200 || cr.status === 201
      tests.push({
        test: 'Create ' + col,
        expected: '2xx',
        actual: cr.status,
        pass: createOk,
        recordId: cr.body.id || '',
      })
      if (cr.body.id) {
        var vr = call('GET', col + '/records/' + cr.body.id)
        tests.push({
          test: 'View ' + col,
          expected: 200,
          actual: vr.status,
          pass: vr.status === 200,
          recordId: cr.body.id,
        })
        cleanup(col, cr.body.id)
      }
    }

    var svRes = call('GET', 'com_snapshots_negocio/records/00000000-0000-0000-0000-000000000000')
    tests.push({
      test: 'View snapshots_negocio (allowed)',
      expected: '200 or 404',
      actual: svRes.status,
      pass: svRes.status === 404 || svRes.status === 200,
    })

    var updCols = [
      'com_contatos',
      'com_etapas',
      'com_alias_dimensoes',
      'com_vinculos_externos',
      'com_execucoes_sincronizacao',
      'com_eventos_integracao',
      'com_ocorrencias_qualidade',
    ]
    for (var u = 0; u < updCols.length; u++) {
      var ur = call('PATCH', updCols[u] + '/records/00000000-0000-0000-0000-000000000000', {
        descricao: '[TESTE]',
      })
      tests.push({
        test: 'Update ' + updCols[u] + ' (blocked)',
        expected: 403,
        actual: ur.status,
        pass: ur.status === 403,
      })
    }
    for (var d = 0; d < updCols.length; d++) {
      var dr = call('DELETE', updCols[d] + '/records/00000000-0000-0000-0000-000000000000')
      tests.push({
        test: 'Delete ' + updCols[d] + ' (blocked)',
        expected: 403,
        actual: dr.status,
        pass: dr.status === 403,
      })
    }

    var scCreate = call('POST', 'com_snapshots_negocio/records', {
      negocio_id: '00000000-0000-0000-0000-000000000000',
      snapshot: '[TESTE]',
    })
    tests.push({
      test: 'Create snapshots_negocio (blocked)',
      expected: 403,
      actual: scCreate.status,
      pass: scCreate.status === 403,
    })
    var scUpdate = call(
      'PATCH',
      'com_snapshots_negocio/records/00000000-0000-0000-0000-000000000000',
      { snapshot: '[TESTE]' },
    )
    tests.push({
      test: 'Update snapshots_negocio (blocked)',
      expected: 403,
      actual: scUpdate.status,
      pass: scUpdate.status === 403,
    })
    var scDelete = call(
      'DELETE',
      'com_snapshots_negocio/records/00000000-0000-0000-0000-000000000000',
    )
    tests.push({
      test: 'Delete snapshots_negocio (blocked)',
      expected: 403,
      actual: scDelete.status,
      pass: scDelete.status === 403,
    })

    var nc = call('POST', 'com_negocios/records', { titulo: '[TESTE] Blocked' })
    tests.push({
      test: 'Create negocios (blocked)',
      expected: 403,
      actual: nc.status,
      pass: nc.status === 403,
    })
    var nu = call('PATCH', 'com_negocios/records/00000000-0000-0000-0000-000000000000', {
      titulo: '[TESTE]',
    })
    tests.push({
      test: 'Update negocios (blocked)',
      expected: 403,
      actual: nu.status,
      pass: nu.status === 403,
    })
    var nd = call('DELETE', 'com_negocios/records/00000000-0000-0000-0000-000000000000')
    tests.push({
      test: 'Delete negocios (blocked)',
      expected: 403,
      actual: nd.status,
      pass: nd.status === 403,
    })

    var ac = call('POST', 'com_auditoria/records', {
      collection_name: '[TESTE]',
      record_id: 'test',
      acao: 'create',
    })
    tests.push({
      test: 'Create auditoria (blocked)',
      expected: 403,
      actual: ac.status,
      pass: ac.status === 403,
    })
    var au = call('PATCH', 'com_auditoria/records/00000000-0000-0000-0000-000000000000', {
      valor_novo: '[TESTE]',
    })
    tests.push({
      test: 'Update auditoria (blocked)',
      expected: 403,
      actual: au.status,
      pass: au.status === 403,
    })
    var ad = call('DELETE', 'com_auditoria/records/00000000-0000-0000-0000-000000000000')
    tests.push({
      test: 'Delete auditoria (blocked)',
      expected: 403,
      actual: ad.status,
      pass: ad.status === 403,
    })

    var hl = call('GET', 'com_negocio_historico/records?page=1&perPage=1')
    tests.push({
      test: 'List negocio_historico (blocked)',
      expected: 403,
      actual: hl.status,
      pass: hl.status === 403,
    })
    var hv = call('GET', 'com_negocio_historico/records/00000000-0000-0000-0000-000000000000')
    tests.push({
      test: 'View negocio_historico (blocked)',
      expected: 403,
      actual: hv.status,
      pass: hv.status === 403,
    })
    var hc = call('POST', 'com_negocio_historico/records', {
      negocio_id: '00000000-0000-0000-0000-000000000000',
    })
    tests.push({
      test: 'Create negocio_historico (blocked)',
      expected: 403,
      actual: hc.status,
      pass: hc.status === 403,
    })

    var uc = call('POST', 'users/records', {
      email: '[TESTE]@tmp.local',
      password: 'Skip@Pass',
      passwordConfirm: 'Skip@Pass',
      name: '[TESTE]',
    })
    tests.push({
      test: 'Create users (blocked)',
      expected: 403,
      actual: uc.status,
      pass: uc.status === 403,
    })
    if (uc.body.id) cleanup('users', uc.body.id)
    var pc = call('POST', 'com_perfis/records', { nome: '[TESTE]', slug: 'teste-' + ts })
    tests.push({
      test: 'Create perfis (blocked)',
      expected: 403,
      actual: pc.status,
      pass: pc.status === 403,
    })
    if (pc.body.id) cleanup('com_perfis', pc.body.id)
    var pmc = call('POST', 'com_permissoes/records', {
      nome: '[TESTE]',
      slug: 'teste-' + ts,
      recurso: 'teste',
      acao: 'view',
    })
    tests.push({
      test: 'Create permissoes (blocked)',
      expected: 403,
      actual: pmc.status,
      pass: pmc.status === 403,
    })
    if (pmc.body.id) cleanup('com_permissoes', pmc.body.id)
    var ec = call('POST', 'com_equipes/records', { nome: '[TESTE]', slug: 'teste-' + ts })
    tests.push({
      test: 'Create equipes (blocked)',
      expected: 403,
      actual: ec.status,
      pass: ec.status === 403,
    })
    if (ec.body.id) cleanup('com_equipes', ec.body.id)
    var prc = call('POST', 'com_parametros/records', {
      chave: 'teste-' + ts,
      valor: 'teste',
      versao: 1,
    })
    tests.push({
      test: 'Create parametros (blocked)',
      expected: 403,
      actual: prc.status,
      pass: prc.status === 403,
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
      failed = 0
    for (var t = 0; t < tests.length; t++) {
      if (tests[t].pass) passed++
      else failed++
    }

    return e.json(200, {
      timestamp: new Date().toISOString(),
      bootstrap: {
        account: {
          id: account.id,
          name: account.getString('name'),
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
        allPassed: passed === tests.length,
      },
      porta2C: 'NOT_DECLARED_APPROVED',
      porta2D: 'BLOCKED',
    })
  },
  $apis.requireAuth(),
)
