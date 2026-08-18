import { useParams, useLocation, Link } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { ArrowLeft, FileX } from 'lucide-react'

import { useSubstituicaoView } from '@/hooks/use-substituicoes'
import type { SubstituicaoView } from '@/services/substituicoes'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

// ─────────────────────────────────────────────────────────────────────
// Validações
// ─────────────────────────────────────────────────────────────────────

const ID_REGEX = /^[a-z0-9]{15}$/

function validarReturnTo(raw: unknown): string {
  if (typeof raw !== 'string') return '/substituicoes'
  if (raw === '/substituicoes') return raw
  if (raw.startsWith('/substituicoes?')) return raw
  return '/substituicoes'
}

function formatarData(str: string): string {
  try {
    return format(parseISO(str), 'dd/MM/yyyy')
  } catch {
    return str
  }
}

function formatarDataHora(str: string): string {
  try {
    return format(parseISO(str), 'dd/MM/yyyy HH:mm')
  } catch {
    return str
  }
}

// ─────────────────────────────────────────────────────────────────────
// Badges (mesmos do item 1)
// ─────────────────────────────────────────────────────────────────────

function SituacaoBadge({ situacao }: { situacao: SubstituicaoView['situacao'] }) {
  switch (situacao) {
    case 'vigente':
      return <Badge variant="default">Vigente</Badge>
    case 'futura':
      return <Badge variant="secondary">Futura</Badge>
    case 'encerrada':
      return <Badge variant="outline">Encerrada</Badge>
    case 'cancelada':
      return <Badge variant="destructive">Cancelada</Badge>
    default:
      return <Badge variant="outline">{situacao}</Badge>
  }
}

function TipoCoberturaBadge({ tipo }: { tipo: SubstituicaoView['tipo_cobertura'] }) {
  switch (tipo) {
    case 'integral':
      return <Badge variant="secondary">Integral</Badge>
    case 'por_negocios':
      return <Badge variant="default">Por Negócios</Badge>
    default:
      return <Badge variant="outline">{tipo}</Badge>
  }
}

function MotivoBadge({ motivo }: { motivo: SubstituicaoView['motivo'] }) {
  switch (motivo) {
    case 'ferias':
      return <Badge variant="secondary">Férias</Badge>
    case 'licenca':
      return <Badge variant="outline">Licença</Badge>
    case 'falta':
      return <Badge variant="destructive">Falta</Badge>
    default:
      return <Badge variant="outline">{motivo}</Badge>
  }
}

// ─────────────────────────────────────────────────────────────────────
// Página
// ─────────────────────────────────────────────────────────────────────

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</dt>
      <dd className="text-sm text-foreground">{children}</dd>
    </div>
  )
}

export default function SubstituicaoDetalhe() {
  const { id: rawId } = useParams<{ id: string }>()
  const location = useLocation()

  const idValido = rawId ? ID_REGEX.test(rawId) : false
  const id = idValido ? rawId : undefined

  const returnTo = validarReturnTo((location.state as any)?.returnTo)

  const { data, loading, error, notFound, refresh } = useSubstituicaoView(id)

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl space-y-6">
      <Link to={returnTo}>
        <Button variant="ghost" size="sm" className="gap-1.5">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
      </Link>

      {/* Loading */}
      {loading && (
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-[240px]" />
            <Skeleton className="h-4 w-[180px]" />
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      )}

      {/* notFound */}
      {!loading && notFound && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <FileX className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Substituição não encontrada.</p>
            <Link to={returnTo}>
              <Button variant="outline" size="sm">
                Voltar para lista
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Erro */}
      {!loading && !notFound && error && (
        <Alert variant="destructive">
          <AlertTitle>Erro ao carregar</AlertTitle>
          <AlertDescription>
            Não foi possível carregar os dados. Verifique sua conexão e tente novamente.
          </AlertDescription>
          <div className="mt-3 flex gap-2">
            <Button variant="outline" size="sm" onClick={refresh}>
              Tentar novamente
            </Button>
            <Link to={returnTo}>
              <Button variant="ghost" size="sm">
                Voltar
              </Button>
            </Link>
          </div>
        </Alert>
      )}

      {/* Dados */}
      {!loading && !notFound && !error && data && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <CardTitle className="text-xl">{data.titular?.name ?? '—'}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {formatarData(data.data_inicio)} – {formatarData(data.data_fim)}
                </p>
              </div>
              <SituacaoBadge situacao={data.situacao} />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Dados Gerais */}
            <section>
              <h2 className="text-sm font-semibold mb-3">Dados Gerais</h2>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Campo label="Titular">{data.titular?.name ?? '—'}</Campo>
                <Campo label="Substituto Principal">{data.substituto_principal?.name ?? '—'}</Campo>
                <Campo label="Data Início">{formatarData(data.data_inicio)}</Campo>
                <Campo label="Data Fim">{formatarData(data.data_fim)}</Campo>
                <Campo label="Tipo de Cobertura">
                  <TipoCoberturaBadge tipo={data.tipo_cobertura} />
                </Campo>
                <Campo label="Motivo">
                  <MotivoBadge motivo={data.motivo} />
                </Campo>
              </dl>
            </section>

            {/* Observação */}
            {data.observacao && (
              <section>
                <h2 className="text-sm font-semibold mb-2">Observação</h2>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {data.observacao}
                </p>
              </section>
            )}

            {/* Cobertura por negócios */}
            {data.tipo_cobertura === 'por_negocios' && (
              <section>
                <h2 className="text-sm font-semibold mb-2">Negócios Vinculados</h2>
                {data.negocios_cobertos && data.negocios_cobertos.length > 0 ? (
                  <ul className="space-y-1">
                    {data.negocios_cobertos.map((n) => (
                      <li key={n.id} className="text-sm text-foreground flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                        {n.titulo}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum negócio vinculado.</p>
                )}
              </section>
            )}

            {/* Cancelamento */}
            {data.situacao === 'cancelada' && (
              <section>
                <h2 className="text-sm font-semibold mb-2">Cancelamento</h2>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Campo label="Data de Cancelamento">
                    {data.cancelada_em ? formatarDataHora(data.cancelada_em) : '—'}
                  </Campo>
                  {data.justificativa_cancelamento && (
                    <Campo label="Justificativa">{data.justificativa_cancelamento}</Campo>
                  )}
                </dl>
              </section>
            )}

            {/* Metadados */}
            <section className="border-t pt-4">
              <h2 className="text-sm font-semibold mb-3">Metadados</h2>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Campo label="Criado em">{formatarDataHora(data.created)}</Campo>
                <Campo label="Atualizado em">{formatarDataHora(data.updated)}</Campo>
              </dl>
            </section>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
