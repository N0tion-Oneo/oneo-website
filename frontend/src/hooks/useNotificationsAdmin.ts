import { useState, useEffect, useCallback } from 'react'
import api from '@/services/api'
import type {
  AdminNotification,
  NotificationTemplate,
  SendNotificationInput,
  BroadcastInput,
  NotificationType,
  NotificationChannel,
  UserSearchResult,
} from '@/types'

// ============================================================================
// Admin Notifications List Hook
// ============================================================================

interface AdminNotificationsOptions {
  page?: number
  pageSize?: number
  notificationType?: NotificationType | ''
  channel?: NotificationChannel | ''
  isRead?: boolean | null
  emailSent?: boolean | null
  search?: string
}

interface AdminNotificationsResponse {
  results: AdminNotification[]
  count: number
  num_pages: number
  page: number
  has_next: boolean
  has_previous: boolean
}

interface UseAdminNotificationsReturn {
  notifications: AdminNotification[]
  count: number
  numPages: number
  page: number
  hasNext: boolean
  hasPrevious: boolean
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useAdminNotifications(
  options: AdminNotificationsOptions = {}
): UseAdminNotificationsReturn {
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const [count, setCount] = useState(0)
  const [numPages, setNumPages] = useState(0)
  const [page, setPage] = useState(1)
  const [hasNext, setHasNext] = useState(false)
  const [hasPrevious, setHasPrevious] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (options.page) params.append('page', String(options.page))
      if (options.pageSize) params.append('page_size', String(options.pageSize))
      if (options.notificationType) params.append('notification_type', options.notificationType)
      if (options.channel) params.append('channel', options.channel)
      if (options.isRead !== null && options.isRead !== undefined) {
        params.append('is_read', String(options.isRead))
      }
      if (options.emailSent !== null && options.emailSent !== undefined) {
        params.append('email_sent', String(options.emailSent))
      }
      if (options.search) params.append('search', options.search)

      const response = await api.get<AdminNotificationsResponse>(
        `/notifications/admin/?${params.toString()}`
      )
      setNotifications(response.data.results)
      setCount(response.data.count)
      setNumPages(response.data.num_pages)
      setPage(response.data.page)
      setHasNext(response.data.has_next)
      setHasPrevious(response.data.has_previous)
    } catch (err) {
      setError('Failed to load notifications')
      console.error('Error fetching admin notifications:', err)
    } finally {
      setIsLoading(false)
    }
  }, [
    options.page,
    options.pageSize,
    options.notificationType,
    options.channel,
    options.isRead,
    options.emailSent,
    options.search,
  ])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  return {
    notifications,
    count,
    numPages,
    page,
    hasNext,
    hasPrevious,
    isLoading,
    error,
    refetch: fetchNotifications,
  }
}

// ============================================================================
// Send Notification Hook
// ============================================================================

interface UseSendNotificationReturn {
  sendNotification: (data: SendNotificationInput) => Promise<{ sent_count: number }>
  isSending: boolean
  error: string | null
}

export function useSendNotification(): UseSendNotificationReturn {
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendNotification = useCallback(
    async (data: SendNotificationInput): Promise<{ sent_count: number }> => {
      setIsSending(true)
      setError(null)
      try {
        const response = await api.post<{ sent_count: number; notifications: AdminNotification[] }>(
          '/notifications/admin/send/',
          data
        )
        return { sent_count: response.data.sent_count }
      } catch (err) {
        const axiosError = err as { response?: { data?: { error?: string } } }
        const message = axiosError.response?.data?.error || 'Failed to send notification'
        setError(message)
        throw err
      } finally {
        setIsSending(false)
      }
    },
    []
  )

  return { sendNotification, isSending, error }
}

// ============================================================================
// Broadcast Hook
// ============================================================================

interface UseBroadcastReturn {
  broadcast: (data: BroadcastInput) => Promise<{ sent_count: number; recipient_filter: string }>
  isBroadcasting: boolean
  error: string | null
}

export function useBroadcast(): UseBroadcastReturn {
  const [isBroadcasting, setIsBroadcasting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const broadcast = useCallback(
    async (data: BroadcastInput): Promise<{ sent_count: number; recipient_filter: string }> => {
      setIsBroadcasting(true)
      setError(null)
      try {
        const response = await api.post<{ sent_count: number; recipient_filter: string }>(
          '/notifications/admin/broadcast/',
          data
        )
        return response.data
      } catch (err) {
        const axiosError = err as { response?: { data?: { error?: string } } }
        const message = axiosError.response?.data?.error || 'Failed to broadcast notification'
        setError(message)
        throw err
      } finally {
        setIsBroadcasting(false)
      }
    },
    []
  )

  return { broadcast, isBroadcasting, error }
}

// ============================================================================
// Bulk Delete Hook
// ============================================================================

interface UseBulkDeleteReturn {
  bulkDelete: (notificationIds: string[]) => Promise<number>
  isDeleting: boolean
  error: string | null
}

export function useBulkDeleteNotifications(): UseBulkDeleteReturn {
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const bulkDelete = useCallback(async (notificationIds: string[]): Promise<number> => {
    setIsDeleting(true)
    setError(null)
    try {
      const response = await api.post<{ deleted_count: number }>(
        '/notifications/admin/bulk-delete/',
        { notification_ids: notificationIds }
      )
      return response.data.deleted_count
    } catch (err) {
      const axiosError = err as { response?: { data?: { error?: string } } }
      const message = axiosError.response?.data?.error || 'Failed to delete notifications'
      setError(message)
      throw err
    } finally {
      setIsDeleting(false)
    }
  }, [])

  return { bulkDelete, isDeleting, error }
}

// ============================================================================
// Notification Templates Hooks
// ============================================================================

interface UseNotificationTemplatesOptions {
  isActive?: boolean | null
  isCustom?: boolean | null
  search?: string
}

interface UseNotificationTemplatesReturn {
  templates: NotificationTemplate[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useNotificationTemplates(
  options: UseNotificationTemplatesOptions = {}
): UseNotificationTemplatesReturn {
  const [templates, setTemplates] = useState<NotificationTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTemplates = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (options.isActive !== null && options.isActive !== undefined) {
        params.append('is_active', String(options.isActive))
      }
      if (options.isCustom !== null && options.isCustom !== undefined) {
        params.append('is_custom', String(options.isCustom))
      }
      if (options.search) params.append('search', options.search)

      const response = await api.get<NotificationTemplate[]>(
        `/notifications/templates/?${params.toString()}`
      )
      setTemplates(response.data)
    } catch (err) {
      setError('Failed to load templates')
      console.error('Error fetching templates:', err)
    } finally {
      setIsLoading(false)
    }
  }, [options.isActive, options.isCustom, options.search])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  return { templates, isLoading, error, refetch: fetchTemplates }
}

// ============================================================================
// Single Template Hook
// ============================================================================

interface UseNotificationTemplateReturn {
  template: NotificationTemplate | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useNotificationTemplate(templateId: string): UseNotificationTemplateReturn {
  const [template, setTemplate] = useState<NotificationTemplate | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTemplate = useCallback(async () => {
    if (!templateId) return

    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get<NotificationTemplate>(
        `/notifications/templates/${templateId}/`
      )
      setTemplate(response.data)
    } catch (err) {
      setError('Failed to load template')
      console.error('Error fetching template:', err)
    } finally {
      setIsLoading(false)
    }
  }, [templateId])

  useEffect(() => {
    fetchTemplate()
  }, [fetchTemplate])

  return { template, isLoading, error, refetch: fetchTemplate }
}

// ============================================================================
// Create Template Hook
// ============================================================================

interface UseCreateTemplateReturn {
  createTemplate: (data: Partial<NotificationTemplate>) => Promise<NotificationTemplate>
  isCreating: boolean
  error: string | null
}

export function useCreateTemplate(): UseCreateTemplateReturn {
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createTemplate = useCallback(
    async (data: Partial<NotificationTemplate>): Promise<NotificationTemplate> => {
      setIsCreating(true)
      setError(null)
      try {
        const response = await api.post<NotificationTemplate>('/notifications/templates/', data)
        return response.data
      } catch (err) {
        const axiosError = err as { response?: { data?: { error?: string } } }
        const message = axiosError.response?.data?.error || 'Failed to create template'
        setError(message)
        throw err
      } finally {
        setIsCreating(false)
      }
    },
    []
  )

  return { createTemplate, isCreating, error }
}

// ============================================================================
// Update Template Hook
// ============================================================================

interface UseUpdateTemplateReturn {
  updateTemplate: (
    templateId: string,
    data: Partial<NotificationTemplate>
  ) => Promise<NotificationTemplate>
  isUpdating: boolean
  error: string | null
}

export function useUpdateTemplate(): UseUpdateTemplateReturn {
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateTemplate = useCallback(
    async (
      templateId: string,
      data: Partial<NotificationTemplate>
    ): Promise<NotificationTemplate> => {
      setIsUpdating(true)
      setError(null)
      try {
        const response = await api.put<NotificationTemplate>(
          `/notifications/templates/${templateId}/`,
          data
        )
        return response.data
      } catch (err) {
        const axiosError = err as { response?: { data?: { error?: string } } }
        const message = axiosError.response?.data?.error || 'Failed to update template'
        setError(message)
        throw err
      } finally {
        setIsUpdating(false)
      }
    },
    []
  )

  return { updateTemplate, isUpdating, error }
}

// ============================================================================
// Delete Template Hook
// ============================================================================

interface UseDeleteTemplateReturn {
  deleteTemplate: (templateId: string) => Promise<void>
  isDeleting: boolean
  error: string | null
}

export function useDeleteTemplate(): UseDeleteTemplateReturn {
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deleteTemplate = useCallback(async (templateId: string): Promise<void> => {
    setIsDeleting(true)
    setError(null)
    try {
      await api.delete(`/notifications/templates/${templateId}/`)
    } catch (err) {
      const axiosError = err as { response?: { data?: { error?: string } } }
      const message = axiosError.response?.data?.error || 'Failed to delete template'
      setError(message)
      throw err
    } finally {
      setIsDeleting(false)
    }
  }, [])

  return { deleteTemplate, isDeleting, error }
}

// ============================================================================
// User Search Hook (for recipient selection)
// ============================================================================

interface UseSearchUsersOptions {
  search?: string
  role?: string
  limit?: number
}

interface UseSearchUsersReturn {
  users: UserSearchResult[]
  isLoading: boolean
  error: string | null
  searchUsers: (query: string) => Promise<void>
}

export function useSearchUsers(options: UseSearchUsersOptions = {}): UseSearchUsersReturn {
  const [users, setUsers] = useState<UserSearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const searchUsers = useCallback(async (query: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (query) params.append('search', query)
      if (options.role) params.append('role', options.role)
      if (options.limit) params.append('limit', String(options.limit))

      const response = await api.get<UserSearchResult[]>(
        `/notifications/admin/users/?${params.toString()}`
      )
      setUsers(response.data)
    } catch (err) {
      setError('Failed to search users')
      console.error('Error searching users:', err)
    } finally {
      setIsLoading(false)
    }
  }, [options.role, options.limit])

  // Initial fetch if search is provided
  useEffect(() => {
    if (options.search !== undefined) {
      searchUsers(options.search)
    }
  }, [options.search, searchUsers])

  return { users, isLoading, error, searchUsers }
}
