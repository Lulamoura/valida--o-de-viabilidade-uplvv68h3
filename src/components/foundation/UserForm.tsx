import { useState, useEffect } from 'react'
import { extractFieldErrors, type FieldErrors } from '@/lib/pocketbase/errors'
import { createUser } from '@/services/users'
import { getPerfis, getEquipes } from '@/services/foundation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { RecordModel } from 'pocketbase'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
}

const EMPTY = {
  name: '',
  email: '',
  password: '',
  perfil_id: '',
  equipe_id: '',
  ativo_comercial: true,
}

export function UserForm({ open, onOpenChange }: Props) {
  const [perfis, setPerfis] = useState<RecordModel[]>([])
  const [equipes, setEquipes] = useState<RecordModel[]>([])
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState<FieldErrors>({})

  useEffect(() => {
    if (!open) return
    Promise.all([getPerfis(), getEquipes()]).then(([p, e]) => {
      setPerfis(p)
      setEquipes(e)
    })
    setForm(EMPTY)
    setErrors({})
  }, [open])

  const submit = async () => {
    setErrors({})
    try {
      await createUser({
        ...form,
        passwordConfirm: form.password,
      })
      onOpenChange(false)
    } catch (err) {
      setErrors(extractFieldErrors(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo Usuário</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nome</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
          </div>
          <div>
            <Label>E-mail</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
          </div>
          <div>
            <Label>Senha</Label>
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Mínimo 8 caracteres"
            />
            {errors.password && <p className="text-sm text-red-500">{errors.password}</p>}
          </div>
          <div>
            <Label>Perfil</Label>
            <Select
              value={form.perfil_id}
              onValueChange={(v) => setForm({ ...form, perfil_id: v })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione um perfil" />
              </SelectTrigger>
              <SelectContent>
                {perfis.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.perfil_id && <p className="text-sm text-red-500">{errors.perfil_id}</p>}
          </div>
          <div>
            <Label>Equipe</Label>
            <Select
              value={form.equipe_id}
              onValueChange={(v) => setForm({ ...form, equipe_id: v })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione uma equipe" />
              </SelectTrigger>
              <SelectContent>
                {equipes.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.equipe_id && <p className="text-sm text-red-500">{errors.equipe_id}</p>}
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={form.ativo_comercial}
              onCheckedChange={(v) => setForm({ ...form, ativo_comercial: v })}
            />
            <Label>Ativo Comercial</Label>
          </div>
          <Button onClick={submit} className="w-full">
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
