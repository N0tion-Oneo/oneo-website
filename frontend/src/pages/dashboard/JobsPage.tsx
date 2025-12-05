import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useCompanyJobs, useAllJobs, useJobStatus, useDeleteJob } from '@/hooks/useJobs'
import { useMyCompany } from '@/hooks'
import { useAuth } from '@/contexts/AuthContext'
import { JobStatus, UserRole } from '@/types'
import type { JobListItem } from '@/types'
import { statusTabs, getStatusBadge, formatJobDate } from '@/utils/jobs'
import {
  Plus,
  Briefcase,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Play,
  Pause,
  CheckCircle,
  AlertCircle,
  Users,
  Search,
  Building2,
  X,
  ArrowLeft,
} from 'lucide-react'

interface JobsPageProps {
  mode?: 'company' | 'admin'
}

export default function JobsPage({ mode }: JobsPageProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [statusFilter, setStatusFilter] = useState<JobStatus | ''>('')
  const [search, setSearch] = useState('')
  const [openMenu, setOpenMenu] = useState<string | null>(null)

  // Determine mode based on prop or user role
  const isAdminMode = mode === 'admin' ||
    (user && [UserRole.ADMIN, UserRole.RECRUITER].includes(user.role))

  // Admin-specific: company filter from URL params
  const companyFilter = isAdminMode ? (searchParams.get('company') || undefined) : undefined

  // Company mode: get company info
  const { company, isLoading: companyLoading } = useMyCompany()

  // Conditional data fetching based on mode
  const companyJobsResult = useCompanyJobs({
    status: statusFilter || undefined,
  })
  const allJobsResult = useAllJobs({
    status: statusFilter || undefined,
    search: search || undefined,
    company: companyFilter,
  })

  // Use appropriate data based on mode
  const { jobs, isLoading, error, refetch } = isAdminMode ? allJobsResult : companyJobsResult

  const { publishJob, closeJob, markJobFilled, isSubmitting } = useJobStatus()
  const { deleteJob, isDeleting } = useDeleteJob()

  // Get company name from first job if filtering by company (admin mode)
  const filteredCompanyName = companyFilter && jobs.length > 0 ? jobs[0].company?.name : null

  const clearCompanyFilter = () => {
    searchParams.delete('company')
    setSearchParams(searchParams)
  }

  const handlePublish = async (jobId: string) => {
    try {
      await publishJob(jobId)
      refetch()
      setOpenMenu(null)
    } catch (err) {
      console.error('Failed to publish job:', err)
    }
  }

  const handleClose = async (jobId: string) => {
    try {
      await closeJob(jobId)
      refetch()
      setOpenMenu(null)
    } catch (err) {
      console.error('Failed to close job:', err)
    }
  }

  const handleMarkFilled = async (jobId: string) => {
    try {
      await markJobFilled(jobId)
      refetch()
      setOpenMenu(null)
    } catch (err) {
      console.error('Failed to mark job as filled:', err)
    }
  }

  const handleDelete = async (jobId: string) => {
    if (!window.confirm('Are you sure you want to delete this job? This action cannot be undone.')) {
      return
    }
    try {
      await deleteJob(jobId)
      refetch()
      setOpenMenu(null)
    } catch (err) {
      console.error('Failed to delete job:', err)
    }
  }

  // Admin mode: Check role access
  if (isAdminMode && user && ![UserRole.ADMIN, UserRole.RECRUITER].includes(user.role)) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-4" />
        <p className="text-[15px] text-gray-700 mb-2">Access Denied</p>
        <p className="text-[13px] text-gray-500">
          You do not have permission to view this page.
        </p>
      </div>
    )
  }

  // Company mode: Loading state
  if (!isAdminMode && companyLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-[14px] text-gray-500">Loading...</p>
      </div>
    )
  }

  // Company mode: No company profile
  if (!isAdminMode && !company) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-[15px] text-gray-700 mb-2">No company profile</p>
        <p className="text-[13px] text-gray-500 mb-4">
          You need to create a company profile before posting jobs.
        </p>
        <Link
          to="/dashboard/company"
          className="inline-block px-4 py-2 bg-gray-900 text-white text-[13px] font-medium rounded-md hover:bg-gray-800"
        >
          Create Company Profile
        </Link>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          {/* Admin mode: Back link when filtering by company */}
          {isAdminMode && companyFilter && (
            <Link
              to="/dashboard/admin/companies"
              className="flex items-center gap-1 text-[13px] text-gray-500 hover:text-gray-700 mb-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to All Companies
            </Link>
          )}
          <h1 className="text-[20px] font-semibold text-gray-900">
            {isAdminMode
              ? filteredCompanyName
                ? `Jobs: ${filteredCompanyName}`
                : 'All Jobs'
              : 'Job Postings'}
          </h1>
          <p className="text-[13px] text-gray-500 mt-0.5">
            {isAdminMode
              ? companyFilter
                ? 'View and manage jobs for this company'
                : 'View and manage all jobs across all companies'
              : "Manage your company's job listings"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Admin mode: Clear filter and Create Job buttons */}
          {isAdminMode && companyFilter && (
            <>
              <button
                onClick={clearCompanyFilter}
                className="flex items-center gap-2 px-3 py-1.5 text-[13px] text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                <X className="w-4 h-4" />
                Clear Filter
              </button>
              <Link
                to={`/dashboard/admin/jobs/new?company=${companyFilter}`}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-[13px] font-medium rounded-md hover:bg-gray-800"
              >
                <Plus className="w-4 h-4" />
                Create Job
              </Link>
            </>
          )}
          {/* Company mode: Post New Job button */}
          {!isAdminMode && (
            <Link
              to="/dashboard/jobs/new"
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-[13px] font-medium rounded-md hover:bg-gray-800"
            >
              <Plus className="w-4 h-4" />
              Post New Job
            </Link>
          )}
        </div>
      </div>

      {/* Admin mode: Search */}
      {isAdminMode && (
        <div className="mb-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search jobs by title or company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-[13px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300"
            />
          </div>
        </div>
      )}

      {/* Status Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-6">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value as JobStatus | '')}
              className={`pb-3 text-[13px] font-medium border-b-2 transition-colors ${
                statusFilter === tab.value
                  ? 'text-gray-900 border-gray-900'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <p className="text-[14px] text-gray-500">Loading jobs...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-12">
          <p className="text-[14px] text-red-500">{error}</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && jobs.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-[15px] text-gray-700 mb-1">No jobs found</p>
          <p className="text-[13px] text-gray-500 mb-4">
            {isAdminMode
              ? companyFilter
                ? 'This company has no jobs yet'
                : statusFilter || search
                ? 'No jobs match your search criteria'
                : 'No jobs have been created yet'
              : statusFilter
              ? 'No jobs match the selected filter'
              : 'Get started by posting your first job'}
          </p>
          {!isAdminMode && !statusFilter && (
            <Link
              to="/dashboard/jobs/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-[13px] font-medium rounded-md hover:bg-gray-800"
            >
              <Plus className="w-4 h-4" />
              Post New Job
            </Link>
          )}
        </div>
      )}

      {/* Jobs List */}
      {!isLoading && !error && jobs.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                  Job Title
                </th>
                {/* Admin mode: Company column */}
                {isAdminMode && (
                  <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                    Company
                  </th>
                )}
                <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                  Applications
                </th>
                {/* Company mode: Views column */}
                {!isAdminMode && (
                  <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                    Views
                  </th>
                )}
                <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {jobs.map((job: JobListItem) => {
                const badge = getStatusBadge(job.status)
                return (
                  <tr key={job.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <Link
                          to={`/dashboard/jobs/${job.id}`}
                          className="text-[14px] font-medium text-gray-900 hover:text-gray-700"
                        >
                          {job.title}
                        </Link>
                        <p className="text-[12px] text-gray-500 mt-0.5">
                          {job.location_display || 'No location'}
                        </p>
                      </div>
                    </td>
                    {/* Admin mode: Company column */}
                    {isAdminMode && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {job.company?.logo ? (
                            <img
                              src={job.company.logo}
                              alt={job.company.name}
                              className="w-6 h-6 rounded object-cover"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center">
                              <Building2 className="w-3 h-3 text-gray-400" />
                            </div>
                          )}
                          <span className="text-[13px] text-gray-600">
                            {job.company?.name || 'Unknown'}
                          </span>
                        </div>
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 text-[11px] font-medium rounded ${badge.bg} ${badge.text}`}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/dashboard/jobs/${job.id}/applications`}
                        className="text-[13px] text-gray-600 hover:text-gray-900 hover:underline"
                      >
                        {job.applications_count || 0} applications
                      </Link>
                    </td>
                    {/* Company mode: Views column */}
                    {!isAdminMode && (
                      <td className="px-4 py-3 text-[13px] text-gray-600">
                        {job.views_count || 0}
                      </td>
                    )}
                    <td className="px-4 py-3 text-[13px] text-gray-600">
                      {formatJobDate(job.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="relative inline-block">
                        <button
                          onClick={() =>
                            setOpenMenu(openMenu === job.id ? null : job.id)
                          }
                          className="p-1 text-gray-400 hover:text-gray-600 rounded"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {openMenu === job.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setOpenMenu(null)}
                            />
                            <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-20">
                              <div className="py-1">
                                {job.status === JobStatus.PUBLISHED && (
                                  <Link
                                    to={`/jobs/${job.slug}`}
                                    className="flex items-center gap-2 px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-50"
                                  >
                                    <Eye className="w-4 h-4" />
                                    View Listing
                                  </Link>
                                )}
                                <Link
                                  to={`/dashboard/jobs/${job.id}`}
                                  className="flex items-center gap-2 px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-50"
                                >
                                  <Edit className="w-4 h-4" />
                                  Edit Job
                                </Link>
                                <Link
                                  to={`/dashboard/jobs/${job.id}/applications`}
                                  className="flex items-center gap-2 px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-50"
                                >
                                  <Users className="w-4 h-4" />
                                  View Applications
                                </Link>

                                {job.status === JobStatus.DRAFT && (
                                  <button
                                    onClick={() => handlePublish(job.id)}
                                    disabled={isSubmitting}
                                    className="flex items-center gap-2 w-full px-4 py-2 text-[13px] text-success hover:bg-success/10"
                                  >
                                    <Play className="w-4 h-4" />
                                    Publish
                                  </button>
                                )}

                                {job.status === JobStatus.PUBLISHED && (
                                  <>
                                    <button
                                      onClick={() => handleClose(job.id)}
                                      disabled={isSubmitting}
                                      className="flex items-center gap-2 w-full px-4 py-2 text-[13px] text-warning hover:bg-warning/10"
                                    >
                                      <Pause className="w-4 h-4" />
                                      Close Job
                                    </button>
                                    <button
                                      onClick={() => handleMarkFilled(job.id)}
                                      disabled={isSubmitting}
                                      className="flex items-center gap-2 w-full px-4 py-2 text-[13px] text-primary hover:bg-primary/10"
                                    >
                                      <CheckCircle className="w-4 h-4" />
                                      Mark as Filled
                                    </button>
                                  </>
                                )}

                                <hr className="my-1" />
                                <button
                                  onClick={() => handleDelete(job.id)}
                                  disabled={isDeleting}
                                  className="flex items-center gap-2 w-full px-4 py-2 text-[13px] text-error hover:bg-error/10"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Delete Job
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
