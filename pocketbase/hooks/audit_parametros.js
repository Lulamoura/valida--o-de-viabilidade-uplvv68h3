onRecordUpdateRequest((e) => {
  e.next()

  var record = e.record
  var meaningfulFields = [
    'chave',
    'valor',
    'descricao',
    'tipo',
    'unidade',
    'regra_validacao',
    'inicio_vigencia',
    'fim_vigencia',
  ]
  var ativoChanged = record.original().getBool('ativo') !== record.getBool('ativo')
  var otherMeaningfulChanged = false

  for (var i = 0; i < meaningfulFields.length; i++) {
    if (
      record.original().getString(meaningfulFields[i]) !== record.getString(meaningfulFields[i])
    ) {
      otherMeaningfulChanged = true
      break
    }
  }

  if (!ativoChanged && !otherMeaningfulChanged) {
    return
  }

  try {
    var auditCol = $app.findCollectionByNameOrId('com_auditoria')
    var auditRec = new Record(auditCol)
    auditRec.set('collection_name', 'com_parametros')
    auditRec.set('record_id', record.id)
    if (e.auth) {
      auditRec.set('usuario_id', e.auth.id)
    }
    auditRec.set('origem_alteracao', 'manual')
    auditRec.set('justificativa', record.getString('justificativa') || '')

    if (ativoChanged && !otherMeaningfulChanged) {
      var oldAtivo = record.original().getBool('ativo')
      var newAtivo = record.getBool('ativo')
      auditRec.set('acao', newAtivo ? 'update' : 'inactivate')
      auditRec.set('valor_anterior', oldAtivo ? 'ativo' : 'inativo')
      auditRec.set('valor_novo', newAtivo ? 'ativo' : 'inativo')
    } else {
      auditRec.set('acao', 'update')
      auditRec.set('valor_anterior', record.original().getString('valor'))
      auditRec.set('valor_novo', record.getString('valor'))
    }

    $app.save(auditRec)
  } catch (err) {
    $app.logger().error('audit_parametros failed', 'error', String(err))
  }
}, 'com_parametros')
