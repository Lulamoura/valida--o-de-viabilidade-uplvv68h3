onRecordUpdateRequest((e) => {
  e.next()

  var record = e.record
  var oldAtivo = record.original().getBool('ativo')
  var newAtivo = record.getBool('ativo')

  if (oldAtivo === newAtivo) {
    return
  }

  try {
    var auditCol = $app.findCollectionByNameOrId('com_auditoria')
    var auditRec = new Record(auditCol)
    auditRec.set('collection_name', 'com_perfis')
    auditRec.set('record_id', record.id)
    if (e.auth) {
      auditRec.set('usuario_id', e.auth.id)
    }
    auditRec.set('acao', newAtivo ? 'update' : 'inactivate')
    auditRec.set('valor_anterior', oldAtivo ? 'ativo' : 'inativo')
    auditRec.set('valor_novo', newAtivo ? 'ativo' : 'inativo')
    auditRec.set('justificativa', '')
    auditRec.set('origem_alteracao', 'manual')
    $app.save(auditRec)
  } catch (err) {
    $app.logger().error('audit_perfis failed', 'error', String(err))
  }
}, 'com_perfis')
