import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useJob } from '@/hooks/useJobs'
import { useAuth } from '@/contexts/AuthContext'
import { ApplyModal } from '@/components/applications'
import {
  Building2,
  MapPin,
  Briefcase,
  Clock,
  DollarSign,
  Eye,
  Users,
  ArrowLeft,
  Globe,
  Calendar,
  ChevronRight,
  ExternalLink,
} from 'lucide-react'
import { JobType, WorkMode, Seniority, Department, UserRole } from '@/types'
import type { InterviewStage } from '@/types'

const getJobTypeLabel = (type: JobType) => {
  const labels: Record<string, string> = {
    full_time: 'Full-time',
    part_time: 'Part-time',
    contract: 'Contract',
    freelance: 'Freelance',
  }
  return labels[type] || type
}

const getWorkModeLabel = (mode: WorkMode) => {
  const labels: Record<string, string> = {
    remote: 'Remote',
    hybrid: 'Hybrid',
    onsite: 'On-site',
  }
  return labels[mode] || mode
}

const getSeniorityLabel = (seniority: Seniority) => {
  const labels: Record<string, string> = {
    intern: 'Intern',
    junior: 'Junior',
    mid: 'Mid-level',
    senior: 'Senior',
    lead: 'Lead',
    principal: 'Principal',
    executive: 'Executive',
  }
  return labels[seniority] || seniority
}

const getDepartmentLabel = (department: Department) => {
  const labels: Record<string, string> = {
    engineering: 'Engineering',
    marketing: 'Marketing',
    sales: 'Sales',
    operations: 'Operations',
    design: 'Design',
    product: 'Product',
    hr: 'Human Resources',
    finance: 'Finance',
  }
  return labels[department] || department
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function JobDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { job, isLoading, error, refetch } = useJob(slug || '')
  const { user, isAuthenticated } = useAuth()
  const [showApplyModal, setShowApplyModal] = useState(false)

  const isCandidate = user?.role === UserRole.CANDIDATE
  const canApply = isAuthenticated && isCandidate

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-[14px] text-gray-500">Loading job...</p>
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-6 h-14 flex items-center">
            <Link to="/" className="text-lg font-semibold text-gray-900">
              Oneo
            </Link>
          </div>
        </header>
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
            <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-[15px] text-gray-700 mb-1">Job not found</p>
            <p className="text-[13px] text-gray-500 mb-4">
              This job may have been removed or is no longer available
            </p>
            <Link
              to="/jobs"
              className="inline-flex items-center gap-2 text-[13px] font-medium text-gray-900 hover:text-gray-700"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to jobs
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link to="/" className="text-lg font-semibold text-gray-900">
            Oneo
          </Link>
          <nav className="flex items-center gap-6">
            <Link to="/jobs" className="text-[13px] font-medium text-gray-900">
              Jobs
            </Link>
            <Link
              to="/candidates"
              className="text-[13px] font-medium text-gray-500 hover:text-gray-900"
            >
              Candidates
            </Link>
            <Link
              to="/companies"
              className="text-[13px] font-medium text-gray-500 hover:text-gray-900"
            >
              Companies
            </Link>
            <Link
              to="/login"
              className="text-[13px] font-medium text-gray-500 hover:text-gray-900"
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-[13px] text-gray-500 mb-6">
          <Link to="/jobs" className="hover:text-gray-700">
            Jobs
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900 truncate max-w-xs">{job.title}</span>
        </nav>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Job Header */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-start gap-4">
                {job.company?.logo ? (
                  <img
                    src={job.company.logo}
                    alt={job.company.name}
                    className="w-16 h-16 rounded-lg object-cover border border-gray-100"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-7 h-7 text-gray-400" />
                  </div>
                )}
                <div className="flex-1">
                  <h1 className="text-[22px] font-semibold text-gray-900">{job.title}</h1>
                  {job.company && (
                    <Link
                      to={`/companies/${job.company.slug}`}
                      className="text-[15px] text-gray-600 hover:text-gray-900"
                    >
                      {job.company.name}
                    </Link>
                  )}
                </div>
              </div>

              {/* Meta Tags */}
              <div className="mt-4 flex flex-wrap gap-3 text-[13px] text-gray-500">
                {job.location_display && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {job.location_display}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Briefcase className="w-4 h-4" />
                  {getJobTypeLabel(job.job_type)}
                </span>
                <span className="flex items-center gap-1">
                  <Globe className="w-4 h-4" />
                  {getWorkModeLabel(job.work_mode)}
                </span>
                {job.department && (
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {getDepartmentLabel(job.department)}
                  </span>
                )}
              </div>

              {/* Tags */}
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="px-2.5 py-1 text-[12px] font-medium bg-gray-100 text-gray-700 rounded">
                  {getSeniorityLabel(job.seniority)}
                </span>
                {job.required_skills?.map((skill) => (
                  <span
                    key={skill.id}
                    className="px-2.5 py-1 text-[12px] font-medium bg-blue-50 text-blue-700 rounded"
                  >
                    {skill.name}
                  </span>
                ))}
              </div>

              {/* Stats */}
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-6 text-[12px] text-gray-400">
                {job.views_count !== undefined && (
                  <span className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" />
                    {job.views_count} views
                  </span>
                )}
                {job.applications_count !== undefined && (
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {job.applications_count} applicants
                  </span>
                )}
                {job.published_at && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Posted {formatDate(job.published_at)}
                  </span>
                )}
              </div>
            </div>

            {/* Job Summary */}
            {job.summary && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h2 className="text-[16px] font-medium text-gray-900 mb-3">Summary</h2>
                <p className="text-[14px] text-gray-600 leading-relaxed">{job.summary}</p>
              </div>
            )}

            {/* Job Description */}
            {job.description && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h2 className="text-[16px] font-medium text-gray-900 mb-3">
                  About the Role
                </h2>
                <div
                  className="text-[14px] text-gray-600 leading-relaxed prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: job.description }}
                />
              </div>
            )}

            {/* Responsibilities */}
            {job.responsibilities && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h2 className="text-[16px] font-medium text-gray-900 mb-3">
                  Responsibilities
                </h2>
                <div
                  className="text-[14px] text-gray-600 leading-relaxed prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: job.responsibilities }}
                />
              </div>
            )}

            {/* Requirements */}
            {job.requirements && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h2 className="text-[16px] font-medium text-gray-900 mb-3">Requirements</h2>
                <div
                  className="text-[14px] text-gray-600 leading-relaxed prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: job.requirements }}
                />
              </div>
            )}

            {/* Nice to Haves */}
            {job.nice_to_haves && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h2 className="text-[16px] font-medium text-gray-900 mb-3">Nice to Have</h2>
                <div
                  className="text-[14px] text-gray-600 leading-relaxed prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: job.nice_to_haves }}
                />
              </div>
            )}

            {/* Technologies */}
            {job.technologies && job.technologies.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h2 className="text-[16px] font-medium text-gray-900 mb-3">Tech Stack</h2>
                <div className="flex flex-wrap gap-2">
                  {job.technologies.map((tech) => (
                    <span
                      key={tech.id}
                      className="px-2.5 py-1 text-[12px] font-medium bg-purple-50 text-purple-700 rounded"
                    >
                      {tech.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Benefits */}
            {job.benefits && job.benefits.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h2 className="text-[16px] font-medium text-gray-900 mb-4">Benefits</h2>
                <div className="space-y-4">
                  {job.benefits.map((category, index) => (
                    <div key={index}>
                      <h3 className="text-[13px] font-medium text-gray-700 mb-2">
                        {category.category}
                      </h3>
                      <ul className="space-y-1">
                        {category.items.map((item, itemIndex) => (
                          <li
                            key={itemIndex}
                            className="text-[13px] text-gray-600 flex items-center gap-2"
                          >
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Apply Card */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 sticky top-6">
              {/* Salary */}
              {job.salary_visible && job.salary_display && (
                <div className="mb-4 pb-4 border-b border-gray-100">
                  <p className="text-[12px] text-gray-500 mb-1">Salary Range</p>
                  <p className="text-[18px] font-semibold text-gray-900">
                    {job.salary_display}
                  </p>
                  {job.equity_offered && (
                    <p className="text-[12px] text-green-600 mt-0.5">+ Equity offered</p>
                  )}
                </div>
              )}

              {/* Deadline */}
              {job.application_deadline && (
                <div className="mb-4 pb-4 border-b border-gray-100">
                  <p className="text-[12px] text-gray-500 mb-1">Application Deadline</p>
                  <p className="text-[14px] font-medium text-gray-900">
                    {formatDate(job.application_deadline)}
                  </p>
                </div>
              )}

              {/* Apply Button */}
              {canApply ? (
                <>
                  <button
                    onClick={() => setShowApplyModal(true)}
                    className="w-full py-2.5 bg-gray-900 text-white text-[14px] font-medium rounded-md hover:bg-gray-800 transition-colors"
                  >
                    Apply Now
                  </button>
                  <p className="text-[11px] text-gray-400 text-center mt-3">
                    Apply with your Oneo profile
                  </p>
                </>
              ) : isAuthenticated ? (
                <div className="text-center">
                  <p className="text-[13px] text-gray-500 mb-2">
                    Applications are for candidates only
                  </p>
                  <Link
                    to="/dashboard"
                    className="text-[13px] font-medium text-gray-900 hover:text-gray-700"
                  >
                    Go to Dashboard
                  </Link>
                </div>
              ) : (
                <>
                  <Link
                    to={`/signup?redirect=/jobs/${slug}`}
                    className="block w-full py-2.5 bg-gray-900 text-white text-[14px] font-medium rounded-md hover:bg-gray-800 transition-colors text-center"
                  >
                    Sign up to Apply
                  </Link>
                  <p className="text-[11px] text-gray-400 text-center mt-3">
                    Already have an account?{' '}
                    <Link to={`/login?redirect=/jobs/${slug}`} className="text-gray-900 hover:underline">
                      Sign in
                    </Link>
                  </p>
                </>
              )}
            </div>

            {/* Company Card */}
            {job.company && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-[14px] font-medium text-gray-900 mb-4">
                  About {job.company.name}
                </h3>
                <div className="flex items-center gap-3 mb-3">
                  {job.company.logo ? (
                    <img
                      src={job.company.logo}
                      alt={job.company.name}
                      className="w-10 h-10 rounded-lg object-cover border border-gray-100"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <p className="text-[13px] font-medium text-gray-900">
                      {job.company.name}
                    </p>
                    {job.company.industry && (
                      <p className="text-[11px] text-gray-500">
                        {job.company.industry.name}
                      </p>
                    )}
                  </div>
                </div>
                {job.company.tagline && (
                  <p className="text-[13px] text-gray-600 mb-3">{job.company.tagline}</p>
                )}
                <Link
                  to={`/companies/${job.company.slug}`}
                  className="flex items-center gap-1 text-[13px] font-medium text-gray-900 hover:text-gray-700"
                >
                  View company profile
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}

            {/* Interview Process */}
            {job.interview_stages && job.interview_stages.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-[14px] font-medium text-gray-900 mb-4">Interview Process</h3>
                <div className="relative">
                  {job.interview_stages
                    .sort((a: InterviewStage, b: InterviewStage) => a.order - b.order)
                    .map((stage: InterviewStage, index: number) => (
                    <div key={index} className="flex gap-3">
                      {/* Timeline connector */}
                      <div className="flex flex-col items-center">
                        <div className="w-6 h-6 bg-gray-900 text-white rounded-full flex items-center justify-center text-[11px] font-medium flex-shrink-0">
                          {stage.order}
                        </div>
                        {index < job.interview_stages!.length - 1 && (
                          <div className="w-0.5 h-full bg-gray-200 min-h-[32px]" />
                        )}
                      </div>
                      {/* Stage content */}
                      <div className="pb-4">
                        <p className="text-[13px] font-medium text-gray-900">{stage.name}</p>
                        {stage.description && (
                          <p className="text-[11px] text-gray-500 mt-0.5">{stage.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Apply Modal */}
      {job && (
        <ApplyModal
          job={job}
          isOpen={showApplyModal}
          onClose={() => setShowApplyModal(false)}
          onSuccess={() => {
            refetch()
          }}
        />
      )}
    </div>
  )
}
