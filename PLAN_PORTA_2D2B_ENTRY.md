# Plano de Entrada — Porta 2D.2B

## 1. Objetivo e Fronteiras

### Objetivo

A Porta 2D.2B tem como objetivo validar a integração completa do webhook ActiveCampaign em modo end-to-end com tráfego real (porém sintético), garantindo que todos os mecanismos de segurança, idempotência, normalização, snapshot, rollback e auditoria funcionem de forma integrada e observável.

### Fronteiras — Dentro do Escopo

- Execução do round de testes 2D.2B com amostras exclusivamente sintéticas (`[TESTE]`).
- Validação da matriz de segurança completa (11 testes) com tráfego habilitado.
- Validação do fluxo funcional: criação de contato, idempotência, criação de negócio, atualização com snapshot, etapa sem mapeamento (ocorrência de qualidade), rollback e idempotência de rollback.
- Captura de contagens antes/depois em todas as coleções de integração.
- Coleta de evidências com IDs sanitizados.
- Verificação de zero chamadas externas para ActiveCampaign e zero dados reais.

### Fronteiras — Fora do Escopo

- ❌ Registro de webhook no ActiveCampaign.
- ❌ Chamadas para qualquer serviço externo (ActiveCampaign ou outro).
- ❌ Criação, alteração ou exclusão de registros reais.
- ❌ Alterações em contas, perfis, permissões, guards, RBAC.
- ❌ Alterações em migrações 0017 ou 0050–0059.
- ❌ Alterações em hooks existentes.
- ❌ Alterações em schema, regras de coleção ou configurações.
- ❌ Publicação em produção.
- ❌ Início da Porta 2E.
- ❌ Registro de webhook no ActiveCampaign nesta etapa.

---

## 2. Amostra Sintética

### Identificação

Toda amostra utilizada na Porta 2D.2B é **exclusivamente sintética** e deve ser identificada com a tag `[TESTE]` em todos os campos relevantes:

| Entidade      | Correlation Key    | Tag                    |
| ------------- | ------------------ | ---------------------- |
| Contato       | `TESTE-2D2B-FN-C1` | `[TESTE] 2D2B Contact` |
| Negócio       | `TESTE-2D2B-FN-D1` | `[TESTE] 2D2B Negocio` |
| Negócio (alt) | `TESTE-2D2B-FN-D2` | `[TESTE] 2D2B Sem Map` |

### Regras

- Nenhum dado real (mesmo parcial) é utilizado.
- Nenhum email real, telefone real ou CNPJ real é incluído.
- Todos os IDs externos são prefixados com `TESTE-2D2B-`.
- Todos os títulos/nomes contêm `[TESTE]`.
- Os registros sintéticos criados são **preservados** (não deletados) para auditoria.

---

## 3. Configuração do Webhook ActiveCampaign (Referência Futura)

> ⚠️ **NÃO CONFIGURAR NESTA ETAPA.** Esta seção é apenas uma referência de design documental. Nenhum webhook deve ser registrado, ativado ou testado contra o ActiveCampaign na Porta 2D.2B.

### Design de Referência (Futuro)

| Propriedade              | Valor (futuro)                                              |
| ------------------------ | ----------------------------------------------------------- |
| **Sistema de origem**    | `activecampaign`                                            |
| **URL do webhook**       | `POST /backend/v1/integracao/ac/webhook`                    |
| **Content-Type**         | `application/json`                                          |
| **Limite de corpo**      | 256 KB (262144 bytes)                                       |
| **Header de assinatura** | `X-AC-Signature: <hex_hmac_sha256>`                         |
| **Secret**               | `AC_WEBHOOK_SECRET` (vault — não exposto)                   |
| **Flag de ativação**     | `ac_webhook_enabled` em `com_parametros` (server-side only) |
| **Janela anti-replay**   | 5 minutos (300000 ms)                                       |

### Status Atual

- O endpoint do webhook existe (`ac_webhook.js`) e está **desabilitado** (flag `ac_webhook_enabled = false`).
- Nenhum webhook está registrado no ActiveCampaign.
- Nenhum tráfego externo é esperado ou permitido nesta etapa.

---

## 4. Autenticação e Semântica de Entrega

### Autenticação HMAC-SHA256

1. O corpo bruto da requisição é canonicalizado (chaves ordenadas, valores preservados).
2. Calcula-se `HMAC-SHA256(canonicalBody, AC_WEBHOOK_SECRET)` via `$security.hs256()`.
3. Compara-se com o header `X-AC-Signature` usando comparação em tempo constante (XOR byte-a-byte sem short-circuit).
4. Rejeita-se se ausente ou se a comparação falhar (HTTP 401).

### Proteção Anti-Replay

- Quando o payload contém `timestamp` ou `ts`, a janela de 5 minutos é enforced.
- Eventos fora da janela são rejeitados com HTTP 400.
- Se nenhum timestamp estiver presente, a verificação é pulada (compatibilidade).

### Idempotência

- Chave derivada: `SHA-256(sistema_origem + "|" + evento_tipo + "|" + external_id)`.
- Campo `idempotency_key` em `com_eventos_integracao` com índice UNIQUE.
- Duplicatas retornam HTTP 409 com `{ duplicate: true, event_id, status }`.
- Nenhuma duplicata cria segundo evento funcional, contato, empresa, negócio, vínculo, auditoria ou snapshot.

### Garantia de Entrega At-Least-Once

- Eventos são persistidos em `com_eventos_integracao` com status `received` antes do processamento.
- Após processamento bem-sucedido, status é atualizado para `processed`.
- Em caso de erro, status é `error` com mensagem sanitizada.
- A execução é registrada em `com_execucoes_sincronizacao` com status `processing` → `completed` / `error`.
- O rollback permite restauração a partir de snapshots imutáveis.
- A idempotência garante que reenvios não produzam efeitos colaterais duplicados.

---

## 5. Volume Esperado

### Número Máximo de Chamadas

| Fase                 | Chamadas Máximas |
| -------------------- | ---------------- |
| Matriz de segurança  | 11               |
| Fluxo funcional      | 7                |
| Rollback             | 2                |
| Probe de desativação | 1                |
| **Total máximo**     | **21**           |

### Número Esperado de Registros Processados

| Coleção                       | Registros Esperados (antes → depois)                                       |
| ----------------------------- | -------------------------------------------------------------------------- |
| `com_eventos_integracao`      | +5 (3 funcionais + 1 compensador + 1 de teste de segurança que pode criar) |
| `com_execucoes_sincronizacao` | +5                                                                         |
| `com_vinculos_externos`       | +2 (1 contato + 1 negócio)                                                 |
| `com_contatos`                | +1                                                                         |
| `com_negocios`                | +2                                                                         |
| `com_snapshots_negocio`       | +1                                                                         |
| `com_ocorrencias_qualidade`   | +1                                                                         |

> Valores exatos dependem do modo (security-only vs full). O modo default é `security-only` (8 testes, 0 registros funcionais). O modo `full` executa os 7 testes funcionais adicionais.

---

## 6. Contagens Antes/Depois

### Coleções Monitoradas

| Coleção                       | Campo no JSON de evidência |
| ----------------------------- | -------------------------- |
| `com_eventos_integracao`      | `eventos`                  |
| `com_execucoes_sincronizacao` | `execucoes`                |
| `com_vinculos_externos`       | `vinculos`                 |
| `com_negocios`                | `negocios`                 |
| `com_snapshots_negocio`       | `snapshots`                |
| `com_ocorrencias_qualidade`   | `ocorrencias`              |

### Captura

- `counts_before`: capturado antes de qualquer teste.
- `counts_after`: capturado após todos os testes.
- Contagens por teste (before/after) também são capturadas individualmente.
- Qualquer delta não esperado é um critério de NO-GO.

---

## 7. Critérios GO/NO-GO

### GO (Todos devem ser verdadeiros)

1. ✅ Todos os 3 secrets (`AC_API_URL`, `AC_API_KEY`, `AC_WEBHOOK_SECRET`) estão PRESENTES.
2. ✅ Teste hs256 (RFC 4231 Test Case 2) passa.
3. ✅ Perfil `integracao` existe e está ativo.
4. ✅ Conta técnica `integracao` existe e é única.
5. ✅ Flag `ac_webhook_enabled` pode ser lida e escrita.
6. ✅ Todos os 11 testes da matriz de segurança passam.
7. ✅ Fluxo funcional completo passa (contact create, idempotency replay 409, deal create, deal update snapshot, unmapped stage quality occurrence, rollback, rollback idempotency).
8. ✅ Nenhuma chamada externa para ActiveCampaign é feita.
9. ✅ Nenhum dado real é criado ou alterado.
10. ✅ Flag é restaurada para `false` ao final.
11. ✅ Probe final retorna 503 (webhook desabilitado).
12. ✅ Todas as contagens antes/depois são consistentes com o esperado.

### NO-GO (Qualquer um dispara)

1. ❌ Qualquer secret ausente.
2. ❌ Teste hs256 falha.
3. ❌ Qualquer teste da matriz de segurança falha.
4. ❌ Qualquer teste funcional falha.
5. ❌ Registros são criados por testes de segurança que deveriam bloquear (test 7/8).
6. ❌ Qualquer chamada externa para ActiveCampaign é detectada.
7. ❌ Flag não é restaurada para `false` ao final.
8. ❌ Probe final não retorna 503.
9. ❌ Contagens mostram registros não esperados.

---

## 8. Rollback e Compensação

### Estratégia (Documental — Não Executada)

| Aspecto                 | Descrição                                                         |
| ----------------------- | ----------------------------------------------------------------- |
| **Escopo**              | Apenas entidades criadas no round atual (`TESTE-2D2B-FN-*`)       |
| **Localização**         | Via `com_vinculos_externos` (link composto) + `record_id` interno |
| **Restauração**         | A partir do snapshot mais recente em `com_snapshots_negocio`      |
| **Compensação**         | Evento compensador criado em `com_eventos_integracao`             |
| **Sem deletes físicos** | Registros são restaurados ou desativados, nunca removidos         |
| **Histórico**           | Snapshots e eventos são preservados (imutáveis)                   |
| **Idempotência**        | Re-execução do rollback retorna 200 ou 404 sem efeitos colaterais |

### Status

- ⚠️ **Nenhum mecanismo de rollback é criado, alterado ou executado nesta etapa.**
- O endpoint `POST /backend/v1/integracao/ac/rollback` já existe e está desabilitado.
- A estratégia é descrita apenas como referência documental.

---

## 9. Evidências e Validação Independente

### Evidências Obrigatórias

| #   | Evidência                                | Fonte                                        |
| --- | ---------------------------------------- | -------------------------------------------- |
| 1   | Matriz de segurança completa (11 testes) | JSON de resposta do round                    |
| 2   | Fluxo funcional com PASS/FAIL            | JSON de resposta do round                    |
| 3   | Contagens antes/depois por coleção       | `counts_before` / `counts_after`             |
| 4   | Flag antes/durante/depois                | `flag_before` / `flag_during` / `flag_final` |
| 5   | Probe final (503)                        | `final_webhook_probe_status`                 |
| 6   | Ledger de evidências com IDs sanitizados | `evidence_ids` (primeiros 8 caracteres)      |
| 7   | Zero chamadas externas                   | `activecampaign_calls: 0`                    |
| 8   | Zero dados reais                         | Todos os registros com tag `[TESTE]`         |
| 9   | Rollback restaurado do snapshot          | `rollback.restored = true`                   |
| 10  | Idempotência de rollback                 | `rollback_idempotency.pass = true`           |

### Validação Independente

- Verificação manual das contagens em `com_parametros` (flag).
- Verificação manual de que nenhum registro sem `[TESTE]` foi criado.
- Verificação manual de que o lock `ac_r13_execution_lock` (se existir) está `consumed`.
- Verificação de que `ac_webhook_enabled` está `false` ao final.
- Verificação de que nenhum hook foi alterado.

---

## 10. Critérios de PARE Imediato

### PARE — Pausar, Analisar, Refletir, Engajar

O PARE deve ser aplicado **imediatamente** se qualquer um dos seguintes critérios for disparado:

1. 🔴 Qualquer teste da matriz de segurança falhar.
2. 🔴 Registros forem criados por testes de segurança que deveriam bloquear (test 7: missing signature, test 8: invalid signature).
3. 🔴 Qualquer chamada externa para ActiveCampaign for detectada.
4. 🔴 Qualquer dado real (não-`[TESTE]`) for criado ou alterado.
5. 🔴 A flag `ac_webhook_enabled` não puder ser restaurada para `false`.
6. 🔴 O probe final não retornar 503.
7. 🔴 O rollback falhar.
8. 🔴 O snapshot não for criado antes da atualização do negócio.
9. 🔴 Qualquer alteração fora do escopo `TESTE-2D2B-` for detectada.
10. 🔴 Qualquer hook, migração, schema ou configuração for alterada.
11. 🔴 Qualquer lock for modificado.
12. 🔴 Qualquer credencial, token ou secret for exposto.

### Ação ao Disparar PARE

- Desabilitar o webhook imediatamente.
- Retornar toda a evidência coletada até o ponto de parada.
- Registrar o motivo da parada.
- Não iniciar nenhuma ação corretiva sem nova autorização explícita.

---

## 11. Ações Proibidas

A lista abaixo é **completa e exaustiva**. Nenhuma ação fora desta lista é permitida, e todas as ações listadas são **proibidas**:

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
19. ❌ Alterar o backend.
20. ❌ Alterar qualquer arquivo que não seja `PLAN_PORTA_2D2B_ENTRY.md`.

---

## 12. Prompt Futuro Sugerido (NÃO AUTORIZADO)

> ⚠️ **NÃO AUTORIZADO — DOCUMENTAÇÃO APENAS.** O prompt abaixo é uma sugestão para execução futura da Porta 2D.2B. Ele **NÃO DEVE SER EXECUTADO** nesta etapa. Nenhuma ação deve ser tomada com base neste prompt sem nova autorização explícita do project owner.

```
[NÃO AUTORIZADO] Prompt sugerido para execução futura da Porta 2D.2B:

Como project owner, autorizo a execução da Porta 2D.2B com as seguintes condições:

1. Executar o round 2D.2B em modo "full" via POST /backend/v1/integracao/ac/run-round-2d2a-r13 (ou versão equivalente).
2. Todos os testes da matriz de segurança devem passar.
3. Todos os testes do fluxo funcional devem passar.
4. Zero chamadas externas para ActiveCampaign.
5. Zero dados reais.
6. Flag restaurada para false ao final.
7. Probe final deve retornar 503.
8. Aplicar PARE imediato se qualquer critério de NO-GO for disparado.
9. Preservar todos os registros [TESTE] para auditoria.
10. Não iniciar a Porta 2E.

Este prompt é apenas uma referência documental. NÃO EXECUTAR.
```

---

## Declaração Final

```json
{
  "documentation_only": true,
  "plan_created": true,
  "routes_executed": 0,
  "records_created": 0,
  "records_updated": 0,
  "records_deleted": 0,
  "locks_modified": 0,
  "code_files_modified": 0,
  "activecampaign_calls": 0,
  "porta_2d2b_started": false,
  "porta_2e_started": false
}
```

---

## Status

- **Arquivo criado:** `PLAN_PORTA_2D2B_ENTRY.md` (único arquivo criado).
- **PARE aplicado:** Sim — nenhuma rota, webhook, dado, lock, hook, frontend, backend, schema, migração, configuração, credencial ou serviço externo foi executado, testado, publicado ou alterado.
- **Nenhuma chamada para ActiveCampaign ou serviço externo foi feita.**
- **Porta 2D.2B NÃO iniciada.**
- **Porta 2E NÃO iniciada.**
- **Aguardando nova autorização explícita para executar a Porta 2D.2B.**
