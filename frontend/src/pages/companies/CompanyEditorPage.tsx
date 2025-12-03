import { useState } from 'react'
import { useMyCompany, useCompanyUsers } from '@/hooks'
import { CreateCompanyForm, CompanyTabs } from '@/components/company'
import { useAuth } from '@/contexts/AuthContext'
import { AlertCircle, CheckCircle, UserX } from 'lucide-react'
import type { CompanyInput } from '@/types'

export default function CompanyEditorPage() {
  const { user } = useAuth()
  const { company, isLoading, error, updateCompany, isUpdating, refetch } = useMyCompany()
  const { users: companyUsers } = useCompanyUsers()
  const [saveSuccess, setSaveSuccess] = useState(false)

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

  if (error && !company) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-[15px] text-gray-700 mb-1">Error loading company</p>
          <p className="text-[13px] text-gray-500">{error}</p>
        </div>
      </div>
    )
  }

  // Check if user can create a company (CLIENT, RECRUITER, or ADMIN)
  const canCreateCompany = user?.role && ['client', 'recruiter', 'admin'].includes(user.role)

  if (!company) {
    // CLIENT/RECRUITER/ADMIN users can create a company
    if (canCreateCompany) {
      return (
        <div className="space-y-6">
          <div>
            <h1 className="text-[22px] font-semibold text-gray-900">Company Profile</h1>
            <p className="text-[14px] text-gray-500 mt-0.5">
              Create your company profile to get started
            </p>
          </div>
          <CreateCompanyForm onSuccess={refetch} />
        </div>
      )
    }

    // Candidates cannot create companies - they need to be invited
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md">
          <UserX className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-[15px] text-gray-700 mb-2">No Company Access</p>
          <p className="text-[13px] text-gray-500">
            You don't have access to a company profile. If you're a candidate, this section is for
            company clients only.
          </p>
        </div>
      </div>
    )
  }

  // Determine user's role in the company from CompanyUser data
  const currentUserCompanyRole = companyUsers.find(cu => cu.user === user?.id)
  const isAdmin = currentUserCompanyRole?.role === 'admin'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold text-gray-900">Company Profile</h1>
          <p className="text-[14px] text-gray-500 mt-0.5">
            Manage your company profile and team members
          </p>
        </div>
        {saveSuccess && (
          <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg text-[14px]">
            <CheckCircle className="w-4 h-4" />
            Changes saved successfully
          </div>
        )}
      </div>

      <CompanyTabs
        company={company}
        onSave={handleSave}
        isUpdating={isUpdating}
        currentUserId={user?.id || ''}
        isAdmin={isAdmin}
      />
    </div>
  )
}
