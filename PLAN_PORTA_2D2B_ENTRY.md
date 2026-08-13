# Plano de Entrada — Porta 2D.2B (Correção Consolidada Final)

## 0. Declaração Inicial

**Porta 2D.2B: NÃO INICIADA.**

Este é um documento de planejamento exclusivamente. Nenhuma rota, teste, query, webhook, chamada externa ou alteração de qualquer arquivo — exceto este próprio — foi executada. O escopo futuro descrito é um teste local, assinado, completo e controlado do endpoint de webhook existente, usando exclusivamente amostras sintéticas `[TESTE]`, sem registro de webhook no ActiveCampaign, sem tráfego originado pelo ActiveCampaign e sem chamadas a serviços externos.

---

## 1. Objetivo e Fronteiras

### Objetivo

A Porta 2D.2B tem como objetivo planejar (não executar) um round futuro único, fechado e controlado que valide o endpoint de webhook ActiveCampaign existente (`POST /backend/v1/integracao/ac/webhook`) por meio de chamadas HTTP locais assinadas, usando exclusivamente amostras sintéticas `[TESTE]`, garantindo que todos os mecanismos de segurança, idempotência, normalização, snapshot, rollback e auditoria funcionem de forma observável.

### Dentro do Escopo (Futuro, Não Autorizado)

- Round único com sequência fixa de chamadas e resultado esperado por chamada.
- Amostras exclusivamente sintéticas (`[TESTE]`), prefixadas com `TESTE-2D2B-`.
- Assinatura HMAC sobre os bytes exatos do corpo recebido.
- Timestamp obrigatório dentro de janela de 5 minutos.
- Matriz de segurança com testes negativos (zero persistência).
- Testes funcionais positivos (deltas sintéticos pré-definidos).
- Rollback e repetição idempotente.
- Probe final com endpoint desabilitado.
- Contagens antes/depois em todas as coleções afetáveis.
- Coleta de evidências com IDs integrais no artefato privado de auditoria.

### Fora do Escopo

- ❌ Registro de webhook no ActiveCampaign.
- ❌ Tráfego originado pelo ActiveCampaign.
- ❌ Chamadas para qualquer serviço externo (ActiveCampaign ou outro).
- ❌ Criação, alteração ou exclusão de registros reais.
- ❌ Alterações em migrações, hooks, schema, regras de coleção, índices ou configurações.
- ❌ Alterações em RBAC, perfis, permissões ou guards.
- ❌ Alterações no frontend.
- ❌ Alterações no backend (código ou hooks).
- ❌ Alterações em `.env`, credenciais, tokens ou secrets.
- ❌ Modificação de locks em `com_parametros`.
- ❌ Reutilização ou reativação da compensação R13 v8.
- ❌ Publicação em produção.
- ❌ Início da Porta 2E.
- ❌ Execução da Porta 2D.2B sem nova autorização explícita.

---

## 2. Amostra Sintética

Toda amostra utilizada na Porta 2D.2B é **exclusivamente sintética** e identificada com a tag `[TESTE]`:

| Entidade                 | Correlation Key    | Tag                    |
| ------------------------ | ------------------ | ---------------------- |
| Contato                  | `TESTE-2D2B-FN-C1` | `[TESTE] 2D2B Contact` |
| Negócio                  | `TESTE-2D2B-FN-D1` | `[TESTE] 2D2B Negocio` |
| Negócio (sem mapeamento) | `TESTE-2D2B-FN-D2` | `[TESTE] 2D2B Sem Map` |

### Regras

- Nenhum dado real (mesmo parcial) é utilizado.
- Nenhum email real, telefone real ou CNPJ real é incluído.
- Todos os IDs externos são prefixados com `TESTE-2D2B-`.
- Todos os títulos/nomes contêm `[TESTE]`.
- Os registros sintéticos criados são preservados (não deletados) para auditoria.

---

## 3. Configuração do Webhook ActiveCampaign (Referência Futura)

> ⚠️ **NÃO CONFIGURAR.** Nenhum webhook deve ser registrado, ativado ou testado contra o ActiveCampaign.

| Propriedade          | Valor (futuro, não autorizado)                              |
| -------------------- | ----------------------------------------------------------- |
| Sistema de origem    | `activecampaign`                                            |
| URL do webhook       | `POST /backend/v1/integracao/ac/webhook`                    |
| Content-Type         | `application/json`                                          |
| Limite de corpo      | 256 KB (262144 bytes)                                       |
| Header de assinatura | `X-AC-Signature: <hex_hmac_sha256>`                         |
| Secret               | `AC_WEBHOOK_SECRET` (vault — não exposto)                   |
| Flag de ativação     | `ac_webhook_enabled` em `com_parametros` (server-side only) |
| Janela anti-replay   | 5 minutos (300000 ms), timestamp obrigatório                |

### Status Atual

- O endpoint existe (`ac_webhook.js`) e está **desabilitado** (`ac_webhook_enabled = false`).
- Nenhum webhook está registrado no ActiveCampaign.
- Nenhum tráfego externo é esperado ou permitido.

---

## 4. Autenticação e Semântica de Entrega

### 4.1 HMAC-SHA256 sobre Bytes Exatos do Corpo (Correção 3)

A assinatura deve ser computada sobre os **bytes exatos do corpo recebido** (raw body), sem nenhuma canonicalização JSON posterior.

1. O corpo bruto da requisição é preservado como bytes.
2. Calcula-se `HMAC-SHA256(rawBodyBytes, AC_WEBHOOK_SECRET)`.
3. Compara-se com o header `X-AC-Signature` usando comparação em tempo constante (XOR byte-a-byte sem short-circuit).
4. Antes da comparação, valida-se o formato (hexadecimal) e o comprimento esperado (64 caracteres para SHA-256 hex).
5. Rejeita-se se o header estiver ausente, se o formato for inválido, se o comprimento divergir, ou se a comparação falhar (HTTP 401).

### 4.2 API `$security.hs256()` — A Comprovar Antes da Execução

> ⚠️ **Marcado como "a comprovar antes da execução".**

Não se afirma que `$security.hs256()` implementa HMAC-SHA256 cru sobre bytes sem prova documental e código literal compatível com PocketBase 0.36.0. O estágio de análise estática (Seção 6) deve provar:

- Se `$security.hs256(input, secret)` recebe string ou bytes.
- Se o `input` é tratado como UTF-8 string ou como bytes crus.
- Se o resultado é hex ou base64.
- Se há prova documental ou código-fonte que confirme o comportamento.

Se não houver prova estática, o item é **NO-GO** antes de qualquer teste.

### 4.3 Timestamp Obrigatório

- O timestamp é **obrigatório** em todo payload de teste.
- Deve estar dentro da janela de 5 minutos (300000 ms) do momento do processamento.
- Deve ser incluído no material assinado (parte do raw body).
- Timestamp ausente, com formato inválido ou fora da janela → falha fechada (HTTP 400 ou 401 conforme o ponto de validação).
- Não há compatibilidade retroativa para payloads sem timestamp.

### 4.4 Proteção Anti-Replay

- Quando o payload contém `timestamp`, a janela de 5 minutos é enforced.
- Eventos fora da janela são rejeitados com HTTP 400.
- O timestamp deve ser validado antes de qualquer persistência.

### 4.5 Idempotência

- Chave derivada: `SHA-256(sistema_origem + "|" + evento_tipo + "|" + external_id)`.
- Campo `idempotency_key` em `com_eventos_integracao` com índice UNIQUE (a comprovar na análise estática — S2).
- Duplicatas retornam HTTP 409 com `{ duplicate: true, event_id, status }`.
- Nenhuma duplicata cria segundo evento funcional, contato, empresa, negócio, vínculo, auditoria ou snapshot.

### 4.6 Garantia de Entrega At-Least-Once

- Eventos são persistidos em `com_eventos_integracao` com status `received` antes do processamento.
- Após processamento bem-sucedido, status é atualizado para `processed`.
- Em caso de erro, status é `error` com mensagem sanitizada.
- A execução é registrada em `com_execucoes_sincronizacao` com status `processing` → `completed` / `error`.

---

## 5. Round Único — Sequência Fixa

### 5.1 Eliminação de Modos

Os modos `security-only` e `full` são **eliminados**. Existe um único round com uma sequência fixa de chamadas, um número exato de chamadas e um resultado esperado para cada chamada.

### 5.2 Estrutura do Round

O round é dividido em quatro fases sequenciais:

| Fase      | Descrição                                         | Número de Chamadas |
| --------- | ------------------------------------------------- | ------------------ |
| A         | Testes negativos de segurança (zero persistência) | 8 (A1–A8)          |
| B         | Testes positivos funcionais (deltas sintéticos)   | 5 (B1–B5)          |
| C         | Rollback e repetição idempotente                  | 2 (C1–C2)          |
| D         | Probe final com endpoint desabilitado             | 1 (D1)             |
| **Total** |                                                   | **16**             |

### 5.3 Ordem de Execução

1. Confirmar que `ac_webhook_enabled = false`.
2. **A1**: POST `/backend/v1/integracao/ac/webhook` → esperado HTTP **503** (endpoint desabilitado).
3. Habilitar `ac_webhook_enabled = true`.
4. **A2–A8**: 7 testes negativos (endpoint habilitado; cada um falha por seu motivo específico).
5. **B1–B5**: 5 testes funcionais positivos (assinados, timestamp válido).
6. **C1–C2**: 2 chamadas de rollback (primeira execução + repetição idempotente).
7. Restaurar `ac_webhook_enabled = false`.
8. **D1**: POST `/backend/v1/integracao/ac/webhook` → esperado HTTP **503** (endpoint desabilitado).

---

## 6. Estágio de Análise Estática Prévio

Antes de qualquer teste, um estágio de **análise estática apenas** deve provar os seguintes itens no código/schema existente. Qualquer item não provado é **NO-GO**.

| #   | Item a Provar                                                                                                                                                                                                                 | Fonte                                                      | Status      |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ----------- |
| S1  | API criptográfica usada (`$security.hs256`): recebe string ou bytes; resultado hex ou base64; comportamento documentado                                                                                                       | Código de `ac_webhook.js` e documentação PocketBase 0.36.0 | A comprovar |
| S2  | Índice UNIQUE em `idempotency_key` em `com_eventos_integracao`                                                                                                                                                                | `schema.json` e migração 0044                              | A comprovar |
| S3  | Estados válidos de eventos (`received`, `processed`, `error`) e execuções (`processing`, `completed`, `error`)                                                                                                                | Código de `ac_webhook.js`                                  | A comprovar |
| S4  | Formato e campos do snapshot em `com_snapshots_negocio` (`negocio_id`, `snapshot`, `origem`)                                                                                                                                  | `schema.json` e migração 0045                              | A comprovar |
| S5  | Contrato literal do endpoint webhook (`POST /backend/v1/integracao/ac/webhook`)                                                                                                                                               | Código de `ac_webhook.js`                                  | A comprovar |
| S6  | Contrato literal do endpoint rollback (`POST /backend/v1/integracao/ac/rollback`)                                                                                                                                             | Código de `ac_rollback.js`                                 | A comprovar |
| S7  | Campos estruturais de `com_vinculos_externos` (`sistema_origem`, `external_type`, `external_id`, `collection_name`, `record_id`) distinguindo contato (`external_type = 'contact'`) de negócio (`external_type = 'business'`) | `schema.json` e migração 0042                              | A comprovar |
| S8  | Se B5 (`deal_create` com stage sem mapeamento) cria um vínculo em `com_vinculos_externos` — análise do caminho de código em `ac_webhook.js` para novos negócios                                                               | Código de `ac_webhook.js`                                  | A comprovar |
| S9  | Se C1 (rollback) cria um registro em `com_execucoes_sincronizacao` — análise do caminho de código em `ac_rollback.js`                                                                                                         | Código de `ac_rollback.js`                                 | A comprovar |
| S10 | Se o endpoint de rollback (`ac_rollback.js`) implementa idempotência para C2 (repetição produz delta 0)                                                                                                                       | Código de `ac_rollback.js`                                 | A comprovar |
| S11 | Delta de `com_auditoria` durante o round — análise de todos os caminhos de código em `ac_webhook.js` e `ac_rollback.js` para criação server-side de registros de auditoria                                                    | Código de `ac_webhook.js` e `ac_rollback.js`               | A comprovar |

### Resultado do Estágio de Análise Estática

Todos os itens S1–S11 devem estar com status "Provado" antes de proceder. Qualquer item "A comprovar" ou "Não provado" é NO-GO.

---

## 7. Matriz Completa de Testes

### 7.1 Coleções Monitoradas

| Coleção                       | Campo no JSON |
| ----------------------------- | ------------- |
| `com_contatos`                | `contatos`    |
| `com_negocios`                | `negocios`    |
| `com_eventos_integracao`      | `eventos`     |
| `com_execucoes_sincronizacao` | `execucoes`   |
| `com_vinculos_externos`       | `vinculos`    |
| `com_snapshots_negocio`       | `snapshots`   |
| `com_ocorrencias_qualidade`   | `ocorrencias` |
| `com_auditoria`               | `auditoria`   |

Contagens são capturadas: antes do round, após cada chamada individual, e ao final.

> **Ver também:** Seção 7.7 — Tabela Consolidada de Monitoramento.

### 7.2 Fase A — Testes Negativos de Segurança (Zero Persistência)

> Todos os testes negativos devem produzir **delta zero** em todas as coleções monitoradas.

| #   | Método | Rota                                | Headers                                                                                      | Categoria do Payload                                        | HTTP Esperado | Delta por Coleção |
| --- | ------ | ----------------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ------------- | ----------------- |
| A1  | POST   | `/backend/v1/integracao/ac/webhook` | `Content-Type: application/json`                                                             | `{}` (endpoint desabilitado)                                | 503           | 0 em todas        |
| A2  | GET    | `/backend/v1/integracao/ac/webhook` | (nenhum)                                                                                     | (nenhum corpo)                                              | 405           | 0 em todas        |
| A3  | POST   | `/backend/v1/integracao/ac/webhook` | `Content-Type: text/plain`                                                                   | `{}`                                                        | 400           | 0 em todas        |
| A4  | POST   | `/backend/v1/integracao/ac/webhook` | `Content-Type: application/json`, `X-AC-Signature: <válido>`, `timestamp: <válido no corpo>` | `{}` (corpo vazio sem tipo/id externo)                      | 400           | 0 em todas        |
| A5  | POST   | `/backend/v1/integracao/ac/webhook` | `Content-Type: application/json`, `X-AC-Signature: <válido>`                                 | JSON malformado `not-json{`                                 | 400           | 0 em todas        |
| A6  | POST   | `/backend/v1/integracao/ac/webhook` | `Content-Type: application/json`, `X-AC-Signature: <válido>`, `timestamp: <válido no corpo>` | Payload > 256KB                                             | 400           | 0 em todas        |
| A7  | POST   | `/backend/v1/integracao/ac/webhook` | `Content-Type: application/json` (sem `X-AC-Signature`)                                      | Payload de contato sintético `[TESTE]` com timestamp válido | 401           | 0 em todas        |
| A8  | POST   | `/backend/v1/integracao/ac/webhook` | `Content-Type: application/json`, `X-AC-Signature: invalido`                                 | Payload de contato sintético `[TESTE]` com timestamp válido | 401           | 0 em todas        |

> **A4:** Assinatura válida e timestamp válido garantem que a única razão de falha seja "Evento sem tipo ou id externo identificavel" (HTTP 400), e não ausência de assinatura ou timestamp inválido.
>
> **A6:** Assinatura válida e timestamp válido garantem que a única razão de falha seja "Corpo da requisicao excede o limite de 256KB" (HTTP 400), e não ausência de assinatura ou timestamp inválido.

### 7.3 Fase B — Testes Positivos Funcionais (Deltas Sintéticos Pré-definidos)

> Após habilitar `ac_webhook_enabled = true`. Todos os payloads são assinados com HMAC sobre bytes exatos, com timestamp obrigatório válido. Nenhum valor de secret é exposto.

| #   | Método | Rota                                | Headers                                                                                      | Categoria do Payload                                           | HTTP Esperado | Delta por Coleção                                                   |
| --- | ------ | ----------------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------- | ------------------------------------------------------------------- |
| B1  | POST   | `/backend/v1/integracao/ac/webhook` | `Content-Type: application/json`, `X-AC-Signature: <válido>`, `timestamp: <válido no corpo>` | `contact_create` (`TESTE-2D2B-FN-C1`)                          | 200           | contatos +1, eventos +1, execuções +1, vinculos +1                  |
| B2  | POST   | `/backend/v1/integracao/ac/webhook` | `Content-Type: application/json`, `X-AC-Signature: <válido>`, `timestamp: <válido no corpo>` | Replay idêntico de B1                                          | 409           | 0 em todas (duplicata)                                              |
| B3  | POST   | `/backend/v1/integracao/ac/webhook` | `Content-Type: application/json`, `X-AC-Signature: <válido>`, `timestamp: <válido no corpo>` | `deal_create` (`TESTE-2D2B-FN-D1`, stage `prospects`)          | 200           | negocios +1, eventos +1, execuções +1, vinculos +1                  |
| B4  | POST   | `/backend/v1/integracao/ac/webhook` | `Content-Type: application/json`, `X-AC-Signature: <válido>`, `timestamp: <válido no corpo>` | `deal_update` (`TESTE-2D2B-FN-D1`, stage `producao_proposta`)  | 200           | snapshots +1, eventos +1, execuções +1                              |
| B5  | POST   | `/backend/v1/integracao/ac/webhook` | `Content-Type: application/json`, `X-AC-Signature: <válido>`, `timestamp: <válido no corpo>` | `deal_create` (`TESTE-2D2B-FN-D2`, stage `unmapped_stage_xyz`) | 200           | negocios +1, eventos +1, execuções +1, vinculos +1†, ocorrencias +1 |

> **† B5 — `com_vinculos_externos` +1:** Baseado na análise do código em `ac_webhook.js`, o caminho de criação de novo negócio (`!nRec`) cria um vínculo. **Este item depende da análise estática S8 (NO-GO até provado).** Se S8 provar que B5 NÃO cria vínculo, remover `vinculos +1` de B5 e ajustar o total de `com_vinculos_externos` para +2.

### 7.4 Fase C — Rollback e Repetição Idempotente

| #   | Método | Rota                                 | Headers                                                                                      | Categoria do Payload                        | HTTP Esperado | Delta por Coleção                                               |
| --- | ------ | ------------------------------------ | -------------------------------------------------------------------------------------------- | ------------------------------------------- | ------------- | --------------------------------------------------------------- |
| C1  | POST   | `/backend/v1/integracao/ac/rollback` | `Content-Type: application/json`, `X-AC-Signature: <válido>`, `timestamp: <válido no corpo>` | Rollback de `TESTE-2D2B-FN-D1` (`business`) | 200           | eventos +1 (compensador), snapshots restaurados; execuções +0†† |
| C2  | POST   | `/backend/v1/integracao/ac/rollback` | `Content-Type: application/json`, `X-AC-Signature: <válido>`, `timestamp: <válido no corpo>` | Replay idêntico de C1                       | 200           | 0 em todas (idempotente)                                        |

> **†† C1 — `com_execucoes_sincronizacao` +0:** Baseado na análise do código em `ac_rollback.js`, o endpoint de rollback NÃO cria um registro em `com_execucoes_sincronizacao`. **Este item depende da análise estática S9 (NO-GO até provado).** Se S9 provar que C1 CRIA execução, ajustar o total de `com_execucoes_sincronizacao` para +5.

#### Contrato de C1 (Primeira Execução)

| Aspecto                 | Valor                                                                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| HTTP Esperado           | 200                                                                                                                                  |
| Body Esperado           | `{ success: true, rolled_back: [{ collection, record_id, restored_from_snapshot, compensating_event }] }`                            |
| Comportamento           | Negócio `TESTE-2D2B-FN-D1` restaurado a partir do snapshot mais recente. Um evento compensador é criado em `com_eventos_integracao`. |
| Cria execução?          | **Não** (a comprovar em S9 — NO-GO até provado)                                                                                      |
| Cria snapshot?          | Não                                                                                                                                  |
| Cria evento compensador | Sim (+1 em `com_eventos_integracao`)                                                                                                 |

#### Contrato de C2 (Repetição Idempotente)

| Aspecto       | Valor                                                                                                                                                                                                                                                                                       |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HTTP Esperado | **200**                                                                                                                                                                                                                                                                                     |
| Body Esperado | `{ success: true, rolled_back: [], idempotent: true }`                                                                                                                                                                                                                                      |
| Comportamento | Negócio NÃO é alterado. Nenhum novo evento compensador é criado. Nenhum snapshot adicional é criado.                                                                                                                                                                                        |
| Delta         | 0 em todas as coleções                                                                                                                                                                                                                                                                      |
| Observação    | **Este contrato depende da análise estática S10 (NO-GO até provado).** O código atual de `ac_rollback.js` utiliza `Date.now()` na `idempotency_key`, o que pode impedir a idempotência. Se S10 provar que o código NÃO é idempotente, o contrato de C2 deve ser revisado antes da execução. |

> Não se aceita "200 ou 409" sem distinção. O contrato idempotente é único: **HTTP 200 com `{ success: true, rolled_back: [], idempotent: true }`** e delta 0.

### 7.5 Fase D — Probe Final

| #   | Método | Rota                                | Headers                          | HTTP Esperado | Delta      |
| --- | ------ | ----------------------------------- | -------------------------------- | ------------- | ---------- |
| D1  | POST   | `/backend/v1/integracao/ac/webhook` | `Content-Type: application/json` | 503           | 0 em todas |

### 7.6 Deltas Finais Totais

| Coleção                       | Delta Total Esperado                                               |
| ----------------------------- | ------------------------------------------------------------------ |
| `com_contatos`                | +1                                                                 |
| `com_negocios`                | +2                                                                 |
| `com_eventos_integracao`      | +5 (B1, B3, B4, B5, C1 compensador; B2=0, C2=0)                    |
| `com_execucoes_sincronizacao` | +4 (B1, B3, B4, B5; C1=0†† — a comprovar em S9, NO-GO até provado) |
| `com_vinculos_externos`       | +3 (B1, B3, B5† — a comprovar em S8, NO-GO até provado)            |
| `com_snapshots_negocio`       | +1 (B4)                                                            |
| `com_ocorrencias_qualidade`   | +1 (B5)                                                            |
| `com_auditoria`               | a determinar na análise estática (S11 — NO-GO até provado)         |

> **Nota sobre `com_eventos_integracao`:** O delta total é +5. Derivação linha a linha: B1 (+1), B2 (+0 — duplicata), B3 (+1), B4 (+1), B5 (+1), C1 (+1 — compensador), C2 (+0 — idempotente). Não existe nenhum valor alternativo (+6) em qualquer parte deste documento.

> **Nota sobre `com_execucoes_sincronizacao`:** O delta é +4 com base na análise do código de `ac_rollback.js` (que não cria execução). **Item S9 é NO-GO até provado.** Se S9 provar que C1 cria execução, o delta passa a +5.

> **Nota sobre `com_vinculos_externos`:** O delta é +3 com base na análise do código de `ac_webhook.js` (caminho de criação de novo negócio cria vínculo). **Item S8 é NO-GO até provado.** Se S8 provar que B5 não cria vínculo, o delta passa a +2.

> **Nota sobre `com_auditoria`:** O delta é **"a determinar na análise estática"**. A inferência anterior baseada em `createRule: null` foi **removida**. Sem prova estática (S11), o item é **NO-GO**. Apenas após prova o valor exato será atualizado antes de autorizar o round.

---

## 7.7 Tabela Consolidada de Monitoramento

> Esta seção consolida em uma única tabela, para cada coleção monitorada, a contagem inicial (a capturar antes do round — sem valor numérico inventado), o delta exato esperado para o round completo, a fórmula da contagem final (`inicial + delta`) e as fases/chamadas responsáveis pelo delta.

| Coleção                       | Contagem Inicial          | Delta Exato Esperado (Round Completo)                    | Fórmula Contagem Final | Fases / Chamadas Responsáveis                                            |
| ----------------------------- | ------------------------- | -------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------ |
| `com_contatos`                | a capturar antes do round | +1                                                       | inicial + 1            | B1 (contact_create `TESTE-2D2B-FN-C1`)                                   |
| `com_negocios`                | a capturar antes do round | +2                                                       | inicial + 2            | B3 (deal_create `TESTE-2D2B-FN-D1`), B5 (deal_create `TESTE-2D2B-FN-D2`) |
| `com_eventos_integracao`      | a capturar antes do round | +5                                                       | inicial + 5            | B1, B3, B4, B5, C1 (compensador); B2=0, C2=0 (idempotentes)              |
| `com_execucoes_sincronizacao` | a capturar antes do round | +4 (S9 NO-GO — se C1 cria execução, delta passa a +5)    | inicial + 4 (ou +5)    | B1, B3, B4, B5; C1=0 (a comprovar em S9)                                 |
| `com_vinculos_externos`       | a capturar antes do round | +3 (S8 NO-GO — se B5 não cria vínculo, delta passa a +2) | inicial + 3 (ou +2)    | B1 (vínculo contato), B3 (vínculo negócio), B5 (vínculo negócio†)        |
| `com_snapshots_negocio`       | a capturar antes do round | +1                                                       | inicial + 1            | B4 (deal_update `TESTE-2D2B-FN-D1`)                                      |
| `com_ocorrencias_qualidade`   | a capturar antes do round | +1                                                       | inicial + 1            | B5 (unmapped_stage `TESTE-2D2B-FN-D2`)                                   |
| `com_auditoria`               | a capturar antes do round | a determinar na análise estática (S11 NO-GO)             | inicial + (a provar)   | A determinar em S11                                                      |

> **Nota sobre `com_eventos_integracao`:** O delta total é +5. Derivação: B1 (+1), B2 (+0), B3 (+1), B4 (+1), B5 (+1), C1 (+1), C2 (+0). Valor único — não existe +6 em nenhuma parte do documento.

> **Nota sobre `com_auditoria`:** O delta é "a determinar na análise estática". A inferência anterior baseada em `createRule: null` foi **removida**. Sem prova estática (S11), o item é **NO-GO**.

### Bloco do Parâmetro `ac_webhook_enabled` (Registrado Separadamente)

| Aspecto                             | Valor                                                                                     |
| ----------------------------------- | ----------------------------------------------------------------------------------------- |
| Chave                               | `ac_webhook_enabled`                                                                      |
| Contagem / Valor inicial esperado   | `false` (confirmado antes do round)                                                       |
| Única transição autorizada (futuro) | `false → true → false`                                                                    |
| Estado final obrigatório            | `false`                                                                                   |
| Restauração automática após PARE    | Restaurar `ac_webhook_enabled = false` é a **única** ação corretiva automática permitida  |
| Outros parâmetros ou locks          | Fora do escopo — proibidos (nenhuma outra chave de `com_parametros` é lida ou modificada) |

> **Ver também:** Seção 8 — Parâmetro de Ativação para o detalhamento completo.

---

## 8. Parâmetro de Ativação

### `ac_webhook_enabled` — Parâmetro de Ativação (Não Lock)

| Aspecto                             | Valor                                                                                     |
| ----------------------------------- | ----------------------------------------------------------------------------------------- |
| Tipo                                | Parâmetro de ativação em `com_parametros`                                                 |
| Chave                               | `ac_webhook_enabled`                                                                      |
| Valor inicial esperado              | `false` (confirmado antes do round)                                                       |
| Única transição autorizada (futuro) | `false → true → false`                                                                    |
| Procedimento de restauração         | Ao final do round (ou em caso de falha), restaurar para `false` e confirmar via releitura |
| Outras chaves de `com_parametros`   | Nenhuma pode ser lida ou modificada                                                       |

### Remoção de `ac_r13_execution_lock`

O lock `ac_r13_execution_lock` é **removido do plano**. Não é lido, modificado, criado ou referenciado em qualquer parte deste documento.

---

## 9. PARE — Segurança e Correção Automática

### PARE — Pausar, Analisar, Refletir, Engajar

O PARE deve ser aplicado **imediatamente** se qualquer critério de NO-GO for disparado.

### Única Ação Corretiva Automática Permitida

Se uma falha ocorrer após a habilitação de `ac_webhook_enabled = true`, a **única** ação corretiva automática permitida é:

1. Restaurar `ac_webhook_enabled = false`.
2. Confirmar via releitura que o valor é `false`.

**Toda e qualquer outra ação deve parar imediatamente** sem correção automática. Nenhum rollback, compensação, deleção, desativação de registros ou outra correção é executada automaticamente.

### Critérios de PARE Imediato

1. 🔴 Qualquer teste negativo de segurança criar registros (delta > 0 em qualquer coleção).
2. 🔴 Qualquer chamada externa para ActiveCampaign ou serviço externo ser detectada.
3. 🔴 Qualquer dado real (não-`[TESTE]`) ser criado ou alterado.
4. 🔴 `ac_webhook_enabled` não puder ser restaurado para `false`.
5. 🔴 O probe final não retornar 503.
6. 🔴 O rollback falhar.
7. 🔴 O snapshot não for criado antes da atualização do negócio.
8. 🔴 Qualquer alteração fora do escopo `TESTE-2D2B-` ser detectada.
9. 🔴 Qualquer hook, migração, schema ou configuração for alterada.
10. 🔴 Qualquer credencial, token ou secret for exposto.
11. 🔴 Qualquer divergência de status, identidade, delta, flag, assinatura ou timestamp.
12. 🔴 Qualquer item S1–S11 não provado na análise estática.

### Ação ao Disparar PARE

- Restaurar `ac_webhook_enabled = false` (única ação automática).
- Retornar toda a evidência coletada até o ponto de parada.
- Registrar o motivo da parada.
- Não iniciar nenhuma outra ação corretiva sem nova autorização explícita.

---

## 10. Rollback — Identificação por Correlação

### Identificação de Alvos

Os alvos de rollback são identificados **exclusivamente** por:

1. Correlation keys sintéticas (`TESTE-2D2B-FN-D1`, `TESTE-2D2B-FN-D2`).
2. Relações estruturais provadas em `com_vinculos_externos`:
   - `sistema_origem = 'activecampaign'`
   - `external_type = 'business'`
   - `external_id = 'TESTE-2D2B-FN-D1'`
   - `collection_name = 'com_negocios'`
   - `record_id` = ID interno do negócio

### Proibições

- ❌ Não usar busca textual para inferir tipo de entidade.
- ❌ Não usar `record_id` isolado para inferir o tipo de registro.
- ❌ Não reutilizar ou reativar a compensação R13 v8.

### Contrato de Rollback

| Execução      | HTTP Esperado | Body Esperado                                          | Comportamento                                              |
| ------------- | ------------- | ------------------------------------------------------ | ---------------------------------------------------------- |
| C1 (primeira) | 200           | `{ success: true, rolled_back: [{ ... }] }`            | Negócio restaurado do snapshot. Evento compensador criado. |
| C2 (replay)   | 200           | `{ success: true, rolled_back: [], idempotent: true }` | Negócio não alterado. Nenhum novo evento compensador.      |

> O contrato idempotente é **único e inequívoco**: C2 retorna HTTP 200 com `{ success: true, rolled_back: [], idempotent: true }` e delta 0. Não se aceita "200 ou 409".
>
> **Dependência:** O cumprimento do contrato de C2 depende da análise estática S10 (NO-GO até provado).

### Preservação de Histórico

- Snapshots são imutáveis (regra `updateRule: null`, `deleteRule: null`).
- Eventos compensadores são preservados.
- Nenhum registro é fisicamente deletado.
- A preservação segue o schema provado no estágio de análise estática.

---

## 11. GO/NO-GO

### GO (Todos devem ser verdadeiros e prováveis objetivamente)

1. ✅ Estágio de análise estática (S1–S11) totalmente provado.
2. ✅ `$security.hs256()` comportamento provado documentalmente (S1).
3. ✅ `ac_webhook_enabled` inicial é `false`.
4. ✅ Todos os 8 testes negativos (Fase A) produzem delta zero e retornam o HTTP esperado.
5. ✅ Todos os 5 testes funcionais (Fase B) produzem exatamente os deltas pré-definidos.
6. ✅ Rollback (C1) restaura o negócio do snapshot e cria evento compensador.
7. ✅ Repetição idempotente (C2) retorna HTTP 200 com `{ success: true, rolled_back: [], idempotent: true }` e delta 0.
8. ✅ Probe final (D1) retorna 503.
9. ✅ `ac_webhook_enabled` é restaurado para `false` ao final.
10. ✅ Nenhuma chamada externa para ActiveCampaign ou serviço externo é feita.
11. ✅ Nenhum dado real (não-`[TESTE]`) é criado ou alterado.
12. ✅ Todas as contagens finais correspondem aos deltas totais definidos.
13. ✅ S8 provado: delta de `com_vinculos_externos` confirmado (+3 ou +2).
14. ✅ S9 provado: delta de `com_execucoes_sincronizacao` confirmado (+4 ou +5).
15. ✅ S10 provado: idempotência de C2 confirmada.
16. ✅ S11 provado: delta de `com_auditoria` determinado.

### NO-GO (Qualquer um dispara PARE)

1. ❌ Qualquer item do estágio de análise estática (S1–S11) não provado.
2. ❌ Qualquer teste negativo criar registros (delta > 0).
3. ❌ Qualquer teste funcional produzir delta divergente do pré-definido.
4. ❌ Qualquer divergência de status HTTP em relação ao esperado.
5. ❌ Qualquer divergência de identidade (correlation key, external_id).
6. ❌ Qualquer divergência de flag (`ac_webhook_enabled`).
7. ❌ Qualquer divergência de assinatura ou timestamp.
8. ❌ Qualquer persistência não esperada.
9. ❌ Qualquer chamada externa detectada.
10. ❌ `ac_webhook_enabled` não restaurado para `false`.
11. ❌ Probe final não retornar 503.
12. ❌ Rollback não restaurar do snapshot.
13. ❌ Repetição idempotente (C2) criar novos eventos ou alterar o negócio.
14. ❌ C2 retornar status diferente de 200 ou body diferente do contrato.
15. ❌ Qualquer dado real criado ou alterado.
16. ❌ Delta de `com_auditoria` não determinado (S11 não provado).

---

## 12. Evidências e Tratamento

### Artefato Privado de Auditoria

O artefato privado de auditoria deve conter:

- Resultados completos de cada chamada (HTTP status, corpo da resposta).
- IDs **integrais** de todos os registros criados (eventos, execuções, vínculos, contatos, negócios, snapshots, ocorrências).
- Contagens antes/depois por coleção para cada chamada.
- Valores da flag antes/durante/depois.
- Status do probe final.
- Contagem de chamadas externas (deve ser 0).

### Sanitização

- A sanitização de IDs (primeiros 8 caracteres) pode ser usada **apenas** no resumo de chat.
- O artefato privado de auditoria contém IDs integrais.
- Nenhuma credencial, token, secret ou senha é exposta em qualquer evidência.

---

## 13. Listas Separadas

### 13.1 Ações Futuras Explicitamente Autorizáveis

> Estas ações são **futuras** e **não autorizadas** no momento. A autorização será concedida externamente após aprovação deste plano.

1. Ler `ac_webhook_enabled` em `com_parametros` (apenas leitura).
2. Modificar `ac_webhook_enabled` de `false → true` e de `true → false`.
3. Chamar `POST /backend/v1/integracao/ac/webhook` com payloads sintéticos `[TESTE]` assinados.
4. Chamar `POST /backend/v1/integracao/ac/rollback` com correlation keys sintéticas.
5. Chamar `GET /backend/v1/integracao/ac/webhook` (probe de método).
6. Capturar contagens das coleções monitoradas (apenas leitura).
7. Restaurar `ac_webhook_enabled = false` em caso de falha (única ação corretiva automática).

> **Esclarecimento:** Chamar endpoints existentes não significa alterar o backend. Nenhum arquivo de código, hook, migração, schema ou configuração é alterado. A alteração de qualquer arquivo permanece proibida.

### 13.2 Ações Proibidas

1. ❌ Registrar webhook no ActiveCampaign.
2. ❌ Fazer qualquer chamada para ActiveCampaign ou serviço externo.
3. ❌ Criar, alterar ou excluir dados reais.
4. ❌ Criar, alterar ou excluir migrações.
5. ❌ Criar, alterar ou excluir hooks.
6. ❌ Criar, alterar ou excluir rotas (`routerAdd`).
7. ❌ Alterar schema, regras de coleção ou índices.
8. ❌ Alterar RBAC, perfis, permissões ou guards.
9. ❌ Alterar configurações, `.env`, ou variáveis de ambiente.
10. ❌ Revelar, expor ou logar credenciais, tokens, secrets ou senhas.
11. ❌ Modificar locks em `com_parametros`.
12. ❌ Deletar registros `[TESTE]` ou snapshots.
13. ❌ Publicar em produção.
14. ❌ Iniciar a Porta 2E.
15. ❌ Iniciar a Porta 2D.2B (execução) sem nova autorização explícita.
16. ❌ Criar scheduler, reconciliação ou carregamento de dados.
17. ❌ Alterar arquivos de sistema (`tsconfig.json`, `vite.config.ts`, etc.).
18. ❌ Alterar o frontend.
19. ❌ Alterar o backend (código ou hooks).
20. ❌ Alterar qualquer arquivo que não seja `PLAN_PORTA_2D2B_ENTRY.md`.
21. ❌ Reutilizar ou reativar a compensação R13 v8.

---

## 14. Autorização Futura Ainda Não Concedida

> **Autorização futura ainda não concedida.**

A autorização para executar a Porta 2D.2B será redigida externamente apenas após a aprovação deste plano corrigido. Nenhum texto executável, prompt ou instrução de execução é incluído nesta seção. Nenhuma ação deve ser tomada com base neste documento sem nova autorização explícita do project owner.

---

## 15. Relatório de Correções Item por Item

| #   | Correção                                                                                                                                                                                                                                     | Status      |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 1   | **Total e fases corrigidos:** 8 negativos (A1–A8), 5 funcionais (B1–B5), 2 rollback (C1–C2), 1 probe (D1) = **16 chamadas**. B6/B7 renomeados para C1/C2 em todas as tabelas, referências e relatório final.                                 | ✅ Aplicada |
| 2   | **Ordem de execução corrigida:** confirmar flag=false; A1→503; habilitar true; A2–A8, B1–B5, C1–C2; restaurar false; D1→503.                                                                                                                 | ✅ Aplicada |
| 3   | **`com_eventos_integracao` delta unificado:** valor único +5 (B1, B3, B4, B5, C1 compensador; B2=0, C2=0). Eliminado o valor +6 de todas as seções. Derivação linha a linha incluída.                                                        | ✅ Aplicada |
| 4   | **B5 vs `com_vinculos_externos` resolvido:** delta +3 (B1, B3, B5) com B5 marcado como dependente de S8 (NO-GO até provado). Se S8 provar que B5 não cria vínculo, delta passa a +2.                                                         | ✅ Aplicada |
| 5   | **C1 execução resolvido:** C1 não cria execução (delta +4 para `com_execucoes_sincronizacao`). Marcado como dependente de S9 (NO-GO até provado). C1 row, totais e fórmula alinhados.                                                        | ✅ Aplicada |
| 6   | **C2 contrato único:** HTTP 200 com `{ success: true, rolled_back: [], idempotent: true }` e delta 0. Eliminado "200 ou 409". Dependente de S10 (NO-GO até provado).                                                                         | ✅ Aplicada |
| 7   | **Coluna Headers adicionada:** B1–B5 e C1–C2 incluem coluna Headers com `Content-Type`, `X-AC-Signature: <válido>` e `timestamp: <válido no corpo>`, sem expor secrets.                                                                      | ✅ Aplicada |
| 8   | **`com_auditoria` delta corrigido:** inferência baseada em `createRule: null` removida. Delta declarado como "a determinar na análise estática" (S11). Sem prova, NO-GO.                                                                     | ✅ Aplicada |
| 9   | **A4 e A6 corrigidos:** ambos requerem assinatura válida E timestamp válido no corpo, garantindo que cada teste falha pelo motivo específico (A4: sem tipo/id externo; A6: corpo > 256KB).                                                   | ✅ Aplicada |
| 10  | **S1–S11 como pré-requisitos NO-GO:** S1–S7 mantidos. S8 (B5 vínculo), S9 (C1 execução), S10 (C2 idempotência) e S11 (auditoria delta) adicionados. Todos são NO-GO até prova estática. Documento não declara pronto para execução.          | ✅ Aplicada |
| 11  | **Consistência geral:** todas as tabelas, GO/NO-GO, referências e relatório final atualizados para eliminar contradições.                                                                                                                    | ✅ Aplicada |
| 12  | **HMAC corrigido:** assinatura sobre bytes exatos do corpo recebido, sem canonicalização. Timestamp obrigatório, dentro de 5 minutos. Falha fechada se ausente/inválido/fora de janela. `$security.hs256()` marcado como "a comprovar" (S1). | ✅ Aplicada |
| 13  | **Rollback corrigido:** alvos identificados por correlation keys e relações estruturais. Contrato único para C1 e C2. R13 v8 não reutilizado.                                                                                                | ✅ Aplicada |
| 14  | **Prompt futuro removido:** seção "Autorização futura ainda não concedida" sem texto executável.                                                                                                                                             | ✅ Aplicada |
| 15  | **Registro final:** bloco JSON exato registrado abaixo. Único arquivo alterado: `PLAN_PORTA_2D2B_ENTRY.md`.                                                                                                                                  | ✅ Aplicada |

---

## 16. Registro Final

**Único arquivo alterado:** `PLAN_PORTA_2D2B_ENTRY.md`

**Nenhuma rota executada. Nenhum teste executado. Nenhuma query executada. Nenhum webhook executado. Nenhuma chamada externa feita. Nenhum dado alterado. Nenhum lock modificado. Nenhum código alterado. Nenhum hook alterado. Nenhum frontend alterado. Nenhum backend alterado. Nenhum schema alterado. Nenhuma migração alterada. Nenhuma configuração alterada. Nenhuma credencial exposta.**

**Porta 2D.2B: NÃO INICIADA.**
**Porta 2E: NÃO INICIADA.**
**Aguardando nova autorização explícita para executar a Porta 2D.2B.**

```json
{
  "documentation_only": true,
  "files_modified": ["PLAN_PORTA_2D2B_ENTRY.md"],
  "analysis_executed": false,
  "routes_executed": 0,
  "tests_executed": 0,
  "records_created": 0,
  "records_updated": 0,
  "records_deleted": 0,
  "parameters_modified": 0,
  "activecampaign_calls": 0,
  "porta_2d2b_started": false
}
```
