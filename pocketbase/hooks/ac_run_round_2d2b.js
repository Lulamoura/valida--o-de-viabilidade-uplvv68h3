// ════════════════════════════════════════════════════════════════════
// Porta 2D.2B — Runner instrumentado fail-closed (v0.0.142)
// ════════════════════════════════════════════════════════════════════
// Correções 0.0.142 (SEGMENTO 2 — TERMINALIZAÇÃO FAIL-CLOSED):
//  T1 — Validar ANTES de persistir pass. O bug 0.0.141 persistia
//       estado=pass e só depois executava a validação canônica pré-GO;
//       se falhava, tentava mutar o registro já terminal, o que o hook
//       de imutabilidade bloqueava corretamente — deixando a execução
//       terminalizada como pass apesar da falha de validação.
//  T2 — Nova ordem: enquanto running, reler exec + 16 etapas; montar
//       projeção/candidato em memória com todos os campos finais
//       (estado=pass, decisão, counters, counts_after, flag_final);
//       rodar a validação canônica ($porta2d2bValidateProjection) sobre
//       a projeção + etapas relidas ANTES de persistir pass; se aprovar,
//       única transição running → pass, reler, confirmar, terminalSaved;
//       se falhar/erro/ambiguidade, única transição running → blocked
//       (ou fail conforme contrato vigente), reler, confirmar, NO-GO.
//  T3 — Nenhum caminho altera registro depois de terminalizado. Não há
//       mais safeUpdateExec após terminalSaved.
//  T4 — terminalSaved só true após save confirmado + releitura coerente.
//  T5 — GO só existe quando estado=pass confirmado após validação
//       canônica prévia (não pós-hoc).
//  Imutabilidade server-side (ac_immutable_porta_2d2b.js) preservada —
//  não afrouxada, sem bypass administrativo.
//  Contratos funcionais A1–D1, payloads, deltas, hash, sanitização,
//  truncamento, contadores PRESERVADOS.
// Correções 0.0.137:
//  4 — safeUpdateExec retorna estrutura, relê e valida; terminalSaved só
//       após confirmação de save + reread; gravação terminal falhou →
//       BLOCKED/NO-GO; antes de GO relê exec + 16 etapas e roda validação.
//  5 — Contratos estruturais de cada etapa persistidos e validados.
//  6 — raw_body_sanitized + sha256 + tamanho + sanitização; sha256 do
//       raw original mantido separadamente; nunca persiste segredo.
//  7 — resposta_truncated + resposta_original_length; envelope JSON se
//       truncado; sanitização em erros e textos derivados.
//  8 — allowed_internal_calls / blocked_external_attempts /
//       activecampaign_calls separados (não prova_zero constante).
//  9 — Validação canônica compartilhada inline (mesma lógica da rota de
//       consulta) antes de GO.
// Contratos funcionais A1–D1 e deltas PRESERVADOS (apenas instrumentação).
// ════════════════════════════════════════════════════════════════════
routerAdd(
  'POST',
  '/backend/v1/integracao/ac/run-round-2d2b',
  (e) => {
    // ─── Auth + superadmin PRIMEIRO ───
    var authId = e.auth ? e.auth.id : ''
    if (!authId) return e.unauthorizedError('Autenticacao necessaria')
    var isSA = false
    try {
      var p = $app.findRecordById('com_perfis', e.auth.getString('perfil_id'))
      if (p && p.getString('slug') === 'superadministrador') isSA = true
    } catch (_) {}
    if (!isSA) {
      try {
        var sp = $app.findFirstRecordByData('com_perfis', 'slug', 'superadministrador')
        var bnd = $app.findRecordsByFilter(
          'com_usuarios_equipes',
          "usuario_id = '" + authId + "' && perfil_id = '" + sp.id + "' && ativo = true",
          '',
          1,
          0,
        )
        if (bnd && bnd.length > 0) isSA = true
      } catch (_) {}
    }
    if (!isSA) return e.forbiddenError('Apenas superadministrador')

    // ─── Secrets ANTES do lock ───
    var baseUrl = ($secrets.get('PB_INSTANCE_URL') || '').replace(/\/$/, '')
    var whSecret = $secrets.get('AC_WEBHOOK_SECRET') || ''
    var authHdr = e.request.header.get('Authorization') || ''
    if (!baseUrl) return e.json(500, { error: 'PB_INSTANCE_URL not configured' })
    if (!whSecret) return e.json(500, { error: 'AC_WEBHOOK_SECRET not configured' })

    // ─── Precondição de evidência ───
    var EXPECTED_SCHEMA_VERSION = 'v0.0.142'
    var execCol = null
    var evidenceCol = null
    try {
      execCol = $app.findCollectionByNameOrId('com_execucoes_porta_2d2b')
    } catch (_) {}
    try {
      evidenceCol = $app.findCollectionByNameOrId('com_etapas_porta_2d2b')
    } catch (_) {}
    if (!execCol || !evidenceCol) {
      return e.json(200, {
        porta: '2D.2B',
        overall_status: 'BLOCKED',
        go_no_go: 'NO-GO',
        stop_reason:
          'Precondição falhou: coleções com_execucoes_porta_2d2b/com_etapas_porta_2d2b inexistentes',
        activecampaign_calls: 0,
        synthetic_only: true,
        single_execution: true,
        lock_consumed: false,
        flag_changed: false,
      })
    }

    var execId = $security.randomStringWithAlphabet(32, 'abcdefghijklmnopqrstuvwxyz0123456789')
    var runnerVersion = 'R2-RUNNER-2D2B-20260813-V0137-FAILCLOSED'
    var correlationKey = 'TESTE-2D2B'
    var startedAt = new Date().toISOString()
    var execRecord = null
    var terminalSaved = false
    var runningSet = false
    var lockConsumed = false
    var flagChanged = false
    var allowedInternalCalls = 0 // CORREÇÃO 8a: chamadas internas permitidas
    var blockedExternalAttempts = 0 // CORREÇÃO 8b: tentativas fora da allowlist
    var activecampaignCalls = 0 // CORREÇÃO 8c: sempre zero
    var writesPerformedRound = 0

    // ─── Helpers ───
    function readFlag() {
      try {
        var r = $app.findFirstRecordByData('com_parametros', 'chave', 'ac_webhook_enabled')
        return { valor: r.getString('valor'), ativo: r.getBool('ativo'), error: null }
      } catch (er) {
        return { valor: null, ativo: null, error: String(er).substring(0, 200) }
      }
    }
    function setWH(en) {
      try {
        var pc = $app.findCollectionByNameOrId('com_parametros')
        var fr
        try {
          fr = $app.findFirstRecordByData('com_parametros', 'chave', 'ac_webhook_enabled')
        } catch (_) {
          fr = new Record(pc)
          fr.set('chave', 'ac_webhook_enabled')
          fr.set('versao', 1)
        }
        fr.set('valor', en ? 'true' : 'false')
        fr.set('ativo', en)
        fr.set('descricao', 'Flag server-side webhook AC')
        fr.set('tipo', 'boolean')
        $app.save(fr)
        flagChanged = true
        return { success: true, reRead: readFlag() }
      } catch (er) {
        return { success: false, error: String(er).substring(0, 200), reRead: null }
      }
    }
    function sc(n) {
      try {
        return $app.countRecords(n)
      } catch (_) {
        return -1
      }
    }
    function gc() {
      return {
        contatos: sc('com_contatos'),
        negocios: sc('com_negocios'),
        eventos: sc('com_eventos_integracao'),
        execucoes: sc('com_execucoes_sincronizacao'),
        vinculos: sc('com_vinculos_externos'),
        snapshots: sc('com_snapshots_negocio'),
        ocorrencias: sc('com_ocorrencias_qualidade'),
        auditoria: sc('com_auditoria'),
      }
    }
    function signBody(s) {
      return $security.hs256(s, whSecret)
    }

    // ─── HTTP wrappers com allowlist ───
    var ALLOW_PREFIX = baseUrl + '/backend/v1/integracao/ac/'
    function assertAllowed(url) {
      if (url.indexOf(ALLOW_PREFIX) !== 0) {
        blockedExternalAttempts++
        throw new Error('Destino fora da allowlist bloqueado: ' + url.substring(0, 80))
      }
      allowedInternalCalls++
    }
    function callWH(m, h, b) {
      var url = baseUrl + '/backend/v1/integracao/ac/webhook'
      assertAllowed(url)
      var sAt = new Date().toISOString()
      var raw = ''
      var status = 0
      var j = {}
      try {
        var res = $http.send({ url: url, method: m, headers: h, body: b || '', timeout: 15 })
        status = res.statusCode
        raw = res.raw || ''
        try {
          j = res.json || {}
        } catch (_) {
          try {
            j = raw ? JSON.parse(raw) : {}
          } catch (_) {
            j = {}
          }
        }
      } catch (er) {
        raw = String(er).substring(0, 200)
      }
      var fAt = new Date().toISOString()
      return { status: status, json: j, raw: raw, started_at: sAt, finished_at: fAt }
    }
    function callRB(b, sig) {
      var url = baseUrl + '/backend/v1/integracao/ac/rollback'
      assertAllowed(url)
      var sAt = new Date().toISOString()
      var raw = ''
      var status = 0
      var j = {}
      try {
        var res = $http.send({
          url: url,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: authHdr,
            'X-AC-Signature': sig,
          },
          body: b,
          timeout: 15,
        })
        status = res.statusCode
        raw = res.raw || ''
        try {
          j = res.json || {}
        } catch (_) {
          try {
            j = raw ? JSON.parse(raw) : {}
          } catch (_) {
            j = {}
          }
        }
      } catch (er) {
        raw = String(er).substring(0, 200)
      }
      var fAt = new Date().toISOString()
      return { status: status, json: j, raw: raw, started_at: sAt, finished_at: fAt }
    }

    function rc(id, m, u, exp, act, resp, cb, ca, pass) {
      callResults.push({
        call: id,
        method: m,
        url: u,
        expected_status: exp,
        actual_status: act,
        response: JSON.stringify(resp).substring(0, 500),
        counts_before: cb,
        counts_after: ca,
        passed: pass,
      })
    }
    function truncId(s) {
      return s ? String(s).substring(0, 8) : ''
    }
    function computeDeltas(before, after) {
      var d = {}
      var keys = [
        'contatos',
        'negocios',
        'eventos',
        'execucoes',
        'vinculos',
        'snapshots',
        'ocorrencias',
        'auditoria',
      ]
      for (var i = 0; i < keys.length; i++)
        d[keys[i]] = (after[keys[i]] || 0) - (before[keys[i]] || 0)
      return d
    }

    // ─── Sanitização recursiva ───
    var FORBIDDEN_KEYS = {
      token: true,
      secret: true,
      signature: true,
      authorization: true,
      password: true,
      api_key: true,
      apikey: true,
      email: true,
      'e-mail': true,
      phone: true,
      telefone: true,
      headers: true,
    }
    function normKey(k) {
      return String(k)
        .toLowerCase()
        .replace(/[\s_-]/g, '')
    }
    function isForbiddenKey(k) {
      var nk = normKey(k)
      if (FORBIDDEN_KEYS[nk]) return true
      if (nk.indexOf('token') !== -1) return true
      if (nk.indexOf('secret') !== -1) return true
      if (nk.indexOf('signature') !== -1) return true
      if (nk.indexOf('authoriz') !== -1) return true
      if (nk.indexOf('password') !== -1) return true
      if (nk.indexOf('apikey') !== -1) return true
      if (nk.indexOf('email') !== -1 || nk.indexOf('mail') !== -1) return true
      if (nk.indexOf('phone') !== -1 || nk.indexOf('telefone') !== -1) return true
      if (nk.indexOf('header') !== -1) return true
      return false
    }
    function sanitizeDeep(obj) {
      if (obj === null || obj === undefined) return obj
      if (typeof obj !== 'object') return obj
      if (Array.isArray(obj)) {
        var arr = []
        for (var ai = 0; ai < obj.length; ai++) arr.push(sanitizeDeep(obj[ai]))
        return arr
      }
      var out = {}
      for (var key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          if (isForbiddenKey(key)) continue
          out[key] = sanitizeDeep(obj[key])
        }
      }
      return out
    }

    // ─── CORREÇÃO 7: truncamento com envelope JSON válido ───
    function truncateSanitized(obj) {
      var full = JSON.stringify(obj)
      var origLen = full.length
      if (origLen <= 2000) return { text: full, truncated: false, original_length: origLen }
      // Trunca preservando envelope JSON válido
      var cut = full.substring(0, 1900)
      var envelope = JSON.stringify({
        truncated: true,
        original_length: origLen,
        preview: cut,
      })
      return { text: envelope, truncated: true, original_length: origLen }
    }
    function sanitizeErrorText(s) {
      if (!s) return ''
      var t = String(s)
      t = t.replace(/(Bearer\s+[A-Za-z0-9\._\-]+)/gi, 'Bearer [REDACTED]')
      t = t.replace(/(token=[A-Za-z0-9\._\-]+)/gi, 'token=[REDACTED]')
      return t.substring(0, 500)
    }

    // ─── CORREÇÃO 6: hash verificável (sanitizado + original) ───
    // raw_body_sanitized_sha256: pode ser recomputado do conteúdo devolvido
    // raw_body_original_sha256: refere-se ao raw original (não exposto se
    //   contiver segredos; hash sobre raw bruto real para integridade)
    function hashRawBodies(rawBody, respJson) {
      var rawOrig = rawBody || ''
      var rawOrigHash = $security.sha256(rawOrig)
      var sanitizedForHash = sanitizeDeep(respJson || {})
      var sanitizedText = JSON.stringify(sanitizedForHash)
      var sanitizedHash = $security.sha256(sanitizedText)
      return {
        raw_original_sha256: rawOrigHash,
        raw_sanitized_sha256: sanitizedHash,
        raw_size: rawOrig.length,
        sanitized_size: sanitizedText.length,
        sanitized_text: sanitizedText,
      }
    }

    // ─── CORREÇÃO 5: contrato estrutural por etapa ───
    function buildContract(ordem, respJson, cb, ca) {
      var j = respJson || {}
      var deltas = computeDeltas(cb || {}, ca || {})
      if (ordem === 'A7') {
        return { error: j.error || null, expected_error: 'missing_signature' }
      }
      if (ordem === 'B2') {
        return { duplicate: j.duplicate === true, expected_duplicate: true }
      }
      if (ordem === 'B4') {
        return {
          delta_snapshots: deltas.snapshots,
          expected_delta_snapshots: 1,
        }
      }
      if (ordem === 'B5') {
        return {
          delta_ocorrencias: deltas.ocorrencias,
          expected_delta_ocorrencias: 1,
        }
      }
      if (ordem === 'C1') {
        var rb0 = j.rolled_back && j.rolled_back[0] ? j.rolled_back[0] : {}
        return {
          success: j.success === true,
          idempotent: j.idempotent === false,
          rolled_back_action: rb0.action || null,
          rolled_back_collection: rb0.collection || null,
          rolled_back_record_id: rb0.record_id ? true : false,
          rolled_back_length: j.rolled_back ? j.rolled_back.length : 0,
        }
      }
      if (ordem === 'C2') {
        return {
          success: j.success === true,
          idempotent: j.idempotent === true,
          rolled_back_length: j.rolled_back ? j.rolled_back.length : 0,
        }
      }
      if (ordem === 'D1') {
        return { http_status: j.http_status || null, flag_final: 'false', expected_http: 503 }
      }
      return { note: 'no_specific_contract' }
    }
    function validateContract(ordem, contrato) {
      if (ordem === 'A7') return contrato.error === 'missing_signature'
      if (ordem === 'B2') return contrato.duplicate === true
      if (ordem === 'B4') return contrato.delta_snapshots === 1
      if (ordem === 'B5') return contrato.delta_ocorrencias === 1
      if (ordem === 'C1') {
        return (
          contrato.success === true &&
          contrato.idempotent === true &&
          contrato.rolled_back_action === 'restored_from_snapshot' &&
          contrato.rolled_back_collection === 'com_negocios' &&
          contrato.rolled_back_record_id === true &&
          contrato.rolled_back_length === 1
        )
      }
      if (ordem === 'C2') {
        return (
          contrato.success === true &&
          contrato.idempotent === true &&
          contrato.rolled_back_length === 0
        )
      }
      if (ordem === 'D1') return true // HTTP 503 já validado no passo
      return true
    }

    // ─── CORREÇÃO 5: persistStep fail-closed com releitura e validação ───
    function persistStep(
      ordem,
      codigo,
      metodo,
      rota,
      sAt,
      fAt,
      httpReal,
      httpEsp,
      pass,
      cb,
      ca,
      respJson,
      rawBody,
      erro,
      idsCorr,
    ) {
      if (!evidenceCol || !execRecord)
        return { ok: false, error: 'no evidence collection/exec record' }
      try {
        var stepId = execId + '_' + ordem
        var step = new Record(evidenceCol)
        step.set('id', stepId)
        step.set('execucao_id', execId)
        step.set('ordem', ordem)
        step.set('codigo', codigo)
        step.set('metodo', metodo)
        step.set('rota_sanitizada', rota)
        step.set('started_at', sAt)
        step.set('finished_at', fAt)
        step.set('http_status_real', httpReal)
        step.set('http_status_esperado', httpEsp)
        step.set('resultado', pass ? 'PASS' : 'FAIL')
        step.set('counts_antes', JSON.stringify(cb || {}))
        step.set('counts_depois', JSON.stringify(ca || {}))
        step.set('deltas', JSON.stringify(computeDeltas(cb || {}, ca || {})))
        step.set('ids_correlacao_sanitizados', JSON.stringify(idsCorr || []))

        // CORREÇÃO 6: hash verificável
        var hashes = hashRawBodies(rawBody, respJson)
        step.set('sha256_corpo_bruto', hashes.raw_original_sha256)
        step.set('raw_body_original_sha256', hashes.raw_original_sha256)
        step.set('raw_body_sanitized', hashes.sanitized_text)
        step.set('raw_body_sanitized_sha256', hashes.raw_sanitized_sha256)
        step.set('raw_body_size', hashes.raw_size)
        step.set('sanitized', true)

        // CORREÇÃO 7: resposta sanitizada + truncamento
        var sanitizedResp = sanitizeDeep(respJson || {})
        var trunc = truncateSanitized(sanitizedResp)
        step.set('resposta_sanitizada', trunc.text)
        step.set('resposta_truncated', trunc.truncated)
        step.set('resposta_original_length', trunc.original_length)
        step.set('erro_real', sanitizeErrorText(erro || ''))

        // CORREÇÃO 5: contrato estrutural
        var contrato = buildContract(ordem, respJson, cb, ca)
        var contratoOk = validateContract(ordem, contrato)
        step.set('contrato', JSON.stringify(contrato))
        step.set('contrato_ok', contratoOk)

        $app.save(step)
        writesPerformedRound++

        // Releitura e validação de campos críticos
        var reRead = null
        try {
          reRead = $app.findFirstRecordByData('com_etapas_porta_2d2b', 'id', stepId)
        } catch (rrErr) {
          return { ok: false, error: 'reread failed: ' + String(rrErr).substring(0, 150) }
        }
        if (!reRead) return { ok: false, error: 'reread returned null' }
        if (reRead.getString('ordem') !== ordem)
          return { ok: false, error: 'ordem mismatch on reread' }
        if (reRead.getString('codigo') !== codigo)
          return { ok: false, error: 'codigo mismatch on reread' }
        if (reRead.getInt('http_status_real') !== httpReal)
          return { ok: false, error: 'http_status_real mismatch on reread' }
        if (reRead.getString('resultado') !== (pass ? 'PASS' : 'FAIL'))
          return { ok: false, error: 'resultado mismatch on reread' }
        if (reRead.getString('sha256_corpo_bruto') !== hashes.raw_original_sha256)
          return { ok: false, error: 'sha256_corpo_bruto mismatch on reread' }
        if (reRead.getString('raw_body_sanitized_sha256') !== hashes.raw_sanitized_sha256)
          return { ok: false, error: 'raw_body_sanitized_sha256 mismatch on reread' }
        if (reRead.getBool('contrato_ok') !== contratoOk)
          return { ok: false, error: 'contrato_ok mismatch on reread' }
        if (reRead.getBool('resposta_truncated') !== trunc.truncated)
          return { ok: false, error: 'resposta_truncated mismatch on reread' }
        return { ok: true, error: null, contrato_ok: contratoOk }
      } catch (er) {
        return {
          ok: false,
          error: 'persistStep error ' + ordem + ': ' + String(er).substring(0, 200),
        }
      }
    }

    // ─── CORREÇÃO 4: safeUpdateExec estruturado com reread ───
    function safeUpdateExec(fields) {
      if (!execRecord) return { saved: false, reread: null, error: 'no exec record' }
      try {
        for (var k in fields) {
          if (Object.prototype.hasOwnProperty.call(fields, k)) execRecord.set(k, fields[k])
        }
        $app.save(execRecord)
        // CORREÇÃO 4: reler e validar campos críticos
        var reRead = null
        try {
          reRead = $app.findFirstRecordByData('com_execucoes_porta_2d2b', 'id', execId)
        } catch (rrErr) {
          return {
            saved: false,
            reread: null,
            error: 'reread failed: ' + String(rrErr).substring(0, 150),
          }
        }
        if (!reRead) return { saved: false, reread: null, error: 'reread null' }
        // validar campos críticos se presentes no update
        if (fields.estado && reRead.getString('estado') !== fields.estado) {
          return { saved: false, reread: reRead, error: 'estado mismatch on reread' }
        }
        return { saved: true, reread: reRead, error: null }
      } catch (er) {
        console.log('evidence safeUpdateExec error: ' + String(er).substring(0, 200))
        return { saved: false, reread: null, error: String(er).substring(0, 200) }
      }
    }
    function checkTerminal() {
      if (!execRecord || terminalSaved) return
      if (!runningSet) {
        runningSet = true
        var runRes = safeUpdateExec({ estado: 'running' })
        if (!runRes.saved) {
          overallStatus = 'BLOCKED'
          stopReason = 'Failed to set running state: ' + (runRes.error || '')
        }
      }
      if (overallStatus === 'STOP' || overallStatus === 'BLOCKED') {
        // CORREÇÃO 4: gravação terminal com confirmação
        var termEstado = overallStatus === 'BLOCKED' ? 'blocked' : 'fail'
        var termRes = safeUpdateExec({
          estado: termEstado,
          finished_at: new Date().toISOString(),
          counts_after: JSON.stringify(countsAfter || gc()),
          flag_final: JSON.stringify(flagFinal || readFlag()),
          decisao: JSON.stringify({
            porta: '2D.2B',
            overall_status: overallStatus,
            go_no_go: 'NO-GO',
            stop_reason: stopReason,
            total_calls: callResults.length,
          }),
        })
        // CORREÇÃO 4: só marcar terminalSaved após confirmação de save + reread
        if (termRes.saved && termRes.reread) {
          var ts = termRes.reread.getString('estado')
          if (ts === termEstado) {
            terminalSaved = true
          } else {
            // falha na gravação terminal → BLOCKED/NO-GO
            overallStatus = 'BLOCKED'
            stopReason = 'Terminal save reread mismatch: estado=' + ts + ' expected=' + termEstado
          }
        } else {
          // CORREÇÃO 4: gravação terminal falhou → BLOCKED/NO-GO
          overallStatus = 'BLOCKED'
          stopReason = 'Terminal save failed: ' + (termRes.error || 'unknown')
        }
      }
    }

    var overallStatus = 'PASS',
      stopReason = null,
      callResults = [],
      evidenceIds = [],
      persistFailure = null
    var flagBefore = readFlag(),
      flagDuring = null,
      flagFinal = null,
      finalProbeStatus = null
    var countsBefore = gc(),
      countsAfter = null

    // ─── Abrir e reler execução ANTES do lock ───
    try {
      execRecord = new Record(execCol)
      execRecord.set('id', execId)
      execRecord.set('runner_version', runnerVersion)
      execRecord.set('correlation_key', correlationKey)
      execRecord.set('estado', 'started')
      execRecord.set('started_at', startedAt)
      execRecord.set('counts_before', JSON.stringify(countsBefore))
      execRecord.set('flag_before', JSON.stringify(flagBefore))
      execRecord.set('prova_zero_chamadas_externas', false)
      execRecord.set('allowed_internal_calls', 0)
      execRecord.set('blocked_external_attempts', 0)
      execRecord.set('activecampaign_calls', 0)
      execRecord.set('versao_commit', EXPECTED_SCHEMA_VERSION)
      $app.save(execRecord)
      var execReRead = $app.findFirstRecordByData('com_execucoes_porta_2d2b', 'id', execId)
      if (!execReRead || execReRead.getString('estado') !== 'started') {
        return e.json(200, {
          porta: '2D.2B',
          overall_status: 'BLOCKED',
          go_no_go: 'NO-GO',
          stop_reason: 'Precondição falhou: execução não pôde ser relida após create',
          activecampaign_calls: 0,
          lock_consumed: false,
          flag_changed: false,
        })
      }
      execRecord = execReRead
    } catch (er) {
      return e.json(200, {
        porta: '2D.2B',
        overall_status: 'BLOCKED',
        go_no_go: 'NO-GO',
        stop_reason: 'Precondição falhou ao abrir/reler execução: ' + String(er).substring(0, 200),
        activecampaign_calls: 0,
        lock_consumed: false,
        flag_changed: false,
      })
    }

    // ─── Lock DEPOIS da execução aberta e relida ───
    var lockKey = 'ac_2d2b_execution_lock'
    try {
      var exLock = $app.findFirstRecordByData('com_parametros', 'chave', lockKey)
      if (exLock && exLock.getString('valor') === 'locked' && exLock.getBool('ativo')) {
        safeUpdateExec({
          estado: 'blocked',
          finished_at: new Date().toISOString(),
          flag_final: JSON.stringify(readFlag()),
          decisao: JSON.stringify({
            porta: '2D.2B',
            overall_status: 'BLOCKED',
            go_no_go: 'NO-GO',
            stop_reason: 'Single-execution lock already armed',
            total_calls: 0,
          }),
        })
        return e.json(200, {
          executed: true,
          locked: true,
          porta: '2D.2B',
          overall_status: 'BLOCKED',
          go_no_go: 'NO-GO',
          message: '2D.2B already executed — single-execution lock prevents re-execution',
          activecampaign_calls: 0,
          lock_consumed: false,
          flag_changed: false,
        })
      }
    } catch (_) {}
    try {
      var pc0 = $app.findCollectionByNameOrId('com_parametros')
      var lkRec
      try {
        lkRec = $app.findFirstRecordByData('com_parametros', 'chave', lockKey)
      } catch (_) {
        lkRec = new Record(pc0)
        lkRec.set('chave', lockKey)
        lkRec.set('versao', 1)
      }
      lkRec.set('valor', 'locked')
      lkRec.set('ativo', true)
      lkRec.set('descricao', 'Single-execution lock for Porta 2D.2B')
      lkRec.set('tipo', 'lock')
      $app.save(lkRec)
      lockConsumed = true
    } catch (lockErr) {
      safeUpdateExec({
        estado: 'blocked',
        finished_at: new Date().toISOString(),
        flag_final: JSON.stringify(readFlag()),
        decisao: JSON.stringify({
          porta: '2D.2B',
          overall_status: 'BLOCKED',
          go_no_go: 'NO-GO',
          stop_reason: 'Lock creation failed: ' + String(lockErr).substring(0, 150),
          total_calls: 0,
        }),
      })
      return e.json(200, {
        porta: '2D.2B',
        overall_status: 'BLOCKED',
        go_no_go: 'NO-GO',
        stop_reason: 'Lock creation failed — round aborted before first call',
        activecampaign_calls: 0,
        lock_consumed: false,
        flag_changed: false,
      })
    }

    // ─── Execução do round ───
    try {
      var disRes = setWH(false)
      if (!disRes.success) {
        overallStatus = 'BLOCKED'
        stopReason = 'Failed to disable flag initially: ' + disRes.error
      }

      if (overallStatus === 'PASS') {
        var cb1 = gc()
        var r1 = callWH('POST', { 'Content-Type': 'application/json' }, '{}')
        var ca1 = gc()
        var a1p = r1.status === 503
        rc('A1', 'POST', '/webhook', 503, r1.status, r1.json, cb1, ca1, a1p)
        if (!a1p) {
          overallStatus = 'STOP'
          stopReason = 'A1: expected 503 got ' + r1.status
        }
        var pA1 = persistStep(
          'A1',
          'A1',
          'POST',
          '/backend/v1/integracao/ac/webhook',
          r1.started_at,
          r1.finished_at,
          r1.status,
          503,
          a1p,
          cb1,
          ca1,
          r1.json,
          r1.raw,
          a1p ? '' : 'Expected 503 got ' + r1.status,
          [],
        )
        if (!pA1.ok) {
          overallStatus = 'BLOCKED'
          stopReason = pA1.error
          persistFailure = pA1.error
        }
        checkTerminal()
      }
      if (overallStatus === 'PASS') {
        var enRes = setWH(true)
        if (!enRes.success) {
          overallStatus = 'BLOCKED'
          stopReason = 'Failed to enable flag: ' + enRes.error
        }
        flagDuring = readFlag()
        checkTerminal()
      }
      if (overallStatus === 'PASS') {
        var cb2 = gc()
        var r2 = callWH('GET', {}, '')
        var ca2 = gc()
        var a2p = r2.status === 405
        rc('A2', 'GET', '/webhook', 405, r2.status, r2.json, cb2, ca2, a2p)
        if (!a2p) {
          overallStatus = 'STOP'
          stopReason = 'A2: expected 405 got ' + r2.status
        }
        var pA2 = persistStep(
          'A2',
          'A2',
          'GET',
          '/backend/v1/integracao/ac/webhook',
          r2.started_at,
          r2.finished_at,
          r2.status,
          405,
          a2p,
          cb2,
          ca2,
          r2.json,
          r2.raw,
          a2p ? '' : 'Expected 405 got ' + r2.status,
          [],
        )
        if (!pA2.ok) {
          overallStatus = 'BLOCKED'
          stopReason = pA2.error
          persistFailure = pA2.error
        }
        checkTerminal()
      }
      if (overallStatus === 'PASS') {
        var cb3 = gc()
        var r3 = callWH('POST', { 'Content-Type': 'text/plain' }, '{}')
        var ca3 = gc()
        var a3p = r3.status === 400
        rc('A3', 'POST', '/webhook', 400, r3.status, r3.json, cb3, ca3, a3p)
        if (!a3p) {
          overallStatus = 'STOP'
          stopReason = 'A3: expected 400 got ' + r3.status
        }
        var pA3 = persistStep(
          'A3',
          'A3',
          'POST',
          '/backend/v1/integracao/ac/webhook',
          r3.started_at,
          r3.finished_at,
          r3.status,
          400,
          a3p,
          cb3,
          ca3,
          r3.json,
          r3.raw,
          a3p ? '' : 'Expected 400 got ' + r3.status,
          [],
        )
        if (!pA3.ok) {
          overallStatus = 'BLOCKED'
          stopReason = pA3.error
          persistFailure = pA3.error
        }
        checkTerminal()
      }
      if (overallStatus === 'PASS') {
        var a4b = JSON.stringify({ timestamp: new Date().toISOString() })
        var a4s = signBody(a4b)
        var cb4 = gc()
        var r4 = callWH('POST', { 'Content-Type': 'application/json', 'X-AC-Signature': a4s }, a4b)
        var ca4 = gc()
        var a4p = r4.status === 400
        rc('A4', 'POST', '/webhook', 400, r4.status, r4.json, cb4, ca4, a4p)
        if (!a4p) {
          overallStatus = 'STOP'
          stopReason = 'A4: expected 400 got ' + r4.status
        }
        var pA4 = persistStep(
          'A4',
          'A4',
          'POST',
          '/backend/v1/integracao/ac/webhook',
          r4.started_at,
          r4.finished_at,
          r4.status,
          400,
          a4p,
          cb4,
          ca4,
          r4.json,
          r4.raw,
          a4p ? '' : 'Expected 400 got ' + r4.status,
          [],
        )
        if (!pA4.ok) {
          overallStatus = 'BLOCKED'
          stopReason = pA4.error
          persistFailure = pA4.error
        }
        checkTerminal()
      }
      if (overallStatus === 'PASS') {
        var a5b = 'not-json{'
        var a5s = signBody(a5b)
        var cb5 = gc()
        var r5 = callWH('POST', { 'Content-Type': 'application/json', 'X-AC-Signature': a5s }, a5b)
        var ca5 = gc()
        var a5p = r5.status === 400
        rc('A5', 'POST', '/webhook', 400, r5.status, r5.json, cb5, ca5, a5p)
        if (!a5p) {
          overallStatus = 'STOP'
          stopReason = 'A5: expected 400 got ' + r5.status
        }
        var pA5 = persistStep(
          'A5',
          'A5',
          'POST',
          '/backend/v1/integracao/ac/webhook',
          r5.started_at,
          r5.finished_at,
          r5.status,
          400,
          a5p,
          cb5,
          ca5,
          r5.json,
          r5.raw,
          a5p ? '' : 'Expected 400 got ' + r5.status,
          [],
        )
        if (!pA5.ok) {
          overallStatus = 'BLOCKED'
          stopReason = pA5.error
          persistFailure = pA5.error
        }
        checkTerminal()
      }
      if (overallStatus === 'PASS') {
        var a6p_ = { timestamp: new Date().toISOString(), data: new Array(300000).join('x') }
        var a6b = JSON.stringify(a6p_)
        var a6s = signBody(a6b)
        var cb6 = gc()
        var r6 = callWH('POST', { 'Content-Type': 'application/json', 'X-AC-Signature': a6s }, a6b)
        var ca6 = gc()
        var a6p = r6.status === 400
        rc('A6', 'POST', '/webhook', 400, r6.status, r6.json, cb6, ca6, a6p)
        if (!a6p) {
          overallStatus = 'STOP'
          stopReason = 'A6: expected 400 got ' + r6.status
        }
        var pA6 = persistStep(
          'A6',
          'A6',
          'POST',
          '/backend/v1/integracao/ac/webhook',
          r6.started_at,
          r6.finished_at,
          r6.status,
          400,
          a6p,
          cb6,
          ca6,
          r6.json,
          r6.raw,
          a6p ? '' : 'Expected 400 got ' + r6.status,
          [],
        )
        if (!pA6.ok) {
          overallStatus = 'BLOCKED'
          stopReason = pA6.error
          persistFailure = pA6.error
        }
        checkTerminal()
      }
      if (overallStatus === 'PASS') {
        var a7p_ = {
          type: 'contact_create',
          timestamp: new Date().toISOString(),
          contact: {
            id: 'TESTE-2D2B-A7-C1',
            firstName: '[TESTE]',
            lastName: '2D2B NoSig',
            email: 'teste-2d2b-a7@teste.local',
            phone: '+5511999999999',
          },
        }
        var a7b = JSON.stringify(a7p_)
        var cb7 = gc()
        var r7 = callWH('POST', { 'Content-Type': 'application/json' }, a7b)
        var ca7 = gc()
        var a7p = r7.status === 401 && r7.json.error === 'missing_signature'
        rc('A7', 'POST', '/webhook', 401, r7.status, r7.json, cb7, ca7, a7p)
        if (!a7p) {
          overallStatus = 'STOP'
          stopReason = 'A7: expected 401 missing_signature got ' + r7.status
        }
        var pA7 = persistStep(
          'A7',
          'A7',
          'POST',
          '/backend/v1/integracao/ac/webhook',
          r7.started_at,
          r7.finished_at,
          r7.status,
          401,
          a7p,
          cb7,
          ca7,
          r7.json,
          r7.raw,
          a7p ? '' : 'Expected 401 missing_signature got ' + r7.status,
          [],
        )
        if (!pA7.ok) {
          overallStatus = 'BLOCKED'
          stopReason = pA7.error
          persistFailure = pA7.error
        }
        checkTerminal()
      }
      if (overallStatus === 'PASS') {
        var a8p_ = {
          type: 'contact_create',
          timestamp: new Date().toISOString(),
          contact: {
            id: 'TESTE-2D2B-A8-C1',
            firstName: '[TESTE]',
            lastName: '2D2B BadSig',
            email: 'teste-2d2b-a8@teste.local',
            phone: '+5511999999999',
          },
        }
        var a8b = JSON.stringify(a8p_)
        var cb8 = gc()
        var r8 = callWH(
          'POST',
          { 'Content-Type': 'application/json', 'X-AC-Signature': 'invalido' },
          a8b,
        )
        var ca8 = gc()
        var a8p = r8.status === 401
        rc('A8', 'POST', '/webhook', 401, r8.status, r8.json, cb8, ca8, a8p)
        if (!a8p) {
          overallStatus = 'STOP'
          stopReason = 'A8: expected 401 got ' + r8.status
        }
        var pA8 = persistStep(
          'A8',
          'A8',
          'POST',
          '/backend/v1/integracao/ac/webhook',
          r8.started_at,
          r8.finished_at,
          r8.status,
          401,
          a8p,
          cb8,
          ca8,
          r8.json,
          r8.raw,
          a8p ? '' : 'Expected 401 got ' + r8.status,
          [],
        )
        if (!pA8.ok) {
          overallStatus = 'BLOCKED'
          stopReason = pA8.error
          persistFailure = pA8.error
        }
        checkTerminal()
      }

      var b1Body = '',
        b1Sig = ''
      if (overallStatus === 'PASS') {
        var b1p_ = {
          type: 'contact_create',
          timestamp: new Date().toISOString(),
          contact: {
            id: 'TESTE-2D2B-FN-C1',
            firstName: '[TESTE]',
            lastName: '2D2B Contact',
            email: 'teste-2d2b@teste.local',
            phone: '+5511999999999',
          },
        }
        b1Body = JSON.stringify(b1p_)
        b1Sig = signBody(b1Body)
        var cbB1 = gc()
        var rB1 = callWH(
          'POST',
          { 'Content-Type': 'application/json', 'X-AC-Signature': b1Sig },
          b1Body,
        )
        var caB1 = gc()
        var b1p = rB1.status === 200
        rc('B1', 'POST', '/webhook', 200, rB1.status, rB1.json, cbB1, caB1, b1p)
        if (rB1.status === 200 && rB1.json.event_id)
          evidenceIds.push({
            collection: 'com_eventos_integracao',
            id: String(rB1.json.event_id).substring(0, 8),
          })
        if (!b1p) {
          overallStatus = 'STOP'
          stopReason = 'B1: expected 200 got ' + rB1.status
        }
        var pB1 = persistStep(
          'B1',
          'B1_contato_criado',
          'POST',
          '/backend/v1/integracao/ac/webhook',
          rB1.started_at,
          rB1.finished_at,
          rB1.status,
          200,
          b1p,
          cbB1,
          caB1,
          rB1.json,
          rB1.raw,
          b1p ? '' : 'Expected 200 got ' + rB1.status,
          rB1.json && rB1.json.event_id ? [truncId(String(rB1.json.event_id))] : [],
        )
        if (!pB1.ok) {
          overallStatus = 'BLOCKED'
          stopReason = pB1.error
          persistFailure = pB1.error
        }
        checkTerminal()
      }
      if (overallStatus === 'PASS') {
        var cbB2 = gc()
        var rB2 = callWH(
          'POST',
          { 'Content-Type': 'application/json', 'X-AC-Signature': b1Sig },
          b1Body,
        )
        var caB2 = gc()
        var b2p = rB2.status === 409 && rB2.json.duplicate === true
        rc('B2', 'POST', '/webhook', 409, rB2.status, rB2.json, cbB2, caB2, b2p)
        if (!b2p) {
          overallStatus = 'STOP'
          stopReason = 'B2: expected 409 duplicate got ' + rB2.status
        }
        var pB2 = persistStep(
          'B2',
          'B2_duplicidade_sem_efeito',
          'POST',
          '/backend/v1/integracao/ac/webhook',
          rB2.started_at,
          rB2.finished_at,
          rB2.status,
          409,
          b2p,
          cbB2,
          caB2,
          rB2.json,
          rB2.raw,
          b2p ? '' : 'Expected 409 duplicate got ' + rB2.status,
          [],
        )
        if (!pB2.ok) {
          overallStatus = 'BLOCKED'
          stopReason = pB2.error
          persistFailure = pB2.error
        }
        checkTerminal()
      }
      var b3Body = '',
        b3Sig = ''
      if (overallStatus === 'PASS') {
        var b3p_ = {
          type: 'deal_create',
          timestamp: new Date().toISOString(),
          deal: {
            id: 'TESTE-2D2B-FN-D1',
            title: '[TESTE] 2D2B Negocio',
            value: 10000,
            stage: 'prospects',
          },
        }
        b3Body = JSON.stringify(b3p_)
        b3Sig = signBody(b3Body)
        var cbB3 = gc()
        var rB3 = callWH(
          'POST',
          { 'Content-Type': 'application/json', 'X-AC-Signature': b3Sig },
          b3Body,
        )
        var caB3 = gc()
        var b3p = rB3.status === 200
        rc('B3', 'POST', '/webhook', 200, rB3.status, rB3.json, cbB3, caB3, b3p)
        if (rB3.status === 200 && rB3.json.event_id)
          evidenceIds.push({
            collection: 'com_eventos_integracao',
            id: String(rB3.json.event_id).substring(0, 8),
          })
        if (!b3p) {
          overallStatus = 'STOP'
          stopReason = 'B3: expected 200 got ' + rB3.status
        }
        var pB3 = persistStep(
          'B3',
          'B3_negocio_criado',
          'POST',
          '/backend/v1/integracao/ac/webhook',
          rB3.started_at,
          rB3.finished_at,
          rB3.status,
          200,
          b3p,
          cbB3,
          caB3,
          rB3.json,
          rB3.raw,
          b3p ? '' : 'Expected 200 got ' + rB3.status,
          rB3.json && rB3.json.event_id ? [truncId(String(rB3.json.event_id))] : [],
        )
        if (!pB3.ok) {
          overallStatus = 'BLOCKED'
          stopReason = pB3.error
          persistFailure = pB3.error
        }
        checkTerminal()
      }
      if (overallStatus === 'PASS') {
        var b4p_ = {
          type: 'deal_update',
          timestamp: new Date().toISOString(),
          deal: {
            id: 'TESTE-2D2B-FN-D1',
            title: '[TESTE] 2D2B Negocio Atualizado',
            value: 15000,
            stage: 'producao_proposta',
          },
        }
        var b4b = JSON.stringify(b4p_)
        var b4s = signBody(b4b)
        var cbB4 = gc()
        var rB4 = callWH('POST', { 'Content-Type': 'application/json', 'X-AC-Signature': b4s }, b4b)
        var caB4 = gc()
        var b4p = rB4.status === 200 && caB4.snapshots - cbB4.snapshots > 0
        rc('B4', 'POST', '/webhook', 200, rB4.status, rB4.json, cbB4, caB4, b4p)
        if (rB4.status === 200 && rB4.json.event_id)
          evidenceIds.push({
            collection: 'com_eventos_integracao',
            id: String(rB4.json.event_id).substring(0, 8),
          })
        if (!b4p) {
          overallStatus = 'STOP'
          stopReason = 'B4: expected 200 with snapshot got ' + rB4.status
        }
        var pB4 = persistStep(
          'B4',
          'B4_snapshot_e_atualizacao',
          'POST',
          '/backend/v1/integracao/ac/webhook',
          rB4.started_at,
          rB4.finished_at,
          rB4.status,
          200,
          b4p,
          cbB4,
          caB4,
          rB4.json,
          rB4.raw,
          b4p ? '' : 'Expected 200 with snapshot got ' + rB4.status,
          rB4.json && rB4.json.event_id ? [truncId(String(rB4.json.event_id))] : [],
        )
        if (!pB4.ok) {
          overallStatus = 'BLOCKED'
          stopReason = pB4.error
          persistFailure = pB4.error
        }
        checkTerminal()
      }
      if (overallStatus === 'PASS') {
        var b5p_ = {
          type: 'deal_create',
          timestamp: new Date().toISOString(),
          deal: {
            id: 'TESTE-2D2B-FN-D2',
            title: '[TESTE] 2D2B Sem Map',
            value: 5000,
            stage: 'unmapped_stage_xyz',
          },
        }
        var b5b = JSON.stringify(b5p_)
        var b5s = signBody(b5b)
        var cbB5 = gc()
        var rB5 = callWH('POST', { 'Content-Type': 'application/json', 'X-AC-Signature': b5s }, b5b)
        var caB5 = gc()
        var b5p = rB5.status === 200 && caB5.ocorrencias - cbB5.ocorrencias > 0
        rc('B5', 'POST', '/webhook', 200, rB5.status, rB5.json, cbB5, caB5, b5p)
        if (rB5.status === 200 && rB5.json.event_id)
          evidenceIds.push({
            collection: 'com_eventos_integracao',
            id: String(rB5.json.event_id).substring(0, 8),
          })
        if (!b5p) {
          overallStatus = 'STOP'
          stopReason = 'B5: expected 200 with quality occurrence got ' + rB5.status
        }
        var pB5 = persistStep(
          'B5',
          'B5_negocio_e_ocorrencia_qualidade',
          'POST',
          '/backend/v1/integracao/ac/webhook',
          rB5.started_at,
          rB5.finished_at,
          rB5.status,
          200,
          b5p,
          cbB5,
          caB5,
          rB5.json,
          rB5.raw,
          b5p ? '' : 'Expected 200 with quality occurrence got ' + rB5.status,
          rB5.json && rB5.json.event_id ? [truncId(String(rB5.json.event_id))] : [],
        )
        if (!pB5.ok) {
          overallStatus = 'BLOCKED'
          stopReason = pB5.error
          persistFailure = pB5.error
        }
        checkTerminal()
      }

      var c1Body = '',
        c1Sig = ''
      if (overallStatus === 'PASS') {
        var c1p_ = {
          entity_type: 'business',
          external_id: 'TESTE-2D2B-FN-D1',
          timestamp: new Date().toISOString(),
        }
        c1Body = JSON.stringify(c1p_)
        c1Sig = signBody(c1Body)
        var cbC1 = gc()
        var rC1 = callRB(c1Body, c1Sig)
        var caC1 = gc()
        var c1p =
          rC1.status === 200 &&
          rC1.json.success === true &&
          rC1.json.idempotent === false &&
          rC1.json.rolled_back &&
          rC1.json.rolled_back.length === 1 &&
          rC1.json.rolled_back[0].action === 'restored_from_snapshot' &&
          rC1.json.rolled_back[0].collection === 'com_negocios' &&
          rC1.json.rolled_back[0].record_id
        rc('C1', 'POST', '/rollback', 200, rC1.status, rC1.json, cbC1, caC1, c1p)
        if (!c1p) {
          overallStatus = 'STOP'
          stopReason =
            'C1: contract violation — status=' +
            rC1.status +
            ' body=' +
            JSON.stringify(rC1.json).substring(0, 200)
        }
        var pC1 = persistStep(
          'C1',
          'C1_rollback',
          'POST',
          '/backend/v1/integracao/ac/rollback',
          rC1.started_at,
          rC1.finished_at,
          rC1.status,
          200,
          c1p,
          cbC1,
          caC1,
          rC1.json,
          rC1.raw,
          c1p ? '' : 'C1: contract violation — status=' + rC1.status,
          [],
        )
        if (!pC1.ok) {
          overallStatus = 'BLOCKED'
          stopReason = pC1.error
          persistFailure = pC1.error
        }
        checkTerminal()
      }
      if (overallStatus === 'PASS') {
        var cbC2 = gc()
        var rC2 = callRB(c1Body, c1Sig)
        var caC2 = gc()
        var c2p =
          rC2.status === 200 &&
          rC2.json.success === true &&
          rC2.json.idempotent === true &&
          rC2.json.rolled_back &&
          rC2.json.rolled_back.length === 0
        rc('C2', 'POST', '/rollback', 200, rC2.status, rC2.json, cbC2, caC2, c2p)
        if (!c2p) {
          overallStatus = 'STOP'
          stopReason =
            'C2: contract violation — status=' +
            rC2.status +
            ' body=' +
            JSON.stringify(rC2.json).substring(0, 200)
        }
        var pC2 = persistStep(
          'C2',
          'C2_repeticao_idempotente',
          'POST',
          '/backend/v1/integracao/ac/rollback',
          rC2.started_at,
          rC2.finished_at,
          rC2.status,
          200,
          c2p,
          cbC2,
          caC2,
          rC2.json,
          rC2.raw,
          c2p ? '' : 'C2: contract violation — status=' + rC2.status,
          [],
        )
        if (!pC2.ok) {
          overallStatus = 'BLOCKED'
          stopReason = pC2.error
          persistFailure = pC2.error
        }
        checkTerminal()
      }

      // ─── Restauração da flag + D1 ───
      if (overallStatus === 'PASS') {
        var restoreRes = setWH(false)
        flagFinal = readFlag()
        if (!restoreRes.success) {
          overallStatus = 'BLOCKED'
          stopReason = 'Failed to restore flag: ' + restoreRes.error
        }
        if (flagFinal.valor !== 'false' && overallStatus === 'PASS') {
          overallStatus = 'BLOCKED'
          stopReason = 'Flag not restored to false'
        }
        checkTerminal()
      }
      if (overallStatus === 'PASS') {
        var cbD1 = gc()
        var rD1 = callWH('POST', { 'Content-Type': 'application/json' }, '{}')
        finalProbeStatus = rD1.status
        var d1p = rD1.status === 503
        var caD1 = gc()
        rc('D1', 'POST', '/webhook', 503, rD1.status, rD1.json, cbD1, caD1, d1p)
        if (!d1p) {
          overallStatus = 'STOP'
          stopReason = 'D1: expected 503 got ' + rD1.status
        }
        var pD1 = persistStep(
          'D1',
          'D1',
          'POST',
          '/backend/v1/integracao/ac/webhook',
          rD1.started_at,
          rD1.finished_at,
          rD1.status,
          503,
          d1p,
          cbD1,
          caD1,
          rD1.json,
          rD1.raw,
          d1p ? '' : 'Expected 503 got ' + rD1.status,
          [],
        )
        if (!pD1.ok) {
          overallStatus = 'BLOCKED'
          stopReason = pD1.error
          persistFailure = pD1.error
        }
        checkTerminal()
      }

      // ─── Deltas finais ───
      countsAfter = gc()
      var deltas = {},
        expectedDeltas = {
          contatos: 1,
          negocios: 2,
          eventos: 5,
          execucoes: 4,
          vinculos: 3,
          snapshots: 1,
          ocorrencias: 1,
          auditoria: 0,
        }
      var deltaMatch = true,
        deltaMismatches = []
      for (var dk in expectedDeltas) {
        deltas[dk] = countsAfter[dk] - countsBefore[dk]
        if (deltas[dk] !== expectedDeltas[dk]) {
          deltaMatch = false
          deltaMismatches.push(dk + ': expected +' + expectedDeltas[dk] + ' got +' + deltas[dk])
        }
      }
      if (!deltaMatch && overallStatus === 'PASS') {
        overallStatus = 'STOP'
        stopReason = 'Delta mismatch: ' + deltaMismatches.join(', ')
      }

      // ─── 16 calls ───
      if (overallStatus === 'PASS') {
        if (callResults.length !== 16) {
          overallStatus = 'STOP'
          stopReason = 'Expected 16 calls, got ' + callResults.length
        }
      }

      // ══════════════════════════════════════════════════════════════════
      // v0.0.142 — TERMINALIZAÇÃO FAIL-CLOSED (ordem correta)
      // ══════════════════════════════════════════════════════════════════
      // O bug 0.0.141: persistia estado=pass e SÓ DEPOIS executava a
      // validação canônica pré-GO. Se a validação falhava, tentava
      // alterar o registro já terminal — o hook de imutabilidade
      // (ac_immutable_porta_2d2b.js) bloqueia corretamente essa mutação,
      // deixando a execução terminalizada como pass apesar da falha.
      //
      // Nova ordem (fail-closed):
      //   1. Enquanto ainda running, RELER execução + 16 etapas do disco.
      //   2. Montar projeção/candidato em memória com TODOS os campos
      //      finais pretendidos (estado=pass, decisão final, counters,
      //      counts_after, flag_final, etc.).
      //   3. Executar a validação canônica completa ($porta2d2bValidate)
      //      sobre a projeção + etapas relidas, ANTES de persistir pass.
      //   4. Se aprovar: única transição running → pass; reler; confirmar
      //      estado e campos críticos; só então terminalSaved=true e GO.
      //   5. Se falhar/erro/ambiguidade de leitura: NÃO persiste pass;
      //      única transição running → blocked (ou fail, conforme contrato
      //      vigente); reler e confirmar terminalização; NO-GO.
      //   6. Nenhum caminho altera registro depois de terminalizado.
      //   7. terminalSaved só true após save confirmado + releitura coerente.
      //   8. GO só existe quando estado=pass confirmado após validação
      //      canônica prévia (não pós-hoc).
      // ══════════════════════════════════════════════════════════════════

      if (execRecord && !terminalSaved) {
        // Determinar estado terminal pretendido conforme contrato vigente.
        var terminalEstado = 'pass'
        if (overallStatus === 'STOP') terminalEstado = 'fail'
        else if (overallStatus === 'BLOCKED') terminalEstado = 'blocked'

        var decisaoFinal = JSON.stringify({
          porta: '2D.2B',
          overall_status: overallStatus,
          go_no_go: overallStatus === 'PASS' ? 'GO' : 'NO-GO',
          stop_reason: stopReason,
          total_calls: callResults.length,
          delta_match: deltaMatch,
          persist_failure: persistFailure,
        })

        // ─── (1) Reler execução + 16 etapas ENQUANTO running ───
        // A execução neste momento ainda está em 'running' (ou 'started'
        // se checkTerminal nunca correu — inofensivo). Nada terminal.
        var rereadExec = null
        var rereadSteps = []
        var readAmbiguous = false
        try {
          rereadExec = $app.findFirstRecordByData('com_execucoes_porta_2d2b', 'id', execId)
        } catch (reErr) {
          readAmbiguous = true
          stopReason =
            'Terminalização abortada: falha ao reler execução pré-terminal: ' +
            String(reErr).substring(0, 150)
        }
        if (rereadExec) {
          var rereadEstado = rereadExec.getString('estado')
          // Se por acaso já está terminal (não deveria), NÃO mutar — fail.
          if (
            rereadEstado === 'pass' ||
            rereadEstado === 'fail' ||
            rereadEstado === 'blocked' ||
            rereadEstado === 'aborted'
          ) {
            readAmbiguous = true
            stopReason =
              'Terminalização abortada: execução já terminal (' +
              rereadEstado +
              ') ao reler pré-terminal'
          } else {
            // Reler as 16 etapas do disco
            try {
              var rereadStepRecs = $app.findRecordsByFilter(
                'com_etapas_porta_2d2b',
                "execucao_id = '" + execId + "'",
                'ordem',
                200,
                0,
              )
              for (var rsi = 0; rsi < rereadStepRecs.length; rsi++) {
                rereadSteps.push(rereadStepRecs[rsi])
              }
            } catch (rsErr) {
              readAmbiguous = true
              stopReason =
                'Terminalização abortada: falha ao reler etapas pré-terminal: ' +
                String(rsErr).substring(0, 150)
            }
          }
        } else if (!readAmbiguous) {
          readAmbiguous = true
          stopReason = 'Terminalização abortada: execução não encontrada ao reler pré-terminal'
        }

        // ─── (2) Montar projeção/candidato em memória ───
        // Projeção com TODOS os campos finais pretendidos, inclusive
        // estado=pass e decisão final. Ainda não persistido.
        var projection = {
          id: execId,
          estado: terminalEstado,
          versao_commit: EXPECTED_SCHEMA_VERSION,
          flag_final: JSON.stringify(flagFinal || readFlag()),
          decisao: decisaoFinal,
          counts_before: JSON.stringify(countsBefore),
          counts_after: JSON.stringify(countsAfter || {}),
          allowed_internal_calls: allowedInternalCalls,
          blocked_external_attempts: blockedExternalAttempts,
          activecampaign_calls: activecampaignCalls,
          prova_zero_chamadas_externas: blockedExternalAttempts === 0,
        }

        // ─── (3) Validar ANTES de persistir ───
        // Se houver falha/ambiguidade de leitura, NÃO persiste pass.
        // Para o caso pass, exigimos validação canônica aprovada sobre
        // a projeção e as etapas relidas.
        var validationPassed = false
        var validationReason = ''
        var validationAnomalies = []

        if (!readAmbiguous && terminalEstado === 'pass') {
          // Pré-condições estruturais mínimas antes da validação canônica.
          if (rereadSteps.length !== 16) {
            validationReason =
              'Pré-validação: esperadas 16 etapas relidas, obtidas ' + rereadSteps.length
          } else if (callResults.length !== 16) {
            validationReason =
              'Pré-validação: esperadas 16 callResults, obtidas ' + callResults.length
          } else if (!deltaMatch) {
            validationReason = 'Pré-validação: delta final não corresponde'
          } else if (overallStatus !== 'PASS') {
            validationReason = 'Pré-validação: overallStatus=' + overallStatus + ' (esperado PASS)'
          } else {
            // Validar canonicamente a projeção + etapas relidas.
            // A validação canônica $porta2d2bValidate lê do disco via $app;
            // como ainda não persistimos pass, ela verá estado=running e
            // portanto NÃO aprovaria pass. Para validar a projeção de pass
            // sem persistir, aplicamos a validação sobre uma imagem em
            // memória equivalente ao que seria relido após o save.
            var projectionValidation = $porta2d2bValidateProjection(
              $app,
              execId,
              projection,
              rereadSteps,
            )
            validationPassed = projectionValidation.pass
            validationReason = projectionValidation.reason
            validationAnomalies = projectionValidation.anomalies || []
            if (!validationPassed) {
              validationReason = 'Pre-GO canonical validation failed: ' + validationReason
            }
          }
        } else if (!readAmbiguous && terminalEstado !== 'pass') {
          // fail/blocked: sem necessidade de validação canônica de pass.
          // A terminalização para fail/blocked é sempre permitida (não GO).
          validationPassed = true
        }

        // ─── (4)/(5) Única transição terminal ───
        var finalTerminalEstado = terminalEstado
        if (readAmbiguous) {
          // Falha/ambiguidade de leitura → blocked, nunca pass.
          finalTerminalEstado = 'blocked'
          overallStatus = 'BLOCKED'
          validationPassed = false
        } else if (terminalEstado === 'pass' && !validationPassed) {
          // Validação canônica falhou → blocked, nunca pass.
          finalTerminalEstado = 'blocked'
          overallStatus = 'BLOCKED'
          if (!stopReason) stopReason = validationReason || 'Canonical validation failed'
        }

        // Decisão final coerente com o estado terminal efetivamente gravado.
        var finalDecisao = JSON.stringify({
          porta: '2D.2B',
          overall_status: overallStatus,
          go_no_go: overallStatus === 'PASS' ? 'GO' : 'NO-GO',
          stop_reason: stopReason,
          total_calls: callResults.length,
          delta_match: deltaMatch,
          persist_failure: persistFailure,
          pre_go_validation:
            finalTerminalEstado === 'blocked' && validationReason ? validationReason : undefined,
        })

        var termSave = safeUpdateExec({
          estado: finalTerminalEstado,
          finished_at: new Date().toISOString(),
          counts_after: JSON.stringify(countsAfter || {}),
          flag_final: JSON.stringify(flagFinal || readFlag()),
          prova_zero_chamadas_externas: blockedExternalAttempts === 0,
          allowed_internal_calls: allowedInternalCalls,
          blocked_external_attempts: blockedExternalAttempts,
          activecampaign_calls: activecampaignCalls,
          decisao: finalDecisao,
        })

        // ─── (7) terminalSaved só após save confirmado + releitura coerente ───
        if (termSave.saved && termSave.reread) {
          var tsv = termSave.reread.getString('estado')
          if (tsv === finalTerminalEstado) {
            // Confirmar campos críticos da releitura.
            var decOk = true
            try {
              var decObj = JSON.parse(termSave.reread.getString('decisao') || '{}')
              if (decObj.overall_status !== overallStatus) decOk = false
            } catch (_) {
              decOk = false
            }
            if (
              finalTerminalEstado === 'pass' &&
              termSave.reread.getInt('activecampaign_calls') !== 0
            )
              decOk = false
            if (
              finalTerminalEstado === 'pass' &&
              termSave.reread.getInt('blocked_external_attempts') !== 0
            )
              decOk = false
            if (decOk) {
              terminalSaved = true
            } else {
              // Releitura incoerente — registro já terminal, NÃO mutar.
              // O registro está em finalTerminalEstado (pass/blocked/fail),
              // que é terminal. Não tentamos corrigir: reportamos NO-GO.
              terminalSaved = false
              overallStatus = 'BLOCKED'
              stopReason =
                'Terminal save reread incoerente: estado=' +
                tsv +
                ' mas campos críticos divergentes'
            }
          } else {
            // estado divergente — registro pode estar terminal; NÃO mutar.
            terminalSaved = false
            overallStatus = 'BLOCKED'
            stopReason =
              'Terminal save reread mismatch: estado=' + tsv + ' expected=' + finalTerminalEstado
          }
        } else {
          // Gravação terminal falhou → BLOCKED/NO-GO. NÃO há caminho de
          // mutação pós-terminal aqui: o registro permanece running/started.
          terminalSaved = false
          overallStatus = 'BLOCKED'
          stopReason = 'Terminal save failed: ' + (termSave.error || 'unknown')
        }

        // ─── (8) GO só quando pass confirmado após validação canônica prévia ───
        // terminalSaved só é true se finalTerminalEstado === 'pass' E a
        // validação canônica foi aprovada ANTES do save. Caso contrário,
        // overallStatus já foi ajustado para BLOCKED acima.
        if (terminalSaved && finalTerminalEstado !== 'pass') {
          terminalSaved = false
          overallStatus = 'BLOCKED'
          if (!stopReason) stopReason = 'Terminalização não-pass não pode emitir GO'
        }
        if (overallStatus === 'PASS' && !terminalSaved) {
          overallStatus = 'BLOCKED'
          if (!stopReason) stopReason = 'Terminal state not persisted — cannot return GO'
        }
      }
    } finally {
      try {
        var finFlag = readFlag()
        if (finFlag.valor !== 'false') {
          setWH(false)
          flagFinal = readFlag()
        }
      } catch (_) {}
    }

    return e.json(200, {
      porta: '2D.2B',
      correlation_key: correlationKey,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      overall_status: overallStatus,
      go_no_go: overallStatus === 'PASS' && terminalSaved ? 'GO' : 'NO-GO',
      stop_reason: stopReason,
      terminal_saved: terminalSaved,
      calls: callResults,
      counts_before: countsBefore,
      counts_after: countsAfter,
      deltas: deltas,
      expected_deltas: expectedDeltas,
      delta_match: deltaMatch,
      flag_before: flagBefore,
      flag_during: flagDuring,
      flag_final: flagFinal,
      final_probe_status: finalProbeStatus,
      evidence_ids: evidenceIds,
      activecampaign_calls: activecampaignCalls,
      allowed_internal_calls: allowedInternalCalls,
      blocked_external_attempts: blockedExternalAttempts,
      external_calls_blocked: blockedExternalAttempts,
      writes_performed_round: writesPerformedRound,
      prova_zero_chamadas_externas: blockedExternalAttempts === 0,
      prova_zero_derived_from_counter: true,
      synthetic_only: true,
      records_removed: false,
      single_execution: true,
      lock_consumed: lockConsumed,
      flag_changed: flagChanged,
      schema_version: EXPECTED_SCHEMA_VERSION,
      total_calls: callResults.length,
    })
  },
  $apis.requireAuth(),
)
