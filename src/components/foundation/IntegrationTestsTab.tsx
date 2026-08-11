import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { runRound2D2A, type Round2D2AEvidence } from '@/services/integration-tests'
import { Loader2, Play, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'

function StatusIcon({ pass }: { pass: boolean }) {
  return pass ? (
    <CheckCircle className="h-4 w-4 text-green-600" />
  ) : (
    <XCircle className="h-4 w-4 text-red-600" />
  )
}

function CountsDisplay({ counts }: { counts?: Record<string, number> }) {
  if (!counts) return null
  return (
    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
      {Object.entries(counts).map(([k, v]) => (
        <Badge key={k} variant="secondary" className="text-xs">
          {k}: {v}
        </Badge>
      ))}
    </div>
  )
}

export function IntegrationTestsTab() {
  const [loading, setLoading] = useState(false)
  const [evidence, setEvidence] = useState<Round2D2AEvidence | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleRun = async () => {
    setLoading(true)
    setError(null)
    setEvidence(null)
    try {
      const result = await runRound2D2A()
      setEvidence(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run round')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Porta 2D.2A — Round Execution
            {evidence?.summary && (
              <Badge variant={evidence.summary.failed > 0 ? 'destructive' : 'default'}>
                {evidence.summary.passed}/{evidence.summary.totalTests} passed
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleRun} disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            Execute Round 2D.2A
          </Button>
          {error && (
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}
          {evidence?.stopReason && (
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">STOPPED: {evidence.stopReason}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {evidence?.tests.flagAfter && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Activation Flag (com_parametros)</CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-1">
            <div>Collection: com_parametros</div>
            <div>Key: {String(evidence.tests.flagAfter.key ?? 'ac_webhook_enabled')}</div>
            <div>Value: {String(evidence.tests.flagAfter.valor ?? '—')}</div>
            <div>Created: {String(evidence.tests.flagAfter.created ?? '—')}</div>
            <div>Updated: {String(evidence.tests.flagAfter.updated ?? '—')}</div>
          </CardContent>
        </Card>
      )}

      {evidence?.tests.securityMatrix && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              Security Matrix ({evidence.tests.securityMatrix.length} tests)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {evidence.tests.securityMatrix.map((t, i) => (
                  <div key={i} className="flex items-start gap-2 border-b pb-2">
                    <StatusIcon pass={t.pass} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{t.test}</div>
                      <div className="text-xs text-muted-foreground">
                        HTTP {t.status} (expected {t.expected})
                      </div>
                      {t.before && t.after && (
                        <div className="mt-1">
                          <CountsDisplay counts={t.before as Record<string, number>} />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {evidence?.tests.functional && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Functional Flow</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(evidence.tests.functional).map(([k, v]) => {
                const val = v as Record<string, unknown>
                return (
                  <div key={k} className="flex items-start gap-2 border-b pb-2">
                    <StatusIcon pass={Boolean(val.pass)} />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{k}</div>
                      <div className="text-xs text-muted-foreground">
                        HTTP {String(val.status ?? '—')}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {evidence?.tests.rollback && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Rollback</CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-1">
            <div>Status: {String(evidence.tests.rollback.status ?? '—')}</div>
            <div>Restored: {String(evidence.tests.rollback.restored ?? '—')}</div>
            <div>
              Before: {String(evidence.tests.rollback.beforeTitle ?? '—')} /{' '}
              {String(evidence.tests.rollback.beforeEtapa ?? '—')}
            </div>
            <div>
              After: {String(evidence.tests.rollback.afterTitle ?? '—')} /{' '}
              {String(evidence.tests.rollback.afterEtapa ?? '—')}
            </div>
            <div>Idempotency: {String(evidence.tests.rollback.idempotencyStatus ?? '—')}</div>
          </CardContent>
        </Card>
      )}

      {evidence?.ledger && evidence.ledger.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              Evidence Ledger ({evidence.ledger.length} records)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-1">
                {evidence.ledger.map((entry, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs border-b pb-1">
                    <Badge variant="outline" className="text-xs">
                      {entry.collection}
                    </Badge>
                    <span className="font-mono">{entry.id}</span>
                    <span className="text-muted-foreground">{entry.correlationKey}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {evidence?.finalCounts && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Final Counts</CardTitle>
          </CardHeader>
          <CardContent>
            <CountsDisplay counts={evidence.finalCounts} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
