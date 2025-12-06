import { useState, useEffect, useCallback } from 'react'
import api from '@/services/api'
import type { ProfileSuggestion, ProfileSuggestionCreate } from '@/types'

// ============================================================================
// Admin Suggestions Hook (for admin/recruiter managing suggestions)
// ============================================================================

interface UseAdminSuggestionsReturn {
  suggestions: ProfileSuggestion[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  createSuggestion: (data: ProfileSuggestionCreate) => Promise<ProfileSuggestion>
  reopenSuggestion: (suggestionId: string) => Promise<ProfileSuggestion>
  closeSuggestion: (suggestionId: string) => Promise<ProfileSuggestion>
  isCreating: boolean
  isUpdating: boolean
}

export function useAdminSuggestions(candidateId: number | null): UseAdminSuggestionsReturn {
  const [suggestions, setSuggestions] = useState<ProfileSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  const fetchSuggestions = useCallback(async () => {
    if (!candidateId) return

    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get<ProfileSuggestion[]>(
        `/admin/candidates/${candidateId}/suggestions/`
      )
      setSuggestions(response.data)
    } catch (err) {
      setError('Failed to load suggestions')
      console.error('Error fetching suggestions:', err)
    } finally {
      setIsLoading(false)
    }
  }, [candidateId])

  useEffect(() => {
    if (candidateId) {
      fetchSuggestions()
    } else {
      setSuggestions([])
    }
  }, [candidateId, fetchSuggestions])

  const createSuggestion = useCallback(
    async (data: ProfileSuggestionCreate): Promise<ProfileSuggestion> => {
      if (!candidateId) throw new Error('Candidate ID is required')

      setIsCreating(true)
      setError(null)
      try {
        const response = await api.post<ProfileSuggestion>(
          `/admin/candidates/${candidateId}/suggestions/create/`,
          data
        )
        setSuggestions((prev) => [response.data, ...prev])
        return response.data
      } catch (err: unknown) {
        const errorMessage =
          (err as { response?: { data?: { error?: string } } })?.response?.data
            ?.error || 'Failed to create suggestion'
        setError(errorMessage)
        throw new Error(errorMessage)
      } finally {
        setIsCreating(false)
      }
    },
    [candidateId]
  )

  const reopenSuggestion = useCallback(
    async (suggestionId: string): Promise<ProfileSuggestion> => {
      if (!candidateId) throw new Error('Candidate ID is required')

      setIsUpdating(true)
      setError(null)
      try {
        const response = await api.post<ProfileSuggestion>(
          `/admin/candidates/${candidateId}/suggestions/${suggestionId}/reopen/`
        )
        setSuggestions((prev) =>
          prev.map((s) => (s.id === suggestionId ? response.data : s))
        )
        return response.data
      } catch (err: unknown) {
        const errorMessage =
          (err as { response?: { data?: { error?: string } } })?.response?.data
            ?.error || 'Failed to reopen suggestion'
        setError(errorMessage)
        throw new Error(errorMessage)
      } finally {
        setIsUpdating(false)
      }
    },
    [candidateId]
  )

  const closeSuggestion = useCallback(
    async (suggestionId: string): Promise<ProfileSuggestion> => {
      if (!candidateId) throw new Error('Candidate ID is required')

      setIsUpdating(true)
      setError(null)
      try {
        const response = await api.post<ProfileSuggestion>(
          `/admin/candidates/${candidateId}/suggestions/${suggestionId}/close/`
        )
        setSuggestions((prev) =>
          prev.map((s) => (s.id === suggestionId ? response.data : s))
        )
        return response.data
      } catch (err: unknown) {
        const errorMessage =
          (err as { response?: { data?: { error?: string } } })?.response?.data
            ?.error || 'Failed to close suggestion'
        setError(errorMessage)
        throw new Error(errorMessage)
      } finally {
        setIsUpdating(false)
      }
    },
    [candidateId]
  )

  return {
    suggestions,
    isLoading,
    error,
    refetch: fetchSuggestions,
    createSuggestion,
    reopenSuggestion,
    closeSuggestion,
    isCreating,
    isUpdating,
  }
}

// ============================================================================
// Candidate Suggestions Hook (for candidates viewing/resolving suggestions)
// ============================================================================

interface UseCandidateSuggestionsReturn {
  suggestions: ProfileSuggestion[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  resolveSuggestion: (suggestionId: string) => Promise<ProfileSuggestion>
  declineSuggestion: (suggestionId: string, reason: string) => Promise<ProfileSuggestion>
  isUpdating: boolean
  pendingCount: number
}

export function useCandidateSuggestions(): UseCandidateSuggestionsReturn {
  const [suggestions, setSuggestions] = useState<ProfileSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  const fetchSuggestions = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get<ProfileSuggestion[]>(
        '/candidates/me/suggestions/'
      )
      setSuggestions(response.data)
    } catch (err) {
      setError('Failed to load suggestions')
      console.error('Error fetching suggestions:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSuggestions()
  }, [fetchSuggestions])

  const resolveSuggestion = useCallback(
    async (suggestionId: string): Promise<ProfileSuggestion> => {
      setIsUpdating(true)
      setError(null)
      try {
        const response = await api.post<ProfileSuggestion>(
          `/candidates/me/suggestions/${suggestionId}/resolve/`
        )
        setSuggestions((prev) => prev.filter((s) => s.id !== suggestionId))
        return response.data
      } catch (err: unknown) {
        const errorMessage =
          (err as { response?: { data?: { error?: string } } })?.response?.data
            ?.error || 'Failed to resolve suggestion'
        setError(errorMessage)
        throw new Error(errorMessage)
      } finally {
        setIsUpdating(false)
      }
    },
    []
  )

  const declineSuggestion = useCallback(
    async (suggestionId: string, reason: string): Promise<ProfileSuggestion> => {
      setIsUpdating(true)
      setError(null)
      try {
        const response = await api.post<ProfileSuggestion>(
          `/candidates/me/suggestions/${suggestionId}/decline/`,
          { reason }
        )
        setSuggestions((prev) => prev.filter((s) => s.id !== suggestionId))
        return response.data
      } catch (err: unknown) {
        const errorMessage =
          (err as { response?: { data?: { error?: string } } })?.response?.data
            ?.error || 'Failed to decline suggestion'
        setError(errorMessage)
        throw new Error(errorMessage)
      } finally {
        setIsUpdating(false)
      }
    },
    []
  )

  return {
    suggestions,
    isLoading,
    error,
    refetch: fetchSuggestions,
    resolveSuggestion,
    declineSuggestion,
    isUpdating,
    pendingCount: suggestions.filter((s) => s.status === 'pending').length,
  }
}
