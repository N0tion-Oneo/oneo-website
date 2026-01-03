/**
 * BottleneckRuleDrawer - Dynamic rule builder for bottleneck detection
 * Supports custom filter conditions with field/operator/value builders
 */

import { useState, useEffect, useMemo } from 'react'
import {
  X,
  Loader2,
  Check,
  ArrowLeft,
  ArrowRight,
  Save,
  Bell,
  ListTodo,
  Eye,
  Building2,
  Users,
  Briefcase,
  ClipboardList,
  CheckCircle2,
  Plus,
  Trash2,
  Filter,
  Settings2,
  Clock,
} from 'lucide-react'
import {
  useBottleneckRule,
  useCreateBottleneckRule,
  useUpdateBottleneckRule,
  usePreviewBottleneckRuleAdhoc,
  useBottleneckModels,
  useBottleneckModelFields,
  useAvailableStages,
  type BottleneckRuleCreateInput,
  type BottleneckRuleUpdateInput,
  type BottleneckEntityType,
  type BottleneckType,
  type DetectionConfig,
  type FilterCondition,
  type NotificationConfig,
  type TaskConfig,
  type RulePreviewResult,
  type ModelField,
} from '@/hooks/useBottlenecks'

// =============================================================================
// TYPES
// =============================================================================

interface BottleneckRuleDrawerProps {
  ruleId: string | null
  onClose: () => void
  onSaved: () => void
}

type Step = 'entity' | 'detection' | 'filters' | 'actions' | 'review'

interface FormState {
  name: string
  description: string
  entity_type: BottleneckEntityType | ''
  bottleneck_type: BottleneckType
  detection_config: DetectionConfig
  filter_conditions: FilterCondition[]
  send_notification: boolean
  notification_config: NotificationConfig
  create_task: boolean
  task_config: TaskConfig
  cooldown_hours: number
  enable_warnings: boolean
  warning_threshold_percentage: number
  is_active: boolean
  run_on_schedule: boolean
  schedule_interval_minutes: number
}

// =============================================================================
// CONSTANTS
// =============================================================================

const STEPS: { id: Step; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'entity', label: 'Entity', icon: Building2 },
  { id: 'detection', label: 'Detection', icon: Eye },
  { id: 'filters', label: 'Filters', icon: Filter },
  { id: 'actions', label: 'Actions', icon: Bell },
  { id: 'review', label: 'Review', icon: Check },
]

const ENTITY_ICONS: Record<BottleneckEntityType, React.ComponentType<{ className?: string }>> = {
  lead: Building2,
  company: Building2,
  candidate: Users,
  application: Briefcase,
  stage_instance: CheckCircle2,
  task: ClipboardList,
}

const DETECTION_TYPES = [
  { value: 'stage_duration', label: 'Time in Stage', description: 'Detect entities stuck in a stage too long', forEntities: ['lead', 'company', 'candidate', 'application'] },
  { value: 'last_activity', label: 'Days Since Activity', description: 'Detect entities with no recent updates', forEntities: ['lead', 'company', 'candidate', 'application', 'stage_instance', 'task'] },
  { value: 'overdue', label: 'Overdue', description: 'Detect items past their due date', forEntities: ['stage_instance', 'task'] },
  { value: 'custom', label: 'Custom Filters Only', description: 'Use only custom filter conditions', forEntities: ['lead', 'company', 'candidate', 'application', 'stage_instance', 'task'] },
]

const RECIPIENT_TYPES = [
  { value: 'assigned_user', label: 'Assigned User' },
  { value: 'all_admins', label: 'All Admins' },
  { value: 'all_recruiters', label: 'All Recruiters' },
]

const TASK_PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
]

const SCHEDULE_INTERVALS = [
  { value: 15, label: 'Every 15 minutes' },
  { value: 30, label: 'Every 30 minutes' },
  { value: 60, label: 'Hourly' },
  { value: 120, label: 'Every 2 hours' },
  { value: 240, label: 'Every 4 hours' },
  { value: 480, label: 'Every 8 hours' },
  { value: 720, label: 'Every 12 hours' },
  { value: 1440, label: 'Daily' },
  { value: 2880, label: 'Every 2 days' },
  { value: 10080, label: 'Weekly' },
]

const DEFAULT_FORM_STATE: FormState = {
  name: '',
  description: '',
  entity_type: '',
  bottleneck_type: 'duration',
  detection_config: {
    type: 'stage_duration',
    threshold_days: 7,
    stage_field: 'onboarding_stage',
    exclude_terminal: true,
  },
  filter_conditions: [],
  send_notification: false,
  notification_config: {
    recipient_type: 'assigned_user',
    channel: 'in_app',
    title_template: '',
    body_template: '',
  },
  create_task: false,
  task_config: {
    title_template: '',
    priority: 'medium',
    due_days: 1,
    assign_to: 'entity_owner',
  },
  cooldown_hours: 24,
  enable_warnings: false,
  warning_threshold_percentage: 80,
  is_active: true,
  run_on_schedule: true,
  schedule_interval_minutes: 60,
}

// =============================================================================
// CONDITION BUILDER COMPONENT
// =============================================================================

interface ConditionRowProps {
  condition: FilterCondition
  fields: ModelField[]
  stages: Array<{ id: number; name: string; color: string }>
  onChange: (condition: FilterCondition) => void
  onRemove: () => void
}

function ConditionRow({ condition, fields, stages, onChange, onRemove }: ConditionRowProps) {
  const selectedField = fields.find(f => f.field === condition.field)
  const operators = selectedField?.operators || []
  const choices = selectedField?.choices || []
  const isStageField = selectedField?.type === 'stage'
  const needsValue = !['is_empty', 'is_not_empty', 'is_overdue'].includes(condition.operator)
  const needsDaysValue = ['days_ago_gt', 'days_ago_lt', 'is_due_within'].includes(condition.operator)

  return (
    <div className="flex items-start gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
      {/* Field Select */}
      <select
        value={condition.field}
        onChange={(e) => onChange({ ...condition, field: e.target.value, operator: 'equals', value: '' })}
        className="flex-1 min-w-[120px] px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg
          bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
      >
        <option value="">Select field...</option>
        {fields.map((field) => (
          <option key={field.field} value={field.field}>{field.label}</option>
        ))}
      </select>

      {/* Operator Select */}
      <select
        value={condition.operator}
        onChange={(e) => onChange({ ...condition, operator: e.target.value as FilterCondition['operator'] })}
        disabled={!selectedField}
        className="flex-1 min-w-[140px] px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg
          bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
      >
        {operators.map((op) => (
          <option key={op.value} value={op.value}>{op.label}</option>
        ))}
      </select>

      {/* Value Input */}
      {needsValue && (
        <>
          {isStageField ? (
            <select
              value={String(condition.value)}
              onChange={(e) => onChange({ ...condition, value: e.target.value })}
              className="flex-1 min-w-[140px] px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg
                bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Select stage...</option>
              {stages.map((stage) => (
                <option key={stage.id} value={stage.id}>{stage.name}</option>
              ))}
            </select>
          ) : choices.length > 0 ? (
            <select
              value={String(condition.value)}
              onChange={(e) => onChange({ ...condition, value: e.target.value })}
              className="flex-1 min-w-[140px] px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg
                bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Select value...</option>
              {choices.map((choice) => (
                <option key={choice.value} value={choice.value}>{choice.label}</option>
              ))}
            </select>
          ) : selectedField?.type === 'boolean' ? (
            <select
              value={String(condition.value)}
              onChange={(e) => onChange({ ...condition, value: e.target.value })}
              className="flex-1 min-w-[100px] px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg
                bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="true">True</option>
              <option value="false">False</option>
            </select>
          ) : needsDaysValue ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                value={condition.value || ''}
                onChange={(e) => onChange({ ...condition, value: e.target.value })}
                placeholder="Days"
                className="w-20 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <span className="text-sm text-gray-500">days</span>
            </div>
          ) : (
            <input
              type={selectedField?.type === 'number' ? 'number' : 'text'}
              value={condition.value || ''}
              onChange={(e) => onChange({ ...condition, value: e.target.value })}
              placeholder="Value..."
              className="flex-1 min-w-[120px] px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg
                bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          )}
        </>
      )}

      {/* Remove Button */}
      <button
        onClick={onRemove}
        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function BottleneckRuleDrawer({ ruleId, onClose, onSaved }: BottleneckRuleDrawerProps) {
  const isEditing = !!ruleId
  const [currentStep, setCurrentStep] = useState<Step>('entity')
  const [form, setForm] = useState<FormState>(DEFAULT_FORM_STATE)
  const [preview, setPreview] = useState<RulePreviewResult | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  // Hooks
  const { rule, isLoading: isLoadingRule } = useBottleneckRule(ruleId || undefined)
  const { createRule, isCreating } = useCreateBottleneckRule()
  const { updateRule, isUpdating } = useUpdateBottleneckRule()
  const { previewRuleAdhoc, isPreviewing } = usePreviewBottleneckRuleAdhoc()
  const { entityTypes, isLoading: isLoadingModels } = useBottleneckModels()
  const { fields, isLoading: isLoadingFields } = useBottleneckModelFields(form.entity_type || undefined)
  const { stages } = useAvailableStages(form.entity_type || undefined)

  // Load existing rule data
  useEffect(() => {
    if (rule) {
      setForm({
        name: rule.name,
        description: rule.description,
        entity_type: rule.entity_type,
        bottleneck_type: rule.bottleneck_type,
        detection_config: rule.detection_config,
        filter_conditions: rule.filter_conditions,
        send_notification: rule.send_notification,
        notification_config: rule.notification_config,
        create_task: rule.create_task,
        task_config: rule.task_config,
        cooldown_hours: rule.cooldown_hours,
        enable_warnings: rule.enable_warnings,
        warning_threshold_percentage: rule.warning_threshold_percentage,
        is_active: rule.is_active,
        run_on_schedule: rule.run_on_schedule,
        schedule_interval_minutes: rule.schedule_interval_minutes,
      })
    }
  }, [rule])

  // Available detection types for selected entity
  const availableDetectionTypes = useMemo(() => {
    if (!form.entity_type) return []
    return DETECTION_TYPES.filter(dt => dt.forEntities.includes(form.entity_type))
  }, [form.entity_type])

  // Step validation
  const isStepValid = useMemo(() => {
    switch (currentStep) {
      case 'entity':
        return !!form.name && !!form.entity_type
      case 'detection':
        if (form.detection_config.type === 'custom') return true
        return (form.detection_config.threshold_days ?? 0) > 0
      case 'filters':
        return true // Filters are optional
      case 'actions':
        return true // Actions are optional
      case 'review':
        return true
      default:
        return false
    }
  }, [currentStep, form])

  // Navigation
  const stepIndex = STEPS.findIndex(s => s.id === currentStep)
  const canGoBack = stepIndex > 0
  const canGoNext = stepIndex < STEPS.length - 1 && isStepValid
  const isLastStep = stepIndex === STEPS.length - 1

  const goBack = () => {
    if (canGoBack && stepIndex > 0) {
      setCurrentStep(STEPS[stepIndex - 1]!.id)
    }
  }

  const goNext = () => {
    if (canGoNext && stepIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[stepIndex + 1]!.id)
    }
  }

  // Form handlers
  const updateForm = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const updateDetectionConfig = <K extends keyof DetectionConfig>(key: K, value: DetectionConfig[K]) => {
    setForm(prev => ({
      ...prev,
      detection_config: { ...prev.detection_config, [key]: value },
    }))
  }

  const updateNotificationConfig = <K extends keyof NotificationConfig>(key: K, value: NotificationConfig[K]) => {
    setForm(prev => ({
      ...prev,
      notification_config: { ...prev.notification_config, [key]: value },
    }))
  }

  const updateTaskConfig = <K extends keyof TaskConfig>(key: K, value: TaskConfig[K]) => {
    setForm(prev => ({
      ...prev,
      task_config: { ...prev.task_config, [key]: value },
    }))
  }

  // Condition handlers
  const addCondition = () => {
    const newCondition: FilterCondition = { field: '', operator: 'equals', value: '' }
    updateForm('filter_conditions', [...form.filter_conditions, newCondition])
  }

  const updateCondition = (index: number, condition: FilterCondition) => {
    const updated = [...form.filter_conditions]
    updated[index] = condition
    updateForm('filter_conditions', updated)
  }

  const removeCondition = (index: number) => {
    updateForm('filter_conditions', form.filter_conditions.filter((_, i) => i !== index))
  }

  // Save handler
  const handleSave = async () => {
    try {
      if (isEditing && ruleId) {
        await updateRule(ruleId, form as BottleneckRuleUpdateInput)
      } else {
        await createRule(form as BottleneckRuleCreateInput)
      }
      onSaved()
      onClose()
    } catch (error) {
      console.error('Failed to save rule:', error)
    }
  }

  // Preview handler - uses current form data (works for new and existing rules)
  const handlePreview = async () => {
    if (!form.entity_type) return
    try {
      const result = await previewRuleAdhoc({
        name: form.name,
        entity_type: form.entity_type as BottleneckEntityType,
        detection_config: form.detection_config,
        filter_conditions: form.filter_conditions,
        cooldown_hours: form.cooldown_hours,
      })
      setPreview(result)
      setShowPreview(true)
    } catch (error) {
      console.error('Failed to preview rule:', error)
    }
  }

  const isSaving = isCreating || isUpdating
  const isLoading = isLoadingRule || isLoadingModels

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Drawer */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-gray-900 shadow-xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {isEditing ? 'Edit Bottleneck Rule' : 'Create Bottleneck Rule'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Build custom detection rules with flexible conditions
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Step indicators */}
          <div className="flex items-center gap-1 mt-4 overflow-x-auto">
            {STEPS.map((step, index) => {
              const Icon = step.icon
              const isActive = step.id === currentStep
              const isComplete = index < stepIndex
              return (
                <button
                  key={step.id}
                  onClick={() => index <= stepIndex && setCurrentStep(step.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      : isComplete
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                  } ${index > stepIndex ? 'cursor-not-allowed' : 'cursor-pointer hover:opacity-80'}`}
                  disabled={index > stepIndex}
                >
                  {isComplete ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <Icon className="w-3.5 h-3.5" />
                  )}
                  <span>{step.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : (
            <>
              {/* Step: Entity */}
              {currentStep === 'entity' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Rule Name *
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => updateForm('name', e.target.value)}
                      placeholder="e.g., Companies stuck in onboarding"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                        bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Description
                    </label>
                    <textarea
                      value={form.description}
                      onChange={(e) => updateForm('description', e.target.value)}
                      placeholder="Describe what this rule detects..."
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                        bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Entity Type *
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {entityTypes.map((type) => {
                        const Icon = ENTITY_ICONS[type.value] || Settings2
                        const isSelected = form.entity_type === type.value
                        return (
                          <button
                            key={type.value}
                            onClick={() => {
                              updateForm('entity_type', type.value)
                              // Reset detection config when entity changes
                              updateForm('filter_conditions', [])
                            }}
                            className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-colors ${
                              isSelected
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                            }`}
                          >
                            <Icon className={`w-5 h-5 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                            <span className={`text-sm font-medium ${isSelected ? 'text-blue-700 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
                              {type.label}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">Active</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Enable automatic detection scanning
                      </div>
                    </div>
                    <button
                      onClick={() => updateForm('is_active', !form.is_active)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                        form.is_active ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                        form.is_active ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                </div>
              )}

              {/* Step: Detection */}
              {currentStep === 'detection' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Detection Type
                    </label>
                    <div className="space-y-2">
                      {availableDetectionTypes.map((type) => {
                        const isSelected = form.detection_config.type === type.value
                        return (
                          <button
                            key={type.value}
                            onClick={() => updateDetectionConfig('type', type.value as DetectionConfig['type'])}
                            className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-colors ${
                              isSelected
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                            }`}
                          >
                            <div className={`font-medium ${isSelected ? 'text-blue-700 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
                              {type.label}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {type.description}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Threshold config based on detection type */}
                  {form.detection_config.type !== 'custom' && (
                    <>
                      {['stage_duration', 'last_activity'].includes(form.detection_config.type || '') && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Threshold (Days)
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={form.detection_config.threshold_days || 7}
                            onChange={(e) => updateDetectionConfig('threshold_days', parseInt(e.target.value) || 7)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                              bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          />
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {form.detection_config.type === 'stage_duration'
                              ? 'Detect entities in the same stage for longer than this'
                              : 'Detect entities with no activity for longer than this'}
                          </p>
                        </div>
                      )}

                      {form.detection_config.type === 'overdue' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Days Past Due
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={form.detection_config.threshold_days || 0}
                            onChange={(e) => updateDetectionConfig('threshold_days', parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                              bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          />
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            0 = detect immediately when due date passes
                          </p>
                        </div>
                      )}

                      {form.detection_config.type === 'stage_duration' && stages.length > 0 && (
                        <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <button
                            onClick={() => updateDetectionConfig('exclude_terminal', !form.detection_config.exclude_terminal)}
                            className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                              form.detection_config.exclude_terminal ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                            }`}
                          >
                            <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                              form.detection_config.exclude_terminal ? 'translate-x-4' : 'translate-x-0'
                            }`} />
                          </button>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            Exclude terminal/completed stages
                          </span>
                        </div>
                      )}
                    </>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Cooldown (Hours)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={form.cooldown_hours}
                      onChange={(e) => updateForm('cooldown_hours', parseInt(e.target.value) || 24)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                        bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Minimum time before re-detecting the same entity
                    </p>
                  </div>

                  {/* Early Warning Configuration */}
                  {form.detection_config.type !== 'custom' && (
                    <div className="p-4 border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-amber-600 dark:text-amber-400">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                          </span>
                          <span className="font-medium text-amber-900 dark:text-amber-200">Early Warnings</span>
                        </div>
                        <button
                          onClick={() => updateForm('enable_warnings', !form.enable_warnings)}
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                            form.enable_warnings ? 'bg-amber-500' : 'bg-gray-200 dark:bg-gray-700'
                          }`}
                        >
                          <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                            form.enable_warnings ? 'translate-x-5' : 'translate-x-0'
                          }`} />
                        </button>
                      </div>

                      <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
                        Get notified before entities breach the threshold, allowing time to take action.
                      </p>

                      {form.enable_warnings && (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-amber-900 dark:text-amber-200 mb-2">
                              Warning at {form.warning_threshold_percentage}% of threshold
                            </label>
                            <input
                              type="range"
                              min="50"
                              max="95"
                              step="5"
                              value={form.warning_threshold_percentage}
                              onChange={(e) => updateForm('warning_threshold_percentage', parseInt(e.target.value))}
                              className="w-full h-2 bg-amber-200 dark:bg-amber-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                            />
                            <div className="flex justify-between text-xs text-amber-600 dark:text-amber-400 mt-1">
                              <span>50%</span>
                              <span>95%</span>
                            </div>
                          </div>

                          {form.detection_config.threshold_days && (
                            <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded text-sm text-amber-800 dark:text-amber-200">
                              Warning triggers at {Math.round(form.detection_config.threshold_days * form.warning_threshold_percentage / 100 * 10) / 10} days
                              (threshold: {form.detection_config.threshold_days} days)
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Step: Filters */}
              {currentStep === 'filters' && (
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                          Filter Conditions
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Add conditions to narrow down which entities are detected
                        </p>
                      </div>
                      <button
                        onClick={addCondition}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        <Plus className="w-4 h-4" />
                        Add Condition
                      </button>
                    </div>

                    {isLoadingFields ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                      </div>
                    ) : form.filter_conditions.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <Filter className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No filter conditions added</p>
                        <p className="text-xs mt-1">All entities matching the detection type will be detected</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {form.filter_conditions.map((condition, index) => (
                          <ConditionRow
                            key={index}
                            condition={condition}
                            fields={fields}
                            stages={stages}
                            onChange={(c) => updateCondition(index, c)}
                            onRemove={() => removeCondition(index)}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Available fields reference */}
                  {fields.length > 0 && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
                        Available Fields
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {fields.map((field) => (
                          <span
                            key={field.field}
                            className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-800/50 text-blue-800 dark:text-blue-200 rounded"
                          >
                            {field.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step: Actions */}
              {currentStep === 'actions' && (
                <div className="space-y-6">
                  {/* Notification Section */}
                  <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Bell className="w-5 h-5 text-blue-600" />
                        <span className="font-medium text-gray-900 dark:text-white">Send Notification</span>
                      </div>
                      <button
                        onClick={() => updateForm('send_notification', !form.send_notification)}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                          form.send_notification ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                      >
                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                          form.send_notification ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>

                    {form.send_notification && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Recipients
                            </label>
                            <select
                              value={form.notification_config.recipient_type}
                              onChange={(e) => updateNotificationConfig('recipient_type', e.target.value as NotificationConfig['recipient_type'])}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            >
                              {RECIPIENT_TYPES.map((type) => (
                                <option key={type.value} value={type.value}>{type.label}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Channel
                            </label>
                            <select
                              value={form.notification_config.channel}
                              onChange={(e) => updateNotificationConfig('channel', e.target.value as NotificationConfig['channel'])}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            >
                              <option value="in_app">In-App</option>
                              <option value="email">Email</option>
                              <option value="both">Both</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Title Template
                          </label>
                          <input
                            type="text"
                            value={form.notification_config.title_template}
                            onChange={(e) => updateNotificationConfig('title_template', e.target.value)}
                            placeholder="e.g., Bottleneck: {{name}} stuck in {{stage_name}}"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                              bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Body Template
                          </label>
                          <textarea
                            value={form.notification_config.body_template}
                            onChange={(e) => updateNotificationConfig('body_template', e.target.value)}
                            placeholder="Use {{variable}} for dynamic values like {{name}}, {{stage_name}}, {{days_in_stage}}"
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                              bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Task Section */}
                  <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <ListTodo className="w-5 h-5 text-green-600" />
                        <span className="font-medium text-gray-900 dark:text-white">Create Follow-up Task</span>
                      </div>
                      <button
                        onClick={() => updateForm('create_task', !form.create_task)}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                          form.create_task ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                      >
                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                          form.create_task ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>

                    {form.create_task && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Task Title Template
                          </label>
                          <input
                            type="text"
                            value={form.task_config.title_template}
                            onChange={(e) => updateTaskConfig('title_template', e.target.value)}
                            placeholder="e.g., Follow up with stuck {{entity_type}}: {{name}}"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                              bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Priority
                            </label>
                            <select
                              value={form.task_config.priority}
                              onChange={(e) => updateTaskConfig('priority', e.target.value as TaskConfig['priority'])}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            >
                              {TASK_PRIORITIES.map((p) => (
                                <option key={p.value} value={p.value}>{p.label}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Due In (Days)
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={form.task_config.due_days}
                              onChange={(e) => updateTaskConfig('due_days', parseInt(e.target.value) || 1)}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Schedule Section */}
                  <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-purple-600" />
                        <span className="font-medium text-gray-900 dark:text-white">Schedule</span>
                      </div>
                      <button
                        onClick={() => updateForm('run_on_schedule', !form.run_on_schedule)}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                          form.run_on_schedule ? 'bg-purple-600' : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                      >
                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                          form.run_on_schedule ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>

                    {form.run_on_schedule && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Run Interval
                          </label>
                          <select
                            value={form.schedule_interval_minutes}
                            onChange={(e) => updateForm('schedule_interval_minutes', parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                              bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          >
                            {SCHEDULE_INTERVALS.map((interval) => (
                              <option key={interval.value} value={interval.value}>{interval.label}</option>
                            ))}
                          </select>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            How often this rule should check for bottlenecks
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Cooldown (Hours)
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={form.cooldown_hours}
                            onChange={(e) => updateForm('cooldown_hours', parseInt(e.target.value) || 1)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                              bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          />
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Hours before the same entity can trigger this rule again
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step: Review */}
              {currentStep === 'review' && (
                <div className="space-y-6">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Rule Summary</h3>

                    <dl className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-gray-500 dark:text-gray-400">Name</dt>
                        <dd className="font-medium text-gray-900 dark:text-white">{form.name || '(not set)'}</dd>
                      </div>

                      <div className="flex justify-between">
                        <dt className="text-gray-500 dark:text-gray-400">Entity Type</dt>
                        <dd className="font-medium text-gray-900 dark:text-white">
                          {entityTypes.find(t => t.value === form.entity_type)?.label || form.entity_type}
                        </dd>
                      </div>

                      <div className="flex justify-between">
                        <dt className="text-gray-500 dark:text-gray-400">Detection</dt>
                        <dd className="font-medium text-gray-900 dark:text-white">
                          {DETECTION_TYPES.find(t => t.value === form.detection_config.type)?.label}
                          {form.detection_config.type !== 'custom' && form.detection_config.threshold_days && (
                            <span className="text-gray-500"> ({form.detection_config.threshold_days} days)</span>
                          )}
                        </dd>
                      </div>

                      <div className="flex justify-between">
                        <dt className="text-gray-500 dark:text-gray-400">Filters</dt>
                        <dd className="font-medium text-gray-900 dark:text-white">
                          {form.filter_conditions.length} condition{form.filter_conditions.length !== 1 ? 's' : ''}
                        </dd>
                      </div>

                      <div className="flex justify-between">
                        <dt className="text-gray-500 dark:text-gray-400">Actions</dt>
                        <dd className="font-medium text-gray-900 dark:text-white">
                          {[
                            form.send_notification && 'Notification',
                            form.create_task && 'Task',
                          ].filter(Boolean).join(', ') || 'None'}
                        </dd>
                      </div>

                      <div className="flex justify-between">
                        <dt className="text-gray-500 dark:text-gray-400">Schedule</dt>
                        <dd className="font-medium text-gray-900 dark:text-white">
                          {form.run_on_schedule
                            ? SCHEDULE_INTERVALS.find(i => i.value === form.schedule_interval_minutes)?.label || `${form.schedule_interval_minutes} min`
                            : 'Manual only'}
                        </dd>
                      </div>

                      <div className="flex justify-between">
                        <dt className="text-gray-500 dark:text-gray-400">Status</dt>
                        <dd>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            form.is_active
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                          }`}>
                            {form.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </dd>
                      </div>
                    </dl>
                  </div>

                  {/* Filter conditions summary */}
                  {form.filter_conditions.length > 0 && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                      <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">Filter Conditions</h4>
                      <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
                        {form.filter_conditions.map((c, i) => {
                          const field = fields.find(f => f.field === c.field)
                          return (
                            <li key={i}>
                              {field?.label || c.field} {c.operator} {String(c.value)}
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )}

                  {/* Preview Button */}
                  <button
                    onClick={handlePreview}
                    disabled={isPreviewing || !form.entity_type}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPreviewing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                    Preview Matching Entities
                  </button>

                  {showPreview && preview && (
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900 dark:text-gray-100">Preview Results</h4>
                        <div className="flex items-center gap-2 text-sm">
                          {preview.matches.filter(m => m.severity === 'critical').length > 0 && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded">
                              {preview.matches.filter(m => m.severity === 'critical').length} critical
                            </span>
                          )}
                          {preview.matches.filter(m => m.severity === 'warning').length > 0 && (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded">
                              {preview.matches.filter(m => m.severity === 'warning').length} warning
                            </span>
                          )}
                        </div>
                      </div>
                      {preview.matches.length > 0 ? (
                        <ul className="space-y-2 text-sm">
                          {preview.matches.slice(0, 8).map((match) => (
                            <li key={match.id} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${
                                  match.severity === 'warning'
                                    ? 'bg-amber-500'
                                    : 'bg-red-500'
                                }`} />
                                <span className="text-gray-900 dark:text-gray-100">
                                  {match.name || match.id}
                                </span>
                                {match.stage && (
                                  <span className="text-gray-500 dark:text-gray-400">({match.stage})</span>
                                )}
                              </div>
                              {match.current_value !== undefined && match.current_value !== null && (
                                <span className={`text-xs ${
                                  match.severity === 'warning'
                                    ? 'text-amber-600 dark:text-amber-400'
                                    : 'text-red-600 dark:text-red-400'
                                }`}>
                                  {match.current_value} days
                                </span>
                              )}
                            </li>
                          ))}
                          {preview.matches.length > 8 && (
                            <li className="text-gray-500 dark:text-gray-400">
                              +{preview.matches.length - 8} more...
                            </li>
                          )}
                        </ul>
                      ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          No entities currently match this rule.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <button
              onClick={goBack}
              disabled={!canGoBack}
              className={`flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 ${
                canGoBack ? 'hover:text-gray-900 dark:hover:text-white' : 'opacity-50 cursor-not-allowed'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                Cancel
              </button>

              {isLastStep ? (
                <button
                  onClick={handleSave}
                  disabled={isSaving || !isStepValid}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {isEditing ? 'Update Rule' : 'Create Rule'}
                </button>
              ) : (
                <button
                  onClick={goNext}
                  disabled={!canGoNext}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
