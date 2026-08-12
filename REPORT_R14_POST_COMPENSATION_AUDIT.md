# R14 — Auditoria Pós-Compensação Somente-Leitura

**Status:** AGUARDANDO EXECUÇÃO — Este arquivo deve ser populado com a resposta real do hook.

> **Instruções:** Execute `GET /backend/v1/integracao/ac/r14-audit` (autenticado).
> Copie o campo `report_markdown` da resposta JSON para este arquivo.
> Alternativamente, use o serviço `runR14Audit()` em `src/services/r14-audit.ts`.

---

## Escopo

Esta auditoria executa estritamente queries somente-leitura conforme o plano revisado em `PLAN_R14_ENTRY_READ_ONLY.md`.

**Permitido:** HTTP GET; APIs de leitura do PocketBase (`findRecordById`, `findRecordsByFilter`, `countRecords`); leitura de respostas reais.

**Proibido:** POST/PUT/PATCH/DELETE; `save`, `delete`, `runInTransaction`; modificação de locks; chamadas externas; criação de rotas/hooks/migrações/componentes.

---

## Queries a Executar

### Query 1 — Ausência por ID

- `com_vinculos_externos` / `phzmobi8mfb34ha` → esperado: 404 (ausente)
- `com_eventos_integracao` / `pq4npvruaak9gpb` → esperado: 404 (ausente)
- `com_execucoes_sincronizacao` / `62otoics23ul0vy` → esperado: 404 (ausente)

### Query 2 — Dependência Estrutural

- Coleção: `com_ocorrencias_qualidade`
- Filtro: `execucao_id = "62otoics23ul0vy"`
- Sort: `created` | Limite: 100 | Offset: 0
- Esperado: 0 resultados

### Query 3 — Contagens Reais

- `com_eventos_integracao` → esperado: 14
- `com_execucoes_sincronizacao` → esperado: 10
- `com_vinculos_externos` → esperado: 9

### Query 4 — Locks em `com_parametros`

- 6 chaves: `ac_diag_compensacao_dependencias_lock`, `ac_diag_consulta_dependencias_lock`, `ac_diag_compensacao_auditoria_lock`, `ac_r11_execution_lock`, `ac_r12_execution_lock`, `ac_r13_execution_lock`
- Sort: `chave` | Limite: 100
- Apenas leitura — nenhuma modificação

### Query 5 — Contato Informativo

- Coleção: `com_contatos` / ID: `hfjq2q1olefske7`
- Preferido: presente. Se ausente: divergência informativa e PARE.

### Query 6 — Auditoria Complementar

- Coleção: `com_auditoria`
- Filtro: 3 pares collection_name/record_id (OR)
- Sort: `-created` | Limite: 50
- Resultado vazio é aceitável. Não participa do Go/No-Go.

---

## Matriz Go/No-Go (a ser preenchida)

### Go (todos verdadeiros)

- [ ] Três IDs ausentes
- [ ] Zero dependências
- [ ] Contagens 14/10/9
- [ ] Lock principal = `consumed`
- [ ] Todas queries obrigatórias sem erro
- [ ] Zero escritas
- [ ] Zero chamadas externas

### No-Go / PARE (qualquer um)

- [ ] Algum ID presente
- [ ] Dependência encontrada
- [ ] Contagem divergente
- [ ] Lock ≠ consumed/ausente/ilegível
- [ ] Erro em query obrigatória
- [ ] Contato ausente (divergência informativa)
- [ ] Escrita ou chamada externa necessária

**Nota:** Zero registros em `com_auditoria` NÃO é No-Go.

---

## Declaração Final (a ser preenchida)

```json
{
  "r14_started": true,
  "r14_read_only_queries_completed": true,
  "report_created": true,
  "routes_post_put_patch_delete_executed": 0,
  "records_created": 0,
  "records_updated": 0,
  "records_deleted": 0,
  "locks_modified": 0,
  "activecampaign_calls": 0,
  "external_calls": 0,
  "porta_2d2b_started": false,
  "porta_2e_started": false
}
```

---

**PARE.** Após concluir o relatório, nenhuma ação adicional é autorizada.
