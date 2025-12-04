import { useState, useEffect, useCallback, useRef } from 'react'
import api from '@/services/api'
import type { Notification } from '@/types'

// ============================================================================
// Notifications List Hook
// ============================================================================

interface UseNotificationsOptions {
  unreadOnly?: boolean
  limit?: number
}

interface UseNotificationsReturn {
  notifications: Notification[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  hasMore: boolean
  loadMore: () => Promise<void>
}

export function useNotifications(options: UseNotificationsOptions = {}): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const limit = options.limit || 20

  const fetchNotifications = useCallback(
    async (reset = true) => {
      setIsLoading(true)
      setError(null)
      try {
        const currentOffset = reset ? 0 : offset
        const params = new URLSearchParams()
        if (options.unreadOnly) params.append('unread_only', 'true')
        params.append('limit', String(limit))
        params.append('offset', String(currentOffset))

        const response = await api.get<Notification[]>(
          `/jobs/notifications/?${params.toString()}`
        )

        if (reset) {
          setNotifications(response.data)
          setOffset(limit)
        } else {
          setNotifications((prev) => [...prev, ...response.data])
          setOffset(currentOffset + limit)
        }
        setHasMore(response.data.length === limit)
      } catch (err) {
        setError('Failed to load notifications')
        console.error('Error fetching notifications:', err)
      } finally {
        setIsLoading(false)
      }
    },
    [options.unreadOnly, limit, offset]
  )

  const loadMore = useCallback(async () => {
    if (!isLoading && hasMore) {
      await fetchNotifications(false)
    }
  }, [fetchNotifications, isLoading, hasMore])

  useEffect(() => {
    fetchNotifications(true)
    // Only refetch when unreadOnly changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.unreadOnly])

  return {
    notifications,
    isLoading,
    error,
    refetch: () => fetchNotifications(true),
    hasMore,
    loadMore,
  }
}

// ============================================================================
// Unread Count Hook
// ============================================================================

interface UseUnreadCountReturn {
  count: number
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useUnreadCount(): UseUnreadCountReturn {
  const [count, setCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCount = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get<{ unread_count: number }>('/jobs/notifications/unread-count/')
      setCount(response.data.unread_count)
    } catch (err) {
      setError('Failed to load unread count')
      console.error('Error fetching unread count:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCount()
  }, [fetchCount])

  return { count, isLoading, error, refetch: fetchCount }
}

// ============================================================================
// Unread Count with Polling Hook
// ============================================================================

interface UseUnreadCountPollingOptions {
  intervalMs?: number
  enabled?: boolean
}

export function useUnreadCountPolling(
  options: UseUnreadCountPollingOptions = {}
): UseUnreadCountReturn {
  const { intervalMs = 30000, enabled = true } = options
  const [count, setCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchCount = useCallback(async () => {
    try {
      const response = await api.get<{ unread_count: number }>('/jobs/notifications/unread-count/')
      setCount(response.data.unread_count)
      setError(null)
    } catch (err) {
      setError('Failed to load unread count')
      console.error('Error fetching unread count:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!enabled) return

    // Initial fetch
    fetchCount()

    // Set up polling
    intervalRef.current = setInterval(fetchCount, intervalMs)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [fetchCount, intervalMs, enabled])

  return { count, isLoading, error, refetch: fetchCount }
}

// ============================================================================
// Single Notification Hook
// ============================================================================

interface UseNotificationReturn {
  notification: Notification | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useNotification(notificationId: string): UseNotificationReturn {
  const [notification, setNotification] = useState<Notification | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchNotification = useCallback(async () => {
    if (!notificationId) return

    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get<Notification>(
        `/jobs/notifications/${notificationId}/`
      )
      setNotification(response.data)
    } catch (err) {
      setError('Failed to load notification')
      console.error('Error fetching notification:', err)
    } finally {
      setIsLoading(false)
    }
  }, [notificationId])

  useEffect(() => {
    fetchNotification()
  }, [fetchNotification])

  return { notification, isLoading, error, refetch: fetchNotification }
}

// ============================================================================
// Mark Notifications Read Hook
// ============================================================================

interface UseMarkNotificationsReadReturn {
  markAsRead: (notificationIds: string[]) => Promise<void>
  markAllAsRead: () => Promise<void>
  isMarking: boolean
  error: string | null
}

export function useMarkNotificationsRead(): UseMarkNotificationsReadReturn {
  const [isMarking, setIsMarking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const markAsRead = useCallback(async (notificationIds: string[]): Promise<void> => {
    setIsMarking(true)
    setError(null)
    try {
      await api.post('/jobs/notifications/mark-read/', {
        notification_ids: notificationIds,
      })
    } catch (err) {
      const axiosError = err as { response?: { data?: { error?: string } } }
      const message = axiosError.response?.data?.error || 'Failed to mark notifications as read'
      setError(message)
      console.error('Error marking notifications as read:', err)
      throw err
    } finally {
      setIsMarking(false)
    }
  }, [])

  const markAllAsRead = useCallback(async (): Promise<void> => {
    setIsMarking(true)
    setError(null)
    try {
      await api.post('/jobs/notifications/mark-read/', {
        mark_all: true,
      })
    } catch (err) {
      const axiosError = err as { response?: { data?: { error?: string } } }
      const message = axiosError.response?.data?.error || 'Failed to mark all notifications as read'
      setError(message)
      console.error('Error marking all notifications as read:', err)
      throw err
    } finally {
      setIsMarking(false)
    }
  }, [])

  return { markAsRead, markAllAsRead, isMarking, error }
}
