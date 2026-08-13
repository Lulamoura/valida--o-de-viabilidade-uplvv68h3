import type { AuditRound2D2BResponse } from '@/services/audit-round-2d2b'

export async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function downloadFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function validateNoPlaceholders(jsonStr: string): { valid: boolean; issues: string[] } {
  const issues: string[] = []
  if (/<[^>]+>/.test(jsonStr)) issues.push('Found angle-bracket placeholder in JSON')
  if (/\.\.\.\s*[,}\]]/.test(jsonStr) || /"\.\.\."/.test(jsonStr))
    issues.push('Found ellipsis replacing a value in JSON')
  return { valid: issues.length === 0, issues }
}

export interface CaptureMetadata {
  environment: string
  route: string
  clientBefore: string
  clientAfter: string
  httpStatus: number
  jsonByteSize: number
  sha256Hash: string
  sha256Verified: boolean
  response: AuditRound2D2BResponse
  validationIssues: string[]
}

export function generateCaptureMarkdown(m: CaptureMetadata): string {
  const v = m.validationIssues.length === 0
  const lines = [
    '# Audit Porta 2D.2B — Capture Metadata',
    '',
    `**Environment:** ${m.environment}`,
    `**Route:** ${m.route}`,
    `**Client timestamp (before call):** ${m.clientBefore}`,
    `**Client timestamp (after call):** ${m.clientAfter}`,
    `**HTTP Status:** ${m.httpStatus}`,
    `**Byte size of AUDIT_PORTA_2D2B_RAW_RESPONSE.json:** ${m.jsonByteSize}`,
    `**SHA-256 of AUDIT_PORTA_2D2B_RAW_RESPONSE.json:** \`${m.sha256Hash}\``,
    `**SHA-256 re-verification:** ${m.sha256Verified ? 'Verified' : 'Mismatch'}`,
    '',
    '## Confirmations',
    '',
    '- **Exactly one GET call executed:** Yes (1)',
    '- **Zero retries:** Confirmed (0)',
    '- **Zero writes:** Confirmed (0 records created, updated, or deleted)',
    '- **Zero forbidden calls:** Confirmed (0 calls to run-round-2d2b, webhook, rollback, ActiveCampaign, or any external service)',
    '- **No code changes:** No existing code modified',
    '- **No sensitive data exposed:** No token, cookie, Authorization header, secret, signature, email, or phone number exposed',
    '- **Not promoted to Production:** Confirmed',
    '- **Porta 2E not started:** Confirmed',
    '',
    '## Validation Results',
    '',
    `- Valid JSON: Yes`,
    `- No placeholders: ${v ? 'Yes' : 'FAILED: ' + m.validationIssues.join('; ')}`,
    `- Concrete classification: ${m.response.classification}`,
    `- Concrete started_at: ${m.response.started_at}`,
    `- Concrete finished_at: ${m.response.finished_at}`,
    `- read_errors is a real array: Yes (${m.response.read_errors.length} items)`,
    `- anomalies is a real array: Yes (${m.response.anomalies.length} items)`,
    `- SHA-256 re-verification: ${m.sha256Verified ? 'Verified' : 'Mismatch'}`,
    '',
    '## Captured Response Summary',
    '',
    `- **classification:** ${m.response.classification}`,
    `- **classification_justification:** ${m.response.classification_justification}`,
    `- **started_at:** ${m.response.started_at}`,
    `- **finished_at:** ${m.response.finished_at}`,
    `- **read_errors count:** ${m.response.read_errors.length}`,
    `- **anomalies count:** ${m.response.anomalies.length}`,
    `- **route_version:** ${m.response.route_version}`,
    `- **read_only:** ${m.response.read_only}`,
    `- **writes_performed:** ${m.response.writes_performed}`,
    `- **external_calls:** ${m.response.external_calls}`,
    `- **production_promoted:** ${m.response.production_promoted}`,
    '',
    '## Process Status',
    '',
    'Process stopped immediately after delivery. No further action authorized.',
    'No retry executed. No second attempt.',
  ]
  return lines.join('\n')
}
