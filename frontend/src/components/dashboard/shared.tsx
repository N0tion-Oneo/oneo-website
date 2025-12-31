import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Briefcase,
  Users,
  ChevronRight,
  AlertCircle,
  Clock,
  Calendar,
  CheckCircle,
  XCircle,
  FileText,
  MessageSquare,
  ArrowRightCircle,
  Star,
  Send,
  UserCheck,
} from 'lucide-react'
import {
  usePipelineOverview,
  useTodaysInterviews,
  useCandidatesAttention,
  useRecentActivity,
} from '@/hooks'

// =============================================================================
// Helper Components
// =============================================================================

export function SectionHeader({
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
        <Icon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        <h3 className="text-[14px] font-medium text-gray-900 dark:text-gray-100">{title}</h3>
        {count !== undefined && (
          <span className="text-[12px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
            {count}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {children}
        {viewAllLink && (
          <Link
            to={viewAllLink}
            className="text-[12px] text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center gap-0.5"
          >
            View all <ChevronRight className="w-3 h-3" />
          </Link>
        )}
      </div>
    </div>
  )
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-6 text-center text-[13px] text-gray-400 dark:text-gray-500">{message}</div>
  )
}

export function LoadingState() {
  return (
    <div className="py-6 flex justify-center">
      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-400 dark:border-gray-500" />
    </div>
  )
}

// =============================================================================
// Today's Interviews Section
// =============================================================================

export function TodaysInterviewsSection() {
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
        <span className="text-[10px] px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">
          Completed
        </span>
      )
    }
    if (status === 'no_show') {
      return (
        <span className="text-[10px] px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded">No Show</span>
      )
    }
    if (isPast) {
      return (
        <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded">
          Pending
        </span>
      )
    }
    return (
      <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">Upcoming</span>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
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
              <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
                <th className="pb-2 font-medium">Time</th>
                <th className="pb-2 font-medium">Candidate</th>
                <th className="pb-2 font-medium">Job</th>
                <th className="pb-2 font-medium">Stage</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {interviews.map((interview) => (
                <tr key={interview.id} className={interview.is_past ? 'opacity-60' : ''}>
                  <td className="py-2 font-medium text-gray-900 dark:text-gray-100">{formatTime(interview.scheduled_at)}</td>
                  <td className="py-2">
                    <Link
                      to={`/dashboard/candidates/${interview.candidate_id}`}
                      className="text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      {interview.candidate_name}
                    </Link>
                  </td>
                  <td className="py-2 text-gray-600 dark:text-gray-400">
                    <Link to={`/dashboard/jobs/${interview.job_id}`} className="hover:text-blue-600 dark:hover:text-blue-400">
                      {interview.job_title}
                    </Link>
                    {interview.company_name && (
                      <span className="text-gray-400 dark:text-gray-500"> · {interview.company_name}</span>
                    )}
                  </td>
                  <td className="py-2 text-gray-600 dark:text-gray-400">{interview.stage_name}</td>
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
// Pipeline Overview Section
// =============================================================================

export function PipelineOverviewSection() {
  const { data, isLoading } = usePipelineOverview()

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <SectionHeader title="Pipeline Overview" icon={Briefcase} viewAllLink="/dashboard/jobs" />

      {isLoading ? (
        <LoadingState />
      ) : !data || data.jobs.length === 0 ? (
        <EmptyState message="No active jobs" />
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
              <p className="text-[20px] font-semibold text-gray-900 dark:text-gray-100">{data.summary.total_jobs}</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">Active Jobs</p>
            </div>
            <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/30 rounded-md">
              <p className="text-[20px] font-semibold text-blue-600 dark:text-blue-400">{data.summary.open_positions}</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">Open Positions</p>
            </div>
            <div className="text-center p-2 bg-amber-50 dark:bg-amber-900/30 rounded-md">
              <p className="text-[20px] font-semibold text-amber-600 dark:text-amber-400">
                {data.summary.offers_pending}
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">Offers Pending</p>
            </div>
          </div>

          {/* Jobs Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
                  <th className="pb-2 font-medium">Job</th>
                  <th className="pb-2 font-medium text-center">Applied</th>
                  <th className="pb-2 font-medium text-center">Shortlisted</th>
                  <th className="pb-2 font-medium text-center">In Progress</th>
                  <th className="pb-2 font-medium text-center">Offers</th>
                  <th className="pb-2 font-medium text-center">Hired</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {data.jobs.slice(0, 10).map((job) => (
                  <tr key={job.job_id}>
                    <td className="py-2">
                      <Link
                        to={`/dashboard/jobs/${job.job_id}`}
                        className="text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 font-medium"
                      >
                        {job.job_title}
                      </Link>
                      {job.company_name && (
                        <span className="text-gray-400 dark:text-gray-500 ml-1">· {job.company_name}</span>
                      )}
                      <span className="text-gray-400 dark:text-gray-500 ml-1">
                        ({job.hired_count}/{job.positions_to_fill})
                      </span>
                    </td>
                    <td className="py-2 text-center">
                      <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded">
                        {job.status_counts.applied}
                      </span>
                    </td>
                    <td className="py-2 text-center">
                      <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
                        {job.status_counts.shortlisted}
                      </span>
                    </td>
                    <td className="py-2 text-center">
                      <span className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded">
                        {job.status_counts.in_progress}
                      </span>
                    </td>
                    <td className="py-2 text-center">
                      <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded">
                        {job.status_counts.offer_made}
                      </span>
                    </td>
                    <td className="py-2 text-center">
                      <span className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">
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
// Candidates Needing Attention Section
// =============================================================================

export function CandidatesAttentionSection() {
  const [activeTab, setActiveTab] = useState<'not_contacted' | 'stuck' | 'prep'>('not_contacted')
  const { data, isLoading } = useCandidatesAttention()

  const tabs = [
    {
      key: 'not_contacted' as const,
      label: 'No Contact',
      count: data?.not_contacted_count || 0,
      color: 'text-red-600 dark:text-red-400',
    },
    {
      key: 'stuck' as const,
      label: 'Stuck',
      count: data?.stuck_in_stage_count || 0,
      color: 'text-amber-600 dark:text-amber-400',
    },
    {
      key: 'prep' as const,
      label: 'Interview Prep',
      count: data?.needs_interview_prep_count || 0,
      color: 'text-blue-600 dark:text-blue-400',
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
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <SectionHeader
        title="Needs Attention"
        icon={AlertCircle}
        viewAllLink="/dashboard/admin/candidates"
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-3 border-b border-gray-100 dark:border-gray-800">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 text-[12px] font-medium border-b-2 -mb-px ${
              activeTab === tab.key
                ? `${tab.color} border-current`
                : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-700 dark:hover:text-gray-300'
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
              className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md"
            >
              <div className="flex-1 min-w-0">
                <Link
                  to={`/dashboard/admin/candidates/${candidate.id}`}
                  className="text-[13px] font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  {candidate.name}
                </Link>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
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
              <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Recent Activity Section
// =============================================================================

export function RecentActivitySection() {
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
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
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
              className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md text-[12px]"
            >
              <span className="flex-shrink-0">{getActivityIcon(activity.type, activity.activity_type)}</span>
              <span className="text-gray-400 dark:text-gray-500 flex-shrink-0">{formatTime(activity.created_at)}</span>
              <Link
                to={`/dashboard/admin/candidates/${activity.candidate_id}`}
                className="font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 truncate"
              >
                {activity.candidate_name}
              </Link>
              <span className="text-gray-500 dark:text-gray-400 truncate">{getActivityDescription(activity)}</span>
              {activity.job_title && (
                <>
                  <span className="text-gray-300 dark:text-gray-600">·</span>
                  <Link
                    to={`/dashboard/jobs/${activity.job_id}`}
                    className="text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 truncate"
                  >
                    {activity.job_title}
                  </Link>
                </>
              )}
              <span className="ml-auto text-gray-400 dark:text-gray-500 flex-shrink-0 truncate max-w-[80px]">
                {activity.performed_by}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
