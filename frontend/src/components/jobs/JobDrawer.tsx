/**
 * JobDrawer - Router component for job drawer
 *
 * Routes to:
 * - JobCreateDrawer when jobId is null (creating new job)
 * - JobDetailDrawer when jobId is provided (viewing/editing existing job)
 */

import JobCreateDrawer from './JobCreateDrawer'
import JobDetailDrawer from './JobDetailDrawer'
import type { Job } from '@/types'

interface JobDrawerProps {
  /** Job ID to view/edit, or null to create new */
  jobId: string | null
  isOpen: boolean
  onClose: () => void
  onSuccess?: (job?: Job) => void
  /** Pre-select company for job creation */
  companyId?: string
}

export default function JobDrawer({
  jobId,
  isOpen,
  onClose,
  onSuccess,
  companyId,
}: JobDrawerProps) {
  if (!isOpen) return null

  // Route to appropriate drawer based on whether we have a jobId
  if (!jobId) {
    return (
      <JobCreateDrawer
        isOpen={isOpen}
        onClose={onClose}
        onSuccess={onSuccess}
        companyId={companyId}
      />
    )
  }

  return (
    <JobDetailDrawer
      jobId={jobId}
      onClose={onClose}
      onRefresh={() => onSuccess?.()}
    />
  )
}
