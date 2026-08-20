import { useState, type FormEvent } from 'react'
import {
  AlertCircle,
  BriefcaseBusiness,
  CircleDollarSign,
  ListChecks,
  RefreshCw,
  ShieldCheck,
  Target,
  Trophy,
  UserCheck,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useDashboardResumo } from '@/hooks/use-dashboard'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'

const RECIFE_TIME_ZONE = 'America/Recife'

function configuredDefaultPeriodDays(): number {
  const configured = Number(import.meta.env.VITE_DASHBOARD_DEFAULT_PERIOD_DAYS ?? 90)
  return Number.isInteger(configured) && configured > 0 && configured <= 366 ? configured : 90
}

function civilDateInRecife(reference: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: RECIFE_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(reference)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

function shiftCivilDate(value: string, days: number): string {
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day + days))
  return date.toISOString().slice(0, 10)
}

export function createDefaultDashboardPeriod(reference = new Date()): {
  inicio: string
  fim: string
} {
  const fim = civilDateInRecife(reference)
  return {
    inicio: shiftCivilDate(fim, -(configuredDefaultPeriodDays() - 1)),
    fim,
  }
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value / 100)
}

function formatPercent(value: number | null): string {
  if (value === null) return 'N/D'
  return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value)}%`
}

interface MetricCardProps {
  title: string
  value: string
  detail: string
  icon: typeof BriefcaseBusiness
}

function MetricCard({ title, value, detail, icon: Icon }: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-600">{title}</CardTitle>
        <Icon className="h-4 w-4 text-blue-700" aria-hidden="true" />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold tracking-tight text-slate-950">{value}</p>
        <p className="mt-1 text-xs text-slate-500">{detail}</p>
      </CardContent>
    </Card>
  )
}

interface DetailItem {
  label: string
  value: string
}

interface DetailCardProps {
  title: string
  description: string
  items: DetailItem[]
  icon: typeof BriefcaseBusiness
}

function DetailCard({ title, description, items, icon: Icon }: DetailCardProps) {
  return (
    <Card aria-label={title}>
      <CardHeader className="space-y-1 pb-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-blue-700" aria-hidden="true" />
          <CardTitle className="text-base text-slate-900">{title}</CardTitle>
        </div>
        <p className="text-xs text-slate-500">{description}</p>
      </CardHeader>
      <CardContent>
        <dl className="divide-y divide-slate-100">
          {items.map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-4 py-2.5">
              <dt className="text-sm text-slate-600">{item.label}</dt>
              <dd className="text-sm font-semibold text-slate-950">{item.value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}

function DashboardSkeleton() {
  return (
    <div
      aria-label="Carregando indicadores"
      className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
    >
      {Array.from({ length: 6 }, (_, index) => (
        <Card key={index}>
          <CardHeader>
            <Skeleton className="h-4 w-36" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-3 w-44" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default function Index() {
  const { user } = useAuth()
  const [draftPeriod, setDraftPeriod] = useState(createDefaultDashboardPeriod)
  const [period, setPeriod] = useState(draftPeriod)
  const { data, loading, error, refresh } = useDashboardResumo(period)

  function applyPeriod(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draftPeriod.inicio || !draftPeriod.fim || draftPeriod.inicio > draftPeriod.fim) return
    setPeriod(draftPeriod)
  }

  const resumo = data?.resumo

  return (
    <main className="container mx-auto max-w-7xl space-y-6 px-4 py-8 animate-fade-in">
      <section className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 p-6 text-white shadow-xl sm:p-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              <Badge variant="outline" className="border-blue-400/40 bg-blue-400/10 text-blue-200">
                Dashboard V1
              </Badge>
              {data?.escopo && (
                <Badge
                  variant="outline"
                  className="border-slate-400/40 bg-slate-400/10 text-slate-200"
                >
                  Escopo: {data.escopo}
                </Badge>
              )}
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              Visão comercial de {user?.name || 'Usuário'}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Indicadores do modelo canônico PMais, com datas civis de Recife e valores em reais.
            </p>
          </div>

          <form
            onSubmit={applyPeriod}
            className="grid gap-3 rounded-xl border border-white/10 bg-white/5 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
          >
            <div className="space-y-1.5">
              <Label htmlFor="dashboard-inicio" className="text-xs text-slate-200">
                Início
              </Label>
              <Input
                id="dashboard-inicio"
                type="date"
                value={draftPeriod.inicio}
                max={draftPeriod.fim}
                onChange={(event) =>
                  setDraftPeriod((current) => ({ ...current, inicio: event.target.value }))
                }
                className="border-white/20 bg-slate-950/60 text-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dashboard-fim" className="text-xs text-slate-200">
                Fim
              </Label>
              <Input
                id="dashboard-fim"
                type="date"
                value={draftPeriod.fim}
                min={draftPeriod.inicio}
                onChange={(event) =>
                  setDraftPeriod((current) => ({ ...current, fim: event.target.value }))
                }
                className="border-white/20 bg-slate-950/60 text-white"
              />
            </div>
            <Button type="submit" disabled={loading || draftPeriod.inicio > draftPeriod.fim}>
              Aplicar período
            </Button>
          </form>
        </div>
      </section>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Não foi possível carregar o dashboard</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>{error}</span>
            <Button type="button" variant="outline" size="sm" onClick={refresh}>
              <RefreshCw className="mr-2 h-4 w-4" /> Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {loading && !resumo ? (
        <DashboardSkeleton />
      ) : resumo ? (
        <section
          aria-label="Indicadores comerciais"
          className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
        >
          <MetricCard
            title="Negócios no período"
            value={String(resumo.total)}
            detail={`${resumo.situacao.abertos} abertos`}
            icon={BriefcaseBusiness}
          />
          <MetricCard
            title="Carteira aberta"
            value={formatCurrency(resumo.valores.carteira_aberta_centavos)}
            detail={`${resumo.valores.negocios_precificados} negócios precificados`}
            icon={Target}
          />
          <MetricCard
            title="Negócios ganhos"
            value={String(resumo.situacao.ganhos)}
            detail={formatCurrency(resumo.valores.ganho_centavos)}
            icon={Trophy}
          />
          <MetricCard
            title="Conversão global"
            value={formatPercent(resumo.conversoes.global_percentual)}
            detail="Ganhos sobre decisões registradas"
            icon={Target}
          />
          <MetricCard
            title="Taxa de qualificação"
            value={formatPercent(resumo.conversoes.qualificacao_percentual)}
            detail={`${resumo.qualificacao.qualificadas} qualificados`}
            icon={UserCheck}
          />
          <MetricCard
            title="Cobertura de responsável"
            value={formatPercent(resumo.cobertura.responsavel.percentual)}
            detail={`${resumo.cobertura.responsavel.preenchidos} de ${resumo.cobertura.responsavel.total} negócios`}
            icon={UserCheck}
          />
        </section>
      ) : null}

      {resumo ? (
        <section aria-labelledby="dashboard-details-title" className="space-y-4">
          <div>
            <h2 id="dashboard-details-title" className="text-lg font-bold text-slate-950">
              Detalhamento comercial
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Composição, valores e qualidade cadastral do período selecionado.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <DetailCard
              title="Composição dos negócios"
              description="Distribuição pelo resultado canônico atual."
              icon={BriefcaseBusiness}
              items={[
                { label: 'Abertos', value: String(resumo.situacao.abertos) },
                { label: 'Ganhos', value: String(resumo.situacao.ganhos) },
                { label: 'Perdidos', value: String(resumo.situacao.perdidos) },
                { label: 'Desqualificados', value: String(resumo.situacao.desqualificados) },
              ]}
            />
            <DetailCard
              title="Qualificação"
              description="Situação das decisões de qualificação registradas."
              icon={ListChecks}
              items={[
                { label: 'Pendentes', value: String(resumo.qualificacao.pendentes) },
                { label: 'Qualificadas', value: String(resumo.qualificacao.qualificadas) },
                { label: 'Desqualificadas', value: String(resumo.qualificacao.desqualificadas) },
              ]}
            />
            <DetailCard
              title="Valores e tickets"
              description="Valores monetários comprovados, apresentados em reais."
              icon={CircleDollarSign}
              items={[
                {
                  label: 'Total precificado',
                  value: formatCurrency(resumo.valores.total_precificado_centavos),
                },
                {
                  label: 'Valor perdido',
                  value: formatCurrency(resumo.valores.perdido_centavos),
                },
                {
                  label: 'Ticket médio precificado',
                  value:
                    resumo.valores.ticket_medio_precificado_centavos === null
                      ? 'N/D'
                      : formatCurrency(resumo.valores.ticket_medio_precificado_centavos),
                },
                {
                  label: 'Ticket médio ganho',
                  value:
                    resumo.valores.ticket_medio_ganho_centavos === null
                      ? 'N/D'
                      : formatCurrency(resumo.valores.ticket_medio_ganho_centavos),
                },
              ]}
            />
            <DetailCard
              title="Qualidade dos dados"
              description="Cobertura e exceções relevantes do cadastro comercial."
              icon={ShieldCheck}
              items={[
                {
                  label: 'Cobertura de origem',
                  value: formatPercent(resumo.cobertura.origem.percentual),
                },
                {
                  label: 'Origem preenchida',
                  value: `${resumo.cobertura.origem.preenchidos} de ${resumo.cobertura.origem.total}`,
                },
                {
                  label: 'Negócios com valor zero',
                  value: String(resumo.valores.negocios_valor_zero),
                },
                {
                  label: 'Marcadores de um centavo',
                  value: String(resumo.valores.negocios_marcador_um_centavo),
                },
              ]}
            />
          </div>
        </section>
      ) : null}

      {data?.avisos?.length ? (
        <section
          aria-label="Observações dos indicadores"
          className="rounded-xl border bg-slate-50 p-4"
        >
          <h2 className="text-sm font-semibold text-slate-800">Observações do contrato</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-600">
            {data.avisos.map((aviso) => (
              <li key={aviso}>{aviso}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  )
}
