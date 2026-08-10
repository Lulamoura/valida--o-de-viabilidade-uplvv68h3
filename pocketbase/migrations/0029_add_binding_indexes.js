migrate(
  (app) => {
    var col = app.findCollectionByNameOrId('com_usuarios_equipes')
    col.addIndex('idx_com_usuarios_equipes_ativo', false, 'ativo', '')
    col.addIndex('idx_com_usuarios_equipes_usuario_ativo', false, 'usuario_id, ativo', '')
    app.save(col)
  },
  (app) => {
    try {
      var col = app.findCollectionByNameOrId('com_usuarios_equipes')
      col.removeIndex('idx_com_usuarios_equipes_ativo')
      col.removeIndex('idx_com_usuarios_equipes_usuario_ativo')
      app.save(col)
    } catch (_) {}
  },
)
