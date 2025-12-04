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
  isRecruiterView?: boolean
}

const StatusColors: Record<StageInstanceStatus, { bg: string; text: string; icon: React.ReactNode }> = {
  [StageInstanceStatus.NOT_STARTED]: {
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    icon: <div className="w-2 h-2 rounded-full bg-gray-400" />,
  },
  [StageInstanceStatus.SCHEDULED]: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    icon: <Calendar className="w-4 h-4 text-blue-500" />,
  },
  [StageInstanceStatus.IN_PROGRESS]: {
    bg: 'bg-purple-100',
    text: 'text-purple-700',
    icon: <Play className="w-4 h-4 text-purple-500" />,
  },
  [StageInstanceStatus.AWAITING_SUBMISSION]: {
    bg: 'bg-orange-100',
    text: 'text-orange-700',
    icon: <Clock className="w-4 h-4 text-orange-500" />,
  },
  [StageInstanceStatus.SUBMITTED]: {
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    icon: <FileText className="w-4 h-4 text-amber-500" />,
  },
  [StageInstanceStatus.COMPLETED]: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    icon: <Check className="w-4 h-4 text-green-500" />,
  },
  [StageInstanceStatus.CANCELLED]: {
    bg: 'bg-gray-100',
    text: 'text-gray-500',
    icon: <X className="w-4 h-4 text-gray-400" />,
  },
  [StageInstanceStatus.NO_SHOW]: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    icon: <AlertCircle className="w-4 h-4 text-red-500" />,
  },
}

export default function StageTimeline({
  instances,
  onSchedule,
  onReschedule,
  onCancel,
  onComplete,
  onAssignAssessment,
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

  if (instances.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No interview stages configured for this position.
      </div>
    )
  }

  return (
    <div className="space-y-0">
      {sortedInstances.map((instance, index) => {
        const isLast = index === sortedInstances.length - 1
        const config = StageTypeConfig[instance.stage_template.stage_type]
        const statusConfig = StatusColors[instance.status]
        const isExpanded = expandedId === instance.id

        const canSchedule =
          isRecruiterView &&
          config.requiresScheduling &&
          instance.status === StageInstanceStatus.NOT_STARTED

        const canReschedule =
          isRecruiterView &&
          config.requiresScheduling &&
          instance.status === StageInstanceStatus.SCHEDULED

        const canCancel =
          isRecruiterView &&
          instance.status === StageInstanceStatus.SCHEDULED

        const canComplete =
          isRecruiterView &&
          (instance.status === StageInstanceStatus.SCHEDULED ||
            instance.status === StageInstanceStatus.IN_PROGRESS ||
            instance.status === StageInstanceStatus.SUBMITTED)

        const canAssignAssessment =
          isRecruiterView &&
          config.isAssessment &&
          instance.status === StageInstanceStatus.NOT_STARTED

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

        return (
          <div key={instance.id} className="relative">
            {/* Timeline connector */}
            {!isLast && (
              <div className="absolute left-4 top-10 bottom-0 w-0.5 bg-gray-200" />
            )}

            <div className="relative flex gap-4">
              {/* Timeline dot */}
              <div
                className={`relative z-10 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${statusConfig.bg}`}
              >
                {statusConfig.icon}
              </div>

              {/* Content */}
              <div className="flex-1 pb-6">
                {/* Header */}
                <div
                  className="flex items-start justify-between gap-2 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : instance.id)}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        {instance.stage_template.name}
                      </span>
                      <StageTypeBadge
                        stageType={instance.stage_template.stage_type}
                        size="sm"
                      />
                    </div>
                    <span
                      className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full ${statusConfig.bg} ${statusConfig.text}`}
                    >
                      {StageInstanceStatusLabels[instance.status]}
                    </span>
                  </div>
                  <button className="p-1 text-gray-400 hover:text-gray-600">
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Quick Info (always visible) */}
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

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="mt-4 space-y-3 p-4 bg-gray-50 rounded-lg">
                    {instance.stage_template.description && (
                      <p className="text-sm text-gray-600">
                        {instance.stage_template.description}
                      </p>
                    )}

                    {instance.interviewer && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500">Interviewer:</span>
                        <span className="font-medium">
                          {instance.interviewer.first_name} {instance.interviewer.last_name}
                        </span>
                      </div>
                    )}

                    {instance.meeting_link && (
                      <a
                        href={instance.meeting_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
                      >
                        <Video className="w-4 h-4" />
                        Join Meeting
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}

                    {instance.location && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span>{instance.location}</span>
                      </div>
                    )}

                    {/* Booking Link Info */}
                    {instance.booking_token && (
                      <div className="mt-3 p-3 bg-white rounded border border-gray-200">
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
                                className="flex-1 px-2 py-1 text-xs bg-gray-50 border border-gray-200 rounded text-gray-600 overflow-hidden text-ellipsis"
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

                    {instance.submission_url && (
                      <a
                        href={instance.submission_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
                      >
                        <FileText className="w-4 h-4" />
                        View Submission
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}

                    {instance.feedback && (
                      <div className="mt-3 p-3 bg-white rounded border border-gray-200">
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

                    {/* Actions */}
                    {isRecruiterView && (
                      <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-200">
                        {canSchedule && onSchedule && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onSchedule(instance)
                            }}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-gray-900 rounded hover:bg-gray-800"
                          >
                            Schedule
                          </button>
                        )}
                        {canAssignAssessment && onAssignAssessment && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onAssignAssessment(instance)
                            }}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-orange-600 rounded hover:bg-orange-700"
                          >
                            Assign Assessment
                          </button>
                        )}
                        {canReschedule && onReschedule && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onReschedule(instance)
                            }}
                            className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                          >
                            Reschedule
                          </button>
                        )}
                        {canComplete && onComplete && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onComplete(instance)
                            }}
                            className="px-3 py-1.5 text-xs font-medium text-green-700 bg-green-100 rounded hover:bg-green-200"
                          >
                            Mark Complete
                          </button>
                        )}
                        {canCancel && onCancel && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onCancel(instance)
                            }}
                            className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 rounded hover:bg-red-200"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
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
      {sortedInstances.map((instance, index) => {
        const statusConfig = StatusColors[instance.status]
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
