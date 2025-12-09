import { JobListItem } from '@/types'
import { Download, X, Briefcase } from 'lucide-react'

interface JobBulkActionsProps {
  selectedJobs: JobListItem[]
  onClearSelection: () => void
  totalCount: number
}

export default function JobBulkActions({
  selectedJobs,
  onClearSelection,
  totalCount,
}: JobBulkActionsProps) {
  if (selectedJobs.length === 0) return null

  const handleExportSelected = () => {
    const headers = [
      'Title',
      'Company',
      'Status',
      'Seniority',
      'Job Type',
      'Work Mode',
      'Department',
      'Location',
      'Salary Range',
      'Views',
      'Applications',
      'Published At',
      'Created At',
    ]

    const rows = selectedJobs.map(job => [
      job.title || '',
      job.company?.name || '',
      job.status || '',
      job.seniority || '',
      job.job_type?.replace('_', ' ') || '',
      job.work_mode || '',
      job.department?.replace('_', ' ') || '',
      job.location_display || '',
      job.salary_display || '-',
      job.views_count?.toString() || '0',
      job.applications_count?.toString() || '0',
      job.published_at ? new Date(job.published_at).toLocaleDateString() : '-',
      job.created_at ? new Date(job.created_at).toLocaleDateString() : '',
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `jobs_export_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="bg-gray-900 text-white px-4 py-2.5 rounded-lg flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Briefcase className="w-4 h-4" />
          <span className="text-[13px] font-medium">
            {selectedJobs.length} selected
          </span>
        </div>
        <span className="text-gray-400 text-[12px]">
          of {totalCount} jobs
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleExportSelected}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Export Selected
        </button>
        <button
          onClick={onClearSelection}
          className="p-1.5 text-gray-400 hover:text-white transition-colors"
          title="Clear selection"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
