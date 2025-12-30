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
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-blue-100 text-blue-600',
  high: 'bg-orange-100 text-orange-600',
  urgent: 'bg-red-100 text-red-600',
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
          isOverdue ? 'border-red-200 bg-red-50' : 'border-gray-100 bg-white'
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
            <Circle className="w-4 h-4 text-gray-300 hover:text-gray-400" />
          )}
        </button>
        <span
          className={`text-sm flex-1 truncate ${
            isCompleted ? 'line-through text-gray-400' : 'text-gray-700'
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
          ? 'border-red-200 bg-red-50 hover:border-red-300'
          : 'border-gray-200 bg-white hover:border-gray-300'
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
            <Circle className="w-5 h-5 text-gray-300 hover:text-gray-400 transition-colors" />
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4
              className={`text-sm font-medium ${
                isCompleted ? 'line-through text-gray-400' : 'text-gray-900'
              }`}
            >
              {task.title}
            </h4>

            {/* Actions menu */}
            <div className="relative flex-shrink-0">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
                    {onEdit && (
                      <button
                        onClick={() => {
                          onEdit(task)
                          setShowMenu(false)
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
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
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
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
            <p className="mt-1 text-xs text-gray-500 line-clamp-2">{task.description}</p>
          )}

          {/* Meta */}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            {/* Priority badge */}
            <span className={`px-1.5 py-0.5 rounded ${priorityColors[task.priority]}`}>
              {TaskPriorityLabels[task.priority]}
            </span>

            {/* Status badge (if not pending) */}
            {task.status !== 'pending' && (
              <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
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
              <span className="flex items-center gap-1 text-gray-500">
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
