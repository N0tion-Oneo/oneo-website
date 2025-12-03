import { useState, useEffect, useCallback } from 'react'
import api from '@/services/api'
import type {
  Application,
  CandidateApplication,
  ApplicationListItem,
  ApplicationStatus,
} from '@/types'

// ============================================================================
// Apply to Job Hook
// ============================================================================

interface ApplyToJobInput {
  job_id: string
  covering_statement?: string
  resume_url?: string
}

interface UseApplyToJobReturn {
  apply: (input: ApplyToJobInput) => Promise<Application>
  isLoading: boolean
  error: string | null
}

export function useApplyToJob(): UseApplyToJobReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const apply = useCallback(async (input: ApplyToJobInput): Promise<Application> => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await api.post<Application>('/jobs/applications/', input)
      return response.data
    } catch (err: unknown) {
      const errorMessage = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to apply'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { apply, isLoading, error }
}

// ============================================================================
// Candidate's Applications Hook
// ============================================================================

interface UseMyApplicationsFilters {
  status?: ApplicationStatus
}

interface UseMyApplicationsReturn {
  applications: CandidateApplication[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useMyApplications(filters: UseMyApplicationsFilters = {}): UseMyApplicationsReturn {
  const [applications, setApplications] = useState<CandidateApplication[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchApplications = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (filters.status) params.append('status', filters.status)

      const response = await api.get<CandidateApplication[]>(
        `/jobs/applications/my/?${params.toString()}`
      )
      setApplications(response.data)
    } catch (err) {
      setError('Failed to load applications')
      console.error('Error fetching applications:', err)
    } finally {
      setIsLoading(false)
    }
  }, [filters.status])

  useEffect(() => {
    fetchApplications()
  }, [fetchApplications])

  return { applications, isLoading, error, refetch: fetchApplications }
}

// ============================================================================
// Single Application Hook
// ============================================================================

interface UseApplicationReturn {
  application: Application | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useApplication(applicationId: string): UseApplicationReturn {
  const [application, setApplication] = useState<Application | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchApplication = useCallback(async () => {
    if (!applicationId) return

    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get<Application>(`/jobs/applications/${applicationId}/`)
      setApplication(response.data)
    } catch (err) {
      setError('Failed to load application')
      console.error('Error fetching application:', err)
    } finally {
      setIsLoading(false)
    }
  }, [applicationId])

  useEffect(() => {
    fetchApplication()
  }, [fetchApplication])

  return { application, isLoading, error, refetch: fetchApplication }
}

// ============================================================================
// Withdraw Application Hook
// ============================================================================

interface UseWithdrawApplicationReturn {
  withdraw: (applicationId: string) => Promise<void>
  isLoading: boolean
  error: string | null
}

export function useWithdrawApplication(): UseWithdrawApplicationReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const withdraw = useCallback(async (applicationId: string): Promise<void> => {
    setIsLoading(true)
    setError(null)
    try {
      await api.delete(`/jobs/applications/${applicationId}/withdraw/`)
    } catch (err: unknown) {
      const errorMessage = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to withdraw'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { withdraw, isLoading, error }
}

// ============================================================================
// Job Applications Hook (Company/Recruiter View)
// ============================================================================

interface UseJobApplicationsFilters {
  status?: ApplicationStatus
  stage?: number
}

interface UseJobApplicationsReturn {
  applications: ApplicationListItem[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useJobApplications(
  jobId: string,
  filters: UseJobApplicationsFilters = {}
): UseJobApplicationsReturn {
  const [applications, setApplications] = useState<ApplicationListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchApplications = useCallback(async (isRefetch = false) => {
    if (!jobId) return

    // Only show loading spinner on initial load, not on refetch
    if (!isRefetch) {
      setIsLoading(true)
    }
    setError(null)
    try {
      const params = new URLSearchParams()
      if (filters.status) params.append('status', filters.status)
      if (filters.stage !== undefined) params.append('stage', String(filters.stage))

      const response = await api.get<ApplicationListItem[]>(
        `/jobs/${jobId}/applications/?${params.toString()}`
      )
      setApplications(response.data)
    } catch (err) {
      setError('Failed to load applications')
      console.error('Error fetching job applications:', err)
    } finally {
      setIsLoading(false)
    }
  }, [jobId, filters.status, filters.stage])

  useEffect(() => {
    fetchApplications(false)
  }, [fetchApplications])

  // Refetch function that doesn't trigger loading state
  const refetch = useCallback(() => {
    return fetchApplications(true)
  }, [fetchApplications])

  return { applications, isLoading, error, refetch }
}

// ============================================================================
// Advance Application Hook
// ============================================================================

interface AdvanceApplicationInput {
  notes?: string
}

interface UseAdvanceApplicationReturn {
  advance: (applicationId: string, input?: AdvanceApplicationInput) => Promise<Application>
  isLoading: boolean
  error: string | null
}

export function useAdvanceApplication(): UseAdvanceApplicationReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const advance = useCallback(async (
    applicationId: string,
    input: AdvanceApplicationInput = {}
  ): Promise<Application> => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await api.post<Application>(
        `/jobs/applications/${applicationId}/advance/`,
        input
      )
      return response.data
    } catch (err: unknown) {
      const errorMessage = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to advance'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { advance, isLoading, error }
}

// ============================================================================
// Shortlist Application Hook
// ============================================================================

interface UseShortlistApplicationReturn {
  shortlist: (applicationId: string) => Promise<Application>
  isLoading: boolean
  error: string | null
}

export function useShortlistApplication(): UseShortlistApplicationReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const shortlist = useCallback(async (applicationId: string): Promise<Application> => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await api.post<Application>(
        `/jobs/applications/${applicationId}/shortlist/`
      )
      return response.data
    } catch (err: unknown) {
      const errorMessage = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to shortlist'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { shortlist, isLoading, error }
}

// ============================================================================
// Reject Application Hook
// ============================================================================

interface RejectApplicationInput {
  rejection_reason: string
  rejection_feedback?: string
}

interface UseRejectApplicationReturn {
  reject: (applicationId: string, input: RejectApplicationInput) => Promise<Application>
  isLoading: boolean
  error: string | null
}

export function useRejectApplication(): UseRejectApplicationReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reject = useCallback(async (
    applicationId: string,
    input: RejectApplicationInput
  ): Promise<Application> => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await api.post<Application>(
        `/jobs/applications/${applicationId}/reject/`,
        input
      )
      return response.data
    } catch (err: unknown) {
      const errorMessage = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to reject'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { reject, isLoading, error }
}

// ============================================================================
// Make Offer Hook
// ============================================================================

interface OfferDetailsInput {
  salary?: number | null
  currency?: string
  start_date?: string | null
  notes?: string
  benefits?: string
  equity?: string
}

interface MakeOfferInput {
  offer_details: OfferDetailsInput
}

interface UseMakeOfferReturn {
  makeOffer: (applicationId: string, input: MakeOfferInput) => Promise<Application>
  isLoading: boolean
  error: string | null
}

export function useMakeOffer(): UseMakeOfferReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const makeOffer = useCallback(async (
    applicationId: string,
    input: MakeOfferInput
  ): Promise<Application> => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await api.post<Application>(
        `/jobs/applications/${applicationId}/offer/`,
        input
      )
      return response.data
    } catch (err: unknown) {
      const errorMessage = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to make offer'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { makeOffer, isLoading, error }
}

// ============================================================================
// Accept Offer Hook
// ============================================================================

interface AcceptOfferInput {
  final_offer_details?: OfferDetailsInput
  notes?: string
}

interface UseAcceptOfferReturn {
  acceptOffer: (applicationId: string, input?: AcceptOfferInput) => Promise<Application>
  isLoading: boolean
  error: string | null
}

export function useAcceptOffer(): UseAcceptOfferReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const acceptOffer = useCallback(async (
    applicationId: string,
    input: AcceptOfferInput = {}
  ): Promise<Application> => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await api.post<Application>(
        `/jobs/applications/${applicationId}/accept/`,
        input
      )
      return response.data
    } catch (err: unknown) {
      const errorMessage = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to accept offer'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { acceptOffer, isLoading, error }
}

// ============================================================================
// Move to Stage Hook
// ============================================================================

interface MoveToStageInput {
  stage_order: number
}

interface UseMoveToStageReturn {
  moveToStage: (applicationId: string, input: MoveToStageInput) => Promise<Application>
  isLoading: boolean
  error: string | null
}

export function useMoveToStage(): UseMoveToStageReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const moveToStage = useCallback(async (
    applicationId: string,
    input: MoveToStageInput
  ): Promise<Application> => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await api.post<Application>(
        `/jobs/applications/${applicationId}/move/`,
        input
      )
      return response.data
    } catch (err: unknown) {
      const errorMessage = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to move application'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { moveToStage, isLoading, error }
}

// ============================================================================
// Update Application Notes Hook
// ============================================================================

interface UpdateNotesInput {
  feedback?: string
  stage_notes?: Record<string, { notes: string; updated_at: string }>
}

interface UseUpdateApplicationNotesReturn {
  updateNotes: (applicationId: string, input: UpdateNotesInput) => Promise<Application>
  isLoading: boolean
  error: string | null
}

export function useUpdateApplicationNotes(): UseUpdateApplicationNotesReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateNotes = useCallback(async (
    applicationId: string,
    input: UpdateNotesInput
  ): Promise<Application> => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await api.patch<Application>(
        `/jobs/applications/${applicationId}/notes/`,
        input
      )
      return response.data
    } catch (err: unknown) {
      const errorMessage = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to update notes'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { updateNotes, isLoading, error }
}
