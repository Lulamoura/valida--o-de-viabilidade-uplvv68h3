import pb from '@/lib/pocketbase/client'
import { assertMutationsEnabled } from '@/lib/feature-flags'

// ─────────────────────────────────────────────────────────────────────
// Tipos (definidos inline — nunca importar de si mesmo)
// ─────────────────────────────────────────────────────────────────────

export interface CriarSubstituicaoPayload {
  command_idempotency_key: string
  creation_idempotency_key: string
  titular_id: string
  substituto_principal_id: string | null
  substituto_reserva_id: string | null
  data_inicio: string
  data_fim: string
  tipo_cobertura: 'integral' | 'por_negocios'
  negocios_cobertos: string[] | null
  motivo: 'ferias' | 'licenca' | 'falta'
  observacao: string | null
}

export interface AjustarSubstituicaoPayload {
  command_idempotency_key: string
  id: string
  updated_esperado: string
  data_inicio: string
  data_fim: string
  substituto_principal_id?: string | null
  substituto_reserva_id?: string | null
  negocios_cobertos?: string[] | null
  observacao?: string | null
}

export interface CancelarSubstituicaoPayload {
  id: string
  updated_esperado: string
  justificativa_cancelamento: string
  command_idempotency_key: string
}

export interface ConsultaSubstituicoesParams {
  id?: string
  situacao?: 'futura' | 'vigente' | 'encerrada' | 'cancelada'
  titular_id?: string
  substituto_principal_id?: string
  data_inicio_apos?: string
  data_fim_antes?: string
  pagina?: number
  por_pagina?: number
  ordenar_por?: 'data_inicio' | 'data_fim' | 'created'
  ordem?: 'asc' | 'desc'
}

export interface SubstituicaoItem {
  id: string
  data_inicio: string
  data_fim: string
  tipo_cobertura: 'integral' | 'por_negocios'
  motivo: 'ferias' | 'licenca' | 'falta'
  cancelada_em: string | null
  situacao: 'cancelada' | 'futura' | 'vigente' | 'encerrada'
  titular: { id: string; name: string } | null
  substituto_principal: { id: string; name: string } | null
  substituto_reserva: { id: string; name: string } | null
}

export interface ConsultaSubstituicoesResponse {
  substituicoes: SubstituicaoItem[]
  pagina: number
  por_pagina: number
  has_more: boolean
}

export interface SubstituicaoView extends SubstituicaoItem {
  negocios_cobertos: Array<{ id: string; titulo: string }>
  observacao: string | null
  justificativa_cancelamento: string | null
  autor: { id: string; name: string } | null
  created: string
  updated: string
}

export interface BackendError {
  error: string
  message?: string
}

// ─────────────────────────────────────────────────────────────────────
// toQueryParams — omite undefined/null, number→String(n), preserva string
// ─────────────────────────────────────────────────────────────────────

function toQueryParams(params: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const key of Object.keys(params)) {
    const value = params[key]
    if (value === undefined || value === null) continue
    if (typeof value === 'number') {
      out[key] = String(value)
    } else if (typeof value === 'string') {
      out[key] = value
    }
  }
  return out
}

// ─────────────────────────────────────────────────────────────────────
// Funções mutantes — gate na primeira linha, antes de qualquer operação
// ─────────────────────────────────────────────────────────────────────

export async function criarSubstituicao(
  payload: CriarSubstituicaoPayload,
): Promise<{ id: string }> {
  assertMutationsEnabled('/backend/v1/integracao/com/substituicoes/criar')
  return pb.send('/backend/v1/integracao/com/substituicoes/criar', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function ajustarSubstituicao(
  payload: AjustarSubstituicaoPayload,
): Promise<{ id: string }> {
  assertMutationsEnabled('/backend/v1/integracao/com/substituicoes/ajustar')
  return pb.send('/backend/v1/integracao/com/substituicoes/ajustar', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function cancelarSubstituicao(
  payload: CancelarSubstituicaoPayload,
): Promise<{ id: string }> {
  assertMutationsEnabled('/backend/v1/integracao/com/substituicoes/cancelar')
  return pb.send('/backend/v1/integracao/com/substituicoes/cancelar', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  })
}

// ─────────────────────────────────────────────────────────────────────
// Funções de leitura — NÃO referenciam assertMutationsEnabled
// ─────────────────────────────────────────────────────────────────────

export async function consultarSubstituicoes(
  params: Omit<ConsultaSubstituicoesParams, 'id'>,
): Promise<ConsultaSubstituicoesResponse> {
  return pb.send('/backend/v1/integracao/com/substituicoes/consultar', {
    method: 'GET',
    query: toQueryParams(params as Record<string, unknown>),
  })
}

export async function obterSubstituicao(id: string): Promise<SubstituicaoView> {
  return pb.send('/backend/v1/integracao/com/substituicoes/obter', {
    method: 'GET',
    query: toQueryParams({ id }),
  })
}
