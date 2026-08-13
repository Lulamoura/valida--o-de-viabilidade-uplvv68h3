import pb from '@/lib/pocketbase/client'

export interface AuditParamData {
  exists: boolean
  id: string | null
  valor: string | null
  ativo: boolean | null
  tipo: string | null
  versao: string | null
  created: string | null
  updated: string | null
  note?: string
}

export interface AuditEvidenceItem {
  collection: string
  id: string | null
  created: string
  updated: string
  [key: string]: unknown
}

export interface AuditEvidenceCollection {
  count: number
  items: AuditEvidenceItem[]
  error?: string
}

export interface EvidenceMappingStep {
  found: boolean
  evidence: string[]
  description: string
  note?: string
}

export interface AuditGap {
  gap: string
  description: string
}

export interface AuditAnomaly {
  type: string
  description: string
}

export interface ReadError {
  collection: string
  operation: string
  error: string
}

export type AuditClassification =
  | 'SEM_EVIDENCIA_DE_EXECUCAO'
  | 'INDICIOS_DE_EXECUCAO_PARCIAL'
  | 'INDICIOS_DE_EXECUCAO_COMPLETA_NAO_COMPROVADA'
  | 'EXECUCAO_COMPLETA_COMPROVADA_POR_EVIDENCIA_PERSISTIDA'
  | 'ESTADO_INDETERMINADO'

export interface AuditRound2D2BResponse {
  route: string
  route_version: string
  read_only: true
  writes_performed: 0
  external_calls: 0
  started_at: string
  finished_at: string
  correlation_key: string
  lock: AuditParamData
  flag: AuditParamData
  counts: Record<string, number>
  counts_note: string
  evidence: Record<string, AuditEvidenceCollection>
  evidence_mapping: Record<string, EvidenceMappingStep>
  classification: AuditClassification
  classification_justification: string
  original_pass_go_reconstructable: false
  original_pass_go_note: string
  gaps: AuditGap[]
  anomalies: AuditAnomaly[]
  read_errors: ReadError[]
  monitored_collections: string[]
  search_pattern: string
  search_case_insensitive: boolean
  expected_correlation_keys: string[]
  deployment_target: string
  production_promoted: boolean
}

export const auditRound2D2B = (): Promise<AuditRound2D2BResponse> =>
  pb.send('/backend/v1/integracao/ac/audit-round-2d2b', { method: 'GET' })
