import { useState } from 'react'
import {
  CheckCircle2,
  Circle,
  AlertTriangle,
  MoreVertical,
  Calendar,
  User,
  Trash2,
  Edit,
  Zap,
} from 'lucide-react'
import type { Task, TaskPriority } from '@/types'
import { TaskPriorityLabels, TaskStatusLabels } from '@/types'
import { formatDistanceToNow, format, isPast, parseISO } from 'date-fns'

interface TaskCardProps {
  task: Task
  onComplete?: (taskId: string) => void
  onEdit?: (task: Task) => void
  onDelete?: (taskId: string) => void
  isCompacting?: boolean
}

const priorityColors: Record<TaskPriority, string> = {
  low: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
  medium: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600',
  high: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600',
  urgent: 'bg-red-100 dark:bg-red-900/30 text-red-600',
}

const priorityDotColors: Record<TaskPriority, string> = {
  low: 'bg-gray-400',
  medium: 'bg-blue-500',
  high: 'bg-orange-500',
  urgent: 'bg-red-500',
}

export function TaskCard({
  task,
  onComplete,
  onEdit,
  onDelete,
  isCompacting = false,
}: TaskCardProps) {
  const [showMenu, setShowMenu] = useState(false)

  const isCompleted = task.status === 'completed'
  const isCancelled = task.status === 'cancelled'
  const isOverdue = task.is_overdue

  const handleComplete = () => {
    if (!isCompleted && !isCancelled && onComplete) {
      onComplete(task.id)
    }
  }

  const formatDueDate = (dateStr: string | null) => {
    if (!dateStr) return null
    const date = parseISO(dateStr)
    const isOverdue = isPast(date) && !isCompleted && !isCancelled

    if (isOverdue) {
      return {
        text: `Overdue by ${formatDistanceToNow(date)}`,
        className: 'text-red-600',
      }
    }

    const daysUntil = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

    if (daysUntil === 0) {
      return { text: 'Due today', className: 'text-orange-600' }
    } else if (daysUntil === 1) {
      return { text: 'Due tomorrow', className: 'text-orange-600' }
    } else if (daysUntil <= 7) {
      return { text: `Due in ${daysUntil} days`, className: 'text-gray-600' }
    }

    return { text: format(date, 'MMM d'), className: 'text-gray-500' }
  }

  const dueDateInfo = formatDueDate(task.due_date)

  if (isCompacting) {
    // Compact view for smaller panels
    return (
      <div
        className={`flex items-center gap-2 p-2 rounded-lg border ${
          isOverdue ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30' : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900'
        } ${isCompleted || isCancelled ? 'opacity-60' : ''}`}
      >
        <button
          onClick={handleComplete}
          disabled={isCompleted || isCancelled}
          className="flex-shrink-0"
        >
          {isCompleted ? (
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          ) : (
            <Circle className="w-4 h-4 text-gray-300 dark:text-gray-600 hover:text-gray-400 dark:hover:text-gray-500" />
          )}
        </button>
        {task.bottleneck_detection && (
          <span title={task.bottleneck_detection.rule_name}>
            <Zap
              className={`w-3 h-3 flex-shrink-0 ${
                task.bottleneck_detection.severity === 'critical'
                  ? 'text-red-500'
                  : 'text-amber-500'
              }`}
            />
          </span>
        )}
        <span
          className={`text-sm flex-1 truncate ${
            isCompleted ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'
          }`}
        >
          {task.title}
        </span>
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${priorityDotColors[task.priority]}`} />
      </div>
    )
  }

  // Full card view
  return (
    <div
      className={`p-3 rounded-lg border transition-all ${
        isOverdue
          ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 hover:border-red-300 dark:hover:border-red-700'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-600'
      } ${isCompleted || isCancelled ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <button
          onClick={handleComplete}
          disabled={isCompleted || isCancelled}
          className="mt-0.5 flex-shrink-0"
        >
          {isCompleted ? (
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          ) : (
            <Circle className="w-5 h-5 text-gray-300 dark:text-gray-600 hover:text-gray-400 dark:hover:text-gray-500 transition-colors" />
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4
              className={`text-sm font-medium ${
                isCompleted ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'
              }`}
            >
              {task.title}
            </h4>

            {/* Actions menu */}
            <div className="relative flex-shrink-0">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 mt-1 w-36 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg dark:shadow-gray-900/40 z-20 py-1">
                    {onEdit && (
                      <button
                        onClick={() => {
                          onEdit(task)
                          setShowMenu(false)
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => {
                          onDelete(task.id)
                          setShowMenu(false)
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Description */}
          {task.description && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{task.description}</p>
          )}

          {/* Meta */}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            {/* Bottleneck detection badge */}
            {task.bottleneck_detection && (
              <span
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${
                  task.bottleneck_detection.severity === 'critical'
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                    : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                }`}
                title={`Auto-created by: ${task.bottleneck_detection.rule_name}`}
              >
                <Zap className="w-3 h-3" />
                {task.bottleneck_detection.rule_name}
              </span>
            )}

            {/* Priority badge */}
            <span className={`px-1.5 py-0.5 rounded ${priorityColors[task.priority]}`}>
              {TaskPriorityLabels[task.priority]}
            </span>

            {/* Status badge (if not pending) */}
            {task.status !== 'pending' && (
              <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                {TaskStatusLabels[task.status]}
              </span>
            )}

            {/* Due date */}
            {dueDateInfo && (
              <span className={`flex items-center gap-1 ${dueDateInfo.className}`}>
                {isOverdue ? (
                  <AlertTriangle className="w-3 h-3" />
                ) : (
                  <Calendar className="w-3 h-3" />
                )}
                {dueDateInfo.text}
              </span>
            )}

            {/* Assigned to */}
            {task.assigned_to_name && (
              <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                <User className="w-3 h-3" />
                {task.assigned_to_name}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default TaskCard
