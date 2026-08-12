# R13 Diagnóstico de Compensação — Auditoria Somente-Leitura (v3)

## Relatório de Publicação v3

### Versões Concretas

| Item                  | Versão                                                |
| --------------------- | ----------------------------------------------------- |
| Backend hook          | `ac_diag_compensacao_auditoria`                       |
| Backend route version | `R13-DIAG-COMPENSACAO-AUDITORIA-20260812-v3`          |
| Frontend bundle       | `R13-DIAG-COMPENSACAO-AUDITORIA-FRONTEND-20260812-v3` |

### Rota Somente-Leitura

```
GET /backend/v1/integracao/ac/diag-compensacao-auditoria
```

### Declarações Explícitas

| Declaração            | Valor   |
| --------------------- | ------- |
| audit_route_executed  | `false` |
| compensation_executed | `false` |
| records_created       | `0`     |
| records_updated       | `0`     |
| records_deleted       | `0`     |
| locks_modified        | `0`     |
| activecampaign_calls  | `0`     |
| external_calls        | `0`     |

### Confirmações

| Campo                      | Valor          |
| -------------------------- | -------------- |
| execution_enabled          | `true`         |
| button_enabled             | `true`         |
| executed                   | `false`        |
| deletion_executed          | não verificado |
| v7 lock state              | `armed`        |
| data writes                | `0`            |
| ActiveCampaign calls       | `0`            |
| external calls             | `0`            |
| locks consumed             | `0`            |
| locks modified             | `0`            |
| client parameters accepted | `0`            |

### IDs Fixos

| Coleção                       | ID                |
| ----------------------------- | ----------------- |
| `com_vinculos_externos`       | `phzmobi8mfb34ha` |
| `com_eventos_integracao`      | `pq4npvruaak9gpb` |
| `com_execucoes_sincronizacao` | `62otoics23ul0vy` |

### Consultas, Filtros, Limites e Campos Retornados

| #   | Coleção                       | Método API                   | Filtro / ID                                     | Limite | Campos Retornados                                                                   |
| --- | ----------------------------- | ---------------------------- | ----------------------------------------------- | ------ | ----------------------------------------------------------------------------------- |
| 1   | `com_vinculos_externos`       | `$app.findRecordById`        | id = `phzmobi8mfb34ha`                          | n/a    | id, created, collection_name, external_id, external_type, record_id, sistema_origem |
| 2   | `com_eventos_integracao`      | `$app.findRecordById`        | id = `pq4npvruaak9gpb`                          | n/a    | id, created, evento_tipo, external_id, idempotency_key, sistema_origem, status      |
| 3   | `com_execucoes_sincronizacao` | `$app.findRecordById`        | id = `62otoics23ul0vy`                          | n/a    | id, created, inicio, fim, sistema_origem, status                                    |
| 4   | `com_ocorrencias_qualidade`   | `$app.findRecordsByFilter`   | `execucao_id = "62otoics23ul0vy"`               | 100    | id, execucao_id, tipo, severidade, descricao, resolvida, created                    |
| 5   | `com_vinculos_externos`       | `$app.countRecords`          | n/a                                             | n/a    | count                                                                               |
| 6   | `com_eventos_integracao`      | `$app.countRecords`          | n/a                                             | n/a    | count                                                                               |
| 7   | `com_execucoes_sincronizacao` | `$app.countRecords`          | n/a                                             | n/a    | count                                                                               |
| 8   | `com_ocorrencias_qualidade`   | `$app.countRecords`          | n/a                                             | n/a    | count                                                                               |
| 9   | `com_parametros`              | `$app.findFirstRecordByData` | chave = `ac_diag_compensacao_dependencias_lock` | n/a    | valor (lock state)                                                                  |

### Identidades Esperadas (validadas no handler)

**com_vinculos_externos (`phzmobi8mfb34ha`)**:

- `created`: `2026-08-11T20:38:39.951Z`
- `collection_name`: `com_contatos`
- `external_id`: `DIAG-TRANSPORT-FN-C1`
- `external_type`: `contact`
- `record_id`: `hfjq2q1olefske7`
- `sistema_origem`: `activecampaign`

**com_eventos_integracao (`pq4npvruaak9gpb`)**:

- `created`: `2026-08-11T20:38:39.950Z`
- `evento_tipo`: `contact_create`
- `external_id`: `DIAG-TRANSPORT-FN-C1`
- `idempotency_key`: `e860fa5a9d8615c44a7db52b909b70b816f80b74123b96780e7bb309e53d34ec`
- `sistema_origem`: `activecampaign`
- `status`: `processed`

**com_execucoes_sincronizacao (`62otoics23ul0vy`)**:

- `created`: `2026-08-11T20:38:39.948Z`
- `inicio`: `2026-08-11T20:38:39.948Z`
- `fim`: `2026-08-11T20:38:39.952Z`
- `sistema_origem`: `activecampaign`
- `status`: `completed`

### Campos JSON de Resposta (v3)

| Campo                        | Descrição                                                                                                                                      |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `route_version`              | `R13-DIAG-COMPENSACAO-AUDITORIA-20260812-v3`                                                                                                   |
| `route`                      | Caminho da rota                                                                                                                                |
| `method`                     | `GET`                                                                                                                                          |
| `read_only`                  | `true`                                                                                                                                         |
| `client_parameters_accepted` | `0`                                                                                                                                            |
| `query_succeeded`            | `true` se todas as leituras sucederam, `false` em caso de erro                                                                                 |
| `target_identity_verified`   | Objeto per-record `{ com_vinculos_externos, com_eventos_integracao, com_execucoes_sincronizacao }` com `true`/`false`; `false` simples em erro |
| `target_identity_details`    | Valores reais lidos de cada registro                                                                                                           |
| `expected_identity`          | Identidades literais esperadas                                                                                                                 |
| `fixed_ids`                  | IDs fixos usados nas consultas                                                                                                                 |
| `involved_collections`       | Lista de coleções envolvidas                                                                                                                   |
| `dependency_query_succeeded` | `true` se a query de dependência sucedeu                                                                                                       |
| `dependency_filter`          | `execucao_id = "62otoics23ul0vy"`                                                                                                              |
| `dependency_limit`           | `100`                                                                                                                                          |
| `dependency_count`           | Número de ocorrências encontradas; `null` em erro                                                                                              |
| `dependency_items`           | Inventário completo de ocorrências                                                                                                             |
| `counts`                     | Contagens read-only das 4 coleções; `null` em erro                                                                                             |
| `lock_state_read_succeeded`  | `true` se o lock foi lido com sucesso                                                                                                          |
| `v7_lock.state`              | Valor do lock (`armed`/`consumed`); `null` em erro                                                                                             |
| `records_created`            | `0`                                                                                                                                            |
| `records_updated`            | `0`                                                                                                                                            |
| `records_deleted`            | `0`                                                                                                                                            |
| `locks_modified`             | `0`                                                                                                                                            |
| `activecampaign_calls`       | `0`                                                                                                                                            |
| `external_calls`             | `0`                                                                                                                                            |
| `error`                      | (somente em falha) mensagem de erro truncada                                                                                                   |
| `message`                    | Descrição legível do resultado                                                                                                                 |

### v7 Preservação

- Hook `pocketbase/hooks/ac_diag_compensacao_dependencias.js`: **não modificado**
- Lock `ac_diag_compensacao_dependencias_lock` em `com_parametros`: **`armed`**
- Registros deletados: **0**
- Lock consumido: **não**
- Compensação v7: **publicada, não homologada, não autorizada para execução**

### Diff v2 → v3 (Resumo de Mudanças)

1. **ROUTE_VERSION**: `v2` → `v3`
2. **FIXED_IDS**: Adicionado `com_vinculos_externos: 'phzmobi8mfb34ha'`
3. **Removido**: `FIXED_FILTERS` (substituído por `findRecordById` direto)
4. **Removido**: `safeFindById`, `safeFind`, `safeCount`, `readLockState` — todas as funções que convertiam falhas em `null`/`[]`/`-1`/`"unknown"`
5. **Adicionado**: `EXPECTED_IDENTITY` com identidades literais completas para os três registros
6. **Link consultado via**: `$app.findRecordById("com_vinculos_externos", "phzmobi8mfb34ha")` (não mais via `external_id` em `findRecordsByFilter`)
7. **Fail-closed**: Todas as leituras operacionais envolvidas em um único `try/catch` que retorna erro 500 explícito — nenhum valor seguro falsificado
8. **Identidade validada**: `verifyIdentity()` compara cada campo do registro com o esperado e retorna `true`/`false` por registro
9. **Dependency query**: Limite mantido em `100` (não `1`) — inventaria todas as ocorrências
10. **Novos campos JSON**: `query_succeeded`, `target_identity_verified` (per-record), `target_identity_details`, `dependency_query_succeeded`, `dependency_filter`, `dependency_limit`, `dependency_count`, `lock_state_read_succeeded`, `error` (em falha)
11. **Lock lido diretamente**: `$app.findFirstRecordByData('com_parametros', 'chave', V7_LOCK_KEY)` sem fallback — ausência é erro
12. **Proibições**: Nenhum `save`, `delete`, `runInTransaction`, `new Record`, HTTP/fetch, ActiveCampaign SDK, ou alteração de lock

### Código Completo do Handler v3

Arquivo: `pocketbase/hooks/ac_diag_compensacao_auditoria.js`

```javascript
routerAdd(
  'GET',
  '/backend/v1/integracao/ac/diag-compensacao-auditoria',
  (e) => {
    var ROUTE_VERSION = 'R13-DIAG-COMPENSACAO-AUDITORIA-20260812-v3'
    var ROUTE_PATH = '/backend/v1/integracao/ac/diag-compensacao-auditoria'

    var FIXED_IDS = {
      com_vinculos_externos: 'phzmobi8mfb34ha',
      com_eventos_integracao: 'pq4npvruaak9gpb',
      com_execucoes_sincronizacao: '62otoics23ul0vy',
    }

    var EXPECTED_IDENTITY = {
      com_vinculos_externos: {
        id: 'phzmobi8mfb34ha',
        created: '2026-08-11T20:38:39.951Z',
        collection_name: 'com_contatos',
        external_id: 'DIAG-TRANSPORT-FN-C1',
        external_type: 'contact',
        record_id: 'hfjq2q1olefske7',
        sistema_origem: 'activecampaign',
      },
      com_eventos_integracao: {
        id: 'pq4npvruaak9gpb',
        created: '2026-08-11T20:38:39.950Z',
        evento_tipo: 'contact_create',
        external_id: 'DIAG-TRANSPORT-FN-C1',
        idempotency_key: 'e860fa5a9d8615c44a7db52b909b70b816f80b74123b96780e7bb309e53d34ec',
        sistema_origem: 'activecampaign',
        status: 'processed',
      },
      com_execucoes_sincronizacao: {
        id: '62otoics23ul0vy',
        created: '2026-08-11T20:38:39.948Z',
        inicio: '2026-08-11T20:38:39.948Z',
        fim: '2026-08-11T20:38:39.952Z',
        sistema_origem: 'activecampaign',
        status: 'completed',
      },
    }

    var V7_LOCK_KEY = 'ac_diag_compensacao_dependencias_lock'

    var INVOLVED_COLLECTIONS = [
      'com_vinculos_externos',
      'com_eventos_integracao',
      'com_execucoes_sincronizacao',
      'com_ocorrencias_qualidade',
    ]

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

    function verifyIdentity(record, expected, fields) {
      var verified = true
      var actual = {}
      for (var i = 0; i < fields.length; i++) {
        var f = fields[i]
        if (f === 'id') {
          actual[f] = record.id
        } else {
          actual[f] = record.getString(f)
        }
        if (actual[f] !== expected[f]) verified = false
      }
      return { verified: verified, actual: actual }
    }

    var vinculoFields = [
      'id',
      'created',
      'collection_name',
      'external_id',
      'external_type',
      'record_id',
      'sistema_origem',
    ]
    var eventoFields = [
      'id',
      'created',
      'evento_tipo',
      'external_id',
      'idempotency_key',
      'sistema_origem',
      'status',
    ]
    var execucaoFields = ['id', 'created', 'inicio', 'fim', 'sistema_origem', 'status']

    var queryError = null

    var vinculo = null
    var evento = null
    var execucao = null
    var ocorrencias = null
    var counts = null
    var lockRec = null
    var v7LockState = null

    try {
      vinculo = $app.findRecordById('com_vinculos_externos', FIXED_IDS.com_vinculos_externos)
      evento = $app.findRecordById('com_eventos_integracao', FIXED_IDS.com_eventos_integracao)
      execucao = $app.findRecordById(
        'com_execucoes_sincronizacao',
        FIXED_IDS.com_execucoes_sincronizacao,
      )
      ocorrencias = $app.findRecordsByFilter(
        'com_ocorrencias_qualidade',
        'execucao_id = "62otoics23ul0vy"',
        'created',
        100,
        0,
      )
      counts = {
        com_vinculos_externos: $app.countRecords('com_vinculos_externos'),
        com_eventos_integracao: $app.countRecords('com_eventos_integracao'),
        com_execucoes_sincronizacao: $app.countRecords('com_execucoes_sincronizacao'),
        com_ocorrencias_qualidade: $app.countRecords('com_ocorrencias_qualidade'),
      }
      lockRec = $app.findFirstRecordByData('com_parametros', 'chave', V7_LOCK_KEY)
      v7LockState = lockRec.getString('valor')
    } catch (err) {
      queryError = String(err).substring(0, 500)
    }

    if (queryError) {
      return e.json(500, {
        route_version: ROUTE_VERSION,
        route: ROUTE_PATH,
        method: 'GET',
        read_only: true,
        client_parameters_accepted: 0,
        query_succeeded: false,
        target_identity_verified: false,
        dependency_query_succeeded: false,
        dependency_count: null,
        counts: null,
        lock_state_read_succeeded: false,
        v7_lock: {
          key: V7_LOCK_KEY,
          state: null,
          modified: false,
        },
        error: queryError,
        records_created: 0,
        records_updated: 0,
        records_deleted: 0,
        locks_modified: 0,
        activecampaign_calls: 0,
        external_calls: 0,
        message:
          'Audit FAILED — a query, count, or lock read threw an error. No conclusion of zero dependencies or safety is emitted. No writes, deletions, or lock changes occurred.',
      })
    }

    var vinculoIdentity = verifyIdentity(
      vinculo,
      EXPECTED_IDENTITY.com_vinculos_externos,
      vinculoFields,
    )
    var eventoIdentity = verifyIdentity(
      evento,
      EXPECTED_IDENTITY.com_eventos_integracao,
      eventoFields,
    )
    var execucaoIdentity = verifyIdentity(
      execucao,
      EXPECTED_IDENTITY.com_execucoes_sincronizacao,
      execucaoFields,
    )

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

    return e.json(200, {
      route_version: ROUTE_VERSION,
      route: ROUTE_PATH,
      method: 'GET',
      read_only: true,
      client_parameters_accepted: 0,
      query_succeeded: true,
      target_identity_verified: {
        com_vinculos_externos: vinculoIdentity.verified,
        com_eventos_integracao: eventoIdentity.verified,
        com_execucoes_sincronizacao: execucaoIdentity.verified,
      },
      target_identity_details: {
        com_vinculos_externos: vinculoIdentity.actual,
        com_eventos_integracao: eventoIdentity.actual,
        com_execucoes_sincronizacao: execucaoIdentity.actual,
      },
      expected_identity: EXPECTED_IDENTITY,
      fixed_ids: FIXED_IDS,
      involved_collections: INVOLVED_COLLECTIONS,
      dependency_query_succeeded: true,
      dependency_filter: 'execucao_id = "62otoics23ul0vy"',
      dependency_limit: 100,
      dependency_count: ocorrencias.length,
      dependency_items: ocorrenciasInventory,
      counts: counts,
      lock_state_read_succeeded: true,
      v7_lock: {
        key: V7_LOCK_KEY,
        state: v7LockState,
        modified: false,
      },
      records_created: 0,
      records_updated: 0,
      records_deleted: 0,
      locks_modified: 0,
      activecampaign_calls: 0,
      external_calls: 0,
      message:
        'Read-only audit completed (v3). All queries succeeded. No records were created, updated, or deleted. No locks were modified or consumed. No external calls were made.',
    })
  },
  $apis.requireAuth(),
)
```

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
- [x] Nenhum `save`, `delete`, `runInTransaction`, `new Record` no handler v3
- [x] Nenhuma chamada HTTP/fetch/request no handler v3
- [x] Nenhuma credencial ActiveCampaign no handler v3
- [x] Lock lido diretamente — ausência é erro explícito
- [x] `safeFindById`, `safeFind`, `safeCount`, `readLockState` totalmente removidos
- [x] Link consultado via `findRecordById` — `external_id` não usado como identificação de registro
- [x] Dependency query com limite 100 (não 1)
- [x] Frontend: version strings em v3
- [x] Frontend: "não verificado nesta sessão" antes da execução
- [x] Frontend: valores apenas da resposta HTTP após execução
- [x] Frontend: uma chamada por sessão
- [x] Frontend: não auto-executado no mount
- [x] Frontend: botão separado da compensação v7

PARE — Aguardando autorização explícita para execução ou teste.
