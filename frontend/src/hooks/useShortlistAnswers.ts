import { useState, useEffect, useCallback } from 'react'
import api from '@/services/api'
import type {
  ShortlistQuestion,
  ShortlistAnswer,
  ShortlistAnswerInput,
  ShortlistReviewSummary,
} from '@/types'

// ============================================================================
// Get Job Shortlist Questions Hook
// ============================================================================

interface UseShortlistQuestionsReturn {
  questions: ShortlistQuestion[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useShortlistQuestions(
  jobId: string | null
): UseShortlistQuestionsReturn {
  const [questions, setQuestions] = useState<ShortlistQuestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchQuestions = useCallback(async () => {
    if (!jobId) {
      setQuestions([])
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get<ShortlistQuestion[]>(
        `/jobs/${jobId}/shortlist-questions/`
      )
      setQuestions(response.data)
    } catch (err) {
      setError('Failed to load shortlist questions')
      console.error('Error fetching shortlist questions:', err)
    } finally {
      setIsLoading(false)
    }
  }, [jobId])

  useEffect(() => {
    fetchQuestions()
  }, [fetchQuestions])

  return { questions, isLoading, error, refetch: fetchQuestions }
}

// ============================================================================
// Bulk Update Shortlist Questions Hook
// ============================================================================

interface UseBulkUpdateShortlistQuestionsReturn {
  updateQuestions: (
    jobId: string,
    questions: ShortlistQuestion[]
  ) => Promise<ShortlistQuestion[]>
  isUpdating: boolean
  error: string | null
}

export function useBulkUpdateShortlistQuestions(): UseBulkUpdateShortlistQuestionsReturn {
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateQuestions = useCallback(
    async (
      jobId: string,
      questions: ShortlistQuestion[]
    ): Promise<ShortlistQuestion[]> => {
      setIsUpdating(true)
      setError(null)
      try {
        const response = await api.put<ShortlistQuestion[]>(
          `/jobs/${jobId}/shortlist-questions/bulk/`,
          { questions }
        )
        return response.data
      } catch (err: unknown) {
        const errorMessage =
          (err as { response?: { data?: { error?: string } } })?.response?.data
            ?.error || 'Failed to update shortlist questions'
        setError(errorMessage)
        throw new Error(errorMessage)
      } finally {
        setIsUpdating(false)
      }
    },
    []
  )

  return { updateQuestions, isUpdating, error }
}

// ============================================================================
// Get All Shortlist Answers for Application Hook
// ============================================================================

interface UseShortlistAnswersReturn {
  answers: ShortlistAnswer[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useShortlistAnswers(
  applicationId: string | null
): UseShortlistAnswersReturn {
  const [answers, setAnswers] = useState<ShortlistAnswer[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAnswers = useCallback(async () => {
    if (!applicationId) {
      setAnswers([])
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get<ShortlistAnswer[]>(
        `/jobs/applications/${applicationId}/shortlist-answers/`
      )
      setAnswers(response.data)
    } catch (err) {
      setError('Failed to load shortlist answers')
      console.error('Error fetching shortlist answers:', err)
    } finally {
      setIsLoading(false)
    }
  }, [applicationId])

  useEffect(() => {
    fetchAnswers()
  }, [fetchAnswers])

  return { answers, isLoading, error, refetch: fetchAnswers }
}

// ============================================================================
// Get Current User's Shortlist Answers Hook
// ============================================================================

interface UseMyShortlistAnswersReturn {
  answers: ShortlistAnswer[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useMyShortlistAnswers(
  applicationId: string | null
): UseMyShortlistAnswersReturn {
  const [answers, setAnswers] = useState<ShortlistAnswer[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAnswers = useCallback(async () => {
    if (!applicationId) {
      setAnswers([])
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get<ShortlistAnswer[]>(
        `/jobs/applications/${applicationId}/shortlist-answers/my/`
      )
      setAnswers(response.data)
    } catch (err) {
      setError('Failed to load your shortlist answers')
      console.error('Error fetching my shortlist answers:', err)
    } finally {
      setIsLoading(false)
    }
  }, [applicationId])

  useEffect(() => {
    fetchAnswers()
  }, [fetchAnswers])

  return { answers, isLoading, error, refetch: fetchAnswers }
}

// ============================================================================
// Submit Shortlist Answers Hook
// ============================================================================

interface UseSubmitShortlistAnswersReturn {
  submitAnswers: (
    applicationId: string,
    answers: ShortlistAnswerInput[]
  ) => Promise<ShortlistAnswer[]>
  isSubmitting: boolean
  error: string | null
}

export function useSubmitShortlistAnswers(): UseSubmitShortlistAnswersReturn {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submitAnswers = useCallback(
    async (
      applicationId: string,
      answers: ShortlistAnswerInput[]
    ): Promise<ShortlistAnswer[]> => {
      setIsSubmitting(true)
      setError(null)
      try {
        const response = await api.post<ShortlistAnswer[]>(
          `/jobs/applications/${applicationId}/shortlist-answers/`,
          { answers }
        )
        return response.data
      } catch (err: unknown) {
        const errorMessage =
          (err as { response?: { data?: { error?: string } } })?.response?.data
            ?.error || 'Failed to submit shortlist answers'
        setError(errorMessage)
        throw new Error(errorMessage)
      } finally {
        setIsSubmitting(false)
      }
    },
    []
  )

  return { submitAnswers, isSubmitting, error }
}

// ============================================================================
// Get Shortlist Review Summary Hook
// ============================================================================

interface UseShortlistReviewSummaryReturn {
  summary: ShortlistReviewSummary | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useShortlistReviewSummary(
  applicationId: string | null
): UseShortlistReviewSummaryReturn {
  const [summary, setSummary] = useState<ShortlistReviewSummary | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSummary = useCallback(async () => {
    if (!applicationId) {
      setSummary(null)
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get<ShortlistReviewSummary>(
        `/jobs/applications/${applicationId}/shortlist-summary/`
      )
      setSummary(response.data)
    } catch (err) {
      setError('Failed to load shortlist review summary')
      console.error('Error fetching shortlist review summary:', err)
    } finally {
      setIsLoading(false)
    }
  }, [applicationId])

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary])

  return { summary, isLoading, error, refetch: fetchSummary }
}
