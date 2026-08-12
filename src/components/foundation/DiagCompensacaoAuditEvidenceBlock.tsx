import { useState, useEffect, useRef } from 'react'
import { Play, Loader2, Lock, Copy, Download, ShieldOff, FileSearch } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import pb from '@/lib/pocketbase/client'
import { useIsSuperAdmin } from '@/hooks/use-is-superadmin'

interface AuditEvidence {
  captured_from: 'HTTP_RESPONSE' | 'FETCH_ERROR'
  http_status: number
  captured_at: string
  route: string
  raw_response: string
  parsed?: {
    query_succeeded?: boolean
    target_identity_verified?: Record<string, boolean> | boolean
    dependency_query_succeeded?: boolean
    dependency_count?: number | null
    counts?: Record<string, number> | null
    lock_state_read_succeeded?: boolean
    v7_lock?: { key: string; state: string | null; modified: boolean }
    records_created?: number
    records_updated?: number
    records_deleted?: number
    locks_modified?: number
    activecampaign_calls?: number
    external_calls?: number
  } | null
}

const SESSION_KEY = 'ac_diag_compensacao_audit_evidence'
const ROUTE_PATH = '/backend/v1/integracao/ac/diag-compensacao-auditoria'
const AUDIT_VERSION = 'R13-DIAG-COMPENSACAO-AUDITORIA-20260812-v3'
const FRONTEND_BUNDLE = 'R13-DIAG-COMPENSACAO-AUDITORIA-FRONTEND-20260812-v3'
const EXECUTION_ENABLED = true
const BUTTON_ENABLED = true
const READ_ONLY = true
const NOT_VERIFIED = 'não verificado nesta sessão'

function loadFromSession(): AuditEvidence | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as AuditEvidence
    if (parsed && typeof parsed.raw_response === 'string') return parsed
    return null
  } catch {
    return null
  }
}

function saveToSession(data: AuditEvidence) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(data))
  } catch {
    /* ignore quota */
  }
}

function tryParse(raw: string): AuditEvidence['parsed'] {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function DiagCompensacaoAuditEvidenceBlock() {
  const { isSuperAdmin, loading: saLoading } = useIsSuperAdmin()
  const [evidence, setEvidence] = useState<AuditEvidence | null>(null)
  const [executing, setExecuting] = useState(false)
  const executedRef = useRef(false)

  useEffect(() => {
    const saved = loadFromSession()
    if (saved) {
      setEvidence(saved)
      executedRef.current = true
    }
  }, [])

  if (saLoading) return null
  if (!isSuperAdmin) return null

  const handleExecute = async () => {
    if (executedRef.current || executing || !EXECUTION_ENABLED || !BUTTON_ENABLED) return
    setExecuting(true)
    executedRef.current = true

    try {
      sessionStorage.removeItem(SESSION_KEY)
    } catch {
      /* ignore */
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_POCKETBASE_URL}${ROUTE_PATH}`, {
        method: 'GET',
        headers: {
          Authorization: pb.authStore.token || '',
        },
      })

      const rawText = await res.text()

      const data: AuditEvidence = {
        captured_from: 'HTTP_RESPONSE',
        http_status: res.status,
        captured_at: new Date().toISOString(),
        route: ROUTE_PATH,
        raw_response: rawText,
        parsed: tryParse(rawText),
      }

      saveToSession(data)
      setEvidence(data)

      if (res.ok) {
        toast.success('Auditoria de compensação executada — resposta HTTP capturada')
      } else {
        toast.warning(`Auditoria retornou HTTP ${res.status} — resposta capturada`)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      const data: AuditEvidence = {
        captured_from: 'FETCH_ERROR',
        http_status: 0,
        captured_at: new Date().toISOString(),
        route: ROUTE_PATH,
        raw_response: errorMessage,
        parsed: null,
      }
      saveToSession(data)
      setEvidence(data)
      toast.error('Erro de rede ao executar auditoria de compensação')
    } finally {
      setExecuting(false)
    }
  }

  const handleCopy = async () => {
    if (!evidence || evidence.captured_from !== 'HTTP_RESPONSE' || !evidence.raw_response) return
    try {
      await navigator.clipboard.writeText(evidence.raw_response)
      toast.success('JSON bruto copiado')
    } catch {
      toast.error('Falha ao copiar')
    }
  }

  const handleDownload = () => {
    if (!evidence || evidence.captured_from !== 'HTTP_RESPONSE' || !evidence.raw_response) return
    const blob = new Blob([evidence.raw_response], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `diag-compensacao-auditoria-${evidence.captured_at.replace(/[:.]/g, '-')}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const canCopyDownload =
    !!evidence && evidence.captured_from === 'HTTP_RESPONSE' && !!evidence.raw_response

  const buttonDisabled = !BUTTON_ENABLED || !EXECUTION_ENABLED || executedRef.current || executing

  const hasEvidence = !!evidence && evidence.captured_from === 'HTTP_RESPONSE'
  const p = evidence?.parsed

  const v7LockStateDisplay =
    hasEvidence && p?.v7_lock?.state != null ? p.v7_lock.state : NOT_VERIFIED
  const dataWritesDisplay = hasEvidence
    ? String((p?.records_created ?? 0) + (p?.records_updated ?? 0) + (p?.records_deleted ?? 0))
    : NOT_VERIFIED
  const deletionExecutedDisplay = hasEvidence ? String((p?.records_deleted ?? 0) > 0) : NOT_VERIFIED
  const activeCampaignCallsDisplay = hasEvidence
    ? String(p?.activecampaign_calls ?? 0)
    : NOT_VERIFIED

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSearch className="h-4 w-4" />
          Auditoria de Compensação — Controle Somente-Leitura
          <Badge variant="outline" className="ml-auto text-xs font-mono">
            {FRONTEND_BUNDLE}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono">
            <span className="text-muted-foreground">Audit Version:</span>
            <code className="text-foreground">{AUDIT_VERSION}</code>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono">
            <span className="text-muted-foreground">Route:</span>
            <code className="text-foreground">GET {ROUTE_PATH}</code>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono">
            <span className="text-muted-foreground">Read Only:</span>
            <Badge variant={READ_ONLY ? 'default' : 'destructive'}>{String(READ_ONLY)}</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono">
            <span className="text-muted-foreground">Client Parameters:</span>
            <Badge variant="outline">0 (ignored)</Badge>
          </div>
        </div>

        <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5">
          <div className="text-xs font-medium text-muted-foreground mb-1">Estado da Auditoria</div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono">
            <span className="text-muted-foreground">execution_enabled:</span>
            <Badge variant={EXECUTION_ENABLED ? 'default' : 'destructive'}>
              {String(EXECUTION_ENABLED)}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono">
            <span className="text-muted-foreground">button_enabled:</span>
            <Badge variant={BUTTON_ENABLED ? 'default' : 'destructive'}>
              {String(BUTTON_ENABLED)}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono">
            <span className="text-muted-foreground">executed:</span>
            <Badge variant={executedRef.current ? 'default' : 'outline'}>
              {String(executedRef.current)}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono">
            <span className="text-muted-foreground">deletion_executed:</span>
            <Badge variant="outline">{deletionExecutedDisplay}</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono">
            <span className="text-muted-foreground">v7_lock_state:</span>
            <Badge variant="secondary">{v7LockStateDisplay}</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono">
            <span className="text-muted-foreground">activecampaign_calls:</span>
            <Badge variant="outline">{activeCampaignCallsDisplay}</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono">
            <span className="text-muted-foreground">data_writes:</span>
            <Badge variant="outline">{dataWritesDisplay}</Badge>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button disabled={buttonDisabled} variant="default" size="sm" onClick={handleExecute}>
            {executing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : !EXECUTION_ENABLED || !BUTTON_ENABLED ? (
              <ShieldOff className="h-4 w-4" />
            ) : executedRef.current ? (
              <Lock className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Executar auditoria somente-leitura
          </Button>

          {executedRef.current && (
            <Badge variant="secondary" className="text-xs">
              <Lock className="h-3 w-3 mr-1" />
              Bloqueado para esta sessão
            </Badge>
          )}
        </div>

        <div className="flex gap-2">
          <Button onClick={handleCopy} variant="outline" size="sm" disabled={!canCopyDownload}>
            <Copy className="h-4 w-4 mr-1" />
            Copiar
          </Button>
          <Button onClick={handleDownload} variant="outline" size="sm" disabled={!canCopyDownload}>
            <Download className="h-4 w-4 mr-1" />
            Baixar
          </Button>
        </div>

        {evidence && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge
                variant={evidence.captured_from === 'HTTP_RESPONSE' ? 'default' : 'destructive'}
              >
                {evidence.captured_from}
              </Badge>
              {evidence.http_status > 0 && (
                <Badge
                  variant={
                    evidence.http_status >= 200 && evidence.http_status < 300
                      ? 'default'
                      : 'destructive'
                  }
                >
                  HTTP {evidence.http_status}
                </Badge>
              )}
              <span className="text-muted-foreground text-xs">
                {new Date(evidence.captured_at).toLocaleString('pt-BR')}
              </span>
            </div>

            <div className="rounded-lg border bg-muted/50 p-3">
              <pre className="max-h-[600px] overflow-auto text-xs font-mono whitespace-pre-wrap break-all">
                {evidence.raw_response}
              </pre>
            </div>
          </div>
        )}

        {!evidence && !executing && (
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">
              Nenhuma evidência de auditoria de compensação capturada. O botão "Executar auditoria
              somente-leitura" está habilitado. A rota é {`GET ${ROUTE_PATH}`}, estritamente
              somente-leitura, não consome locks e não faz chamadas externas. Os campos
              v7_lock_state, data_writes, deletion_executed e activecampaign_calls mostram "
              {NOT_VERIFIED}" até que a auditoria seja executada.
            </div>
            <div className="text-xs text-muted-foreground font-mono">
              Bundle: {FRONTEND_BUNDLE} | Route: GET {ROUTE_PATH}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
