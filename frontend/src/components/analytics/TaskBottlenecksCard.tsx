import { AlertTriangle, Clock, User } from 'lucide-react'

interface OverdueTask {
  id: string
  title: string
  entity_type: string
  assigned_to_name: string | null
  due_date: string
  days_overdue: number
  priority: string
}

interface StaleTask {
  id: string
  title: string
  entity_type: string
  assigned_to_name: string | null
  created_at: string
  days_pending: number
  priority: string
}

interface AssigneeBottleneck {
  assigned_to: number
  assignee_name: string
  overdue_count: number
}

interface TaskBottlenecksCardProps {
  mostOverdue: OverdueTask[]
  staleTasks: StaleTask[]
  assigneeBottlenecks: AssigneeBottleneck[]
  loading?: boolean
  onTaskClick?: (taskId: string) => void
}

const priorityColors: Record<string, string> = {
  low: 'bg-gray-400',
  medium: 'bg-blue-500',
  high: 'bg-orange-500',
  urgent: 'bg-red-500',
}

export function TaskBottlenecksCard({
  mostOverdue,
  staleTasks,
  assigneeBottlenecks,
  loading = false,
  onTaskClick,
}: TaskBottlenecksCardProps) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-40 mb-6 animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const hasBottlenecks = mostOverdue.length > 0 || staleTasks.length > 0 || assigneeBottlenecks.length > 0

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <div className="p-4 border-b border-gray-100 dark:border-gray-700">
        <h3 className="text-[14px] font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          Task Bottlenecks
        </h3>
      </div>

      {!hasBottlenecks ? (
        <div className="p-8 text-center text-[13px] text-gray-500 dark:text-gray-400">
          No bottlenecks detected
        </div>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {/* Most Overdue Tasks */}
          {mostOverdue.length > 0 && (
            <div className="p-4">
              <h4 className="text-[12px] font-medium text-red-600 dark:text-red-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                Most Overdue
              </h4>
              <div className="space-y-2">
                {mostOverdue.slice(0, 5).map((task) => (
                  <div
                    key={task.id}
                    onClick={() => onTaskClick?.(task.id)}
                    className={`flex items-center justify-between p-2 rounded-lg bg-red-50 dark:bg-red-900/20 ${
                      onTaskClick ? 'cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/30' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${priorityColors[task.priority] || 'bg-gray-400'}`} />
                      <div className="min-w-0">
                        <p className="text-[13px] text-gray-900 dark:text-gray-100 truncate">
                          {task.title}
                        </p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400">
                          {task.assigned_to_name || 'Unassigned'}
                        </p>
                      </div>
                    </div>
                    <span className="text-[12px] font-medium text-red-600 dark:text-red-400 flex-shrink-0 ml-2">
                      {task.days_overdue}d overdue
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stale Tasks */}
          {staleTasks.length > 0 && (
            <div className="p-4">
              <h4 className="text-[12px] font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Stale (No Progress)
              </h4>
              <div className="space-y-2">
                {staleTasks.slice(0, 5).map((task) => (
                  <div
                    key={task.id}
                    onClick={() => onTaskClick?.(task.id)}
                    className={`flex items-center justify-between p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 ${
                      onTaskClick ? 'cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/30' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${priorityColors[task.priority] || 'bg-gray-400'}`} />
                      <div className="min-w-0">
                        <p className="text-[13px] text-gray-900 dark:text-gray-100 truncate">
                          {task.title}
                        </p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400">
                          {task.assigned_to_name || 'Unassigned'}
                        </p>
                      </div>
                    </div>
                    <span className="text-[12px] font-medium text-amber-600 dark:text-amber-400 flex-shrink-0 ml-2">
                      {task.days_pending}d pending
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Assignees with Most Overdue */}
          {assigneeBottlenecks.length > 0 && (
            <div className="p-4">
              <h4 className="text-[12px] font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                Assignees Needing Help
              </h4>
              <div className="space-y-2">
                {assigneeBottlenecks.map((assignee) => (
                  <div
                    key={assignee.assigned_to}
                    className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800"
                  >
                    <span className="text-[13px] text-gray-900 dark:text-gray-100">
                      {assignee.assignee_name}
                    </span>
                    <span className="text-[12px] font-medium text-red-600 dark:text-red-400">
                      {assignee.overdue_count} overdue
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default TaskBottlenecksCard
