import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { extractFieldErrors, getErrorMessage, type FieldErrors } from '@/lib/pocketbase/errors'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Building2 } from 'lucide-react'

export default function Login() {
  const { isAuthenticated, signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [form, setForm] = useState({ name: '', email: '', password: '', passwordConfirm: '' })
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [generalError, setGeneralError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true })
  }, [isAuthenticated, navigate])

  const handleSubmit = async () => {
    setSubmitting(true)
    setFieldErrors({})
    setGeneralError('')
    try {
      if (mode === 'login') {
        const { error } = await signIn(form.email, form.password)
        if (error) throw error
      } else {
        if (form.password !== form.passwordConfirm) {
          setFieldErrors({ passwordConfirm: 'As senhas nao conferem.' })
          setSubmitting(false)
          return
        }
        const { error } = await signUp(form.email, form.password, form.name)
        if (error) throw error
      }
      navigate('/')
    } catch (err) {
      setFieldErrors(extractFieldErrors(err))
      setGeneralError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-200 px-4">
      <Card className="w-full max-w-md animate-fade-in-up">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <div className="rounded-full bg-slate-900 p-3">
              <Building2 className="h-6 w-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl">PMais CRM</CardTitle>
          <CardDescription>Validacao de Viabilidade - Fase 1</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {generalError && !fieldErrors.email && !fieldErrors.password && (
            <Alert variant="destructive">
              <AlertDescription>{generalError}</AlertDescription>
            </Alert>
          )}
          {mode === 'signup' && (
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            {fieldErrors.email && <p className="text-sm text-red-500">{fieldErrors.email}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            {fieldErrors.password && <p className="text-sm text-red-500">{fieldErrors.password}</p>}
          </div>
          {mode === 'signup' && (
            <div className="space-y-2">
              <Label htmlFor="passwordConfirm">Confirmar Senha</Label>
              <Input
                id="passwordConfirm"
                type="password"
                value={form.passwordConfirm}
                onChange={(e) => setForm({ ...form, passwordConfirm: e.target.value })}
              />
              {fieldErrors.passwordConfirm && (
                <p className="text-sm text-red-500">{fieldErrors.passwordConfirm}</p>
              )}
            </div>
          )}
          <Button className="w-full" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Carregando...' : mode === 'login' ? 'Entrar' : 'Cadastrar'}
          </Button>
          <p className="text-center text-sm text-gray-500">
            {mode === 'login' ? (
              <>
                Nao tem conta?{' '}
                <button onClick={() => setMode('signup')} className="text-blue-500 hover:underline">
                  Cadastre-se
                </button>
              </>
            ) : (
              <>
                Ja tem conta?{' '}
                <button onClick={() => setMode('login')} className="text-blue-500 hover:underline">
                  Entrar
                </button>
              </>
            )}
          </p>
          <p className="text-center text-xs text-gray-400">
            Usuario de teste: luiz.moura@pmaisservicos.com.br / Skip@Pass
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
