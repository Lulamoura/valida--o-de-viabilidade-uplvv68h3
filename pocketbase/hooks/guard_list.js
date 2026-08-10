onRecordListRequest((e) => {
  var colName = e.collection.name

  var permMap = {
    com_perfis: ['perfis.admin'],
    com_permissoes: ['permissoes.admin'],
    com_perfil_permissoes: ['permissoes.admin'],
    com_usuarios_equipes: ['vinculos.admin'],
    com_negocios: ['negocios.view'],
    com_empresas: ['empresas.view'],
    com_parametros: ['parametros.gerenciar', 'dashboard.view'],
    com_auditoria: ['auditoria.consultar'],
    com_parametros_versoes: ['auditoria.consultar', 'parametros.gerenciar'],
    com_negocio_historico: ['negocios.view'],
  }

  var required = permMap[colName]
  if (!required) {
    e.next()
    return
  }
  if (e.hasSuperuserAuth()) {
    e.next()
    return
  }

  var authId = e.auth ? e.auth.id : ''
  if (!authId) throw new ForbiddenError('Autenticacao necessaria')

  var now = new Date().toISOString().split('T')[0]
  var permSet = {}

  try {
    var bindings = $app.findRecordsByFilter(
      'com_usuarios_equipes',
      "usuario_id = '" + authId + "' && ativo = true",
      '',
      500,
      0,
    )
    for (var i = 0; i < bindings.length; i++) {
      var b = bindings[i]
      var ini = b.getString('inicio_vigencia')
      var fim = b.getString('fim_vigencia')
      if (ini && now < ini.split('T')[0]) continue
      if (fim && now > fim.split('T')[0]) continue
      var pid = b.getString('perfil_id')
      try {
        var links = $app.findRecordsByFilter(
          'com_perfil_permissoes',
          "perfil_id = '" + pid + "'",
          '',
          500,
          0,
        )
        for (var j = 0; j < links.length; j++) {
          try {
            var perm = $app.findRecordById('com_permissoes', links[j].getString('permissao_id'))
            permSet[perm.getString('slug')] = true
          } catch (_) {}
        }
      } catch (_) {}
    }
  } catch (_) {}

  var hasAccess = false
  for (var k = 0; k < required.length; k++) {
    if (permSet[required[k]]) {
      hasAccess = true
      break
    }
  }

  if (!hasAccess) {
    throw new ForbiddenError('Acesso negado: permissao insuficiente para listar ' + colName)
  }

  e.next()
})
