import { useSearchParams } from 'react-router-dom'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EquipesTab } from '@/components/foundation/EquipesTab'
import { PerfisTab } from '@/components/foundation/PerfisTab'
import { PermissoesTab } from '@/components/foundation/PermissoesTab'
import { ParametrosTab } from '@/components/foundation/ParametrosTab'
import { EmpresasTab } from '@/components/foundation/EmpresasTab'
import { NegociosTab } from '@/components/foundation/NegociosTab'
import { UsuariosTab } from '@/components/foundation/UsuariosTab'
import { VinculosTab } from '@/components/foundation/VinculosTab'
import { usePermissions } from '@/hooks/use-permissions'

const TABS_CONFIG = [
  { value: 'equipes', label: 'Equipes', perm: 'equipes.admin' },
  { value: 'usuarios', label: 'Usuários', perm: 'usuarios.admin' },
  { value: 'perfis', label: 'Perfis', perm: 'perfis.admin' },
  { value: 'permissoes', label: 'Permissões', perm: 'permissoes.admin' },
  { value: 'vinculos', label: 'Vínculos', perm: 'vinculos.admin' },
  { value: 'parametros', label: 'Parâmetros', perm: 'parametros.gerenciar' },
  { value: 'empresas', label: 'Empresas', perm: 'empresas.view' },
  { value: 'negocios', label: 'Negócios', perm: 'negocios.view' },
]

export default function Foundation() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { hasPermission } = usePermissions()

  const visibleTabs = TABS_CONFIG.filter((t) => hasPermission(t.perm))
  const activeTab = searchParams.get('tab') || visibleTabs[0]?.value || ''

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value })
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <h1 className="text-2xl font-bold mb-1">Administração da Fundação</h1>
      <p className="text-sm text-gray-500 mb-6">Fase 1 – Estrutura base do PMais CRM</p>
      {visibleTabs.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">
          Você não tem permissões para acessar nenhum módulo da administração.
        </p>
      ) : (
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="flex-wrap h-auto">
            {visibleTabs.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="equipes" className="mt-4">
            <EquipesTab />
          </TabsContent>
          <TabsContent value="usuarios" className="mt-4">
            <UsuariosTab />
          </TabsContent>
          <TabsContent value="perfis" className="mt-4">
            <PerfisTab />
          </TabsContent>
          <TabsContent value="permissoes" className="mt-4">
            <PermissoesTab />
          </TabsContent>
          <TabsContent value="vinculos" className="mt-4">
            <VinculosTab />
          </TabsContent>
          <TabsContent value="parametros" className="mt-4">
            <ParametrosTab />
          </TabsContent>
          <TabsContent value="empresas" className="mt-4">
            <EmpresasTab />
          </TabsContent>
          <TabsContent value="negocios" className="mt-4">
            <NegociosTab />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
