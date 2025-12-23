import { useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  X,
  Bell,
  Calendar,
  FileText,
  CheckCircle,
  AlertCircle,
  Clock,
  Loader2,
  Check,
  ChevronRight,
} from 'lucide-react'
import {
  useNotifications,
  useMarkNotificationsRead,
} from '@/hooks'
import { Notification, NotificationType } from '@/types'

interface NotificationsDrawerProps {
  isOpen: boolean
  onClose: () => void
  unreadCount?: number
  onUnreadCountChange?: () => void
  /** Offset from left edge (for sidebar) */
  sidebarWidth?: 'minimized' | 'expanded' | 'none'
}

const NotificationIcons: Partial<Record<NotificationType, React.ReactNode>> = {
  [NotificationType.STAGE_SCHEDULED]: <Calendar className="w-5 h-5 text-blue-500" />,
  [NotificationType.STAGE_REMINDER]: <Clock className="w-5 h-5 text-orange-500" />,
  [NotificationType.STAGE_RESCHEDULED]: <Calendar className="w-5 h-5 text-amber-500" />,
  [NotificationType.STAGE_CANCELLED]: <X className="w-5 h-5 text-red-500" />,
  [NotificationType.ASSESSMENT_ASSIGNED]: <FileText className="w-5 h-5 text-purple-500" />,
  [NotificationType.ASSESSMENT_REMINDER]: <Clock className="w-5 h-5 text-orange-500" />,
  [NotificationType.SUBMISSION_RECEIVED]: <CheckCircle className="w-5 h-5 text-green-500" />,
  [NotificationType.APPLICATION_RECEIVED]: <FileText className="w-5 h-5 text-blue-500" />,
  [NotificationType.APPLICATION_SHORTLISTED]: <CheckCircle className="w-5 h-5 text-green-500" />,
  [NotificationType.APPLICATION_REJECTED]: <AlertCircle className="w-5 h-5 text-gray-500" />,
  [NotificationType.OFFER_RECEIVED]: <CheckCircle className="w-5 h-5 text-green-500" />,
}

const formatTime = (dateStr: string) => {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}

export default function NotificationsDrawer({
  isOpen,
  onClose,
  unreadCount = 0,
  onUnreadCountChange,
  sidebarWidth = 'none',
}: NotificationsDrawerProps) {
  const navigate = useNavigate()

  const {
    notifications,
    isLoading,
    hasMore,
    loadMore,
    refetch,
  } = useNotifications({ limit: 20 })

  const { markAsRead, markAllAsRead, isMarking } = useMarkNotificationsRead()

  // Refetch when drawer opens
  useEffect(() => {
    if (isOpen) {
      refetch()
    }
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  const handleNotificationClick = useCallback(async (notification: Notification) => {
    if (!notification.is_read) {
      try {
        await markAsRead([notification.id])
        onUnreadCountChange?.()
        refetch()
      } catch {
        // Error handled by hook
      }
    }

    if (notification.action_url) {
      navigate(notification.action_url)
      onClose()
    }
  }, [markAsRead, navigate, onClose, onUnreadCountChange, refetch])

  const handleMarkAllRead = useCallback(async () => {
    try {
      await markAllAsRead()
      onUnreadCountChange?.()
      refetch()
    } catch {
      // Error handled by hook
    }
  }, [markAllAsRead, onUnreadCountChange, refetch])

  const handleMarkSingleRead = useCallback(async (e: React.MouseEvent, notification: Notification) => {
    e.stopPropagation()
    try {
      await markAsRead([notification.id])
      onUnreadCountChange?.()
      refetch()
    } catch {
      // Error handled by hook
    }
  }, [markAsRead, onUnreadCountChange, refetch])

  if (!isOpen) return null

  // Sidebar offset classes for backdrop
  const sidebarOffset = {
    none: 'left-0',
    minimized: 'left-0 lg:left-16',
    expanded: 'left-0 lg:left-64',
  }[sidebarWidth]

  // Drawer width: half of remaining space after sidebar
  const drawerWidth = {
    none: 'w-full sm:w-1/2',
    minimized: 'w-full lg:w-[calc((100vw-4rem)/2)]',
    expanded: 'w-full lg:w-[calc((100vw-16rem)/2)]',
  }[sidebarWidth]

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-y-0 right-0 ${sidebarOffset} bg-black/30 z-[200] transition-opacity`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div className={`fixed inset-y-0 ${sidebarOffset} ${drawerWidth} bg-white shadow-xl z-[201] flex flex-col border-r border-gray-200`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 h-14 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-medium text-blue-700 bg-blue-100 rounded-full">
                {unreadCount} unread
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={isMarking}
                className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50 px-2 py-1"
              >
                {isMarking ? 'Marking...' : 'Mark all read'}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && notifications.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
              <Bell className="w-12 h-12 text-gray-300 mb-4" />
              <p className="text-lg font-medium">No notifications yet</p>
              <p className="text-sm text-gray-400 mt-1">We'll notify you when something happens</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`px-6 py-4 hover:bg-gray-50 transition-all ${
                    !notification.is_read ? 'bg-blue-50/50' : ''
                  } ${notification.action_url ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 mt-0.5">
                      {NotificationIcons[notification.notification_type] || (
                        <Bell className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={`text-sm ${
                            notification.is_read
                              ? 'text-gray-600'
                              : 'text-gray-900 font-medium'
                          }`}
                        >
                          {notification.title}
                        </p>
                        {!notification.is_read && (
                          <button
                            onClick={(e) => handleMarkSingleRead(e, notification)}
                            className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-200"
                            title="Mark as read"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      {notification.body && (
                        <p className="text-sm text-gray-500 mt-1">
                          {notification.body}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-gray-400">
                          {formatTime(notification.sent_at)}
                        </p>
                        {notification.action_url && (
                          <span className="text-xs text-blue-600 flex items-center gap-0.5">
                            View <ChevronRight className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </div>
                    {!notification.is_read && (
                      <div className="flex-shrink-0 mt-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Load More */}
              {hasMore && (
                <div className="px-6 py-4">
                  <button
                    onClick={loadMore}
                    disabled={isLoading}
                    className="w-full py-2 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading...
                      </span>
                    ) : (
                      'Load more'
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  )
}
