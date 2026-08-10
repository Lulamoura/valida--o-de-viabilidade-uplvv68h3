routerAdd(
  'GET',
  '/backend/v1/integracao/precheck',
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

    var expectedSlugs = [
      'contatos.view',
      'contatos.create',
      'etapas.view',
      'etapas.create',
      'alias_dimensoes.view',
      'alias_dimensoes.create',
      'vinculos_externos.view',
      'vinculos_externos.create',
      'execucoes_sincronizacao.view',
      'execucoes_sincronizacao.create',
      'eventos_integracao.view',
      'eventos_integracao.create',
      'snapshots_negocio.view',
      'ocorrencias_qualidade.view',
      'ocorrencias_qualidade.create',
    ]
    var expectedSet = {}
    for (var i = 0; i < expectedSlugs.length; i++) expectedSet[expectedSlugs[i]] = true

    var integracaoProfile
    try {
      integracaoProfile = $app.findFirstRecordByData('com_perfis', 'slug', 'integracao')
    } catch (_) {
      return e.json(200, { error: 'integracao profile not found', expectedSlugs: expectedSlugs })
    }

    var links = $app.findRecordsByFilter(
      'com_perfil_permissoes',
      "perfil_id = '" + integracaoProfile.id + "'",
      '',
      500,
      0,
    )
    var currentSlugs = []
    var expectedPermIds = {}
    for (var j = 0; j < expectedSlugs.length; j++) {
      try {
        var p = $app.findFirstRecordByData('com_permissoes', 'slug', expectedSlugs[j])
        expectedPermIds[p.id] = true
      } catch (_) {}
    }

    for (var k = 0; k < links.length; k++) {
      try {
        var perm = $app.findRecordById('com_permissoes', links[k].getString('permissao_id'))
        currentSlugs.push(perm.getString('slug'))
      } catch (_) {}
    }

    var removedSlugs = []
    for (var m = 0; m < links.length; m++) {
      var lid = links[m].getString('permissao_id')
      if (!expectedPermIds[lid]) {
        try {
          var rp = $app.findRecordById('com_permissoes', lid)
          removedSlugs.push(rp.getString('slug'))
        } catch (_) {}
        $app.delete(links[m])
      }
    }

    var missingSlugs = []
    for (var n = 0; n < expectedSlugs.length; n++) {
      if (currentSlugs.indexOf(expectedSlugs[n]) === -1) missingSlugs.push(expectedSlugs[n])
    }

    var priorAccount = null
    try {
      var u = $app.findAuthRecordByEmail(
        '_pb_users_auth_',
        'integracao.comercial@pmaisservicos.com.br',
      )
      priorAccount = {
        id: u.id,
        name: u.getString('name'),
        ativo_comercial: u.getBool('ativo_comercial'),
      }
    } catch (_) {}

    var spokInfo = null
    try {
      var s = $app.findAuthRecordByEmail('_pb_users_auth_', 'spok@pmaisservicos.com.br')
      var sp = ''
      try {
        var spr = $app.findRecordById('com_perfis', s.getString('perfil_id'))
        sp = spr.getString('slug')
      } catch (_) {}
      spokInfo = { id: s.id, name: s.getString('name'), perfil: sp }
    } catch (_) {}

    var integracaoUsers = []
    try {
      var iu = $app.findRecordsByFilter(
        'users',
        "perfil_id = '" + integracaoProfile.id + "'",
        '',
        500,
        0,
      )
      for (var iu2 = 0; iu2 < iu.length; iu2++) {
        integracaoUsers.push({
          id: iu[iu2].id,
          name: iu[iu2].getString('name'),
          email: iu[iu2].getString('email'),
        })
      }
    } catch (_) {}

    var duplicateAccounts = []
    for (var da = 0; da < integracaoUsers.length; da++) {
      if (!priorAccount || integracaoUsers[da].id !== priorAccount.id) {
        duplicateAccounts.push(integracaoUsers[da])
      }
    }

    return e.json(200, {
      integracaoProfile: { id: integracaoProfile.id, ativo: integracaoProfile.getBool('ativo') },
      expectedPermissionMatrix: expectedSlugs,
      currentPermissionsBefore: currentSlugs,
      exceedingPermissionsRemoved: removedSlugs,
      missingPermissions: missingSlugs,
      priorAccount: priorAccount,
      integracaoUsers: integracaoUsers,
      duplicateAccounts: duplicateAccounts,
      spokUser: spokInfo,
      secretName: 'COMERCIAL_INTEGRACAO_PASSWORD',
      secretRegistered:
        $secrets.has('COMERCIAL_INTEGRACAO_PASSWORD') &&
        ($secrets.get('COMERCIAL_INTEGRACAO_PASSWORD') || '') !== '',
    })
  },
  $apis.requireAuth(),
)
