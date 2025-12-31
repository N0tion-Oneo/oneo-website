import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { OnboardingTimeInStage } from '@/types'

interface OnboardingTimeInStageChartProps {
  data: OnboardingTimeInStage[]
  loading?: boolean
  entityType: 'company' | 'candidate'
}

export function OnboardingTimeInStageChart({
  data,
  loading,
  entityType,
}: OnboardingTimeInStageChartProps) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <div className="h-6 w-48 bg-gray-100 dark:bg-gray-700 rounded animate-pulse mb-4" />
        <div className="h-[300px] bg-gray-50 dark:bg-gray-800 rounded animate-pulse" />
      </div>
    )
  }

  const entityLabel = entityType === 'company' ? 'Company' : 'Candidate'

  // Filter out stages with no data and terminal stages
  const filteredData = data.filter((d) => d.avg_days !== null && !d.is_terminal)

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
      <h3 className="text-[14px] font-medium text-gray-900 dark:text-gray-100 mb-1">
        Average Time in Stage
      </h3>
      <p className="text-[12px] text-gray-500 dark:text-gray-400 mb-4">
        How long {entityLabel.toLowerCase()}s spend in each onboarding stage
      </p>

      {filteredData.length === 0 ? (
        <div className="h-[250px] flex items-center justify-center text-gray-500 dark:text-gray-400 text-[13px]">
          Not enough transition data yet
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart
              data={filteredData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <XAxis
                dataKey="stage_name"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                angle={-20}
                textAnchor="end"
                height={60}
              />
              <YAxis
                fontSize={12}
                tickLine={false}
                axisLine={false}
                label={{
                  value: 'Days',
                  angle: -90,
                  position: 'insideLeft',
                  fontSize: 11,
                  fill: '#6B7280',
                }}
              />
              <Tooltip
                formatter={(value: number, name: string, props: { payload: OnboardingTimeInStage }) => {
                  const item = props.payload
                  return [
                    `${value} days (min: ${item.min_days ?? '-'}, max: ${item.max_days ?? '-'})`,
                    'Avg. Time',
                  ]
                }}
                contentStyle={{
                  fontSize: '12px',
                  border: '1px solid #E5E7EB',
                  borderRadius: '6px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}
              />
              <Bar dataKey="avg_days" radius={[4, 4, 0, 0]}>
                {filteredData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.stage_color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Sample size info */}
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Based on {filteredData.reduce((acc, d) => acc + d.sample_size, 0)} stage transitions
            </p>
          </div>
        </>
      )}
    </div>
  )
}
