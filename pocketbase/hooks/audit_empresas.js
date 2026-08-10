onRecordUpdateRequest((e) => {
  e.next()

  var record = e.record
  var oldStatus = record.original().getString('status')
  var newStatus = record.getString('status')

  if (oldStatus === newStatus || newStatus !== 'inativo') {
    return
  }

  try {
    var auditCol = $app.findCollectionByNameOrId('com_auditoria')
    var auditRec = new Record(auditCol)
    auditRec.set('collection_name', 'com_empresas')
    auditRec.set('record_id', record.id)
    if (e.auth) {
      auditRec.set('usuario_id', e.auth.id)
    }
    auditRec.set('acao', 'inactivate')
    auditRec.set('valor_anterior', oldStatus)
    auditRec.set('valor_novo', 'inativo')
    auditRec.set('justificativa', '')
    auditRec.set('origem_alteracao', 'manual')
    $app.save(auditRec)
  } catch (err) {
    $app.logger().error('audit_empresas failed', 'error', String(err))
  }
}, 'com_empresas')
