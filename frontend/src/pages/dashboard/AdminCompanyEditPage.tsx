import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useCompanyById } from '@/hooks/useCompanies'
import { useAuth } from '@/contexts/AuthContext'
import { CompanyTabs } from '@/components/company'
import { UserRole } from '@/types'
import type { CompanyInput } from '@/types'
import { ArrowLeft, AlertCircle, CheckCircle, Briefcase, Plus, Sparkles, Building2 } from 'lucide-react'

export default function AdminCompanyEditPage() {
  const { companyId } = useParams<{ companyId: string }>()
  const { user } = useAuth()
  const { company, isLoading, error, updateCompany, isUpdating } = useCompanyById(companyId || '')
  const [saveSuccess, setSaveSuccess] = useState(false)

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

  const handleSave = async (data: CompanyInput) => {
    try {
      await updateCompany(data)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch {
      // Error is handled by the hook
    }
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            to="/dashboard/admin/companies"
            className="flex items-center gap-1 text-[13px] text-gray-500 hover:text-gray-700 mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to All Companies
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-[22px] font-semibold text-gray-900">
              Edit: {company.name}
            </h1>
            {company.is_platform ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-700">
                <Sparkles className="w-3 h-3" />
                Platform
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-700">
                <Building2 className="w-3 h-3" />
                Client
              </span>
            )}
          </div>
          <p className="text-[14px] text-gray-500 mt-0.5">
            Editing company profile as {user.role}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saveSuccess && (
            <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg text-[14px]">
              <CheckCircle className="w-4 h-4" />
              Changes saved successfully
            </div>
          )}
          <Link
            to={`/dashboard/admin/jobs?company=${company.id}`}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 text-[13px] font-medium rounded-md hover:bg-gray-50"
          >
            <Briefcase className="w-4 h-4" />
            View Jobs
          </Link>
          <Link
            to={`/dashboard/admin/jobs/new?company=${company.id}`}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-[13px] font-medium rounded-md hover:bg-gray-800"
          >
            <Plus className="w-4 h-4" />
            Create Job
          </Link>
        </div>
      </div>

      <CompanyTabs
        company={company}
        onSave={handleSave}
        isUpdating={isUpdating}
        currentUserId={user?.id || ''}
        isAdmin={true}  // Admin/Recruiter always have admin access when viewing
        companyId={companyId}
        isStaff={true}  // Staff can edit subscriptions
      />
    </div>
  )
}
