/**
 * useEntityActions Hook
 *
 * Resolves which actions are visible for an entity based on its state.
 * Uses the declarative action configuration from actionConfig.tsx.
 */

import { useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  resolveActions,
  type ActionHandlers,
  type VisibleAction,
  type ActionContext,
  type ActionEntityType,
} from '@/components/service/actionConfig'

interface UseEntityActionsOptions {
  /** Additional context to pass to action visibility/disabled checks */
  extraContext?: Partial<ActionContext>
}

/**
 * Hook to get resolved actions for an entity
 *
 * @param entityType - The type of entity (lead, company, candidate, application)
 * @param entity - The entity object
 * @param handlers - Map of action IDs to handler functions
 * @param options - Additional options
 * @returns Array of visible actions ready to render
 *
 * @example
 * ```tsx
 * const handlers: ActionHandlers = {
 *   'schedule-meeting': () => window.open(...),
 *   'send-invitation': () => setShowModal(true),
 *   'mark-won': handleMarkWon,
 * }
 *
 * const actions = useEntityActions('lead', lead, handlers)
 *
 * return <EntityActionRail actions={actions} />
 * ```
 */
export function useEntityActions(
  entityType: ActionEntityType,
  entity: Record<string, unknown> | null | undefined,
  handlers: ActionHandlers,
  options: UseEntityActionsOptions = {}
): VisibleAction[] {
  const { user } = useAuth()

  return useMemo(() => {
    if (!entity) return []

    const context: ActionContext = {
      user: user
        ? {
            id: user.id,
            booking_slug: user.booking_slug,
          }
        : null,
      entityType,
      ...options.extraContext,
    }

    return resolveActions(entityType, entity, context, handlers)
  }, [entityType, entity, handlers, user, options.extraContext])
}
