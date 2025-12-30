import { useState, useCallback, useEffect } from 'react'
import {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  completeTask,
  getMyTasks,
  getOverdueTasks,
  type TaskListParams,
} from '@/services/api'
import type {
  Task,
  TaskCreateInput,
  TaskUpdateInput,
  EntityType,
} from '@/types'

// =============================================================================
// useTasks - List tasks with optional filters
// =============================================================================

interface UseTasksReturn {
  tasks: Task[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useTasks(params?: TaskListParams): UseTasksReturn {
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTasks = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getTasks(params)
      setTasks(data)
    } catch (err) {
      console.error('Error fetching tasks:', err)
      setError('Failed to fetch tasks')
    } finally {
      setIsLoading(false)
    }
  }, [params?.entity_type, params?.entity_id, params?.status, params?.assigned_to, params?.priority])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  return { tasks, isLoading, error, refetch: fetchTasks }
}

// =============================================================================
// useEntityTasks - Tasks for a specific entity
// =============================================================================

export function useEntityTasks(
  entityType: EntityType | undefined,
  entityId: string | undefined
): UseTasksReturn {
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTasks = useCallback(async () => {
    if (!entityType || !entityId) {
      setTasks([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const data = await getTasks({ entity_type: entityType, entity_id: entityId })
      setTasks(data)
    } catch (err) {
      console.error('Error fetching entity tasks:', err)
      setError('Failed to fetch tasks')
    } finally {
      setIsLoading(false)
    }
  }, [entityType, entityId])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  return { tasks, isLoading, error, refetch: fetchTasks }
}

// =============================================================================
// useTask - Single task
// =============================================================================

interface UseTaskReturn {
  task: Task | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useTask(taskId: string | undefined): UseTaskReturn {
  const [task, setTask] = useState<Task | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTask = useCallback(async () => {
    if (!taskId) {
      setTask(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const data = await getTask(taskId)
      setTask(data)
    } catch (err) {
      console.error('Error fetching task:', err)
      setError('Failed to fetch task')
    } finally {
      setIsLoading(false)
    }
  }, [taskId])

  useEffect(() => {
    fetchTask()
  }, [fetchTask])

  return { task, isLoading, error, refetch: fetchTask }
}

// =============================================================================
// useCreateTask
// =============================================================================

interface UseCreateTaskReturn {
  createTask: (data: TaskCreateInput) => Promise<Task>
  isCreating: boolean
  error: string | null
}

export function useCreateTask(): UseCreateTaskReturn {
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const create = useCallback(async (data: TaskCreateInput): Promise<Task> => {
    setIsCreating(true)
    setError(null)
    try {
      const result = await createTask(data)
      return result
    } catch (err) {
      const axiosError = err as { response?: { data?: { error?: string } } }
      const message = axiosError.response?.data?.error || 'Failed to create task'
      setError(message)
      throw err
    } finally {
      setIsCreating(false)
    }
  }, [])

  return { createTask: create, isCreating, error }
}

// =============================================================================
// useUpdateTask
// =============================================================================

interface UseUpdateTaskReturn {
  updateTask: (taskId: string, data: TaskUpdateInput) => Promise<Task>
  isUpdating: boolean
  error: string | null
}

export function useUpdateTask(): UseUpdateTaskReturn {
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const update = useCallback(async (taskId: string, data: TaskUpdateInput): Promise<Task> => {
    setIsUpdating(true)
    setError(null)
    try {
      const result = await updateTask(taskId, data)
      return result
    } catch (err) {
      const axiosError = err as { response?: { data?: { error?: string } } }
      const message = axiosError.response?.data?.error || 'Failed to update task'
      setError(message)
      throw err
    } finally {
      setIsUpdating(false)
    }
  }, [])

  return { updateTask: update, isUpdating, error }
}

// =============================================================================
// useDeleteTask
// =============================================================================

interface UseDeleteTaskReturn {
  deleteTask: (taskId: string) => Promise<void>
  isDeleting: boolean
  error: string | null
}

export function useDeleteTask(): UseDeleteTaskReturn {
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const remove = useCallback(async (taskId: string): Promise<void> => {
    setIsDeleting(true)
    setError(null)
    try {
      await deleteTask(taskId)
    } catch (err) {
      const axiosError = err as { response?: { data?: { error?: string } } }
      const message = axiosError.response?.data?.error || 'Failed to delete task'
      setError(message)
      throw err
    } finally {
      setIsDeleting(false)
    }
  }, [])

  return { deleteTask: remove, isDeleting, error }
}

// =============================================================================
// useCompleteTask
// =============================================================================

interface UseCompleteTaskReturn {
  completeTask: (taskId: string) => Promise<Task>
  isCompleting: boolean
  error: string | null
}

export function useCompleteTask(): UseCompleteTaskReturn {
  const [isCompleting, setIsCompleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const complete = useCallback(async (taskId: string): Promise<Task> => {
    setIsCompleting(true)
    setError(null)
    try {
      const result = await completeTask(taskId)
      return result
    } catch (err) {
      const axiosError = err as { response?: { data?: { error?: string } } }
      const message = axiosError.response?.data?.error || 'Failed to complete task'
      setError(message)
      throw err
    } finally {
      setIsCompleting(false)
    }
  }, [])

  return { completeTask: complete, isCompleting, error }
}

// =============================================================================
// useMyTasks - Current user's tasks
// =============================================================================

export function useMyTasks(includeCompleted = false): UseTasksReturn {
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTasks = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getMyTasks(includeCompleted)
      setTasks(data)
    } catch (err) {
      console.error('Error fetching my tasks:', err)
      setError('Failed to fetch tasks')
    } finally {
      setIsLoading(false)
    }
  }, [includeCompleted])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  return { tasks, isLoading, error, refetch: fetchTasks }
}

// =============================================================================
// useOverdueTasks
// =============================================================================

export function useOverdueTasks(myOnly = false): UseTasksReturn {
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTasks = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getOverdueTasks(myOnly)
      setTasks(data)
    } catch (err) {
      console.error('Error fetching overdue tasks:', err)
      setError('Failed to fetch overdue tasks')
    } finally {
      setIsLoading(false)
    }
  }, [myOnly])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  return { tasks, isLoading, error, refetch: fetchTasks }
}
