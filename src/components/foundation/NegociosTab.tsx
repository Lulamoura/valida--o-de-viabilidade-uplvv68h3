import { useState, useEffect } from 'react'
import { useRealtime } from '@/hooks/use-realtime'
import { extractFieldErrors, type FieldErrors } from '@/lib/pocketbase/errors'
import {
  getNegocios,
  createNegocio,
  updateNegocio,
  changeNegocioResponsavel,
  getNegocioHistorico,
} from '@/services/commercial'
import { getEquipes, createAuditRecord } from '@/services/foundation'
import { getActiveUsers } from '@/services/users'
import { useAuth } from '@/hooks/use-auth'
import { NEGOCIO_STATUS_OPTIONS, getStatusLabel, isStatusStage } from '@/lib/status-labels'
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
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Plus, Pencil, History, AlertTriangle, Ban, CheckCircle } from 'lucide-react'
import type { RecordModel } from 'pocketbase'

export function NegociosTab() {
  const { user } = useAuth()
  const [records, setRecords] = useState<RecordModel[]>([])
  const [empresas, setEmpresas] = useState<RecordModel[]>([])
  const [equipes, setEquipes] = useState<RecordModel[]>([])
  const [activeUsers, setActiveUsers] = useState<RecordModel[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<RecordModel | null>(null)
  const [form, setForm] = useState<any>({
    titulo: '',
    empresa_id: '',
    equipe_id: '',
    responsavel_id: '',
    valor: 0,
    status: 'prospects',
    descricao: '',
  })
  const [justificativa, setJustificativa] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [histOpen, setHistOpen] = useState(false)
  const [histRecords, setHistRecords] = useState<RecordModel[]>([])

  const load = async () => {
    const { getEmpresas } = await import('@/services/commercial')
    const [neg, eq, au, em] = await Promise.all([
      getNegocios(),
      getEquipes(),
      getActiveUsers(),
      getEmpresas(),
    ])
    setRecords(neg)
    setEquipes(eq)
    setActiveUsers(au)
    setEmpresas(em)
  }
  useEffect(() => {
    load()
  }, [])
  useRealtime('com_negocios', () => {
    load()
  })

  const orphans = records.filter((r) => r.status === 'prospects' && !r.responsavel_id && !r.inativo)

  const openNew = () => {
    setEditing(null)
    setForm({
      titulo: '',
      empresa_id: '',
      equipe_id: '',
      responsavel_id: user?.id || '',
      valor: 0,
      status: 'prospects',
      descricao: '',
    })
    setJustificativa('')
    setErrors({})
    setOpen(true)
  }
  const openEdit = (r: RecordModel) => {
    setEditing(r)
    setForm({
      titulo: r.titulo,
      empresa_id: r.empresa_id || '',
      equipe_id: r.equipe_id || '',
      responsavel_id: r.responsavel_id || '',
      valor: r.valor || 0,
      status: r.status,
      descricao: r.descricao || '',
    })
    setJustificativa('')
    setErrors({})
    setOpen(true)
  }

  const submit = async () => {
    setErrors({})
    try {
      const data = { ...form, valor: Number(form.valor) || 0 }
      if (editing) {
        const respChanged = editing.responsavel_id !== form.responsavel_id
        if (respChanged && form.responsavel_id) {
          if (!justificativa.trim()) {
            setErrors({ justificativa: 'Justificativa é obrigatória para troca de responsável.' })
            return
          }
          await changeNegocioResponsavel(editing.id, form.responsavel_id, justificativa)
          const { responsavel_id, ...rest } = data
          await updateNegocio(editing.id, rest)
        } else {
          await updateNegocio(editing.id, data)
        }
      } else {
        await createNegocio(data)
      }
      setOpen(false)
    } catch (err) {
      setErrors(extractFieldErrors(err))
    }
  }

  const inactivate = async (r: RecordModel) => {
    const j = prompt('Justificativa para inativação do negócio:')
    if (!j) return
    await updateNegocio(r.id, { inativo: true })
    await createAuditRecord({
      collection_name: 'com_negocios',
      record_id: r.id,
      acao: 'inactivate',
      valor_anterior: 'ativo',
      valor_novo: 'inativo',
      justificativa: j,
      origem_alteracao: 'manual',
    })
  }

  const activate = async (r: RecordModel) => {
    const j = prompt('Justificativa para ativação do negócio:')
    if (!j) return
    await updateNegocio(r.id, { inativo: false })
    await createAuditRecord({
      collection_name: 'com_negocios',
      record_id: r.id,
      acao: 'update',
      valor_anterior: 'inativo',
      valor_novo: 'ativo',
      justificativa: j,
      origem_alteracao: 'manual',
    })
  }

  const showHistory = async (negocioId: string) => {
    setHistRecords(await getNegocioHistorico(negocioId))
    setHistOpen(true)
  }

  const respChanged = editing && editing.responsavel_id !== form.responsavel_id

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Negócios</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Adicionar
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar Negócio' : 'Novo Negócio'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Título</Label>
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
              <div>
                <Label>Responsável</Label>
                <Select
                  value={form.responsavel_id}
                  onValueChange={(v) => setForm({ ...form, responsavel_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name || u.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.responsavel_id && (
                  <p className="text-sm text-red-500">{errors.responsavel_id}</p>
                )}
              </div>
              {respChanged && (
                <div>
                  <Label>Justificativa da Troca de Responsável *</Label>
                  <Textarea
                    value={justificativa}
                    onChange={(e) => setJustificativa(e.target.value)}
                  />
                  {errors.justificativa && (
                    <p className="text-sm text-red-500">{errors.justificativa}</p>
                  )}
                </div>
              )}
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
                  <Label>Etapas / Resultado</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => setForm({ ...form, status: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {NEGOCIO_STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {getStatusLabel(s)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Descrição</Label>
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

      {orphans.length > 0 && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Ocorrência crítica [TESTE]:</strong> {orphans.length} negócio(s) na etapa
            "Prospects" sem responsável atribuído.
          </AlertDescription>
        </Alert>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Título</TableHead>
            <TableHead>Empresa</TableHead>
            <TableHead>Responsável</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Etapa / Resultado</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((r) => (
            <TableRow key={r.id} className={r.inativo ? 'opacity-50' : ''}>
              <TableCell className="font-medium">{r.titulo}</TableCell>
              <TableCell className="text-gray-500">{r.expand?.empresa_id?.nome || '-'}</TableCell>
              <TableCell className="text-gray-500">
                {r.expand?.responsavel_id?.name ||
                  (r.responsavel_id ? '—' : <Badge variant="destructive">Sem responsável</Badge>)}
              </TableCell>
              <TableCell className="text-gray-500">
                R$ {(r.valor || 0).toLocaleString('pt-BR')}
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    isStatusStage(r.status)
                      ? 'secondary'
                      : r.status === 'ganho'
                        ? 'default'
                        : 'outline'
                  }
                >
                  {getStatusLabel(r.status)}
                </Badge>
                {r.inativo && (
                  <Badge variant="outline" className="ml-1">
                    Inativo
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => showHistory(r.id)}
                  title="Histórico"
                >
                  <History className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => openEdit(r)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                {r.inativo ? (
                  <Button variant="ghost" size="sm" onClick={() => activate(r)} title="Ativar">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" onClick={() => inactivate(r)} title="Inativar">
                    <Ban className="h-4 w-4 text-amber-500" />
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={histOpen} onOpenChange={setHistOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Histórico de Responsáveis</DialogTitle>
          </DialogHeader>
          {histRecords.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              Nenhuma alteração de responsável registrada.
            </p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {histRecords.map((h) => (
                <div key={h.id} className="border rounded-lg p-3 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="font-medium">
                      {h.expand?.responsavel_novo_id?.name || '—'}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(h.created).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Anterior: {h.expand?.responsavel_anterior_id?.name || '—'}
                  </p>
                  <p className="text-xs text-gray-500">
                    Por: {h.expand?.usuario_id?.name || h.expand?.usuario_id?.email || '—'}
                  </p>
                  <p className="text-xs italic">"{h.justificativa}"</p>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
