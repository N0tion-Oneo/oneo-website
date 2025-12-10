import { useState } from 'react'
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  Check,
  X,
  AlertCircle,
  Play,
  FileText,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Link,
  Copy,
  CheckCircle,
  Send,
  User,
} from 'lucide-react'
import {
  ApplicationStageInstance,
  StageInstanceStatus,
  StageInstanceStatusLabels,
  StageTypeConfig,
} from '@/types'
import { StageTypeBadge } from '../jobs/StageTypeSelector'

interface StageTimelineProps {
  instances: ApplicationStageInstance[]
  onSchedule?: (instance: ApplicationStageInstance) => void
  onReschedule?: (instance: ApplicationStageInstance) => void
  onCancel?: (instance: ApplicationStageInstance) => void
  onComplete?: (instance: ApplicationStageInstance) => void
  onAssignAssessment?: (instance: ApplicationStageInstance) => void
  onSendInvite?: (instance: ApplicationStageInstance) => void
  isRecruiterView?: boolean
}

const StatusColors: Record<StageInstanceStatus, { bg: string; text: string; border: string; icon: React.ReactNode }> = {
  [StageInstanceStatus.NOT_STARTED]: {
    bg: 'bg-gray-50',
    text: 'text-gray-600',
    border: 'border-gray-200',
    icon: <div className="w-2 h-2 rounded-full bg-gray-400" />,
  },
  [StageInstanceStatus.SCHEDULED]: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    icon: <Calendar className="w-4 h-4 text-blue-500" />,
  },
  [StageInstanceStatus.IN_PROGRESS]: {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    icon: <Play className="w-4 h-4 text-purple-500" />,
  },
  [StageInstanceStatus.AWAITING_SUBMISSION]: {
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-200',
    icon: <Clock className="w-4 h-4 text-orange-500" />,
  },
  [StageInstanceStatus.SUBMITTED]: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    icon: <FileText className="w-4 h-4 text-amber-500" />,
  },
  [StageInstanceStatus.COMPLETED]: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
    icon: <Check className="w-4 h-4 text-green-500" />,
  },
  [StageInstanceStatus.CANCELLED]: {
    bg: 'bg-gray-50',
    text: 'text-gray-500',
    border: 'border-gray-200',
    icon: <X className="w-4 h-4 text-gray-400" />,
  },
  [StageInstanceStatus.NO_SHOW]: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    icon: <AlertCircle className="w-4 h-4 text-red-500" />,
  },
}

// Helper to get the primary action for a stage
function getPrimaryAction(
  instance: ApplicationStageInstance,
  config: { requiresScheduling?: boolean; isAssessment?: boolean },
  isRecruiterView: boolean
): { action: 'schedule' | 'send_invite' | 'assign' | 'reschedule' | 'complete' | 'review' | null; label: string } {
  if (!isRecruiterView) return { action: null, label: '' }

  const status = instance.status

  // NOT_STARTED stages
  if (status === StageInstanceStatus.NOT_STARTED) {
    if (config.isAssessment) {
      return { action: 'assign', label: 'Assign Assessment' }
    }
    if (config.requiresScheduling) {
      // Check if there's already a booking token sent
      if (instance.booking_token && instance.booking_token.is_valid && !instance.booking_token.is_used) {
        return { action: null, label: '' } // Waiting for candidate to book
      }
      return { action: 'schedule', label: 'Schedule' }
    }
  }

  // SCHEDULED stages
  if (status === StageInstanceStatus.SCHEDULED) {
    return { action: 'complete', label: 'Mark Complete' }
  }

  // IN_PROGRESS or SUBMITTED stages
  if (status === StageInstanceStatus.IN_PROGRESS || status === StageInstanceStatus.SUBMITTED) {
    return { action: 'complete', label: 'Mark Complete' }
  }

  // AWAITING_SUBMISSION stages
  if (status === StageInstanceStatus.AWAITING_SUBMISSION) {
    return { action: null, label: '' } // Waiting for candidate
  }

  return { action: null, label: '' }
}

// Helper to get what's currently happening / next step hint
function getStatusHint(instance: ApplicationStageInstance): string | null {
  const status = instance.status
  const hasBookingToken = instance.booking_token && instance.booking_token.is_valid && !instance.booking_token.is_used

  if (status === StageInstanceStatus.NOT_STARTED) {
    if (hasBookingToken) {
      return 'Waiting for candidate to book a time'
    }
    return 'Ready to schedule'
  }

  if (status === StageInstanceStatus.SCHEDULED) {
    return 'Upcoming interview'
  }

  if (status === StageInstanceStatus.AWAITING_SUBMISSION) {
    return 'Waiting for candidate submission'
  }

  if (status === StageInstanceStatus.SUBMITTED) {
    return 'Ready for review'
  }

  return null
}

export default function StageTimeline({
  instances,
  onSchedule,
  onReschedule,
  onCancel,
  onComplete,
  onAssignAssessment,
  onSendInvite,
  isRecruiterView = false,
}: StageTimelineProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null)

  const handleCopyBookingLink = async (bookingUrl: string, tokenId: string) => {
    try {
      // Construct full URL
      const fullUrl = `${window.location.origin}${bookingUrl}`
      await navigator.clipboard.writeText(fullUrl)
      setCopiedTokenId(tokenId)
      setTimeout(() => setCopiedTokenId(null), 2000)
    } catch (err) {
      console.error('Failed to copy booking link:', err)
    }
  }

  // Sort instances by stage order
  const sortedInstances = [...instances].sort(
    (a, b) => a.stage_template.order - b.stage_template.order
  )

  // Calculate progress
  const completedCount = instances.filter(
    (i) => i.status === StageInstanceStatus.COMPLETED
  ).length
  const totalCount = instances.length

  if (instances.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No interview stages configured for this position.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Progress Header */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-900">Interview Progress</span>
          <span className="text-sm text-gray-500">
            {completedCount} of {totalCount} stages complete
          </span>
        </div>
        <div className="flex items-center gap-1">
          {sortedInstances.map((instance) => {
            const isCompleted = instance.status === StageInstanceStatus.COMPLETED
            const isScheduled = instance.status === StageInstanceStatus.SCHEDULED
            const isInProgress = instance.status === StageInstanceStatus.IN_PROGRESS ||
              instance.status === StageInstanceStatus.AWAITING_SUBMISSION ||
              instance.status === StageInstanceStatus.SUBMITTED

            return (
              <div
                key={instance.id}
                className={`h-2 flex-1 rounded-full transition-colors ${
                  isCompleted
                    ? 'bg-green-500'
                    : isScheduled
                      ? 'bg-blue-500'
                      : isInProgress
                        ? 'bg-purple-500'
                        : 'bg-gray-200'
                }`}
                title={`${instance.stage_template.name}: ${StageInstanceStatusLabels[instance.status]}`}
              />
            )
          })}
        </div>
      </div>

      {/* Stage Cards */}
      <div className="space-y-3">
        {sortedInstances.map((instance, index) => {
          const config = StageTypeConfig[instance.stage_template.stage_type]
          const statusConfig = StatusColors[instance.status]
          const isExpanded = expandedId === instance.id
          const primaryAction = getPrimaryAction(instance, config, isRecruiterView)
          const statusHint = getStatusHint(instance)

          const canReschedule =
            isRecruiterView &&
            config.requiresScheduling &&
            instance.status === StageInstanceStatus.SCHEDULED

          const canCancel =
            isRecruiterView &&
            instance.status === StageInstanceStatus.SCHEDULED

          const canSendInvite =
            isRecruiterView &&
            config.requiresScheduling &&
            instance.status === StageInstanceStatus.NOT_STARTED &&
            !instance.booking_token

          const formatDateTime = (dateStr: string | null) => {
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

          const scheduledInfo = formatDateTime(instance.scheduled_at)
          const deadlineInfo = formatDateTime(instance.deadline)

          const isCompleted = instance.status === StageInstanceStatus.COMPLETED
          const isCancelled = instance.status === StageInstanceStatus.CANCELLED
          const isTerminal = isCompleted || isCancelled

          return (
            <div
              key={instance.id}
              className={`border rounded-lg overflow-hidden transition-all ${statusConfig.border} ${
                isTerminal ? 'opacity-75' : ''
              }`}
            >
              {/* Main card content */}
              <div className={`p-4 ${statusConfig.bg}`}>
                <div className="flex items-start gap-3">
                  {/* Stage number / status icon */}
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      isCompleted
                        ? 'bg-green-100'
                        : isCancelled
                          ? 'bg-gray-100'
                          : 'bg-white border border-gray-200'
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : isCancelled ? (
                      <X className="w-4 h-4 text-gray-400" />
                    ) : (
                      <span className="text-sm font-medium text-gray-600">{index + 1}</span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-900">
                            {instance.stage_template.name}
                          </span>
                          <StageTypeBadge
                            stageType={instance.stage_template.stage_type}
                            size="sm"
                          />
                        </div>

                        {/* Status badge */}
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                              isCompleted
                                ? 'bg-green-100 text-green-700'
                                : isCancelled
                                  ? 'bg-gray-100 text-gray-500'
                                  : `${statusConfig.bg} ${statusConfig.text}`
                            }`}
                          >
                            {statusConfig.icon}
                            {StageInstanceStatusLabels[instance.status]}
                          </span>

                          {/* Status hint for non-terminal stages */}
                          {!isTerminal && statusHint && (
                            <span className="text-xs text-gray-500">{statusHint}</span>
                          )}
                        </div>
                      </div>

                      {/* Primary Action Button - visible without expanding */}
                      {primaryAction.action && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            if (primaryAction.action === 'schedule' && onSchedule) {
                              onSchedule(instance)
                            } else if (primaryAction.action === 'assign' && onAssignAssessment) {
                              onAssignAssessment(instance)
                            } else if (primaryAction.action === 'complete' && onComplete) {
                              onComplete(instance)
                            } else if (primaryAction.action === 'send_invite' && onSendInvite) {
                              onSendInvite(instance)
                            }
                          }}
                          className={`flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                            primaryAction.action === 'complete'
                              ? 'bg-green-600 text-white hover:bg-green-700'
                              : primaryAction.action === 'assign'
                                ? 'bg-orange-600 text-white hover:bg-orange-700'
                                : 'bg-gray-900 text-white hover:bg-gray-800'
                          }`}
                        >
                          {primaryAction.label}
                        </button>
                      )}
                    </div>

                    {/* Quick Info - scheduled time or deadline */}
                    {scheduledInfo && (
                      <div className="mt-2 flex items-center gap-3 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {scheduledInfo.date}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {scheduledInfo.time}
                        </span>
                        {instance.duration_minutes && (
                          <span className="text-gray-400">
                            ({instance.duration_minutes} min)
                          </span>
                        )}
                      </div>
                    )}

                    {deadlineInfo && !scheduledInfo && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-orange-600">
                        <AlertCircle className="w-4 h-4" />
                        Deadline: {deadlineInfo.date} at {deadlineInfo.time}
                      </div>
                    )}

                    {/* Interviewer quick view */}
                    {instance.interviewer && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                        <User className="w-3.5 h-3.5" />
                        <span>
                          {instance.interviewer.first_name} {instance.interviewer.last_name}
                        </span>
                      </div>
                    )}

                    {/* Booking Token Status Badge (when waiting for candidate) */}
                    {instance.booking_token && instance.booking_token.is_valid && !instance.booking_token.is_used && (
                      <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-md border border-blue-200">
                        <Send className="w-3 h-3" />
                        Booking link sent - awaiting response
                      </div>
                    )}
                  </div>

                  {/* Expand toggle */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : instance.id)}
                    className="flex-shrink-0 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="border-t border-gray-200 bg-white p-4 space-y-4">
                  {/* Description */}
                  {instance.stage_template.description && (
                    <div>
                      <span className="text-xs font-medium text-gray-500 uppercase">Description</span>
                      <p className="mt-1 text-sm text-gray-600">
                        {instance.stage_template.description}
                      </p>
                    </div>
                  )}

                  {/* Meeting Link */}
                  {instance.meeting_link && (
                    <a
                      href={instance.meeting_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-2 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <Video className="w-4 h-4" />
                      Join Meeting
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}

                  {/* Location */}
                  {instance.location && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-700">{instance.location}</span>
                    </div>
                  )}

                  {/* Booking Link Info */}
                  {instance.booking_token && (
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Link className="w-4 h-4 text-blue-500" />
                        <span className="text-xs font-medium text-gray-700 uppercase">
                          Booking Link
                        </span>
                        {instance.booking_token.is_used ? (
                          <span className="ml-auto px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Booked
                          </span>
                        ) : instance.booking_token.is_valid ? (
                          <span className="ml-auto px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                            Pending
                          </span>
                        ) : (
                          <span className="ml-auto px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                            Expired
                          </span>
                        )}
                      </div>

                      {instance.booking_token.is_used && instance.booking_token.used_at && (
                        <p className="text-xs text-gray-600 mb-2">
                          Candidate booked on{' '}
                          {new Date(instance.booking_token.used_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </p>
                      )}

                      {!instance.booking_token.is_used && (
                        <>
                          <div className="flex items-center gap-2 mb-2">
                            <input
                              type="text"
                              readOnly
                              value={`${window.location.origin}${instance.booking_token.booking_url}`}
                              className="flex-1 px-2 py-1 text-xs bg-white border border-gray-200 rounded text-gray-600 overflow-hidden text-ellipsis"
                            />
                            <button
                              onClick={() =>
                                handleCopyBookingLink(
                                  instance.booking_token!.booking_url,
                                  instance.booking_token!.id
                                )
                              }
                              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                              title="Copy link"
                            >
                              {copiedTokenId === instance.booking_token.id ? (
                                <Check className="w-4 h-4 text-green-500" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                          </div>

                          <p className="text-xs text-gray-500">
                            Sent on{' '}
                            {new Date(instance.booking_token.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                            {' · '}
                            {instance.booking_token.is_valid ? (
                              <>
                                Expires{' '}
                                {new Date(instance.booking_token.expires_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </>
                            ) : (
                              <span className="text-red-600">
                                Expired on{' '}
                                {new Date(instance.booking_token.expires_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </span>
                            )}
                          </p>
                        </>
                      )}
                    </div>
                  )}

                  {/* Submission URL */}
                  {instance.submission_url && (
                    <a
                      href={instance.submission_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-2 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <FileText className="w-4 h-4" />
                      View Submission
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}

                  {/* Feedback */}
                  {instance.feedback && (
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <span className="text-xs font-medium text-gray-500 uppercase">
                        Feedback
                      </span>
                      <p className="mt-1 text-sm text-gray-700">{instance.feedback}</p>
                      {instance.score !== null && (
                        <div className="mt-2 text-sm">
                          Score: <span className="font-medium">{instance.score}/10</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Secondary Actions */}
                  {isRecruiterView && (canReschedule || canCancel || canSendInvite) && (
                    <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
                      {canSendInvite && onSendInvite && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onSendInvite(instance)
                          }}
                          className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded hover:bg-blue-100 transition-colors flex items-center gap-1"
                        >
                          <Send className="w-3 h-3" />
                          Send Booking Invite
                        </button>
                      )}
                      {canReschedule && onReschedule && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onReschedule(instance)
                          }}
                          className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                        >
                          Reschedule
                        </button>
                      )}
                      {canCancel && onCancel && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onCancel(instance)
                          }}
                          className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded hover:bg-red-100 transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Compact version for list views
interface StageProgressBarProps {
  instances: ApplicationStageInstance[]
}

export function StageProgressBar({ instances }: StageProgressBarProps) {
  const sortedInstances = [...instances].sort(
    (a, b) => a.stage_template.order - b.stage_template.order
  )

  const completedCount = instances.filter(
    (i) => i.status === StageInstanceStatus.COMPLETED
  ).length

  return (
    <div className="flex items-center gap-1">
      {sortedInstances.map((instance) => {
        const isCompleted = instance.status === StageInstanceStatus.COMPLETED

        return (
          <div
            key={instance.id}
            className={`h-2 flex-1 rounded-full ${
              isCompleted
                ? 'bg-green-500'
                : instance.status === StageInstanceStatus.SCHEDULED
                  ? 'bg-blue-500'
                  : instance.status === StageInstanceStatus.IN_PROGRESS
                    ? 'bg-purple-500'
                    : 'bg-gray-200'
            }`}
            title={`${instance.stage_template.name}: ${StageInstanceStatusLabels[instance.status]}`}
          />
        )
      })}
      <span className="ml-2 text-xs text-gray-500">
        {completedCount}/{instances.length}
      </span>
    </div>
  )
}
