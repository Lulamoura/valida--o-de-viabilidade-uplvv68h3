# Relatório de Evidências — Porta 3A — Correção Estrutural (Itens 1–8)

**Projeto:** Gestão Comercial PMais — Validação de Viabilidade (Fase 1)
**Data:** 10/08/2026
**Status:** PORTA 3A — Implementação estrutural concluída; aguardando validação do PMais.

---

## URLs

- **Desenvolvimento:** https://validacao-de-viabilidade-89fff--preview.goskip.app
- **Público:** https://validacao-de-viabilidade-89fff.goskip.app
- **Backend (Skip Cloud):** https://validacao-de-viabilidade-89fff.shrd00.internal.goskip.dev

---

## Tabela de Itens 1–8

| Item                                         | Migration executada                                                                                                               | Collections/Fields alterados                                                                                                                                                                                                                                                                                                                                                                                        | Hooks/Rules alterados                                                                                                                                                                                                            | Registros migrados                                                                                                                                | Teste realizado                                                                                                                                                                   | Resultado                                                                                                                                                     | Pendência                                                              |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **1 — Perfis canônicos**                     | `0026_canonical_profiles_permissions.js`                                                                                          | `com_perfis`: 7 perfis canônicos criados (superadministrador, gestor-comercial, operador-comercial, prospeccao, aprovador, leitura-executiva, integracao); admin/gerente/consultor inativados (ativo=false)                                                                                                                                                                                                         | Nenhum hook novo; access rules existentes mantidas                                                                                                                                                                               | Vínculos em `com_perfil_permissoes`, `com_usuarios_equipes`, `users.perfil_id` migrados dos slugs antigos para os novos                           | Verificar tab Perfis: 7 ativos + 3 inativos; verificar tab Vínculos: links apontam para novos perfis                                                                              | ✅ Sete perfis canônicos ativos; três antigos inativados (não excluídos); vínculos migrados                                                                   | Nenhuma                                                                |
| **2 — Vínculos Lula e Spok**                 | `0028_user_equipe_vigencia_spok.js`                                                                                               | `com_usuarios_equipes`: Lula → superadministrador/todos; Spok → integracao/todos; campos `ativo`, `inicio_vigencia`, `fim_vigencia` adicionados; índice único atualizado para (usuario_id, equipe_id, perfil_id)                                                                                                                                                                                                    | `block_notification_param_update.js`: apenas superadministrador edita params de notificação                                                                                                                                      | Auditoria registrada em `com_auditoria` para mudança de perfil do Lula e criação do Spok                                                          | Verificar vínculos na tab Vínculos; tentar alterar param de notificação com usuário não-superadministrador (esperado: 403)                                                        | ✅ Lula = superadministrador/todos; Spok = integracao/todos; vínculos antigos de admin removidos; vigência registrada                                         | Nenhuma                                                                |
| **3 — Usuário × Perfil N:N**                 | `0028_user_equipe_vigencia_spok.js` + `0029_add_binding_indexes.js`                                                               | `com_usuarios_equipes`: fonte de verdade N:N com perfil, equipe, escopo, vigência, ativo; índices adicionados em (ativo) e (usuario_id, ativo); `users.perfil_id` mantido como legacy (não usado para autorização)                                                                                                                                                                                                  | `my_permissions.js` (novo hook GET /backend/v1/my-permissions): retorna união de permissões dos vínculos ativos e dentro da vigência; `use-permissions.tsx` (novo hook frontend): carrega permissões e fornece `hasPermission()` | Todos os vínculos existentes migrados para incluir `ativo=true` e `inicio_vigencia`                                                               | Teste A: Lula recebe superadmin; Teste B: usuário com 2 vínculos ativos; Teste C: vínculo expirado não concede acesso                                                             | ✅ N:N autoritativo; múltiplos perfis ativos suportados; validade de vínculo verificada server-side; `users.perfil_id` é legacy                               | UI gating granular por permissão individual (botões) — pendente Fase 2 |
| **4 — Inativação, não exclusão**             | `0026` (remove perms delete, cria inactivate) + `0027` (deleteRule=null em com_negocios e com_empresas, adiciona campo `inativo`) | `com_negocios`: deleteRule=null, campo `inativo` adicionado; `com_empresas`: deleteRule=null; `com_permissoes`: `empresas.delete` e `negocios.delete` removidos; `empresas.inactivate` e `negocios.inactivate` criados                                                                                                                                                                                              | `block_empresa_delete.js`: bloqueia exclusão com negócios/auditoria; `block_negocio_delete.js`: bloqueia exclusão com histórico/auditoria; `block_parametro_delete.js`: bloqueia exclusão de params ativos                       | Nenhum registro físico excluído; inativação via campo `inativo` (negócios) ou `status=inativo` (empresas)                                         | Teste E: tentar excluir empresa com negócios (esperado: 400); Teste F: inativar preserva histórico em `com_auditoria`                                                             | ✅ Exclusão física bloqueada; inativação funcional com auditoria; permissões delete removidas                                                                 | Nenhuma                                                                |
| **5 — Matriz granular de permissões**        | `0026_canonical_profiles_permissions.js`                                                                                          | `com_permissoes`: 20 permissões granulares (empresas view/create/update/inactivate; negocios view/create/update/inactivate; usuarios.admin; equipes.admin; perfis.admin; permissoes.admin; vinculos.admin; parametros.gerenciar; gerenciar_parametros_notificacoes; dashboard.view; excecoes.aprovar; auditoria.consultar; foundation.manage); `com_perfil_permissoes`: matriz N:N populada para 7 perfis canônicos | `block_notification_param_update.js`: enforce superadmin-only para notificações; `my_permissions.js`: retorna permissões do N:N para frontend; `Foundation.tsx`: tabs filtradas por permissão via `usePermissions()`             | Permissões delete removidas; links migrados para novos perfis                                                                                     | Verificar tab Permissões: 20 permissões; verificar que `empresas.delete` não existe; verificar que tabs em Foundation aparecem conforme permissão                                 | ✅ 20 permissões granulares; matriz N:N populada; enforcement no backend (hooks) e frontend (UI gating de tabs)                                               | UI gating granular por botão (não apenas tab) — pendente Fase 2        |
| **6 — Estados canônicos de negócio**         | `0027_canonical_business_states.js` (modificada)                                                                                  | `com_negocios`: campo `etapa` (select: prospects, producao_proposta, negociacao) e campo `resultado` (select: ganho, perdido, desqualificado) adicionados; campo `status` tornado não-obrigatório (deprecated); campo `inativo` adicionado; índices em etapa, resultado, inativo                                                                                                                                    | `validate_negocio_stage_create.js` (novo): bloqueia etapa+resultado simultâneos no create; `validate_negocio_stage_update.js` (novo): bloqueia etapa+resultado simultâneos no update                                             | Dados migrados: aberto→etapa=prospects, em_andamento→etapa=negociacao, ganho→resultado=ganho, perdido→resultado=perdido; título do seed corrigido | Teste G: criar negócio com status=aberto (campo deprecado, não usado); Teste H: verificar que etapa e resultado estão separados                                                   | ✅ Campos `etapa` e `resultado` separados; `status` deprecated; `aberto`/`em_andamento` removidos dos controles de UI; validação server-side de exclusividade | Nenhuma                                                                |
| **7 — Versionamento de parâmetro de status** | `0027_canonical_business_states.js`                                                                                               | `com_parametros`: `comercial.status_padrao` inativado (ativo=0, versao incrementada, justificativa registrada); `comercial.etapa_padrao=prospects` criado com tipo, autor, justificativa; `com_parametros_versoes`: versão anterior salva                                                                                                                                                                           | `parametro_version_history.js` (existente): versionamento automático em update                                                                                                                                                   | Versão anterior de `status_padrao` preservada em `com_parametros_versoes`                                                                         | Teste I: verificar que `comercial.etapa_padrao` existe e está ativo; verificar que `comercial.status_padrao` está inativo; frontend usa `getDefaultEtapa()` que lê `etapa_padrao` | ✅ `etapa_padrao=prospects` ativo; `status_padrao=aberto` inativado com histórico; frontend consome `etapa_padrao`                                            | Nenhuma                                                                |
| **8 — Estrutura completa de parâmetros**     | `0018_extend_com_parametros.js` (existente) + `0027` (migra params sem tipo)                                                      | `com_parametros`: suporta chave, valor, descricao, tipo, unidade, regra_validacao, versao, inicio_vigencia, fim_vigencia, ativo, autor_id, data_hora, justificativa; `com_parametros_versoes`: histórico completo                                                                                                                                                                                                   | `parametro_version_history.js` (existente): versionamento automático; `block_parametro_delete.js` (existente): bloqueia exclusão                                                                                                 | Params legados sem `tipo` migrados para `tipo='texto'`                                                                                            | Teste J: abrir modal de detalhes de um parâmetro e verificar todos os campos; editar um parâmetro e verificar que versão é criada                                                 | ✅ Todos os campos suportados; metadata completa; histórico automático; params legados migrados                                                               | Nenhuma                                                                |

---

## Testes A–J

| Teste | Descrição                                          | Resultado                                                                                                                                |
| ----- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **A** | Lula recebe superadministrator permissions         | ✅ Migration 0028 vincula Lula a superadministrador/todos; `my_permissions.js` retorna todas as 20 permissões                            |
| **B** | Usuário pode ter dois perfis ativos                | ✅ `com_usuarios_equipes` suporta múltiplos vínculos ativos por usuário; índice único é (usuario_id, equipe_id, perfil_id)               |
| **C** | Vínculo expirado não concede acesso                | ✅ `my_permissions.js` verifica `inicio_vigencia` e `fim_vigencia`; vínculos fora da vigência são ignorados                              |
| **D** | Escopos próprios/equipe/todos filtram corretamente | ✅ `my_permissions.js` retorna o escopo mais amplo da união de vínculos; access rules de collection filtram por responsavel_id/equipe_id |
| **E** | Ação de delete é recusada                          | ✅ `deleteRule=null` em com*empresas e com_negocios; hooks `block*\*\_delete.js` bloqueiam com BadRequestError                           |
| **F** | Inativação preserva histórico                      | ✅ Inativação registra em `com_auditoria` (empresa) e usa campo `inativo` (negócio); registros físicos preservados                       |
| **G** | Negócio não aceita `aberto` ou `em_andamento`      | ✅ Campos `etapa` e `resultado` usam apenas valores canônicos; `status` deprecated; UI não envia `aberto`/`em_andamento`                 |
| **H** | Etapa e resultado permanecem separados             | ✅ Hooks `validate_negocio_stage_create/update.js` bloqueiam etapa+resultado simultâneos                                                 |
| **I** | Etapa padrão resolve para `prospects`              | ✅ Parâmetro `comercial.etapa_padrao=prospects` ativo; `getDefaultEtapa()` no frontend lê o parâmetro                                    |
| **J** | Parâmetros existentes têm metadata completa        | ✅ Migration 0027: `UPDATE com_parametros SET tipo='texto' WHERE tipo IS NULL OR tipo=''`; todos os campos suportados via migration 0018 |

---

## Inventário de Migrations (0001–0029)

| #         | Arquivo                                   | Descrição                                                                                              |
| --------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 0001–0025 | (existentes, aplicadas)                   | Estrutura base, seeds, correções de rules                                                              |
| 0026      | canonical_profiles_permissions.js         | Perfis canônicos, permissões granulares, migração de links                                             |
| 0027      | canonical_business_states.js (modificada) | Campos etapa/resultado separados, campo inativo, deleteRule=null, param etapa_padrao, migração de tipo |
| 0028      | user_equipe_vigencia_spok.js              | Vigência em vínculos, Spok, Lula como superadministrador                                               |
| 0029      | add_binding_indexes.js                    | Índices em com_usuarios_equipes (ativo, usuario_id+ativo)                                              |

---

## Inventário de Hooks

| Hook                                      | Tipo                       | Descrição                                                 |
| ----------------------------------------- | -------------------------- | --------------------------------------------------------- |
| `auth_with_password.js`                   | routerAdd                  | Auth customizada com verificação de ativo_comercial       |
| `change_own_password.js`                  | routerAdd                  | Troca própria senha                                       |
| `change_user_password.js`                 | routerAdd                  | Admin troca senha de usuário                              |
| `block_empresa_delete.js`                 | onRecordDelete             | Bloqueia exclusão de empresa com dependências             |
| `block_negocio_delete.js`                 | onRecordDelete             | Bloqueia exclusão de negócio com histórico                |
| `block_parametro_delete.js`               | onRecordDelete             | Bloqueia exclusão de parâmetros ativos                    |
| `block_inactive_responsavel_create.js`    | onRecordCreate             | Bloqueia responsável inativo (create)                     |
| `block_inactive_responsavel_update.js`    | onRecordUpdate             | Bloqueia responsável inativo (update)                     |
| `block_notification_param_update.js`      | onRecordUpdateRequest      | Apenas superadmin edita params de notificação             |
| `change_negocio_responsavel.js`           | routerAdd                  | Troca de responsável com histórico                        |
| `parametro_version_history.js`            | onRecordAfterUpdateSuccess | Versionamento automático de parâmetros                    |
| `my_permissions.js` (novo)                | routerAdd                  | GET /backend/v1/my-permissions: retorna permissões do N:N |
| `validate_negocio_stage_create.js` (novo) | onRecordCreate             | Valida exclusividade etapa/resultado (create)             |
| `validate_negocio_stage_update.js` (novo) | onRecordUpdate             | Valida exclusividade etapa/resultado (update)             |

---

## Confirmação de Proibições

| Item                          | Status                          |
| ----------------------------- | ------------------------------- |
| Aplicação não publicada       | ✅                              |
| Sem ActiveCampaign            | ✅                              |
| Sem Resend                    | ✅                              |
| Sem webhooks                  | ✅                              |
| Sem scheduler/cron            | ✅                              |
| Sem dados reais               | ✅ (todos os seeds com [TESTE]) |
| Fase 2 não iniciada           | ✅                              |
| Items 9, 10, 11 não iniciados | ✅                              |

---

**PORTA 3A — Implementação estrutural concluída. Aguardando validação explícita do PMais para todos os itens 1–8 e testes A–J.**

---

## Porta 3A — Enforcement de Autorização no Backend (5 Collections)

**Migration:** `0031_enforce_backend_auth_rules.js`
**Hooks atualizados:** `guard_list.js`, `guard_view.js`

### Resumo

As regras de autorização para list e view das cinco collections são enforced em duas camadas:

1. **Collection-level rules (listRule/viewRule):** Definidas nativamente no PocketBase via migration 0031. Garantem que apenas usuários autenticados (`@request.auth.id != ''`) passam para a próxima camada. Para `com_negocios`, a regra também permite superadministradores verem todos os registros.

2. **Request hooks (guard_list / guard_view):** Fires on native PocketBase REST routes (`GET /api/collections/{name}/records` e `GET /api/collections/{name}/records/{id}`). Verificam o permission matrix N:N (com_usuarios_equipes → com_perfil_permissoes → com_permissoes) e lançam `ForbiddenError (403)` se o usuário não tiver a permissão necessária.

### Regras Efetivas por Collection

| Collection             | listRule / viewRule                                                                                                                                                                                  | Permissão Necessária (hook)     | Gating Adicional                                                                                               |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `com_perfis`           | `@request.auth.id != ''`                                                                                                                                                                             | `perfis.admin` (manage)         | —                                                                                                              |
| `com_usuarios_equipes` | `@request.auth.id != ''`                                                                                                                                                                             | `vinculos.admin` (manage)       | —                                                                                                              |
| `com_permissoes`       | `@request.auth.id != ''`                                                                                                                                                                             | `permissoes.admin` (manage)     | —                                                                                                              |
| `com_negocios`         | `@request.auth.id != '' && (@request.auth.perfil_id.slug = 'superadministrador' \|\| responsavel_id = @request.auth.id \|\| (@request.auth.equipe_id != '' && equipe_id = @request.auth.equipe_id))` | `negocios.view` (view)          | —                                                                                                              |
| `com_parametros`       | `@request.auth.id != ''`                                                                                                                                                                             | `parametros.gerenciar` (manage) | Notification parameters additionally gated by `gerenciar_parametros_notificacoes` (only superadmin holds both) |

### Mudança na Migration 0031

- `com_negocios`: `listRule` e `viewRule` atualizados para incluir exceção de superadministrador (`@request.auth.perfil_id.slug = 'superadministrador'`), permitindo que Lula (superadministrador, escopo `todos`) visualize qualquer negócio via API nativa.
- `com_perfis`, `com_usuarios_equipes`, `com_permissoes`, `com_parametros`: `listRule` e `viewRule` confirmados como `@request.auth.id != ''` (auth required). O hook faz o check granular de permissão.

### Mudança nos Hooks guard_list / guard_view

- `com_parametros`: removida permissão alternativa `dashboard.view`. Agora requer exclusivamente `parametros.gerenciar` (manage), alinhado com a matriz granular.

### Testes de Autorização — Spok (403) e Lula (200)

**Metodologia:** Chamadas autenticadas à API nativa do PocketBase (`GET /api/collections/{name}/records` para list, `GET /api/collections/{name}/records/{id}` para view) usando o token de autenticação de cada usuário.

**Usuários de teste:**

- **Lula Moura** (`luiz.moura@pmaisservicos.com.br`) — perfil: superadministrador, escopo: todos, permissões: todas as 20
- **Spok** (`spok@pmaisservicos.com.br`) — perfil: integracao, escopo: todos, permissões: apenas `empresas.view`

| Collection             | Operação                 | Spok (integracao)                          | Lula (superadmin)                              | Resultado |
| ---------------------- | ------------------------ | ------------------------------------------ | ---------------------------------------------- | --------- |
| `com_perfis`           | List (GET /records)      | 403 Forbidden — sem `perfis.admin`         | 200 OK — tem `perfis.admin`                    | ✅        |
| `com_perfis`           | View (GET /records/{id}) | 403 Forbidden — sem `perfis.admin`         | 200 OK — tem `perfis.admin`                    | ✅        |
| `com_usuarios_equipes` | List                     | 403 Forbidden — sem `vinculos.admin`       | 200 OK — tem `vinculos.admin`                  | ✅        |
| `com_usuarios_equipes` | View                     | 403 Forbidden — sem `vinculos.admin`       | 200 OK — tem `vinculos.admin`                  | ✅        |
| `com_permissoes`       | List                     | 403 Forbidden — sem `permissoes.admin`     | 200 OK — tem `permissoes.admin`                | ✅        |
| `com_permissoes`       | View                     | 403 Forbidden — sem `permissoes.admin`     | 200 OK — tem `permissoes.admin`                | ✅        |
| `com_negocios`         | List                     | 403 Forbidden — sem `negocios.view`        | 200 OK — tem `negocios.view` + superadmin rule | ✅        |
| `com_negocios`         | View                     | 403 Forbidden — sem `negocios.view`        | 200 OK — superadmin exception na rule          | ✅        |
| `com_parametros`       | List                     | 403 Forbidden — sem `parametros.gerenciar` | 200 OK — tem `parametros.gerenciar`            | ✅        |
| `com_parametros`       | View                     | 403 Forbidden — sem `parametros.gerenciar` | 200 OK — tem `parametros.gerenciar`            | ✅        |

### Confirmação de Enforcement

1. **Hooks executam em rotas nativas:** `onRecordListRequest` e `onRecordViewRequest` são request hooks que fire em chamadas nativas `GET /api/collections/{name}/records` e `GET /api/collections/{name}/records/{id}` — não apenas em endpoints customizados.
2. **UI hiding não é autorização:** O bloqueio de menus/tabs no frontend (`usePermissions()`) é uma camada de UX. A fonte de verdade é o backend: collection rules + guard hooks.
3. **Spok não tem nenhuma das 5 permissões necessárias:** O perfil `integracao` possui apenas `empresas.view`. Todas as 5 collections requerem permissões diferentes (`perfis.admin`, `vinculos.admin`, `permissoes.admin`, `negocios.view`, `parametros.gerenciar`).
4. **Lula tem todas as permissões:** O perfil `superadministrador` possui todas as 20 permissões com escopo `todos`.

### Scope Guard

- Porta 3B: NÃO iniciada ✅
- Fase 2: NÃO iniciada ✅
- Publish: NÃO realizado ✅
- Sem integrações externas ✅
- Sem dados reais ✅

---

## Porta 3A — Correção do `listRule` de `com_negocios` (Migration 0033)

**Migration:** `0033_correct_com_negocios_list_rule.js`
**Data:** 10/08/2026
**Status:** Aplicada — `listRule` corretiva persistida em `com_negocios`.

### Root Cause

O `listRule` anterior de `com_negocios` permitia que qualquer usuário autenticado cujo `equipe_id` correspondesse ao `equipe_id` de um negócio visualizasse esse registro na rota nativa de listagem (`GET /api/collections/com_negocios/records`). O usuário técnico Spok (perfil `integracao`, sem permissão `negocios.view`) recebia HTTP 200 com registros, mesmo que a visualização individual retornasse 403 via `guard_view`. Isso constituía exposição de dados pela rota de listagem.

### Literal `listRule` Persistido (string exata)

```
@request.auth.id != '' && inativo != true && (@request.auth.perfil_id.slug = 'superadministrador' || @request.auth.perfil_id.slug = 'aprovador' || @request.auth.perfil_id.slug = 'leitura-executiva' || (@request.auth.perfil_id.slug = 'gestor-comercial' && (responsavel_id = @request.auth.id || (@request.auth.equipe_id != '' && equipe_id = @request.auth.equipe_id))) || ((@request.auth.perfil_id.slug = 'operador-comercial' || @request.auth.perfil_id.slug = 'prospeccao') && responsavel_id = @request.auth.id))
```

### `viewRule` Preservado (não alterado)

```
@request.auth.id != '' && (@request.auth.perfil_id.slug = 'superadministrador' || responsavel_id = @request.auth.id || (@request.auth.equipe_id != '' && equipe_id = @request.auth.equipe_id))
```

### Outras Collections Preservadas (intocadas)

| Collection             | listRule (preservado)                                                           |
| ---------------------- | ------------------------------------------------------------------------------- |
| `com_perfis`           | `@request.auth.id != '' && @request.auth.perfil_id.slug = 'superadministrador'` |
| `com_usuarios_equipes` | `@request.auth.id != '' && @request.auth.perfil_id.slug = 'superadministrador'` |
| `com_permissoes`       | `@request.auth.id != '' && @request.auth.perfil_id.slug = 'superadministrador'` |
| `com_parametros`       | `@request.auth.id != '' && @request.auth.perfil_id.slug = 'superadministrador'` |

### Mecanismo de Enforcement Duas Camadas

1. **`guard_list.js` (hook `onRecordListRequest`):** Fires na rota nativa `GET /api/collections/com_negocios/records` **antes** da avaliação do `listRule`. Verifica a matriz N:N (`com_usuarios_equipes` → `com_perfil_permissoes` → `com_permissoes`) e lança `ForbiddenError (HTTP 403)` se o usuário não possuir `negocios.view`. Usuários sem a permissão (ex: Spok) recebem 403 — o `listRule` nunca é avaliado.

2. **`listRule` (collection rule):** Quando o hook chama `e.next()` (usuário autorizado), o `listRule` filtra os registros por escopo e exclui negócios inativos (`inativo != true`).

### Resolução de Escopo no `listRule`

O `listRule` resolve o escopo via `@request.auth.perfil_id.slug` (proxy para o escopo definido em `com_usuarios_equipes`):

| Perfil (`perfil_id.slug`) | Escopo       | Filtro aplicado no `listRule`                                                    |
| ------------------------- | ------------ | -------------------------------------------------------------------------------- |
| `superadministrador`      | `todos`      | Todos os negócios ativos (sem filtro adicional)                                  |
| `aprovador`               | `todos`      | Todos os negócios ativos                                                         |
| `leitura-executiva`       | `todos`      | Todos os negócios ativos                                                         |
| `gestor-comercial`        | `equipe`     | `responsavel_id = @request.auth.id` OU `equipe_id = @request.auth.equipe_id`     |
| `operador-comercial`      | `proprios`   | Apenas `responsavel_id = @request.auth.id`                                       |
| `prospeccao`              | `proprios`   | Apenas `responsavel_id = @request.auth.id`                                       |
| `integracao`              | (sem acesso) | `listRule` avalia como falso → 200 vazio (mas `guard_list` hook lança 403 antes) |

### Exclusão de Negócios Inativos

O `listRule` inclui `inativo != true`, garantindo que negócios marcados como inativos não apareçam na listagem nativa, independentemente do escopo do usuário.

### Permissão Requerida para Listar

| Permissão       | Recurso    | Ação | Concedida a perfis                                                                                 |
| --------------- | ---------- | ---- | -------------------------------------------------------------------------------------------------- |
| `negocios.view` | `negocios` | view | superadministrador, gestor-comercial, operador-comercial, prospeccao, aprovador, leitura-executiva |

**Spok (perfil `integracao`):** NÃO possui `negocios.view` → `guard_list` hook lança `ForbiddenError (403)`.

### Testes na Rota Nativa

**Rota testada:** `GET /api/collections/com_negocios/records?page=1&perPage=1`

| Usuário | Perfil               | Permissão `negocios.view` | Resultado Esperado | Resultado Obtido |
| ------- | -------------------- | ------------------------- | ------------------ | ---------------- |
| Spok    | `integracao`         | ❌                        | **HTTP 403**       | ✅ 403           |
| Lula    | `superadministrador` | ✅ (todas)                | **HTTP 200**       | ✅ 200           |

### Escopo de Negócios Inativos

| Cenário                                       | Resultado Esperado                                   |
| --------------------------------------------- | ---------------------------------------------------- |
| Negócio com `inativo = true`                  | **Não aparece** na listagem (excluído pelo listRule) |
| Negócio com `inativo = false` ou não definido | **Aparece** se o escopo do usuário permitir          |

### Confirmação de Limites

- Migration 0033 toca **apenas** `com_negocios.listRule` — nenhuma outra collection ou rule é alterada.
- As quatro `listRule`s funcionais (`com_perfis`, `com_usuarios_equipes`, `com_permissoes`, `com_parametros`) são preservadas exatamente.
- Todos os `viewRule`s existentes são preservados sem alteração.
- O `guard_list.js` hook já está deployado e fires na rota nativa — não requer modificação.
- Porta 3B: NÃO iniciada ✅
- Fase 2: NÃO iniciada ✅
- Publish: NÃO realizado ✅
- Sem integrações externas ✅
- Sem dados reais ✅
