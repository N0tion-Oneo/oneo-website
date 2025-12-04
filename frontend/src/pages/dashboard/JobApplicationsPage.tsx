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
} from '@/hooks'
import { ApplicationDrawer } from '@/components/applications'
import { ApplicationStatus, RejectionReason, RejectionReasonLabels } from '@/types'
import type { ApplicationListItem, InterviewStage, OfferDetails } from '@/types'
import {
  User,
  Calendar,
  AlertCircle,
  Mail,
  ArrowLeft,
  GripVertical,
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
  const { job, isLoading: isJobLoading } = useJobDetail(jobId || '')
  const { applications, isLoading, error, refetch } = useJobApplications(jobId || '')
  const { shortlist, isLoading: isShortlisting } = useShortlistApplication()
  const { reject, isLoading: isRejecting } = useRejectApplication()
  const { makeOffer, isLoading: isMakingOffer } = useMakeOffer()
  const { acceptOffer, isLoading: isAcceptingOffer } = useAcceptOffer()
  const { moveToStage, isLoading: isMoving } = useMoveToStage()

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

  // Form states
  const [rejectionReason, setRejectionReason] = useState<RejectionReason | ''>('')
  const [rejectionFeedback, setRejectionFeedback] = useState('')
  const [offerDetails, setOfferDetails] = useState<OfferDetails>({
    salary: null,
    currency: 'ZAR',
    start_date: null,
    notes: '',
    benefits: '',
    equity: '',
  })
  const [finalOfferDetails, setFinalOfferDetails] = useState<OfferDetails>({})

  const [actionError, setActionError] = useState<string | null>(null)

  const isProcessing = isShortlisting || isRejecting || isMakingOffer || isAcceptingOffer || isMoving

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

  const handleMoveToStage = (applicationId: string, stageOrder: number) => {
    optimisticUpdate(
      applicationId,
      (app) => ({
        ...app,
        status: ApplicationStatus.IN_PROGRESS,
        current_stage_order: stageOrder,
        rejection_reason: null,  // Clear rejection when moving to a stage
      }),
      () => moveToStage(applicationId, { stage_order: stageOrder })
    )
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
      setOfferDetails({ salary: null, currency: 'ZAR', start_date: null, notes: '', benefits: '', equity: '' })
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
        onShortlist={handleShortlist}
        onMoveToStage={handleMoveToStage}
        onResetToApplied={handleResetToApplied}
        onMakeOffer={async (id, details) => {
          setLocalApplications((prev) =>
            prev.map((app) =>
              app.id === id ? { ...app, status: ApplicationStatus.OFFER_MADE } : app
            )
          )
          await makeOffer(id, { offer_details: details })
          refetch()
        }}
        onAcceptOffer={async (id, details) => {
          setLocalApplications((prev) =>
            prev.map((app) =>
              app.id === id ? { ...app, status: ApplicationStatus.OFFER_ACCEPTED } : app
            )
          )
          await acceptOffer(id, { final_offer_details: details })
          refetch()
        }}
        onReject={async (id, reason, feedback) => {
          setLocalApplications((prev) =>
            prev.map((app) =>
              app.id === id ? { ...app, status: ApplicationStatus.REJECTED, rejection_reason: reason } : app
            )
          )
          await reject(id, { rejection_reason: reason, rejection_feedback: feedback })
          refetch()
        }}
        isProcessing={isProcessing}
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
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-[16px] font-medium text-gray-900">Make Offer</h3>
              <p className="text-[13px] text-gray-500 mt-1">Enter the offer details for this candidate</p>
            </div>
            <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
              {actionError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{actionError}</p>
                </div>
              )}

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
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => {
                  setOfferModal(null)
                  setOfferDetails({ salary: null, currency: 'ZAR', start_date: null, notes: '', benefits: '', equity: '' })
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
}

function ApplicationCard({
  application,
  onOpenDrawer,
  onDragStart,
}: ApplicationCardProps) {
  // All cards can be dragged
  const canDrag = true

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
        {canDrag && (
          <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
        )}
      </div>

      {/* Card Body */}
      <div className="space-y-1.5">
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

    </div>
  )
}
