# R13 Diagnóstico de Compensação — Auditoria Somente-Leitura

## Relatório de Publicação

### Versões Concretas

| Item                  | Versão                                                |
| --------------------- | ----------------------------------------------------- |
| Backend hook          | `ac_diag_compensacao_auditoria`                       |
| Backend route version | `R13-DIAG-COMPENSACAO-AUDITORIA-20260812-v2`          |
| Frontend bundle       | `R13-DIAG-COMPENSACAO-AUDITORIA-FRONTEND-20260812-v5` |

### Rota Somente-Leitura

```
GET /backend/v1/integracao/ac/diag-compensacao-auditoria
```

### Confirmações

| Campo                      | Valor   |
| -------------------------- | ------- |
| execution_enabled          | `true`  |
| button_enabled             | `true`  |
| executed                   | `false` |
| deletion_executed          | `false` |
| v7 lock state              | `armed` |
| data writes                | `0`     |
| ActiveCampaign calls       | `0`     |
| external calls             | `0`     |
| locks consumed             | `0`     |
| locks modified             | `0`     |
| client parameters accepted | `0`     |

### Coleções e Filtros Fixos

| Coleção                       | Filtro Fixo                            |
| ----------------------------- | -------------------------------------- |
| `com_eventos_integracao`      | `id = "pq4npvruaak9gpb"`               |
| `com_execucoes_sincronizacao` | `id = "62otoics23ul0vy"`               |
| `com_vinculos_externos`       | `external_id = 'DIAG-TRANSPORT-FN-C1'` |
| `com_ocorrencias_qualidade`   | `execucao_id = "62otoics23ul0vy"`      |

### v7 Preservação

- Hook `pocketbase/hooks/ac_diag_compensacao_dependencias.js`: **não modificado**
- Lock `ac_diag_compensacao_dependencias_lock` em `com_parametros`: **`armed`**
- Registros deletados: **0**
- Lock consumido: **não**

### Código Completo do Handler Somente-Leitura

Arquivo: `pocketbase/hooks/ac_diag_compensacao_auditoria.js`

```javascript
routerAdd(
  'GET',
  '/backend/v1/integracao/ac/diag-compensacao-auditoria',
  (e) => {
    var ROUTE_VERSION = 'R13-DIAG-COMPENSACAO-AUDITORIA-20260812-v2'
    var ROUTE_PATH = '/backend/v1/integracao/ac/diag-compensacao-auditoria'

    var FIXED_IDS = {
      com_eventos_integracao: 'pq4npvruaak9gpb',
      com_execucoes_sincronizacao: '62otoics23ul0vy',
    }

    var FIXED_FILTERS = {
      com_vinculos_externos: "external_id = 'DIAG-TRANSPORT-FN-C1'",
      com_ocorrencias_qualidade: 'execucao_id = "62otoics23ul0vy"',
    }

    var INVOLVED_COLLECTIONS = [
      'com_eventos_integracao',
      'com_execucoes_sincronizacao',
      'com_vinculos_externos',
      'com_ocorrencias_qualidade',
    ]

    var V7_LOCK_KEY = 'ac_diag_compensacao_dependencias_lock'

    var authId = e.auth ? e.auth.id : ''
    if (!authId) return e.unauthorizedError('Autenticacao necessaria')

    var isSA = false
    try {
      var p = $app.findRecordById('com_perfis', e.auth.getString('perfil_id'))
      if (p && p.getString('slug') === 'superadministrador') isSA = true
    } catch (_) {}
    if (!isSA) {
      try {
        var sp = $app.findFirstRecordByData('com_perfis', 'slug', 'superadministrador')
        var b = $app.findRecordsByFilter(
          'com_usuarios_equipes',
          "usuario_id = '" + authId + "' && perfil_id = '" + sp.id + "' && ativo = true",
          '',
          1,
          0,
        )
        if (b && b.length > 0) isSA = true
      } catch (_) {}
    }
    if (!isSA) return e.forbiddenError('Apenas superadministrador')

    function safeFindById(collectionName, id) {
      try {
        return $app.findRecordById(collectionName, id)
      } catch (_) {
        return null
      }
    }

    function safeFind(collectionName, filter) {
      try {
        return $app.findRecordsByFilter(collectionName, filter, 'created', 100, 0)
      } catch (_) {
        return []
      }
    }

    function safeCount(n) {
      try {
        return $app.countRecords(n)
      } catch (_) {
        return -1
      }
    }

    function readLockState(key) {
      try {
        var rec = $app.findFirstRecordByData('com_parametros', 'chave', key)
        return rec.getString('valor')
      } catch (_) {
        return 'unknown'
      }
    }

    var evento = safeFindById('com_eventos_integracao', FIXED_IDS.com_eventos_integracao)
    var execucao = safeFindById(
      'com_execucoes_sincronizacao',
      FIXED_IDS.com_execucoes_sincronizacao,
    )
    var vinculos = safeFind('com_vinculos_externos', FIXED_FILTERS.com_vinculos_externos)
    var ocorrencias = safeFind('com_ocorrencias_qualidade', FIXED_FILTERS.com_ocorrencias_qualidade)

    var counts = {}
    for (var i = 0; i < INVOLVED_COLLECTIONS.length; i++) {
      counts[INVOLVED_COLLECTIONS[i]] = safeCount(INVOLVED_COLLECTIONS[i])
    }

    var eventoInventory = null
    if (evento) {
      eventoInventory = {
        id: evento.id,
        evento_tipo: evento.getString('evento_tipo'),
        external_id: evento.getString('external_id'),
        idempotency_key: evento.getString('idempotency_key'),
        sistema_origem: evento.getString('sistema_origem'),
        status: evento.getString('status'),
        payload: evento.getString('payload'),
        created: evento.getString('created'),
      }
    }

    var execucaoInventory = null
    if (execucao) {
      execucaoInventory = {
        id: execucao.id,
        sistema_origem: execucao.getString('sistema_origem'),
        status: execucao.getString('status'),
        inicio: execucao.getString('inicio'),
        fim: execucao.getString('fim'),
        payload: execucao.getString('payload'),
        erro: execucao.getString('erro'),
        created: execucao.getString('created'),
      }
    }

    var vinculosInventory = []
    for (var j = 0; j < vinculos.length; j++) {
      var vr = vinculos[j]
      vinculosInventory.push({
        id: vr.id,
        sistema_origem: vr.getString('sistema_origem'),
        external_type: vr.getString('external_type'),
        external_id: vr.getString('external_id'),
        collection_name: vr.getString('collection_name'),
        record_id: vr.getString('record_id'),
        created: vr.getString('created'),
      })
    }

    var ocorrenciasInventory = []
    for (var k = 0; k < ocorrencias.length; k++) {
      var oc = ocorrencias[k]
      ocorrenciasInventory.push({
        id: oc.id,
        execucao_id: oc.getString('execucao_id'),
        tipo: oc.getString('tipo'),
        severidade: oc.getString('severidade'),
        descricao: oc.getString('descricao'),
        resolvida: oc.getBool('resolvida'),
        created: oc.getString('created'),
      })
    }

    var v7LockState = readLockState(V7_LOCK_KEY)

    return e.json(200, {
      route_version: ROUTE_VERSION,
      route: ROUTE_PATH,
      method: 'GET',
      read_only: true,
      client_parameters_accepted: 0,
      fixed_ids: FIXED_IDS,
      fixed_filters: FIXED_FILTERS,
      involved_collections: INVOLVED_COLLECTIONS,
      inventory: {
        com_eventos_integracao: eventoInventory,
        com_execucoes_sincronizacao: execucaoInventory,
        com_vinculos_externos: vinculosInventory,
        com_ocorrencias_qualidade: ocorrenciasInventory,
      },
      dependencies: {
        com_ocorrencias_qualidade_execucao_id: {
          relation: 'com_ocorrencias_qualidade.execucao_id -> com_execucoes_sincronizacao.id',
          target_execucao_id: FIXED_IDS.com_execucoes_sincronizacao,
          count: ocorrencias.length,
          items: ocorrenciasInventory,
        },
      },
      counts: counts,
      v7_lock: {
        key: V7_LOCK_KEY,
        state: v7LockState,
        modified: false,
      },
      records_created: 0,
      records_updated: 0,
      records_deleted: 0,
      locks_consumed: 0,
      locks_modified: 0,
      activecampaign_calls: 0,
      external_calls: 0,
      message:
        'Read-only audit completed. No records were created, updated, or deleted. No locks were consumed or modified. No external calls were made.',
    })
  },
  $apis.requireAuth(),
)
```

### SHA-256

SHA-256 dos arquivos publicados deve ser computado após o deploy pelo ambiente.

### Proibições Cumpridas

- [x] Auditoria não executada
- [x] Compensação não executada
- [x] Nenhum registro deletado
- [x] Lock não consumido
- [x] R14 não criado
- [x] 2D.2B não iniciado
- [x] Porta 2E não iniciada
- [x] Dados reais não utilizados
- [x] ActiveCampaign não chamado
- [x] Parado após publicação e relatório
