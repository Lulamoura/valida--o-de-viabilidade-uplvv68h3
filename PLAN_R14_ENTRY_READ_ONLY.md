# Plano de Entrada R14 — Somente Leitura (Não Autorizado)

**Status:** RASCUNHO — NÃO AUTORIZADO PARA EXECUÇÃO
**Data:** 2026-08-12
**Diretiva:** PARE — Este plano é estritamente documental. Nenhuma rota, query, hook, migração, ou alteração de qualquer tipo é autorizada.

---

## 1. Objetivo Proposto do R14

O objetivo proposto do R14 é realizar uma auditoria pós-compensação somente-leitura para verificar o estado final do banco de dados após a execução da compensação v8 do R13 / Porta 2D.2A. Especificamente:

- Confirmar que os três registros diagnósticos (`phzmobi8mfb34ha`, `pq4npvruaak9gpb`, `62otoics23ul0vy`) estão ausentes.
- Confirmar que nenhuma referência órfã a esses registros existe em coleções relacionadas.
- Confirmar que as contagens finais são coerentes com o esperado (14/10/9).
- Confirmar que o lock `ac_diag_compensacao_dependencias_lock` permanece `consumed`.
- Documentar o estado final sem qualquer modificação.

**R14 não inclui:** nova compensação, re-execução de rotas destrutivas, modificações de schema, migrações, alterações de RBAC, chamadas à ActiveCampaign, ou iniciação de Porta 2D.2B ou Porta 2E.

---

## 2. Pré-condições para Abertura do R14

Antes de qualquer atividade R14, as seguintes pré-condições devem ser atendidas:

1. **Autorização explícita** do responsável do projeto para iniciar R14.
2. **Confirmação** de que R13 / Porta 2D.2A está formalmente encerrada (este relatório de encerramento serve como confirmação).
3. **Verificação** de que o lock `ac_diag_compensacao_dependencias_lock` está `consumed` (sem re-execução).
4. **Compromisso** de que todas as atividades R14 serão estritamente somente-leitura.
5. **Nenhuma rota destrutiva** será criada, modificada ou executada.
6. **Nenhuma migração** será criada ou aplicada.
7. **Nenhum hook** será criado ou modificado.
8. **Nenhum arquivo de frontend** será modificado para R14 (apenas documentação).

---

## 3. Coleções e Artefatos a Serem Inventariados

| Coleção                       | Motivo do Inventário                                                                                      |
| ----------------------------- | --------------------------------------------------------------------------------------------------------- |
| `com_vinculos_externos`       | Confirmar ausência do registro `phzmobi8mfb34ha`                                                          |
| `com_eventos_integracao`      | Confirmar ausência do registro `pq4npvruaak9gpb`                                                          |
| `com_execucoes_sincronizacao` | Confirmar ausência do registro `62otoics23ul0vy`                                                          |
| `com_ocorrencias_qualidade`   | Confirmar zero referências órfãs a `62otoics23ul0vy`                                                      |
| `com_parametros`              | Confirmar estado do lock `ac_diag_compensacao_dependencias_lock`                                          |
| `com_contatos`                | Verificar se o contato `hfjq2q1olefske7` (referenciado pelo vínculo removido) ainda existe ou foi afetado |
| `com_snapshots_negocio`       | Verificar se nenhum snapshot refere-se aos registros removidos                                            |
| `com_auditoria`               | Verificar entradas de auditoria relacionadas à compensação                                                |

---

## 4. Queries Somente-Leitura Propostas

> **AVISO:** Estas queries são PROPOSTAS para revisão. Nenhuma deve ser executada sem autorização explícita.

### 4.1 Verificação de Ausência — `com_vinculos_externos`

```
Método: GET /api/collections/com_vinculos_externos/records/phzmobi8mfb34ha
Esperado: 404 Not Found
Campos: n/a (registro deve estar ausente)
```

### 4.2 Verificação de Ausência — `com_eventos_integracao`

```
Método: GET /api/collections/com_eventos_integracao/records/pq4npvruaak9gpb
Esperado: 404 Not Found
Campos: n/a (registro deve estar ausente)
```

### 4.3 Verificação de Ausência — `com_execucoes_sincronizacao`

```
Método: GET /api/collections/com_execucoes_sincronizacao/records/62otoics23ul0vy
Esperado: 404 Not Found
Campos: n/a (registro deve estar ausente)
```

### 4.4 Referências Órfãs — `com_ocorrencias_qualidade`

```
Coleção: com_ocorrencias_qualidade
Filtro:  execucao_id = "62otoics23ul0vy"
Sort:    created
Limite:  100
Offset:  0
Esperado: 0 resultados
Campos:  id, execucao_id, tipo, severidade, descricao, resolvida, created
```

### 4.5 Contagens Finais

```
Coleções: com_eventos_integracao, com_execucoes_sincronizacao, com_vinculos_externos
Método:   countRecords (via SDK ou list com perPage=1)
Esperado: 14, 10, 9 respectivamente
```

### 4.6 Estado do Lock

```
Coleção: com_parametros
Filtro:  chave = "ac_diag_compensacao_dependencias_lock"
Esperado: valor = "consumed", ativo = true
Campos:  chave, valor, ativo, descricao, tipo, created, updated
```

### 4.7 Verificação de Contato Referenciado

```
Coleção: com_contatos
Método: GET /api/collections/com_contatos/records/hfjq2q1olefske7
Esperado: 200 OK (registro ainda existe — não foi alvo de deleção) OU 404 (se foi removido por outro processo)
Campos:  id, nome, email, telefone, empresa_id, ativo, created, updated
Nota:    O contato não era alvo da compensação. Sua existência ou ausência é informativa.
```

### 4.8 Verificação de Snapshots Órfãos

```
Coleção: com_snapshots_negocio
Filtro:  (nenhum filtro específico para os IDs removidos — verificar se algum snapshot referencia negócios criados pelo diagnóstico)
Sort:    -created
Limite:  10
Campos:  id, negocio_id, snapshot, origem, created
```

### 4.9 Auditoria de Compensação

```
Coleção: com_auditoria
Filtro:  collection_name = "com_vinculos_externos" || collection_name = "com_eventos_integracao" || collection_name = "com_execucoes_sincronizacao"
Sort:    -created
Limite:  50
Campos:  id, collection_name, record_id, usuario_id, acao, valor_anterior, valor_novo, justificativa, origem_alteracao, created
```

---

## 5. Riscos e Locks

| Risco                                 | Mitigação                                                                         |
| ------------------------------------- | --------------------------------------------------------------------------------- |
| Execução acidental de rota destrutiva | Nenhuma rota destrutiva será criada ou chamada em R14                             |
| Modificação de lock existente         | O lock `ac_diag_compensacao_dependencias_lock` será apenas lido, nunca modificado |
| Reabertura não-autorizada de R13      | R13 está formalmente encerrada; nenhuma re-execução é possível (lock consumido)   |
| Confusão entre R14 e Porta 2D.2B      | R14 é estritamente somente-leitura; 2D.2B não é iniciada                          |
| Chamadas à ActiveCampaign             | Zero chamadas externas autorizadas                                                |
| Alteração de schema ou RBAC           | Nenhuma migração ou alteração de regra autorizada                                 |

### Locks Existentes (estado esperado)

| Lock                        | Chave                                   | Estado Esperado                   |
| --------------------------- | --------------------------------------- | --------------------------------- |
| Compensação de dependências | `ac_diag_compensacao_dependencias_lock` | `consumed`                        |
| Consulta de dependências    | `ac_diag_consulta_dependencias_lock`    | `consumed`                        |
| Auditoria de compensação    | `ac_diag_compensacao_auditoria_lock`    | `consumed`                        |
| R11                         | `ac_r11_execution_lock`                 | `consumed`                        |
| R12                         | `ac_r12_execution_lock`                 | `consumed`                        |
| R13                         | `ac_r13_execution_lock`                 | `armed` ou `consumed` (verificar) |

---

## 6. Critérios PARE

A atividade R14 deve ser interrompida imediatamente se:

1. Qualquer query de leitura retornar um erro inesperado (500, timeout).
2. Qualquer registro que deveria estar ausente for encontrado presente.
3. Qualquer contagem divergir do esperado (14/10/9).
4. O lock `ac_diag_compensacao_dependencias_lock` não estiver `consumed`.
5. Qualquer referência órfã for encontrada (exceto contato informativo).
6. Qualquer operação de escrita for solicitada ou necessária.
7. Qualquer dúvida sobre a integridade dos dados surgir.

---

## 7. Critérios Go/No-Go

### Go (todas devem ser verdadeiras)

- [ ] Autorização explícita recebida do responsável do projeto
- [ ] R13 / Porta 2D.2A formalmente encerrada
- [ ] Compromisso de somente-leitura assinado
- [ ] Plano revisado e aprovado
- [ ] Nenhuma alteração de código, hook, migração ou schema planejada
- [ ] Ambiente estável (sem deploys em andamento)

### No-Go (qualquer uma bloqueia)

- [ ] Falta de autorização explícita
- [ ] Dúvida sobre o estado do lock de compensação
- [ ] Necessidade de modificação de qualquer arquivo existente
- [ ] Necessidade de execução de rota destrutiva
- [ ] Divergência entre este plano e o estado real do banco

---

## 8. Plano de Evidência

Após a execução autorizada das queries somente-leitura, o seguinte artefato deverá ser produzido:

- `REPORT_R14_POST_COMPENSATION_AUDIT.md` — contendo:
  - Resultado de cada query proposta (seção 4)
  - Confirmação de ausência dos três registros
  - Confirmação de contagens (14/10/9)
  - Confirmação de zero referências órfãs
  - Estado de todos os locks
  - Declaração JSON expressa com zero efeitos colaterais
  - Assinatura de somente-leitura confirmada

**Nenhum outro artefato deve ser criado ou modificado.**

---

## 9. Ações Expressamente Proibidas

1. **PROIBIDO** executar qualquer rota POST, PUT, PATCH ou DELETE.
2. **PROIBIDO** criar, modificar ou deletar qualquer registro em qualquer coleção.
3. **PROIBIDO** criar, modificar ou consumir qualquer lock.
4. **PROIBIDO** criar ou modificar qualquer hook.
5. **PROIBIDO** criar ou aplicar qualquer migração.
6. **PROIBIDO** modificar qualquer arquivo de frontend, backend, schema, configuração ou package.json.
7. **PROIBIDO** fazer qualquer chamada à ActiveCampaign ou serviço externo.
8. **PROIBIDO** iniciar Porta 2D.2B ou Porta 2E.
9. **PROIBIDO** re-executar a compensação v8 (lock já consumido).
10. **PROIBIDO** criar novas rotas ou endpoints.
11. **PROIBIDO** modificar regras de acesso (RBAC).
12. **PROIBIDO** alterar segredos ou variáveis de ambiente.

---

## 10. Sugestão de Primeiro Prompt Futuro (Sem Autorização para Uso)

> O prompt abaixo é uma **sugestão documental** para uso futuro quando R14 for explicitamente autorizado. **Não deve ser utilizado sem autorização prévia.**

---

**Prompt sugerido:**

> Por favor, execute a auditoria pós-compensação R14 estritamente somente-leitura conforme o plano em `PLAN_R14_ENTRY_READ_ONLY.md`.
>
> Regras:
>
> 1. Crie APENAS o arquivo `REPORT_R14_POST_COMPENSATION_AUDIT.md`.
> 2. Nenhum arquivo existente pode ser modificado.
> 3. Nenhuma rota pode ser executada, testada ou chamada.
> 4. Nenhum registro pode ser criado, atualizado ou deletado.
> 5. Nenhum lock pode ser modificado.
> 6. Nenhuma chamada à ActiveCampaign ou serviço externo.
> 7. Use apenas os dados já documentados no `REPORT_R13_PORTA_2D2A_FINAL_CLOSURE.md` como fonte de evidência.
> 8. Inclua a declaração JSON expressa confirmando zero efeitos colaterais.
> 9. R14, Porta 2D.2B e Porta 2E não devem ser iniciados além deste relatório.
> 10. PARE após criar o relatório.

---

**FIM DO PLANO — NÃO AUTORIZADO PARA EXECUÇÃO**

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
