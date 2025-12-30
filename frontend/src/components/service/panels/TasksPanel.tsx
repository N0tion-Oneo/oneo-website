import { useState } from 'react'
import { Plus, Filter, CheckCircle2, Clock, AlertTriangle } from 'lucide-react'
import type { Task, EntityType } from '@/types'
import { useCompleteTask, useDeleteTask } from '@/hooks'
import { TaskCard } from '../TaskCard'
import { AddTaskDrawer } from '../AddTaskDrawer'

interface TasksPanelProps {
  entityType: EntityType
  entityId: string
  tasks: Task[]
  onRefresh: () => void
}

type FilterType = 'all' | 'active' | 'completed' | 'overdue'

export function TasksPanel({ entityType, entityId, tasks, onRefresh }: TasksPanelProps) {
  const [filter, setFilter] = useState<FilterType>('active')
  const [showAddDrawer, setShowAddDrawer] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  const { completeTask } = useCompleteTask()
  const { deleteTask } = useDeleteTask()

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    switch (filter) {
      case 'active':
        return task.status !== 'completed' && task.status !== 'cancelled'
      case 'completed':
        return task.status === 'completed'
      case 'overdue':
        return task.is_overdue && task.status !== 'completed' && task.status !== 'cancelled'
      default:
        return true
    }
  })

  // Sort tasks: overdue first, then by due date, then by priority
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    // Overdue items first
    if (a.is_overdue && !b.is_overdue) return -1
    if (!a.is_overdue && b.is_overdue) return 1

    // Then by due date (closest first)
    if (a.due_date && b.due_date) {
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    }
    if (a.due_date && !b.due_date) return -1
    if (!a.due_date && b.due_date) return 1

    // Then by priority
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })

  // Task counts
  const activeTasks = tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled')
  const overdueTasks = activeTasks.filter(t => t.is_overdue)
  const completedTasks = tasks.filter(t => t.status === 'completed')

  const handleComplete = async (taskId: string) => {
    try {
      await completeTask(taskId)
      onRefresh()
    } catch (error) {
      console.error('Failed to complete task:', error)
    }
  }

  const handleDelete = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return
    try {
      await deleteTask(taskId)
      onRefresh()
    } catch (error) {
      console.error('Failed to delete task:', error)
    }
  }

  const handleEdit = (task: Task) => {
    setEditingTask(task)
    setShowAddDrawer(true)
  }

  const handleAddSuccess = () => {
    setShowAddDrawer(false)
    setEditingTask(null)
    onRefresh()
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-gray-900">Tasks</h3>
          <button
            onClick={() => {
              setEditingTask(null)
              setShowAddDrawer(true)
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Task
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          <FilterTab
            active={filter === 'active'}
            onClick={() => setFilter('active')}
            icon={<Clock className="w-3.5 h-3.5" />}
            label="Active"
            count={activeTasks.length}
          />
          <FilterTab
            active={filter === 'overdue'}
            onClick={() => setFilter('overdue')}
            icon={<AlertTriangle className="w-3.5 h-3.5" />}
            label="Overdue"
            count={overdueTasks.length}
            variant="danger"
          />
          <FilterTab
            active={filter === 'completed'}
            onClick={() => setFilter('completed')}
            icon={<CheckCircle2 className="w-3.5 h-3.5" />}
            label="Done"
            count={completedTasks.length}
          />
          <FilterTab
            active={filter === 'all'}
            onClick={() => setFilter('all')}
            icon={<Filter className="w-3.5 h-3.5" />}
            label="All"
            count={tasks.length}
          />
        </div>
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto p-4">
        {sortedTasks.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm">
              {filter === 'active' && 'No active tasks'}
              {filter === 'completed' && 'No completed tasks'}
              {filter === 'overdue' && 'No overdue tasks'}
              {filter === 'all' && 'No tasks yet'}
            </p>
            <button
              onClick={() => {
                setEditingTask(null)
                setShowAddDrawer(true)
              }}
              className="mt-2 text-sm text-blue-600 hover:text-blue-700"
            >
              Create your first task
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onComplete={handleComplete}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Task Drawer */}
      <AddTaskDrawer
        isOpen={showAddDrawer}
        onClose={() => {
          setShowAddDrawer(false)
          setEditingTask(null)
        }}
        entityType={entityType}
        entityId={entityId}
        task={editingTask}
        onSuccess={handleAddSuccess}
      />
    </div>
  )
}

// Filter tab button component
function FilterTab({
  active,
  onClick,
  icon,
  label,
  count,
  variant = 'default',
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  count: number
  variant?: 'default' | 'danger'
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
        active
          ? 'bg-white text-gray-900 shadow-sm'
          : 'text-gray-600 hover:text-gray-900'
      }`}
    >
      {icon}
      {label}
      {count > 0 && (
        <span
          className={`min-w-[1.25rem] px-1 py-0.5 rounded-full text-[10px] ${
            active
              ? variant === 'danger'
                ? 'bg-red-100 text-red-700'
                : 'bg-gray-100 text-gray-600'
              : variant === 'danger'
              ? 'bg-red-100 text-red-600'
              : 'bg-gray-200 text-gray-500'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  )
}

export default TasksPanel
