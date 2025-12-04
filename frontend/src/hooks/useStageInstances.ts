import { useState, useEffect, useCallback } from 'react'
import api from '@/services/api'
import type {
  ApplicationStageInstance,
  ScheduleStageInput,
  RescheduleStageInput,
  AssignAssessmentInput,
  SubmitAssessmentInput,
  CompleteStageInput,
} from '@/types'

// ============================================================================
// Stage Instances List Hook (for a specific application)
// ============================================================================

interface UseStageInstancesReturn {
  instances: ApplicationStageInstance[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useStageInstances(applicationId: string): UseStageInstancesReturn {
  const [instances, setInstances] = useState<ApplicationStageInstance[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchInstances = useCallback(async () => {
    if (!applicationId) return

    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get<ApplicationStageInstance[]>(
        `/jobs/applications/${applicationId}/stages/`
      )
      setInstances(response.data)
    } catch (err) {
      setError('Failed to load stage instances')
      console.error('Error fetching stage instances:', err)
    } finally {
      setIsLoading(false)
    }
  }, [applicationId])

  useEffect(() => {
    fetchInstances()
  }, [fetchInstances])

  return { instances, isLoading, error, refetch: fetchInstances }
}

// ============================================================================
// Single Stage Instance Hook
// ============================================================================

interface UseStageInstanceReturn {
  instance: ApplicationStageInstance | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useStageInstance(
  applicationId: string,
  instanceId: string
): UseStageInstanceReturn {
  const [instance, setInstance] = useState<ApplicationStageInstance | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchInstance = useCallback(async () => {
    if (!applicationId || !instanceId) return

    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get<ApplicationStageInstance>(
        `/jobs/applications/${applicationId}/stages/${instanceId}/`
      )
      setInstance(response.data)
    } catch (err) {
      setError('Failed to load stage instance')
      console.error('Error fetching stage instance:', err)
    } finally {
      setIsLoading(false)
    }
  }, [applicationId, instanceId])

  useEffect(() => {
    fetchInstance()
  }, [fetchInstance])

  return { instance, isLoading, error, refetch: fetchInstance }
}

// ============================================================================
// Schedule Stage Hook
// ============================================================================

interface UseScheduleStageReturn {
  schedule: (
    applicationId: string,
    instanceId: string,
    data: ScheduleStageInput
  ) => Promise<ApplicationStageInstance>
  isScheduling: boolean
  error: string | null
}

export function useScheduleStage(): UseScheduleStageReturn {
  const [isScheduling, setIsScheduling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const schedule = useCallback(
    async (
      applicationId: string,
      instanceId: string,
      data: ScheduleStageInput
    ): Promise<ApplicationStageInstance> => {
      setIsScheduling(true)
      setError(null)
      try {
        const response = await api.post<ApplicationStageInstance>(
          `/jobs/applications/${applicationId}/stages/${instanceId}/schedule/`,
          data
        )
        return response.data
      } catch (err) {
        const axiosError = err as { response?: { data?: { error?: string } } }
        const message = axiosError.response?.data?.error || 'Failed to schedule interview'
        setError(message)
        console.error('Error scheduling stage:', err)
        throw err
      } finally {
        setIsScheduling(false)
      }
    },
    []
  )

  return { schedule, isScheduling, error }
}

// ============================================================================
// Reschedule Stage Hook
// ============================================================================

interface UseRescheduleStageReturn {
  reschedule: (
    applicationId: string,
    instanceId: string,
    data: RescheduleStageInput
  ) => Promise<ApplicationStageInstance>
  isRescheduling: boolean
  error: string | null
}

export function useRescheduleStage(): UseRescheduleStageReturn {
  const [isRescheduling, setIsRescheduling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reschedule = useCallback(
    async (
      applicationId: string,
      instanceId: string,
      data: RescheduleStageInput
    ): Promise<ApplicationStageInstance> => {
      setIsRescheduling(true)
      setError(null)
      try {
        const response = await api.patch<ApplicationStageInstance>(
          `/jobs/applications/${applicationId}/stages/${instanceId}/reschedule/`,
          data
        )
        return response.data
      } catch (err) {
        const axiosError = err as { response?: { data?: { error?: string } } }
        const message = axiosError.response?.data?.error || 'Failed to reschedule interview'
        setError(message)
        console.error('Error rescheduling stage:', err)
        throw err
      } finally {
        setIsRescheduling(false)
      }
    },
    []
  )

  return { reschedule, isRescheduling, error }
}

// ============================================================================
// Cancel Stage Hook
// ============================================================================

interface UseCancelStageReturn {
  cancel: (
    applicationId: string,
    instanceId: string,
    reason?: string
  ) => Promise<ApplicationStageInstance>
  isCancelling: boolean
  error: string | null
}

export function useCancelStage(): UseCancelStageReturn {
  const [isCancelling, setIsCancelling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cancel = useCallback(
    async (
      applicationId: string,
      instanceId: string,
      reason?: string
    ): Promise<ApplicationStageInstance> => {
      setIsCancelling(true)
      setError(null)
      try {
        const response = await api.post<ApplicationStageInstance>(
          `/jobs/applications/${applicationId}/stages/${instanceId}/cancel/`,
          { reason }
        )
        return response.data
      } catch (err) {
        const axiosError = err as { response?: { data?: { error?: string } } }
        const message = axiosError.response?.data?.error || 'Failed to cancel interview'
        setError(message)
        console.error('Error cancelling stage:', err)
        throw err
      } finally {
        setIsCancelling(false)
      }
    },
    []
  )

  return { cancel, isCancelling, error }
}

// ============================================================================
// Complete Stage Hook
// ============================================================================

interface UseCompleteStageReturn {
  complete: (
    applicationId: string,
    instanceId: string,
    data?: CompleteStageInput
  ) => Promise<ApplicationStageInstance>
  isCompleting: boolean
  error: string | null
}

export function useCompleteStage(): UseCompleteStageReturn {
  const [isCompleting, setIsCompleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const complete = useCallback(
    async (
      applicationId: string,
      instanceId: string,
      data?: CompleteStageInput
    ): Promise<ApplicationStageInstance> => {
      setIsCompleting(true)
      setError(null)
      try {
        const response = await api.post<ApplicationStageInstance>(
          `/jobs/applications/${applicationId}/stages/${instanceId}/complete/`,
          data || {}
        )
        return response.data
      } catch (err) {
        const axiosError = err as { response?: { data?: { error?: string } } }
        const message = axiosError.response?.data?.error || 'Failed to complete stage'
        setError(message)
        console.error('Error completing stage:', err)
        throw err
      } finally {
        setIsCompleting(false)
      }
    },
    []
  )

  return { complete, isCompleting, error }
}

// ============================================================================
// Reopen Stage Hook (undo complete/cancel)
// ============================================================================

interface UseReopenStageReturn {
  reopen: (
    applicationId: string,
    instanceId: string
  ) => Promise<ApplicationStageInstance>
  isReopening: boolean
  error: string | null
}

export function useReopenStage(): UseReopenStageReturn {
  const [isReopening, setIsReopening] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reopen = useCallback(
    async (
      applicationId: string,
      instanceId: string
    ): Promise<ApplicationStageInstance> => {
      setIsReopening(true)
      setError(null)
      try {
        const response = await api.post<ApplicationStageInstance>(
          `/jobs/applications/${applicationId}/stages/${instanceId}/reopen/`
        )
        return response.data
      } catch (err) {
        const axiosError = err as { response?: { data?: { error?: string } } }
        const message = axiosError.response?.data?.error || 'Failed to reopen stage'
        setError(message)
        console.error('Error reopening stage:', err)
        throw err
      } finally {
        setIsReopening(false)
      }
    },
    []
  )

  return { reopen, isReopening, error }
}

// ============================================================================
// Assign Assessment Hook
// ============================================================================

interface UseAssignAssessmentReturn {
  assign: (
    applicationId: string,
    instanceId: string,
    data: AssignAssessmentInput
  ) => Promise<ApplicationStageInstance>
  isAssigning: boolean
  error: string | null
}

export function useAssignAssessment(): UseAssignAssessmentReturn {
  const [isAssigning, setIsAssigning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const assign = useCallback(
    async (
      applicationId: string,
      instanceId: string,
      data: AssignAssessmentInput
    ): Promise<ApplicationStageInstance> => {
      setIsAssigning(true)
      setError(null)
      try {
        const response = await api.post<ApplicationStageInstance>(
          `/jobs/applications/${applicationId}/stages/${instanceId}/assign-assessment/`,
          data
        )
        return response.data
      } catch (err) {
        const axiosError = err as { response?: { data?: { error?: string } } }
        const message = axiosError.response?.data?.error || 'Failed to assign assessment'
        setError(message)
        console.error('Error assigning assessment:', err)
        throw err
      } finally {
        setIsAssigning(false)
      }
    },
    []
  )

  return { assign, isAssigning, error }
}

// ============================================================================
// Submit Assessment Hook (for candidates)
// ============================================================================

interface UseSubmitAssessmentReturn {
  submit: (
    applicationId: string,
    instanceId: string,
    data: SubmitAssessmentInput
  ) => Promise<ApplicationStageInstance>
  isSubmitting: boolean
  error: string | null
}

export function useSubmitAssessment(): UseSubmitAssessmentReturn {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = useCallback(
    async (
      applicationId: string,
      instanceId: string,
      data: SubmitAssessmentInput
    ): Promise<ApplicationStageInstance> => {
      setIsSubmitting(true)
      setError(null)
      try {
        // Use FormData for file uploads
        const formData = new FormData()
        if (data.submission_url) {
          formData.append('submission_url', data.submission_url)
        }
        if (data.submission_file) {
          formData.append('submission_file', data.submission_file)
        }

        const response = await api.post<ApplicationStageInstance>(
          `/jobs/applications/${applicationId}/stages/${instanceId}/submit/`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        )
        return response.data
      } catch (err) {
        const axiosError = err as { response?: { data?: { error?: string } } }
        const message = axiosError.response?.data?.error || 'Failed to submit assessment'
        setError(message)
        console.error('Error submitting assessment:', err)
        throw err
      } finally {
        setIsSubmitting(false)
      }
    },
    []
  )

  return { submit, isSubmitting, error }
}

// ============================================================================
// Move to Stage Template Hook
// ============================================================================

interface UseMoveToStageTemplateReturn {
  moveToStageTemplate: (applicationId: string, templateId: string) => Promise<ApplicationStageInstance>
  isMoving: boolean
  error: string | null
}

export function useMoveToStageTemplate(): UseMoveToStageTemplateReturn {
  const [isMoving, setIsMoving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const moveToStageTemplate = useCallback(
    async (applicationId: string, templateId: string): Promise<ApplicationStageInstance> => {
      setIsMoving(true)
      setError(null)
      try {
        const response = await api.post<ApplicationStageInstance>(
          `/jobs/applications/${applicationId}/move-to/${templateId}/`
        )
        return response.data
      } catch (err) {
        const axiosError = err as { response?: { data?: { error?: string } } }
        const message = axiosError.response?.data?.error || 'Failed to move to stage'
        setError(message)
        console.error('Error moving to stage:', err)
        throw err
      } finally {
        setIsMoving(false)
      }
    },
    []
  )

  return { moveToStageTemplate, isMoving, error }
}

// ============================================================================
// Job Interviewers Hook (for scheduling dropdown)
// ============================================================================

export interface Interviewer {
  id: string
  first_name: string
  last_name: string
  full_name: string
  email: string
  role: string
  has_calendar: boolean
}

interface UseJobInterviewersReturn {
  interviewers: Interviewer[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useJobInterviewers(jobId: string): UseJobInterviewersReturn {
  const [interviewers, setInterviewers] = useState<Interviewer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchInterviewers = useCallback(async () => {
    if (!jobId) return

    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get<Interviewer[]>(`/jobs/${jobId}/interviewers/`)
      setInterviewers(response.data)
    } catch (err) {
      setError('Failed to load interviewers')
      console.error('Error fetching interviewers:', err)
    } finally {
      setIsLoading(false)
    }
  }, [jobId])

  useEffect(() => {
    fetchInterviewers()
  }, [fetchInterviewers])

  return { interviewers, isLoading, error, refetch: fetchInterviewers }
}
