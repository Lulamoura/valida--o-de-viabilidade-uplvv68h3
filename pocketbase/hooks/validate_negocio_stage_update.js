onRecordUpdate((e) => {
  var etapa = e.record.getString('etapa')
  var resultado = e.record.getString('resultado')

  if (etapa && resultado) {
    throw new BadRequestError('Um negocio nao pode ter etapa ativa e resultado simultaneamente.')
  }

  e.next()
}, 'com_negocios')
