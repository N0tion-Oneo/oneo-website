import { useMemo, useCallback } from 'react'
import {
  Calendar,
  AlertTriangle,
  Building2,
  Users,
  FileText,
  UserCircle,
  GripVertical,
  CheckCircle2,
  Trash2,
  Zap,
} from 'lucide-react'
import type { Task, EntityType } from '@/types'
import { TaskStatus, TaskPriority } from '@/types'
import { KanbanBoard, type KanbanColumnConfig, type DropResult, type CardRenderProps } from '@/components/common/KanbanBoard'
import { format, isPast, parseISO } from 'date-fns'

interface TaskKanbanViewProps {
  tasks: Task[]
  onTaskClick: (task: Task) => void
  onTaskComplete: (taskId: string) => void
  onTaskDelete: (taskId: string) => void
  onTaskStatusChange: (taskId: string, newStatus: TaskStatus) => void
  isLoading?: boolean
}

const priorityDots: Record<TaskPriority, string> = {
  low: 'bg-gray-400',
  medium: 'bg-blue-500',
  high: 'bg-orange-500',
  urgent: 'bg-red-500',
}

const entityTypeIcons: Record<EntityType, React.ReactNode> = {
  lead: <UserCircle className="w-3 h-3" />,
  company: <Building2 className="w-3 h-3" />,
  candidate: <Users className="w-3 h-3" />,
  application: <FileText className="w-3 h-3" />,
}

const entityTypeColors: Record<EntityType, string> = {
  lead: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20',
  company: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20',
  candidate: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20',
  application: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20',
}

export function TaskKanbanView({
  tasks,
  onTaskClick,
  onTaskComplete,
  onTaskDelete,
  onTaskStatusChange,
  isLoading,
}: TaskKanbanViewProps) {
  // Sort tasks: overdue first, then by due date, then by priority
  const sortTasks = useCallback((taskList: Task[]) => {
    return [...taskList].sort((a, b) => {
      // Overdue first
      if (a.is_overdue && !b.is_overdue) return -1
      if (!a.is_overdue && b.is_overdue) return 1

      // Then by due date (earliest first)
      if (a.due_date && b.due_date) {
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
      }
      if (a.due_date && !b.due_date) return -1
      if (!a.due_date && b.due_date) return 1

      // Then by priority (urgent > high > medium > low)
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    })
  }, [])

  // Build columns
  const columns = useMemo<KanbanColumnConfig<Task>[]>(() => {
    return [
      {
        id: TaskStatus.PENDING,
        title: 'Pending',
        color: 'bg-gray-500',
        items: sortTasks(tasks.filter(t => t.status === TaskStatus.PENDING)),
      },
      {
        id: TaskStatus.IN_PROGRESS,
        title: 'In Progress',
        color: 'bg-blue-500',
        items: sortTasks(tasks.filter(t => t.status === TaskStatus.IN_PROGRESS)),
      },
      {
        id: TaskStatus.COMPLETED,
        title: 'Completed',
        color: 'bg-green-500',
        items: sortTasks(tasks.filter(t => t.status === TaskStatus.COMPLETED)),
      },
    ]
  }, [tasks, sortTasks])

  // Handle drop
  const handleDrop = useCallback((result: DropResult<Task>) => {
    const { item, targetColumnId, sourceColumnId } = result
    if (targetColumnId !== sourceColumnId) {
      onTaskStatusChange(item.id, targetColumnId as TaskStatus)
    }
  }, [onTaskStatusChange])

  // Render card
  const renderCard = useCallback((props: CardRenderProps<Task>) => (
    <TaskKanbanCard
      task={props.item}
      isDragEnabled={props.isDragEnabled}
      dragHandleProps={props.dragHandleProps}
      onOpenDrawer={() => onTaskClick(props.item)}
      onComplete={props.item.status !== TaskStatus.COMPLETED ? () => onTaskComplete(props.item.id) : undefined}
      onDelete={() => onTaskDelete(props.item.id)}
    />
  ), [onTaskClick, onTaskComplete, onTaskDelete])

  return (
    <KanbanBoard
      columns={columns}
      getItemId={(task) => task.id}
      renderCard={renderCard}
      dragEnabled={true}
      onDrop={handleDrop}
      isLoading={isLoading}
    />
  )
}

// ============================================================================
// Task Kanban Card Component
// ============================================================================

interface TaskKanbanCardProps {
  task: Task
  isDragEnabled: boolean
  dragHandleProps: {
    draggable: boolean
    onDragStart: (e: React.DragEvent) => void
  }
  onOpenDrawer: () => void
  onComplete?: () => void
  onDelete?: () => void
}

function TaskKanbanCard({
  task,
  isDragEnabled,
  dragHandleProps,
  onOpenDrawer,
  onComplete,
  onDelete,
}: TaskKanbanCardProps) {
  const dueInfo = useMemo(() => {
    if (!task.due_date) return null
    const date = parseISO(task.due_date)
    const isOverdue = isPast(date) && task.status !== 'completed' && task.status !== 'cancelled'
    return {
      formatted: format(date, 'MMM d'),
      isOverdue,
    }
  }, [task.due_date, task.status])

  const handleComplete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onComplete?.()
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete?.()
  }

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('button')) return
    onOpenDrawer()
  }

  return (
    <div
      {...dragHandleProps}
      onClick={handleCardClick}
      className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md p-3 shadow-sm dark:shadow-gray-900/20 hover:shadow-md transition-shadow cursor-pointer ${
        isDragEnabled ? 'active:cursor-grabbing' : ''
      }`}
    >
      {/* Header: Priority dot + Title + Drag handle */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${priorityDots[task.priority]}`} />
          <div className="min-w-0">
            <h4 className="text-[13px] font-medium text-gray-900 dark:text-gray-100 line-clamp-2">
              {task.title}
            </h4>
            {/* Bottleneck Detection Badge */}
            {task.bottleneck_detection && (
              <span
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 mt-1 rounded text-[10px] font-medium ${
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
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Quick actions */}
          {onComplete && (
            <button
              onClick={handleComplete}
              className="p-1 text-gray-400 hover:text-green-600 dark:hover:text-green-400 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              title="Complete task"
            >
              <CheckCircle2 className="w-4 h-4" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={handleDelete}
              className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              title="Delete task"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          {isDragEnabled && (
            <GripVertical className="w-4 h-4 text-gray-300 dark:text-gray-600" />
          )}
        </div>
      </div>

      {/* Description preview */}
      {task.description && (
        <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 mb-2 ml-4">
          {task.description}
        </p>
      )}

      {/* Footer: Entity badge + Due date */}
      <div className="flex items-center justify-between gap-2 ml-4">
        {/* Entity badge */}
        <span
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${entityTypeColors[task.entity_type]}`}
        >
          {entityTypeIcons[task.entity_type]}
          <span className="capitalize">{task.entity_type}</span>
        </span>

        {/* Due date */}
        {dueInfo && (
          <span
            className={`inline-flex items-center gap-1 text-[11px] ${
              dueInfo.isOverdue
                ? 'text-red-600 dark:text-red-400 font-medium'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {dueInfo.isOverdue && <AlertTriangle className="w-3 h-3" />}
            <Calendar className="w-3 h-3" />
            {dueInfo.formatted}
          </span>
        )}
      </div>

      {/* Assignee */}
      {task.assigned_to_name && (
        <div className="mt-2 ml-4 flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[10px] font-medium text-gray-600 dark:text-gray-400">
            {task.assigned_to_name.charAt(0).toUpperCase()}
          </div>
          <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
            {task.assigned_to_name}
          </span>
        </div>
      )}
    </div>
  )
}

export default TaskKanbanView
