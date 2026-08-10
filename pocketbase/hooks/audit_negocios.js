onRecordUpdateRequest((e) => {
  e.next()

  var record = e.record
  var oldInativo = record.original().getBool('inativo')
  var newInativo = record.getBool('inativo')

  if (oldInativo === newInativo) {
    return
  }

  try {
    var auditCol = $app.findCollectionByNameOrId('com_auditoria')
    var auditRec = new Record(auditCol)
    auditRec.set('collection_name', 'com_negocios')
    auditRec.set('record_id', record.id)
    if (e.auth) {
      auditRec.set('usuario_id', e.auth.id)
    }
    auditRec.set('acao', newInativo ? 'inactivate' : 'update')
    auditRec.set('valor_anterior', oldInativo ? 'inativo' : 'ativo')
    auditRec.set('valor_novo', newInativo ? 'inativo' : 'ativo')
    auditRec.set('justificativa', '')
    auditRec.set('origem_alteracao', 'manual')
    $app.save(auditRec)
  } catch (err) {
    $app.logger().error('audit_negocios failed', 'error', String(err))
  }
}, 'com_negocios')
