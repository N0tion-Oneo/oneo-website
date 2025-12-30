/**
 * PlatformCompanyPage
 *
 * Settings page for managing platform companies.
 * Lists all platform companies with links to edit, and allows creating new ones.
 * Admin-only access.
 */
import { useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useAllCompanies } from '@/hooks/useCompanies'
import { Building2, AlertCircle, Plus, Sparkles, ExternalLink, Users } from 'lucide-react'
import type { Company } from '@/types'

export default function PlatformCompanyPage() {
  const { user } = useAuth()
  const { companies, isLoading, error, refetch } = useAllCompanies()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newCompanyName, setNewCompanyName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Only admins can access this page
  if (user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  // Filter to only platform companies
  const platformCompanies = companies.filter((c: Company) => c.is_platform)

  const handleCreate = async () => {
    if (!newCompanyName.trim()) return

    setIsCreating(true)
    setCreateError(null)

    try {
      const { default: api } = await import('@/services/api')
      await api.post('/branding/platform-company/create/', { name: newCompanyName.trim() })
      setNewCompanyName('')
      setShowCreateModal(false)
      refetch()
    } catch (err) {
      setCreateError('Failed to create platform company')
      console.error('Error creating platform company:', err)
    } finally {
      setIsCreating(false)
    }
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
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8">
        <div className="flex items-center justify-center gap-2 text-red-600 dark:text-red-400">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-semibold text-gray-900 dark:text-gray-100">Platform Companies</h1>
          <p className="text-[14px] text-gray-500 dark:text-gray-400 mt-1">
            Manage your platform company profiles
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-[14px] font-medium text-white bg-gray-900 dark:bg-gray-100 dark:text-gray-900 rounded-md hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Platform Company
        </button>
      </div>

      {/* Platform Companies List */}
      {platformCompanies.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8">
          <div className="text-center max-w-md mx-auto">
            <div className="w-16 h-16 mx-auto rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-4">
              <Building2 className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-[18px] font-semibold text-gray-900 dark:text-gray-100 mb-2">No Platform Companies</h3>
            <p className="text-[14px] text-gray-500 dark:text-gray-400 mb-6">
              Create your first platform company to represent your organization.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-[14px] font-medium text-white bg-gray-900 dark:bg-gray-100 dark:text-gray-900 rounded-md hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Platform Company
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {platformCompanies.map((company: Company) => (
              <div key={company.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {company.logo ? (
                      <img
                        src={company.logo}
                        alt={company.name}
                        className="w-12 h-12 rounded-lg object-cover border border-gray-200 dark:border-gray-700"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center border border-gray-200 dark:border-gray-700">
                        <Building2 className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-[15px] font-medium text-gray-900 dark:text-gray-100">{company.name}</h3>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                          <Sparkles className="w-2.5 h-2.5" />
                          Platform
                        </span>
                      </div>
                      {company.tagline && (
                        <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">{company.tagline}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/dashboard/admin/companies/${company.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Edit Profile
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl dark:shadow-gray-900/40 w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-[16px] font-semibold text-gray-900 dark:text-gray-100">Create Platform Company</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Company Name
                </label>
                <input
                  type="text"
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  placeholder="Enter company name"
                  className="w-full px-3 py-2 text-[14px] border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent"
                  autoFocus
                />
              </div>
              {createError && (
                <p className="text-[13px] text-red-600 dark:text-red-400 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" />
                  {createError}
                </p>
              )}
              <p className="text-[13px] text-gray-500 dark:text-gray-400">
                Platform companies represent your organization. Staff members will be automatically added as team members.
              </p>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setNewCompanyName('')
                  setCreateError(null)
                }}
                className="px-4 py-2 text-[14px] font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={isCreating || !newCompanyName.trim()}
                className="px-4 py-2 text-[14px] font-medium text-white bg-gray-900 dark:bg-gray-100 dark:text-gray-900 rounded-md hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isCreating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
