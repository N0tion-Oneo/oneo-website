import { useState, useEffect, useCallback } from 'react'
import api from '@/services/api'
import type { InterviewStageTemplate, InterviewStageTemplateInput } from '@/types'

// ============================================================================
// Stage Templates List Hook (for a specific job)
// ============================================================================

interface UseStageTemplatesReturn {
  templates: InterviewStageTemplate[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useStageTemplates(jobId: string): UseStageTemplatesReturn {
  const [templates, setTemplates] = useState<InterviewStageTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTemplates = useCallback(async () => {
    if (!jobId) return

    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get<InterviewStageTemplate[]>(`/jobs/${jobId}/stages/`)
      setTemplates(response.data)
    } catch (err) {
      setError('Failed to load interview stages')
      console.error('Error fetching stage templates:', err)
    } finally {
      setIsLoading(false)
    }
  }, [jobId])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  return { templates, isLoading, error, refetch: fetchTemplates }
}

// ============================================================================
// Create Stage Template Hook
// ============================================================================

interface UseCreateStageTemplateReturn {
  createTemplate: (jobId: string, data: InterviewStageTemplateInput) => Promise<InterviewStageTemplate>
  isCreating: boolean
  error: string | null
}

export function useCreateStageTemplate(): UseCreateStageTemplateReturn {
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createTemplate = useCallback(
    async (jobId: string, data: InterviewStageTemplateInput): Promise<InterviewStageTemplate> => {
      setIsCreating(true)
      setError(null)
      try {
        const response = await api.post<InterviewStageTemplate>(`/jobs/${jobId}/stages/`, data)
        return response.data
      } catch (err) {
        const axiosError = err as { response?: { data?: { error?: string } } }
        const message = axiosError.response?.data?.error || 'Failed to create stage'
        setError(message)
        console.error('Error creating stage template:', err)
        throw err
      } finally {
        setIsCreating(false)
      }
    },
    []
  )

  return { createTemplate, isCreating, error }
}

// ============================================================================
// Update Stage Template Hook
// ============================================================================

interface UseUpdateStageTemplateReturn {
  updateTemplate: (
    jobId: string,
    templateId: string,
    data: Partial<InterviewStageTemplateInput>
  ) => Promise<InterviewStageTemplate>
  isUpdating: boolean
  error: string | null
}

export function useUpdateStageTemplate(): UseUpdateStageTemplateReturn {
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateTemplate = useCallback(
    async (
      jobId: string,
      templateId: string,
      data: Partial<InterviewStageTemplateInput>
    ): Promise<InterviewStageTemplate> => {
      setIsUpdating(true)
      setError(null)
      try {
        const response = await api.patch<InterviewStageTemplate>(
          `/jobs/${jobId}/stages/${templateId}/`,
          data
        )
        return response.data
      } catch (err) {
        const axiosError = err as { response?: { data?: { error?: string } } }
        const message = axiosError.response?.data?.error || 'Failed to update stage'
        setError(message)
        console.error('Error updating stage template:', err)
        throw err
      } finally {
        setIsUpdating(false)
      }
    },
    []
  )

  return { updateTemplate, isUpdating, error }
}

// ============================================================================
// Delete Stage Template Hook
// ============================================================================

interface UseDeleteStageTemplateReturn {
  deleteTemplate: (jobId: string, templateId: string) => Promise<void>
  isDeleting: boolean
  error: string | null
}

export function useDeleteStageTemplate(): UseDeleteStageTemplateReturn {
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deleteTemplate = useCallback(
    async (jobId: string, templateId: string): Promise<void> => {
      setIsDeleting(true)
      setError(null)
      try {
        await api.delete(`/jobs/${jobId}/stages/${templateId}/`)
      } catch (err) {
        const axiosError = err as { response?: { data?: { error?: string } } }
        const message = axiosError.response?.data?.error || 'Failed to delete stage'
        setError(message)
        console.error('Error deleting stage template:', err)
        throw err
      } finally {
        setIsDeleting(false)
      }
    },
    []
  )

  return { deleteTemplate, isDeleting, error }
}

// ============================================================================
// Bulk Update Stage Templates Hook
// ============================================================================

interface UseBulkUpdateStageTemplatesReturn {
  bulkUpdate: (jobId: string, templates: InterviewStageTemplateInput[]) => Promise<InterviewStageTemplate[]>
  isUpdating: boolean
  error: string | null
}

export function useBulkUpdateStageTemplates(): UseBulkUpdateStageTemplatesReturn {
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const bulkUpdate = useCallback(
    async (jobId: string, templates: InterviewStageTemplateInput[]): Promise<InterviewStageTemplate[]> => {
      setIsUpdating(true)
      setError(null)
      try {
        const response = await api.post<InterviewStageTemplate[]>(
          `/jobs/${jobId}/stages/bulk/`,
          { stages: templates }
        )
        return response.data
      } catch (err) {
        const axiosError = err as { response?: { data?: { error?: string } } }
        const message = axiosError.response?.data?.error || 'Failed to update stages'
        setError(message)
        console.error('Error bulk updating stage templates:', err)
        throw err
      } finally {
        setIsUpdating(false)
      }
    },
    []
  )

  return { bulkUpdate, isUpdating, error }
}

// ============================================================================
// Reorder Stage Templates Hook
// ============================================================================

interface UseReorderStageTemplatesReturn {
  reorder: (jobId: string, templateIds: string[]) => Promise<InterviewStageTemplate[]>
  isReordering: boolean
  error: string | null
}

export function useReorderStageTemplates(): UseReorderStageTemplatesReturn {
  const [isReordering, setIsReordering] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reorder = useCallback(
    async (jobId: string, templateIds: string[]): Promise<InterviewStageTemplate[]> => {
      setIsReordering(true)
      setError(null)
      try {
        const response = await api.post<InterviewStageTemplate[]>(
          `/jobs/${jobId}/stages/reorder/`,
          { stage_ids: templateIds }
        )
        return response.data
      } catch (err) {
        const axiosError = err as { response?: { data?: { error?: string } } }
        const message = axiosError.response?.data?.error || 'Failed to reorder stages'
        setError(message)
        console.error('Error reordering stage templates:', err)
        throw err
      } finally {
        setIsReordering(false)
      }
    },
    []
  )

  return { reorder, isReordering, error }
}
