import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, Search, Trash2, Send, FileText, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react'
import {
  useAdminNotifications,
  useBulkDeleteNotifications,
} from '@/hooks'
import {
  NotificationType,
  NotificationTypeLabels,
  NotificationChannel,
  NotificationChannelLabels,
  UserRole,
} from '@/types'
import { useAuth } from '@/contexts/AuthContext'

export default function NotificationsAdminPage() {
  const { user } = useAuth()
  const isAdminOrRecruiter = user?.role === UserRole.ADMIN || user?.role === UserRole.RECRUITER
  const isAdmin = user?.role === UserRole.ADMIN

  // Filters
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<NotificationType | ''>('')
  const [channelFilter, setChannelFilter] = useState<NotificationChannel | ''>('')
  const [readFilter, setReadFilter] = useState<string>('')
  const [page, setPage] = useState(1)
  const pageSize = 20

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Fetch notifications
  const {
    notifications,
    count,
    numPages,
    hasNext,
    hasPrevious,
    isLoading,
    error,
    refetch,
  } = useAdminNotifications({
    page,
    pageSize,
    notificationType: typeFilter,
    channel: channelFilter,
    isRead: readFilter === '' ? null : readFilter === 'true',
    search,
  })

  const { bulkDelete, isDeleting } = useBulkDeleteNotifications()

  // Access check
  if (!isAdminOrRecruiter) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-[15px] text-gray-700 mb-1">Access Denied</p>
        <p className="text-[13px] text-gray-500">You don't have permission to view this page.</p>
      </div>
    )
  }

  const handleSelectAll = () => {
    if (selectedIds.size === notifications.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(notifications.map((n) => n.id)))
    }
  }

  const handleSelect = (id: string) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedIds(newSet)
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`Delete ${selectedIds.size} notification(s)?`)) return

    try {
      await bulkDelete(Array.from(selectedIds))
      setSelectedIds(new Set())
      refetch()
    } catch (err) {
      console.error('Failed to delete notifications:', err)
    }
  }

  const formatDate = (dateStr: string) => {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-gray-500">
          Manage notifications sent to users ({count} total)
        </p>
        <div className="flex gap-2">
          <Link
            to="/dashboard/settings/notifications/send"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-[13px] font-medium rounded-md hover:bg-gray-800"
          >
            <Send className="w-4 h-4" />
            Send
          </Link>
          <Link
            to="/dashboard/settings/notifications/templates"
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 text-[13px] font-medium rounded-md hover:bg-gray-50"
          >
            <FileText className="w-4 h-4" />
            Templates
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by email or title..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="w-full pl-10 pr-4 py-2 text-[13px] border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

          {/* Type filter */}
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value as NotificationType | '')
              setPage(1)
            }}
            className="px-3 py-2 text-[13px] border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
          >
            <option value="">All Types</option>
            {Object.entries(NotificationTypeLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>

          {/* Channel filter */}
          <select
            value={channelFilter}
            onChange={(e) => {
              setChannelFilter(e.target.value as NotificationChannel | '')
              setPage(1)
            }}
            className="px-3 py-2 text-[13px] border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
          >
            <option value="">All Channels</option>
            {Object.entries(NotificationChannelLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>

          {/* Read status filter */}
          <select
            value={readFilter}
            onChange={(e) => {
              setReadFilter(e.target.value)
              setPage(1)
            }}
            className="px-3 py-2 text-[13px] border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
          >
            <option value="">All Status</option>
            <option value="true">Read</option>
            <option value="false">Unread</option>
          </select>
        </div>
      </div>

      {/* Bulk actions */}
      {isAdmin && selectedIds.size > 0 && (
        <div className="flex items-center gap-4 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg">
          <span className="text-[13px] text-gray-600">
            {selectedIds.size} selected
          </span>
          <button
            onClick={handleBulkDelete}
            disabled={isDeleting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] text-error hover:bg-error/10 rounded-md disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            Delete Selected
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <p className="text-[13px] text-gray-500">Loading notifications...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-[13px] text-red-500">{error}</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-[15px] text-gray-700 mb-1">No notifications found</p>
            <p className="text-[13px] text-gray-500">Try adjusting your filters</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {isAdmin && (
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === notifications.length && notifications.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300"
                    />
                  </th>
                )}
                <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-500 uppercase">
                  Recipient
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-500 uppercase">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-500 uppercase">
                  Title
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-500 uppercase">
                  Channel
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-500 uppercase">
                  Sent
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {notifications.map((notification) => (
                <tr key={notification.id} className="hover:bg-gray-50">
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(notification.id)}
                        onChange={() => handleSelect(notification.id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <div className="text-[13px] text-gray-900">{notification.recipient_name}</div>
                    <div className="text-[12px] text-gray-500">{notification.recipient_email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[13px] text-gray-700">
                      {notification.notification_type_display || notification.notification_type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[13px] text-gray-900 line-clamp-1">{notification.title}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[13px] text-gray-600">
                      {notification.channel_display || notification.channel}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <span
                        className={`inline-flex px-2 py-0.5 text-[11px] font-medium rounded ${
                          notification.is_read
                            ? 'bg-gray-100 text-gray-600'
                            : 'badge-secondary'
                        }`}
                      >
                        {notification.is_read ? 'Read' : 'Unread'}
                      </span>
                      {notification.email_sent && (
                        <span className="inline-flex px-2 py-0.5 text-[11px] font-medium rounded badge-success">
                          Email Sent
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[13px] text-gray-500">
                      {formatDate(notification.sent_at)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {numPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <span className="text-[13px] text-gray-600">
              Page {page} of {numPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={!hasPrevious}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-[13px] border border-gray-300 rounded-md hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!hasNext}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-[13px] border border-gray-300 rounded-md hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
