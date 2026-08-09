import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'

export const getUsers = (): Promise<RecordModel[]> =>
  pb.collection('users').getFullList({ sort: 'name' })

export const getActiveUsers = (): Promise<RecordModel[]> =>
  pb.collection('users').getFullList({ filter: 'ativo_comercial = true', sort: 'name' })
