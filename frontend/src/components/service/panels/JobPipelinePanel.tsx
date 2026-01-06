/**
 * JobPipelinePanel - Interview pipeline/stages configuration panel
 *
 * Uses StageList for full stage template editing with stage types,
 * durations, interviewers, and assessment configuration.
 */

import { useState, useEffect } from 'react'
import { Loader2, Save, Plus } from 'lucide-react'
import { StageList } from '@/components/jobs'
import { useStageTemplates, useBulkUpdateStageTemplates, useCompanyUsers } from '@/hooks'
import { StageType } from '@/types'
import type { InterviewStageTemplateInput, Job } from '@/types'

interface JobPipelinePanelProps {
  jobId: string
  job: Job | null | undefined
  onRefresh?: () => void
}

// Default stage templates for new pipelines
const defaultStageTemplates: InterviewStageTemplateInput[] = [
  { stage_type: StageType.APPLICATION_SCREEN, name: 'Application Review', order: 1, description: 'Initial resume and application screening' },
  { stage_type: StageType.PHONE_SCREENING, name: 'Phone Screen', order: 2, description: 'Brief call to discuss experience and expectations', default_duration_minutes: 30 },
  { stage_type: StageType.VIDEO_CALL, name: 'Technical Interview', order: 3, description: 'Technical assessment and problem-solving', default_duration_minutes: 60 },
  { stage_type: StageType.IN_PERSON_INTERVIEW, name: 'Final Interview', order: 4, description: 'Final round with hiring manager', default_duration_minutes: 60, use_company_address: true },
]

export function JobPipelinePanel({ jobId, job, onRefresh }: JobPipelinePanelProps) {
  const { templates: existingTemplates, isLoading, refetch } = useStageTemplates(jobId)
  const { bulkUpdate, isUpdating, error, blockedStages, clearError } = useBulkUpdateStageTemplates()
  const { users: teamMembers } = useCompanyUsers(job?.company?.id || '')

  const [stageTemplates, setStageTemplates] = useState<InterviewStageTemplateInput[]>([])
  const [hasChanges, setHasChanges] = useState(false)

  // Initialize from existing templates
  useEffect(() => {
    if (existingTemplates && existingTemplates.length > 0) {
      const mapped: InterviewStageTemplateInput[] = existingTemplates.map((t) => ({
        id: t.id,
        stage_type: t.stage_type,
        name: t.name,
        order: t.order,
        description: t.description || undefined,
        default_duration_minutes: t.default_duration_minutes,
        default_interviewer_id: t.default_interviewer_id || null,
        assessment_instructions: t.assessment_instructions || undefined,
        assessment_external_url: t.assessment_external_url || undefined,
        assessment_provider_name: t.assessment_provider_name || undefined,
        deadline_days: t.deadline_days,
        use_company_address: t.use_company_address,
        custom_location: t.custom_location || undefined,
      }))
      setStageTemplates(mapped)
      setHasChanges(false)
    } else if (!isLoading && existingTemplates?.length === 0) {
      // No existing templates, use defaults
      setStageTemplates(defaultStageTemplates)
      setHasChanges(true)
    }
  }, [existingTemplates, isLoading])

  const handleStagesChange = (stages: InterviewStageTemplateInput[]) => {
    setStageTemplates(stages)
    setHasChanges(true)
  }

  const handleRemoveStage = (index: number) => {
    const updated = stageTemplates.filter((_, i) => i !== index)
    // Re-order remaining stages
    const reordered = updated.map((stage, i) => ({ ...stage, order: i + 1 }))
    setStageTemplates(reordered)
    setHasChanges(true)
  }

  const handleAddStage = () => {
    const newStage: InterviewStageTemplateInput = {
      stage_type: StageType.CUSTOM,
      name: '',
      order: stageTemplates.length + 1,
      description: '',
    }
    setStageTemplates([...stageTemplates, newStage])
    setHasChanges(true)
  }

  const handleSave = async () => {
    try {
      await bulkUpdate(jobId, stageTemplates)
      setHasChanges(false)
      refetch()
      onRefresh?.()
    } catch (err) {
      console.error('Failed to save pipeline:', err)
    }
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {/* Header with save button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[14px] font-medium text-gray-900 dark:text-gray-100">
            Interview Pipeline
          </h3>
          <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5">
            Configure the stages candidates go through
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleAddStage}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Stage
          </button>
          {hasChanges && (
            <button
              onClick={handleSave}
              disabled={isUpdating}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-white bg-gray-900 dark:bg-gray-100 dark:text-gray-900 rounded-md hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              {isUpdating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              Save Changes
            </button>
          )}
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-[13px] text-red-700 dark:text-red-300">{error}</p>
          {blockedStages && blockedStages.length > 0 && (
            <p className="text-[12px] text-red-600 dark:text-red-400 mt-1">
              Blocked stages: {blockedStages.map(s => s.name).join(', ')}
            </p>
          )}
          <button
            onClick={clearError}
            className="mt-2 text-[12px] text-red-600 dark:text-red-400 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Stage list */}
      {stageTemplates.length > 0 ? (
        <StageList
          stages={stageTemplates}
          onChange={handleStagesChange}
          onRemove={handleRemoveStage}
          teamMembers={teamMembers}
        />
      ) : (
        <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-[13px] text-gray-500 dark:text-gray-400">
            No interview stages defined
          </p>
          <button
            onClick={handleAddStage}
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-white bg-gray-900 dark:bg-gray-100 dark:text-gray-900 rounded-md hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add First Stage
          </button>
        </div>
      )}
    </div>
  )
}

export default JobPipelinePanel
