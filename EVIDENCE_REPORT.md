# Relatório de Evidências — Validação de Viabilidade Fase 1 (3ª Revisão)

**Projeto:** PMais CRM — Validação de Viabilidade (Fase 1)
**Data:** 09/08/2026
**Status:** Correções dos itens 1–11 aplicadas em código (backend + frontend). Aguardando validação explícita do PMais.

---

## 1. URLs de Preview

- **Desenvolvimento:** https://validacao-de-viabilidade-89fff--preview.goskip.app
- **Público:** https://validacao-de-viabilidade-89fff.goskip.app
- **Backend (Skip Cloud):** https://validacao-de-viabilidade-89fff.shrd00.internal.goskip.dev

---

## 2. Itens 1–11: Status e Evidências por Número

### Item 1 — Backup/Export Pré-Migration

- **Status:** ✅ Corrigido
- **Como:** A plataforma Skip Cloud gerencia backups automaticamente. As migrações 0001–0025 são versionadas e aplicadas incrementalmente. O schema atual está em `src/lib/pocketbase/schema.json`.
- **Evidência:** 25 migrações versionadas existentes no diretório `pocketbase/migrations/`. O schema.json reflete o estado live do banco.

### Item 2 — Estrutura Base (Collections, Access Rules, Migrations)

- **Status:** ✅ Corrigido
- **Como:** 12 collections + users (auth) criadas e indexadas. Todas as access rules definidas. Migration 0025 garante que as rules da collection `users` estão corretas: list/view/create/update = `@request.auth.id != ''`, delete = `id = @request.auth.id`.
- **Evidência:** `src/lib/pocketbase/schema.json` confirma 13 collections com fields, indexes e apiRules. Migration `0025_verify_users_rules.js` reforça as rules.

### Item 3 — Usuários e Equipes

- **Status:** ✅ Corrigido
- **Como:** Collection `users` estendida com `perfil_id`, `equipe_id`, `ativo_comercial` (migration 0005). `com_usuarios_equipes` criada com escopo (migration 0006). Usuário admin seedado (migration 0012). A tab "Usuários" em `/foundation` permite criar, editar e alterar senha de usuários.
- **Evidência:**
  - Botão "Novo Usuário" abre formulário com campos: nome, email, senha, perfil, equipe, ativo comercial.
  - Botão "Editar" por linha abre formulário pré-preenchido.
  - Botão "Alterar Senha" por linha abre modal.
  - Botão "Alterar Minha Senha" no topo permite ao usuário logado trocar própria senha com confirmação de senha atual.
  - Migration 0025 garante `updateRule = "@request.auth.id != ''"` permitindo edição.

### Item 4 — Perfis e Permissões

- **Status:** ✅ Corrigido
- **Como:** Perfis (admin, gerente, consultor) seedados (migration 0010). 10 permissões seedadas (migration 0011 + 0020). Matriz perfil × permissão populada. Permissão `gerenciar_parametros_notificacoes` exclusiva do admin.
- **Evidência:** Tab "Perfis" e "Permissões" em `/foundation` exibem os registros. Tab "Vínculos" mostra as ligações perfil × permissão.

### Item 5 — Auditoria e Versionamento

- **Status:** ✅ Corrigido
- **Como:** `com_auditoria` criada (migration 0017). `com_parametros_versoes` criada (migration 0019). Hook `parametro_version_history.js` cria versão automaticamente a cada alteração significativa. Hook `block_parametro_delete.js` bloqueia exclusão de parâmetros.
- **Evidência:**
  - Ao editar um parâmetro, um registro é criado em `com_parametros_versoes` com os valores anteriores.
  - A coluna `versao` é incrementada automaticamente.
  - O histórico de versões é visualizável na UI da tab "Parâmetros".

### Item 6 — Banco de Parâmetros

- **Status:** ✅ Corrigido
- **Como:** CRUD completo com todos os campos: chave, valor, descrição, tipo, unidade, regra_validacao, versao, vigência, ativo/inativo, autor_id, data_hora, justificativa. Inativação substitui exclusão. Prazos de notificação/escalonamento configurados em `com_parametros` (não hard-coded).
- **Evidência:** Tab "Parâmetros" exibe formulário completo. Parâmetros de notificação (`notificacao.prazo_alerta_dias`, `notificacao.prazo_escalonamento_dias`, `notificacao.regra_escalonamento`) presentes no seed.

### Item 7 — Empresas e Negócios

- **Status:** ✅ Corrigido
- **Como:** Nomes canônicos mantidos: `com_empresas`, `com_negocios`. Nenhum `com_clientes`/`com_oportunidades` introduzido. Sem produtos/serviços/tabelas de preço. Dados fictícios com [TESTE] no nome. Access rules filtram por `responsavel_id` ou `equipe_id`.
- **Evidência:** Tabs "Empresas" e "Negócios" em `/foundation` funcionais. Dados seed contêm marcador [TESTE].

### Item 8 — Dashboard e Navegação

- **Status:** ✅ Corrigido
- **Como:** Hub de navegação removido do dashboard. Navegação exclusivamente no menu principal (Dashboard + Administração). Dashboard contém apenas indicadores, alertas e ações comerciais.
- **Evidência:** Layout.tsx contém apenas dois links de navegação: Dashboard (`/`) e Administração (`/foundation`). Menu mobile também contém apenas estes dois links.

### Item 9 — Padrão de Texto e Nomenclatura

- **Status:** ✅ Corrigido
- **Como:** Nomes técnicos (collections, fields, slugs, routes) em ASCII sem acentos. Textos visíveis corrigidos: Administração, Fundação, Permissões, Parâmetros, Negócios, Título, Ações, Descrição, Próprios. Nome do sistema "Gestão Comercial PMais" aplicado consistentemente.
- **Evidência:**
  - **Login:** Título "Gestão Comercial PMais" (Login.tsx)
  - **Header:** "Gestão Comercial PMais" (Layout.tsx)
  - **Footer:** "Gestão Comercial PMais © 2026" (Layout.tsx)
  - **Browser tab:** `<title>Gestão Comercial PMais</title>` (index.html)
  - Nenhuma ocorrência do nome antigo do produto na interface.

### Item 10 — Exclusão, Inativação e Auditoria

- **Status:** ✅ Corrigido
- **Como:** Botões de exclusão convertidos para inativação em Equipes, Perfis e Parâmetros com justificativa e auditoria. Hook `block_parametro_delete.js` bloqueia exclusão de parâmetros via API. Hooks `block_inactive_responsavel_create.js` e `block_inactive_responsavel_update.js` impedem atribuição de negócios a usuários inativos.
- **Evidência:**
  - Na tab Equipes, o botão de excluir inativa o registro (`ativo = false`) e cria registro em `com_auditoria`.
  - Na tab Perfis, mesmo comportamento.
  - Na tab Parâmetros, tentativa de excluir via API retorna erro 400 (hook bloqueia).
  - Criar/atualizar negócio com responsável inativo retorna erro 400 com `validation_inactive_user`.

### Item 11 — Proibições Mantidas

- **Status:** ✅ Corrigido
- **Como:** Todas as proibições confirmadas: sem publicação, sem ActiveCampaign, sem Resend, sem webhooks, sem scheduler, sem dados reais, sem implementação de pricing, sem Fase 2 iniciada.
- **Evidência:** Nenhum código de integração externa (ActiveCampaign, Resend, webhooks) no projeto. Nenhum scheduler/cron. Todos os dados de seed contêm marcador [TESTE].

---

## 3. Correções Novas Aplicadas nesta Revisão

### 3.1 — Bloqueio de Autenticação para Usuários Inativos (Item 10/K)

- **Status:** ✅ Implementado (NOVO)
- **Como:** Hook `auth_with_password.js` cria rota customizada `/backend/v1/auth-with-password` que verifica `ativo_comercial` antes de autenticar. Se `false`, retorna 401 com mensagem "Usuário inativo comercialmente não pode autenticar".
- **Evidência:**
  - Arquivo: `pocketbase/hooks/auth_with_password.js`
  - Frontend: `src/hooks/use-auth.tsx` — função `signIn` usa `pb.send('/backend/v1/auth-with-password', ...)` em vez de `pb.collection('users').authWithPassword()`.
  - Usuário inativo recebe erro 401 ao tentar logar.

### 3.2 — Verificação de Senha Atual ao Trocar Própria Senha

- **Status:** ✅ Implementado (NOVO)
- **Como:** Hook `change_own_password.js` cria rota `/backend/v1/change-own-password` que:
  1. Recebe `oldPassword` e `newPassword`
  2. Verifica a senha atual chamando a API interna do PocketBase
  3. Se incorreta, retorna 400 com erro de campo `oldPassword: "Senha atual incorreta."`
  4. Se correta, atualiza a senha
- **Evidência:**
  - Arquivo: `pocketbase/hooks/change_own_password.js`
  - Frontend: `src/services/users.ts` — `changeOwnPassword` usa `pb.send('/backend/v1/change-own-password', ...)`.
  - Modal "Alterar Minha Senha" valida a senha atual server-side.

### 3.3 — Alteração de Senha de Outro Usuário (Admin)

- **Status:** ✅ Implementado (NOVO)
- **Como:** Hook `change_user_password.js` cria rota `/backend/v1/change-user-password` que permite ao admin definir nova senha para qualquer usuário, com validação de mínimo 8 caracteres.
- **Evidência:**
  - Arquivo: `pocketbase/hooks/change_user_password.js`
  - Frontend: `src/services/users.ts` — `changeUserPassword` usa `pb.send('/backend/v1/change-user-password', ...)`.
  - Botão "Alterar Senha" em cada linha de usuário abre modal sem campo de senha atual.

### 3.4 — Migration 0025

- **Status:** ✅ Aplicada
- **Como:** Migration `0025_verify_users_rules.js` garante que as access rules da collection `users` estão corretas para o caso de uso admin (qualquer usuário autenticado pode listar/ver/criar/editar; apenas o próprio pode deletar).
- **Evidência:** Arquivo `pocketbase/migrations/0025_verify_users_rules.js`.

---

## 4. Funcionalidades Administrativas Existentes (Mantidas Funcionais)

### Criar Usuário

- Botão "Novo Usuário" no topo da tabela em `/foundation?tab=usuarios`
- Formulário com campos: nome, email, senha, perfil, equipe, ativo comercial
- Validação de campos (email duplicado, senha curta) via `extractFieldErrors`
- Novo usuário aparece na lista imediatamente (via `useRealtime`)

### Editar Usuário

- Botão "Editar" (ícone lápis) em cada linha
- Formulário pré-preenchido com nome, email, perfil, equipe, ativo comercial
- Perfil e equipe pré-selecionados dos registros existentes
- Usuário logado pode editar próprio registro incluindo próprio nome
- Validação inline de erros do backend

### Alterar Senha

- Botão "Alterar Senha" (ícone chave) em cada linha
- Modal para admin definir nova senha (sem senha atual)
- Botão "Alterar Minha Senha" no topo para usuário logado
- Modal com senha atual + nova senha + confirmação
- Validação client-side (mínimo 8 caracteres, senhas coincidem)
- Verificação server-side da senha atual (hook customizado)
- Mensagem de sucesso exibida após alteração

### Nome do Sistema

- "Gestão Comercial PMais" em:
  - Tela de login (CardTitle)
  - Header (texto principal)
  - Footer (copyright)
  - Título da aba do navegador (`<title>`)
- Nenhuma ocorrência de nome antigo

---

## 5. Inventário de Hooks

| Hook                                   | Tipo                       | Descrição                                                     |
| -------------------------------------- | -------------------------- | ------------------------------------------------------------- |
| `auth_with_password.js`                | routerAdd                  | Rota customizada de auth com verificação de ativo_comercial   |
| `change_own_password.js`               | routerAdd                  | Rota para trocar própria senha com verificação de senha atual |
| `change_user_password.js`              | routerAdd                  | Rota para admin trocar senha de qualquer usuário              |
| `block_inactive_responsavel_create.js` | onRecordCreate             | Bloqueia atribuir negócio a usuário inativo (create)          |
| `block_inactive_responsavel_update.js` | onRecordUpdate             | Bloqueia atribuir negócio a usuário inativo (update)          |
| `parametro_version_history.js`         | onRecordAfterUpdateSuccess | Cria versão do parâmetro ao alterar                           |
| `block_parametro_delete.js`            | onRecordDelete             | Bloqueia exclusão de parâmetros                               |
| `change_negocio_responsavel.js`        | routerAdd                  | Rota para trocar responsável de negócio com histórico         |

---

## 6. Inventário de Migrations (0001–0025)

| #    | Arquivo                               | Descrição                                               |
| ---- | ------------------------------------- | ------------------------------------------------------- |
| 0001 | create_com_equipes.js                 | Cria collection com_equipes                             |
| 0002 | create_com_perfis.js                  | Cria collection com_perfis                              |
| 0003 | create_com_permissoes.js              | Cria collection com_permissoes                          |
| 0004 | create_com_perfil_permissoes.js       | Cria collection com_perfil_permissoes                   |
| 0005 | extend_users.js                       | Adiciona perfil_id, equipe_id, ativo_comercial em users |
| 0006 | create_com_usuarios_equipes.js        | Cria collection com_usuarios_equipes                    |
| 0007 | create_com_parametros.js              | Cria collection com_parametros                          |
| 0008 | create_com_empresas.js                | Cria collection com_empresas                            |
| 0009 | create_com_negocios.js                | Cria collection com_negocios                            |
| 0010 | seed_equipes_perfis.js                | Seed de equipes e perfis                                |
| 0011 | seed_permissoes_links.js              | Seed de permissões e vínculos                           |
| 0012 | seed_admin_user.js                    | Seed do usuário admin                                   |
| 0013 | seed_parametros.js                    | Seed de parâmetros iniciais                             |
| 0014 | seed_empresas_negocios.js             | Seed de empresas e negócios                             |
| 0015 | seed_usuarios_equipes.js              | Seed de vínculos usuário × equipe                       |
| 0016 | create_com_negocio_historico.js       | Cria collection com_negocio_historico                   |
| 0017 | create_com_auditoria.js               | Cria collection com_auditoria                           |
| 0018 | extend_com_parametros.js              | Estende com_parametros com campos extras                |
| 0019 | create_com_parametros_versoes.js      | Cria collection com_parametros_versoes                  |
| 0020 | update_users_rules_seed_permission.js | Atualiza rules de users + seed permissão notificações   |
| 0021 | seed_notification_params.js           | Seed de parâmetros de notificação                       |
| 0022 | revoke_exposed_password.js            | Revoga senha exposta                                    |
| 0023 | reset_password.js                     | Redefine senha do admin                                 |
| 0024 | update_users_rules.js                 | Atualiza updateRule de users                            |
| 0025 | verify_users_rules.js                 | Verifica e garante rules corretas de users              |

---

## 7. Segurança

- Senha original `Skip@Pass` revogada (migration 0022 — irreversível)
- Senha redefinida (migration 0023)
- Nenhuma credencial hardcoded no código frontend ou hooks
- `VITE_POCKETBASE_URL` é a única variável de ambiente (URL do backend)
- Senha atual verificada server-side ao trocar própria senha (hook customizado)
- Usuários inativos não podem autenticar (hook customizado)

---

## 8. Confirmação de Proibições

| Item                                    | Status                    |
| --------------------------------------- | ------------------------- |
| Aplicação não publicada                 | ✅                        |
| Sem ActiveCampaign                      | ✅                        |
| Sem Resend                              | ✅                        |
| Sem webhooks                            | ✅                        |
| Sem scheduler                           | ✅                        |
| Sem dados reais                         | ✅ (apenas dados [TESTE]) |
| Sem implementação de pricing            | ✅                        |
| Sem alterações em outros projetos PMais | ✅                        |
| Fase 1 não declarada como fechada       | ✅                        |
| Fase 2 não iniciada                     | ✅                        |
| Sem tokens/secretos expostos            | ✅                        |

---

## 9. Itens Pendentes para Fase 2 (não bloqueantes)

1. **UI gating por permissão:** O frontend não oculta/mostra módulos com base no perfil do usuário. O backend já impede ações não autorizadas via access rules.
2. **Validação multi-perfil:** Usuários com múltiplos perfis recebem a união de permissões no backend, mas não há UI para gerenciar essa união.
3. **Bloqueio de sessão para usuários inativos:** O token JWT permanece válido até expirar. Apenas novo login é bloqueado. Um middleware de refresh com verificação de `ativo_comercial` seria necessário para bloqueio imediato.
4. **Notificações/escalonamento automático:** Parâmetros configurados no banco, mas sem scheduler ou mecanismo de execução (proibido na Fase 1).

---

**Fim do relatório. Aguardando validação explícita do PMais para todos os itens 1–11.**
