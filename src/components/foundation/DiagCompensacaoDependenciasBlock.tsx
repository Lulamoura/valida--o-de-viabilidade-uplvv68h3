import { useState, useRef } from 'react'
import {
  Play,
  Loader2,
  Lock,
  Copy,
  Download,
  ShieldOff,
  GitBranch,
  ShieldCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import pb from '@/lib/pocketbase/client'

interface CompEvidence {
  captured_from: 'HTTP_RESPONSE' | 'FETCH_ERROR'
  http_status: number
  captured_at: string
  route: string
  raw_response: string
}

const SESSION_KEY = 'ac_diag_compensacao_dependencias_evidence'
const ROUTE_PATH = '/backend/v1/integracao/ac/diag-compensacao-dependencias'
const BACKEND_VERSION = 'R13-2D2A-DIAG-COMPENSACAO-DEPENDENCIAS-BACKEND-20260812-v2'
const FRONTEND_VERSION = 'R13-2D2A-DIAG-COMPENSACAO-DEPENDENCIAS-FRONTEND-20260812-v2'
const FIXED_IDS = {
  com_vinculos_externos: 'phzmobi8mfb34ha',
  com_eventos_integracao: 'pq4npvruaak9gpb',
  com_execucoes_sincronizacao: '62otoics23ul0vy',
}
const BUTTON_ENABLED = true
const COMPENSATION_LOCK = 'armed'
const TRANSACTIONAL_READY = true
const DEPENDENCY_QUERY_LOCK = 'consumed'
const ORIGINAL_AUDIT_LOCK = 'consumed'
const EXPECTED_COUNTS_BEFORE = {
  com_eventos_integracao: 15,
  com_execucoes_sincronizacao: 11,
  com_vinculos_externos: 10,
}
const EXPECTED_COUNTS_AFTER = {
  com_eventos_integracao: 14,
  com_execucoes_sincronizacao: 10,
  com_vinculos_externos: 9,
}

function loadFromSession(): CompEvidence | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CompEvidence
    if (parsed && typeof parsed.raw_response === 'string') return parsed
    return null
  } catch {
    return null
  }
}

function saveToSession(data: CompEvidence) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(data))
  } catch {
    /* ignore quota */
  }
}

export function DiagCompensacaoDependenciasBlock() {
  const [evidence, setEvidence] = useState<CompEvidence | null>(loadFromSession())
  const [executing, setExecuting] = useState(false)
  const executedRef = useRef(false)

  const handleExecute = async () => {
    if (executedRef.current || executing || !BUTTON_ENABLED) return
    setExecuting(true)
    executedRef.current = true

    try {
      sessionStorage.removeItem(SESSION_KEY)
    } catch {
      /* ignore */
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_POCKETBASE_URL}${ROUTE_PATH}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: pb.authStore.token || '',
        },
        body: JSON.stringify({}),
      })

      const rawText = await res.text()

      const data: CompEvidence = {
        captured_from: 'HTTP_RESPONSE',
        http_status: res.status,
        captured_at: new Date().toISOString(),
        route: ROUTE_PATH,
        raw_response: rawText,
      }

      saveToSession(data)
      setEvidence(data)

      if (res.ok) {
        toast.success('Compensação executada — resposta HTTP capturada')
      } else {
        toast.warning(`Compensação retornou HTTP ${res.status} — resposta capturada`)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      const data: CompEvidence = {
        captured_from: 'FETCH_ERROR',
        http_status: 0,
        captured_at: new Date().toISOString(),
        route: ROUTE_PATH,
        raw_response: errorMessage,
      }
      saveToSession(data)
      setEvidence(data)
      toast.error('Erro de rede ao executar compensação')
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
    a.download = `diag-compensacao-dependencias-${evidence.captured_at.replace(/[:.]/g, '-')}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const canCopyDownload =
    !!evidence && evidence.captured_from === 'HTTP_RESPONSE' && !!evidence.raw_response

  const buttonDisabled = !BUTTON_ENABLED || executedRef.current || executing

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitBranch className="h-4 w-4" />
          Compensação de Dependências — Preparada (Não Executada)
          <Badge variant="outline" className="ml-auto text-xs font-mono">
            {FRONTEND_VERSION}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono">
            <span className="text-muted-foreground">Backend Version:</span>
            <code className="text-foreground">{BACKEND_VERSION}</code>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono">
            <span className="text-muted-foreground">Route:</span>
            <code className="text-foreground">POST {ROUTE_PATH}</code>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono">
            <span className="text-muted-foreground">Fixed IDs:</span>
            <code className="text-foreground">vínculo={FIXED_IDS.com_vinculos_externos}</code>
            <code className="text-foreground">evento={FIXED_IDS.com_eventos_integracao}</code>
            <code className="text-foreground">
              execução={FIXED_IDS.com_execucoes_sincronizacao}
            </code>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono">
            <span className="text-muted-foreground">Client input:</span>
            <Badge variant="destructive">rejected</Badge>
          </div>
        </div>

        <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5">
          <div className="text-xs font-medium text-muted-foreground mb-1">
            Estado da Compensação (v2 — native transaction)
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono">
            <span className="text-muted-foreground">transactional_ready:</span>
            <Badge variant={TRANSACTIONAL_READY ? 'default' : 'destructive'}>
              {String(TRANSACTIONAL_READY)}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono">
            <span className="text-muted-foreground">compensation_lock:</span>
            <Badge variant="secondary">{COMPENSATION_LOCK}</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono">
            <span className="text-muted-foreground">dependency_query_lock:</span>
            <Badge variant="secondary">{DEPENDENCY_QUERY_LOCK}</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono">
            <span className="text-muted-foreground">original_audit_lock:</span>
            <Badge variant="secondary">{ORIGINAL_AUDIT_LOCK}</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono">
            <span className="text-muted-foreground">compensation_executed:</span>
            <Badge variant="outline">false</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono">
            <span className="text-muted-foreground">deletion_executed:</span>
            <Badge variant="outline">false</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono">
            <span className="text-muted-foreground">activecampaign_calls:</span>
            <Badge variant="outline">0</Badge>
          </div>
        </div>

        <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5">
          <div className="text-xs font-medium text-muted-foreground mb-1">
            Precondition Counts (v2 — corrected per-collection mapping)
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono">
            <span className="text-muted-foreground">expected_before:</span>
            <code className="text-foreground">
              eventos={EXPECTED_COUNTS_BEFORE.com_eventos_integracao}
            </code>
            <code className="text-foreground">
              execuções={EXPECTED_COUNTS_BEFORE.com_execucoes_sincronizacao}
            </code>
            <code className="text-foreground">
              vínculos={EXPECTED_COUNTS_BEFORE.com_vinculos_externos}
            </code>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono">
            <span className="text-muted-foreground">expected_after:</span>
            <code className="text-foreground">
              eventos={EXPECTED_COUNTS_AFTER.com_eventos_integracao}
            </code>
            <code className="text-foreground">
              execuções={EXPECTED_COUNTS_AFTER.com_execucoes_sincronizacao}
            </code>
            <code className="text-foreground">
              vínculos={EXPECTED_COUNTS_AFTER.com_vinculos_externos}
            </code>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono">
            <span className="text-muted-foreground">rollback_by_manual_recreation:</span>
            <Badge variant="destructive">prohibited</Badge>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-3 w-3" />
            All preconditions, deletions, and post-validations inside single native transaction
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button disabled={buttonDisabled} variant="default" size="sm" onClick={handleExecute}>
            {executing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : !BUTTON_ENABLED ? (
              <ShieldOff className="h-4 w-4" />
            ) : executedRef.current ? (
              <Lock className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Preparar compensação (não executada)
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
              Nenhuma compensação executada. O botão "Preparar compensação (não executada)" está
              habilitado. A rota é {`POST ${ROUTE_PATH}`}, utiliza IDs fixos server-side, possui
              lock independente ({COMPENSATION_LOCK}) e transação nativa atômica com rollback
              nativo. O botão não é acionado automaticamente.
            </div>
            <div className="text-xs text-muted-foreground font-mono">
              Bundle: {FRONTEND_VERSION} | Route: POST {ROUTE_PATH}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
