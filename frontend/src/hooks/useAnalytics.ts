import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'
import type {
  AnalyticsOverview,
  PipelineFunnelResponse,
  RecruiterPerformanceResponse,
  TimeMetricsResponse,
  AnalyticsTrendsResponse,
  OnboardingEntityType,
  OnboardingOverviewResponse,
  OnboardingTimeInStageResponse,
  OnboardingFunnelResponse,
  OnboardingTrendsResponse,
  OnboardingBottlenecksResponse,
} from '@/types'

interface AnalyticsParams {
  startDate: string
  endDate: string
  companyId?: string
  jobId?: string
}

interface TrendsParams extends AnalyticsParams {
  metric?: 'applications' | 'hires' | 'offers' | 'shortlisted'
  granularity?: 'day' | 'week' | 'month'
}

// Fetch analytics overview
export function useAnalyticsOverview({ startDate, endDate, companyId }: AnalyticsParams) {
  return useQuery({
    queryKey: ['analytics', 'overview', startDate, endDate, companyId],
    queryFn: async () => {
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
      })
      if (companyId) params.append('company_id', companyId)

      const response = await api.get<AnalyticsOverview>(
        `/jobs/analytics/overview/?${params.toString()}`
      )
      return response.data
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Fetch pipeline funnel data
export function usePipelineFunnel({ startDate, endDate, companyId, jobId }: AnalyticsParams) {
  return useQuery({
    queryKey: ['analytics', 'funnel', startDate, endDate, companyId, jobId],
    queryFn: async () => {
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
      })
      if (companyId) params.append('company_id', companyId)
      if (jobId) params.append('job_id', jobId)

      const response = await api.get<PipelineFunnelResponse>(
        `/jobs/analytics/pipeline-funnel/?${params.toString()}`
      )
      return response.data
    },
    staleTime: 5 * 60 * 1000,
  })
}

// Fetch recruiter performance metrics
export function useRecruiterPerformance({
  startDate,
  endDate,
  companyId,
}: AnalyticsParams) {
  return useQuery({
    queryKey: ['analytics', 'recruiter-performance', startDate, endDate, companyId],
    queryFn: async () => {
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
      })
      if (companyId) params.append('company_id', companyId)

      const response = await api.get<RecruiterPerformanceResponse>(
        `/jobs/analytics/recruiter-performance/?${params.toString()}`
      )
      return response.data
    },
    staleTime: 5 * 60 * 1000,
  })
}

// Fetch time metrics
export function useTimeMetrics({ startDate, endDate, companyId, jobId }: AnalyticsParams) {
  return useQuery({
    queryKey: ['analytics', 'time-metrics', startDate, endDate, companyId, jobId],
    queryFn: async () => {
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
      })
      if (companyId) params.append('company_id', companyId)
      if (jobId) params.append('job_id', jobId)

      const response = await api.get<TimeMetricsResponse>(
        `/jobs/analytics/time-metrics/?${params.toString()}`
      )
      return response.data
    },
    staleTime: 5 * 60 * 1000,
  })
}

// Fetch trend data for charts
export function useAnalyticsTrends({
  startDate,
  endDate,
  companyId,
  metric = 'applications',
  granularity = 'day',
}: TrendsParams) {
  return useQuery({
    queryKey: ['analytics', 'trends', startDate, endDate, companyId, metric, granularity],
    queryFn: async () => {
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
        metric,
        granularity,
      })
      if (companyId) params.append('company_id', companyId)

      const response = await api.get<AnalyticsTrendsResponse>(
        `/jobs/analytics/trends/?${params.toString()}`
      )
      return response.data
    },
    staleTime: 5 * 60 * 1000,
  })
}

// Helper to calculate date range from preset
export function getDateRangeFromPreset(
  preset: 'last7days' | 'last30days' | 'last90days' | 'thisMonth' | 'lastMonth'
): { startDate: string; endDate: string } {
  const now = new Date()
  const endDate = now.toISOString().split('T')[0]
  let startDate: string

  switch (preset) {
    case 'last7days':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]
      break
    case 'last30days':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]
      break
    case 'last90days':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]
      break
    case 'thisMonth': {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
      startDate = firstDay.toISOString().split('T')[0]
      break
    }
    case 'lastMonth': {
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
      startDate = lastMonthStart.toISOString().split('T')[0]
      return {
        startDate,
        endDate: lastMonthEnd.toISOString().split('T')[0],
      }
    }
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]
  }

  return { startDate, endDate }
}

// =============================================
// Onboarding Analytics Hooks
// =============================================

interface OnboardingAnalyticsParams {
  entityType: OnboardingEntityType
  startDate: string
  endDate: string
}

interface OnboardingTrendsParams extends OnboardingAnalyticsParams {
  metric?: 'new' | 'completed'
}

// Fetch onboarding overview (stage distribution, completion rate)
export function useOnboardingOverview({ entityType, startDate, endDate }: OnboardingAnalyticsParams) {
  return useQuery({
    queryKey: ['onboarding-analytics', 'overview', entityType, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
      })
      const response = await api.get<OnboardingOverviewResponse>(
        `/analytics/${entityType}/overview/?${params.toString()}`
      )
      return response.data
    },
    staleTime: 5 * 60 * 1000,
  })
}

// Fetch time spent in each stage
export function useOnboardingTimeInStage({ entityType, startDate, endDate }: OnboardingAnalyticsParams) {
  return useQuery({
    queryKey: ['onboarding-analytics', 'time-in-stage', entityType, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
      })
      const response = await api.get<OnboardingTimeInStageResponse>(
        `/analytics/${entityType}/time-in-stage/?${params.toString()}`
      )
      return response.data
    },
    staleTime: 5 * 60 * 1000,
  })
}

// Fetch onboarding funnel data
export function useOnboardingFunnel({ entityType, startDate, endDate }: OnboardingAnalyticsParams) {
  return useQuery({
    queryKey: ['onboarding-analytics', 'funnel', entityType, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
      })
      const response = await api.get<OnboardingFunnelResponse>(
        `/analytics/${entityType}/funnel/?${params.toString()}`
      )
      return response.data
    },
    staleTime: 5 * 60 * 1000,
  })
}

// Fetch onboarding trends (new or completed over time)
export function useOnboardingTrends({
  entityType,
  startDate,
  endDate,
  metric = 'new',
}: OnboardingTrendsParams) {
  return useQuery({
    queryKey: ['onboarding-analytics', 'trends', entityType, startDate, endDate, metric],
    queryFn: async () => {
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
        metric,
      })
      const response = await api.get<OnboardingTrendsResponse>(
        `/analytics/${entityType}/trends/?${params.toString()}`
      )
      return response.data
    },
    staleTime: 5 * 60 * 1000,
  })
}

// Fetch onboarding bottlenecks
export function useOnboardingBottlenecks({ entityType }: { entityType: OnboardingEntityType }) {
  return useQuery({
    queryKey: ['onboarding-analytics', 'bottlenecks', entityType],
    queryFn: async () => {
      const response = await api.get<OnboardingBottlenecksResponse>(
        `/analytics/${entityType}/bottlenecks/`
      )
      return response.data
    },
    staleTime: 5 * 60 * 1000,
  })
}
