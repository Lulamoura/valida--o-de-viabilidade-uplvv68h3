import { useState } from 'react'
import { ShieldCheck, Play, Loader2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  runRound,
  runPrecheck,
  type RoundResult,
  type PrecheckResult,
} from '@/services/integration-tests'
import { RoundEvidence } from '@/components/foundation/RoundEvidence'

export function IntegrationTestsTab() {
  const [loading, setLoading] = useState<string | null>(null)
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null)
  const [precheckResult, setPrecheckResult] = useState<PrecheckResult | null>(null)

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
              Full Round (R3)
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

          {roundResult && <RoundEvidence result={roundResult} />}
        </CardContent>
      </Card>
    </div>
  )
}
