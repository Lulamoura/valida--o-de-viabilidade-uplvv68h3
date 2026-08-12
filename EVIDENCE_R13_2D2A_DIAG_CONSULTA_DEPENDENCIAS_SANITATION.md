# Porta 2D.2A — Readiness Sanitation (Saneamento de Prontidão)

## Diagnóstico de Consulta de Dependências — Correção de Nomenclatura

**Data:** 2026-08-12  
**Tipo:** Somente documentação e correção de metadados/nomenclatura  
**Execução:** Zero — nenhuma rota chamada, nenhum botão clicado, nenhum lock consumido

---

## 1. Análise do Rótulo "R14"

### Veredito: "R14" é apenas um rótulo impróprio — nenhum escopo funcional R14 foi avançado

**Evidência documental (sem execução):**

1. **Hook `ac_diag_consulta_dependencias.js`**: É uma consulta somente-leitura contra `com_ocorrencias_qualidade` com filtro fixo `execucao_id = "62otoics23ul0vy"`. Não contém lógica de criação, atualização ou exclusão de registros.
2. **Nenhuma migração nova** foi criada sob R14 — a próxima migração disponível permanece 0059.
3. **Nenhuma alteração de coleção, RBAC, webhook, runner, segredos ou integrações** foi introduzida.
4. **O lock** (`ac_diag_consulta_dependencias_lock`) é independente e somente-leitura — não realiza compensação, não exclui registros, não faz chamadas ActiveCampaign.
5. **A consulta de dependências** pertence à fase diagnóstica 2D.2A/R13 — mesma fase que `diag-transport` e `diag-compensacao-auditoria`.

### Artefatos revisados

- `pocketbase/hooks/ac_diag_consulta_dependencias.js`
- `src/components/foundation/DiagConsultaDependenciasBlock.tsx`

---

## 2. Correção de Nomenclatura

Os mesmos artefatos foram republicados **sem nenhuma alteração funcional**, sob versões pertencentes a Porta 2D.2A/R13:

| Artefato          | Rótulo Anterior (impróprio)                           | Rótulo Corrigido                                            |
| ----------------- | ----------------------------------------------------- | ----------------------------------------------------------- |
| Backend (hook)    | `R14-DIAG-CONSULTA-DEPENDENCIAS-20260812-v1`          | `R13/2D.2A-DIAG-CONSULTA-DEPENDENCIAS-20260812-v1`          |
| Frontend (bundle) | `R14-DIAG-CONSULTA-DEPENDENCIAS-FRONTEND-20260812-v1` | `R13/2D.2A-DIAG-CONSULTA-DEPENDENCIAS-FRONTEND-20260812-v1` |

**Nenhuma alteração funcional foi feita:**

- Lógica: inalterada
- Filtro fixo server-side: `execucao_id = "62otoics23ul0vy"` — inalterado
- Lock: `ac_diag_consulta_dependencias_lock` — permanece `armed`
- Webhook, runner, RBAC, migrações, coleções, segredos, integrações: inalterados

---

## 3. Janela Temporal UTC

A lógica de classificação deriva a janela temporal em runtime a partir do registro alvo de execução (`com_execucoes_sincronizacao`, id=`62otoics23ul0vy`):

- **Início da janela:** campo `inicio` do registro de execução (string de data UTC)
- **Fim da janela:** campo `fim` do registro de execução (string de data UTC)
- **Campo comparado:** `created` (em `com_ocorrencias_qualidade`)
- **Condição dentro-da-janela:** `created >= inicio AND created <= fim`
- **Antes da janela:** `created < inicio`

Como nenhuma execução foi permitida nesta tarefa, os valores exatos de runtime não são materializados aqui. A janela é definida server-side a partir do registro de execução alvo.

---

## 4. Regras de Classificação (Literais)

### DIAGNOSTIC_OWNED

`execucao_id` corresponde ao alvo AND origem corresponde ao transporte diagnóstico (activecampaign) AND `created` dentro da janela de execução (inicio..fim) AND tipo/severidade/descricao consistentes com o diagnóstico.

### PREEXISTENT

`created` antes da janela diagnóstica OU pertence a origem diferente.

### INCONCLUSIVE

Propriedade diagnóstica não pode ser comprovada — NUNCA presumida como deletável.

### Gatilhos de INCONCLUSIVE (literais)

Qualquer um dos seguintes resulta em `INCONCLUSIVE` — nunca `DIAGNOSTIC_OWNED`:

- `sistema_origem` ausente ou vazio
- `tipo` ou `descricao` genéricos (não consistentes com padrões diagnósticos)
- Timestamp ausente ou fora da janela (`created` fora de `inicio..fim`)
- Qualquer evidência divergente que impeça comprovar todas as quatro condições de `DIAGNOSTIC_OWNED` simultaneamente

---

## 5. Confirmação de Proteção

- A classificação **não autoriza nenhuma exclusão**
- O campo `deletable` é `false` para TODOS os registros na resposta
- Registros `PREEXISTENT` permanecem **expressamente protegidos**
- Registros `INCONCLUSIVE` permanecem **expressamente protegidos**
- Apenas registros `DIAGNOSTIC_OWNED` podem ser considerados para futura compensação

---

## 6. Estado de Prontidão (JSON Literal)

```json
{
  "dependency_query_executed": false,
  "dependency_query_lock": "armed",
  "original_audit_lock": "consumed",
  "deletion_executed": false,
  "activecampaign_calls": 0
}
```

---

## 7. Escopo Bloqueado (Permanece)

- R14 escopo funcional: **BLOQUEADO**
- Compensação: **BLOQUEADO**
- Porta 2D.2B: **BLOQUEADO**
- Porta 2E: **BLOQUEADO**

---

## 8. Evidência Sanitizada

- Nenhum registro criado, atualizado ou excluído
- Nenhum dado buscado do banco
- Nenhuma rota chamada
- Nenhum botão clicado
- Nenhum lock consumido
- Nenhuma chamada ActiveCampaign
- Nenhuma migração criada
- Nenhuma coleção alterada
- Nenhum RBAC alterado
- Nenhum segredo alterado
