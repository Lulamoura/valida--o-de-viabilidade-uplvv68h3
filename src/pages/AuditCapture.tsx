import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  Download,
  FileJson,
  FileText,
  ShieldCheck,
  Lock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useAuth } from '@/hooks/use-auth'
import { useIsSuperAdmin } from '@/hooks/use-is-superadmin'
import { auditRound2D2B, type AuditRound2D2BResponse } from '@/services/audit-round-2d2b'
import {
  sha256,
  downloadFile,
  validateNoPlaceholders,
  generateCaptureMarkdown,
} from '@/lib/audit-capture'

export default function AuditCapture() {
  const { isAuthenticated } = useAuth()
  const { isSuperAdmin, loading: saLoading } = useIsSuperAdmin()
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<AuditRound2D2BResponse | null>(null)
  const [jsonStr, setJsonStr] = useState('')
  const [clientBefore, setClientBefore] = useState('')
  const [clientAfter, setClientAfter] = useState('')
  const [httpStatus, setHttpStatus] = useState<number | null>(null)
  const [hash, setHash] = useState('')
  const [hashVerified, setHashVerified] = useState(false)
  const [issues, setIssues] = useState<string[]>([])
  const executedRef = useRef(false)

  useEffect(() => {
    if (saLoading || !isAuthenticated || !isSuperAdmin) return
    if (executedRef.current) return
    if (sessionStorage.getItem('audit_2d2b_executed') === 'true') {
      setState('error')
      setError('Audit capture already executed in this session. No retry allowed.')
      return
    }
    executedRef.current = true
    sessionStorage.setItem('audit_2d2b_executed', 'true')
    setState('loading')
    setClientBefore(new Date().toISOString())
    auditRound2D2B()
      .then(async (d) => {
        setClientAfter(new Date().toISOString())
        setHttpStatus(200)
        const js = JSON.stringify(d, null, 2)
        setJsonStr(js)
        setData(d)
        const vIssues: string[] = []
        if (!d.classification) vIssues.push('classification missing')
        if (!d.started_at || !Date.parse(d.started_at)) vIssues.push('started_at invalid')
        if (!d.finished_at || !Date.parse(d.finished_at)) vIssues.push('finished_at invalid')
        if (!Array.isArray(d.read_errors)) vIssues.push('read_errors not array')
        if (!Array.isArray(d.anomalies)) vIssues.push('anomalies not array')
        vIssues.push(...validateNoPlaceholders(js).issues)
        setIssues(vIssues)
        const h = await sha256(js)
        setHash(h)
        const h2 = await sha256(js)
        setHashVerified(h === h2)
        setState('success')
      })
      .catch((err) => {
        setClientAfter(new Date().toISOString())
        const status = err?.status ?? null
        setHttpStatus(status)
        setError(err instanceof Error ? err.message : String(err))
        setState('error')
      })
  }, [saLoading, isAuthenticated, isSuperAdmin])

  const handleDownloadJson = () => {
    downloadFile('AUDIT_PORTA_2D2B_RAW_RESPONSE.json', jsonStr, 'application/json')
  }

  const handleDownloadMd = () => {
    if (!data) return
    const md = generateCaptureMarkdown({
      environment: 'Preview',
      route: 'GET /backend/v1/integracao/ac/audit-round-2d2b',
      clientBefore,
      clientAfter,
      httpStatus: httpStatus ?? 0,
      jsonByteSize: new Blob([jsonStr]).size,
      sha256Hash: hash,
      sha256Verified: hashVerified,
      response: data,
      validationIssues: issues,
    })
    downloadFile('AUDIT_PORTA_2D2B_CAPTURE_METADATA.md', md, 'text/markdown')
  }

  if (saLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <Card className="mx-auto mt-8 max-w-2xl">
        <CardContent className="pt-6">
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertTitle>Authentication Required</AlertTitle>
            <AlertDescription>
              Please{' '}
              <Link to="/login" className="underline">
                sign in
              </Link>{' '}
              to access this page.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (!isSuperAdmin) {
    return (
      <Card className="mx-auto mt-8 max-w-2xl">
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <ShieldCheck className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>Only superadministrators can access this page.</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (state === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">
          Executing single GET call to audit endpoint...
        </p>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <Card className="mx-auto mt-8 max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-600" />
            Capture Failed — Stopped (No Retry)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription className="font-mono text-xs">{error}</AlertDescription>
          </Alert>
          {httpStatus !== null && (
            <p className="text-sm">
              <span className="text-muted-foreground">HTTP Status:</span>{' '}
              <span className="font-mono">{httpStatus}</span>
            </p>
          )}
          <p className="text-sm text-muted-foreground">Client before: {clientBefore}</p>
          <p className="text-sm text-muted-foreground">Client after: {clientAfter}</p>
          <p className="text-sm font-medium">
            Process stopped. No retry executed. No second attempt.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (state === 'success' && data) {
    const byteSize = new Blob([jsonStr]).size
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Audit Capture Complete
              </span>
              <Badge variant="default">Success</Badge>
            </CardTitle>
            <CardDescription>
              Single authenticated superadmin GET call executed. Response captured verbatim. No
              retry possible.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">HTTP Status:</span>{' '}
                <span className="font-mono">{httpStatus}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Classification:</span>{' '}
                <Badge variant="secondary">{data.classification}</Badge>
              </div>
              <div>
                <span className="text-muted-foreground">Started at:</span>{' '}
                <span className="font-mono text-xs">{data.started_at}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Finished at:</span>{' '}
                <span className="font-mono text-xs">{data.finished_at}</span>
              </div>
              <div>
                <span className="text-muted-foreground">read_errors:</span>{' '}
                <span className="font-mono">{data.read_errors.length} items</span>
              </div>
              <div>
                <span className="text-muted-foreground">anomalies:</span>{' '}
                <span className="font-mono">{data.anomalies.length} items</span>
              </div>
              <div>
                <span className="text-muted-foreground">Byte size:</span>{' '}
                <span className="font-mono">{byteSize}</span>
              </div>
              <div>
                <span className="text-muted-foreground">SHA-256:</span>{' '}
                <code className="break-all text-xs">{hash}</code>
              </div>
              <div>
                <span className="text-muted-foreground">SHA-256 verified:</span>{' '}
                {hashVerified ? (
                  <CheckCircle2 className="inline h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="inline h-4 w-4 text-red-600" />
                )}
              </div>
              <div>
                <span className="text-muted-foreground">Validation:</span>{' '}
                {issues.length === 0 ? (
                  <CheckCircle2 className="inline h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="inline h-4 w-4 text-red-600" />
                )}
              </div>
            </div>
            {issues.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Validation Issues</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-4">
                    {issues.map((i, n) => (
                      <li key={n}>{i}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleDownloadJson}>
                <FileJson className="mr-2 h-4 w-4" />
                Download RAW_RESPONSE.json
              </Button>
              <Button onClick={handleDownloadMd} variant="outline">
                <FileText className="mr-2 h-4 w-4" />
                Download CAPTURE_METADATA.md
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Raw Response Preview (first 2000 chars)</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="max-h-96 overflow-auto rounded-lg bg-muted p-4 text-xs">
              {jsonStr.substring(0, 2000)}
              {jsonStr.length > 2000
                ? '\n... (truncated for preview — full content in download)'
                : ''}
            </pre>
          </CardContent>
        </Card>
      </div>
    )
  }

  return null
}
