import {
  Calendar,
  Clock,
  Video,
  User,
  ExternalLink,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react'
import type { OnboardingEntityType, RecruiterBooking } from '@/types'
import { RecruiterBookingStatus } from '@/types'
import { format, parseISO, isPast, isFuture, isToday, formatDistanceToNow } from 'date-fns'

interface MeetingsPanelProps {
  entityType: OnboardingEntityType
  entityId: string
  meetings: RecruiterBooking[]
}

const statusColors: Record<RecruiterBookingStatus, string> = {
  [RecruiterBookingStatus.PENDING]: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700',
  [RecruiterBookingStatus.CONFIRMED]: 'bg-green-100 dark:bg-green-900/30 text-green-700',
  [RecruiterBookingStatus.COMPLETED]: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
  [RecruiterBookingStatus.CANCELLED]: 'bg-red-100 dark:bg-red-900/30 text-red-700',
  [RecruiterBookingStatus.NO_SHOW]: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700',
}

const statusIcons: Record<RecruiterBookingStatus, React.ReactNode> = {
  [RecruiterBookingStatus.PENDING]: <Clock className="w-3 h-3" />,
  [RecruiterBookingStatus.CONFIRMED]: <CheckCircle className="w-3 h-3" />,
  [RecruiterBookingStatus.COMPLETED]: <CheckCircle className="w-3 h-3" />,
  [RecruiterBookingStatus.CANCELLED]: <XCircle className="w-3 h-3" />,
  [RecruiterBookingStatus.NO_SHOW]: <AlertCircle className="w-3 h-3" />,
}

const statusLabels: Record<RecruiterBookingStatus, string> = {
  [RecruiterBookingStatus.PENDING]: 'Pending',
  [RecruiterBookingStatus.CONFIRMED]: 'Confirmed',
  [RecruiterBookingStatus.COMPLETED]: 'Completed',
  [RecruiterBookingStatus.CANCELLED]: 'Cancelled',
  [RecruiterBookingStatus.NO_SHOW]: 'No Show',
}

function MeetingCard({ meeting }: { meeting: RecruiterBooking }) {
  // Handle unscheduled meetings
  if (!meeting.scheduled_at) {
    return (
      <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">
              {meeting.title || meeting.meeting_type_name || 'Meeting'}
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <User className="w-3 h-3" />
              {meeting.attendee_name || 'Unknown'}
            </p>
          </div>
          <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${statusColors[meeting.status]}`}>
            {statusIcons[meeting.status]}
            {statusLabels[meeting.status]}
          </span>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">Not yet scheduled</p>
      </div>
    )
  }

  const scheduledAt = parseISO(meeting.scheduled_at)
  const isUpcoming = isFuture(scheduledAt)
  const isTodayMeeting = isToday(scheduledAt)

  // Determine time display
  let timeDisplay: string
  if (isTodayMeeting) {
    if (isUpcoming) {
      timeDisplay = `Today at ${format(scheduledAt, 'h:mm a')}`
    } else {
      timeDisplay = `Today at ${format(scheduledAt, 'h:mm a')} (${formatDistanceToNow(scheduledAt, { addSuffix: true })})`
    }
  } else if (isUpcoming) {
    timeDisplay = `${format(scheduledAt, 'MMM d')} at ${format(scheduledAt, 'h:mm a')} (${formatDistanceToNow(scheduledAt, { addSuffix: true })})`
  } else {
    timeDisplay = `${format(scheduledAt, 'MMM d, yyyy')} at ${format(scheduledAt, 'h:mm a')}`
  }

  // Get attendee name - RecruiterBooking uses attendee_name and candidate_info
  const attendeeName = meeting.attendee_name
    || meeting.candidate_info?.name
    || 'Unknown'

  const isCancelled = meeting.status === RecruiterBookingStatus.CANCELLED

  return (
    <div
      className={`p-4 rounded-lg border ${
        isUpcoming && !isCancelled
          ? 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900'
      } ${isCancelled ? 'opacity-60' : ''}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">
            {meeting.title || meeting.meeting_type_name || 'Meeting'}
          </h4>
          <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <User className="w-3 h-3" />
            {attendeeName}
          </p>
        </div>
        <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${statusColors[meeting.status]}`}>
          {statusIcons[meeting.status]}
          {statusLabels[meeting.status]}
        </span>
      </div>

      {/* Time */}
      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
        <Calendar className="w-4 h-4 text-gray-400 dark:text-gray-500" />
        <span>{timeDisplay}</span>
      </div>

      {/* Duration */}
      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
        <Clock className="w-4 h-4 text-gray-400 dark:text-gray-500" />
        <span>{meeting.duration_minutes} minutes</span>
      </div>

      {/* Meeting URL or location */}
      {meeting.meeting_url && !isCancelled && (
        <a
          href={meeting.meeting_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 mb-2"
        >
          <Video className="w-4 h-4" />
          Join Meeting
          <ExternalLink className="w-3 h-3" />
        </a>
      )}

      {/* Description */}
      {meeting.description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">{meeting.description}</p>
      )}

      {/* Cancellation reason */}
      {isCancelled && meeting.cancellation_reason && (
        <p className="text-sm text-red-600 mt-2">
          <span className="font-medium">Reason:</span> {meeting.cancellation_reason}
        </p>
      )}
    </div>
  )
}

export function MeetingsPanel({ entityType: _entityType, entityId: _entityId, meetings }: MeetingsPanelProps) {
  // Separate upcoming and past meetings
  const upcomingMeetings = meetings
    .filter((m) => m.scheduled_at && (isFuture(parseISO(m.scheduled_at)) || isToday(parseISO(m.scheduled_at))))
    .filter((m) => m.status !== RecruiterBookingStatus.CANCELLED)
    .sort((a, b) => parseISO(a.scheduled_at!).getTime() - parseISO(b.scheduled_at!).getTime())

  const pastMeetings = meetings
    .filter((m) => m.scheduled_at && isPast(parseISO(m.scheduled_at)) && !isToday(parseISO(m.scheduled_at)))
    .sort((a, b) => parseISO(b.scheduled_at!).getTime() - parseISO(a.scheduled_at!).getTime())

  const cancelledMeetings = meetings
    .filter((m) => m.status === RecruiterBookingStatus.CANCELLED)
    .sort((a, b) => parseISO(b.created_at).getTime() - parseISO(a.created_at).getTime())

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <h3 className="font-medium text-gray-900 dark:text-gray-100">
          Meetings
          {meetings.length > 0 && (
            <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">({meetings.length})</span>
          )}
        </h3>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {meetings.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">No meetings scheduled</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Upcoming */}
            {upcomingMeetings.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                  Upcoming ({upcomingMeetings.length})
                </h4>
                <div className="space-y-3">
                  {upcomingMeetings.map((meeting) => (
                    <MeetingCard key={meeting.id} meeting={meeting} />
                  ))}
                </div>
              </div>
            )}

            {/* Past */}
            {pastMeetings.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                  Past ({pastMeetings.length})
                </h4>
                <div className="space-y-3">
                  {pastMeetings.slice(0, 5).map((meeting) => (
                    <MeetingCard key={meeting.id} meeting={meeting} />
                  ))}
                  {pastMeetings.length > 5 && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                      + {pastMeetings.length - 5} more past meetings
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Cancelled */}
            {cancelledMeetings.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                  Cancelled ({cancelledMeetings.length})
                </h4>
                <div className="space-y-3">
                  {cancelledMeetings.slice(0, 3).map((meeting) => (
                    <MeetingCard key={meeting.id} meeting={meeting} />
                  ))}
                  {cancelledMeetings.length > 3 && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                      + {cancelledMeetings.length - 3} more cancelled
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default MeetingsPanel
