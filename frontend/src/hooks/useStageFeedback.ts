import { useState, useEffect, useCallback } from 'react'
import api from '@/services/api'
import type { StageFeedback, StageFeedbackCreateInput, StageFeedbackUpdateInput } from '@/types'
import { StageFeedbackType } from '@/types'

// ============================================================================
// Fetch All Feedback for an Application
// ============================================================================

interface UseApplicationFeedbackReturn {
  feedbacks: StageFeedback[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useApplicationFeedback(applicationId: string | null): UseApplicationFeedbackReturn {
  const [feedbacks, setFeedbacks] = useState<StageFeedback[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchFeedback = useCallback(async () => {
    if (!applicationId) {
      setFeedbacks([])
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get<StageFeedback[]>(
        `/jobs/applications/${applicationId}/feedback/`
      )
      setFeedbacks(response.data)
    } catch (err) {
      const axiosError = err as { response?: { data?: { error?: string } } }
      setError(axiosError.response?.data?.error || 'Failed to fetch feedback')
    } finally {
      setIsLoading(false)
    }
  }, [applicationId])

  useEffect(() => {
    fetchFeedback()
  }, [fetchFeedback])

  return { feedbacks, isLoading, error, refetch: fetchFeedback }
}

// ============================================================================
// Fetch Feedback by Stage Type (Applied/Shortlisted)
// ============================================================================

interface UseStatusFeedbackReturn {
  feedbacks: StageFeedback[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useStatusFeedback(
  applicationId: string | null,
  stageType: StageFeedbackType.APPLIED | StageFeedbackType.SHORTLISTED
): UseStatusFeedbackReturn {
  const [feedbacks, setFeedbacks] = useState<StageFeedback[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchFeedback = useCallback(async () => {
    if (!applicationId) {
      setFeedbacks([])
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get<StageFeedback[]>(
        `/jobs/applications/${applicationId}/status/${stageType}/feedback/`
      )
      setFeedbacks(response.data)
    } catch (err) {
      const axiosError = err as { response?: { data?: { error?: string } } }
      setError(axiosError.response?.data?.error || 'Failed to fetch feedback')
    } finally {
      setIsLoading(false)
    }
  }, [applicationId, stageType])

  useEffect(() => {
    fetchFeedback()
  }, [fetchFeedback])

  return { feedbacks, isLoading, error, refetch: fetchFeedback }
}

// ============================================================================
// Fetch Feedback for a Stage Instance
// ============================================================================

interface UseStageInstanceFeedbackReturn {
  feedbacks: StageFeedback[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useStageInstanceFeedback(
  applicationId: string | null,
  instanceId: string | null
): UseStageInstanceFeedbackReturn {
  const [feedbacks, setFeedbacks] = useState<StageFeedback[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchFeedback = useCallback(async () => {
    if (!applicationId || !instanceId) {
      setFeedbacks([])
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get<StageFeedback[]>(
        `/jobs/applications/${applicationId}/stages/${instanceId}/feedbacks/`
      )
      setFeedbacks(response.data)
    } catch (err) {
      const axiosError = err as { response?: { data?: { error?: string } } }
      setError(axiosError.response?.data?.error || 'Failed to fetch feedback')
    } finally {
      setIsLoading(false)
    }
  }, [applicationId, instanceId])

  useEffect(() => {
    fetchFeedback()
  }, [fetchFeedback])

  return { feedbacks, isLoading, error, refetch: fetchFeedback }
}

// ============================================================================
// Create Feedback
// ============================================================================

interface UseCreateFeedbackReturn {
  createFeedback: (applicationId: string, input: StageFeedbackCreateInput) => Promise<StageFeedback>
  isCreating: boolean
  error: string | null
}

export function useCreateFeedback(): UseCreateFeedbackReturn {
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createFeedback = useCallback(async (
    applicationId: string,
    input: StageFeedbackCreateInput
  ): Promise<StageFeedback> => {
    setIsCreating(true)
    setError(null)
    try {
      const response = await api.post<StageFeedback>(
        `/jobs/applications/${applicationId}/feedback/`,
        input
      )
      return response.data
    } catch (err) {
      const axiosError = err as { response?: { data?: { error?: string } } }
      const message = axiosError.response?.data?.error || 'Failed to create feedback'
      setError(message)
      throw new Error(message)
    } finally {
      setIsCreating(false)
    }
  }, [])

  return { createFeedback, isCreating, error }
}

// ============================================================================
// Update Feedback
// ============================================================================

interface UseUpdateFeedbackReturn {
  updateFeedback: (applicationId: string, feedbackId: string, input: StageFeedbackUpdateInput) => Promise<StageFeedback>
  isUpdating: boolean
  error: string | null
}

export function useUpdateFeedback(): UseUpdateFeedbackReturn {
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateFeedback = useCallback(async (
    applicationId: string,
    feedbackId: string,
    input: StageFeedbackUpdateInput
  ): Promise<StageFeedback> => {
    setIsUpdating(true)
    setError(null)
    try {
      const response = await api.patch<StageFeedback>(
        `/jobs/applications/${applicationId}/feedback/${feedbackId}/`,
        input
      )
      return response.data
    } catch (err) {
      const axiosError = err as { response?: { data?: { error?: string } } }
      const message = axiosError.response?.data?.error || 'Failed to update feedback'
      setError(message)
      throw new Error(message)
    } finally {
      setIsUpdating(false)
    }
  }, [])

  return { updateFeedback, isUpdating, error }
}

// ============================================================================
// Delete Feedback
// ============================================================================

interface UseDeleteFeedbackReturn {
  deleteFeedback: (applicationId: string, feedbackId: string) => Promise<void>
  isDeleting: boolean
  error: string | null
}

export function useDeleteFeedback(): UseDeleteFeedbackReturn {
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deleteFeedback = useCallback(async (
    applicationId: string,
    feedbackId: string
  ): Promise<void> => {
    setIsDeleting(true)
    setError(null)
    try {
      await api.delete(`/jobs/applications/${applicationId}/feedback/${feedbackId}/`)
    } catch (err) {
      const axiosError = err as { response?: { data?: { error?: string } } }
      const message = axiosError.response?.data?.error || 'Failed to delete feedback'
      setError(message)
      throw new Error(message)
    } finally {
      setIsDeleting(false)
    }
  }, [])

  return { deleteFeedback, isDeleting, error }
}
