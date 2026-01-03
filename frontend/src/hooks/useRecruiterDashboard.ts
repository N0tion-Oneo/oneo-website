import { useState, useEffect, useCallback } from 'react'
import api from '@/services/api'

// =============================================================================
// Types
// =============================================================================

export interface TodaysBooking {
  id: string
  scheduled_at: string
  duration_minutes: number
  meeting_type_name: string
  attendee_name: string
  attendee_email: string | null
  status: string
  location_type: string
  join_link: string | null
  location: string | null
  organizer_name: string | null
  organizer_id: number | null
}

export interface TodaysInterview {
  id: string
  scheduled_at: string
  company_name: string | null
  interviewer_name: string | null
  candidate_name: string
  candidate_id: number | null
  job_title: string
  job_id: string
  stage_name: string
  status: string
  is_past: boolean
}

export interface InvitationItem {
  token: string
  email: string
  name?: string
  created_at: string
  created_by_name: string | null
  expires_at: string
  used_at: string | null
  used_by_name: string | null
  has_booking?: boolean
  is_expired: boolean
}

export interface InvitationsSummary {
  client: {
    pending: InvitationItem[]
    pending_count: number
    completed: InvitationItem[]
    completed_count: number
  }
  candidate: {
    pending: InvitationItem[]
    pending_count: number
    completed: InvitationItem[]
    completed_count: number
  }
}

export interface NewApplication {
  id: string
  candidate_name: string
  candidate_id: number | null
  job_title: string
  job_id: string
  company_name: string | null
  applied_at: string
}

export interface JobPipeline {
  job_id: string
  job_title: string
  company_name: string | null
  positions_to_fill: number
  hired_count: number
  remaining_positions: number
  status_counts: {
    applied: number
    shortlisted: number
    in_progress: number
    offer_made: number
    offer_accepted: number
    rejected: number
  }
  total_applications: number
}

export interface PipelineOverview {
  jobs: JobPipeline[]
  summary: {
    total_jobs: number
    open_positions: number
    offers_pending: number
  }
}

export interface ActivityItem {
  type: 'stage_change' | 'note_added' | 'suggestion'
  activity_type?: string
  candidate_name: string
  candidate_id: number | null
  job_title?: string | null
  job_id?: string | null
  performed_by: string
  details: Record<string, unknown>
  created_at: string
}

export type TimeFilter = '24h' | '7d' | '30d' | 'all'

// =============================================================================
// Today's Bookings Hook
// =============================================================================

interface UseTodaysBookingsReturn {
  upcoming: TodaysBooking[]
  past: TodaysBooking[]
  totalToday: number
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useTodaysBookings(): UseTodaysBookingsReturn {
  const [upcoming, setUpcoming] = useState<TodaysBooking[]>([])
  const [past, setPast] = useState<TodaysBooking[]>([])
  const [totalToday, setTotalToday] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBookings = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await api.get('/dashboard/todays-bookings/')
      setUpcoming(response.data.upcoming)
      setPast(response.data.past)
      setTotalToday(response.data.total_today)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bookings')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBookings()
  }, [fetchBookings])

  return { upcoming, past, totalToday, isLoading, error, refetch: fetchBookings }
}

// =============================================================================
// Today's Interviews Hook
// =============================================================================

interface UseTodaysInterviewsReturn {
  interviews: TodaysInterview[]
  totalToday: number
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useTodaysInterviews(): UseTodaysInterviewsReturn {
  const [interviews, setInterviews] = useState<TodaysInterview[]>([])
  const [totalToday, setTotalToday] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchInterviews = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await api.get('/dashboard/todays-interviews/')
      setInterviews(response.data.interviews)
      setTotalToday(response.data.total_today)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load interviews')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchInterviews()
  }, [fetchInterviews])

  return { interviews, totalToday, isLoading, error, refetch: fetchInterviews }
}

// =============================================================================
// Invitations Hook
// =============================================================================

interface UseInvitationsSummaryReturn {
  data: InvitationsSummary | null
  isLoading: boolean
  error: string | null
  refetch: (timeFilter?: TimeFilter) => Promise<void>
}

export function useInvitationsSummary(initialTimeFilter: TimeFilter = '7d'): UseInvitationsSummaryReturn {
  const [data, setData] = useState<InvitationsSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchInvitations = useCallback(async (timeFilter: TimeFilter = initialTimeFilter) => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await api.get('/dashboard/invitations/', {
        params: { time_filter: timeFilter },
      })
      setData(response.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invitations')
    } finally {
      setIsLoading(false)
    }
  }, [initialTimeFilter])

  useEffect(() => {
    fetchInvitations()
  }, [fetchInvitations])

  return { data, isLoading, error, refetch: fetchInvitations }
}

// =============================================================================
// New Applications Hook
// =============================================================================

interface UseNewApplicationsReturn {
  applications: NewApplication[]
  totalCount: number
  isLoading: boolean
  error: string | null
  refetch: (timeFilter?: TimeFilter) => Promise<void>
}

export function useNewApplications(initialTimeFilter: TimeFilter = 'all'): UseNewApplicationsReturn {
  const [applications, setApplications] = useState<NewApplication[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchApplications = useCallback(async (timeFilter: TimeFilter = initialTimeFilter) => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await api.get('/dashboard/new-applications/', {
        params: { time_filter: timeFilter },
      })
      setApplications(response.data.applications)
      setTotalCount(response.data.total_count)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load applications')
    } finally {
      setIsLoading(false)
    }
  }, [initialTimeFilter])

  useEffect(() => {
    fetchApplications()
  }, [fetchApplications])

  return { applications, totalCount, isLoading, error, refetch: fetchApplications }
}

// =============================================================================
// Pipeline Overview Hook
// =============================================================================

interface UsePipelineOverviewReturn {
  data: PipelineOverview | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function usePipelineOverview(): UsePipelineOverviewReturn {
  const [data, setData] = useState<PipelineOverview | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPipeline = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await api.get('/dashboard/pipeline/')
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
// Recent Activity Hook
// =============================================================================

interface UseRecentActivityReturn {
  activities: ActivityItem[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useRecentActivity(limit: number = 10): UseRecentActivityReturn {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchActivity = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await api.get('/dashboard/recent-activity/', {
        params: { limit },
      })
      setActivities(response.data.activities)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load activity')
    } finally {
      setIsLoading(false)
    }
  }, [limit])

  useEffect(() => {
    fetchActivity()
  }, [fetchActivity])

  return { activities, isLoading, error, refetch: fetchActivity }
}
