import { useState, useEffect, useRef } from 'react'
import {
  Check,
  X,
  FileText,
  Users,
  Gift,
  Ban,
  ChevronDown,
  ChevronUp,
  Calendar,
  Play,
  Video,
  MapPin,
  ExternalLink,
  Link,
  Copy,
  CheckCircle,
  Send,
  User,
} from 'lucide-react'
import {
  ApplicationStatus,
  ApplicationStageInstance,
  StageInstanceStatus,
  StageInstanceStatusLabels,
  StageTypeConfig,
  StageFeedbackType,
} from '@/types'
import { StageTypeBadge } from '../jobs/StageTypeSelector'
import FeedbackThread from './FeedbackThread'

interface FullPipelineTimelineProps {
  applicationId: string
  applicationStatus: ApplicationStatus
  appliedAt: string
  shortlistedAt: string | null
  stageInstances: ApplicationStageInstance[]
  currentStageOrder?: number | null
  offerMadeAt: string | null
  offerAcceptedAt: string | null
  rejectedAt: string | null
  rejectionReason: string | null
  // Actions for interview stages
  onSchedule?: (instance: ApplicationStageInstance) => void
  onReschedule?: (instance: ApplicationStageInstance) => void
  onCancel?: (instance: ApplicationStageInstance) => void
  onComplete?: (instance: ApplicationStageInstance) => void
  onAssignAssessment?: (instance: ApplicationStageInstance) => void
  onSendInvite?: (instance: ApplicationStageInstance) => void
  // Actions for status changes
  onShortlist?: () => void
  onMoveToInProgress?: () => void
  onMakeOffer?: () => void
  isRecruiterView?: boolean
  currentUserId?: string
}

// Application status order for calculating progress
const STATUS_ORDER: ApplicationStatus[] = [
  ApplicationStatus.APPLIED,
  ApplicationStatus.SHORTLISTED,
  ApplicationStatus.IN_PROGRESS,
  ApplicationStatus.OFFER_MADE,
  ApplicationStatus.OFFER_ACCEPTED,
]

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string; bgColor: string; borderColor: string }> = {
  [ApplicationStatus.APPLIED]: {
    label: 'Applied',
    icon: <FileText className="w-4 h-4" />,
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  [ApplicationStatus.SHORTLISTED]: {
    label: 'Shortlisted',
    icon: <Users className="w-4 h-4" />,
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
  },
  [ApplicationStatus.IN_PROGRESS]: {
    label: 'Interview Process',
    icon: <Play className="w-4 h-4" />,
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
  },
  [ApplicationStatus.OFFER_MADE]: {
    label: 'Offer Made',
    icon: <Gift className="w-4 h-4" />,
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
  },
  [ApplicationStatus.OFFER_ACCEPTED]: {
    label: 'Hired',
    icon: <CheckCircle className="w-4 h-4" />,
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
  },
  [ApplicationStatus.OFFER_DECLINED]: {
    label: 'Offer Declined',
    icon: <X className="w-4 h-4" />,
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
  },
  [ApplicationStatus.REJECTED]: {
    label: 'Rejected',
    icon: <Ban className="w-4 h-4" />,
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
  },
}

// Helper to determine if a status stage is complete
function isStatusComplete(current: ApplicationStatus, target: ApplicationStatus): boolean {
  const currentIndex = STATUS_ORDER.indexOf(current)
  const targetIndex = STATUS_ORDER.indexOf(target)

  // Handle terminal states
  if (current === ApplicationStatus.REJECTED ||
      current === ApplicationStatus.OFFER_DECLINED) {
    // For rejected/declined, only applied and shortlisted can be "complete"
    if (target === ApplicationStatus.APPLIED) return true
    if (target === ApplicationStatus.SHORTLISTED && currentIndex >= 1) return true
    return false
  }

  return currentIndex > targetIndex
}

function isStatusCurrent(current: ApplicationStatus, target: ApplicationStatus): boolean {
  return current === target
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatDateTime(dateStr: string | null): { date: string; time: string } | null {
  if (!dateStr) return null
  const date = new Date(dateStr)
  return {
    date: date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }),
    time: date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    }),
  }
}

// Status Stage Card Component
function StatusStageCard({
  status,
  isComplete,
  isCurrent,
  date,
  children,
  onAction,
  actionLabel,
  isRecruiterView,
  applicationId,
  currentUserId,
}: {
  status: ApplicationStatus
  isComplete: boolean
  isCurrent: boolean
  date?: string | null
  children?: React.ReactNode
  onAction?: () => void
  actionLabel?: string
  isRecruiterView: boolean
  applicationId?: string
  currentUserId?: string
}) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG[ApplicationStatus.APPLIED]!
  const isPending = !isComplete && !isCurrent

  // Show feedback section for Applied and Shortlisted stages when complete or current
  const showFeedbackSection = (isComplete || isCurrent) &&
    (status === ApplicationStatus.APPLIED || status === ApplicationStatus.SHORTLISTED) &&
    applicationId

  // Map status to feedback stage type
  const feedbackStageType = status === ApplicationStatus.APPLIED
    ? StageFeedbackType.APPLIED
    : StageFeedbackType.SHORTLISTED

  return (
    <div
      className={`border rounded-lg overflow-hidden transition-all ${
        isComplete
          ? 'border-green-200 bg-green-50/50'
          : isCurrent
            ? `${config.borderColor} ${config.bgColor}`
            : 'border-gray-200 bg-gray-50 opacity-60'
      }`}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Status icon */}
          <div
            className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
              isComplete
                ? 'bg-green-100'
                : isCurrent
                  ? config.bgColor
                  : 'bg-gray-100'
            }`}
          >
            {isComplete ? (
              <Check className="w-4 h-4 text-green-600" />
            ) : (
              <span className={isCurrent ? config.color : 'text-gray-400'}>
                {config.icon}
              </span>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className={`font-medium ${isComplete || isCurrent ? 'text-gray-900' : 'text-gray-500'}`}>
                  {config.label}
                </span>
                {date && (
                  <p className="text-xs text-gray-500 mt-0.5">{formatDate(date)}</p>
                )}
                {isPending && (
                  <p className="text-xs text-gray-400 mt-0.5">Pending</p>
                )}
              </div>

              {/* Action button for current stage */}
              {isCurrent && isRecruiterView && onAction && actionLabel && (
                <button
                  onClick={onAction}
                  className="flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded transition-colors bg-gray-900 text-white hover:bg-gray-800"
                >
                  {actionLabel}
                </button>
              )}
            </div>

            {/* Feedback Thread for Applied/Shortlisted */}
            {showFeedbackSection && (
              <FeedbackThread
                applicationId={applicationId}
                stageType={feedbackStageType}
                isRecruiterView={isRecruiterView}
                currentUserId={currentUserId}
              />
            )}
          </div>
        </div>

        {/* Children (e.g., interview stages within In Progress) */}
        {children && (
          <div className="mt-4 ml-11">
            {children}
          </div>
        )}
      </div>
    </div>
  )
}

// Interview Stage Card (for stages within In Progress)
function InterviewStageCard({
  instance,
  index,
  isRecruiterView,
  applicationId,
  currentUserId,
  onSchedule,
  onReschedule,
  onCancel,
  onComplete,
  onAssignAssessment,
  onSendInvite,
  isCurrentStage,
}: {
  instance: ApplicationStageInstance
  index: number
  isRecruiterView: boolean
  applicationId: string
  currentUserId?: string
  onSchedule?: (instance: ApplicationStageInstance) => void
  onReschedule?: (instance: ApplicationStageInstance) => void
  onCancel?: (instance: ApplicationStageInstance) => void
  onComplete?: (instance: ApplicationStageInstance) => void
  onAssignAssessment?: (instance: ApplicationStageInstance) => void
  onSendInvite?: (instance: ApplicationStageInstance) => void
  isCurrentStage?: boolean
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const hasAutoExpanded = useRef(false)

  // Auto-expand when this becomes the current stage (only once on initial load)
  useEffect(() => {
    if (isCurrentStage && !hasAutoExpanded.current) {
      setIsExpanded(true)
      hasAutoExpanded.current = true
    }
  }, [isCurrentStage])
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null)

  const config = StageTypeConfig[instance.stage_template.stage_type]
  const isCompleted = instance.status === StageInstanceStatus.COMPLETED
  const isCancelled = instance.status === StageInstanceStatus.CANCELLED
  const isScheduled = instance.status === StageInstanceStatus.SCHEDULED
  const isNotStarted = instance.status === StageInstanceStatus.NOT_STARTED

  const scheduledInfo = formatDateTime(instance.scheduled_at)
  const hasBookingToken = instance.booking_token && instance.booking_token.is_valid && !instance.booking_token.is_used

  // Determine primary action
  let primaryAction: { label: string; onClick: () => void } | null = null
  if (isRecruiterView) {
    if (isNotStarted && config.isAssessment && onAssignAssessment) {
      primaryAction = { label: 'Assign', onClick: () => onAssignAssessment(instance) }
    } else if (isNotStarted && config.requiresScheduling && !hasBookingToken && onSchedule) {
      primaryAction = { label: 'Schedule', onClick: () => onSchedule(instance) }
    } else if ((isScheduled || instance.status === StageInstanceStatus.IN_PROGRESS || instance.status === StageInstanceStatus.SUBMITTED) && onComplete) {
      primaryAction = { label: 'Complete', onClick: () => onComplete(instance) }
    }
  }

  const handleCopyBookingLink = async (bookingUrl: string, tokenId: string) => {
    try {
      const fullUrl = `${window.location.origin}${bookingUrl}`
      await navigator.clipboard.writeText(fullUrl)
      setCopiedTokenId(tokenId)
      setTimeout(() => setCopiedTokenId(null), 2000)
    } catch (err) {
      console.error('Failed to copy booking link:', err)
    }
  }

  return (
    <div
      className={`border rounded-lg overflow-hidden transition-all ${
        isCompleted
          ? 'border-green-200 bg-white'
          : isCancelled
            ? 'border-gray-200 bg-gray-50 opacity-60'
            : isScheduled
              ? 'border-blue-200 bg-white'
              : isCurrentStage
                ? 'border-amber-300 bg-amber-50/30 ring-2 ring-amber-200'
                : 'border-gray-200 bg-white'
      }`}
    >
      <div className="p-3">
        <div className="flex items-start gap-3">
          {/* Stage number / status */}
          <div
            className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
              isCompleted
                ? 'bg-green-100 text-green-700'
                : isCancelled
                  ? 'bg-gray-100 text-gray-400'
                  : isScheduled
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600'
            }`}
          >
            {isCompleted ? <Check className="w-3 h-3" /> : isCancelled ? <X className="w-3 h-3" /> : index + 1}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {instance.stage_template.name}
                  </span>
                  <StageTypeBadge stageType={instance.stage_template.stage_type} size="sm" />
                </div>

                {/* Status badge */}
                <span className={`inline-block mt-1 text-xs font-medium px-1.5 py-0.5 rounded ${
                  isCompleted
                    ? 'bg-green-100 text-green-700'
                    : isCancelled
                      ? 'bg-gray-100 text-gray-500'
                      : isScheduled
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600'
                }`}>
                  {StageInstanceStatusLabels[instance.status]}
                </span>

                {/* Scheduled info */}
                {scheduledInfo && (
                  <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                    <Calendar className="w-3 h-3" />
                    {scheduledInfo.date} at {scheduledInfo.time}
                  </div>
                )}

                {/* Booking token waiting */}
                {hasBookingToken && (
                  <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-700 text-xs rounded border border-blue-200">
                    <Send className="w-3 h-3" />
                    Awaiting booking
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {primaryAction && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      primaryAction.onClick()
                    }}
                    className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                      primaryAction.label === 'Complete'
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : primaryAction.label === 'Assign'
                          ? 'bg-orange-600 text-white hover:bg-orange-700'
                          : 'bg-gray-900 text-white hover:bg-gray-800'
                    }`}
                  >
                    {primaryAction.label}
                  </button>
                )}
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                >
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="border-t border-gray-100 bg-gray-50 p-3 space-y-3">
          {instance.stage_template.description && (
            <p className="text-xs text-gray-600">{instance.stage_template.description}</p>
          )}

          {instance.interviewer && (
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <User className="w-3 h-3" />
              {instance.interviewer.first_name} {instance.interviewer.last_name}
            </div>
          )}

          {instance.meeting_link && (
            <a
              href={instance.meeting_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
            >
              <Video className="w-3 h-3" />
              Join Meeting
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          )}

          {instance.location && (
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <MapPin className="w-3 h-3" />
              {instance.location}
            </div>
          )}

          {/* Booking Link */}
          {instance.booking_token && !instance.booking_token.is_used && (
            <div className="p-2 bg-white rounded border border-gray-200">
              <div className="flex items-center gap-2 text-xs">
                <Link className="w-3 h-3 text-blue-500" />
                <span className="font-medium text-gray-700">Booking Link</span>
                {instance.booking_token.is_valid ? (
                  <span className="ml-auto px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">Pending</span>
                ) : (
                  <span className="ml-auto px-1.5 py-0.5 text-xs bg-red-100 text-red-700 rounded">Expired</span>
                )}
              </div>
              <div className="mt-2 flex items-center gap-1">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}${instance.booking_token.booking_url}`}
                  className="flex-1 px-2 py-1 text-xs bg-gray-50 border border-gray-200 rounded text-gray-600"
                />
                <button
                  onClick={() => handleCopyBookingLink(instance.booking_token!.booking_url, instance.booking_token!.id)}
                  className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                >
                  {copiedTokenId === instance.booking_token.id ? (
                    <Check className="w-3 h-3 text-green-500" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Feedback Thread */}
          <FeedbackThread
            applicationId={applicationId}
            stageInstanceId={instance.id}
            isRecruiterView={isRecruiterView}
            currentUserId={currentUserId}
          />

          {/* Secondary actions */}
          {isRecruiterView && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
              {isScheduled && onReschedule && (
                <button
                  onClick={() => onReschedule(instance)}
                  className="px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                >
                  Reschedule
                </button>
              )}
              {isScheduled && onCancel && (
                <button
                  onClick={() => onCancel(instance)}
                  className="px-2 py-1 text-xs font-medium text-red-700 bg-red-50 rounded hover:bg-red-100"
                >
                  Cancel
                </button>
              )}
              {isNotStarted && config.requiresScheduling && !hasBookingToken && onSendInvite && (
                <button
                  onClick={() => onSendInvite(instance)}
                  className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded hover:bg-blue-100 flex items-center gap-1"
                >
                  <Send className="w-3 h-3" />
                  Send Invite
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function FullPipelineTimeline({
  applicationId,
  applicationStatus,
  appliedAt,
  shortlistedAt,
  stageInstances,
  currentStageOrder,
  offerMadeAt,
  offerAcceptedAt,
  rejectedAt,
  rejectionReason,
  onSchedule,
  onReschedule,
  onCancel,
  onComplete,
  onAssignAssessment,
  onSendInvite,
  onShortlist,
  onMoveToInProgress,
  onMakeOffer,
  isRecruiterView = false,
  currentUserId,
}: FullPipelineTimelineProps) {
  // Sort stage instances
  const sortedInstances = [...stageInstances].sort(
    (a, b) => a.stage_template.order - b.stage_template.order
  )

  // Calculate overall progress
  const completedStagesCount = stageInstances.filter(
    (i) => i.status === StageInstanceStatus.COMPLETED
  ).length
  const totalStagesCount = stageInstances.length

  // Find the current stage by matching currentStageOrder from the application
  const currentStageInstance = currentStageOrder != null
    ? sortedInstances.find((inst) => inst.stage_template.order === currentStageOrder)
    : null

  // Determine which outcome to show (offer or reject)
  const isRejected = applicationStatus === ApplicationStatus.REJECTED
  const isOfferDeclined = applicationStatus === ApplicationStatus.OFFER_DECLINED
  const hasOffer = [ApplicationStatus.OFFER_MADE, ApplicationStatus.OFFER_ACCEPTED].includes(applicationStatus)

  return (
    <div className="space-y-4">
      {/* Progress Overview */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-900">Application Pipeline</span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_CONFIG[applicationStatus]?.bgColor} ${STATUS_CONFIG[applicationStatus]?.color}`}>
            {STATUS_CONFIG[applicationStatus]?.label}
          </span>
        </div>

        {/* Visual progress bar */}
        <div className="flex items-center gap-1">
          {/* Applied */}
          <div className="h-2 flex-1 rounded-full bg-green-500" title="Applied" />

          {/* Shortlisted */}
          <div
            className={`h-2 flex-1 rounded-full ${
              isStatusComplete(applicationStatus, ApplicationStatus.SHORTLISTED) || isStatusCurrent(applicationStatus, ApplicationStatus.SHORTLISTED)
                ? 'bg-green-500'
                : 'bg-gray-200'
            }`}
            title="Shortlisted"
          />

          {/* In Progress (with interview stages) */}
          {totalStagesCount > 0 ? (
            sortedInstances.map((instance) => (
              <div
                key={instance.id}
                className={`h-2 flex-1 rounded-full ${
                  instance.status === StageInstanceStatus.COMPLETED
                    ? 'bg-green-500'
                    : instance.status === StageInstanceStatus.SCHEDULED
                      ? 'bg-blue-500'
                      : instance.status === StageInstanceStatus.IN_PROGRESS ||
                        instance.status === StageInstanceStatus.AWAITING_SUBMISSION ||
                        instance.status === StageInstanceStatus.SUBMITTED
                        ? 'bg-purple-500'
                        : 'bg-gray-200'
                }`}
                title={`${instance.stage_template.name}: ${StageInstanceStatusLabels[instance.status]}`}
              />
            ))
          ) : (
            <div
              className={`h-2 flex-1 rounded-full ${
                isStatusComplete(applicationStatus, ApplicationStatus.IN_PROGRESS) || isStatusCurrent(applicationStatus, ApplicationStatus.IN_PROGRESS)
                  ? 'bg-green-500'
                  : 'bg-gray-200'
              }`}
              title="Interview Process"
            />
          )}

          {/* Offer/Hired */}
          <div
            className={`h-2 flex-1 rounded-full ${
              hasOffer || applicationStatus === ApplicationStatus.OFFER_ACCEPTED
                ? 'bg-green-500'
                : isRejected || isOfferDeclined
                  ? 'bg-red-500'
                  : 'bg-gray-200'
            }`}
            title={isRejected ? 'Rejected' : isOfferDeclined ? 'Offer Declined' : 'Offer'}
          />
        </div>
      </div>

      {/* Stage Cards */}
      <div className="space-y-3">
        {/* 1. Applied */}
        <StatusStageCard
          status={ApplicationStatus.APPLIED}
          isComplete={isStatusComplete(applicationStatus, ApplicationStatus.APPLIED)}
          isCurrent={isStatusCurrent(applicationStatus, ApplicationStatus.APPLIED)}
          date={appliedAt}
          onAction={onShortlist}
          actionLabel="Shortlist"
          isRecruiterView={isRecruiterView}
          applicationId={applicationId}
          currentUserId={currentUserId}
        />

        {/* 2. Shortlisted */}
        <StatusStageCard
          status={ApplicationStatus.SHORTLISTED}
          isComplete={isStatusComplete(applicationStatus, ApplicationStatus.SHORTLISTED)}
          isCurrent={isStatusCurrent(applicationStatus, ApplicationStatus.SHORTLISTED)}
          date={shortlistedAt}
          onAction={onMoveToInProgress}
          actionLabel="Start Interviews"
          isRecruiterView={isRecruiterView}
          applicationId={applicationId}
          currentUserId={currentUserId}
        />

        {/* 3. Interview Process (In Progress) with nested stages */}
        <StatusStageCard
          status={ApplicationStatus.IN_PROGRESS}
          isComplete={isStatusComplete(applicationStatus, ApplicationStatus.IN_PROGRESS)}
          isCurrent={isStatusCurrent(applicationStatus, ApplicationStatus.IN_PROGRESS)}
          date={null}
          onAction={completedStagesCount === totalStagesCount && totalStagesCount > 0 ? onMakeOffer : undefined}
          actionLabel="Make Offer"
          isRecruiterView={isRecruiterView}
        >
          {/* Interview stages */}
          {sortedInstances.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-500">
                  Interview Stages ({completedStagesCount}/{totalStagesCount} complete)
                </span>
              </div>
              {sortedInstances.map((instance, index) => (
                <InterviewStageCard
                  key={instance.id}
                  instance={instance}
                  index={index}
                  isRecruiterView={isRecruiterView}
                  applicationId={applicationId}
                  currentUserId={currentUserId}
                  onSchedule={onSchedule}
                  onReschedule={onReschedule}
                  onCancel={onCancel}
                  onComplete={onComplete}
                  onAssignAssessment={onAssignAssessment}
                  onSendInvite={onSendInvite}
                  isCurrentStage={currentStageInstance?.id === instance.id}
                />
              ))}
            </div>
          ) : (
            <div className="text-xs text-gray-500 py-2">
              No interview stages configured for this job.
            </div>
          )}
        </StatusStageCard>

        {/* 4. Offer Stage (or Rejected) */}
        {isRejected || isOfferDeclined ? (
          <StatusStageCard
            status={ApplicationStatus.REJECTED}
            isComplete={false}
            isCurrent={true}
            date={rejectedAt}
            isRecruiterView={isRecruiterView}
          >
            {rejectionReason && (
              <p className="text-xs text-gray-500">
                Reason: {rejectionReason}
              </p>
            )}
          </StatusStageCard>
        ) : (
          <>
            {/* Offer Made */}
            <StatusStageCard
              status={ApplicationStatus.OFFER_MADE}
              isComplete={applicationStatus === ApplicationStatus.OFFER_ACCEPTED}
              isCurrent={applicationStatus === ApplicationStatus.OFFER_MADE}
              date={offerMadeAt}
              isRecruiterView={isRecruiterView}
            />

            {/* Hired (Offer Accepted) */}
            {applicationStatus === ApplicationStatus.OFFER_ACCEPTED && (
              <StatusStageCard
                status={ApplicationStatus.OFFER_ACCEPTED}
                isComplete={false}
                isCurrent={true}
                date={offerAcceptedAt}
                isRecruiterView={isRecruiterView}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}
