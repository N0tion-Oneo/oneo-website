import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  Calendar,
  FileText,
  CheckCircle,
  AlertCircle,
  Clock,
  X,
  Check,
  Loader2,
  ChevronRight,
} from 'lucide-react'
import {
  useNotifications,
  useUnreadCountPolling,
  useMarkNotificationsRead,
} from '@/hooks'
import { Notification, NotificationType } from '@/types'
import NotificationsDrawer from './NotificationsDrawer'

interface NotificationBellProps {
  className?: string
  /** Position dropdown to the right of the bell (for sidebar usage) */
  dropdownPosition?: 'bottom-right' | 'right'
  /** Sidebar width for drawer positioning */
  sidebarWidth?: 'minimized' | 'expanded' | 'none'
}

const NotificationIcons: Record<NotificationType, React.ReactNode> = {
  [NotificationType.STAGE_SCHEDULED]: <Calendar className="w-4 h-4 text-blue-500" />,
  [NotificationType.STAGE_REMINDER]: <Clock className="w-4 h-4 text-orange-500" />,
  [NotificationType.STAGE_RESCHEDULED]: <Calendar className="w-4 h-4 text-amber-500" />,
  [NotificationType.STAGE_CANCELLED]: <X className="w-4 h-4 text-red-500" />,
  [NotificationType.ASSESSMENT_ASSIGNED]: <FileText className="w-4 h-4 text-purple-500" />,
  [NotificationType.ASSESSMENT_REMINDER]: <Clock className="w-4 h-4 text-orange-500" />,
  [NotificationType.SUBMISSION_RECEIVED]: <CheckCircle className="w-4 h-4 text-green-500" />,
  [NotificationType.APPLICATION_RECEIVED]: <FileText className="w-4 h-4 text-blue-500" />,
  [NotificationType.APPLICATION_SHORTLISTED]: <CheckCircle className="w-4 h-4 text-green-500" />,
  [NotificationType.APPLICATION_REJECTED]: <AlertCircle className="w-4 h-4 text-gray-500" />,
  [NotificationType.OFFER_RECEIVED]: <CheckCircle className="w-4 h-4 text-green-500" />,
}

export default function NotificationBell({ className = '', dropdownPosition = 'bottom-right', sidebarWidth = 'none' }: NotificationBellProps) {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const hasOpenedRef = useRef(false)

  const { count: unreadCount, refetch: refetchCount } = useUnreadCountPolling({
    intervalMs: 30000,
    enabled: true,
  })

  const {
    notifications,
    isLoading,
    refetch: refetchNotifications,
  } = useNotifications({ limit: 10 })

  const { markAsRead, markAllAsRead, isMarking } = useMarkNotificationsRead()

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Refetch notifications when dropdown opens (only once per open)
  useEffect(() => {
    if (isOpen && !hasOpenedRef.current) {
      hasOpenedRef.current = true
      refetchNotifications()
    }
    if (!isOpen) {
      hasOpenedRef.current = false
    }
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      try {
        await markAsRead([notification.id])
        refetchCount()
        refetchNotifications()
      } catch {
        // Error handled by hook
      }
    }

    if (notification.action_url) {
      navigate(notification.action_url)
      setIsOpen(false)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead()
      refetchCount()
      refetchNotifications()
    } catch {
      // Error handled by hook
    }
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
    return date.toLocaleDateString()
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full transform translate-x-1 -translate-y-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className={`absolute w-80 sm:w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 ${
          dropdownPosition === 'right'
            ? 'left-full top-0 ml-2'
            : 'right-0 mt-2'
        }`}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={isMarking}
                className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
              >
                {isMarking ? 'Marking...' : 'Mark all read'}
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p>No notifications yet</p>
              </div>
            ) : (
              <div>
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-all border-b border-gray-50 last:border-b-0 ${
                      !notification.is_read ? 'bg-blue-50/50' : ''
                    } ${notification.action_url ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {NotificationIcons[notification.notification_type] || (
                          <Bell className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm ${
                            notification.is_read
                              ? 'text-gray-600'
                              : 'text-gray-900 font-medium'
                          }`}
                        >
                          {notification.title}
                        </p>
                        {notification.body && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                            {notification.body}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          {formatTime(notification.sent_at)}
                        </p>
                      </div>
                      <div className="flex-shrink-0 flex items-center gap-1">
                        {!notification.is_read && (
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                        )}
                        {notification.action_url && (
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-100">
              <button
                onClick={() => {
                  setIsOpen(false)
                  setIsDrawerOpen(true)
                }}
                className="w-full text-sm text-center text-blue-600 hover:text-blue-800"
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}

      {/* Notifications Drawer */}
      <NotificationsDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        unreadCount={unreadCount}
        onUnreadCountChange={refetchCount}
        sidebarWidth={sidebarWidth}
      />
    </div>
  )
}

// Standalone notification item component
interface NotificationItemProps {
  notification: Notification
  onClick?: (notification: Notification) => void
  onMarkRead?: (notification: Notification) => void
}

export function NotificationItem({
  notification,
  onClick,
  onMarkRead,
}: NotificationItemProps) {
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  return (
    <div
      onClick={() => onClick?.(notification)}
      className={`flex gap-4 p-4 rounded-lg border cursor-pointer transition-colors ${
        notification.is_read
          ? 'bg-white border-gray-200 hover:bg-gray-50'
          : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
      }`}
    >
      <div className="flex-shrink-0 mt-1">
        {NotificationIcons[notification.notification_type] || (
          <Bell className="w-5 h-5 text-gray-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p
            className={`text-sm ${
              notification.is_read ? 'text-gray-600' : 'text-gray-900 font-medium'
            }`}
          >
            {notification.title}
          </p>
          {!notification.is_read && onMarkRead && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onMarkRead(notification)
              }}
              className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 rounded"
              title="Mark as read"
            >
              <Check className="w-4 h-4" />
            </button>
          )}
        </div>
        {notification.body && (
          <p className="text-sm text-gray-500 mt-1">{notification.body}</p>
        )}
        <p className="text-xs text-gray-400 mt-2">{formatTime(notification.sent_at)}</p>
      </div>
    </div>
  )
}
