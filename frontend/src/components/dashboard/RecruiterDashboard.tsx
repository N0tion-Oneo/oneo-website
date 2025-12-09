import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Calendar,
  Clock,
  Users,
  Briefcase,
  Mail,
  AlertCircle,
  ChevronRight,
  Video,
  Phone,
  MapPin,
  CheckCircle,
  XCircle,
  UserCheck,
  FileText,
  MessageSquare,
  ArrowRightCircle,
  Star,
  Send,
} from 'lucide-react'
import {
  useTodaysBookings,
  useTodaysInterviews,
  useInvitationsSummary,
  useNewApplications,
  usePipelineOverview,
  useRecentActivity,
  useCandidatesAttention,
} from '@/hooks'
import type { TimeFilter } from '@/hooks'

// =============================================================================
// Helper Components
// =============================================================================

function TimeFilterSelect({
  value,
  onChange,
  showAll = true,
}: {
  value: TimeFilter
  onChange: (value: TimeFilter) => void
  showAll?: boolean
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as TimeFilter)}
      className="text-[12px] px-2 py-1 border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-gray-400"
    >
      <option value="24h">Last 24 hours</option>
      <option value="7d">Last 7 days</option>
      <option value="30d">Last 30 days</option>
      {showAll && <option value="all">All time</option>}
    </select>
  )
}

function SectionHeader({
  title,
  icon: Icon,
  count,
  viewAllLink,
  children,
}: {
  title: string
  icon: React.ElementType
  count?: number
  viewAllLink?: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-gray-500" />
        <h3 className="text-[14px] font-medium text-gray-900">{title}</h3>
        {count !== undefined && (
          <span className="text-[12px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
            {count}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {children}
        {viewAllLink && (
          <Link
            to={viewAllLink}
            className="text-[12px] text-gray-500 hover:text-gray-700 flex items-center gap-0.5"
          >
            View all <ChevronRight className="w-3 h-3" />
          </Link>
        )}
      </div>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-6 text-center text-[13px] text-gray-400">{message}</div>
  )
}

function LoadingState() {
  return (
    <div className="py-6 flex justify-center">
      <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-200 border-t-gray-600" />
    </div>
  )
}

// =============================================================================
// Today's Bookings Section
// =============================================================================

function TodaysBookingsSection() {
  const { upcoming, past, totalToday, isLoading } = useTodaysBookings()

  const getLocationIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="w-3 h-3" />
      case 'phone':
        return <Phone className="w-3 h-3" />
      case 'in_person':
        return <MapPin className="w-3 h-3" />
      default:
        return <Calendar className="w-3 h-3" />
    }
  }

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <SectionHeader
        title="Today's Bookings"
        icon={Calendar}
        count={totalToday}
        viewAllLink="/dashboard/bookings"
      />

      {isLoading ? (
        <LoadingState />
      ) : totalToday === 0 ? (
        <EmptyState message="No bookings scheduled for today" />
      ) : (
        <div className="space-y-3">
          {/* Upcoming */}
          {upcoming.length > 0 && (
            <div>
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-2">
                Upcoming
              </p>
              <div className="space-y-1">
                {upcoming.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center gap-2 px-2 py-1.5 bg-blue-50 border border-blue-100 rounded-md text-[12px]"
                  >
                    <span className="text-blue-600 flex-shrink-0">{getLocationIcon(booking.location_type)}</span>
                    <span className="font-medium text-blue-700">{formatTime(booking.scheduled_at)}</span>
                    <span className="text-gray-700 truncate">{booking.attendee_name}</span>
                    <span className="text-gray-400">·</span>
                    <span className="text-gray-500 truncate">{booking.meeting_type_name}</span>
                    {booking.organizer_name && (
                      <>
                        <span className="text-gray-400">·</span>
                        <span className="text-gray-400 truncate">{booking.organizer_name}</span>
                      </>
                    )}
                    {booking.join_link && (
                      <a
                        href={booking.join_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-auto flex-shrink-0 text-blue-600 hover:text-blue-800"
                        title="Join Meeting"
                      >
                        <Video className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {booking.location && !booking.join_link && (
                      <span className="ml-auto flex-shrink-0 text-gray-400 truncate max-w-[120px]" title={booking.location}>
                        {booking.location}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Past */}
          {past.length > 0 && (
            <div>
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-2">
                Earlier Today
              </p>
              <div className="space-y-1">
                {past.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 border border-gray-100 rounded-md text-[12px] opacity-60"
                  >
                    <span className="text-gray-400 flex-shrink-0">{getLocationIcon(booking.location_type)}</span>
                    <span className="text-gray-500">{formatTime(booking.scheduled_at)}</span>
                    <span className="text-gray-600 truncate">{booking.attendee_name}</span>
                    <span className="text-gray-300">·</span>
                    <span className="text-gray-400 truncate">{booking.meeting_type_name}</span>
                    {booking.organizer_name && (
                      <>
                        <span className="text-gray-300">·</span>
                        <span className="text-gray-400 truncate">{booking.organizer_name}</span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Today's Interviews Section
// =============================================================================

function TodaysInterviewsSection() {
  const { interviews, totalToday, isLoading } = useTodaysInterviews()

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusBadge = (status: string, isPast: boolean) => {
    if (status === 'completed') {
      return (
        <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded">
          Completed
        </span>
      )
    }
    if (status === 'no_show') {
      return (
        <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-700 rounded">No Show</span>
      )
    }
    if (isPast) {
      return (
        <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">
          Pending
        </span>
      )
    }
    return (
      <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">Upcoming</span>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <SectionHeader
        title="Today's Interviews"
        icon={Users}
        count={totalToday}
        viewAllLink="/dashboard/applications"
      />

      {isLoading ? (
        <LoadingState />
      ) : interviews.length === 0 ? (
        <EmptyState message="No interviews scheduled for today" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100">
                <th className="pb-2 font-medium">Time</th>
                <th className="pb-2 font-medium">Candidate</th>
                <th className="pb-2 font-medium">Job</th>
                <th className="pb-2 font-medium">Stage</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {interviews.map((interview) => (
                <tr key={interview.id} className={interview.is_past ? 'opacity-60' : ''}>
                  <td className="py-2 font-medium">{formatTime(interview.scheduled_at)}</td>
                  <td className="py-2">
                    <Link
                      to={`/dashboard/candidates/${interview.candidate_id}`}
                      className="text-gray-900 hover:text-blue-600"
                    >
                      {interview.candidate_name}
                    </Link>
                  </td>
                  <td className="py-2 text-gray-600">
                    <Link to={`/dashboard/jobs/${interview.job_id}`} className="hover:text-blue-600">
                      {interview.job_title}
                    </Link>
                    {interview.company_name && (
                      <span className="text-gray-400"> · {interview.company_name}</span>
                    )}
                  </td>
                  <td className="py-2 text-gray-600">{interview.stage_name}</td>
                  <td className="py-2">{getStatusBadge(interview.status, interview.is_past)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Invitations Section
// =============================================================================

function InvitationsSection() {
  const [activeTab, setActiveTab] = useState<'client' | 'candidate'>('candidate')
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('7d')
  const { data, isLoading, refetch } = useInvitationsSummary(timeFilter)

  const handleTimeFilterChange = (value: TimeFilter) => {
    setTimeFilter(value)
    refetch(value)
  }

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
    })
  }

  const tabData = activeTab === 'client' ? data?.client : data?.candidate

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <SectionHeader title="Invitations" icon={Mail} viewAllLink="/dashboard/invitations">
        <TimeFilterSelect value={timeFilter} onChange={handleTimeFilterChange} showAll={false} />
      </SectionHeader>

      {/* Tabs */}
      <div className="flex gap-1 mb-3 border-b border-gray-100">
        <button
          onClick={() => setActiveTab('candidate')}
          className={`px-3 py-1.5 text-[12px] font-medium border-b-2 -mb-px ${
            activeTab === 'candidate'
              ? 'text-gray-900 border-gray-900'
              : 'text-gray-500 border-transparent hover:text-gray-700'
          }`}
        >
          Candidates ({data?.candidate.pending_count || 0})
        </button>
        <button
          onClick={() => setActiveTab('client')}
          className={`px-3 py-1.5 text-[12px] font-medium border-b-2 -mb-px ${
            activeTab === 'client'
              ? 'text-gray-900 border-gray-900'
              : 'text-gray-500 border-transparent hover:text-gray-700'
          }`}
        >
          Clients ({data?.client.pending_count || 0})
        </button>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : !tabData || (tabData.pending.length === 0 && tabData.completed.length === 0) ? (
        <EmptyState message="No invitations" />
      ) : (
        <div className="space-y-4">
          {/* Pending */}
          {tabData.pending.length > 0 && (
            <div>
              <p className="text-[11px] font-medium text-amber-600 uppercase tracking-wider mb-2">
                Pending ({tabData.pending_count})
              </p>
              <div className="space-y-1">
                {tabData.pending.slice(0, 5).map((inv) => (
                  <div key={inv.token} className="flex items-center justify-between py-1.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-gray-900 truncate">
                        {inv.name || inv.email}
                      </p>
                      {inv.name && (
                        <p className="text-[11px] text-gray-400 truncate">{inv.email}</p>
                      )}
                    </div>
                    <div className="text-[11px] text-gray-400">{formatDate(inv.created_at)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed */}
          {tabData.completed.length > 0 && (
            <div>
              <p className="text-[11px] font-medium text-green-600 uppercase tracking-wider mb-2">
                Completed ({tabData.completed_count})
              </p>
              <div className="space-y-1">
                {tabData.completed.slice(0, 5).map((inv) => (
                  <div
                    key={inv.token}
                    className="flex items-center justify-between py-1.5 opacity-75"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                      <p className="text-[13px] text-gray-600 truncate">{inv.name || inv.email}</p>
                    </div>
                    <div className="text-[11px] text-gray-400">
                      {inv.used_at && formatDate(inv.used_at)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// =============================================================================
// New Applications Section
// =============================================================================

function NewApplicationsSection() {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all')
  const { applications, totalCount, isLoading, refetch } = useNewApplications(timeFilter)

  const handleTimeFilterChange = (value: TimeFilter) => {
    setTimeFilter(value)
    refetch(value)
  }

  const formatDate = (isoString: string) => {
    const date = new Date(isoString)
    const now = new Date()
    const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <SectionHeader
        title="New Applications"
        icon={FileText}
        count={totalCount}
        viewAllLink="/dashboard/applications?status=applied"
      >
        <TimeFilterSelect value={timeFilter} onChange={handleTimeFilterChange} />
      </SectionHeader>

      {isLoading ? (
        <LoadingState />
      ) : applications.length === 0 ? (
        <EmptyState message="No new applications" />
      ) : (
        <div className="space-y-2">
          {applications.map((app) => (
            <div
              key={app.id}
              className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-md transition-colors"
            >
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <Link
                  to={`/dashboard/candidates/${app.candidate_id}`}
                  className="text-[13px] font-medium text-gray-900 hover:text-blue-600 truncate block"
                >
                  {app.candidate_name}
                </Link>
                <p className="text-[11px] text-gray-500 truncate">
                  Applied for{' '}
                  <Link to={`/dashboard/jobs/${app.job_id}`} className="hover:text-blue-600">
                    {app.job_title}
                  </Link>
                  {app.company_name && <span> · {app.company_name}</span>}
                </p>
              </div>
              <div className="text-[11px] text-gray-400">{formatDate(app.applied_at)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Pipeline Overview Section
// =============================================================================

function PipelineOverviewSection() {
  const { data, isLoading } = usePipelineOverview()

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <SectionHeader title="Pipeline Overview" icon={Briefcase} viewAllLink="/dashboard/jobs" />

      {isLoading ? (
        <LoadingState />
      ) : !data || data.jobs.length === 0 ? (
        <EmptyState message="No active jobs" />
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center p-2 bg-gray-50 rounded-md">
              <p className="text-[20px] font-semibold text-gray-900">{data.summary.total_jobs}</p>
              <p className="text-[11px] text-gray-500">Active Jobs</p>
            </div>
            <div className="text-center p-2 bg-blue-50 rounded-md">
              <p className="text-[20px] font-semibold text-blue-600">{data.summary.open_positions}</p>
              <p className="text-[11px] text-gray-500">Open Positions</p>
            </div>
            <div className="text-center p-2 bg-amber-50 rounded-md">
              <p className="text-[20px] font-semibold text-amber-600">
                {data.summary.offers_pending}
              </p>
              <p className="text-[11px] text-gray-500">Offers Pending</p>
            </div>
          </div>

          {/* Jobs Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-2 font-medium">Job</th>
                  <th className="pb-2 font-medium text-center">Applied</th>
                  <th className="pb-2 font-medium text-center">Shortlisted</th>
                  <th className="pb-2 font-medium text-center">In Progress</th>
                  <th className="pb-2 font-medium text-center">Offers</th>
                  <th className="pb-2 font-medium text-center">Hired</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.jobs.slice(0, 10).map((job) => (
                  <tr key={job.job_id}>
                    <td className="py-2">
                      <Link
                        to={`/dashboard/jobs/${job.job_id}`}
                        className="text-gray-900 hover:text-blue-600 font-medium"
                      >
                        {job.job_title}
                      </Link>
                      {job.company_name && (
                        <span className="text-gray-400 ml-1">· {job.company_name}</span>
                      )}
                      <span className="text-gray-400 ml-1">
                        ({job.hired_count}/{job.positions_to_fill})
                      </span>
                    </td>
                    <td className="py-2 text-center">
                      <span className="px-1.5 py-0.5 bg-gray-100 rounded">
                        {job.status_counts.applied}
                      </span>
                    </td>
                    <td className="py-2 text-center">
                      <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                        {job.status_counts.shortlisted}
                      </span>
                    </td>
                    <td className="py-2 text-center">
                      <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">
                        {job.status_counts.in_progress}
                      </span>
                    </td>
                    <td className="py-2 text-center">
                      <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">
                        {job.status_counts.offer_made}
                      </span>
                    </td>
                    <td className="py-2 text-center">
                      <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded">
                        {job.status_counts.offer_accepted}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

// =============================================================================
// Recent Activity Section
// =============================================================================

function RecentActivitySection() {
  const { activities, isLoading } = useRecentActivity(10)

  const getActivityIcon = (type: string, activityType?: string) => {
    // For stage_change, use specific icons based on activity type
    if (type === 'stage_change' && activityType) {
      switch (activityType) {
        case 'shortlisted':
          return <Star className="w-4 h-4 text-blue-500" />
        case 'offer_made':
        case 'offer_updated':
          return <FileText className="w-4 h-4 text-amber-500" />
        case 'offer_accepted':
          return <CheckCircle className="w-4 h-4 text-green-500" />
        case 'rejected':
          return <XCircle className="w-4 h-4 text-red-500" />
        case 'interview_booked':
        case 'interview_scheduled':
          return <Calendar className="w-4 h-4 text-purple-500" />
        case 'interview_rescheduled':
          return <Clock className="w-4 h-4 text-amber-500" />
        case 'interview_cancelled':
          return <XCircle className="w-4 h-4 text-red-400" />
        case 'booking_link_sent':
          return <Send className="w-4 h-4 text-blue-400" />
        default:
          return <ArrowRightCircle className="w-4 h-4 text-blue-500" />
      }
    }

    switch (type) {
      case 'stage_change':
        return <ArrowRightCircle className="w-4 h-4 text-blue-500" />
      case 'note_added':
        return <MessageSquare className="w-4 h-4 text-gray-500" />
      case 'suggestion':
        return <UserCheck className="w-4 h-4 text-purple-500" />
      default:
        return <FileText className="w-4 h-4 text-gray-400" />
    }
  }

  const getActivityDescription = (activity: (typeof activities)[0]) => {
    if (activity.type === 'stage_change') {
      // Handle different activity types within stage_change
      const details = activity.details as { new_status?: string; stage_name?: string }
      const activityType = activity.activity_type

      // Map activity types to descriptions
      switch (activityType) {
        case 'shortlisted':
          return 'Shortlisted for review'
        case 'offer_made':
          return 'Offer extended'
        case 'offer_accepted':
          return 'Offer accepted'
        case 'offer_updated':
          return 'Offer updated'
        case 'rejected':
          return 'Application rejected'
        case 'interview_booked':
          return 'Interview booked'
        case 'interview_scheduled':
          return 'Interview scheduled'
        case 'interview_rescheduled':
          return 'Interview rescheduled'
        case 'interview_cancelled':
          return 'Interview cancelled'
        case 'booking_link_sent':
          return 'Booking link sent'
        case 'stage_changed':
          return details.stage_name
            ? `Moved to ${details.stage_name}`
            : `Status changed to ${details.new_status}`
        default:
          return details.stage_name
            ? `Moved to ${details.stage_name}`
            : 'Status updated'
      }
    }
    if (activity.type === 'note_added') {
      const details = activity.details as { note_preview?: string }
      return details.note_preview || 'Added a note'
    }
    if (activity.type === 'suggestion') {
      return activity.activity_type === 'SUGGESTION_APPROVED'
        ? 'Suggestion approved'
        : 'Suggestion declined'
    }
    return 'Activity'
  }

  const formatTime = (isoString: string) => {
    const date = new Date(isoString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <SectionHeader title="Recent Activity" icon={Clock} />

      {isLoading ? (
        <LoadingState />
      ) : activities.length === 0 ? (
        <EmptyState message="No recent activity" />
      ) : (
        <div className="space-y-1">
          {activities.map((activity, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded-md text-[12px]"
            >
              <span className="flex-shrink-0">{getActivityIcon(activity.type, activity.activity_type)}</span>
              <span className="text-gray-400 flex-shrink-0">{formatTime(activity.created_at)}</span>
              <Link
                to={`/dashboard/admin/candidates/${activity.candidate_id}`}
                className="font-medium text-gray-900 hover:text-blue-600 truncate"
              >
                {activity.candidate_name}
              </Link>
              <span className="text-gray-500 truncate">{getActivityDescription(activity)}</span>
              {activity.job_title && (
                <>
                  <span className="text-gray-300">·</span>
                  <Link
                    to={`/dashboard/jobs/${activity.job_id}`}
                    className="text-gray-400 hover:text-blue-600 truncate"
                  >
                    {activity.job_title}
                  </Link>
                </>
              )}
              <span className="ml-auto text-gray-400 flex-shrink-0 truncate max-w-[80px]">
                {activity.performed_by}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Candidates Needing Attention Section
// =============================================================================

function CandidatesAttentionSection() {
  const [activeTab, setActiveTab] = useState<'not_contacted' | 'stuck' | 'prep'>('not_contacted')
  const { data, isLoading } = useCandidatesAttention()

  const tabs = [
    {
      key: 'not_contacted' as const,
      label: 'No Contact',
      count: data?.not_contacted_count || 0,
      color: 'text-red-600',
    },
    {
      key: 'stuck' as const,
      label: 'Stuck',
      count: data?.stuck_in_stage_count || 0,
      color: 'text-amber-600',
    },
    {
      key: 'prep' as const,
      label: 'Interview Prep',
      count: data?.needs_interview_prep_count || 0,
      color: 'text-blue-600',
    },
  ]

  const getItems = () => {
    if (!data) return []
    switch (activeTab) {
      case 'not_contacted':
        return data.not_contacted
      case 'stuck':
        return data.stuck_in_stage
      case 'prep':
        return data.needs_interview_prep
    }
  }

  const items = getItems()

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <SectionHeader
        title="Candidates Needing Attention"
        icon={AlertCircle}
        viewAllLink="/dashboard/candidates"
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-3 border-b border-gray-100">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 text-[12px] font-medium border-b-2 -mb-px ${
              activeTab === tab.key
                ? `${tab.color} border-current`
                : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {isLoading ? (
        <LoadingState />
      ) : items.length === 0 ? (
        <EmptyState message="No candidates need attention" />
      ) : (
        <div className="space-y-2">
          {items.map((candidate) => (
            <div
              key={candidate.id}
              className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-md"
            >
              <div className="flex-1 min-w-0">
                <Link
                  to={`/dashboard/candidates/${candidate.id}`}
                  className="text-[13px] font-medium text-gray-900 hover:text-blue-600"
                >
                  {candidate.name}
                </Link>
                <p className="text-[11px] text-gray-500">
                  {activeTab === 'not_contacted' && (
                    <>Last contact {candidate.days_since_contact} days ago</>
                  )}
                  {activeTab === 'stuck' && (
                    <>
                      In{' '}
                      <span
                        className="px-1 py-0.5 rounded text-[10px]"
                        style={{ backgroundColor: `${candidate.stage_color}20`, color: candidate.stage_color }}
                      >
                        {candidate.stage}
                      </span>{' '}
                      for {candidate.days_in_stage} days
                    </>
                  )}
                  {activeTab === 'prep' && (
                    <>
                      {candidate.stage_name} for {candidate.job_title} in {candidate.days_until} days
                    </>
                  )}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Main RecruiterDashboard Component
// =============================================================================

export default function RecruiterDashboard() {
  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-[22px] font-semibold text-gray-900">Dashboard</h1>
        <p className="text-[14px] text-gray-500 mt-1">
          Your recruitment overview for today
        </p>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <TodaysBookingsSection />
          <TodaysInterviewsSection />
          <NewApplicationsSection />
          <PipelineOverviewSection />
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          <CandidatesAttentionSection />
          <InvitationsSection />
          <RecentActivitySection />
        </div>
      </div>
    </div>
  )
}
