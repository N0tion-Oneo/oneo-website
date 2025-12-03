import { useState, useEffect } from 'react'
import { X, User, Clock, FileText, Save, Gift, Ban, CheckCircle, AlertCircle } from 'lucide-react'
import { useApplication, useUpdateApplicationNotes } from '@/hooks'
import { CandidateProfileCard } from '@/components/candidates'
import { ApplicationStatus, RejectionReason, RejectionReasonLabels } from '@/types'
import type { Application, InterviewStage, OfferDetails } from '@/types'

interface ApplicationDrawerProps {
  applicationId: string | null
  isOpen: boolean
  onClose: () => void
  onUpdate?: () => void
  // Action handlers
  onShortlist?: (applicationId: string) => void
  onMakeOffer?: (applicationId: string, offerDetails: OfferDetails) => Promise<void>
  onAcceptOffer?: (applicationId: string, finalOfferDetails: OfferDetails) => Promise<void>
  onReject?: (applicationId: string, reason: RejectionReason, feedback: string) => Promise<void>
  isProcessing?: boolean
}

type TabType = 'profile' | 'history' | 'notes' | 'offer' | 'accept' | 'reject'

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const getStatusColor = (status: ApplicationStatus) => {
  const colors = {
    [ApplicationStatus.APPLIED]: 'bg-blue-100 text-blue-700',
    [ApplicationStatus.IN_PROGRESS]: 'bg-yellow-100 text-yellow-700',
    [ApplicationStatus.OFFER]: 'bg-green-100 text-green-700',
    [ApplicationStatus.ACCEPTED]: 'bg-green-100 text-green-700',
    [ApplicationStatus.REJECTED]: 'bg-red-100 text-red-700',
    [ApplicationStatus.WITHDRAWN]: 'bg-gray-100 text-gray-700',
  }
  return colors[status] || 'bg-gray-100 text-gray-700'
}

export default function ApplicationDrawer({
  applicationId,
  isOpen,
  onClose,
  onUpdate,
  onShortlist,
  onMakeOffer,
  onAcceptOffer,
  onReject,
  isProcessing = false,
}: ApplicationDrawerProps) {
  const [activeTab, setActiveTab] = useState<TabType>('profile')
  const [feedback, setFeedback] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  // Offer form state
  const [offerDetails, setOfferDetails] = useState<OfferDetails>({
    salary: null,
    currency: 'ZAR',
    start_date: null,
    notes: '',
    benefits: '',
    equity: '',
  })

  // Accept offer form state
  const [finalOfferDetails, setFinalOfferDetails] = useState<OfferDetails>({})

  // Reject form state
  const [rejectionReason, setRejectionReason] = useState<RejectionReason | ''>('')
  const [rejectionFeedback, setRejectionFeedback] = useState('')

  const { application, isLoading, refetch } = useApplication(applicationId || '')
  const { updateNotes } = useUpdateApplicationNotes()

  useEffect(() => {
    if (application) {
      setFeedback(application.feedback || '')
    }
  }, [application])

  useEffect(() => {
    if (isOpen && applicationId) {
      refetch()
      setActiveTab('profile')
      setActionError(null)
    }
  }, [isOpen, applicationId, refetch])

  const handleSaveNotes = async () => {
    if (!applicationId) return
    setIsSaving(true)
    try {
      await updateNotes(applicationId, { feedback })
      onUpdate?.()
    } catch (error) {
      console.error('Failed to save notes:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleMakeOffer = async () => {
    if (!applicationId || !onMakeOffer) return
    setActionError(null)
    try {
      await onMakeOffer(applicationId, offerDetails)
      setOfferDetails({ salary: null, currency: 'ZAR', start_date: null, notes: '', benefits: '', equity: '' })
      setActiveTab('profile')
      onClose()
    } catch (err) {
      setActionError((err as Error).message || 'Failed to make offer')
    }
  }

  const handleAcceptOffer = async () => {
    if (!applicationId || !onAcceptOffer) return
    setActionError(null)
    try {
      await onAcceptOffer(applicationId, finalOfferDetails)
      setFinalOfferDetails({})
      setActiveTab('profile')
      onClose()
    } catch (err) {
      setActionError((err as Error).message || 'Failed to accept offer')
    }
  }

  const handleReject = async () => {
    if (!applicationId || !onReject || !rejectionReason) return
    setActionError(null)
    try {
      await onReject(applicationId, rejectionReason, rejectionFeedback)
      setRejectionReason('')
      setRejectionFeedback('')
      setActiveTab('profile')
      onClose()
    } catch (err) {
      setActionError((err as Error).message || 'Failed to reject application')
    }
  }

  if (!isOpen) return null

  // Build tabs based on application status
  const tabs: { id: TabType; label: string; icon: typeof User }[] = [
    { id: 'profile', label: 'Candidate', icon: User },
    { id: 'history', label: 'History', icon: Clock },
    { id: 'notes', label: 'Notes', icon: FileText },
  ]

  // Add action tabs based on status
  if (application && onMakeOffer) {
    tabs.push({ id: 'offer', label: 'Make Offer', icon: Gift })
  }
  if (application && application.status === ApplicationStatus.OFFER_MADE && onAcceptOffer) {
    tabs.push({ id: 'accept', label: 'Accept', icon: CheckCircle })
  }
  if (application && onReject) {
    tabs.push({ id: 'reject', label: 'Reject', icon: Ban })
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer - 50% width */}
      <div className="fixed inset-y-0 right-0 w-1/2 min-w-[500px] bg-white shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-[16px] font-semibold text-gray-900">
              {isLoading ? 'Loading...' : application?.candidate?.full_name || 'Application'}
            </h2>
            {application && (
              <p className="text-[13px] text-gray-500 mt-0.5">
                Applied {formatDate(application.applied_at)}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Badge */}
        {application && (
          <div className="px-6 py-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <span className={`px-2 py-1 text-[12px] font-medium rounded ${getStatusColor(application.status)}`}>
                {application.status.replace('_', ' ').toUpperCase()}
              </span>
              <span className="text-[13px] text-gray-600">
                Stage: {application.current_stage_name}
              </span>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-[13px] font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'text-gray-900 border-gray-900'
                    : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-[14px] text-gray-500">Loading application...</p>
            </div>
          ) : application ? (
            <>
              {activeTab === 'profile' && (
                <CandidateProfileCard
                  candidate={application.candidate}
                  experiences={application.candidate.experiences || []}
                  education={application.candidate.education || []}
                  coveringStatement={application.covering_statement}
                  compact
                />
              )}
              {activeTab === 'history' && (
                <ApplicationHistoryTab application={application} />
              )}
              {activeTab === 'notes' && (
                <ApplicationNotesTab
                  application={application}
                  feedback={feedback}
                  setFeedback={setFeedback}
                  onSave={handleSaveNotes}
                  isSaving={isSaving}
                />
              )}
              {activeTab === 'offer' && (
                <MakeOfferTab
                  offerDetails={offerDetails}
                  setOfferDetails={setOfferDetails}
                  onSubmit={handleMakeOffer}
                  isProcessing={isProcessing}
                  error={actionError}
                />
              )}
              {activeTab === 'accept' && (
                <AcceptOfferTab
                  application={application}
                  finalOfferDetails={finalOfferDetails}
                  setFinalOfferDetails={setFinalOfferDetails}
                  onSubmit={handleAcceptOffer}
                  isProcessing={isProcessing}
                  error={actionError}
                />
              )}
              {activeTab === 'reject' && (
                <RejectTab
                  rejectionReason={rejectionReason}
                  setRejectionReason={setRejectionReason}
                  rejectionFeedback={rejectionFeedback}
                  setRejectionFeedback={setRejectionFeedback}
                  onSubmit={handleReject}
                  isProcessing={isProcessing}
                  error={actionError}
                />
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-32">
              <p className="text-[14px] text-gray-500">Application not found</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ============================================================================
// Tab Components
// ============================================================================

function ApplicationHistoryTab({ application }: { application: Application }) {
  const stages = application.interview_stages || []

  // Build timeline from stage notes and current status
  const timeline: { stage: number; name: string; notes?: string; date?: string; isCurrent: boolean }[] = [
    { stage: 0, name: 'Applied', date: application.applied_at, isCurrent: application.current_stage_order === 0 }
  ]

  // Add interview stages
  stages.forEach((stage: InterviewStage) => {
    const stageNotes = application.stage_notes?.[String(stage.order)]
    timeline.push({
      stage: stage.order,
      name: stage.name,
      notes: stageNotes?.notes,
      date: stageNotes?.updated_at,
      isCurrent: application.current_stage_order === stage.order,
    })
  })

  // Add final statuses if applicable
  if (application.status === ApplicationStatus.OFFER || application.status === ApplicationStatus.ACCEPTED) {
    timeline.push({
      stage: -1,
      name: application.status === ApplicationStatus.ACCEPTED ? 'Offer Accepted' : 'Offer Extended',
      date: application.last_status_change,
      isCurrent: true,
    })
  } else if (application.status === ApplicationStatus.REJECTED) {
    timeline.push({
      stage: -2,
      name: 'Rejected',
      notes: application.rejection_reason || undefined,
      date: application.last_status_change,
      isCurrent: true,
    })
  } else if (application.status === ApplicationStatus.WITHDRAWN) {
    timeline.push({
      stage: -3,
      name: 'Withdrawn',
      date: application.last_status_change,
      isCurrent: true,
    })
  }

  return (
    <div className="space-y-4">
      <h4 className="text-[12px] font-medium text-gray-500 uppercase tracking-wider">Application Timeline</h4>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-3 top-3 bottom-3 w-0.5 bg-gray-200" />

        <div className="space-y-4">
          {timeline.map((item, index) => {
            const isPast = item.stage < application.current_stage_order || item.stage < 0
            const isFuture = item.stage > application.current_stage_order && item.stage >= 0

            return (
              <div key={index} className="relative flex gap-4">
                {/* Dot */}
                <div
                  className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center ${
                    item.isCurrent
                      ? 'bg-gray-900'
                      : isPast
                      ? 'bg-green-500'
                      : 'bg-gray-200'
                  }`}
                >
                  {isPast && !item.isCurrent && (
                    <span className="text-white text-[10px]">✓</span>
                  )}
                  {item.isCurrent && (
                    <span className="w-2 h-2 bg-white rounded-full" />
                  )}
                </div>

                {/* Content */}
                <div className={`flex-1 pb-4 ${isFuture ? 'opacity-50' : ''}`}>
                  <div className="flex items-center justify-between">
                    <p className={`text-[14px] font-medium ${item.isCurrent ? 'text-gray-900' : 'text-gray-700'}`}>
                      {item.name}
                    </p>
                    {item.date && (
                      <span className="text-[12px] text-gray-500">
                        {formatDate(item.date)}
                      </span>
                    )}
                  </div>
                  {item.notes && (
                    <p className="text-[13px] text-gray-600 mt-1">{item.notes}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function ApplicationNotesTab({
  application,
  feedback,
  setFeedback,
  onSave,
  isSaving,
}: {
  application: Application
  feedback: string
  setFeedback: (value: string) => void
  onSave: () => void
  isSaving: boolean
}) {
  const stages = application.interview_stages || []

  return (
    <div className="space-y-6">
      {/* General Notes */}
      <div className="space-y-3">
        <h4 className="text-[12px] font-medium text-gray-500 uppercase tracking-wider">General Notes</h4>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border border-gray-200 rounded-md text-[14px] focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
          placeholder="Add internal notes about this candidate..."
        />
        <button
          onClick={onSave}
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-[13px] font-medium rounded-md hover:bg-gray-800 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Saving...' : 'Save Notes'}
        </button>
      </div>

      {/* Stage Notes */}
      {stages.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-[12px] font-medium text-gray-500 uppercase tracking-wider">Stage Notes</h4>
          <div className="space-y-3">
            {stages.map((stage: InterviewStage) => {
              const stageNotes = application.stage_notes?.[String(stage.order)]
              return (
                <div key={stage.order} className="p-3 bg-gray-50 rounded-md">
                  <p className="text-[13px] font-medium text-gray-700">{stage.name}</p>
                  {stageNotes ? (
                    <p className="text-[13px] text-gray-600 mt-1">{stageNotes.notes}</p>
                  ) : (
                    <p className="text-[12px] text-gray-400 mt-1 italic">No notes for this stage</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Rejection Reason */}
      {application.status === ApplicationStatus.REJECTED && application.rejection_reason && (
        <div className="space-y-3">
          <h4 className="text-[12px] font-medium text-gray-500 uppercase tracking-wider">Rejection Reason</h4>
          <p className="text-[14px] text-gray-700 bg-red-50 p-3 rounded-md">
            {application.rejection_reason}
          </p>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Make Offer Tab
// ============================================================================

function MakeOfferTab({
  offerDetails,
  setOfferDetails,
  onSubmit,
  isProcessing,
  error,
}: {
  offerDetails: OfferDetails
  setOfferDetails: (details: OfferDetails) => void
  onSubmit: () => void
  isProcessing: boolean
  error: string | null
}) {
  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-[14px] font-medium text-gray-900 mb-1">Make an Offer</h4>
        <p className="text-[13px] text-gray-500">Enter the offer details for this candidate</p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[13px] font-medium text-gray-700 mb-1">Salary</label>
            <input
              type="number"
              value={offerDetails.salary || ''}
              onChange={(e) => setOfferDetails({ ...offerDetails, salary: e.target.value ? parseInt(e.target.value) : null })}
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-[14px] focus:outline-none focus:ring-2 focus:ring-gray-900"
              placeholder="e.g., 50000"
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-gray-700 mb-1">Currency</label>
            <select
              value={offerDetails.currency}
              onChange={(e) => setOfferDetails({ ...offerDetails, currency: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-[14px] focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value="ZAR">ZAR (R)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[13px] font-medium text-gray-700 mb-1">Start Date</label>
          <input
            type="date"
            value={offerDetails.start_date || ''}
            onChange={(e) => setOfferDetails({ ...offerDetails, start_date: e.target.value || null })}
            className="w-full px-3 py-2 border border-gray-200 rounded-md text-[14px] focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>

        <div>
          <label className="block text-[13px] font-medium text-gray-700 mb-1">Benefits</label>
          <textarea
            value={offerDetails.benefits}
            onChange={(e) => setOfferDetails({ ...offerDetails, benefits: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 border border-gray-200 rounded-md text-[14px] focus:outline-none focus:ring-2 focus:ring-gray-900"
            placeholder="e.g., Medical aid, pension, etc."
          />
        </div>

        <div>
          <label className="block text-[13px] font-medium text-gray-700 mb-1">Equity</label>
          <input
            type="text"
            value={offerDetails.equity}
            onChange={(e) => setOfferDetails({ ...offerDetails, equity: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-md text-[14px] focus:outline-none focus:ring-2 focus:ring-gray-900"
            placeholder="e.g., 0.5% over 4 years"
          />
        </div>

        <div>
          <label className="block text-[13px] font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={offerDetails.notes}
            onChange={(e) => setOfferDetails({ ...offerDetails, notes: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 border border-gray-200 rounded-md text-[14px] focus:outline-none focus:ring-2 focus:ring-gray-900"
            placeholder="Any additional notes about the offer..."
          />
        </div>
      </div>

      <button
        onClick={onSubmit}
        disabled={isProcessing}
        className="w-full px-4 py-2.5 text-[14px] font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50"
      >
        {isProcessing ? 'Sending Offer...' : 'Make Offer'}
      </button>
    </div>
  )
}

// ============================================================================
// Accept Offer Tab
// ============================================================================

function AcceptOfferTab({
  application,
  finalOfferDetails,
  setFinalOfferDetails,
  onSubmit,
  isProcessing,
  error,
}: {
  application: Application
  finalOfferDetails: OfferDetails
  setFinalOfferDetails: (details: OfferDetails) => void
  onSubmit: () => void
  isProcessing: boolean
  error: string | null
}) {
  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-[14px] font-medium text-gray-900 mb-1">Confirm Offer Acceptance</h4>
        <p className="text-[13px] text-gray-500">Confirm the final offer details. Adjust if there were any negotiations.</p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="p-4 bg-green-50 border border-green-200 rounded-md">
        <p className="text-[13px] text-green-800">
          This will mark the candidate as hired. The position may be marked as filled.
        </p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[13px] font-medium text-gray-700 mb-1">Final Salary</label>
            <input
              type="number"
              value={finalOfferDetails.salary || ''}
              onChange={(e) => setFinalOfferDetails({ ...finalOfferDetails, salary: e.target.value ? parseInt(e.target.value) : null })}
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-[14px] focus:outline-none focus:ring-2 focus:ring-gray-900"
              placeholder="Leave blank to use original"
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={finalOfferDetails.start_date || ''}
              onChange={(e) => setFinalOfferDetails({ ...finalOfferDetails, start_date: e.target.value || null })}
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-[14px] focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
        </div>

        <div>
          <label className="block text-[13px] font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={finalOfferDetails.notes || ''}
            onChange={(e) => setFinalOfferDetails({ ...finalOfferDetails, notes: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 border border-gray-200 rounded-md text-[14px] focus:outline-none focus:ring-2 focus:ring-gray-900"
            placeholder="Any adjustments or notes about the final offer..."
          />
        </div>
      </div>

      <button
        onClick={onSubmit}
        disabled={isProcessing}
        className="w-full px-4 py-2.5 text-[14px] font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
      >
        {isProcessing ? 'Confirming...' : 'Confirm Acceptance'}
      </button>
    </div>
  )
}

// ============================================================================
// Reject Tab
// ============================================================================

function RejectTab({
  rejectionReason,
  setRejectionReason,
  rejectionFeedback,
  setRejectionFeedback,
  onSubmit,
  isProcessing,
  error,
}: {
  rejectionReason: RejectionReason | ''
  setRejectionReason: (reason: RejectionReason | '') => void
  rejectionFeedback: string
  setRejectionFeedback: (feedback: string) => void
  onSubmit: () => void
  isProcessing: boolean
  error: string | null
}) {
  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-[14px] font-medium text-gray-900 mb-1">Reject Application</h4>
        <p className="text-[13px] text-gray-500">Provide a reason for rejecting this application</p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-[13px] font-medium text-gray-700 mb-1">
            Rejection Reason <span className="text-red-500">*</span>
          </label>
          <select
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value as RejectionReason)}
            className="w-full px-3 py-2 border border-gray-200 rounded-md text-[14px] focus:outline-none focus:ring-2 focus:ring-gray-900"
          >
            <option value="">Select a reason...</option>
            {Object.entries(RejectionReasonLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[13px] font-medium text-gray-700 mb-1">
            Feedback (optional)
          </label>
          <textarea
            value={rejectionFeedback}
            onChange={(e) => setRejectionFeedback(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-200 rounded-md text-[14px] focus:outline-none focus:ring-2 focus:ring-gray-900"
            placeholder="Additional notes about the rejection..."
          />
        </div>
      </div>

      <button
        onClick={onSubmit}
        disabled={isProcessing || !rejectionReason}
        className="w-full px-4 py-2.5 text-[14px] font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
      >
        {isProcessing ? 'Rejecting...' : 'Reject Application'}
      </button>
    </div>
  )
}
