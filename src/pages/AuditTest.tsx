import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  CheckCircle2,
  XCircle,
  Loader2,
  ShieldAlert,
  ArrowLeft,
  FileText,
  Lock,
} from 'lucide-react'
import { runAuditPerfisTest, type AuditTestResults } from '@/services/tests'
import { getErrorMessage } from '@/lib/pocketbase/errors'

const stepLabels: Record<string, string> = {
  pre_test_slug_check: 'Pre-test: Slug non-existent',
  record_creation: 'Record creation',
  pre_test_verification: 'Pre-test: Zero permissions/links',
  baseline_audit_count: 'Baseline audit count',
  valid_patch: 'Valid PATCH (same nome)',
  valid_patch_audit: 'Valid PATCH — audit event',
  invalid_patch: 'Invalid PATCH (empty slug)',
  invalid_patch_audit: 'Invalid PATCH — no audit',
  record_state_after_tests: 'Record state after tests',
  direct_post_audit: 'Direct POST to com_auditoria',
  direct_patch_audit: 'Direct PATCH on audit record',
  direct_delete_audit: 'Direct DELETE on audit record',
  final_audit_count: 'Final audit count',
}

export default function AuditTest() {
  const [results, setResults] = useState<AuditTestResults | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runTest = async () => {
    setLoading(true)
    setError(null)
    setResults(null)
    try {
      const data = await runAuditPerfisTest()
      setResults(data)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const auditRec = results?.steps.find((s) => s.step === 'valid_patch_audit')?.auditRecord as
    | Record<string, unknown>
    | undefined

  return (
    <div className="container mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit Hook Test — com_perfis</h1>
          <p className="text-sm text-muted-foreground">Porta 2B — Controlled final test</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Dashboard
            </Link>
          </Button>
          <Button onClick={runTest} disabled={loading} size="sm">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {loading ? 'Running...' : 'Execute Test'}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Test failed to execute</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {results && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Summary</span>
                <Badge variant={results.summary.allPassed ? 'default' : 'destructive'}>
                  {results.summary.allPassed ? 'ALL PASSED' : 'HAS FAILURES'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
              <div>
                <span className="text-muted-foreground">Steps:</span> {results.summary.passed}/
                {results.summary.totalSteps}
              </div>
              <div>
                <span className="text-muted-foreground">Profile ID:</span>{' '}
                <code className="text-xs">{results.summary.profileId}</code>
              </div>
              <div>
                <span className="text-muted-foreground">Porta 2B:</span>{' '}
                <Badge variant="secondary">NOT approved</Badge>
              </div>
              <div>
                <span className="text-muted-foreground">Porta 2C:</span>{' '}
                <Badge variant="secondary">NOT started</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Test Steps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {results.steps.map((s, i) => (
                <div key={i} className="flex items-start gap-3 rounded-md border p-3">
                  {s.pass ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                  ) : (
                    <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                  )}
                  <div className="flex-1 space-y-1">
                    <div className="font-medium">{stepLabels[s.step] || s.step}</div>
                    <div className="text-xs text-muted-foreground">
                      {Object.entries(s)
                        .filter(([k]) => k !== 'step' && k !== 'pass' && k !== 'auditRecord')
                        .map(
                          ([k, v]) =>
                            `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`,
                        )
                        .join(' · ')}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {auditRec && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" /> Audit Record Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                {Object.entries(auditRec).map(([k, v]) => (
                  <div key={k} className="flex gap-2">
                    <span className="min-w-[140px] font-medium text-muted-foreground">{k}:</span>
                    <code className="text-xs">{String(v)}</code>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Alert>
            <Lock className="h-4 w-4" />
            <AlertTitle>Security & Closing</AlertTitle>
            <AlertDescription>
              Migration 0057 not altered. Hooks not altered. <code>createRule</code> on
              com_auditoria remains <code>null</code>. Direct POST/PATCH/DELETE blocked (403). Test
              record kept inactive as homologation evidence. No accounts, credentials, or secrets
              created. Porta 2B NOT declared approved. Porta 2C NOT started.
            </AlertDescription>
          </Alert>
        </>
      )}
    </div>
  )
}
