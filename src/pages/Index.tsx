import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, Bell, BarChart3, ListChecks } from 'lucide-react'

export default function Index() {
  const { user } = useAuth()

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl space-y-6 animate-fade-in">
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white rounded-2xl p-6 sm:p-8 shadow-xl border border-slate-800">
        <div>
          <div className="flex flex-wrap gap-2 mb-2">
            <Badge
              variant="outline"
              className="text-amber-300 border-amber-500/40 bg-amber-500/10 text-xs"
            >
              Provisório — Fase 1
            </Badge>
            <Badge
              variant="outline"
              className="text-blue-300 border-blue-500/40 bg-blue-500/10 text-xs"
            >
              Dados de teste
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Olá, {user?.name || 'Usuário'}! 👋
          </h1>
          <p className="text-sm text-slate-300 mt-1 max-w-2xl">
            Dashboard provisório — indicadores serão definidos na Fase 2. Nenhum indicador
            definitivo disponível.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-dashed border-slate-300 bg-slate-50/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-slate-400">
              Indicadores Comerciais
            </CardTitle>
            <div className="p-2.5 bg-slate-100 rounded-xl text-slate-400">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-400">Reservado para indicadores da Fase 2.</p>
          </CardContent>
        </Card>

        <Card className="border-dashed border-slate-300 bg-slate-50/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-slate-400">Alertas</CardTitle>
            <div className="p-2.5 bg-slate-100 rounded-xl text-slate-400">
              <Bell className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-400">Reservado para alertas da Fase 2.</p>
          </CardContent>
        </Card>

        <Card className="border-dashed border-slate-300 bg-slate-50/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-slate-400">Gráficos</CardTitle>
            <div className="p-2.5 bg-slate-100 rounded-xl text-slate-400">
              <BarChart3 className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-400">Reservado para gráficos da Fase 2.</p>
          </CardContent>
        </Card>

        <Card className="border-dashed border-slate-300 bg-slate-50/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-slate-400">Lista de Ações</CardTitle>
            <div className="p-2.5 bg-slate-100 rounded-xl text-slate-400">
              <ListChecks className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-400">Reservado para lista de ações da Fase 2.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
