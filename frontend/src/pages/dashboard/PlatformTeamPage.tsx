/**
 * PlatformTeamPage
 *
 * Central page for managing platform staff (admins and recruiters).
 * Admin-only access.
 */
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { usePlatformCompany } from '@/hooks/useBranding'
import PlatformTeamMembersTable from '@/components/company/PlatformTeamMembersTable'
import { AlertCircle, Building2 } from 'lucide-react'

export default function PlatformTeamPage() {
  const { user } = useAuth()
  const { platformCompany, isLoading, error } = usePlatformCompany()

  // Only admins can access this page
  if (user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 dark:border-gray-700 border-t-gray-900 dark:border-t-gray-100" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-8">
        <div className="flex items-center justify-center gap-2 text-red-600 dark:text-red-400">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      </div>
    )
  }

  if (!platformCompany) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-[24px] font-semibold text-gray-900 dark:text-gray-100">Team</h1>
          <p className="text-[14px] text-gray-500 dark:text-gray-400 mt-1">
            Manage your platform staff - admins and recruiters
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-8">
          <div className="text-center">
            <Building2 className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-[16px] font-medium text-gray-900 dark:text-gray-100 mb-2">No Platform Company</h3>
            <p className="text-[14px] text-gray-500 dark:text-gray-400 mb-4">
              You need to set up a platform company first before managing staff.
            </p>
            <a
              href="/dashboard/settings/branding"
              className="inline-flex items-center gap-2 px-4 py-2 text-[14px] font-medium text-white bg-gray-900 dark:bg-gray-100 dark:text-gray-900 rounded-md hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
            >
              Go to Branding Settings
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[24px] font-semibold text-gray-900 dark:text-gray-100">Team</h1>
        <p className="text-[14px] text-gray-500 dark:text-gray-400 mt-1">
          Manage your platform staff - admins and recruiters
        </p>
      </div>

      {/* Platform Company Info */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center gap-3">
          {platformCompany.logo ? (
            <img
              src={platformCompany.logo}
              alt={platformCompany.name}
              className="w-10 h-10 rounded-lg object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </div>
          )}
          <div>
            <p className="text-[14px] font-medium text-gray-900 dark:text-gray-100">{platformCompany.name}</p>
            <p className="text-[12px] text-gray-500 dark:text-gray-400">Platform Company</p>
          </div>
        </div>
      </div>

      {/* Team Members Table */}
      <PlatformTeamMembersTable
        platformCompanyId={platformCompany.id}
        currentUserId={user?.id || ''}
      />
    </div>
  )
}
