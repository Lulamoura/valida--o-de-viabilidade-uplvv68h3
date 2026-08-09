import { useState, useEffect } from 'react'
import { useRealtime } from '@/hooks/use-realtime'
import { getParametros, updateParametro, createAuditRecord } from '@/services/foundation'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Pencil, History, Ban, CheckCircle, Eye } from 'lucide-react'
import { ParametroForm } from './ParametroForm'
import { ParametroVersionHistory } from './ParametroVersionHistory'
import { ParametroDetail } from './ParametroDetail'
import type { RecordModel } from 'pocketbase'

export function ParametrosTab() {
  const { user } = useAuth()
  const [records, setRecords] = useState<RecordModel[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<RecordModel | null>(null)
  const [histOpen, setHistOpen] = useState(false)
  const [histId, setHistId] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailParam, setDetailParam] = useState<RecordModel | null>(null)

  const load = async () => setRecords(await getParametros())
  useEffect(() => {
    load()
  }, [])
  useRealtime('com_parametros', () => {
    load()
  })

  const openNew = () => {
    setEditing(null)
    setFormOpen(true)
  }
  const openEdit = (r: RecordModel) => {
    setEditing(r)
    setFormOpen(true)
  }
  const openHistory = (id: string) => {
    setHistId(id)
    setHistOpen(true)
  }
  const openDetail = (r: RecordModel) => {
    setDetailParam(r)
    setDetailOpen(true)
  }

  const toggleAtivo = async (r: RecordModel) => {
    const action = r.ativo ? 'inativar' : 'ativar'
    const justificativa = prompt(`Justificativa para ${action} este parâmetro:`)
    if (!justificativa) return
    await updateParametro(r.id, {
      ativo: !r.ativo,
      autor_id: user?.id,
      data_hora: new Date().toISOString(),
      justificativa,
    })
    await createAuditRecord({
      collection_name: 'com_parametros',
      record_id: r.id,
      acao: r.ativo ? 'inactivate' : 'update',
      valor_anterior: r.ativo ? 'ativo' : 'inativo',
      valor_novo: r.ativo ? 'inativo' : 'ativo',
      justificativa,
      origem_alteracao: 'manual',
    })
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Parâmetros</h2>
        <Button onClick={openNew} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Adicionar
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Chave</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Versão</TableHead>
            <TableHead>Ativo</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-medium">{r.chave}</TableCell>
              <TableCell className="text-gray-500">{r.valor}</TableCell>
              <TableCell className="text-gray-500">{r.tipo || '-'}</TableCell>
              <TableCell>
                <Badge variant="outline">v{r.versao}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant={r.ativo ? 'default' : 'secondary'}>{r.ativo ? 'Sim' : 'Não'}</Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openHistory(r.id)}
                  title="Histórico"
                >
                  <History className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => openEdit(r)} title="Editar">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleAtivo(r)}
                  title={r.ativo ? 'Inativar' : 'Ativar'}
                >
                  {r.ativo ? (
                    <Ban className="h-4 w-4 text-amber-500" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <ParametroForm open={formOpen} onOpenChange={setFormOpen} editing={editing} />
      <ParametroVersionHistory parametroId={histId} open={histOpen} onOpenChange={setHistOpen} />
    </div>
  )
}
