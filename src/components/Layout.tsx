import { useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Building2,
  Briefcase,
  Users,
  ShieldCheck,
  KeyRound,
  Sliders,
  LogOut,
  LayoutDashboard,
  Layers,
  Menu,
  X,
  UserCircle,
  Link2,
} from 'lucide-react'

export function Layout() {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = () => {
    signOut()
    navigate('/login')
  }

  const userInitials = user?.name
    ? user.name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : user?.email
      ? user.email.slice(0, 2).toUpperCase()
      : 'PM'

  const navLinkClass = (path: string) =>
    `flex items-center space-x-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      location.pathname === path
        ? 'bg-slate-800 text-white'
        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
    }`

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      <header className="bg-slate-900 text-white sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center space-x-2.5 group">
              <div className="bg-blue-600 p-2 rounded-lg text-white group-hover:bg-blue-500 transition-colors">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <span className="font-bold text-lg tracking-tight block leading-none">
                  PMais CRM
                </span>
                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                  Administração · Fundação
                </span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center space-x-1">
              <Link to="/" className={navLinkClass('/')}>
                <LayoutDashboard className="h-4 w-4" />
                <span>Dashboard</span>
              </Link>
              <Link to="/foundation" className={navLinkClass('/foundation')}>
                <Layers className="h-4 w-4" />
                <span>Administração</span>
              </Link>
            </nav>

            <div className="hidden md:flex items-center space-x-3">
              {user && (
                <div className="flex items-center space-x-3 bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700/60">
                  <Avatar className="h-7 w-7 bg-blue-600 text-white text-xs font-semibold">
                    <AvatarFallback className="bg-blue-600 text-white">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left leading-tight">
                    <p className="text-xs font-semibold text-slate-100 max-w-[140px] truncate">
                      {user.name || 'Usuário'}
                    </p>
                    <p className="text-[10px] text-slate-400 max-w-[140px] truncate">
                      {user.email}
                    </p>
                  </div>
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-slate-300 hover:text-white hover:bg-slate-800 h-8 px-2.5"
              >
                <LogOut className="h-4 w-4 mr-1.5" />
                <span className="text-xs">Sair</span>
              </Button>
            </div>

            <div className="md:hidden flex items-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-slate-300 hover:text-white"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-800 bg-slate-900 px-4 pt-2 pb-4 space-y-2">
            <div className="pb-3 mb-2 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Avatar className="h-8 w-8 bg-blue-600 text-white text-xs font-semibold">
                  <AvatarFallback className="bg-blue-600 text-white">{userInitials}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-xs font-semibold text-slate-100">{user?.name || 'Usuário'}</p>
                  <p className="text-[10px] text-slate-400">{user?.email}</p>
                </div>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleLogout}
                className="h-7 text-xs"
              >
                Sair
              </Button>
            </div>
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-slate-200 hover:bg-slate-800"
            >
              <LayoutDashboard className="h-4 w-4 text-blue-400" />
              <span>Dashboard</span>
            </Link>
            <Link
              to="/foundation"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-slate-200 hover:bg-slate-800"
            >
              <Layers className="h-4 w-4 text-purple-400" />
              <span>Administração / Fundação</span>
            </Link>
            <div className="pt-2 border-t border-slate-800">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-1">
                Módulos
              </p>
              <div className="grid grid-cols-2 gap-1">
                <Link
                  to="/foundation?tab=empresas"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs text-slate-300 hover:bg-slate-800"
                >
                  <Building2 className="h-3.5 w-3.5 text-blue-400" />
                  <span>Empresas</span>
                </Link>
                <Link
                  to="/foundation?tab=negocios"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs text-slate-300 hover:bg-slate-800"
                >
                  <Briefcase className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Negócios</span>
                </Link>
                <Link
                  to="/foundation?tab=equipes"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs text-slate-300 hover:bg-slate-800"
                >
                  <Users className="h-3.5 w-3.5 text-amber-400" />
                  <span>Equipes</span>
                </Link>
                <Link
                  to="/foundation?tab=usuarios"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs text-slate-300 hover:bg-slate-800"
                >
                  <UserCircle className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Usuários</span>
                </Link>
                <Link
                  to="/foundation?tab=perfis"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs text-slate-300 hover:bg-slate-800"
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Perfis</span>
                </Link>
                <Link
                  to="/foundation?tab=permissoes"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs text-slate-300 hover:bg-slate-800"
                >
                  <KeyRound className="h-3.5 w-3.5 text-rose-400" />
                  <span>Permissões</span>
                </Link>
                <Link
                  to="/foundation?tab=vinculos"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs text-slate-300 hover:bg-slate-800"
                >
                  <Link2 className="h-3.5 w-3.5 text-teal-400" />
                  <span>Vínculos</span>
                </Link>
                <Link
                  to="/foundation?tab=parametros"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs text-slate-300 hover:bg-slate-800"
                >
                  <Sliders className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Parâmetros</span>
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 py-4 px-4 text-xs text-center">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>PMais CRM &copy; {new Date().getFullYear()} – Sistema de Gestão Comercial</span>
          <span className="text-slate-500">Validação de Viabilidade – Fase 1</span>
        </div>
      </footer>
    </div>
  )
}

export default Layout
