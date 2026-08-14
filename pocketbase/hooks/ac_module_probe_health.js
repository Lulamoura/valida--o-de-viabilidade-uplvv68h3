// ════════════════════════════════════════════════════════════════════
// SEGMENTO G12 (v0.0.156) — Matriz mínima de deploy de módulos.
// Experimento diagnóstico ISOLADO. Não altera validador, runner, evidence
// nem qualquer regra da Porta 2D.2B. UMA ÚNICA rota autenticada, somente
// leitura, que carrega o módulo CommonJS puro em /lib via require() dentro
// do callback e devolve estritamente { ok, source }. Sem node_modules,
// banco, secrets, flags, lock, globalThis, eval, cron, bootstrap ou
// chamadas externas.
// ════════════════════════════════════════════════════════════════════
routerAdd(
  'GET',
  '/backend/v1/integracao/ac/module-probe-lib',
  function (e) {
    var probe = require(__hooks + '/lib/ac_module_probe.js')
    return e.json(200, { ok: probe.ok, source: probe.source })
  },
  $apis.requireAuth('users'),
)
