import { useParams, useNavigate } from 'react-router-dom'
import { useJobDetail } from '@/hooks/useJobs'
import { JobForm } from '@/components/jobs'
import { ArrowLeft, Briefcase, Loader2 } from 'lucide-react'
import type { Job } from '@/types'

export default function EditJobPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const navigate = useNavigate()
  const { job, isLoading, error } = useJobDetail(jobId || '')

  const handleSuccess = (updatedJob: Job) => {
    navigate('/dashboard/jobs')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-gray-400 dark:text-gray-500 animate-spin" />
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
        <Briefcase className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <p className="text-[15px] text-gray-700 dark:text-gray-300 mb-1">Job not found</p>
        <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-4">
          This job may have been deleted or you don't have access to it
        </p>
        <button
          onClick={() => navigate('/dashboard/jobs')}
          className="inline-flex items-center gap-2 text-[13px] font-medium text-gray-900 dark:text-gray-100 hover:text-gray-700 dark:hover:text-gray-300"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Jobs
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/dashboard/jobs')}
          className="flex items-center gap-1 text-[13px] text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Jobs
        </button>
        <h1 className="text-[20px] font-semibold text-gray-900 dark:text-gray-100">Edit Job</h1>
        <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">{job.title}</p>
      </div>

      {/* Form */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <JobForm job={job} companyId={job.company.id} onSuccess={handleSuccess} />
      </div>
    </div>
  )
}
