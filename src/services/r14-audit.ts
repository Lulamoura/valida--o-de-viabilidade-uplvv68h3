import pb from '@/lib/pocketbase/client'

export interface R14AuditResponse {
  route_version: string
  executed_at: string
  read_only: boolean
  query_results: Record<string, unknown>
  go_criteria: Record<string, boolean>
  no_go_criteria: Record<string, boolean>
  overall_result: string
  declaration: {
    r14_started: boolean
    r14_read_only_queries_completed: boolean
    report_created: boolean
    routes_post_put_patch_delete_executed: number
    records_created: number
    records_updated: number
    records_deleted: number
    locks_modified: number
    activecampaign_calls: number
    external_calls: number
    porta_2d2b_started: boolean
    porta_2e_started: boolean
  }
  report_markdown: string
}

export const runR14Audit = (): Promise<R14AuditResponse> =>
  pb.send('/backend/v1/integracao/ac/r14-audit', { method: 'GET' })
