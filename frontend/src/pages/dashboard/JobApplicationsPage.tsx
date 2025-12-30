import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  useJobApplications,
  useShortlistApplication,
  useRejectApplication,
  useMakeOffer,
  useAcceptOffer,
  useJobDetail,
  useMoveToStage,
  useCancelStage,
  useCompleteStage,
  useReopenStage,
  useHasFeature,
} from '@/hooks'
import { useAuth } from '@/contexts/AuthContext'
import { ApplicationDrawer, ScheduleInterviewModal, AssignAssessmentModal, OfferForm, getEmptyOfferDetails } from '@/components/applications'
import { ApplicationStatus, RejectionReason, RejectionReasonLabels, StageTypeConfig } from '@/types'
import type { ApplicationListItem, InterviewStage, OfferDetails, ApplicationStageInstance } from '@/types'
import api from '@/services/api'
import {
  User,
  Calendar,
  AlertCircle,
  Mail,
  ArrowLeft,
  GripVertical,
  Clock,
  Video,
  MapPin,
  Link as LinkIcon,
  Send,
  CalendarPlus,
  ExternalLink,
  Check,
  X,
  RotateCcw,
  FileText,
  AlertTriangle,
  Copy,
  CheckCircle2,
  MoreHorizontal,
} from 'lucide-react'

interface KanbanColumn {
  id: string
  order: number
  title: string
  color: string
  applications: ApplicationListItem[]
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  ZAR: 'R',
  USD: '$',
  EUR: '€',
  GBP: '£',
}

export default function JobApplicationsPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const { user } = useAuth()
  const { job, isLoading: isJobLoading } = useJobDetail(jobId || '')
  const { applications, isLoading, error, refetch } = useJobApplications(jobId || '')
  const { shortlist, isLoading: isShortlisting } = useShortlistApplication()
  const { reject, isLoading: isRejecting } = useRejectApplication()
  const { makeOffer, isLoading: isMakingOffer } = useMakeOffer()
  const { acceptOffer, isLoading: isAcceptingOffer } = useAcceptOffer()
  const { moveToStage, isLoading: isMoving } = useMoveToStage()
  const { cancel: cancelStage, isCancelling } = useCancelStage()
  const { complete: completeStage, isCompleting } = useCompleteStage()
  const { reopen: reopenStage, isReopening } = useReopenStage()

  // Check if user can access replacement feature (clients with feature, or admins/recruiters)
  const hasReplacementFeature = useHasFeature('free-replacements')
  const isClient = user?.role === 'client'
  const isAdminOrRecruiter = user?.role === 'admin' || user?.role === 'recruiter'
  // Admins/recruiters always see the tab for accepted offers; clients only if they have the feature
  const showReplacementOption = isAdminOrRecruiter || (isClient && hasReplacementFeature)

  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  // Local state for optimistic updates
  const [localApplications, setLocalApplications] = useState<ApplicationListItem[]>([])
  const [optimisticError, setOptimisticError] = useState<string | null>(null)

  // Sync local state with server data
  useEffect(() => {
    if (applications) {
      setLocalApplications(applications)
    }
  }, [applications])

  // Helper for optimistic updates
  const optimisticUpdate = useCallback(
    async (
      applicationId: string,
      updateFn: (app: ApplicationListItem) => ApplicationListItem,
      apiCall: () => Promise<unknown>
    ) => {
      // Save current state for rollback
      const previousState = [...localApplications]

      // Apply optimistic update immediately
      setLocalApplications((prev) =>
        prev.map((app) => (app.id === applicationId ? updateFn(app) : app))
      )
      setOptimisticError(null)

      try {
        // Call API in background
        await apiCall()
        // Sync with server to get any additional data changes
        refetch()
      } catch (err) {
        // Rollback on error
        setLocalApplications(previousState)
        setOptimisticError((err as Error).message || 'Action failed')
        console.error('Optimistic update failed:', err)
      }
    },
    [localApplications, refetch]
  )

  // Modal states
  const [rejectModal, setRejectModal] = useState<{ applicationId: string } | null>(null)
  const [offerModal, setOfferModal] = useState<{ applicationId: string } | null>(null)
  const [acceptModal, setAcceptModal] = useState<{ applicationId: string; offerDetails: OfferDetails } | null>(null)
  const [scheduleModal, setScheduleModal] = useState<{
    applicationId: string
    stageInstance: ApplicationStageInstance
    candidateName: string
    mode: 'schedule' | 'reschedule'
  } | null>(null)
  const [assessmentModal, setAssessmentModal] = useState<{
    applicationId: string
    stageInstance: ApplicationStageInstance
    candidateName: string
  } | null>(null)

  // Form states
  const [rejectionReason, setRejectionReason] = useState<RejectionReason | ''>('')
  const [rejectionFeedback, setRejectionFeedback] = useState('')
  const [offerDetails, setOfferDetails] = useState<OfferDetails>(getEmptyOfferDetails())
  const [finalOfferDetails, setFinalOfferDetails] = useState<OfferDetails>({})

  const [actionError, setActionError] = useState<string | null>(null)

  const isProcessing = isShortlisting || isRejecting || isMakingOffer || isAcceptingOffer || isMoving || isCancelling || isCompleting || isReopening

  // Build Kanban columns using local state for optimistic updates
  const buildColumns = (): KanbanColumn[] => {
    const stages = job?.interview_stages || []

    const columns: KanbanColumn[] = [
      // Applied column
      {
        id: 'applied',
        order: -2,
        title: 'Applied',
        color: 'bg-gray-500',
        applications: localApplications.filter(
          (app) => app.status === ApplicationStatus.APPLIED
        ),
      },
      // Shortlisted column
      {
        id: 'shortlisted',
        order: -1,
        title: 'Shortlisted',
        color: 'bg-blue-500',
        applications: localApplications.filter(
          (app) => app.status === ApplicationStatus.SHORTLISTED
        ),
      },
    ]

    // Interview stage columns
    stages.forEach((stage: InterviewStage) => {
      columns.push({
        id: `stage-${stage.order}`,
        order: stage.order,
        title: stage.name,
        color: 'bg-yellow-500',
        applications: localApplications.filter(
          (app) => app.current_stage_order === stage.order &&
                   app.status === ApplicationStatus.IN_PROGRESS
        ),
      })
    })

    // Offer Made column
    columns.push({
      id: 'offer_made',
      order: 100,
      title: 'Offer Made',
      color: 'bg-purple-500',
      applications: localApplications.filter(
        (app) => app.status === ApplicationStatus.OFFER_MADE
      ),
    })

    // Offer Accepted column
    columns.push({
      id: 'offer_accepted',
      order: 101,
      title: 'Offer Accepted',
      color: 'bg-green-500',
      applications: localApplications.filter(
        (app) => app.status === ApplicationStatus.OFFER_ACCEPTED
      ),
    })

    // Rejected column
    columns.push({
      id: 'rejected',
      order: 102,
      title: 'Rejected',
      color: 'bg-red-500',
      applications: localApplications.filter(
        (app) => app.status === ApplicationStatus.REJECTED
      ),
    })

    return columns
  }

  const columns = buildColumns()

  const handleOpenDrawer = (applicationId: string) => {
    setSelectedApplicationId(applicationId)
    setIsDrawerOpen(true)
  }

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false)
    setSelectedApplicationId(null)
  }

  // Optimistic update handlers
  const handleShortlist = (applicationId: string) => {
    optimisticUpdate(
      applicationId,
      (app) => ({ ...app, status: ApplicationStatus.SHORTLISTED, rejection_reason: null }),
      () => shortlist(applicationId)
    )
  }

  const handleResetToApplied = (applicationId: string) => {
    optimisticUpdate(
      applicationId,
      (app) => ({ ...app, status: ApplicationStatus.APPLIED, current_stage_order: 0, rejection_reason: null }),
      () => moveToStage(applicationId, { stage_order: 0 })
    )
  }

  const handleMoveToStage = async (applicationId: string, stageOrder: number) => {
    // Find the application to get candidate name
    const app = localApplications.find((a) => a.id === applicationId)
    const candidateName = app?.candidate_name || 'Candidate'

    // Optimistic update
    setLocalApplications((prev) =>
      prev.map((a) =>
        a.id === applicationId
          ? { ...a, status: ApplicationStatus.IN_PROGRESS, current_stage_order: stageOrder, rejection_reason: null }
          : a
      )
    )

    try {
      // Move to stage
      await moveToStage(applicationId, { stage_order: stageOrder })

      // Fetch stage instances to get the one we just moved to
      const instancesResponse = await api.get<ApplicationStageInstance[]>(
        `/jobs/applications/${applicationId}/stages/`
      )
      const instances = instancesResponse.data

      // Find the instance for this stage order
      const stageInstance = instances.find(
        (inst) => inst.stage_template.order === stageOrder
      )

      // Only open schedule modal for stage types that require scheduling
      const stageConfig = StageTypeConfig[stageInstance?.stage_template.stage_type || '']
      if (stageInstance && stageInstance.status === 'not_started' && stageConfig?.requiresScheduling) {
        // Open the schedule modal
        setScheduleModal({
          applicationId,
          stageInstance,
          candidateName,
          mode: 'schedule',
        })
      }

      refetch()
    } catch (err) {
      // Rollback on error
      setLocalApplications(localApplications)
      setOptimisticError((err as Error).message || 'Failed to move to stage')
    }
  }

  const handleMakeOffer = async () => {
    if (!offerModal) return
    try {
      setActionError(null)
      // Optimistic update for offer
      setLocalApplications((prev) =>
        prev.map((app) =>
          app.id === offerModal.applicationId
            ? { ...app, status: ApplicationStatus.OFFER_MADE }
            : app
        )
      )
      await makeOffer(offerModal.applicationId, { offer_details: offerDetails })
      setOfferModal(null)
      setOfferDetails(getEmptyOfferDetails())
      refetch()
    } catch (err) {
      setActionError((err as Error).message)
      refetch() // Refetch to restore correct state
    }
  }

  const handleAcceptOffer = async () => {
    if (!acceptModal) return
    try {
      setActionError(null)
      // Optimistic update for accept
      setLocalApplications((prev) =>
        prev.map((app) =>
          app.id === acceptModal.applicationId
            ? { ...app, status: ApplicationStatus.OFFER_ACCEPTED }
            : app
        )
      )
      await acceptOffer(acceptModal.applicationId, { final_offer_details: finalOfferDetails })
      setAcceptModal(null)
      setFinalOfferDetails({})
      refetch()
    } catch (err) {
      setActionError((err as Error).message)
      refetch() // Refetch to restore correct state
    }
  }

  const handleReject = async () => {
    if (!rejectModal || !rejectionReason) return
    try {
      setActionError(null)
      // Optimistic update for reject
      setLocalApplications((prev) =>
        prev.map((app) =>
          app.id === rejectModal.applicationId
            ? { ...app, status: ApplicationStatus.REJECTED, rejection_reason: rejectionReason }
            : app
        )
      )
      await reject(rejectModal.applicationId, {
        rejection_reason: rejectionReason,
        rejection_feedback: rejectionFeedback,
      })
      setRejectModal(null)
      setRejectionReason('')
      setRejectionFeedback('')
      refetch()
    } catch (err) {
      setActionError((err as Error).message)
      refetch() // Refetch to restore correct state
    }
  }

  const openAcceptModal = (app: ApplicationListItem) => {
    setAcceptModal({
      applicationId: app.id,
      offerDetails: {}
    })
  }

  if (isLoading || isJobLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-[14px] text-gray-500">Loading applications...</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-4 flex-shrink-0">
        <Link
          to="/dashboard/jobs"
          className="inline-flex items-center gap-1 text-[13px] text-gray-500 hover:text-gray-900 mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Jobs
        </Link>
        <h1 className="text-[20px] font-semibold text-gray-900">
          {job?.title || 'Job'} - Applications
        </h1>
        <p className="text-[14px] text-gray-500 mt-1">
          {applications.length} application{applications.length !== 1 ? 's' : ''} total
        </p>
      </div>

      {(error || optimisticError) && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2 flex-shrink-0">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error || optimisticError}</p>
        </div>
      )}

      {applications.length === 0 ? (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
          <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-[15px] text-gray-700 mb-1">No applications yet</p>
          <p className="text-[13px] text-gray-500">
            Applications will appear here when candidates apply to this job
          </p>
        </div>
      ) : (
        /* Kanban Board */
        <div className="flex-1 overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max h-full">
            {columns.map((column) => (
              <KanbanColumnComponent
                key={column.id}
                column={column}
                onOpenDrawer={handleOpenDrawer}
                onShortlist={handleShortlist}
                onResetToApplied={handleResetToApplied}
                onMoveToStage={handleMoveToStage}
                onOpenOfferModal={(id) => setOfferModal({ applicationId: id })}
                onOpenAcceptModal={openAcceptModal}
                onOpenRejectModal={(id) => setRejectModal({ applicationId: id })}
                onSchedule={(application) => {
                  // Open schedule modal for the current stage instance
                  if (application.current_stage_instance) {
                    setScheduleModal({
                      applicationId: application.id,
                      stageInstance: {
                        id: application.current_stage_instance.id,
                        status: application.current_stage_instance.status,
                        stage_template: {
                          id: '',
                          name: application.current_stage_instance.stage_name,
                          stage_type: application.current_stage_instance.stage_type,
                          order: application.current_stage_order,
                          duration_minutes: application.current_stage_instance.duration_minutes,
                          default_interviewer_id: application.current_stage_instance.interviewer_id || undefined,
                        },
                        scheduled_at: application.current_stage_instance.scheduled_at,
                        duration_minutes: application.current_stage_instance.duration_minutes,
                        interviewer: application.current_stage_instance.interviewer_id ? {
                          id: application.current_stage_instance.interviewer_id,
                          full_name: application.current_stage_instance.interviewer_name || '',
                        } : undefined,
                        meeting_link: application.current_stage_instance.meeting_link,
                        location: application.current_stage_instance.location,
                      } as ApplicationStageInstance,
                      candidateName: application.candidate_name,
                      mode: 'schedule',
                    })
                  }
                }}
                onReschedule={(application) => {
                  // Open schedule modal in reschedule mode
                  if (application.current_stage_instance) {
                    setScheduleModal({
                      applicationId: application.id,
                      stageInstance: {
                        id: application.current_stage_instance.id,
                        status: application.current_stage_instance.status,
                        stage_template: {
                          id: '',
                          name: application.current_stage_instance.stage_name,
                          stage_type: application.current_stage_instance.stage_type,
                          order: application.current_stage_order,
                          duration_minutes: application.current_stage_instance.duration_minutes,
                          default_interviewer_id: application.current_stage_instance.interviewer_id || undefined,
                        },
                        scheduled_at: application.current_stage_instance.scheduled_at,
                        duration_minutes: application.current_stage_instance.duration_minutes,
                        interviewer: application.current_stage_instance.interviewer_id ? {
                          id: application.current_stage_instance.interviewer_id,
                          full_name: application.current_stage_instance.interviewer_name || '',
                        } : undefined,
                        meeting_link: application.current_stage_instance.meeting_link,
                        location: application.current_stage_instance.location,
                      } as ApplicationStageInstance,
                      candidateName: application.candidate_name,
                      mode: 'reschedule',
                    })
                  }
                }}
                onCancel={async (application) => {
                  if (application.current_stage_instance) {
                    try {
                      await cancelStage(application.id, application.current_stage_instance.id)
                      refetch()
                    } catch (err) {
                      setOptimisticError((err as Error).message || 'Failed to cancel')
                    }
                  }
                }}
                onComplete={async (application) => {
                  if (application.current_stage_instance) {
                    try {
                      await completeStage(application.id, application.current_stage_instance.id)
                      refetch()
                    } catch (err) {
                      setOptimisticError((err as Error).message || 'Failed to complete')
                    }
                  }
                }}
                onReopen={async (application) => {
                  if (application.current_stage_instance) {
                    try {
                      await reopenStage(application.id, application.current_stage_instance.id)
                      refetch()
                    } catch (err) {
                      setOptimisticError((err as Error).message || 'Failed to reopen')
                    }
                  }
                }}
                onAssignAssessment={(application) => {
                  if (application.current_stage_instance) {
                    setAssessmentModal({
                      applicationId: application.id,
                      stageInstance: {
                        id: application.current_stage_instance.id,
                        status: application.current_stage_instance.status,
                        stage_template: {
                          id: '',
                          name: application.current_stage_instance.stage_name,
                          stage_type: application.current_stage_instance.stage_type,
                          order: application.current_stage_order,
                          duration_minutes: application.current_stage_instance.duration_minutes,
                          assessment_instructions: application.current_stage_instance.assessment?.instructions || '',
                          assessment_external_url: application.current_stage_instance.assessment?.submission_url || '',
                          deadline_days: 7, // Default
                        },
                        scheduled_at: null,
                        duration_minutes: 0,
                      } as ApplicationStageInstance,
                      candidateName: application.candidate_name,
                    })
                  }
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Application Drawer */}
      <ApplicationDrawer
        applicationId={selectedApplicationId}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        onUpdate={refetch}
      />

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-[16px] font-medium text-gray-900">Reject Application</h3>
            </div>
            <div className="px-6 py-4 space-y-4">
              {actionError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{actionError}</p>
                </div>
              )}

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
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => {
                  setRejectModal(null)
                  setRejectionReason('')
                  setRejectionFeedback('')
                  setActionError(null)
                }}
                disabled={isProcessing}
                className="px-4 py-2 text-[14px] font-medium text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={isProcessing || !rejectionReason}
                className="px-4 py-2 text-[14px] font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {isRejecting ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Make Offer Modal */}
      {offerModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-[16px] font-medium text-gray-900">Make Offer</h3>
              <p className="text-[13px] text-gray-500 mt-1">Enter the offer details for this candidate</p>
            </div>
            <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
              {actionError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2 mb-4">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{actionError}</p>
                </div>
              )}
              <OfferForm offerDetails={offerDetails} setOfferDetails={setOfferDetails} />
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => {
                  setOfferModal(null)
                  setOfferDetails(getEmptyOfferDetails())
                  setActionError(null)
                }}
                disabled={isProcessing}
                className="px-4 py-2 text-[14px] font-medium text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleMakeOffer}
                disabled={isProcessing}
                className="px-4 py-2 text-[14px] font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50"
              >
                {isMakingOffer ? 'Sending...' : 'Make Offer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Accept Offer Modal */}
      {acceptModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-[16px] font-medium text-gray-900">Confirm Offer Acceptance</h3>
              <p className="text-[13px] text-gray-500 mt-1">
                Confirm the final offer details. Adjust if there were any negotiations.
              </p>
            </div>
            <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
              {actionError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{actionError}</p>
                </div>
              )}

              <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                <p className="text-[13px] text-green-800">
                  This will mark the candidate as hired. The position may be marked as filled.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-gray-700 mb-1">Final Annual Salary</label>
                  <input
                    type="number"
                    value={finalOfferDetails.annual_salary || ''}
                    onChange={(e) => setFinalOfferDetails({ ...finalOfferDetails, annual_salary: e.target.value ? parseInt(e.target.value) : null })}
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
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => {
                  setAcceptModal(null)
                  setFinalOfferDetails({})
                  setActionError(null)
                }}
                disabled={isProcessing}
                className="px-4 py-2 text-[14px] font-medium text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAcceptOffer}
                disabled={isProcessing}
                className="px-4 py-2 text-[14px] font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {isAcceptingOffer ? 'Confirming...' : 'Confirm Acceptance'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Interview Modal - auto-opens when moving to a stage */}
      {scheduleModal && jobId && (
        <ScheduleInterviewModal
          isOpen={true}
          onClose={() => setScheduleModal(null)}
          instance={scheduleModal.stageInstance}
          applicationId={scheduleModal.applicationId}
          jobId={jobId}
          candidateName={scheduleModal.candidateName}
          mode={scheduleModal.mode}
          onSuccess={() => {
            setScheduleModal(null)
            refetch()
          }}
        />
      )}

      {/* Assign Assessment Modal */}
      {assessmentModal && (
        <AssignAssessmentModal
          isOpen={true}
          onClose={() => setAssessmentModal(null)}
          instance={assessmentModal.stageInstance}
          applicationId={assessmentModal.applicationId}
          candidateName={assessmentModal.candidateName}
          onSuccess={() => {
            setAssessmentModal(null)
            refetch()
          }}
        />
      )}
    </div>
  )
}

// ============================================================================
// Kanban Column Component
// ============================================================================

interface KanbanColumnProps {
  column: KanbanColumn
  onOpenDrawer: (applicationId: string) => void
  onShortlist: (applicationId: string) => void
  onResetToApplied: (applicationId: string) => void
  onMoveToStage: (applicationId: string, stageOrder: number) => void
  onOpenOfferModal: (applicationId: string) => void
  onOpenAcceptModal: (app: ApplicationListItem) => void
  onOpenRejectModal: (applicationId: string) => void
  onSchedule: (application: ApplicationListItem) => void
  onReschedule: (application: ApplicationListItem) => void
  onCancel: (application: ApplicationListItem) => void
  onComplete: (application: ApplicationListItem) => void
  onReopen: (application: ApplicationListItem) => void
  onAssignAssessment: (application: ApplicationListItem) => void
}

function KanbanColumnComponent({
  column,
  onOpenDrawer,
  onShortlist,
  onResetToApplied,
  onMoveToStage,
  onOpenOfferModal,
  onOpenAcceptModal,
  onOpenRejectModal,
  onSchedule,
  onReschedule,
  onCancel,
  onComplete,
  onReopen,
  onAssignAssessment,
}: KanbanColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDragStart = (e: React.DragEvent, applicationId: string, sourceStatus: ApplicationStatus) => {
    e.dataTransfer.setData('applicationId', applicationId)
    e.dataTransfer.setData('sourceStatus', sourceStatus)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const applicationId = e.dataTransfer.getData('applicationId')
    const sourceStatus = e.dataTransfer.getData('sourceStatus') as ApplicationStatus

    if (!applicationId) return

    // Don't do anything if dropping on the same column type
    if (
      (column.id === 'applied' && sourceStatus === ApplicationStatus.APPLIED) ||
      (column.id === 'shortlisted' && sourceStatus === ApplicationStatus.SHORTLISTED) ||
      (column.id === 'offer_made' && sourceStatus === ApplicationStatus.OFFER_MADE) ||
      (column.id === 'offer_accepted' && sourceStatus === ApplicationStatus.OFFER_ACCEPTED) ||
      (column.id === 'rejected' && sourceStatus === ApplicationStatus.REJECTED)
    ) {
      return
    }

    // Handle drop based on target column
    switch (column.id) {
      case 'applied':
        onResetToApplied(applicationId)
        break
      case 'shortlisted':
        onShortlist(applicationId)
        break
      case 'offer_made':
        onOpenOfferModal(applicationId)
        break
      case 'offer_accepted':
        // Allow accepting from any status (full flexibility)
        onOpenAcceptModal({ id: applicationId } as ApplicationListItem)
        break
      case 'rejected':
        onOpenRejectModal(applicationId)
        break
      default:
        // Interview stages
        if (column.id.startsWith('stage-')) {
          onMoveToStage(applicationId, column.order)
        }
        break
    }
  }

  // All columns can accept drops except offer_accepted (which requires offer_made status)
  const canDrop = true

  return (
    <div
      className={`w-72 flex-shrink-0 flex flex-col bg-gray-50 rounded-lg transition-all ${
        isDragOver && canDrop ? 'ring-2 ring-blue-400 bg-blue-50' : ''
      }`}
      onDragOver={canDrop ? handleDragOver : undefined}
      onDragLeave={canDrop ? handleDragLeave : undefined}
      onDrop={canDrop ? handleDrop : undefined}
    >
      {/* Column Header */}
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${column.color}`} />
            <h3 className="text-[13px] font-medium text-gray-900">{column.title}</h3>
          </div>
          <span className="text-[12px] text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
            {column.applications.length}
          </span>
        </div>
      </div>

      {/* Column Content */}
      <div
        className={`flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-280px)] ${
          isDragOver && canDrop ? 'bg-blue-50/50' : ''
        }`}
      >
        {column.applications.map((application) => (
          <ApplicationCard
            key={application.id}
            application={application}
            onOpenDrawer={onOpenDrawer}
            onDragStart={handleDragStart}
            onSchedule={onSchedule}
            onReschedule={onReschedule}
            onCancel={onCancel}
            onComplete={onComplete}
            onReopen={onReopen}
            onAssignAssessment={onAssignAssessment}
          />
        ))}

        {column.applications.length === 0 && (
          <div
            className={`py-8 text-center ${isDragOver && canDrop ? 'border-2 border-dashed border-blue-300 rounded-md' : ''}`}
          >
            <p className="text-[12px] text-gray-400">
              {canDrop ? 'Drop here' : 'No applications'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Application Card Component
// ============================================================================

interface ApplicationCardProps {
  application: ApplicationListItem
  onOpenDrawer: (applicationId: string) => void
  onDragStart: (e: React.DragEvent, applicationId: string, sourceStatus: ApplicationStatus) => void
  onSchedule?: (application: ApplicationListItem) => void
  onReschedule?: (application: ApplicationListItem) => void
  onCancel?: (application: ApplicationListItem) => void
  onComplete?: (application: ApplicationListItem) => void
  onReopen?: (application: ApplicationListItem) => void
  onAssignAssessment?: (application: ApplicationListItem) => void
}

const formatScheduledTime = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

const formatShortDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function ApplicationCard({
  application,
  onOpenDrawer,
  onDragStart,
  onSchedule,
  onReschedule,
  onCancel,
  onComplete,
  onReopen,
  onAssignAssessment,
}: ApplicationCardProps) {
  const [showActions, setShowActions] = useState(false)
  const [copied, setCopied] = useState(false)

  const canDrag = true
  const stageInstance = application.current_stage_instance

  // Status checks
  const isScheduled = stageInstance?.status === 'scheduled' && stageInstance.scheduled_at
  const isCompleted = stageInstance?.status === 'completed'
  const isCancelled = stageInstance?.status === 'cancelled'
  const hasBookingLink = stageInstance?.booking_token && !stageInstance.booking_token.is_used
  const needsScheduling = stageInstance && stageInstance.status === 'not_started' && !stageInstance.is_assessment
  const isAssessment = stageInstance?.is_assessment
  const needsAssessmentAssignment = isAssessment && stageInstance?.status === 'not_started'
  const awaitingSubmission = stageInstance?.status === 'awaiting_submission'
  const submitted = stageInstance?.status === 'submitted'

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (stageInstance?.booking_token) {
      const url = `${window.location.origin}${stageInstance.booking_token.booking_url}`
      navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div
      draggable={canDrag}
      onDragStart={(e) => canDrag && onDragStart(e, application.id, application.status)}
      className={`bg-white border border-gray-200 rounded-md p-3 shadow-sm hover:shadow-md transition-shadow ${
        canDrag ? 'cursor-grab active:cursor-grabbing' : ''
      }`}
    >
      {/* Card Header */}
      <div className="flex items-start justify-between mb-2">
        <div
          className="flex items-center gap-2 cursor-pointer flex-1"
          onClick={() => onOpenDrawer(application.id)}
        >
          <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center text-white text-[10px] font-medium flex-shrink-0">
            {application.candidate_name
              ?.split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)}
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-gray-900 hover:text-gray-700 truncate">
              {application.candidate_name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {/* Actions Menu */}
          {stageInstance && (
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowActions(!showActions)
                }}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
              {showActions && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowActions(false)}
                  />
                  <div className="absolute right-0 top-6 z-20 bg-white border border-gray-200 rounded-md shadow-lg py-1 min-w-[140px]">
                    {isScheduled && onReschedule && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setShowActions(false)
                          onReschedule(application)
                        }}
                        className="w-full px-3 py-1.5 text-left text-[11px] text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Calendar className="w-3 h-3" />
                        Reschedule
                      </button>
                    )}
                    {isScheduled && onCancel && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setShowActions(false)
                          onCancel(application)
                        }}
                        className="w-full px-3 py-1.5 text-left text-[11px] text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <X className="w-3 h-3" />
                        Cancel
                      </button>
                    )}
                    {(isScheduled || submitted) && onComplete && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setShowActions(false)
                          onComplete(application)
                        }}
                        className="w-full px-3 py-1.5 text-left text-[11px] text-green-600 hover:bg-green-50 flex items-center gap-2"
                      >
                        <Check className="w-3 h-3" />
                        Mark Complete
                      </button>
                    )}
                    {(isCompleted || isCancelled) && onReopen && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setShowActions(false)
                          onReopen(application)
                        }}
                        className="w-full px-3 py-1.5 text-left text-[11px] text-amber-600 hover:bg-amber-50 flex items-center gap-2"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Reopen
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
          {canDrag && (
            <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
          )}
        </div>
      </div>

      {/* Card Body - Basic Info */}
      <div className="space-y-1.5 mb-2">
        <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
          <Mail className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{application.candidate_email}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
          <Calendar className="w-3 h-3 flex-shrink-0" />
          <span>Applied {formatDate(application.applied_at)}</span>
        </div>
        {application.rejection_reason && (
          <div className="text-[11px] text-red-600">
            {RejectionReasonLabels[application.rejection_reason]}
          </div>
        )}
      </div>

      {/* Stage Section */}
      {stageInstance && (
        <div className="pt-2 border-t border-gray-100 space-y-2">
          {/* Scheduled Interview */}
          {isScheduled && stageInstance.scheduled_at && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-green-600" />
                <span className="text-[11px] font-medium text-green-700">
                  {formatScheduledTime(stageInstance.scheduled_at)}
                </span>
              </div>
              {stageInstance.interviewer_name && (
                <div className="text-[11px] text-gray-500">
                  with {stageInstance.interviewer_name}
                </div>
              )}
              {stageInstance.meeting_link && (
                <a
                  href={stageInstance.meeting_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] text-blue-600 hover:text-blue-700"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Video className="w-3 h-3" />
                  Join Meeting
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
              {stageInstance.location && !stageInstance.meeting_link && (
                <div className="flex items-center gap-1 text-[10px] text-gray-500">
                  <MapPin className="w-3 h-3" />
                  {stageInstance.location}
                </div>
              )}
            </div>
          )}

          {/* Completed Stage */}
          {isCompleted && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-green-600" />
                <span className="text-[11px] font-medium text-green-700">
                  Completed
                </span>
              </div>
              {stageInstance.feedback?.score && (
                <div className="text-[11px] text-gray-600">
                  Score: {stageInstance.feedback.score}/10
                </div>
              )}
            </div>
          )}

          {/* Cancelled Stage */}
          {isCancelled && (
            <div className="flex items-center gap-1.5">
              <X className="w-3 h-3 text-gray-400" />
              <span className="text-[11px] font-medium text-gray-500">
                Cancelled
              </span>
            </div>
          )}

          {/* Booking Link Details */}
          {hasBookingLink && stageInstance.booking_token && (
            <div className="p-2 bg-blue-50 rounded space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <LinkIcon className="w-3 h-3 text-blue-600" />
                  <span className="text-[11px] font-medium text-blue-700">
                    Booking link sent
                  </span>
                </div>
                <button
                  onClick={handleCopyLink}
                  className="p-1 text-blue-600 hover:text-blue-800 rounded"
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
              <div className="text-[10px] text-blue-600">
                Sent {formatShortDate(stageInstance.booking_token.created_at)}
                {' · '}
                {stageInstance.booking_token.is_valid ? (
                  <>Expires {formatShortDate(stageInstance.booking_token.expires_at)}</>
                ) : (
                  <span className="text-red-600">Expired</span>
                )}
              </div>
            </div>
          )}

          {/* Assessment: Awaiting Submission */}
          {awaitingSubmission && stageInstance.assessment && (
            <div className="p-2 bg-orange-50 rounded space-y-1">
              <div className="flex items-center gap-1.5">
                <FileText className="w-3 h-3 text-orange-600" />
                <span className="text-[11px] font-medium text-orange-700">
                  Awaiting submission
                </span>
              </div>
              {stageInstance.assessment.deadline && (
                <div className="text-[10px] text-orange-600 flex items-center gap-1">
                  {stageInstance.assessment.deadline_passed ? (
                    <>
                      <AlertTriangle className="w-3 h-3" />
                      Overdue (was {formatShortDate(stageInstance.assessment.deadline)})
                    </>
                  ) : (
                    <>Due {formatShortDate(stageInstance.assessment.deadline)}</>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Assessment: Submitted */}
          {submitted && stageInstance.assessment && (
            <div className="p-2 bg-amber-50 rounded space-y-1">
              <div className="flex items-center gap-1.5">
                <FileText className="w-3 h-3 text-amber-600" />
                <span className="text-[11px] font-medium text-amber-700">
                  Submitted for review
                </span>
              </div>
              {stageInstance.assessment.submitted_at && (
                <div className="text-[10px] text-amber-600">
                  Submitted {formatShortDate(stageInstance.assessment.submitted_at)}
                </div>
              )}
              {stageInstance.assessment.submission_url && (
                <a
                  href={stageInstance.assessment.submission_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] text-amber-700 hover:text-amber-800"
                  onClick={(e) => e.stopPropagation()}
                >
                  View submission
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
            </div>
          )}

          {/* Needs Scheduling (Interview) */}
          {needsScheduling && onSchedule && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onSchedule(application)
              }}
              className="w-full py-1.5 px-2 text-[11px] font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors flex items-center justify-center gap-1"
            >
              <Send className="w-3 h-3" />
              Schedule Interview
            </button>
          )}

          {/* Needs Assignment (Assessment) */}
          {needsAssessmentAssignment && onAssignAssessment && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onAssignAssessment(application)
              }}
              className="w-full py-1.5 px-2 text-[11px] font-medium text-orange-700 bg-orange-100 hover:bg-orange-200 rounded transition-colors flex items-center justify-center gap-1"
            >
              <FileText className="w-3 h-3" />
              Assign Assessment
            </button>
          )}
        </div>
      )}
    </div>
  )
}
