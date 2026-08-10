migrate(
  (app) => {
    var SI =
      "@request.auth.id != '' && (@request.auth.perfil_id.slug = 'superadministrador' || @request.auth.perfil_id.slug = 'integracao')"
    var SO = "@request.auth.id != '' && @request.auth.perfil_id.slug = 'superadministrador'"
    var HR =
      "@request.auth.id != '' && (@request.auth.perfil_id.slug = 'superadministrador' || @request.auth.perfil_id.slug = 'gestor-comercial' || @request.auth.perfil_id.slug = 'operador-comercial' || @request.auth.perfil_id.slug = 'prospeccao' || @request.auth.perfil_id.slug = 'aprovador' || @request.auth.perfil_id.slug = 'leitura-executiva')"
    var HC =
      "@request.auth.id != '' && (@request.auth.perfil_id.slug = 'superadministrador' || @request.auth.perfil_id.slug = 'gestor-comercial' || @request.auth.perfil_id.slug = 'operador-comercial' || @request.auth.perfil_id.slug = 'prospeccao')"
    var G = "@request.auth.id != ''"

    var expected = {
      com_contatos: { list: G, view: G, create: G, update: G, delete: null },
      com_etapas: { list: SI, view: SI, create: SI, update: SI, delete: null },
      com_alias_dimensoes: { list: SI, view: SI, create: SI, update: SI, delete: null },
      com_vinculos_externos: { list: SI, view: SI, create: SI, update: SI, delete: null },
      com_auditoria: { list: G, view: G, create: HC, update: null, delete: null },
      com_snapshots_negocio: { list: SI, view: SI, create: SO, update: null, delete: null },
      com_execucoes_sincronizacao: { list: SI, view: SI, create: SI, update: SO, delete: null },
      com_eventos_integracao: { list: SI, view: SI, create: SI, update: SO, delete: null },
      com_ocorrencias_qualidade: { list: SI, view: SI, create: SI, update: SO, delete: null },
      com_negocio_historico: { list: HR, view: HR, create: HC, update: null, delete: null },
    }

    var blk = []
    var names = Object.keys(expected)
    for (var i = 0; i < names.length; i++) {
      var col = app.findCollectionByNameOrId(names[i])
      var exp = expected[names[i]]
      var rules = {
        list: col.listRule,
        view: col.viewRule,
        create: col.createRule,
        update: col.updateRule,
        delete: col.deleteRule,
      }
      var rns = Object.keys(exp)
      for (var j = 0; j < rns.length; j++) {
        if (rules[rns[j]] !== exp[rns[j]]) {
          blk.push({
            collection: names[i],
            rule: rns[j],
            expected: exp[rns[j]],
            actual: rules[rns[j]],
          })
        }
      }
    }

    if (blk.length) {
      var msg = 'PRE-CHECK FAILED — persisted rules deviate from documented evidence:\n'
      for (var b = 0; b < blk.length; b++) {
        msg += JSON.stringify(blk[b]) + '\n'
      }
      throw new Error(msg)
    }

    var SG =
      "@request.auth.id != '' && (@request.auth.perfil_id.slug = 'superadministrador' || @request.auth.perfil_id.slug = 'gestor-comercial')"

    var contatosCol = app.findCollectionByNameOrId('com_contatos')
    contatosCol.listRule = SI
    contatosCol.viewRule = SI
    contatosCol.createRule = SI
    contatosCol.updateRule = SO
    contatosCol.deleteRule = null
    app.save(contatosCol)

    var etapasCol = app.findCollectionByNameOrId('com_etapas')
    etapasCol.updateRule = SG
    app.save(etapasCol)

    var aliasCol = app.findCollectionByNameOrId('com_alias_dimensoes')
    aliasCol.updateRule = SG
    app.save(aliasCol)

    var vincCol = app.findCollectionByNameOrId('com_vinculos_externos')
    vincCol.updateRule = SG
    app.save(vincCol)

    var audCol = app.findCollectionByNameOrId('com_auditoria')
    audCol.createRule = G
    app.save(audCol)
  },
  (app) => {
    var SI =
      "@request.auth.id != '' && (@request.auth.perfil_id.slug = 'superadministrador' || @request.auth.perfil_id.slug = 'integracao')"
    var HC =
      "@request.auth.id != '' && (@request.auth.perfil_id.slug = 'superadministrador' || @request.auth.perfil_id.slug = 'gestor-comercial' || @request.auth.perfil_id.slug = 'operador-comercial' || @request.auth.perfil_id.slug = 'prospeccao')"
    var G = "@request.auth.id != ''"

    var contatosCol = app.findCollectionByNameOrId('com_contatos')
    contatosCol.listRule = G
    contatosCol.viewRule = G
    contatosCol.createRule = G
    contatosCol.updateRule = G
    contatosCol.deleteRule = null
    app.save(contatosCol)

    var etapasCol = app.findCollectionByNameOrId('com_etapas')
    etapasCol.updateRule = SI
    app.save(etapasCol)

    var aliasCol = app.findCollectionByNameOrId('com_alias_dimensoes')
    aliasCol.updateRule = SI
    app.save(aliasCol)

    var vincCol = app.findCollectionByNameOrId('com_vinculos_externos')
    vincCol.updateRule = SI
    app.save(vincCol)

    var audCol = app.findCollectionByNameOrId('com_auditoria')
    audCol.createRule = HC
    app.save(audCol)
  },
)
