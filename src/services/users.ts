import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'

export const getUsers = (): Promise<RecordModel[]> =>
  pb.collection('users').getFullList({ sort: 'name', expand: 'perfil_id,equipe_id' })

export const getActiveUsers = (): Promise<RecordModel[]> =>
  pb.collection('users').getFullList({ filter: 'ativo_comercial = true', sort: 'name' })

export const createUser = (data: {
  name: string
  email: string
  password: string
  passwordConfirm: string
  perfil_id?: string
  equipe_id?: string
  ativo_comercial?: boolean
}) => pb.collection('users').create(data)

export const changeOwnPassword = (userId: string, oldPassword: string, newPassword: string) =>
  pb.collection('users').update(userId, {
    password: newPassword,
    passwordConfirm: newPassword,
    oldPassword,
  })

export const changeUserPassword = (userId: string, newPassword: string) =>
  pb.collection('users').update(userId, {
    password: newPassword,
    passwordConfirm: newPassword,
  })
