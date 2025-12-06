import { useState, ReactNode } from 'react'
import { MessageSquarePlus, MessageSquare } from 'lucide-react'
import type { ProfileSuggestionFieldType, ProfileSuggestion } from '@/types'

interface SuggestionIndicatorProps {
  children: ReactNode
  fieldType: ProfileSuggestionFieldType
  fieldName: string
  relatedObjectId?: string
  suggestions?: ProfileSuggestion[]
  onAddSuggestion: (
    fieldType: ProfileSuggestionFieldType,
    fieldName: string,
    relatedObjectId?: string
  ) => void
  disabled?: boolean
}

export default function SuggestionIndicator({
  children,
  fieldType,
  fieldName,
  relatedObjectId,
  suggestions = [],
  onAddSuggestion,
  disabled = false,
}: SuggestionIndicatorProps) {
  const [isHovered, setIsHovered] = useState(false)

  // Count suggestions for this specific field
  const fieldSuggestions = suggestions.filter(
    (s) =>
      s.field_type === fieldType &&
      s.field_name === fieldName &&
      (relatedObjectId ? s.related_object_id === relatedObjectId : true)
  )

  const pendingSuggestions = fieldSuggestions.filter((s) => s.status === 'pending')
  const hasPending = pendingSuggestions.length > 0

  const handleClick = () => {
    if (!disabled) {
      onAddSuggestion(fieldType, fieldName, relatedObjectId)
    }
  }

  return (
    <div
      className="relative group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}

      {/* Suggestion indicator button */}
      {!disabled && (isHovered || hasPending) && (
        <button
          onClick={handleClick}
          className={`absolute -right-1 top-0 p-1 rounded-md transition-all ${
            hasPending
              ? 'bg-amber-100 text-amber-600 hover:bg-amber-200'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
          } ${isHovered ? 'opacity-100' : 'opacity-70'}`}
          title={
            hasPending
              ? `${pendingSuggestions.length} pending suggestion${pendingSuggestions.length > 1 ? 's' : ''}`
              : 'Add suggestion'
          }
        >
          {hasPending ? (
            <div className="relative">
              <MessageSquare className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {pendingSuggestions.length}
              </span>
            </div>
          ) : (
            <MessageSquarePlus className="w-4 h-4" />
          )}
        </button>
      )}
    </div>
  )
}
