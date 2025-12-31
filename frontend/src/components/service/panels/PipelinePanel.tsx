import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useApplication, useStageInstances, useCancelStage, useCompleteStage } from '@/hooks'
import FullPipelineTimeline from '@/components/applications/FullPipelineTimeline'
import ScheduleInterviewModal from '@/components/applications/ScheduleInterviewModal'
import AssignAssessmentModal from '@/components/applications/AssignAssessmentModal'
import type { ApplicationStageInstance } from '@/types'

interface PipelinePanelProps {
  applicationId: string
  onRefresh?: () => void
  onMoveToStage?: (applicationId: string, stageOrder: number) => void
}

export function PipelinePanel({
  applicationId,
  onRefresh,
}: PipelinePanelProps) {
  // Application data
  const { application, isLoading: isLoadingApp, error: appError, refetch: refetchApp } = useApplication(applicationId)
  const { instances: stageInstances, isLoading: isLoadingStages, refetch: refetchStages } = useStageInstances(applicationId)

  // Schedule interview modal state
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
  const [scheduleStageInstance, setScheduleStageInstance] = useState<ApplicationStageInstance | null>(null)
  const [scheduleMode, setScheduleMode] = useState<'schedule' | 'reschedule'>('schedule')

  // Assign assessment modal state
  const [assessmentModalOpen, setAssessmentModalOpen] = useState(false)
  const [assessmentStageInstance, setAssessmentStageInstance] = useState<ApplicationStageInstance | null>(null)

  // Stage actions
  const { cancel } = useCancelStage()
  const { complete } = useCompleteStage()

  const handleOpenScheduleModal = (instance: ApplicationStageInstance, mode: 'schedule' | 'reschedule') => {
    setScheduleStageInstance(instance)
    setScheduleMode(mode)
    setScheduleModalOpen(true)
  }

  const handleCancelStage = async (instance: ApplicationStageInstance) => {
    if (!confirm('Are you sure you want to cancel this stage?')) return
    try {
      await cancel(applicationId, instance.id)
      refetchStages()
      refetchApp()
      onRefresh?.()
    } catch (error) {
      console.error('Failed to cancel stage:', error)
    }
  }

  const handleCompleteStage = async (instance: ApplicationStageInstance) => {
    try {
      await complete(applicationId, instance.id)
      refetchStages()
      refetchApp()
      onRefresh?.()
    } catch (error) {
      console.error('Failed to complete stage:', error)
    }
  }

  const handleScheduleSuccess = () => {
    setScheduleModalOpen(false)
    setScheduleStageInstance(null)
    refetchStages()
    refetchApp()
    onRefresh?.()
  }

  const handleAssessmentSuccess = () => {
    setAssessmentModalOpen(false)
    setAssessmentStageInstance(null)
    refetchStages()
    refetchApp()
    onRefresh?.()
  }

  // Get candidate name for modals
  const candidateName = application?.candidate
    ? `${application.candidate.first_name || ''} ${application.candidate.last_name || ''}`.trim() || 'Unknown'
    : 'Unknown'

  if (isLoadingApp || isLoadingStages) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400 dark:text-gray-500" />
      </div>
    )
  }

  if (appError || !application) {
    return (
      <div className="h-full flex items-center justify-center text-red-600 dark:text-red-400">
        {appError || 'Failed to load application'}
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-4">
        <FullPipelineTimeline
          applicationId={applicationId}
          jobId={application.job?.id || ''}
          applicationStatus={application.status}
          appliedAt={application.applied_at}
          shortlistedAt={application.shortlisted_at}
          stageInstances={stageInstances}
          currentStageOrder={application.current_stage_order}
          offerMadeAt={application.offer_made_at}
          offerAcceptedAt={application.offer_accepted_at}
          rejectedAt={application.rejected_at}
          rejectionReason={application.rejection_reason}
          questions={application.job?.questions}
          answers={application.answers}
          coveringStatement={application.covering_statement}
          isRecruiterView={true}
          onSchedule={(instance) => handleOpenScheduleModal(instance, 'schedule')}
          onReschedule={(instance) => handleOpenScheduleModal(instance, 'reschedule')}
          onCancel={handleCancelStage}
          onComplete={handleCompleteStage}
          onAssignAssessment={(instance) => {
            setAssessmentStageInstance(instance)
            setAssessmentModalOpen(true)
          }}
        />
      </div>

      {/* Schedule Interview Modal */}
      {scheduleStageInstance && (
        <ScheduleInterviewModal
          isOpen={scheduleModalOpen}
          onClose={() => {
            setScheduleModalOpen(false)
            setScheduleStageInstance(null)
          }}
          instance={scheduleStageInstance}
          applicationId={applicationId}
          jobId={application.job?.id || ''}
          candidateName={candidateName}
          mode={scheduleMode}
          onSuccess={handleScheduleSuccess}
        />
      )}

      {/* Assign Assessment Modal */}
      {assessmentStageInstance && (
        <AssignAssessmentModal
          isOpen={assessmentModalOpen}
          onClose={() => {
            setAssessmentModalOpen(false)
            setAssessmentStageInstance(null)
          }}
          instance={assessmentStageInstance}
          applicationId={applicationId}
          candidateName={candidateName}
          onSuccess={handleAssessmentSuccess}
        />
      )}
    </div>
  )
}

export default PipelinePanel
