migrate(
  (app) => {
    app
      .db()
      .newQuery("UPDATE com_negocios SET status = 'prospects' WHERE status = 'aberto'")
      .execute()
    app
      .db()
      .newQuery("UPDATE com_negocios SET status = 'negociacao' WHERE status = 'em_andamento'")
      .execute()
    app
      .db()
      .newQuery(
        "UPDATE com_negocios SET titulo = 'Implementação de CRM [TESTE]' WHERE titulo = 'Implementacao de CRM [TESTE]'",
      )
      .execute()

    var negociosCol = app.findCollectionByNameOrId('com_negocios')
    negociosCol.fields.removeByName('status')
    negociosCol.fields.add(
      new SelectField({
        name: 'status',
        required: true,
        values: [
          'prospects',
          'producao_proposta',
          'negociacao',
          'ganho',
          'perdido',
          'desqualificado',
        ],
        maxSelect: 1,
      }),
    )
    if (!negociosCol.fields.getByName('inativo')) {
      negociosCol.fields.add(new BoolField({ name: 'inativo' }))
    }
    negociosCol.deleteRule = null
    app.save(negociosCol)

    var empresasCol = app.findCollectionByNameOrId('com_empresas')
    empresasCol.deleteRule = null
    app.save(empresasCol)

    var parametrosCol = app.findCollectionByNameOrId('com_parametros')
    var versoesCol = app.findCollectionByNameOrId('com_parametros_versoes')

    try {
      var oldParam = app.findFirstRecordByData('com_parametros', 'chave', 'comercial.status_padrao')

      var versaoRec = new Record(versoesCol)
      versaoRec.set('parametro_id', oldParam.id)
      versaoRec.set('chave', oldParam.getString('chave'))
      versaoRec.set('valor', oldParam.getString('valor'))
      versaoRec.set('descricao', oldParam.getString('descricao'))
      versaoRec.set('tipo', oldParam.getString('tipo') || 'texto')
      versaoRec.set('versao', oldParam.getInt('versao'))
      versaoRec.set('justificativa', 'Substituído por comercial.etapa_padrao [TESTE]')
      app.save(versaoRec)

      app
        .db()
        .newQuery(
          "UPDATE com_parametros SET ativo = 0, versao = versao + 1, justificativa = 'Substituído por comercial.etapa_padrao [TESTE]' WHERE chave = 'comercial.status_padrao'",
        )
        .execute()
    } catch (_) {}

    try {
      app.findFirstRecordByData('com_parametros', 'chave', 'comercial.etapa_padrao')
    } catch (_) {
      var adminUser = app.findAuthRecordByEmail(
        '_pb_users_auth_',
        'luiz.moura@pmaisservicos.com.br',
      )
      var newParam = new Record(parametrosCol)
      newParam.set('chave', 'comercial.etapa_padrao')
      newParam.set('valor', 'prospects')
      newParam.set('descricao', 'Etapa padrão para novos negócios [TESTE]')
      newParam.set('tipo', 'texto')
      newParam.set('versao', 1)
      newParam.set('ativo', true)
      newParam.set('justificativa', 'Parâmetro inicial de etapa padrão [TESTE]')
      newParam.set('autor_id', adminUser.id)
      app.save(newParam)
    }

    app
      .db()
      .newQuery("UPDATE com_parametros SET tipo = 'texto' WHERE tipo IS NULL OR tipo = ''")
      .execute()
  },
  (app) => {
    app
      .db()
      .newQuery("UPDATE com_negocios SET status = 'aberto' WHERE status = 'prospects'")
      .execute()
    app
      .db()
      .newQuery("UPDATE com_negocios SET status = 'em_andamento' WHERE status = 'negociacao'")
      .execute()
    app
      .db()
      .newQuery(
        "UPDATE com_negocios SET titulo = 'Implementacao de CRM [TESTE]' WHERE titulo = 'Implementação de CRM [TESTE]'",
      )
      .execute()

    var negociosCol = app.findCollectionByNameOrId('com_negocios')
    negociosCol.fields.removeByName('status')
    negociosCol.fields.add(
      new SelectField({
        name: 'status',
        required: true,
        values: ['aberto', 'em_andamento', 'ganho', 'perdido'],
        maxSelect: 1,
      }),
    )
    if (negociosCol.fields.getByName('inativo')) {
      negociosCol.fields.removeByName('inativo')
    }
    negociosCol.deleteRule =
      "@request.auth.id != '' && (responsavel_id = @request.auth.id || (@request.auth.equipe_id != '' && equipe_id = @request.auth.equipe_id))"
    app.save(negociosCol)

    var empresasCol = app.findCollectionByNameOrId('com_empresas')
    empresasCol.deleteRule =
      "@request.auth.id != '' && (responsavel_id = @request.auth.id || (@request.auth.equipe_id != '' && equipe_id = @request.auth.equipe_id))"
    app.save(empresasCol)
  },
)
