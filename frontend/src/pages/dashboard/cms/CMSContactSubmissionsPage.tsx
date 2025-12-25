import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cmsContact } from '@/services/cms'
import { useToast } from '@/contexts/ToastContext'
import { Loader2, Trash2, Mail, MailOpen, Check, MessageSquare, X } from 'lucide-react'
import type { CMSContactSubmission } from '@/types'

export default function CMSContactSubmissionsPage() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const [filter, setFilter] = useState<'all' | 'unread' | 'unreplied'>('all')
  const [selectedSubmission, setSelectedSubmission] = useState<CMSContactSubmission | null>(null)

  const { data: submissions, isLoading } = useQuery({
    queryKey: ['cms', 'contact', filter],
    queryFn: () => cmsContact.list({
      is_read: filter === 'unread' ? false : undefined,
      is_replied: filter === 'unreplied' ? false : undefined,
    }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { is_read?: boolean; is_replied?: boolean; notes?: string } }) =>
      cmsContact.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms', 'contact'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: cmsContact.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms', 'contact'] })
      showToast('success', 'Submission deleted')
      setSelectedSubmission(null)
    },
    onError: () => {
      showToast('error', 'Failed to delete submission')
    },
  })

  const handleMarkRead = (submission: CMSContactSubmission) => {
    updateMutation.mutate({
      id: submission.id,
      data: { is_read: !submission.is_read },
    })
  }

  const handleMarkReplied = (submission: CMSContactSubmission) => {
    updateMutation.mutate({
      id: submission.id,
      data: { is_replied: !submission.is_replied },
    })
  }

  const handleDelete = (submission: CMSContactSubmission) => {
    if (confirm('Are you sure you want to delete this submission?')) {
      deleteMutation.mutate(submission.id)
    }
  }

  const openSubmission = (submission: CMSContactSubmission) => {
    setSelectedSubmission(submission)
    if (!submission.is_read) {
      updateMutation.mutate({
        id: submission.id,
        data: { is_read: true },
      })
    }
  }

  const unreadCount = submissions?.filter((s) => !s.is_read).length || 0

  return (
    <div className="flex h-[calc(100vh-12rem)]">
      {/* List */}
      <div className="w-96 border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-semibold text-gray-900">Contact Submissions</h1>
          <p className="text-sm text-gray-500 mt-1">
            {unreadCount > 0 ? `${unreadCount} unread` : 'No unread messages'}
          </p>
        </div>

        {/* Filters */}
        <div className="flex border-b border-gray-200">
          {(['all', 'unread', 'unreplied'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                filter === f
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : !submissions?.length ? (
            <div className="text-center py-12 text-gray-500">
              No submissions found
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {submissions.map((submission) => (
                <button
                  key={submission.id}
                  onClick={() => openSubmission(submission)}
                  className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                    selectedSubmission?.id === submission.id ? 'bg-gray-50' : ''
                  } ${!submission.is_read ? 'bg-blue-50/50' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {!submission.is_read && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                        )}
                        <span className={`text-sm truncate ${!submission.is_read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                          {submission.name}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {submission.email}
                      </p>
                      {submission.subject && (
                        <p className="text-sm text-gray-600 truncate mt-1">
                          {submission.subject}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(submission.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {submission.is_replied && (
                        <Check className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail */}
      <div className="flex-1 flex flex-col">
        {selectedSubmission ? (
          <>
            {/* Detail Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">{selectedSubmission.name}</h2>
                <p className="text-sm text-gray-500">{selectedSubmission.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleMarkRead(selectedSubmission)}
                  className={`p-2 rounded-md transition-colors ${
                    selectedSubmission.is_read
                      ? 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                      : 'text-blue-500 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                  title={selectedSubmission.is_read ? 'Mark as unread' : 'Mark as read'}
                >
                  {selectedSubmission.is_read ? (
                    <MailOpen className="w-5 h-5" />
                  ) : (
                    <Mail className="w-5 h-5" />
                  )}
                </button>
                <button
                  onClick={() => handleMarkReplied(selectedSubmission)}
                  className={`p-2 rounded-md transition-colors ${
                    selectedSubmission.is_replied
                      ? 'text-green-500 hover:text-green-600 hover:bg-green-50'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                  }`}
                  title={selectedSubmission.is_replied ? 'Mark as not replied' : 'Mark as replied'}
                >
                  <MessageSquare className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleDelete(selectedSubmission)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md"
                  title="Delete"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md lg:hidden"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Detail Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-2xl space-y-6">
                {/* Meta Info */}
                <div className="flex flex-wrap gap-4 text-sm">
                  {selectedSubmission.company_name && selectedSubmission.company_name !== 'Not provided' && (
                    <div>
                      <span className="text-gray-500">Company:</span>{' '}
                      <span className="text-gray-900">{selectedSubmission.company_name}</span>
                    </div>
                  )}
                  {selectedSubmission.phone && (
                    <div>
                      <span className="text-gray-500">Phone:</span>{' '}
                      <span className="text-gray-900">{selectedSubmission.phone}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-500">Received:</span>{' '}
                    <span className="text-gray-900">
                      {new Date(selectedSubmission.created_at).toLocaleString()}
                    </span>
                  </div>
                  {selectedSubmission.source_page && (
                    <div>
                      <span className="text-gray-500">Source:</span>{' '}
                      <span className="text-gray-900">{selectedSubmission.source_page}</span>
                    </div>
                  )}
                </div>

                {/* Subject */}
                {selectedSubmission.subject && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Subject</h3>
                    <p className="text-gray-900">{selectedSubmission.subject}</p>
                  </div>
                )}

                {/* Message (stored in notes field for inbound leads) */}
                {selectedSubmission.notes && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Message</h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-900 whitespace-pre-wrap">
                        {selectedSubmission.notes}
                      </p>
                    </div>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="pt-4 border-t border-gray-200">
                  <a
                    href={`mailto:${selectedSubmission.email}?subject=Re: ${selectedSubmission.subject || 'Your inquiry'}`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90"
                  >
                    <Mail className="w-4 h-4" />
                    Reply via Email
                  </a>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a submission to view details
          </div>
        )}
      </div>
    </div>
  )
}
