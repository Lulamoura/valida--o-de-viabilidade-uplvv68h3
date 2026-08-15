#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────
// Teste da sanitizadora — Porta 2D.2B — G27 (v0.0.166)
// ─────────────────────────────────────────────────────────────────────
// Lê pocketbase/hooks/ac_run_round_2d2b.js, extrai a declaração REAL de
// SENSITIVE_KEY_PATTERN e a função REAL sanitizePersistErrorMessage, avalia
// ambas em sandbox local (node:vm) e executa os casos. NÃO copia a função
// para o teste — ela é avaliada a partir do fonte de produção.
//
// Execute: node scripts/test-sanitize-2d2b.cjs
// ─────────────────────────────────────────────────────────────────────
'use strict'

const fs = require('fs')
const path = require('path')
const vm = require('vm')

const hookPath = path.join(__dirname, '..', 'pocketbase', 'hooks', 'ac_run_round_2d2b.js')
const src = fs.readFileSync(hookPath, 'utf8')

// ─── Extrai a declaração REAL de SENSITIVE_KEY_PATTERN ───
const patMatch = src.match(/var\s+SENSITIVE_KEY_PATTERN\s*=\s*'[^']*'/)
if (!patMatch) {
  console.error('FAIL: SENSITIVE_KEY_PATTERN não encontrado no hook de produção')
  process.exit(1)
}
const sensitiveKeyPatternSrc = patMatch[0]

// ─── Extrai as funções REAIS do hook de produção ───
// Varredura determinística de chaves balanceadas (respeitando strings
// escapadas) para capturar cada função inteira. Extrai os helpers
// $findBalancedBraceEnd e $findPemBlockEnd E sanitizePersistErrorMessage,
// todos do fonte de produção — sem cópia.
function extractFunction(name, text) {
  const startIdx = text.indexOf('function ' + name + '(')
  if (startIdx === -1) return null
  let i = text.indexOf('{', startIdx)
  if (i === -1) return null
  let depth = 0
  let inStr = false
  let strCh = ''
  for (; i < text.length; i++) {
    const ch = text.charAt(i)
    if (inStr) {
      if (ch === '\\') {
        i++
        continue
      }
      if (ch === strCh) inStr = false
      continue
    }
    if (ch === '"' || ch === "'") {
      inStr = true
      strCh = ch
      continue
    }
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) return text.substring(startIdx, i + 1)
    }
  }
  return null
}
const helperBrace = extractFunction('$findBalancedBraceEnd', src)
const helperPem = extractFunction('$findPemBlockEnd', src)
const fnSrc = extractFunction('sanitizePersistErrorMessage', src)
if (!helperBrace || !helperPem || !fnSrc) {
  console.error(
    'FAIL: não foi possível extrair helpers/sanitizePersistErrorMessage do hook de produção',
  )
  process.exit(1)
}

// ─── Sandbox: avalia constante + helpers + função extraídas ───
const sandbox = { console: console }
vm.createContext(sandbox)
vm.runInContext(
  sensitiveKeyPatternSrc + ';\n' + helperBrace + '\n' + helperPem + '\n' + fnSrc,
  sandbox,
  { filename: 'extracted-sanitizer.js' },
)
const sanitize = sandbox.sanitizePersistErrorMessage
if (typeof sanitize !== 'function') {
  console.error('FAIL: sanitizePersistErrorMessage não é função após eval')
  process.exit(1)
}

// ─── Casos de teste ───
// `expect`  → saída literal exata.
// `noLeak`  → lista de fragmentos que NÃO podem aparecer na saída.
// `has`     → lista de fragmentos que DEVEM aparecer na saída.
const tests = [
  // ── 16 casos existentes (G26) ──
  { input: 'headers: {"Cookie":"session=ULTRASECRET"}', expect: 'headers: [REDACTED]' },
  { input: 'Authorization: Basic dXNlcjpwYXNz', expect: 'Authorization: Basic [REDACTED]' },
  { input: 'password: abc def ghi', expect: 'password: [REDACTED]' },
  {
    input: 'private_key: -----BEGIN PRIVATE KEY----- ABC DEF',
    expect: 'private_key: [REDACTED]',
  },
  { input: 'x-api-key: key value with spaces', expect: 'x-api-key: [REDACTED]' },
  { input: 'password=segredo123', expect: 'password=[REDACTED]' },
  { input: 'token: abc.def.ghi', expect: 'token: [REDACTED]' },
  {
    input: 'Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0',
    expect: 'Authorization: Bearer [REDACTED]',
  },
  {
    input: '{"private_key":"CHAVE_PRIVADA_SECRETA"}',
    expect: '{"private_key":"[REDACTED]"}',
  },
  { input: 'client-secret=valor-super-secreto', expect: 'client-secret=[REDACTED]' },
  {
    input: 'https://usuario:senha@host.interno/caminho?token=abc',
    expect: '[REDACTED_URL]',
  },
  { input: 'email: joao@example.com enviado', expect: 'email: [REDACTED] enviado' },
  { input: 'tel: +55 11 99999-9999', expect: 'tel: [REDACTED]' },
  { input: 'api_key=sk-abc123-def456', expect: 'api_key=[REDACTED]' },
  { input: 'access_token: xyz.789', expect: 'access_token: [REDACTED]' },
  {
    input: '"headers":{"Authorization":"Bearer xyz","Cookie":"s=secret"}',
    expect: '"headers":[REDACTED]',
  },
  // ── Casos obrigatórios G27 ──
  // headers aninhados com Cookie secreto (objeto com valor string contendo
  // chaves escapadas — balanceamento real, não [^}]*).
  {
    input: '{"headers":{"Cookie":"session=ULTRASECRET","X":"{\\"nested\\":true}"}}',
    expect: '{"headers":[REDACTED]}',
    noLeak: ['ULTRASECRET', 'session', 'nested'],
  },
  // PEM completo multilinha.
  {
    input:
      '-----BEGIN PRIVATE KEY-----\nMIIBVwIBADANBgkqhkiG9w0BAQEFAASCAUEw\n-----END PRIVATE KEY-----',
    expect: '[REDACTED]',
    noLeak: ['MIIBVwIBADAN', 'BEGIN', 'END', 'PRIVATE'],
  },
  // PEM sem END — fail-closed: remove todo o restante da mensagem.
  {
    input: '-----BEGIN PRIVATE KEY-----\nMIIBVwIBADAN\nno end here',
    expect: '[REDACTED]',
    noLeak: ['MIIBVwIBADAN', 'no end here', 'BEGIN', 'PRIVATE'],
  },
  // Authorization Basic com valor contendo espaços.
  {
    input: 'Authorization: Basic dXNlcjpwYXNz with spaces',
    expect: 'Authorization: Basic [REDACTED]',
    noLeak: ['dXNlcjpwYXNz', 'with spaces'],
  },
  // Authorization Bearer com valor contendo espaços.
  {
    input: 'Authorization: Bearer eyJhbGciOiJIUzI1NiJ9 with spaces here',
    expect: 'Authorization: Bearer [REDACTED]',
    noLeak: ['eyJhbGciOiJIUzI1NiJ9', 'with spaces here'],
  },
  // Confirmação de saída sem fragmentos residuais (colchete/secret/suffix).
  {
    input: 'secret=ABCDEF secret suffix tail',
    expect: 'secret=[REDACTED]',
    noLeak: ['ABCDEF', 'suffix', 'tail', '[REDACTED]', '[REDACTED]]'],
    has: ['secret=[REDACTED]'],
  },
]

// ─── Runner ───
let passed = 0
let failed = 0
tests.forEach(function (t, i) {
  const result = sanitize(t.input)
  let ok = true
  const reasons = []
  if (t.expect !== undefined && result !== t.expect) {
    ok = false
    reasons.push('saída divergente do esperado')
  }
  if (t.noLeak) {
    t.noLeak.forEach(function (frag) {
      if (result.indexOf(frag) !== -1) {
        ok = false
        reasons.push('vazou fragmento: ' + JSON.stringify(frag))
      }
    })
  }
  if (t.has) {
    t.has.forEach(function (frag) {
      if (result.indexOf(frag) === -1) {
        ok = false
        reasons.push('ausente fragmento: ' + JSON.stringify(frag))
      }
    })
  }
  // Verificação global: nenhum colchete residual duplicado.
  if (/\[REDACTED\]\]/.test(result) || /\[REDACTED_URL\]\]/.test(result)) {
    ok = false
    reasons.push('colchete residual duplicado')
  }
  if (ok) {
    passed++
    console.log(
      'TEST ' + (i + 1) + ' PASS: ' + JSON.stringify(t.input) + ' → ' + JSON.stringify(result),
    )
  } else {
    failed++
    console.log('TEST ' + (i + 1) + ' FAIL: ' + JSON.stringify(t.input))
    console.log('  reasons:  ' + reasons.join('; '))
    if (t.expect !== undefined) console.log('  expected: ' + JSON.stringify(t.expect))
    console.log('  got:      ' + JSON.stringify(result))
  }
})

console.log('\n' + passed + '/' + (passed + failed) + ' passed')
if (failed > 0) process.exit(1)
