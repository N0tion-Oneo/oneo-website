import { useNavigate } from 'react-router-dom'
import { JobForm } from '@/components/jobs'
import { ArrowLeft } from 'lucide-react'
import type { Job } from '@/types'

export default function NewJobPage() {
  const navigate = useNavigate()

  const handleSuccess = (job: Job) => {
    navigate('/dashboard/jobs')
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/dashboard/jobs')}
          className="flex items-center gap-1 text-[13px] text-gray-500 hover:text-gray-700 mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Jobs
        </button>
        <h1 className="text-[20px] font-semibold text-gray-900">Post a New Job</h1>
        <p className="text-[13px] text-gray-500 mt-0.5">
          Fill in the details below to create a new job listing
        </p>
      </div>

      {/* Form */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <JobForm onSuccess={handleSuccess} />
      </div>
    </div>
  )
}
