import { useState, useEffect, useRef } from 'react'
import { X, GripVertical, Trash2, ChevronDown, ChevronUp, User } from 'lucide-react'
import {
  StageType,
  StageTypeLabels,
  StageTypeConfig,
  InterviewStageTemplateInput,
  CompanyUser,
} from '@/types'
import { StageTypeBadge, StageTypeDropdown } from './StageTypeSelector'

interface StageConfigFormProps {
  stage: InterviewStageTemplateInput
  index: number
  onChange: (index: number, stage: InterviewStageTemplateInput) => void
  onRemove: (index: number) => void
  isDragging?: boolean
  isDragOver?: boolean
  onDragStart?: (e: React.DragEvent) => void
  onDragEnd?: (e: React.DragEvent) => void
  onDragOver?: (e: React.DragEvent) => void
  onDragLeave?: (e: React.DragEvent) => void
  onDrop?: (e: React.DragEvent) => void
  teamMembers?: CompanyUser[]
}

export default function StageConfigForm({
  stage,
  index,
  onChange,
  onRemove,
  isDragging = false,
  isDragOver = false,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  teamMembers = [],
}: StageConfigFormProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const config = StageTypeConfig[stage.stage_type]

  // Update name when stage type changes (if name is empty or matches default)
  useEffect(() => {
    if (!stage.name) {
      onChange(index, { ...stage, name: StageTypeLabels[stage.stage_type] })
    }
  }, [stage.stage_type])

  const handleChange = (field: keyof InterviewStageTemplateInput, value: unknown) => {
    onChange(index, { ...stage, [field]: value })
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`bg-white dark:bg-gray-900 border rounded-lg transition-all ${
        isDragging ? 'opacity-50 shadow-lg border-gray-300 dark:border-gray-600' : ''
      } ${isDragOver ? 'border-blue-400 border-2 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'}`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex-shrink-0 cursor-grab active:cursor-grabbing text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400">
          <GripVertical className="w-5 h-5" />
        </div>

        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-400">
          {index + 1}
        </div>

        <div className="flex-1 min-w-0">
          <StageTypeBadge stageType={stage.stage_type} size="sm" />
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 rounded"
        >
          {isExpanded ? (
            <ChevronUp className="w-5 h-5" />
          ) : (
            <ChevronDown className="w-5 h-5" />
          )}
        </button>

        <button
          type="button"
          onClick={() => onRemove(index)}
          className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-500 rounded"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Basic Info Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Stage Type
              </label>
              <StageTypeDropdown
                value={stage.stage_type}
                onChange={(type) => handleChange('stage_type', type)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Stage Name
              </label>
              <input
                type="text"
                value={stage.name || ''}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder={StageTypeLabels[stage.stage_type]}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
              <span className="text-gray-400 dark:text-gray-500 font-normal ml-1">(optional)</span>
            </label>
            <textarea
              value={stage.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Describe what happens in this stage..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent resize-none bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>

          {/* Scheduling Options - only show for schedulable stages */}
          {config.requiresScheduling && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Default Duration (minutes)
                </label>
                <input
                  type="number"
                  min={15}
                  step={15}
                  value={stage.default_duration_minutes || config.defaultDuration || 60}
                  onChange={(e) =>
                    handleChange('default_duration_minutes', parseInt(e.target.value) || null)
                  }
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <User className="w-4 h-4" />
                  Default Interviewer
                </label>
                <select
                  value={stage.default_interviewer_id || ''}
                  onChange={(e) =>
                    handleChange('default_interviewer_id', e.target.value || null)
                  }
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                >
                  <option value="">No default (select when scheduling)</option>
                  {teamMembers.map((member) => (
                    <option key={member.user} value={member.user}>
                      {member.user_first_name} {member.user_last_name}
                      {member.job_title ? ` - ${member.job_title}` : ''}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Pre-select an interviewer for this stage
                </p>
              </div>
            </div>
          )}

          {/* Location Options - only show for location-required stages */}
          {config.requiresLocation && (
            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={stage.use_company_address !== false}
                  onChange={(e) => handleChange('use_company_address', e.target.checked)}
                  className="w-4 h-4 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 rounded focus:ring-gray-900 dark:focus:ring-gray-100"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Use company address</span>
              </label>

              {stage.use_company_address === false && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Custom Location
                  </label>
                  <input
                    type="text"
                    value={stage.custom_location || ''}
                    onChange={(e) => handleChange('custom_location', e.target.value)}
                    placeholder="Enter address or location details..."
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>
              )}
            </div>
          )}

          {/* Assessment Options - only show for assessment stages */}
          {config.isAssessment && (
            <div className="space-y-4 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <h4 className="text-sm font-medium text-orange-800 dark:text-orange-300">Assessment Settings</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Assessment Provider
                    <span className="text-gray-400 dark:text-gray-500 font-normal ml-1">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={stage.assessment_provider_name || ''}
                    onChange={(e) => handleChange('assessment_provider_name', e.target.value)}
                    placeholder="e.g., Codility, HackerRank..."
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Default Deadline (days from assignment)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={stage.deadline_days || 7}
                    onChange={(e) =>
                      handleChange('deadline_days', parseInt(e.target.value) || null)
                    }
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Assessment Instructions
                  <span className="text-gray-400 dark:text-gray-500 font-normal ml-1">(optional)</span>
                </label>
                <textarea
                  value={stage.assessment_instructions || ''}
                  onChange={(e) => handleChange('assessment_instructions', e.target.value)}
                  placeholder="Default instructions that will be sent with the assessment..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent resize-none bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  External Assessment URL
                  <span className="text-gray-400 dark:text-gray-500 font-normal ml-1">(optional)</span>
                </label>
                <input
                  type="url"
                  value={stage.assessment_external_url || ''}
                  onChange={(e) => handleChange('assessment_external_url', e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Compact list view of stages with drag-and-drop reordering
interface StageListProps {
  stages: InterviewStageTemplateInput[]
  onChange: (stages: InterviewStageTemplateInput[]) => void
  onRemove: (index: number) => void
  teamMembers?: CompanyUser[]
}

export function StageList({ stages, onChange, onRemove, teamMembers = [] }: StageListProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const handleStageChange = (index: number, stage: InterviewStageTemplateInput) => {
    const newStages = [...stages]
    newStages[index] = stage
    onChange(newStages)
  }

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', index.toString())
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index)
    }
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDragOverIndex(null)
      return
    }

    const newStages = [...stages]
    const [draggedStage] = newStages.splice(draggedIndex, 1)
    newStages.splice(dropIndex, 0, draggedStage)

    // Update order fields
    newStages.forEach((stage, i) => {
      stage.order = i + 1
    })

    onChange(newStages)
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  if (stages.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
        No interview stages defined. Add stages below.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {stages.map((stage, index) => (
        <StageConfigForm
          key={stage.id || index}
          stage={stage}
          index={index}
          onChange={handleStageChange}
          onRemove={onRemove}
          teamMembers={teamMembers}
          isDragging={draggedIndex === index}
          isDragOver={dragOverIndex === index}
          onDragStart={(e) => handleDragStart(e, index)}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => handleDragOver(e, index)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, index)}
        />
      ))}
    </div>
  )
}
