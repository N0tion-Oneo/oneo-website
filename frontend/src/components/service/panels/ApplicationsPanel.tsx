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
  User,
} from 'lucide-react'
import api from '@/services/api'
import type { ApplicationListItem, ApplicationStatus } from '@/types'

interface ApplicationsPanelProps {
  /** Show applications for a specific candidate (jobs they applied to) */
  candidateId?: string | number
  /** Show applications for a specific job (candidates who applied) */
  jobId?: string
  mode?: 'admin' | 'client'
  /** Callback for candidate view - add candidate to a job */
  onAddToJob?: () => void
  /** Callback for job view - add a candidate to this job */
  onAddCandidate?: () => void
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

export function ApplicationsPanel({ candidateId, jobId, mode = 'admin', onAddToJob, onAddCandidate, onApplicationClick }: ApplicationsPanelProps) {
  const [applications, setApplications] = useState<ApplicationListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Determine view mode based on which prop is provided
  const viewMode = jobId ? 'job' : 'candidate'
  const entityId = jobId || candidateId

  const fetchApplications = useCallback(async () => {
    if (!entityId) return

    try {
      setIsLoading(true)
      setError(null)
      const endpoint = viewMode === 'job'
        ? `/jobs/${jobId}/applications/`
        : `/admin/candidates/${candidateId}/applications/`
      const response = await api.get(endpoint)
      setApplications(response.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load applications')
    } finally {
      setIsLoading(false)
    }
  }, [viewMode, jobId, candidateId, entityId])

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

  // Determine add action based on view mode
  const addAction = viewMode === 'job' ? onAddCandidate : onAddToJob
  const addLabel = viewMode === 'job' ? 'Add Candidate' : 'Add to Job'

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {/* Header with Add button (Admin only) */}
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-medium text-gray-900 dark:text-gray-100">
          Applications ({applications.length})
        </h3>
        {mode === 'admin' && addAction && (
          <button
            onClick={addAction}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            {addLabel}
          </button>
        )}
      </div>

      {/* Applications List */}
      {applications.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
          {viewMode === 'job' ? (
            <User className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
          ) : (
            <Briefcase className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
          )}
          <p className="text-[13px] text-gray-500 dark:text-gray-400">
            {viewMode === 'job' ? 'No candidates have applied yet' : 'No applications yet'}
          </p>
          {mode === 'admin' && addAction && (
            <button
              onClick={addAction}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-white dark:text-gray-900 bg-gray-900 dark:bg-gray-100 rounded-md hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              {addLabel}
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
                {/* Avatar/Logo based on view mode */}
                {viewMode === 'job' ? (
                  // Job view: Show candidate initials (no avatar in ApplicationListItem)
                  <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
                      {application.candidate_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                    </span>
                  </div>
                ) : (
                  // Candidate view: Show company logo
                  application.company_logo ? (
                    <img
                      src={application.company_logo}
                      alt={application.company_name}
                      className="w-6 h-6 rounded object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                    </div>
                  )
                )}

                {/* Title & Subtitle based on view mode */}
                <div className="flex-1 min-w-0">
                  {viewMode === 'job' ? (
                    // Job view: Show candidate name and email
                    <>
                      <span className="text-[13px] font-medium text-gray-900 dark:text-gray-100 truncate block">
                        {application.candidate_name || 'Unknown Candidate'}
                      </span>
                      <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate block">
                        {application.candidate_email}
                      </span>
                    </>
                  ) : (
                    // Candidate view: Show job title and company
                    <>
                      <span className="text-[13px] font-medium text-gray-900 dark:text-gray-100 truncate block">
                        {application.job_title}
                      </span>
                      <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate block">
                        {application.company_name}
                      </span>
                    </>
                  )}
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
