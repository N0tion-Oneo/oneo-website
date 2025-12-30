import { useState, useMemo, useEffect, useCallback } from 'react'
import type { CandidateAdminListItem, OnboardingStage } from '@/types'
import { getOnboardingStages, updateCandidate } from '@/services/api'
import { KanbanBoard, type KanbanColumnConfig, type DropResult, type CardRenderProps } from '@/components/common/KanbanBoard'
import {
  MapPin,
  Briefcase,
  GripVertical,
} from 'lucide-react'

interface CandidateKanbanBoardProps {
  candidates: CandidateAdminListItem[]
  isLoading?: boolean
  onStageChange?: () => void
  onCandidateClick?: (candidate: CandidateAdminListItem) => void
}

export default function CandidateKanbanBoard({
  candidates,
  isLoading,
  onStageChange,
  onCandidateClick,
}: CandidateKanbanBoardProps) {
  const [stages, setStages] = useState<OnboardingStage[]>([])
  const [stagesLoading, setStagesLoading] = useState(true)

  // Fetch stages
  useEffect(() => {
    const fetchStages = async () => {
      try {
        const data = await getOnboardingStages({ entity_type: 'candidate' })
        setStages(data)
      } catch (error) {
        console.error('Failed to fetch stages:', error)
      } finally {
        setStagesLoading(false)
      }
    }
    fetchStages()
  }, [])

  // Build columns from stages
  const columns = useMemo<KanbanColumnConfig<CandidateAdminListItem>[]>(() => {
    // Create a column for candidates with no stage
    const noStageColumn: KanbanColumnConfig<CandidateAdminListItem> = {
      id: 'no-stage',
      title: 'Not Started',
      color: '#6B7280',
      items: candidates.filter(c => !c.onboarding_stage),
    }

    // Create columns for each stage
    const stageColumns: KanbanColumnConfig<CandidateAdminListItem>[] = stages.map(stage => ({
      id: `stage-${stage.id}`,
      title: stage.name,
      color: stage.color,
      items: candidates.filter(c => c.onboarding_stage?.id === stage.id),
    }))

    return [noStageColumn, ...stageColumns]
  }, [candidates, stages])

  // Handle drop
  const handleDrop = useCallback(async (result: DropResult<CandidateAdminListItem>) => {
    const { item, targetColumnId, sourceColumnId } = result
    if (sourceColumnId === targetColumnId) return

    const targetStageId = targetColumnId === 'no-stage'
      ? null
      : parseInt(targetColumnId.replace('stage-', ''))

    try {
      await updateCandidate(item.slug, { onboarding_stage_id: targetStageId })
      onStageChange?.()
    } catch (error) {
      console.error('Failed to update candidate stage:', error)
    }
  }, [onStageChange])

  // Render card
  const renderCard = useCallback((props: CardRenderProps<CandidateAdminListItem>) => (
    <CandidateCard
      candidate={props.item}
      dragHandleProps={props.dragHandleProps}
      onClick={props.onClick}
    />
  ), [])

  return (
    <KanbanBoard
      columns={columns}
      getItemId={(c) => c.slug}
      renderCard={renderCard}
      onDrop={handleDrop}
      onItemClick={onCandidateClick}
      isLoading={isLoading || stagesLoading}
    />
  )
}

interface CandidateCardProps {
  candidate: CandidateAdminListItem
  dragHandleProps: {
    draggable: boolean
    onDragStart: (e: React.DragEvent) => void
  }
  onClick?: () => void
}

function CandidateCard({ candidate, dragHandleProps, onClick }: CandidateCardProps) {
  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger if clicking on interactive elements
    const target = e.target as HTMLElement
    if (target.closest('button') || target.closest('a')) return
    onClick?.()
  }

  return (
    <div
      {...dragHandleProps}
      onClick={handleCardClick}
      className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md p-3 shadow-sm dark:shadow-gray-900/20 hover:shadow-md transition-shadow cursor-pointer"
    >
      {/* Card Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 flex-1">
          {/* Avatar */}
          <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center text-white text-[10px] font-medium flex-shrink-0">
            {candidate.initials || '--'}
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-gray-900 dark:text-gray-100 hover:text-gray-700 dark:hover:text-gray-300 truncate">
              {candidate.full_name || 'No name'}
            </p>
          </div>
        </div>
        <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
      </div>

      {/* Card Body */}
      <div className="space-y-1.5 mb-2">
        {/* Professional Title */}
        {candidate.professional_title && (
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400">
            <Briefcase className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{candidate.professional_title}</span>
          </div>
        )}

        {/* Location */}
        {(candidate.location || candidate.city || candidate.country) && (
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">
              {candidate.location || [candidate.city, candidate.country].filter(Boolean).join(', ')}
            </span>
          </div>
        )}
      </div>

      {/* Profile Completeness */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${
              candidate.profile_completeness >= 70
                ? 'bg-green-500'
                : candidate.profile_completeness >= 40
                ? 'bg-yellow-500'
                : 'bg-red-400'
            }`}
            style={{ width: `${candidate.profile_completeness}%` }}
          />
        </div>
        <span className="text-[10px] text-gray-500 dark:text-gray-400">{candidate.profile_completeness}%</span>
      </div>

      {/* Assigned To */}
      {candidate.assigned_to && candidate.assigned_to.length > 0 && (
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
          <div className="flex -space-x-1">
            {candidate.assigned_to.slice(0, 3).map((user) => (
              <div
                key={user.id}
                title={user.full_name}
                className="w-5 h-5 rounded-full border border-white dark:border-gray-900 bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[8px] font-medium text-gray-600 dark:text-gray-400"
              >
                {user.first_name?.[0]}{user.last_name?.[0]}
              </div>
            ))}
            {candidate.assigned_to.length > 3 && (
              <div className="w-5 h-5 rounded-full border border-white dark:border-gray-900 bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-[8px] font-medium text-gray-600 dark:text-gray-400">
                +{candidate.assigned_to.length - 3}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
