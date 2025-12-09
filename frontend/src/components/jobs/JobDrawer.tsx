import { useEffect } from 'react'
import { X, Loader2 } from 'lucide-react'
import { useJobDetail } from '@/hooks/useJobs'
import { getStatusBadge } from '@/utils/jobs'
import JobForm from './JobForm'
import type { Job, JobStatus } from '@/types'

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
  const isCreating = !jobId
  const { job, isLoading, refetch } = useJobDetail(jobId || '')

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

  if (!isOpen) return null

  const statusBadge = job ? getStatusBadge(job.status as JobStatus) : null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-[200] transition-opacity"
        onClick={onClose}
      />

      {/* Drawer - 50% width */}
      <div className="fixed inset-y-0 right-0 w-1/2 min-w-[500px] bg-white shadow-xl z-[201] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-[16px] font-semibold text-gray-900">
              {isCreating ? 'Create New Job' : isLoading ? 'Loading...' : job?.title || 'Job'}
            </h2>
            {!isCreating && job && (
              <p className="text-[13px] text-gray-500 mt-0.5">
                {job.company?.name}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Status Badge */}
            {!isCreating && job && statusBadge && (
              <span className={`px-2.5 py-1.5 text-[12px] font-medium rounded ${statusBadge.bg} ${statusBadge.text}`}>
                {statusBadge.label}
              </span>
            )}

            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading && !isCreating ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-[14px] text-gray-500">Loading job...</p>
            </div>
          ) : (
            <JobForm
              job={isCreating ? undefined : job || undefined}
              companyId={companyId}
              onSuccess={handleSuccess}
            />
          )}
        </div>
      </div>
    </>
  )
}
