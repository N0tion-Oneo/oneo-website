import { useState, useCallback } from 'react'
import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import api from '@/services/api'
import type { Notification } from '@/types'

// ============================================================================
// Query Keys - Centralized for cache invalidation
// ============================================================================

export const notificationKeys = {
  all: ['notifications'] as const,
  list: (options?: { unreadOnly?: boolean; limit?: number }) =>
    [...notificationKeys.all, 'list', options] as const,
  unreadCount: () => [...notificationKeys.all, 'unreadCount'] as const,
  detail: (id: string) => [...notificationKeys.all, 'detail', id] as const,
}

// ============================================================================
// API Functions
// ============================================================================

async function fetchUnreadCount(): Promise<number> {
  const response = await api.get<{ unread_count: number }>('/notifications/unread-count/')
  return response.data.unread_count
}

interface NotificationsResponse {
  notifications: Notification[]
  unread_count: number
}

async function fetchNotifications(
  limit: number,
  offset: number,
  unreadOnly?: boolean
): Promise<NotificationsResponse> {
  const params = new URLSearchParams()
  if (unreadOnly) params.append('unread_only', 'true')
  params.append('limit', String(limit))
  params.append('offset', String(offset))

  const response = await api.get<NotificationsResponse>(`/notifications/?${params.toString()}`)
  return response.data
}

// ============================================================================
// Notifications List Hook - Uses React Query for shared caching
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

/**
 * Hook to fetch notifications list with pagination.
 * Uses React Query's useInfiniteQuery for shared caching - all components
 * using this hook with the same options share the same cached data,
 * preventing duplicate API calls.
 */
export function useNotifications(options: UseNotificationsOptions = {}): UseNotificationsReturn {
  const limit = options.limit || 20

  const {
    data,
    isLoading,
    error,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: notificationKeys.list({ unreadOnly: options.unreadOnly, limit }),
    queryFn: async ({ pageParam = 0 }) => {
      const result = await fetchNotifications(limit, pageParam, options.unreadOnly)
      return {
        notifications: result.notifications || [],
        nextOffset: pageParam + limit,
      }
    },
    getNextPageParam: (lastPage) => {
      // If we got fewer items than the limit, there are no more pages
      if (lastPage.notifications.length < limit) {
        return undefined
      }
      return lastPage.nextOffset
    },
    initialPageParam: 0,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes cache
  })

  // Flatten all pages into a single notifications array
  const notifications = data?.pages.flatMap((page) => page.notifications) ?? []

  return {
    notifications,
    isLoading: isLoading || isFetchingNextPage,
    error: error ? 'Failed to load notifications' : null,
    refetch: async () => { await refetch() },
    hasMore: hasNextPage ?? false,
    loadMore: async () => { await fetchNextPage() },
  }
}

// ============================================================================
// Unread Count Hook - Uses React Query for shared caching
// ============================================================================

interface UseUnreadCountReturn {
  count: number
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Hook to fetch notification unread count.
 * Uses React Query with shared caching - all components using this hook
 * share the same cached data, preventing duplicate API calls.
 */
export function useUnreadCount(): UseUnreadCountReturn {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: fetchUnreadCount,
    staleTime: 30 * 1000, // 30 seconds - matches previous polling interval
    gcTime: 5 * 60 * 1000, // 5 minutes cache
  })

  return {
    count: data ?? 0,
    isLoading,
    error: error ? 'Failed to load unread count' : null,
    refetch: async () => { await refetch() },
  }
}

// ============================================================================
// Unread Count with Polling Hook - Uses React Query refetchInterval
// ============================================================================

interface UseUnreadCountPollingOptions {
  intervalMs?: number
  enabled?: boolean
}

/**
 * Hook to fetch notification unread count with polling.
 * Uses React Query with refetchInterval for automatic polling.
 * All components share the same cached data and polling interval,
 * preventing duplicate API calls even with multiple instances.
 */
export function useUnreadCountPolling(
  options: UseUnreadCountPollingOptions = {}
): UseUnreadCountReturn {
  const { intervalMs = 30000, enabled = true } = options

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: fetchUnreadCount,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes cache
    refetchInterval: enabled ? intervalMs : false,
    refetchIntervalInBackground: false, // Don't poll when tab is not focused
  })

  return {
    count: data ?? 0,
    isLoading,
    error: error ? 'Failed to load unread count' : null,
    refetch: async () => { await refetch() },
  }
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
        `/notifications/${notificationId}/`
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
      await api.post('/notifications/mark-read/', {
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
      await api.post('/notifications/mark-read/', {
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
