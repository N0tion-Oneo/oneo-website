/**
 * Analytics Types for Recruitment Performance Dashboard
 */

export interface DatePeriod {
  start_date: string
  end_date: string
}

export interface AnalyticsOverview {
  period: DatePeriod
  summary: {
    total_applications: number
    total_shortlisted: number
    total_offered: number
    total_hired: number
    avg_time_to_hire_days: number | null
    conversion_rate: number
  }
  comparison: {
    applications_change: number
    hires_change: number
  }
}

export interface FunnelStage {
  stage: string
  count: number
  percentage: number
}

export interface ConversionRates {
  applied_to_shortlisted: number
  shortlisted_to_interviewed: number
  interviewed_to_offered: number
  offered_to_hired: number
  overall: number
}

export interface PipelineFunnelResponse {
  period: DatePeriod
  funnel: FunnelStage[]
  conversion_rates: ConversionRates
}

export interface RecruiterMetrics {
  id: string
  name: string
  email: string
  actions_count: number
  applications_viewed: number
  shortlisted: number
  interviews_scheduled: number
  offers_made: number
  rejections: number
  conversion_rate: number
}

export interface RecruiterPerformanceResponse {
  period: DatePeriod
  recruiters: RecruiterMetrics[]
  totals: {
    actions_count: number
    applications_viewed: number
    shortlisted: number
    interviews_scheduled: number
    offers_made: number
    rejections: number
    conversion_rate: number
  }
}

export interface TimeToHireStats {
  average_days: number | null
  min_days: number | null
  max_days: number | null
  count: number
}

export interface StageDuration {
  stage_name: string
  count: number
}

export interface Bottleneck {
  stage_name: string
  applications_stuck: number
}

export interface TimeMetricsResponse {
  period: DatePeriod
  time_to_hire: TimeToHireStats
  time_to_shortlist_days: number | null
  stage_durations: StageDuration[]
  bottlenecks: Bottleneck[]
}

export interface TrendDataPoint {
  date: string
  count: number
}

export interface AnalyticsTrendsResponse {
  period: DatePeriod
  metric: 'applications' | 'hires' | 'offers' | 'shortlisted'
  granularity: 'day' | 'week' | 'month'
  data: TrendDataPoint[]
}

export type DateRangePreset =
  | 'last7days'
  | 'last30days'
  | 'last90days'
  | 'thisMonth'
  | 'lastMonth'
  | 'custom'

export interface DateRange {
  startDate: string
  endDate: string
  preset?: DateRangePreset
}

/**
 * Onboarding Analytics Types
 */

export type OnboardingEntityType = 'company' | 'candidate'

export interface OnboardingStageDistribution {
  stage_id: number | null
  stage_name: string
  stage_color: string
  is_terminal?: boolean
  count: number
  percentage: number
}

export interface OnboardingOverviewResponse {
  entity_type: OnboardingEntityType
  period: DatePeriod
  summary: {
    total: number
    new_in_period: number
    completed: number
    completion_rate: number
  }
  stage_distribution: OnboardingStageDistribution[]
}

export interface OnboardingTimeInStage {
  stage_id: number
  stage_name: string
  stage_color: string
  is_terminal: boolean
  avg_days: number | null
  min_days: number | null
  max_days: number | null
  sample_size: number
}

export interface OnboardingTimeInStageResponse {
  entity_type: OnboardingEntityType
  period: DatePeriod
  time_in_stage: OnboardingTimeInStage[]
}

export interface OnboardingFunnelStage {
  stage: string
  stage_id?: number
  stage_color?: string
  is_terminal?: boolean
  count: number
  percentage: number
}

export interface OnboardingConversionRate {
  from_stage: string
  to_stage: string
  rate: number
}

export interface OnboardingFunnelResponse {
  entity_type: OnboardingEntityType
  period: DatePeriod
  total_started: number
  funnel: OnboardingFunnelStage[]
  conversion_rates: OnboardingConversionRate[]
}

export interface OnboardingTrendsResponse {
  entity_type: OnboardingEntityType
  period: DatePeriod
  metric: 'new' | 'completed'
  data: TrendDataPoint[]
}

export interface OnboardingBottleneck {
  stage_id: number
  stage_name: string
  stage_color: string
  order: number
  current_count: number
  stale_count: number
  stale_percentage: number
}

export interface OnboardingBottlenecksResponse {
  entity_type: OnboardingEntityType
  bottlenecks: OnboardingBottleneck[]
  stale_threshold_days: number
}
