import { useState, useMemo, useEffect } from 'react'
import type { AdminCompanyListItem, OnboardingStage } from '@/types'
import { getOnboardingStages, updateCompany } from '@/services/api'
import { getMediaUrl } from '@/services/api'
import {
  Building2,
  Briefcase,
  MapPin,
  GripVertical,
  Calendar,
} from 'lucide-react'

interface KanbanColumn {
  stage: OnboardingStage | null
  companies: AdminCompanyListItem[]
}

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
  const [dragOverStageId, setDragOverStageId] = useState<number | 'no-stage' | null>(null)

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
  const columns = useMemo<KanbanColumn[]>(() => {
    // Create a column for companies with no stage
    const noStageColumn: KanbanColumn = {
      stage: null,
      companies: companies.filter(c => !c.onboarding_stage),
    }

    // Create columns for each stage
    const stageColumns: KanbanColumn[] = stages.map(stage => ({
      stage,
      companies: companies.filter(c => c.onboarding_stage?.id === stage.id),
    }))

    return [noStageColumn, ...stageColumns]
  }, [companies, stages])

  const handleDragStart = (e: React.DragEvent, companyId: string) => {
    e.dataTransfer.setData('companyId', companyId)
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

    const companyId = e.dataTransfer.getData('companyId')
    if (!companyId) return

    // Find the company
    const company = companies.find(c => c.id === companyId)
    if (!company) return

    // Skip if same stage
    if (company.onboarding_stage?.id === targetStageId) return

    try {
      await updateCompany(companyId, { onboarding_stage_id: targetStageId })
      onStageChange?.()
    } catch (error) {
      console.error('Failed to update company stage:', error)
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
                {column.companies.length}
              </span>
            </div>
          </div>

          {/* Column Content */}
          <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-280px)]">
            {column.companies.map((company) => (
              <CompanyCard
                key={company.id}
                company={company}
                onDragStart={(e) => handleDragStart(e, company.id)}
                onClick={() => onCompanyClick?.(company)}
              />
            ))}
            {column.companies.length === 0 && (
              <div className="py-8 text-center text-[12px] text-gray-400">
                No companies
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

interface CompanyCardProps {
  company: AdminCompanyListItem
  onDragStart: (e: React.DragEvent) => void
  onClick?: () => void
}

function CompanyCard({ company, onDragStart, onClick }: CompanyCardProps) {
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
          {/* Logo/Avatar */}
          {company.logo ? (
            <img
              src={getMediaUrl(company.logo)}
              alt={company.name}
              className="w-8 h-8 rounded-full object-cover bg-gray-100 flex-shrink-0"
            />
          ) : (
            <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center text-white text-[10px] font-medium flex-shrink-0">
              {company.name?.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-gray-900 hover:text-gray-700 truncate">
              {company.name}
            </p>
          </div>
        </div>
        <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
      </div>

      {/* Card Body */}
      <div className="space-y-1.5 mb-2">
        {/* Industry */}
        {company.industry && (
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
            <Building2 className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{company.industry.name}</span>
          </div>
        )}

        {/* Location */}
        {company.headquarters_location && (
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{company.headquarters_location}</span>
          </div>
        )}

        {/* Jobs */}
        <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
          <Briefcase className="w-3 h-3 flex-shrink-0" />
          <span>{company.jobs_total} job{company.jobs_total !== 1 ? 's' : ''}</span>
        </div>

        {/* Created Date */}
        {company.created_at && (
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
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
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          {company.is_published ? 'Published' : 'Draft'}
        </span>
      </div>

      {/* Assigned To */}
      {company.assigned_to && company.assigned_to.length > 0 && (
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex -space-x-1">
            {company.assigned_to.slice(0, 3).map((user) => (
              <div
                key={user.id}
                title={user.full_name}
                className="w-5 h-5 rounded-full border border-white bg-gray-200 flex items-center justify-center text-[8px] font-medium text-gray-600"
              >
                {user.first_name?.[0]}{user.last_name?.[0]}
              </div>
            ))}
            {company.assigned_to.length > 3 && (
              <div className="w-5 h-5 rounded-full border border-white bg-gray-300 flex items-center justify-center text-[8px] font-medium text-gray-600">
                +{company.assigned_to.length - 3}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
