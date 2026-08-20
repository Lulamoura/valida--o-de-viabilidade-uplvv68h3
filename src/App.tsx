import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import Index from './pages/Index'
import Login from './pages/Login'
import Foundation from './pages/Foundation'
import SubstituicoesLista from './pages/SubstituicoesLista'
import SubstituicaoDetalhe from './pages/SubstituicaoDetalhe'
import SubstituicaoNova from './pages/SubstituicaoNova'
import SubstituicaoAjuste from './pages/SubstituicaoAjuste'
import Qualificacoes from './pages/Qualificacoes'

import NotFound from './pages/NotFound'
import Layout from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AuthProvider } from './hooks/use-auth'
import { PermissionsProvider } from './hooks/use-permissions'
import { MUTATIONS_ENABLED } from './lib/feature-flags'

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <PermissionsProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<Layout />}>
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Index />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/foundation"
                element={
                  <ProtectedRoute>
                    <Foundation />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/qualificacao"
                element={
                  <ProtectedRoute>
                    <Qualificacoes />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/substituicoes"
                element={
                  <ProtectedRoute>
                    <SubstituicoesLista />
                  </ProtectedRoute>
                }
              />
              {MUTATIONS_ENABLED ? (
                <>
                  <Route
                    path="/substituicoes/nova"
                    element={
                      <ProtectedRoute>
                        <SubstituicaoNova />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/substituicoes/:id/ajustar"
                    element={
                      <ProtectedRoute>
                        <SubstituicaoAjuste />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/substituicoes/:id"
                    element={
                      <ProtectedRoute>
                        <SubstituicaoDetalhe />
                      </ProtectedRoute>
                    }
                  />
                </>
              ) : (
                <>
                  <Route path="/substituicoes/nova" element={<NotFound />} />
                  <Route path="/substituicoes/:id/ajustar" element={<NotFound />} />
                  <Route
                    path="/substituicoes/:id"
                    element={
                      <ProtectedRoute>
                        <SubstituicaoDetalhe />
                      </ProtectedRoute>
                    }
                  />
                </>
              )}
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </PermissionsProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
