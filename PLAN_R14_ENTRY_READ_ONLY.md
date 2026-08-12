# Plano de Entrada R14 — Somente Leitura (Não Autorizado)

**Status:** RASCUNHO REVISADO — NÃO AUTORIZADO PARA EXECUÇÃO
**Data:** 2026-08-12
**Revisão:** 2 (correções 1–6 aplicadas)
**Diretiva:** PARE — Este plano é estritamente documental. Nenhuma rota, query, hook, migração, ou alteração de qualquer tipo é autorizada nesta revisão.

---

## 0. Natureza desta Revisão

**Esta revisão é exclusivamente documental.** Nenhuma rota, query, leitura, escrita, hook, migração, alteração de schema, RBAC, frontend, backend, configuração ou lock foi executada ou modificada. R14 não foi iniciado. Porta 2D.2B e Porta 2E não foram iniciados.

A presente revisão corrige contradições internas, ajusta o escopo da futura auditoria R14 e alinha o plano com as evidências observadas — sem executar nada.

### Distinção entre esta revisão e a futura abertura do R14

| Aspecto                             | Esta revisão (atual)             | Futura abertura do R14 (mediante autorização explícita)                        |
| ----------------------------------- | -------------------------------- | ------------------------------------------------------------------------------ |
| Natureza                            | Somente documental               | Auditoria somente-leitura real                                                 |
| Execução de queries                 | Nenhuma                          | GET e APIs de leitura do PocketBase permitidas                                 |
| Escrita (POST/PUT/PATCH/DELETE)     | Proibida                         | Proibida                                                                       |
| Geração de relatório                | Nenhum                           | `REPORT_R14_POST_COMPENSATION_AUDIT.md` a partir das respostas reais           |
| Substituição por dados documentados | N/A                              | **Proibida** — não usar dados já documentados como substituto de queries reais |
| Após concluir                       | PARE e aguardar nova autorização | Capturar evidência e PARE imediatamente                                        |

---

## 1. Objetivo Proposto do R14

O objetivo proposto do R14 é realizar uma auditoria pós-compensação somente-leitura para verificar o estado final do banco de dados após a execução da compensação v8 do R13 / Porta 2D.2A. Especificamente:

- Confirmar que os três registros diagnósticos (`phzmobi8mfb34ha`, `pq4npvruaak9gpb`, `62otoics23ul0vy`) estão ausentes.
- Confirmar que nenhuma referência órfã a esses registros existe em `com_ocorrencias_qualidade`.
- Confirmar que as contagens finais são coerentes com o esperado (14/10/9).
- Confirmar que o lock `ac_diag_compensacao_dependencias_lock` permanece `consumed`.
- Ler os demais locks registrados em `com_parametros`, distinguindo fatos já observados de estados a verificar.
- Verificar informativamente o contato `hfjq2q1olefske7`.
- Obter evidência complementar de auditoria para os três pares collection/record_id.
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
9. **GET e APIs de leitura do PocketBase** são permitidas apenas após autorização explícita.
10. **POST, PUT, PATCH, DELETE e qualquer escrita** permanecem proibidos em todas as fases.

---

## 3. Coleções e Artefatos a Serem Inventariados

| Coleção                       | Motivo do Inventário                                                                      |
| ----------------------------- | ----------------------------------------------------------------------------------------- |
| `com_vinculos_externos`       | Confirmar ausência do registro `phzmobi8mfb34ha`                                          |
| `com_eventos_integracao`      | Confirmar ausência do registro `pq4npvruaak9gpb`                                          |
| `com_execucoes_sincronizacao` | Confirmar ausência do registro `62otoics23ul0vy`                                          |
| `com_ocorrencias_qualidade`   | Confirmar zero referências órfãs a `62otoics23ul0vy`                                      |
| `com_parametros`              | Ler estado dos locks, distinguindo fatos já observados de estados a verificar             |
| `com_contatos`                | Verificação informativa do contato `hfjq2q1olefske7` (referenciado pelo vínculo removido) |
| `com_auditoria`               | Evidência complementar — filtro fechado nos três pares collection/record_id               |

### 3.1 Exclusão de `com_snapshots_negocio`

`com_snapshots_negocio` foi **removido** do inventário. Justificativa documentada:

- O schema conhecido possui os campos `negocio_id`, `snapshot`, `origem`, `created` e `updated`.
- **Não existe campo estrutural comprovável** que relacione snapshots aos IDs removidos (`phzmobi8mfb34ha`, `pq4npvruaak9gpb`, `62otoics23ul0vy`).
- Busca textual dentro do campo `snapshot` **não deve ser usada como evidência estrutural**, pois é coincidência textual, não relacionamento estrutural.
- Nenhuma query de snapshot permanece neste plano.

### 3.2 Escopo exato — sem expansão

O inventário não deve ser expandido para outras coleções sem nova revisão e autorização explícita. As coleções listadas acima constituem o escopo completo do futuro R14.

---

## 4. Queries Somente-Leitura Propostas

> **AVISO:** Estas queries são PROPOSTAS para revisão. Nenhuma deve ser executada sem autorização explícita. Nesta revisão documental, zero queries foram executadas.

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

### 4.6 Leitura de Locks — `com_parametros`

```
Coleção: com_parametros
Filtro:  chave = "ac_diag_compensacao_dependencias_lock"
         OU chave = "ac_diag_consulta_dependencias_lock"
         OU chave = "ac_diag_compensacao_auditoria_lock"
         OU chave = "ac_r11_execution_lock"
         OU chave = "ac_r12_execution_lock"
         OU chave = "ac_r13_execution_lock"
Sort:    chave
Limite:  100
Campos:  chave, valor, ativo, descricao, tipo, created, updated
```

**Importante:** A leitura deve distinguir fatos já observados (seção 5.1) dos estados retornados pela query. Se o estado retornado divergir do fato observado, registrar a divergência e PARE para análise.

### 4.7 Verificação de Contato Referenciado — `com_contatos` (Informativa)

```
Coleção: com_contatos
Método: GET /api/collections/com_contatos/records/hfjq2q1olefske7
Esperado Preferido: 200 OK (registro presente — não era alvo da compensação)
Se Ausente: 404 — classificar como divergência informativa e PARE para análise
Campos:  id, nome, email, telefone, empresa_id, ativo, created, updated
```

**Nota:** O contato não era alvo da compensação. Sua presença é o resultado esperado preferido. Se ausente, **não inferir** que a compensação o deletou sem evidência — classificar como divergência informativa e PARE.

### 4.8 Auditoria Complementar — `com_auditoria` (Evidência Complementar, Não Go/No-Go)

```
Coleção: com_auditoria
Filtro:  (collection_name = "com_vinculos_externos" && record_id = "phzmobi8mfb34ha")
         || (collection_name = "com_eventos_integracao" && record_id = "pq4npvruaak9gpb")
         || (collection_name = "com_execucoes_sincronizacao" && record_id = "62otoics23ul0vy")
Sort:    -created
Limite:  50
Campos:  id, collection_name, record_id, usuario_id, acao, valor_anterior, valor_novo, justificativa, origem_alteracao, created
```

**Declaração expressa:**

- Um resultado vazio (zero registros) é **aceitável**, pois hooks de auditoria podem não registrar deleções feitas diretamente pelo hook transacional de compensação.
- A **fonte primária** da execução permanece sendo o JSON HTTP da compensação v8.
- A query de `com_auditoria` é **evidência complementar, não um requisito de Go/No-Go**.

### 4.9 Resumo das Queries Futuras

| #   | Coleção                       | Método    | Filtro/Parâmetro                  | Sort       | Limite | Campos                                                                                                                   |
| --- | ----------------------------- | --------- | --------------------------------- | ---------- | ------ | ------------------------------------------------------------------------------------------------------------------------ |
| 4.1 | `com_vinculos_externos`       | GET by ID | `phzmobi8mfb34ha`                 | n/a        | n/a    | n/a (404 esperado)                                                                                                       |
| 4.2 | `com_eventos_integracao`      | GET by ID | `pq4npvruaak9gpb`                 | n/a        | n/a    | n/a (404 esperado)                                                                                                       |
| 4.3 | `com_execucoes_sincronizacao` | GET by ID | `62otoics23ul0vy`                 | n/a        | n/a    | n/a (404 esperado)                                                                                                       |
| 4.4 | `com_ocorrencias_qualidade`   | List      | `execucao_id = "62otoics23ul0vy"` | `created`  | 100    | `id, execucao_id, tipo, severidade, descricao, resolvida, created`                                                       |
| 4.5 | 3 coleções                    | Count     | n/a                               | n/a        | n/a    | Contagens: 14, 10, 9                                                                                                     |
| 4.6 | `com_parametros`              | List      | 6 chaves de lock                  | `chave`    | 100    | `chave, valor, ativo, descricao, tipo, created, updated`                                                                 |
| 4.7 | `com_contatos`                | GET by ID | `hfjq2q1olefske7`                 | n/a        | n/a    | `id, nome, email, telefone, empresa_id, ativo, created, updated`                                                         |
| 4.8 | `com_auditoria`               | List      | 3 pares collection/record_id      | `-created` | 50     | `id, collection_name, record_id, usuario_id, acao, valor_anterior, valor_novo, justificativa, origem_alteracao, created` |

---

## 5. Riscos e Locks

| Risco                                 | Mitigação                                                                       |
| ------------------------------------- | ------------------------------------------------------------------------------- |
| Execução acidental de rota destrutiva | Nenhuma rota destrutiva será criada ou chamada em R14                           |
| Modificação de lock existente         | Os locks serão apenas lidos, nunca modificados                                  |
| Reabertura não-autorizada de R13      | R13 está formalmente encerrada; nenhuma re-execução é possível (lock consumido) |
| Confusão entre R14 e Porta 2D.2B      | R14 é estritamente somente-leitura; 2D.2B não é iniciada                        |
| Chamadas à ActiveCampaign             | Zero chamadas externas autorizadas                                              |
| Alteração de schema ou RBAC           | Nenhuma migração ou alteração de regra autorizada                               |
| Inferência sem evidência              | Ausência de contato ou auditoria vazia não implica deleção pela compensação     |
| Expansão de escopo                    | O inventário não deve ser expandido sem nova revisão e autorização              |

### 5.1 Locks — Fatos Observados vs. Estados a Verificar

#### Fatos já observados (evidenciados pelo JSON HTTP da compensação v8)

| Lock                        | Chave                                   | Estado Observado                     | Fonte da Observação                                   |
| --------------------------- | --------------------------------------- | ------------------------------------ | ----------------------------------------------------- |
| Compensação de dependências | `ac_diag_compensacao_dependencias_lock` | `consumed`                           | Confirmado pela resposta HTTP da compensação v8       |
| Consulta de dependências    | `ac_diag_consulta_dependencias_lock`    | `consumed`                           | Informado pela resposta HTTP da compensação v8        |
| Auditoria de compensação    | `ac_diag_compensacao_auditoria_lock`    | `armed` (como `original_audit_lock`) | Informado como `original_audit_lock` pela resposta v8 |

#### Estados NÃO VERIFICADOS (a verificar apenas na futura auditoria autorizada)

| Lock | Chave                   | Estado Atual     | Observação                                             |
| ---- | ----------------------- | ---------------- | ------------------------------------------------------ |
| R11  | `ac_r11_execution_lock` | `NÃO VERIFICADO` | Nenhum valor esperado pode ser atribuído sem evidência |
| R12  | `ac_r12_execution_lock` | `NÃO VERIFICADO` | Nenhum valor esperado pode ser atribuído sem evidência |
| R13  | `ac_r13_execution_lock` | `NÃO VERIFICADO` | Nenhum valor esperado pode ser atribuído sem evidência |

**Regra:** Para qualquer lock não listado como fato observado, o estado atual é `NÃO VERIFICADO`. O estado só pode ser determinado na futura auditoria autorizada mediante leitura real de `com_parametros`. Nenhum valor esperado pode ser atribuído sem evidência.

---

## 6. Critérios PARE

A atividade R14 deve ser interrompida imediatamente se:

1. Qualquer query de leitura retornar um erro inesperado (500, timeout) ou resposta incompleta.
2. Qualquer registro que deveria estar ausente for encontrado presente.
3. Qualquer contagem divergir do esperado (14/10/9).
4. O lock `ac_diag_compensacao_dependencias_lock` não estiver `consumed` ou estiver ilegível.
5. Qualquer referência órfã for encontrada em `com_ocorrencias_qualidade` (exceção: contato informativo, que tem critério próprio na seção 4.7).
6. Qualquer operação de escrita for solicitada ou necessária.
7. Qualquer dúvida sobre a integridade dos dados surgir.
8. O contato `hfjq2q1olefske7` estiver ausente (divergência informativa — PARE para análise).

---

## 7. Critérios Go/No-Go

### Go (todas devem ser verdadeiras)

- [ ] Autorização explícita recebida do responsável do projeto
- [ ] R13 / Porta 2D.2A formalmente encerrada
- [ ] Compromisso de somente-leitura assinado
- [ ] Plano revisado e aprovado
- [ ] Nenhuma alteração de código, hook, migração ou schema planejada
- [ ] Ambiente estável (sem deploys em andamento)
- [ ] Os três IDs estão ausentes (`phzmobi8mfb34ha`, `pq4npvruaak9gpb`, `62otoics23ul0vy`)
- [ ] Zero ocorrências para `execucao_id = "62otoics23ul0vy"` em `com_ocorrencias_qualidade`
- [ ] Contagens finais: `com_eventos_integracao = 14`, `com_execucoes_sincronizacao = 10`, `com_vinculos_externos = 9`
- [ ] O lock principal `ac_diag_compensacao_dependencias_lock` está `consumed`
- [ ] Todas as queries obrigatórias completam sem erro
- [ ] Zero operações de escrita executadas
- [ ] Zero chamadas externas (incluindo ActiveCampaign)

### No-Go/PARE (qualquer uma bloqueia)

- [ ] Falta de autorização explícita
- [ ] Qualquer ID alvo está presente (não foi deletado)
- [ ] Uma dependência é encontrada em `com_ocorrencias_qualidade`
- [ ] Uma contagem diverge do esperado (diferente de 14/10/9)
- [ ] O lock principal é diferente de `consumed` ou está ilegível
- [ ] Erro, timeout ou resposta incompleta em qualquer query obrigatória
- [ ] Qualquer operação de escrita é solicitada
- [ ] Qualquer chamada à ActiveCampaign é necessária
- [ ] Dúvida sobre o estado do lock de compensação
- [ ] Necessidade de modificação de qualquer arquivo existente
- [ ] Divergência entre este plano e o estado real do banco

**Nota explícita:** A existência de zero registros em `com_auditoria` **não é** um critério de No-Go. A auditoria é evidência complementar; resultado vazio é aceitável.

---

## 8. Plano de Evidência

Após a execução autorizada das queries somente-leitura, o seguinte artefato deverá ser produzido:

- `REPORT_R14_POST_COMPENSATION_AUDIT.md` — contendo:
  - Resultado de cada query proposta (seção 4) com respostas reais
  - Confirmação de ausência dos três registros
  - Confirmação de contagens (14/10/9)
  - Confirmação de zero referências órfãs em `com_ocorrencias_qualidade`
  - Estado de todos os locks lidos, distinguindo fatos observados de estados verificados
  - Resultado da verificação informativa do contato `hfjq2q1olefske7`
  - Resultado da query complementar de `com_auditoria` (mesmo que vazia)
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
13. **PROIBIDO** usar dados já documentados como substituto de queries reais na futura auditoria autorizada.
14. **PROIBIDO** buscar textualmente dentro do campo `snapshot` de `com_snapshots_negocio` como evidência estrutural.
15. **PROIBIDO** inferir que a compensação deletou o contato `hfjq2q1olefske7` sem evidência estrutural.
16. **PROIBIDO** expandir o inventário para outras coleções sem nova revisão e autorização.

---

## 10. Sugestão de Primeiro Prompt Futuro (Sem Autorização para Uso)

> O prompt abaixo é uma **sugestão documental** para uso futuro quando R14 for explicitamente autorizado. **Não deve ser utilizado sem autorização prévia.**

---

**Prompt sugerido:**

> Por favor, execute a auditoria pós-compensação R14 estritamente somente-leitura conforme o plano revisado em `PLAN_R14_ENTRY_READ_ONLY.md`.
>
> Regras:
>
> 1. Execute APENAS queries GET e APIs de leitura do PocketBase — nenhuma rota POST, PUT, PATCH ou DELETE é permitida.
> 2. Crie APENAS o arquivo `REPORT_R14_POST_COMPENSATION_AUDIT.md` a partir das respostas reais das queries.
> 3. Nenhum arquivo existente pode ser modificado.
> 4. Nenhum registro pode ser criado, atualizado ou deletado.
> 5. Nenhum lock pode ser modificado.
> 6. Nenhuma chamada à ActiveCampaign ou serviço externo.
> 7. Não use dados já documentados como substituto de queries reais — todas as evidências devem vir das respostas reais.
> 8. Execute as queries exatamente conforme listadas na seção 4 do plano revisado:
>    - 4.1–4.3: Verificação de ausência por ID (GET, esperar 404)
>    - 4.4: `com_ocorrencias_qualidade` com filtro `execucao_id = "62otoics23ul0vy"`, sort `created`, limite 100
>    - 4.5: Contagens de `com_eventos_integracao`, `com_execucoes_sincronizacao`, `com_vinculos_externos` (esperado 14/10/9)
>    - 4.6: Leitura dos locks em `com_parametros` (6 chaves), distinguindo fatos observados de estados retornados
>    - 4.7: GET `com_contatos/hfjq2q1olefske7` (informativa — se ausente, PARE para análise)
>    - 4.8: `com_auditoria` com filtro fechado nos três pares collection/record_id (complementar — resultado vazio é aceitável)
> 9. Inclua a declaração JSON expressa confirmando zero efeitos colaterais.
> 10. R14, Porta 2D.2B e Porta 2E não devem ser iniciados além deste relatório.
> 11. PARE imediatamente após capturar todas as evidências e criar o relatório.

---

## 11. Diferencial da Revisão (Diff Literal)

### Alteração 1 — Seção 0 adicionada

Nova seção **0. Natureza desta Revisão** adicionada no topo, distinguindo explicitamente:

- (a) Esta revisão é apenas documental e executa nada.
- (b) Apenas uma futura abertura explicitamente autorizada do R14 realizará queries reais somente-leitura.
- (c) HTTP GET e APIs de leitura do PocketBase são permitidas apenas após autorização explícita.
- (d) POST, PUT, PATCH, DELETE e qualquer escrita permanecem proibidos.

### Alteração 2 — Futuro prompt reescrito (seção 10)

O prompt anterior instruía usar "apenas os dados já documentados no `REPORT_R13_PORTA_2D2A_FINAL_CLOSURE.md` como fonte de evidência", o que contradizia a natureza de auditoria real. Substituído por prompt que autoriza queries GET/PocketBase reais somente-leitura, geração do relatório a partir das respostas reais, zero mudanças de código/dados/locks, e STOP imediato após a captura — sem instrução de substituir dados documentados por queries reais.

### Alteração 3 — `com_snapshots_negocio` removido do inventário (seção 3)

Removido da tabela de inventário (seção 3) e a query 4.8 original (snapshots) foi eliminada. Nova subseção **3.1** documenta a justificativa: ausência de campo estrutural comprovável e proibição de busca textual em `snapshot`.

### Alteração 4 — `com_auditoria` reformulada como complementar (seção 4.8)

A query de auditoria agora usa filtro fechado nos três pares collection/record_id literais, sort `-created`, limite 50. Declara expressamente: resultado vazio é aceitável; fonte primária é o JSON HTTP v8; não é requisito Go/No-Go.

### Alteração 5 — Locks reorganizados (seção 5.1)

Separados em "Fatos observados" (`ac_diag_compensacao_dependencias_lock = consumed`, `ac_diag_consulta_dependencias_lock = consumed`, `ac_diag_compensacao_auditoria_lock = armed`) e "Estados NÃO VERIFICADOS" (`ac_r11_execution_lock`, `ac_r12_execution_lock`, `ac_r13_execution_lock`). Nenhum valor esperado atribuído sem evidência.

### Alteração 6 — Contato informativo com critério próprio (seção 4.7)

Resultado preferido: presente. Se ausente: divergência informativa, PARE para análise, não inferir deleção pela compensação.

### Alteração 7 — Escopo exato sem expansão (seção 3.2)

Nova subseção **3.2** declara que o inventário não deve ser expandido sem nova revisão e autorização.

### Alteração 8 — GO/NO-GO corrigido (seção 7)

Go agora exige: três IDs ausentes, zero ocorrências, contagens 14/10/9, lock principal `consumed`, todas as queries sem erro, zero escritas, zero chamadas externas. No-Go/PARE explícito para cada falha. Zero registros em `com_auditoria` expressamente não é No-Go.

### Alteração 9 — Seção 4.9 adicionada

Nova tabela resumo listando todas as queries futuras com método, filtro, sort, limite e campos.

### Alteração 10 — Proibições expandidas (seção 9)

Adicionadas proibições 13–16: substituir dados documentados por queries reais, busca textual em `snapshot`, inferir deleção de contato sem evidência, expandir inventário sem autorização.

---

**FIM DO PLANO REVISADO — NÃO AUTORIZADO PARA EXECUÇÃO**

### Declaração JSON Expressa

```json
{
  "plan_corrected": true,
  "routes_executed": 0,
  "queries_executed": 0,
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

**PARE.** Aguardando autorização explícita para qualquer fase futura.
