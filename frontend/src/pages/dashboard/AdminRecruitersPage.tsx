import { useState } from 'react'
import { useRecruiterInvitations, useCreateRecruiterInvitation } from '@/hooks'
import type { RecruiterInvitation } from '@/hooks'
import { Mail, Link2, Copy, Check, Clock, AlertCircle, UserPlus, CheckCircle, Users } from 'lucide-react'

export default function AdminRecruitersPage() {
  const { invitations, isLoading, error, refetch } = useRecruiterInvitations()
  const { createInvitation, isCreating, error: createError } = useCreateRecruiterInvitation()

  const [email, setEmail] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [newInvitation, setNewInvitation] = useState<{
    signup_url: string
    email: string
  } | null>(null)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const result = await createInvitation(email || undefined)
      setNewInvitation({ signup_url: result.signup_url, email: result.email })
      setEmail('')
      refetch()
    } catch {
      // Error is handled by the hook
    }
  }

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusBadge = (invitation: RecruiterInvitation) => {
    if (invitation.used_at) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-green-100 text-green-700">
          <CheckCircle className="w-3 h-3" />
          Used
        </span>
      )
    }
    if (invitation.is_expired) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600">
          <Clock className="w-3 h-3" />
          Expired
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-100 text-purple-700">
        <Clock className="w-3 h-3" />
        Active
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[22px] font-semibold text-gray-900">Recruiter Management</h1>
        <p className="text-[14px] text-gray-500 mt-0.5">
          Invite new recruiters to join the platform
        </p>
      </div>

      {/* Create Invitation Form */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
            <UserPlus className="w-5 h-5 text-purple-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-[16px] font-medium text-gray-900">Invite New Recruiter</h2>
            <p className="text-[13px] text-gray-500 mt-0.5">
              Generate a unique signup link for a new recruiter. They'll be able to create their account with recruiter privileges.
            </p>

            <form onSubmit={handleCreate} className="mt-4">
              <div className="flex gap-3">
                <div className="flex-1">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email address (optional)"
                    className="w-full h-10 px-3 text-[14px] border border-gray-300 rounded-md bg-white focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none transition-colors"
                  />
                  <p className="text-[12px] text-gray-500 mt-1">
                    If provided, the email will be pre-filled on the signup form
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="h-10 px-4 bg-purple-600 text-white text-[14px] font-medium rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isCreating ? 'Creating...' : 'Create Invitation'}
                </button>
              </div>
            </form>

            {createError && (
              <div className="mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded-md">
                <p className="text-[13px] text-red-600">{createError}</p>
              </div>
            )}

            {/* Show newly created invitation */}
            {newInvitation && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-green-800">
                      Recruiter invitation created successfully!
                    </p>
                    <p className="text-[13px] text-green-700 mt-1">
                      Share this link with the new recruiter:
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <code className="flex-1 px-3 py-2 bg-white border border-green-200 rounded text-[13px] text-gray-700 overflow-x-auto">
                        {newInvitation.signup_url}
                      </code>
                      <button
                        onClick={() => copyToClipboard(newInvitation.signup_url, 'new')}
                        className="p-2 text-green-700 hover:bg-green-100 rounded transition-colors"
                        title="Copy link"
                      >
                        {copiedId === 'new' ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => setNewInvitation(null)}
                    className="text-green-600 hover:text-green-800"
                  >
                    &times;
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Invitations List */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-[16px] font-medium text-gray-900">Recruiter Invitations</h2>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-purple-600 mx-auto" />
              <p className="text-[14px] text-gray-500 mt-3">Loading invitations...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
              <p className="text-[14px] text-gray-700">{error}</p>
            </div>
          </div>
        ) : invitations.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-[14px] text-gray-500">No recruiter invitations yet</p>
              <p className="text-[13px] text-gray-400 mt-1">
                Create your first invitation above
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {invitations.map((invitation) => (
              <div key={invitation.id} className="px-6 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {invitation.email ? (
                        <span className="text-[14px] font-medium text-gray-900">
                          {invitation.email}
                        </span>
                      ) : (
                        <span className="text-[14px] text-gray-500 italic">
                          No email specified
                        </span>
                      )}
                      {getStatusBadge(invitation)}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-[12px] text-gray-500">
                      <span>Created: {formatDate(invitation.created_at)}</span>
                      <span>Expires: {formatDate(invitation.expires_at)}</span>
                      {invitation.used_at && (
                        <span className="text-green-600">
                          Used: {formatDate(invitation.used_at)}
                        </span>
                      )}
                    </div>
                  </div>
                  {invitation.is_valid && (
                    <button
                      onClick={() =>
                        copyToClipboard(invitation.signup_url, invitation.token)
                      }
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                      title="Copy signup link"
                    >
                      {copiedId === invitation.token ? (
                        <>
                          <Check className="w-4 h-4 text-green-600" />
                          <span className="text-green-600">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Link2 className="w-4 h-4" />
                          <span>Copy Link</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
