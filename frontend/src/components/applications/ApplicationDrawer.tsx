import { useState, useEffect } from 'react'
import {
  useApplication,
  useRecordApplicationView,
  useTasks,
  useShortlistApplication,
  useStageInstances,
  useStageTemplates,
  useMoveToStage,
  useEntityActions,
  useDrawerPanelPreferences,
} from '@/hooks'
import { useAuth } from '@/contexts/AuthContext'
import { UserRole } from '@/types'
import { DrawerWithPanels, EntityActionRail, type StageOption } from '@/components/common'
import type { ActionHandlers } from '@/components/service/actionConfig'
import { EntityProfilePanel } from '@/components/service/panels/EntityProfilePanel'
import ActivityTimeline from './ActivityTimeline'
import { FocusMode } from '@/components/service'
import {
  AnswersPanel,
  EvaluationsPanel,
  TasksPanel,
  TimelinePanel,
  PipelinePanel,
  JobDetailPanel,
  ActionsPanel,
} from '@/components/service/panels'
import {
  getApplicationPanelOptions,
  type ApplicationPanelType,
} from '@/components/service/panelConfig'
import { ApplicationStatus, StageTypeConfig } from '@/types'
import type { Application, AssignedUser, ApplicationStageInstance, StageType } from '@/types'
import ScheduleInterviewModal from './ScheduleInterviewModal'
import AssignAssessmentModal from './AssignAssessmentModal'
import api from '@/services/api'

// =============================================================================
// Types
// =============================================================================

interface ApplicationDrawerProps {
  applicationId: string | null
  isOpen: boolean
  onClose: () => void
  onUpdate?: () => void
}

// =============================================================================
// Helper Functions
// =============================================================================


const getStatusColor = (status: ApplicationStatus) => {
  const colors = {
    [ApplicationStatus.APPLIED]: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
    [ApplicationStatus.SHORTLISTED]: 'bg-blue-100 text-blue-700',
    [ApplicationStatus.IN_PROGRESS]: 'bg-yellow-100 text-yellow-700',
    [ApplicationStatus.OFFER_MADE]: 'bg-purple-100 text-purple-700',
    [ApplicationStatus.OFFER_ACCEPTED]: 'bg-green-100 text-green-700',
    [ApplicationStatus.OFFER_DECLINED]: 'bg-orange-100 text-orange-700',
    [ApplicationStatus.REJECTED]: 'bg-red-100 text-red-700',
  }
  return colors[status] || 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
}

// Hex colors for the stage selector in action rail
const STATUS_COLORS: Record<ApplicationStatus, string> = {
  [ApplicationStatus.APPLIED]: '#6B7280',
  [ApplicationStatus.SHORTLISTED]: '#2563EB',
  [ApplicationStatus.IN_PROGRESS]: '#D97706',
  [ApplicationStatus.OFFER_MADE]: '#7C3AED',
  [ApplicationStatus.OFFER_ACCEPTED]: '#059669',
  [ApplicationStatus.OFFER_DECLINED]: '#EA580C',
  [ApplicationStatus.REJECTED]: '#DC2626',
}

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  [ApplicationStatus.APPLIED]: 'Applied',
  [ApplicationStatus.SHORTLISTED]: 'Shortlisted',
  [ApplicationStatus.IN_PROGRESS]: 'In Progress',
  [ApplicationStatus.OFFER_MADE]: 'Offer Made',
  [ApplicationStatus.OFFER_ACCEPTED]: 'Offer Accepted',
  [ApplicationStatus.OFFER_DECLINED]: 'Offer Declined',
  [ApplicationStatus.REJECTED]: 'Rejected',
}

// Pipeline stage colors (gradient from amber to green)
const STAGE_COLORS = [
  '#F59E0B', // amber-500
  '#EAB308', // yellow-500
  '#84CC16', // lime-500
  '#22C55E', // green-500
  '#10B981', // emerald-500
  '#14B8A6', // teal-500
]

// Get color for a pipeline stage based on its order
const getStageColor = (order: number, total: number): string => {
  if (total <= 1) return STAGE_COLORS[0] ?? '#F59E0B'
  const index = Math.min(Math.floor((order - 1) / (total - 1) * (STAGE_COLORS.length - 1)), STAGE_COLORS.length - 1)
  return STAGE_COLORS[index] ?? '#F59E0B'
}

const getKanbanColumnName = (application: Application): string => {
  switch (application.status) {
    case ApplicationStatus.APPLIED:
      return 'Applied'
    case ApplicationStatus.SHORTLISTED:
      return 'Shortlisted'
    case ApplicationStatus.IN_PROGRESS:
      return application.current_stage_name || `Stage ${application.current_stage_order}`
    case ApplicationStatus.OFFER_MADE:
      return 'Offer Made'
    case ApplicationStatus.OFFER_ACCEPTED:
      return 'Offer Accepted'
    case ApplicationStatus.OFFER_DECLINED:
      return 'Offer Declined'
    case ApplicationStatus.REJECTED:
      return 'Rejected'
    default:
      return application.status
  }
}

// =============================================================================
// Main Component
// =============================================================================

export default function ApplicationDrawer({
  applicationId,
  isOpen,
  onClose,
  onUpdate,
}: ApplicationDrawerProps) {
  const [activePanel, setActivePanel] = useState<ApplicationPanelType>('profile')
  const [isInterviewMode, setIsInterviewMode] = useState(false)

  const { user } = useAuth()
  const isStaffUser = user?.role === UserRole.RECRUITER || user?.role === UserRole.ADMIN

  const { application, isLoading, refetch } = useApplication(applicationId || '')

  // Fetch tasks for candidate
  const candidateId = application?.candidate?.id ? String(application.candidate.id) : ''
  const { tasks, refetch: refetchTasks } = useTasks(
    candidateId ? { entity_type: 'candidate', entity_id: candidateId } : undefined
  )

  // Stage instances for the application
  const { refetch: refetchStages } = useStageInstances(applicationId || '')

  // Fetch pipeline stage templates for the job
  const jobId = application?.job?.id ? String(application.job.id) : ''
  const { templates: stageTemplates } = useStageTemplates(jobId)

  // Stage action hooks
  const { shortlist } = useShortlistApplication()
  const { moveToStage, isLoading: isMovingStage } = useMoveToStage()

  // Modal state
  const [scheduleModal, setScheduleModal] = useState<{
    instance: ApplicationStageInstance
    mode: 'schedule' | 'reschedule'
  } | null>(null)
  const [assessmentModal, setAssessmentModal] = useState<{
    instance: ApplicationStageInstance
  } | null>(null)

  // Record application view (debounced)
  useRecordApplicationView(isOpen ? applicationId : null)

  useEffect(() => {
    if (isOpen && applicationId) {
      refetch()
      setActivePanel('profile')
    }
  }, [isOpen, applicationId, refetch])

  // Handle refresh and notify parent
  const handleRefresh = () => {
    refetch()
    refetchStages()
    onUpdate?.()
  }

  // Stage action handlers
  const handleShortlist = async () => {
    if (!applicationId) return
    try {
      await shortlist(applicationId)
      handleRefresh()
    } catch (error) {
      console.error('Failed to shortlist:', error)
    }
  }

  const handleScheduleSuccess = () => {
    setScheduleModal(null)
    handleRefresh()
  }

  const handleAssessmentSuccess = () => {
    setAssessmentModal(null)
    handleRefresh()
  }

  // Handle assigned change (assigns recruiters to the application)
  const handleAssignedChange = async (assignedTo: AssignedUser[]) => {
    if (!applicationId) return
    try {
      await api.patch(`/jobs/applications/${applicationId}/`, {
        assigned_recruiter_ids: assignedTo.map((u) => u.id),
      })
      refetch()
      onUpdate?.()
    } catch (err) {
      console.error('Failed to update assigned:', err)
    }
  }

  // Handle status/stage change
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const handleStageOrStatusChange = async (stageId: string | number) => {
    if (!applicationId) return

    // Check if this is a pipeline stage (starts with 'stage-')
    if (typeof stageId === 'string' && stageId.startsWith('stage-')) {
      const stageOrder = parseInt(stageId.replace('stage-', ''), 10)
      setIsUpdatingStatus(true)
      try {
        await moveToStage(applicationId, { stage_order: stageOrder })

        // Fetch stage instances to check if scheduling/assignment is needed
        const instancesResponse = await api.get<ApplicationStageInstance[]>(
          `/jobs/applications/${applicationId}/stages/`
        )
        const instances = instancesResponse.data
        const stageInstance = instances.find(
          (inst) => inst.stage_template.order === stageOrder
        )

        // Open appropriate modal based on stage type
        if (stageInstance && stageInstance.status === 'not_started') {
          const stageType = stageInstance.stage_template.stage_type as StageType
          const stageConfig = StageTypeConfig[stageType]

          if (stageConfig?.requiresScheduling) {
            // Open schedule modal for interviews
            setScheduleModal({
              instance: stageInstance,
              mode: 'schedule',
            })
          } else if (stageConfig?.isAssessment) {
            // Open assessment modal for take-home assessments
            setAssessmentModal({
              instance: stageInstance,
            })
          }
        }

        handleRefresh()
      } catch (err) {
        console.error('Failed to move to stage:', err)
      } finally {
        setIsUpdatingStatus(false)
      }
    } else {
      // This is a status change
      setIsUpdatingStatus(true)
      try {
        await api.patch(`/jobs/applications/${applicationId}/`, {
          status: stageId,
        })
        refetch()
        onUpdate?.()
      } catch (err) {
        console.error('Failed to update status:', err)
      } finally {
        setIsUpdatingStatus(false)
      }
    }
  }

  // Build stage options: statuses + pipeline stages
  const buildStageOptions = (): StageOption[] => {
    const options: StageOption[] = [
      { id: ApplicationStatus.APPLIED, name: 'Applied', color: STATUS_COLORS[ApplicationStatus.APPLIED] },
      { id: ApplicationStatus.SHORTLISTED, name: 'Shortlisted', color: STATUS_COLORS[ApplicationStatus.SHORTLISTED] },
    ]

    // Add pipeline stages if available
    if (stageTemplates && stageTemplates.length > 0) {
      const sortedTemplates = [...stageTemplates].sort((a, b) => a.order - b.order)
      sortedTemplates.forEach((template) => {
        options.push({
          id: `stage-${template.order}`,
          name: template.name,
          color: getStageColor(template.order, sortedTemplates.length),
        })
      })
    }

    // Add terminal statuses
    options.push(
      { id: ApplicationStatus.OFFER_MADE, name: 'Offer Made', color: STATUS_COLORS[ApplicationStatus.OFFER_MADE] },
      { id: ApplicationStatus.OFFER_ACCEPTED, name: 'Accepted', color: STATUS_COLORS[ApplicationStatus.OFFER_ACCEPTED] },
      { id: ApplicationStatus.OFFER_DECLINED, name: 'Declined', color: STATUS_COLORS[ApplicationStatus.OFFER_DECLINED] },
      { id: ApplicationStatus.REJECTED, name: 'Rejected', color: STATUS_COLORS[ApplicationStatus.REJECTED] }
    )

    return options
  }

  // Get current stage for the selector
  const getCurrentStage = (): StageOption | null => {
    if (!application) return null

    if (application.status === ApplicationStatus.IN_PROGRESS) {
      // Show the current pipeline stage
      const stageName = application.current_stage_name || `Stage ${application.current_stage_order}`
      const totalStages = stageTemplates?.length || 1
      return {
        id: `stage-${application.current_stage_order}`,
        name: stageName,
        color: getStageColor(application.current_stage_order, totalStages),
      }
    }

    // Show the status
    return {
      id: application.status,
      name: STATUS_LABELS[application.status] || application.status,
      color: STATUS_COLORS[application.status] || '#6B7280',
    }
  }

  // Action handlers for the action rail
  const actionHandlers: ActionHandlers = {
    'shortlist': handleShortlist,
    'schedule-interview': () => setActivePanel('pipeline'),
    'add-feedback': () => setActivePanel('pipeline'),
    'make-offer': () => setActivePanel('actions'),
    'reject': () => setActivePanel('actions'),
    'interview-mode': () => setIsInterviewMode(true),
  }

  // Get resolved actions using the declarative config
  const actions = useEntityActions(
    'application',
    application as unknown as Record<string, unknown>,
    actionHandlers
  )

  // Get available panels from shared config, with dynamic answer count
  const availablePanels = getApplicationPanelOptions().map((panel) => {
    if (panel.type === 'answers' && application?.answers?.length) {
      return { ...panel, count: application.answers.length }
    }
    return panel
  })

  // Panel customization - allows users to show/hide/reorder panels
  const panelPrefs = useDrawerPanelPreferences({
    drawerKey: 'application',
    availablePanels: availablePanels.map((p) => p.type),
    defaultPanels: ['profile', 'pipeline', 'answers', 'evaluations', 'tasks', 'timeline'],
  })

  // Render panel content - using same components as FocusMode
  const renderPanel = (panelType: string) => {
    if (!application || !applicationId) {
      return (
        <div className="flex items-center justify-center h-32">
          <p className="text-[14px] text-gray-500 dark:text-gray-400">Application not found</p>
        </div>
      )
    }

    switch (panelType) {
      case 'profile':
        return (
          <EntityProfilePanel
            entityType="candidate"
            entityId={String(application.candidate.id)}
            entity={application.candidate as unknown as Record<string, unknown>}
            readOnly
            hideHeader
          />
        )

      case 'company':
        return application.job?.company ? (
          <EntityProfilePanel
            entityType="company"
            entityId={String(application.job.company.id)}
            entity={application.job.company as unknown as Record<string, unknown>}
            readOnly
            hideHeader
          />
        ) : (
          <div className="flex items-center justify-center h-32 text-gray-500 dark:text-gray-400">
            No company information available
          </div>
        )

      case 'answers':
        return (
          <AnswersPanel
            answers={application.answers || []}
            isLoading={false}
          />
        )

      case 'evaluations':
        return (
          <EvaluationsPanel
            applicationId={applicationId}
            jobId={application.job?.id || ''}
            isRecruiterView={true}
            onRefresh={handleRefresh}
          />
        )

      case 'pipeline':
        return (
          <PipelinePanel
            applicationId={applicationId}
            onRefresh={handleRefresh}
          />
        )

      case 'activity':
        return (
          <div className="h-full overflow-y-auto p-4">
            <ActivityTimeline applicationId={applicationId} />
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
            applicationId={applicationId}
            application={application}
            onRefresh={handleRefresh}
          />
        )

      case 'tasks':
        return (
          <TasksPanel
            entityType="candidate"
            entityId={candidateId}
            tasks={tasks}
            onRefresh={refetchTasks}
          />
        )

      case 'timeline':
        return (
          <TimelinePanel
            entityType="application"
            entityId={applicationId}
            onRefresh={handleRefresh}
          />
        )

      default:
        return null
    }
  }

  // Simple status badge for header (dropdown moved to action rail)
  const renderStatusBadge = () => {
    if (!application) return null
    return (
      <span className={`inline-flex items-center px-2 py-1 text-[11px] font-medium rounded ${getStatusColor(application.status)}`}>
        {getKanbanColumnName(application)}
      </span>
    )
  }

  // Avatar for header
  const avatar = application?.candidate ? (
    <div className="w-10 h-10 bg-gray-900 dark:bg-gray-700 rounded-full flex items-center justify-center text-white text-[13px] font-medium flex-shrink-0">
      {application.candidate.full_name
        ?.split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || '?'}
    </div>
  ) : undefined

  // Interview Mode (FocusMode)
  if (isInterviewMode && applicationId) {
    return (
      <FocusMode
        mode="application"
        applicationId={applicationId}
        onClose={() => {
          setIsInterviewMode(false)
          handleRefresh()
        }}
      />
    )
  }

  // Get candidate name for modals
  const candidateName = application?.candidate
    ? `${application.candidate.first_name || ''} ${application.candidate.last_name || ''}`.trim() || 'Unknown'
    : 'Unknown'

  return (
    <>
      <DrawerWithPanels
        isOpen={isOpen}
        onClose={onClose}
        entityType="Application"
        title={application?.candidate?.full_name || 'Application'}
        subtitle={application ? `for ${application.job?.title || 'Unknown Job'}${application.job?.company?.name ? ` at ${application.job.company.name}` : ''}` : undefined}
        isLoading={isLoading}
        avatar={avatar}
        statusBadge={renderStatusBadge()}
        focusModeLabel="Interview Mode"
        onEnterFocusMode={() => setIsInterviewMode(true)}
        actionRail={
          <EntityActionRail
            actions={actions}
            assignedTo={isStaffUser && application ? (application.assigned_recruiters as unknown as AssignedUser[]) || [] : undefined}
            onAssignedChange={isStaffUser ? handleAssignedChange : undefined}
            currentStage={getCurrentStage()}
            stages={buildStageOptions()}
            onStageChange={handleStageOrStatusChange}
            isUpdatingStage={isUpdatingStatus || isMovingStage}
          />
        }
        availablePanels={availablePanels}
        defaultPanel="profile"
        activePanel={activePanel}
        onPanelChange={(panel) => setActivePanel(panel as ApplicationPanelType)}
        panelCustomization={{
          visiblePanels: panelPrefs.visiblePanels,
          hiddenPanels: panelPrefs.hiddenPanels,
          onAddPanel: panelPrefs.addPanel,
          onRemovePanel: panelPrefs.removePanel,
          onMovePanel: panelPrefs.movePanel,
          canRemovePanel: panelPrefs.canRemovePanel,
          canAddPanel: panelPrefs.canAddPanel,
          onResetToDefaults: panelPrefs.resetToDefaults,
          isCustomized: panelPrefs.isCustomized,
        }}
        renderPanel={renderPanel}
      />

      {/* Schedule Interview Modal */}
      {scheduleModal && applicationId && application?.job?.id && (
        <ScheduleInterviewModal
          isOpen={true}
          onClose={() => setScheduleModal(null)}
          instance={scheduleModal.instance}
          applicationId={applicationId}
          jobId={application.job.id}
          candidateName={candidateName}
          mode={scheduleModal.mode}
          onSuccess={handleScheduleSuccess}
        />
      )}

      {/* Assign Assessment Modal */}
      {assessmentModal && applicationId && (
        <AssignAssessmentModal
          isOpen={true}
          onClose={() => setAssessmentModal(null)}
          instance={assessmentModal.instance}
          applicationId={applicationId}
          candidateName={candidateName}
          onSuccess={handleAssessmentSuccess}
        />
      )}
    </>
  )
}
