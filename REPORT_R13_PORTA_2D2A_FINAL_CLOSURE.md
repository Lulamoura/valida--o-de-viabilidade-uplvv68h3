# R13 / Porta 2D.2A — Relatório de Encerramento Final

**Projeto:** Validação de Viabilidade (Gestão Comercial PMais)
**Data:** 2026-08-12
**Status:** ENCERRADO — R13 / Porta 2D.2A fechada. Compensação v8 não-repetível. Nenhuma nova execução autorizada.

---

## 1. Objetivo e Escopo do R13

O ciclo R13 / Porta 2D.2A teve como objetivo diagnosticar, auditar e compensar os registros residuais criados pelo transporte diagnóstico (`ac_diag_transport`) durante a fase de validação da integração ActiveCampaign. O escopo incluiu:

- **Diagnóstico de transporte:** identificação dos três registros criados pelo fluxo diagnóstico (`DIAG-TRANSPORT-FN-C1`).
- **Auditoria somente-leitura:** verificação de identidades, contagens e dependências estruturais sem modificação de dados.
- **Consulta de dependências:** classificação de ocorrências de qualidade em `DIAGNOSTIC_OWNED`, `PREEXISTENT` e `INCONCLUSIVE` com proteção explícita de registros não-diagnósticos.
- **Compensação transacional:** remoção atômica dos três registros diagnósticos dentro de uma transação nativa PocketBase (`$app.runInTransaction`) com rollback nativo e lock de execução única.

O escopo **não** incluiu: chamadas à ActiveCampaign, alterações de RBAC, modificações de schema, criação de migrações, iniciação de R14, Porta 2D.2B ou Porta 2E.

---

## 2. Linha do Tempo Resumida

| Fase                                 | Artefato                                                       | Versão             | Resultado                                                                               |
| ------------------------------------ | -------------------------------------------------------------- | ------------------ | --------------------------------------------------------------------------------------- |
| Diagnóstico de transporte            | `ac_diag_transport.js`                                         | R13-DIAG-TRANSPORT | Três registros identificados: vínculo, evento, execução                                 |
| Auditoria somente-leitura (backend)  | `ac_diag_compensacao_auditoria.js`                             | v3                 | Identidades verificadas, contagens confirmadas, zero dependências estruturais           |
| Auditoria somente-leitura (frontend) | `DiagCompensacaoAuditEvidenceBlock.tsx`                        | v4                 | Contrato de validade implementado; nenhum valor fabricado                               |
| Consulta de dependências (backend)   | `ac_diag_consulta_dependencias.js`                             | v2                 | Janela de classificação corrigida; `deletable: false` para todos os registros           |
| Consulta de dependências (frontend)  | `DiagConsultaDependenciasBlock.tsx`                            | v2                 | Republicação sem escopo R14                                                             |
| Compensação (backend)                | `ac_diag_compensacao_dependencias.js`                          | v8                 | Correção de filtros inválidos, guardião estrutural única, transação nativa              |
| Compensação (frontend)               | `DiagCompensacaoDependenciasBlock.tsx`                         | v8                 | IDs fixos server-side, lock independente, transação atômica                             |
| Compensação (execução)               | POST `/backend/v1/integracao/ac/diag-compensacao-dependencias` | v8                 | **Execução única bem-sucedida** — três registros deletados atomicamente, lock consumido |

### Correção v8

A versão v8 corrigiu cinco comparações de campo temporal substituindo o separador `T` por espaço (`2026-08-11T20:38:39.951Z` → `2026-08-11 20:38:39.951Z`), alinhando o formato esperado com o retornado pelo PocketBase. Nenhuma conversão de fuso horário, truncamento, regex permissiva, substituição genérica ou tolerância temporal foi utilizada.

### Execução única

A compensação v8 foi executada exatamente uma vez. O lock `ac_diag_compensacao_dependencias_lock` foi consumido dentro da transação nativa, impedindo qualquer re-execução.

---

## 3. Inventário Antes e Depois

| Coleção                       | Antes | Depois | Delta |
| ----------------------------- | ----- | ------ | ----- |
| `com_eventos_integracao`      | 15    | 14     | -1    |
| `com_execucoes_sincronizacao` | 11    | 10     | -1    |
| `com_vinculos_externos`       | 10    | 9      | -1    |

Total de registros removidos: **3** (exatamente um por coleção, conforme esperado).

---

## 4. IDs e Identidades dos Três Registros Removidos

### Ordem de deleção: 1 — `com_vinculos_externos`

| Campo             | Valor                      |
| ----------------- | -------------------------- |
| **ID**            | `phzmobi8mfb34ha`          |
| `created`         | `2026-08-11 20:38:39.951Z` |
| `collection_name` | `com_contatos`             |
| `external_id`     | `DIAG-TRANSPORT-FN-C1`     |
| `external_type`   | `contact`                  |
| `record_id`       | `hfjq2q1olefske7`          |
| `sistema_origem`  | `activecampaign`           |

### Ordem de deleção: 2 — `com_eventos_integracao`

| Campo             | Valor                                                              |
| ----------------- | ------------------------------------------------------------------ |
| **ID**            | `pq4npvruaak9gpb`                                                  |
| `created`         | `2026-08-11 20:38:39.950Z`                                         |
| `evento_tipo`     | `contact_create`                                                   |
| `external_id`     | `DIAG-TRANSPORT-FN-C1`                                             |
| `idempotency_key` | `e860fa5a9d8615c44a7db52b909b70b816f80b74123b96780e7bb309e53d34ec` |
| `sistema_origem`  | `activecampaign`                                                   |
| `status`          | `processed`                                                        |

### Ordem de deleção: 3 — `com_execucoes_sincronizacao`

| Campo            | Valor                      |
| ---------------- | -------------------------- |
| **ID**           | `62otoics23ul0vy`          |
| `created`        | `2026-08-11 20:38:39.948Z` |
| `inicio`         | `2026-08-11 20:38:39.948Z` |
| `fim`            | `2026-08-11 20:38:39.952Z` |
| `sistema_origem` | `activecampaign`           |
| `status`         | `completed`                |

---

## 5. Guardião de Dependência e Resultado Zero

O único guardião estrutural de dependência utilizado foi:

```
Coleção: com_ocorrencias_qualidade
Filtro:  execucao_id = "62otoics23ul0vy"
Expected: 0
API:     txApp.findRecordsByFilter (dentro da transação)
Limite:  1
```

**Resultado:** `0` ocorrências encontradas. Nenhuma dependência estrutural bloqueou a compensação.

Os filtros anteriores baseados em `com_vinculos_externos.record_id` foram removidos na v8 por serem coincidências textuais inadequadas (não-relacionamentos estruturais).

---

## 6. Transação, Rollback Nativo e Consumo do Lock

| Propriedade                                   | Valor                                   |
| --------------------------------------------- | --------------------------------------- |
| `transaction_api`                             | `$app.runInTransaction`                 |
| `transaction_handle_inside_callback`          | `txApp`                                 |
| `external_app_handle_used_inside_transaction` | `false`                                 |
| `compensation_executed`                       | `true`                                  |
| `deletion_executed`                           | `true`                                  |
| `preconditions_met`                           | `true`                                  |
| `lock_key`                                    | `ac_diag_compensacao_dependencias_lock` |
| `lock_state` (pós-execução)                   | `consumed`                              |
| `lock_consumed_inside_transaction`            | `true`                                  |
| `lock_consumed_only_on_successful_commit`     | `true`                                  |
| `same_transactional_lock_object_saved`        | `true`                                  |
| `saved_lock_variable`                         | `txLockRec`                             |
| `concurrent_double_execution_prevented`       | `true`                                  |
| `lock_fallback_creation_removed`              | `true`                                  |
| `strict_armed_equality_required`              | `true`                                  |
| `lock_missing_aborts`                         | `true`                                  |

### Mecanismo

1. O lock é localizado dentro da transação via `txApp.findFirstRecordByData('com_parametros', 'chave', LOCK_KEY)`.
2. Se o valor não for estritamente `'armed'`, a transação aborta (rollback nativo).
3. Todas as pré-condições (existência, identidade, contagens, guardião de dependência) são verificadas dentro da transação.
4. As três deleções são executadas via `txApp.delete()` na ordem fixa.
5. Validações pós-deleção (contagens e ausência) são verificadas dentro da transação.
6. O mesmo objeto `txLockRec` tem seu valor alterado para `'consumed'` e é persistido via `txApp.save(txLockRec)`.
7. O commit só ocorre se todas as etadas sucederem. Qualquer falha dispara rollback nativo do SQLite — nenhum registro é deletado e o lock permanece `armed`.

### Proteção contra dupla execução

Uma segunda chamada concorrente ou sequencial observa `lock_state = 'consumed'` na etapa 2 e aborta antes de qualquer deleção.

---

## 7. Hashes Verificados

| Artefato                | Versão                                  | SHA-256                                                            |
| ----------------------- | --------------------------------------- | ------------------------------------------------------------------ |
| Backend compensação v8  | `ac_diag_compensacao_dependencias.js`   | `ccfb9972359413df5b92ad05c24fc0354a695a4b120d44a2d76ea3f7cf1df674` |
| Frontend compensação v8 | `DiagCompensacaoDependenciasBlock.tsx`  | `d452cc1fcad914dad4d2ab5d5f12ebe5d70bc95cb4bbe5bf1aa4fa410d6efc15` |
| Backend auditoria v3    | `ac_diag_compensacao_auditoria.js`      | `bf731b86a59d8a05135ed343f11e9a1a0a5ce22cf009cf1fd98a8dffe2cba375` |
| Frontend auditoria v4   | `DiagCompensacaoAuditEvidenceBlock.tsx` | `ba0d25ca9b40a3caea7d272e10d845b39c08351b3719b3974e848c8f46bf6edd` |

---

## 8. Advertências Documentais (registradas sem ocultação)

### 8.1 Incremento automático de `package.json`

O `package.json` teve um incremento automático de versão para `0.0.108` pelo mecanismo interno de build/export da plataforma Skip. Não houve alteração funcional intencional neste arquivo.

### 8.2 Regeneração de `schema.json`

O arquivo `src/lib/pocketbase/schema.json` teve apenas o campo `generatedAt` regenerado para `2026-08-12T21:33:00.849Z`. Nenhuma alteração estrutural de schema ocorreu — revisão externa confirmou que todas as coleções, campos, índices e regras de acesso permanecem idênticos.

### 8.3 JSON de confirmação v8 incorreto

O `BUILD_CONFIRMATION_R13_2D2A_DIAG_COMPENSACAO_DEPENDENCIAS_V8.json` declarou incorretamente `package_json_not_altered: true` e `schema_json_not_altered: true`. A revisão externa provou que ambos os arquivos tiveram alterações automáticas não-funcionais (incremento de versão e regeneração de timestamp, respectivamente). Estas discrepâncias não invalidam o commit transacional comprovado.

### 8.4 Rótulo inadequado do botão

O rótulo do botão no frontend v8 era "Preparar compensação (não executada)", mas o clique imediatamente disparava o POST destrutivo para a rota de compensação. O rótulo era enganoso — a ação executava a compensação de fato. Este problema é registrado sem ocultação. Não invalida o commit transacional comprovado, mas serve como advertência para futuras iterações de UI.

### 8.5 Conclusão sobre advertências

Nenhuma das advertências acima invalida o commit transacional atômico comprovado. As três deleções ocorreram dentro de uma transação nativa PocketBase com rollback nativo, pré-condições verificadas, validações pós-deleção confirmadas, e lock consumido apenas no commit bem-sucedido.

---

## 9. Chamadas ActiveCampaign

```json
{
  "activecampaign_calls": 0
}
```

Zero chamadas à ActiveCampaign ou a qualquer serviço externo durante toda a fase R13 / Porta 2D.2A.

---

## 10. Critérios de Aceitação com Evidência Concreta

| #   | Critério                                   | Evidência                                                                                                          |
| --- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| 1   | Compensação executada exatamente uma vez   | `compensation_executed: true`, `lock_state: consumed`, `lock_consumed_inside_transaction: true`                    |
| 2   | Três registros deletados atomicamente      | Contagens antes (15/11/10) → depois (14/10/9); `deletion_executed: true`                                           |
| 3   | Deleção em ordem fixa                      | Ordem: `com_vinculos_externos` → `com_eventos_integracao` → `com_execucoes_sincronizacao`                          |
| 4   | IDs fixos server-side                      | `phzmobi8mfb34ha`, `pq4npvruaak9gpb`, `62otoics23ul0vy`; `client_controlled_ids: false`                            |
| 5   | Guardião de dependência com resultado zero | `execucao_id = "62otoics23ul0vy"` → `expected_count: 0`, `actual_count: 0`                                         |
| 6   | Transação nativa com rollback              | `$app.runInTransaction`, `txApp` exclusivo, `external_app_handle_used_inside_transaction: false`                   |
| 7   | Lock consumido apenas no commit            | `lock_consumed_only_on_successful_commit: true`, `same_transactional_lock_object_saved: true`                      |
| 8   | Proteção contra dupla execução             | `concurrent_double_execution_prevented: true`, `strict_armed_equality_required: true`                              |
| 9   | Identidades verificadas                    | Todos os campos esperados correspondem aos valores reais antes da deleção                                          |
| 10  | Validações pós-deleção                     | Contagens pós correspondem (14/10/9); ausência confirmada via `txApp.findRecordById`                               |
| 11  | Zero chamadas ActiveCampaign               | `activecampaign_calls: 0`                                                                                          |
| 12  | Hashes verificados                         | Backend v8, frontend v8, backend auditoria v3, frontend auditoria v4 — todos confirmados                           |
| 13  | Advertências documentadas                  | `package.json` auto-increment, `schema.json` regeneratedAt, JSON v8 incorreto, rótulo do botão — todos registrados |

---

## 11. Conclusão

**R13 / Porta 2D.2A está encerrada.**

- A compensação v8 foi executada com sucesso em uma única execução transacional atômica.
- Os três registros diagnósticos foram removidos permanentemente.
- O lock `ac_diag_compensacao_dependencias_lock` está `consumed` — a compensação é **não-repetível**.
- Nenhuma nova execução é autorizada.
- R14, Porta 2D.2B e Porta 2E **não foram iniciados**.
- Zero chamadas à ActiveCampaign ou serviços externos.
- Todas as advertências documentais foram registradas sem ocultação.

**PARE.** Aguardando autorização explícita para qualquer fase futura.

---

### Declaração JSON Expressa

```json
{
  "r13_final_report_created": true,
  "r14_entry_plan_created": true,
  "routes_executed": 0,
  "records_created": 0,
  "records_updated": 0,
  "records_deleted": 0,
  "locks_modified": 0,
  "activecampaign_calls": 0,
  "r14_started": false,
  "porta_2d2b_started": false,
  "porta_2e_started": false
}
```
