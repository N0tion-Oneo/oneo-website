import { useState, useMemo } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  type ColumnDef,
} from '@tanstack/react-table'
import { DataTable } from '@/components/common/DataTable'
import {
  useAdminNotifications,
  useBulkDeleteNotifications,
} from '@/hooks/useNotificationsAdmin'
import SendNotificationDrawer from '@/components/automations/SendNotificationDrawer'
import {
  Trash2,
  Bell,
  Search,
  Send,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import {
  NotificationChannelLabels,
  NotificationTypeLabels,
  NotificationType,
  NotificationChannel,
  UserRole,
  AdminNotification,
} from '@/types'
import { useAuth } from '@/contexts/AuthContext'

const notificationsColumnHelper = createColumnHelper<AdminNotification>()

export default function NotificationsTab() {
  const { user } = useAuth()
  const isAdmin = user?.role === UserRole.ADMIN

  // Sent notifications state
  const [notificationSearch, setNotificationSearch] = useState('')
  const [notificationTypeFilter, setNotificationTypeFilter] = useState<NotificationType | ''>('')
  const [notificationChannelFilter, setNotificationChannelFilter] = useState<NotificationChannel | ''>('')
  const [notificationReadFilter, setNotificationReadFilter] = useState<string>('')
  const [notificationPage, setNotificationPage] = useState(1)
  const notificationPageSize = 20
  const [selectedNotificationIds, setSelectedNotificationIds] = useState<Set<string>>(new Set())
  const [sendNotificationDrawerOpen, setSendNotificationDrawerOpen] = useState(false)

  // Sent notifications hooks
  const {
    notifications,
    count: _notificationCount,
    numPages: notificationNumPages,
    hasNext: notificationHasNext,
    hasPrevious: notificationHasPrevious,
    isLoading: isLoadingNotifications,
    refetch: refetchNotifications,
  } = useAdminNotifications({
    page: notificationPage,
    pageSize: notificationPageSize,
    notificationType: notificationTypeFilter || undefined,
    channel: notificationChannelFilter || undefined,
    isRead: notificationReadFilter === '' ? null : notificationReadFilter === 'true',
    search: notificationSearch,
  })
  const { bulkDelete: bulkDeleteNotifications, isDeleting: isDeletingNotifications } = useBulkDeleteNotifications()

  // Notification handlers
  const handleSelectAllNotifications = () => {
    if (selectedNotificationIds.size === notifications.length) {
      setSelectedNotificationIds(new Set())
    } else {
      setSelectedNotificationIds(new Set(notifications.map((n) => n.id)))
    }
  }

  const handleSelectNotification = (id: string) => {
    const newSet = new Set(selectedNotificationIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedNotificationIds(newSet)
  }

  const handleBulkDeleteNotifications = async () => {
    if (selectedNotificationIds.size === 0) return
    if (!confirm(`Delete ${selectedNotificationIds.size} notification(s)?`)) return

    try {
      await bulkDeleteNotifications(Array.from(selectedNotificationIds))
      setSelectedNotificationIds(new Set())
      refetchNotifications()
    } catch (err) {
      console.error('Failed to delete notifications:', err)
    }
  }

  const formatNotificationDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)

    if (hours < 1) return 'Just now'
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
  }

  // Column definitions
  const notificationsColumns = useMemo<ColumnDef<AdminNotification, unknown>[]>(() => {
    const cols: ColumnDef<AdminNotification, unknown>[] = []

    // Only add checkbox column for admins
    if (isAdmin) {
      cols.push(notificationsColumnHelper.display({
        id: 'select',
        header: () => (
          <input
            type="checkbox"
            checked={selectedNotificationIds.size === notifications.length && notifications.length > 0}
            onChange={handleSelectAllNotifications}
            className="rounded border-gray-300 dark:border-gray-600"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={selectedNotificationIds.has(row.original.id)}
            onChange={() => handleSelectNotification(row.original.id)}
            className="rounded border-gray-300 dark:border-gray-600"
          />
        ),
        enableSorting: false,
      }))
    }

    cols.push(
      notificationsColumnHelper.accessor('recipient_name', {
        header: 'Recipient',
        cell: ({ row }) => (
          <div>
            <div className="text-[13px] text-gray-900 dark:text-gray-100">{row.original.recipient_name}</div>
            <div className="text-[12px] text-gray-500 dark:text-gray-400">{row.original.recipient_email}</div>
          </div>
        ),
        enableSorting: false,
      }),
      notificationsColumnHelper.accessor('notification_type', {
        header: 'Type',
        cell: ({ row }) => (
          <span className="text-[13px] text-gray-700 dark:text-gray-300">
            {row.original.notification_type_display || row.original.notification_type}
          </span>
        ),
        enableSorting: false,
      }),
      notificationsColumnHelper.accessor('title', {
        header: 'Title',
        cell: ({ row }) => (
          <span className="text-[13px] text-gray-900 dark:text-gray-100 line-clamp-1">{row.original.title}</span>
        ),
        enableSorting: false,
      }),
      notificationsColumnHelper.accessor('channel', {
        header: 'Channel',
        cell: ({ row }) => (
          <span className="text-[13px] text-gray-600 dark:text-gray-400">
            {row.original.channel_display || row.original.channel}
          </span>
        ),
        enableSorting: false,
      }),
      notificationsColumnHelper.accessor('is_read', {
        header: 'Status',
        cell: ({ row }) => (
          <div className="flex flex-col gap-1">
            <span
              className={`inline-flex px-2 py-0.5 text-[11px] font-medium rounded ${
                row.original.is_read
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  : 'badge-secondary'
              }`}
            >
              {row.original.is_read ? 'Read' : 'Unread'}
            </span>
            {row.original.email_sent && (
              <span className="inline-flex px-2 py-0.5 text-[11px] font-medium rounded badge-success">
                Email Sent
              </span>
            )}
          </div>
        ),
        enableSorting: false,
      }),
      notificationsColumnHelper.accessor('sent_at', {
        header: 'Sent',
        cell: ({ row }) => (
          <span className="text-[13px] text-gray-500 dark:text-gray-400">
            {formatNotificationDate(row.original.sent_at)}
          </span>
        ),
        enableSorting: false,
      })
    )

    return cols
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, selectedNotificationIds, notifications.length])

  const table = useReactTable({
    data: notifications,
    columns: notificationsColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    enableSorting: false,
  })

  return (
    <>
      {/* Notifications Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Search by email or title..."
              value={notificationSearch}
              onChange={(e) => {
                setNotificationSearch(e.target.value)
                setNotificationPage(1)
              }}
              className="pl-9 pr-4 py-2 w-64 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
          <select
            value={notificationTypeFilter}
            onChange={(e) => {
              setNotificationTypeFilter(e.target.value as NotificationType | '')
              setNotificationPage(1)
            }}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
          >
            <option value="">All Types</option>
            {Object.entries(NotificationTypeLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <select
            value={notificationChannelFilter}
            onChange={(e) => {
              setNotificationChannelFilter(e.target.value as NotificationChannel | '')
              setNotificationPage(1)
            }}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
          >
            <option value="">All Channels</option>
            {Object.entries(NotificationChannelLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <select
            value={notificationReadFilter}
            onChange={(e) => {
              setNotificationReadFilter(e.target.value)
              setNotificationPage(1)
            }}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
          >
            <option value="">All Status</option>
            <option value="true">Read</option>
            <option value="false">Unread</option>
          </select>
        </div>
        <button
          onClick={() => setSendNotificationDrawerOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 transition-colors"
        >
          <Send className="w-4 h-4" />
          Send
        </button>
      </div>

      {/* Bulk actions */}
      {isAdmin && selectedNotificationIds.size > 0 && (
        <div className="flex items-center gap-4 px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg mb-4">
          <span className="text-[13px] text-gray-600 dark:text-gray-400">
            {selectedNotificationIds.size} selected
          </span>
          <button
            onClick={handleBulkDeleteNotifications}
            disabled={isDeletingNotifications}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] text-error hover:bg-error/10 rounded-lg disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            Delete Selected
          </button>
        </div>
      )}

      {/* Table */}
      <DataTable
        table={table}
        isLoading={isLoadingNotifications}
        loadingMessage="Loading notifications..."
        emptyState={{
          icon: <Bell className="w-6 h-6 text-gray-400 dark:text-gray-500" />,
          title: 'No notifications found',
          description: 'Try adjusting your filters',
        }}
      />

      {/* Pagination */}
      {notificationNumPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-b-lg -mt-px">
          <span className="text-[13px] text-gray-600 dark:text-gray-400">
            Page {notificationPage} of {notificationNumPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setNotificationPage((p) => p - 1)}
              disabled={!notificationHasPrevious}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-[13px] border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-white dark:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
            <button
              onClick={() => setNotificationPage((p) => p + 1)}
              disabled={!notificationHasNext}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-[13px] border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-white dark:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Send Notification Drawer */}
      {sendNotificationDrawerOpen && (
        <SendNotificationDrawer
          onClose={() => setSendNotificationDrawerOpen(false)}
          onSent={() => refetchNotifications()}
        />
      )}
    </>
  )
}
