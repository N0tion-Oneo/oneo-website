import {
  CheckCircle2,
  Circle,
  AlertTriangle,
  Calendar,
  User,
  MoreVertical,
  Trash2,
  Building2,
  Users,
  FileText,
  UserCircle,
  Zap,
} from 'lucide-react'
import { useState } from 'react'
import type { Task, TaskPriority, EntityType } from '@/types'
import { TaskPriorityLabels, TaskStatusLabels } from '@/types'
import { formatDistanceToNow, format, isPast, parseISO } from 'date-fns'

interface TaskListViewProps {
  tasks: Task[]
  onTaskClick: (task: Task) => void
  onComplete: (taskId: string) => void
  onDelete: (taskId: string) => void
  isCompleting?: boolean
  isDeleting?: boolean
}

const priorityColors: Record<TaskPriority, string> = {
  low: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
  medium: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600',
  high: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600',
  urgent: 'bg-red-100 dark:bg-red-900/30 text-red-600',
}

const entityTypeIcons: Record<EntityType, React.ReactNode> = {
  lead: <UserCircle className="w-3.5 h-3.5" />,
  company: <Building2 className="w-3.5 h-3.5" />,
  candidate: <Users className="w-3.5 h-3.5" />,
  application: <FileText className="w-3.5 h-3.5" />,
}

const entityTypeLabels: Record<EntityType, string> = {
  lead: 'Lead',
  company: 'Company',
  candidate: 'Candidate',
  application: 'Application',
}

export function TaskListView({
  tasks,
  onTaskClick,
  onComplete,
  onDelete,
  isCompleting,
  isDeleting,
}: TaskListViewProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  const formatDueDate = (dateStr: string | null, isCompleted: boolean, isCancelled: boolean) => {
    if (!dateStr) return null
    const date = parseISO(dateStr)
    const isOverdue = isPast(date) && !isCompleted && !isCancelled

    if (isOverdue) {
      return {
        text: `Overdue by ${formatDistanceToNow(date)}`,
        className: 'text-red-600',
        isOverdue: true,
      }
    }

    const now = new Date()
    const daysUntil = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (daysUntil === 0) {
      return { text: 'Due today', className: 'text-orange-600', isOverdue: false }
    } else if (daysUntil === 1) {
      return { text: 'Due tomorrow', className: 'text-orange-600', isOverdue: false }
    } else if (daysUntil <= 7) {
      return { text: `Due in ${daysUntil} days`, className: 'text-gray-600 dark:text-gray-400', isOverdue: false }
    }

    return { text: format(date, 'MMM d'), className: 'text-gray-500 dark:text-gray-400', isOverdue: false }
  }

  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-800">
      {tasks.map((task) => {
        const isCompleted = task.status === 'completed'
        const isCancelled = task.status === 'cancelled'
        const dueDateInfo = formatDueDate(task.due_date, isCompleted, isCancelled)

        return (
          <div
            key={task.id}
            className={`flex items-center gap-4 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer ${
              task.is_overdue && !isCompleted && !isCancelled ? 'bg-red-50/50 dark:bg-red-900/10' : ''
            } ${isCompleted || isCancelled ? 'opacity-60' : ''}`}
            onClick={() => onTaskClick(task)}
          >
            {/* Checkbox */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (!isCompleted && !isCancelled && !isCompleting) {
                  onComplete(task.id)
                }
              }}
              disabled={isCompleted || isCancelled || isCompleting}
              className="flex-shrink-0"
            >
              {isCompleted ? (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              ) : (
                <Circle className="w-5 h-5 text-gray-300 dark:text-gray-600 hover:text-gray-400 dark:hover:text-gray-500 transition-colors" />
              )}
            </button>

            {/* Title & Description */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4
                  className={`text-[14px] font-medium truncate ${
                    isCompleted ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'
                  }`}
                >
                  {task.title}
                </h4>
                {/* Bottleneck Detection Badge */}
                {task.bottleneck_detection && (
                  <span
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium flex-shrink-0 ${
                      task.bottleneck_detection.severity === 'critical'
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                        : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                    }`}
                    title={`Auto-created by: ${task.bottleneck_detection.rule_name}`}
                  >
                    <Zap className="w-3 h-3" />
                    <span className="hidden sm:inline">{task.bottleneck_detection.rule_name}</span>
                  </span>
                )}
              </div>
              {task.description && (
                <p className="text-[12px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                  {task.description}
                </p>
              )}
            </div>

            {/* Entity Type Badge */}
            <div className="flex-shrink-0">
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                {entityTypeIcons[task.entity_type]}
                {entityTypeLabels[task.entity_type]}
              </span>
            </div>

            {/* Priority Badge */}
            <div className="flex-shrink-0">
              <span className={`px-2 py-1 rounded text-[11px] font-medium ${priorityColors[task.priority]}`}>
                {TaskPriorityLabels[task.priority]}
              </span>
            </div>

            {/* Status Badge (if not pending) */}
            {task.status !== 'pending' && (
              <div className="flex-shrink-0">
                <span className="px-2 py-1 rounded text-[11px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                  {TaskStatusLabels[task.status]}
                </span>
              </div>
            )}

            {/* Due Date */}
            {dueDateInfo && (
              <div className="flex-shrink-0">
                <span className={`flex items-center gap-1 text-[12px] ${dueDateInfo.className}`}>
                  {dueDateInfo.isOverdue ? (
                    <AlertTriangle className="w-3.5 h-3.5" />
                  ) : (
                    <Calendar className="w-3.5 h-3.5" />
                  )}
                  {dueDateInfo.text}
                </span>
              </div>
            )}

            {/* Assigned To */}
            {task.assigned_to_name && (
              <div className="flex-shrink-0">
                <span className="flex items-center gap-1 text-[12px] text-gray-500 dark:text-gray-400">
                  <User className="w-3.5 h-3.5" />
                  {task.assigned_to_name}
                </span>
              </div>
            )}

            {/* Actions Menu */}
            <div className="relative flex-shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setOpenMenuId(openMenuId === task.id ? null : task.id)
                }}
                className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {openMenuId === task.id && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                  <div className="absolute right-0 mt-1 w-36 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg dark:shadow-gray-900/40 z-20 py-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onDelete(task.id)
                        setOpenMenuId(null)
                      }}
                      disabled={isDeleting}
                      className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default TaskListView
