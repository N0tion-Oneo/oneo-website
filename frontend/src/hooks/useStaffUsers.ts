import { useState, useCallback, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'
import type { StaffUser } from '@/types'

// ============================================================================
// Query Keys - Centralized for cache invalidation
// ============================================================================

export const staffKeys = {
  all: ['staff'] as const,
  list: () => [...staffKeys.all, 'list'] as const,
  profiles: (includeArchived?: boolean) => [...staffKeys.all, 'profiles', { includeArchived }] as const,
  profile: (userId: string) => [...staffKeys.all, 'profile', userId] as const,
}

// ============================================================================
// API Functions
// ============================================================================

async function fetchStaffUsers(): Promise<StaffUser[]> {
  const response = await api.get('/staff/')
  return response.data
}

interface UseStaffUsersReturn {
  staffUsers: StaffUser[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export interface UpdateStaffUserData {
  role?: 'admin' | 'recruiter'
  first_name?: string
  last_name?: string
  phone?: string
}

// Types for staff with full profile data
export interface StaffProfileCountry {
  id: number
  name: string
  code: string
}

export interface StaffProfileCity {
  id: number
  name: string
}

export interface StaffProfileIndustry {
  id: number
  name: string
}

export interface StaffRecruiterProfile {
  id: string
  professional_title: string
  bio: string
  linkedin_url: string
  years_of_experience: number | null
  timezone: string
  country: StaffProfileCountry | null
  city: StaffProfileCity | null
  industries: StaffProfileIndustry[]
}

export interface StaffUserWithProfile {
  id: string
  email: string
  first_name: string
  last_name: string
  full_name: string
  avatar: string | null
  phone: string | null
  role: 'admin' | 'recruiter'
  is_active: boolean
  archived_at: string | null
  profile: StaffRecruiterProfile | null
}

export interface UpdateStaffProfileData {
  professional_title?: string
  bio?: string
  linkedin_url?: string
  years_of_experience?: number | null
  country_id?: number | null
  city_id?: number | null
  timezone?: string
  industry_ids?: number[]
}

interface UseUpdateStaffUserReturn {
  updateStaffUser: (userId: string, data: UpdateStaffUserData) => Promise<StaffUser>
  isUpdating: boolean
  error: string | null
}

/**
 * Hook to fetch staff users list.
 * Uses React Query with staleTime to prevent duplicate API calls.
 * The data is cached and shared across all components that use this hook.
 */
export function useStaffUsers(): UseStaffUsersReturn {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: staffKeys.list(),
    queryFn: fetchStaffUsers,
    staleTime: 2 * 60 * 1000, // 2 minutes - staff list doesn't change often
    gcTime: 10 * 60 * 1000, // 10 minutes cache
  })

  return {
    staffUsers: data ?? [],
    isLoading,
    error: error ? (error instanceof Error ? error.message : 'Failed to load staff users') : null,
    refetch: async () => { await refetch() },
  }
}

export function useUpdateStaffUser(): UseUpdateStaffUserReturn {
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateStaffUser = useCallback(async (userId: string, data: UpdateStaffUserData): Promise<StaffUser> => {
    try {
      setIsUpdating(true)
      setError(null)
      const response = await api.patch(`/staff/${userId}/`, data)
      return response.data
    } catch (err: unknown) {
      const message = err instanceof Error
        ? err.message
        : (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to update staff user'
      setError(message)
      throw new Error(message)
    } finally {
      setIsUpdating(false)
    }
  }, [])

  return {
    updateStaffUser,
    isUpdating,
    error,
  }
}

interface UseStaffWithProfilesReturn {
  staffUsers: StaffUserWithProfile[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

interface UseStaffWithProfilesOptions {
  includeArchived?: boolean
}

export function useStaffWithProfiles(options: UseStaffWithProfilesOptions = {}): UseStaffWithProfilesReturn {
  const { includeArchived = false } = options
  const [staffUsers, setStaffUsers] = useState<StaffUserWithProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStaffUsers = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const params = includeArchived ? { include_archived: 'true' } : {}
      const response = await api.get('/staff/profiles/', { params })
      setStaffUsers(response.data)
    } catch (err: unknown) {
      const message = err instanceof Error
        ? err.message
        : (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to load staff users'
      setError(message)
      console.error('Error fetching staff with profiles:', err)
    } finally {
      setIsLoading(false)
    }
  }, [includeArchived])

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

interface UseUpdateStaffProfileReturn {
  updateStaffProfile: (userId: string, data: UpdateStaffProfileData) => Promise<void>
  isUpdating: boolean
  error: string | null
}

export function useUpdateStaffProfile(): UseUpdateStaffProfileReturn {
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateStaffProfile = useCallback(async (userId: string, data: UpdateStaffProfileData): Promise<void> => {
    try {
      setIsUpdating(true)
      setError(null)
      await api.patch(`/staff/${userId}/profile/`, data)
    } catch (err: unknown) {
      const message = err instanceof Error
        ? err.message
        : (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to update profile'
      setError(message)
      throw new Error(message)
    } finally {
      setIsUpdating(false)
    }
  }, [])

  return {
    updateStaffProfile,
    isUpdating,
    error,
  }
}

// Hook to fetch a specific user's recruiter profile (for admin editing)
interface UseStaffRecruiterProfileReturn {
  profile: import('@/types').RecruiterProfile | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useStaffRecruiterProfile(userId: string | null): UseStaffRecruiterProfileReturn {
  const [profile, setProfile] = useState<import('@/types').RecruiterProfile | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchProfile = useCallback(async () => {
    if (!userId) {
      setProfile(null)
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      const response = await api.get(`/recruiters/${userId}/`)
      setProfile(response.data)
    } catch (err: unknown) {
      const message = err instanceof Error
        ? err.message
        : (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to load profile'
      setError(message)
      setProfile(null)
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  return {
    profile,
    isLoading,
    error,
    refetch: fetchProfile,
  }
}

// ============================================================================
// Deactivate Staff User Hook
// ============================================================================

interface DeactivateStaffUserResponse {
  message: string
  user: {
    id: string
    email: string
    full_name: string
    archived_at: string
  }
}

interface UseDeactivateStaffUserReturn {
  deactivateStaffUser: (userId: string) => Promise<DeactivateStaffUserResponse>
  isDeactivating: boolean
  error: string | null
}

export function useDeactivateStaffUser(): UseDeactivateStaffUserReturn {
  const [isDeactivating, setIsDeactivating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deactivateStaffUser = useCallback(async (userId: string): Promise<DeactivateStaffUserResponse> => {
    try {
      setIsDeactivating(true)
      setError(null)
      const response = await api.post(`/staff/${userId}/deactivate/`)
      return response.data
    } catch (err: unknown) {
      const message = err instanceof Error
        ? err.message
        : (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to deactivate staff member'
      setError(message)
      throw new Error(message)
    } finally {
      setIsDeactivating(false)
    }
  }, [])

  return {
    deactivateStaffUser,
    isDeactivating,
    error,
  }
}

// ============================================================================
// Reactivate Staff User Hook
// ============================================================================

interface ReactivateStaffUserResponse {
  message: string
  user: {
    id: string
    email: string
    full_name: string
    role: string
  }
}

interface UseReactivateStaffUserReturn {
  reactivateStaffUser: (userId: string) => Promise<ReactivateStaffUserResponse>
  isReactivating: boolean
  error: string | null
}

export function useReactivateStaffUser(): UseReactivateStaffUserReturn {
  const [isReactivating, setIsReactivating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reactivateStaffUser = useCallback(async (userId: string): Promise<ReactivateStaffUserResponse> => {
    try {
      setIsReactivating(true)
      setError(null)
      const response = await api.post(`/staff/${userId}/reactivate/`)
      return response.data
    } catch (err: unknown) {
      const message = err instanceof Error
        ? err.message
        : (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to reactivate staff member'
      setError(message)
      throw new Error(message)
    } finally {
      setIsReactivating(false)
    }
  }, [])

  return {
    reactivateStaffUser,
    isReactivating,
    error,
  }
}

export default useStaffUsers
