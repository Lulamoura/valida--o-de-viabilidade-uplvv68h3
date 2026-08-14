// ════════════════════════════════════════════════════════════════════
// Porta 2D.2B — Rota de saúde do módulo canônico (v0.0.155)
// ════════════════════════════════════════════════════════════════════
// SEGMENTO G10 (v0.0.155) — Separação entre módulo canônico e rota de saúde.
// Este arquivo contém SOMENTE a rota autenticada de saúde. Carrega o módulo
// canônico via require(__hooks + '/ac_validate_2d2b.js') dentro do callback,
// sem duplicar nenhuma regra ou função do validador. Não acessa banco,
// secrets, flags, lock ou dados; não chama webhook, rollback, auditoria ou
// ActiveCampaign. Resposta estrita { ok, module, version }.
// ════════════════════════════════════════════════════════════════════
routerAdd(
  'GET',
  '/backend/v1/integracao/ac/validator-2d2b-health',
  function (e) {
    var validator = require(__hooks + '/ac_validate_2d2b.js')
    return e.json(200, {
      ok: true,
      module: 'ac_validate_2d2b',
      version: validator.expectedVersion,
    })
  },
  $apis.requireAuth('users'),
)
