import { useState } from 'react'
import { useInvitations, useCreateInvitation, useCancelInvitation, useResendInvitation, useLeads } from '@/hooks'
import type { ClientInvitation, CreateInvitationData } from '@/hooks'
import { Mail, Link2, Copy, Check, Clock, AlertCircle, UserPlus, CheckCircle, Trash2, RefreshCw, X, AlertTriangle, User, ChevronDown, FileText } from 'lucide-react'

export default function InvitationsPage() {
  const { invitations, isLoading, error, refetch } = useInvitations()
  const { createInvitation, isCreating, error: createError } = useCreateInvitation()
  const { cancelInvitation, isCancelling, error: cancelError } = useCancelInvitation()
  const { resendInvitation, isResending, error: resendError } = useResendInvitation()
  // Get unconverted leads only
  const { leads, isLoading: isLoadingLeads } = useLeads({ converted: 'false' })

  const [email, setEmail] = useState('')
  const [selectedLeadId, setSelectedLeadId] = useState<string>('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Pre-negotiated terms state
  const [showContractOffer, setShowContractOffer] = useState(false)
  const [serviceType, setServiceType] = useState<'headhunting' | 'retained' | ''>('')
  const [monthlyRetainer, setMonthlyRetainer] = useState('')
  const [placementFee, setPlacementFee] = useState('')
  const [csuitePlacementFee, setCsuitePlacementFee] = useState('')
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
      const data: CreateInvitationData = {}
      if (email) data.email = email
      if (selectedLeadId) data.lead_id = selectedLeadId

      // Include contract offer terms if provided
      if (serviceType) {
        data.offered_service_type = serviceType
      }
      if (monthlyRetainer) {
        data.offered_monthly_retainer = parseFloat(monthlyRetainer)
      }
      if (placementFee) {
        // Convert percentage to decimal (e.g., 20% -> 0.20)
        data.offered_placement_fee = parseFloat(placementFee) / 100
      }
      if (csuitePlacementFee) {
        // Convert percentage to decimal (e.g., 25% -> 0.25)
        data.offered_csuite_placement_fee = parseFloat(csuitePlacementFee) / 100
      }

      const result = await createInvitation(data)
      setNewInvitation({ signup_url: result.signup_url, email: result.email })

      // Reset form
      setEmail('')
      setSelectedLeadId('')
      setShowContractOffer(false)
      setServiceType('')
      setMonthlyRetainer('')
      setPlacementFee('')
      setCsuitePlacementFee('')

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
      <p className="text-[13px] text-gray-500 dark:text-gray-400">
        Invite new clients to sign up and create their company profile
      </p>

      {/* Create Invitation Form */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center flex-shrink-0">
            <UserPlus className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-[16px] font-medium text-gray-900 dark:text-gray-100">Create New Invitation</h2>
            <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">
              Generate a unique signup link for a new client. They'll be able to create their account and company profile.
            </p>

            <form onSubmit={handleCreate} className="mt-4 space-y-4">
              {/* Lead selector */}
              <div>
                <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Link to Lead
                </label>
                <div className="relative">
                  <select
                    value={selectedLeadId}
                    onChange={(e) => setSelectedLeadId(e.target.value)}
                    disabled={isLoadingLeads}
                    className="w-full h-10 px-3 pr-8 text-[14px] border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-gray-900 dark:focus:border-gray-400 focus:ring-1 focus:ring-gray-900 dark:focus:ring-gray-400 outline-none transition-colors appearance-none cursor-pointer"
                  >
                    <option value="">No lead (skip prospecting stages)</option>
                    {leads.map((lead) => (
                      <option key={lead.id} value={lead.id}>
                        {lead.name} at {lead.company_name} ({lead.onboarding_stage?.name || 'Lead'})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
                <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-1">
                  Link this invitation to a prospecting lead. The lead's stage will update to "Invitation Sent".
                </p>
              </div>

              {/* Email input */}
              <div>
                <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address (optional)"
                  className="w-full h-10 px-3 text-[14px] border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-gray-900 dark:focus:border-gray-400 focus:ring-1 focus:ring-gray-900 dark:focus:ring-gray-400 outline-none transition-colors"
                />
                <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-1">
                  If provided, the email will be pre-filled on the signup form
                </p>
              </div>

              {/* Contract Offer Toggle */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <button
                  type="button"
                  onClick={() => setShowContractOffer(!showContractOffer)}
                  className="flex items-center gap-2 text-[14px] font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  Pre-negotiated Contract Terms
                  <ChevronDown className={`w-4 h-4 transition-transform ${showContractOffer ? 'rotate-180' : ''}`} />
                </button>
                <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-1">
                  Optionally include pre-agreed pricing that will be shown during client onboarding
                </p>

                {showContractOffer && (
                  <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg space-y-4">
                    {/* Service Type */}
                    <div>
                      <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Service Type
                      </label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="serviceType"
                            value="headhunting"
                            checked={serviceType === 'headhunting'}
                            onChange={(e) => setServiceType(e.target.value as 'headhunting')}
                            className="w-4 h-4 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:ring-gray-900 dark:focus:ring-gray-400"
                          />
                          <span className="text-[14px] text-gray-700 dark:text-gray-300">Headhunting</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="serviceType"
                            value="retained"
                            checked={serviceType === 'retained'}
                            onChange={(e) => setServiceType(e.target.value as 'retained')}
                            className="w-4 h-4 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:ring-gray-900 dark:focus:ring-gray-400"
                          />
                          <span className="text-[14px] text-gray-700 dark:text-gray-300">Retained</span>
                        </label>
                        {serviceType && (
                          <button
                            type="button"
                            onClick={() => setServiceType('')}
                            className="text-[13px] text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Pricing Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Monthly Retainer - only show for retained */}
                      {serviceType === 'retained' && (
                        <div>
                          <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            Monthly Retainer
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-gray-500 dark:text-gray-400">R</span>
                            <input
                              type="number"
                              value={monthlyRetainer}
                              onChange={(e) => setMonthlyRetainer(e.target.value)}
                              placeholder="0"
                              min="0"
                              step="1"
                              className="w-full h-10 pl-7 pr-3 text-[14px] border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-gray-900 dark:focus:border-gray-400 focus:ring-1 focus:ring-gray-900 dark:focus:ring-gray-400 outline-none transition-colors"
                            />
                          </div>
                        </div>
                      )}

                      {/* Placement Fee */}
                      <div>
                        <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                          Placement Fee
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            value={placementFee}
                            onChange={(e) => setPlacementFee(e.target.value)}
                            placeholder="20"
                            min="0"
                            max="100"
                            step="0.1"
                            className="w-full h-10 px-3 pr-8 text-[14px] border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-gray-900 dark:focus:border-gray-400 focus:ring-1 focus:ring-gray-900 dark:focus:ring-gray-400 outline-none transition-colors"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[14px] text-gray-500 dark:text-gray-400">%</span>
                        </div>
                      </div>

                      {/* C-Suite Placement Fee */}
                      <div>
                        <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                          C-Suite Placement Fee
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            value={csuitePlacementFee}
                            onChange={(e) => setCsuitePlacementFee(e.target.value)}
                            placeholder="25"
                            min="0"
                            max="100"
                            step="0.1"
                            className="w-full h-10 px-3 pr-8 text-[14px] border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-gray-900 dark:focus:border-gray-400 focus:ring-1 focus:ring-gray-900 dark:focus:ring-gray-400 outline-none transition-colors"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[14px] text-gray-500 dark:text-gray-400">%</span>
                        </div>
                      </div>
                    </div>

                    <p className="text-[12px] text-gray-500 dark:text-gray-400">
                      These terms will be displayed as "Custom Pricing" during the client's onboarding contract step.
                    </p>
                  </div>
                )}
              </div>

              {/* Create button */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isCreating}
                  className="h-10 px-6 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[14px] font-medium rounded-md hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isCreating ? 'Creating...' : 'Create Invitation'}
                </button>
              </div>
            </form>

            {createError && (
              <div className="mt-3 px-3 py-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-[13px] text-red-600 dark:text-red-400">{createError}</p>
              </div>
            )}

            {/* Show newly created invitation */}
            {newInvitation && (
              <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-green-800 dark:text-green-300">
                      Invitation created successfully!
                    </p>
                    <p className="text-[13px] text-green-700 dark:text-green-400 mt-1">
                      Share this link with the client:
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <code className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-green-200 dark:border-green-800 rounded text-[13px] text-gray-700 dark:text-gray-300 overflow-x-auto">
                        {newInvitation.signup_url}
                      </code>
                      <button
                        onClick={() => copyToClipboard(newInvitation.signup_url, 'new')}
                        className="p-2 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/50 rounded transition-colors"
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
                    className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300"
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
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-[16px] font-medium text-gray-900 dark:text-gray-100">Your Invitations</h2>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 dark:border-gray-700 border-t-gray-900 dark:border-t-gray-100 mx-auto" />
              <p className="text-[14px] text-gray-500 dark:text-gray-400 mt-3">Loading invitations...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
              <p className="text-[14px] text-gray-700 dark:text-gray-300">{error}</p>
            </div>
          </div>
        ) : invitations.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Mail className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-[14px] text-gray-500 dark:text-gray-400">No invitations yet</p>
              <p className="text-[13px] text-gray-400 mt-1">
                Create your first invitation above
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {invitations.map((invitation) => (
              <div key={invitation.id} className="px-6 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {invitation.email ? (
                        <span className="text-[14px] font-medium text-gray-900 dark:text-gray-100">
                          {invitation.email}
                        </span>
                      ) : (
                        <span className="text-[14px] text-gray-500 dark:text-gray-400 italic">
                          No email specified
                        </span>
                      )}
                      {getStatusBadge(invitation)}
                      {invitation.offered_service_type && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-100 text-purple-700">
                          <FileText className="w-3 h-3" />
                          {invitation.offered_service_type === 'retained' ? 'Retained' : 'Headhunting'}
                        </span>
                      )}
                    </div>
                    {invitation.lead && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <User className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-[13px] text-gray-700 dark:text-gray-300">
                          {invitation.lead.name} at {invitation.lead.company_name}
                        </span>
                        {invitation.lead.onboarding_stage && (
                          <span className="text-[11px] text-gray-400">
                            ({invitation.lead.onboarding_stage.name})
                          </span>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-4 mt-1 text-[12px] text-gray-500 dark:text-gray-400">
                      <span>Created: {formatDate(invitation.created_at)}</span>
                      <span>Expires: {formatDate(invitation.expires_at)}</span>
                      {invitation.used_at && (
                        <span className="text-green-600 dark:text-green-400">
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
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                        title="Copy signup link"
                      >
                        {copiedId === invitation.token ? (
                          <>
                            <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                            <span className="text-green-600 dark:text-green-400">Copied!</span>
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
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition-colors"
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
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors"
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
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl dark:shadow-gray-900/40 w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-[16px] font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Cancel Invitation
              </h3>
              <button
                onClick={() => setCancellingInvitation(null)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-[14px] text-gray-600 dark:text-gray-400">
                Are you sure you want to cancel this invitation?
              </p>

              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-[14px] font-medium text-gray-900 dark:text-gray-100">
                      {cancellingInvitation.email || <span className="italic text-gray-500 dark:text-gray-400">No email specified</span>}
                    </p>
                    <p className="text-[12px] text-gray-500 dark:text-gray-400">
                      Created {formatDate(cancellingInvitation.created_at)}
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-[13px] text-gray-500 dark:text-gray-400">
                The invitation link will no longer work. You can create a new invitation if needed.
              </p>

              {cancelError && (
                <p className="text-[13px] text-red-600 dark:text-red-400 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" />
                  {cancelError}
                </p>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setCancellingInvitation(null)}
                disabled={isCancelling}
                className="px-4 py-2 text-[14px] font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
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
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl dark:shadow-gray-900/40 w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-[16px] font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                Resend Invitation
              </h3>
              <button
                onClick={() => setResendingInvitation(null)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-[14px] text-gray-600 dark:text-gray-400">
                This will extend the invitation expiry and resend the email.
              </p>

              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-[14px] font-medium text-gray-900 dark:text-gray-100">
                      {resendingInvitation.email || <span className="italic text-gray-500 dark:text-gray-400">No email specified</span>}
                    </p>
                    <p className="text-[12px] text-gray-500 dark:text-gray-400">
                      {resendingInvitation.is_expired ? (
                        <span className="text-amber-600 dark:text-amber-400">Expired {formatDate(resendingInvitation.expires_at)}</span>
                      ) : (
                        <>Expires {formatDate(resendingInvitation.expires_at)}</>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="text-[13px] font-medium text-blue-800 dark:text-blue-300 mb-2">This action will:</h4>
                <ul className="text-[13px] text-blue-700 dark:text-blue-400 space-y-1 list-disc list-inside">
                  <li>Extend expiry by 7 days from now</li>
                  {resendingInvitation.email && <li>Resend invitation email</li>}
                </ul>
              </div>

              {resendError && (
                <p className="text-[13px] text-red-600 dark:text-red-400 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" />
                  {resendError}
                </p>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setResendingInvitation(null)}
                disabled={isResending}
                className="px-4 py-2 text-[14px] font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
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
