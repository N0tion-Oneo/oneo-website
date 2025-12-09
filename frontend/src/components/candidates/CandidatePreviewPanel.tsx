import { useState, useEffect, useCallback, useRef } from 'react'
import { X, User, Activity } from 'lucide-react'
import { CandidateAdminListItem, ProfileSuggestionFieldType, AssignedUser } from '@/types'
import { SUGGESTION_FIELD_LABELS } from '@/types'
import api from '@/services/api'
import { useAdminSuggestions } from '@/hooks'
import CandidateProfileCard from './CandidateProfileCard'
import CandidateActivityTab from './CandidateActivityTab'
import { SuggestionsPanel } from '@/components/suggestions'

type TabType = 'profile' | 'activity'

interface SuggestionPanelState {
  isOpen: boolean
  fieldType: ProfileSuggestionFieldType | null
  fieldName: string | null
  relatedObjectId?: string
  relatedObjectLabel?: string
}

interface CandidatePreviewPanelProps {
  candidate: CandidateAdminListItem | null
  onClose: () => void
  onRefresh?: () => void
}

export default function CandidatePreviewPanel({ candidate, onClose, onRefresh }: CandidatePreviewPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('profile')
  const viewRecordedRef = useRef<number | null>(null)
  const [suggestionPanel, setSuggestionPanel] = useState<SuggestionPanelState>({
    isOpen: false,
    fieldType: null,
    fieldName: null,
  })

  // Suggestions hook
  const {
    suggestions,
    isLoading: suggestionsLoading,
    createSuggestion,
    reopenSuggestion,
    closeSuggestion,
    isCreating,
    isUpdating,
  } = useAdminSuggestions(candidate?.id ?? null)

  // Reset tab and close suggestions panel when candidate changes
  useEffect(() => {
    setActiveTab('profile')
    setSuggestionPanel({ isOpen: false, fieldType: null, fieldName: null })
  }, [candidate?.id])

  // Record profile view when panel opens
  useEffect(() => {
    if (candidate && candidate.id !== viewRecordedRef.current) {
      viewRecordedRef.current = candidate.id
      // Fire and forget - we don't need to wait for this
      api.post(`/admin/candidates/${candidate.id}/view/`).catch(() => {
        // Silently fail - view recording is non-critical
      })
    }
  }, [candidate])

  // Handle escape key - close suggestions panel first, then main panel
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (suggestionPanel.isOpen) {
        setSuggestionPanel({ isOpen: false, fieldType: null, fieldName: null })
      } else {
        onClose()
      }
    }
  }, [onClose, suggestionPanel.isOpen])

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

  // Handle adding a suggestion (opens the suggestions panel)
  const handleAddSuggestion = useCallback(
    (fieldType: ProfileSuggestionFieldType, fieldName: string, relatedObjectId?: string) => {
      // Find related object label for better UX
      let relatedObjectLabel: string | undefined
      if (relatedObjectId && candidate) {
        if (fieldType === 'experience') {
          const exp = candidate.experiences?.find((e) => e.id === relatedObjectId)
          if (exp) {
            relatedObjectLabel = `${exp.job_title} at ${exp.company_name}`
          }
        } else if (fieldType === 'education') {
          const edu = candidate.education?.find((e) => e.id === relatedObjectId)
          if (edu) {
            relatedObjectLabel = `${edu.degree} - ${edu.institution}`
          }
        }
      }

      setSuggestionPanel({
        isOpen: true,
        fieldType,
        fieldName,
        relatedObjectId,
        relatedObjectLabel,
      })
    },
    [candidate]
  )

  const handleCloseSuggestionPanel = useCallback(() => {
    setSuggestionPanel({ isOpen: false, fieldType: null, fieldName: null })
  }, [])

  // Handle assigned_to changes
  const handleAssignedToChange = useCallback(async (newAssigned: AssignedUser[]) => {
    if (!candidate) return
    try {
      await api.patch(`/candidates/${candidate.slug}/`, {
        assigned_to_ids: newAssigned.map(u => u.id),
      })
      // Trigger parent to refresh data
      onRefresh?.()
    } catch (err) {
      console.error('Failed to update assigned_to:', err)
    }
  }, [candidate, onRefresh])

  if (!candidate) return null

  const tabs = [
    { id: 'profile' as TabType, label: 'Profile', icon: User },
    { id: 'activity' as TabType, label: 'Activity', icon: Activity },
  ]

  // Calculate pending suggestions count
  const pendingSuggestionsCount = suggestions.filter((s) => s.status === 'pending').length

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
        <div className="px-6 py-4 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-[16px] font-semibold text-gray-900">Candidate Details</h2>
              {pendingSuggestionsCount > 0 && (
                <span className="px-2 py-0.5 text-[11px] font-medium bg-amber-100 text-amber-700 rounded-full">
                  {pendingSuggestionsCount} pending suggestion{pendingSuggestionsCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 text-[13px] font-medium rounded-md transition-colors ${
                    activeTab === tab.id
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'profile' && (
            <CandidateProfileCard
              candidate={candidate}
              experiences={candidate.experiences || []}
              education={candidate.education || []}
              variant="compact"
              showAdminActions={true}
              showProfileCompleteness={true}
              editLink={`/dashboard/admin/candidates/${candidate.slug}`}
              hideViewProfileLink={true}
              enableSuggestions={true}
              suggestions={suggestions}
              onAddSuggestion={handleAddSuggestion}
              onAssignedToChange={handleAssignedToChange}
            />
          )}
          {activeTab === 'activity' && (
            <CandidateActivityTab candidateId={candidate.id} />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 bg-white">
          <p className="text-[11px] text-gray-500 text-center">
            Press <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-mono">Esc</kbd> to close
          </p>
        </div>
      </div>

      {/* Suggestions Panel */}
      <SuggestionsPanel
        isOpen={suggestionPanel.isOpen}
        onClose={handleCloseSuggestionPanel}
        fieldType={suggestionPanel.fieldType}
        fieldName={suggestionPanel.fieldName}
        relatedObjectId={suggestionPanel.relatedObjectId}
        relatedObjectLabel={suggestionPanel.relatedObjectLabel}
        suggestions={suggestions}
        candidate={candidate}
        onCreateSuggestion={createSuggestion}
        onReopenSuggestion={reopenSuggestion}
        onCloseSuggestion={closeSuggestion}
        isCreating={isCreating}
        isUpdating={isUpdating}
      />
    </>
  )
}
