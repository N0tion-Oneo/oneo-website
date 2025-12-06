import { useState, useRef, useEffect } from 'react'
import { Download, ChevronDown, FileText, Loader2 } from 'lucide-react'
import { CandidateFilters } from './CandidateFilterPanel'
import api from '@/services/api'

interface CandidateExportMenuProps {
  filters: CandidateFilters
  totalCount: number
}

export default function CandidateExportMenu({ filters, totalCount }: CandidateExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const buildExportUrl = () => {
    const params = new URLSearchParams()

    if (filters.search) params.append('search', filters.search)
    if (filters.seniority) params.append('seniority', filters.seniority)
    if (filters.work_preference) params.append('work_preference', filters.work_preference)
    if (filters.visibility) params.append('visibility', filters.visibility)
    if (filters.skills.length > 0) params.append('skills', filters.skills.join(','))
    if (filters.industries.length > 0) params.append('industries', filters.industries.join(','))
    if (filters.min_completeness !== undefined) params.append('min_completeness', filters.min_completeness.toString())
    if (filters.min_experience !== undefined) params.append('min_experience', filters.min_experience.toString())
    if (filters.max_experience !== undefined) params.append('max_experience', filters.max_experience.toString())
    if (filters.min_salary !== undefined) params.append('min_salary', filters.min_salary.toString())
    if (filters.max_salary !== undefined) params.append('max_salary', filters.max_salary.toString())
    if (filters.salary_currency) params.append('salary_currency', filters.salary_currency)
    if (filters.notice_period_min !== undefined) params.append('notice_period_min', filters.notice_period_min.toString())
    if (filters.notice_period_max !== undefined) params.append('notice_period_max', filters.notice_period_max.toString())
    if (filters.created_after) params.append('created_after', filters.created_after)
    if (filters.created_before) params.append('created_before', filters.created_before)
    if (filters.willing_to_relocate !== undefined) params.append('willing_to_relocate', filters.willing_to_relocate.toString())
    if (filters.has_resume !== undefined) params.append('has_resume', filters.has_resume.toString())
    if (filters.ordering) params.append('ordering', filters.ordering)

    return `/candidates/export/csv/?${params.toString()}`
  }

  const handleExportCSV = async () => {
    setIsExporting(true)
    try {
      const url = buildExportUrl()
      const response = await api.get(url, {
        responseType: 'blob',
      })

      // Create download link
      const blob = new Blob([response.data], { type: 'text/csv' })
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.setAttribute('download', `candidates_export_${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(downloadUrl)
    } catch (error) {
      console.error('Export failed:', error)
      alert('Failed to export candidates. Please try again.')
    } finally {
      setIsExporting(false)
      setIsOpen(false)
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isExporting}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] border border-gray-200 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
      >
        {isExporting ? (
          <Loader2 className="w-3.5 h-3.5 text-gray-500 animate-spin" />
        ) : (
          <Download className="w-3.5 h-3.5 text-gray-500" />
        )}
        <span className="text-gray-600">Export</span>
        <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-2 border-b border-gray-100">
            <p className="text-[11px] text-gray-500 uppercase tracking-wider font-medium">
              Export {totalCount} Candidates
            </p>
          </div>

          <div className="p-1">
            <button
              onClick={handleExportCSV}
              disabled={isExporting}
              className="flex items-center gap-2 w-full px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50 rounded-md disabled:opacity-50"
            >
              <FileText className="w-4 h-4 text-green-600" />
              <div className="text-left">
                <p className="font-medium">Export to CSV</p>
                <p className="text-[11px] text-gray-500">With current filters</p>
              </div>
            </button>
          </div>

          <div className="p-2 border-t border-gray-100">
            <p className="text-[10px] text-gray-400">
              Exports all filtered results (not just current page)
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
