// Testes de sanitização — G26
// Execute: node pocketbase/hooks/ac_run_round_2d2b_tests.js
//
// CÓPIA EXATA da função sanitizePersistErrorMessage (e da constante
// SENSITIVE_KEY_PATTERN) do hook de produção
// pocketbase/hooks/ac_run_round_2d2b.js. Sem require, sem import — a
// função no hook e neste teste são idênticas.

// ─── G26: chave normalizada (case-insensitive, - e _ equivalentes).
//     `headers` é tratado à parte (passo d) e não entra no padrão de
//     pares chave-valor para evitar reprocessamento do [REDACTED].
var SENSITIVE_KEY_PATTERN =
  'password|passwd|token|api[_-]?key|apikey|access[_-]?token|refresh[_-]?token|client[_-]?secret|private[_-]?key|privatekey|secret|signature|authorization|x[_-]?api[_-]?key|cookie'
function sanitizePersistErrorMessage(s) {
  var t = String(s == null ? '' : s)
  // (a) URLs sensíveis — inclui query strings, user:password embutidos,
  //     hosts internos e qualquer caminho. Aplicado globalmente ANTES
  //     das demais sanitizações.
  t = t.replace(/https?:\/\/[^\s"'<>]+/gi, '[REDACTED_URL]')
  // (b) Authorization: Bearer/Basic <qualquer coisa>
  //     → Authorization: Bearer/Basic [REDACTED] (case-insensitive).
  t = t.replace(/(Authorization\s*:\s*Bearer\s+)[^\s"',;}\]]+/gi, '$1[REDACTED]')
  t = t.replace(/(Authorization\s*:\s*Basic\s+)[^\s"',;}\]]+/gi, '$1[REDACTED]')
  // (b2) Preserva `Authorization: Bearer/Basic [REDACTED]` para que o
  //      passo (e) (chave: valor) não re-redatada o conteúdo. Marca o
  //      trecho já-sanitizado com placeholders ASCII seguros.
  t = t.replace(/Authorization\s*:\s*Bearer\s+\[REDACTED\]/gi, '\x01AUTH_BEARER_OK\x01')
  t = t.replace(/Authorization\s*:\s*Basic\s+\[REDACTED\]/gi, '\x01AUTH_BASIC_OK\x01')
  // (c) private_key em formato PEM — BEGIN...END (inclusive RSA/EC).
  t = t.replace(
    /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
    '[REDACTED]',
  )
  // (d) headers como objeto JSON — substitui o objeto INTEIRO por
  //     [REDACTED]. Cobre headers:{...}, "headers":{...},
  //     "headers": {...}, headers={...}. Preserva aspas e separador
  //     originais da chave.
  t = t.replace(/("?headers"?)\s*([:=]\s*)\{[^}]*\}/gi, '$1$2[REDACTED]')
  // (e) Pares chave-valor com valor COMPLETO substituído.
  //     1) "chave":"valor"  e  "chave": "valor"
  t = t.replace(
    new RegExp('("(?:' + SENSITIVE_KEY_PATTERN + ')"\\s*(?::)\\s*)"([^"]*)"', 'gi'),
    '$1"[REDACTED]"',
  )
  //     2) chave: "valor"  (sem aspas na chave)
  t = t.replace(
    new RegExp('\\b((?:' + SENSITIVE_KEY_PATTERN + ')\\s*(?::)\\s*)"([^"]*)"', 'gi'),
    '$1"[REDACTED]"',
  )
  //     3) chave: valor  (sem aspas, valor com espaços — substitui
  //        integralmente até separador de bloco)
  t = t.replace(
    new RegExp('\\b((?:' + SENSITIVE_KEY_PATTERN + ')\\s*(?::)\\s*)[^\\n;,}\\\]]+', 'gi'),
    '$1[REDACTED]',
  )
  //     4) chave='valor'  (aspas simples)
  t = t.replace(
    new RegExp('\\b((?:' + SENSITIVE_KEY_PATTERN + ")\\s*(?:=)\\s*)'([^']*)'", 'gi'),
    "$1'[REDACTED]'",
  )
  //     5) chave=valor  (sem aspas, valor com espaços — substitui
  //        integralmente até separador de bloco)
  t = t.replace(
    new RegExp('\\b((?:' + SENSITIVE_KEY_PATTERN + ')\\s*(?:=)\\s*)[^\\n;,}\\\]]+', 'gi'),
    '$1[REDACTED]',
  )
  // (b2r) Restaura Authorization: Bearer/Basic [REDACTED] preservado.
  t = t.replace(/\x01AUTH_BEARER_OK\x01/g, 'Authorization: Bearer [REDACTED]')
  t = t.replace(/\x01AUTH_BASIC_OK\x01/g, 'Authorization: Basic [REDACTED]')
  // (f) e-mails
  t = t.replace(/[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/gi, '[REDACTED]')
  // (g) telefones (+ opcional, 8-15 digitos com separadores)
  t = t.replace(/\+?\d[\d\s().\-]{6,}\d/g, '[REDACTED]')
  if (t.length > 300) t = t.substring(0, 300)
  return t
}

var tests = [
  { input: 'headers: {"Cookie":"session=ULTRASECRET"}', expect: 'headers: [REDACTED]' },
  { input: 'Authorization: Basic dXNlcjpwYXNz', expect: 'Authorization: Basic [REDACTED]' },
  { input: 'password: abc def ghi', expect: 'password: [REDACTED]' },
  { input: 'private_key: -----BEGIN PRIVATE KEY----- ABC DEF', expect: 'private_key: [REDACTED]' },
  { input: 'x-api-key: key value with spaces', expect: 'x-api-key: [REDACTED]' },
  { input: 'password=segredo123', expect: 'password=[REDACTED]' },
  { input: 'token: abc.def.ghi', expect: 'token: [REDACTED]' },
  {
    input: 'Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0',
    expect: 'Authorization: Bearer [REDACTED]',
  },
  { input: '{"private_key":"CHAVE_PRIVADA_SECRETA"}', expect: '{"private_key":"[REDACTED]"}' },
  { input: 'client-secret=valor-super-secreto', expect: 'client-secret=[REDACTED]' },
  { input: 'https://usuario:senha@host.interno/caminho?token=abc', expect: '[REDACTED_URL]' },
  { input: 'email: joao@example.com enviado', expect: 'email: [REDACTED] enviado' },
  { input: 'tel: +55 11 99999-9999', expect: 'tel: [REDACTED]' },
  { input: 'api_key=sk-abc123-def456', expect: 'api_key=[REDACTED]' },
  { input: 'access_token: xyz.789', expect: 'access_token: [REDACTED]' },
  {
    input: '"headers":{"Authorization":"Bearer xyz","Cookie":"s=secret"}',
    expect: '"headers":[REDACTED]',
  },
]

var passed = 0
var failed = 0
tests.forEach(function (t, i) {
  var result = sanitizePersistErrorMessage(t.input)
  var ok = result === t.expect
  if (ok) {
    passed++
    console.log(
      'TEST ' + (i + 1) + ' PASS: ' + JSON.stringify(t.input) + ' → ' + JSON.stringify(result),
    )
  } else {
    failed++
    console.log('TEST ' + (i + 1) + ' FAIL: ' + JSON.stringify(t.input))
    console.log('  expected: ' + JSON.stringify(t.expect))
    console.log('  got:      ' + JSON.stringify(result))
  }
})
console.log('\n' + passed + '/' + (passed + failed) + ' passed')
if (failed > 0) process.exit(1)
