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
    { bg: string; text: string; label: string }
  > = {
    draft: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Draft' },
    published: { bg: 'bg-green-100', text: 'text-green-700', label: 'Published' },
    closed: { bg: 'bg-red-100', text: 'text-red-700', label: 'Closed' },
    filled: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Filled' },
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
