routerAdd(
  'POST',
  '/backend/v1/run-audit-perfis-test',
  (e) => {
    var authId = e.auth ? e.auth.id : ''
    if (!authId) return e.unauthorizedError('Autenticacao necessaria')

    var isAppSuperAdmin = false
    try {
      var authPerfilId = e.auth.getString('perfil_id')
      if (authPerfilId) {
        var perfilRec = $app.findRecordById('com_perfis', authPerfilId)
        if (perfilRec.getString('slug') === 'superadministrador') isAppSuperAdmin = true
      }
    } catch (_) {}
    if (!isAppSuperAdmin) {
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
          if (saBindings && saBindings.length > 0) isAppSuperAdmin = true
        }
      } catch (_) {}
    }
    if (!isAppSuperAdmin)
      return e.forbiddenError('Apenas superadministrador pode executar este teste')

    var baseUrl = ($secrets.get('PB_INSTANCE_URL') || '').replace(/\/$/, '')
    var authHeader = e.request.header.get('Authorization')

    function httpPatch(col, id, body) {
      return $http.send({
        url: baseUrl + '/api/collections/' + col + '/records/' + id,
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: authHeader },
        body: JSON.stringify(body),
        timeout: 15,
      })
    }
    function httpPost(col, body) {
      return $http.send({
        url: baseUrl + '/api/collections/' + col + '/records',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: authHeader },
        body: JSON.stringify(body),
        timeout: 15,
      })
    }
    function httpDelete(col, id) {
      return $http.send({
        url: baseUrl + '/api/collections/' + col + '/records/' + id,
        method: 'DELETE',
        headers: { Authorization: authHeader },
        timeout: 15,
      })
    }
    function countAudits(pid) {
      try {
        return $app.findRecordsByFilter(
          'com_auditoria',
          "collection_name = 'com_perfis' && record_id = '" + pid + "'",
          '',
          500,
          0,
        ).length
      } catch (_) {
        return -1
      }
    }
    function countRel(col, filter) {
      try {
        return $app.findRecordsByFilter(col, filter, '', 500, 0).length
      } catch (_) {
        return -1
      }
    }
    function getLatestAudit(pid) {
      try {
        var recs = $app.findRecordsByFilter(
          'com_auditoria',
          "collection_name = 'com_perfis' && record_id = '" + pid + "'",
          '-created',
          1,
          0,
        )
        if (recs.length === 0) return null
        var a = recs[0]
        return {
          id: a.id,
          collection_name: a.getString('collection_name'),
          record_id: a.getString('record_id'),
          acao: a.getString('acao'),
          valor_anterior: a.getString('valor_anterior'),
          valor_novo: a.getString('valor_novo'),
          usuario_id: a.getString('usuario_id'),
          origem_alteracao: a.getString('origem_alteracao'),
          created: a.getString('created'),
        }
      } catch (_) {
        return null
      }
    }

    var results = { generatedAt: new Date().toISOString(), steps: [] }
    function step(name, data) {
      data.step = name
      results.steps.push(data)
    }

    var profileId = ''
    var slugExisted = false
    try {
      var existing = $app.findFirstRecordByData('com_perfis', 'slug', 'auditoria-perfil-teste')
      profileId = existing.id
      slugExisted = true
    } catch (_) {}

    if (slugExisted) {
      step('pre_test_slug_check', {
        slugExisted: true,
        note: 'Record from previous run, using existing',
        pass: false,
      })
    } else {
      step('pre_test_slug_check', { slugExisted: false, pass: true })
      var perfisCol = $app.findCollectionByNameOrId('com_perfis')
      var testProfile = new Record(perfisCol)
      testProfile.set('nome', 'Auditoria Perfil [TESTE]')
      testProfile.set('slug', 'auditoria-perfil-teste')
      testProfile.set('ativo', false)
      $app.save(testProfile)
      profileId = testProfile.id
    }

    step('record_creation', {
      profileId: profileId,
      nome: 'Auditoria Perfil [TESTE]',
      slug: 'auditoria-perfil-teste',
      ativo: false,
      pass: !!profileId,
    })

    var permCount = countRel('com_perfil_permissoes', "perfil_id = '" + profileId + "'")
    var linkCount = countRel('com_usuarios_equipes', "perfil_id = '" + profileId + "'")
    var userCount = countRel('users', "perfil_id = '" + profileId + "'")
    step('pre_test_verification', {
      permissionsCount: permCount,
      linksCount: linkCount,
      usersCount: userCount,
      pass: permCount === 0 && linkCount === 0 && userCount === 0,
    })

    var baselineCount = countAudits(profileId)
    step('baseline_audit_count', { count: baselineCount, pass: baselineCount === 0 })

    var validRes = httpPatch('com_perfis', profileId, { nome: 'Auditoria Perfil [TESTE]' })
    step('valid_patch', { httpStatus: validRes.statusCode, pass: validRes.statusCode === 200 })

    var afterValidCount = countAudits(profileId)
    var auditRec = getLatestAudit(profileId)
    var validAuditPass =
      afterValidCount - baselineCount === 1 &&
      auditRec !== null &&
      auditRec.acao === 'update' &&
      auditRec.collection_name === 'com_perfis' &&
      auditRec.record_id === profileId
    step('valid_patch_audit', {
      baselineCount: baselineCount,
      afterCount: afterValidCount,
      newRecords: afterValidCount - baselineCount,
      auditRecord: auditRec,
      pass: validAuditPass,
    })

    var invalidRes = httpPatch('com_perfis', profileId, { slug: '' })
    step('invalid_patch', {
      httpStatus: invalidRes.statusCode,
      pass: invalidRes.statusCode === 400,
    })

    var afterInvalidCount = countAudits(profileId)
    step('invalid_patch_audit', {
      afterValidCount: afterValidCount,
      afterInvalidCount: afterInvalidCount,
      newRecords: afterInvalidCount - afterValidCount,
      pass: afterInvalidCount - afterValidCount === 0,
    })

    var postRecord = $app.findRecordById('com_perfis', profileId)
    var postAtivo = postRecord.getBool('ativo')
    var postSlug = postRecord.getString('slug')
    var postNome = postRecord.getString('nome')
    var postPermCount = countRel('com_perfil_permissoes', "perfil_id = '" + profileId + "'")
    var postLinkCount = countRel('com_usuarios_equipes', "perfil_id = '" + profileId + "'")
    step('record_state_after_tests', {
      ativo: postAtivo,
      slug: postSlug,
      nome: postNome,
      permissionsCount: postPermCount,
      linksCount: postLinkCount,
      pass:
        !postAtivo &&
        postSlug === 'auditoria-perfil-teste' &&
        postPermCount === 0 &&
        postLinkCount === 0,
    })

    var postRes = httpPost('com_auditoria', {
      collection_name: 'com_perfis',
      record_id: profileId,
      acao: 'create',
      valor_anterior: 'test',
      valor_novo: 'test',
      justificativa: 'direct post test',
      origem_alteracao: 'manual-test',
    })
    step('direct_post_audit', {
      httpStatus: postRes.statusCode,
      expectedStatus: 403,
      pass: postRes.statusCode === 403,
    })

    var auditId = auditRec ? auditRec.id : ''
    if (auditId) {
      var patchAuditRes = httpPatch('com_auditoria', auditId, { valor_novo: 'tampered' })
      step('direct_patch_audit', {
        httpStatus: patchAuditRes.statusCode,
        expectedStatus: 403,
        pass: patchAuditRes.statusCode === 403,
      })

      var delAuditRes = httpDelete('com_auditoria', auditId)
      step('direct_delete_audit', {
        httpStatus: delAuditRes.statusCode,
        expectedStatus: 403,
        pass: delAuditRes.statusCode === 403,
      })
    } else {
      step('direct_patch_audit', { skipped: true, note: 'No audit record to test', pass: false })
      step('direct_delete_audit', { skipped: true, note: 'No audit record to test', pass: false })
    }

    var finalCount = countAudits(profileId)
    step('final_audit_count', {
      count: finalCount,
      expectedCount: 1,
      noDuplicates: finalCount === 1,
      noRecursion: finalCount === 1,
      pass: finalCount === 1,
    })

    var allPassed = results.steps.every(function (s) {
      return s.pass
    })
    results.summary = {
      totalSteps: results.steps.length,
      passed: results.steps.filter(function (s) {
        return s.pass
      }).length,
      failed: results.steps.filter(function (s) {
        return !s.pass
      }).length,
      allPassed: allPassed,
      profileId: profileId,
      profileName: 'Auditoria Perfil [TESTE]',
      profileSlug: 'auditoria-perfil-teste',
      profileAtivo: false,
      porta2BApproved: false,
      porta2CStarted: false,
      recordKeptAsEvidence: true,
    }

    return e.json(200, results)
  },
  $apis.requireAuth(),
)
