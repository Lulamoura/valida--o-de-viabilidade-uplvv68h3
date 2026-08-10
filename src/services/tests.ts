import pb from '@/lib/pocketbase/client'

export interface TestResult {
  test: string
  role: string
  collection: string
  httpStatus: number
  expectedRecords: number | Array<{ id: string; titulo: string; inativo: boolean }>
  actualTotalItems: number
  actualItems: Array<{ id: string; titulo: string; inativo: boolean }>
  pass: boolean
  scope?: string
  expectedCount?: number
  inactiveExcluded?: boolean
}

export interface TestSummary {
  totalTests: number
  passed: number
  failed: number
  allPassed: boolean
}

export interface PositiveTestResults {
  generatedAt: string
  tests: TestResult[]
  summary: TestSummary
}

export const runPositiveTests = (): Promise<PositiveTestResults> =>
  pb.send('/backend/v1/run-positive-tests', { method: 'POST' })

export interface AuditTestStep {
  step: string
  [key: string]: unknown
}

export interface AuditTestSummary {
  totalSteps: number
  passed: number
  failed: number
  allPassed: boolean
  profileId: string
  profileName: string
  profileSlug: string
  profileAtivo: boolean
  porta2BApproved: boolean
  porta2CStarted: boolean
  recordKeptAsEvidence: boolean
}

export interface AuditTestResults {
  generatedAt: string
  steps: AuditTestStep[]
  summary: AuditTestSummary
}

export const runAuditPerfisTest = (): Promise<AuditTestResults> =>
  pb.send('/backend/v1/run-audit-perfis-test', { method: 'POST' })
