import { Clock, AlertTriangle } from 'lucide-react'
import type { TimeToHireStats, Bottleneck } from '@/types'

interface TimeMetricsCardProps {
  timeToHire: TimeToHireStats
  timeToShortlistDays: number | null
  bottlenecks: Bottleneck[]
  loading?: boolean
}

export function TimeMetricsCard({
  timeToHire,
  timeToShortlistDays,
  bottlenecks,
  loading = false,
}: TimeMetricsCardProps) {
  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="h-4 bg-gray-200 rounded w-32 mb-6 animate-pulse" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-[14px] font-medium text-gray-900 mb-6">Time Metrics</h3>

      {/* Time-to-hire stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="text-[11px] font-medium text-gray-500 uppercase">
              Avg Time to Hire
            </span>
          </div>
          <p className="text-xl font-semibold text-gray-900">
            {timeToHire.average_days !== null ? (
              <>{timeToHire.average_days} days</>
            ) : (
              <span className="text-gray-400">-</span>
            )}
          </p>
          {timeToHire.count > 0 && (
            <p className="text-[11px] text-gray-500 mt-0.5">
              Based on {timeToHire.count} hire{timeToHire.count !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="text-[11px] font-medium text-gray-500 uppercase">
              Time to Shortlist
            </span>
          </div>
          <p className="text-xl font-semibold text-gray-900">
            {timeToShortlistDays !== null ? (
              <>{timeToShortlistDays} days</>
            ) : (
              <span className="text-gray-400">-</span>
            )}
          </p>
        </div>
      </div>

      {/* Range */}
      {(timeToHire.min_days !== null || timeToHire.max_days !== null) && (
        <div className="mb-6 p-3 bg-gray-50 rounded-lg">
          <span className="text-[11px] font-medium text-gray-500 uppercase">
            Hire Time Range
          </span>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[13px] text-gray-700">
              {timeToHire.min_days ?? '-'} days
            </span>
            <span className="text-gray-400">→</span>
            <span className="text-[13px] text-gray-700">
              {timeToHire.max_days ?? '-'} days
            </span>
          </div>
        </div>
      )}

      {/* Bottlenecks */}
      {bottlenecks.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span className="text-[12px] font-medium text-gray-700">
              Bottlenecks
            </span>
          </div>
          <div className="space-y-2">
            {bottlenecks.map((bottleneck, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2 bg-amber-50 border border-amber-100 rounded"
              >
                <span className="text-[12px] text-gray-700">
                  {bottleneck.stage_name}
                </span>
                <span className="text-[12px] font-medium text-amber-700">
                  {bottleneck.applications_stuck} stuck
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {bottlenecks.length === 0 && (
        <div className="text-center py-4">
          <p className="text-[13px] text-gray-500">No bottlenecks detected</p>
        </div>
      )}
    </div>
  )
}

export default TimeMetricsCard
