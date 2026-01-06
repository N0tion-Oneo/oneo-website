/**
 * Action Configuration System
 *
 * Declarative action definitions for entity drawers.
 * Similar pattern to panelConfig.tsx - defines available actions per entity type
 * with visibility and disabled conditions.
 */

import {
  Video,
  Send,
  Trophy,
  XCircle,
  Trash2,
  Maximize2,
  Briefcase,
  CheckCircle,
  Gift,
  Plus,
  Building2,
  StickyNote,
  Calendar,
  MessageSquare,
  Pencil,
  Copy,
  ExternalLink,
  Archive,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { OnboardingEntityType } from '@/types'

// =============================================================================
// Types
// =============================================================================

export type ActionVariant = 'default' | 'success' | 'danger' | 'warning' | 'info'

/** Extended entity type that includes application and job */
export type ActionEntityType = OnboardingEntityType | 'application' | 'job'

export interface ActionContext {
  user: {
    id: string | number
    booking_slug?: string
  } | null
  entityType: ActionEntityType
  /** Additional context flags */
  isAdminMode?: boolean
}

export interface ActionDefinition {
  id: string
  label: string
  description?: string
  icon: LucideIcon
  variant: ActionVariant
  /** Return true to show this action. Defaults to true if not provided. */
  isVisible?: (entity: Record<string, unknown>, context: ActionContext) => boolean
  /** Return true to disable this action. Defaults to false if not provided. */
  isDisabled?: (entity: Record<string, unknown>, context: ActionContext) => boolean
}

export interface VisibleAction {
  id: string
  label: string
  description?: string
  icon: LucideIcon
  variant: ActionVariant
  disabled: boolean
  onClick: () => void
}

export type ActionHandlers = Record<string, () => void>

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if a lead is in a terminal stage (won or lost)
 */
function isLeadTerminal(entity: Record<string, unknown>): boolean {
  const stage = entity.onboarding_stage as { slug?: string } | null
  return stage?.slug === 'won' || stage?.slug === 'lost'
}

// =============================================================================
// Lead Actions
// =============================================================================

const LEAD_ACTIONS: ActionDefinition[] = [
  {
    id: 'schedule-meeting',
    label: 'Schedule Meeting',
    description: 'Book a video call',
    icon: Video,
    variant: 'info',
    isVisible: (_, ctx) => !!ctx.user?.booking_slug,
  },
  {
    id: 'send-invitation',
    label: 'Send Invitation',
    description: 'Invite to client portal',
    icon: Send,
    variant: 'success',
    isVisible: (entity) => !isLeadTerminal(entity),
  },
  {
    id: 'mark-won',
    label: 'Mark Won',
    description: 'Close as successful',
    icon: Trophy,
    variant: 'success',
    isVisible: (entity) => !isLeadTerminal(entity),
  },
  {
    id: 'mark-lost',
    label: 'Mark Lost',
    description: 'Close as unsuccessful',
    icon: XCircle,
    variant: 'warning',
    isVisible: (entity) => !isLeadTerminal(entity),
  },
  {
    id: 'add-activity',
    label: 'Add Activity',
    description: 'Log an activity',
    icon: Plus,
    variant: 'default',
  },
  {
    id: 'convert-to-company',
    label: 'Convert to Company',
    description: 'Create company from lead',
    icon: Building2,
    variant: 'success',
    isVisible: (entity) => {
      const stage = entity.onboarding_stage as { slug?: string } | null
      return stage?.slug === 'won' && !entity.is_converted
    },
  },
  {
    id: 'delete',
    label: 'Delete Lead',
    description: 'Remove permanently',
    icon: Trash2,
    variant: 'danger',
    isVisible: (entity) => !entity.is_converted,
  },
]

// =============================================================================
// Company Actions
// =============================================================================

const COMPANY_ACTIONS: ActionDefinition[] = [
  {
    id: 'edit-profile',
    label: 'Edit Company',
    description: 'Update company details',
    icon: Pencil,
    variant: 'default',
  },
  {
    id: 'add-job',
    label: 'Add Job',
    description: 'Create new job posting',
    icon: Briefcase,
    variant: 'success',
  },
  {
    id: 'add-activity',
    label: 'Add Activity',
    description: 'Log an activity',
    icon: Plus,
    variant: 'default',
  },
  {
    id: 'service-mode',
    label: 'Service Mode',
    description: 'Full-screen focus view',
    icon: Maximize2,
    variant: 'info',
  },
]

// =============================================================================
// Candidate Actions
// =============================================================================

const CANDIDATE_ACTIONS: ActionDefinition[] = [
  {
    id: 'view-full-profile',
    label: 'Full Profile',
    description: 'View complete profile page',
    icon: ExternalLink,
    variant: 'default',
  },
  {
    id: 'add-to-job',
    label: 'Add to Job',
    description: 'Assign to a job opening',
    icon: Briefcase,
    variant: 'success',
    isVisible: (_, ctx) => ctx.isAdminMode !== false,
  },
  {
    id: 'add-activity',
    label: 'Add Activity',
    description: 'Log an activity',
    icon: Plus,
    variant: 'default',
    isVisible: (_, ctx) => ctx.isAdminMode !== false,
  },
  {
    id: 'add-note',
    label: 'Add Note',
    description: 'Add a private note',
    icon: StickyNote,
    variant: 'default',
    isVisible: (_, ctx) => ctx.isAdminMode !== false,
  },
  {
    id: 'service-mode',
    label: 'Service Mode',
    description: 'Full-screen focus view',
    icon: Maximize2,
    variant: 'info',
    isVisible: (_, ctx) => ctx.isAdminMode !== false,
  },
]

// =============================================================================
// Application Actions
// =============================================================================

const APPLICATION_STATUS = {
  APPLIED: 'applied',
  SHORTLISTED: 'shortlisted',
  IN_PROGRESS: 'in_progress',
  OFFER_MADE: 'offer_made',
  OFFER_ACCEPTED: 'offer_accepted',
  OFFER_DECLINED: 'offer_declined',
  REJECTED: 'rejected',
} as const

function isApplicationTerminal(entity: Record<string, unknown>): boolean {
  const status = entity.status as string
  return (
    status === APPLICATION_STATUS.REJECTED ||
    status === APPLICATION_STATUS.OFFER_ACCEPTED ||
    status === APPLICATION_STATUS.OFFER_DECLINED
  )
}

const APPLICATION_ACTIONS: ActionDefinition[] = [
  {
    id: 'shortlist',
    label: 'Shortlist',
    description: 'Move to shortlist',
    icon: CheckCircle,
    variant: 'success',
    isVisible: (entity) => entity.status === APPLICATION_STATUS.APPLIED,
  },
  {
    id: 'schedule-interview',
    label: 'Schedule Interview',
    description: 'Book an interview',
    icon: Calendar,
    variant: 'info',
    isVisible: (entity) => !isApplicationTerminal(entity),
  },
  {
    id: 'add-feedback',
    label: 'Add Feedback',
    description: 'Record interview feedback',
    icon: MessageSquare,
    variant: 'default',
    isVisible: (entity) => !isApplicationTerminal(entity),
  },
  {
    id: 'make-offer',
    label: 'Make Offer',
    description: 'Send job offer',
    icon: Gift,
    variant: 'success',
    isVisible: (entity) => {
      const status = entity.status as string
      return status === APPLICATION_STATUS.SHORTLISTED || status === APPLICATION_STATUS.IN_PROGRESS
    },
  },
  {
    id: 'reject',
    label: 'Reject',
    description: 'Reject application',
    icon: XCircle,
    variant: 'danger',
    isVisible: (entity) => !isApplicationTerminal(entity),
  },
  {
    id: 'interview-mode',
    label: 'Interview Mode',
    description: 'Full-screen interview view',
    icon: Maximize2,
    variant: 'info',
  },
]

// =============================================================================
// Job Actions
// =============================================================================

const JOB_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  CLOSED: 'closed',
  FILLED: 'filled',
  ARCHIVED: 'archived',
} as const

const JOB_ACTIONS: ActionDefinition[] = [
  {
    id: 'add-application',
    label: 'Add Candidate',
    description: 'Add candidate to job',
    icon: Plus,
    variant: 'success',
  },
  {
    id: 'view-applications',
    label: 'View Applications',
    description: 'See all applicants',
    icon: Users,
    variant: 'info',
  },
  {
    id: 'duplicate-job',
    label: 'Duplicate Job',
    description: 'Create a copy',
    icon: Copy,
    variant: 'default',
  },
  {
    id: 'view-public',
    label: 'View Public Page',
    description: 'Open public listing',
    icon: ExternalLink,
    variant: 'info',
    isVisible: (entity) => entity.status === JOB_STATUS.PUBLISHED,
  },
  {
    id: 'archive-job',
    label: 'Archive Job',
    description: 'Move to archive',
    icon: Archive,
    variant: 'warning',
    isVisible: (entity) => entity.status !== JOB_STATUS.ARCHIVED,
  },
  {
    id: 'service-mode',
    label: 'Job Mode',
    description: 'Full-screen job view',
    icon: Maximize2,
    variant: 'info',
  },
]

// =============================================================================
// Getters
// =============================================================================

/**
 * Get action definitions for a specific entity type
 */
export function getEntityActions(entityType: ActionEntityType): ActionDefinition[] {
  switch (entityType) {
    case 'lead':
      return LEAD_ACTIONS
    case 'company':
      return COMPANY_ACTIONS
    case 'candidate':
      return CANDIDATE_ACTIONS
    case 'application':
      return APPLICATION_ACTIONS
    case 'job':
      return JOB_ACTIONS
    default:
      return []
  }
}

/**
 * Resolve visible actions based on entity state and context
 */
export function resolveActions(
  entityType: ActionEntityType,
  entity: Record<string, unknown>,
  context: ActionContext,
  handlers: ActionHandlers
): VisibleAction[] {
  const definitions = getEntityActions(entityType)

  return definitions
    .filter((action) => action.isVisible?.(entity, context) ?? true)
    .map((action) => ({
      id: action.id,
      label: action.label,
      description: action.description,
      icon: action.icon,
      variant: action.variant,
      disabled: action.isDisabled?.(entity, context) ?? false,
      onClick: handlers[action.id] ?? (() => {}),
    }))
}
