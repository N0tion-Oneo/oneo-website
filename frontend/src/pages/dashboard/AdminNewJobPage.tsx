import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useCompanyById } from '@/hooks/useCompanies'
import { useAuth } from '@/contexts/AuthContext'
import { JobForm } from '@/components/jobs'
import { UserRole } from '@/types'
import type { Job } from '@/types'
import { ArrowLeft, AlertCircle, Building2 } from 'lucide-react'

export default function AdminNewJobPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const companyId = searchParams.get('company')

  const { company, isLoading, error } = useCompanyById(companyId || '')

  // Check if user has admin/recruiter access
  if (!user || ![UserRole.ADMIN, UserRole.RECRUITER].includes(user.role)) {
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

  // Require a company ID
  if (!companyId) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-[15px] text-gray-700 mb-2">No Company Selected</p>
        <p className="text-[13px] text-gray-500 mb-4">
          Please select a company to create a job for.
        </p>
        <Link
          to="/dashboard/admin/companies"
          className="text-[13px] text-gray-700 underline hover:text-gray-900"
        >
          Go to Companies
        </Link>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-gray-900 mx-auto" />
          <p className="text-[14px] text-gray-500 mt-3">Loading company...</p>
        </div>
      </div>
    )
  }

  if (error || !company) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-[15px] text-gray-700 mb-1">
            {error || 'Company not found'}
          </p>
          <Link
            to="/dashboard/admin/companies"
            className="text-[13px] text-gray-500 hover:text-gray-700 underline"
          >
            Back to Companies
          </Link>
        </div>
      </div>
    )
  }

  const handleSuccess = (job: Job) => {
    navigate(`/dashboard/admin/jobs?company=${companyId}`)
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(`/dashboard/admin/jobs?company=${companyId}`)}
          className="flex items-center gap-1 text-[13px] text-gray-500 hover:text-gray-700 mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Jobs
        </button>
        <h1 className="text-[20px] font-semibold text-gray-900">
          Create Job for {company.name}
        </h1>
        <p className="text-[13px] text-gray-500 mt-0.5">
          Fill in the details below to create a new job listing
        </p>
      </div>

      {/* Form */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <JobForm companyId={companyId} onSuccess={handleSuccess} />
      </div>
    </div>
  )
}
