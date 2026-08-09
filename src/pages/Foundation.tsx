import { useSearchParams } from 'react-router-dom'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EquipesTab } from '@/components/foundation/EquipesTab'
import { PerfisTab } from '@/components/foundation/PerfisTab'
import { PermissoesTab } from '@/components/foundation/PermissoesTab'
import { ParametrosTab } from '@/components/foundation/ParametrosTab'
import { EmpresasTab } from '@/components/foundation/EmpresasTab'
import { NegociosTab } from '@/components/foundation/NegociosTab'

export default function Foundation() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'equipes'

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value })
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <h1 className="text-2xl font-bold mb-1">Administracao da Fundacao</h1>
      <p className="text-sm text-gray-500 mb-6">Fase 1 - Estrutura base do PMais CRM</p>
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="equipes">Equipes</TabsTrigger>
          <TabsTrigger value="perfis">Perfis</TabsTrigger>
          <TabsTrigger value="permissoes">Permissoes</TabsTrigger>
          <TabsTrigger value="parametros">Parametros</TabsTrigger>
          <TabsTrigger value="empresas">Empresas</TabsTrigger>
          <TabsTrigger value="negocios">Negocios</TabsTrigger>
        </TabsList>
        <TabsContent value="equipes" className="mt-4">
          <EquipesTab />
        </TabsContent>
        <TabsContent value="perfis" className="mt-4">
          <PerfisTab />
        </TabsContent>
        <TabsContent value="permissoes" className="mt-4">
          <PermissoesTab />
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
    </div>
  )
}
