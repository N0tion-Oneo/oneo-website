import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { OnboardingStageDistribution } from '@/types'

interface OnboardingStageDistributionProps {
  data: OnboardingStageDistribution[]
  loading?: boolean
  title?: string
  entityType: 'company' | 'candidate'
}

export function OnboardingStageDistributionChart({
  data,
  loading,
  title,
  entityType,
}: OnboardingStageDistributionProps) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <div className="h-6 w-48 bg-gray-100 dark:bg-gray-700 rounded animate-pulse mb-4" />
        <div className="h-[300px] bg-gray-50 dark:bg-gray-800 rounded animate-pulse" />
      </div>
    )
  }

  const entityLabel = entityType === 'company' ? 'Companies' : 'Candidates'

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
      <h3 className="text-[14px] font-medium text-gray-900 dark:text-gray-100 mb-4">
        {title || `${entityLabel} by Stage`}
      </h3>

      {data.length === 0 ? (
        <div className="h-[300px] flex items-center justify-center text-gray-500 dark:text-gray-400 text-[13px]">
          No data available
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
          >
            <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis
              type="category"
              dataKey="stage_name"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              width={90}
            />
            <Tooltip
              formatter={(value: number, name: string, props: { payload: OnboardingStageDistribution }) => {
                const item = props.payload
                return [`${value} (${item.percentage}%)`, entityLabel]
              }}
              contentStyle={{
                fontSize: '12px',
                border: '1px solid #E5E7EB',
                borderRadius: '6px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              }}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.stage_color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-3">
        {data.map((stage) => (
          <div key={stage.stage_name} className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: stage.stage_color }}
            />
            <span className="text-[11px] text-gray-600 dark:text-gray-400">
              {stage.stage_name}: {stage.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
