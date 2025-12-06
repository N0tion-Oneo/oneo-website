import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Send, Users, Radio, Search, X, AlertCircle, Check } from 'lucide-react'
import {
  useSendNotification,
  useBroadcast,
  useSearchUsers,
  useNotificationTemplates,
} from '@/hooks'
import {
  NotificationChannel,
  NotificationChannelLabels,
  RecipientFilter,
  RecipientFilterLabels,
  UserRole,
  UserSearchResult,
} from '@/types'
import { useAuth } from '@/contexts/AuthContext'

type SendMode = 'specific' | 'broadcast'

export default function SendNotificationPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isAdmin = user?.role === UserRole.ADMIN
  const isAdminOrRecruiter = user?.role === UserRole.ADMIN || user?.role === UserRole.RECRUITER

  // Form state
  const [sendMode, setSendMode] = useState<SendMode>('specific')
  const [selectedUsers, setSelectedUsers] = useState<UserSearchResult[]>([])
  const [recipientFilter, setRecipientFilter] = useState<RecipientFilter>('all')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [channel, setChannel] = useState<NotificationChannel>(NotificationChannel.BOTH)
  const [actionUrl, setActionUrl] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState('')

  // User search state
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const userSearchRef = useRef<HTMLDivElement>(null)

  // Hooks
  const { users: searchResults, isLoading: isSearching, searchUsers } = useSearchUsers()
  const { templates, isLoading: isLoadingTemplates } = useNotificationTemplates({ isActive: true })
  const { sendNotification, isSending, error: sendError } = useSendNotification()
  const { broadcast, isBroadcasting, error: broadcastError } = useBroadcast()

  // Success state
  const [successMessage, setSuccessMessage] = useState('')

  // Search users on query change
  useEffect(() => {
    const timer = setTimeout(() => {
      if (userSearchQuery.length >= 2) {
        searchUsers(userSearchQuery)
        setShowUserDropdown(true)
      } else {
        setShowUserDropdown(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [userSearchQuery, searchUsers])

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userSearchRef.current && !userSearchRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Apply template
  useEffect(() => {
    if (selectedTemplateId) {
      const template = templates.find((t) => t.id === selectedTemplateId)
      if (template) {
        setTitle(template.title_template)
        setBody(template.body_template)
        setChannel(template.default_channel)
      }
    }
  }, [selectedTemplateId, templates])

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

  const handleSelectUser = (user: UserSearchResult) => {
    if (!selectedUsers.find((u) => u.id === user.id)) {
      setSelectedUsers([...selectedUsers, user])
    }
    setUserSearchQuery('')
    setShowUserDropdown(false)
  }

  const handleRemoveUser = (userId: number) => {
    setSelectedUsers(selectedUsers.filter((u) => u.id !== userId))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSuccessMessage('')

    try {
      if (sendMode === 'specific') {
        if (selectedUsers.length === 0) {
          return
        }
        const result = await sendNotification({
          recipient_ids: selectedUsers.map((u) => u.id),
          title,
          body,
          channel,
          action_url: actionUrl || undefined,
          template_id: selectedTemplateId || undefined,
        })
        setSuccessMessage(`Notification sent to ${result.sent_count} user(s)`)
        // Reset form
        setSelectedUsers([])
        setTitle('')
        setBody('')
        setActionUrl('')
        setSelectedTemplateId('')
      } else {
        const result = await broadcast({
          recipient_filter: recipientFilter,
          title,
          body,
          channel,
          action_url: actionUrl || undefined,
        })
        setSuccessMessage(`Broadcast sent to ${result.sent_count} user(s)`)
        // Reset form
        setTitle('')
        setBody('')
        setActionUrl('')
        setSelectedTemplateId('')
      }
    } catch {
      // Error is handled by the hooks
    }
  }

  const isValid =
    title.trim() !== '' &&
    body.trim() !== '' &&
    (sendMode === 'broadcast' || selectedUsers.length > 0)

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/dashboard/settings/notifications"
          className="p-2 hover:bg-gray-100 rounded-md transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <h1 className="text-[22px] font-semibold text-gray-900">Send Notification</h1>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="flex items-center gap-2 px-4 py-3 alert-success border rounded-lg">
          <Check className="w-5 h-5 text-success" />
          <p className="text-[13px]">{successMessage}</p>
        </div>
      )}

      {/* Error Message */}
      {(sendError || broadcastError) && (
        <div className="flex items-center gap-2 px-4 py-3 alert-error border rounded-lg">
          <AlertCircle className="w-5 h-5 text-error" />
          <p className="text-[13px]">{sendError || broadcastError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Send Mode Toggle */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <label className="block text-[13px] font-medium text-gray-700 mb-3">Send To</label>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setSendMode('specific')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md border transition-colors ${
                sendMode === 'specific'
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Users className="w-4 h-4" />
              <span className="text-[13px] font-medium">Specific Users</span>
            </button>
            <button
              type="button"
              onClick={() => setSendMode('broadcast')}
              disabled={!isAdmin}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md border transition-colors ${
                sendMode === 'broadcast'
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              } ${!isAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Radio className="w-4 h-4" />
              <span className="text-[13px] font-medium">Broadcast</span>
              {!isAdmin && <span className="text-[11px]">(Admin only)</span>}
            </button>
          </div>
        </div>

        {/* Recipients Selection */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          {sendMode === 'specific' ? (
            <div>
              <label className="block text-[13px] font-medium text-gray-700 mb-2">
                Recipients
              </label>

              {/* Selected Users */}
              {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {selectedUsers.map((u) => (
                    <span
                      key={u.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 text-[13px] text-gray-700 rounded-md"
                    >
                      {u.full_name}
                      <button
                        type="button"
                        onClick={() => handleRemoveUser(u.id)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* User Search */}
              <div ref={userSearchRef} className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    placeholder="Search users by name or email..."
                    className="w-full pl-10 pr-4 py-2 text-[13px] border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>

                {/* Search Results Dropdown */}
                {showUserDropdown && (
                  <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {isSearching ? (
                      <div className="px-3 py-2 text-[13px] text-gray-500">Searching...</div>
                    ) : searchResults.length === 0 ? (
                      <div className="px-3 py-2 text-[13px] text-gray-500">No users found</div>
                    ) : (
                      searchResults
                        .filter((u) => !selectedUsers.find((su) => su.id === u.id))
                        .map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => handleSelectUser(u)}
                            className="w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors"
                          >
                            <div className="text-[13px] text-gray-900">{u.full_name}</div>
                            <div className="text-[12px] text-gray-500">{u.email}</div>
                          </button>
                        ))
                    )}
                  </div>
                )}
              </div>

              {selectedUsers.length === 0 && (
                <p className="mt-2 text-[12px] text-gray-500">
                  Search and select one or more users to send the notification to.
                </p>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-[13px] font-medium text-gray-700 mb-3">
                Target Audience
              </label>
              <div className="grid grid-cols-2 gap-3">
                {(Object.entries(RecipientFilterLabels) as [RecipientFilter, string][]).map(
                  ([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRecipientFilter(value)}
                      className={`px-4 py-2.5 text-[13px] font-medium rounded-md border transition-colors ${
                        recipientFilter === value
                          ? 'border-gray-900 bg-gray-50 text-gray-900'
                          : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {label}
                    </button>
                  )
                )}
              </div>
            </div>
          )}
        </div>

        {/* Template Selection */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <label className="block text-[13px] font-medium text-gray-700 mb-2">
            Template (Optional)
          </label>
          <select
            value={selectedTemplateId}
            onChange={(e) => setSelectedTemplateId(e.target.value)}
            className="w-full px-3 py-2 text-[13px] border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
            disabled={isLoadingTemplates}
          >
            <option value="">No template - Write custom message</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-[12px] text-gray-500">
            Select a template to pre-fill the title and body.
          </p>
        </div>

        {/* Message Content */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-gray-700 mb-2">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter notification title..."
              className="w-full px-3 py-2 text-[13px] border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
              required
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-gray-700 mb-2">Body</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Enter notification body..."
              rows={4}
              className="w-full px-3 py-2 text-[13px] border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
              required
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-gray-700 mb-2">Channel</label>
            <div className="flex gap-3">
              {(Object.entries(NotificationChannelLabels) as [NotificationChannel, string][]).map(
                ([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setChannel(value)}
                    className={`px-4 py-2 text-[13px] font-medium rounded-md border transition-colors ${
                      channel === value
                        ? 'border-gray-900 bg-gray-50 text-gray-900'
                        : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {label}
                  </button>
                )
              )}
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-medium text-gray-700 mb-2">
              Action URL (Optional)
            </label>
            <input
              type="url"
              value={actionUrl}
              onChange={(e) => setActionUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 text-[13px] border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
            <p className="mt-1.5 text-[12px] text-gray-500">
              Link to include in the notification (e.g., a page to visit).
            </p>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-3">
          <Link
            to="/dashboard/settings/notifications"
            className="px-4 py-2 text-[13px] font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={!isValid || isSending || isBroadcasting}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-[13px] font-medium rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            {isSending || isBroadcasting
              ? 'Sending...'
              : sendMode === 'broadcast'
              ? 'Send Broadcast'
              : `Send to ${selectedUsers.length} User${selectedUsers.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </form>
    </div>
  )
}
