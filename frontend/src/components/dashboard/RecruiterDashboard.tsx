import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Calendar,
  Users,
  Mail,
  Video,
  Phone,
  MapPin,
  CheckCircle,
  FileText,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  useTodaysBookings,
  useInvitationsSummary,
  useNewApplications,
} from '@/hooks'
import type { TimeFilter } from '@/hooks'
import {
  SectionHeader,
  EmptyState,
  LoadingState,
  TodaysInterviewsSection,
  PipelineOverviewSection,
  RecentActivitySection,
  CandidatesAttentionSection,
} from './shared'

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
// Main RecruiterDashboard Component
// =============================================================================

export default function RecruiterDashboard() {
  const { user } = useAuth()

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-[22px] font-semibold text-gray-900">Dashboard</h1>
        <p className="text-[14px] text-gray-500 mt-1">
          Your recruitment overview for today
        </p>
      </div>

      {/* Verification Notice */}
      {!user?.is_verified && (
        <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-md flex items-center justify-between">
          <p className="text-[13px] text-amber-800">
            Please verify your email to access all features
          </p>
          <button className="text-[13px] font-medium text-amber-800 hover:underline">
            Resend email
          </button>
        </div>
      )}

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
