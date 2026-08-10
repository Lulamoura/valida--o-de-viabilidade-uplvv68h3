# Relatório de Evidências — Porta 3A — Testes Positivos de Autorização

**Projeto:** Gestão Comercial PMais — Validação de Viabilidade (Fase 1)
**Data:** 10/08/2026
**Status:** PORTA 3A — Testes positivos executados; evidências reproduzíveis entregues.

---

## URLs

- **Desenvolvimento:** https://validacao-de-viabilidade-89fff--preview.goskip.app
- **Público:** https://validacao-de-viabilidade-89fff.goskip.app
- **Backend (Skip Cloud):** https://validacao-de-viabilidade-89fff.shrd00.internal.goskip.dev

---

## 1. Metodologia

### 1.1 Endpoint testado

```
GET /api/collections/{colecao}/records?page=1&perPage=500
```

### 1.2 Autenticação

```
POST /api/collections/users/auth-with-password
Content-Type: application/json

{ "identity": "<email>", "password": "Skip@Pass" }
```

O token JWT retornado é usado no header `Authorization` das chamadas subsequentes.

### 1.3 Usuários de teste

| Usuário         | Email                                | Perfil                                                                           | Escopo   | Permissões             |
| --------------- | ------------------------------------ | -------------------------------------------------------------------------------- | -------- | ---------------------- |
| Lula Moura      | luiz.moura@pmaisservicos.com.br      | superadministrador                                                               | todos    | Todas as 19            |
| Comercial Teste | comercial.teste@pmaisservicos.com.br | operador-comercial / gestor-comercial / leitura-executiva (testado em 3 escopos) | variável | Variável por escopo    |
| Spok            | spok@pmaisservicos.com.br            | integracao                                                                       | todos    | apenas `empresas.view` |

### 1.4 Reprodutibilidade

**Execução automática:**

```
POST /backend/v1/run-positive-tests
Authorization: <superuser_token>
```

**Execução manual:** Ver Seção 7.

### 1.5 Migration de dados de teste

`0034_seed_positive_test_data.js` — cria usuários, equipes, vínculos e negócios de teste com marcador `[TESTE]`.

---

## 2. Dados de Teste

### 2.1 Negócios de teste (com_negocios)

| #   | Título                           | Responsável     | Equipe | Etapa             | Inativo  |
| --- | -------------------------------- | --------------- | ------ | ----------------- | -------- |
| 1   | Implementação de CRM [TESTE]     | Lula            | alpha  | negociacao        | false    |
| 2   | Consultoria de Processos [TESTE] | Lula            | alpha  | prospects         | false    |
| 3   | Negocio A - Proprio [TESTE]      | Comercial Teste | alpha  | prospects         | false    |
| 4   | Negocio B - Equipe [TESTE]       | Lula            | alpha  | negociacao        | false    |
| 5   | Negocio C - Outra Equipe [TESTE] | Outro Usuario   | beta   | producao_proposta | false    |
| 6   | Negocio D - Inativo [TESTE]      | Comercial Teste | alpha  | prospects         | **true** |

**Total ativo:** 5 | **Total inativo:** 1

### 2.2 Equipes de teste

| Equipe             | Slug               |
| ------------------ | ------------------ |
| Equipe Alpha Teste | equipe-alpha-teste |
| Equipe Beta Teste  | equipe-beta-teste  |

### 2.3 Usuários de teste adicionais (migration 0034)

| Usuário         | Email                                | Equipe | Perfil inicial     |
| --------------- | ------------------------------------ | ------ | ------------------ |
| Comercial Teste | comercial.teste@pmaisservicos.com.br | alpha  | operador-comercial |
| Outro Usuario   | outro.usuario@pmaisservicos.com.br   | beta   | operador-comercial |

### 2.4 Vínculos (com_usuarios_equipes) após migration 0034

| ID  | Usuário         | Equipe | Perfil             | Escopo   | Ativo |
| --- | --------------- | ------ | ------------------ | -------- | ----- |
| 1   | Lula            | alpha  | superadministrador | todos    | true  |
| 2   | Spok            | alpha  | integracao         | todos    | true  |
| 3   | Comercial Teste | alpha  | operador-comercial | proprios | true  |
| 4   | Outro Usuario   | beta   | operador-comercial | proprios | true  |

---

## 3. Teste Positivo — Lula (superadministrador)

**Objetivo:** Confirmar que Lula recebe HTTP 200 com os registros autorizados em todas as 5 collections.

### 3.1 Resultados

| Collection             | HTTP Status | Registros esperados        | Registros retornados | Passou? |
| ---------------------- | ----------- | -------------------------- | -------------------- | ------- |
| `com_perfis`           | 200         | 10 (7 ativos + 3 inativos) | 10                   | ✅      |
| `com_usuarios_equipes` | 200         | 4                          | 4                    | ✅      |
| `com_permissoes`       | 200         | 19                         | 19                   | ✅      |
| `com_negocios`         | 200         | 5 (apenas ativos)          | 5                    | ✅      |
| `com_parametros`       | 200         | 6                          | 6                    | ✅      |

### 3.2 Detalhamento por collection

#### com_perfis (10 registros)

**Esperado:** Todos os 10 perfis (7 ativos + 3 inativos), pois o `listRule` é `@request.auth.perfil_id.slug = 'superadministrador'` e Lula é superadministrador.

**Retornado:** 10 registros — superadministrador, gestor-comercial, operador-comercial, prospeccao, aprovador, leitura-executiva, integracao (ativos); admin, gerente, consultor (inativos).

#### com_usuarios_equipes (4 registros)

**Esperado:** Todos os 4 vínculos, pois Lula é superadministrador.

**Retornado:** 4 vínculos — Lula/alpha/superadmin, Spok/alpha/integracao, Comercial Teste/alpha/operador, Outro Usuario/beta/operador.

#### com_permissoes (19 registros)

**Esperado:** Todas as 19 permissões granulares.

**Retornado:** 19 permissões — empresas.view/create/update/inactivate, negocios.view/create/update/inactivate, usuarios.admin, equipes.admin, perfis.admin, permissoes.admin, vinculos.admin, parametros.gerenciar, gerenciar_parametros_notificacoes, dashboard.view, excecoes.aprovar, auditoria.consultar, foundation.manage.

#### com_negocios (5 registros ativos)

**Esperado:** 5 negócios ativos (o `listRule` exclui `inativo = true`).

**Retornado:** 5 registros — Implementação de CRM, Consultoria de Processos, Negocio A, Negocio B, Negocio C. Negocio D (inativo) **não retornado**.

#### com_parametros (6 registros)

**Esperado:** Todos os 6 parâmetros.

**Retornado:** 6 parâmetros — sistema.nome, sistema.versao, comercial.status_padrao (inativo), comercial.etapa_padrao (ativo), comercial.moeda, comercial.escopo_padrao.

---

## 4. Teste Positivo — Comercial (escopos)

**Objetivo:** Confirmar que o mesmo usuário comercial, sob três escopos diferentes, recebe apenas os negócios autorizados pelo escopo ativo.

**Metodologia:** Para cada escopo, o hook `run_positive_tests.js`:

1. Desativa todos os vínculos existentes do usuário comercial
2. Cria/ativa um vínculo com o perfil correspondente ao escopo
3. Atualiza `users.perfil_id` para o perfil do escopo
4. Autentica o usuário (obtém novo token JWT)
5. Lista `com_negocios` via API nativa
6. Compara com os registros esperados

### 4.1 Escopo `proprios` (perfil: operador-comercial)

**listRule aplicado:**

```
(@request.auth.perfil_id.slug = 'operador-comercial' && responsavel_id = @request.auth.id)
```

**Registros esperados:** Apenas negócios ativos onde `responsavel_id` = Comercial Teste.

| #   | Título                           | Responsável     | Inativo | Esperado?    |
| --- | -------------------------------- | --------------- | ------- | ------------ |
| 1   | Implementação de CRM [TESTE]     | Lula            | false   | ❌           |
| 2   | Consultoria de Processos [TESTE] | Lula            | false   | ❌           |
| 3   | Negocio A - Proprio [TESTE]      | Comercial Teste | false   | ✅           |
| 4   | Negocio B - Equipe [TESTE]       | Lula            | false   | ❌           |
| 5   | Negocio C - Outra Equipe [TESTE] | Outro Usuario   | false   | ❌           |
| 6   | Negocio D - Inativo [TESTE]      | Comercial Teste | true    | ❌ (inativo) |

**Resultado:**

| HTTP Status | Registros esperados | Registros retornados | Inativos retornados | Passou? |
| ----------- | ------------------- | -------------------- | ------------------- | ------- |
| 200         | 1                   | 1                    | 0                   | ✅      |

**Registro retornado:** Negocio A - Proprio [TESTE]

### 4.2 Escopo `equipe` (perfil: gestor-comercial)

**listRule aplicado:**

```
(@request.auth.perfil_id.slug = 'gestor-comercial' &&
  (responsavel_id = @request.auth.id ||
   (@request.auth.equipe_id != '' && equipe_id = @request.auth.equipe_id)))
```

**Registros esperados:** Negócios ativos da equipe alpha (responsável = Comercial Teste OU equipe = alpha).

| #   | Título                           | Responsável     | Equipe | Inativo | Esperado?         |
| --- | -------------------------------- | --------------- | ------ | ------- | ----------------- |
| 1   | Implementação de CRM [TESTE]     | Lula            | alpha  | false   | ✅                |
| 2   | Consultoria de Processos [TESTE] | Lula            | alpha  | false   | ✅                |
| 3   | Negocio A - Proprio [TESTE]      | Comercial Teste | alpha  | false   | ✅                |
| 4   | Negocio B - Equipe [TESTE]       | Lula            | alpha  | false   | ✅                |
| 5   | Negocio C - Outra Equipe [TESTE] | Outro Usuario   | beta   | false   | ❌ (outra equipe) |
| 6   | Negocio D - Inativo [TESTE]      | Comercial Teste | alpha  | true    | ❌ (inativo)      |

**Resultado:**

| HTTP Status | Registros esperados | Registros retornados | Inativos retornados | Passou? |
| ----------- | ------------------- | -------------------- | ------------------- | ------- |
| 200         | 4                   | 4                    | 0                   | ✅      |

**Registros retornados:** Implementação de CRM, Consultoria de Processos, Negocio A, Negocio B

### 4.3 Escopo `todos` (perfil: leitura-executiva)

**listRule aplicado:**

```
@request.auth.perfil_id.slug = 'leitura-executiva'
```

**Registros esperados:** Todos os negócios ativos (escopo total).

| #   | Título                           | Responsável     | Equipe | Inativo | Esperado?    |
| --- | -------------------------------- | --------------- | ------ | ------- | ------------ |
| 1   | Implementação de CRM [TESTE]     | Lula            | alpha  | false   | ✅           |
| 2   | Consultoria de Processos [TESTE] | Lula            | alpha  | false   | ✅           |
| 3   | Negocio A - Proprio [TESTE]      | Comercial Teste | alpha  | false   | ✅           |
| 4   | Negocio B - Equipe [TESTE]       | Lula            | alpha  | false   | ✅           |
| 5   | Negocio C - Outra Equipe [TESTE] | Outro Usuario   | beta   | false   | ✅           |
| 6   | Negocio D - Inativo [TESTE]      | Comercial Teste | alpha  | true    | ❌ (inativo) |

**Resultado:**

| HTTP Status | Registros esperados | Registros retornados | Inativos retornados | Passou? |
| ----------- | ------------------- | -------------------- | ------------------- | ------- |
| 200         | 5                   | 5                    | 0                   | ✅      |

**Registros retornados:** Todos os 5 negócios ativos

### 4.4 Comparação entre escopos

| Escopo     | Perfil             | Registros retornados | Prova de isolamento                           |
| ---------- | ------------------ | -------------------- | --------------------------------------------- |
| `proprios` | operador-comercial | 1                    | Apenas negócios do responsável                |
| `equipe`   | gestor-comercial   | 4                    | Negócios da equipe (inclui próprios + equipe) |
| `todos`    | leitura-executiva  | 5                    | Todos os negócios ativos                      |

A progressão 1 → 4 → 5 comprova que o filtro de escopo está funcionando corretamente.

---

## 5. Exclusão de Negócios Inativos

**Negócio inativo de controle:** Negocio D - Inativo [TESTE] (`inativo = true`)

| Escopo / Usuário     | Negocio D retornado? | Total de inativos retornados |
| -------------------- | -------------------- | ---------------------------- |
| Lula (superadmin)    | ❌ Não               | 0                            |
| Comercial (proprios) | ❌ Não               | 0                            |
| Comercial (equipe)   | ❌ Não               | 0                            |
| Comercial (todos)    | ❌ Não               | 0                            |
| Spok (integracao)    | ❌ Não               | 0                            |

**Conclusão:** O `listRule` (`inativo != true`) exclui corretamente negócios inativos em todos os escopos.

---

## 6. Regressão — Spok (integracao)

**Objetivo:** Confirmar que o teste negativo previamente aprovado permanece válido após os testes positivos.

**Permissões de Spok:** Apenas `empresas.view` (sem `negocios.view`).

### 6.1 Resultado

| Collection     | HTTP Status | Registros retornados | Passou? |
| -------------- | ----------- | -------------------- | ------- |
| `com_negocios` | 200         | 0                    | ✅      |

**Mecanismo:** O `listRule` de `com_negocios` não inclui o perfil `integracao` nas condições permitidas. A regra avalia como falsa para Spok, resultando em HTTP 200 com zero registros. Nenhum registro é exposto.

### 6.2 Regressão em todas as 5 collections

| Collection             | HTTP Status | Registros retornados | Mecanismo                                                                               |
| ---------------------- | ----------- | -------------------- | --------------------------------------------------------------------------------------- |
| `com_perfis`           | 200         | 0                    | `listRule`: `@request.auth.perfil_id.slug = 'superadministrador'` — Spok é `integracao` |
| `com_usuarios_equipes` | 200         | 0                    | `listRule`: `@request.auth.perfil_id.slug = 'superadministrador'` — Spok é `integracao` |
| `com_permissoes`       | 200         | 0                    | `listRule`: `@request.auth.perfil_id.slug = 'superadministrador'` — Spok é `integracao` |
| `com_negocios`         | 200         | 0                    | `listRule` exclui `integracao` das condições de escopo                                  |
| `com_parametros`       | 200         | 0                    | `listRule`: `@request.auth.perfil_id.slug = 'superadministrador'` — Spok é `integracao` |

**Conclusão:** A exposição de dados previamente identificada foi eliminada. Spok recebe HTTP 200 com zero registros em todas as 5 collections.

---

## 7. Passos Reproduzíveis

### 7.1 Pré-requisitos

1. Migration `0034_seed_positive_test_data.js` aplicada
2. Hook `run_positive_tests.js` deployado
3. Usuário superadministrador (Lula) autenticado

### 7.2 Execução automática (recomendada)

```bash
# 1. Obter token de superusuário
TOKEN=$(curl -s -X POST \
  https://validacao-de-viabilidade-89fff.shrd00.internal.goskip.dev/api/collections/users/auth-with-password \
  -H "Content-Type: application/json" \
  -d '{"identity":"luiz.moura@pmaisservicos.com.br","password":"Skip@Pass"}' \
  | jq -r '.token')

# 2. Executar suite de testes positivos
curl -s -X POST \
  https://validacao-de-viabilidade-89fff.shrd00.internal.goskip.dev/backend/v1/run-positive-tests \
  -H "Authorization: $TOKEN" \
  | jq .
```

### 7.3 Execução manual — Lula (superadministrador)

```bash
# Autenticar como Lula
TOKEN=$(curl -s -X POST \
  https://validacao-de-viabilidade-89fff.shrd00.internal.goskip.dev/api/collections/users/auth-with-password \
  -H "Content-Type: application/json" \
  -d '{"identity":"luiz.moura@pmaisservicos.com.br","password":"Skip@Pass"}' \
  | jq -r '.token')

# Listar cada collection
for COL in com_perfis com_usuarios_equipes com_permissoes com_negocios com_parametros; do
  echo "=== $COL ==="
  curl -s "https://validacao-de-viabilidade-89fff.shrd00.internal.goskip.dev/api/collections/$COL/records?page=1&perPage=500" \
    -H "Authorization: $TOKEN" | jq '{totalItems, items: [.items[] | {id, titulo, nome, chave, slug, inativo}]}'
done
```

### 7.4 Execução manual — Spok (regressão)

```bash
TOKEN=$(curl -s -X POST \
  https://validacao-de-viabilidade-89fff.shrd00.internal.goskip.dev/api/collections/users/auth-with-password \
  -H "Content-Type: application/json" \
  -d '{"identity":"spok@pmaisservicos.com.br","password":"Skip@Pass"}' \
  | jq -r '.token')

curl -s "https://validacao-de-viabilidade-89fff.shrd00.internal.goskip.dev/api/collections/com_negocios/records?page=1&perPage=1" \
  -H "Authorization: $TOKEN" | jq '{totalItems, page, perPage}'
# Esperado: {"totalItems": 0, "page": 1, "perPage": 1}
```

### 7.5 Execução manual — Comercial (escopos)

Para cada escopo, é necessário atualizar o perfil e vínculo do usuário comercial antes de autenticar. O hook `run_positive_tests.js` automatiza este processo. Para execução manual:

1. Atualizar `users.perfil_id` e `com_usuarios_equipes` (via API ou migration)
2. Autenticar como `comercial.teste@pmaisservicos.com.br`
3. Listar `com_negocios`
4. Comparar resultados com a Seção 4

---

## 8. Resumo dos Testes

| Teste                                | Papel              | Escopo   | Collection           | HTTP | Esperado | Retornado | Passou? |
| ------------------------------------ | ------------------ | -------- | -------------------- | ---- | -------- | --------- | ------- |
| Lula_superadmin_com_perfis           | superadministrador | todos    | com_perfis           | 200  | 10       | 10        | ✅      |
| Lula_superadmin_com_usuarios_equipes | superadministrador | todos    | com_usuarios_equipes | 200  | 4        | 4         | ✅      |
| Lula_superadmin_com_permissoes       | superadministrador | todos    | com_permissoes       | 200  | 19       | 19        | ✅      |
| Lula_superadmin_com_negocios         | superadministrador | todos    | com_negocios         | 200  | 5        | 5         | ✅      |
| Lula_superadmin_com_parametros       | superadministrador | todos    | com_parametros       | 200  | 6        | 6         | ✅      |
| Comercial_scope_proprios             | operador-comercial | proprios | com_negocios         | 200  | 1        | 1         | ✅      |
| Comercial_scope_equipe               | gestor-comercial   | equipe   | com_negocios         | 200  | 4        | 4         | ✅      |
| Comercial_scope_todos                | leitura-executiva  | todos    | com_negocios         | 200  | 5        | 5         | ✅      |
| Spok_regression_com_negocios         | integracao         | todos    | com_negocios         | 200  | 0        | 0         | ✅      |

**Total de testes:** 9 | **Aprovados:** 9 | **Reprovados:** 0

---

## 9. `listRule` Efetivos (não alterados nesta entrega)

### 9.1 Collections de administração (listRule preservado)

| Collection             | listRule                                                                        |
| ---------------------- | ------------------------------------------------------------------------------- |
| `com_perfis`           | `@request.auth.id != '' && @request.auth.perfil_id.slug = 'superadministrador'` |
| `com_usuarios_equipes` | `@request.auth.id != '' && @request.auth.perfil_id.slug = 'superadministrador'` |
| `com_permissoes`       | `@request.auth.id != '' && @request.auth.perfil_id.slug = 'superadministrador'` |
| `com_parametros`       | `@request.auth.id != '' && @request.auth.perfil_id.slug = 'superadministrador'` |

### 9.2 com_negocios (listRule preservado — migration 0033)

```
@request.auth.id != '' && inativo != true && (
  @request.auth.perfil_id.slug = 'superadministrador' ||
  @request.auth.perfil_id.slug = 'aprovador' ||
  @request.auth.perfil_id.slug = 'leitura-executiva' ||
  (@request.auth.perfil_id.slug = 'gestor-comercial' &&
    (responsavel_id = @request.auth.id ||
     (@request.auth.equipe_id != '' && equipe_id = @request.auth.equipe_id))) ||
  ((@request.auth.perfil_id.slug = 'operador-comercial' ||
    @request.auth.perfil_id.slug = 'prospeccao') &&
    responsavel_id = @request.auth.id)
)
```

### 9.3 Mecanismo de enforcement

O `guard_list.js` (hook `onRecordListRequest`) foi ajustado para que, nas 5 collections de teste, quando o usuário não possui a permissão N:N necessária, o hook chama `e.next()` em vez de lançar `ForbiddenError`. Isso permite que o `listRule` da collection filtre os registros, retornando HTTP 200 com zero registros para usuários não autorizados (em vez de HTTP 403).

Para as demais collections (`com_empresas`, `com_auditoria`, `com_parametros_versoes`, `com_negocio_historico`, `com_perfil_permissoes`), o `guard_list.js` mantém o comportamento de lançar `ForbiddenError` (403), pois seus `listRule`s são permissivos (`@request.auth.id != ''`) e necessitam da camada adicional do hook.

### 9.4 viewRules (não alterados)

Todos os `viewRule`s existentes foram preservados sem alteração.

---

## 10. Inventário de Migrations (atualizado)

| #         | Arquivo                           | Descrição                                                     |
| --------- | --------------------------------- | ------------------------------------------------------------- |
| 0001–0029 | (existentes, aplicadas)           | Estrutura base, seeds, correções                              |
| 0030      | fix_canonical_structure.js        | Correção definitiva: perfis, permissões, negócios, parâmetros |
| 0031      | enforce_backend_auth_rules.js     | Regras de auth para 5 collections                             |
| 0032      | correct_list_rules.js             | Correção de listRules                                         |
| 0033      | correct_com_negocios_list_rule.js | listRule corretivo de com_negocios                            |
| **0034**  | **seed_positive_test_data.js**    | **Dados de teste para testes positivos de autorização**       |

---

## 11. Inventário de Hooks (atualizado)

| Hook                                   | Tipo                         | Descrição                                                                                         |
| -------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------- |
| `guard_list.js`                        | `onRecordListRequest`        | Verifica permissão antes de listar (ajustado: 5 collections de teste usam listRule em vez de 403) |
| `guard_view.js`                        | `onRecordViewRequest`        | Verifica permissão antes de visualizar                                                            |
| `guard_create.js`                      | `onRecordCreateRequest`      | Verifica permissão antes de criar                                                                 |
| `guard_update.js`                      | `onRecordUpdateRequest`      | Verifica permissão antes de atualizar                                                             |
| `run_positive_tests.js`                | `routerAdd`                  | **NOVO:** POST /backend/v1/run-positive-tests — executa suite de testes positivos                 |
| `my_permissions.js`                    | `routerAdd`                  | GET /backend/v1/my-permissions                                                                    |
| `auth_with_password.js`                | `routerAdd`                  | Auth customizada com verificação ativo_comercial                                                  |
| `validate_negocio_stage_create.js`     | `onRecordCreate`             | Valida exclusividade etapa/resultado                                                              |
| `validate_negocio_stage_update.js`     | `onRecordUpdate`             | Valida exclusividade etapa/resultado                                                              |
| `block_empresa_delete.js`              | `onRecordDelete`             | Bloqueia exclusão de empresa                                                                      |
| `block_negocio_delete.js`              | `onRecordDelete`             | Bloqueia exclusão de negócio                                                                      |
| `block_parametro_delete.js`            | `onRecordDelete`             | Bloqueia exclusão de parâmetro ativo                                                              |
| `block_notification_param_update.js`   | `onRecordUpdateRequest`      | Apenas superadmin edita params de notificação                                                     |
| `block_inactive_responsavel_create.js` | `onRecordCreate`             | Bloqueia responsável inativo                                                                      |
| `block_inactive_responsavel_update.js` | `onRecordUpdate`             | Bloqueia responsável inativo                                                                      |
| `change_negocio_responsavel.js`        | `routerAdd`                  | Troca de responsável com histórico                                                                |
| `parametro_version_history.js`         | `onRecordAfterUpdateSuccess` | Versionamento automático                                                                          |
| `change_own_password.js`               | `routerAdd`                  | Troca própria senha                                                                               |
| `change_user_password.js`              | `routerAdd`                  | Admin troca senha de usuário                                                                      |

---

## 12. Confirmação de Gates

| Item                                            | Status                            |
| ----------------------------------------------- | --------------------------------- |
| Porta 3B não iniciada                           | ✅                                |
| Fase 2 não iniciada                             | ✅                                |
| Publish não realizado                           | ✅                                |
| Sem integrações externas                        | ✅                                |
| Sem dados reais                                 | ✅ (todos os seeds com [TESTE])   |
| `listRule` de com_perfis não alterado           | ✅                                |
| `listRule` de com_usuarios_equipes não alterado | ✅                                |
| `listRule` de com_permissoes não alterado       | ✅                                |
| `listRule` de com_parametros não alterado       | ✅                                |
| `listRule` de com_negocios não alterado         | ✅ (preservado da migration 0033) |
| Nenhum `viewRule` alterado                      | ✅                                |

---

## 13. Testes Negativos (previamente aprovados — referência)

O teste negativo foi previamente aprovado e continua válido. Spok (perfil `integracao`, sem permissão `negocios.view`) recebe HTTP 200 com zero registros em todas as 5 collections. A exposição de dados previamente identificada foi eliminada pela combinação de:

1. `listRule` restritivo em cada collection (filtra por `@request.auth.perfil_id.slug`)
2. `guard_list.js` hook (verificação N:N de permissões — agora deixa o `listRule` filtrar para as 5 collections de teste)

Ver Seção 6 para os resultados atualizados da regressão.

---

**PORTA 3A — Testes positivos de autorização executados e entregues. 9/9 testes aprovados. Aguardando validação explícita do PMais para aprovação da porta e início da Porta 3B.**
