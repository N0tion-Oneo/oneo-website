import { useMemo } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts'

interface DistributionItem {
  status?: string
  priority?: string
  entity_type?: string
  count: number
}

interface TaskDistributionChartProps {
  data: DistributionItem[]
  type: 'status' | 'priority' | 'entity_type'
  loading?: boolean
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#9CA3AF',
  in_progress: '#3B82F6',
  completed: '#10B981',
  cancelled: '#EF4444',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

const PRIORITY_COLORS: Record<string, string> = {
  low: '#9CA3AF',
  medium: '#3B82F6',
  high: '#F97316',
  urgent: '#EF4444',
}

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
}

const ENTITY_COLORS: Record<string, string> = {
  lead: '#8B5CF6',
  company: '#3B82F6',
  candidate: '#10B981',
  application: '#F59E0B',
}

const ENTITY_LABELS: Record<string, string> = {
  lead: 'Lead',
  company: 'Company',
  candidate: 'Candidate',
  application: 'Application',
}

export function TaskDistributionChart({
  data,
  type,
  loading = false,
}: TaskDistributionChartProps) {
  const { chartData, colors, labels, title } = useMemo(() => {
    let colorsMap: Record<string, string>
    let labelsMap: Record<string, string>
    let chartTitle: string
    let keyField: 'status' | 'priority' | 'entity_type'

    switch (type) {
      case 'status':
        colorsMap = STATUS_COLORS
        labelsMap = STATUS_LABELS
        chartTitle = 'Tasks by Status'
        keyField = 'status'
        break
      case 'priority':
        colorsMap = PRIORITY_COLORS
        labelsMap = PRIORITY_LABELS
        chartTitle = 'Tasks by Priority'
        keyField = 'priority'
        break
      case 'entity_type':
        colorsMap = ENTITY_COLORS
        labelsMap = ENTITY_LABELS
        chartTitle = 'Tasks by Entity Type'
        keyField = 'entity_type'
        break
    }

    const processedData = data.map((item) => {
      const key = item[keyField] as string
      return {
        name: labelsMap[key] || key,
        value: item.count,
        key,
        color: colorsMap[key] || '#6B7280',
      }
    }).filter(item => item.value > 0)

    return {
      chartData: processedData,
      colors: colorsMap,
      labels: labelsMap,
      title: chartTitle,
    }
  }, [data, type])

  const total = chartData.reduce((sum, item) => sum + item.value, 0)

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-40 mb-6 animate-pulse" />
        <div className="h-48 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
      <h3 className="text-[14px] font-medium text-gray-900 dark:text-gray-100 mb-4">
        {title}
      </h3>

      {chartData.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-[13px] text-gray-500 dark:text-gray-400">
          No data available
        </div>
      ) : (
        <div className="flex items-center gap-6">
          {/* Pie Chart */}
          <div className="h-48 w-48 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 6,
                    border: '1px solid #E5E7EB',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  }}
                  formatter={(value: number) => [
                    `${value} (${((value / total) * 100).toFixed(1)}%)`,
                    'Tasks',
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex-1 space-y-2">
            {chartData.map((item) => (
              <div key={item.key} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-sm"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-[13px] text-gray-700 dark:text-gray-300">
                    {item.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium text-gray-900 dark:text-gray-100">
                    {item.value}
                  </span>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">
                    ({((item.value / total) * 100).toFixed(0)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default TaskDistributionChart
