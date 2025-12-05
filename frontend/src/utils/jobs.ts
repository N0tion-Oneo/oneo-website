import { JobStatus } from '@/types'

export const statusTabs = [
  { value: '', label: 'All Jobs' },
  { value: JobStatus.DRAFT, label: 'Draft' },
  { value: JobStatus.PUBLISHED, label: 'Published' },
  { value: JobStatus.CLOSED, label: 'Closed' },
  { value: JobStatus.FILLED, label: 'Filled' },
]

export const getStatusBadge = (status: JobStatus) => {
  const badges: Record<
    string,
    { bg: string; text: string; label: string; className?: string }
  > = {
    draft: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Draft' },
    published: { bg: 'bg-success/15', text: 'text-success', label: 'Published', className: 'badge-success' },
    closed: { bg: 'bg-warning/15', text: 'text-warning', label: 'Closed', className: 'badge-warning' },
    filled: { bg: 'bg-primary/15', text: 'text-primary', label: 'Filled', className: 'badge-primary' },
    archived: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Archived' },
  }
  return badges[status] || badges.draft
}

export const formatJobDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
