import { Link } from 'react-router-dom'
import {
  Users,
  FileText,
  TrendingUp,
  Building2,
  ArrowRightCircle,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  useClientRecentApplications,
  usePendingOffers,
  useProfileCompletion,
  useHiringMetrics,
  useMyCompany,
} from '@/hooks'
import { useOnboarding } from '@/hooks/useOnboarding'
import SchedulingCard from '@/components/booking/SchedulingCard'
import {
  SectionHeader,
  EmptyState,
  LoadingState,
  TodaysInterviewsSection,
  PipelineOverviewSection,
  CandidatesAttentionSection,
  RecentActivitySection,
} from './shared'
import { DashboardFeedWidget } from '@/components/feed'
import { OnboardingWizard } from '@/components/onboarding'

// =============================================================================
// Profile Completion Banner
// =============================================================================

function ProfileCompletionBanner() {
  const { data, isLoading } = useProfileCompletion()

  if (isLoading || !data || data.is_complete) return null

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <Building2 className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-[14px] font-medium text-amber-800">
            Complete your company profile
          </h3>
          <p className="text-[13px] text-amber-700 mt-1">
            Your profile is {data.completion_percentage}% complete. A complete profile
            helps attract better candidates.
          </p>
          <div className="mt-2 w-full bg-amber-200 rounded-full h-1.5">
            <div
              className="bg-amber-600 h-1.5 rounded-full transition-all"
              style={{ width: `${data.completion_percentage}%` }}
            />
          </div>
          <Link
            to="/dashboard/company"
            className="inline-flex items-center gap-1 mt-3 text-[13px] font-medium text-amber-800 hover:text-amber-900"
          >
            Complete profile <ArrowRightCircle className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// New Applications Section (Applied & Shortlisted)
// =============================================================================

function NewApplicationsSection() {
  const { applications, isLoading } = useClientRecentApplications()

  const formatDate = (isoString: string) => {
    const date = new Date(isoString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'applied':
        return { color: 'bg-blue-100 text-blue-700', label: 'New' }
      case 'shortlisted':
        return { color: 'bg-purple-100 text-purple-700', label: 'Shortlisted' }
      default:
        return { color: 'bg-gray-100 text-gray-700', label: status.replace('_', ' ') }
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <SectionHeader
        title="New Applications"
        icon={Users}
        count={applications.length}
        viewAllLink="/dashboard/applications"
      />

      {isLoading ? (
        <LoadingState />
      ) : applications.length === 0 ? (
        <EmptyState message="No new applications or shortlisted candidates" />
      ) : (
        <div className="space-y-1">
          {applications.slice(0, 10).map((app) => {
            const statusConfig = getStatusConfig(app.status)
            return (
              <div
                key={app.id}
                className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded-md text-[12px]"
              >
                <span className={`px-1.5 py-0.5 rounded text-[10px] flex-shrink-0 ${statusConfig.color}`}>
                  {statusConfig.label}
                </span>
                <Link
                  to={`/dashboard/admin/candidates/${app.candidate_id}`}
                  className="font-medium text-gray-900 hover:text-blue-600 truncate"
                >
                  {app.candidate_name}
                </Link>
                <span className="text-gray-400">for</span>
                <Link
                  to={`/dashboard/jobs/${app.job_id}`}
                  className="text-gray-600 hover:text-blue-600 truncate"
                >
                  {app.job_title}
                </Link>
                <span className="ml-auto text-gray-400 flex-shrink-0">{formatDate(app.applied_at)}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Pending Offers Section
// =============================================================================

function PendingOffersSection() {
  const { offers, totalPending, isLoading } = usePendingOffers()

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <SectionHeader title="Pending Offers" icon={FileText} />
        <LoadingState />
      </div>
    )
  }

  if (totalPending === 0) return null

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <SectionHeader
        title="Pending Offers"
        icon={FileText}
        count={totalPending}
        viewAllLink="/dashboard/applications?status=offer_made"
      />

      <div className="space-y-1">
        {offers.map((offer) => (
          <div
            key={offer.id}
            className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded-md text-[12px]"
          >
            <Link
              to={`/dashboard/admin/candidates/${offer.candidate_id}`}
              className="font-medium text-gray-900 hover:text-blue-600 truncate"
            >
              {offer.candidate_name}
            </Link>
            <span className="text-gray-400">·</span>
            <Link
              to={`/dashboard/jobs/${offer.job_id}`}
              className="text-gray-500 hover:text-blue-600 truncate"
            >
              {offer.job_title}
            </Link>
            <span className={`ml-auto px-1.5 py-0.5 rounded text-[10px] ${
              offer.days_pending > 5 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {offer.days_pending}d pending
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// =============================================================================
// Hiring Metrics Section
// =============================================================================

function HiringMetricsSection() {
  const { metrics, isLoading, error } = useHiringMetrics()

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <SectionHeader title="Hiring Metrics" icon={TrendingUp} />
        <LoadingState />
      </div>
    )
  }

  if (error || !metrics) {
    return null
  }

  const statCards = [
    {
      label: 'Total Applications',
      value: metrics.total_applications,
      color: 'text-gray-900',
    },
    {
      label: 'Offer Acceptance',
      value: metrics.offer_acceptance_rate ? `${metrics.offer_acceptance_rate}%` : '-',
      color: metrics.offer_acceptance_rate && metrics.offer_acceptance_rate >= 70 ? 'text-green-600' : 'text-amber-600',
    },
    {
      label: 'Avg. Time to Hire',
      value: metrics.time_to_hire_days ? `${metrics.time_to_hire_days}d` : '-',
      color: 'text-gray-900',
    },
    {
      label: 'Shortlist Rate',
      value: metrics.shortlist_rate ? `${metrics.shortlist_rate}%` : '-',
      color: 'text-gray-900',
    },
  ]

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <SectionHeader title="Hiring Metrics" icon={TrendingUp} />

      <div className="grid grid-cols-2 gap-3">
        {statCards.map((stat) => (
          <div key={stat.label} className="text-center p-2 bg-gray-50 rounded-md">
            <p className={`text-[18px] font-semibold ${stat.color}`}>{stat.value}</p>
            <p className="text-[11px] text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-3 gap-2 text-center text-[11px]">
        <div>
          <p className="font-medium text-gray-900">{metrics.offers_made}</p>
          <p className="text-gray-500">Offers Made</p>
        </div>
        <div>
          <p className="font-medium text-green-600">{metrics.offers_accepted}</p>
          <p className="text-gray-500">Accepted</p>
        </div>
        <div>
          <p className="font-medium text-red-600">{metrics.offers_declined}</p>
          <p className="text-gray-500">Declined</p>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Assigned Recruiter Section
// =============================================================================

function AssignedRecruiterSection() {
  const { company, isLoading } = useMyCompany()
  const assignedUsers = company?.assigned_to || []

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <SectionHeader title="Your Recruiter" icon={Users} />
        <LoadingState />
      </div>
    )
  }

  if (assignedUsers.length === 0) return null

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <SectionHeader title="Your Recruiter" icon={Users} />
      <SchedulingCard
        assignedUsers={assignedUsers}
        category="sales"
      />
    </div>
  )
}

// =============================================================================
// Main ClientDashboard Component
// =============================================================================

export default function ClientDashboard() {
  const { user } = useAuth()
  const { status: onboardingStatus, isLoading: onboardingLoading, refetch: refetchOnboarding } = useOnboarding()

  // Show onboarding wizard if not complete
  const showOnboarding = !onboardingLoading && onboardingStatus && !onboardingStatus.is_complete

  if (showOnboarding) {
    return <OnboardingWizard onComplete={refetchOnboarding} />
  }

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-[22px] font-semibold text-gray-900">Dashboard</h1>
        <p className="text-[14px] text-gray-500 mt-1">
          Welcome back, {user?.first_name}. Here's your hiring overview.
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

      {/* Profile Completion Banner */}
      <ProfileCompletionBanner />

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <TodaysInterviewsSection />
          <PipelineOverviewSection />
          <NewApplicationsSection />
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          <CandidatesAttentionSection />
          <PendingOffersSection />
          <HiringMetricsSection />
          <DashboardFeedWidget limit={5} />
          <RecentActivitySection />
          <AssignedRecruiterSection />
        </div>
      </div>
    </div>
  )
}
