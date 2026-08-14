// ════════════════════════════════════════════════════════════════════
// Porta 2D.2B — Consulta de Evidência Persistida (v0.0.137)
// ════════════════════════════════════════════════════════════════════
// CORREÇÃO 9: delega a validação canônica para a função compartilhada
//   $porta2d2bValidate definida em ac_validate_2d2b.js — mesma lógica
//   usada pelo runner antes de GO.
// CORREÇÃO 6: declara explicitamente qual hash pode ser recomputado
//   (raw_body_sanitized_sha256, sobre o conteúdo devolvido) e qual
//   refere-se ao original não exposto (raw_body_original_sha256).
// CORREÇÃO 8: retorna counters semanticamente corretos
//   (allowed_internal_calls, blocked_external_attempts,
//   activecampaign_calls) em vez de prova_zero constante.
// Leitura exclusivamente server-side, autenticada, superadmin.
// ════════════════════════════════════════════════════════════════════
routerAdd(
  'GET',
  '/backend/v1/integracao/ac/evidence-porta-2d2b/{execId}',
  (e) => {
    var validator = require(__hooks + '/ac_validate_2d2b.js')
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

    var execId = e.request.pathValue('execId') || ''
    if (!execId) return e.json(400, { error: 'missing_exec_id' })

    // ─── CORREÇÃO 9: validação canônica compartilhada ───
    var validation = validator.validate($app, execId)

    if (!validation.execution) {
      return e.json(404, { error: 'execution_not_found', execId: execId })
    }

    var exec = validation.execution
    var steps = validation.steps

    // CORREÇÃO 11: distinguir "GET não escreve" de "round realizou escritas"
    var decisaoObj = null
    try {
      decisaoObj = JSON.parse(exec.decisao || '{}')
    } catch (_) {}
    var roundWrites = 0
    try {
      roundWrites = decisaoObj && decisaoObj.total_calls ? decisaoObj.total_calls : steps.length
    } catch (_) {}
    var writesNote =
      'Esta GET de consulta NÃO realiza escritas (writes_performed=0). O round que originou esta evidência realizou escritas sintéticas em coleções internas (round_writes=' +
      roundWrites +
      '). Não confundir.'

    // external_calls qualificado (CORREÇÃO 9: não é constante sem qualificação)
    var externalCallsQualified = {
      activecampaign_calls: exec.activecampaign_calls,
      blocked_external_attempts: exec.blocked_external_attempts,
      allowed_internal_calls: exec.allowed_internal_calls,
      note: 'external_calls não é uma constante: qualificado em allowed_internal_calls (chamadas internas permitidas realizadas), blocked_external_attempts (tentativas fora da allowlist bloqueadas) e activecampaign_calls (obrigatoriamente zero).',
    }

    // CORREÇÃO 6: declaração de hashes verificáveis
    var hashDeclaration = {
      raw_body_original_sha256:
        'Hash SHA-256 do raw body ORIGINAL (não exposto se contiver segredos). Refere-se ao conteúdo bruto real recebido pelo runner. NÃO pode ser recomputado do conteúdo devolvido pois o original pode conter Authorization/token/assinatura/email/telefone sanitizados.',
      raw_body_sanitized_sha256:
        'Hash SHA-256 do raw_body_sanitized (conteúdo sanitizado devolvido). PODE ser recomputado do conteúdo devolvido no campo raw_body_sanitized. Não afirma origem do hash — valida-se apenas o formato (64 hex) e a igualdade com o conteúdo sanitizado persistido.',
      raw_body_size: 'Tamanho em bytes do raw body original (antes da sanitização).',
      sanitized: 'Indica se o conteúdo persistido passou por sanitização de segredos.',
      recomputable: 'raw_body_sanitized_sha256',
      refers_to_original: 'raw_body_original_sha256',
    }

    // mapa de contratos esperados por etapa (CORREÇÃO 5)
    var expectedContracts = {
      A7: { error: 'missing_signature' },
      B2: { duplicate: true },
      B4: { delta_snapshots: 1 },
      B5: { delta_ocorrencias: 1 },
      C1: {
        success: true,
        idempotent: false,
        rolled_back_action: 'restored_from_snapshot',
        rolled_back_collection: 'com_negocios',
        rolled_back_record_id: true,
        rolled_back_length: 1,
      },
      C2: { success: true, idempotent: true, rolled_back_length: 0 },
      D1: { http: 503, flag_final: false },
    }

    var canonical = {
      route: 'GET /backend/v1/integracao/ac/evidence-porta-2d2b/{execId}',
      route_version: 'R2-EVIDENCE-2D2B-20260813-FAILCLOSED-v0.0.137',
      read_only: true,
      writes_performed: 0,
      writes_note: writesNote,
      round_writes: roundWrites,
      external_calls_qualified: externalCallsQualified,
      hash_declaration: hashDeclaration,
      expected_contracts: expectedContracts,
      queried_at: new Date().toISOString(),
      schema_version_expected: validator.expectedVersion,
      execution: exec,
      steps: steps,
      canonical_map: validator.canonical,
      classification: validation.classification,
      classification_justification: validation.justification,
      total_steps_expected: 16,
      total_steps_persisted: steps.length,
      anomalies: validation.anomalies,
      validation_shared_with_runner: true,
      reconstruction_note:
        'PASS somente se TODOS os critérios satisfeitos pela função compartilhada $porta2d2bValidate: estado=pass, 16 etapas únicas A1–D1, contratos estruturados (A7 missing_signature, B2 duplicate, B4 snapshots+1, B5 ocorrencias+1, C1 idempotent=false com rolled_back restaurado, C2 idempotent=true rolled_back vazio, D1 HTTP 503), deltas por etapa/finais, flag_final=false, hashes verificáveis (original + sanitizado recomputável), sanitização, versão ' +
        validator.expectedVersion +
        ', counters qualificados (activecampaign=0). Anomalias cobrem conteúdo, delta, hash, truncamento, estado e counters. Qualquer divergência → nunca PASS.',
    }

    return e.json(200, canonical)
  },
  $apis.requireAuth(),
)
