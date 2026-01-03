import { useState, useMemo, useCallback, useEffect } from 'react'
import { Plus, Search, CheckSquare, List, LayoutGrid, AlertTriangle, PlayCircle, CalendarDays } from 'lucide-react'
import { useTasks, useCompleteTask, useDeleteTask, useUpdateTask, useStaffUsers } from '@/hooks'
import { TaskListView, TaskKanbanView } from '@/components/tasks'
import { TaskDetailDrawer } from '@/components/tasks/TaskDetailDrawer'
import { AddTaskDrawer } from '@/components/service/AddTaskDrawer'
import type { Task, TaskPriority, EntityType } from '@/types'
import { TaskStatus } from '@/types'

type TaskFilter = 'all' | 'my_tasks' | 'overdue' | 'completed'
type ViewMode = 'list' | 'kanban'

export default function TasksPage() {
  // View mode - persist to localStorage
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('tasksViewMode')
    return (saved === 'kanban' || saved === 'list') ? saved : 'list'
  })

  // Persist view mode
  useEffect(() => {
    localStorage.setItem('tasksViewMode', viewMode)
  }, [viewMode])

  // Filters
  const [filter, setFilter] = useState<TaskFilter>('all')
  const [statusFilter, setStatusFilter] = useState<TaskStatus | ''>('')
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | ''>('')
  const [entityTypeFilter, setEntityTypeFilter] = useState<EntityType | ''>('')
  const [assigneeFilter, setAssigneeFilter] = useState<number | ''>('')
  const [searchQuery, setSearchQuery] = useState('')

  // Drawers
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false)
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false)

  // Data fetching
  const { tasks, isLoading, error, refetch } = useTasks()
  const { completeTask, isCompleting } = useCompleteTask()
  const { deleteTask, isDeleting } = useDeleteTask()
  const { updateTask } = useUpdateTask()
  const { staffUsers } = useStaffUsers()

  // Filter tasks
  const filteredTasks = useMemo(() => {
    let result = [...tasks]

    // Quick filter tabs
    if (filter === 'overdue') {
      result = result.filter(t => t.is_overdue && t.status !== 'completed' && t.status !== 'cancelled')
    } else if (filter === 'completed') {
      result = result.filter(t => t.status === 'completed')
    } else if (filter !== 'all') {
      result = result.filter(t => t.status !== 'completed' && t.status !== 'cancelled')
    }

    // Additional filters
    if (statusFilter) {
      result = result.filter(t => t.status === statusFilter)
    }
    if (priorityFilter) {
      result = result.filter(t => t.priority === priorityFilter)
    }
    if (entityTypeFilter) {
      result = result.filter(t => t.entity_type === entityTypeFilter)
    }
    if (assigneeFilter) {
      result = result.filter(t => t.assigned_to === assigneeFilter)
    }

    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        t =>
          t.title.toLowerCase().includes(query) ||
          t.description?.toLowerCase().includes(query)
      )
    }

    // Sort: overdue first, then by due date, then by priority
    result.sort((a, b) => {
      // Overdue first
      if (a.is_overdue && !b.is_overdue) return -1
      if (!a.is_overdue && b.is_overdue) return 1

      // Then by due date
      if (a.due_date && b.due_date) {
        const dateA = new Date(a.due_date).getTime()
        const dateB = new Date(b.due_date).getTime()
        if (dateA !== dateB) return dateA - dateB
      }
      if (a.due_date && !b.due_date) return -1
      if (!a.due_date && b.due_date) return 1

      // Then by priority
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    })

    return result
  }, [tasks, filter, statusFilter, priorityFilter, entityTypeFilter, assigneeFilter, searchQuery])

  // Counts for tabs
  const counts = useMemo(() => {
    const all = tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled').length
    const overdue = tasks.filter(t => t.is_overdue && t.status !== 'completed' && t.status !== 'cancelled').length
    const completed = tasks.filter(t => t.status === 'completed').length
    return { all, overdue, completed, total: tasks.length }
  }, [tasks])

  // Summary stats for cards
  const summaryStats = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const inProgress = tasks.filter(t => t.status === 'in_progress').length
    const pending = tasks.filter(t => t.status === 'pending').length
    const overdue = tasks.filter(t => t.is_overdue && t.status !== 'completed' && t.status !== 'cancelled').length
    const dueToday = tasks.filter(t => {
      if (!t.due_date || t.status === 'completed' || t.status === 'cancelled') return false
      const dueDate = new Date(t.due_date)
      dueDate.setHours(0, 0, 0, 0)
      return dueDate.getTime() === today.getTime()
    }).length

    return { inProgress, pending, overdue, dueToday, total: tasks.length }
  }, [tasks])

  // Handlers
  const handleTaskClick = useCallback((task: Task) => {
    setSelectedTask(task)
    setIsDetailDrawerOpen(true)
  }, [])

  const handleComplete = useCallback(async (taskId: string) => {
    try {
      await completeTask(taskId)
      refetch()
    } catch (err) {
      console.error('Failed to complete task:', err)
    }
  }, [completeTask, refetch])

  const handleDelete = useCallback(async (taskId: string) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return
    try {
      await deleteTask(taskId)
      refetch()
      if (selectedTask?.id === taskId) {
        setIsDetailDrawerOpen(false)
        setSelectedTask(null)
      }
    } catch (err) {
      console.error('Failed to delete task:', err)
    }
  }, [deleteTask, refetch, selectedTask])

  const handleAddSuccess = useCallback(() => {
    setIsAddDrawerOpen(false)
    refetch()
  }, [refetch])

  const handleDetailSuccess = useCallback(() => {
    refetch()
  }, [refetch])

  const handleStatusChange = useCallback(async (taskId: string, newStatus: TaskStatus) => {
    try {
      await updateTask(taskId, { status: newStatus })
      refetch()
    } catch (err) {
      console.error('Failed to update task status:', err)
    }
  }, [updateTask, refetch])

  const clearFilters = () => {
    setStatusFilter('')
    setPriorityFilter('')
    setEntityTypeFilter('')
    setAssigneeFilter('')
    setSearchQuery('')
  }

  const hasActiveFilters = statusFilter || priorityFilter || entityTypeFilter || assigneeFilter || searchQuery

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold text-gray-900 dark:text-gray-100">Tasks</h1>
          <p className="text-[14px] text-gray-500 dark:text-gray-400 mt-1">
            Manage and track your tasks across all entities
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 transition-colors ${
                viewMode === 'list'
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'
              }`}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-2 transition-colors ${
                viewMode === 'kanban'
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'
              }`}
              title="Kanban view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setIsAddDrawerOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors text-[14px] font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Task
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <CheckSquare className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total</p>
              <p className="text-[20px] font-semibold text-gray-900 dark:text-gray-100">
                {isLoading ? '-' : summaryStats.total}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
              <PlayCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">In Progress</p>
              <p className="text-[20px] font-semibold text-gray-900 dark:text-gray-100">
                {isLoading ? '-' : summaryStats.inProgress}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
              <CalendarDays className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">Due Today</p>
              <p className="text-[20px] font-semibold text-gray-900 dark:text-gray-100">
                {isLoading ? '-' : summaryStats.dueToday}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
              summaryStats.overdue > 0
                ? 'bg-red-50 dark:bg-red-900/20'
                : 'bg-gray-100 dark:bg-gray-800'
            }`}>
              <AlertTriangle className={`w-4 h-4 ${
                summaryStats.overdue > 0
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-gray-400'
              }`} />
            </div>
            <div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">Overdue</p>
              <p className={`text-[20px] font-semibold ${
                summaryStats.overdue > 0
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-gray-900 dark:text-gray-100'
              }`}>
                {isLoading ? '-' : summaryStats.overdue}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Filter Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 text-[14px] font-medium border-b-2 -mb-px transition-colors ${
            filter === 'all'
              ? 'border-gray-900 dark:border-gray-100 text-gray-900 dark:text-gray-100'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Active ({counts.all})
        </button>
        <button
          onClick={() => setFilter('overdue')}
          className={`px-4 py-2 text-[14px] font-medium border-b-2 -mb-px transition-colors ${
            filter === 'overdue'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Overdue ({counts.overdue})
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-4 py-2 text-[14px] font-medium border-b-2 -mb-px transition-colors ${
            filter === 'completed'
              ? 'border-green-600 text-green-600'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Completed ({counts.completed})
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-[14px] bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-700"
          />
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as TaskStatus | '')}
          className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-[14px] bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-700"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>

        {/* Priority Filter */}
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as TaskPriority | '')}
          className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-[14px] bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-700"
        >
          <option value="">All Priority</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        {/* Entity Type Filter */}
        <select
          value={entityTypeFilter}
          onChange={(e) => setEntityTypeFilter(e.target.value as EntityType | '')}
          className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-[14px] bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-700"
        >
          <option value="">All Types</option>
          <option value="lead">Lead</option>
          <option value="company">Company</option>
          <option value="candidate">Candidate</option>
          <option value="application">Application</option>
        </select>

        {/* Assignee Filter */}
        <select
          value={assigneeFilter}
          onChange={(e) => setAssigneeFilter(e.target.value ? Number(e.target.value) : '')}
          className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-[14px] bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-700"
        >
          <option value="">All Assignees</option>
          {staffUsers?.map((user) => (
            <option key={user.id} value={user.id}>
              {user.first_name} {user.last_name}
            </option>
          ))}
        </select>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="px-3 py-2 text-[14px] text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Task Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-[14px] text-red-500">{error}</p>
          <button
            onClick={refetch}
            className="mt-2 text-[14px] text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            Try again
          </button>
        </div>
      ) : viewMode === 'kanban' ? (
        /* Kanban View */
        <div className="min-h-[500px]">
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckSquare className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-[14px] text-gray-500 dark:text-gray-400">
                No tasks yet. Create one to get started!
              </p>
              <button
                onClick={() => setIsAddDrawerOpen(true)}
                className="mt-3 text-[14px] font-medium text-gray-900 dark:text-gray-100 hover:underline"
              >
                Create your first task
              </button>
            </div>
          ) : (
            <TaskKanbanView
              tasks={filteredTasks}
              onTaskClick={handleTaskClick}
              onTaskComplete={handleComplete}
              onTaskDelete={handleDelete}
              onTaskStatusChange={handleStatusChange}
              isLoading={isLoading}
            />
          )}
        </div>
      ) : (
        /* List View */
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
          {filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckSquare className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-[14px] text-gray-500 dark:text-gray-400">
                {hasActiveFilters || filter !== 'all'
                  ? 'No tasks match your filters'
                  : 'No tasks yet. Create one to get started!'}
              </p>
              {!hasActiveFilters && filter === 'all' && (
                <button
                  onClick={() => setIsAddDrawerOpen(true)}
                  className="mt-3 text-[14px] font-medium text-gray-900 dark:text-gray-100 hover:underline"
                >
                  Create your first task
                </button>
              )}
            </div>
          ) : (
            <TaskListView
              tasks={filteredTasks}
              onTaskClick={handleTaskClick}
              onComplete={handleComplete}
              onDelete={handleDelete}
              isCompleting={isCompleting}
              isDeleting={isDeleting}
            />
          )}
        </div>
      )}

      {/* Task Detail Drawer */}
      <TaskDetailDrawer
        isOpen={isDetailDrawerOpen}
        task={selectedTask}
        onClose={() => {
          setIsDetailDrawerOpen(false)
          setSelectedTask(null)
        }}
        onSuccess={handleDetailSuccess}
        onDelete={handleDelete}
      />

      {/* Add Task Drawer - standalone mode */}
      <AddTaskDrawer
        isOpen={isAddDrawerOpen}
        onClose={() => setIsAddDrawerOpen(false)}
        onSuccess={handleAddSuccess}
        standaloneMode
      />
    </div>
  )
}
