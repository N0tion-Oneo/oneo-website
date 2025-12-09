import type { OnboardingFunnelStage, OnboardingConversionRate } from '@/types'

interface OnboardingFunnelChartProps {
  funnel: OnboardingFunnelStage[]
  conversionRates: OnboardingConversionRate[]
  loading?: boolean
  entityType: 'company' | 'candidate'
}

export function OnboardingFunnelChart({
  funnel,
  conversionRates,
  loading,
  entityType,
}: OnboardingFunnelChartProps) {
  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="h-6 w-48 bg-gray-100 rounded animate-pulse mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 bg-gray-50 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const entityLabel = entityType === 'company' ? 'Companies' : 'Candidates'
  const maxCount = Math.max(...funnel.map((f) => f.count), 1)

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-[14px] font-medium text-gray-900 mb-1">
        Onboarding Funnel
      </h3>
      <p className="text-[12px] text-gray-500 mb-4">
        How {entityLabel.toLowerCase()} progress through onboarding stages
      </p>

      {funnel.length === 0 ? (
        <div className="h-[200px] flex items-center justify-center text-gray-500 text-[13px]">
          No data available
        </div>
      ) : (
        <div className="space-y-2">
          {funnel.map((stage, index) => {
            const widthPercentage = (stage.count / maxCount) * 100
            const conversionRate = conversionRates[index - 1]

            return (
              <div key={stage.stage}>
                {/* Conversion rate arrow */}
                {index > 0 && conversionRate && (
                  <div className="flex items-center justify-center py-1">
                    <div className="flex items-center gap-1 text-[11px] text-gray-400">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                      <span>{conversionRate.rate}%</span>
                    </div>
                  </div>
                )}

                {/* Stage bar */}
                <div className="flex items-center gap-3">
                  <div className="w-24 text-[12px] text-gray-600 truncate">
                    {stage.stage}
                  </div>
                  <div className="flex-1">
                    <div className="h-8 bg-gray-100 rounded-md overflow-hidden relative">
                      <div
                        className="h-full rounded-md transition-all duration-500 flex items-center"
                        style={{
                          width: `${Math.max(widthPercentage, 2)}%`,
                          backgroundColor: stage.stage_color || '#3B82F6',
                        }}
                      >
                        <span className="text-[11px] font-medium text-white px-2 whitespace-nowrap">
                          {stage.count}
                        </span>
                      </div>
                      {widthPercentage < 20 && (
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-gray-500">
                          {stage.percentage}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="w-12 text-right text-[12px] text-gray-500">
                    {stage.percentage}%
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Overall conversion summary */}
      {funnel.length >= 2 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-gray-500">Overall conversion</span>
            <span className="font-medium text-gray-900">
              {funnel[0]?.count > 0
                ? ((funnel[funnel.length - 1]?.count / funnel[0].count) * 100).toFixed(1)
                : 0}%
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
