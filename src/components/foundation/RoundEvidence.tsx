import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { CheckCircle, XCircle } from 'lucide-react'
import type { Round2D2AEvidence, SecurityMatrixEntry } from '@/services/integration-tests'

function StatusIcon({ pass }: { pass: boolean }) {
  return pass ? (
    <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
  ) : (
    <XCircle className="h-4 w-4 text-red-600 shrink-0" />
  )
}

function CountsBadge({ counts }: { counts?: Record<string, number> }) {
  if (!counts) return null
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {Object.entries(counts).map(([k, v]) => (
        <Badge key={k} variant="secondary" className="text-xs">
          {k}: {v}
        </Badge>
      ))}
    </div>
  )
}

export function RoundEvidence({ evidence }: { evidence: Round2D2AEvidence }) {
  const sm = (evidence.tests.securityMatrix as SecurityMatrixEntry[]) || []
  const fn = (evidence.tests.functional as Record<string, Record<string, unknown>>) || {}
  const rb = (evidence.tests.rollback as Record<string, unknown>) || {}
  const deact = (evidence.tests.deactivation as Record<string, unknown>) || {}

  return (
    <div className="space-y-3">
      {evidence.summary && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Round Summary</CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-1">
            <div className="flex items-center gap-2">
              <StatusIcon pass={evidence.summary.failed === 0} />
              <span>
                {evidence.summary.passed}/{evidence.summary.totalTests} passed
              </span>
            </div>
            <div>Webhook Disabled: {String(evidence.summary.webhookDisabled)}</div>
            <div>Zero External Calls: {String(evidence.summary.zeroExternalCalls)}</div>
            <div>Zero Real Data: {String(evidence.summary.zeroRealData)}</div>
            <div>Records Preserved: {String(evidence.summary.testeRecordsPreserved)}</div>
            <div className="text-muted-foreground mt-2">{evidence.summary.message}</div>
          </CardContent>
        </Card>
      )}

      {sm.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Security Matrix ({sm.length} tests)</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[250px]">
              <div className="space-y-2">
                {sm.map((t, i) => (
                  <div key={i} className="flex items-start gap-2 border-b pb-2">
                    <StatusIcon pass={t.pass} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{t.test}</div>
                      <div className="text-xs text-muted-foreground">
                        HTTP {t.status} (expected {t.expected})
                      </div>
                      {t.before && <CountsBadge counts={t.before as Record<string, number>} />}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {Object.keys(fn).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Functional Flow</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(fn).map(([k, v]) => (
                <div key={k} className="flex items-start gap-2 border-b pb-2">
                  <StatusIcon pass={Boolean(v.pass)} />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{k}</div>
                    <div className="text-xs text-muted-foreground">
                      HTTP {String(v.status ?? '—')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {Object.keys(rb).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Rollback</CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-1">
            <div className="flex items-center gap-2">
              <StatusIcon pass={Boolean(rb.pass)} />
              <span>Status: {String(rb.status ?? '—')}</span>
            </div>
            <div>Restored: {String(rb.restored ?? '—')}</div>
            <div>
              Before: {String(rb.beforeTitle ?? '—')} / {String(rb.beforeEtapa ?? '—')}
            </div>
            <div>
              After: {String(rb.afterTitle ?? '—')} / {String(rb.afterEtapa ?? '—')}
            </div>
            <div>Idempotency: {String(rb.idempotencyStatus ?? '—')}</div>
          </CardContent>
        </Card>
      )}

      {Object.keys(deact).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Deactivation Proof</CardTitle>
          </CardHeader>
          <CardContent className="text-xs">
            <div className="flex items-center gap-2">
              <StatusIcon pass={Boolean(deact.pass)} />
              <span>HTTP {String(deact.status ?? '—')} (expected 503)</span>
            </div>
          </CardContent>
        </Card>
      )}

      {evidence.ledger.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Evidence Ledger ({evidence.ledger.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-1">
                {evidence.ledger.map((e, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs border-b pb-1">
                    <Badge variant="outline" className="text-xs">
                      {e.collection}
                    </Badge>
                    <span className="font-mono">{e.id}</span>
                    <span className="text-muted-foreground">{e.correlationKey}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {evidence.finalCounts && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Final Counts</CardTitle>
          </CardHeader>
          <CardContent>
            <CountsBadge counts={evidence.finalCounts} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
