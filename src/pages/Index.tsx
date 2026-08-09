import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { getEmpresas, getNegocios } from '@/services/commercial'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Building2,
  Briefcase,
  DollarSign,
  PlusCircle,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react'
import type { RecordModel } from 'pocketbase'

export default function Index() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [empresas, setEmpresas] = useState<RecordModel[]>([])
  const [negocios, setNegocios] = useState<RecordModel[]>([])

  const loadData = useCallback(async () => {
    try {
      const [emp, neg] = await Promise.all([getEmpresas(), getNegocios()])
      setEmpresas(emp)
      setNegocios(neg)
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])
  useRealtime('com_empresas', () => loadData())
  useRealtime('com_negocios', () => loadData())

  const totalPipeline = negocios.reduce((acc, n) => acc + (Number(n.valor) || 0), 0)
  const activeNegocios = negocios.filter(
    (n) => n.status === 'em_andamento' || n.status === 'aberto',
  )
  const wonNegocios = negocios.filter((n) => n.status === 'ganho')
  const orphanNegocios = negocios.filter((n) => n.status === 'aberto' && !n.responsavel_id)
  const empresasAtivas = empresas.filter((e) => e.status === 'ativo').length

  const formatBRL = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl space-y-6 animate-fade-in">
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white rounded-2xl p-6 sm:p-8 shadow-xl border border-slate-800">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <Badge
              variant="outline"
              className="text-blue-300 border-blue-500/40 bg-blue-500/10 text-xs mb-2"
            >
              Visão Comercial [TESTE]
            </Badge>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Olá, {user?.name || 'Usuário'}! 👋
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Indicadores comerciais em tempo real — Gestão Comercial PMais Fase 1 (dados de teste).
            </p>
          </div>
          <div className="flex gap-2.5 w-full sm:w-auto">
            <Button asChild className="bg-blue-600 hover:bg-blue-500 text-white shadow-md">
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

      {orphanNegocios.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Ocorrência Crítica de Qualidade [TESTE]</AlertTitle>
          <AlertDescription>
            {orphanNegocios.length} negócio(s) com status <strong>aberto</strong> sem responsável
            atribuído. Acesse o módulo de Negócios para atribuir um responsável.
            <Button asChild variant="outline" size="sm" className="ml-3 h-7 text-xs">
              <Link to="/foundation?tab=negocios">Resolver</Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-slate-600">
              Total de Empresas [TESTE]
            </CardTitle>
            <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600">
              <Building2 className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-10 w-24" />
            ) : (
              <div className="text-3xl font-bold text-slate-900">{empresas.length}</div>
            )}
            <p className="text-xs text-slate-500 mt-1">{empresasAtivas} ativas</p>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="w-full justify-between text-blue-600 hover:bg-blue-50 px-2 h-8 text-xs mt-3"
            >
              <Link to="/foundation?tab=empresas">
                Gerenciar Empresas <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-slate-600">
              Total de Negócios [TESTE]
            </CardTitle>
            <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600">
              <Briefcase className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-10 w-24" />
            ) : (
              <div className="text-3xl font-bold text-slate-900">{negocios.length}</div>
            )}
            <p className="text-xs text-slate-500 mt-1">
              {activeNegocios.length} no funil · {wonNegocios.length} ganhos
            </p>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="w-full justify-between text-emerald-600 hover:bg-emerald-50 px-2 h-8 text-xs mt-3"
            >
              <Link to="/foundation?tab=negocios">
                Gerenciar Negócios <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-slate-600">
              Valor em Pipeline [TESTE]
            </CardTitle>
            <div className="p-2.5 bg-purple-50 rounded-xl text-purple-600">
              <DollarSign className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-10 w-36" />
            ) : (
              <div className="text-3xl font-bold text-slate-900">{formatBRL(totalPipeline)}</div>
            )}
            <p className="text-xs text-slate-500 mt-1">Soma de todas as oportunidades</p>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="w-full justify-between text-purple-600 hover:bg-purple-50 px-2 h-8 text-xs mt-3"
            >
              <Link to="/foundation?tab=negocios">
                Analisar Funil <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
