import { useState, useEffect, useMemo } from 'react'
import { X, Search, Briefcase, Building2, Loader2, Check, CheckCircle2 } from 'lucide-react'
import api from '@/services/api'

interface Job {
  id: string
  title: string
  company_name: string
  company_logo: string | null
  status: string
  location: string | null
}

interface ExistingApplication {
  id: string
  job: string
  status: string
}

interface AddToJobModalProps {
  isOpen: boolean
  onClose: () => void
  candidateId: number
  candidateName: string
  onSuccess?: () => void
}

type TabType = 'open' | 'applied'

export default function AddToJobModal({
  isOpen,
  onClose,
  candidateId,
  candidateName,
  onSuccess,
}: AddToJobModalProps) {
  const [jobs, setJobs] = useState<Job[]>([])
  const [existingApplications, setExistingApplications] = useState<ExistingApplication[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('open')

  // Fetch jobs and existing applications on mount
  useEffect(() => {
    if (!isOpen) return

    const fetchData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Fetch both jobs and existing applications in parallel
        const [jobsResponse, applicationsResponse] = await Promise.all([
          api.get('/jobs/all/'),
          api.get(`/admin/candidates/${candidateId}/applications/`)
        ])

        const jobsList = jobsResponse.data.results || jobsResponse.data || []
        const applicationsList = applicationsResponse.data || []

        setJobs(jobsList)
        setExistingApplications(applicationsList)
      } catch (err) {
        console.error('Failed to load data:', err)
        setError('Failed to load jobs')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [isOpen, candidateId])

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('')
      setSelectedJobId(null)
      setActiveTab('open')
      setError(null)
    }
  }, [isOpen])

  // Get set of job IDs candidate has already applied to
  const appliedJobIds = useMemo(() => {
    return new Set(existingApplications.map(app => app.job))
  }, [existingApplications])

  // Split jobs into open (not applied) and applied
  const { openJobs, appliedJobs } = useMemo(() => {
    const open: Job[] = []
    const applied: Job[] = []

    jobs.forEach(job => {
      if (appliedJobIds.has(job.id)) {
        applied.push(job)
      } else {
        open.push(job)
      }
    })

    return { openJobs: open, appliedJobs: applied }
  }, [jobs, appliedJobIds])

  // Filter jobs based on search and active tab
  const filteredJobs = useMemo(() => {
    const sourceJobs = activeTab === 'open' ? openJobs : appliedJobs

    if (!searchQuery.trim()) {
      return sourceJobs
    }

    const query = searchQuery.toLowerCase()
    return sourceJobs.filter(
      (job) =>
        job.title.toLowerCase().includes(query) ||
        job.company_name.toLowerCase().includes(query)
    )
  }, [searchQuery, activeTab, openJobs, appliedJobs])

  const handleSubmit = async () => {
    if (!selectedJobId) return

    try {
      setIsSubmitting(true)
      setError(null)
      await api.post(`/admin/candidates/${candidateId}/applications/create/`, {
        job_id: selectedJobId,
        source: 'recruiter',
      })
      onSuccess?.()
      onClose()
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add candidate to job'
      const axiosError = err as { response?: { data?: { error?: string } } }
      setError(axiosError.response?.data?.error || errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Get application status for a job
  const getApplicationStatus = (jobId: string) => {
    const app = existingApplications.find(a => a.job === jobId)
    return app?.status || null
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      applied: 'Applied',
      shortlisted: 'Shortlisted',
      in_progress: 'In Progress',
      offer_made: 'Offer Made',
      offer_accepted: 'Hired',
      offer_declined: 'Declined',
      rejected: 'Rejected',
    }
    return labels[status] || status
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 dark:bg-black/70 z-[300]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-[301] p-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl dark:shadow-gray-900/50 w-full max-w-lg max-h-[80vh] flex flex-col">
          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div>
              <h2 className="text-[16px] font-semibold text-gray-900 dark:text-gray-100">Add to Job</h2>
              <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">
                Add {candidateName} to a job pipeline
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="px-5 pt-3 border-b border-gray-100 dark:border-gray-800">
            <div className="flex gap-1">
              <button
                onClick={() => setActiveTab('open')}
                className={`px-4 py-2 text-[13px] font-medium rounded-t-lg transition-colors ${
                  activeTab === 'open'
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Open Jobs ({openJobs.length})
              </button>
              <button
                onClick={() => setActiveTab('applied')}
                className={`px-4 py-2 text-[13px] font-medium rounded-t-lg transition-colors ${
                  activeTab === 'applied'
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Already Applied ({appliedJobs.length})
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search jobs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-[14px] border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10 dark:focus:ring-gray-100/10 focus:border-gray-300 dark:focus:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>
          </div>

          {/* Jobs List */}
          <div className="flex-1 overflow-y-auto p-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="text-center py-8">
                <Briefcase className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-[13px] text-gray-500 dark:text-gray-400">
                  {searchQuery
                    ? 'No jobs match your search'
                    : activeTab === 'open'
                      ? 'No open jobs available'
                      : 'No applications yet'
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredJobs.map((job) => {
                  const isApplied = activeTab === 'applied'
                  const applicationStatus = isApplied ? getApplicationStatus(job.id) : null
                  const isSelectable = !isApplied

                  return (
                    <button
                      key={job.id}
                      onClick={() => isSelectable && setSelectedJobId(job.id)}
                      disabled={!isSelectable}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        isApplied
                          ? 'bg-gray-50 dark:bg-gray-800 cursor-default'
                          : selectedJobId === job.id
                            ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                            : 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {job.company_logo ? (
                          <img
                            src={job.company_logo}
                            alt={job.company_name}
                            className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            selectedJobId === job.id && !isApplied ? 'bg-gray-700 dark:bg-gray-300' : 'bg-gray-100 dark:bg-gray-700'
                          }`}>
                            <Building2 className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className={`text-[14px] font-medium truncate ${
                            isApplied
                              ? 'text-gray-700 dark:text-gray-300'
                              : selectedJobId === job.id
                                ? 'text-white dark:text-gray-900'
                                : 'text-gray-900 dark:text-gray-100'
                          }`}>
                            {job.title}
                          </p>
                          <p className={`text-[12px] truncate ${
                            isApplied
                              ? 'text-gray-500 dark:text-gray-400'
                              : selectedJobId === job.id
                                ? 'text-gray-300 dark:text-gray-600'
                                : 'text-gray-500 dark:text-gray-400'
                          }`}>
                            {job.company_name}
                            {job.location && ` · ${job.location}`}
                          </p>
                          {/* Show application status for applied jobs */}
                          {isApplied && applicationStatus && (
                            <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 text-[11px] font-medium bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                              <CheckCircle2 className="w-3 h-3" />
                              {getStatusLabel(applicationStatus)}
                            </span>
                          )}
                        </div>
                        {!isApplied && selectedJobId === job.id && (
                          <Check className="w-5 h-5 text-white dark:text-gray-900 flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="px-5 py-2 bg-red-50 dark:bg-red-900/20 border-t border-red-100 dark:border-red-800">
              <p className="text-[13px] text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Footer */}
          <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-[14px] font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!selectedJobId || isSubmitting || activeTab === 'applied'}
              className="px-4 py-2 text-[14px] font-medium text-white bg-gray-900 dark:bg-gray-100 dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSubmitting ? 'Adding...' : 'Add to Job'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
