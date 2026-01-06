import {
  User,
  CheckSquare,
  Clock,
  Calendar,
  Building2,
  Briefcase,
  Users,
  FileText,
  Send,
  GitBranch,
  Zap,
  CreditCard,
  Activity,
  MessageSquare,
  Link,
  HelpCircle,
  Filter,
} from 'lucide-react'
import type { OnboardingEntityType } from '@/types'

// =============================================================================
// Types
// =============================================================================

export type EntityPanelType =
  | 'profile'
  | 'details'
  | 'culture'
  | 'tasks'
  | 'timeline'
  | 'meetings'
  | 'jobs'
  | 'team'
  | 'billing'
  | 'subscriptions'
  | 'applications'
  | 'invitations'
  | 'activity'

export type ApplicationPanelType =
  | 'profile'
  | 'company'
  | 'pipeline'
  | 'actions'
  | 'answers'
  | 'evaluations'
  | 'job'
  | 'activity'
  | 'tasks'
  | 'timeline'

export type TaskPanelType =
  | 'details'
  | 'entity'
  | 'activity'
  | 'notes'

export type JobPanelType =
  | 'details'
  | 'pipeline'
  | 'questions'
  | 'screening'
  | 'applications'
  | 'tasks'
  | 'timeline'

export type PanelType = EntityPanelType | ApplicationPanelType | TaskPanelType | JobPanelType

export interface PanelOption {
  type: PanelType
  label: string
  icon: React.ReactNode
  count?: number
}

export interface Panel {
  id: string
  type: PanelType
  title: string
}

// =============================================================================
// Entity Panel Configurations
// =============================================================================

const COMMON_ENTITY_PANELS: PanelOption[] = [
  { type: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
  { type: 'tasks', label: 'Tasks & Follow-ups', icon: <CheckSquare className="w-4 h-4" /> },
  { type: 'timeline', label: 'Timeline', icon: <Clock className="w-4 h-4" /> },
  // Note: 'meetings' panel removed - not yet implemented
]

const COMPANY_PANELS: PanelOption[] = [
  { type: 'jobs', label: 'Jobs', icon: <Briefcase className="w-4 h-4" /> },
  { type: 'team', label: 'Team', icon: <Users className="w-4 h-4" /> },
  { type: 'subscriptions', label: 'Subscription', icon: <CreditCard className="w-4 h-4" /> },
]

const CANDIDATE_PANELS: PanelOption[] = [
  { type: 'applications', label: 'Applications', icon: <FileText className="w-4 h-4" /> },
  { type: 'activity', label: 'Activity Log', icon: <Activity className="w-4 h-4" /> },
]

const LEAD_PANELS: PanelOption[] = [
  { type: 'invitations', label: 'Invitations', icon: <Send className="w-4 h-4" /> },
  { type: 'activity', label: 'Activity', icon: <Activity className="w-4 h-4" /> },
]

// =============================================================================
// Application Panel Configuration
// =============================================================================

export const APPLICATION_PANELS: PanelOption[] = [
  { type: 'profile', label: 'Candidate Profile', icon: <User className="w-4 h-4" /> },
  { type: 'company', label: 'Company Profile', icon: <Building2 className="w-4 h-4" /> },
  { type: 'pipeline', label: 'Pipeline & Stages', icon: <GitBranch className="w-4 h-4" /> },
  { type: 'actions', label: 'Actions', icon: <Zap className="w-4 h-4" /> },
  { type: 'answers', label: 'Application Answers', icon: <FileText className="w-4 h-4" /> },
  { type: 'evaluations', label: 'Candidate Evaluations', icon: <Activity className="w-4 h-4" /> },
  { type: 'job', label: 'Job Details', icon: <Briefcase className="w-4 h-4" /> },
  { type: 'activity', label: 'Activity Log', icon: <Activity className="w-4 h-4" /> },
  { type: 'tasks', label: 'Tasks', icon: <CheckSquare className="w-4 h-4" /> },
  { type: 'timeline', label: 'Timeline', icon: <Calendar className="w-4 h-4" /> },
]

// =============================================================================
// Task Panel Configuration
// =============================================================================

export const TASK_PANELS: PanelOption[] = [
  { type: 'details', label: 'Details', icon: <FileText className="w-4 h-4" /> },
  { type: 'entity', label: 'Linked Entity', icon: <Link className="w-4 h-4" /> },
  { type: 'activity', label: 'Activity', icon: <Activity className="w-4 h-4" /> },
  { type: 'notes', label: 'Notes', icon: <MessageSquare className="w-4 h-4" /> },
]

// =============================================================================
// Job Panel Configuration
// =============================================================================

export const JOB_PANELS: PanelOption[] = [
  { type: 'details', label: 'Details', icon: <FileText className="w-4 h-4" /> },
  { type: 'pipeline', label: 'Pipeline', icon: <GitBranch className="w-4 h-4" /> },
  { type: 'questions', label: 'Application Questions', icon: <HelpCircle className="w-4 h-4" /> },
  { type: 'screening', label: 'Evaluation Criteria', icon: <Filter className="w-4 h-4" /> },
  { type: 'applications', label: 'Applications', icon: <Users className="w-4 h-4" /> },
  { type: 'tasks', label: 'Tasks', icon: <CheckSquare className="w-4 h-4" /> },
  { type: 'timeline', label: 'Timeline', icon: <Clock className="w-4 h-4" /> },
]

// =============================================================================
// Panel Getters
// =============================================================================

export function getEntityPanelOptions(entityType: OnboardingEntityType): PanelOption[] {
  switch (entityType) {
    case 'company':
      return [...COMMON_ENTITY_PANELS, ...COMPANY_PANELS]
    case 'candidate':
      return [...COMMON_ENTITY_PANELS, ...CANDIDATE_PANELS]
    case 'lead':
      return [...COMMON_ENTITY_PANELS, ...LEAD_PANELS]
    default:
      return COMMON_ENTITY_PANELS
  }
}

export function getApplicationPanelOptions(): PanelOption[] {
  return APPLICATION_PANELS
}

export function getTaskPanelOptions(): PanelOption[] {
  return TASK_PANELS
}

export function getJobPanelOptions(): PanelOption[] {
  return JOB_PANELS
}

// =============================================================================
// Default Panel Configurations
// =============================================================================

export function getDefaultEntityPanels(entityType: OnboardingEntityType): Panel[] {
  switch (entityType) {
    case 'company':
      return [
        { id: '1', type: 'profile', title: 'Profile' },
        { id: '2', type: 'jobs', title: 'Jobs' },
        { id: '3', type: 'tasks', title: 'Tasks & Follow-ups' },
      ]
    case 'candidate':
      return [
        { id: '1', type: 'profile', title: 'Profile' },
        { id: '2', type: 'applications', title: 'Applications' },
        { id: '3', type: 'timeline', title: 'Timeline' },
      ]
    case 'lead':
      return [
        { id: '1', type: 'profile', title: 'Profile' },
        { id: '2', type: 'tasks', title: 'Tasks & Follow-ups' },
        { id: '3', type: 'timeline', title: 'Timeline' },
      ]
    default:
      return [
        { id: '1', type: 'profile', title: 'Profile' },
        { id: '2', type: 'tasks', title: 'Tasks & Follow-ups' },
        { id: '3', type: 'timeline', title: 'Timeline' },
      ]
  }
}

export function getDefaultApplicationPanels(): Panel[] {
  return [
    { id: '1', type: 'profile', title: 'Candidate Profile' },
    { id: '2', type: 'company', title: 'Company Profile' },
    { id: '3', type: 'pipeline', title: 'Pipeline & Stages' },
  ]
}

// =============================================================================
// Utility Functions
// =============================================================================

export function getPanelIcon(type: PanelType): React.ReactNode {
  const allPanels = [...COMMON_ENTITY_PANELS, ...COMPANY_PANELS, ...CANDIDATE_PANELS, ...LEAD_PANELS, ...APPLICATION_PANELS, ...TASK_PANELS, ...JOB_PANELS]
  return allPanels.find((p) => p.type === type)?.icon || <User className="w-4 h-4" />
}

export function getPanelLabel(type: PanelType, isApplicationContext = false): string {
  if (isApplicationContext) {
    const panel = APPLICATION_PANELS.find((p) => p.type === type)
    if (panel) return panel.label
  }

  const allPanels = [...COMMON_ENTITY_PANELS, ...COMPANY_PANELS, ...CANDIDATE_PANELS, ...LEAD_PANELS, ...TASK_PANELS, ...JOB_PANELS]
  return allPanels.find((p) => p.type === type)?.label || type
}
