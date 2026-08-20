import { useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowLeftRight,
  Building2,
  ChevronRight,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  ListChecks,
} from 'lucide-react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useAuth } from '@/hooks/use-auth'
import { useIsSuperAdmin } from '@/hooks/use-is-superadmin'
import { MUTATIONS_ENABLED } from '@/lib/feature-flags'
import { cn } from '@/lib/utils'

const SUBSTITUICOES_ALLOWLIST = new Set([
  'superadministrador',
  'gestor',
  'gestor-comercial',
  'operador-comercial',
  'prospeccao',
])

type NavigationItem = {
  label: string
  path: string
  icon: typeof LayoutDashboard
}

export function getSubstituicoesPageTitle(pathname: string, mutationsEnabled = true) {
  if (pathname === '/substituicoes' || pathname === '/substituicoes/') return 'Substituições'
  if (pathname === '/substituicoes/nova' || pathname === '/substituicoes/nova/') {
    return mutationsEnabled ? 'Nova substituição' : null
  }
  if (/^\/substituicoes\/[^/]+\/ajustar\/?$/.test(pathname)) {
    return mutationsEnabled ? 'Ajustar substituição' : null
  }
  if (/^\/substituicoes\/[^/]+\/?$/.test(pathname)) return 'Detalhes da substituição'
  return null
}

export function Layout() {
  const { user, signOut } = useAuth()
  const { perfilSlug, loading: perfilLoading } = useIsSuperAdmin()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const podeVerSubstituicoes =
    !perfilLoading &&
    user?.ativo_comercial === true &&
    SUBSTITUICOES_ALLOWLIST.has(perfilSlug ?? '')

  const navigation: NavigationItem[] = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    ...(user?.ativo_comercial === true
      ? [{ label: 'Qualificação', path: '/qualificacao', icon: ListChecks }]
      : []),
    { label: 'Administração', path: '/foundation', icon: Layers },
    ...(podeVerSubstituicoes
      ? [{ label: 'Substituições', path: '/substituicoes', icon: ArrowLeftRight }]
      : []),
  ]

  const handleLogout = () => {
    signOut()
    navigate('/login')
  }

  const userInitials = user?.name
    ? user.name
        .split(' ')
        .map((name: string) => name[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : user?.email
      ? user.email.slice(0, 2).toUpperCase()
      : 'PM'

  const isActive = (path: string) =>
    path === '/'
      ? location.pathname === '/'
      : location.pathname === path || location.pathname.startsWith(`${path}/`)

  const pageTitle =
    getSubstituicoesPageTitle(location.pathname, MUTATIONS_ENABLED) ??
    navigation.find((item) => isActive(item.path))?.label ??
    'Gestão Comercial PMais'

  const Navigation = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav aria-label="Navegação principal" className="space-y-1.5">
      {navigation.map((item) => {
        const active = isActive(item.path)
        const Icon = item.icon

        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'group flex items-center justify-between rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors',
              active
                ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white',
            )}
          >
            <span className="flex items-center gap-3">
              <Icon
                aria-hidden="true"
                className={cn(
                  'h-4 w-4',
                  active ? 'text-white' : 'text-slate-400 group-hover:text-white',
                )}
              />
              {item.label}
            </span>
            {active && <ChevronRight aria-hidden="true" className="h-4 w-4 text-indigo-200" />}
          </Link>
        )
      })}
    </nav>
  )

  const UserPanel = ({ mobile = false }: { mobile?: boolean }) => (
    <div className="flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar className="h-9 w-9 border border-indigo-500 bg-indigo-700 text-white">
          <AvatarFallback className="bg-indigo-700 text-xs font-bold text-white">
            {userInitials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{user?.name || 'Usuário'}</p>
          <p className="truncate text-xs text-slate-400">{perfilSlug || user?.email}</p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleLogout}
        className="shrink-0 text-slate-400 hover:bg-slate-800 hover:text-rose-400"
        aria-label="Sair do sistema"
      >
        <LogOut aria-hidden="true" className="h-4 w-4" />
        {mobile && <span className="sr-only">Sair</span>}
      </Button>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <aside className="fixed inset-y-0 z-30 hidden w-64 flex-col border-r border-slate-800 bg-slate-900 text-slate-100 lg:flex">
        <Link to="/" className="flex items-center gap-3 border-b border-slate-800 p-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md">
            <Building2 aria-hidden="true" className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-lg font-bold tracking-tight text-white">
              PMais Comercial
            </span>
            <span className="block text-xs text-slate-400">Gestão Comercial</span>
          </span>
        </Link>

        <div className="flex-1 overflow-y-auto p-4">
          <Navigation />
        </div>

        <div className="border-t border-slate-800 bg-slate-950/50 p-4">
          <UserPanel />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:ml-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 shadow-sm backdrop-blur lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-slate-700 lg:hidden"
                  aria-label="Abrir menu principal"
                  aria-expanded={mobileMenuOpen}
                  aria-controls="mobile-navigation"
                >
                  <Menu aria-hidden="true" className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                id="mobile-navigation"
                side="left"
                className="flex w-72 flex-col border-r border-slate-800 bg-slate-900 p-0 text-white"
              >
                <SheetHeader className="border-b border-slate-800 p-5 text-left">
                  <SheetTitle className="flex items-center gap-3 text-white">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600">
                      <Building2 aria-hidden="true" className="h-5 w-5" />
                    </span>
                    <span>
                      <span className="block text-base font-bold">PMais Comercial</span>
                      <span className="block text-xs font-normal text-slate-400">
                        Módulo de Gestão
                      </span>
                    </span>
                  </SheetTitle>
                </SheetHeader>
                <div className="flex-1 p-4" id="mobile-navigation-links">
                  <Navigation onNavigate={() => setMobileMenuOpen(false)} />
                </div>
                <div className="border-t border-slate-800 bg-slate-950 p-4">
                  <UserPanel mobile />
                </div>
              </SheetContent>
            </Sheet>
            <h1 className="truncate text-xl font-bold tracking-tight text-slate-900">
              {pageTitle}
            </h1>
          </div>

          <div className="hidden items-center gap-2 sm:flex">
            <Avatar className="h-8 w-8 bg-indigo-700 text-white">
              <AvatarFallback className="bg-indigo-700 text-xs font-bold text-white">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <span className="max-w-[160px] truncate text-sm font-medium text-slate-800">
              {user?.name || 'Usuário'}
            </span>
          </div>
        </header>

        <main id="conteudo-principal" className="mx-auto w-full max-w-7xl flex-1 p-4 lg:p-8">
          <Outlet />
        </main>

        <footer className="flex flex-col items-center justify-between gap-2 border-t border-slate-200 bg-white px-6 py-4 text-center text-xs text-slate-500 sm:flex-row">
          <span>Gestão Comercial PMais &copy; {new Date().getFullYear()}</span>
          <span className="text-slate-400">Sistema de Gestão Comercial</span>
        </footer>
      </div>
    </div>
  )
}

export default Layout
