import { useState, useMemo, useEffect } from 'react'
import type { CandidateAdminListItem, OnboardingStage } from '@/types'
import { getOnboardingStages, updateCandidate } from '@/services/api'
import {
  MapPin,
  Briefcase,
  GripVertical,
} from 'lucide-react'

interface KanbanColumn {
  stage: OnboardingStage | null
  candidates: CandidateAdminListItem[]
}

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
  const [dragOverStageId, setDragOverStageId] = useState<number | 'no-stage' | null>(null)

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
  const columns = useMemo<KanbanColumn[]>(() => {
    // Create a column for candidates with no stage
    const noStageColumn: KanbanColumn = {
      stage: null,
      candidates: candidates.filter(c => !c.onboarding_stage),
    }

    // Create columns for each stage
    const stageColumns: KanbanColumn[] = stages.map(stage => ({
      stage,
      candidates: candidates.filter(c => c.onboarding_stage?.id === stage.id),
    }))

    return [noStageColumn, ...stageColumns]
  }, [candidates, stages])

  const handleDragStart = (e: React.DragEvent, candidateSlug: string) => {
    e.dataTransfer.setData('candidateSlug', candidateSlug)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, stageId: number | null) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverStageId(stageId ?? 'no-stage')
  }

  const handleDragLeave = () => {
    setDragOverStageId(null)
  }

  const handleDrop = async (e: React.DragEvent, targetStageId: number | null) => {
    e.preventDefault()
    setDragOverStageId(null)

    const candidateSlug = e.dataTransfer.getData('candidateSlug')
    if (!candidateSlug) return

    // Find the candidate
    const candidate = candidates.find(c => c.slug === candidateSlug)
    if (!candidate) return

    // Skip if same stage
    if (candidate.onboarding_stage?.id === targetStageId) return

    try {
      await updateCandidate(candidateSlug, { onboarding_stage_id: targetStageId })
      onStageChange?.()
    } catch (error) {
      console.error('Failed to update candidate stage:', error)
    }
  }

  if (isLoading || stagesLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-[14px] text-gray-500">Loading...</p>
      </div>
    )
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map((column) => (
        <div
          key={column.stage?.id ?? 'no-stage'}
          className={`w-72 flex-shrink-0 flex flex-col bg-gray-50 rounded-lg transition-all ${
            dragOverStageId === (column.stage?.id ?? 'no-stage') ? 'ring-2 ring-blue-400 bg-blue-50' : ''
          }`}
          onDragOver={(e) => handleDragOver(e, column.stage?.id ?? null)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, column.stage?.id ?? null)}
        >
          {/* Column Header */}
          <div className="p-3 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: column.stage?.color ?? '#6B7280' }}
                />
                <h3 className="text-[13px] font-medium text-gray-900">
                  {column.stage?.name ?? 'Not Started'}
                </h3>
              </div>
              <span className="text-[12px] text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
                {column.candidates.length}
              </span>
            </div>
          </div>

          {/* Column Content */}
          <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-280px)]">
            {column.candidates.map((candidate) => (
              <CandidateCard
                key={candidate.id}
                candidate={candidate}
                onDragStart={(e) => handleDragStart(e, candidate.slug)}
                onClick={() => onCandidateClick?.(candidate)}
              />
            ))}
            {column.candidates.length === 0 && (
              <div className="py-8 text-center text-[12px] text-gray-400">
                No candidates
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

interface CandidateCardProps {
  candidate: CandidateAdminListItem
  onDragStart: (e: React.DragEvent) => void
  onClick?: () => void
}

function CandidateCard({ candidate, onDragStart, onClick }: CandidateCardProps) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="bg-white border border-gray-200 rounded-md p-3 shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing"
    >
      {/* Card Header */}
      <div className="flex items-start justify-between mb-2">
        <div
          className="flex items-center gap-2 cursor-pointer flex-1"
          onClick={onClick}
        >
          {/* Avatar */}
          <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center text-white text-[10px] font-medium flex-shrink-0">
            {candidate.initials || '--'}
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-gray-900 hover:text-gray-700 truncate">
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
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
            <Briefcase className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{candidate.professional_title}</span>
          </div>
        )}

        {/* Location */}
        {(candidate.location || candidate.city || candidate.country) && (
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">
              {candidate.location || [candidate.city, candidate.country].filter(Boolean).join(', ')}
            </span>
          </div>
        )}
      </div>

      {/* Profile Completeness */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
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
        <span className="text-[10px] text-gray-500">{candidate.profile_completeness}%</span>
      </div>

      {/* Assigned To */}
      {candidate.assigned_to && candidate.assigned_to.length > 0 && (
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex -space-x-1">
            {candidate.assigned_to.slice(0, 3).map((user) => (
              <div
                key={user.id}
                title={user.full_name}
                className="w-5 h-5 rounded-full border border-white bg-gray-200 flex items-center justify-center text-[8px] font-medium text-gray-600"
              >
                {user.first_name?.[0]}{user.last_name?.[0]}
              </div>
            ))}
            {candidate.assigned_to.length > 3 && (
              <div className="w-5 h-5 rounded-full border border-white bg-gray-300 flex items-center justify-center text-[8px] font-medium text-gray-600">
                +{candidate.assigned_to.length - 3}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
