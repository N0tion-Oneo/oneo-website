import { useState, useCallback } from 'react'
import { MessageSquare, Loader2 } from 'lucide-react'
import type { ProfileSuggestion, CandidateProfile, ProfileSuggestionFieldType } from '@/types'
import SuggestionCard from './SuggestionCard'
import DeclineModal from './DeclineModal'

// Helper to get current field value from candidate profile
function getFieldValue(
  profile: CandidateProfile | null,
  fieldType: ProfileSuggestionFieldType,
  fieldName: string,
  relatedObjectId?: string | null
): string {
  if (!profile) return ''

  if (fieldType === 'profile') {
    const value = (profile as Record<string, unknown>)[fieldName]
    return typeof value === 'string' ? value : ''
  }

  if (fieldType === 'experience' && relatedObjectId) {
    const exp = profile.experiences?.find((e) => e.id === relatedObjectId)
    if (exp) {
      const value = (exp as Record<string, unknown>)[fieldName]
      return typeof value === 'string' ? value : ''
    }
  }

  if (fieldType === 'education' && relatedObjectId) {
    const edu = profile.education?.find((e) => e.id === relatedObjectId)
    if (edu) {
      const value = (edu as Record<string, unknown>)[fieldName]
      return typeof value === 'string' ? value : ''
    }
  }

  return ''
}

interface SuggestionsSidebarProps {
  suggestions: ProfileSuggestion[]
  profile: CandidateProfile | null
  isLoading: boolean
  onResolve: (suggestionId: string) => Promise<void>
  onDecline: (suggestionId: string, reason: string) => Promise<void>
  onNavigate?: (suggestion: ProfileSuggestion) => void
  isUpdating: boolean
}

export default function SuggestionsSidebar({
  suggestions,
  profile,
  isLoading,
  onResolve,
  onDecline,
  onNavigate,
  isUpdating,
}: SuggestionsSidebarProps) {
  const [declineModal, setDeclineModal] = useState<{
    isOpen: boolean
    suggestionId: string | null
  }>({
    isOpen: false,
    suggestionId: null,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleResolve = useCallback(
    async (suggestionId: string) => {
      try {
        await onResolve(suggestionId)
      } catch (error) {
        console.error('Failed to resolve suggestion:', error)
      }
    },
    [onResolve]
  )

  const handleOpenDeclineModal = useCallback((suggestionId: string) => {
    setDeclineModal({ isOpen: true, suggestionId })
  }, [])

  const handleCloseDeclineModal = useCallback(() => {
    setDeclineModal({ isOpen: false, suggestionId: null })
  }, [])

  const handleConfirmDecline = useCallback(
    async (reason: string) => {
      if (!declineModal.suggestionId) return

      setIsSubmitting(true)
      try {
        await onDecline(declineModal.suggestionId, reason)
        handleCloseDeclineModal()
      } catch (error) {
        console.error('Failed to decline suggestion:', error)
      } finally {
        setIsSubmitting(false)
      }
    },
    [declineModal.suggestionId, onDecline, handleCloseDeclineModal]
  )

  if (isLoading) {
    return (
      <div className="w-72 flex-shrink-0">
        <div className="sticky top-6 bg-gradient-to-b from-amber-50 to-white border border-amber-200 rounded-lg flex flex-col items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
          <p className="text-[13px] text-gray-500 mt-2">Loading suggestions...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="w-72 flex-shrink-0">
        <div className="sticky top-6 bg-gradient-to-b from-amber-50 to-white border border-amber-200 rounded-lg flex flex-col max-h-[calc(100vh-120px)]">
        {/* Header */}
        <div className="px-4 py-4 border-b border-amber-200">
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare className="w-5 h-5 text-amber-600" />
            <h3 className="text-[15px] font-semibold text-gray-900">Profile Suggestions</h3>
          </div>
          <p className="text-[12px] text-gray-600">
            Your recruiter has {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''} for your profile
          </p>
          <p className="text-[11px] text-amber-600 mt-1">
            Click a suggestion to view the field
          </p>
        </div>

        {/* Suggestions List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {suggestions.map((suggestion) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                currentValue={getFieldValue(
                  profile,
                  suggestion.field_type,
                  suggestion.field_name,
                  suggestion.related_object_id
                )}
                onResolve={handleResolve}
                onDecline={handleOpenDeclineModal}
                onNavigate={onNavigate}
                isUpdating={isUpdating}
              />
            ))}
          </div>
        </div>

        {/* Footer hint */}
        <div className="px-4 py-3 bg-amber-50 border-t border-amber-200 rounded-b-lg">
          <p className="text-[11px] text-amber-700 text-center">
            Resolve or decline all suggestions to return to normal profile editing
          </p>
        </div>
        </div>
      </div>

      {/* Decline Modal */}
      <DeclineModal
        isOpen={declineModal.isOpen}
        onClose={handleCloseDeclineModal}
        onConfirm={handleConfirmDecline}
        isSubmitting={isSubmitting}
      />
    </>
  )
}
