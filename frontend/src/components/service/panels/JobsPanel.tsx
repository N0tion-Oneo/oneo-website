import { Link } from 'react-router-dom'
import { Briefcase, ExternalLink, Users, Clock } from 'lucide-react'
import { useAllJobs } from '@/hooks'

interface JobsPanelProps {
  companyId: string
  entity?: Record<string, unknown>
}

function getJobStatusBadge(status: string) {
  switch (status) {
    case 'published':
      return { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700', label: 'Live' }
    case 'draft':
      return { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-500 dark:text-gray-400', label: 'Draft' }
    case 'closed':
      return { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700', label: 'Closed' }
    case 'filled':
      return { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700', label: 'Filled' }
    default:
      return { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-500 dark:text-gray-400', label: status }
  }
}

export function JobsPanel({ companyId }: JobsPanelProps) {
  const { jobs, isLoading } = useAllJobs({ company: companyId })

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100" />
      </div>
    )
  }

  if (!jobs || jobs.length === 0) {
    return (
      <div className="h-full overflow-y-auto p-4">
        <div className="text-center py-8">
          <Briefcase className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">No jobs found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-3">
      {jobs.map((job) => {
        const statusBadge = getJobStatusBadge(job.status)
        return (
          <div
            key={job.id}
            className="p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                  {job.title}
                </h4>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {job.location_display && (
                    <span>{job.location_display}</span>
                  )}
                  {job.job_type && (
                    <span className="capitalize">{job.job_type.replace('_', ' ')}</span>
                  )}
                </div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadge.bg} ${statusBadge.text}`}>
                {statusBadge.label}
              </span>
            </div>

            <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {job.applications_count || 0} applications
              </span>
              {job.created_at && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(job.created_at).toLocaleDateString()}
                </span>
              )}
            </div>

            <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-800">
              <Link
                to={`/dashboard/admin/jobs/${job.slug || job.id}`}
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
              >
                <ExternalLink className="w-3 h-3" />
                View Details
              </Link>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default JobsPanel
