import { useEffect, useCallback } from 'react'
import { X } from 'lucide-react'
import { CandidateAdminListItem } from '@/types'
import CandidateProfileCard from './CandidateProfileCard'

interface CandidatePreviewPanelProps {
  candidate: CandidateAdminListItem | null
  onClose: () => void
}

export default function CandidatePreviewPanel({ candidate, onClose }: CandidatePreviewPanelProps) {
  // Handle escape key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }, [onClose])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Prevent body scroll when panel is open
  useEffect(() => {
    if (candidate) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [candidate])

  if (!candidate) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-[200]"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-1/2 bg-white shadow-xl z-[201] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
          <h2 className="text-[16px] font-semibold text-gray-900">Candidate Details</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content - Use CandidateProfileCard */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          <CandidateProfileCard
            candidate={candidate}
            experiences={candidate.experiences || []}
            education={candidate.education || []}
            variant="compact"
            showAdminActions={true}
            showProfileCompleteness={true}
            editLink={`/dashboard/admin/candidates/${candidate.slug}`}
            hideViewProfileLink={true}
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 bg-white">
          <p className="text-[11px] text-gray-500 text-center">
            Press <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-mono">Esc</kbd> to close
          </p>
        </div>
      </div>
    </>
  )
}
