import { AlertTriangle } from 'lucide-react'
import type { OnboardingBottleneck } from '@/types'
import { useBottleneckRulesByEntity } from '@/hooks/useBottlenecks'
import { ThresholdBadge } from '@/components/bottlenecks'

interface OnboardingBottlenecksCardProps {
  bottlenecks: OnboardingBottleneck[]
  loading?: boolean
  staleThresholdDays?: number
  entityType: 'company' | 'candidate'
  showConfigureButton?: boolean
}

export function OnboardingBottlenecksCard({
  bottlenecks,
  loading,
  staleThresholdDays = 7,
  entityType,
  showConfigureButton = false,
}: OnboardingBottlenecksCardProps) {
  // Fetch bottleneck rules for this entity type to get configurable threshold
  const { rules, refetch: refetchRules } = useBottleneckRulesByEntity(entityType)

  // Find the stage duration rule for this entity type
  const stageDurationRule = rules.find(
    (r) => r.detection_config.type === 'stage_duration' && r.is_active
  )

  // Use the rule threshold if available, otherwise fall back to prop
  const effectiveThreshold = stageDurationRule?.detection_config.threshold_days ?? staleThresholdDays

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <div className="h-6 w-48 bg-gray-100 dark:bg-gray-700 rounded animate-pulse mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-50 dark:bg-gray-800 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const entityLabel = entityType === 'company' ? 'companies' : 'candidates'

  // Only show bottlenecks with stale items
  const significantBottlenecks = bottlenecks.filter((b) => b.stale_count > 0)

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <h3 className="text-[14px] font-medium text-gray-900 dark:text-gray-100">
            Onboarding Bottlenecks
          </h3>
        </div>
        {showConfigureButton && stageDurationRule && (
          <ThresholdBadge rule={stageDurationRule} onUpdated={refetchRules} />
        )}
      </div>
      <p className="text-[12px] text-gray-500 dark:text-gray-400 mb-4">
        Stages where {entityLabel} have been stuck for over {effectiveThreshold} days
      </p>

      {significantBottlenecks.length === 0 ? (
        <div className="py-8 text-center">
          <div className="w-12 h-12 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg
              className="w-6 h-6 text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <p className="text-[13px] text-gray-600 dark:text-gray-300">No bottlenecks detected</p>
          <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-1">
            All {entityLabel} are progressing smoothly
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {significantBottlenecks.map((bottleneck) => (
            <div
              key={bottleneck.stage_id}
              className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-lg"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: bottleneck.stage_color }}
                  />
                  <span className="text-[13px] font-medium text-gray-900 dark:text-gray-100">
                    {bottleneck.stage_name}
                  </span>
                </div>
                <span className="text-[12px] text-amber-700 dark:text-amber-400 font-medium">
                  {bottleneck.stale_percentage}% stale
                </span>
              </div>

              <div className="flex items-center gap-4 text-[12px]">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Total: </span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {bottleneck.current_count}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Stuck: </span>
                  <span className="font-medium text-amber-700 dark:text-amber-400">
                    {bottleneck.stale_count}
                  </span>
                </div>
              </div>

              {/* Progress bar showing stale percentage */}
              <div className="mt-2 h-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-500"
                  style={{ width: `${bottleneck.stale_percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
