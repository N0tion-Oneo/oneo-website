import { useState } from 'react'
import { CandidateAdminListItem } from '@/types'
import { Mail, Download, X, Send, Users } from 'lucide-react'

interface CandidateBulkActionsProps {
  selectedCandidates: CandidateAdminListItem[]
  onClearSelection: () => void
  totalCount: number
}

export default function CandidateBulkActions({
  selectedCandidates,
  onClearSelection,
  totalCount,
}: CandidateBulkActionsProps) {
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')

  if (selectedCandidates.length === 0) return null

  const selectedEmails = selectedCandidates.map(c => c.email).filter(Boolean)

  const handleBulkEmail = () => {
    // Open default mail client with all selected emails in BCC
    if (selectedEmails.length > 0) {
      const bccEmails = selectedEmails.join(',')
      window.location.href = `mailto:?bcc=${bccEmails}&subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`
      setShowEmailModal(false)
      setEmailSubject('')
      setEmailBody('')
    }
  }

  const handleExportSelected = () => {
    // Create CSV from selected candidates
    const headers = [
      'Name',
      'Email',
      'Phone',
      'Title',
      'Seniority',
      'Location',
      'Work Preference',
      'Experience (years)',
      'Salary Min',
      'Salary Max',
      'Currency',
      'Notice Period (days)',
      'Willing to Relocate',
      'Has Resume',
      'Profile Completeness',
      'Visibility',
      'Created At',
    ]

    const rows = selectedCandidates.map(c => [
      c.full_name || '',
      c.email || '',
      c.phone || '',
      c.professional_title || '',
      c.seniority || '',
      c.location || [c.city, c.country].filter(Boolean).join(', '),
      c.work_preference || '',
      c.years_of_experience?.toString() || '',
      c.salary_expectation_min?.toString() || '',
      c.salary_expectation_max?.toString() || '',
      c.salary_currency || '',
      c.notice_period_days?.toString() || '',
      c.willing_to_relocate ? 'Yes' : 'No',
      c.has_resume ? 'Yes' : 'No',
      c.profile_completeness?.toString() || '',
      c.visibility || '',
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
    link.setAttribute('download', `candidates_export_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <>
      {/* Bulk Actions Bar */}
      <div className="bg-gray-900 text-white px-4 py-2.5 rounded-lg flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="text-[13px] font-medium">
              {selectedCandidates.length} selected
            </span>
          </div>
          <span className="text-gray-400 text-[12px]">
            of {totalCount} candidates
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEmailModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] bg-white text-gray-900 rounded-md hover:bg-gray-100 transition-colors"
          >
            <Mail className="w-3.5 h-3.5" />
            Email Selected
          </button>
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

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-lg mx-4 shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h3 className="text-[15px] font-medium text-gray-900">
                Compose Email to {selectedCandidates.length} Candidate{selectedCandidates.length !== 1 ? 's' : ''}
              </h3>
              <button
                onClick={() => setShowEmailModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-gray-600 mb-1.5">
                  Recipients (BCC)
                </label>
                <div className="text-[12px] text-gray-500 bg-gray-50 px-3 py-2 rounded-md max-h-20 overflow-y-auto">
                  {selectedEmails.slice(0, 5).join(', ')}
                  {selectedEmails.length > 5 && ` and ${selectedEmails.length - 5} more...`}
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-gray-600 mb-1.5">
                  Subject
                </label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Enter email subject..."
                  className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-gray-600 mb-1.5">
                  Message
                </label>
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  placeholder="Enter your message..."
                  rows={5}
                  className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-200">
              <button
                onClick={() => setShowEmailModal(false)}
                className="px-4 py-2 text-[13px] text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkEmail}
                disabled={!emailSubject.trim()}
                className="flex items-center gap-1.5 px-4 py-2 text-[13px] bg-gray-900 text-white rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-3.5 h-3.5" />
                Open in Email Client
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
