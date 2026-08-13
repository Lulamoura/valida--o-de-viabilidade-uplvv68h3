import pb from '@/lib/pocketbase/client'

export interface AuditParamData {
  exists: boolean
  readError?: boolean
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
  truncated?: boolean
}

export interface EvidenceCorrelation {
  [key: string]: unknown
}

export interface EvidenceMappingStep {
  found: boolean | null
  not_reconstructable: boolean
  description: string
  evidence: string[]
  correlation?: EvidenceCorrelation
  note?: string
  anomaly_detected?: boolean
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

export interface LogicalOperatorsVerification {
  inspected_file: string
  verified: boolean
  findings: Array<{ call: string; check: string; verified: boolean }>
  summary: string
}

export interface StaticAnalysis {
  write_primitives_absent: boolean
  write_primitives_check: string
  external_http_calls_absent: boolean
  external_http_calls_check: string
  readparam_logic: string
  logical_operators_verified: boolean
  logical_operators_summary: string
  search_case_insensitive_removed: boolean
  search_case_insensitive_check: string
  pagination_implemented: boolean
  pagination_check: string
  correlation_implemented: boolean
  correlation_check: string
  sanitized_evidence: boolean
  sanitization_check: string
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
  search_variants: string[]
  search_case_insensitive: false
  search_case_note: string
  expected_correlation_keys: string[]
  logical_operators_verification: LogicalOperatorsVerification
  static_analysis: StaticAnalysis
  deployment_target: string
  production_promoted: boolean
}

export const auditRound2D2B = (): Promise<AuditRound2D2BResponse> =>
  pb.send('/backend/v1/integracao/ac/audit-round-2d2b', { method: 'GET' })
