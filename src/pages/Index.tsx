import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { getEmpresas, getNegocios } from '@/services/commercial'
import { getEquipes, getPerfis, getPermissoes, getParametros } from '@/services/foundation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Building2,
  Briefcase,
  Users,
  ShieldCheck,
  KeyRound,
  Sliders,
  ArrowRight,
  DollarSign,
  PlusCircle,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react'
import type { RecordModel } from 'pocketbase'

export default function Index() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [empresas, setEmpresas] = useState<RecordModel[]>([])
  const [negocios, setNegocios] = useState<RecordModel[]>([])
  const [foundationCounts, setFoundationCounts] = useState({
    equipes: 0,
    perfis: 0,
    permissoes: 0,
    parametros: 0,
  })

  const loadData = useCallback(async () => {
    try {
      const [emp, neg, eq, perf, perm, param] = await Promise.all([
        getEmpresas(),
        getNegocios(),
        getEquipes(),
        getPerfis(),
        getPermissoes(),
        getParametros(),
      ])
      setEmpresas(emp)
      setNegocios(neg)
      setFoundationCounts({
        equipes: eq.length,
        perfis: perf.length,
        permissoes: perm.length,
        parametros: param.length,
      })
    } catch (err) {
      console.error('Erro ao carregar dados do dashboard:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Subscrições em tempo real para atualização instantânea
  useRealtime('com_empresas', () => {
    loadData()
  })
  useRealtime('com_negocios', () => {
    loadData()
  })

  // Cálculos de métricas comerciais
  const totalPipelineValue = negocios.reduce((acc, n) => acc + (Number(n.valor) || 0), 0)
  const activeNegocios = negocios.filter(
    (n) => n.status === 'em_andamento' || n.status === 'aberto',
  )
  const wonNegocios = negocios.filter((n) => n.status === 'ganho')

  const empresasAtivas = empresas.filter((e) => e.status === 'ativo').length
  const empresasProspectos = empresas.filter((e) => e.status === 'prospecto').length

  const formatBRL = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl space-y-8 animate-fade-in">
      {/* User Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white rounded-2xl p-6 sm:p-8 shadow-xl border border-slate-800">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge
                variant="outline"
                className="text-blue-300 border-blue-500/40 bg-blue-500/10 text-xs"
              >
                Visão Comercial
              </Badge>
              <span className="text-xs text-slate-400">PMais CRM - Fase 1</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Olá, {user?.name || 'Usuário Comercial'}! 👋
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Acompanhe os principais indicadores de Empresas e Negócios em tempo real e acesse os
              módulos da Fundação.
            </p>
          </div>
          <div className="flex gap-2.5 w-full sm:w-auto">
            <Button
              asChild
              className="bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-md"
            >
              <Link to="/foundation?tab=empresas">
                <PlusCircle className="h-4 w-4 mr-1.5" />
                Nova Empresa
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="bg-slate-800/80 hover:bg-slate-700 text-slate-100 border-slate-700"
            >
              <Link to="/foundation?tab=negocios">
                <PlusCircle className="h-4 w-4 mr-1.5" />
                Novo Negócio
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Commercial Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Empresas Card */}
        <Card className="hover:shadow-md transition-shadow border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-slate-600">Total Empresas</CardTitle>
            <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600">
              <Building2 className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-10 w-24 mb-2" />
            ) : (
              <div className="text-3xl font-bold text-slate-900">{empresas.length}</div>
            )}
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
              <span className="inline-flex items-center text-emerald-700 font-medium bg-emerald-50 px-1.5 py-0.5 rounded">
                {empresasAtivas} ativas
              </span>
              <span className="inline-flex items-center text-blue-700 font-medium bg-blue-50 px-1.5 py-0.5 rounded">
                {empresasProspectos} prospectos
              </span>
            </p>
            <div className="mt-4 pt-3 border-t border-slate-100">
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="w-full justify-between text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 h-8 text-xs font-medium"
              >
                <Link to="/foundation?tab=empresas">
                  Gerenciar Empresas
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Total Negócios Card */}
        <Card className="hover:shadow-md transition-shadow border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-slate-600">Total Negócios</CardTitle>
            <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600">
              <Briefcase className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-10 w-24 mb-2" />
            ) : (
              <div className="text-3xl font-bold text-slate-900">{negocios.length}</div>
            )}
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
              <span className="inline-flex items-center text-amber-700 font-medium bg-amber-50 px-1.5 py-0.5 rounded">
                {activeNegocios.length} no funil
              </span>
              <span className="inline-flex items-center text-emerald-700 font-medium bg-emerald-50 px-1.5 py-0.5 rounded">
                {wonNegocios.length} ganhos
              </span>
            </p>
            <div className="mt-4 pt-3 border-t border-slate-100">
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="w-full justify-between text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 px-2 h-8 text-xs font-medium"
              >
                <Link to="/foundation?tab=negocios">
                  Gerenciar Negócios
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Valor Total do Pipeline Card */}
        <Card className="hover:shadow-md transition-shadow border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-slate-600">
              Valor em Pipeline
            </CardTitle>
            <div className="p-2.5 bg-purple-50 rounded-xl text-purple-600">
              <DollarSign className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-10 w-36 mb-2" />
            ) : (
              <div className="text-3xl font-bold text-slate-900">
                {formatBRL(totalPipelineValue)}
              </div>
            )}
            <p className="text-xs text-slate-500 mt-1">Soma acumulada de todas as oportunidades</p>
            <div className="mt-4 pt-3 border-t border-slate-100">
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="w-full justify-between text-purple-600 hover:text-purple-700 hover:bg-purple-50 px-2 h-8 text-xs font-medium"
              >
                <Link to="/foundation?tab=negocios">
                  Analisar Funil
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Hub: Administrative & Commercial Modules */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Hub de Navegação dos Módulos
            </h2>
            <p className="text-xs text-slate-500">
              Acesso rápido às áreas comerciais e administrativas da Fundação
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="text-xs">
            <Link to="/foundation">Ver Módulo Fundação Completo</Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Module Card: Equipes */}
          <Card className="hover:border-slate-300 transition-all hover:shadow-sm">
            <CardHeader className="pb-2 flex flex-row items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-amber-500" />
                  Equipes
                </CardTitle>
                <CardDescription className="text-xs">Estrutura de times e comitês</CardDescription>
              </div>
              <Badge variant="secondary" className="text-xs font-semibold">
                {loading ? <Skeleton className="h-3 w-4" /> : foundationCounts.equipes}
              </Badge>
            </CardHeader>
            <CardContent className="pt-2">
              <Button asChild variant="outline" size="sm" className="w-full text-xs h-8">
                <Link to="/foundation?tab=equipes">Acessar Equipes</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Module Card: Perfis */}
          <Card className="hover:border-slate-300 transition-all hover:shadow-sm">
            <CardHeader className="pb-2 flex flex-row items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-indigo-500" />
                  Perfis
                </CardTitle>
                <CardDescription className="text-xs">Perfis e papéis de usuário</CardDescription>
              </div>
              <Badge variant="secondary" className="text-xs font-semibold">
                {loading ? <Skeleton className="h-3 w-4" /> : foundationCounts.perfis}
              </Badge>
            </CardHeader>
            <CardContent className="pt-2">
              <Button asChild variant="outline" size="sm" className="w-full text-xs h-8">
                <Link to="/foundation?tab=perfis">Acessar Perfis</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Module Card: Permissões */}
          <Card className="hover:border-slate-300 transition-all hover:shadow-sm">
            <CardHeader className="pb-2 flex flex-row items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-base flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-rose-500" />
                  Permissões
                </CardTitle>
                <CardDescription className="text-xs">
                  Matriz de privilégios e escopos
                </CardDescription>
              </div>
              <Badge variant="secondary" className="text-xs font-semibold">
                {loading ? <Skeleton className="h-3 w-4" /> : foundationCounts.permissoes}
              </Badge>
            </CardHeader>
            <CardContent className="pt-2">
              <Button asChild variant="outline" size="sm" className="w-full text-xs h-8">
                <Link to="/foundation?tab=permissoes">Acessar Permissões</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Module Card: Parâmetros */}
          <Card className="hover:border-slate-300 transition-all hover:shadow-sm">
            <CardHeader className="pb-2 flex flex-row items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-cyan-500" />
                  Parâmetros
                </CardTitle>
                <CardDescription className="text-xs">Configurações globais</CardDescription>
              </div>
              <Badge variant="secondary" className="text-xs font-semibold">
                {loading ? <Skeleton className="h-3 w-4" /> : foundationCounts.parametros}
              </Badge>
            </CardHeader>
            <CardContent className="pt-2">
              <Button asChild variant="outline" size="sm" className="w-full text-xs h-8">
                <Link to="/foundation?tab=parametros">Acessar Parâmetros</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Module Card: Empresas */}
          <Card className="hover:border-slate-300 transition-all hover:shadow-sm bg-blue-50/40 border-blue-100">
            <CardHeader className="pb-2 flex flex-row items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-base flex items-center gap-2 text-blue-950">
                  <Building2 className="h-4 w-4 text-blue-600" />
                  Empresas
                </CardTitle>
                <CardDescription className="text-xs">
                  Cadastro e carteira de empresas
                </CardDescription>
              </div>
              <Badge className="bg-blue-600 hover:bg-blue-600 text-xs font-semibold">
                {loading ? <Skeleton className="h-3 w-4" /> : empresas.length}
              </Badge>
            </CardHeader>
            <CardContent className="pt-2">
              <Button
                asChild
                size="sm"
                className="w-full text-xs h-8 bg-blue-600 hover:bg-blue-700"
              >
                <Link to="/foundation?tab=empresas">Gerenciar Empresas</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Module Card: Negócios */}
          <Card className="hover:border-slate-300 transition-all hover:shadow-sm bg-emerald-50/40 border-emerald-100">
            <CardHeader className="pb-2 flex flex-row items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-base flex items-center gap-2 text-emerald-950">
                  <Briefcase className="h-4 w-4 text-emerald-600" />
                  Negócios
                </CardTitle>
                <CardDescription className="text-xs">Funil e oportunidades ativas</CardDescription>
              </div>
              <Badge className="bg-emerald-600 hover:bg-emerald-600 text-xs font-semibold">
                {loading ? <Skeleton className="h-3 w-4" /> : negocios.length}
              </Badge>
            </CardHeader>
            <CardContent className="pt-2">
              <Button
                asChild
                size="sm"
                className="w-full text-xs h-8 bg-emerald-600 hover:bg-emerald-700"
              >
                <Link to="/foundation?tab=negocios">Gerenciar Negócios</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Negócios Preview */}
      <Card className="border-slate-200">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base font-bold text-slate-900">Negócios Recentes</CardTitle>
            <CardDescription className="text-xs">
              Oportunidades mais recentes registradas no sistema
            </CardDescription>
          </div>
          <Button asChild variant="outline" size="sm" className="text-xs h-8">
            <Link to="/foundation?tab=negocios">Ver Todos</Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : negocios.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              Nenhum negócio cadastrado ainda.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80">
                    <TableHead className="text-xs font-semibold">Título</TableHead>
                    <TableHead className="text-xs font-semibold">Empresa</TableHead>
                    <TableHead className="text-xs font-semibold">Valor</TableHead>
                    <TableHead className="text-xs font-semibold">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {negocios.slice(0, 5).map((n) => (
                    <TableRow key={n.id} className="hover:bg-slate-50/50 text-xs">
                      <TableCell className="font-medium text-slate-900">{n.titulo}</TableCell>
                      <TableCell className="text-slate-600">
                        {n.expand?.empresa_id?.nome || '-'}
                      </TableCell>
                      <TableCell className="font-semibold text-slate-800">
                        {formatBRL(Number(n.valor) || 0)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={n.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'ganho':
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100/80 border border-emerald-200 px-2 py-0.5 rounded-full">
          <CheckCircle2 className="h-3 w-3" /> Ganho
        </span>
      )
    case 'em_andamento':
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-100/80 border border-blue-200 px-2 py-0.5 rounded-full">
          <Clock className="h-3 w-3" /> Em Andamento
        </span>
      )
    case 'aberto':
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-100/80 border border-amber-200 px-2 py-0.5 rounded-full">
          <AlertCircle className="h-3 w-3" /> Aberto
        </span>
      )
    case 'perdido':
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-100/80 border border-rose-200 px-2 py-0.5 rounded-full">
          Perdido
        </span>
      )
    default:
      return <span className="text-[11px] text-slate-500">{status}</span>
  }
}
