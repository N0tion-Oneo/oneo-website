import { useState, useCallback, useEffect } from 'react'
import api from '@/services/api'
import type { RecruiterProfile, RecruiterProfileUpdate } from '@/types'

interface UseRecruiterProfileReturn {
  profile: RecruiterProfile | null
  isLoading: boolean
  error: string | null
  updateProfile: (data: RecruiterProfileUpdate) => Promise<void>
  isUpdating: boolean
  refetch: () => Promise<void>
}

export function useRecruiterProfile(): UseRecruiterProfileReturn {
  const [profile, setProfile] = useState<RecruiterProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchProfile = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await api.get('/recruiter/profile/')
      setProfile(response.data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load profile'
      setError(message)
      console.error('Error fetching recruiter profile:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const updateProfile = useCallback(async (data: RecruiterProfileUpdate) => {
    try {
      setIsUpdating(true)
      setError(null)
      const response = await api.patch('/recruiter/profile/update/', data)
      setProfile(response.data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update profile'
      setError(message)
      throw err
    } finally {
      setIsUpdating(false)
    }
  }, [])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  return {
    profile,
    isLoading,
    error,
    updateProfile,
    isUpdating,
    refetch: fetchProfile,
  }
}

export default useRecruiterProfile
