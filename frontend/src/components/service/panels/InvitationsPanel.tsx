import { Send, Mail, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { useCreateInvitation } from '@/hooks/useInvitations'

interface LeadInvitation {
  id: string
  email: string
  created_at: string
  expires_at: string
  used_at: string | null
  is_expired: boolean
}

interface InvitationsPanelProps {
  leadId: string
  entity?: Record<string, unknown>
}

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function InvitationsPanel({ leadId, entity }: InvitationsPanelProps) {
  const { createInvitation, isCreating } = useCreateInvitation()

  // Get lead email and invitations from entity
  const leadEmail = (entity as { email?: string })?.email
  const invitations = ((entity as { invitations?: LeadInvitation[] })?.invitations || []) as LeadInvitation[]

  const handleSendInvitation = async () => {
    if (!leadEmail) return
    try {
      await createInvitation({
        lead_id: leadId,
        email: leadEmail,
      })
      // Note: Would need to trigger a refetch of parent data to see new invitation
    } catch (err) {
      console.error('Failed to send invitation:', err)
    }
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {/* Send Invitation Button */}
      {leadEmail && (
        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Send Invitation</p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                Invite {leadEmail} to join the platform
              </p>
            </div>
            <button
              onClick={handleSendInvitation}
              disabled={isCreating}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
            >
              {isCreating ? (
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
              ) : (
                <Send className="w-3 h-3" />
              )}
              Send Invitation
            </button>
          </div>
        </div>
      )}

      {/* Invitations List */}
      {invitations.length === 0 ? (
        <div className="text-center py-8">
          <Send className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">No invitations sent yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {invitations.map((invitation) => {
            // Determine status based on used_at and is_expired
            const isUsed = !!invitation.used_at
            const isExpired = invitation.is_expired
            const isPending = !isUsed && !isExpired

            const getStatusInfo = () => {
              if (isUsed) {
                return { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700', label: 'Used', Icon: CheckCircle }
              }
              if (isExpired) {
                return { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-600 dark:text-gray-400', label: 'Expired', Icon: XCircle }
              }
              return { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700', label: 'Pending', Icon: Clock }
            }
            const statusInfo = getStatusInfo()
            const StatusIcon = statusInfo.Icon

            return (
              <div
                key={invitation.id}
                className={`p-3 border rounded-lg ${
                  isUsed
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                    : isExpired
                    ? 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                    : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                      <span className="text-sm text-gray-900 dark:text-gray-100 truncate">
                        {invitation.email}
                      </span>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${statusInfo.bg} ${statusInfo.text}`}>
                    <StatusIcon className="w-3 h-3" />
                    {statusInfo.label}
                  </span>
                </div>

                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Sent {formatDateTime(invitation.created_at)}
                  </span>
                  {isPending && invitation.expires_at && (
                    <span className="flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Expires {formatDateTime(invitation.expires_at)}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default InvitationsPanel
