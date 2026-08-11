import pb from '@/lib/pocketbase/client'

export interface CountSnapshot {
  eventos: number
  execucoes: number
  vinculos: number
  ocorrencias: number
  snapshots: number
  negocios: number
}

export interface R3TestResult {
  testName: string
  expected: number
  actual: number
  passed: boolean
  countsUnchanged?: boolean
  beforeCounts?: CountSnapshot
  afterCounts?: CountSnapshot
}

export interface R3Response {
  httpStatus: number
  correlationKey: string
  mode: string
  tests: R3TestResult[]
  stopReason: string | null
  webhookActive: boolean
  beforeCounts: CountSnapshot
  afterCounts: CountSnapshot
  flagFinal: boolean
  functionalResults?: Record<string, unknown> | null
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
  message: string
}

export interface RouteVerification {
  route: string
  method: string
  reachable: boolean
  status: number
  error?: string
}

export const runRound2D2A = (
  mode: 'security-only' | 'full' = 'security-only',
): Promise<R3Response> =>
  pb.send('/backend/v1/integracao/ac/run-round-2d2a-r3', {
    method: 'POST',
    body: JSON.stringify({ mode }),
  })

export const runPrecheck = (): Promise<PrecheckResult> =>
  pb.send('/backend/v1/integracao/ac/precheck', { method: 'GET' })

export const runSecurityMatrix = (): Promise<Record<string, unknown>> =>
  pb.send('/backend/v1/integracao/ac/security-matrix', { method: 'POST' })

export const runSyntheticTest = (): Promise<Record<string, unknown>> =>
  pb.send('/backend/v1/integracao/ac/synthetic-test', { method: 'POST' })

export async function verifyRoutes(): Promise<RouteVerification[]> {
  const routes = [
    { route: '/backend/v1/integracao/ac/precheck', method: 'GET' as const },
    { route: '/backend/v1/integracao/ac/security-matrix', method: 'POST' as const },
    { route: '/backend/v1/integracao/ac/synthetic-test', method: 'POST' as const },
    { route: '/backend/v1/integracao/ac/run-round-2d2a-r3', method: 'POST' as const },
  ]
  const results: RouteVerification[] = []
  for (const r of routes) {
    try {
      await pb.send(r.route, { method: r.method })
      results.push({ route: r.route, method: r.method, reachable: true, status: 200 })
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status || 0
      results.push({
        route: r.route,
        method: r.method,
        reachable: status !== 404,
        status,
        error: status === 404 ? 'Route not found (404)' : (err as { message?: string })?.message,
      })
    }
  }
  return results
}
