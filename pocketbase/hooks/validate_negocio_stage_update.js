onRecordUpdate((e) => {
  var etapa = e.record.getString('etapa')
  var resultado = e.record.getString('resultado')
  var status = e.record.getString('status')

  if (status === 'aberto' || status === 'em_andamento') {
    throw new BadRequestError(
      'Status "aberto" e "em_andamento" sao depreciados. Use etapa ou resultado.',
    )
  }

  if (etapa && resultado) {
    throw new BadRequestError('Um negocio nao pode ter etapa ativa e resultado simultaneamente.')
  }

  e.next()
}, 'com_negocios')
