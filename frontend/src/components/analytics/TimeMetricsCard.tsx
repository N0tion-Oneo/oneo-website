import { Clock, AlertTriangle } from 'lucide-react'
import type { TimeToHireStats, Bottleneck } from '@/types'
import { useBottleneckRulesByEntity } from '@/hooks/useBottlenecks'
import { ThresholdBadge } from '@/components/bottlenecks'

interface TimeMetricsCardProps {
  timeToHire: TimeToHireStats
  timeToShortlistDays: number | null
  bottlenecks: Bottleneck[]
  loading?: boolean
  showConfigureButton?: boolean
}

export function TimeMetricsCard({
  timeToHire,
  timeToShortlistDays,
  bottlenecks,
  loading = false,
  showConfigureButton = false,
}: TimeMetricsCardProps) {
  // Fetch application bottleneck rules
  const { rules, refetch: refetchRules } = useBottleneckRulesByEntity('application')

  // Find the stage duration rule for applications
  const applicationStageDurationRule = rules.find(
    (r) => r.detection_config.type === 'stage_duration' && r.is_active
  )
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-6 animate-pulse" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
      <h3 className="text-[14px] font-medium text-gray-900 dark:text-gray-100 mb-6">Time Metrics</h3>

      {/* Time-to-hire stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase">
              Avg Time to Hire
            </span>
          </div>
          <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {timeToHire.average_days !== null ? (
              <>{timeToHire.average_days} days</>
            ) : (
              <span className="text-gray-400 dark:text-gray-500">-</span>
            )}
          </p>
          {timeToHire.count > 0 && (
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
              Based on {timeToHire.count} hire{timeToHire.count !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase">
              Time to Shortlist
            </span>
          </div>
          <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {timeToShortlistDays !== null ? (
              <>{timeToShortlistDays} days</>
            ) : (
              <span className="text-gray-400 dark:text-gray-500">-</span>
            )}
          </p>
        </div>
      </div>

      {/* Range */}
      {(timeToHire.min_days !== null || timeToHire.max_days !== null) && (
        <div className="mb-6 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase">
            Hire Time Range
          </span>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[13px] text-gray-700 dark:text-gray-300">
              {timeToHire.min_days ?? '-'} days
            </span>
            <span className="text-gray-400 dark:text-gray-500">→</span>
            <span className="text-[13px] text-gray-700 dark:text-gray-300">
              {timeToHire.max_days ?? '-'} days
            </span>
          </div>
        </div>
      )}

      {/* Bottlenecks */}
      {bottlenecks.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span className="text-[12px] font-medium text-gray-700 dark:text-gray-300">
                Bottlenecks
              </span>
            </div>
            {showConfigureButton && applicationStageDurationRule && (
              <ThresholdBadge rule={applicationStageDurationRule} onUpdated={refetchRules} />
            )}
          </div>
          <div className="space-y-2">
            {bottlenecks.map((bottleneck, i) => (
              <div
                key={i}
                className="p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[12px] text-gray-700 dark:text-gray-300">
                    {bottleneck.stage_name}
                  </span>
                  <span className="text-[12px] font-medium text-amber-700 dark:text-amber-400">
                    {bottleneck.stale_count ?? bottleneck.applications_stuck} stale
                    {bottleneck.stale_percentage !== undefined && (
                      <span className="ml-1 text-[11px] opacity-75">
                        ({bottleneck.stale_percentage}%)
                      </span>
                    )}
                  </span>
                </div>
                {bottleneck.stale_count !== undefined && bottleneck.applications_stuck > 0 && (
                  <div className="h-1 bg-amber-100 dark:bg-amber-900/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all duration-500"
                      style={{ width: `${bottleneck.stale_percentage ?? 0}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {bottlenecks.length === 0 && (
        <div className="text-center py-4">
          <p className="text-[13px] text-gray-500 dark:text-gray-400">No bottlenecks detected</p>
        </div>
      )}
    </div>
  )
}

export default TimeMetricsCard
