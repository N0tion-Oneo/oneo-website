/**
 * JobCreateDrawer - Drawer for creating new jobs
 *
 * Uses the existing JobForm with 7-step wizard for job creation.
 * Simpler than JobDetailDrawer - no status dropdown, action rail, or panels.
 */

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useAllCompanies } from '@/hooks'
import { useAuth } from '@/contexts/AuthContext'
import { AssignedSelect } from '@/components/forms'
import JobForm from './JobForm'
import { UserRole } from '@/types'
import type { Job, AssignedUser } from '@/types'

interface JobCreateDrawerProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (job: Job) => void
  /** Pre-select company for job creation */
  companyId?: string
}

export default function JobCreateDrawer({
  isOpen,
  onClose,
  onSuccess,
  companyId,
}: JobCreateDrawerProps) {
  const { user } = useAuth()
  const isAdminOrRecruiter = user?.role === UserRole.ADMIN || user?.role === UserRole.RECRUITER

  const { companies: allCompanies, isLoading: isLoadingCompanies } = useAllCompanies()

  // State for client and assigned recruiters
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | undefined>(companyId)
  const [selectedRecruiters, setSelectedRecruiters] = useState<AssignedUser[]>([])

  // Initialize from prop
  useEffect(() => {
    if (companyId) {
      setSelectedCompanyId(companyId)
    }
  }, [companyId])

  // Reset state when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedCompanyId(companyId)
      setSelectedRecruiters([])
    }
  }, [isOpen, companyId])

  // Handle successful save
  const handleSuccess = (savedJob: Job) => {
    if (onSuccess) {
      onSuccess(savedJob)
    }
    onClose()
  }

  if (!isOpen) return null

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
          {/* Top row: Title and close */}
          <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-semibold text-gray-900 dark:text-gray-100">
              Create New Job
            </h2>

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
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <JobForm
            job={undefined}
            companyId={selectedCompanyId}
            onSuccess={handleSuccess}
            selectedRecruiters={selectedRecruiters}
            onRecruitersChange={setSelectedRecruiters}
          />
        </div>
      </div>
    </>
  )
}
