#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────
// Teste da sanitizadora — Porta 2D.2B — G28 (v0.0.168)
// ─────────────────────────────────────────────────────────────────────
// Lê pocketbase/hooks/ac_run_round_2d2b.js, extrai o bloco REAL de
// produção delimitado por marcadores textuais estáveis (sem interpretar
// funções caractere a caractere), avalia o bloco completo em sandbox
// local (node:vm) e executa os casos. NÃO copia nenhuma função —
// SENSITIVE_KEY_PATTERN, $findBalancedBraceEnd, $findPemBlockEnd e
// sanitizePersistErrorMessage são avaliados a partir do fonte de
// produção extraído textualmente.
//
// Marcadores:
//   início — primeira ocorrência de `var SENSITIVE_KEY_PATTERN`;
//   fim    — o comentário `/* ─────────────────` imediatamente posterior
//            a `sanitizePersistErrorMessage` (bloco de testes documentais).
//
// Execute: node scripts/test-sanitize-2d2b.cjs
// ─────────────────────────────────────────────────────────────────────
'use strict'

var fs = require('fs')
var path = require('path')
var vm = require('vm')

var hookPath = path.join(__dirname, '..', 'pocketbase', 'hooks', 'ac_run_round_2d2b.js')
var src = fs.readFileSync(hookPath, 'utf8')

// ─── Extrai o bloco REAL de produção por marcadores textuais ───
// Início: primeira ocorrência de `var SENSITIVE_KEY_PATTERN`.
var startMarker = 'var SENSITIVE_KEY_PATTERN'
var startIdx = src.indexOf(startMarker)
if (startIdx === -1) {
  console.error(
    'FAIL: marcador de início `var SENSITIVE_KEY_PATTERN` não encontrado no hook de produção',
  )
  process.exit(1)
}
// Fim: o comentário `/* ─────────────────` imediatamente posterior a
// `sanitizePersistErrorMessage` (bloco de testes documentais logo após
// a função). Localiza o fim da função sanitizePersistErrorMessage pelo
// fecha-chave balanceado a partir de sua declaração, então procura o
// próximo `/* ───` após esse ponto.
var fnDecl = 'function sanitizePersistErrorMessage'
var fnIdx = src.indexOf(fnDecl, startIdx)
if (fnIdx === -1) {
  console.error(
    'FAIL: `function sanitizePersistErrorMessage` não encontrado após o marcador de início',
  )
  process.exit(1)
}
var braceIdx = src.indexOf('{', fnIdx)
if (braceIdx === -1) {
  console.error('FAIL: abre-chaves de sanitizePersistErrorMessage não encontrado')
  process.exit(1)
}
// Varredura balanceada simples para localizar o fecha-chaves que encerra
// sanitizePersistErrorMessage (respeitando strings escapadas). Esta
// varredura serve APENAS para localizar o fim da função e dela buscar o
// marcador de comentário textual — não interpreta nem copia a função.
var depth = 0
var inStr = false
var strCh = ''
var fnEnd = -1
for (var i = braceIdx; i < src.length; i++) {
  var ch = src.charAt(i)
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
    if (depth === 0) {
      fnEnd = i
      break
    }
  }
}
if (fnEnd === -1) {
  console.error('FAIL: não foi possível localizar o fim de sanitizePersistErrorMessage')
  process.exit(1)
}
// Após o fim da função, busca o próximo comentário `/* ─────────────────`,
// que delimita o bloco de testes documentais (fim do bloco de produção).
var endMarker = '/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500'
var endIdx = src.indexOf(endMarker, fnEnd + 1)
if (endIdx === -1) {
  console.error('FAIL: marcador de fim `/* ───...` não encontrado após sanitizePersistErrorMessage')
  process.exit(1)
}

// Bloco textual completo entre os marcadores: contém SENSITIVE_KEY_PATTERN,
// $findBalancedBraceEnd, $findPemBlockEnd e sanitizePersistErrorMessage.
var blockSrc = src.substring(startIdx, endIdx)

// ─── Sandbox: avalia o bloco completo extraído do hook ───
var sandbox = { console: console }
vm.createContext(sandbox)
vm.runInContext(blockSrc, sandbox, { filename: 'extracted-sanitizer-block.js' })
var sanitize = sandbox.sanitizePersistErrorMessage
if (typeof sanitize !== 'function') {
  console.error('FAIL: sanitizePersistErrorMessage não é função após eval do bloco extraído')
  process.exit(1)
}

// ─── Casos de teste ───
// `expect`  → saída literal exata.
// `noLeak`  → lista de fragmentos que NÃO podem aparecer na saída.
// `has`     → lista de fragmentos que DEVEM aparecer na saída.
var tests = [
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
  // `[REDACTED]` simples NÃO é vazamento — é a própria sanitização
  // funcionando. `noLeak` contém apenas fragmentos realmente secretos/
  // residuais: `ABCDEF`, `suffix`, `tail` e `[REDACTED]]` (colchete duplo).
  {
    input: 'secret=ABCDEF secret suffix tail',
    expect: 'secret=[REDACTED]',
    noLeak: ['ABCDEF', 'suffix', 'tail', '[REDACTED]]'],
    has: ['secret=[REDACTED]'],
  },
]

// ─── Runner ───
var passed = 0
var failed = 0
tests.forEach(function (t, i) {
  var result = sanitize(t.input)
  var ok = true
  var reasons = []
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
