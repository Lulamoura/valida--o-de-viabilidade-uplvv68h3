routerAdd(
  'GET',
  '/backend/v1/my-permissions',
  (e) => {
    var userId = e.auth ? e.auth.id : ''
    if (!userId) return e.unauthorizedError('Autenticacao necessaria')

    var now = new Date().toISOString().split('T')[0]
    var permissions = {}

    try {
      var bindings = $app.findRecordsByFilter(
        'com_usuarios_equipes',
        "usuario_id = '" + userId + "' && ativo = true",
        '',
        500,
        0,
      )
    } catch (_) {
      return e.json(200, { permissions: {} })
    }

    for (var i = 0; i < bindings.length; i++) {
      var binding = bindings[i]
      var inicio = binding.getString('inicio_vigencia')
      var fim = binding.getString('fim_vigencia')

      if (inicio && now < inicio.split('T')[0]) continue
      if (fim && now > fim.split('T')[0]) continue

      var perfilId = binding.getString('perfil_id')

      try {
        var links = $app.findRecordsByFilter(
          'com_perfil_permissoes',
          "perfil_id = '" + perfilId + "'",
          '',
          500,
          0,
        )

        for (var j = 0; j < links.length; j++) {
          var permId = links[j].getString('permissao_id')
          var scope = links[j].getString('escopo')

          try {
            var perm = $app.findRecordById('com_permissoes', permId)
            var slug = perm.getString('slug')

            if (
              !permissions[slug] ||
              scope === 'todos' ||
              (scope === 'equipe' && permissions[slug] === 'proprios')
            ) {
              permissions[slug] = scope
            }
          } catch (_) {}
        }
      } catch (_) {}
    }

    return e.json(200, { permissions: permissions })
  },
  $apis.requireAuth(),
)
