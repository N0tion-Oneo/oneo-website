import { useState, useEffect, useMemo } from 'react'
import {
  X,
  User,
  CheckSquare,
  Clock,
  Calendar,
  Maximize2,
  Minimize2,
  ChevronDown,
  Building2,
  Briefcase,
  Users,
  FileText,
  Send,
} from 'lucide-react'
import { useServiceCenter } from '@/hooks'
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

interface ServiceModeViewProps {
  entityType: OnboardingEntityType
  entityId: string
  entityName?: string
  onClose: () => void
}

// All available panel types
type PanelType =
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

// Common panels available for all entity types
const COMMON_PANELS: PanelOption[] = [
  { type: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
  { type: 'tasks', label: 'Tasks & Follow-ups', icon: <CheckSquare className="w-4 h-4" /> },
  { type: 'timeline', label: 'Timeline', icon: <Clock className="w-4 h-4" /> },
  { type: 'meetings', label: 'Meetings', icon: <Calendar className="w-4 h-4" /> },
]

// Entity-specific panels
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

// Get panel options based on entity type
function getPanelOptions(entityType: OnboardingEntityType): PanelOption[] {
  switch (entityType) {
    case 'company':
      return [...COMMON_PANELS, ...COMPANY_PANELS]
    case 'candidate':
      return [...COMMON_PANELS, ...CANDIDATE_PANELS]
    case 'lead':
      return [...COMMON_PANELS, ...LEAD_PANELS]
    default:
      return COMMON_PANELS
  }
}

// Get default panels based on entity type
function getDefaultPanels(entityType: OnboardingEntityType): Panel[] {
  switch (entityType) {
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

const entityTypeLabels: Record<OnboardingEntityType, string> = {
  company: 'Company',
  candidate: 'Candidate',
  lead: 'Lead',
}

const entityTypeIcons: Record<OnboardingEntityType, React.ReactNode> = {
  company: <Building2 className="w-4 h-4" />,
  candidate: <User className="w-4 h-4" />,
  lead: <User className="w-4 h-4" />,
}

// Panel Header Component
function PanelHeader({
  title,
  icon,
  panelOptions,
  onChangePanel,
  onMaximize,
  isMaximized,
}: {
  title: string
  icon: React.ReactNode
  panelOptions: PanelOption[]
  onChangePanel: (type: PanelType) => void
  onMaximize?: () => void
  isMaximized?: boolean
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
      <div className="relative">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
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

      {onMaximize && (
        <button
          onClick={onMaximize}
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
    </div>
  )
}

export default function ServiceModeView({
  entityType,
  entityId,
  entityName,
  onClose,
}: ServiceModeViewProps) {
  // Get panel options for this entity type
  const panelOptions = useMemo(() => getPanelOptions(entityType), [entityType])

  const [panels, setPanels] = useState<Panel[]>(() => getDefaultPanels(entityType))
  const [maximizedPanel, setMaximizedPanel] = useState<string | null>(null)

  const { data, isLoading, error, refetch } = useServiceCenter(entityType, entityId)

  const handlePanelTypeChange = (panelId: string, newType: PanelType) => {
    setPanels((prev) =>
      prev.map((p) =>
        p.id === panelId
          ? { ...p, type: newType, title: panelOptions.find((o) => o.type === newType)?.label || newType }
          : p
      )
    )
  }

  const toggleMaximize = (panelId: string) => {
    setMaximizedPanel((prev) => (prev === panelId ? null : panelId))
  }

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

  // Get entity display name from data or prop
  const displayName = entityName || (data?.entity as { name?: string; company_name?: string; full_name?: string })?.name
    || (data?.entity as { company_name?: string })?.company_name
    || (data?.entity as { full_name?: string })?.full_name
    || 'Unknown'

  // Get onboarding stage from data
  const onboardingStage = (data?.entity as { onboarding_stage?: { name: string } })?.onboarding_stage?.name

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

    switch (panel.type) {
      case 'profile':
        return (
          <EntityProfilePanel
            entityType={entityType}
            entityId={entityId}
            entity={data?.entity}
          />
        )
      case 'tasks':
        return (
          <TasksPanel
            entityType={entityType}
            entityId={entityId}
            tasks={data?.tasks || []}
            onRefresh={refetch}
          />
        )
      case 'timeline':
        return (
          <TimelinePanel
            entityType={entityType}
            entityId={entityId}
            onRefresh={refetch}
          />
        )
      case 'meetings':
        return (
          <MeetingsPanel
            entityType={entityType}
            entityId={entityId}
            meetings={data?.upcoming_meetings || []}
          />
        )
      // Company-specific panels
      case 'jobs':
        return (
          <JobsPanel
            companyId={entityId}
            entity={data?.entity}
          />
        )
      case 'contacts':
        return (
          <ContactsPanel
            companyId={entityId}
            entity={data?.entity}
          />
        )
      case 'billing':
        return (
          <BillingPanel
            companyId={entityId}
            entity={data?.entity}
          />
        )
      // Candidate-specific panels
      case 'applications':
        return (
          <ApplicationsPanel
            candidateId={entityId}
          />
        )
      // Lead-specific panels
      case 'invitations':
        return (
          <InvitationsPanel
            leadId={entityId}
            entity={data?.entity}
          />
        )
      default:
        return null
    }
  }

  const getPanelIcon = (type: PanelType) => {
    return panelOptions.find((o) => o.type === type)?.icon || <User className="w-4 h-4" />
  }

  return (
    <div className="fixed inset-0 bg-white z-[300] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-gray-900">Service Mode</h1>
          <span className="text-gray-300">|</span>
          <div className="flex items-center gap-2">
            {entityTypeIcons[entityType]}
            <span className="text-sm font-medium text-gray-700">{displayName}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              {entityTypeLabels[entityType]}
            </span>
          </div>
          {onboardingStage && (
            <>
              <span className="text-gray-300">|</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                {onboardingStage}
              </span>
            </>
          )}
          {data?.health_score !== undefined && data?.health_score !== null && (
            <>
              <span className="text-gray-300">|</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  data.health_score >= 80 ? 'bg-green-100 text-green-700' :
                  data.health_score >= 50 ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}
              >
                Health: {data.health_score}%
              </span>
            </>
          )}
        </div>
        <button
          onClick={onClose}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
          Exit Service Mode
        </button>
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
                  />
                  <div className="flex-1 overflow-hidden">
                    {renderPanelContent(panel)}
                  </div>
                </div>
              ))}
          </div>
        ) : (
          // Multi-panel view
          panels.map((panel) => (
            <div
              key={panel.id}
              className="flex-1 flex flex-col border-r border-gray-200 last:border-r-0"
            >
              <PanelHeader
                title={panel.title}
                icon={getPanelIcon(panel.type)}
                panelOptions={panelOptions}
                onChangePanel={(type) => handlePanelTypeChange(panel.id, type)}
                onMaximize={() => toggleMaximize(panel.id)}
                isMaximized={false}
              />
              <div className="flex-1 overflow-hidden">
                {renderPanelContent(panel)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
