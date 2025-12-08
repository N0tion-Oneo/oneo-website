import { useState } from 'react'
import { ApplicationListItem, ApplicationStatus } from '@/types'
import api from '@/services/api'
import { Mail, Download, X, Users, AlertCircle } from 'lucide-react'

const STATUS_OPTIONS = [
  { value: ApplicationStatus.SHORTLISTED, label: 'Shortlisted' },
  { value: ApplicationStatus.REJECTED, label: 'Rejected' },
]

interface ApplicationBulkActionsProps {
  selectedApplications: ApplicationListItem[]
  onClearSelection: () => void
  onRefresh: () => void
  totalCount: number
}

export default function ApplicationBulkActions({
  selectedApplications,
  onClearSelection,
  onRefresh,
  totalCount,
}: ApplicationBulkActionsProps) {
  const [bulkStatus, setBulkStatus] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)

  if (selectedApplications.length === 0) return null

  const selectedEmails = selectedApplications.map(a => a.candidate_email).filter(Boolean)

  const handleBulkEmail = () => {
    if (selectedEmails.length > 0) {
      const bccEmails = selectedEmails.join(',')
      window.location.href = `mailto:?bcc=${bccEmails}`
    }
  }

  const handleBulkStatusUpdate = async () => {
    if (!bulkStatus) return

    setIsUpdating(true)
    setUpdateError(null)

    try {
      // Update each application's status
      const promises = selectedApplications.map(async (app) => {
        if (bulkStatus === ApplicationStatus.SHORTLISTED) {
          return api.post(`/jobs/applications/${app.id}/shortlist/`)
        } else if (bulkStatus === ApplicationStatus.REJECTED) {
          return api.post(`/jobs/applications/${app.id}/reject/`, {
            rejection_reason: 'internal_rejection',
            rejection_feedback: '',
          })
        }
      })

      await Promise.all(promises)
      setBulkStatus('')
      onClearSelection()
      onRefresh()
    } catch (err) {
      console.error('Failed to update applications:', err)
      setUpdateError('Failed to update some applications')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleExportSelected = () => {
    // Create CSV from selected applications
    const headers = [
      'Candidate Name',
      'Candidate Email',
      'Job Title',
      'Company',
      'Status',
      'Current Stage',
      'Applied Date',
      'Last Updated',
    ]

    const rows = selectedApplications.map(app => [
      app.candidate_name || '',
      app.candidate_email || '',
      app.job_title || '',
      app.company_name || '',
      app.status || '',
      app.current_stage_name || 'Applied',
      app.applied_at ? new Date(app.applied_at).toLocaleDateString() : '',
      app.last_status_change ? new Date(app.last_status_change).toLocaleDateString() : '',
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `applications_export_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="bg-gray-900 text-white px-4 py-2.5 rounded-lg flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4" />
          <span className="text-[13px] font-medium">
            {selectedApplications.length} selected
          </span>
        </div>
        <span className="text-gray-400 text-[12px]">
          of {totalCount} applications
        </span>
      </div>

      <div className="flex items-center gap-2">
        {/* Bulk Status Update */}
        <div className="flex items-center gap-1.5">
          <select
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value)}
            disabled={isUpdating}
            className="px-2 py-1.5 text-[12px] bg-gray-700 text-white rounded-md border-none focus:ring-1 focus:ring-gray-500"
          >
            <option value="">Update status...</option>
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {bulkStatus && (
            <button
              onClick={handleBulkStatusUpdate}
              disabled={isUpdating}
              className="px-2.5 py-1.5 text-[12px] bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isUpdating ? 'Updating...' : 'Apply'}
            </button>
          )}
        </div>

        {updateError && (
          <div className="flex items-center gap-1 text-red-400 text-[12px]">
            <AlertCircle className="w-3.5 h-3.5" />
            {updateError}
          </div>
        )}

        <button
          onClick={handleBulkEmail}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] bg-white text-gray-900 rounded-md hover:bg-gray-100 transition-colors"
        >
          <Mail className="w-3.5 h-3.5" />
          Email
        </button>

        <button
          onClick={handleExportSelected}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Export
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
