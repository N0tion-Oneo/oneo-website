import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCompanyJobs, useJobStatus, useDeleteJob } from '@/hooks/useJobs'
import { useMyCompany } from '@/hooks'
import { JobStatus } from '@/types'
import type { JobListItem } from '@/types'
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
} from 'lucide-react'

const statusTabs = [
  { value: '', label: 'All Jobs' },
  { value: JobStatus.DRAFT, label: 'Draft' },
  { value: JobStatus.PUBLISHED, label: 'Published' },
  { value: JobStatus.CLOSED, label: 'Closed' },
  { value: JobStatus.FILLED, label: 'Filled' },
]

const getStatusBadge = (status: JobStatus) => {
  const badges: Record<
    string,
    { bg: string; text: string; label: string }
  > = {
    draft: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Draft' },
    published: { bg: 'bg-green-100', text: 'text-green-700', label: 'Published' },
    closed: { bg: 'bg-red-100', text: 'text-red-700', label: 'Closed' },
    filled: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Filled' },
    archived: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Archived' },
  }
  return badges[status] || badges.draft
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function JobsPage() {
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState<JobStatus | ''>('')
  const [openMenu, setOpenMenu] = useState<string | null>(null)

  const { company, isLoading: companyLoading } = useMyCompany()
  const { jobs, isLoading, error, refetch } = useCompanyJobs({
    status: statusFilter || undefined,
  })
  const { publishJob, closeJob, markJobFilled, isSubmitting } = useJobStatus()
  const { deleteJob, isDeleting } = useDeleteJob()

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

  if (companyLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-[14px] text-gray-500">Loading...</p>
      </div>
    )
  }

  if (!company) {
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
          <h1 className="text-[20px] font-semibold text-gray-900">Job Postings</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">
            Manage your company's job listings
          </p>
        </div>
        <Link
          to="/dashboard/jobs/new"
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-[13px] font-medium rounded-md hover:bg-gray-800"
        >
          <Plus className="w-4 h-4" />
          Post New Job
        </Link>
      </div>

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
            {statusFilter
              ? 'No jobs match the selected filter'
              : 'Get started by posting your first job'}
          </p>
          {!statusFilter && (
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
                <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                  Applications
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                  Views
                </th>
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
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 text-[11px] font-medium rounded ${badge.bg} ${badge.text}`}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-gray-600">
                      {job.applications_count || 0}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-gray-600">
                      {job.views_count || 0}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-gray-600">
                      {formatDate(job.created_at)}
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
                                <Link
                                  to={`/jobs/${job.slug}`}
                                  className="flex items-center gap-2 px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-50"
                                >
                                  <Eye className="w-4 h-4" />
                                  View Listing
                                </Link>
                                <Link
                                  to={`/dashboard/jobs/${job.id}`}
                                  className="flex items-center gap-2 px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-50"
                                >
                                  <Edit className="w-4 h-4" />
                                  Edit Job
                                </Link>

                                {job.status === JobStatus.DRAFT && (
                                  <button
                                    onClick={() => handlePublish(job.id)}
                                    disabled={isSubmitting}
                                    className="flex items-center gap-2 w-full px-4 py-2 text-[13px] text-green-700 hover:bg-green-50"
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
                                      className="flex items-center gap-2 w-full px-4 py-2 text-[13px] text-orange-700 hover:bg-orange-50"
                                    >
                                      <Pause className="w-4 h-4" />
                                      Close Job
                                    </button>
                                    <button
                                      onClick={() => handleMarkFilled(job.id)}
                                      disabled={isSubmitting}
                                      className="flex items-center gap-2 w-full px-4 py-2 text-[13px] text-blue-700 hover:bg-blue-50"
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
                                  className="flex items-center gap-2 w-full px-4 py-2 text-[13px] text-red-600 hover:bg-red-50"
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
