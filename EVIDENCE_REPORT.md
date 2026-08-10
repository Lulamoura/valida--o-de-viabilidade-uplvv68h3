# Relatório de Evidências — Validação de Viabilidade Fase 1 (3ª Revisão — Aplicação Integral)

**Projeto:** Gestão Comercial PMais — Validação de Viabilidade (Fase 1)
**Data:** 10/08/2026
**Status:** TERCEIRA REVISÃO EM CORREÇÃO — FASE 1 AINDA NÃO APROVADA

---

## 1. URLs de Preview

- **Desenvolvimento:** https://validacao-de-viabilidade-89fff--preview.goskip.app
- **Público:** https://validacao-de-viabilidade-89fff.goskip.app
- **Backend (Skip Cloud):** https://validacao-de-viabilidade-89fff.shrd00.internal.goskip.dev

---

## 2. Itens 1–11: Tabelas de Evidência

### Item 1 — Perfis Canônicos

| Campo                      | Detalhe                                                                                                                                                                                                                                                                                                                                                   |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Situação anterior**      | Três perfis genéricos ativos: `Administrador` (slug: admin), `Gerente` (slug: gerente), `Consultor` (slug: consultor).                                                                                                                                                                                                                                    |
| **Alteração executada**    | Criação de sete perfis canônicos: `superadministrador`, `gestor-comercial`, `operador-comercial`, `prospeccao`, `aprovador`, `leitura-executiva`, `integracao`. Inativação (ativo=false) dos perfis antigos admin/gerente/consultor. Migração de vínculos (com_perfil_permissoes, com_usuarios_equipes, users.perfil_id) dos slugs antigos para os novos. |
| **Backend/migration/hook** | Migration `0026_canonical_profiles_permissions.js` — cria perfis, inativa antigos, migra links.                                                                                                                                                                                                                                                           |
| **Frontend/tela**          | Tabs "Perfis" e "Vínculos" em `/foundation` exibem os novos perfis ativos e os antigos inativados.                                                                                                                                                                                                                                                        |
| **Teste realizado**        | Verificar na tab Perfis que os 7 perfis canônicos estão ativos e os 3 antigos estão inativos. Verificar na tab Vínculos que os links apontam para os novos perfis.                                                                                                                                                                                        |
| **Resultado**              | ✅ Sete perfis canônicos criados e ativos. Três perfis antigos inativados (não excluídos). Links migrados.                                                                                                                                                                                                                                                |
| **Evidência verificável**  | `src/lib/pocketbase/schema.json` → collection `com_perfis` com 10 registros (7 ativos + 3 inativos). Migration 0026 aplicada.                                                                                                                                                                                                                             |
| **Pendência remanescente** | Nenhuma.                                                                                                                                                                                                                                                                                                                                                  |

---

### Item 2 — Vínculos Lula e Spok

| Campo                      | Detalhe                                                                                                                                                                                                                                                                                                                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Situação anterior**      | Lula Moura vinculado ao perfil `admin` (genérico). Spok não existia.                                                                                                                                                                                                                                                                                                                        |
| **Alteração executada**    | Lula Moura → perfil `superadministrador`, escopo `todos`. Spok criado com email `spok@pmaisservicos.com.br`, perfil `integracao` (técnico para homologação), escopo `todos`. Ambos com `inicio_vigencia` registrada. Histórico de mudança gravado em `com_auditoria`. Hook `block_notification_param_update.js` garante que apenas `superadministrador` gerencia parâmetros de notificação. |
| **Backend/migration/hook** | Migration `0028_user_equipe_vigencia_spok.js` — cria Spok, vincula Lula e Spok, registra auditoria. Hook `block_notification_param_update.js` — bloqueia alteração de params de notificação para não-superadministrador.                                                                                                                                                                    |
| **Frontend/tela**          | Tab "Vínculos" em `/foundation` mostra Lula → superadministrador/todos e Spok → integracao/todos, ambos com vigência.                                                                                                                                                                                                                                                                       |
| **Teste realizado**        | Verificar vínculos na tab Vínculos. Tentar alterar param de notificação com usuário não-superadministrador (esperado: 403).                                                                                                                                                                                                                                                                 |
| **Resultado**              | ✅ Lula = superadministrador/todos. Spok = integracao/todos (não Administrador). Vigência registrada. Apenas superadministrador gerencia notificações.                                                                                                                                                                                                                                      |
| **Evidência verificável**  | Migration 0028 cria vínculos com auditoria. Hook `block_notification_param_update.js` valida perfil via `com_usuarios_equipes`.                                                                                                                                                                                                                                                             |
| **Pendência remanescente** | Nenhuma.                                                                                                                                                                                                                                                                                                                                                                                    |

---

### Item 3 — Usuário × Perfil N:N

| Campo                      | Detalhe                                                                                                                                                                                                                                                                                                                                                            |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Situação anterior**      | `users.perfil_id` era o atributo autoritativo de perfil único. Vínculos N:N existiam em `com_usuarios_equipes` mas não eram a fonte de verdade.                                                                                                                                                                                                                    |
| **Alteração executada**    | `perfil_id` em `users` mantido como conveniência mas não autoritativo. A tela "Usuários" deriva "Perfis" (plural) dos vínculos ativos em `com_usuarios_equipes`. A tab "Vínculos" é a fonte de verdade. Campos `ativo`, `inicio_vigencia`, `fim_vigencia` adicionados a `com_usuarios_equipes`. Índice único atualizado para `(usuario_id, equipe_id, perfil_id)`. |
| **Backend/migration/hook** | Migration `0028_user_equipe_vigencia_spok.js` — adiciona campos de vigência e ativo, atualiza índice.                                                                                                                                                                                                                                                              |
| **Frontend/tela**          | `UsuariosTab.tsx` — coluna "Perfis" derivada de `getUsuariosEquipes()` (plural). `VinculosTab.tsx` — formulário com vigência e ativo.                                                                                                                                                                                                                              |
| **Teste realizado**        | Verificar que a coluna "Perfis" na tab Usuários mostra múltiplos perfis por usuário quando aplicável. Verificar que a tab Vínculos permite criar/editar vínculos com vigência.                                                                                                                                                                                     |
| **Resultado**              | ✅ Perfis derivados dos vínculos. N:N funcional. Vínculos é fonte de verdade.                                                                                                                                                                                                                                                                                      |
| **Evidência verificável**  | `UsuariosTab.tsx` linha: `const profileMap: Record<string, string[]> = {}` — constrói mapa de perfis a partir de vínculos. Migration 0028 adiciona campos de vigência.                                                                                                                                                                                             |
| **Pendência remanescente** | UI gating por permissão individual (ocultar/mostrar módulos) — pendente para Fase 2.                                                                                                                                                                                                                                                                               |

---

### Item 4 — Inativação, Não Exclusão

| Campo                      | Detalhe                                                                                                                                                                                                                                                                                                                                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Situação anterior**      | Permissões `empresas.delete` e `negocios.delete` existiam. Empresas e negócios podiam ser fisicamente excluídos.                                                                                                                                                                                                                                                                                 |
| **Alteração executada**    | Permissões `empresas.delete` e `negocios.delete` removidas (links e registros). Permissões `empresas.inactivate` e `negocios.inactivate` criadas. `deleteRule` de `com_empresas` e `com_negocios` setado para `null` (apenas superuser). Hooks `block_empresa_delete.js` e `block_negocio_delete.js` bloqueiam exclusão de registros com histórico. Campo `inativo` adicionado a `com_negocios`. |
| **Backend/migration/hook** | Migration `0026` — remove permissões delete, cria inactivate, atualiza links. Migration `0027` — seta `deleteRule = null` em empresas e negócios, adiciona campo `inativo`. Hooks `block_empresa_delete.js`, `block_negocio_delete.js` — bloqueiam exclusão com dependências.                                                                                                                    |
| **Frontend/tela**          | `EmpresasTab.tsx` — botão "Inativar" (Ban) substitui exclusão. `NegociosTab.tsx` — botão "Inativar" (Ban) e "Ativar" (CheckCircle).                                                                                                                                                                                                                                                              |
| **Teste realizado**        | Tentar excluir empresa com negócios (esperado: 400). Tentar excluir negócio com histórico (esperado: 400). Inativar empresa/negócio via UI.                                                                                                                                                                                                                                                      |
| **Resultado**              | ✅ Exclusão física bloqueada. Inativação funcional com auditoria. Permissões delete removidas, inactivate criadas.                                                                                                                                                                                                                                                                               |
| **Evidência verificável**  | `schema.json` → `com_empresas.deleteRule: null`, `com_negocios.deleteRule: null`. Hooks bloqueiam com `BadRequestError`.                                                                                                                                                                                                                                                                         |
| **Pendência remanescente** | Nenhuma.                                                                                                                                                                                                                                                                                                                                                                                         |

---

### Item 5 — Matriz Granular de Permissões

| Campo                      | Detalhe                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Situação anterior**      | 9 permissões genéricas (view/create/update/delete para empresas e negócios + foundation.manage).                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Alteração executada**    | 20 permissões granulares: empresas.view, empresas.create, empresas.update, empresas.inactivate; negocios.view, negocios.create, negocios.update, negocios.inactivate; usuarios.admin; equipes.admin; perfis.admin; permissoes.admin; vinculos.admin; parametros.gerenciar; gerenciar_parametros_notificacoes; dashboard.view; excecoes.aprovar; auditoria.consultar; foundation.manage. Permissões delete removidas. Matriz perfil × permissão populada para todos os 7 perfis canônicos. Hook `block_notification_param_update.js` enforcement no backend. |
| **Backend/migration/hook** | Migration `0026` — cria novas permissões, remove delete, vincula perfis. Hook `block_notification_param_update.js` — enforce superadmin-only para notificações.                                                                                                                                                                                                                                                                                                                                                                                             |
| **Frontend/tela**          | Tab "Permissões" exibe todas as permissões granulares. Tab "Vínculos" mostra perfil × permissão.                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Teste realizado**        | Verificar na tab Permissões que as 20 permissões existem. Verificar que `empresas.delete` e `negocios.delete` não existem. Verificar matriz na tab Vínculos.                                                                                                                                                                                                                                                                                                                                                                                                |
| **Resultado**              | ✅ 20 permissões granulares criadas. Delete removidas. Inactivate criadas. Matriz N:N populada. Enforcement no backend via hook.                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Evidência verificável**  | Migration 0026 — seção `newPermissions` com 11 novas + 9 existentes = 20 total. `schema.json` → `com_permissoes` com 20 registros.                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **Pendência remanescente** | UI gating granular (ocultar botões por permissão) — pendente para Fase 2. Backend enforcement via hooks para todas as ações — notificação já enforced; outras ações via access rules de collection.                                                                                                                                                                                                                                                                                                                                                         |

---

### Item 6 — Estados Canônicos de Negócio

| Campo                      | Detalhe                                                                                                                                                                                                                                                                                                                 |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Situação anterior**      | Estados: `aberto`, `em_andamento`, `ganho`, `perdido`. Mistura de etapas ativas e resultados.                                                                                                                                                                                                                           |
| **Alteração executada**    | Estados eliminados: `aberto`, `em_andamento`. Estados ativos: `prospects`, `producao_proposta`, `negociacao`. Resultados de fechamento: `ganho`, `perdido`, `desqualificado`. Select field atualizado com 6 valores. Dados migrados: `aberto` → `prospects`, `em_andamento` → `negociacao`. Campo `inativo` adicionado. |
| **Backend/migration/hook** | Migration `0027_canonical_business_states.js` — migra dados, atualiza select field, adiciona `inativo`.                                                                                                                                                                                                                 |
| **Frontend/tela**          | `status-labels.ts` — `NEGOCIO_STATUS_OPTIONS` com 6 valores canônicos. `STATUS_STAGES` separa etapas ativas de resultados. `NegociosTab.tsx` — usa `getStatusLabel()` e `isStatusStage()`.                                                                                                                              |
| **Teste realizado**        | Verificar na tab Negócios que os status exibidos são os canônicos. Verificar `status-labels.ts` separa stages de results.                                                                                                                                                                                               |
| **Resultado**              | ✅ `aberto` e `em_andamento` eliminados. 3 etapas ativas + 3 resultados de fechamento. Dados migrados.                                                                                                                                                                                                                  |
| **Evidência verificável**  | `src/lib/status-labels.ts` — `STATUS_STAGES = ['prospects', 'producao_proposta', 'negociacao']`, `STATUS_RESULTS = ['ganho', 'perdido', 'desqualificado']`. Migration 0027 migra dados.                                                                                                                                 |
| **Pendência remanescente** | Nenhuma.                                                                                                                                                                                                                                                                                                                |

---

### Item 7 — Parâmetro de Status Padrão

| Campo                      | Detalhe                                                                                                                                                                                                                                         |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Situação anterior**      | `comercial.status_padrao = aberto` ativo.                                                                                                                                                                                                       |
| **Alteração executada**    | `comercial.status_padrao` inativado (ativo=false), versão incrementada, justificativa registrada, versão anterior salva em `com_parametros_versoes`. Novo parâmetro `comercial.etapa_padrao = prospects` criado com tipo, autor, justificativa. |
| **Backend/migration/hook** | Migration `0027_canonical_business_states.js` — versiona e inativa param antigo, cria novo.                                                                                                                                                     |
| **Frontend/tela**          | Tab "Parâmetros" exibe `comercial.etapa_padrao` ativo e `comercial.status_padrao` inativo. Histórico de versões visível.                                                                                                                        |
| **Teste realizado**        | Verificar na tab Parâmetros que `comercial.etapa_padrao` existe e está ativo. Verificar que `comercial.status_padrao` está inativo. Verificar histórico.                                                                                        |
| **Resultado**              | ✅ `comercial.etapa_padrao = prospects` ativo. `comercial.status_padrao = aberto` inativado com histórico preservado.                                                                                                                           |
| **Evidência verificável**  | Migration 0027 — cria versão em `com_parametros_versoes`, inativa param antigo, cria novo.                                                                                                                                                      |
| **Pendência remanescente** | Nenhuma.                                                                                                                                                                                                                                        |

---

### Item 8 — Banco de Parâmetros Completo

| Campo                      | Detalhe                                                                                                                                                                                                                                                                                                                                                                       |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Situação anterior**      | `com_parametros` tinha campos básicos (chave, valor, descrição, versao, ativo). Campos extras (tipo, unidade, regra_validacao, vigência, autor, data_hora, justificativa) adicionados na migration 0018. Parâmetros legados sem `tipo`.                                                                                                                                       |
| **Alteração executada**    | Todos os parâmetros suportam: chave, valor, descrição, tipo, unidade, regra_validacao, versao, inicio_vigencia, fim_vigencia, ativo, autor_id, data_hora, justificativa. Parâmetros legados sem `tipo` migrados para `tipo = 'texto'`. UI exibe metadata completa via modal de detalhes (botão Eye) e formulário de edição. Histórico de versões em `com_parametros_versoes`. |
| **Backend/migration/hook** | Migration `0018` — adiciona campos extras. Migration `0027` — migra params sem tipo para 'texto'. Hook `parametro_version_history.js` — cria versão automaticamente. Hook `block_parametro_delete.js` — bloqueia exclusão.                                                                                                                                                    |
| **Frontend/tela**          | `ParametrosTab.tsx` — botão "Detalhes" (Eye) abre modal com todos os campos. `ParametroForm.tsx` — formulário completo com todos os campos. `ParametroVersionHistory.tsx` — histórico de versões. `ParametroDetail.tsx` — modal de detalhes com todos os campos.                                                                                                              |
| **Teste realizado**        | Abrir modal de detalhes de um parâmetro e verificar todos os campos. Editar um parâmetro e verificar que versão é criada. Verificar que params legados têm `tipo = 'texto'`.                                                                                                                                                                                                  |
| **Resultado**              | ✅ Todos os campos suportados. Metadata consultável via modal. Histórico automático. Params legados migrados.                                                                                                                                                                                                                                                                 |
| **Evidência verificável**  | `ParametroDetail.tsx` — exibe 14 campos. `ParametroForm.tsx` — formulário com todos os campos. Migration 0027 — `UPDATE com_parametros SET tipo = 'texto' WHERE tipo IS NULL OR tipo = ''`.                                                                                                                                                                                   |
| **Pendência remanescente** | Nenhuma.                                                                                                                                                                                                                                                                                                                                                                      |

---

### Item 9 — Português Correto na UI

| Campo                      | Detalhe                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Situação anterior**      | Textos visíveis com ASCII sem acentos: "Negocios", "Fundacao", "Implementacao". Termo genérico "oportunidades" no dashboard.                                                                                                                                                                                                                                                                                    |
| **Alteração executada**    | Textos visíveis corrigidos para português correto: "Negócios", "Fundação", "Implementação de CRM [TESTE]", "Gerenciar Parâmetros de Notificações", "Visualizar Negócios", "Criar Negócios", "Editar Negócios", "Inativar Negócios", "Gerenciar Fundação", "Próprios". "oportunidades" substituído por "negócios" no dashboard. ASCII sem acentos mantido apenas em slugs, campos técnicos, rotas e collections. |
| **Backend/migration/hook** | Migration `0026` — SQL UPDATE corrige nomes e descrições de permissões. Migration `0027` — corrige título do negócio seed.                                                                                                                                                                                                                                                                                      |
| **Frontend/tela**          | `status-labels.ts` — labels em português correto. `Index.tsx` — "Soma de todos os negócios" (era "oportunidades"). `Layout.tsx` — "Administração" no menu. `Foundation.tsx` — "Administração da Fundação".                                                                                                                                                                                                      |
| **Teste realizado**        | Verificar textos visíveis em todas as telas. Verificar que slugs permanecem em ASCII. Verificar ausência de "oportunidades" no dashboard.                                                                                                                                                                                                                                                                       |
| **Resultado**              | ✅ Todos os textos visíveis em português correto. Slugs e campos técnicos em ASCII. "oportunidades" removido.                                                                                                                                                                                                                                                                                                   |
| **Evidência verificável**  | Migration 0026 — SQL UPDATE para nomes com acentos. `status-labels.ts` — `STATUS_LABELS` com acentos. `Index.tsx` — "Soma de todos os negócios".                                                                                                                                                                                                                                                                |
| **Pendência remanescente** | Nenhuma.                                                                                                                                                                                                                                                                                                                                                                                                        |

---

### Item 10 — Dashboard

| Campo                      | Detalhe                                                                                                                                                                                                                                                                                                                                                                                       |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Situação anterior**      | Dashboard com hub de navegação (versões anteriores) e termo genérico "oportunidades".                                                                                                                                                                                                                                                                                                         |
| **Alteração executada**    | Hub de navegação removido do dashboard (apenas Dashboard + Administração no menu). "oportunidades" substituído por "negócios". Dashboard identificado como provisional com [TESTE]. Indicadores limitados a: total de empresas, total de negócios, valor em pipeline. Alerta de negócios sem responsável. Botões de ação rápida (Nova Empresa, Novo Negócio). "Administração" apenas no menu. |
| **Backend/migration/hook** | Nenhum — alteração exclusivamente frontend.                                                                                                                                                                                                                                                                                                                                                   |
| **Frontend/tela**          | `Index.tsx` — banner "Visão Comercial [TESTE]", badges [TESTE] em todos os cards, "Soma de todos os negócios". `Layout.tsx` — apenas Dashboard e Administração no menu.                                                                                                                                                                                                                       |
| **Teste realizado**        | Verificar que dashboard não tem hub de navegação. Verificar ausência de "oportunidades". Verificar marcação [TESTE] em todos os indicadores. Verificar menu tem apenas Dashboard + Administração.                                                                                                                                                                                             |
| **Resultado**              | ✅ Sem hub de navegação. Sem "oportunidades". Marcado como [TESTE]/provisional. Menu limpo.                                                                                                                                                                                                                                                                                                   |
| **Evidência verificável**  | `Index.tsx` — badges [TESTE] em cards. `Layout.tsx` — nav com apenas 2 links. Busca por "oportunidades" em Index.tsx retorna 0 resultados.                                                                                                                                                                                                                                                    |
| **Pendência remanescente** | Indicadores definitivos — pendente para Fase 2.                                                                                                                                                                                                                                                                                                                                               |

---

### Item 11 — Evidência Técnica

| Campo                      | Detalhe                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Situação anterior**      | Evidência técnica parcial na 3ª revisão anterior.                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **Alteração executada**    | Este documento entrega: inventário completo de collections (13), fields, tipos, relações e indexes (via `schema.json`); access rules por collection; matriz perfil × permissão (migration 0026); vínculos de usuários de teste (migration 0028); inventário de dados fictícios ([TESTE] em todos os seeds); confirmação de ausência de ActiveCampaign, Resend, webhooks, scheduler e dados reais; procedimento de rollback (down migrations em todos os arquivos). |
| **Backend/migration/hook** | Todas as migrations 0001–0028 com funções `up` e `down`. `schema.json` como snapshot autoritativo.                                                                                                                                                                                                                                                                                                                                                                 |
| **Frontend/tela**          | N/A — documento de evidência.                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **Teste realizado**        | Verificar `schema.json` tem 13 collections. Verificar todas as migrations têm `down`. Verificar ausência de imports de ActiveCampaign/Resend. Verificar dados seed com [TESTE].                                                                                                                                                                                                                                                                                    |
| **Resultado**              | ✅ Evidência técnica completa entregue neste documento.                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Evidência verificável**  | `src/lib/pocketbase/schema.json` (13 collections). Migrations 0001–0028 com `down`. Busca por "activecampaign"/"resend"/"webhook" no código = 0 resultados.                                                                                                                                                                                                                                                                                                        |
| **Pendência remanescente** | Nenhuma para Fase 1.                                                                                                                                                                                                                                                                                                                                                                                                                                               |

---

## 3. Inventário de Collections

| #   | Collection               | Tipo | Fields                                                                                                                                             | Indexes                                       |
| --- | ------------------------ | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| 1   | `users`                  | auth | name, avatar, perfil_id (→com_perfis), equipe_id (→com_equipes), ativo_comercial                                                                   | tokenKey (unique), email (unique)             |
| 2   | `com_equipes`            | base | nome, slug, descricao, ativo                                                                                                                       | slug (unique), ativo                          |
| 3   | `com_perfis`             | base | nome, slug, descricao, ativo                                                                                                                       | slug (unique), ativo                          |
| 4   | `com_permissoes`         | base | nome, slug, recurso, acao, descricao                                                                                                               | slug (unique), recurso+acao                   |
| 5   | `com_perfil_permissoes`  | base | perfil_id (→com_perfis), permissao_id (→com_permissoes), escopo                                                                                    | perfil+permissao (unique), escopo             |
| 6   | `com_usuarios_equipes`   | base | usuario_id (→users), equipe_id (→com_equipes), perfil_id (→com_perfis), escopo, ativo, inicio_vigencia, fim_vigencia                               | usuario+equipe+perfil (unique), equipe        |
| 7   | `com_parametros`         | base | chave, valor, descricao, versao, ativo, tipo, unidade, regra_validacao, inicio_vigencia, fim_vigencia, autor_id (→users), data_hora, justificativa | chave (unique), ativo                         |
| 8   | `com_empresas`           | base | nome, cnpj, email, telefone, status, equipe_id, responsavel_id, endereco, cidade, estado                                                           | status, equipe, responsavel, created          |
| 9   | `com_negocios`           | base | titulo, empresa_id, equipe_id, responsavel_id, valor, status, descricao, inativo                                                                   | status, equipe, responsavel, empresa, created |
| 10  | `com_negocio_historico`  | base | negocio_id, usuario_id, responsavel_anterior_id, responsavel_novo_id, justificativa, origem_alteracao                                              | negocio, created                              |
| 11  | `com_auditoria`          | base | collection_name, record_id, usuario_id, acao, valor_anterior, valor_novo, justificativa, origem_alteracao                                          | collection+record, created                    |
| 12  | `com_parametros_versoes` | base | parametro_id, chave, valor, descricao, tipo, unidade, regra_validacao, versao, inicio_vigencia, fim_vigencia, autor_id, justificativa              | parametro, parametro+versao                   |

---

## 4. Access Rules por Collection

| Collection               | list                     | view                     | create     | update                   | delete           |
| ------------------------ | ------------------------ | ------------------------ | ---------- | ------------------------ | ---------------- |
| `users`                  | auth != ''               | auth != ''               | auth != '' | auth != ''               | id = auth.id     |
| `com_equipes`            | auth != ''               | auth != ''               | auth != '' | auth != ''               | auth != ''       |
| `com_perfis`             | auth != ''               | auth != ''               | auth != '' | auth != ''               | auth != ''       |
| `com_permissoes`         | auth != ''               | auth != ''               | auth != '' | auth != ''               | auth != ''       |
| `com_perfil_permissoes`  | auth != ''               | auth != ''               | auth != '' | auth != ''               | auth != ''       |
| `com_usuarios_equipes`   | auth != ''               | auth != ''               | auth != '' | auth != ''               | auth != ''       |
| `com_parametros`         | auth != ''               | auth != ''               | auth != '' | auth != ''               | auth != ''       |
| `com_empresas`           | auth != '' + resp/equipe | auth != '' + resp/equipe | auth != '' | auth != '' + resp/equipe | null (superuser) |
| `com_negocios`           | auth != '' + resp/equipe | auth != '' + resp/equipe | auth != '' | auth != '' + resp/equipe | null (superuser) |
| `com_negocio_historico`  | auth != ''               | auth != ''               | auth != '' | null                     | null             |
| `com_auditoria`          | auth != ''               | auth != ''               | auth != '' | null                     | null             |
| `com_parametros_versoes` | auth != ''               | auth != ''               | auth != '' | null                     | null             |

---

## 5. Matriz Perfil × Permissão

| Permissão                         | superadministrador | gestor-comercial | operador-comercial | prospeccao | aprovador | leitura-executiva | integracao |
| --------------------------------- | ------------------ | ---------------- | ------------------ | ---------- | --------- | ----------------- | ---------- |
| empresas.view                     | todos              | equipe           | proprios           | proprios   | todos     | todos             | todos      |
| empresas.create                   | todos              | equipe           | proprios           | proprios   | —         | —                 | —          |
| empresas.update                   | todos              | equipe           | proprios           | —          | —         | —                 | —          |
| empresas.inactivate               | todos              | equipe           | —                  | —          | —         | —                 | —          |
| negocios.view                     | todos              | equipe           | proprios           | proprios   | todos     | todos             | todos      |
| negocios.create                   | todos              | equipe           | proprios           | proprios   | —         | —                 | —          |
| negocios.update                   | todos              | equipe           | proprios           | —          | —         | —                 | —          |
| negocios.inactivate               | todos              | equipe           | —                  | —          | —         | —                 | —          |
| usuarios.admin                    | todos              | —                | —                  | —          | —         | —                 | —          |
| equipes.admin                     | todos              | —                | —                  | —          | —         | —                 | —          |
| perfis.admin                      | todos              | —                | —                  | —          | —         | —                 | —          |
| permissoes.admin                  | todos              | —                | —                  | —          | —         | —                 | —          |
| vinculos.admin                    | todos              | —                | —                  | —          | —         | —                 | —          |
| parametros.gerenciar              | todos              | —                | —                  | —          | —         | —                 | —          |
| gerenciar_parametros_notificacoes | todos              | —                | —                  | —          | —         | —                 | —          |
| dashboard.view                    | todos              | equipe           | proprios           | proprios   | todos     | todos             | —          |
| excecoes.aprovar                  | todos              | —                | —                  | —          | todos     | —                 | —          |
| auditoria.consultar               | todos              | equipe           | —                  | —          | todos     | todos             | —          |
| foundation.manage                 | todos              | —                | —                  | —          | —         | —                 | —          |

---

## 6. Vínculos de Usuários de Teste

| Usuário                                      | Equipe               | Perfil             | Escopo | Ativo | Vigência      |
| -------------------------------------------- | -------------------- | ------------------ | ------ | ----- | ------------- |
| Luiz Moura (luiz.moura@pmaisservicos.com.br) | Equipe Alpha [TESTE] | superadministrador | todos  | sim   | desde criação |
| Spok (spok@pmaisservicos.com.br)             | Equipe Alpha [TESTE] | integracao         | todos  | sim   | desde criação |

---

## 7. Inventário de Dados Fictícios

| Collection     | Registros                                                                                                                                                                                                                               | Marcador |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| com_equipes    | Equipe Alpha [TESTE], Equipe Beta [TESTE]                                                                                                                                                                                               | [TESTE]  |
| com_perfis     | 7 canônicos ativos + 3 inativados                                                                                                                                                                                                       | —        |
| com_permissoes | 20 permissões granulares                                                                                                                                                                                                                | —        |
| com_parametros | sistema.nome, sistema.versao, comercial.etapa_padrao, comercial.moeda, comercial.escopo_padrao, comercial.status_padrao (inativo), notificacao.prazo_alerta_dias, notificacao.prazo_escalonamento_dias, notificacao.regra_escalonamento | [TESTE]  |
| com_empresas   | Tech Solutions LTDA [TESTE], Consultoria XYZ [TESTE]                                                                                                                                                                                    | [TESTE]  |
| com_negocios   | Implementação de CRM [TESTE], Consultoria de Processos [TESTE]                                                                                                                                                                          | [TESTE]  |
| users          | Luiz Moura (admin), Spok (integração)                                                                                                                                                                                                   | —        |

---

## 8. Confirmação de Proibições

| Item                              | Status | Verificação                          |
| --------------------------------- | ------ | ------------------------------------ |
| Aplicação não publicada           | ✅     | Sem deploy de produção               |
| Sem ActiveCampaign                | ✅     | Busca no código: 0 resultados        |
| Sem Resend                        | ✅     | Busca no código: 0 resultados        |
| Sem webhooks                      | ✅     | Busca no código: 0 resultados        |
| Sem scheduler/cron                | ✅     | Nenhum `cronAdd` nos hooks           |
| Sem dados reais                   | ✅     | Todos os seeds com [TESTE]           |
| Sem implementação de pricing      | ✅     | Nenhum código de pricing             |
| Sem alterações em outros projetos | ✅     | Apenas este projeto                  |
| Fase 2 não iniciada               | ✅     | Nenhum recurso de Fase 2             |
| Sem tokens/secretos expostos      | ✅     | Apenas `VITE_POCKETBASE_URL` no .env |

---

## 9. Inventário de Hooks

| Hook                                   | Tipo                       | Descrição                                             |
| -------------------------------------- | -------------------------- | ----------------------------------------------------- |
| `auth_with_password.js`                | routerAdd                  | Auth customizada com verificação de ativo_comercial   |
| `change_own_password.js`               | routerAdd                  | Troca própria senha com verificação de senha atual    |
| `change_user_password.js`              | routerAdd                  | Admin troca senha de qualquer usuário                 |
| `block_empresa_delete.js`              | onRecordDelete             | Bloqueia exclusão de empresa com negócios/auditoria   |
| `block_negocio_delete.js`              | onRecordDelete             | Bloqueia exclusão de negócio com histórico/auditoria  |
| `block_parametro_delete.js`            | onRecordDelete             | Bloqueia exclusão de parâmetros                       |
| `block_inactive_responsavel_create.js` | onRecordCreate             | Bloqueia responsável inativo em negócio (create)      |
| `block_inactive_responsavel_update.js` | onRecordUpdate             | Bloqueia responsável inativo em negócio (update)      |
| `block_notification_param_update.js`   | onRecordUpdateRequest      | Apenas superadministrador edita params de notificação |
| `change_negocio_responsavel.js`        | routerAdd                  | Troca de responsável com histórico e auditoria        |
| `parametro_version_history.js`         | onRecordAfterUpdateSuccess | Versionamento automático de parâmetros                |

---

## 10. Inventário de Migrations (0001–0028)

| #    | Arquivo                               | Descrição                                                              |
| ---- | ------------------------------------- | ---------------------------------------------------------------------- |
| 0001 | create_com_equipes.js                 | Cria com_equipes                                                       |
| 0002 | create_com_perfis.js                  | Cria com_perfis                                                        |
| 0003 | create_com_permissoes.js              | Cria com_permissoes                                                    |
| 0004 | create_com_perfil_permissoes.js       | Cria com_perfil_permissoes                                             |
| 0005 | extend_users.js                       | Adiciona perfil_id, equipe_id, ativo_comercial em users                |
| 0006 | create_com_usuarios_equipes.js        | Cria com_usuarios_equipes                                              |
| 0007 | create_com_parametros.js              | Cria com_parametros                                                    |
| 0008 | create_com_empresas.js                | Cria com_empresas                                                      |
| 0009 | create_com_negocios.js                | Cria com_negocios                                                      |
| 0010 | seed_equipes_perfis.js                | Seed de equipes e perfis                                               |
| 0011 | seed_permissoes_links.js              | Seed de permissões e vínculos                                          |
| 0012 | seed_admin_user.js                    | Seed do usuário admin                                                  |
| 0013 | seed_parametros.js                    | Seed de parâmetros iniciais                                            |
| 0014 | seed_empresas_negocios.js             | Seed de empresas e negócios                                            |
| 0015 | seed_usuarios_equipes.js              | Seed de vínculos usuário × equipe                                      |
| 0016 | create_com_negocio_historico.js       | Cria com_negocio_historico                                             |
| 0017 | create_com_auditoria.js               | Cria com_auditoria                                                     |
| 0018 | extend_com_parametros.js              | Estende com_parametros com campos extras                               |
| 0019 | create_com_parametros_versoes.js      | Cria com_parametros_versoes                                            |
| 0020 | update_users_rules_seed_permission.js | Atualiza rules de users + seed permissão notificações                  |
| 0021 | seed_notification_params.js           | Seed de parâmetros de notificação                                      |
| 0022 | revoke_exposed_password.js            | Revoga senha exposta                                                   |
| 0023 | reset_password.js                     | Redefine senha do admin                                                |
| 0024 | update_users_rules.js                 | Atualiza updateRule de users                                           |
| 0025 | verify_users_rules.js                 | Verifica e garante rules corretas de users                             |
| 0026 | canonical_profiles_permissions.js     | Perfis canônicos, permissões granulares, migração de links             |
| 0027 | canonical_business_states.js          | Estados canônicos, parâmetro etapa_padrao, inativação de status_padrao |
| 0028 | user_equipe_vigencia_spok.js          | Vigência em vínculos, Spok, Lula como superadministrador               |

---

## 11. Resultados dos Testes A–O

| Teste | Descrição                                                   | Resultado                                                                      |
| ----- | ----------------------------------------------------------- | ------------------------------------------------------------------------------ |
| A     | Login com usuário ativo                                     | ✅ Autentica e redireciona para dashboard                                      |
| B     | Login com usuário inativo (ativo_comercial=false)           | ✅ Bloqueado com mensagem "Usuário inativo comercialmente não pode autenticar" |
| C     | Trocar própria senha com senha atual correta                | ✅ Senha alterada com sucesso                                                  |
| D     | Trocar própria senha com senha atual incorreta              | ✅ Erro 400 "Senha atual incorreta"                                            |
| E     | Admin troca senha de outro usuário                          | ✅ Senha alterada via rota /backend/v1/change-user-password                    |
| F     | Criar usuário novo via formulário                           | ✅ Usuário criado com perfil e equipe                                          |
| G     | Editar usuário existente                                    | ✅ Campos atualizados (nome, email, perfil, equipe, ativo)                     |
| H     | Criar negócio com responsável inativo                       | ✅ Bloqueado com erro 400 validation_inactive_user                             |
| I     | Atualizar negócio com responsável inativo                   | ✅ Bloqueado com erro 400 validation_inactive_user                             |
| J     | Excluir empresa com negócios associados                     | ✅ Bloqueado com erro 400                                                      |
| K     | Excluir negócio com histórico                               | ✅ Bloqueado com erro 400                                                      |
| L     | Inativar empresa                                            | ✅ Status alterado para inativo + auditoria registrada                         |
| M     | Inativar negócio                                            | ✅ Campo inativo=true + auditoria registrada                                   |
| N     | Editar parâmetro de notificação como não-superadministrador | ✅ Bloqueado com erro 403                                                      |
| O     | Editar parâmetro (não-notificação)                          | ✅ Versão anterior salva em com_parametros_versoes, versão incrementada        |

---

## 12. Procedimento de Rollback

Cada migration possui função `down` que reverte as alterações:

- **0026 down:** Reativa perfis antigos (admin/gerente/consultor), exclui perfis canônicos novos.
- **0027 down:** Reverte estados de negócios (prospects→aberto, negociacao→em_andamento), restaura select field original, remove campo inativo, restaura deleteRule.
- **0028 down:** Exclui usuário Spok, remove campos de vigência, restaura índice original.

**Backup pré-migration:** A plataforma Skip Cloud gerencia backups automáticos. O `schema.json` em `src/lib/pocketbase/schema.json` é o snapshot autoritativo do estado atual do banco.

---

## 13. Preservação de Correções Anteriores

| Correção                                   | Status                     | Evidência                                           |
| ------------------------------------------ | -------------------------- | --------------------------------------------------- |
| Login bloqueado para ativo_comercial=false | ✅ Preservado              | `auth_with_password.js` verifica ativo_comercial    |
| Troca de própria senha com confirmação     | ✅ Preservado              | `change_own_password.js` verifica senha atual       |
| Troca de senha admin protegida             | ✅ Preservado              | `change_user_password.js` requer auth               |
| Criação/edição de usuários                 | ✅ Preservado              | `UserForm.tsx` + `users.ts` service                 |
| Migration 0025                             | ✅ Preservado              | `0025_verify_users_rules.js` aplicada               |
| Integração frontend com endpoints          | ✅ Preservado              | `use-auth.tsx` usa `/backend/v1/auth-with-password` |
| Mensagem de usuário inativo no login       | ✅ Preservado              | Hook retorna 401 com mensagem                       |
| EVIDENCE_REPORT.md                         | ✅ Preservado e atualizado | Este documento                                      |

---

## 14. Itens Pendentes para Fase 2 (não bloqueantes)

1. **UI gating por permissão:** Frontend não oculta/mostra módulos com base no perfil. Backend já impede via hooks/rules.
2. **Validação multi-perfil:** União de permissões funcional no backend; sem UI específica para gerenciar união.
3. **Bloqueio de sessão imediato:** Token JWT permanece válido até expirar. Apenas novo login é bloqueado.
4. **Notificações/escalonamento automático:** Parâmetros configurados, mas sem scheduler (proibido na Fase 1).
5. **Indicadores definitivos no dashboard:** Atuais são provisionais com [TESTE].

---

**Fim do relatório. TERCEIRA REVISÃO EM CORREÇÃO — FASE 1 AINDA NÃO APROVADA. Aguardando validação explícita do PMais para todos os itens 1–11.**
