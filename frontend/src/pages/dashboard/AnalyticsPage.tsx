import { useState } from 'react'
import {
  Users,
  Briefcase,
  Clock,
  TrendingUp,
} from 'lucide-react'
import type { DateRangePreset, OnboardingEntityType } from '@/types'
import {
  useAnalyticsOverview,
  usePipelineFunnel,
  useRecruiterPerformance,
  useTimeMetrics,
  useAnalyticsTrends,
  getDateRangeFromPreset,
  useOnboardingOverview,
  useOnboardingTimeInStage,
  useOnboardingFunnel,
  useOnboardingTrends,
  useOnboardingBottlenecks,
} from '@/hooks'
import {
  StatCard,
  DateRangePicker,
  FunnelChart,
  TrendChart,
  RecruiterPerformanceTable,
  TimeMetricsCard,
  OnboardingStageDistributionChart,
  OnboardingTimeInStageChart,
  OnboardingBottlenecksCard,
  OnboardingFunnelChart,
  OnboardingSummaryCards,
} from '@/components/analytics'

type TabType = 'overview' | 'recruiters' | 'pipeline' | 'time' | 'candidates' | 'companies'

export function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [preset, setPreset] = useState<DateRangePreset>('last30days')
  const [dateRange, setDateRange] = useState(() => getDateRangeFromPreset('last30days'))

  // Handle preset change
  const handlePresetChange = (newPreset: DateRangePreset) => {
    setPreset(newPreset)
    if (newPreset !== 'custom') {
      setDateRange(getDateRangeFromPreset(newPreset as Exclude<DateRangePreset, 'custom'>))
    }
  }

  // Handle custom date change
  const handleCustomDateChange = (startDate: string, endDate: string) => {
    setDateRange({ startDate, endDate })
  }

  // Fetch data
  const { data: overview, isLoading: overviewLoading } = useAnalyticsOverview({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  })

  const { data: funnel, isLoading: funnelLoading } = usePipelineFunnel({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  })

  const { data: recruiterData, isLoading: recruiterLoading } = useRecruiterPerformance({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  })

  const { data: timeMetrics, isLoading: timeLoading } = useTimeMetrics({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  })

  const { data: trendsData, isLoading: trendsLoading } = useAnalyticsTrends({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    metric: 'applications',
    granularity: 'day',
  })

  // Onboarding analytics - candidates
  const { data: candidateOverview, isLoading: candidateOverviewLoading } = useOnboardingOverview({
    entityType: 'candidate',
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  })

  const { data: candidateTimeInStage, isLoading: candidateTimeLoading } = useOnboardingTimeInStage({
    entityType: 'candidate',
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  })

  const { data: candidateFunnel, isLoading: candidateFunnelLoading } = useOnboardingFunnel({
    entityType: 'candidate',
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  })

  const { data: candidateTrends, isLoading: candidateTrendsLoading } = useOnboardingTrends({
    entityType: 'candidate',
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    metric: 'new',
  })

  const { data: candidateBottlenecks, isLoading: candidateBottlenecksLoading } = useOnboardingBottlenecks({
    entityType: 'candidate',
  })

  // Onboarding analytics - companies
  const { data: companyOverview, isLoading: companyOverviewLoading } = useOnboardingOverview({
    entityType: 'company',
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  })

  const { data: companyTimeInStage, isLoading: companyTimeLoading } = useOnboardingTimeInStage({
    entityType: 'company',
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  })

  const { data: companyFunnel, isLoading: companyFunnelLoading } = useOnboardingFunnel({
    entityType: 'company',
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  })

  const { data: companyTrends, isLoading: companyTrendsLoading } = useOnboardingTrends({
    entityType: 'company',
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    metric: 'new',
  })

  const { data: companyBottlenecks, isLoading: companyBottlenecksLoading } = useOnboardingBottlenecks({
    entityType: 'company',
  })

  const tabs: { id: TabType; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'recruiters', label: 'Recruiters' },
    { id: 'pipeline', label: 'Pipeline' },
    { id: 'time', label: 'Time Metrics' },
    { id: 'candidates', label: 'Candidate Onboarding' },
    { id: 'companies', label: 'Company Onboarding' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Analytics</h1>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">
            Recruitment performance insights
          </p>
        </div>
        <DateRangePicker
          startDate={dateRange.startDate}
          endDate={dateRange.endDate}
          preset={preset}
          onPresetChange={handlePresetChange}
          onCustomDateChange={handleCustomDateChange}
        />
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Applications"
          value={overview?.summary.total_applications ?? null}
          icon={Briefcase}
          trend={
            overview?.comparison
              ? {
                  value: overview.comparison.applications_change,
                  direction:
                    overview.comparison.applications_change > 0
                      ? 'up'
                      : overview.comparison.applications_change < 0
                      ? 'down'
                      : 'neutral',
                  label: 'vs prev period',
                }
              : undefined
          }
          loading={overviewLoading}
        />
        <StatCard
          title="Hired"
          value={overview?.summary.total_hired ?? null}
          icon={Users}
          trend={
            overview?.comparison
              ? {
                  value: overview.comparison.hires_change,
                  direction:
                    overview.comparison.hires_change > 0
                      ? 'up'
                      : overview.comparison.hires_change < 0
                      ? 'down'
                      : 'neutral',
                  label: 'vs prev period',
                }
              : undefined
          }
          loading={overviewLoading}
        />
        <StatCard
          title="Time to Hire"
          value={overview?.summary.avg_time_to_hire_days ?? null}
          format="days"
          icon={Clock}
          loading={overviewLoading}
        />
        <StatCard
          title="Conversion Rate"
          value={overview?.summary.conversion_rate ?? null}
          format="percentage"
          icon={TrendingUp}
          loading={overviewLoading}
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-[13px] font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-gray-900 dark:border-gray-100 text-gray-900 dark:text-gray-100'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TrendChart
              data={trendsData?.data || []}
              loading={trendsLoading}
              title="Applications Over Time"
            />
            <FunnelChart
              funnel={funnel?.funnel || []}
              conversionRates={
                funnel?.conversion_rates || {
                  applied_to_shortlisted: 0,
                  shortlisted_to_interviewed: 0,
                  interviewed_to_offered: 0,
                  offered_to_hired: 0,
                  overall: 0,
                }
              }
              loading={funnelLoading}
            />
          </div>
        )}

        {activeTab === 'recruiters' && (
          <RecruiterPerformanceTable
            recruiters={recruiterData?.recruiters || []}
            totals={
              recruiterData?.totals || {
                actions_count: 0,
                applications_viewed: 0,
                shortlisted: 0,
                interviews_scheduled: 0,
                offers_made: 0,
                rejections: 0,
                conversion_rate: 0,
              }
            }
            loading={recruiterLoading}
          />
        )}

        {activeTab === 'pipeline' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <FunnelChart
              funnel={funnel?.funnel || []}
              conversionRates={
                funnel?.conversion_rates || {
                  applied_to_shortlisted: 0,
                  shortlisted_to_interviewed: 0,
                  interviewed_to_offered: 0,
                  offered_to_hired: 0,
                  overall: 0,
                }
              }
              loading={funnelLoading}
            />
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <h3 className="text-[14px] font-medium text-gray-900 dark:text-gray-100 mb-4">
                Conversion Breakdown
              </h3>
              <div className="space-y-4">
                {[
                  {
                    label: 'Applied → Shortlisted',
                    value: funnel?.conversion_rates.applied_to_shortlisted || 0,
                  },
                  {
                    label: 'Shortlisted → Interviewed',
                    value: funnel?.conversion_rates.shortlisted_to_interviewed || 0,
                  },
                  {
                    label: 'Interviewed → Offered',
                    value: funnel?.conversion_rates.interviewed_to_offered || 0,
                  },
                  {
                    label: 'Offered → Hired',
                    value: funnel?.conversion_rates.offered_to_hired || 0,
                  },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[12px] text-gray-600 dark:text-gray-400">{item.label}</span>
                      <span className="text-[12px] font-medium text-gray-900 dark:text-gray-100">
                        {item.value.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(item.value, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'time' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TimeMetricsCard
              timeToHire={
                timeMetrics?.time_to_hire || {
                  average_days: null,
                  min_days: null,
                  max_days: null,
                  count: 0,
                }
              }
              timeToShortlistDays={timeMetrics?.time_to_shortlist_days ?? null}
              bottlenecks={timeMetrics?.bottlenecks || []}
              loading={timeLoading}
            />
            <TrendChart
              data={trendsData?.data || []}
              loading={trendsLoading}
              title="Hiring Activity"
              color="#10B981"
            />
          </div>
        )}

        {activeTab === 'candidates' && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <OnboardingSummaryCards
              total={candidateOverview?.summary.total ?? 0}
              newInPeriod={candidateOverview?.summary.new_in_period ?? 0}
              completed={candidateOverview?.summary.completed ?? 0}
              completionRate={candidateOverview?.summary.completion_rate ?? 0}
              loading={candidateOverviewLoading}
              entityType="candidate"
            />

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <OnboardingStageDistributionChart
                data={candidateOverview?.stage_distribution || []}
                loading={candidateOverviewLoading}
                entityType="candidate"
              />
              <OnboardingFunnelChart
                funnel={candidateFunnel?.funnel || []}
                conversionRates={candidateFunnel?.conversion_rates || []}
                loading={candidateFunnelLoading}
                entityType="candidate"
              />
            </div>

            {/* Time & Bottlenecks Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <OnboardingTimeInStageChart
                data={candidateTimeInStage?.time_in_stage || []}
                loading={candidateTimeLoading}
                entityType="candidate"
              />
              <OnboardingBottlenecksCard
                bottlenecks={candidateBottlenecks?.bottlenecks || []}
                staleThresholdDays={candidateBottlenecks?.stale_threshold_days}
                loading={candidateBottlenecksLoading}
                entityType="candidate"
              />
            </div>

            {/* Trends Chart */}
            <TrendChart
              data={candidateTrends?.data || []}
              loading={candidateTrendsLoading}
              title="New Candidates Over Time"
              color="#8B5CF6"
            />
          </div>
        )}

        {activeTab === 'companies' && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <OnboardingSummaryCards
              total={companyOverview?.summary.total ?? 0}
              newInPeriod={companyOverview?.summary.new_in_period ?? 0}
              completed={companyOverview?.summary.completed ?? 0}
              completionRate={companyOverview?.summary.completion_rate ?? 0}
              loading={companyOverviewLoading}
              entityType="company"
            />

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <OnboardingStageDistributionChart
                data={companyOverview?.stage_distribution || []}
                loading={companyOverviewLoading}
                entityType="company"
              />
              <OnboardingFunnelChart
                funnel={companyFunnel?.funnel || []}
                conversionRates={companyFunnel?.conversion_rates || []}
                loading={companyFunnelLoading}
                entityType="company"
              />
            </div>

            {/* Time & Bottlenecks Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <OnboardingTimeInStageChart
                data={companyTimeInStage?.time_in_stage || []}
                loading={companyTimeLoading}
                entityType="company"
              />
              <OnboardingBottlenecksCard
                bottlenecks={companyBottlenecks?.bottlenecks || []}
                staleThresholdDays={companyBottlenecks?.stale_threshold_days}
                loading={companyBottlenecksLoading}
                entityType="company"
              />
            </div>

            {/* Trends Chart */}
            <TrendChart
              data={companyTrends?.data || []}
              loading={companyTrendsLoading}
              title="New Companies Over Time"
              color="#F59E0B"
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default AnalyticsPage
