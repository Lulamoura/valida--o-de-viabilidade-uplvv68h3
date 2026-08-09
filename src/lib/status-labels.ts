export const STATUS_LABELS: Record<string, string> = {
  prospects: 'Prospects',
  producao_proposta: 'Produção Proposta',
  negociacao: 'Negociação',
  ganho: 'Ganho',
  perdido: 'Perdido',
  desqualificado: 'Desqualificado',
}

export const STATUS_STAGES = ['prospects', 'producao_proposta', 'negociacao']
export const STATUS_RESULTS = ['ganho', 'perdido', 'desqualificado']

export const NEGOCIO_STATUS_OPTIONS = [
  'prospects',
  'producao_proposta',
  'negociacao',
  'ganho',
  'perdido',
  'desqualificado',
] as const

export const ESCOPO_LABELS: Record<string, string> = {
  proprios: 'Próprios',
  equipe: 'Equipe',
  todos: 'Todos',
}

export function getStatusLabel(status: string): string {
  return STATUS_LABELS[status] || status
}

export function getEscopoLabel(escopo: string): string {
  return ESCOPO_LABELS[escopo] || escopo
}

export function isStatusStage(status: string): boolean {
  return STATUS_STAGES.includes(status)
}

export function isStatusResult(status: string): boolean {
  return STATUS_RESULTS.includes(status)
}
