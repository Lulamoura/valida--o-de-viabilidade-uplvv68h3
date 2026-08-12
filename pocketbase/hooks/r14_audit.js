routerAdd(
  'GET',
  '/backend/v1/integracao/ac/r14-audit',
  (e) => {
    const executedAt = new Date().toISOString()
    const routeVersion = 'R14-POST-COMPENSATION-AUDIT-20260812-v1'
    const ID_V = 'phzmobi8mfb34ha'
    const ID_E = 'pq4npvruaak9gpb'
    const ID_X = '62otoics23ul0vy'
    const ID_C = 'hfjq2q1olefske7'
    const LOCK_KEYS = [
      'ac_diag_compensacao_dependencias_lock',
      'ac_diag_consulta_dependencias_lock',
      'ac_diag_compensacao_auditoria_lock',
      'ac_r11_execution_lock',
      'ac_r12_execution_lock',
      'ac_r13_execution_lock',
    ]
    const LOCK_FACTS = {
      ac_diag_compensacao_dependencias_lock: 'consumed (resposta HTTP da compensacao v8)',
      ac_diag_consulta_dependencias_lock: 'consumed (resposta HTTP da compensacao v8)',
      ac_diag_compensacao_auditoria_lock: 'armed (original_audit_lock na resposta v8)',
      ac_r11_execution_lock: 'NAO VERIFICADO (sem observacao previa)',
      ac_r12_execution_lock: 'NAO VERIFICADO (sem observacao previa)',
      ac_r13_execution_lock: 'NAO VERIFICADO (sem observacao previa)',
    }

    const R = {}
    let mandatoryOk = true

    R.q1 = {}
    const ids = [
      { col: 'com_vinculos_externos', id: ID_V },
      { col: 'com_eventos_integracao', id: ID_E },
      { col: 'com_execucoes_sincronizacao', id: ID_X },
    ]
    for (const t of ids) {
      try {
        $app.findRecordById(t.col, t.id)
        R.q1[t.col] = { ok: true, found: true, status: 'PRESENT' }
      } catch (_) {
        R.q1[t.col] = { ok: true, found: false, status: 'ABSENT' }
      }
    }

    try {
      const deps = $app.findRecordsByFilter(
        'com_ocorrencias_qualidade',
        'execucao_id = "' + ID_X + '"',
        'created',
        100,
        0,
      )
      R.q2 = {
        ok: true,
        count: deps.length,
        items: deps.map(function (r) {
          return {
            id: r.id,
            execucao_id: r.getString('execucao_id'),
            tipo: r.getString('tipo'),
            severidade: r.getString('severidade'),
            descricao: r.getString('descricao'),
            resolvida: r.getBool('resolvida'),
            created: r.getString('created'),
          }
        }),
        error: null,
      }
    } catch (err) {
      R.q2 = { ok: false, count: null, items: [], error: String(err) }
      mandatoryOk = false
    }

    R.q3 = {}
    const counts = [
      { col: 'com_eventos_integracao', exp: 14 },
      { col: 'com_execucoes_sincronizacao', exp: 10 },
      { col: 'com_vinculos_externos', exp: 9 },
    ]
    for (const t of counts) {
      try {
        const c = $app.countRecords(t.col)
        R.q3[t.col] = { ok: true, count: c, expected: t.exp, match: c === t.exp, error: null }
      } catch (err) {
        R.q3[t.col] = { ok: false, count: null, expected: t.exp, match: false, error: String(err) }
        mandatoryOk = false
      }
    }

    try {
      const lf = LOCK_KEYS.map(function (k) {
        return 'chave = "' + k + '"'
      }).join(' || ')
      const lrs = $app.findRecordsByFilter('com_parametros', lf, 'chave', 100, 0)
      const lm = {}
      for (const r of lrs) {
        lm[r.getString('chave')] = {
          valor: r.getString('valor'),
          ativo: r.getBool('ativo'),
          descricao: r.getString('descricao'),
          tipo: r.getString('tipo'),
          created: r.getString('created'),
          updated: r.getString('updated'),
          missing: false,
        }
      }
      for (const k of LOCK_KEYS) {
        if (!lm[k])
          lm[k] = {
            valor: null,
            ativo: null,
            descricao: null,
            tipo: null,
            created: null,
            updated: null,
            missing: true,
          }
      }
      R.q4 = { ok: true, locks: lm, error: null }
    } catch (err) {
      R.q4 = { ok: false, locks: {}, error: String(err) }
      mandatoryOk = false
    }

    try {
      const c = $app.findRecordById('com_contatos', ID_C)
      R.q5 = {
        ok: true,
        found: true,
        data: {
          id: c.id,
          nome: c.getString('nome'),
          email: c.getString('email'),
          telefone: c.getString('telefone'),
          empresa_id: c.getString('empresa_id'),
          ativo: c.getBool('ativo'),
          created: c.getString('created'),
          updated: c.getString('updated'),
        },
        error: null,
      }
    } catch (_) {
      R.q5 = { ok: true, found: false, data: null, error: null }
    }

    try {
      const af =
        '(collection_name = "com_vinculos_externos" && record_id = "' +
        ID_V +
        '") || (collection_name = "com_eventos_integracao" && record_id = "' +
        ID_E +
        '") || (collection_name = "com_execucoes_sincronizacao" && record_id = "' +
        ID_X +
        '")'
      const ars = $app.findRecordsByFilter('com_auditoria', af, '-created', 50, 0)
      R.q6 = {
        ok: true,
        count: ars.length,
        items: ars.map(function (r) {
          return {
            id: r.id,
            collection_name: r.getString('collection_name'),
            record_id: r.getString('record_id'),
            usuario_id: r.getString('usuario_id'),
            acao: r.getString('acao'),
            valor_anterior: r.getString('valor_anterior'),
            valor_novo: r.getString('valor_novo'),
            justificativa: r.getString('justificativa'),
            origem_alteracao: r.getString('origem_alteracao'),
            created: r.getString('created'),
          }
        }),
        error: null,
      }
    } catch (err) {
      R.q6 = { ok: false, count: null, items: [], error: String(err) }
    }

    const allAbsent =
      !R.q1['com_vinculos_externos'].found &&
      !R.q1['com_eventos_integracao'].found &&
      !R.q1['com_execucoes_sincronizacao'].found
    const zeroDeps = R.q2.ok && R.q2.count === 0
    const countsMatch =
      R.q3['com_eventos_integracao'].match &&
      R.q3['com_execucoes_sincronizacao'].match &&
      R.q3['com_vinculos_externos'].match
    const mainLock =
      R.q4.ok && R.q4.locks['ac_diag_compensacao_dependencias_lock']
        ? R.q4.locks['ac_diag_compensacao_dependencias_lock']
        : null
    const mainLockConsumed = mainLock && !mainLock.missing && mainLock.valor === 'consumed'
    const contactPresent = R.q5.found

    const go = {
      three_ids_absent: allAbsent,
      zero_dependencies: zeroDeps,
      counts_match: countsMatch,
      main_lock_consumed: mainLockConsumed,
      all_mandatory_queries_succeeded: mandatoryOk,
      zero_writes: true,
      zero_external_calls: true,
    }
    const noGo = {
      any_id_present: !allAbsent,
      dependency_found: R.q2.ok && R.q2.count > 0,
      divergent_count: !countsMatch,
      lock_not_consumed: !mainLockConsumed,
      mandatory_query_error: !mandatoryOk,
      contact_absent: !contactPresent,
      write_or_external_needed: false,
    }
    const allGo = Object.keys(go).every(function (k) {
      return go[k]
    })
    const anyNoGo = Object.keys(noGo).some(function (k) {
      return noGo[k]
    })
    const overall = allGo && !anyNoGo ? 'GO' : 'NO-GO / PARE'

    const declaration = {
      r14_started: true,
      r14_read_only_queries_completed: mandatoryOk,
      report_created: true,
      routes_post_put_patch_delete_executed: 0,
      records_created: 0,
      records_updated: 0,
      records_deleted: 0,
      locks_modified: 0,
      activecampaign_calls: 0,
      external_calls: 0,
      porta_2d2b_started: false,
      porta_2e_started: false,
    }

    const md = []
    md.push('# R14 — Auditoria Pós-Compensação Somente-Leitura')
    md.push('')
    md.push('**Versão da rota:** ' + routeVersion)
    md.push('**Data de execução (UTC):** ' + executedAt)
    md.push('**Somente leitura:** Sim — apenas GET e APIs de leitura do PocketBase')
    md.push('**Método:** GET /backend/v1/integracao/ac/r14-audit')
    md.push('**Resultado geral:** ' + overall)
    md.push('')
    md.push('---')
    md.push('')
    md.push('## Query 1 — Verificação de Ausência por ID')
    md.push('')
    md.push('**API:** $app.findRecordById')
    md.push('')
    md.push('| # | Coleção | ID | Status | Esperado | Avaliação |')
    md.push('|---|---------|----|--------|----------|-----------|')
    for (const t of ids) {
      const r = R.q1[t.col]
      md.push(
        '| 1.' +
          (ids.indexOf(t) + 1) +
          ' | ' +
          t.col +
          ' | ' +
          t.id +
          ' | ' +
          r.status +
          ' | Ausente (404) | ' +
          (!r.found ? '✓ Pass' : '✗ Fail') +
          ' |',
      )
    }
    md.push('')
    md.push('## Query 2 — Dependência Estrutural')
    md.push('')
    md.push('- **API:** $app.findRecordsByFilter')
    md.push('- **Coleção:** com_ocorrencias_qualidade')
    md.push('- **Filtro:** execucao_id = "' + ID_X + '"')
    md.push('- **Sort:** created | **Limite:** 100 | **Offset:** 0')
    md.push('- **Campos:** id, execucao_id, tipo, severidade, descricao, resolvida, created')
    md.push('- **Status:** ' + (R.q2.ok ? 'Succeeded' : 'Failed'))
    md.push(
      '- **Contagem:** ' +
        (R.q2.count !== null ? R.q2.count : 'N/A') +
        ' | **Esperado:** 0 | **Avaliação:** ' +
        (R.q2.ok && R.q2.count === 0 ? '✓ Pass' : '✗ Fail'),
    )
    if (R.q2.error) md.push('- **Erro:** ' + R.q2.error)
    if (R.q2.items && R.q2.items.length > 0) {
      md.push('- **Itens:**')
      for (const item of R.q2.items)
        md.push(
          '  - id=' +
            item.id +
            ' tipo=' +
            item.tipo +
            ' severidade=' +
            item.severidade +
            ' created=' +
            item.created,
        )
    } else {
      md.push('- **Itens:** Nenhum')
    }
    md.push('')
    md.push('## Query 3 — Contagens Reais')
    md.push('')
    md.push('**API:** $app.countRecords')
    md.push('')
    md.push('| Coleção | Contagem | Esperado | Avaliação | Erro |')
    md.push('|---------|----------|----------|-----------|------|')
    for (const t of counts) {
      const r = R.q3[t.col]
      md.push(
        '| ' +
          t.col +
          ' | ' +
          (r.count !== null ? r.count : 'N/A') +
          ' | ' +
          t.exp +
          ' | ' +
          (r.match ? '✓ Pass' : '✗ Fail') +
          ' | ' +
          (r.error || 'Nenhum') +
          ' |',
      )
    }
    md.push('')
    md.push('## Query 4 — Locks em com_parametros')
    md.push('')
    md.push(
      '- **API:** $app.findRecordsByFilter | **Coleção:** com_parametros | **Sort:** chave | **Limite:** 100',
    )
    md.push('- **Status:** ' + (R.q4.ok ? 'Succeeded' : 'Failed'))
    if (R.q4.error) md.push('- **Erro:** ' + R.q4.error)
    md.push('')
    md.push('| Chave | Valor (atual) | Fato observado | Missing |')
    md.push('|-------|---------------|----------------|---------|')
    for (const k of LOCK_KEYS) {
      const lk = R.q4.ok && R.q4.locks[k] ? R.q4.locks[k] : { valor: null, missing: true }
      md.push(
        '| ' +
          k +
          ' | ' +
          (lk.valor || 'N/A') +
          ' | ' +
          (LOCK_FACTS[k] || 'N/A') +
          ' | ' +
          (lk.missing ? 'Sim' : 'Não') +
          ' |',
      )
    }
    md.push('')
    md.push('## Query 5 — Contato Informativo')
    md.push('')
    md.push('- **API:** $app.findRecordById | **Coleção:** com_contatos | **ID:** ' + ID_C)
    md.push(
      '- **Status:** ' +
        (R.q5.ok ? 'Succeeded' : 'Failed') +
        ' | **Resultado:** ' +
        (R.q5.found ? 'Presente' : 'Ausente') +
        ' | **Esperado:** Presente',
    )
    if (R.q5.found) {
      md.push(
        '- **Dados:** id=' +
          R.q5.data.id +
          ' nome=' +
          R.q5.data.nome +
          ' email=' +
          R.q5.data.email +
          ' telefone=' +
          R.q5.data.telefone +
          ' empresa_id=' +
          R.q5.data.empresa_id +
          ' ativo=' +
          R.q5.data.ativo +
          ' created=' +
          R.q5.data.created +
          ' updated=' +
          R.q5.data.updated,
      )
      md.push('- **Avaliação:** ✓ Pass')
    } else {
      md.push('- **Avaliação:** ✗ Divergência informativa — PARE para análise')
      md.push('- **Nota:** Não atribuir a ausência à compensação sem evidência estrutural.')
    }
    md.push('')
    md.push('## Query 6 — Auditoria Complementar')
    md.push('')
    md.push(
      '- **API:** $app.findRecordsByFilter | **Coleção:** com_auditoria | **Sort:** -created | **Limite:** 50',
    )
    md.push('- **Filtro:** 3 pares collection_name/record_id (OR)')
    md.push(
      '- **Status:** ' +
        (R.q6.ok ? 'Succeeded' : 'Failed') +
        ' | **Contagem:** ' +
        (R.q6.count !== null ? R.q6.count : 'N/A') +
        ' | **Participa do Go/No-Go:** Não',
    )
    if (R.q6.error) md.push('- **Erro:** ' + R.q6.error)
    if (R.q6.items && R.q6.items.length > 0) {
      md.push('- **Itens:**')
      for (const item of R.q6.items)
        md.push(
          '  - id=' +
            item.id +
            ' collection=' +
            item.collection_name +
            ' record=' +
            item.record_id +
            ' acao=' +
            item.acao +
            ' created=' +
            item.created,
        )
    } else {
      md.push('- **Itens:** Nenhum (vazio — aceitável)')
    }
    md.push('')
    md.push('---')
    md.push('')
    md.push('## Matriz Go/No-Go')
    md.push('')
    md.push('### Critérios Go (todos devem ser verdadeiros)')
    md.push('')
    md.push('| Critério | Resultado |')
    md.push('|----------|-----------|')
    md.push('| Três IDs ausentes | ' + (go.three_ids_absent ? '✓' : '✗') + ' |')
    md.push('| Zero dependências | ' + (go.zero_dependencies ? '✓' : '✗') + ' |')
    md.push('| Contagens 14/10/9 | ' + (go.counts_match ? '✓' : '✗') + ' |')
    md.push('| Lock principal = consumed | ' + (go.main_lock_consumed ? '✓' : '✗') + ' |')
    md.push(
      '| Queries obrigatórias sem erro | ' +
        (go.all_mandatory_queries_succeeded ? '✓' : '✗') +
        ' |',
    )
    md.push('| Zero escritas | ' + (go.zero_writes ? '✓' : '✗') + ' |')
    md.push('| Zero chamadas externas | ' + (go.zero_external_calls ? '✓' : '✗') + ' |')
    md.push('')
    md.push('### Critérios No-Go / PARE (qualquer um aciona)')
    md.push('')
    md.push('| Critério | Acionado |')
    md.push('|----------|----------|')
    md.push('| Algum ID presente | ' + (noGo.any_id_present ? 'Sim' : 'Não') + ' |')
    md.push('| Dependência encontrada | ' + (noGo.dependency_found ? 'Sim' : 'Não') + ' |')
    md.push('| Contagem divergente | ' + (noGo.divergent_count ? 'Sim' : 'Não') + ' |')
    md.push(
      '| Lock ≠ consumed/ausente/ilegível | ' + (noGo.lock_not_consumed ? 'Sim' : 'Não') + ' |',
    )
    md.push('| Erro em query obrigatória | ' + (noGo.mandatory_query_error ? 'Sim' : 'Não') + ' |')
    md.push('| Contato ausente | ' + (noGo.contact_absent ? 'Sim' : 'Não') + ' |')
    md.push(
      '| Escrita/externa necessária | ' + (noGo.write_or_external_needed ? 'Sim' : 'Não') + ' |',
    )
    md.push('')
    md.push('**Nota:** Zero registros em com_auditoria NÃO é critério No-Go.')
    md.push('')
    md.push('**Resultado geral:** ' + overall)
    md.push('')
    md.push('---')
    md.push('')
    md.push('## Declaração de Zero Efeitos Colaterais')
    md.push('')
    md.push('```json')
    md.push(JSON.stringify(declaration, null, 2))
    md.push('```')
    md.push('')
    md.push('---')
    md.push('')
    md.push('## Conclusão')
    md.push('')
    if (overall === 'GO') {
      md.push(
        'Todos os critérios Go foram satisfeitos. Nenhum critério No-Go foi acionado. O estado do banco está coerente com o esperado após a compensação v8 do R13.',
      )
    } else {
      md.push('Um ou mais critérios No-Go foram acionados. Verifique a matriz acima.')
      if (noGo.contact_absent) md.push('')
      if (noGo.contact_absent)
        md.push(
          '**Divergência informativa:** O contato ' +
            ID_C +
            ' está ausente. Não atribuir à compensação sem evidência estrutural.',
        )
    }
    md.push('')
    md.push('**PARE.** Nenhuma ação adicional é autorizada sem nova autorização explícita.')
    md.push('')

    return e.json(200, {
      route_version: routeVersion,
      executed_at: executedAt,
      read_only: true,
      query_results: R,
      go_criteria: go,
      no_go_criteria: noGo,
      overall_result: overall,
      declaration: declaration,
      report_markdown: md.join('\n'),
    })
  },
  $apis.requireAuth(),
)
