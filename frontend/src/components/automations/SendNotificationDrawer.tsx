import { useState, useEffect, useRef } from 'react'
import { X, Send, Users, Radio, Search, AlertCircle, Check, Loader2 } from 'lucide-react'
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

interface SendNotificationDrawerProps {
  onClose: () => void
  onSent?: () => void
}

export default function SendNotificationDrawer({ onClose, onSent }: SendNotificationDrawerProps) {
  const { user } = useAuth()
  const isAdmin = user?.role === UserRole.ADMIN

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
        onSent?.()
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
        onSent?.()
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
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-[200]" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-1/2 min-w-[640px] bg-white shadow-xl z-[201] flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 bg-gray-50 border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-900 flex items-center justify-center">
                <Send className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-[16px] font-semibold text-gray-900">Send Notification</h2>
                <p className="text-[12px] text-gray-500">Send a manual notification to users</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Success Message */}
          {successMessage && (
            <div className="flex items-center gap-2 px-4 py-3 alert-success border rounded-lg mb-4">
              <Check className="w-5 h-5 text-success" />
              <p className="text-[13px]">{successMessage}</p>
            </div>
          )}

          {/* Error Message */}
          {(sendError || broadcastError) && (
            <div className="flex items-center gap-2 px-4 py-3 alert-error border rounded-lg mb-4">
              <AlertCircle className="w-5 h-5 text-error" />
              <p className="text-[13px]">{sendError || broadcastError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Send Mode Toggle */}
            <div>
              <label className="block text-[13px] font-medium text-gray-700 mb-3">Send To</label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setSendMode('specific')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
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
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
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
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
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
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-gray-200 text-[13px] text-gray-700 rounded-md"
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
                        className="w-full pl-10 pr-4 py-2 text-[13px] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
                      />
                    </div>

                    {/* Search Results Dropdown */}
                    {showUserDropdown && (
                      <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
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
                          className={`px-4 py-2.5 text-[13px] font-medium rounded-lg border transition-colors ${
                            recipientFilter === value
                              ? 'border-gray-900 bg-white text-gray-900'
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
            <div>
              <label className="block text-[13px] font-medium text-gray-700 mb-2">
                Template (Optional)
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full px-3 py-2 text-[13px] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
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
            <div className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter notification title..."
                  className="w-full px-3 py-2 text-[13px] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
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
                  className="w-full px-3 py-2 text-[13px] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
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
                        className={`px-4 py-2 text-[13px] font-medium rounded-lg border transition-colors ${
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
                  className="w-full px-3 py-2 text-[13px] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
                <p className="mt-1.5 text-[12px] text-gray-500">
                  Link to include in the notification (e.g., a page to visit).
                </p>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[13px] font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValid || isSending || isBroadcasting}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-[13px] font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {(isSending || isBroadcasting) && <Loader2 className="w-4 h-4 animate-spin" />}
            <Send className="w-4 h-4" />
            {isSending || isBroadcasting
              ? 'Sending...'
              : sendMode === 'broadcast'
              ? 'Send Broadcast'
              : `Send to ${selectedUsers.length} User${selectedUsers.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </>
  )
}
