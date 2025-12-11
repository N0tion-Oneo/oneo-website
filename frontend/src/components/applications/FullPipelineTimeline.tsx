import { useState } from 'react'
import {
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Calendar,
  Clock,
  MapPin,
  Video,
  ExternalLink,
  User,
  Star,
  Play,
  FileText,
  Users,
  Gift,
  Ban,
  CheckCircle,
  Paperclip,
  Link,
  MessageSquare,
} from 'lucide-react'
import {
  ApplicationStatus,
  ApplicationStageInstance,
  StageInstanceStatus,
  StageInstanceStatusLabels,
  StageTypeConfig,
  StageFeedbackType,
  ApplicationAnswer,
  ApplicationQuestion,
  QuestionType,
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
  // Application questions and answers (shown in Applied stage)
  questions?: ApplicationQuestion[]
  answers?: ApplicationAnswer[]
  coveringStatement?: string | null
  // Interview stage actions only
  onSchedule?: (instance: ApplicationStageInstance) => void
  onReschedule?: (instance: ApplicationStageInstance) => void
  onCancel?: (instance: ApplicationStageInstance) => void
  onComplete?: (instance: ApplicationStageInstance) => void
  onAssignAssessment?: (instance: ApplicationStageInstance) => void
  isRecruiterView?: boolean
  currentUserId?: string
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string; bgColor: string }> = {
  [ApplicationStatus.APPLIED]: {
    label: 'Applied',
    icon: <FileText className="w-3.5 h-3.5" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  [ApplicationStatus.SHORTLISTED]: {
    label: 'Shortlisted',
    icon: <Users className="w-3.5 h-3.5" />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
  [ApplicationStatus.IN_PROGRESS]: {
    label: 'In Progress',
    icon: <Play className="w-3.5 h-3.5" />,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
  },
  [ApplicationStatus.OFFER_MADE]: {
    label: 'Offer Made',
    icon: <Gift className="w-3.5 h-3.5" />,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  [ApplicationStatus.OFFER_ACCEPTED]: {
    label: 'Hired',
    icon: <CheckCircle className="w-3.5 h-3.5" />,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
  },
  [ApplicationStatus.REJECTED]: {
    label: 'Rejected',
    icon: <Ban className="w-3.5 h-3.5" />,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
  },
  [ApplicationStatus.OFFER_DECLINED]: {
    label: 'Offer Declined',
    icon: <X className="w-3.5 h-3.5" />,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
  },
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
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

function getInitials(firstName?: string, lastName?: string): string {
  return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase()
}

// Compact display for application questions and answers in the Applied stage
function ApplicationAnswersSection({
  questions,
  answers,
  coveringStatement,
}: {
  questions: ApplicationQuestion[]
  answers: ApplicationAnswer[]
  coveringStatement?: string | null
}) {
  if ((!questions || questions.length === 0) && !coveringStatement) {
    return null
  }

  // Sort questions by order
  const sortedQuestions = [...questions].sort((a, b) => a.order - b.order)

  // Create a map of question ID to answer for quick lookup
  const answersByQuestionId = new Map<string, ApplicationAnswer>()
  answers.forEach(answer => {
    if (answer.question?.id) {
      answersByQuestionId.set(answer.question.id, answer)
    }
  })

  const renderAnswerValue = (question: ApplicationQuestion, answer: ApplicationAnswer | undefined) => {
    const answer_text = answer?.answer_text
    const answer_file = answer?.answer_file

    // No answer provided
    if (!answer) {
      return <span className="text-xs text-gray-400 italic">Not answered</span>
    }

    // Handle file answers
    if (question.question_type === QuestionType.FILE) {
      if (answer_file) {
        return (
          <a
            href={answer_file}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800"
          >
            <Paperclip className="w-3.5 h-3.5" />
            View file
          </a>
        )
      }
      if (answer_text) {
        return (
          <a
            href={answer_text}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800"
          >
            <Link className="w-3.5 h-3.5" />
            {answer_text.length > 40 ? answer_text.substring(0, 40) + '...' : answer_text}
          </a>
        )
      }
      return <span className="text-xs text-gray-400 italic">No file uploaded</span>
    }

    // Handle external links
    if (question.question_type === QuestionType.EXTERNAL_LINK) {
      if (answer_text) {
        return (
          <a
            href={answer_text}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            {answer_text.length > 40 ? answer_text.substring(0, 40) + '...' : answer_text}
          </a>
        )
      }
      return <span className="text-xs text-gray-400 italic">No link provided</span>
    }

    // Handle multi-select (comma-separated values displayed as tags)
    if (question.question_type === QuestionType.MULTI_SELECT && answer_text) {
      const values = answer_text.split(',').filter(Boolean)
      if (values.length === 0) {
        return <span className="text-xs text-gray-400 italic">No selection</span>
      }
      return (
        <div className="flex flex-wrap gap-1">
          {values.slice(0, 3).map((value, idx) => (
            <span
              key={idx}
              className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium text-gray-600 bg-gray-100 rounded"
            >
              {value.trim()}
            </span>
          ))}
          {values.length > 3 && (
            <span className="text-[10px] text-gray-500">+{values.length - 3} more</span>
          )}
        </div>
      )
    }

    // Handle select (single value)
    if (question.question_type === QuestionType.SELECT && answer_text) {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium text-gray-600 bg-gray-100 rounded">
          {answer_text}
        </span>
      )
    }

    // Handle text/textarea
    if (answer_text) {
      const truncated = answer_text.length > 100
        ? answer_text.substring(0, 100) + '...'
        : answer_text
      return <p className="text-xs text-gray-700">{truncated}</p>
    }

    return <span className="text-xs text-gray-400 italic">No answer</span>
  }

  return (
    <div className="space-y-3">
      {/* Covering Statement */}
      {coveringStatement && (
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs font-medium text-gray-700">Cover Letter / Statement</span>
          </div>
          <p className="text-xs text-gray-600 whitespace-pre-wrap">
            {coveringStatement.length > 300
              ? coveringStatement.substring(0, 300) + '...'
              : coveringStatement}
          </p>
        </div>
      )}

      {/* Application Questions & Answers */}
      {sortedQuestions.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs font-medium text-gray-700">Application Questions</span>
            <span className="text-[10px] text-gray-400">({sortedQuestions.length})</span>
          </div>
          <div className="space-y-3">
            {sortedQuestions.map((question) => {
              const answer = answersByQuestionId.get(question.id)
              const hasAnswer = !!answer && (!!answer.answer_text || !!answer.answer_file)
              return (
                <div
                  key={question.id}
                  className={`border-l-2 pl-3 ${hasAnswer ? 'border-green-200' : 'border-gray-100'}`}
                >
                  <p className="text-xs font-medium text-gray-800 mb-1">
                    {question.question_text}
                    {question.is_required && (
                      <span className="text-red-500 ml-0.5">*</span>
                    )}
                  </p>
                  <div>{renderAnswerValue(question, answer)}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// Simple completed timeline item
function TimelineItem({
  label,
  date,
  isFirst,
  isCancelled,
  children,
  onExpand,
  isExpanded,
}: {
  label: string
  date: string | null
  isFirst?: boolean
  isCancelled?: boolean
  children?: React.ReactNode
  onExpand?: () => void
  isExpanded?: boolean
}) {
  return (
    <div className="relative">
      {!isFirst && (
        <div className={`absolute left-3 -top-3 w-0.5 h-3 ${isCancelled ? 'bg-gray-200' : 'bg-green-300'}`} />
      )}

      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
          isCancelled ? 'bg-gray-100' : 'bg-green-100'
        }`}>
          {isCancelled ? (
            <X className="w-3.5 h-3.5 text-gray-400" />
          ) : (
            <Check className="w-3.5 h-3.5 text-green-600" />
          )}
        </div>

        <div className="flex-1 min-w-0 pb-4">
          <div
            className={`flex items-center justify-between gap-2 ${onExpand ? 'cursor-pointer' : ''}`}
            onClick={onExpand}
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-sm font-medium ${isCancelled ? 'text-gray-400' : 'text-gray-900'}`}>
                {label}
              </span>
              {date && (
                <span className="text-xs text-gray-500">{formatDate(date)}</span>
              )}
              {isCancelled && (
                <span className="text-xs text-gray-400">(Cancelled)</span>
              )}
            </div>

            {onExpand && (
              <button className="p-1 text-gray-400 hover:text-gray-600 rounded">
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            )}
          </div>

          {isExpanded && children && (
            <div className="mt-3">{children}</div>
          )}
        </div>
      </div>
    </div>
  )
}

// Interview stage card (for current stage with actions, or completed with details)
function InterviewStageCard({
  instance,
  isCurrent,
  isExpanded,
  onToggle,
  applicationId,
  isRecruiterView,
  currentUserId,
  onSchedule,
  onReschedule,
  onCancel,
  onComplete,
  onAssignAssessment,
}: {
  instance: ApplicationStageInstance
  isCurrent: boolean
  isExpanded: boolean
  onToggle: () => void
  applicationId: string
  isRecruiterView: boolean
  currentUserId?: string
  onSchedule?: (instance: ApplicationStageInstance) => void
  onReschedule?: (instance: ApplicationStageInstance) => void
  onCancel?: (instance: ApplicationStageInstance) => void
  onComplete?: (instance: ApplicationStageInstance) => void
  onAssignAssessment?: (instance: ApplicationStageInstance) => void
}) {
  const config = StageTypeConfig[instance.stage_template.stage_type]
  const isCancelled = instance.status === StageInstanceStatus.CANCELLED
  const isCompleted = instance.status === StageInstanceStatus.COMPLETED
  const isScheduled = instance.status === StageInstanceStatus.SCHEDULED
  const isNotStarted = instance.status === StageInstanceStatus.NOT_STARTED
  const isInProgress = instance.status === StageInstanceStatus.IN_PROGRESS
  const isSubmitted = instance.status === StageInstanceStatus.SUBMITTED

  const scheduledInfo = formatDateTime(instance.scheduled_at)
  const completedInfo = formatDateTime(instance.completed_at)
  const interviewer = instance.interviewer
  const hasScore = instance.score !== null && instance.score !== undefined

  return (
    <div className="relative">
      <div className={`absolute left-3 -top-3 w-0.5 h-3 ${
        isCurrent ? 'bg-amber-300' : isCancelled ? 'bg-gray-200' : 'bg-green-300'
      }`} />

      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
          isCurrent
            ? 'bg-amber-100 ring-2 ring-amber-400'
            : isCancelled
              ? 'bg-gray-100'
              : 'bg-green-100'
        }`}>
          {isCurrent ? (
            <Play className="w-3 h-3 text-amber-600" />
          ) : isCancelled ? (
            <X className="w-3.5 h-3.5 text-gray-400" />
          ) : (
            <Check className="w-3.5 h-3.5 text-green-600" />
          )}
        </div>

        <div className="flex-1 min-w-0 pb-4">
          <div
            className={`bg-white border rounded-lg overflow-hidden transition-colors ${
              isCurrent
                ? 'border-amber-200 shadow-sm'
                : isCancelled
                  ? 'border-gray-200 opacity-60'
                  : 'border-gray-200 hover:border-gray-300 cursor-pointer'
            }`}
            onClick={!isCurrent ? onToggle : undefined}
          >
            {/* Header */}
            <div className={`p-3 ${isCurrent ? 'bg-amber-50' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {/* Title row */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900">
                      {instance.stage_template.name}
                    </span>
                    <StageTypeBadge stageType={instance.stage_template.stage_type} size="sm" />
                    {isCurrent && (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        isScheduled ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {StageInstanceStatusLabels[instance.status]}
                      </span>
                    )}
                  </div>

                  {/* Date and time */}
                  {!isCancelled && (scheduledInfo || completedInfo) && (
                    <div className="flex items-center gap-3 mt-1.5">
                      <div className="flex items-center gap-1.5 text-xs text-gray-600">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        <span>{(completedInfo || scheduledInfo)?.date}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-600">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        <span>{(completedInfo || scheduledInfo)?.time}</span>
                      </div>
                      {instance.duration_minutes && (
                        <span className="text-xs text-gray-500">
                          ({instance.duration_minutes} min)
                        </span>
                      )}
                    </div>
                  )}

                  {/* Interviewer and Score */}
                  {!isCancelled && (interviewer || hasScore) && (
                    <div className="flex items-center gap-4 mt-2">
                      {interviewer && (
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-medium text-gray-600">
                            {getInitials(interviewer.first_name, interviewer.last_name)}
                          </div>
                          <span className="text-xs text-gray-600">
                            {interviewer.first_name} {interviewer.last_name}
                          </span>
                        </div>
                      )}

                      {hasScore && (
                        <div className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                          <span className="text-xs font-medium text-gray-700">
                            {instance.score}/10
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Meeting link / Location */}
                  {isCurrent && !isCancelled && (instance.meeting_link || instance.location) && (
                    <div className="flex items-center gap-4 mt-2">
                      {instance.meeting_link && (
                        <a
                          href={instance.meeting_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800"
                        >
                          <Video className="w-3.5 h-3.5" />
                          Join Meeting
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {instance.location && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-600">
                          <MapPin className="w-3.5 h-3.5 text-gray-400" />
                          <span>{instance.location}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Expand toggle for completed stages */}
                {!isCurrent && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggle()
                    }}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded flex-shrink-0"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>

            {/* Actions for current stage */}
            {isCurrent && isRecruiterView && (
              <div className="px-3 py-2 bg-gray-50 border-t border-gray-100 flex flex-wrap gap-2">
                {isNotStarted && config.isAssessment && onAssignAssessment && (
                  <button
                    onClick={() => onAssignAssessment(instance)}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-orange-600 rounded hover:bg-orange-700"
                  >
                    Assign Assessment
                  </button>
                )}

                {isNotStarted && config.requiresScheduling && onSchedule && (
                  <button
                    onClick={() => onSchedule(instance)}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-gray-900 rounded hover:bg-gray-800"
                  >
                    Schedule Interview
                  </button>
                )}

                {isScheduled && onReschedule && (
                  <button
                    onClick={() => onReschedule(instance)}
                    className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded hover:bg-gray-50"
                  >
                    Reschedule
                  </button>
                )}

                {isScheduled && onCancel && (
                  <button
                    onClick={() => onCancel(instance)}
                    className="px-3 py-1.5 text-xs font-medium text-red-600 bg-white border border-red-200 rounded hover:bg-red-50"
                  >
                    Cancel
                  </button>
                )}

                {(isScheduled || isInProgress || isSubmitted) && onComplete && (
                  <button
                    onClick={() => onComplete(instance)}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700"
                  >
                    Mark Complete
                  </button>
                )}
              </div>
            )}

            {/* Feedback section - always show for current, expandable for completed */}
            {(isCurrent || isExpanded) && !isCancelled && (
              <div className="px-3 py-3 border-t border-gray-100">
                <FeedbackThread
                  applicationId={applicationId}
                  stageInstanceId={instance.id}
                  isRecruiterView={isRecruiterView}
                  currentUserId={currentUserId}
                />
              </div>
            )}
          </div>
        </div>
      </div>
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
  questions,
  answers,
  coveringStatement,
  onSchedule,
  onReschedule,
  onCancel,
  onComplete,
  onAssignAssessment,
  isRecruiterView = false,
  currentUserId,
}: FullPipelineTimelineProps) {
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set())

  // Sort stage instances by order
  const sortedInstances = [...stageInstances].sort(
    (a, b) => a.stage_template.order - b.stage_template.order
  )

  // Determine status flags
  const isApplied = applicationStatus === ApplicationStatus.APPLIED
  const isShortlisted = applicationStatus === ApplicationStatus.SHORTLISTED
  const isInProgress = applicationStatus === ApplicationStatus.IN_PROGRESS
  const isOfferMade = applicationStatus === ApplicationStatus.OFFER_MADE
  const isHired = applicationStatus === ApplicationStatus.OFFER_ACCEPTED
  const isRejected = applicationStatus === ApplicationStatus.REJECTED
  const isOfferDeclined = applicationStatus === ApplicationStatus.OFFER_DECLINED

  const toggleStage = (id: string) => {
    setExpandedStages(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Filter stages: show completed/cancelled and current
  const completedStages = sortedInstances.filter(
    inst => inst.status === StageInstanceStatus.COMPLETED || inst.status === StageInstanceStatus.CANCELLED
  )

  const currentStage = currentStageOrder != null
    ? sortedInstances.find(
        inst => inst.stage_template.order === currentStageOrder &&
        inst.status !== StageInstanceStatus.COMPLETED &&
        inst.status !== StageInstanceStatus.CANCELLED
      )
    : null

  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
        <span className="text-sm font-medium text-gray-900">Pipeline History</span>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_CONFIG[applicationStatus]?.bgColor} ${STATUS_CONFIG[applicationStatus]?.color}`}>
          {STATUS_CONFIG[applicationStatus]?.label}
        </span>
      </div>

      {/* Timeline */}
      <div className="space-y-0">
        {/* Applied */}
        <TimelineItem
          label="Applied"
          date={appliedAt}
          isFirst={true}
          isExpanded={expandedStages.has('applied')}
          onExpand={() => toggleStage('applied')}
        >
          <div className="space-y-3">
            {/* Application Answers */}
            <ApplicationAnswersSection
              questions={questions || []}
              answers={answers || []}
              coveringStatement={coveringStatement}
            />

            {/* Feedback Thread */}
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <FeedbackThread
                applicationId={applicationId}
                stageType={StageFeedbackType.APPLIED}
                isRecruiterView={isRecruiterView}
                currentUserId={currentUserId}
              />
            </div>
          </div>
        </TimelineItem>

        {/* Shortlisted */}
        {!isApplied && (
          <TimelineItem
            label="Shortlisted"
            date={shortlistedAt}
            isExpanded={expandedStages.has('shortlisted')}
            onExpand={() => toggleStage('shortlisted')}
          >
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <FeedbackThread
                applicationId={applicationId}
                stageType={StageFeedbackType.SHORTLISTED}
                isRecruiterView={isRecruiterView}
                currentUserId={currentUserId}
              />
            </div>
          </TimelineItem>
        )}

        {/* Completed Interview Stages */}
        {completedStages.map((instance) => (
          <InterviewStageCard
            key={instance.id}
            instance={instance}
            isCurrent={false}
            isExpanded={expandedStages.has(instance.id)}
            onToggle={() => toggleStage(instance.id)}
            applicationId={applicationId}
            isRecruiterView={isRecruiterView}
            currentUserId={currentUserId}
          />
        ))}

        {/* Current Interview Stage */}
        {isInProgress && currentStage && (
          <InterviewStageCard
            instance={currentStage}
            isCurrent={true}
            isExpanded={true}
            onToggle={() => {}}
            applicationId={applicationId}
            isRecruiterView={isRecruiterView}
            currentUserId={currentUserId}
            onSchedule={onSchedule}
            onReschedule={onReschedule}
            onCancel={onCancel}
            onComplete={onComplete}
            onAssignAssessment={onAssignAssessment}
          />
        )}

        {/* Offer Made */}
        {(isOfferMade || isHired) && (
          <TimelineItem
            label="Offer Made"
            date={offerMadeAt}
          />
        )}

        {/* Hired */}
        {isHired && (
          <div className="relative">
            <div className="absolute left-3 -top-3 w-0.5 h-3 bg-emerald-300" />
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 ring-2 ring-emerald-400 flex items-center justify-center">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                  <span className="text-sm font-semibold text-emerald-800">Hired</span>
                  {offerAcceptedAt && (
                    <span className="text-xs text-emerald-600 ml-2">{formatDate(offerAcceptedAt)}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Rejected / Offer Declined */}
        {(isRejected || isOfferDeclined) && (
          <div className="relative">
            <div className="absolute left-3 -top-3 w-0.5 h-3 bg-red-200" />
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
                <Ban className="w-3.5 h-3.5 text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <span className="text-sm font-medium text-red-800">
                    {isOfferDeclined ? 'Offer Declined' : 'Rejected'}
                  </span>
                  {rejectedAt && (
                    <span className="text-xs text-red-600 ml-2">{formatDate(rejectedAt)}</span>
                  )}
                  {rejectionReason && (
                    <p className="text-xs text-red-600 mt-1">{rejectionReason}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
