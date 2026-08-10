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

    var baseUrl = ($secrets.get('PB_INSTANCE_URL') || '').replace(/\/$/, '')
    var TECH_EMAIL = 'integracao.comercial@pmaisservicos.com.br'
    var authRes = $http.send({
      url: baseUrl + '/api/collections/users/auth-with-password',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity: TECH_EMAIL, password: secret }),
      timeout: 15,
    })
    if (authRes.statusCode !== 200)
      return e.json(200, {
        status: 'BLOCKED',
        reason: 'Auth failed',
        httpStatus: authRes.statusCode,
      })

    var token = authRes.json.token
    var ts = new Date().getTime()
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
    var suToken = ''
    try {
      suToken = $secrets.get('PB_SUPERUSER_TOKEN') || ''
    } catch (_) {}
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
      var cr = call('POST', createDefs[j][0] + '/records', createDefs[j][1])
      var ok = cr.status === 200 || cr.status === 201
      cleanup(createDefs[j][0], cr.body.id || '')
      tests.push({
        test: 'Create ' + createDefs[j][0],
        expected: '2xx',
        actual: cr.status,
        pass: ok,
        cleanedUp: !!cr.body.id,
      })
    }

    var sc = call('POST', 'com_snapshots_negocio/records', {
      negocio_id: '00000000-0000-0000-0000-000000000000',
      snapshot: '[TESTE]',
    })
    tests.push({
      test: 'Create snapshots_negocio (blocked)',
      expected: 403,
      actual: sc.status,
      pass: sc.status === 403,
    })

    var nc = call('POST', 'com_negocios/records', { titulo: '[TESTE] Blocked' })
    tests.push({
      test: 'Create negocios (blocked)',
      expected: 403,
      actual: nc.status,
      pass: nc.status === 403,
    })

    var blocked403 = ['com_auditoria', 'com_negocio_historico']
    for (var k = 0; k < blocked403.length; k++) {
      var br = call('GET', blocked403[k] + '/records?page=1&perPage=1')
      tests.push({
        test: 'List ' + blocked403[k] + ' (blocked)',
        expected: 403,
        actual: br.status,
        pass: br.status === 403,
      })
    }

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
        test: 'List ' + blockedEmpty[m] + ' (blocked, empty)',
        expected: '200+empty',
        actual: er.status + ':' + (er.body.totalItems || 0),
        pass: isEmpty,
      })
    }

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

    var spok = null
    try {
      var s = $app.findAuthRecordByEmail('_pb_users_auth_', 'spok@pmaisservicos.com.br')
      var sp = ''
      try {
        var spr = $app.findRecordById('com_perfis', s.getString('perfil_id'))
        sp = spr.getString('slug')
      } catch (_) {}
      spok = { id: s.id, name: s.getString('name'), perfil: sp }
    } catch (_) {}

    var passed = 0,
      failed = 0
    for (var t = 0; t < tests.length; t++) {
      if (tests[t].pass) passed++
      else failed++
    }
    return e.json(200, {
      timestamp: new Date().toISOString(),
      spokUser: spok,
      tests: tests,
      summary: { total: tests.length, passed: passed, failed: failed },
    })
  },
  $apis.requireAuth(),
)
