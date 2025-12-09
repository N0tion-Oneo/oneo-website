import type { FunnelStage, ConversionRates } from '@/types'

interface FunnelChartProps {
  funnel: FunnelStage[]
  conversionRates: ConversionRates
  loading?: boolean
}

const STAGE_COLORS: Record<string, string> = {
  Applied: 'bg-blue-500',
  Shortlisted: 'bg-indigo-500',
  Interviewed: 'bg-purple-500',
  Offered: 'bg-amber-500',
  Hired: 'bg-green-500',
}

export function FunnelChart({ funnel, conversionRates, loading = false }: FunnelChartProps) {
  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="h-4 bg-gray-200 rounded w-32 mb-6 animate-pulse" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 animate-pulse">
              <div className="w-24 h-4 bg-gray-200 rounded" />
              <div className="flex-1 h-8 bg-gray-100 rounded" />
              <div className="w-16 h-4 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const maxCount = Math.max(...funnel.map((s) => s.count), 1)

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-[14px] font-medium text-gray-900 mb-6">
        Pipeline Funnel
      </h3>

      {/* Funnel visualization */}
      <div className="space-y-3">
        {funnel.map((stage, index) => {
          const widthPercent = (stage.count / maxCount) * 100
          const color = STAGE_COLORS[stage.stage] || 'bg-gray-500'

          return (
            <div key={stage.stage} className="flex items-center gap-4">
              {/* Stage name */}
              <div className="w-24 text-right">
                <span className="text-[12px] font-medium text-gray-700">
                  {stage.stage}
                </span>
              </div>

              {/* Bar */}
              <div className="flex-1 relative h-8">
                <div className="absolute inset-0 bg-gray-100 rounded" />
                <div
                  className={`absolute inset-y-0 left-0 ${color} rounded transition-all duration-500`}
                  style={{ width: `${Math.max(widthPercent, 2)}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[12px] font-medium text-white mix-blend-difference">
                    {stage.count.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Percentage */}
              <div className="w-16 text-right">
                <span className="text-[12px] text-gray-500">
                  {stage.percentage.toFixed(1)}%
                </span>
              </div>

              {/* Conversion arrow (except last) */}
              {index < funnel.length - 1 && (
                <div className="w-16 text-right">
                  <span className="text-[11px] text-gray-400">
                    ↓ {getConversionRate(stage.stage, conversionRates)}%
                  </span>
                </div>
              )}
              {index === funnel.length - 1 && <div className="w-16" />}
            </div>
          )
        })}
      </div>

      {/* Conversion rates summary */}
      <div className="mt-6 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-gray-500">Overall Conversion Rate</span>
          <span className="text-[14px] font-semibold text-gray-900">
            {conversionRates.overall.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  )
}

function getConversionRate(fromStage: string, rates: ConversionRates): string {
  switch (fromStage) {
    case 'Applied':
      return rates.applied_to_shortlisted.toFixed(0)
    case 'Shortlisted':
      return rates.shortlisted_to_interviewed.toFixed(0)
    case 'Interviewed':
      return rates.interviewed_to_offered.toFixed(0)
    case 'Offered':
      return rates.offered_to_hired.toFixed(0)
    default:
      return '-'
  }
}

export default FunnelChart
