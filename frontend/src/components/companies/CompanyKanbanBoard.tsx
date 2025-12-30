import { useState, useMemo, useEffect, useCallback } from 'react'
import type { AdminCompanyListItem, OnboardingStage } from '@/types'
import { getOnboardingStages, updateCompany } from '@/services/api'
import { getMediaUrl } from '@/services/api'
import { KanbanBoard, type KanbanColumnConfig, type DropResult, type CardRenderProps } from '@/components/common/KanbanBoard'
import {
  Building2,
  Briefcase,
  MapPin,
  GripVertical,
  Calendar,
} from 'lucide-react'

interface CompanyKanbanBoardProps {
  companies: AdminCompanyListItem[]
  isLoading?: boolean
  onStageChange?: () => void
  onCompanyClick?: (company: AdminCompanyListItem) => void
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export default function CompanyKanbanBoard({
  companies,
  isLoading,
  onStageChange,
  onCompanyClick,
}: CompanyKanbanBoardProps) {
  const [stages, setStages] = useState<OnboardingStage[]>([])
  const [stagesLoading, setStagesLoading] = useState(true)

  // Fetch stages
  useEffect(() => {
    const fetchStages = async () => {
      try {
        const data = await getOnboardingStages({ entity_type: 'company' })
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
  const columns = useMemo<KanbanColumnConfig<AdminCompanyListItem>[]>(() => {
    // Create a column for companies with no stage
    const noStageColumn: KanbanColumnConfig<AdminCompanyListItem> = {
      id: 'no-stage',
      title: 'Not Started',
      color: '#6B7280',
      items: companies.filter(c => !c.onboarding_stage),
    }

    // Create columns for each stage
    const stageColumns: KanbanColumnConfig<AdminCompanyListItem>[] = stages.map(stage => ({
      id: `stage-${stage.id}`,
      title: stage.name,
      color: stage.color,
      items: companies.filter(c => c.onboarding_stage?.id === stage.id),
    }))

    return [noStageColumn, ...stageColumns]
  }, [companies, stages])

  // Handle drop
  const handleDrop = useCallback(async (result: DropResult<AdminCompanyListItem>) => {
    const { item, targetColumnId, sourceColumnId } = result
    if (sourceColumnId === targetColumnId) return

    const targetStageId = targetColumnId === 'no-stage'
      ? null
      : parseInt(targetColumnId.replace('stage-', ''))

    try {
      await updateCompany(item.id, { onboarding_stage_id: targetStageId })
      onStageChange?.()
    } catch (error) {
      console.error('Failed to update company stage:', error)
    }
  }, [onStageChange])

  // Render card
  const renderCard = useCallback((props: CardRenderProps<AdminCompanyListItem>) => (
    <CompanyCard
      company={props.item}
      dragHandleProps={props.dragHandleProps}
      onClick={props.onClick}
    />
  ), [])

  return (
    <KanbanBoard
      columns={columns}
      getItemId={(c) => c.id}
      renderCard={renderCard}
      onDrop={handleDrop}
      onItemClick={onCompanyClick}
      isLoading={isLoading || stagesLoading}
    />
  )
}

interface CompanyCardProps {
  company: AdminCompanyListItem
  dragHandleProps: {
    draggable: boolean
    onDragStart: (e: React.DragEvent) => void
  }
  onClick?: () => void
}

function CompanyCard({ company, dragHandleProps, onClick }: CompanyCardProps) {
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
          {/* Logo/Avatar */}
          {company.logo ? (
            <img
              src={getMediaUrl(company.logo)}
              alt={company.name}
              className="w-8 h-8 rounded-full object-cover bg-gray-100 dark:bg-gray-700 flex-shrink-0"
            />
          ) : (
            <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center text-white text-[10px] font-medium flex-shrink-0">
              {company.name?.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-gray-900 dark:text-gray-100 hover:text-gray-700 dark:hover:text-gray-300 truncate">
              {company.name}
            </p>
          </div>
        </div>
        <GripVertical className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" />
      </div>

      {/* Card Body */}
      <div className="space-y-1.5 mb-2">
        {/* Industry */}
        {company.industry && (
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400">
            <Building2 className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{company.industry.name}</span>
          </div>
        )}

        {/* Location */}
        {company.headquarters_location && (
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{company.headquarters_location}</span>
          </div>
        )}

        {/* Jobs */}
        <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400">
          <Briefcase className="w-3 h-3 flex-shrink-0" />
          <span>{company.jobs_total} job{company.jobs_total !== 1 ? 's' : ''}</span>
        </div>

        {/* Created Date */}
        {company.created_at && (
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400">
            <Calendar className="w-3 h-3 flex-shrink-0" />
            <span>Added {formatDate(company.created_at)}</span>
          </div>
        )}
      </div>

      {/* Status Badge */}
      <div className="mb-2">
        <span
          className={`inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded ${
            company.is_published
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
          }`}
        >
          {company.is_published ? 'Published' : 'Draft'}
        </span>
      </div>

      {/* Assigned To */}
      {company.assigned_to && company.assigned_to.length > 0 && (
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
          <div className="flex -space-x-1">
            {company.assigned_to.slice(0, 3).map((user) => (
              <div
                key={user.id}
                title={user.full_name}
                className="w-5 h-5 rounded-full border border-white dark:border-gray-900 bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[8px] font-medium text-gray-600 dark:text-gray-400"
              >
                {user.first_name?.[0]}{user.last_name?.[0]}
              </div>
            ))}
            {company.assigned_to.length > 3 && (
              <div className="w-5 h-5 rounded-full border border-white dark:border-gray-900 bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-[8px] font-medium text-gray-600 dark:text-gray-400">
                +{company.assigned_to.length - 3}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
