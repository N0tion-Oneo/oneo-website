import { CheckSquare, Clock, AlertTriangle, TrendingUp } from 'lucide-react'
import { StatCard } from './StatCard'

interface TaskSummaryCardsProps {
  totalCreated: number
  completed: number
  completionRate: number
  avgCompletionTimeDays: number | null
  onTimeCompletionRate: number | null
  overdueCount: number
  loading?: boolean
}

export function TaskSummaryCards({
  totalCreated,
  completed,
  completionRate,
  avgCompletionTimeDays,
  onTimeCompletionRate,
  overdueCount,
  loading = false,
}: TaskSummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Tasks Created"
        value={totalCreated}
        icon={CheckSquare}
        loading={loading}
      />
      <StatCard
        title="Completed"
        value={completed}
        subtitle={`${completionRate.toFixed(1)}% completion rate`}
        icon={TrendingUp}
        loading={loading}
      />
      <StatCard
        title="Avg. Completion Time"
        value={avgCompletionTimeDays}
        format="days"
        subtitle={onTimeCompletionRate ? `${onTimeCompletionRate.toFixed(1)}% on time` : undefined}
        icon={Clock}
        loading={loading}
      />
      <StatCard
        title="Overdue"
        value={overdueCount}
        icon={AlertTriangle}
        loading={loading}
      />
    </div>
  )
}

export default TaskSummaryCards
