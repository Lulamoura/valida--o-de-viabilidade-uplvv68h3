import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'

export const getEmpresas = (): Promise<RecordModel[]> =>
  pb.collection('com_empresas').getFullList({ expand: 'equipe_id', sort: '-created' })
export const createEmpresa = (data: Record<string, any>) =>
  pb.collection('com_empresas').create(data)
export const updateEmpresa = (id: string, data: Record<string, any>) =>
  pb.collection('com_empresas').update(id, data)
export const deleteEmpresa = (id: string) => pb.collection('com_empresas').delete(id)

export const getNegocios = (): Promise<RecordModel[]> =>
  pb.collection('com_negocios').getFullList({ expand: 'empresa_id,equipe_id', sort: '-created' })
export const createNegocio = (data: Record<string, any>) =>
  pb.collection('com_negocios').create(data)
export const updateNegocio = (id: string, data: Record<string, any>) =>
  pb.collection('com_negocios').update(id, data)
export const deleteNegocio = (id: string) => pb.collection('com_negocios').delete(id)
