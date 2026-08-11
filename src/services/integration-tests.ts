import pb from '@/lib/pocketbase/client'

export interface SecurityTest {
  test: string
  expected: number
  actual: number
  passed: boolean
  beforeCounts?: Record<string, number>
  afterCounts?: Record<string, number>
  [key: string]: unknown
}

export interface EvidenceEntry {
  collection: string
  id: string
  created: string
  correlationKey: string
}

export interface FunctionalResults {
  contact_create?: Record<string, unknown>
  idempotency_replay?: Record<string, unknown>
  deal_create?: Record<string, unknown>
  deal_update_snapshot?: Record<string, unknown>
  unmapped_stage_quality?: Record<string, unknown>
  rollback?: Record<string, unknown>
  rollback_idempotency?: Record<string, unknown>
}

export interface DeactivationProof {
  status: number
  pass: boolean
  webhookEnabled: boolean
}

export interface RoundResult {
  httpStatus: number
  correlationKey: string
  mode: string
  securityMatrix: SecurityTest[]
  securityMatrixPassed: boolean
  functionalResults: FunctionalResults | null
  deactivationProof: DeactivationProof
  evidenceLedger: EvidenceEntry[]
  stopReason: string | null
  beforeCounts: Record<string, number>
  afterCounts: Record<string, number>
  webhookActive: boolean
  flagFinal: boolean
}

export interface PrecheckResult {
  stage: string
  secrets: Record<string, string>
  allPresent: boolean
  ready: boolean
  absentSecrets: string[]
  hs256Test: { tested: boolean; passed: boolean; error: string }
  integracaoCheck: {
    profileExists: boolean
    profileActive: boolean
    accountCount: number
    uniqueAccount: boolean
  }
  counts: Record<string, number>
  webhookEnabled: boolean
  zeroExternalTraffic: boolean
  zeroRealData: boolean
  message: string
}

export async function runRound(mode: 'security-only' | 'full'): Promise<RoundResult> {
  return pb.send('/backend/v1/integracao/ac/run-round-2d2a-r3', {
    method: 'POST',
    body: JSON.stringify({ mode }),
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function runPrecheck(): Promise<PrecheckResult> {
  return pb.send('/backend/v1/integracao/ac/precheck', { method: 'GET' })
}
