import { useState, useMemo } from 'react'
import {
  MessageSquare,
  User,
  ChevronDown,
  ChevronUp,
  Send,
  UserCheck,
  ArrowRight,
  Gift,
  CheckCircle,
  XCircle,
  Eye,
  FileText,
  Filter,
  X,
  Link,
  Calendar,
  CalendarCheck,
  CalendarX,
  RefreshCw,
  RotateCcw,
  ClipboardCheck,
  Upload,
  Star,
  Clock,
  ExternalLink,
  Video,
  MapPin,
  Users,
  LogIn,
  Briefcase,
  GraduationCap,
} from 'lucide-react'
import { useActivityLog, useAddActivityNote } from '@/hooks'
import { ActivityType } from '@/types'
import type { ActivityLogEntry, ActivityNote } from '@/types'

interface ActivityTimelineProps {
  applicationId?: string
  candidateId?: number
}

interface ActivityFilters {
  types: ActivityType[]
  hideViews: boolean
  hasNotesOnly: boolean
  performer: string | null
}

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  [ActivityType.APPLIED]: 'Applied',
  [ActivityType.SHORTLISTED]: 'Shortlisted',
  [ActivityType.STAGE_CHANGED]: 'Stage Changed',
  [ActivityType.OFFER_MADE]: 'Offer Made',
  [ActivityType.OFFER_UPDATED]: 'Offer Updated',
  [ActivityType.OFFER_ACCEPTED]: 'Offer Accepted',
  [ActivityType.REJECTED]: 'Rejected',
  [ActivityType.WITHDRAWN]: 'Withdrawn',
  [ActivityType.APPLICATION_VIEWED]: 'Viewed',
  // Booking/Scheduling activities
  [ActivityType.BOOKING_LINK_SENT]: 'Booking Link Sent',
  [ActivityType.INTERVIEW_BOOKED]: 'Interview Booked',
  [ActivityType.INTERVIEW_SCHEDULED]: 'Interview Scheduled',
  [ActivityType.INTERVIEW_RESCHEDULED]: 'Interview Rescheduled',
  [ActivityType.INTERVIEW_CANCELLED]: 'Interview Cancelled',
  // Candidate activities
  profile_updated: 'Profile Updated',
  profile_viewed: 'Profile Viewed',
  job_viewed: 'Job Viewed',
  logged_in: 'Logged In',
  resume_uploaded: 'Resume Uploaded',
  resume_parsed: 'Resume Imported',
  experience_added: 'Experience Added',
  experience_updated: 'Experience Updated',
  education_added: 'Education Added',
  education_updated: 'Education Updated',
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const getActivityIcon = (type: string, metadata?: Record<string, unknown>) => {
  // Check for specific STAGE_CHANGED actions
  if (type === ActivityType.STAGE_CHANGED && metadata?.action) {
    switch (metadata.action) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'reopened':
        return <RotateCcw className="w-4 h-4 text-amber-600" />
      case 'assessment_assigned':
        return <ClipboardCheck className="w-4 h-4 text-blue-600" />
      case 'assessment_submitted':
        return <Upload className="w-4 h-4 text-green-600" />
    }
  }

  switch (type) {
    case ActivityType.APPLIED:
      return <FileText className="w-4 h-4 text-gray-600" />
    case ActivityType.SHORTLISTED:
      return <UserCheck className="w-4 h-4 text-blue-600" />
    case ActivityType.STAGE_CHANGED:
      return <ArrowRight className="w-4 h-4 text-yellow-600" />
    case ActivityType.OFFER_MADE:
    case ActivityType.OFFER_UPDATED:
      return <Gift className="w-4 h-4 text-purple-600" />
    case ActivityType.OFFER_ACCEPTED:
      return <CheckCircle className="w-4 h-4 text-green-600" />
    case ActivityType.REJECTED:
      return <XCircle className="w-4 h-4 text-red-600" />
    case ActivityType.APPLICATION_VIEWED:
      return <Eye className="w-4 h-4 text-gray-400" />
    case ActivityType.WITHDRAWN:
      return <XCircle className="w-4 h-4 text-orange-600" />
    // Booking/Scheduling activities
    case ActivityType.BOOKING_LINK_SENT:
      return <Link className="w-4 h-4 text-blue-500" />
    case ActivityType.INTERVIEW_BOOKED:
      return <CalendarCheck className="w-4 h-4 text-green-600" />
    case ActivityType.INTERVIEW_SCHEDULED:
      return <Calendar className="w-4 h-4 text-blue-600" />
    case ActivityType.INTERVIEW_RESCHEDULED:
      return <RefreshCw className="w-4 h-4 text-amber-600" />
    case ActivityType.INTERVIEW_CANCELLED:
      return <CalendarX className="w-4 h-4 text-red-500" />
    // Candidate activities
    case 'profile_updated':
      return <User className="w-4 h-4 text-blue-600" />
    case 'profile_viewed':
      return <Eye className="w-4 h-4 text-purple-600" />
    case 'job_viewed':
      return <Briefcase className="w-4 h-4 text-purple-600" />
    case 'logged_in':
      return <LogIn className="w-4 h-4 text-green-600" />
    case 'resume_uploaded':
      return <Upload className="w-4 h-4 text-blue-600" />
    case 'resume_parsed':
      return <FileText className="w-4 h-4 text-green-600" />
    case 'experience_added':
    case 'experience_updated':
      return <Briefcase className="w-4 h-4 text-indigo-600" />
    case 'education_added':
    case 'education_updated':
      return <GraduationCap className="w-4 h-4 text-amber-600" />
    default:
      return <FileText className="w-4 h-4 text-gray-600" />
  }
}

const getActivityColor = (type: string, metadata?: Record<string, unknown>) => {
  // Check for specific STAGE_CHANGED actions
  if (type === ActivityType.STAGE_CHANGED && metadata?.action) {
    switch (metadata.action) {
      case 'completed':
        return 'bg-green-100'
      case 'reopened':
        return 'bg-amber-100'
      case 'assessment_assigned':
        return 'bg-blue-100'
      case 'assessment_submitted':
        return 'bg-green-100'
    }
  }

  switch (type) {
    case ActivityType.APPLIED:
      return 'bg-gray-100'
    case ActivityType.SHORTLISTED:
      return 'bg-blue-100'
    case ActivityType.STAGE_CHANGED:
      return 'bg-yellow-100'
    case ActivityType.OFFER_MADE:
    case ActivityType.OFFER_UPDATED:
      return 'bg-purple-100'
    case ActivityType.OFFER_ACCEPTED:
      return 'bg-green-100'
    case ActivityType.REJECTED:
      return 'bg-red-100'
    case ActivityType.APPLICATION_VIEWED:
      return 'bg-gray-50'
    case ActivityType.WITHDRAWN:
      return 'bg-orange-100'
    // Booking/Scheduling activities
    case ActivityType.BOOKING_LINK_SENT:
      return 'bg-blue-50'
    case ActivityType.INTERVIEW_BOOKED:
      return 'bg-green-100'
    case ActivityType.INTERVIEW_SCHEDULED:
      return 'bg-blue-100'
    case ActivityType.INTERVIEW_RESCHEDULED:
      return 'bg-amber-100'
    case ActivityType.INTERVIEW_CANCELLED:
      return 'bg-red-50'
    // Candidate activities
    case 'profile_updated':
      return 'bg-blue-100'
    case 'profile_viewed':
      return 'bg-purple-100'
    case 'job_viewed':
      return 'bg-purple-100'
    case 'logged_in':
      return 'bg-green-50'
    case 'resume_uploaded':
      return 'bg-blue-100'
    case 'resume_parsed':
      return 'bg-green-100'
    case 'experience_added':
    case 'experience_updated':
      return 'bg-indigo-100'
    case 'education_added':
    case 'education_updated':
      return 'bg-amber-100'
    default:
      return 'bg-gray-100'
  }
}

const formatScheduleTime = (isoString: string | undefined) => {
  if (!isoString) return ''
  try {
    return new Date(isoString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

const getActivityLabel = (activity: ActivityLogEntry) => {
  const performer = activity.performed_by_name || 'System'
  const stageName = activity.stage_name || (activity.metadata?.stage_name as string) || 'interview'

  // Handle STAGE_CHANGED with specific actions
  if (activity.activity_type === ActivityType.STAGE_CHANGED && activity.metadata?.action) {
    switch (activity.metadata.action) {
      case 'completed':
        return `${performer} completed ${stageName}`
      case 'reopened':
        return `${performer} reopened ${stageName}`
      case 'assessment_assigned':
        return `${performer} assigned assessment for ${stageName}`
      case 'assessment_submitted':
        return `Candidate submitted ${stageName} assessment`
    }
  }

  // Cast activity_type to string to handle both enum and string values
  const activityType = activity.activity_type as string

  switch (activityType) {
    case ActivityType.APPLIED:
      return `${performer} submitted application`
    case ActivityType.SHORTLISTED:
      return `${performer} shortlisted this candidate`
    case ActivityType.STAGE_CHANGED:
      if (activity.stage_name) {
        return `${performer} moved to ${activity.stage_name}`
      }
      return `${performer} changed stage`
    case ActivityType.OFFER_MADE:
      return `${performer} made an offer`
    case ActivityType.OFFER_UPDATED:
      return `${performer} updated the offer`
    case ActivityType.OFFER_ACCEPTED:
      return `${performer} accepted the offer`
    case ActivityType.REJECTED:
      return `${performer} rejected this application`
    case ActivityType.APPLICATION_VIEWED:
      return `${performer} viewed this application`
    case ActivityType.WITHDRAWN:
      return `${performer} withdrew application`
    // Booking/Scheduling activities
    case ActivityType.BOOKING_LINK_SENT:
      return `${performer} sent a booking link for ${stageName}`
    case ActivityType.INTERVIEW_BOOKED:
      return `Candidate booked ${stageName}`
    case ActivityType.INTERVIEW_SCHEDULED:
      return `${performer} scheduled ${stageName}`
    case ActivityType.INTERVIEW_RESCHEDULED:
      return `${performer} rescheduled ${stageName}`
    case ActivityType.INTERVIEW_CANCELLED:
      return `${performer} cancelled ${stageName}`
    // Candidate activities
    case 'profile_updated': {
      const fields = activity.metadata?.fields_updated as string[]
      if (fields && fields.length > 0) {
        return `${performer} updated ${fields.join(', ')}`
      }
      return `${performer} updated profile`
    }
    case 'profile_viewed': {
      const viewType = activity.metadata?.view_type as string
      if (performer === 'System' || !performer) {
        return viewType === 'public' ? 'Profile viewed (public)' : 'Profile viewed'
      }
      return `${performer} viewed this profile`
    }
    case 'job_viewed': {
      const jobTitle = activity.metadata?.job_title as string
      return jobTitle ? `Viewed job: ${jobTitle}` : 'Viewed a job posting'
    }
    case 'logged_in':
      return 'Logged in'
    case 'resume_uploaded': {
      const filename = activity.metadata?.filename as string
      return filename ? `Uploaded resume: ${filename}` : 'Uploaded resume'
    }
    case 'resume_parsed': {
      const expCount = activity.metadata?.experiences_count as number
      const eduCount = activity.metadata?.education_count as number
      const parts = []
      if (expCount) parts.push(`${expCount} experience${expCount > 1 ? 's' : ''}`)
      if (eduCount) parts.push(`${eduCount} education record${eduCount > 1 ? 's' : ''}`)
      return parts.length > 0
        ? `Imported resume data: ${parts.join(', ')}`
        : 'Imported resume data'
    }
    case 'experience_added': {
      const jobTitle = activity.metadata?.job_title as string
      const company = activity.metadata?.company_name as string
      return jobTitle && company
        ? `Added experience: ${jobTitle} at ${company}`
        : 'Added work experience'
    }
    case 'experience_updated': {
      const jobTitle = activity.metadata?.job_title as string
      const company = activity.metadata?.company_name as string
      return jobTitle && company
        ? `Updated experience: ${jobTitle} at ${company}`
        : 'Updated work experience'
    }
    case 'education_added': {
      const institution = activity.metadata?.institution as string
      const degree = activity.metadata?.degree as string
      return institution && degree
        ? `Added education: ${degree} at ${institution}`
        : 'Added education'
    }
    case 'education_updated': {
      const institution = activity.metadata?.institution as string
      const degree = activity.metadata?.degree as string
      return institution && degree
        ? `Updated education: ${degree} at ${institution}`
        : 'Updated education'
    }
    default:
      return ACTIVITY_TYPE_LABELS[activityType] || activityType
  }
}

const getSchedulingDetails = (activity: ActivityLogEntry): string | null => {
  const metadata = activity.metadata || {}

  // Handle STAGE_CHANGED with specific actions
  if (activity.activity_type === ActivityType.STAGE_CHANGED && metadata.action) {
    switch (metadata.action) {
      case 'assessment_assigned': {
        const deadline = metadata.deadline as string
        if (deadline) {
          return `Due: ${new Date(deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
        }
        return null
      }
      case 'reopened': {
        const prevStatus = metadata.previous_status as string
        if (prevStatus) {
          return `Previous status: ${prevStatus}`
        }
        return null
      }
    }
  }

  switch (activity.activity_type) {
    case ActivityType.BOOKING_LINK_SENT: {
      const expiresAt = metadata.expires_at as string
      if (expiresAt) {
        return `Expires ${new Date(expiresAt).toLocaleDateString()}`
      }
      return null
    }
    case ActivityType.INTERVIEW_BOOKED:
    case ActivityType.INTERVIEW_SCHEDULED: {
      const scheduledAt = metadata.scheduled_at as string
      const interviewer = metadata.interviewer_name as string
      const parts = []
      if (scheduledAt) {
        parts.push(formatScheduleTime(scheduledAt))
      }
      if (interviewer) {
        parts.push(`with ${interviewer}`)
      }
      return parts.length ? parts.join(' ') : null
    }
    case ActivityType.INTERVIEW_RESCHEDULED: {
      const oldTime = metadata.old_time as string
      const newTime = metadata.new_time as string
      const reason = metadata.reason as string
      const parts = []
      if (oldTime && newTime) {
        parts.push(`${formatScheduleTime(oldTime)} → ${formatScheduleTime(newTime)}`)
      }
      if (reason) {
        parts.push(`Reason: ${reason}`)
      }
      return parts.length ? parts.join('. ') : null
    }
    case ActivityType.INTERVIEW_CANCELLED: {
      const scheduledAt = metadata.scheduled_at as string
      if (scheduledAt) {
        return `Was scheduled for ${formatScheduleTime(scheduledAt)}`
      }
      return null
    }
    default:
      return null
  }
}

// Get rich metadata display for activities with detailed info
const getRichMetadataDisplay = (activity: ActivityLogEntry): React.ReactNode | null => {
  const metadata = activity.metadata || {}

  // Handle completed stage with feedback/score
  if (activity.activity_type === ActivityType.STAGE_CHANGED && metadata.action === 'completed') {
    const feedback = metadata.feedback as string
    const score = metadata.score as number
    const recommendation = metadata.recommendation as string

    if (!feedback && !score && !recommendation) return null

    return (
      <div className="mt-2 p-2.5 bg-green-50 border border-green-200 rounded-md space-y-1.5">
        {score && (
          <div className="flex items-center gap-2">
            <Star className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-[12px] text-gray-700">
              <span className="font-medium">Score:</span> {score}/10
            </span>
          </div>
        )}
        {recommendation && (
          <div className="flex items-center gap-2">
            <CheckCircle className="w-3.5 h-3.5 text-green-600" />
            <span className="text-[12px] text-gray-700">
              <span className="font-medium">Recommendation:</span> {recommendation}
            </span>
          </div>
        )}
        {feedback && (
          <p className="text-[12px] text-gray-600 whitespace-pre-wrap">{feedback}</p>
        )}
      </div>
    )
  }

  // Handle booking link sent with more details
  if (activity.activity_type === ActivityType.BOOKING_LINK_SENT) {
    const bookingUrl = metadata.booking_url as string
    const expiresAt = metadata.expires_at as string
    const isUsed = metadata.is_used as boolean

    return (
      <div className="mt-2 p-2.5 bg-blue-50 border border-blue-200 rounded-md space-y-1.5">
        {expiresAt && (
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-[12px] text-gray-700">
              Expires {new Date(expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
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
                <span className="text-[12px] text-blue-700">Awaiting candidate booking</span>
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

  // Handle interview scheduled/booked with meeting details
  if (
    activity.activity_type === ActivityType.INTERVIEW_SCHEDULED ||
    activity.activity_type === ActivityType.INTERVIEW_BOOKED
  ) {
    const scheduledAt = metadata.scheduled_at as string
    const durationMinutes = metadata.duration_minutes as number
    const meetingLink = metadata.meeting_link as string
    const location = metadata.location as string
    const interviewerName = metadata.interviewer_name as string
    const stageType = metadata.stage_type as string

    // Determine if this is an in-person interview type
    const isInPerson = stageType === 'in_person_interview' || stageType === 'in_person_assessment'

    // Only show if we have meaningful details
    if (!scheduledAt && !meetingLink && !location && !interviewerName) return null

    return (
      <div className="mt-2 p-2.5 bg-green-50 border border-green-200 rounded-md space-y-1.5">
        {scheduledAt && (
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-green-600" />
            <span className="text-[12px] text-gray-700">
              {new Date(scheduledAt).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
              {durationMinutes && ` (${durationMinutes} min)`}
            </span>
          </div>
        )}
        {interviewerName && (
          <div className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-green-600" />
            <span className="text-[12px] text-gray-700">
              with {interviewerName}
            </span>
          </div>
        )}
        {/* For in-person interviews, show location; for virtual, show meeting link */}
        {isInPerson && location && (
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-green-600" />
            <span className="text-[12px] text-gray-700">{location}</span>
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

  // Handle interview rescheduled with old/new times
  if (activity.activity_type === ActivityType.INTERVIEW_RESCHEDULED) {
    const oldTime = metadata.old_time as string
    const newTime = metadata.new_time as string
    const reason = metadata.reason as string
    const meetingLink = metadata.meeting_link as string
    const location = metadata.location as string
    const interviewerName = metadata.interviewer_name as string
    const stageType = metadata.stage_type as string

    // Determine if this is an in-person interview type
    const isInPerson = stageType === 'in_person_interview' || stageType === 'in_person_assessment'

    return (
      <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-md space-y-1.5">
        {oldTime && newTime && (
          <div className="flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-[12px] text-gray-700">
              <span className="line-through text-gray-400">
                {new Date(oldTime).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </span>
              {' → '}
              <span className="font-medium">
                {new Date(newTime).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </span>
            </span>
          </div>
        )}
        {reason && (
          <div className="flex items-start gap-2">
            <FileText className="w-3.5 h-3.5 text-amber-600 mt-0.5" />
            <span className="text-[12px] text-gray-600">Reason: {reason}</span>
          </div>
        )}
        {interviewerName && (
          <div className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-[12px] text-gray-700">with {interviewerName}</span>
          </div>
        )}
        {/* For in-person interviews, show location; for virtual, show meeting link */}
        {isInPerson && location && (
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-[12px] text-gray-700">{location}</span>
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

  return null
}

function NoteItem({ note }: { note: ActivityNote }) {
  return (
    <div className="text-[13px]">
      <div className="flex items-center gap-2">
        <span className="font-medium text-gray-700">
          {note.author_name || 'Unknown'}
        </span>
        <span className="text-gray-400 text-[11px]">
          {formatDate(note.created_at)}
        </span>
      </div>
      <p className="text-gray-600 mt-0.5 whitespace-pre-wrap">{note.content}</p>
    </div>
  )
}

function ActivityEntry({
  activity,
  applicationId,
  candidateId,
  onNoteAdded,
  showViewsNormally,
}: {
  activity: ActivityLogEntry & { source?: 'application' | 'candidate'; job_title?: string }
  applicationId?: string
  candidateId?: number
  onNoteAdded: () => void
  showViewsNormally?: boolean
}) {
  const [isExpanded, setIsExpanded] = useState(activity.notes_count > 0)
  const [isAddingNote, setIsAddingNote] = useState(false)
  const [newNote, setNewNote] = useState('')
  const { addNote, isLoading } = useAddActivityNote({ applicationId, candidateId })

  const handleAddNote = async () => {
    if (!newNote.trim()) return
    try {
      // Use the source from the activity to determine which endpoint to call
      await addNote(activity.id, newNote, activity.source || 'application')
      setNewNote('')
      setIsAddingNote(false)
      onNoteAdded()
    } catch (err) {
      console.error('Failed to add note:', err)
    }
  }

  // Check if this activity has rich metadata display
  const richMetadata = getRichMetadataDisplay(activity)

  // Don't show view events prominently (they clutter the timeline)
  const isViewEvent = activity.activity_type === ActivityType.APPLICATION_VIEWED ||
    (activity.activity_type as string) === 'profile_viewed'
  if (isViewEvent && activity.notes_count === 0 && !showViewsNormally) {
    return (
      <div className="relative flex gap-3 opacity-50">
        <div
          className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center ${getActivityColor(activity.activity_type, activity.metadata)}`}
        >
          {getActivityIcon(activity.activity_type, activity.metadata)}
        </div>
        <div className="flex-1 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <p className="text-[13px] text-gray-500">
                {getActivityLabel(activity)}
              </p>
              {/* Source badge for candidate mode */}
              {candidateId && (
                <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${
                  activity.job_title
                    ? 'bg-blue-50 text-blue-700'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {activity.job_title || 'Profile'}
                </span>
              )}
            </div>
            <span className="text-[11px] text-gray-400">
              {formatDate(activity.created_at)}
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex gap-3">
      {/* Timeline dot */}
      <div
        className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center ${getActivityColor(activity.activity_type, activity.metadata)}`}
      >
        {getActivityIcon(activity.activity_type, activity.metadata)}
      </div>

      {/* Content */}
      <div className="flex-1 pb-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-[14px] font-medium text-gray-900">
              {getActivityLabel(activity)}
            </p>
            {/* Source badge for candidate mode */}
            {candidateId && (
              <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${
                activity.job_title
                  ? 'bg-blue-50 text-blue-700'
                  : 'bg-gray-100 text-gray-500'
              }`}>
                {activity.job_title || 'Profile'}
              </span>
            )}
          </div>
          <span className="text-[11px] text-gray-500 shrink-0 ml-2">
            {formatDate(activity.created_at)}
          </span>
        </div>

        {/* Scheduling details for interview activities */}
        {getSchedulingDetails(activity) && (
          <p className="mt-1 text-[12px] text-gray-600">
            {getSchedulingDetails(activity)}
          </p>
        )}

        {/* Rich metadata display (booking links, completed stages with feedback) */}
        {richMetadata}

        {/* Generic metadata display (offer details, rejection reason, etc.) - only if no rich metadata */}
        {!richMetadata && activity.metadata && Object.keys(activity.metadata).length > 0 && (
          <div className="mt-2 p-2.5 bg-gray-50 rounded-md text-[12px] text-gray-600">
            {activity.metadata.rejection_reason && (
              <p>
                <span className="font-medium">Reason:</span>{' '}
                {String(activity.metadata.rejection_reason).replace(/_/g, ' ')}
              </p>
            )}
            {activity.metadata.rejection_feedback && (
              <p className="mt-1">
                <span className="font-medium">Feedback:</span>{' '}
                {String(activity.metadata.rejection_feedback)}
              </p>
            )}
            {activity.metadata.offer_details &&
              typeof activity.metadata.offer_details === 'object' && (
                <div>
                  {(activity.metadata.offer_details as Record<string, unknown>)
                    .salary && (
                    <p>
                      <span className="font-medium">Salary:</span>{' '}
                      {(
                        activity.metadata.offer_details as Record<
                          string,
                          unknown
                        >
                      ).currency || 'ZAR'}{' '}
                      {Number(
                        (
                          activity.metadata.offer_details as Record<
                            string,
                            unknown
                          >
                        ).salary
                      ).toLocaleString()}
                    </p>
                  )}
                </div>
              )}
          </div>
        )}

        {/* Notes section */}
        {activity.notes_count > 0 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-2 flex items-center gap-1 text-[12px] text-gray-600 hover:text-gray-900"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            {activity.notes_count} note{activity.notes_count > 1 ? 's' : ''}
            {isExpanded ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>
        )}

        {isExpanded && activity.notes.length > 0 && (
          <div className="mt-2 space-y-2 pl-3 border-l-2 border-gray-200">
            {activity.notes.map((note) => (
              <NoteItem key={note.id} note={note} />
            ))}
          </div>
        )}

        {/* Add note button/form */}
        {isAddingNote ? (
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add a note..."
              className="flex-1 px-3 py-1.5 text-[13px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300"
              onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
              autoFocus
            />
            <button
              onClick={handleAddNote}
              disabled={isLoading || !newNote.trim()}
              className="px-3 py-1.5 bg-gray-900 text-white rounded-md disabled:opacity-50 hover:bg-gray-800"
            >
              <Send className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setIsAddingNote(false)
                setNewNote('')
              }}
              className="px-3 py-1.5 text-gray-500 border border-gray-200 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsAddingNote(true)}
            className="mt-2 text-[12px] text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            <MessageSquare className="w-3 h-3" />
            Add note
          </button>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Filter Bar Component
// ============================================================================

interface JobOption {
  id: string
  title: string
}

function ActivityFilterBar({
  filters,
  setFilters,
  performers,
  activityTypes,
  jobs,
  selectedJobId,
  onJobChange,
}: {
  filters: ActivityFilters
  setFilters: (filters: ActivityFilters) => void
  performers: string[]
  activityTypes: ActivityType[]
  jobs?: JobOption[]
  selectedJobId?: string | null
  onJobChange?: (jobId: string | null) => void
}) {
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.types.length > 0 && filters.types.length < activityTypes.length) count++
    if (filters.hideViews) count++
    if (filters.hasNotesOnly) count++
    if (filters.performer) count++
    if (selectedJobId) count++
    return count
  }, [filters, activityTypes.length, selectedJobId])

  const clearFilters = () => {
    setFilters({
      types: [],
      hideViews: false,
      hasNotesOnly: false,
      performer: null,
    })
    if (onJobChange) {
      onJobChange(null)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Quick toggle chips */}
      <button
        onClick={() => setFilters({ ...filters, hideViews: !filters.hideViews })}
        className={`px-2 py-1 text-[11px] rounded-md border transition-colors ${
          filters.hideViews
            ? 'bg-gray-900 text-white border-gray-900'
            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
        }`}
      >
        Hide views
      </button>
      <button
        onClick={() => setFilters({ ...filters, hasNotesOnly: !filters.hasNotesOnly })}
        className={`px-2 py-1 text-[11px] rounded-md border transition-colors ${
          filters.hasNotesOnly
            ? 'bg-gray-900 text-white border-gray-900'
            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
        }`}
      >
        With notes
      </button>

      {/* Divider */}
      <div className="w-px h-5 bg-gray-200" />

      {/* Activity Type dropdown */}
      <select
        value={filters.types.length === 1 ? filters.types[0] : ''}
        onChange={(e) => {
          const value = e.target.value
          setFilters({ ...filters, types: value ? [value as ActivityType] : [] })
        }}
        className={`px-2 py-1 text-[11px] border rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 ${
          filters.types.length > 0
            ? 'bg-gray-900 text-white border-gray-900'
            : 'bg-white text-gray-600 border-gray-200'
        }`}
      >
        <option value="">All types</option>
        {activityTypes
          .filter((type) => type !== ActivityType.APPLICATION_VIEWED || !filters.hideViews)
          .map((type) => (
            <option key={type} value={type}>
              {ACTIVITY_TYPE_LABELS[type]}
            </option>
          ))}
      </select>

      {/* Job Filter (Candidate Mode) */}
      {jobs && jobs.length > 0 && onJobChange && (
        <select
          value={selectedJobId || ''}
          onChange={(e) => onJobChange(e.target.value || null)}
          className={`px-2 py-1 text-[11px] border rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 max-w-[140px] ${
            selectedJobId
              ? 'bg-gray-900 text-white border-gray-900'
              : 'bg-white text-gray-600 border-gray-200'
          }`}
        >
          <option value="">All jobs</option>
          <option value="none">Profile only</option>
          {jobs.map((job) => (
            <option key={job.id} value={job.id}>
              {job.title}
            </option>
          ))}
        </select>
      )}

      {/* Performer Filter */}
      {performers.length > 1 && (
        <select
          value={filters.performer || ''}
          onChange={(e) =>
            setFilters({ ...filters, performer: e.target.value || null })
          }
          className={`px-2 py-1 text-[11px] border rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 max-w-[120px] ${
            filters.performer
              ? 'bg-gray-900 text-white border-gray-900'
              : 'bg-white text-gray-600 border-gray-200'
          }`}
        >
          <option value="">All users</option>
          {performers.map((performer) => (
            <option key={performer} value={performer}>
              {performer}
            </option>
          ))}
        </select>
      )}

      {/* Clear Filters */}
      {activeFilterCount > 0 && (
        <button
          onClick={clearFilters}
          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
          title="Clear all filters"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export default function ActivityTimeline({
  applicationId,
  candidateId,
}: ActivityTimelineProps) {
  // State for job filter in candidate mode
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)

  // Use the appropriate mode based on props
  const { activities, isLoading, error, refetch, jobs } = useActivityLog(
    candidateId
      ? { candidateId, jobId: selectedJobId }
      : { applicationId }
  )

  const isCandidateMode = !!candidateId

  const [filters, setFilters] = useState<ActivityFilters>({
    types: [],
    hideViews: false,
    hasNotesOnly: false,
    performer: null,
  })

  // Extract unique performers and activity types from activities
  const { performers, activityTypes } = useMemo(() => {
    const performerSet = new Set<string>()
    const typeSet = new Set<string>()

    activities.forEach((activity) => {
      if (activity.performed_by_name) {
        performerSet.add(activity.performed_by_name)
      }
      typeSet.add(activity.activity_type as string)
    })

    return {
      performers: Array.from(performerSet).sort(),
      activityTypes: Array.from(typeSet) as ActivityType[],
    }
  }, [activities])

  // Apply filters
  const filteredActivities = useMemo(() => {
    return activities.filter((activity) => {
      // Hide views filter
      if (filters.hideViews && activity.activity_type === ActivityType.APPLICATION_VIEWED) {
        return false
      }

      // Has notes only filter
      if (filters.hasNotesOnly && activity.notes_count === 0) {
        return false
      }

      // Activity type filter
      if (filters.types.length > 0 && !filters.types.includes(activity.activity_type)) {
        return false
      }

      // Performer filter
      if (filters.performer && activity.performed_by_name !== filters.performer) {
        return false
      }

      return true
    })
  }, [activities, filters])

  if (isLoading) {
    return (
      <div className="text-center py-8 text-gray-500 text-[14px]">
        Loading activity...
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-500 text-[14px]">{error}</div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8">
        <User className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-[14px] text-gray-500">No activity yet</p>
        <p className="text-[12px] text-gray-400 mt-1">
          {isCandidateMode
            ? 'Activity will appear here as the candidate engages with jobs'
            : 'Activity will appear here as the application progresses'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with filters */}
      <div className="flex items-center gap-4">
        <h4 className="text-[12px] font-medium text-gray-500 uppercase tracking-wider shrink-0">
          Activity Log
        </h4>
        <ActivityFilterBar
          filters={filters}
          setFilters={setFilters}
          performers={performers}
          activityTypes={activityTypes}
          jobs={isCandidateMode ? jobs : undefined}
          selectedJobId={isCandidateMode ? selectedJobId : undefined}
          onJobChange={isCandidateMode ? setSelectedJobId : undefined}
        />
      </div>

      {/* Results count */}
      {(filters.hideViews || filters.hasNotesOnly || filters.types.length > 0 || filters.performer || selectedJobId) && (
        <p className="text-[12px] text-gray-500">
          Showing {filteredActivities.length} of {activities.length} activities
        </p>
      )}

      {filteredActivities.length === 0 ? (
        <div className="text-center py-8">
          <Filter className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-[13px] text-gray-500">No activities match your filters</p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-3.5 top-4 bottom-4 w-0.5 bg-gray-200" />

          <div className="space-y-0">
            {filteredActivities.map((activity) => (
              <ActivityEntry
                key={activity.id}
                activity={activity as ActivityLogEntry & { source?: 'application' | 'candidate'; job_title?: string }}
                applicationId={applicationId}
                candidateId={candidateId}
                onNoteAdded={refetch}
                showViewsNormally={filters.types.includes(ActivityType.APPLICATION_VIEWED)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
