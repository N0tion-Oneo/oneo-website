/**
 * EntityActionRail Component
 *
 * Renders a vertical action rail from resolved action definitions.
 * Uses the VisibleAction type from actionConfig.tsx.
 */

import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, ChevronDown, Users } from 'lucide-react'
import type { VisibleAction, ActionVariant } from '@/components/service/actionConfig'
import type { AssignedUser } from '@/types'
import { AssignedSelect } from '@/components/forms'

// =============================================================================
// Variant Styles
// =============================================================================

const variantStyles: Record<
  ActionVariant,
  { base: string; icon: string }
> = {
  default: {
    base: 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700',
    icon: 'text-gray-500 dark:text-gray-400',
  },
  success: {
    base: 'text-green-600 dark:text-green-500 hover:text-green-700 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30',
    icon: 'text-green-600 dark:text-green-500',
  },
  danger: {
    base: 'text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30',
    icon: 'text-red-500 dark:text-red-400',
  },
  warning: {
    base: 'text-orange-500 dark:text-orange-400 hover:text-orange-600 dark:hover:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/30',
    icon: 'text-orange-500 dark:text-orange-400',
  },
  info: {
    base: 'text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30',
    icon: 'text-blue-500 dark:text-blue-400',
  },
}

// =============================================================================
// Action Button Component
// =============================================================================

interface ActionButtonProps {
  action: VisibleAction
  expanded: boolean
}

function ActionButton({ action, expanded }: ActionButtonProps) {
  const styles = variantStyles[action.variant]
  const Icon = action.icon

  if (expanded) {
    return (
      <button
        onClick={action.onClick}
        disabled={action.disabled}
        className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${styles.base} ${
          action.disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        <span className={`flex-shrink-0 mt-0.5 ${styles.icon}`}>
          <Icon className="w-4 h-4" />
        </span>
        <div className="min-w-0">
          <div className="text-[13px] font-medium leading-tight">{action.label}</div>
          {action.description && (
            <div className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight mt-0.5">
              {action.description}
            </div>
          )}
        </div>
      </button>
    )
  }

  return (
    <button
      onClick={action.onClick}
      disabled={action.disabled}
      title={action.label}
      className={`p-2 rounded-md transition-colors ${styles.base} ${
        action.disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    >
      <Icon className="w-4 h-4" />
    </button>
  )
}

// =============================================================================
// Stage Types
// =============================================================================

export interface StageOption {
  id: string | number
  name: string
  color: string
  slug?: string
}

// =============================================================================
// Stage Selector Component
// =============================================================================

interface StageSelectorProps {
  currentStage: StageOption | null
  stages: StageOption[]
  onStageChange: (stageId: string | number) => void
  isUpdating?: boolean
  expanded: boolean
}

function StageSelector({ currentStage, stages, onStageChange, isUpdating, expanded }: StageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={dropdownRef}>
      {expanded ? (
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={isUpdating}
          className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md text-[13px] font-medium transition-colors ${
            isUpdating ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'
          }`}
          style={{
            backgroundColor: currentStage ? `${currentStage.color}20` : undefined,
            color: currentStage?.color || '#6B7280',
          }}
        >
          <span className="truncate">{currentStage?.name || 'No Stage'}</span>
          <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
        </button>
      ) : (
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={isUpdating}
          className={`p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
            isUpdating ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          title={currentStage?.name || 'No Stage'}
        >
          <div
            className="w-5 h-5 rounded-full"
            style={{ backgroundColor: currentStage?.color || '#9CA3AF' }}
          />
        </button>
      )}

      {isOpen && (
        <div className="absolute left-0 mt-1 w-[200px] bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
          {stages.map((stage) => (
            <button
              key={stage.id}
              onClick={() => {
                onStageChange(stage.id)
                setIsOpen(false)
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-[13px] hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                currentStage?.id === stage.id ? 'bg-gray-50 dark:bg-gray-700' : ''
              }`}
            >
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: stage.color }}
              />
              <span className="text-gray-700 dark:text-gray-300">{stage.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Focus Mode CTA Component
// =============================================================================

const FOCUS_MODE_ACTION_IDS = ['service-mode', 'interview-mode']

interface FocusModeCTAProps {
  action: VisibleAction
  expanded: boolean
}

function FocusModeCTA({ action, expanded }: FocusModeCTAProps) {
  const Icon = action.icon

  if (expanded) {
    return (
      <button
        onClick={action.onClick}
        disabled={action.disabled}
        className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg border transition-all
          bg-blue-50 border-blue-200 hover:bg-blue-100 text-blue-700
          dark:bg-blue-900/20 dark:border-blue-800 dark:hover:bg-blue-900/30 dark:text-blue-300
          ${action.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span className="flex-shrink-0">
          <Icon className="w-5 h-5" />
        </span>
        <div className="min-w-0 text-left">
          <div className="text-[13px] font-semibold leading-tight">{action.label}</div>
          {action.description && (
            <div className="text-[11px] text-blue-600 dark:text-blue-400 leading-tight mt-0.5">
              {action.description}
            </div>
          )}
        </div>
      </button>
    )
  }

  return (
    <button
      onClick={action.onClick}
      disabled={action.disabled}
      title={action.label}
      className={`p-2.5 rounded-lg border transition-all
        bg-blue-50 border-blue-200 hover:bg-blue-100 text-blue-700
        dark:bg-blue-900/20 dark:border-blue-800 dark:hover:bg-blue-900/30 dark:text-blue-300
        ${action.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <Icon className="w-5 h-5" />
    </button>
  )
}

// =============================================================================
// EntityActionRail Component
// =============================================================================

export interface EntityActionRailProps {
  actions: VisibleAction[]
  defaultExpanded?: boolean
  /** Assigned users */
  assignedTo?: AssignedUser[]
  onAssignedChange?: (assigned: AssignedUser[]) => void
  /** Stage selector */
  currentStage?: StageOption | null
  stages?: StageOption[]
  onStageChange?: (stageId: string | number) => void
  isUpdatingStage?: boolean
}

export function EntityActionRail({
  actions,
  defaultExpanded = false,
  assignedTo,
  onAssignedChange,
  currentStage,
  stages,
  onStageChange,
  isUpdatingStage,
}: EntityActionRailProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  const hasAssigned = assignedTo !== undefined && onAssignedChange !== undefined
  const hasStage = stages !== undefined && stages.length > 0 && onStageChange !== undefined

  // Separate focus mode action from regular actions
  const focusModeAction = actions.find((a) => FOCUS_MODE_ACTION_IDS.includes(a.id))
  const regularActions = actions.filter((a) => !FOCUS_MODE_ACTION_IDS.includes(a.id))

  // Don't render if no actions and no assigned/stage
  if (regularActions.length === 0 && !focusModeAction && !hasAssigned && !hasStage) {
    return null
  }

  return (
    <div className={`h-full flex flex-col ${expanded ? 'w-52' : 'w-auto'}`}>
      {/* Header with toggle */}
      <div className={`flex items-center pt-3 ${expanded ? 'px-3 justify-end' : 'px-1.5 justify-center'}`}>
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          title={expanded ? 'Collapse' : 'Expand'}
        >
          {expanded ? (
            <ChevronRight className="w-3.5 h-3.5" />
          ) : (
            <ChevronLeft className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* Stage Selector */}
      {hasStage && (
        <div className={`${expanded ? 'px-3' : 'px-1.5'} pt-2`}>
          {expanded && (
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">
              Stage
            </h4>
          )}
          <StageSelector
            currentStage={currentStage || null}
            stages={stages}
            onStageChange={onStageChange}
            isUpdating={isUpdatingStage}
            expanded={expanded}
          />
        </div>
      )}

      {/* Assigned Selector */}
      {hasAssigned && (
        <div className={`${expanded ? 'px-3' : 'px-1.5'} pt-3`}>
          {expanded ? (
            <>
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">
                Assigned
              </h4>
              <AssignedSelect
                selected={assignedTo}
                onChange={onAssignedChange}
                placeholder="Assign..."
                compact
              />
            </>
          ) : (
            <div
              className="flex flex-col items-center gap-1 py-1"
              title={assignedTo.length > 0 ? assignedTo.map(u => u.full_name).join(', ') : 'No one assigned'}
            >
              {assignedTo.length > 0 ? (
                <>
                  {/* Show up to 3 avatars stacked */}
                  <div className="flex flex-col gap-0.5">
                    {assignedTo.slice(0, 3).map((user) => (
                      <div
                        key={user.id}
                        className="w-6 h-6 rounded-full bg-gray-700 dark:bg-gray-600 flex items-center justify-center text-[9px] font-medium text-white"
                        title={user.full_name}
                      >
                        {user.full_name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2)}
                      </div>
                    ))}
                  </div>
                  {assignedTo.length > 3 && (
                    <span className="text-[10px] text-gray-500 dark:text-gray-400">
                      +{assignedTo.length - 3}
                    </span>
                  )}
                </>
              ) : (
                <div className="w-6 h-6 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
                  <Users className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Actions Section */}
      {regularActions.length > 0 && (
        <>
          {expanded && (
            <div className="px-3 pt-4">
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Actions
              </h4>
            </div>
          )}
          <div className={`flex flex-col pt-2 ${expanded ? 'px-3 gap-1' : 'px-1.5 gap-1 items-center'}`}>
            {regularActions.map((action) => (
              <ActionButton key={action.id} action={action} expanded={expanded} />
            ))}
          </div>
        </>
      )}

      {/* Focus Mode CTA - Prominent button at bottom */}
      {focusModeAction && (
        <div className={`mt-auto pt-3 pb-3 ${expanded ? 'px-3' : 'px-1.5'}`}>
          <FocusModeCTA action={focusModeAction} expanded={expanded} />
        </div>
      )}
    </div>
  )
}

export default EntityActionRail
