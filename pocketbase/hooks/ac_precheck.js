routerAdd(
  'GET',
  '/backend/v1/integracao/ac/precheck',
  (e) => {
    var authId = e.auth ? e.auth.id : ''
    if (!authId) return e.unauthorizedError('Autenticacao necessaria')

    var isSuperAdmin = false
    try {
      var authPerfilId = e.auth.getString('perfil_id')
      if (authPerfilId) {
        var perfilRec = $app.findRecordById('com_perfis', authPerfilId)
        if (perfilRec.getString('slug') === 'superadministrador') {
          isSuperAdmin = true
        }
      }
    } catch (_) {}

    if (!isSuperAdmin) {
      try {
        var saPerfil = $app.findFirstRecordByData('com_perfis', 'slug', 'superadministrador')
        if (saPerfil) {
          var saBindings = $app.findRecordsByFilter(
            'com_usuarios_equipes',
            "usuario_id = '" + authId + "' && perfil_id = '" + saPerfil.id + "' && ativo = true",
            '',
            1,
            0,
          )
          if (saBindings && saBindings.length > 0) isSuperAdmin = true
        }
      } catch (_) {}
    }

    if (!isSuperAdmin)
      return e.forbiddenError('Apenas superadministrador pode executar o pre-check')

    var secretNames = ['AC_API_URL', 'AC_API_KEY', 'AC_WEBHOOK_SECRET']
    var secrets = {}
    var allPresent = true
    var absent = []

    for (var i = 0; i < secretNames.length; i++) {
      var present = $secrets.has(secretNames[i])
      secrets[secretNames[i]] = present ? 'PRESENTE' : 'AUSENTE'
      if (!present) {
        allPresent = false
        absent.push(secretNames[i])
      }
    }

    return e.json(200, {
      stage: 'porta-2d-etapa-1',
      secrets: secrets,
      allPresent: allPresent,
      ready: allPresent,
      absentSecrets: absent,
      message: allPresent
        ? 'Todos os secrets estao presentes. Bootstrap pode ser iniciado.'
        : 'Secrets ausentes. Aguardando PMais registrar no vault: ' + absent.join(', '),
    })
  },
  $apis.requireAuth(),
)
