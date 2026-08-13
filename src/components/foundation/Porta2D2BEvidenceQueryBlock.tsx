import { useState, useCallback } from 'react'
import {
  Search,
  Loader2,
  Copy,
  Download,
  ShieldCheck,
  Database,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Eye,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { useIsSuperAdmin } from '@/hooks/use-is-superadmin'
import pb from '@/lib/pocketbase/client'

/**
 * Porta 2D.2B — Consulta de Evidência Persistida (v0.0.136).
 *
 * CORREÇÃO 13:
 *  - Zero chamadas automáticas, retry e polling (mantido).
 *  - Gate loading=false e isSuperAdmin=true (mantido).
 *  - Captura status HTTP real e raw body real na consulta (via fetch nativo),
 *    sem fixar 200 no sucesso.
 *  - Não afirma "JSON canônico" se a resposta falhar na validação estrutural.
 *  - localStorage guarda somente resposta sanitizada, nunca token/header.
 */

const ROUTE_PREFIX = '/backend/v1/integracao/ac/evidence-porta-2d2b'
const FRONTEND_VERSION = 'R2-EVIDENCE-2D2B-QUERY-FRONTEND-20260813-v2-0.0.136'

interface EvidenceStep {
  id: string
  execucao_id: string
  ordem: string
  codigo: string
  metodo: string
  rota_sanitizada: string
  started_at: string
  finished_at: string
  http_status_real: number
  http_status_esperado: number
  resultado: string
  counts_antes: string
  counts_depois: string
  deltas: string
  ids_correlacao_sanitizados: string
  sha256_corpo_bruto: string
  resposta_sanitizada: string
  erro_real: string
  created: string
  updated: string
}

interface EvidenceExecution {
  id: string
  runner_version: string
  correlation_key: string
  estado: string
  started_at: string
  finished_at: string
  counts_before: string
  counts_after: string
  flag_before: string
  flag_final: string
  prova_zero_chamadas_externas: boolean
  versao_commit: string
  decisao: string
  created: string
  updated: string
}

interface CanonicalEvidenceResponse {
  route: string
  route_version: string
  read_only: boolean
  writes_performed: number
  writes_note?: string
  round_writes?: number
  external_calls: number
  queried_at: string
  schema_version_expected?: string
  execution: EvidenceExecution | null
  steps: EvidenceStep[]
  canonical_map?: Record<string, unknown>
  classification: string
  classification_justification: string
  total_steps_expected: number
  total_steps_persisted: number
  anomalies: Array<{ type: string; step?: string; description: string }>
  read_errors: Array<{ collection: string; operation: string; error: string }>
  reconstruction_note: string
}

interface QueryState {
  executed: boolean
  queried_at: string
  http_status: number
  ok: boolean
  structurally_valid: boolean
  canonical: CanonicalEvidenceResponse | null
  raw_body: string
  error_message: string | null
}

function emptyQuery(): QueryState {
  return {
    executed: false,
    queried_at: '',
    http_status: 0,
    ok: false,
    structurally_valid: false,
    canonical: null,
    raw_body: '',
    error_message: null,
  }
}

function storageKey(execId: string) {
  return `porta-2d2b-evidence-query-${execId}`
}

function loadFromStorage(execId: string): QueryState | null {
  if (!execId) return null
  try {
    const raw = localStorage.getItem(storageKey(execId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as QueryState
    if (!parsed || typeof parsed !== 'object') return null
    return parsed
  } catch {
    return null
  }
}

/**
 * Salva somente a resposta sanitizada. Nunca persiste token, Authorization
 * ou headers. O QueryState aqui contém apenas http_status, ok, canonical
 * (resposta sanitizada pelo backend), raw_body (corpo sanitizado pelo backend)
 * e error_message (mensagem sanitizada).
 */
function saveToStorage(execId: string, data: QueryState) {
  if (!execId) return
  try {
    localStorage.setItem(storageKey(execId), JSON.stringify(data))
  } catch {
    /* ignore quota */
  }
}

function classificationVariant(
  classification: string,
): 'default' | 'destructive' | 'secondary' | 'outline' {
  if (classification === 'PASS') return 'default'
  if (classification === 'FAIL' || classification === 'BLOCKED') return 'destructive'
  if (classification === 'NAO_ENCONTRADA') return 'destructive'
  return 'secondary'
}

function resultadoVariant(resultado: string): 'default' | 'destructive' | 'secondary' | 'outline' {
  if (resultado === 'PASS') return 'default'
  if (resultado === 'FAIL' || resultado === 'BLOCKED') return 'destructive'
  return 'secondary'
}

function estadoVariant(estado: string): 'default' | 'destructive' | 'secondary' | 'outline' {
  if (estado === 'pass') return 'default'
  if (estado === 'fail' || estado === 'blocked' || estado === 'aborted') return 'destructive'
  if (estado === 'running') return 'secondary'
  return 'outline'
}

/**
 * Validação estrutural mínima: a resposta precisa ter os campos canônicos
 * essenciais. Não afirma "JSON canônico" se falhar.
 */
function isStructurallyValid(parsed: unknown): parsed is CanonicalEvidenceResponse {
  if (!parsed || typeof parsed !== 'object') return false
  const o = parsed as Record<string, unknown>
  return (
    typeof o.route === 'string' &&
    typeof o.route_version === 'string' &&
    typeof o.read_only === 'boolean' &&
    typeof o.classification === 'string' &&
    typeof o.total_steps_expected === 'number' &&
    Array.isArray(o.steps) &&
    Array.isArray(o.anomalies) &&
    Array.isArray(o.read_errors)
  )
}

/** Sanitiza erro de rede: expõe apenas message, sem tokens/headers. */
function sanitizeError(err: unknown): { message: string; status: number } {
  const message = err instanceof Error ? err.message : 'Erro desconhecido'
  let status = 0
  if (err && typeof err === 'object' && 'status' in err) {
    status = (err as { status?: number }).status ?? 0
  }
  return { message, status }
}

export function Porta2D2BEvidenceQueryBlock() {
  const { isSuperAdmin, loading } = useIsSuperAdmin()
  const [execIdInput, setExecIdInput] = useState('')
  const [activeExecId, setActiveExecId] = useState('')
  const [query, setQuery] = useState<QueryState>(emptyQuery)
  const [querying, setQuerying] = useState(false)

  const handleQuery = useCallback(async () => {
    const execId = execIdInput.trim()
    if (!execId) {
      toast.error('Informe um execution_id')
      return
    }
    if (querying) return
    setQuerying(true)

    const queried_at = new Date().toISOString()

    // CORREÇÃO 13: fetch nativo para capturar status HTTP real e raw body real.
    // Nunca fixa 200. Não persiste token/header no localStorage.
    const base = (import.meta.env.VITE_POCKETBASE_URL ?? '').replace(/\/$/, '')
    const url = `${base}${ROUTE_PREFIX}/${encodeURIComponent(execId)}`
    const token = pb.authStore.token || ''

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: token,
        },
      })
      const rawBody = await response.text()
      const httpStatus = response.status
      const ok = httpStatus >= 200 && httpStatus < 300

      let parsed: unknown = undefined
      try {
        parsed = rawBody ? JSON.parse(rawBody) : undefined
      } catch {
        parsed = undefined
      }

      const valid = isStructurallyValid(parsed)
      const canonical: CanonicalEvidenceResponse | null = valid
        ? (parsed as CanonicalEvidenceResponse)
        : null

      const next: QueryState = {
        executed: true,
        queried_at,
        http_status: httpStatus,
        ok,
        structurally_valid: valid,
        canonical,
        raw_body: rawBody,
        error_message: ok
          ? valid
            ? null
            : 'Resposta recebida mas falhou na validação estrutural — não é JSON canônico'
          : 'Resposta não-2xx capturada',
      }
      saveToStorage(execId, next)
      setActiveExecId(execId)
      setQuery(next)
      if (ok && valid) {
        toast.success('Evidência persistida consultada com sucesso')
      } else if (ok && !valid) {
        toast.error('Resposta recebida mas invalidada estruturalmente')
      } else if (httpStatus === 404) {
        toast.error('Execução não encontrada (404)')
      } else {
        toast.error(`Consulta retornou HTTP ${httpStatus}`)
      }
    } catch (err) {
      const { message, status } = sanitizeError(err)
      const next: QueryState = {
        executed: true,
        queried_at,
        http_status: status,
        ok: false,
        structurally_valid: false,
        canonical: null,
        raw_body: message,
        error_message: message,
      }
      saveToStorage(execId, next)
      setActiveExecId(execId)
      setQuery(next)
      toast.error(`Consulta falhou (HTTP ${status || 'n/a'})`)
    } finally {
      setQuerying(false)
    }
  }, [execIdInput, querying])

  const handleCopy = useCallback(async () => {
    if (!query.raw_body) return
    try {
      await navigator.clipboard.writeText(query.raw_body)
      toast.success('Resposta copiada')
    } catch {
      toast.error('Falha ao copiar')
    }
  }, [query.raw_body])

  const handleDownload = useCallback(() => {
    if (!query.raw_body) return
    const blob = new Blob([query.raw_body], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `porta-2d2b-evidence-${activeExecId || 'unknown'}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [query.raw_body, activeExecId])

  const handleClear = useCallback(() => {
    if (activeExecId) {
      try {
        localStorage.removeItem(storageKey(activeExecId))
      } catch {
        /* ignore */
      }
    }
    setQuery(emptyQuery())
    setActiveExecId('')
    toast.info('Consulta local removida (nenhum dado do backend foi alterado)')
  }, [activeExecId])

  // Renderiza somente quando superadmin e não carregando
  if (loading || !isSuperAdmin) {
    return null
  }

  const hasResult = query.executed && !!query.canonical
  const buttonDisabled = querying || !execIdInput.trim()

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Porta 2D.2B — Consulta de Evidência Persistida
          </CardTitle>
          <CardDescription>
            Consulta somente-leitura da evidência persistida no backend (execução + etapas A1–D1).
            Rota alvo:{' '}
            <code className="text-xs">
              GET /backend/v1/integracao/ac/evidence-porta-2d2b/:execId
            </code>
            . Nenhuma chamada automática — a consulta ocorre somente após clique humano no botão.
            Sem retry, polling ou chamada em segundo plano. Status HTTP real e corpo bruto real são
            capturados (sem fixar 200). localStorage guarda somente resposta sanitizada, nunca
            token/header.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Avisos */}
          <div className="rounded-lg border border-amber-300/60 bg-amber-50 dark:bg-amber-950/30 p-3 space-y-1.5">
            <div className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-300">
              <ShieldCheck className="h-4 w-4" />
              Somente-leitura
            </div>
            <div className="text-xs text-amber-800 dark:text-amber-300">
              Esta consulta não realiza nenhuma escrita no backend, nem dispara webhook, rollback,
              ActiveCampaign ou qualquer chamada externa. Apenas lê os registros persistidos pelas
              coleções <code className="text-xs">com_execucoes_porta_2d2b</code> e{' '}
              <code className="text-xs">com_etapas_porta_2d2b</code>.
            </div>
          </div>

          {/* Campo de input + botão */}
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="evidence-exec-id">
              Execution ID
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                id="evidence-exec-id"
                type="text"
                placeholder="ex.: abc123def456..."
                value={execIdInput}
                onChange={(e) => setExecIdInput(e.target.value)}
                className="font-mono text-xs max-w-md"
                disabled={querying}
                autoComplete="off"
                spellCheck={false}
              />
              <Button onClick={handleQuery} disabled={buttonDisabled} size="sm">
                {querying ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Search className="h-4 w-4 mr-1" />
                )}
                Consultar evidência persistida
              </Button>
              {querying && (
                <Badge variant="secondary" className="text-xs">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Requisição em andamento
                </Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground font-mono">
              Bundle: {FRONTEND_VERSION}
            </div>
          </div>

          {/* Estado inicial */}
          {!hasResult && !query.error_message && (
            <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
              <div className="text-sm text-muted-foreground">
                executed: false — Nenhuma evidência consultada. Informe um{' '}
                <code className="text-xs">execution_id</code> e clique no botão para consultar a
                evidência persistida.
              </div>
            </div>
          )}

          {/* Erro sem corpo canônico */}
          {query.executed && !query.canonical && query.error_message && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3">
              <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
              <div className="text-xs text-destructive">
                <div className="font-medium">Erro sanitizado</div>
                <div className="font-mono break-all">{query.error_message}</div>
                <div className="mt-1 text-muted-foreground">
                  Exibido apenas message e status — tokens e headers foram omitidos.
                </div>
              </div>
            </div>
          )}

          {/* Resultado canônico */}
          {hasResult && query.canonical ? (
            <div className="space-y-4">
              {/* HTTP status real + validação estrutural */}
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                <div className="text-xs font-medium text-muted-foreground mb-1">
                  Status HTTP real e validação estrutural
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                  <Badge variant={query.ok ? 'default' : 'destructive'}>
                    HTTP {query.http_status > 0 ? query.http_status : 'n/a'}
                  </Badge>
                  <Badge variant={query.structurally_valid ? 'default' : 'destructive'}>
                    {query.structurally_valid
                      ? 'JSON canônico válido'
                      : 'validação estrutural falhou'}
                  </Badge>
                  <span className="text-muted-foreground">queried_at: {query.queried_at}</span>
                </div>
              </div>

              {/* Resumo da execução */}
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                <div className="text-xs font-medium text-muted-foreground mb-1">
                  Resumo da Execução
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">estado:</span>
                    <Badge variant={estadoVariant(query.canonical.execution?.estado ?? '')}>
                      {query.canonical.execution?.estado ?? 'n/a'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">classification:</span>
                    <Badge variant={classificationVariant(query.canonical.classification)}>
                      {query.canonical.classification}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">total_steps_expected:</span>
                    <code className="text-foreground">{query.canonical.total_steps_expected}</code>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">total_steps_persisted:</span>
                    <code className="text-foreground">{query.canonical.total_steps_persisted}</code>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">runner_version:</span>
                    <code className="text-foreground">
                      {query.canonical.execution?.runner_version ?? 'n/a'}
                    </code>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">correlation_key:</span>
                    <code className="text-foreground">
                      {query.canonical.execution?.correlation_key ?? 'n/a'}
                    </code>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">started_at:</span>
                    <code className="text-foreground">
                      {query.canonical.execution?.started_at ?? 'n/a'}
                    </code>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">finished_at:</span>
                    <code className="text-foreground">
                      {query.canonical.execution?.finished_at ?? 'n/a'}
                    </code>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">prova_zero_chamadas_externas:</span>
                    <Badge
                      variant={
                        query.canonical.execution?.prova_zero_chamadas_externas
                          ? 'default'
                          : 'destructive'
                      }
                    >
                      {String(query.canonical.execution?.prova_zero_chamadas_externas ?? false)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">versao_commit:</span>
                    <code className="text-foreground">
                      {query.canonical.execution?.versao_commit ?? 'n/a'}
                    </code>
                  </div>
                </div>
                {query.canonical.writes_note && (
                  <div className="text-xs text-muted-foreground italic mt-1">
                    {query.canonical.writes_note}
                  </div>
                )}
              </div>

              {/* Justificativa da classificação */}
              <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
                <div className="text-xs font-medium text-muted-foreground mb-1">
                  Justificativa da Classificação
                </div>
                <div className="text-xs text-foreground leading-relaxed">
                  {query.canonical.classification_justification}
                </div>
                <div className="text-xs text-muted-foreground mt-2 italic">
                  {query.canonical.reconstruction_note}
                </div>
              </div>

              {/* Anomalies reais */}
              {query.canonical.anomalies && query.canonical.anomalies.length > 0 && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-400/50 bg-amber-50 dark:bg-amber-950/30 p-3">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                  <div className="text-xs text-amber-800 dark:text-amber-300">
                    <div className="font-medium">
                      Anomalias detectadas ({query.canonical.anomalies.length})
                    </div>
                    <ul className="list-disc ml-4 mt-1">
                      {query.canonical.anomalies.slice(0, 20).map((a, idx) => (
                        <li key={idx} className="font-mono break-all">
                          {a.step ? `[${a.step}] ` : ''}
                          {a.type}: {a.description}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Read errors */}
              {query.canonical.read_errors && query.canonical.read_errors.length > 0 && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-400/50 bg-amber-50 dark:bg-amber-950/30 p-3">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                  <div className="text-xs text-amber-800 dark:text-amber-300">
                    <div className="font-medium">Read errors detectados</div>
                    <ul className="list-disc ml-4 mt-1">
                      {query.canonical.read_errors.map((re, idx) => (
                        <li key={idx} className="font-mono break-all">
                          {re.collection}/{re.operation}: {re.error}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Tabela das 16 etapas */}
              <div className="rounded-lg border p-3 space-y-2">
                <div className="text-xs font-medium text-muted-foreground mb-1">
                  Etapas Persistidas ({query.canonical.steps.length}/
                  {query.canonical.total_steps_expected})
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="py-2 px-2 font-medium">Ordem</th>
                        <th className="py-2 px-2 font-medium">Código</th>
                        <th className="py-2 px-2 font-medium">Método</th>
                        <th className="py-2 px-2 font-medium">Rota</th>
                        <th className="py-2 px-2 font-medium text-center">HTTP Real</th>
                        <th className="py-2 px-2 font-medium text-center">HTTP Esperado</th>
                        <th className="py-2 px-2 font-medium text-center">Resultado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {query.canonical.steps.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-4 text-center text-muted-foreground">
                            Nenhuma etapa persistida encontrada.
                          </td>
                        </tr>
                      ) : (
                        query.canonical.steps.map((step) => (
                          <tr key={step.id} className="border-b last:border-0">
                            <td className="py-2 px-2 font-mono">{step.ordem}</td>
                            <td className="py-2 px-2 font-mono">{step.codigo}</td>
                            <td className="py-2 px-2 font-mono">{step.metodo}</td>
                            <td className="py-2 px-2 font-mono text-muted-foreground max-w-[200px] truncate">
                              {step.rota_sanitizada}
                            </td>
                            <td className="py-2 px-2 text-center font-mono">
                              {step.http_status_real}
                            </td>
                            <td className="py-2 px-2 text-center font-mono">
                              {step.http_status_esperado}
                            </td>
                            <td className="py-2 px-2 text-center">
                              {step.resultado === 'PASS' ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600 inline" />
                              ) : step.resultado === 'FAIL' || step.resultado === 'BLOCKED' ? (
                                <XCircle className="h-4 w-4 text-destructive inline" />
                              ) : (
                                <Badge
                                  variant={resultadoVariant(step.resultado)}
                                  className="text-xs"
                                >
                                  {step.resultado}
                                </Badge>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Ações de cópia/download */}
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={handleCopy} variant="outline" size="sm">
                  <Copy className="h-4 w-4 mr-1" />
                  Copiar resposta
                </Button>
                <Button onClick={handleDownload} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-1" />
                  Baixar resposta
                </Button>
                <Button onClick={handleClear} variant="ghost" size="sm">
                  <Eye className="h-4 w-4 mr-1" />
                  Limpar consulta local
                </Button>
              </div>

              {/* Corpo bruto real da resposta */}
              <div className="rounded-lg border bg-muted/50 p-3">
                <div className="text-xs font-medium text-muted-foreground mb-2">
                  Corpo bruto real da resposta (response.text)
                </div>
                <pre className="max-h-[600px] overflow-auto text-xs font-mono whitespace-pre-wrap break-all">
                  {query.raw_body}
                </pre>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
