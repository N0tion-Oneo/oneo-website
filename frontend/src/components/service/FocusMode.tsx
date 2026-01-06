import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  X,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronRight,
  Plus,
  Building2,
  User,
  Briefcase,
} from 'lucide-react'
import { useServiceCenter, useApplication, useJobDetail, useTasks, useDrawerPanelPreferences } from '@/hooks'
import type { OnboardingEntityType } from '@/types'
import { EntityProfilePanel } from './panels/EntityProfilePanel'
import { TasksPanel } from './panels/TasksPanel'
import { TimelinePanel } from './panels/TimelinePanel'
import { MeetingsPanel } from './panels/MeetingsPanel'
import { JobsPanel } from './panels/JobsPanel'
import { TeamPanel } from './panels/TeamPanel'
import { BillingPanel } from './panels/BillingPanel'
import { SubscriptionsPanel } from './panels/SubscriptionsPanel'
import { ApplicationsPanel } from './panels/ApplicationsPanel'
import { InvitationsPanel } from './panels/InvitationsPanel'
import { CompanyDetailsPanel } from './panels/CompanyDetailsPanel'
import { CompanyCulturePanel } from './panels/CompanyCulturePanel'
import { PipelinePanel } from './panels/PipelinePanel'
import { JobDetailPanel } from './panels/JobDetailPanel'
import { JobProfilePanel } from './panels/JobProfilePanel'
import { JobPipelinePanel } from './panels/JobPipelinePanel'
import { JobQuestionsPanel } from './panels/JobQuestionsPanel'
import { JobScreeningPanel } from './panels/JobScreeningPanel'
import { ActionsPanel } from './panels/ActionsPanel'
import { AnswersPanel } from './panels/AnswersPanel'
import ActivityTimeline from '@/components/applications/ActivityTimeline'
import ApplicationDrawer from '@/components/applications/ApplicationDrawer'
import {
  getEntityPanelOptions,
  getApplicationPanelOptions,
  getJobPanelOptions,
  getDefaultEntityPanels,
  getDefaultApplicationPanels,
  getPanelIcon,
  type PanelType,
  type Panel,
  type PanelOption,
} from './panelConfig'

// Focus mode can be entity-based, application-based, or job-based
type FocusModeTarget =
  | { mode: 'entity'; entityType: OnboardingEntityType; entityId: string; entityName?: string }
  | { mode: 'application'; applicationId: string }
  | { mode: 'job'; jobId: string; jobName?: string }

type FocusModeProps = FocusModeTarget & {
  onClose: () => void
}

// =============================================================================
// Panel Options Configuration (uses shared config)
// =============================================================================

function getPanelOptions(target: FocusModeTarget): PanelOption[] {
  if (target.mode === 'application') {
    return getApplicationPanelOptions()
  }
  if (target.mode === 'job') {
    return getJobPanelOptions()
  }
  return getEntityPanelOptions(target.entityType)
}

function getDefaultPanelTypes(target: FocusModeTarget): string[] {
  if (target.mode === 'application') {
    return getDefaultApplicationPanels().map((p) => p.type)
  }
  if (target.mode === 'job') {
    return ['details', 'applications', 'tasks']
  }
  return getDefaultEntityPanels(target.entityType).map((p) => p.type)
}

function getDrawerKey(target: FocusModeTarget): string {
  if (target.mode === 'application') {
    return 'application'
  }
  if (target.mode === 'job') {
    return 'job'
  }
  return target.entityType
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
        className="h-full flex flex-col items-center py-3 bg-gray-50 dark:bg-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        onClick={onMinimize}
        title={`Expand ${title}`}
      >
        <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500 mb-2" />
        <div className="flex-1 flex items-center">
          <span
            className="text-xs font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap"
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
    <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="relative flex items-center gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation()
            setIsDropdownOpen(!isDropdownOpen)
          }}
          className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
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
            <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg dark:shadow-gray-900/40 z-20 py-1">
              {panelOptions.map((option) => (
                <button
                  key={option.type}
                  onClick={() => {
                    onChangePanel(option.type)
                    setIsDropdownOpen(false)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
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
            className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 rounded"
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
            className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 rounded"
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
            className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-600 rounded"
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
  job: 'Job',
}

const entityTypeIcons: Record<string, React.ReactNode> = {
  company: <Building2 className="w-4 h-4" />,
  candidate: <User className="w-4 h-4" />,
  lead: <User className="w-4 h-4" />,
  application: <Briefcase className="w-4 h-4" />,
  job: <Briefcase className="w-4 h-4" />,
}

// =============================================================================
// FocusMode Component
// =============================================================================

export default function FocusMode(props: FocusModeProps) {
  const { onClose } = props

  // Extract target info - use the props directly as the target since it's already the right shape
  const target: FocusModeTarget = props

  // Panel options from shared config
  const panelOptions = useMemo(() => getPanelOptions(target), [
    target.mode,
    target.mode === 'entity' ? target.entityType : undefined,
  ])

  // Shared panel preferences (synced with drawer)
  const drawerKey = useMemo(() => getDrawerKey(target), [target])
  const defaultPanelTypes = useMemo(() => getDefaultPanelTypes(target), [target])
  const panelPrefs = useDrawerPanelPreferences({
    drawerKey,
    availablePanels: panelOptions.map((p) => p.type),
    defaultPanels: defaultPanelTypes,
  })

  // Build panels array from preferences (matching drawer behavior)
  const panels: Panel[] = useMemo(() => {
    return panelPrefs.visiblePanels.map((type, index) => {
      const option = panelOptions.find((p) => p.type === type)
      return {
        id: `panel-${index}`,
        type: type as PanelType,
        title: option?.label || type,
      }
    })
  }, [panelPrefs.visiblePanels, panelOptions])

  const [maximizedPanel, setMaximizedPanel] = useState<string | null>(null)
  const [minimizedPanels, setMinimizedPanels] = useState<Set<string>>(new Set())
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null)

  // Data fetching for entity mode
  const serviceCenterQuery = useServiceCenter(
    target.mode === 'entity' ? target.entityType : undefined,
    target.mode === 'entity' ? target.entityId : undefined
  )

  // Data fetching for application mode
  const applicationQuery = useApplication(
    target.mode === 'application' ? target.applicationId : ''
  )

  // Data fetching for job mode
  const jobQuery = useJobDetail(target.mode === 'job' ? target.jobId : '')
  const jobTasksQuery = useTasks(
    target.mode === 'job' ? { entity_type: 'job', entity_id: target.jobId } : undefined
  )

  // Determine isLoading, error, refetch based on mode
  const isLoading = target.mode === 'entity'
    ? serviceCenterQuery.isLoading
    : target.mode === 'application'
    ? applicationQuery.isLoading
    : jobQuery.isLoading

  const error = target.mode === 'entity'
    ? serviceCenterQuery.error
    : target.mode === 'application'
    ? applicationQuery.error
    : null

  const refetch = target.mode === 'entity'
    ? serviceCenterQuery.refetch
    : target.mode === 'application'
    ? applicationQuery.refetch
    : jobQuery.refetch

  const data = target.mode === 'entity'
    ? serviceCenterQuery.data
    : null

  const application = target.mode === 'application'
    ? applicationQuery.application
    : null

  const job = target.mode === 'job'
    ? jobQuery.job
    : null

  // Panel type change handler - swaps one panel type for another in preferences
  const handlePanelTypeChange = useCallback((panelId: string, newType: PanelType) => {
    const panel = panels.find((p) => p.id === panelId)
    if (!panel) return

    // Find the index of the current panel type
    const currentIndex = panelPrefs.visiblePanels.indexOf(panel.type)
    if (currentIndex === -1) return

    // Remove the old panel type and add the new one at the same position
    panelPrefs.removePanel(panel.type)
    panelPrefs.addPanel(newType)
    // Move the new panel to the correct position
    const newIndex = panelPrefs.visiblePanels.length // It will be added at the end
    if (newIndex !== currentIndex) {
      panelPrefs.movePanel(newIndex, currentIndex)
    }
  }, [panels, panelPrefs])

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
    // Add the first hidden panel
    const firstHidden = panelPrefs.hiddenPanels[0]
    if (firstHidden) {
      panelPrefs.addPanel(firstHidden)
    }
  }, [panelPrefs])

  // Remove a panel by type
  const removePanel = useCallback((panelId: string) => {
    // Find the panel type from the id
    const panel = panels.find((p) => p.id === panelId)
    if (panel && panelPrefs.canRemovePanel) {
      panelPrefs.removePanel(panel.type)
    }
    // If removing the maximized panel, exit maximize mode
    if (maximizedPanel === panelId) {
      setMaximizedPanel(null)
    }
  }, [panels, panelPrefs, maximizedPanel])

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

    if (target.mode === 'job' && job) {
      return {
        name: target.jobName || job.title || 'Unknown Job',
        subtitle: job.company?.name,
        status: job.status,
        type: 'job' as const,
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

  // Render panel content
  const renderPanelContent = (panel: Panel) => {
    if (isLoading) {
      return (
        <div className="h-full flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100" />
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
        case 'profile':
          return application.candidate ? (
            <EntityProfilePanel
              entityType="candidate"
              entityId={String(application.candidate.id)}
              entity={application.candidate as unknown as Record<string, unknown>}
              readOnly
            />
          ) : null
        case 'company':
          return application.job?.company ? (
            <EntityProfilePanel
              entityType="company"
              entityId={String(application.job.company.id)}
              entity={application.job.company as unknown as Record<string, unknown>}
              readOnly
            />
          ) : (
            <div className="flex items-center justify-center h-32 text-gray-500 dark:text-gray-400">
              No company information available
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
        // Company-specific panels
        case 'details':
          return (
            <CompanyDetailsPanel
              companyId={target.entityId}
              entity={data.entity}
              onRefresh={refetch}
            />
          )
        case 'culture':
          return (
            <CompanyCulturePanel
              companyId={target.entityId}
              entity={data.entity}
              onRefresh={refetch}
            />
          )
        case 'jobs':
          return (
            <JobsPanel
              companyId={target.entityId}
              entity={data.entity}
            />
          )
        case 'team':
          return (
            <TeamPanel
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
        case 'subscriptions':
          return (
            <SubscriptionsPanel
              companyId={target.entityId}
              companyName={(data.entity as { name?: string })?.name}
              onRefresh={refetch}
            />
          )
        case 'applications':
          return (
            <ApplicationsPanel
              candidateId={target.entityId}
              onApplicationClick={(appId) => setSelectedApplicationId(appId)}
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

    // Job mode panels
    if (target.mode === 'job' && job) {
      switch (panel.type) {
        case 'details':
          return (
            <JobProfilePanel
              jobId={target.jobId}
              entity={job}
              onRefresh={refetch}
            />
          )
        case 'pipeline':
          return (
            <JobPipelinePanel
              jobId={target.jobId}
              job={job}
              onRefresh={refetch}
            />
          )
        case 'questions':
          return (
            <JobQuestionsPanel
              jobId={target.jobId}
              job={job}
              onRefresh={refetch}
            />
          )
        case 'screening':
          return (
            <JobScreeningPanel
              jobId={target.jobId}
              job={job}
              onRefresh={refetch}
            />
          )
        case 'applications':
          return (
            <ApplicationsPanel
              jobId={target.jobId}
              mode="admin"
              onApplicationClick={(appId) => setSelectedApplicationId(appId)}
            />
          )
        case 'tasks':
          return (
            <TasksPanel
              entityType="job"
              entityId={target.jobId}
              tasks={jobTasksQuery.tasks || []}
              onRefresh={jobTasksQuery.refetch}
            />
          )
        case 'timeline':
          return (
            <TimelinePanel
              entityType="job"
              entityId={target.jobId}
              onRefresh={refetch}
            />
          )
        default:
          return null
      }
    }

    return null
  }

  // Mode label
  const modeLabel = target.mode === 'application' ? 'Interview Mode' : target.mode === 'job' ? 'Job Mode' : 'Service Mode'

  return (
    <div className="fixed inset-0 bg-white dark:bg-gray-900 z-[300] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{modeLabel}</h1>
          <span className="text-gray-300 dark:text-gray-600">|</span>
          <div className="flex items-center gap-2">
            {entityTypeIcons[displayInfo.type]}
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{displayInfo.name}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
              {entityTypeLabels[displayInfo.type]}
            </span>
          </div>
          {displayInfo.subtitle && (
            <>
              <span className="text-gray-300 dark:text-gray-600">|</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700">
                {displayInfo.subtitle}
              </span>
            </>
          )}
          {displayInfo.healthScore !== undefined && displayInfo.healthScore !== null && (
            <>
              <span className="text-gray-300 dark:text-gray-600">|</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  displayInfo.healthScore >= 80 ? 'bg-green-100 dark:bg-green-900/30 text-green-700' :
                  displayInfo.healthScore >= 50 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700' :
                  'bg-red-100 dark:bg-red-900/30 text-red-700'
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
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Panel
          </button>
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
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
                  className={`flex flex-col border-r border-gray-200 dark:border-gray-700 last:border-r-0 transition-all duration-200 ${
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

      {/* Application Drawer for viewing application details inline */}
      <ApplicationDrawer
        applicationId={selectedApplicationId}
        isOpen={!!selectedApplicationId}
        onClose={() => setSelectedApplicationId(null)}
      />
    </div>
  )
}

export { FocusMode }
