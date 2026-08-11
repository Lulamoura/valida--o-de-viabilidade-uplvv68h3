import { useState, useEffect, useRef } from 'react'
import { ShieldCheck, Play, Loader2, AlertTriangle, Copy, Download, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import pb from '@/lib/pocketbase/client'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  runRound,
  runPrecheck,
  runRoundR5,
  type RoundResult,
  type PrecheckResult,
  type R5Result,
} from '@/services/integration-tests'
import { RoundEvidence } from '@/components/foundation/RoundEvidence'

const R6_SESSION_KEY = 'r6_evidence_raw'

interface R6Evidence {
  rawText: string
  httpStatus: number
  correlationKey: string | null
  executedAt: string
}

function loadR6FromSession(): R6Evidence | null {
  try {
    const raw = sessionStorage.getItem(R6_SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as R6Evidence
    if (parsed && typeof parsed.rawText === 'string') return parsed
    return null
  } catch {
    return null
  }
}

function saveR6ToSession(evidence: R6Evidence) {
  try {
    sessionStorage.setItem(R6_SESSION_KEY, JSON.stringify(evidence))
  } catch {
    /* ignore quota errors */
  }
}

export function IntegrationTestsTab() {
  const [loading, setLoading] = useState<string | null>(null)
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null)
  const [precheckResult, setPrecheckResult] = useState<PrecheckResult | null>(null)
  const [r5Result, setR5Result] = useState<R5Result | null>(null)

  const [r6Evidence, setR6Evidence] = useState<R6Evidence | null>(null)
  const [r6DialogOpen, setR6DialogOpen] = useState(false)
  const [r6Executing, setR6Executing] = useState(false)
  const r6ExecutedRef = useRef(false)

  useEffect(() => {
    const saved = loadR6FromSession()
    if (saved) {
      setR6Evidence(saved)
      r6ExecutedRef.current = true
    }
  }, [])

  const handleRoundR6 = async () => {
    if (r6ExecutedRef.current || r6Executing) return
    setR6Executing(true)
    r6ExecutedRef.current = true
    setR6DialogOpen(false)
    setLoading('r6')

    try {
      const res = await fetch(
        `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/integracao/ac/run-round-2d2a-r6`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: pb.authStore.token || '',
          },
          body: JSON.stringify({ mode: 'full' }),
        },
      )

      const rawText = await res.text()
      const executedAt = new Date().toISOString()

      let correlationKey: string | null = null
      try {
        const parsed = JSON.parse(rawText) as { correlation_key?: string }
        if (parsed.correlation_key) correlationKey = parsed.correlation_key
      } catch {
        /* keep null if not parseable */
      }

      const evidence: R6Evidence = {
        rawText,
        httpStatus: res.status,
        correlationKey,
        executedAt,
      }

      saveR6ToSession(evidence)
      setR6Evidence(evidence)

      if (res.ok) {
        toast.success('R6 Round executado — evidência capturada')
      } else {
        toast.warning(`R6 Round retornou HTTP ${res.status} — evidência capturada`)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      const evidence: R6Evidence = {
        rawText: JSON.stringify({ error: errorMessage }),
        httpStatus: 0,
        correlationKey: null,
        executedAt: new Date().toISOString(),
      }
      saveR6ToSession(evidence)
      setR6Evidence(evidence)
      toast.error('Erro de rede ao executar R6 round')
    } finally {
      setR6Executing(false)
      setLoading(null)
    }
  }

  const handleCopyR6 = async () => {
    if (!r6Evidence) return
    try {
      await navigator.clipboard.writeText(r6Evidence.rawText)
      toast.success('JSON bruto copiado')
    } catch {
      toast.error('Falha ao copiar')
    }
  }

  const handleDownloadR6 = () => {
    if (!r6Evidence) return
    const blob = new Blob([r6Evidence.rawText], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `r6-evidence-${r6Evidence.executedAt.replace(/[:.]/g, '-')}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleRoundR5 = async () => {
    setLoading('r5')
    try {
      const result = await runRoundR5()
      setR5Result(result)
      if (result.overall_status === 'PASS') {
        toast.success('R5 Round concluído — PASS')
      } else {
        toast.error(`R5 Round: ${result.overall_status} — ${result.stop_reason || ''}`)
      }
    } catch {
      toast.error('Erro ao executar R5 round')
    } finally {
      setLoading(null)
    }
  }

  const handlePrecheck = async () => {
    setLoading('precheck')
    try {
      const result = await runPrecheck()
      setPrecheckResult(result)
      toast.success(result.message)
    } catch {
      toast.error('Erro ao executar precheck')
    } finally {
      setLoading(null)
    }
  }

  const handleRound = async (mode: 'security-only' | 'full') => {
    setLoading(mode)
    try {
      const result = await runRound(mode)
      setRoundResult(result)
      if (result.stopReason) {
        toast.error(`Round parou: ${result.stopReason}`)
      } else if (result.securityMatrixPassed) {
        toast.success(`Round ${mode} concluído — matriz 100% PASS`)
      } else {
        toast.warning(`Round ${mode} — matriz não passou`)
      }
    } catch {
      toast.error('Erro ao executar round')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Testes de Integração ActiveCampaign</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button onClick={handlePrecheck} disabled={!!loading} variant="outline" size="sm">
              {loading === 'precheck' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
              Pre-check
            </Button>
            <Button
              onClick={() => handleRound('security-only')}
              disabled={!!loading}
              variant="outline"
              size="sm"
            >
              {loading === 'security-only' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Security-Only
            </Button>
            <Button onClick={() => handleRound('full')} disabled={!!loading} size="sm">
              {loading === 'full' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Full Round (R4)
            </Button>
            <Button onClick={handleRoundR5} disabled={!!loading} variant="outline" size="sm">
              {loading === 'r5' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Full Round (R5)
            </Button>
          </div>

          {precheckResult && (
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center gap-2">
                {precheckResult.ready ? (
                  <ShieldCheck className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                )}
                <span className="font-medium">Pre-check</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                {Object.entries(precheckResult.secrets).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-1">
                    <Badge variant={val === 'PRESENTE' ? 'default' : 'destructive'}>{val}</Badge>
                    <span className="text-xs">{key}</span>
                  </div>
                ))}
              </div>
              {precheckResult.hs256Test && (
                <div className="text-sm">
                  hs256: {precheckResult.hs256Test.passed ? '✅ PASS' : '❌ FAIL'}
                </div>
              )}
            </div>
          )}

          {r5Result && (
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant={r5Result.overall_status === 'PASS' ? 'default' : 'destructive'}>
                  {r5Result.overall_status}
                </Badge>
                <span className="font-medium">R5 Round</span>
              </div>
              <div className="text-sm space-y-1">
                <div>
                  Correlation: <code className="text-xs">{r5Result.correlation_key}</code>
                </div>
                <div>Matrix: {r5Result.security_matrix.length} tests</div>
                <div>
                  Flag Final: valor={r5Result.flag_final?.valor}, ativo=
                  {r5Result.flag_final?.ativo?.toString()}
                </div>
                <div>Probe: {r5Result.final_webhook_probe_status}</div>
                <div>AC Calls: {r5Result.activecampaign_calls}</div>
                <div>Evidence: {r5Result.evidence_ids.length} records</div>
                {r5Result.stop_reason && (
                  <div className="text-red-500">Stop: {r5Result.stop_reason}</div>
                )}
              </div>
            </div>
          )}

          {roundResult && <RoundEvidence result={roundResult} />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Full Round (R6) — Evidência Preservada
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <AlertDialog open={r6DialogOpen} onOpenChange={setR6DialogOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  disabled={!!loading || r6ExecutedRef.current || r6Executing}
                  variant="default"
                  size="sm"
                >
                  {r6Executing || loading === 'r6' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : r6ExecutedRef.current ? (
                    <Lock className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  Full Round (R6)
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar execução R6</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação executará o round R6 completo (security matrix + fluxo funcional) com
                    dados sintéticos. O webhook será ativado temporariamente e restaurado ao final.
                    A execução é única por sessão — após confirmar, o botão será bloqueado. Deseja
                    continuar?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleRoundR6}>
                    Confirmar e executar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {r6ExecutedRef.current && (
              <Badge variant="secondary" className="text-xs">
                <Lock className="h-3 w-3 mr-1" />
                Bloqueado para esta sessão
              </Badge>
            )}
          </div>

          {r6Evidence && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge
                  variant={
                    r6Evidence.httpStatus >= 200 && r6Evidence.httpStatus < 300
                      ? 'default'
                      : 'destructive'
                  }
                >
                  HTTP {r6Evidence.httpStatus}
                </Badge>
                {r6Evidence.correlationKey && (
                  <Badge variant="outline" className="font-mono text-xs">
                    {r6Evidence.correlationKey}
                  </Badge>
                )}
                <span className="text-muted-foreground text-xs">
                  {new Date(r6Evidence.executedAt).toLocaleString('pt-BR')}
                </span>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleCopyR6} variant="outline" size="sm">
                  <Copy className="h-4 w-4 mr-1" />
                  Copiar JSON bruto
                </Button>
                <Button onClick={handleDownloadR6} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-1" />
                  Baixar JSON bruto
                </Button>
              </div>

              <div className="rounded-lg border bg-muted/50 p-3">
                <pre className="max-h-[600px] overflow-auto text-xs font-mono whitespace-pre-wrap break-all">
                  {r6Evidence.rawText}
                </pre>
              </div>
            </div>
          )}

          {!r6Evidence && !r6Executing && (
            <div className="text-sm text-muted-foreground">
              Nenhuma evidência R6 capturada. Clique em "Full Round (R6)" e confirme para executar.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
