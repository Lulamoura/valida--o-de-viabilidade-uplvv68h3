routerAdd(
  'POST',
  '/backend/v1/run-positive-tests',
  (e) => {
    if (!e.hasSuperuserAuth()) return e.forbiddenError('Only superuser can run tests')

    var baseUrl = ($secrets.get('PB_INSTANCE_URL') || '').replace(/\/$/, '')
    var PWD = 'Skip@Pass'
    var results = { generatedAt: new Date().toISOString(), tests: [] }

    function authToken(email) {
      var res = $http.send({
        url: baseUrl + '/api/collections/users/auth-with-password',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: email, password: PWD }),
        timeout: 15,
      })
      return res.statusCode === 200 && res.json ? res.json.token : null
    }

    function listRecs(token, col, perPage) {
      var pp = perPage || 500
      var res = $http.send({
        url: baseUrl + '/api/collections/' + col + '/records?page=1&perPage=' + pp,
        method: 'GET',
        headers: { Authorization: token },
        timeout: 15,
      })
      var body = res.json || {}
      var items = (body.items || []).map(function (r) {
        return {
          id: r.id,
          titulo: r.titulo || r.nome || r.chave || r.slug || r.id,
          inativo: r.inativo === true,
        }
      })
      return { status: res.statusCode, totalItems: body.totalItems || 0, items: items }
    }

    function dbListNegocios(filter) {
      try {
        var recs = $app.findRecordsByFilter('com_negocios', filter, '-created', 500, 0)
        return recs.map(function (r) {
          return { id: r.id, titulo: r.getString('titulo'), inativo: r.getBool('inativo') }
        })
      } catch (_) {
        return []
      }
    }

    function dbCount(col, filter) {
      try {
        return $app.findRecordsByFilter(col, filter || '', '', 500, 0).length
      } catch (_) {
        return 0
      }
    }

    var lulaToken = authToken('luiz.moura@pmaisservicos.com.br')
    var lulaCols = [
      'com_perfis',
      'com_usuarios_equipes',
      'com_permissoes',
      'com_negocios',
      'com_parametros',
    ]
    for (var i = 0; i < lulaCols.length; i++) {
      var col = lulaCols[i]
      var actual = listRecs(lulaToken, col)
      var expected = dbCount(col, '')
      results.tests.push({
        test: 'Lula_superadmin_' + col,
        role: 'superadministrador',
        collection: col,
        httpStatus: actual.status,
        expectedRecords: expected,
        actualTotalItems: actual.totalItems,
        actualItems: actual.items,
        pass: actual.status === 200 && actual.totalItems > 0,
      })
    }

    var spokToken = authToken('spok@pmaisservicos.com.br')
    var spokResult = listRecs(spokToken, 'com_negocios')
    results.tests.push({
      test: 'Spok_regression_com_negocios',
      role: 'integracao',
      collection: 'com_negocios',
      httpStatus: spokResult.status,
      expectedRecords: 0,
      actualTotalItems: spokResult.totalItems,
      actualItems: spokResult.items,
      pass: spokResult.totalItems === 0,
    })

    var comercialUser = $app.findAuthRecordByEmail(
      '_pb_users_auth_',
      'comercial.teste@pmaisservicos.com.br',
    )
    var equipeAlpha = $app.findFirstRecordByData('com_equipes', 'slug', 'equipe-alpha-teste')
    var operadorPerfil = $app.findFirstRecordByData('com_perfis', 'slug', 'operador-comercial')
    var gestorPerfil = $app.findFirstRecordByData('com_perfis', 'slug', 'gestor-comercial')
    var leituraPerfil = $app.findFirstRecordByData('com_perfis', 'slug', 'leitura-executiva')

    var scopeConfigs = [
      {
        scope: 'proprios',
        perfil: operadorPerfil,
        expectedFilter: "responsavel_id = '" + comercialUser.id + "' && inativo != true",
      },
      {
        scope: 'equipe',
        perfil: gestorPerfil,
        expectedFilter: "equipe_id = '" + equipeAlpha.id + "' && inativo != true",
      },
      {
        scope: 'todos',
        perfil: leituraPerfil,
        expectedFilter: 'inativo != true',
      },
    ]

    for (var s = 0; s < scopeConfigs.length; s++) {
      var cfg = scopeConfigs[s]

      var bindings = $app.findRecordsByFilter(
        'com_usuarios_equipes',
        "usuario_id = '" + comercialUser.id + "'",
        '',
        500,
        0,
      )
      for (var b = 0; b < bindings.length; b++) {
        if (bindings[b].getBool('ativo')) {
          bindings[b].set('ativo', false)
          $app.save(bindings[b])
        }
      }

      var bindingExists = false
      try {
        var existing = $app.findFirstRecordByFilter(
          'com_usuarios_equipes',
          "usuario_id = '" +
            comercialUser.id +
            "' && equipe_id = '" +
            equipeAlpha.id +
            "' && perfil_id = '" +
            cfg.perfil.id +
            "'",
        )
        existing.set('ativo', true)
        existing.set('escopo', cfg.scope)
        $app.save(existing)
        bindingExists = true
      } catch (_) {}

      if (!bindingExists) {
        var ueCol = $app.findCollectionByNameOrId('com_usuarios_equipes')
        var newBinding = new Record(ueCol)
        newBinding.set('usuario_id', comercialUser.id)
        newBinding.set('equipe_id', equipeAlpha.id)
        newBinding.set('perfil_id', cfg.perfil.id)
        newBinding.set('escopo', cfg.scope)
        newBinding.set('ativo', true)
        newBinding.set('inicio_vigencia', new Date().toISOString().split('T')[0])
        $app.save(newBinding)
      }

      comercialUser.set('perfil_id', cfg.perfil.id)
      $app.save(comercialUser)

      var commToken = authToken('comercial.teste@pmaisservicos.com.br')
      var commResult = listRecs(commToken, 'com_negocios')
      var expectedRecs = dbListNegocios(cfg.expectedFilter)
      var hasInactive = commResult.items.some(function (r) {
        return r.inativo === true
      })

      results.tests.push({
        test: 'Comercial_scope_' + cfg.scope,
        role: cfg.perfil.getString('slug'),
        scope: cfg.scope,
        collection: 'com_negocios',
        httpStatus: commResult.status,
        expectedRecords: expectedRecs,
        expectedCount: expectedRecs.length,
        actualTotalItems: commResult.totalItems,
        actualItems: commResult.items,
        inactiveExcluded: !hasInactive,
        pass:
          commResult.status === 200 &&
          commResult.totalItems === expectedRecs.length &&
          !hasInactive,
      })
    }

    comercialUser.set('perfil_id', operadorPerfil.id)
    $app.save(comercialUser)

    try {
      var operadorBinding = $app.findFirstRecordByFilter(
        'com_usuarios_equipes',
        "usuario_id = '" +
          comercialUser.id +
          "' && equipe_id = '" +
          equipeAlpha.id +
          "' && perfil_id = '" +
          operadorPerfil.id +
          "'",
      )
      operadorBinding.set('ativo', true)
      operadorBinding.set('escopo', 'proprios')
      $app.save(operadorBinding)
    } catch (_) {}

    var allBindings = $app.findRecordsByFilter(
      'com_usuarios_equipes',
      "usuario_id = '" + comercialUser.id + "'",
      '',
      500,
      0,
    )
    for (var r = 0; r < allBindings.length; r++) {
      if (
        allBindings[r].getString('perfil_id') !== operadorPerfil.id &&
        allBindings[r].getBool('ativo')
      ) {
        allBindings[r].set('ativo', false)
        $app.save(allBindings[r])
      }
    }

    var allPass = results.tests.every(function (t) {
      return t.pass
    })
    results.summary = {
      totalTests: results.tests.length,
      passed: results.tests.filter(function (t) {
        return t.pass
      }).length,
      failed: results.tests.filter(function (t) {
        return !t.pass
      }).length,
      allPassed: allPass,
    }

    return e.json(200, results)
  },
  $apis.requireSuperuserAuth(),
)
