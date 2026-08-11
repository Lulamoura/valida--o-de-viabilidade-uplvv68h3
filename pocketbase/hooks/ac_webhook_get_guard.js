routerAdd('GET', '/backend/v1/integracao/ac/webhook', (e) => {
  return e.json(405, { error: 'Method not allowed' })
})
