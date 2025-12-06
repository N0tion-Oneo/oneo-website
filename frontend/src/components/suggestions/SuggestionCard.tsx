import { Check, X } from 'lucide-react'
import type { ProfileSuggestion } from '@/types'
import { SUGGESTION_FIELD_LABELS } from '@/types'
import { formatDistanceToNow } from 'date-fns'

function truncateText(text: string, maxLength: number = 100): string {
  if (!text || text.length <= maxLength) return text
  return text.substring(0, maxLength).trim() + '...'
}

interface SuggestionCardProps {
  suggestion: ProfileSuggestion
  currentValue?: string
  onResolve: (suggestionId: string) => void
  onDecline: (suggestionId: string) => void
  onNavigate?: (suggestion: ProfileSuggestion) => void
  isUpdating: boolean
}

export default function SuggestionCard({
  suggestion,
  currentValue,
  onResolve,
  onDecline,
  onNavigate,
  isUpdating,
}: SuggestionCardProps) {
  const fieldLabel = SUGGESTION_FIELD_LABELS[suggestion.field_name] || suggestion.field_name

  // Get type label
  const getTypeLabel = () => {
    switch (suggestion.field_type) {
      case 'profile':
        return 'Profile'
      case 'experience':
        return 'Experience'
      case 'education':
        return 'Education'
      default:
        return suggestion.field_type
    }
  }

  const handleCardClick = () => {
    if (onNavigate) {
      onNavigate(suggestion)
    }
  }

  return (
    <div
      className={`bg-white border border-gray-200 rounded-lg p-4 shadow-sm ${onNavigate ? 'cursor-pointer hover:border-amber-300 hover:shadow-md transition-all' : ''}`}
      onClick={handleCardClick}
    >
      {/* Field indicator */}
      <div className="flex items-center gap-2 mb-2">
        <span className="px-2 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-600 rounded-full uppercase">
          {getTypeLabel()}
        </span>
        <span className="text-[12px] font-medium text-gray-700">{fieldLabel}</span>
      </div>

      {/* Current value */}
      {currentValue && (
        <div className="mb-3 px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-[11px] text-gray-600 italic">
          "{truncateText(currentValue, 100)}"
        </div>
      )}

      {/* Suggestion text */}
      <p className="text-[14px] text-gray-800 leading-relaxed whitespace-pre-wrap">
        {suggestion.suggestion_text}
      </p>

      {/* Meta info */}
      <div className="mt-3 flex items-center justify-between">
        <div className="text-[11px] text-gray-500">
          <span className="font-medium">{suggestion.created_by_name || 'Recruiter'}</span>
          <span className="mx-1">-</span>
          <span>
            {formatDistanceToNow(new Date(suggestion.created_at), { addSuffix: true })}
          </span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="mt-4 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => onResolve(suggestion.id)}
          disabled={isUpdating}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-[13px] font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Check className="w-4 h-4" />
          Resolve
        </button>
        <button
          onClick={() => onDecline(suggestion.id)}
          disabled={isUpdating}
          className="flex items-center justify-center gap-1.5 px-3 py-2 text-[13px] font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <X className="w-4 h-4" />
          Decline
        </button>
      </div>
    </div>
  )
}
