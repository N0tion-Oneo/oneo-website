import { useState, useEffect, useCallback } from 'react'
import api from '@/services/api'

// =============================================================================
// Types
// =============================================================================

export interface ActiveJob {
  id: string
  title: string
  location: string
  employment_type: string
  created_at: string
  positions_to_fill: number
  hired_count: number
  remaining_positions: number
  total_applications: number
  new_applications: number
  shortlisted_count: number
  in_progress_count: number
  offers_count: number
}

export interface RecentApplication {
  id: string
  candidate_name: string
  candidate_id: number | null
  candidate_headline: string | null
  job_title: string
  job_id: string
  status: string
  applied_at: string
}

export interface UpcomingInterview {
  id: string
  scheduled_at: string
  candidate_name: string
  candidate_id: number | null
  job_title: string
  job_id: string
  stage_name: string
  interviewer_name: string | null
  location_type: string
  meeting_url: string | null
}

export interface PipelineCounts {
  applied: number
  shortlisted: number
  in_progress: number
  offer_made: number
  offer_accepted: number
  rejected: number
}

export interface JobPipelineItem {
  job_id: string
  job_title: string
  counts: PipelineCounts
  total: number
}

export interface PipelineOverview {
  total_pipeline: PipelineCounts
  total_candidates: number
  jobs: JobPipelineItem[]
}

export interface PendingOffer {
  id: string
  candidate_name: string
  candidate_id: number | null
  job_title: string
  job_id: string
  offer_date: string
  days_pending: number
  salary_offered: number | null
}

export interface ProfileCompletion {
  completion_percentage: number
  is_complete: boolean
  missing_fields: string[]
  company_name: string
  company_id: number
}

export interface TeamActivity {
  id: number
  activity_type: string
  candidate_name: string
  candidate_id: number | null
  job_title: string | null
  job_id: string | null
  performed_by: string
  created_at: string
  details: {
    previous_status?: string
    new_status?: string
    stage_name?: string
  }
}

export interface AssignedRecruiter {
  id: number
  name: string
  email: string
  booking_slug: string | null
}

export interface HiringMetrics {
  total_applications: number
  total_jobs: number
  active_jobs: number
  offers_made: number
  offers_accepted: number
  offers_declined: number
  offer_acceptance_rate: number | null
  avg_applications_per_job: number
  time_to_hire_days: number | null
  shortlist_rate: number | null
}

// =============================================================================
// Active Jobs Hook
// =============================================================================

interface UseActiveJobsReturn {
  jobs: ActiveJob[]
  totalActiveJobs: number
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useActiveJobs(): UseActiveJobsReturn {
  const [jobs, setJobs] = useState<ActiveJob[]>([])
  const [totalActiveJobs, setTotalActiveJobs] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchJobs = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await api.get('/client-dashboard/active-jobs/')
      setJobs(response.data.jobs)
      setTotalActiveJobs(response.data.total_active_jobs)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load jobs')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  return { jobs, totalActiveJobs, isLoading, error, refetch: fetchJobs }
}

// =============================================================================
// Recent Applications Hook
// =============================================================================

interface UseRecentApplicationsReturn {
  applications: RecentApplication[]
  totalCount: number
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useClientRecentApplications(): UseRecentApplicationsReturn {
  const [applications, setApplications] = useState<RecentApplication[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchApplications = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await api.get('/client-dashboard/recent-applications/')
      setApplications(response.data.applications)
      setTotalCount(response.data.total_count)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load applications')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchApplications()
  }, [fetchApplications])

  return { applications, totalCount, isLoading, error, refetch: fetchApplications }
}

// =============================================================================
// Upcoming Interviews Hook
// =============================================================================

interface UseUpcomingInterviewsReturn {
  interviews: UpcomingInterview[]
  totalUpcoming: number
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useClientUpcomingInterviews(): UseUpcomingInterviewsReturn {
  const [interviews, setInterviews] = useState<UpcomingInterview[]>([])
  const [totalUpcoming, setTotalUpcoming] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchInterviews = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await api.get('/client-dashboard/upcoming-interviews/')
      setInterviews(response.data.interviews)
      setTotalUpcoming(response.data.total_upcoming)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load interviews')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchInterviews()
  }, [fetchInterviews])

  return { interviews, totalUpcoming, isLoading, error, refetch: fetchInterviews }
}

// =============================================================================
// Pipeline Overview Hook
// =============================================================================

interface UseClientPipelineReturn {
  data: PipelineOverview | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useClientPipeline(): UseClientPipelineReturn {
  const [data, setData] = useState<PipelineOverview | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPipeline = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await api.get('/client-dashboard/pipeline/')
      setData(response.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pipeline')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPipeline()
  }, [fetchPipeline])

  return { data, isLoading, error, refetch: fetchPipeline }
}

// =============================================================================
// Pending Offers Hook
// =============================================================================

interface UsePendingOffersReturn {
  offers: PendingOffer[]
  totalPending: number
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function usePendingOffers(): UsePendingOffersReturn {
  const [offers, setOffers] = useState<PendingOffer[]>([])
  const [totalPending, setTotalPending] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOffers = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await api.get('/client-dashboard/pending-offers/')
      setOffers(response.data.offers)
      setTotalPending(response.data.total_pending)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load offers')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOffers()
  }, [fetchOffers])

  return { offers, totalPending, isLoading, error, refetch: fetchOffers }
}

// =============================================================================
// Profile Completion Hook
// =============================================================================

interface UseProfileCompletionReturn {
  data: ProfileCompletion | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useProfileCompletion(): UseProfileCompletionReturn {
  const [data, setData] = useState<ProfileCompletion | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await api.get('/client-dashboard/profile-completion/')
      setData(response.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile completion')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, isLoading, error, refetch: fetchData }
}

// =============================================================================
// Team Activity Hook
// =============================================================================

interface UseTeamActivityReturn {
  activities: TeamActivity[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useTeamActivity(): UseTeamActivityReturn {
  const [activities, setActivities] = useState<TeamActivity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchActivities = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await api.get('/client-dashboard/team-activity/')
      setActivities(response.data.activities)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load activity')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchActivities()
  }, [fetchActivities])

  return { activities, isLoading, error, refetch: fetchActivities }
}

// =============================================================================
// Assigned Recruiter Hook
// =============================================================================

interface UseAssignedRecruiterReturn {
  recruiters: AssignedRecruiter[]
  hasAssignedRecruiter: boolean
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useAssignedRecruiter(): UseAssignedRecruiterReturn {
  const [recruiters, setRecruiters] = useState<AssignedRecruiter[]>([])
  const [hasAssignedRecruiter, setHasAssignedRecruiter] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRecruiters = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await api.get('/client-dashboard/assigned-recruiter/')
      setRecruiters(response.data.recruiters)
      setHasAssignedRecruiter(response.data.has_assigned_recruiter)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recruiter info')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRecruiters()
  }, [fetchRecruiters])

  return { recruiters, hasAssignedRecruiter, isLoading, error, refetch: fetchRecruiters }
}

// =============================================================================
// Hiring Metrics Hook
// =============================================================================

interface UseHiringMetricsReturn {
  metrics: HiringMetrics | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useHiringMetrics(): UseHiringMetricsReturn {
  const [metrics, setMetrics] = useState<HiringMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMetrics = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await api.get('/client-dashboard/hiring-metrics/')
      setMetrics(response.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load metrics')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMetrics()
  }, [fetchMetrics])

  return { metrics, isLoading, error, refetch: fetchMetrics }
}
