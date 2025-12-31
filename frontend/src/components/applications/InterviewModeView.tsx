import { useState, useEffect } from 'react'
import {
  X,
  Maximize2,
  Minimize2,
  ChevronDown,
} from 'lucide-react'
import { useApplication, useStageInstances, useCancelStage, useCompleteStage } from '@/hooks'
import { EntityProfilePanel } from '@/components/service/panels/EntityProfilePanel'
import ActivityTimeline from './ActivityTimeline'
import FullPipelineTimeline from './FullPipelineTimeline'
import ScheduleInterviewModal from './ScheduleInterviewModal'
import AssignAssessmentModal from './AssignAssessmentModal'
import {
  getApplicationPanelOptions,
  getDefaultApplicationPanels,
  getPanelIcon,
  type ApplicationPanelType,
  type Panel,
} from '@/components/service/panelConfig'
import { ApplicationStatus } from '@/types'
import type { ApplicationStageInstance } from '@/types'

interface InterviewModeViewProps {
  applicationId: string
  onClose: () => void
  onShortlist?: (applicationId: string) => void
  onMoveToStage?: (applicationId: string, stageOrder: number) => void
}

const PANEL_OPTIONS = getApplicationPanelOptions()

const getStatusColor = (status: ApplicationStatus) => {
  const colors = {
    [ApplicationStatus.APPLIED]: 'bg-gray-100 text-gray-700',
    [ApplicationStatus.SHORTLISTED]: 'bg-blue-100 text-blue-700',
    [ApplicationStatus.IN_PROGRESS]: 'bg-yellow-100 text-yellow-700',
    [ApplicationStatus.OFFER_MADE]: 'bg-purple-100 text-purple-700',
    [ApplicationStatus.OFFER_ACCEPTED]: 'bg-green-100 text-green-700',
    [ApplicationStatus.OFFER_DECLINED]: 'bg-orange-100 text-orange-700',
    [ApplicationStatus.REJECTED]: 'bg-red-100 text-red-700',
  }
  return colors[status] || 'bg-gray-100 text-gray-700'
}

const getStatusLabel = (status: ApplicationStatus) => {
  const labels = {
    [ApplicationStatus.APPLIED]: 'Applied',
    [ApplicationStatus.SHORTLISTED]: 'Shortlisted',
    [ApplicationStatus.IN_PROGRESS]: 'In Progress',
    [ApplicationStatus.OFFER_MADE]: 'Offer Made',
    [ApplicationStatus.OFFER_ACCEPTED]: 'Hired',
    [ApplicationStatus.OFFER_DECLINED]: 'Declined',
    [ApplicationStatus.REJECTED]: 'Rejected',
  }
  return labels[status] || status
}

// Panel Header Component
function PanelHeader({
  title,
  icon,
  onChangePanel,
  onMaximize,
  isMaximized,
}: {
  title: string
  icon: React.ReactNode
  onChangePanel: (type: ApplicationPanelType) => void
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
              {PANEL_OPTIONS.map((option) => (
                <button
                  key={option.type}
                  onClick={() => {
                    onChangePanel(option.type as ApplicationPanelType)
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

export default function InterviewModeView({
  applicationId,
  onClose,
  onShortlist,
}: InterviewModeViewProps) {
  const [panels, setPanels] = useState<Panel[]>(() => getDefaultApplicationPanels())
  const [maximizedPanel, setMaximizedPanel] = useState<string | null>(null)

  const { application, isLoading } = useApplication(applicationId)
  const { instances: stageInstances, isLoading: isLoadingStages, refetch: refetchStages } = useStageInstances(applicationId)

  // Scheduling modal state
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
  const [selectedStageInstance, setSelectedStageInstance] = useState<ApplicationStageInstance | null>(null)
  const [scheduleMode, setScheduleMode] = useState<'schedule' | 'reschedule'>('schedule')

  // Assessment modal state
  const [assessmentModalOpen, setAssessmentModalOpen] = useState(false)
  const [assessmentStageInstance, setAssessmentStageInstance] = useState<ApplicationStageInstance | null>(null)

  // Stage action hooks
  const { cancel: cancelStage } = useCancelStage()
  const { complete: completeStage } = useCompleteStage()

  // Handlers
  const handleOpenScheduleModal = (instance: ApplicationStageInstance, mode: 'schedule' | 'reschedule' = 'schedule') => {
    setSelectedStageInstance(instance)
    setScheduleMode(mode)
    setScheduleModalOpen(true)
  }

  const handleScheduleSuccess = () => {
    setScheduleModalOpen(false)
    refetchStages()
  }

  const handleCancelStage = async (instance: ApplicationStageInstance) => {
    if (!confirm('Are you sure you want to cancel this interview?')) return
    try {
      await cancelStage(applicationId, instance.id, 'Cancelled by recruiter')
      refetchStages()
    } catch (error) {
      console.error('Failed to cancel:', error)
    }
  }

  const handleCompleteStage = async (instance: ApplicationStageInstance) => {
    try {
      await completeStage(applicationId, instance.id, {})
      refetchStages()
    } catch (error) {
      console.error('Failed to complete:', error)
    }
  }

  const handlePanelTypeChange = (panelId: string, newType: ApplicationPanelType) => {
    setPanels((prev) =>
      prev.map((p) =>
        p.id === panelId
          ? { ...p, type: newType, title: PANEL_OPTIONS.find((o) => o.type === newType)?.label || newType }
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

  const renderPanelContent = (panel: Panel) => {
    if (isLoading || !application) {
      return (
        <div className="h-full flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
        </div>
      )
    }

    switch (panel.type) {
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
          <div className="flex items-center justify-center h-32 text-gray-500">
            No company information available
          </div>
        )
      case 'pipeline':
        // Reuse the existing FullPipelineTimeline component
        return (
          <div className="h-full overflow-y-auto p-4">
            {isLoadingStages ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900" />
              </div>
            ) : (
              <FullPipelineTimeline
                applicationId={applicationId}
                applicationStatus={application.status}
                appliedAt={application.applied_at}
                shortlistedAt={application.shortlisted_at}
                stageInstances={stageInstances}
                currentStageOrder={application.current_stage_order}
                offerMadeAt={application.offer_made_at}
                offerAcceptedAt={application.offer_accepted_at}
                rejectedAt={application.rejected_at}
                rejectionReason={application.rejection_reason}
                isRecruiterView={true}
                onSchedule={(instance) => handleOpenScheduleModal(instance, 'schedule')}
                onReschedule={(instance) => handleOpenScheduleModal(instance, 'reschedule')}
                onCancel={handleCancelStage}
                onComplete={handleCompleteStage}
                onAssignAssessment={(instance) => {
                  setAssessmentStageInstance(instance)
                  setAssessmentModalOpen(true)
                }}
                onShortlist={onShortlist ? () => onShortlist(applicationId) : undefined}
              />
            )}
          </div>
        )
      case 'activity':
        // Reuse the existing ActivityTimeline component
        return (
          <div className="h-full overflow-y-auto p-4">
            <ActivityTimeline applicationId={applicationId} />
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="fixed inset-0 bg-white z-[300] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-gray-900">Interview Mode</h1>
          {application && (
            <>
              <span className="text-gray-300">|</span>
              <span className="text-sm text-gray-600">{application.candidate.full_name}</span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getStatusColor(application.status)}`}>
                {getStatusLabel(application.status)}
              </span>
              {application.job && (
                <>
                  <span className="text-gray-300">|</span>
                  <span className="text-sm text-gray-500">{application.job.title}</span>
                </>
              )}
            </>
          )}
        </div>
        <button
          onClick={onClose}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
          Exit Interview Mode
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

      {/* Schedule Interview Modal */}
      {selectedStageInstance && application?.job?.id && (
        <ScheduleInterviewModal
          isOpen={scheduleModalOpen}
          onClose={() => setScheduleModalOpen(false)}
          instance={selectedStageInstance}
          applicationId={applicationId}
          jobId={application.job.id}
          candidateName={application?.candidate?.full_name || 'Candidate'}
          mode={scheduleMode}
          onSuccess={handleScheduleSuccess}
        />
      )}

      {/* Assign Assessment Modal */}
      {assessmentStageInstance && (
        <AssignAssessmentModal
          isOpen={assessmentModalOpen}
          onClose={() => setAssessmentModalOpen(false)}
          instance={assessmentStageInstance}
          applicationId={applicationId}
          candidateName={application?.candidate?.full_name || 'Candidate'}
          onSuccess={() => {
            setAssessmentModalOpen(false)
            refetchStages()
          }}
        />
      )}
    </div>
  )
}
