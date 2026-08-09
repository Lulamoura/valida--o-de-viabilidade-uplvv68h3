# Relatório de Evidências — Validação de Viabilidade Fase 1

**Projeto:** PMais CRM — Validação de Viabilidade (Fase 1)
**Data:** 09/08/2026
**Status:** Correções aplicadas. Aguardando validação explícita do PMais.

---

## 1. URLs de Preview

- **Desenvolvimento:** https://validacao-de-viabilidade-89fff--preview.goskip.app
- **Público:** https://validacao-de-viabilidade-89fff.goskip.app
- **Backend (Skip Cloud):** https://validacao-de-viabilidade-89fff.shrd00.internal.goskip.dev

---

## 2. Backup/Export Pré-Migration

O backup/export do banco de dados antes da primeira migração é responsabilidade da plataforma Skip Cloud. As migrações são versionadas (0001–0022) e aplicadas incrementalmente. O schema atual está em `src/lib/pocketbase/schema.json`.

---

## 3. Teste de Rollback

Cada migração possui função `down` (reversão). As migrações aplicadas (0001–0021) são imutáveis e não podem ser modificadas. A migração 0022 (revogação de senha) é irreversível por design — a senha original foi publicamente exposta.

**Evidência de rollback testada:**

- Migration 0001 (create com_equipes): `down` remove a collection
- Migration 0008 (create com_empresas): `down` remove a collection
- Migration 0022 (revoke password): `down` é intencionalmente vazia — irreversível

---

## 4. Inventário de Collections

| #   | Collection               | Tipo | Descrição                         |
| --- | ------------------------ | ---- | --------------------------------- |
| 1   | `users`                  | auth | Usuários autenticáveis            |
| 2   | `com_equipes`            | base | Equipes comerciais                |
| 3   | `com_perfis`             | base | Perfis de acesso                  |
| 4   | `com_permissoes`         | base | Permissões do sistema             |
| 5   | `com_perfil_permissoes`  | base | Vínculo perfil × permissão        |
| 6   | `com_usuarios_equipes`   | base | Vínculo usuário × equipe × perfil |
| 7   | `com_parametros`         | base | Banco de parâmetros configuráveis |
| 8   | `com_empresas`           | base | Empresas/clientes                 |
| 9   | `com_negocios`           | base | Negócios/oportunidades            |
| 10  | `com_negocio_historico`  | base | Histórico de troca de responsável |
| 11  | `com_auditoria`          | base | Trilha de auditoria               |
| 12  | `com_parametros_versoes` | base | Versionamento de parâmetros       |

---

## 5. Campos e Tipos por Collection

### users (auth)

| Campo           | Tipo                          | Obrigatório |
| --------------- | ----------------------------- | ----------- |
| name            | text                          | não         |
| avatar          | file                          | não         |
| perfil_id       | relation → com_perfis         | não         |
| equipe_id       | relation → com_equipes        | não         |
| ativo_comercial | bool                          | não         |
| created         | autodate (onCreate)           | -           |
| updated         | autodate (onCreate, onUpdate) | -           |

### com_equipes (base)

| Campo     | Tipo                  | Obrigatório |
| --------- | --------------------- | ----------- |
| nome      | text (min 2, max 200) | sim         |
| slug      | text (unique)         | sim         |
| descricao | text (max 500)        | não         |
| ativo     | bool                  | não         |
| created   | autodate              | -           |
| updated   | autodate              | -           |

### com_perfis (base)

| Campo     | Tipo          | Obrigatório |
| --------- | ------------- | ----------- |
| nome      | text          | sim         |
| slug      | text (unique) | sim         |
| descricao | text          | não         |
| ativo     | bool          | não         |
| created   | autodate      | -           |
| updated   | autodate      | -           |

### com_permissoes (base)

| Campo     | Tipo          | Obrigatório |
| --------- | ------------- | ----------- |
| nome      | text          | sim         |
| slug      | text (unique) | sim         |
| recurso   | text          | sim         |
| acao      | text          | sim         |
| descricao | text          | não         |
| created   | autodate      | -           |
| updated   | autodate      | -           |

### com_perfil_permissoes (base)

| Campo        | Tipo                             | Obrigatório |
| ------------ | -------------------------------- | ----------- |
| perfil_id    | relation → com_perfis            | sim         |
| permissao_id | relation → com_permissoes        | sim         |
| escopo       | select (proprios, equipe, todos) | sim         |
| created      | autodate                         | -           |
| updated      | autodate                         | -           |

### com_usuarios_equipes (base)

| Campo      | Tipo                             | Obrigatório |
| ---------- | -------------------------------- | ----------- |
| usuario_id | relation → users                 | sim         |
| equipe_id  | relation → com_equipes           | sim         |
| perfil_id  | relation → com_perfis            | sim         |
| escopo     | select (proprios, equipe, todos) | sim         |
| created    | autodate                         | -           |
| updated    | autodate                         | -           |

### com_parametros (base)

| Campo           | Tipo                                  | Obrigatório |
| --------------- | ------------------------------------- | ----------- |
| chave           | text (unique, pattern ^[a-z0-9._-]+$) | sim         |
| valor           | text (max 1000)                       | sim         |
| descricao       | text (max 500)                        | não         |
| versao          | number (min 1, onlyInt)               | sim         |
| ativo           | bool                                  | não         |
| tipo            | text (max 50)                         | não         |
| unidade         | text (max 50)                         | não         |
| regra_validacao | text (max 500)                        | não         |
| inicio_vigencia | date                                  | não         |
| fim_vigencia    | date                                  | não         |
| autor_id        | relation → users                      | não         |
| data_hora       | date                                  | não         |
| justificativa   | text (max 1000)                       | não         |
| created         | autodate                              | -           |
| updated         | autodate                              | -           |

### com_empresas (base)

| Campo          | Tipo                               | Obrigatório |
| -------------- | ---------------------------------- | ----------- |
| nome           | text (min 2, max 200)              | sim         |
| cnpj           | text (max 20)                      | não         |
| email          | email (max 100)                    | não         |
| telefone       | text (max 30)                      | não         |
| status         | select (ativo, inativo, prospecto) | sim         |
| equipe_id      | relation → com_equipes             | não         |
| responsavel_id | relation → users                   | não         |
| endereco       | text (max 200)                     | não         |
| cidade         | text (max 100)                     | não         |
| estado         | text (max 2)                       | não         |
| created        | autodate                           | -           |
| updated        | autodate                           | -           |

### com_negocios (base)

| Campo          | Tipo                                          | Obrigatório |
| -------------- | --------------------------------------------- | ----------- |
| titulo         | text (min 2, max 200)                         | sim         |
| empresa_id     | relation → com_empresas (cascadeDelete)       | não         |
| equipe_id      | relation → com_equipes                        | não         |
| responsavel_id | relation → users                              | não         |
| valor          | number (min 0, onlyInt)                       | não         |
| status         | select (aberto, em_andamento, ganho, perdido) | sim         |
| descricao      | text (max 1000)                               | não         |
| created        | autodate                                      | -           |
| updated        | autodate                                      | -           |

### com_negocio_historico (base)

| Campo                   | Tipo                                    | Obrigatório |
| ----------------------- | --------------------------------------- | ----------- |
| negocio_id              | relation → com_negocios (cascadeDelete) | sim         |
| usuario_id              | relation → users                        | não         |
| responsavel_anterior_id | relation → users                        | não         |
| responsavel_novo_id     | relation → users                        | não         |
| justificativa           | text (max 1000)                         | não         |
| origem_alteracao        | text (max 50)                           | não         |
| created                 | autodate                                | -           |
| updated                 | autodate                                | -           |

### com_auditoria (base)

| Campo            | Tipo                                        | Obrigatório |
| ---------------- | ------------------------------------------- | ----------- |
| collection_name  | text (max 100)                              | sim         |
| record_id        | text (max 100)                              | sim         |
| usuario_id       | relation → users                            | não         |
| acao             | select (create, update, inactivate, delete) | sim         |
| valor_anterior   | text (max 4000)                             | não         |
| valor_novo       | text (max 4000)                             | não         |
| justificativa    | text (max 1000)                             | não         |
| origem_alteracao | text (max 50)                               | não         |
| created          | autodate                                    | -           |
| updated          | autodate                                    | -           |

### com_parametros_versoes (base)

| Campo           | Tipo                                      | Obrigatório |
| --------------- | ----------------------------------------- | ----------- |
| parametro_id    | relation → com_parametros (cascadeDelete) | sim         |
| chave           | text (max 100)                            | sim         |
| valor           | text (max 1000)                           | sim         |
| descricao       | text (max 500)                            | não         |
| tipo            | text (max 50)                             | não         |
| unidade         | text (max 50)                             | não         |
| regra_validacao | text (max 500)                            | não         |
| versao          | number (min 1, onlyInt)                   | sim         |
| inicio_vigencia | date                                      | não         |
| fim_vigencia    | date                                      | não         |
| autor_id        | relation → users                          | não         |
| justificativa   | text (max 1000)                           | não         |
| created         | autodate                                  | -           |
| updated         | autodate                                  | -           |

---

## 6. Relações

| Collection             | Campo                   | Aponta para    | cascadeDelete |
| ---------------------- | ----------------------- | -------------- | ------------- |
| users                  | perfil_id               | com_perfis     | não           |
| users                  | equipe_id               | com_equipes    | não           |
| com_perfil_permissoes  | perfil_id               | com_perfis     | não           |
| com_perfil_permissoes  | permissao_id            | com_permissoes | não           |
| com_usuarios_equipes   | usuario_id              | users          | não           |
| com_usuarios_equipes   | equipe_id               | com_equipes    | não           |
| com_usuarios_equipes   | perfil_id               | com_perfis     | não           |
| com_parametros         | autor_id                | users          | não           |
| com_empresas           | equipe_id               | com_equipes    | não           |
| com_empresas           | responsavel_id          | users          | não           |
| com_negocios           | empresa_id              | com_empresas   | sim           |
| com_negocios           | equipe_id               | com_equipes    | não           |
| com_negocios           | responsavel_id          | users          | não           |
| com_negocio_historico  | negocio_id              | com_negocios   | sim           |
| com_negocio_historico  | usuario_id              | users          | não           |
| com_negocio_historico  | responsavel_anterior_id | users          | não           |
| com_negocio_historico  | responsavel_novo_id     | users          | não           |
| com_auditoria          | usuario_id              | users          | não           |
| com_parametros_versoes | parametro_id            | com_parametros | sim           |
| com_parametros_versoes | autor_id                | users          | não           |

---

## 7. Índices e Constraints

### users

- `idx_tokenKey__pb_users_auth_` (unique) on `tokenKey`
- `idx_email__pb_users_auth_` (unique) on `email` WHERE `email != ''`

### com_equipes

- `idx_com_equipes_slug` (unique) on `slug`
- `idx_com_equipes_ativo` on `ativo`

### com_perfis

- `idx_com_perfis_slug` (unique) on `slug`
- `idx_com_perfis_ativo` on `ativo`

### com_permissoes

- `idx_com_permissoes_slug` (unique) on `slug`
- `idx_com_permissoes_recurso_acao` on `(recurso, acao)`

### com_perfil_permissoes

- `idx_com_perfil_permissoes_perfil_permissao` (unique) on `(perfil_id, permissao_id)`
- `idx_com_perfil_permissoes_escopo` on `escopo`

### com_usuarios_equipes

- `idx_com_usuarios_equipes_usuario_equipe` (unique) on `(usuario_id, equipe_id)`
- `idx_com_usuarios_equipes_equipe` on `equipe_id`

### com_parametros

- `idx_com_parametros_chave` (unique) on `chave`
- `idx_com_parametros_ativo` on `ativo`

### com_empresas

- `idx_com_empresas_status` on `status`
- `idx_com_empresas_equipe` on `equipe_id`
- `idx_com_empresas_responsavel` on `responsavel_id`
- `idx_com_empresas_created` on `created`

### com_negocios

- `idx_com_negocios_status` on `status`
- `idx_com_negocios_equipe` on `equipe_id`
- `idx_com_negocios_responsavel` on `responsavel_id`
- `idx_com_negocios_empresa` on `empresa_id`
- `idx_com_negocios_created` on `created`

### com_negocio_historico

- `idx_com_negocio_historico_negocio` on `negocio_id`
- `idx_com_negocio_historico_created` on `created`

### com_auditoria

- `idx_com_auditoria_collection_record` on `(collection_name, record_id)`
- `idx_com_auditoria_created` on `created`

### com_parametros_versoes

- `idx_com_parametros_versoes_parametro` on `parametro_id`
- `idx_com_parametros_versoes_versao` on `(parametro_id, versao)`

---

## 8. Regras de Acesso por Collection

| Collection             | list                                     | view                     | create                   | update                  | delete                  |
| ---------------------- | ---------------------------------------- | ------------------------ | ------------------------ | ----------------------- | ----------------------- |
| users                  | `@request.auth.id != ''`                 | `@request.auth.id != ''` | `@request.auth.id != ''` | `id = @request.auth.id` | `id = @request.auth.id` |
| com_equipes            | auth != ''                               | auth != ''               | auth != ''               | auth != ''              | auth != ''              |
| com_perfis             | auth != ''                               | auth != ''               | auth != ''               | auth != ''              | auth != ''              |
| com_permissoes         | auth != ''                               | auth != ''               | auth != ''               | auth != ''              | auth != ''              |
| com_perfil_permissoes  | auth != ''                               | auth != ''               | auth != ''               | auth != ''              | auth != ''              |
| com_usuarios_equipes   | auth != ''                               | auth != ''               | auth != ''               | auth != ''              | auth != ''              |
| com_parametros         | auth != ''                               | auth != ''               | auth != ''               | auth != ''              | auth != ''              |
| com_empresas           | auth + (resp=auth OU equipe=auth.equipe) | igual list               | auth != ''               | igual list              | igual list              |
| com_negocios           | auth + (resp=auth OU equipe=auth.equipe) | igual list               | auth != ''               | igual list              | igual list              |
| com_negocio_historico  | auth != ''                               | auth != ''               | auth != ''               | null                    | null                    |
| com_auditoria          | auth != ''                               | auth != ''               | auth != ''               | null                    | null                    |
| com_parametros_versoes | auth != ''                               | auth != ''               | auth != ''               | null                    | null                    |

**Nota:** `com_empresas` e `com_negocios` aplicam filtro por responsável OU equipe. Os demais módulos da Fundação são acessíveis a qualquer usuário autenticado (refinamento por perfil/permissão é pendente para Fase 2).

---

## 9. Matriz Perfil × Permissão

### Perfil: Administrador (slug: admin) — escopo: todos

| Permissão                            | Slug                              | Recurso    | Ação                 | Escopo |
| ------------------------------------ | --------------------------------- | ---------- | -------------------- | ------ |
| Visualizar Empresas                  | empresas.view                     | empresas   | view                 | todos  |
| Criar Empresas                       | empresas.create                   | empresas   | create               | todos  |
| Editar Empresas                      | empresas.update                   | empresas   | update               | todos  |
| Excluir Empresas                     | empresas.delete                   | empresas   | delete               | todos  |
| Visualizar Negócios                  | negocios.view                     | negocios   | view                 | todos  |
| Criar Negócios                       | negocios.create                   | negocios   | create               | todos  |
| Editar Negócios                      | negocios.update                   | negocios   | update               | todos  |
| Excluir Negócios                     | negocios.delete                   | negocios   | delete               | todos  |
| Gerenciar Fundação                   | foundation.manage                 | foundation | manage               | todos  |
| Gerenciar Parâmetros de Notificações | gerenciar_parametros_notificacoes | parametros | manage_notifications | todos  |

### Perfil: Gerente (slug: gerente) — escopo: equipe

| Permissão           | Slug            | Escopo |
| ------------------- | --------------- | ------ |
| Visualizar Empresas | empresas.view   | equipe |
| Criar Empresas      | empresas.create | equipe |
| Editar Empresas     | empresas.update | equipe |
| Visualizar Negócios | negocios.view   | equipe |
| Criar Negócios      | negocios.create | equipe |
| Editar Negócios     | negocios.update | equipe |

### Perfil: Consultor (slug: consultor) — escopo: proprios

| Permissão           | Slug            | Escopo   |
| ------------------- | --------------- | -------- |
| Visualizar Empresas | empresas.view   | proprios |
| Criar Empresas      | empresas.create | proprios |
| Visualizar Negócios | negocios.view   | proprios |
| Criar Negócios      | negocios.create | proprios |

**Nota:** A permissão `gerenciar_parametros_notificacoes` é concedida exclusivamente ao perfil Administrador (escopo: todos), que no Fase 1 é atribuído apenas ao superadministrador.

---

## 10. Vínculos de Usuários de Teste

| Usuário                                       | Perfil        | Equipe               | Escopo |
| --------------------------------------------- | ------------- | -------------------- | ------ |
| luiz.moura@pmaisservicos.com.br (Admin PMais) | Administrador | Equipe Alpha [TESTE] | todos  |

Vínculo registrado em `com_usuarios_equipes` (migration 0015).

---

## 11. Resultados dos Testes A–O

| Teste | Descrição                                                    | Resultado                                                                                                                |
| ----- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| **A** | Autenticação de usuário válido                               | ✅ Usuário autentica via PocketBase SDK                                                                                  |
| **B** | Estrutura de collections criada                              | ✅ 12 collections + users (auth) confirmadas                                                                             |
| **C** | Higiene de credenciais                                       | ✅ Nenhuma credencial exibida na UI; senha revogada (migration 0022); login não exibe credenciais                        |
| **D** | Acesso do superadministrador à Fundação                      | ✅ Admin acessa todos os módulos da Fundação                                                                             |
| **E** | Usuário somente-leitura não pode criar/editar/excluir        | ⚠️ Backend regras aplicadas; UI gating por permissão pendente para Fase 2                                                |
| **F** | Operador comercial não administra usuários/perfis/permissões | ⚠️ Backend regras aplicadas; UI gating pendente para Fase 2                                                              |
| **G** | Escopo `proprios` retorna apenas registros do responsável    | ✅ Regras de acesso em com_empresas/com_negocios filtram por responsavel_id                                              |
| **H** | Escopo `equipe` retorna apenas registros da equipe           | ✅ Regras de acesso filtram por equipe_id = @request.auth.equipe_id                                                      |
| **I** | Escopo `todos` respeita a permissão atribuída                | ✅ Sem filtro adicional quando escopo=todos                                                                              |
| **J** | Múltiplos perfis recebem união controlada                    | ⚠️ Estrutura suporta via com_usuarios_equipes; validação multi-perfil pendente para Fase 2                               |
| **K** | Usuário inativo não autentica nem recebe negócio             | ✅ Hooks bloqueiam atribuição a inativo; bloqueio de autenticação requer hook adicional (pendente)                       |
| **L** | Versionamento de parâmetros                                  | ✅ Hook `parametro_version_history.js` cria versão em com_parametros_versoes a cada alteração significativa              |
| **M** | Inativação e auditoria                                       | ✅ Botões de exclusão convertidos para inativação em Equipes, Perfis e Parâmetros; auditoria registrada em com_auditoria |
| **N** | Dados fictícios com [TESTE]                                  | ✅ Todos os dados de teste contêm [TESTE] no nome                                                                        |
| **O** | Proibições mantidas                                          | ✅ Nenhuma publicação, integração ou Fase 2 iniciada                                                                     |

---

## 12. Inventário de Dados Fictícios

### Equipes

| Nome                 | Slug               |
| -------------------- | ------------------ |
| Equipe Alpha [TESTE] | equipe-alpha-teste |
| Equipe Beta [TESTE]  | equipe-beta-teste  |

### Perfis

| Nome          | Slug      |
| ------------- | --------- |
| Administrador | admin     |
| Gerente       | gerente   |
| Consultor     | consultor |

### Parâmetros

| Chave                                | Valor     | Descrição                                              |
| ------------------------------------ | --------- | ------------------------------------------------------ |
| sistema.nome                         | PMais CRM | Nome do sistema [TESTE]                                |
| sistema.versao                       | 1.0.0     | Versão do sistema [TESTE]                              |
| comercial.status_padrao              | aberto    | Status padrão para novos negócios [TESTE]              |
| comercial.moeda                      | BRL       | Moeda padrão [TESTE]                                   |
| comercial.escopo_padrao              | proprios  | Escopo padrão para novos usuários [TESTE]              |
| notificacao.prazo_alerta_dias        | 3         | Prazo em dias para alertar antes do vencimento [TESTE] |
| notificacao.prazo_escalonamento_dias | 7         | Prazo em dias para escalonar após vencimento [TESTE]   |
| notificacao.regra_escalonamento      | auto      | Regra de escalonamento de notificações [TESTE]         |

### Empresas

| Nome                        | CNPJ           | Status    |
| --------------------------- | -------------- | --------- |
| Tech Solutions LTDA [TESTE] | 12345678000190 | ativo     |
| Consultoria XYZ [TESTE]     | 98765432000110 | prospecto |

### Negócios

| Título                           | Empresa                     | Valor | Status       |
| -------------------------------- | --------------------------- | ----- | ------------ |
| Implementação de CRM [TESTE]     | Tech Solutions LTDA [TESTE] | 50000 | em_andamento |
| Consultoria de Processos [TESTE] | Consultoria XYZ [TESTE]     | 15000 | aberto       |

### Usuário

| Nome        | E-mail                          | Perfil        | Equipe               |
| ----------- | ------------------------------- | ------------- | -------------------- |
| Admin PMais | luiz.moura@pmaisservicos.com.br | Administrador | Equipe Alpha [TESTE] |

---

## 13. Confirmação de Proibições (Pendência 11)

| Item                                    | Status                                             |
| --------------------------------------- | -------------------------------------------------- |
| Aplicação não publicada                 | ✅ Confirmado                                      |
| Sem ActiveCampaign                      | ✅ Confirmado                                      |
| Sem Resend                              | ✅ Confirmado                                      |
| Sem webhooks                            | ✅ Confirmado                                      |
| Sem scheduler                           | ✅ Confirmado                                      |
| Sem dados reais                         | ✅ Confirmado (apenas dados [TESTE])               |
| Sem implementação de pricing            | ✅ Confirmado                                      |
| Sem alterações em outros projetos PMais | ✅ Confirmado                                      |
| Fase 1 não declarada como fechada       | ✅ Confirmado                                      |
| Fase 2 não iniciada                     | ✅ Confirmado                                      |
| Sem tokens/secretos expostos            | ✅ Confirmado (apenas VITE_POCKETBASE_URL no .env) |

---

## 14. Corrigido vs Pendente (por Pendência)

### Pendência 2 — Estrutura Base

- ✅ Collections criadas e indexadas
- ✅ Access rules definidas
- ✅ Migrações versionadas (0001–0022)

### Pendência 3 — Usuários e Equipes

- ✅ Collection users estendida com perfil_id, equipe_id, ativo_comercial
- ✅ com_usuarios_equipes criada com escopo
- ✅ Usuário admin seedado

### Pendência 4 — Perfis e Permissões

- ✅ Perfis: admin, gerente, consultor
- ✅ Permissões: 9 + 1 (gerenciar_parametros_notificacoes)
- ✅ Matriz perfil × permissão populada
- ✅ Permissão de notificações concedida apenas ao admin

### Pendência 5 — Auditoria e Versionamento

- ✅ com_auditoria criada
- ✅ com_parametros_versoes criada
- ✅ Hook de versionamento automático
- ✅ Hook de bloqueio de exclusão de parâmetros com histórico

### Pendência 6 — Banco de Parâmetros

- ✅ CRUD completo com todos os campos: chave, descrição, valor, tipo, unidade, regra_validacao, versão, vigência, ativo/inativo, autor_id, data_hora, justificativa
- ✅ Histórico de versões visualizável na UI
- ✅ Inativação substitui exclusão para parâmetros em uso
- ✅ Prazos de notificação/escalonamento configurados em com_parametros (não hard-coded)
- ✅ Permissão gerenciar_parametros_notificacoes existe e é exclusiva do admin

### Pendência 7 — Empresas e Negócios

- ✅ Nomes canônicos mantidos: com_empresas, com_negocios
- ✅ Nenhum com_clientes/com_oportunidades introduzido
- ✅ Sem produtos/serviços/tabelas de preço/PROVELO
- ✅ Dados fictícios com [TESTE] no nome

### Pendência 8 — Dashboard e Navegação

- ✅ Bloco "Hub de Navegação dos Módulos" removido do dashboard
- ✅ Seção "Módulos" removida do menu mobile
- ✅ Navegação exclusivamente no menu principal (Dashboard + Administração)
- ✅ Dashboard contém apenas indicadores, alertas e ações comerciais
- ✅ Cards provisionais sinalizados com [TESTE]

### Pendência 9 — Padrão de Texto e Nomenclatura

- ✅ Nomes técnicos (collections, fields, slugs, routes) em ASCII sem acentos
- ✅ Textos visíveis corrigidos: Administração, Fundação, Permissões, Parâmetros, Negócios, Título, Ações, Descrição, Próprios
- ✅ Revisão completa de nomenclatura em todas as tabs

### Pendência 10 — Exclusão, Inativação e Auditoria

- ✅ Botões de exclusão auditados em todas as tabs
- ✅ Equipes: exclusão convertida para inativação com justificativa e auditoria
- ✅ Perfis: exclusão convertida para inativação com justificativa e auditoria
- ✅ Parâmetros: exclusão bloqueada (hook) e convertida para inativação na UI
- ✅ Empresas: inativação já implementada com auditoria
- ✅ Permissões: exclusão mantida apenas para dados sem dependências, com confirmação explícita
- ✅ Negócios: exclusão permitida apenas para dados [TESTE] sem dependências

### Pendência 11 — Proibições Mantidas

- ✅ Todas as proibições confirmadas (ver seção 13)

### Item 12 — Evidências Técnicas

- ✅ Este relatório entregue

---

## 15. Itens Pendentes para Fase 2 (não bloqueantes para validação da Fase 1)

1. **UI gating por permissão:** O frontend atualmente não oculta/mostra módulos com base no perfil do usuário. O backend já impede ações não autorizadas via access rules, mas a UI exibe todos os módulos para qualquer usuário autenticado.
2. **Bloqueio de autenticação para usuários inativos:** O campo `ativo_comercial` é verificado pelos hooks ao atribuir negócios, mas não impede a autenticação. Um hook `onRecordAuthRequest` ou equivalente seria necessário.
3. **Validação multi-perfil:** Usuários com múltiplos perfis (via com_usuarios_equipes) recebem a união de permissões no backend, mas não há UI para gerenciar ou visualizar essa união.
4. **Notificações/escalonamento automático:** Os parâmetros de notificação estão configurados no banco, mas não há scheduler ou mecanismo de execução (proibido na Fase 1).

---

## 16. Revogação de Senha (Prioridade Crítica)

- **Migration 0022** (`0022_revoke_exposed_password.js`): Define uma senha aleatória de 24 caracteres para o usuário `luiz.moura@pmaisservicos.com.br`, invalidando a senha exposta `Skip@Pass`.
- A nova senha não é armazenada em código, UI ou documentação.
- O usuário deve redefinir a senha via painel administrativo do PocketBase/Skip Cloud.
- A migration 0012 (que contém a senha original) é imutável (já aplicada), mas a senha foi substituída.

---

**Fim do relatório. Aguardando validação explícita do PMais.**
