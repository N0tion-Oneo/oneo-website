import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { TrendDataPoint } from '@/types'

interface TrendChartProps {
  data: TrendDataPoint[]
  loading?: boolean
  title?: string
  color?: string
}

export function TrendChart({
  data,
  loading = false,
  title = 'Applications Over Time',
  color = '#3B82F6',
}: TrendChartProps) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-40 mb-6 animate-pulse" />
        <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
      </div>
    )
  }

  // Format dates for display
  const formattedData = data.map((point) => ({
    ...point,
    displayDate: new Date(point.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
  }))

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
      <h3 className="text-[14px] font-medium text-gray-900 dark:text-gray-100 mb-6">{title}</h3>

      {data.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-[13px] text-gray-500 dark:text-gray-400">
          No data available for this period
        </div>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={formattedData}
              margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="displayDate"
                tick={{ fontSize: 11, fill: '#6B7280' }}
                tickLine={false}
                axisLine={{ stroke: '#E5E7EB' }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#6B7280' }}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 6,
                  border: '1px solid #E5E7EB',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                }}
                labelStyle={{ fontWeight: 500, marginBottom: 4 }}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke={color}
                strokeWidth={2}
                dot={{ fill: color, strokeWidth: 0, r: 3 }}
                activeDot={{ fill: color, strokeWidth: 0, r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

export default TrendChart
