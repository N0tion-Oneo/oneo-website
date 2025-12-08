import { useState, useMemo } from 'react'
import { ApplicationStatus, RejectionReasonLabels } from '@/types'
import type { ApplicationListItem } from '@/types'
import {
  Building2,
  Calendar,
  Mail,
  GripVertical,
  Clock,
  Video,
  MapPin,
  Link as LinkIcon,
  Send,
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

interface InterviewStage {
  order: number
  name: string
  stage_type?: string
}

interface KanbanColumn {
  id: string
  order: number
  title: string
  color: string
  applications: ApplicationListItem[]
}

interface ApplicationKanbanBoardProps {
  applications: ApplicationListItem[]
  jobStages?: InterviewStage[]
  isJobFiltered: boolean
  onApplicationClick: (applicationId: string) => void
  // Drag and drop actions
  onShortlist?: (applicationId: string) => void
  onResetToApplied?: (applicationId: string) => void
  onMoveToStage?: (applicationId: string, stageOrder: number) => Promise<void>
  onOpenOfferModal?: (applicationId: string) => void
  onOpenAcceptModal?: (app: ApplicationListItem) => void
  onOpenRejectModal?: (applicationId: string) => void
  // Stage instance actions
  onSchedule?: (application: ApplicationListItem) => void
  onReschedule?: (application: ApplicationListItem) => void
  onCancel?: (application: ApplicationListItem) => void
  onComplete?: (application: ApplicationListItem) => void
  onReopen?: (application: ApplicationListItem) => void
  onAssignAssessment?: (application: ApplicationListItem) => void
  isLoading?: boolean
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export default function ApplicationKanbanBoard({
  applications,
  jobStages,
  isJobFiltered,
  onApplicationClick,
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
  isLoading,
}: ApplicationKanbanBoardProps) {

  // Build columns based on whether we're filtering by job or not
  const columns = useMemo<KanbanColumn[]>(() => {
    if (isJobFiltered && jobStages && jobStages.length > 0) {
      // Job-specific: Use interview stages as columns
      const stageColumns: KanbanColumn[] = [
        {
          id: 'applied',
          order: -2,
          title: 'Applied',
          color: 'bg-gray-500',
          applications: applications.filter(
            app => app.status === ApplicationStatus.APPLIED &&
                   (app.current_stage_order === 0 || app.current_stage_order === null)
          ),
        },
        {
          id: 'shortlisted',
          order: -1,
          title: 'Shortlisted',
          color: 'bg-blue-500',
          applications: applications.filter(
            app => app.status === ApplicationStatus.SHORTLISTED
          ),
        },
      ]

      // Add columns for each interview stage
      jobStages.forEach((stage) => {
        stageColumns.push({
          id: `stage-${stage.order}`,
          order: stage.order,
          title: stage.name,
          color: 'bg-yellow-500',
          applications: applications.filter(
            app => app.current_stage_order === stage.order &&
                   app.status === ApplicationStatus.IN_PROGRESS
          ),
        })
      })

      // Add final columns for outcomes
      stageColumns.push({
        id: 'offer_made',
        order: 100,
        title: 'Offer Made',
        color: 'bg-purple-500',
        applications: applications.filter(
          app => app.status === ApplicationStatus.OFFER_MADE
        ),
      })

      stageColumns.push({
        id: 'offer_accepted',
        order: 101,
        title: 'Offer Accepted',
        color: 'bg-green-500',
        applications: applications.filter(
          app => app.status === ApplicationStatus.OFFER_ACCEPTED
        ),
      })

      stageColumns.push({
        id: 'offer_declined',
        order: 102,
        title: 'Offer Declined',
        color: 'bg-orange-500',
        applications: applications.filter(
          app => app.status === ApplicationStatus.OFFER_DECLINED
        ),
      })

      stageColumns.push({
        id: 'rejected',
        order: 103,
        title: 'Rejected',
        color: 'bg-red-500',
        applications: applications.filter(
          app => app.status === ApplicationStatus.REJECTED
        ),
      })

      return stageColumns
    } else {
      // Status-based columns (default view when no job filter)
      return [
        {
          id: 'applied',
          order: -2,
          title: 'Applied',
          color: 'bg-gray-500',
          applications: applications.filter(app => app.status === ApplicationStatus.APPLIED),
        },
        {
          id: 'shortlisted',
          order: -1,
          title: 'Shortlisted',
          color: 'bg-blue-500',
          applications: applications.filter(app => app.status === ApplicationStatus.SHORTLISTED),
        },
        {
          id: 'in_progress',
          order: 0,
          title: 'In Progress',
          color: 'bg-yellow-500',
          applications: applications.filter(app => app.status === ApplicationStatus.IN_PROGRESS),
        },
        {
          id: 'offer_made',
          order: 100,
          title: 'Offer Made',
          color: 'bg-purple-500',
          applications: applications.filter(app => app.status === ApplicationStatus.OFFER_MADE),
        },
        {
          id: 'offer_accepted',
          order: 101,
          title: 'Accepted',
          color: 'bg-green-500',
          applications: applications.filter(app => app.status === ApplicationStatus.OFFER_ACCEPTED),
        },
        {
          id: 'rejected',
          order: 102,
          title: 'Rejected',
          color: 'bg-red-500',
          applications: applications.filter(app => app.status === ApplicationStatus.REJECTED),
        },
      ]
    }
  }, [applications, jobStages, isJobFiltered])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-[14px] text-gray-500">Loading...</p>
      </div>
    )
  }

  // Check if drag/drop is enabled
  const isDragEnabled = !!(onShortlist && onResetToApplied && onMoveToStage && onOpenOfferModal && onOpenRejectModal)

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map((column) => (
        <KanbanColumnComponent
          key={column.id}
          column={column}
          isJobFiltered={isJobFiltered}
          isDragEnabled={isDragEnabled}
          onApplicationClick={onApplicationClick}
          onShortlist={onShortlist}
          onResetToApplied={onResetToApplied}
          onMoveToStage={onMoveToStage}
          onOpenOfferModal={onOpenOfferModal}
          onOpenAcceptModal={onOpenAcceptModal}
          onOpenRejectModal={onOpenRejectModal}
          onSchedule={onSchedule}
          onReschedule={onReschedule}
          onCancel={onCancel}
          onComplete={onComplete}
          onReopen={onReopen}
          onAssignAssessment={onAssignAssessment}
        />
      ))}
    </div>
  )
}

// ============================================================================
// Kanban Column Component
// ============================================================================

interface KanbanColumnProps {
  column: KanbanColumn
  isJobFiltered: boolean
  isDragEnabled: boolean
  onApplicationClick: (applicationId: string) => void
  onShortlist?: (applicationId: string) => void
  onResetToApplied?: (applicationId: string) => void
  onMoveToStage?: (applicationId: string, stageOrder: number) => Promise<void>
  onOpenOfferModal?: (applicationId: string) => void
  onOpenAcceptModal?: (app: ApplicationListItem) => void
  onOpenRejectModal?: (applicationId: string) => void
  onSchedule?: (application: ApplicationListItem) => void
  onReschedule?: (application: ApplicationListItem) => void
  onCancel?: (application: ApplicationListItem) => void
  onComplete?: (application: ApplicationListItem) => void
  onReopen?: (application: ApplicationListItem) => void
  onAssignAssessment?: (application: ApplicationListItem) => void
}

function KanbanColumnComponent({
  column,
  isJobFiltered,
  isDragEnabled,
  onApplicationClick,
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

    if (!applicationId || !isDragEnabled) return

    // Don't do anything if dropping on the same column type
    if (
      (column.id === 'applied' && sourceStatus === ApplicationStatus.APPLIED) ||
      (column.id === 'shortlisted' && sourceStatus === ApplicationStatus.SHORTLISTED) ||
      (column.id === 'in_progress' && sourceStatus === ApplicationStatus.IN_PROGRESS) ||
      (column.id === 'offer_made' && sourceStatus === ApplicationStatus.OFFER_MADE) ||
      (column.id === 'offer_accepted' && sourceStatus === ApplicationStatus.OFFER_ACCEPTED) ||
      (column.id === 'offer_declined' && sourceStatus === ApplicationStatus.OFFER_DECLINED) ||
      (column.id === 'rejected' && sourceStatus === ApplicationStatus.REJECTED)
    ) {
      return
    }

    // Handle drop based on target column
    switch (column.id) {
      case 'applied':
        onResetToApplied?.(applicationId)
        break
      case 'shortlisted':
        onShortlist?.(applicationId)
        break
      case 'in_progress':
        // For status-based view, move to first interview stage if available
        if (isJobFiltered) {
          onMoveToStage?.(applicationId, 1)
        }
        break
      case 'offer_made':
        onOpenOfferModal?.(applicationId)
        break
      case 'offer_accepted':
        // Find the application in the current list
        const app = column.applications.find(a => a.id === applicationId) || { id: applicationId } as ApplicationListItem
        onOpenAcceptModal?.(app)
        break
      case 'offer_declined':
        // Can't directly move to declined - would need specific action
        break
      case 'rejected':
        onOpenRejectModal?.(applicationId)
        break
      default:
        // Interview stages
        if (column.id.startsWith('stage-')) {
          onMoveToStage?.(applicationId, column.order)
        }
        break
    }
  }

  const canDrop = isDragEnabled

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
            showStageBadge={!isJobFiltered && application.status === ApplicationStatus.IN_PROGRESS}
            isDragEnabled={isDragEnabled}
            onOpenDrawer={onApplicationClick}
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
  showStageBadge: boolean
  isDragEnabled: boolean
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
  showStageBadge,
  isDragEnabled,
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
      draggable={isDragEnabled}
      onDragStart={(e) => isDragEnabled && onDragStart(e, application.id, application.status)}
      className={`bg-white border border-gray-200 rounded-md p-3 shadow-sm hover:shadow-md transition-shadow ${
        isDragEnabled ? 'cursor-grab active:cursor-grabbing' : ''
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
          {isDragEnabled && (
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

        {/* Job Info */}
        <div className="flex items-center gap-1.5 text-[11px] text-gray-600">
          <Building2 className="w-3 h-3 flex-shrink-0" />
          <span className="truncate font-medium">{application.job_title}</span>
        </div>
        <div className="text-[10px] text-gray-500 pl-4.5 truncate">
          {application.company_name}
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

      {/* Stage Badge (when in status view for IN_PROGRESS) */}
      {showStageBadge && application.current_stage_name && (
        <div className="mb-2">
          <span className="inline-flex px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-600 rounded">
            {application.current_stage_name}
          </span>
        </div>
      )}

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

      {/* Assigned Recruiters */}
      {application.assigned_recruiters && application.assigned_recruiters.length > 0 && (
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 mt-2">
          <div className="flex -space-x-1">
            {application.assigned_recruiters.slice(0, 3).map((recruiter) => (
              <div
                key={recruiter.id}
                title={recruiter.full_name}
                className="w-5 h-5 rounded-full border border-white bg-gray-200 flex items-center justify-center text-[8px] font-medium text-gray-600"
              >
                {recruiter.first_name?.[0]}{recruiter.last_name?.[0]}
              </div>
            ))}
            {application.assigned_recruiters.length > 3 && (
              <div className="w-5 h-5 rounded-full border border-white bg-gray-300 flex items-center justify-center text-[8px] font-medium text-gray-600">
                +{application.assigned_recruiters.length - 3}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
