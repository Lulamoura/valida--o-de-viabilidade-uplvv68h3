import pb from '@/lib/pocketbase/client'

export interface EvidenceLedgerEntry {
  id: string
  collection: string
  created: string
  correlationKey: string
}

export interface CountSnapshot {
  eventos: number
  execucoes: number
  vinculos: number
  negocios: number
  snapshots: number
  ocorrencias: number
}

export interface SecurityMatrixEntry {
  test: string
  status: number
  expected: number
  pass: boolean
  before?: CountSnapshot
  after?: CountSnapshot
  [key: string]: unknown
}

export interface Round2D2AEvidence {
  round: string
  startedAt: string
  completedAt?: string
  stoppedAt?: string
  stopReason?: string
  tests: {
    precheck?: Record<string, unknown>
    flagBefore?: Record<string, unknown>
    flagAfter?: Record<string, unknown>
    securityMatrix?: SecurityMatrixEntry[]
    functional?: Record<string, unknown>
    rollback?: Record<string, unknown>
    deactivation?: Record<string, unknown>
    flagDeactivated?: Record<string, unknown>
    [key: string]: unknown
  }
  ledger: EvidenceLedgerEntry[]
  finalCounts?: CountSnapshot
  summary?: {
    totalTests: number
    passed: number
    failed: number
    webhookDisabled: boolean
    zeroExternalCalls: boolean
    zeroRealData: boolean
    testeRecordsPreserved: boolean
    message: string
  }
}

export const runRound2D2A = (): Promise<Round2D2AEvidence> =>
  pb.send('/backend/v1/integracao/ac/run-round-2d2a', { method: 'POST' })

export const runPrecheck = (): Promise<Record<string, unknown>> =>
  pb.send('/backend/v1/integracao/ac/precheck', { method: 'GET' })

export const runSecurityMatrix = (): Promise<Record<string, unknown>> =>
  pb.send('/backend/v1/integracao/ac/security-matrix', { method: 'POST' })

export const runSyntheticTest = (): Promise<Record<string, unknown>> =>
  pb.send('/backend/v1/integracao/ac/synthetic-test', { method: 'POST' })
