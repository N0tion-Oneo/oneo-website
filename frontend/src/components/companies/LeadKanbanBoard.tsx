import { useState, useMemo, useEffect, useCallback } from 'react'
import type { Lead } from '@/hooks/useLeads'
import type { OnboardingStage } from '@/types'
import { getOnboardingStages } from '@/services/api'
import api from '@/services/api'
import { KanbanBoard, type KanbanColumnConfig, type DropResult, type CardRenderProps } from '@/components/common/KanbanBoard'
import {
  Briefcase,
  GripVertical,
  Calendar,
  Mail,
  Phone,
  User,
  Building2,
} from 'lucide-react'

interface LeadKanbanBoardProps {
  leads: Lead[]
  isLoading?: boolean
  onStageChange?: () => void
  onLeadClick?: (lead: Lead) => void
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export default function LeadKanbanBoard({
  leads,
  isLoading,
  onStageChange,
  onLeadClick,
}: LeadKanbanBoardProps) {
  const [stages, setStages] = useState<OnboardingStage[]>([])
  const [stagesLoading, setStagesLoading] = useState(true)

  // Fetch stages
  useEffect(() => {
    const fetchStages = async () => {
      try {
        const data = await getOnboardingStages({ entity_type: 'lead' })
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
  const columns = useMemo<KanbanColumnConfig<Lead>[]>(() => {
    // Create a column for leads with no stage
    const noStageColumn: KanbanColumnConfig<Lead> = {
      id: 'no-stage',
      title: 'Not Started',
      color: '#6B7280',
      items: leads.filter(l => !l.onboarding_stage),
    }

    // Create columns for each stage
    const stageColumns: KanbanColumnConfig<Lead>[] = stages.map(stage => ({
      id: `stage-${stage.id}`,
      title: stage.name,
      color: stage.color,
      items: leads.filter(l => l.onboarding_stage?.id === stage.id),
    }))

    return [noStageColumn, ...stageColumns]
  }, [leads, stages])

  // Handle drop
  const handleDrop = useCallback(async (result: DropResult<Lead>) => {
    const { item, targetColumnId, sourceColumnId } = result
    if (sourceColumnId === targetColumnId) return

    const targetStageId = targetColumnId === 'no-stage'
      ? null
      : parseInt(targetColumnId.replace('stage-', ''))

    try {
      await api.patch(`/companies/leads/${item.id}/stage/`, { stage_id: targetStageId })
      onStageChange?.()
    } catch (error) {
      console.error('Failed to update lead stage:', error)
    }
  }, [onStageChange])

  // Render card
  const renderCard = useCallback((props: CardRenderProps<Lead>) => (
    <LeadCard
      lead={props.item}
      dragHandleProps={props.dragHandleProps}
      onClick={props.onClick}
    />
  ), [])

  return (
    <KanbanBoard
      columns={columns}
      getItemId={(l) => l.id}
      renderCard={renderCard}
      onDrop={handleDrop}
      onItemClick={onLeadClick}
      isLoading={isLoading || stagesLoading}
    />
  )
}

interface LeadCardProps {
  lead: Lead
  dragHandleProps: {
    draggable: boolean
    onDragStart: (e: React.DragEvent) => void
  }
  onClick?: () => void
}

function LeadCard({ lead, dragHandleProps, onClick }: LeadCardProps) {
  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('button') || target.closest('a')) return
    onClick?.()
  }

  const getSourceLabel = (source: string) => {
    const labels: Record<string, string> = {
      inbound: 'Inbound',
      referral: 'Referral',
      website: 'Website',
      linkedin: 'LinkedIn',
      cold_outreach: 'Cold Outreach',
      event: 'Event',
      other: 'Other',
    }
    return labels[source] || source
  }

  const getSourceColor = (source: string) => {
    const colors: Record<string, string> = {
      inbound: 'bg-green-100 text-green-700',
      referral: 'bg-purple-100 text-purple-700',
      linkedin: 'bg-blue-100 text-blue-700',
      cold_outreach: 'bg-orange-100 text-orange-700',
      event: 'bg-pink-100 text-pink-700',
      website: 'bg-cyan-100 text-cyan-700',
      other: 'bg-gray-100 text-gray-700',
    }
    return colors[source] || 'bg-gray-100 text-gray-700'
  }

  return (
    <div
      {...dragHandleProps}
      onClick={handleCardClick}
      className="bg-white border border-gray-200 rounded-md p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
    >
      {/* Card Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 flex-1">
          {/* Lead Avatar */}
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 flex-shrink-0">
            <User className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-gray-900 hover:text-gray-700 truncate">
              {lead.name}
            </p>
          </div>
        </div>
        <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
      </div>

      {/* Card Body */}
      <div className="space-y-1.5 mb-2">
        {/* Company */}
        {lead.company_name && lead.company_name !== 'Not provided' && (
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
            <Building2 className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{lead.company_name}</span>
          </div>
        )}

        {/* Email */}
        <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
          <Mail className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{lead.email}</span>
        </div>

        {/* Phone */}
        {lead.phone && (
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
            <Phone className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{lead.phone}</span>
          </div>
        )}

        {/* Job Title */}
        {lead.job_title && (
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
            <Briefcase className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{lead.job_title}</span>
          </div>
        )}

        {/* Created Date */}
        {lead.created_at && (
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
            <Calendar className="w-3 h-3 flex-shrink-0" />
            <span>Added {formatDate(lead.created_at)}</span>
          </div>
        )}
      </div>

      {/* Source Badge */}
      <div className="mb-2">
        <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded ${getSourceColor(lead.source)}`}>
          {getSourceLabel(lead.source)}
        </span>
      </div>

      {/* Assigned To */}
      {lead.assigned_to && lead.assigned_to.length > 0 && (
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex items-center gap-1.5">
            <div className="flex -space-x-1">
              {lead.assigned_to.slice(0, 3).map((user) => (
                <div
                  key={user.id}
                  title={user.full_name}
                  className="w-5 h-5 rounded-full border border-white bg-gray-200 flex items-center justify-center text-[8px] font-medium text-gray-600"
                >
                  {user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
              ))}
              {lead.assigned_to.length > 3 && (
                <div className="w-5 h-5 rounded-full border border-white bg-gray-300 flex items-center justify-center text-[8px] font-medium text-gray-600">
                  +{lead.assigned_to.length - 3}
                </div>
              )}
            </div>
            <span className="text-[10px] text-gray-500">
              {lead.assigned_to.length === 1
                ? lead.assigned_to[0]?.full_name
                : `${lead.assigned_to.length} assigned`}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
