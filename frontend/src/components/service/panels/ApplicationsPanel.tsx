import { useState, useEffect, useCallback } from 'react'
import {
  Briefcase,
  Building2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  Loader2,
  ChevronRight,
} from 'lucide-react'
import api from '@/services/api'
import type { ApplicationListItem, ApplicationStatus } from '@/types'

interface ApplicationsPanelProps {
  candidateId: string | number
  mode?: 'admin' | 'client'
  onAddToJob?: () => void
  onApplicationClick?: (applicationId: string) => void
}

const statusConfig: Record<ApplicationStatus, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  applied: { label: 'Applied', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700', icon: Clock },
  shortlisted: { label: 'Shortlisted', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700', icon: CheckCircle2 },
  in_progress: { label: 'In Progress', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700', icon: AlertCircle },
  offer_made: { label: 'Offer Made', color: 'bg-green-100 dark:bg-green-900/30 text-green-700', icon: CheckCircle2 },
  offer_accepted: { label: 'Offer Accepted', color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700', icon: CheckCircle2 },
  offer_declined: { label: 'Offer Declined', color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700', icon: XCircle },
  rejected: { label: 'Rejected', color: 'bg-red-100 dark:bg-red-900/30 text-red-700', icon: XCircle },
}

export function ApplicationsPanel({ candidateId, mode = 'admin', onAddToJob, onApplicationClick }: ApplicationsPanelProps) {
  const [applications, setApplications] = useState<ApplicationListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchApplications = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await api.get(`/admin/candidates/${candidateId}/applications/`)
      setApplications(response.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load applications')
    } finally {
      setIsLoading(false)
    }
  }, [candidateId])

  useEffect(() => {
    fetchApplications()
  }, [fetchApplications])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400 dark:text-gray-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full overflow-y-auto p-4">
        <div className="text-center py-8">
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={fetchApplications}
            className="mt-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 underline"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {/* Header with Add button (Admin only) */}
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-medium text-gray-900 dark:text-gray-100">
          Applications ({applications.length})
        </h3>
        {mode === 'admin' && onAddToJob && (
          <button
            onClick={onAddToJob}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add to Job
          </button>
        )}
      </div>

      {/* Applications List */}
      {applications.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <Briefcase className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
          <p className="text-[13px] text-gray-500 dark:text-gray-400">No applications yet</p>
          {mode === 'admin' && onAddToJob && (
            <button
              onClick={onAddToJob}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-white dark:text-gray-900 bg-gray-900 dark:bg-gray-100 rounded-md hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add to a Job
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-1">
          {applications.map((application) => {
            const status = statusConfig[application.status]
            const StatusIcon = status.icon

            return (
              <button
                key={application.id}
                onClick={() => onApplicationClick?.(String(application.id))}
                className="w-full flex items-center gap-3 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all group text-left"
              >
                {/* Company Logo */}
                {application.company_logo ? (
                  <img
                    src={application.company_logo}
                    alt={application.company_name}
                    className="w-6 h-6 rounded object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                  </div>
                )}

                {/* Job Title & Company */}
                <div className="flex-1 min-w-0">
                  <span className="text-[13px] font-medium text-gray-900 dark:text-gray-100 truncate block">
                    {application.job_title}
                  </span>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate block">
                    {application.company_name}
                  </span>
                </div>

                {/* Status */}
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full flex-shrink-0 ${status.color}`}
                >
                  <StatusIcon className="w-3 h-3" />
                  {status.label}
                </span>

                {/* Stage (if in progress) */}
                {application.current_stage_name && application.status === 'in_progress' && (
                  <span className="px-2 py-0.5 text-[11px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full flex-shrink-0 hidden sm:inline-flex">
                    {application.current_stage_name}
                  </span>
                )}

                {/* Date */}
                <span className="text-[11px] text-gray-400 dark:text-gray-500 flex-shrink-0 hidden sm:block">
                  {formatDate(application.applied_at)}
                </span>

                {/* Arrow */}
                <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-gray-400 dark:group-hover:text-gray-500 transition-colors flex-shrink-0" />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default ApplicationsPanel
