import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  ShieldCheck,
  Play,
  RefreshCw,
  Lock,
  CheckCircle,
  XCircle,
  KeyRound,
  FileLock2,
  AlertTriangle,
} from 'lucide-react'
import {
  integracaoPrecheck,
  integracaoBootstrap,
  integracaoTests,
  type IntegracaoPrecheckResult,
  type IntegracaoBootstrapResult,
  type IntegracaoTestsResult,
} from '@/services/integracao'
import { toast } from 'sonner'

const PassFail = ({ pass }: { pass: boolean }) => (
  <Badge className={pass ? 'bg-green-600 hover:bg-green-600' : 'bg-red-600 hover:bg-red-600'}>
    {pass ? (
      <>
        <CheckCircle className="h-3 w-3 mr-1" />
        PASS
      </>
    ) : (
      <>
        <XCircle className="h-3 w-3 mr-1" />
        FAIL
      </>
    )}
  </Badge>
)

const GuardEntry = ({ name, entries }: { name: string; entries: string }) => (
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-sm font-mono">{name}</CardTitle>
    </CardHeader>
    <CardContent>
      <pre className="text-xs bg-muted p-3 rounded-md overflow-auto whitespace-pre-wrap">
        {entries}
      </pre>
    </CardContent>
  </Card>
)

export default function Integracao() {
  const [loading, setLoading] = useState<string | null>(null)
  const [precheck, setPrecheck] = useState<IntegracaoPrecheckResult | null>(null)
  const [boot1, setBoot1] = useState<IntegracaoBootstrapResult | null>(null)
  const [boot2, setBoot2] = useState<IntegracaoBootstrapResult | null>(null)
  const [tests, setTests] = useState<IntegracaoTestsResult | null>(null)

  const runPrecheck = async () => {
    setLoading('precheck')
    try {
      const r = await integracaoPrecheck()
      setPrecheck(r)
      toast.success('Pre-check executado')
    } catch {
      toast.error('Erro no pre-check')
    } finally {
      setLoading(null)
    }
  }
  const runBoot = async (n: number) => {
    setLoading(`boot-${n}`)
    try {
      const r = await integracaoBootstrap()
      if (n === 1) setBoot1(r)
      else setBoot2(r)
      toast.success(`Bootstrap ${n} concluído`)
    } catch {
      toast.error(`Erro no bootstrap ${n}`)
    } finally {
      setLoading(null)
    }
  }
  const runTests = async () => {
    setLoading('tests')
    try {
      const r = await integracaoTests()
      setTests(r)
      toast.success(`${r.summary.passed}/${r.summary.total} testes passaram`)
    } catch {
      toast.error('Erro nos testes')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="container mx-auto p-4 space-y-4 max-w-6xl">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Porta 2C — Validação de Integração</h1>
          <p className="text-sm text-muted-foreground">
            Bootstrap controlado, testes HTTP reais e auditoria de guards
          </p>
        </div>
      </div>
      <Alert>
        <KeyRound className="h-4 w-4" />
        <AlertTitle>Code Freeze Ativo</AlertTitle>
        <AlertDescription>
          Migrations, guards, hooks, regras, schema e dados estão congelados. Porta 2D bloqueada.
        </AlertDescription>
      </Alert>
      <Tabs defaultValue="precheck">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="precheck">1. Pre-check</TabsTrigger>
          <TabsTrigger value="bootstrap">2. Bootstrap</TabsTrigger>
          <TabsTrigger value="tests">3. Testes HTTP</TabsTrigger>
          <TabsTrigger value="audit">4. Auditoria de Guards</TabsTrigger>
        </TabsList>
        <TabsContent value="precheck" className="space-y-4">
          <Button onClick={runPrecheck} disabled={loading === 'precheck'}>
            <Play className="h-4 w-4 mr-2" />
            {loading === 'precheck' ? 'Executando...' : 'Executar Pre-check'}
          </Button>
          {precheck && (
            <div className="space-y-3">
              {precheck.error && (
                <Alert variant="destructive">
                  <AlertTitle>Erro</AlertTitle>
                  <AlertDescription>{precheck.error}</AlertDescription>
                </Alert>
              )}
              {!precheck.error && precheck.integracaoProfile && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Perfil Integração</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p>
                      ID:{' '}
                      <code className="bg-muted px-1 rounded">
                        {precheck.integracaoProfile.id.slice(0, 8)}...
                      </code>
                    </p>
                    <p>
                      Ativo:{' '}
                      <Badge variant={precheck.integracaoProfile.ativo ? 'default' : 'destructive'}>
                        {precheck.integracaoProfile.ativo ? 'Sim' : 'Não'}
                      </Badge>
                    </p>
                    <p>
                      Secret: <code>{precheck.secretName}</code> —{' '}
                      <Badge
                        variant={precheck.secretRegistered ? 'default' : 'destructive'}
                        className={precheck.secretRegistered ? 'bg-green-600' : ''}
                      >
                        {precheck.secretRegistered ? 'Registrada' : 'AUSENTE'}
                      </Badge>
                    </p>
                  </CardContent>
                </Card>
              )}
              {precheck.expectedPermissionMatrix && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Matriz de Permissões ({precheck.expectedPermissionMatrix.length} slugs)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1">
                      {precheck.expectedPermissionMatrix.map((s) => (
                        <Badge key={s} variant="outline" className="text-xs">
                          {s}
                        </Badge>
                      ))}
                    </div>
                    {precheck.exceedingPermissionsRemoved &&
                      precheck.exceedingPermissionsRemoved.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-semibold text-red-600">Removidas:</p>
                          {precheck.exceedingPermissionsRemoved.map((s) => (
                            <Badge key={s} variant="destructive" className="text-xs mr-1">
                              {s}
                            </Badge>
                          ))}
                        </div>
                      )}
                    {precheck.missingPermissions && precheck.missingPermissions.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-semibold text-orange-600">Faltantes:</p>
                        {precheck.missingPermissions.map((s) => (
                          <Badge key={s} className="text-xs mr-1 bg-orange-500">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
              {precheck.priorAccount && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Conta Técnica</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-1">
                    <p>Nome: {precheck.priorAccount.name}</p>
                    <p>
                      ID:{' '}
                      <code className="bg-muted px-1 rounded">
                        {precheck.priorAccount.id.slice(0, 8)}...
                      </code>
                    </p>
                    <p>
                      Ativo comercial:{' '}
                      <Badge
                        variant={precheck.priorAccount.ativo_comercial ? 'default' : 'destructive'}
                      >
                        {precheck.priorAccount.ativo_comercial ? 'Sim' : 'Não'}
                      </Badge>
                    </p>
                  </CardContent>
                </Card>
              )}
              {precheck.duplicateAccounts && (
                <Alert
                  variant={precheck.duplicateAccounts.length === 0 ? 'default' : 'destructive'}
                >
                  <AlertTitle>Duplicatas</AlertTitle>
                  <AlertDescription>
                    {precheck.duplicateAccounts.length} conta(s) duplicada(s)
                  </AlertDescription>
                </Alert>
              )}
              {precheck.spokUser && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Spok</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <p>
                      Perfil: <Badge variant="outline">{precheck.spokUser.perfil}</Badge>
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>
        <TabsContent value="bootstrap" className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={() => runBoot(1)} disabled={loading === 'boot-1'}>
              <Play className="h-4 w-4 mr-2" />
              {loading === 'boot-1' ? 'Executando...' : 'Bootstrap #1'}
            </Button>
            <Button
              onClick={() => runBoot(2)}
              disabled={loading === 'boot-2' || !boot1}
              variant="outline"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {loading === 'boot-2' ? 'Executando...' : 'Bootstrap #2 (Idempotência)'}
            </Button>
          </div>
          {boot1 && boot2 && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Idempotência</AlertTitle>
              <AlertDescription>
                Execução 1: {boot1.status} | Execução 2: {boot2.status}
                {boot1.account &&
                  boot2.account &&
                  boot1.account.id === boot2.account.id &&
                  ' — Mesma conta (ID idêntico) ✓'}
              </AlertDescription>
            </Alert>
          )}
          {[
            boot1 && { label: 'Execução 1', data: boot1 },
            boot2 && { label: 'Execução 2', data: boot2 },
          ]
            .filter(Boolean)
            .map(({ label, data }: any) => (
              <Card key={label}>
                <CardHeader>
                  <CardTitle className="text-base">
                    {label}: {data.status}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  {data.account && (
                    <>
                      <p>Conta: {data.account.name}</p>
                      <p>
                        ID:{' '}
                        <code className="bg-muted px-1 rounded">
                          {data.account.id.slice(0, 8)}...
                        </code>
                      </p>
                      <p>
                        Perfil: <Badge variant="outline">{data.account.perfil}</Badge>
                      </p>
                      <p>
                        Ativo:{' '}
                        <Badge variant={data.account.ativo_comercial ? 'default' : 'destructive'}>
                          {data.account.ativo_comercial ? 'Sim' : 'Não'}
                        </Badge>
                      </p>
                    </>
                  )}
                  {data.otherIntegracaoUsers && data.otherIntegracaoUsers.length > 0 && (
                    <Alert variant="destructive" className="mt-2">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        {data.otherIntegracaoUsers.length} outra(s) conta(s) com perfil integracao
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            ))}
        </TabsContent>
        <TabsContent value="tests" className="space-y-4">
          <Button onClick={runTests} disabled={loading === 'tests'}>
            <Play className="h-4 w-4 mr-2" />
            {loading === 'tests' ? 'Executando...' : 'Executar Testes HTTP'}
          </Button>
          {tests && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card>
                  <CardContent className="pt-4 text-center">
                    <p className="text-2xl font-bold text-green-600">{tests.summary.passed}</p>
                    <p className="text-xs text-muted-foreground">Passaram</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <p className="text-2xl font-bold text-red-600">{tests.summary.failed}</p>
                    <p className="text-xs text-muted-foreground">Falharam</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <p className="text-2xl font-bold">{tests.summary.total}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <PassFail pass={tests.summary.allPassed} />
                  </CardContent>
                </Card>
              </div>
              {tests.authentication && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Autenticação</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <p>
                      HTTP:{' '}
                      <Badge
                        variant={tests.authentication.success ? 'default' : 'destructive'}
                        className={tests.authentication.success ? 'bg-green-600' : ''}
                      >
                        {tests.authentication.httpStatus}
                      </Badge>
                    </p>
                    <p>
                      Perfil: <Badge variant="outline">{tests.authentication.profileSlug}</Badge>
                    </p>
                    <p>
                      Account ID:{' '}
                      <code className="bg-muted px-1 rounded">
                        {tests.authentication.accountId.slice(0, 8)}...
                      </code>
                    </p>
                  </CardContent>
                </Card>
              )}
              {tests.spok && 'found' in tests.spok ? (
                <Alert>
                  <AlertTitle>Spok</AlertTitle>
                  <AlertDescription>Não encontrado</AlertDescription>
                </Alert>
              ) : (
                tests.spok && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Spok</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm">
                      <p>
                        Perfil: <Badge variant="outline">{(tests.spok as any).perfil}</Badge>
                      </p>
                      <PassFail pass={!(tests.spok as any).isIntegracao} />
                    </CardContent>
                  </Card>
                )
              )}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Matriz de Testes</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Teste</TableHead>
                        <TableHead>Esperado</TableHead>
                        <TableHead>Real</TableHead>
                        <TableHead className="text-right">Resultado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tests.tests.map((t, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono text-xs">{t.test}</TableCell>
                          <TableCell className="text-xs">{String(t.expected)}</TableCell>
                          <TableCell className="text-xs">{String(t.actual)}</TableCell>
                          <TableCell className="text-right">
                            <PassFail pass={t.pass} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              <Alert variant="destructive">
                <Lock className="h-4 w-4" />
                <AlertTitle>Porta 2D</AlertTitle>
                <AlertDescription>{tests.porta2D}</AlertDescription>
              </Alert>
            </div>
          )}
        </TabsContent>
        <TabsContent value="audit" className="space-y-3">
          <Alert>
            <FileLock2 className="h-4 w-4" />
            <AlertTitle>Auditoria Read-Only</AlertTitle>
            <AlertDescription>
              Diff literal dos quatro guards — para auditoria apenas. Nenhuma modificação.
            </AlertDescription>
          </Alert>
          <GuardEntry
            name="guard_create.js — permMap"
            entries={`com_negocio_historico: ['negocios.update']  ← ADICIONADO
com_contatos: ['contatos.create']
com_etapas: ['etapas.create']
com_alias_dimensoes: ['alias_dimensoes.create']
com_vinculos_externos: ['vinculos_externos.create']
com_execucoes_sincronizacao: ['execucoes_sincronizacao.create']
com_eventos_integracao: ['eventos_integracao.create']
com_snapshots_negocio: ['snapshots_negocio.create']
com_ocorrencias_qualidade: ['ocorrencias_qualidade.create']`}
          />
          <GuardEntry
            name="guard_update.js — permMap"
            entries={`com_contatos: ['contatos.update']
com_etapas: ['etapas.update']
com_alias_dimensoes: ['alias_dimensoes.update']
com_vinculos_externos: ['vinculos_externos.update']
com_execucoes_sincronizacao: ['execucoes_sincronizacao.update']
com_eventos_integracao: ['eventos_integracao.update']
com_ocorrencias_qualidade: ['ocorrencias_qualidade.update']

// com_negocio_historico AUSENTE (updateRule = null)
// com_snapshots_negocio AUSENTE (updateRule = null)`}
          />
          <GuardEntry
            name="guard_list.js — permMap"
            entries={`com_negocio_historico: ['negocios.view']  ← ADICIONADO
com_contatos: ['contatos.view']
com_etapas: ['etapas.view']
com_alias_dimensoes: ['alias_dimensoes.view']
com_vinculos_externos: ['vinculos_externos.view']
com_execucoes_sincronizacao: ['execucoes_sincronizacao.view']
com_eventos_integracao: ['eventos_integracao.view']
com_snapshots_negocio: ['snapshots_negocio.view']
com_ocorrencias_qualidade: ['ocorrencias_qualidade.view']`}
          />
          <GuardEntry
            name="guard_view.js — permMap"
            entries={`com_negocio_historico: ['negocios.view']  ← ADICIONADO
com_contatos: ['contatos.view']
com_etapas: ['etapas.view']
com_alias_dimensoes: ['alias_dimensoes.view']
com_vinculos_externos: ['vinculos_externos.view']
com_execucoes_sincronizacao: ['execucoes_sincronizacao.view']
com_eventos_integracao: ['eventos_integracao.view']
com_snapshots_negocio: ['snapshots_negocio.view']
com_ocorrencias_qualidade: ['ocorrencias_qualidade.view']`}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
