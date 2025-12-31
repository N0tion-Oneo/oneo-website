import { useState, useEffect, useRef } from 'react'
import {
  ChevronDown,
  CheckCircle,
  Calendar,
  FileText,
  Gift,
  XCircle,
  Maximize2,
} from 'lucide-react'
import {
  useApplication,
  useRecordApplicationView,
  useTasks,
  useShortlistApplication,
  useMoveToStage,
  useStageInstances,
} from '@/hooks'
import { DrawerWithPanels, stageDropdownStyles, zIndexLayers } from '@/components/common'
import { EntityProfilePanel } from '@/components/service/panels/EntityProfilePanel'
import ActivityTimeline from './ActivityTimeline'
import { FocusMode } from '@/components/service'
import {
  AnswersPanel,
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
import { ApplicationStatus } from '@/types'
import type { Application, AssignedUser, ApplicationStageInstance } from '@/types'
import { AssignedSelect } from '@/components/forms'
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

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

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
  const [isStageDropdownOpen, setIsStageDropdownOpen] = useState(false)
  const stageDropdownRef = useRef<HTMLDivElement>(null)

  const { application, isLoading, refetch } = useApplication(applicationId || '')

  // Fetch tasks for candidate
  const candidateId = application?.candidate?.id ? String(application.candidate.id) : ''
  const { tasks, refetch: refetchTasks } = useTasks(
    candidateId ? { entity_type: 'candidate', entity_id: candidateId } : undefined
  )

  // Stage instances for the application
  const { instances: stageInstances, refetch: refetchStages } = useStageInstances(applicationId || '')

  // Stage action hooks
  const { shortlist, isLoading: isShortlisting } = useShortlistApplication()
  const { moveToStage, isLoading: isMovingStage } = useMoveToStage()

  // Modal state
  const [scheduleModal, setScheduleModal] = useState<{
    instance: ApplicationStageInstance
    mode: 'schedule' | 'reschedule'
  } | null>(null)
  const [assessmentModal, setAssessmentModal] = useState<{
    instance: ApplicationStageInstance
  } | null>(null)

  // Pending modal to open after stage move completes
  const [pendingStageModal, setPendingStageModal] = useState<{
    stageOrder: number
    isAssessment: boolean
  } | null>(null)

  // Record application view (debounced)
  useRecordApplicationView(isOpen ? applicationId : null)

  useEffect(() => {
    if (isOpen && applicationId) {
      refetch()
      setActivePanel('profile')
      setIsStageDropdownOpen(false)
    }
  }, [isOpen, applicationId, refetch])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (stageDropdownRef.current && !stageDropdownRef.current.contains(event.target as Node)) {
        setIsStageDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Open modal after stage move completes and stage instance is created
  useEffect(() => {
    if (pendingStageModal && stageInstances && stageInstances.length > 0) {
      const newInstance = stageInstances.find(
        (inst) => inst.stage_template?.order === pendingStageModal.stageOrder
      )
      if (newInstance) {
        if (pendingStageModal.isAssessment) {
          setAssessmentModal({ instance: newInstance })
        } else {
          setScheduleModal({ instance: newInstance, mode: 'schedule' })
        }
        setPendingStageModal(null)
      }
    }
  }, [pendingStageModal, stageInstances])

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
      setIsStageDropdownOpen(false)
    } catch (error) {
      console.error('Failed to shortlist:', error)
    }
  }

  const handleMoveToStage = async (stageOrder: number, isAssessment: boolean) => {
    if (!applicationId) return
    try {
      await moveToStage(applicationId, { stage_order: stageOrder })
      // Set pending modal to open after stage instances refresh
      setPendingStageModal({ stageOrder, isAssessment })
      handleRefresh()
      setIsStageDropdownOpen(false)
    } catch (error) {
      console.error('Failed to move to stage:', error)
      setPendingStageModal(null)
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

  // Get available panels from shared config, with dynamic answer count
  const availablePanels = getApplicationPanelOptions().map((panel) => {
    if (panel.type === 'answers' && application?.answers?.length) {
      return { ...panel, count: application.answers.length }
    }
    return panel
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
          />
        )

      case 'company':
        return application.job?.company ? (
          <EntityProfilePanel
            entityType="company"
            entityId={String(application.job.company.id)}
            entity={application.job.company as unknown as Record<string, unknown>}
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
            entityType="candidate"
            entityId={candidateId}
            onRefresh={handleRefresh}
          />
        )

      default:
        return null
    }
  }

  // Get interview stages from application
  const interviewStages = application?.interview_stages || []

  // Stage dropdown component with actions
  const renderStatusBadge = () => {
    if (!application) return null

    const status = application.status
    const isProcessing = isShortlisting || isMovingStage

    // Determine available actions based on status
    const isTerminal = [ApplicationStatus.REJECTED, ApplicationStatus.OFFER_ACCEPTED, ApplicationStatus.OFFER_DECLINED].includes(status)
    const canShortlist = status === ApplicationStatus.APPLIED
    const canMoveToStages = !isTerminal // Can move to stages from any non-terminal status
    const canMakeOffer = [ApplicationStatus.SHORTLISTED, ApplicationStatus.IN_PROGRESS].includes(status)
    const canReject = !isTerminal

    return (
      <div className="relative" ref={stageDropdownRef}>
        <button
          onClick={() => setIsStageDropdownOpen(!isStageDropdownOpen)}
          disabled={isProcessing}
          className={`${stageDropdownStyles.trigger} ${getStatusColor(status)} ${isProcessing ? stageDropdownStyles.triggerDisabled : ''}`}
        >
          {isProcessing ? 'Processing...' : getKanbanColumnName(application)}
          <ChevronDown className="w-3.5 h-3.5" />
        </button>

        {isStageDropdownOpen && (
          <div className={stageDropdownStyles.dropdown} style={{ zIndex: zIndexLayers.stageDropdown }}>
            {/* Current Status */}
            <div className={stageDropdownStyles.sectionHeader}>
              Current Status
            </div>
            <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800">
              <span className={`inline-flex items-center px-2 py-1 text-[11px] font-medium rounded ${getStatusColor(status)}`}>
                {getKanbanColumnName(application)}
              </span>
            </div>

            {/* Available Actions */}
            {!isTerminal && (
              <>
                <div className="px-3 py-2 text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Actions
                </div>

                {/* Shortlist - only for Applied status */}
                {canShortlist && (
                  <button
                    onClick={handleShortlist}
                    disabled={isProcessing}
                    className={stageDropdownStyles.menuItem}
                  >
                    <CheckCircle className="w-3.5 h-3.5 text-blue-600" />
                    Shortlist Candidate
                  </button>
                )}

                {/* Move to Interview Stages */}
                {canMoveToStages && interviewStages.length > 0 && (
                  <>
                    <div className={stageDropdownStyles.sectionDivider}>
                      <span className="px-3 text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Move to Stage
                      </span>
                    </div>
                    {interviewStages.map((stage) => {
                      // Find matching stage instance by order
                      const stageInstance = stageInstances?.find(
                        (inst) => inst.stage_template?.order === stage.order
                      )
                      const isCurrentStage = application.current_stage_order === stage.order
                      // Detect stage type by presence of assessment fields
                      const isAssessment = !!(stage.assessment_url || stage.assessment_name)
                      const isInterview = !isAssessment

                      return (
                        <button
                          key={stage.order}
                          onClick={() => {
                            if (isCurrentStage && stageInstance) {
                              // Already on this stage - offer to schedule/assign
                              if (isInterview) {
                                setScheduleModal({ instance: stageInstance, mode: 'schedule' })
                                setIsStageDropdownOpen(false)
                              } else if (isAssessment) {
                                setAssessmentModal({ instance: stageInstance })
                                setIsStageDropdownOpen(false)
                              }
                            } else {
                              // Move to stage and open appropriate modal after
                              handleMoveToStage(stage.order, isAssessment)
                            }
                          }}
                          disabled={isProcessing}
                          className={`${stageDropdownStyles.menuItem} justify-between ${
                            isCurrentStage ? stageDropdownStyles.menuItemActive : ''
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            {isInterview && <Calendar className="w-3.5 h-3.5 text-purple-500" />}
                            {isAssessment && <FileText className="w-3.5 h-3.5 text-orange-500" />}
                            {stage.name}
                          </span>
                          {isCurrentStage && (
                            <span className={stageDropdownStyles.currentBadge}>
                              Current
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </>
                )}

                {/* Make Offer */}
                {canMakeOffer && (
                  <button
                    onClick={() => {
                      setActivePanel('actions')
                      setIsStageDropdownOpen(false)
                    }}
                    className={`${stageDropdownStyles.menuItem} ${stageDropdownStyles.sectionDivider}`}
                  >
                    <Gift className="w-3.5 h-3.5 text-purple-600" />
                    Make Offer...
                  </button>
                )}

                {/* Reject */}
                {canReject && (
                  <button
                    onClick={() => {
                      setActivePanel('actions')
                      setIsStageDropdownOpen(false)
                    }}
                    className={stageDropdownStyles.menuItem}
                  >
                    <XCircle className="w-3.5 h-3.5 text-red-600" />
                    Reject Application...
                  </button>
                )}
              </>
            )}

            {/* Full Interview Mode */}
            <div className={stageDropdownStyles.sectionDivider}>
              <button
                onClick={() => {
                  setIsStageDropdownOpen(false)
                  setIsInterviewMode(true)
                }}
                className={stageDropdownStyles.menuItem}
              >
                <Maximize2 className="w-3.5 h-3.5 text-gray-400" />
                Open Full Interview Mode
              </button>
            </div>
          </div>
        )}
      </div>
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

  // Header with assigned selector
  const headerExtra = application ? (
    <div className="w-40">
      <AssignedSelect
        selected={(application.assigned_recruiters as unknown as AssignedUser[]) || []}
        onChange={handleAssignedChange}
        placeholder="Assign..."
        compact
      />
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
        title={application?.candidate?.full_name || 'Application'}
        subtitle={application ? `Applied ${formatDate(application.applied_at)}` : undefined}
        isLoading={isLoading}
        avatar={avatar}
        statusBadge={renderStatusBadge()}
        headerExtra={headerExtra}
        focusModeLabel="Interview Mode"
        onEnterFocusMode={() => setIsInterviewMode(true)}
        availablePanels={availablePanels}
        defaultPanel="profile"
        activePanel={activePanel}
        onPanelChange={(panel) => setActivePanel(panel as ApplicationPanelType)}
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
