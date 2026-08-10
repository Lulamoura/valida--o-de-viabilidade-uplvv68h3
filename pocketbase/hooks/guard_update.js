onRecordUpdateRequest((e) => {
  var colName = e.collection.name

  var permMap = {
    com_perfis: ['perfis.admin'],
    com_permissoes: ['permissoes.admin'],
    com_perfil_permissoes: ['permissoes.admin'],
    com_usuarios_equipes: ['vinculos.admin'],
    com_negocios: ['negocios.update'],
    com_empresas: ['empresas.update'],
    com_parametros: ['parametros.gerenciar'],
    com_equipes: ['equipes.admin'],
    users: ['usuarios.admin'],
    com_contatos: ['contatos.update'],
    com_etapas: ['etapas.update'],
    com_alias_dimensoes: ['alias_dimensoes.update'],
    com_vinculos_externos: ['vinculos_externos.update'],
    com_execucoes_sincronizacao: ['execucoes_sincronizacao.update'],
    com_eventos_integracao: ['eventos_integracao.update'],
    com_ocorrencias_qualidade: ['ocorrencias_qualidade.update'],
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
    throw new ForbiddenError('Acesso negado: permissao insuficiente para atualizar em ' + colName)
  }

  e.next()
})
