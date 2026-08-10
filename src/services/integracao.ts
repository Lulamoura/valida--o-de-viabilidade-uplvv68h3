import pb from '@/lib/pocketbase/client'

export interface IntegracaoPrecheckResult {
  error?: string
  expectedSlugs?: string[]
  integracaoProfile?: { id: string; ativo: boolean }
  expectedPermissionMatrix?: string[]
  currentPermissionsBefore?: string[]
  exceedingPermissionsRemoved?: string[]
  missingPermissions?: string[]
  priorAccount?: { id: string; name: string; ativo_comercial: boolean } | null
  integracaoUsers?: Array<{ id: string; name: string; email: string }>
  duplicateAccounts?: Array<{ id: string; name: string; email: string }>
  spokUser?: { id: string; name: string; perfil: string } | null
  secretName?: string
  secretRegistered?: boolean
}

export interface IntegracaoBootstrapResult {
  status: string
  action?: string
  account?: { id: string; name: string; perfil: string; ativo_comercial: boolean }
  otherIntegracaoUsers?: Array<{ id: string; name: string }>
  message?: string
  secretName?: string
}

export interface IntegracaoTestItem {
  test: string
  expected: string | number
  actual: string | number
  pass: boolean
  recordId?: string
  totalItems?: number
}

export interface IntegracaoTestsResult {
  timestamp: string
  bootstrap: {
    account: { id: string; name: string; profile: string; ativo_comercial: boolean }
    duplicateAccounts: Array<{ id: string; name: string }>
    teamBindings: Array<{ id: string; ativo: boolean }>
  }
  authentication: {
    httpStatus: number
    success: boolean
    accountId: string
    profileSlug: string
  }
  spok: { id: string; name: string; perfil: string; isIntegracao: boolean } | { found: false }
  tests: IntegracaoTestItem[]
  summary: { total: number; passed: number; failed: number; allPassed: boolean }
  porta2C: string
  porta2D: string
}

export const integracaoPrecheck = (): Promise<IntegracaoPrecheckResult> =>
  pb.send('/backend/v1/integracao/precheck', { method: 'GET' })

export const integracaoBootstrap = (): Promise<IntegracaoBootstrapResult> =>
  pb.send('/backend/v1/integracao/bootstrap', { method: 'POST' })

export const integracaoTests = (): Promise<IntegracaoTestsResult> =>
  pb.send('/backend/v1/integracao/tests', { method: 'POST' })
