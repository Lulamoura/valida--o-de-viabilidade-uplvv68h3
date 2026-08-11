import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  runRound2D2A,
  runPrecheck,
  verifyRoutes,
  type Round2D2AEvidence,
  type PrecheckResult,
  type RouteVerification,
} from '@/services/integration-tests'
import { RoundEvidence } from '@/components/foundation/RoundEvidence'
import {
  Loader2,
  Play,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  Route as RouteIcon,
} from 'lucide-react'

type LoadingState = 'none' | 'precheck' | 'routes' | 'round'

export function IntegrationTestsTab() {
  const [loading, setLoading] = useState<LoadingState>('none')
  const [evidence, setEvidence] = useState<Round2D2AEvidence | null>(null)
  const [precheck, setPrecheck] = useState<PrecheckResult | null>(null)
  const [routes, setRoutes] = useState<RouteVerification[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isLoading = loading !== 'none'

  const handlePrecheck = async () => {
    setLoading('precheck')
    setError(null)
    try {
      setPrecheck(await runPrecheck())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Precheck failed')
    } finally {
      setLoading('none')
    }
  }

  const handleVerifyRoutes = async () => {
    setLoading('routes')
    setError(null)
    try {
      setRoutes(await verifyRoutes())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Route verification failed')
    } finally {
      setLoading('none')
    }
  }

  const handleRunRound = async () => {
    setLoading('round')
    setError(null)
    setEvidence(null)
    try {
      setEvidence(await runRound2D2A())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Round execution failed')
    } finally {
      setLoading('none')
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Porta 2D.2A — Round Execution
            {evidence?.summary && (
              <Badge variant={evidence.summary.failed > 0 ? 'destructive' : 'default'}>
                {evidence.summary.passed}/{evidence.summary.totalTests} passed
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button onClick={handlePrecheck} disabled={isLoading} variant="outline" size="sm">
              {loading === 'precheck' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="mr-2 h-4 w-4" />
              )}
              Pre-check
            </Button>
            <Button onClick={handleVerifyRoutes} disabled={isLoading} variant="outline" size="sm">
              {loading === 'routes' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RouteIcon className="mr-2 h-4 w-4" />
              )}
              Verify Routes
            </Button>
            <Button onClick={handleRunRound} disabled={isLoading} size="sm">
              {loading === 'round' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Execute Round 2D.2A
            </Button>
          </div>
          {error && (
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}
          {evidence?.stopReason && (
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">BLOCKED: {evidence.stopReason}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {precheck && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Pre-check Results</CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-2">
            <div className="flex items-center gap-2">
              {precheck.ready ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <span>{precheck.message}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(precheck.secrets).map(([k, v]) => (
                <Badge
                  key={k}
                  variant={v === 'PRESENTE' ? 'default' : 'destructive'}
                  className="text-xs"
                >
                  {k}: {v}
                </Badge>
              ))}
            </div>
            <div>HS256: {precheck.hs256Test.passed ? 'PASS' : 'FAIL'}</div>
            <div>
              Integracao Account: {precheck.integracaoCheck.accountCount} (unique:{' '}
              {String(precheck.integracaoCheck.uniqueAccount)})
            </div>
            <div>Webhook Enabled: {String(precheck.webhookEnabled)}</div>
            <div className="flex flex-wrap gap-1 mt-1">
              {Object.entries(precheck.counts).map(([k, v]) => (
                <Badge key={k} variant="secondary" className="text-xs">
                  {k}: {v}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {routes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Route Verification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {routes.map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                {r.reachable ? (
                  <CheckCircle className="h-3 w-3 text-green-600" />
                ) : (
                  <XCircle className="h-3 w-3 text-red-600" />
                )}
                <span className="font-mono">
                  {r.method} {r.route}
                </span>
                <Badge variant="outline" className="text-xs">
                  HTTP {r.status}
                </Badge>
                {r.error && <span className="text-destructive">{r.error}</span>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {evidence && <RoundEvidence evidence={evidence} />}
    </div>
  )
}
