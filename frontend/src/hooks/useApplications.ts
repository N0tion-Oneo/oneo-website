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

// ============================================================================
// All Applications Hook (Admin/Recruiter - All Jobs)
// ============================================================================

interface UseAllApplicationsOptions {
  status?: ApplicationStatus
  stage?: number | string
  job?: string
  job_status?: string
  company?: string
  recruiter?: string
  applied_after?: string
  applied_before?: string
  search?: string
  ordering?: string
  page?: number
  page_size?: number
}

interface AllApplicationsResponse {
  results: ApplicationListItem[]
  count: number
  page: number
  page_size: number
  total_pages: number
  has_next: boolean
  has_previous: boolean
}

interface UseAllApplicationsReturn {
  applications: ApplicationListItem[]
  count: number
  page: number
  totalPages: number
  hasNext: boolean
  hasPrevious: boolean
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useAllApplications(options: UseAllApplicationsOptions = {}): UseAllApplicationsReturn {
  const [applications, setApplications] = useState<ApplicationListItem[]>([])
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [hasNext, setHasNext] = useState(false)
  const [hasPrevious, setHasPrevious] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchApplications = useCallback(async (isRefetch = false) => {
    if (!isRefetch) {
      setIsLoading(true)
    }
    setError(null)

    try {
      const params = new URLSearchParams()
      if (options.status) params.append('status', options.status)
      if (options.stage !== undefined && options.stage !== '') params.append('stage', String(options.stage))
      if (options.job) params.append('job', options.job)
      if (options.job_status) params.append('job_status', options.job_status)
      if (options.company) params.append('company', options.company)
      if (options.recruiter) params.append('recruiter', options.recruiter)
      if (options.applied_after) params.append('applied_after', options.applied_after)
      if (options.applied_before) params.append('applied_before', options.applied_before)
      if (options.search) params.append('search', options.search)
      if (options.ordering) params.append('ordering', options.ordering)
      if (options.page) params.append('page', String(options.page))
      if (options.page_size) params.append('page_size', String(options.page_size))

      const response = await api.get<AllApplicationsResponse>(
        `/jobs/applications/all/?${params.toString()}`
      )

      setApplications(response.data.results)
      setCount(response.data.count)
      setPage(response.data.page)
      setTotalPages(response.data.total_pages)
      setHasNext(response.data.has_next)
      setHasPrevious(response.data.has_previous)
    } catch (err) {
      setError('Failed to load applications')
      console.error('Error fetching all applications:', err)
    } finally {
      setIsLoading(false)
    }
  }, [
    options.status,
    options.stage,
    options.job,
    options.job_status,
    options.company,
    options.recruiter,
    options.applied_after,
    options.applied_before,
    options.search,
    options.ordering,
    options.page,
    options.page_size,
  ])

  useEffect(() => {
    fetchApplications(false)
  }, [fetchApplications])

  const refetch = useCallback(() => {
    return fetchApplications(true)
  }, [fetchApplications])

  return {
    applications,
    count,
    page,
    totalPages,
    hasNext,
    hasPrevious,
    isLoading,
    error,
    refetch,
  }
}
