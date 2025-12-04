import { useState, useEffect, useCallback } from 'react'
import api from '@/services/api'
import type { QuestionTemplate, QuestionTemplateInput } from '@/types'

// ============================================================================
// List Question Templates Hook
// ============================================================================

interface UseQuestionTemplatesFilters {
  is_active?: boolean
  company_id?: string
}

interface UseQuestionTemplatesReturn {
  templates: QuestionTemplate[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useQuestionTemplates(
  filters: UseQuestionTemplatesFilters = {}
): UseQuestionTemplatesReturn {
  const [templates, setTemplates] = useState<QuestionTemplate[]>([])
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
      if (filters.company_id) {
        params.append('company_id', filters.company_id)
      }

      const response = await api.get<QuestionTemplate[]>(
        `/companies/my/question-templates/?${params.toString()}`
      )
      setTemplates(response.data)
    } catch (err) {
      setError('Failed to load question templates')
      console.error('Error fetching question templates:', err)
    } finally {
      setIsLoading(false)
    }
  }, [filters.is_active, filters.company_id])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  return { templates, isLoading, error, refetch: fetchTemplates }
}

// ============================================================================
// Single Question Template Hook
// ============================================================================

interface UseQuestionTemplateReturn {
  template: QuestionTemplate | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useQuestionTemplate(templateId: string): UseQuestionTemplateReturn {
  const [template, setTemplate] = useState<QuestionTemplate | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTemplate = useCallback(async () => {
    if (!templateId) return

    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get<QuestionTemplate>(
        `/companies/my/question-templates/${templateId}/`
      )
      setTemplate(response.data)
    } catch (err) {
      setError('Failed to load question template')
      console.error('Error fetching question template:', err)
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
// Create Question Template Hook
// ============================================================================

interface UseCreateQuestionTemplateReturn {
  createTemplate: (input: QuestionTemplateInput) => Promise<QuestionTemplate>
  isCreating: boolean
  error: string | null
}

export function useCreateQuestionTemplate(): UseCreateQuestionTemplateReturn {
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createTemplate = useCallback(
    async (input: QuestionTemplateInput): Promise<QuestionTemplate> => {
      setIsCreating(true)
      setError(null)
      try {
        const response = await api.post<QuestionTemplate>(
          '/companies/my/question-templates/',
          input
        )
        return response.data
      } catch (err: unknown) {
        const errorMessage =
          (err as { response?: { data?: { error?: string } } })?.response?.data
            ?.error || 'Failed to create template'
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
// Update Question Template Hook
// ============================================================================

interface UseUpdateQuestionTemplateReturn {
  updateTemplate: (
    templateId: string,
    input: Partial<QuestionTemplateInput>
  ) => Promise<QuestionTemplate>
  isUpdating: boolean
  error: string | null
}

export function useUpdateQuestionTemplate(): UseUpdateQuestionTemplateReturn {
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateTemplate = useCallback(
    async (
      templateId: string,
      input: Partial<QuestionTemplateInput>
    ): Promise<QuestionTemplate> => {
      setIsUpdating(true)
      setError(null)
      try {
        const response = await api.patch<QuestionTemplate>(
          `/companies/my/question-templates/${templateId}/`,
          input
        )
        return response.data
      } catch (err: unknown) {
        const errorMessage =
          (err as { response?: { data?: { error?: string } } })?.response?.data
            ?.error || 'Failed to update template'
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
// Delete Question Template Hook
// ============================================================================

interface UseDeleteQuestionTemplateReturn {
  deleteTemplate: (templateId: string) => Promise<void>
  isDeleting: boolean
  error: string | null
}

export function useDeleteQuestionTemplate(): UseDeleteQuestionTemplateReturn {
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deleteTemplate = useCallback(async (templateId: string): Promise<void> => {
    setIsDeleting(true)
    setError(null)
    try {
      await api.delete(`/companies/my/question-templates/${templateId}/`)
    } catch (err: unknown) {
      const errorMessage =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || 'Failed to delete template'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsDeleting(false)
    }
  }, [])

  return { deleteTemplate, isDeleting, error }
}
