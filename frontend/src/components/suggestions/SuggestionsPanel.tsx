import { useState, useEffect, useCallback } from 'react'
import { X, Send, RotateCcw, XCircle, Clock, Check, AlertCircle } from 'lucide-react'
import type {
  ProfileSuggestion,
  ProfileSuggestionFieldType,
  ProfileSuggestionCreate,
  CandidateAdminListItem,
} from '@/types'
import { SUGGESTION_FIELD_LABELS } from '@/types'
import { formatDistanceToNow } from 'date-fns'

interface SuggestionsPanelProps {
  isOpen: boolean
  onClose: () => void
  fieldType: ProfileSuggestionFieldType | null
  fieldName: string | null
  relatedObjectId?: string
  relatedObjectLabel?: string
  suggestions: ProfileSuggestion[]
  candidate: CandidateAdminListItem | null
  onCreateSuggestion: (data: ProfileSuggestionCreate) => Promise<void>
  onReopenSuggestion: (suggestionId: string) => Promise<void>
  onCloseSuggestion: (suggestionId: string) => Promise<void>
  isCreating: boolean
  isUpdating: boolean
}

// Helper to get current field value from candidate data
function getFieldValue(
  candidate: CandidateAdminListItem | null,
  fieldType: ProfileSuggestionFieldType,
  fieldName: string,
  relatedObjectId?: string | null
): string {
  if (!candidate) return ''

  if (fieldType === 'profile') {
    const value = (candidate as Record<string, unknown>)[fieldName]
    return typeof value === 'string' ? value : ''
  }

  if (fieldType === 'experience' && relatedObjectId) {
    const exp = candidate.experiences?.find((e) => e.id === relatedObjectId)
    if (exp) {
      const value = (exp as Record<string, unknown>)[fieldName]
      return typeof value === 'string' ? value : ''
    }
  }

  if (fieldType === 'education' && relatedObjectId) {
    const edu = candidate.education?.find((e) => e.id === relatedObjectId)
    if (edu) {
      const value = (edu as Record<string, unknown>)[fieldName]
      return typeof value === 'string' ? value : ''
    }
  }

  return ''
}

function truncateText(text: string, maxLength: number = 100): string {
  if (!text || text.length <= maxLength) return text
  return text.substring(0, maxLength).trim() + '...'
}

function StatusBadge({ status }: { status: ProfileSuggestion['status'] }) {
  const config = {
    pending: { icon: Clock, color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700', label: 'Pending' },
    resolved: { icon: Check, color: 'bg-green-100 dark:bg-green-900/30 text-green-700', label: 'Resolved' },
    declined: { icon: XCircle, color: 'bg-red-100 dark:bg-red-900/30 text-red-700', label: 'Declined' },
    closed: { icon: AlertCircle, color: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400', label: 'Closed' },
  }

  const { icon: Icon, color, label } = config[status]

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${color}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  )
}

export default function SuggestionsPanel({
  isOpen,
  onClose,
  fieldType,
  fieldName,
  relatedObjectId,
  relatedObjectLabel,
  suggestions,
  candidate,
  onCreateSuggestion,
  onReopenSuggestion,
  onCloseSuggestion,
  isCreating,
  isUpdating,
}: SuggestionsPanelProps) {
  const [suggestionText, setSuggestionText] = useState('')

  // Reset form when panel opens for a different field
  useEffect(() => {
    setSuggestionText('')
  }, [fieldType, fieldName, relatedObjectId])

  // Handle escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    },
    [onClose]
  )

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, handleKeyDown])

  if (!isOpen || !fieldType || !fieldName) return null

  // Filter suggestions for this specific field
  const filteredSuggestions = suggestions.filter(
    (s) =>
      s.field_type === fieldType &&
      s.field_name === fieldName &&
      (relatedObjectId ? s.related_object_id === relatedObjectId : s.related_object_id === null)
  )

  const fieldLabel = SUGGESTION_FIELD_LABELS[fieldName] || fieldName

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!suggestionText.trim() || isCreating) return

    try {
      await onCreateSuggestion({
        field_type: fieldType,
        field_name: fieldName,
        related_object_id: relatedObjectId,
        suggestion_text: suggestionText.trim(),
      })
      setSuggestionText('')
    } catch (error) {
      console.error('Failed to create suggestion:', error)
    }
  }

  return (
    <>
      {/* Panel - positioned to the left of the main drawer (which is w-1/2 from right) */}
      <div className="fixed top-0 h-full w-80 bg-white dark:bg-gray-900 shadow-xl dark:shadow-gray-900/50 z-[202] flex flex-col border-r border-gray-200 dark:border-gray-700"
        style={{ right: '50%' }}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[14px] font-semibold text-gray-900 dark:text-gray-100">Suggestions</h3>
              <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5">
                {fieldLabel}
                {relatedObjectLabel && (
                  <span className="text-gray-400 dark:text-gray-500"> - {relatedObjectLabel}</span>
                )}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Add Suggestion Form */}
        <form onSubmit={handleSubmit} className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <label className="block text-[12px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Add a suggestion
          </label>
          <div className="flex gap-2">
            <textarea
              value={suggestionText}
              onChange={(e) => setSuggestionText(e.target.value)}
              placeholder={`Suggest an improvement for ${fieldLabel.toLowerCase()}...`}
              className="flex-1 text-[13px] px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
              rows={2}
            />
            <button
              type="submit"
              disabled={!suggestionText.trim() || isCreating}
              className="self-end px-3 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-md hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Suggestions List */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredSuggestions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-[13px] text-gray-500 dark:text-gray-400">No suggestions yet</p>
              <p className="text-[12px] text-gray-400 dark:text-gray-500 mt-1">
                Add a suggestion above to help improve this field
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSuggestions.map((suggestion) => {
                const suggestionFieldLabel = SUGGESTION_FIELD_LABELS[suggestion.field_name] || suggestion.field_name
                const currentValue = getFieldValue(
                  candidate,
                  suggestion.field_type,
                  suggestion.field_name,
                  suggestion.related_object_id
                )
                return (
                <div
                  key={suggestion.id}
                  className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  {/* Field indicator */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-1.5 py-0.5 text-[10px] font-medium bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-400 rounded uppercase">
                      {suggestion.field_type}
                    </span>
                    <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300">{suggestionFieldLabel}</span>
                  </div>

                  {/* Current value */}
                  {currentValue && (
                    <div className="mb-2 px-2 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded text-[11px] text-gray-600 dark:text-gray-400 italic">
                      "{truncateText(currentValue, 100)}"
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-2 mb-2">
                    <StatusBadge status={suggestion.status} />
                    {suggestion.status !== 'pending' && suggestion.status !== 'closed' && (
                      <button
                        onClick={() => onReopenSuggestion(suggestion.id)}
                        disabled={isUpdating}
                        className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50"
                        title="Reopen this suggestion"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Reopen
                      </button>
                    )}
                    {suggestion.status === 'pending' && (
                      <button
                        onClick={() => onCloseSuggestion(suggestion.id)}
                        disabled={isUpdating}
                        className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50"
                        title="Close this suggestion (no longer relevant)"
                      >
                        <XCircle className="w-3 h-3" />
                        Close
                      </button>
                    )}
                  </div>

                  <p className="text-[13px] text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {suggestion.suggestion_text}
                  </p>

                  <div className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
                    <span>{suggestion.created_by_name || 'Unknown'}</span>
                    <span className="mx-1">-</span>
                    <span>
                      {formatDistanceToNow(new Date(suggestion.created_at), { addSuffix: true })}
                    </span>
                  </div>

                  {suggestion.status === 'declined' && suggestion.resolution_note && (
                    <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium mb-1">Decline reason:</p>
                      <p className="text-[12px] text-gray-600 dark:text-gray-400 italic">
                        "{suggestion.resolution_note}"
                      </p>
                    </div>
                  )}

                  {suggestion.reopened_at && (
                    <div className="mt-2 text-[11px] text-amber-600">
                      Reopened by {suggestion.reopened_by_name}{' '}
                      {formatDistanceToNow(new Date(suggestion.reopened_at), { addSuffix: true })}
                    </div>
                  )}
                </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
