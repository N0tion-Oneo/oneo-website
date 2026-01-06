import {
  MessageSquare,
  Phone,
  Calendar,
  Mail,
  UserPlus,
  ArrowRight,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Briefcase,
  User,
  LogIn,
  Upload,
  Star,
  Send,
  Video,
  MapPin,
  Users,
  ExternalLink,
  Link,
  RefreshCw,
  RotateCcw,
  ClipboardCheck,
  GraduationCap,
  Eye,
} from 'lucide-react'
import type { TimelineEntry as TimelineEntryType, TimelineSource } from '@/types'
import { formatDistanceToNow, format, parseISO } from 'date-fns'

interface TimelineEntryProps {
  entry: TimelineEntryType
  isCompact?: boolean
}

// Source badge colors
const sourceBadgeColors: Record<TimelineSource, string> = {
  lead_activity: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700',
  onboarding_history: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700',
  activity_log: 'bg-green-100 dark:bg-green-900/30 text-green-700',
  candidate_activity: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700',
  booking: 'bg-pink-100 dark:bg-pink-900/30 text-pink-700',
  stage_feedback: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700',
  task: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700',
}

const sourceLabels: Record<TimelineSource, string> = {
  lead_activity: 'Lead',
  onboarding_history: 'Onboarding',
  activity_log: 'Application',
  candidate_activity: 'Candidate',
  booking: 'Meeting',
  stage_feedback: 'Feedback',
  task: 'Task',
}

// Activity type icons
const activityIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  note: MessageSquare,
  call: Phone,
  meeting_scheduled: Calendar,
  meeting_completed: CheckCircle,
  meeting_cancelled: XCircle,
  meeting_pending: Clock,
  email: Mail,
  invitation: Send,
  stage_change: ArrowRight,
  application: FileText,
  shortlist: Star,
  offer: Briefcase,
  offer_accepted: CheckCircle,
  rejection: XCircle,
  profile_update: User,
  document: Upload,
  login: LogIn,
  logged_in: LogIn,
  assignment: UserPlus,
  conversion: CheckCircle,
  created: FileText,
  feedback: MessageSquare,
  task_completed: CheckCircle,
  // Additional activity types from ActivityTimeline
  booking_link_sent: Link,
  interview_booked: Calendar,
  interview_scheduled: Calendar,
  interview_rescheduled: RefreshCw,
  interview_cancelled: XCircle,
  assessment_assigned: ClipboardCheck,
  assessment_submitted: Upload,
  stage_completed: CheckCircle,
  stage_reopened: RotateCcw,
  // Experience and education
  experience_added: Briefcase,
  experience_updated: Briefcase,
  education_added: GraduationCap,
  education_updated: GraduationCap,
  // Views (normalized by backend)
  view: Eye,
  profile_viewed: Eye,
  job_viewed: Eye,
}

// Activity type colors for icon backgrounds
const activityColors: Record<string, string> = {
  note: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
  call: 'bg-green-100 dark:bg-green-900/30 text-green-600',
  meeting_scheduled: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600',
  meeting_completed: 'bg-green-100 dark:bg-green-900/30 text-green-600',
  meeting_cancelled: 'bg-red-100 dark:bg-red-900/30 text-red-600',
  meeting_pending: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600',
  email: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600',
  invitation: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600',
  stage_change: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600',
  application: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600',
  shortlist: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600',
  offer: 'bg-green-100 dark:bg-green-900/30 text-green-600',
  offer_accepted: 'bg-green-100 dark:bg-green-900/30 text-green-600',
  rejection: 'bg-red-100 dark:bg-red-900/30 text-red-600',
  profile_update: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
  document: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600',
  login: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
  logged_in: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
  assignment: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600',
  conversion: 'bg-green-100 dark:bg-green-900/30 text-green-600',
  created: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600',
  feedback: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600',
  task_completed: 'bg-teal-100 dark:bg-teal-900/30 text-teal-600',
  // Additional activity types
  booking_link_sent: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600',
  interview_booked: 'bg-green-100 dark:bg-green-900/30 text-green-600',
  interview_scheduled: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600',
  interview_rescheduled: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600',
  interview_cancelled: 'bg-red-100 dark:bg-red-900/30 text-red-600',
  assessment_assigned: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600',
  assessment_submitted: 'bg-green-100 dark:bg-green-900/30 text-green-600',
  stage_completed: 'bg-green-100 dark:bg-green-900/30 text-green-600',
  stage_reopened: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600',
  // Experience and education
  experience_added: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600',
  experience_updated: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600',
  education_added: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600',
  education_updated: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600',
  // Views (normalized by backend)
  view: 'bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500',
  profile_viewed: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600',
  job_viewed: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600',
}

// Format a value for display (handles arrays, nulls, etc.)
const formatChangeValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '(empty)'
  if (Array.isArray(value)) return value.join(', ') || '(none)'
  return String(value)
}

// Generate contextual timeline label from entry data
function getTimelineLabel(entry: TimelineEntryType): string {
  const performer = entry.performed_by?.name || 'System'
  const metadata = entry.metadata || {}
  const activityType = entry.activity_type

  // Stage name from various possible metadata fields
  const stageName = (metadata.stage_name || metadata.new_stage || metadata.to_stage_name) as string | undefined
  const fromStage = (metadata.old_stage || metadata.from_stage || metadata.from_stage_name || metadata.previous_stage) as string | undefined
  const toStage = (metadata.new_stage || metadata.to_stage || metadata.to_stage_name) as string | undefined
  const jobTitle = (metadata.job_title || metadata.application_job_title) as string | undefined

  // Handle stage_change with specific actions
  if (activityType === 'stage_change' && metadata.action) {
    switch (metadata.action) {
      case 'completed':
        return `${performer} completed ${stageName || 'stage'}`
      case 'reopened':
        return `${performer} reopened ${stageName || 'stage'}`
      case 'assessment_assigned':
        return `${performer} assigned assessment for ${stageName || 'stage'}`
      case 'assessment_submitted':
        return `Candidate submitted ${stageName || 'assessment'}`
    }
  }

  switch (activityType) {
    // Application events
    case 'application':
      return jobTitle ? `${performer} applied for ${jobTitle}` : `${performer} submitted application`
    case 'shortlist':
      return jobTitle ? `${performer} shortlisted for ${jobTitle}` : `${performer} shortlisted candidate`
    case 'stage_change':
      if (fromStage && toStage) {
        return `${performer} moved from ${fromStage} to ${toStage}`
      } else if (toStage) {
        return `${performer} moved to ${toStage}`
      } else if (stageName) {
        return `${performer} changed stage to ${stageName}`
      }
      return `${performer} changed stage`
    case 'offer':
      return `${performer} made an offer`
    case 'offer_accepted':
      return `${performer} accepted the offer`
    case 'rejection':
      return `${performer} rejected application`
    case 'withdrawn':
      return `${performer} withdrew application`

    // Meeting/booking events
    case 'meeting_scheduled':
      return stageName ? `${performer} scheduled ${stageName}` : `${performer} scheduled a meeting`
    case 'meeting_completed':
      return stageName ? `${performer} completed ${stageName}` : `${performer} completed meeting`
    case 'meeting_cancelled':
      return stageName ? `${performer} cancelled ${stageName}` : `${performer} cancelled meeting`
    case 'meeting_pending':
      return stageName ? `${stageName} pending confirmation` : 'Meeting pending confirmation'

    // Notes and calls
    case 'note':
      return `${performer} added a note`
    case 'call':
      return `${performer} logged a call`

    // Invitations and conversions
    case 'invitation':
      return `${performer} sent an invitation`
    case 'conversion':
      return `${performer} converted lead to company`
    case 'assignment':
      return `${performer} updated assignment`
    case 'created':
      return `${performer} created record`

    // Profile updates
    case 'profile_update': {
      const changes = metadata.changes as Array<{ label: string }> | undefined
      if (changes && changes.length > 0) {
        const labels = changes.slice(0, 2).map(c => c.label).join(', ')
        return `${performer} updated ${labels}${changes.length > 2 ? ` +${changes.length - 2} more` : ''}`
      }
      return `${performer} updated profile`
    }

    // Documents
    case 'document': {
      const filename = metadata.filename as string | undefined
      const expCount = metadata.experiences_count as number | undefined
      if (expCount !== undefined) {
        return filename ? `${performer} imported resume: ${filename}` : `${performer} imported resume data`
      }
      return filename ? `${performer} uploaded ${filename}` : `${performer} uploaded document`
    }

    // Views and logins (usually de-emphasized)
    case 'view':
      return `${performer} viewed`
    case 'login':
      return `${performer} logged in`

    // Feedback
    case 'feedback': {
      const feedbackStage = metadata.stage_name as string | undefined
      return feedbackStage ? `${performer} added feedback on ${feedbackStage}` : `${performer} added feedback`
    }

    // Task completion
    case 'task_completed': {
      const taskTitle = metadata.task_title as string | undefined
      return taskTitle ? `${performer} completed task: ${taskTitle}` : `${performer} completed a task`
    }

    // Email
    case 'email':
      return `${performer} sent an email`

    default:
      // Fall back to the backend-provided title if we don't have a specific handler
      return entry.title || activityType
  }
}

// Get rich metadata display for entries with detailed info
function getRichMetadataDisplay(entry: TimelineEntryType): React.ReactNode | null {
  const metadata = entry.metadata || {}
  const activityType = entry.activity_type

  // Handle stage changes with From → To display
  if (activityType === 'stage_change' && (metadata.old_stage || metadata.new_stage || metadata.from_stage || metadata.to_stage)) {
    const fromStage = (metadata.old_stage || metadata.from_stage) as string | undefined
    const toStage = (metadata.new_stage || metadata.to_stage) as string | undefined
    const stageName = metadata.stage_name as string | undefined
    const action = metadata.action as string | undefined

    // Check for stage completion with feedback
    if (action === 'completed' && (metadata.feedback || metadata.score)) {
      const feedback = metadata.feedback as string
      const score = metadata.score as number
      const recommendation = metadata.recommendation as string

      return (
        <div className="mt-2 p-2.5 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-md space-y-2">
          {/* Stage completed badge */}
          <div className="flex items-center gap-2">
            <CheckCircle className="w-3.5 h-3.5 text-green-600" />
            <span className="text-[12px] font-medium text-green-700">
              {stageName || toStage} completed
            </span>
          </div>
          {score && (
            <div className="flex items-center gap-2">
              <Star className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-[12px] text-gray-700 dark:text-gray-300">
                <span className="font-medium">Score:</span> {score}/10
              </span>
            </div>
          )}
          {recommendation && (
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-green-600" />
              <span className="text-[12px] text-gray-700 dark:text-gray-300">
                <span className="font-medium">Recommendation:</span> {recommendation}
              </span>
            </div>
          )}
          {feedback && <p className="text-[12px] text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{feedback}</p>}
        </div>
      )
    }

    // Check for stage reopened
    if (action === 'reopened') {
      const prevStatus = metadata.previous_status as string
      return (
        <div className="mt-2 p-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-md">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-[12px] text-amber-700">
              <span className="font-medium">{stageName}</span> reopened
              {prevStatus && <span className="text-gray-500 dark:text-gray-400"> (was: {prevStatus})</span>}
            </span>
          </div>
        </div>
      )
    }

    // Check for assessment assigned
    if (action === 'assessment_assigned') {
      const deadline = metadata.deadline as string
      return (
        <div className="mt-2 p-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-md">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-[12px] text-blue-700">
              Assessment assigned for <span className="font-medium">{stageName}</span>
            </span>
          </div>
          {deadline && (
            <div className="flex items-center gap-2 mt-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-[12px] text-gray-700 dark:text-gray-300">
                Due: {format(parseISO(deadline), 'MMM d, yyyy h:mm a')}
              </span>
            </div>
          )}
        </div>
      )
    }

    // Default stage change: From → To badges
    if (fromStage && toStage) {
      return (
        <div className="mt-2 p-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-md">
          <div className="flex items-center gap-2">
            <ArrowRight className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 text-[11px] font-medium bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded">
                {fromStage}
              </span>
              <ArrowRight className="w-3 h-3 text-gray-400" />
              <span className="px-2 py-0.5 text-[11px] font-medium bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded">
                {toStage}
              </span>
            </div>
          </div>
        </div>
      )
    }

    // Just moved to a stage (no from stage)
    if (toStage) {
      return (
        <div className="mt-2 p-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-md">
          <div className="flex items-center gap-2">
            <ArrowRight className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-[12px] text-gray-700 dark:text-gray-300">
              Moved to <span className="font-medium text-blue-700">{toStage}</span>
            </span>
          </div>
        </div>
      )
    }
  }

  // Handle profile updates with detailed changes
  if (activityType === 'profile_update' && metadata.changes) {
    const changes = metadata.changes as Array<{ field: string; label: string; old: unknown; new: unknown }>
    if (changes.length > 0) {
      return (
        <div className="mt-2 p-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-md">
          <div className="space-y-2">
            {changes.slice(0, 3).map((change, index) => (
              <div key={index} className="text-[12px]">
                <span className="font-medium text-gray-700 dark:text-gray-300">{change.label}:</span>
                <div className="flex items-center gap-2 mt-0.5 pl-2">
                  <span className="text-gray-500 dark:text-gray-400 line-through">{formatChangeValue(change.old)}</span>
                  <ArrowRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-900 dark:text-gray-100">{formatChangeValue(change.new)}</span>
                </div>
              </div>
            ))}
            {changes.length > 3 && (
              <p className="text-[11px] text-gray-500 dark:text-gray-400">+{changes.length - 3} more changes</p>
            )}
          </div>
        </div>
      )
    }
  }

  // Handle stage completed with feedback/score
  if ((activityType === 'stage_completed' || activityType === 'feedback') && (metadata.feedback || metadata.score)) {
    const feedback = metadata.feedback as string
    const score = metadata.score as number
    const recommendation = metadata.recommendation as string

    return (
      <div className="mt-2 p-2.5 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-md space-y-1.5">
        {score && (
          <div className="flex items-center gap-2">
            <Star className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-[12px] text-gray-700 dark:text-gray-300">
              <span className="font-medium">Score:</span> {score}/10
            </span>
          </div>
        )}
        {recommendation && (
          <div className="flex items-center gap-2">
            <CheckCircle className="w-3.5 h-3.5 text-green-600" />
            <span className="text-[12px] text-gray-700 dark:text-gray-300">
              <span className="font-medium">Recommendation:</span> {recommendation}
            </span>
          </div>
        )}
        {feedback && <p className="text-[12px] text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{feedback}</p>}
      </div>
    )
  }

  // Handle booking link sent
  if (activityType === 'booking_link_sent' || (entry.source === 'lead_activity' && metadata.booking_url)) {
    const bookingUrl = metadata.booking_url as string
    const expiresAt = metadata.expires_at as string
    const isUsed = metadata.is_used as boolean

    return (
      <div className="mt-2 p-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-md space-y-1.5">
        {expiresAt && (
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-[12px] text-gray-700 dark:text-gray-300">
              Expires {format(parseISO(expiresAt), 'MMM d, yyyy h:mm a')}
            </span>
          </div>
        )}
        {isUsed !== undefined && (
          <div className="flex items-center gap-2">
            {isUsed ? (
              <>
                <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                <span className="text-[12px] text-green-700">Link used - appointment booked</span>
              </>
            ) : (
              <>
                <Link className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-[12px] text-blue-700">Awaiting booking</span>
              </>
            )}
          </div>
        )}
        {bookingUrl && (
          <a
            href={bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800"
          >
            <ExternalLink className="w-3 h-3" />
            View booking page
          </a>
        )}
      </div>
    )
  }

  // Handle interview/meeting scheduled
  if (
    activityType === 'meeting_scheduled' ||
    activityType === 'interview_booked' ||
    activityType === 'interview_scheduled' ||
    entry.source === 'booking'
  ) {
    const scheduledAt = metadata.scheduled_at as string
    const durationMinutes = metadata.duration_minutes as number
    const meetingLink = metadata.meeting_link as string
    const location = metadata.location as string
    const interviewerName = (metadata.interviewer_name || metadata.attendee_name) as string
    const stageType = metadata.stage_type as string
    const isInPerson = stageType === 'in_person_interview' || stageType === 'in_person_assessment'

    if (!scheduledAt && !meetingLink && !location && !interviewerName) return null

    return (
      <div className="mt-2 p-2.5 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-md space-y-1.5">
        {scheduledAt && (
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-green-600" />
            <span className="text-[12px] text-gray-700 dark:text-gray-300">
              {format(parseISO(scheduledAt), 'EEE, MMM d, yyyy h:mm a')}
              {durationMinutes && ` (${durationMinutes} min)`}
            </span>
          </div>
        )}
        {interviewerName && (
          <div className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-green-600" />
            <span className="text-[12px] text-gray-700 dark:text-gray-300">with {interviewerName}</span>
          </div>
        )}
        {isInPerson && location && (
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-green-600" />
            <span className="text-[12px] text-gray-700 dark:text-gray-300">{location}</span>
          </div>
        )}
        {!isInPerson && meetingLink && (
          <div className="flex items-center gap-2">
            <Video className="w-3.5 h-3.5 text-blue-600" />
            <a
              href={meetingLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[12px] text-blue-600 hover:text-blue-800 underline"
            >
              Join Meeting
            </a>
          </div>
        )}
      </div>
    )
  }

  // Handle interview rescheduled
  if (activityType === 'interview_rescheduled') {
    const oldTime = metadata.old_time as string
    const newTime = metadata.new_time as string
    const reason = metadata.reason as string

    return (
      <div className="mt-2 p-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-md space-y-1.5">
        {oldTime && newTime && (
          <div className="flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-[12px] text-gray-700 dark:text-gray-300">
              <span className="line-through text-gray-400 dark:text-gray-500">
                {format(parseISO(oldTime), 'EEE, MMM d h:mm a')}
              </span>
              {' → '}
              <span className="font-medium">{format(parseISO(newTime), 'EEE, MMM d h:mm a')}</span>
            </span>
          </div>
        )}
        {reason && (
          <div className="flex items-start gap-2">
            <FileText className="w-3.5 h-3.5 text-amber-600 mt-0.5" />
            <span className="text-[12px] text-gray-600 dark:text-gray-400">Reason: {reason}</span>
          </div>
        )}
      </div>
    )
  }

  // Handle offer details
  if ((activityType === 'offer' || activityType === 'offer_accepted') && metadata.offer_details) {
    const offerDetails = metadata.offer_details as Record<string, unknown>
    const salary = offerDetails.annual_salary
    const currency = offerDetails.currency || 'ZAR'

    if (salary) {
      return (
        <div className="mt-2 p-2.5 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-md">
          <div className="flex items-center gap-2">
            <Briefcase className="w-3.5 h-3.5 text-green-600" />
            <span className="text-[12px] text-gray-700 dark:text-gray-300">
              <span className="font-medium">Annual Salary:</span> {String(currency)}{' '}
              {Number(salary).toLocaleString()}
            </span>
          </div>
        </div>
      )
    }
  }

  // Handle rejection
  if (activityType === 'rejection' && (metadata.rejection_reason || metadata.rejection_feedback)) {
    const reason = metadata.rejection_reason as string | undefined
    const feedback = metadata.rejection_feedback as string | undefined
    return (
      <div className="mt-2 p-2.5 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-md space-y-1">
        {reason && (
          <p className="text-[12px] text-gray-700 dark:text-gray-300">
            <span className="font-medium">Reason:</span> {reason.replace(/_/g, ' ')}
          </p>
        )}
        {feedback && <p className="text-[12px] text-gray-600 dark:text-gray-400">{feedback}</p>}
      </div>
    )
  }

  // Handle experience updates with detailed changes
  if ((activityType === 'experience_added' || activityType === 'experience_updated') && metadata.changes) {
    const changes = metadata.changes as Array<{ field: string; label: string; old: unknown; new: unknown }>
    const jobTitle = metadata.job_title as string | undefined
    const company = metadata.company_name as string | undefined

    if (changes.length > 0) {
      return (
        <div className="mt-2 p-2.5 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-md">
          {jobTitle && company && (
            <p className="text-[12px] font-medium text-indigo-700 mb-2">
              {jobTitle} at {company}
            </p>
          )}
          <div className="space-y-2">
            {changes.slice(0, 3).map((change, index) => (
              <div key={index} className="text-[12px]">
                <span className="font-medium text-gray-700 dark:text-gray-300">{change.label}:</span>
                <div className="flex items-center gap-2 mt-0.5 pl-2">
                  <span className="text-gray-500 dark:text-gray-400 line-through">{formatChangeValue(change.old)}</span>
                  <ArrowRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-900 dark:text-gray-100">{formatChangeValue(change.new)}</span>
                </div>
              </div>
            ))}
            {changes.length > 3 && (
              <p className="text-[11px] text-gray-500 dark:text-gray-400">+{changes.length - 3} more changes</p>
            )}
          </div>
        </div>
      )
    }
  }

  // Handle education updates with detailed changes
  if ((activityType === 'education_added' || activityType === 'education_updated') && metadata.changes) {
    const changes = metadata.changes as Array<{ field: string; label: string; old: unknown; new: unknown }>
    const institution = metadata.institution as string | undefined
    const degree = metadata.degree as string | undefined

    if (changes.length > 0) {
      return (
        <div className="mt-2 p-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-md">
          {degree && institution && (
            <p className="text-[12px] font-medium text-amber-700 mb-2">
              {degree} at {institution}
            </p>
          )}
          <div className="space-y-2">
            {changes.slice(0, 3).map((change, index) => (
              <div key={index} className="text-[12px]">
                <span className="font-medium text-gray-700 dark:text-gray-300">{change.label}:</span>
                <div className="flex items-center gap-2 mt-0.5 pl-2">
                  <span className="text-gray-500 dark:text-gray-400 line-through">{formatChangeValue(change.old)}</span>
                  <ArrowRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-900 dark:text-gray-100">{formatChangeValue(change.new)}</span>
                </div>
              </div>
            ))}
            {changes.length > 3 && (
              <p className="text-[11px] text-gray-500 dark:text-gray-400">+{changes.length - 3} more changes</p>
            )}
          </div>
        </div>
      )
    }
  }

  // Handle application activity with job info
  if (activityType === 'application' && metadata.job_title) {
    const jobTitle = metadata.job_title as string
    const companyName = metadata.company_name as string | undefined

    return (
      <div className="mt-2 p-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-md">
        <div className="flex items-center gap-2">
          <Briefcase className="w-3.5 h-3.5 text-blue-600" />
          <span className="text-[12px] text-gray-700 dark:text-gray-300">
            <span className="font-medium">{jobTitle}</span>
            {companyName && <span className="text-gray-500 dark:text-gray-400"> at {companyName}</span>}
          </span>
        </div>
      </div>
    )
  }

  // Handle shortlist with job info
  if (activityType === 'shortlist' && metadata.job_title) {
    const jobTitle = metadata.job_title as string

    return (
      <div className="mt-2 p-2.5 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-800 rounded-md">
        <div className="flex items-center gap-2">
          <Star className="w-3.5 h-3.5 text-yellow-600" />
          <span className="text-[12px] text-gray-700 dark:text-gray-300">
            Shortlisted for <span className="font-medium">{jobTitle}</span>
          </span>
        </div>
      </div>
    )
  }

  // Handle resume parsed with imported data counts
  if (activityType === 'document' && metadata.experiences_count !== undefined) {
    const expCount = metadata.experiences_count as number
    const eduCount = metadata.education_count as number
    const filename = metadata.filename as string | undefined

    return (
      <div className="mt-2 p-2.5 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-md space-y-1.5">
        {filename && (
          <div className="flex items-center gap-2">
            <Upload className="w-3.5 h-3.5 text-green-600" />
            <span className="text-[12px] text-gray-700 dark:text-gray-300">{filename}</span>
          </div>
        )}
        <div className="flex items-center gap-3 text-[12px] text-gray-600 dark:text-gray-400">
          {expCount > 0 && (
            <span className="flex items-center gap-1">
              <Briefcase className="w-3 h-3" />
              {expCount} experience{expCount > 1 ? 's' : ''}
            </span>
          )}
          {eduCount > 0 && (
            <span className="flex items-center gap-1">
              <FileText className="w-3 h-3" />
              {eduCount} education record{eduCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
    )
  }

  return null
}

export function TimelineEntry({ entry, isCompact = false }: TimelineEntryProps) {
  const Icon = activityIcons[entry.activity_type] || MessageSquare
  const iconColor = activityColors[entry.activity_type] || 'bg-gray-100 text-gray-600'

  const formattedTime = formatDistanceToNow(parseISO(entry.created_at), { addSuffix: true })
  const fullDate = format(parseISO(entry.created_at), 'MMM d, yyyy h:mm a')

  // Get rich metadata display
  const richMetadata = getRichMetadataDisplay(entry)

  // Get job title from metadata for badge display
  const jobTitle = entry.metadata?.job_title as string | undefined
  const applicationJob = entry.metadata?.application_job_title as string | undefined
  const displayJobTitle = jobTitle || applicationJob

  // Get stage colors from metadata for stage-specific styling
  const fromStageColor = entry.metadata?.from_stage_color as string | undefined
  const toStageColor = entry.metadata?.to_stage_color as string | undefined
  const stageColor = entry.metadata?.stage_color as string | undefined

  if (isCompact) {
    return (
      <div className="flex items-start gap-2 py-2">
        <div className={`p-1 rounded-full ${iconColor} flex-shrink-0`}>
          <Icon className="w-3 h-3" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-700 dark:text-gray-300 truncate">{getTimelineLabel(entry)}</p>
          <div className="flex items-center gap-2">
            <p className="text-xs text-gray-400 dark:text-gray-500">{formattedTime}</p>
            {displayJobTitle && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 rounded truncate max-w-[100px]">
                {displayJobTitle}
              </span>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Render stage badges with actual stage colors when available
  const renderStageBadges = () => {
    if (entry.activity_type !== 'stage_change') return null

    const fromStage = entry.metadata?.from_stage || entry.metadata?.old_stage || entry.metadata?.previous_stage || entry.metadata?.from_stage_name
    const toStage = entry.metadata?.to_stage || entry.metadata?.new_stage || entry.metadata?.to_stage_name

    if (!fromStage && !toStage) return null

    // Default badge classes when no color is provided
    const defaultFromBadge = 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
    const defaultToBadge = 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'

    return (
      <div className="flex items-center gap-2 mt-1.5">
        {fromStage && (
          <span
            className={`px-2 py-0.5 text-[11px] font-medium rounded ${!fromStageColor ? defaultFromBadge : ''}`}
            style={fromStageColor ? {
              backgroundColor: `${fromStageColor}20`,
              color: fromStageColor,
            } : undefined}
          >
            {String(fromStage)}
          </span>
        )}
        {fromStage && toStage && (
          <ArrowRight className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
        )}
        {toStage && (
          <span
            className={`px-2 py-0.5 text-[11px] font-medium rounded ${!(toStageColor || stageColor) ? defaultToBadge : ''}`}
            style={(toStageColor || stageColor) ? {
              backgroundColor: `${toStageColor || stageColor}20`,
              color: toStageColor || stageColor,
            } : undefined}
          >
            {String(toStage)}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="relative pl-10 py-3">
      {/* Icon - circular like ActivityPanel */}
      <div className={`absolute left-0 top-3 w-8 h-8 rounded-full flex items-center justify-center ${iconColor}`}>
        <Icon className="w-4 h-4" />
      </div>

      {/* Content */}
      <div className="pb-1">
        {/* Header with title and time inline */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] font-medium text-gray-900 dark:text-gray-100">{getTimelineLabel(entry)}</span>
          <span className="text-[12px] text-gray-400 dark:text-gray-500" title={fullDate}>
            {formattedTime}
          </span>
        </div>

        {/* Performer - inline after title like ActivityPanel */}
        {entry.performed_by && (
          <p className="text-[12px] text-gray-500 dark:text-gray-400">by {entry.performed_by.name}</p>
        )}

        {/* Stage badges with colors - for stage_change type */}
        {renderStageBadges()}

        {/* Job badge - show related job if from activity_log or has job context */}
        {displayJobTitle && entry.source !== 'candidate_activity' && (
          <span className="inline-block mt-1.5 px-1.5 py-0.5 text-[10px] font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 rounded">
            {displayJobTitle}
          </span>
        )}

        {/* Content */}
        {entry.content && <p className="mt-1 text-[13px] text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{entry.content}</p>}

        {/* Rich metadata display (for non-stage-change entries or additional stage details) */}
        {entry.activity_type !== 'stage_change' && richMetadata}

        {/* Simple metadata fallback (duration, meeting type) */}
        {!richMetadata && entry.metadata && Object.keys(entry.metadata).length > 0 && (
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex flex-wrap items-center gap-3">
            {Boolean(entry.metadata.duration_minutes) && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {String(entry.metadata.duration_minutes)} minutes
              </span>
            )}
            {Boolean(entry.metadata.meeting_type) && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {String(entry.metadata.meeting_type)}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default TimelineEntry
