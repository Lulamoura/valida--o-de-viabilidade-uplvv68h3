import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'

export function useIsSuperAdmin() {
  const { user, isAuthenticated } = useAuth()
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setIsSuperAdmin(false)
      setLoading(false)
      return
    }

    const perfilId = user.perfil_id
    if (!perfilId || typeof perfilId !== 'string') {
      setIsSuperAdmin(false)
      setLoading(false)
      return
    }

    pb.collection('com_perfis')
      .getOne(perfilId)
      .then((profile) => {
        setIsSuperAdmin(profile?.slug === 'superadministrador')
      })
      .catch(() => setIsSuperAdmin(false))
      .finally(() => setLoading(false))
  }, [isAuthenticated, user])

  return { isSuperAdmin, loading }
}
