import { AdminCompanyListItem } from '@/types'
import { Download, X, Building2 } from 'lucide-react'

interface CompanyBulkActionsProps {
  selectedCompanies: AdminCompanyListItem[]
  onClearSelection: () => void
  totalCount: number
}

export default function CompanyBulkActions({
  selectedCompanies,
  onClearSelection,
  totalCount,
}: CompanyBulkActionsProps) {
  if (selectedCompanies.length === 0) return null

  const handleExportSelected = () => {
    const headers = [
      'Name',
      'Industry',
      'Company Size',
      'Location',
      'Status',
      'Total Jobs',
      'Published Jobs',
      'Draft Jobs',
      'Closed Jobs',
      'Filled Jobs',
      'Created At',
    ]

    const rows = selectedCompanies.map(c => [
      c.name || '',
      c.industry?.name || '',
      c.company_size?.replace('_', '-') || '',
      c.headquarters_location || '',
      c.is_published ? 'Published' : 'Draft',
      c.jobs_total?.toString() || '0',
      c.jobs_published?.toString() || '0',
      c.jobs_draft?.toString() || '0',
      c.jobs_closed?.toString() || '0',
      c.jobs_filled?.toString() || '0',
      c.created_at ? new Date(c.created_at).toLocaleDateString() : '',
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `companies_export_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="bg-gray-900 text-white px-4 py-2.5 rounded-lg flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4" />
          <span className="text-[13px] font-medium">
            {selectedCompanies.length} selected
          </span>
        </div>
        <span className="text-gray-400 text-[12px]">
          of {totalCount} companies
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
