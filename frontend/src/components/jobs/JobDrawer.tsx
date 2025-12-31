import { useEffect, useState, useRef } from 'react'
import { X, ChevronDown } from 'lucide-react'
import { useJobDetail, useJobStatus, useUpdateJob } from '@/hooks/useJobs'
import { useAllCompanies } from '@/hooks'
import { useAuth } from '@/contexts/AuthContext'
import { getStatusBadge } from '@/utils/jobs'
import { AssignedSelect } from '@/components/forms'
import JobForm from './JobForm'
import { UserRole, JobStatus } from '@/types'
import type { Job, AssignedUser } from '@/types'

interface JobDrawerProps {
  jobId: string | null
  isOpen: boolean
  onClose: () => void
  onSuccess?: (job: Job) => void
  companyId?: string
}

export default function JobDrawer({
  jobId,
  isOpen,
  onClose,
  onSuccess,
  companyId,
}: JobDrawerProps) {
  const { user } = useAuth()
  const isCreating = !jobId
  const isAdminOrRecruiter = user?.role === UserRole.ADMIN || user?.role === UserRole.RECRUITER

  const { job, isLoading, refetch } = useJobDetail(jobId || '')
  const { companies: allCompanies, isLoading: isLoadingCompanies } = useAllCompanies()
  const { publishJob, closeJob, markJobFilled, isSubmitting: isStatusSubmitting } = useJobStatus()
  const { updateJob } = useUpdateJob()

  // State for client and assigned recruiters (controlled in drawer, passed to form)
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | undefined>(companyId)
  const [selectedRecruiters, setSelectedRecruiters] = useState<AssignedUser[]>([])

  // Status dropdown state
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  const statusDropdownRef = useRef<HTMLDivElement>(null)

  // Initialize from job data when editing
  useEffect(() => {
    if (job) {
      setSelectedCompanyId(job.company?.id)
      setSelectedRecruiters(
        job.assigned_recruiters?.map(r => ({
          id: r.id,
          email: r.email,
          first_name: r.first_name,
          last_name: r.last_name,
          full_name: `${r.first_name} ${r.last_name}`,
        })) || []
      )
    } else if (companyId) {
      setSelectedCompanyId(companyId)
    }
  }, [job, companyId])

  // Reset state when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedCompanyId(companyId)
      setSelectedRecruiters([])
    }
  }, [isOpen, companyId])

  // Refetch job data when drawer opens with a job ID
  useEffect(() => {
    if (isOpen && jobId) {
      refetch()
    }
  }, [isOpen, jobId, refetch])

  // Handle successful save
  const handleSuccess = (savedJob: Job) => {
    if (onSuccess) {
      onSuccess(savedJob)
    }
    onClose()
  }

  // Handle status change
  const handleStatusChange = async (newStatus: JobStatus) => {
    if (!jobId || !job) return

    try {
      if (newStatus === JobStatus.PUBLISHED) {
        await publishJob(jobId)
      } else if (newStatus === JobStatus.CLOSED) {
        await closeJob(jobId)
      } else if (newStatus === JobStatus.FILLED) {
        await markJobFilled(jobId)
      } else if (newStatus === JobStatus.DRAFT) {
        await updateJob(jobId, { status: JobStatus.DRAFT })
      }
      setShowStatusDropdown(false)
      refetch()
    } catch (err) {
      console.error('Failed to change status:', err)
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setShowStatusDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // All available statuses
  const allStatuses = [
    { status: JobStatus.DRAFT, label: 'Draft' },
    { status: JobStatus.PUBLISHED, label: 'Published' },
    { status: JobStatus.CLOSED, label: 'Closed' },
    { status: JobStatus.FILLED, label: 'Filled' },
  ]

  if (!isOpen) return null

  const statusBadge = job ? getStatusBadge(job.status as JobStatus) : null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 dark:bg-black/50 z-[200] transition-opacity"
        onClick={onClose}
      />

      {/* Drawer - 50% width */}
      <div className="fixed inset-y-0 right-0 w-1/2 min-w-[500px] bg-white dark:bg-gray-900 shadow-xl dark:shadow-gray-900/50 z-[201] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          {/* Top row: Title, status, close */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-[16px] font-semibold text-gray-900 dark:text-gray-100">
                {isCreating ? 'Create New Job' : isLoading ? 'Loading...' : job?.title || 'Job'}
              </h2>
              {/* Status Badge with Dropdown */}
              {!isCreating && job && statusBadge && (
                <div className="relative" ref={statusDropdownRef}>
                  <button
                    onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                    disabled={isStatusSubmitting}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded ${statusBadge.bg} ${statusBadge.text} hover:opacity-80 transition-opacity cursor-pointer disabled:opacity-50`}
                  >
                    {statusBadge.label}
                    <ChevronDown className="w-3 h-3" />
                  </button>

                  {showStatusDropdown && (
                    <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg dark:shadow-gray-900/40 z-50 min-w-[140px]">
                      <div className="py-1">
                        {allStatuses
                          .filter(({ status }) => status !== job.status)
                          .map(({ status, label }) => {
                            const badge = getStatusBadge(status)
                            return (
                              <button
                                key={status}
                                onClick={() => handleStatusChange(status)}
                                disabled={isStatusSubmitting}
                                className="w-full px-3 py-2 text-left text-[13px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 disabled:opacity-50"
                              >
                                <span className={`w-2 h-2 rounded-full ${badge?.bg || 'bg-gray-300'}`} />
                                {label}
                              </button>
                            )
                          })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Admin/Recruiter: Client & Assigned fields */}
          {isAdminOrRecruiter && (
            <div className="mt-3 flex items-center gap-6">
              {/* Client Select */}
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-gray-500 dark:text-gray-400">Client:</span>
                <select
                  value={selectedCompanyId || ''}
                  onChange={(e) => setSelectedCompanyId(e.target.value || undefined)}
                  disabled={isLoadingCompanies}
                  className="px-2 py-1 text-[13px] border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-gray-100 disabled:bg-gray-50 dark:disabled:bg-gray-800 text-gray-900 dark:text-gray-100 min-w-[150px]"
                >
                  <option value="">Select company...</option>
                  {allCompanies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Assigned Recruiters */}
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-gray-500 dark:text-gray-400">Assigned:</span>
                <AssignedSelect
                  selected={selectedRecruiters}
                  onChange={setSelectedRecruiters}
                  placeholder="Add staff..."
                  compact
                />
              </div>
            </div>
          )}

          {/* Non-admin: Just show company name */}
          {!isAdminOrRecruiter && !isCreating && job?.company && (
            <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">
              {job.company.name}
            </p>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading && !isCreating ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-[14px] text-gray-500 dark:text-gray-400">Loading job...</p>
            </div>
          ) : (
            <JobForm
              job={isCreating ? undefined : job || undefined}
              companyId={selectedCompanyId}
              onSuccess={handleSuccess}
              selectedRecruiters={selectedRecruiters}
              onRecruitersChange={setSelectedRecruiters}
            />
          )}
        </div>
      </div>
    </>
  )
}
