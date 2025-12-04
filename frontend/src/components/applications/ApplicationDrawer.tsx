import { useState, useEffect, useRef } from 'react'
import { X, User, Clock, Gift, Ban, CheckCircle, AlertCircle, ChevronDown, FileText, ExternalLink, Paperclip, Calendar } from 'lucide-react'
import { useApplication, useRecordApplicationView, useStageInstances, useCancelStage, useCompleteStage } from '@/hooks'
import { CandidateProfileCard } from '@/components/candidates'
import ActivityTimeline from './ActivityTimeline'
import StageTimeline from './StageTimeline'
import ScheduleInterviewModal from './ScheduleInterviewModal'
import AssignAssessmentModal from './AssignAssessmentModal'
import { ApplicationStatus, RejectionReason, RejectionReasonLabels, QuestionType } from '@/types'
import type { Application, InterviewStage, OfferDetails, ApplicationAnswer, ApplicationStageInstance } from '@/types'

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
  onMoveToStage?: (applicationId: string, stageOrder: number) => void
  onResetToApplied?: (applicationId: string) => void
  isProcessing?: boolean
}

type TabType = 'profile' | 'answers' | 'stages' | 'activity' | 'offer' | 'reject'

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
    [ApplicationStatus.APPLIED]: 'bg-gray-100 text-gray-700',
    [ApplicationStatus.SHORTLISTED]: 'bg-blue-100 text-blue-700',
    [ApplicationStatus.IN_PROGRESS]: 'bg-yellow-100 text-yellow-700',
    [ApplicationStatus.OFFER_MADE]: 'bg-purple-100 text-purple-700',
    [ApplicationStatus.OFFER_ACCEPTED]: 'bg-green-100 text-green-700',
    [ApplicationStatus.REJECTED]: 'bg-red-100 text-red-700',
  }
  return colors[status] || 'bg-gray-100 text-gray-700'
}

// Get the Kanban column name that matches exactly
const getKanbanColumnName = (application: Application): string => {
  switch (application.status) {
    case ApplicationStatus.APPLIED:
      return 'Applied'
    case ApplicationStatus.SHORTLISTED:
      return 'Shortlisted'
    case ApplicationStatus.IN_PROGRESS:
      return application.current_stage_name || `Stage ${application.current_stage_order}`
    case ApplicationStatus.OFFER_MADE:
      return 'Offer Made'
    case ApplicationStatus.OFFER_ACCEPTED:
      return 'Offer Accepted'
    case ApplicationStatus.REJECTED:
      return 'Rejected'
    default:
      return application.status
  }
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
  onMoveToStage,
  onResetToApplied,
  isProcessing = false,
}: ApplicationDrawerProps) {
  const [activeTab, setActiveTab] = useState<TabType>('profile')
  const [actionError, setActionError] = useState<string | null>(null)
  const [isStageDropdownOpen, setIsStageDropdownOpen] = useState(false)
  const stageDropdownRef = useRef<HTMLDivElement>(null)

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

  // Fetch stage instances for the typed stage timeline
  const { instances: stageInstances, isLoading: isLoadingStages, refetch: refetchStages } = useStageInstances(applicationId || '')

  // Scheduling modal state
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
  const [selectedStageInstance, setSelectedStageInstance] = useState<ApplicationStageInstance | null>(null)
  const [scheduleMode, setScheduleMode] = useState<'schedule' | 'reschedule'>('schedule')

  // Assessment modal state
  const [assessmentModalOpen, setAssessmentModalOpen] = useState(false)
  const [assessmentStageInstance, setAssessmentStageInstance] = useState<ApplicationStageInstance | null>(null)

  // Stage action hooks
  const { cancel: cancelStage } = useCancelStage()
  const { complete: completeStage } = useCompleteStage()

  // Scheduling handlers
  const handleOpenScheduleModal = (instance: ApplicationStageInstance, mode: 'schedule' | 'reschedule' = 'schedule') => {
    setSelectedStageInstance(instance)
    setScheduleMode(mode)
    setScheduleModalOpen(true)
  }

  const handleScheduleSuccess = (_updatedInstance: ApplicationStageInstance) => {
    setScheduleModalOpen(false)
    refetchStages()
  }

  const handleCancelStage = async (instance: ApplicationStageInstance) => {
    if (!applicationId) return
    if (!confirm('Are you sure you want to cancel this interview?')) return

    try {
      await cancelStage(applicationId, instance.id, { reason: 'Cancelled by recruiter' })
      refetchStages()
    } catch (error) {
      console.error('Failed to cancel:', error)
    }
  }

  const handleCompleteStage = async (instance: ApplicationStageInstance) => {
    if (!applicationId) return

    try {
      await completeStage(applicationId, instance.id, {})
      refetchStages()
    } catch (error) {
      console.error('Failed to complete:', error)
    }
  }

  // Record application view (debounced)
  useRecordApplicationView(isOpen ? applicationId : null)

  useEffect(() => {
    if (isOpen && applicationId) {
      refetch()
      setActiveTab('profile')
      setActionError(null)
      setIsStageDropdownOpen(false)
    }
  }, [isOpen, applicationId, refetch])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (stageDropdownRef.current && !stageDropdownRef.current.contains(event.target as Node)) {
        setIsStageDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
    { id: 'activity', label: 'Activity', icon: Clock },
  ]

  // Add answers tab if there are answers
  if (application && application.answers && application.answers.length > 0) {
    tabs.splice(1, 0, { id: 'answers', label: 'Answers', icon: FileText })
  }

  // Add stages tab if there are stage instances (new typed system)
  if (stageInstances && stageInstances.length > 0) {
    // Insert after answers (or after profile if no answers)
    const insertIndex = tabs.findIndex(t => t.id === 'activity')
    tabs.splice(insertIndex, 0, { id: 'stages', label: 'Interview Pipeline', icon: Calendar })
  }

  // Add action tabs based on status
  const hasOffer = application && (application.status === ApplicationStatus.OFFER_MADE || application.status === ApplicationStatus.OFFER_ACCEPTED)

  // Show "Offer" tab - for making, viewing, or editing offers
  if (application && (onMakeOffer || hasOffer)) {
    const offerLabel = hasOffer
      ? (application.status === ApplicationStatus.OFFER_ACCEPTED ? 'Offer (Accepted)' : 'Offer')
      : 'Make Offer'
    tabs.push({ id: 'offer', label: offerLabel, icon: Gift })
  }

  // Show reject tab except for accepted offers
  if (application && onReject && application.status !== ApplicationStatus.OFFER_ACCEPTED) {
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

          <div className="flex items-center gap-3">
            {/* Stage Selector */}
            {application && (
              <div className="relative" ref={stageDropdownRef}>
                <button
                  onClick={() => setIsStageDropdownOpen(!isStageDropdownOpen)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium rounded cursor-pointer hover:opacity-80 transition-opacity ${getStatusColor(application.status)}`}
                >
                  {getKanbanColumnName(application)}
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>

                {/* Dropdown */}
                {isStageDropdownOpen && (
                  <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1">
                    {/* Applied */}
                    <button
                      onClick={async () => {
                        if (applicationId && onResetToApplied) {
                          onResetToApplied(applicationId)
                          setIsStageDropdownOpen(false)
                          onUpdate?.()
                          setTimeout(() => refetch(), 300)
                        }
                      }}
                      disabled={application.status === ApplicationStatus.APPLIED}
                      className={`w-full text-left px-3 py-2 text-[12px] hover:bg-gray-50 ${
                        application.status === ApplicationStatus.APPLIED ? 'bg-gray-50 font-medium' : ''
                      }`}
                    >
                      <span className="inline-block w-2 h-2 rounded-full bg-gray-500 mr-2" />
                      Applied
                    </button>

                    {/* Shortlisted */}
                    <button
                      onClick={async () => {
                        if (applicationId && onShortlist) {
                          onShortlist(applicationId)
                          setIsStageDropdownOpen(false)
                          onUpdate?.()
                          setTimeout(() => refetch(), 300)
                        }
                      }}
                      disabled={application.status === ApplicationStatus.SHORTLISTED}
                      className={`w-full text-left px-3 py-2 text-[12px] hover:bg-gray-50 ${
                        application.status === ApplicationStatus.SHORTLISTED ? 'bg-gray-50 font-medium' : ''
                      }`}
                    >
                      <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-2" />
                      Shortlisted
                    </button>

                    {/* Interview Stages */}
                    {application.interview_stages?.map((stage: InterviewStage) => (
                      <button
                        key={stage.order}
                        onClick={async () => {
                          if (applicationId && onMoveToStage) {
                            onMoveToStage(applicationId, stage.order)
                            setIsStageDropdownOpen(false)
                            onUpdate?.()
                            setTimeout(() => refetch(), 300)
                          }
                        }}
                        disabled={
                          application.status === ApplicationStatus.IN_PROGRESS &&
                          application.current_stage_order === stage.order
                        }
                        className={`w-full text-left px-3 py-2 text-[12px] hover:bg-gray-50 ${
                          application.status === ApplicationStatus.IN_PROGRESS &&
                          application.current_stage_order === stage.order
                            ? 'bg-gray-50 font-medium'
                            : ''
                        }`}
                      >
                        <span className="inline-block w-2 h-2 rounded-full bg-yellow-500 mr-2" />
                        {stage.name}
                      </button>
                    ))}

                    <div className="border-t border-gray-100 my-1" />

                    {/* Offer Made - only show if handler exists */}
                    {onMakeOffer && (
                      <button
                        onClick={() => {
                          setActiveTab('offer')
                          setIsStageDropdownOpen(false)
                        }}
                        disabled={application.status === ApplicationStatus.OFFER_MADE}
                        className={`w-full text-left px-3 py-2 text-[12px] hover:bg-gray-50 ${
                          application.status === ApplicationStatus.OFFER_MADE ? 'bg-gray-50 font-medium' : ''
                        }`}
                      >
                        <span className="inline-block w-2 h-2 rounded-full bg-purple-500 mr-2" />
                        Offer Made
                      </button>
                    )}

                    {/* Rejected */}
                    {onReject && (
                      <button
                        onClick={() => {
                          setActiveTab('reject')
                          setIsStageDropdownOpen(false)
                        }}
                        disabled={application.status === ApplicationStatus.REJECTED}
                        className={`w-full text-left px-3 py-2 text-[12px] hover:bg-gray-50 text-red-600 ${
                          application.status === ApplicationStatus.REJECTED ? 'bg-red-50 font-medium' : ''
                        }`}
                      >
                        <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-2" />
                        Rejected
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

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
                  variant="compact"
                  hideViewProfileLink={false}
                />
              )}
              {activeTab === 'answers' && (
                <AnswersTab answers={application.answers || []} />
              )}
              {activeTab === 'stages' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[14px] font-medium text-gray-900">Interview Pipeline</h3>
                  </div>
                  {isLoadingStages ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                    </div>
                  ) : (
                    <StageTimeline
                      instances={stageInstances}
                      isRecruiterView={true}
                      onSchedule={(instance) => handleOpenScheduleModal(instance, 'schedule')}
                      onReschedule={(instance) => handleOpenScheduleModal(instance, 'reschedule')}
                      onCancel={handleCancelStage}
                      onComplete={handleCompleteStage}
                      onAssignAssessment={(instance) => {
                        setAssessmentStageInstance(instance)
                        setAssessmentModalOpen(true)
                      }}
                    />
                  )}
                </div>
              )}
              {activeTab === 'activity' && (
                <ActivityTimeline applicationId={applicationId!} />
              )}
              {activeTab === 'offer' && (
                <OfferTab
                  application={application}
                  offerDetails={offerDetails}
                  setOfferDetails={setOfferDetails}
                  onMakeOffer={handleMakeOffer}
                  onUpdateOffer={handleMakeOffer}
                  onAcceptOffer={handleAcceptOffer}
                  isProcessing={isProcessing}
                  error={actionError}
                  canMakeOffer={!!onMakeOffer}
                  canAcceptOffer={!!onAcceptOffer}
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

      {/* Schedule Interview Modal */}
      {selectedStageInstance && applicationId && application?.job?.id && (
        <ScheduleInterviewModal
          isOpen={scheduleModalOpen}
          onClose={() => setScheduleModalOpen(false)}
          instance={selectedStageInstance}
          applicationId={applicationId}
          jobId={application.job.id}
          candidateName={application?.candidate?.full_name || 'Candidate'}
          mode={scheduleMode}
          onSuccess={handleScheduleSuccess}
        />
      )}

      {/* Assign Assessment Modal */}
      {assessmentStageInstance && applicationId && (
        <AssignAssessmentModal
          isOpen={assessmentModalOpen}
          onClose={() => setAssessmentModalOpen(false)}
          instance={assessmentStageInstance}
          applicationId={applicationId}
          candidateName={application?.candidate?.full_name || 'Candidate'}
          onSuccess={() => {
            setAssessmentModalOpen(false)
            refetchStages()
          }}
        />
      )}
    </>
  )
}

// ============================================================================
// Offer Tab (Make, View, Edit, Accept)
// ============================================================================

const CURRENCY_SYMBOLS: Record<string, string> = {
  ZAR: 'R',
  USD: '$',
  EUR: '€',
  GBP: '£',
}

function OfferTab({
  application,
  offerDetails,
  setOfferDetails,
  onMakeOffer,
  onUpdateOffer,
  onAcceptOffer,
  isProcessing,
  error,
  canMakeOffer,
  canAcceptOffer,
}: {
  application: Application
  offerDetails: OfferDetails
  setOfferDetails: (details: OfferDetails) => void
  onMakeOffer: () => Promise<void>
  onUpdateOffer: () => Promise<void>
  onAcceptOffer: () => Promise<void>
  isProcessing: boolean
  error: string | null
  canMakeOffer: boolean
  canAcceptOffer: boolean
}) {
  const [isEditing, setIsEditing] = useState(false)
  const hasOffer = application.status === ApplicationStatus.OFFER_MADE || application.status === ApplicationStatus.OFFER_ACCEPTED
  const isAccepted = application.status === ApplicationStatus.OFFER_ACCEPTED
  const existingOffer = application.offer_details
  const finalOffer = application.final_offer_details

  // Initialize form with existing offer when entering edit mode
  const handleStartEdit = () => {
    if (existingOffer) {
      setOfferDetails({
        salary: existingOffer.salary || null,
        currency: existingOffer.currency || 'ZAR',
        start_date: existingOffer.start_date || null,
        notes: existingOffer.notes || '',
        benefits: existingOffer.benefits || '',
        equity: existingOffer.equity || '',
      })
    }
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setOfferDetails({ salary: null, currency: 'ZAR', start_date: null, notes: '', benefits: '', equity: '' })
  }

  const handleSaveEdit = async () => {
    await onUpdateOffer()
    setIsEditing(false)
  }

  const formatDisplayDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Not specified'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatSalary = (salary: number | null | undefined, currency: string | undefined) => {
    if (!salary) return 'Not specified'
    const symbol = CURRENCY_SYMBOLS[currency || 'ZAR'] || currency || ''
    return `${symbol}${salary.toLocaleString()}`
  }

  // Determine which offer to display
  const displayOffer = isAccepted && finalOffer?.salary ? finalOffer : existingOffer

  // ============================================================================
  // MAKE OFFER MODE (no existing offer)
  // ============================================================================
  if (!hasOffer) {
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

        <OfferForm offerDetails={offerDetails} setOfferDetails={setOfferDetails} />

        <button
          onClick={onMakeOffer}
          disabled={isProcessing || !canMakeOffer}
          className="w-full px-4 py-2.5 text-[14px] font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50"
        >
          {isProcessing ? 'Sending Offer...' : 'Make Offer'}
        </button>
      </div>
    )
  }

  // ============================================================================
  // EDIT MODE
  // ============================================================================
  if (isEditing && !isAccepted) {
    return (
      <div className="space-y-6">
        <div>
          <h4 className="text-[14px] font-medium text-gray-900 mb-1">Edit Offer</h4>
          <p className="text-[13px] text-gray-500">Update the offer details</p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <OfferForm offerDetails={offerDetails} setOfferDetails={setOfferDetails} />

        <div className="flex gap-3">
          <button
            onClick={handleCancelEdit}
            disabled={isProcessing}
            className="flex-1 px-4 py-2.5 text-[14px] font-medium text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50"
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

  // ============================================================================
  // VIEW MODE (has existing offer)
  // ============================================================================
  return (
    <div className="space-y-6">
      {/* Status Banner */}
      <div className={`p-4 rounded-lg ${isAccepted ? 'bg-green-50 border border-green-200' : 'bg-purple-50 border border-purple-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isAccepted ? (
              <>
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-[14px] font-medium text-green-800">Offer Accepted</p>
                  {application.offer_accepted_at && (
                    <p className="text-[12px] text-green-600">
                      Accepted on {formatDisplayDate(application.offer_accepted_at)}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <>
                <Gift className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="text-[14px] font-medium text-purple-800">Offer Extended</p>
                  {application.offer_made_at && (
                    <p className="text-[12px] text-purple-600">
                      Sent on {formatDisplayDate(application.offer_made_at)}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
          {!isAccepted && canMakeOffer && (
            <button
              onClick={handleStartEdit}
              className="px-3 py-1.5 text-[12px] font-medium text-purple-700 bg-purple-100 rounded-md hover:bg-purple-200 transition-colors"
            >
              Edit Offer
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
      <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
        <div className="p-4">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Salary</p>
          <p className="text-[18px] font-semibold text-gray-900">
            {formatSalary(displayOffer?.salary, displayOffer?.currency)}
            {displayOffer?.currency && <span className="text-[14px] text-gray-500 ml-1">{displayOffer.currency}</span>}
          </p>
        </div>

        <div className="p-4">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Start Date</p>
          <p className="text-[14px] text-gray-900">{formatDisplayDate(displayOffer?.start_date)}</p>
        </div>

        {displayOffer?.benefits && (
          <div className="p-4">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Benefits</p>
            <p className="text-[14px] text-gray-700 whitespace-pre-wrap">{displayOffer.benefits}</p>
          </div>
        )}

        {displayOffer?.equity && (
          <div className="p-4">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Equity</p>
            <p className="text-[14px] text-gray-700">{displayOffer.equity}</p>
          </div>
        )}

        {displayOffer?.notes && (
          <div className="p-4">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Notes</p>
            <p className="text-[14px] text-gray-700 whitespace-pre-wrap">{displayOffer.notes}</p>
          </div>
        )}
      </div>

      {/* Show original offer if accepted with different final offer */}
      {isAccepted && finalOffer?.salary && existingOffer?.salary && finalOffer.salary !== existingOffer.salary && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Original Offer</p>
          <p className="text-[14px] text-gray-600">
            {formatSalary(existingOffer.salary, existingOffer.currency)} {existingOffer.currency}
          </p>
        </div>
      )}

      {/* Accept Offer Button */}
      {!isAccepted && canAcceptOffer && (
        <div className="pt-2 border-t border-gray-100">
          <div className="p-3 bg-green-50 border border-green-200 rounded-md mb-4">
            <p className="text-[13px] text-green-800">
              Accepting will mark the candidate as hired.
            </p>
          </div>
          <button
            onClick={onAcceptOffer}
            disabled={isProcessing}
            className="w-full px-4 py-2.5 text-[14px] font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {isProcessing ? 'Confirming...' : 'Accept Offer'}
          </button>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Offer Form (reusable form fields)
// ============================================================================

function OfferForm({
  offerDetails,
  setOfferDetails,
}: {
  offerDetails: OfferDetails
  setOfferDetails: (details: OfferDetails) => void
}) {
  return (
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

// ============================================================================
// Answers Tab
// ============================================================================

function AnswersTab({ answers }: { answers: ApplicationAnswer[] }) {
  if (!answers || answers.length === 0) {
    return (
      <div className="flex items-center justify-center h-32">
        <p className="text-[14px] text-gray-500">No answers submitted</p>
      </div>
    )
  }

  // Sort answers by question order
  const sortedAnswers = [...answers].sort(
    (a, b) => (a.question?.order || 0) - (b.question?.order || 0)
  )

  const renderAnswerValue = (answer: ApplicationAnswer) => {
    const { question, answer_text, answer_file } = answer

    // Handle file answers
    if (question.question_type === QuestionType.FILE) {
      if (answer_file) {
        return (
          <a
            href={answer_file}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[14px] text-blue-600 hover:text-blue-800 hover:underline"
          >
            <Paperclip className="w-4 h-4" />
            View uploaded file
          </a>
        )
      }
      if (answer_text) {
        return (
          <a
            href={answer_text}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[14px] text-blue-600 hover:text-blue-800 hover:underline"
          >
            <Paperclip className="w-4 h-4" />
            {answer_text}
          </a>
        )
      }
      return <span className="text-[14px] text-gray-400 italic">No file provided</span>
    }

    // Handle external links
    if (question.question_type === QuestionType.EXTERNAL_LINK) {
      if (answer_text) {
        return (
          <a
            href={answer_text}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[14px] text-blue-600 hover:text-blue-800 hover:underline"
          >
            <ExternalLink className="w-4 h-4" />
            {answer_text}
          </a>
        )
      }
      return <span className="text-[14px] text-gray-400 italic">No link provided</span>
    }

    // Handle multi-select (comma-separated values displayed as tags)
    if (question.question_type === QuestionType.MULTI_SELECT && answer_text) {
      const values = answer_text.split(',').filter(Boolean)
      if (values.length === 0) {
        return <span className="text-[14px] text-gray-400 italic">No selection</span>
      }
      return (
        <div className="flex flex-wrap gap-1.5">
          {values.map((value, idx) => (
            <span
              key={idx}
              className="inline-flex items-center px-2 py-0.5 text-[12px] font-medium text-gray-700 bg-gray-100 rounded-md"
            >
              {value.trim()}
            </span>
          ))}
        </div>
      )
    }

    // Handle select (single value)
    if (question.question_type === QuestionType.SELECT && answer_text) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 text-[12px] font-medium text-gray-700 bg-gray-100 rounded-md">
          {answer_text}
        </span>
      )
    }

    // Handle text/textarea
    if (answer_text) {
      return (
        <p className="text-[14px] text-gray-700 whitespace-pre-wrap">{answer_text}</p>
      )
    }

    return <span className="text-[14px] text-gray-400 italic">No answer</span>
  }

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-[14px] font-medium text-gray-900 mb-1">Application Answers</h4>
        <p className="text-[13px] text-gray-500">
          Responses to custom questions for this job
        </p>
      </div>

      <div className="space-y-4">
        {sortedAnswers.map((answer) => (
          <div
            key={answer.id}
            className="bg-gray-50 border border-gray-200 rounded-lg p-4"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="text-[13px] font-medium text-gray-900">
                {answer.question.question_text}
                {answer.question.is_required && (
                  <span className="text-red-500 ml-1">*</span>
                )}
              </p>
              <span className="flex-shrink-0 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 bg-white border border-gray-200 rounded">
                {getQuestionTypeLabel(answer.question.question_type)}
              </span>
            </div>
            {answer.question.helper_text && (
              <p className="text-[12px] text-gray-500 mb-2">
                {answer.question.helper_text}
              </p>
            )}
            <div className="mt-2">{renderAnswerValue(answer)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Helper function to get question type label
function getQuestionTypeLabel(type: QuestionType): string {
  const labels: Record<QuestionType, string> = {
    [QuestionType.TEXT]: 'Short Text',
    [QuestionType.TEXTAREA]: 'Long Text',
    [QuestionType.SELECT]: 'Single Select',
    [QuestionType.MULTI_SELECT]: 'Multi Select',
    [QuestionType.FILE]: 'File Upload',
    [QuestionType.EXTERNAL_LINK]: 'Link',
  }
  return labels[type] || type
}
