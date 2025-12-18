import { useState } from 'react'
import { useInvitations, useCreateInvitation, useCancelInvitation, useResendInvitation } from '@/hooks'
import type { ClientInvitation } from '@/hooks'
import { Mail, Link2, Copy, Check, Clock, AlertCircle, UserPlus, CheckCircle, Trash2, RefreshCw, X, AlertTriangle } from 'lucide-react'

export default function InvitationsPage() {
  const { invitations, isLoading, error, refetch } = useInvitations()
  const { createInvitation, isCreating, error: createError } = useCreateInvitation()
  const { cancelInvitation, isCancelling, error: cancelError } = useCancelInvitation()
  const { resendInvitation, isResending, error: resendError } = useResendInvitation()

  const [email, setEmail] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [newInvitation, setNewInvitation] = useState<{
    signup_url: string
    email: string
  } | null>(null)

  // Cancel/Resend confirmation states
  const [cancellingInvitation, setCancellingInvitation] = useState<ClientInvitation | null>(null)
  const [resendingInvitation, setResendingInvitation] = useState<ClientInvitation | null>(null)

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

  const handleCancel = async () => {
    if (!cancellingInvitation) return
    try {
      await cancelInvitation(cancellingInvitation.token)
      setCancellingInvitation(null)
      refetch()
    } catch {
      // Error is handled by the hook
    }
  }

  const handleResend = async () => {
    if (!resendingInvitation) return
    try {
      await resendInvitation(resendingInvitation.token)
      setResendingInvitation(null)
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

  const getStatusBadge = (invitation: ClientInvitation) => {
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
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-100 text-blue-700">
        <Clock className="w-3 h-3" />
        Active
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <p className="text-[13px] text-gray-500">
        Invite new clients to sign up and create their company profile
      </p>

      {/* Create Invitation Form */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
            <UserPlus className="w-5 h-5 text-gray-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-[16px] font-medium text-gray-900">Create New Invitation</h2>
            <p className="text-[13px] text-gray-500 mt-0.5">
              Generate a unique signup link for a new client. They'll be able to create their account and company profile.
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
                  className="h-10 px-4 bg-gray-900 text-white text-[14px] font-medium rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                      Invitation created successfully!
                    </p>
                    <p className="text-[13px] text-green-700 mt-1">
                      Share this link with the client:
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
          <h2 className="text-[16px] font-medium text-gray-900">Your Invitations</h2>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-gray-900 mx-auto" />
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
              <Mail className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-[14px] text-gray-500">No invitations yet</p>
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
                  <div className="flex items-center gap-2">
                    {/* Copy Link - only for valid invitations */}
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
                    {/* Resend - for expired or active invitations (not used) */}
                    {!invitation.used_at && (
                      <button
                        onClick={() => setResendingInvitation(invitation)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                        title="Resend invitation"
                      >
                        <RefreshCw className="w-4 h-4" />
                        <span>Resend</span>
                      </button>
                    )}
                    {/* Cancel - only for unused invitations */}
                    {!invitation.used_at && (
                      <button
                        onClick={() => setCancellingInvitation(invitation)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                        title="Cancel invitation"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Cancel</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cancel Invitation Modal */}
      {cancellingInvitation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-[16px] font-semibold text-gray-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Cancel Invitation
              </h3>
              <button
                onClick={() => setCancellingInvitation(null)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-[14px] text-gray-600">
                Are you sure you want to cancel this invitation?
              </p>

              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-[14px] font-medium text-gray-900">
                      {cancellingInvitation.email || <span className="italic text-gray-500">No email specified</span>}
                    </p>
                    <p className="text-[12px] text-gray-500">
                      Created {formatDate(cancellingInvitation.created_at)}
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-[13px] text-gray-500">
                The invitation link will no longer work. You can create a new invitation if needed.
              </p>

              {cancelError && (
                <p className="text-[13px] text-red-600 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" />
                  {cancelError}
                </p>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setCancellingInvitation(null)}
                disabled={isCancelling}
                className="px-4 py-2 text-[14px] font-medium text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Keep Invitation
              </button>
              <button
                onClick={handleCancel}
                disabled={isCancelling}
                className="px-4 py-2 text-[14px] font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {isCancelling ? 'Cancelling...' : 'Cancel Invitation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resend Invitation Modal */}
      {resendingInvitation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-[16px] font-semibold text-gray-900 flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-blue-500" />
                Resend Invitation
              </h3>
              <button
                onClick={() => setResendingInvitation(null)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-[14px] text-gray-600">
                This will extend the invitation expiry and resend the email.
              </p>

              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-[14px] font-medium text-gray-900">
                      {resendingInvitation.email || <span className="italic text-gray-500">No email specified</span>}
                    </p>
                    <p className="text-[12px] text-gray-500">
                      {resendingInvitation.is_expired ? (
                        <span className="text-amber-600">Expired {formatDate(resendingInvitation.expires_at)}</span>
                      ) : (
                        <>Expires {formatDate(resendingInvitation.expires_at)}</>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-[13px] font-medium text-blue-800 mb-2">This action will:</h4>
                <ul className="text-[13px] text-blue-700 space-y-1 list-disc list-inside">
                  <li>Extend expiry by 7 days from now</li>
                  {resendingInvitation.email && <li>Resend invitation email</li>}
                </ul>
              </div>

              {resendError && (
                <p className="text-[13px] text-red-600 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" />
                  {resendError}
                </p>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setResendingInvitation(null)}
                disabled={isResending}
                className="px-4 py-2 text-[14px] font-medium text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleResend}
                disabled={isResending}
                className="px-4 py-2 text-[14px] font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isResending ? 'Resending...' : 'Resend Invitation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
