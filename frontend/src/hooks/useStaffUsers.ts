import { useState, useCallback, useEffect } from 'react'
import api from '@/services/api'
import type { StaffUser } from '@/types'

interface UseStaffUsersReturn {
  staffUsers: StaffUser[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useStaffUsers(): UseStaffUsersReturn {
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStaffUsers = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await api.get('/staff/')
      setStaffUsers(response.data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load staff users'
      setError(message)
      console.error('Error fetching staff users:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStaffUsers()
  }, [fetchStaffUsers])

  return {
    staffUsers,
    isLoading,
    error,
    refetch: fetchStaffUsers,
  }
}

export default useStaffUsers
