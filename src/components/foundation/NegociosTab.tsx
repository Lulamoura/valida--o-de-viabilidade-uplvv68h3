import { useState, useEffect } from 'react'
import { useRealtime } from '@/hooks/use-realtime'
import { extractFieldErrors, type FieldErrors } from '@/lib/pocketbase/errors'
import { getNegocios, createNegocio, updateNegocio, deleteNegocio } from '@/services/commercial'
import { getEquipes } from '@/services/foundation'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import type { RecordModel } from 'pocketbase'

const STATUS_OPTIONS = ['aberto', 'em_andamento', 'ganho', 'perdido'] as const

export function NegociosTab() {
  const { user } = useAuth()
  const [records, setRecords] = useState<RecordModel[]>([])
  const [empresas, setEmpresas] = useState<RecordModel[]>([])
  const [equipes, setEquipes] = useState<RecordModel[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<RecordModel | null>(null)
  const [form, setForm] = useState<any>({
    titulo: '',
    empresa_id: '',
    equipe_id: '',
    valor: 0,
    status: 'aberto',
    descricao: '',
  })
  const [errors, setErrors] = useState<FieldErrors>({})

  const load = async () => {
    const [neg, eq] = await Promise.all([getNegocios(), getEquipes()])
    setRecords(neg)
    setEquipes(eq)
    const { getEmpresas } = await import('@/services/commercial')
    setEmpresas(await getEmpresas())
  }
  useEffect(() => {
    load()
  }, [])
  useRealtime('com_negocios', () => {
    load()
  })

  const openNew = () => {
    setEditing(null)
    setForm({
      titulo: '',
      empresa_id: '',
      equipe_id: '',
      valor: 0,
      status: 'aberto',
      descricao: '',
    })
    setErrors({})
    setOpen(true)
  }
  const openEdit = (r: RecordModel) => {
    setEditing(r)
    setForm({
      titulo: r.titulo,
      empresa_id: r.empresa_id || '',
      equipe_id: r.equipe_id || '',
      valor: r.valor || 0,
      status: r.status,
      descricao: r.descricao || '',
    })
    setErrors({})
    setOpen(true)
  }

  const submit = async () => {
    setErrors({})
    try {
      const data = { ...form, valor: Number(form.valor) || 0, responsavel_id: user?.id }
      if (editing) await updateNegocio(editing.id, data)
      else await createNegocio(data)
      setOpen(false)
    } catch (err) {
      setErrors(extractFieldErrors(err))
    }
  }
  const remove = async (id: string) => {
    if (confirm('Excluir este negocio?')) await deleteNegocio(id)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Negocios</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Adicionar
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar Negocio' : 'Novo Negocio'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Titulo</Label>
                <Input
                  value={form.titulo}
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                />
                {errors.titulo && <p className="text-sm text-red-500">{errors.titulo}</p>}
              </div>
              <div>
                <Label>Empresa</Label>
                <Select
                  value={form.empresa_id}
                  onValueChange={(v) => setForm({ ...form, empresa_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {empresas.map((em) => (
                      <SelectItem key={em.id} value={em.id}>
                        {em.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Equipe</Label>
                <Select
                  value={form.equipe_id}
                  onValueChange={(v) => setForm({ ...form, equipe_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {equipes.map((eq) => (
                      <SelectItem key={eq.id} value={eq.id}>
                        {eq.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Valor (R$)</Label>
                  <Input
                    type="number"
                    value={form.valor}
                    onChange={(e) => setForm({ ...form, valor: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => setForm({ ...form, status: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Descricao</Label>
                <Textarea
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                />
              </div>
              <Button onClick={submit} className="w-full">
                Salvar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Titulo</TableHead>
            <TableHead>Empresa</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Acoes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-medium">{r.titulo}</TableCell>
              <TableCell className="text-gray-500">{r.expand?.empresa_id?.nome || '-'}</TableCell>
              <TableCell className="text-gray-500">
                R$ {(r.valor || 0).toLocaleString('pt-BR')}
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    r.status === 'ganho'
                      ? 'default'
                      : r.status === 'perdido'
                        ? 'outline'
                        : 'secondary'
                  }
                >
                  {r.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" onClick={() => openEdit(r)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => remove(r.id)}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
