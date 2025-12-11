import { useState, useEffect, useCallback } from 'react'
import api from '@/services/api'
import type {
  ShortlistQuestionTemplate,
  ShortlistQuestionTemplateInput,
} from '@/types'

// ============================================================================
// List Shortlist Templates Hook
// ============================================================================

interface UseShortlistTemplatesFilters {
  is_active?: boolean
}

interface UseShortlistTemplatesReturn {
  templates: ShortlistQuestionTemplate[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useShortlistTemplates(
  filters: UseShortlistTemplatesFilters = {}
): UseShortlistTemplatesReturn {
  const [templates, setTemplates] = useState<ShortlistQuestionTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTemplates = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (filters.is_active !== undefined) {
        params.append('is_active', String(filters.is_active))
      }

      const response = await api.get<ShortlistQuestionTemplate[]>(
        `/companies/my/shortlist-templates/?${params.toString()}`
      )
      setTemplates(response.data)
    } catch (err) {
      setError('Failed to load shortlist templates')
      console.error('Error fetching shortlist templates:', err)
    } finally {
      setIsLoading(false)
    }
  }, [filters.is_active])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  return { templates, isLoading, error, refetch: fetchTemplates }
}

// ============================================================================
// Single Shortlist Template Hook
// ============================================================================

interface UseShortlistTemplateReturn {
  template: ShortlistQuestionTemplate | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useShortlistTemplate(
  templateId: string | null
): UseShortlistTemplateReturn {
  const [template, setTemplate] = useState<ShortlistQuestionTemplate | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTemplate = useCallback(async () => {
    if (!templateId) {
      setTemplate(null)
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get<ShortlistQuestionTemplate>(
        `/companies/my/shortlist-templates/${templateId}/`
      )
      setTemplate(response.data)
    } catch (err) {
      setError('Failed to load shortlist template')
      console.error('Error fetching shortlist template:', err)
    } finally {
      setIsLoading(false)
    }
  }, [templateId])

  useEffect(() => {
    fetchTemplate()
  }, [fetchTemplate])

  return { template, isLoading, error, refetch: fetchTemplate }
}

// ============================================================================
// Create Shortlist Template Hook
// ============================================================================

interface UseCreateShortlistTemplateReturn {
  createTemplate: (
    input: ShortlistQuestionTemplateInput
  ) => Promise<ShortlistQuestionTemplate>
  isCreating: boolean
  error: string | null
}

export function useCreateShortlistTemplate(): UseCreateShortlistTemplateReturn {
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createTemplate = useCallback(
    async (
      input: ShortlistQuestionTemplateInput
    ): Promise<ShortlistQuestionTemplate> => {
      setIsCreating(true)
      setError(null)
      try {
        const response = await api.post<ShortlistQuestionTemplate>(
          '/companies/my/shortlist-templates/',
          input
        )
        return response.data
      } catch (err: unknown) {
        const errorMessage =
          (err as { response?: { data?: { error?: string } } })?.response?.data
            ?.error || 'Failed to create shortlist template'
        setError(errorMessage)
        throw new Error(errorMessage)
      } finally {
        setIsCreating(false)
      }
    },
    []
  )

  return { createTemplate, isCreating, error }
}

// ============================================================================
// Update Shortlist Template Hook
// ============================================================================

interface UseUpdateShortlistTemplateReturn {
  updateTemplate: (
    templateId: string,
    input: Partial<ShortlistQuestionTemplateInput>
  ) => Promise<ShortlistQuestionTemplate>
  isUpdating: boolean
  error: string | null
}

export function useUpdateShortlistTemplate(): UseUpdateShortlistTemplateReturn {
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateTemplate = useCallback(
    async (
      templateId: string,
      input: Partial<ShortlistQuestionTemplateInput>
    ): Promise<ShortlistQuestionTemplate> => {
      setIsUpdating(true)
      setError(null)
      try {
        const response = await api.patch<ShortlistQuestionTemplate>(
          `/companies/my/shortlist-templates/${templateId}/`,
          input
        )
        return response.data
      } catch (err: unknown) {
        const errorMessage =
          (err as { response?: { data?: { error?: string } } })?.response?.data
            ?.error || 'Failed to update shortlist template'
        setError(errorMessage)
        throw new Error(errorMessage)
      } finally {
        setIsUpdating(false)
      }
    },
    []
  )

  return { updateTemplate, isUpdating, error }
}

// ============================================================================
// Delete Shortlist Template Hook
// ============================================================================

interface UseDeleteShortlistTemplateReturn {
  deleteTemplate: (templateId: string) => Promise<void>
  isDeleting: boolean
  error: string | null
}

export function useDeleteShortlistTemplate(): UseDeleteShortlistTemplateReturn {
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deleteTemplate = useCallback(
    async (templateId: string): Promise<void> => {
      setIsDeleting(true)
      setError(null)
      try {
        await api.delete(`/companies/my/shortlist-templates/${templateId}/`)
      } catch (err: unknown) {
        const errorMessage =
          (err as { response?: { data?: { error?: string } } })?.response?.data
            ?.error || 'Failed to delete shortlist template'
        setError(errorMessage)
        throw new Error(errorMessage)
      } finally {
        setIsDeleting(false)
      }
    },
    []
  )

  return { deleteTemplate, isDeleting, error }
}
