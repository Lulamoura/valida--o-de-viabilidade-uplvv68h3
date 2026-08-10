routerAdd(
  'POST',
  '/backend/v1/integracao/bootstrap',
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
    } catch (_) {
      secret = ''
    }
    if (!secret) {
      return e.json(200, {
        status: 'BLOCKED: SECRET AUSENTE',
        secretName: 'COMERCIAL_INTEGRACAO_PASSWORD',
      })
    }

    var integracaoProfile
    try {
      integracaoProfile = $app.findFirstRecordByData('com_perfis', 'slug', 'integracao')
    } catch (_) {
      return e.internalServerError('integracao profile not found')
    }

    var TECH_EMAIL = 'integracao.comercial@pmaisservicos.com.br'
    var account
    var created = false
    try {
      account = $app.findAuthRecordByEmail('_pb_users_auth_', TECH_EMAIL)
    } catch (_) {
      var usersCol = $app.findCollectionByNameOrId('_pb_users_auth_')
      account = new Record(usersCol)
      account.setEmail(TECH_EMAIL)
      account.setVerified(true)
      created = true
    }

    account.set('name', 'Integração Comercial PMais')
    account.set('perfil_id', integracaoProfile.id)
    account.set('equipe_id', '')
    account.set('ativo_comercial', true)
    account.setPassword(secret)
    $app.save(account)

    try {
      var bindings = $app.findRecordsByFilter(
        'com_usuarios_equipes',
        "usuario_id = '" + account.id + "'",
        '',
        500,
        0,
      )
      for (var i = 0; i < bindings.length; i++) {
        $app.delete(bindings[i])
      }
    } catch (_) {}

    return e.json(200, {
      status: 'OK',
      action: created ? 'created' : 'aligned',
      account: {
        id: account.id,
        name: account.getString('name'),
        perfil: 'integracao',
        ativo_comercial: true,
      },
      message: 'Technical account aligned. Remove this endpoint after validation.',
    })
  },
  $apis.requireAuth(),
)
