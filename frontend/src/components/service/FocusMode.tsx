import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  X,
  User,
  CheckSquare,
  Clock,
  Calendar,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronRight,
  Building2,
  Briefcase,
  Users,
  FileText,
  Send,
  GitBranch,
  Plus,
  Zap,
} from 'lucide-react'
import { useServiceCenter, useApplication } from '@/hooks'
import type { OnboardingEntityType } from '@/types'
import { EntityProfilePanel } from './panels/EntityProfilePanel'
import { TasksPanel } from './panels/TasksPanel'
import { TimelinePanel } from './panels/TimelinePanel'
import { MeetingsPanel } from './panels/MeetingsPanel'
import { JobsPanel } from './panels/JobsPanel'
import { ContactsPanel } from './panels/ContactsPanel'
import { BillingPanel } from './panels/BillingPanel'
import { ApplicationsPanel } from './panels/ApplicationsPanel'
import { InvitationsPanel } from './panels/InvitationsPanel'
import { PipelinePanel } from './panels/PipelinePanel'
import { JobDetailPanel } from './panels/JobDetailPanel'
import { ActionsPanel } from './panels/ActionsPanel'
import { AnswersPanel } from './panels/AnswersPanel'
import { CandidateProfileCard } from '@/components/candidates'
import ActivityTimeline from '@/components/applications/ActivityTimeline'

// =============================================================================
// Types
// =============================================================================

// All possible panel types across both modes
type PanelType =
  // Common panels
  | 'profile'
  | 'tasks'
  | 'timeline'
  | 'meetings'
  // Company-specific
  | 'jobs'
  | 'contacts'
  | 'billing'
  // Candidate-specific
  | 'applications'
  // Lead-specific
  | 'invitations'
  // Application-specific
  | 'pipeline'
  | 'candidate'
  | 'activity'
  | 'job'
  | 'actions'
  | 'answers'

interface Panel {
  id: string
  type: PanelType
  title: string
}

interface PanelOption {
  type: PanelType
  label: string
  icon: React.ReactNode
}

// Focus mode can be either entity-based or application-based
type FocusModeTarget =
  | { mode: 'entity'; entityType: OnboardingEntityType; entityId: string; entityName?: string }
  | { mode: 'application'; applicationId: string }

type FocusModeProps = FocusModeTarget & {
  onClose: () => void
}

// =============================================================================
// Panel Options Configuration
// =============================================================================

const COMMON_ENTITY_PANELS: PanelOption[] = [
  { type: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
  { type: 'tasks', label: 'Tasks & Follow-ups', icon: <CheckSquare className="w-4 h-4" /> },
  { type: 'timeline', label: 'Timeline', icon: <Clock className="w-4 h-4" /> },
  { type: 'meetings', label: 'Meetings', icon: <Calendar className="w-4 h-4" /> },
]

const COMPANY_PANELS: PanelOption[] = [
  { type: 'jobs', label: 'Jobs', icon: <Briefcase className="w-4 h-4" /> },
  { type: 'contacts', label: 'Contacts', icon: <Users className="w-4 h-4" /> },
  { type: 'billing', label: 'Billing', icon: <FileText className="w-4 h-4" /> },
]

const CANDIDATE_PANELS: PanelOption[] = [
  { type: 'applications', label: 'Applications', icon: <Briefcase className="w-4 h-4" /> },
]

const LEAD_PANELS: PanelOption[] = [
  { type: 'invitations', label: 'Invitations', icon: <Send className="w-4 h-4" /> },
]

const APPLICATION_PANELS: PanelOption[] = [
  { type: 'candidate', label: 'Candidate Profile', icon: <User className="w-4 h-4" /> },
  { type: 'pipeline', label: 'Pipeline & Stages', icon: <GitBranch className="w-4 h-4" /> },
  { type: 'actions', label: 'Actions', icon: <Zap className="w-4 h-4" /> },
  { type: 'answers', label: 'Screening Answers', icon: <FileText className="w-4 h-4" /> },
  { type: 'job', label: 'Job Details', icon: <Briefcase className="w-4 h-4" /> },
  { type: 'activity', label: 'Activity Log', icon: <Clock className="w-4 h-4" /> },
  { type: 'tasks', label: 'Tasks', icon: <CheckSquare className="w-4 h-4" /> },
  { type: 'timeline', label: 'Timeline', icon: <Calendar className="w-4 h-4" /> },
]

function getPanelOptions(target: FocusModeTarget): PanelOption[] {
  if (target.mode === 'application') {
    return APPLICATION_PANELS
  }

  const entityType = target.entityType
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

function getDefaultPanels(target: FocusModeTarget): Panel[] {
  if (target.mode === 'application') {
    return [
      { id: '1', type: 'candidate', title: 'Candidate Profile' },
      { id: '2', type: 'pipeline', title: 'Pipeline & Stages' },
      { id: '3', type: 'activity', title: 'Activity Log' },
    ]
  }

  switch (target.entityType) {
    case 'company':
      return [
        { id: '1', type: 'profile', title: 'Profile' },
        { id: '2', type: 'jobs', title: 'Jobs' },
        { id: '3', type: 'timeline', title: 'Timeline' },
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

// =============================================================================
// Panel Header Component
// =============================================================================

function PanelHeader({
  title,
  icon,
  panelOptions,
  onChangePanel,
  onMaximize,
  isMaximized,
  onMinimize,
  isMinimized,
  onRemove,
  canRemove,
}: {
  title: string
  icon: React.ReactNode
  panelOptions: PanelOption[]
  onChangePanel: (type: PanelType) => void
  onMaximize?: () => void
  isMaximized?: boolean
  onMinimize?: () => void
  isMinimized?: boolean
  onRemove?: () => void
  canRemove?: boolean
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  // Minimized state - vertical sidebar
  if (isMinimized) {
    return (
      <div
        className="h-full flex flex-col items-center py-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={onMinimize}
        title={`Expand ${title}`}
      >
        <ChevronRight className="w-4 h-4 text-gray-400 mb-2" />
        <div className="flex-1 flex items-center">
          <span
            className="text-xs font-medium text-gray-600 whitespace-nowrap"
            style={{
              writingMode: 'vertical-rl',
              textOrientation: 'mixed',
              transform: 'rotate(180deg)',
            }}
          >
            {title}
          </span>
        </div>
        <div className="mt-2">{icon}</div>
      </div>
    )
  }

  // Normal state
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
      <div className="relative flex items-center gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation()
            setIsDropdownOpen(!isDropdownOpen)
          }}
          className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          {icon}
          {title}
          <ChevronDown className="w-3 h-3" />
        </button>

        {isDropdownOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsDropdownOpen(false)}
            />
            <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
              {panelOptions.map((option) => (
                <button
                  key={option.type}
                  onClick={() => {
                    onChangePanel(option.type)
                    setIsDropdownOpen(false)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  {option.icon}
                  {option.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-1">
        {onMinimize && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onMinimize()
            }}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
            title="Minimize"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
        )}
        {onMaximize && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onMaximize()
            }}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
            title={isMaximized ? 'Restore' : 'Maximize'}
          >
            {isMaximized ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
        )}
        {canRemove && onRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
            className="p-1 text-gray-400 hover:text-red-600 rounded"
            title="Remove panel"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// Entity Labels and Icons
// =============================================================================

const entityTypeLabels: Record<string, string> = {
  company: 'Company',
  candidate: 'Candidate',
  lead: 'Lead',
  application: 'Application',
}

const entityTypeIcons: Record<string, React.ReactNode> = {
  company: <Building2 className="w-4 h-4" />,
  candidate: <User className="w-4 h-4" />,
  lead: <User className="w-4 h-4" />,
  application: <Briefcase className="w-4 h-4" />,
}

// =============================================================================
// FocusMode Component
// =============================================================================

export default function FocusMode(props: FocusModeProps) {
  const { onClose } = props

  // Extract target info - use the props directly as the target since it's already the right shape
  const target: FocusModeTarget = props

  // Panel options and state
  const panelOptions = useMemo(() => getPanelOptions(target), [
    target.mode,
    target.mode === 'entity' ? target.entityType : undefined,
  ])
  const [panels, setPanels] = useState<Panel[]>(() => getDefaultPanels(target))
  const [maximizedPanel, setMaximizedPanel] = useState<string | null>(null)
  const [minimizedPanels, setMinimizedPanels] = useState<Set<string>>(new Set())

  // Data fetching for entity mode
  const serviceCenterQuery = useServiceCenter(
    target.mode === 'entity' ? target.entityType : undefined,
    target.mode === 'entity' ? target.entityId : undefined
  )

  // Data fetching for application mode
  const applicationQuery = useApplication(
    target.mode === 'application' ? target.applicationId : ''
  )

  const isLoading = target.mode === 'entity'
    ? serviceCenterQuery.isLoading
    : applicationQuery.isLoading

  const error = target.mode === 'entity'
    ? serviceCenterQuery.error
    : applicationQuery.error

  const refetch = target.mode === 'entity'
    ? serviceCenterQuery.refetch
    : applicationQuery.refetch

  const data = target.mode === 'entity'
    ? serviceCenterQuery.data
    : null

  const application = target.mode === 'application'
    ? applicationQuery.application
    : null

  // Panel type change handler
  const handlePanelTypeChange = useCallback((panelId: string, newType: PanelType) => {
    setPanels((prev) =>
      prev.map((p) =>
        p.id === panelId
          ? { ...p, type: newType, title: panelOptions.find((o) => o.type === newType)?.label || newType }
          : p
      )
    )
  }, [panelOptions])

  const toggleMaximize = (panelId: string) => {
    setMaximizedPanel((prev) => (prev === panelId ? null : panelId))
    // Un-minimize if maximizing
    if (minimizedPanels.has(panelId)) {
      setMinimizedPanels((prev) => {
        const next = new Set(prev)
        next.delete(panelId)
        return next
      })
    }
  }

  const toggleMinimize = (panelId: string) => {
    setMinimizedPanels((prev) => {
      const next = new Set(prev)
      if (next.has(panelId)) {
        next.delete(panelId)
      } else {
        next.add(panelId)
      }
      return next
    })
  }

  // Add a new panel
  const addPanel = useCallback(() => {
    const firstOption = panelOptions[0]
    if (!firstOption) return

    // Find a panel type that isn't currently shown, or default to the first available
    const currentTypes = panels.map((p) => p.type)
    const availableOption = panelOptions.find((o) => !currentTypes.includes(o.type)) ?? firstOption

    const newPanel: Panel = {
      id: `panel-${Date.now()}`,
      type: availableOption.type,
      title: availableOption.label,
    }
    setPanels((prev) => [...prev, newPanel])
  }, [panels, panelOptions])

  // Remove a panel
  const removePanel = useCallback((panelId: string) => {
    setPanels((prev) => prev.filter((p) => p.id !== panelId))
    // If removing the maximized panel, exit maximize mode
    if (maximizedPanel === panelId) {
      setMaximizedPanel(null)
    }
  }, [maximizedPanel])

  // Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (maximizedPanel) {
          setMaximizedPanel(null)
        } else {
          onClose()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [maximizedPanel, onClose])

  // Get display info for header
  const getDisplayInfo = () => {
    if (target.mode === 'application' && application) {
      const candidateName = application.candidate
        ? `${application.candidate.first_name || ''} ${application.candidate.last_name || ''}`.trim()
        : 'Unknown Candidate'
      const jobTitle = application.job?.title || 'Unknown Job'
      return {
        name: candidateName,
        subtitle: jobTitle,
        status: application.status,
        type: 'application' as const,
      }
    }

    if (target.mode === 'entity' && data) {
      const entity = data.entity as { name?: string; company_name?: string; full_name?: string; onboarding_stage?: { name: string } }
      const name = target.entityName || entity?.name || entity?.company_name || entity?.full_name || 'Unknown'
      return {
        name,
        subtitle: entity?.onboarding_stage?.name,
        healthScore: data.health_score,
        type: target.entityType,
      }
    }

    return { name: 'Loading...', type: 'entity' as const }
  }

  const displayInfo = getDisplayInfo()

  // Get panel icon
  const getPanelIcon = (type: PanelType) => {
    return panelOptions.find((o) => o.type === type)?.icon || <User className="w-4 h-4" />
  }

  // Render panel content
  const renderPanelContent = (panel: Panel) => {
    if (isLoading) {
      return (
        <div className="h-full flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
        </div>
      )
    }

    if (error) {
      return (
        <div className="h-full flex items-center justify-center text-red-600">
          {error}
        </div>
      )
    }

    // Application mode panels
    if (target.mode === 'application' && application) {
      switch (panel.type) {
        case 'candidate':
          return (
            <div className="h-full overflow-y-auto p-4">
              {application.candidate && (
                <CandidateProfileCard
                  candidate={application.candidate}
                  experiences={application.candidate.experiences || []}
                  education={application.candidate.education || []}
                  coveringStatement={application.covering_statement}
                  variant="compact"
                  hideViewProfileLink={false}
                />
              )}
            </div>
          )
        case 'pipeline':
          return (
            <PipelinePanel
              applicationId={target.applicationId}
              onRefresh={refetch}
            />
          )
        case 'activity':
          return (
            <div className="h-full overflow-y-auto p-4">
              <ActivityTimeline applicationId={target.applicationId} />
            </div>
          )
        case 'job':
          return (
            <JobDetailPanel
              job={application.job}
              isLoading={false}
            />
          )
        case 'actions':
          return (
            <ActionsPanel
              applicationId={target.applicationId}
              application={application}
              onRefresh={refetch}
            />
          )
        case 'answers':
          return (
            <AnswersPanel
              answers={application.answers || []}
              isLoading={false}
            />
          )
        case 'tasks':
          return (
            <TasksPanel
              entityType="application"
              entityId={target.applicationId}
              tasks={[]}
              onRefresh={refetch}
            />
          )
        case 'timeline':
          return (
            <TimelinePanel
              entityType="application"
              entityId={target.applicationId}
              onRefresh={refetch}
            />
          )
        default:
          return null
      }
    }

    // Entity mode panels
    if (target.mode === 'entity' && data) {
      switch (panel.type) {
        case 'profile':
          return (
            <EntityProfilePanel
              entityType={target.entityType}
              entityId={target.entityId}
              entity={data.entity}
            />
          )
        case 'tasks':
          return (
            <TasksPanel
              entityType={target.entityType}
              entityId={target.entityId}
              tasks={data.tasks || []}
              onRefresh={refetch}
            />
          )
        case 'timeline':
          return (
            <TimelinePanel
              entityType={target.entityType}
              entityId={target.entityId}
              onRefresh={refetch}
            />
          )
        case 'meetings':
          return (
            <MeetingsPanel
              entityType={target.entityType}
              entityId={target.entityId}
              meetings={data.upcoming_meetings || []}
            />
          )
        case 'jobs':
          return (
            <JobsPanel
              companyId={target.entityId}
              entity={data.entity}
            />
          )
        case 'contacts':
          return (
            <ContactsPanel
              companyId={target.entityId}
              entity={data.entity}
            />
          )
        case 'billing':
          return (
            <BillingPanel
              companyId={target.entityId}
              entity={data.entity}
            />
          )
        case 'applications':
          return (
            <ApplicationsPanel
              candidateId={target.entityId}
            />
          )
        case 'invitations':
          return (
            <InvitationsPanel
              leadId={target.entityId}
              entity={data.entity}
            />
          )
        default:
          return null
      }
    }

    return null
  }

  // Mode label
  const modeLabel = target.mode === 'application' ? 'Interview Mode' : 'Service Mode'

  return (
    <div className="fixed inset-0 bg-white z-[300] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-gray-900">{modeLabel}</h1>
          <span className="text-gray-300">|</span>
          <div className="flex items-center gap-2">
            {entityTypeIcons[displayInfo.type]}
            <span className="text-sm font-medium text-gray-700">{displayInfo.name}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              {entityTypeLabels[displayInfo.type]}
            </span>
          </div>
          {displayInfo.subtitle && (
            <>
              <span className="text-gray-300">|</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                {displayInfo.subtitle}
              </span>
            </>
          )}
          {displayInfo.healthScore !== undefined && displayInfo.healthScore !== null && (
            <>
              <span className="text-gray-300">|</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  displayInfo.healthScore >= 80 ? 'bg-green-100 text-green-700' :
                  displayInfo.healthScore >= 50 ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}
              >
                Health: {displayInfo.healthScore}%
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={addPanel}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Panel
          </button>
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
            Exit {modeLabel}
          </button>
        </div>
      </div>

      {/* Panel Grid */}
      <div className="flex-1 flex overflow-hidden">
        {maximizedPanel ? (
          // Single maximized panel
          <div className="flex-1 flex flex-col">
            {panels
              .filter((p) => p.id === maximizedPanel)
              .map((panel) => (
                <div key={panel.id} className="flex-1 flex flex-col">
                  <PanelHeader
                    title={panel.title}
                    icon={getPanelIcon(panel.type)}
                    panelOptions={panelOptions}
                    onChangePanel={(type) => handlePanelTypeChange(panel.id, type)}
                    onMaximize={() => toggleMaximize(panel.id)}
                    isMaximized={true}
                    onRemove={() => removePanel(panel.id)}
                    canRemove={panels.length > 1}
                  />
                  <div className="flex-1 overflow-hidden">
                    {renderPanelContent(panel)}
                  </div>
                </div>
              ))}
          </div>
        ) : (
          // Multi-panel view - panels stack horizontally with min-width
          <div className="flex-1 flex overflow-x-auto">
            {panels.map((panel) => {
              const isMinimized = minimizedPanels.has(panel.id)
              return (
                <div
                  key={panel.id}
                  className={`flex flex-col border-r border-gray-200 last:border-r-0 transition-all duration-200 ${
                    isMinimized ? 'flex-shrink-0' : ''
                  }`}
                  style={{
                    minWidth: isMinimized ? '48px' : '320px',
                    width: isMinimized ? '48px' : undefined,
                    flex: isMinimized ? '0 0 48px' : '1 1 0%',
                  }}
                >
                  <PanelHeader
                    title={panel.title}
                    icon={getPanelIcon(panel.type)}
                    panelOptions={panelOptions}
                    onChangePanel={(type) => handlePanelTypeChange(panel.id, type)}
                    onMaximize={() => toggleMaximize(panel.id)}
                    isMaximized={false}
                    onMinimize={() => toggleMinimize(panel.id)}
                    isMinimized={isMinimized}
                    onRemove={() => removePanel(panel.id)}
                    canRemove={panels.length > 1}
                  />
                  {!isMinimized && (
                    <div className="flex-1 overflow-hidden">
                      {renderPanelContent(panel)}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export { FocusMode }
