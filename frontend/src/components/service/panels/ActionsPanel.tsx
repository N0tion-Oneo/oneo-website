import { useState } from 'react'
import {
  Gift,
  XCircle,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import type { Application, OfferDetails, RejectionReason } from '@/types'
import { ApplicationStatus, RejectionReasonLabels } from '@/types'
import {
  useMakeOffer,
  useAcceptOffer,
  useRejectApplication,
} from '@/hooks'
import { useReplacementActions } from '@/hooks/useReplacements'
import OfferForm, { getEmptyOfferDetails } from '@/components/applications/OfferForm'
import ReplacementRequestModal from '@/components/replacements/ReplacementRequestModal'

// =============================================================================
// Types
// =============================================================================

interface ActionsPanelProps {
  applicationId: string
  application: Application | null
  onRefresh: () => void
}

type ActionType = 'offer' | 'reject' | 'replacement' | null

// =============================================================================
// Currency Formatting
// =============================================================================

const CURRENCY_SYMBOLS: Record<string, string> = {
  ZAR: 'R',
  USD: '$',
  EUR: '€',
  GBP: '£',
}

const formatSalary = (salary: number | null | undefined, currency: string | undefined) => {
  if (!salary) return 'Not specified'
  const symbol = CURRENCY_SYMBOLS[currency || 'ZAR'] || currency || ''
  return `${symbol}${salary.toLocaleString()}`
}

const formatDisplayDate = (dateString: string | null | undefined) => {
  if (!dateString) return 'Not specified'
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

// =============================================================================
// Action Card Component
// =============================================================================

function ActionCard({
  title,
  description,
  icon: Icon,
  iconColor,
  bgColor,
  isExpanded,
  onToggle,
  isDisabled,
  disabledReason,
  children,
}: {
  title: string
  description: string
  icon: typeof Gift
  iconColor: string
  bgColor: string
  isExpanded: boolean
  onToggle: () => void
  isDisabled?: boolean
  disabledReason?: string
  children: React.ReactNode
}) {
  return (
    <div className={`border rounded-lg overflow-hidden ${isDisabled ? 'opacity-60' : ''}`}>
      <button
        onClick={onToggle}
        disabled={isDisabled}
        className={`w-full flex items-center justify-between p-4 text-left ${bgColor} hover:opacity-90 transition-opacity disabled:cursor-not-allowed`}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${iconColor}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[14px] font-medium text-gray-900 dark:text-gray-100">{title}</p>
            <p className="text-[12px] text-gray-500 dark:text-gray-400">
              {isDisabled ? disabledReason : description}
            </p>
          </div>
        </div>
        {!isDisabled && (
          isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400 dark:text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-400 dark:text-gray-500" />
        )}
      </button>
      {isExpanded && !isDisabled && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          {children}
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Offer Section Component
// =============================================================================

function OfferSection({
  application,
  onSuccess,
}: {
  application: Application
  onSuccess: () => void
}) {
  const [offerDetails, setOfferDetails] = useState<OfferDetails>(getEmptyOfferDetails())
  const [isEditing, setIsEditing] = useState(false)
  const { makeOffer, isLoading: isMakingOffer } = useMakeOffer()
  const { acceptOffer, isLoading: isAccepting } = useAcceptOffer()
  const [error, setError] = useState<string | null>(null)

  const hasOffer = application.status === ApplicationStatus.OFFER_MADE || application.status === ApplicationStatus.OFFER_ACCEPTED
  const isAccepted = application.status === ApplicationStatus.OFFER_ACCEPTED
  const existingOffer = application.offer_details
  const finalOffer = application.final_offer_details
  const displayOffer = isAccepted && finalOffer?.annual_salary ? finalOffer : existingOffer

  const handleMakeOffer = async () => {
    setError(null)
    try {
      await makeOffer(application.id, { offer_details: offerDetails })
      onSuccess()
    } catch (err) {
      setError((err as Error).message || 'Failed to make offer')
    }
  }

  const handleAcceptOffer = async () => {
    setError(null)
    try {
      await acceptOffer(application.id, {})
      onSuccess()
    } catch (err) {
      setError((err as Error).message || 'Failed to accept offer')
    }
  }

  const handleStartEdit = () => {
    if (existingOffer) {
      setOfferDetails({
        annual_salary: existingOffer.annual_salary || null,
        currency: existingOffer.currency || 'ZAR',
        start_date: existingOffer.start_date || null,
        notes: existingOffer.notes || '',
        benefits: existingOffer.benefits || [],
        equity: existingOffer.equity || null,
      })
    }
    setIsEditing(true)
  }

  const handleSaveEdit = async () => {
    setError(null)
    try {
      await makeOffer(application.id, { offer_details: offerDetails })
      setIsEditing(false)
      onSuccess()
    } catch (err) {
      setError((err as Error).message || 'Failed to update offer')
    }
  }

  const isProcessing = isMakingOffer || isAccepting

  // Calculate totals
  const calcOfferTotals = (offer: OfferDetails | null) => {
    if (!offer) return { totalBenefits: 0, year1Equity: 0, totalCost: 0 }
    const benefits = offer.benefits || []
    const equity = offer.equity
    const totalBenefits = benefits.reduce((sum, b) => sum + (b.annual_cost || 0), 0)
    const year1Equity = equity && equity.shares && equity.share_value && equity.vesting_years
      ? (equity.shares * equity.share_value) / equity.vesting_years
      : 0
    const annualSalary = offer.annual_salary || 0
    return { totalBenefits, year1Equity, totalCost: annualSalary + totalBenefits + year1Equity }
  }

  // MAKE OFFER MODE
  if (!hasOffer) {
    return (
      <div className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <OfferForm offerDetails={offerDetails} setOfferDetails={setOfferDetails} />

        <button
          onClick={handleMakeOffer}
          disabled={isProcessing}
          className="w-full px-4 py-2.5 text-[14px] font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50"
        >
          {isProcessing ? 'Sending Offer...' : 'Make Offer'}
        </button>
      </div>
    )
  }

  // EDIT MODE
  if (isEditing && !isAccepted) {
    return (
      <div className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <OfferForm offerDetails={offerDetails} setOfferDetails={setOfferDetails} />

        <div className="flex gap-3">
          <button
            onClick={() => setIsEditing(false)}
            disabled={isProcessing}
            className="flex-1 px-4 py-2.5 text-[14px] font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveEdit}
            disabled={isProcessing}
            className="flex-1 px-4 py-2.5 text-[14px] font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50"
          >
            {isProcessing ? 'Updating...' : 'Update Offer'}
          </button>
        </div>
      </div>
    )
  }

  // VIEW MODE
  const totals = calcOfferTotals(displayOffer)
  const benefits = displayOffer?.benefits || []
  const equity = displayOffer?.equity
  const currency = displayOffer?.currency || 'ZAR'
  const currencySymbol = CURRENCY_SYMBOLS[currency] || currency

  return (
    <div className="space-y-4">
      {/* Status Banner */}
      <div className={`p-3 rounded-lg ${isAccepted ? 'bg-green-50 border border-green-200' : 'bg-purple-50 border border-purple-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isAccepted ? (
              <>
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-[13px] font-medium text-green-800">Offer Accepted</span>
              </>
            ) : (
              <>
                <Gift className="w-4 h-4 text-purple-600" />
                <span className="text-[13px] font-medium text-purple-800">Offer Extended</span>
              </>
            )}
          </div>
          {!isAccepted && (
            <button
              onClick={handleStartEdit}
              className="px-2 py-1 text-[11px] font-medium text-purple-700 bg-purple-100 rounded hover:bg-purple-200"
            >
              Edit
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Offer Details */}
      <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-100 dark:divide-gray-800">
        <div className="p-3">
          <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-0.5">Annual Salary</p>
          <p className="text-[16px] font-semibold text-gray-900 dark:text-gray-100">
            {formatSalary(displayOffer?.annual_salary, displayOffer?.currency)}
          </p>
        </div>

        <div className="p-3">
          <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-0.5">Start Date</p>
          <p className="text-[13px] text-gray-900 dark:text-gray-100">{formatDisplayDate(displayOffer?.start_date)}</p>
        </div>

        {benefits.length > 0 && (
          <div className="p-3">
            <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Benefits</p>
            <div className="space-y-1">
              {benefits.map((benefit, idx) => (
                <div key={idx} className="flex justify-between text-[12px]">
                  <span className="text-gray-700 dark:text-gray-300">{benefit.name}</span>
                  <span className="text-gray-500 dark:text-gray-400">{currencySymbol}{benefit.annual_cost?.toLocaleString()}/yr</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {equity && equity.shares && equity.shares > 0 && (
          <div className="p-3">
            <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Equity</p>
            <div className="grid grid-cols-3 gap-2 text-[12px]">
              <div>
                <p className="text-gray-500 dark:text-gray-400">Shares</p>
                <p className="text-gray-900 dark:text-gray-100 font-medium">{equity.shares.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Value</p>
                <p className="text-gray-900 dark:text-gray-100 font-medium">{currencySymbol}{equity.share_value?.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Vesting</p>
                <p className="text-gray-900 dark:text-gray-100 font-medium">{equity.vesting_years}y</p>
              </div>
            </div>
          </div>
        )}

        {totals.totalCost > 0 && (
          <div className="p-3 bg-gray-100 dark:bg-gray-700">
            <div className="flex justify-between items-center">
              <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Cost (Y1)</p>
              <p className="text-[14px] font-semibold text-gray-900 dark:text-gray-100">
                {currencySymbol}{totals.totalCost.toLocaleString()}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Accept Button */}
      {!isAccepted && (
        <button
          onClick={handleAcceptOffer}
          disabled={isProcessing}
          className="w-full px-4 py-2.5 text-[14px] font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
        >
          {isProcessing ? 'Confirming...' : 'Accept Offer'}
        </button>
      )}
    </div>
  )
}

// =============================================================================
// Reject Section Component
// =============================================================================

function RejectSection({
  applicationId,
  onSuccess,
}: {
  applicationId: string
  onSuccess: () => void
}) {
  const [rejectionReason, setRejectionReason] = useState<RejectionReason | ''>('')
  const [rejectionFeedback, setRejectionFeedback] = useState('')
  const { reject, isLoading, error: rejectError } = useRejectApplication()
  const [error, setError] = useState<string | null>(null)

  const handleReject = async () => {
    if (!rejectionReason) return
    setError(null)
    try {
      await reject(applicationId, {
        rejection_reason: rejectionReason,
        rejection_feedback: rejectionFeedback || undefined,
      })
      onSuccess()
    } catch (err) {
      setError((err as Error).message || rejectError || 'Failed to reject')
    }
  }

  return (
    <div className="space-y-4">
      {(error || rejectError) && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error || rejectError}</p>
        </div>
      )}

      <div>
        <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1">
          Rejection Reason <span className="text-red-500">*</span>
        </label>
        <select
          value={rejectionReason}
          onChange={(e) => setRejectionReason(e.target.value as RejectionReason)}
          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md text-[14px] focus:outline-none focus:ring-2 focus:ring-gray-900"
        >
          <option value="">Select a reason...</option>
          {Object.entries(RejectionReasonLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1">
          Feedback (optional)
        </label>
        <textarea
          value={rejectionFeedback}
          onChange={(e) => setRejectionFeedback(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md text-[14px] focus:outline-none focus:ring-2 focus:ring-gray-900"
          placeholder="Additional notes about the rejection..."
        />
      </div>

      <button
        onClick={handleReject}
        disabled={isLoading || !rejectionReason}
        className="w-full px-4 py-2.5 text-[14px] font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
      >
        {isLoading ? 'Rejecting...' : 'Reject Application'}
      </button>
    </div>
  )
}

// =============================================================================
// Replacement Section Component
// =============================================================================

function ReplacementSection({
  application,
  onSuccess,
}: {
  application: Application
  onSuccess: () => void
}) {
  const [showModal, setShowModal] = useState(false)
  const { approveRequest, rejectRequest, isApproving, isRejecting } = useReplacementActions()
  const [reviewNotes, setReviewNotes] = useState('')

  const existingRequest = application.replacement_request
  const isReplacement = application.is_replacement

  // If this is already a replacement hire
  if (isReplacement) {
    return (
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-3">
          <RefreshCw className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[14px] font-medium text-blue-800">Replacement Placement</p>
            <p className="text-[13px] text-blue-700 mt-1">
              This candidate was hired as a replacement. No replacement guarantee applies.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // If there's an existing request
  if (existingRequest) {
    const isPending = existingRequest.status === 'pending'
    const statusColors = {
      pending: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      approved: 'bg-green-50 border-green-200 text-green-800',
      rejected: 'bg-red-50 border-red-200 text-red-800',
    }

    return (
      <div className="space-y-4">
        <div className={`p-4 rounded-lg border ${statusColors[existingRequest.status as keyof typeof statusColors] || statusColors.pending}`}>
          <div className="flex items-center gap-2 mb-2">
            <RefreshCw className="w-4 h-4" />
            <span className="text-[14px] font-medium capitalize">
              Replacement Request: {existingRequest.status}
            </span>
          </div>
          {existingRequest.reason_details && (
            <p className="text-[13px] opacity-80">{existingRequest.reason_details}</p>
          )}
          {existingRequest.requested_at && (
            <p className="text-[11px] opacity-60 mt-2">
              Requested: {formatDisplayDate(existingRequest.requested_at)}
            </p>
          )}
        </div>

        {/* Admin review controls */}
        {isPending && (
          <div className="space-y-3 pt-2 border-t border-gray-200 dark:border-gray-700">
            <p className="text-[12px] font-medium text-gray-600 dark:text-gray-400">Admin Review</p>

            <div>
              <label className="block text-[12px] text-gray-500 dark:text-gray-400 mb-1">Review Notes (optional)</label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-gray-900"
                placeholder="Add notes for the review..."
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={async () => {
                  await approveRequest(existingRequest.id, { approval_type: 'free' })
                  onSuccess()
                }}
                disabled={isApproving || isRejecting}
                className="flex-1 px-3 py-2 text-[13px] font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {isApproving ? 'Approving...' : 'Approve (Free)'}
              </button>
              <button
                onClick={async () => {
                  await rejectRequest(existingRequest.id, { review_notes: reviewNotes })
                  onSuccess()
                }}
                disabled={isApproving || isRejecting}
                className="flex-1 px-3 py-2 text-[13px] font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {isRejecting ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // No existing request - allow creating one
  return (
    <>
      <div className="space-y-4">
        <p className="text-[13px] text-gray-600 dark:text-gray-400">
          If the placed candidate leaves within the guarantee period, you can request a free replacement.
        </p>
        <button
          onClick={() => setShowModal(true)}
          className="w-full px-4 py-2.5 text-[14px] font-medium text-gray-700 dark:text-gray-300 border border-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          Request Replacement
        </button>
      </div>

      <ReplacementRequestModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        applicationId={application.id}
        candidateName={application.candidate?.full_name || 'Candidate'}
        jobTitle={application.job?.title || 'Position'}
        onSuccess={() => {
          setShowModal(false)
          onSuccess()
        }}
      />
    </>
  )
}

// =============================================================================
// Main ActionsPanel Component
// =============================================================================

export function ActionsPanel({ applicationId, application, onRefresh }: ActionsPanelProps) {
  const [expandedAction, setExpandedAction] = useState<ActionType>(null)

  if (!application) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
        Loading application...
      </div>
    )
  }

  const status = application.status

  // Determine which actions are available based on status
  const canMakeOffer = [
    ApplicationStatus.SHORTLISTED,
    ApplicationStatus.IN_PROGRESS,
    ApplicationStatus.OFFER_MADE,
  ].includes(status)

  const canReject = ![
    ApplicationStatus.REJECTED,
    ApplicationStatus.OFFER_ACCEPTED,
    ApplicationStatus.OFFER_DECLINED,
  ].includes(status)

  const canRequestReplacement = status === ApplicationStatus.OFFER_ACCEPTED

  const hasOffer = status === ApplicationStatus.OFFER_MADE || status === ApplicationStatus.OFFER_ACCEPTED
  const isRejected = status === ApplicationStatus.REJECTED
  const isDeclined = status === ApplicationStatus.OFFER_DECLINED

  const toggleAction = (action: ActionType) => {
    setExpandedAction(prev => prev === action ? null : action)
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="space-y-3">
        {/* Current Status Banner */}
        <div className="p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg mb-4">
          <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
            Current Status
          </p>
          <p className="text-[14px] font-medium text-gray-900 dark:text-gray-100 capitalize">
            {status.replace(/_/g, ' ')}
          </p>
        </div>

        {/* Offer Action */}
        <ActionCard
          title={hasOffer ? 'View Offer' : 'Make Offer'}
          description={hasOffer ? 'View or edit the current offer' : 'Send an offer to this candidate'}
          icon={Gift}
          iconColor="bg-purple-100 text-purple-600"
          bgColor="bg-purple-50"
          isExpanded={expandedAction === 'offer'}
          onToggle={() => toggleAction('offer')}
          isDisabled={!canMakeOffer && !hasOffer}
          disabledReason={isRejected ? 'Application rejected' : isDeclined ? 'Offer declined' : 'Not available'}
        >
          <OfferSection application={application} onSuccess={onRefresh} />
        </ActionCard>

        {/* Reject Action */}
        <ActionCard
          title="Reject Application"
          description="Reject this candidate from the pipeline"
          icon={XCircle}
          iconColor="bg-red-100 text-red-600"
          bgColor="bg-red-50"
          isExpanded={expandedAction === 'reject'}
          onToggle={() => toggleAction('reject')}
          isDisabled={!canReject}
          disabledReason={isRejected ? 'Already rejected' : isDeclined ? 'Offer declined' : 'Offer accepted'}
        >
          <RejectSection applicationId={applicationId} onSuccess={onRefresh} />
        </ActionCard>

        {/* Replacement Action */}
        <ActionCard
          title="Replacement Request"
          description="Request a replacement if candidate leaves"
          icon={RefreshCw}
          iconColor="bg-blue-100 text-blue-600"
          bgColor="bg-blue-50"
          isExpanded={expandedAction === 'replacement'}
          onToggle={() => toggleAction('replacement')}
          isDisabled={!canRequestReplacement && !application.replacement_request && !application.is_replacement}
          disabledReason="Available after offer accepted"
        >
          <ReplacementSection application={application} onSuccess={onRefresh} />
        </ActionCard>
      </div>
    </div>
  )
}

export default ActionsPanel
