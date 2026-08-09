import { useState, useEffect } from 'react'
import { useRealtime } from '@/hooks/use-realtime'
import { getUsers } from '@/services/users'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import type { RecordModel } from 'pocketbase'

export function UsuariosTab() {
  const [records, setRecords] = useState<RecordModel[]>([])

  const load = async () => setRecords(await getUsers())
  useEffect(() => {
    load()
  }, [])
  useRealtime('users', () => {
    load()
  })

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Usuários</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>E-mail</TableHead>
            <TableHead>Perfil</TableHead>
            <TableHead>Equipe</TableHead>
            <TableHead>Ativo Comercial</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-medium">{r.name || '-'}</TableCell>
              <TableCell className="text-gray-500">{r.email}</TableCell>
              <TableCell>
                <Badge variant="outline">{r.expand?.perfil_id?.nome || '-'}</Badge>
              </TableCell>
              <TableCell className="text-gray-500">{r.expand?.equipe_id?.nome || '-'}</TableCell>
              <TableCell>
                <Badge variant={r.ativo_comercial ? 'default' : 'secondary'}>
                  {r.ativo_comercial ? 'Sim' : 'Não'}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
