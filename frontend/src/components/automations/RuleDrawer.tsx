/**
 * RuleDrawer - Drawer for creating/editing automation rules
 * Uses a step wizard flow with 4 steps: Trigger, Conditions, Action, Review
 */

import { useState, useEffect, useMemo } from 'react'
import {
  X,
  Loader2,
  AlertCircle,
  Check,
  Plus,
  Trash2,
  ChevronDown,
  Send,
  Bell,
  Pencil,
  FileText,
  Link,
  List,
  Hash,
  Calendar,
  ToggleLeft,
  Type,
  Search,
  Variable,
  Zap,
  Filter,
  Play,
  Save,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react'
import {
  useRuleEditor,
  useNotificationTemplates,
  TriggerType,
  ActionType,
  TriggerCondition,
  UpdateRuleData,
  ModelField,
  ScheduleConfig,
} from '@/hooks/useAutomations'
import { AutomationRecipientTypes, AutomationRecipientTypeGroups } from '@/types'
import TestRulePanel from './TestRulePanel'
import ExecutionHistoryPanel from './ExecutionHistoryPanel'

// =============================================================================
// TYPES
// =============================================================================

interface RuleDrawerProps {
  ruleId: string | null  // null for new rule
  onClose: () => void
  onSaved: () => void
}

type Step = 'trigger' | 'conditions' | 'action' | 'review'

// =============================================================================
// CONSTANTS
// =============================================================================

const STEPS: { id: Step; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'trigger', label: 'Trigger', icon: Zap },
  { id: 'conditions', label: 'Conditions', icon: Filter },
  { id: 'action', label: 'Action', icon: Play },
  { id: 'review', label: 'Review', icon: Check },
]

const triggerLabels: Record<TriggerType, string> = {
  model_created: 'Record Created',
  model_updated: 'Record Updated',
  model_deleted: 'Record Deleted',
  stage_changed: 'Stage Changed',
  status_changed: 'Status Changed',
  field_changed: 'Field Changed',
  scheduled: 'Scheduled (Time-based)',
  manual: 'Manual Trigger',
  signal: 'Django Signal',
  view_action: 'View Action',
}

// Signal/action names for non-model triggers
const SIGNAL_OPTIONS: { value: string; label: string; type: TriggerType }[] = [
  { value: 'password_reset', label: 'Password Reset Requested', type: 'signal' },
  { value: 'password_changed', label: 'Password Changed', type: 'signal' },
  { value: 'email_verification', label: 'Email Verification', type: 'signal' },
  { value: 'user_logged_in', label: 'User Logged In', type: 'signal' },
  { value: 'user_logged_out', label: 'User Logged Out', type: 'signal' },
  { value: 'admin_broadcast', label: 'Admin Broadcast', type: 'manual' },
  { value: 'booking_link_sent', label: 'Booking Link Sent', type: 'view_action' },
]

// Check if trigger type requires model selection
const isModelRequired = (type: TriggerType): boolean => {
  return !['manual', 'signal', 'view_action'].includes(type)
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const getOperatorsForFieldType = (fieldType: string, hasChoices: boolean) => {
  if (fieldType === 'BooleanField') {
    return { equals: 'is', not_equals: 'is not' }
  }
  if (hasChoices) {
    return { equals: 'is', not_equals: 'is not', in: 'is one of', not_in: 'is not one of' }
  }
  if (fieldType === 'DateField' || fieldType === 'DateTimeField') {
    return {
      equals: 'is',
      not_equals: 'is not',
      gt: 'is after',
      gte: 'is on or after',
      lt: 'is before',
      lte: 'is on or before',
      is_empty: 'is not set',
      is_not_empty: 'is set',
    }
  }
  if (fieldType === 'IntegerField' || fieldType === 'DecimalField' || fieldType === 'FloatField' || fieldType === 'PositiveIntegerField') {
    return {
      equals: 'equals',
      not_equals: 'does not equal',
      gt: 'is greater than',
      gte: 'is at least',
      lt: 'is less than',
      lte: 'is at most',
      is_empty: 'is empty',
      is_not_empty: 'is not empty',
    }
  }
  return {
    equals: 'equals',
    not_equals: 'does not equal',
    contains: 'contains',
    not_contains: 'does not contain',
    is_empty: 'is empty',
    is_not_empty: 'is not empty',
  }
}

const getFieldIcon = (field: ModelField) => {
  if (field.is_relation) return <Link className="w-3 h-3" />
  if (field.choices && field.choices.length > 0) return <List className="w-3 h-3" />
  if (field.type === 'BooleanField') return <ToggleLeft className="w-3 h-3" />
  if (field.type === 'DateField' || field.type === 'DateTimeField') return <Calendar className="w-3 h-3" />
  if (field.type === 'IntegerField' || field.type === 'DecimalField' || field.type === 'FloatField') return <Hash className="w-3 h-3" />
  return <Type className="w-3 h-3" />
}

const getFieldBadgeColor = (field: ModelField) => {
  if (field.is_relation) return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30'
  if (field.choices && field.choices.length > 0) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30'
  if (field.type === 'BooleanField') return 'bg-green-100 text-green-700 dark:bg-green-900/30'
  if (field.type === 'DateField' || field.type === 'DateTimeField') return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30'
  return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface SmartValueInputProps {
  field: ModelField | undefined
  value: string | string[]
  onChange: (value: string | string[]) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  operator?: string // For multiselect when operator is 'in' or 'not_in'
}

function SmartValueInput({ field, value, onChange, placeholder, className = '', disabled, operator }: SmartValueInputProps) {
  const isMultiSelect = operator === 'in' || operator === 'not_in'
  const arrayValue = Array.isArray(value) ? value : (value ? [value] : [])
  const stringValue = Array.isArray(value) ? value.join(', ') : value

  if (field?.type === 'BooleanField') {
    return (
      <div className={`flex gap-2 ${className}`}>
        <button
          type="button"
          onClick={() => onChange('true')}
          disabled={disabled}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            stringValue === 'true' ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          True
        </button>
        <button
          type="button"
          onClick={() => onChange('false')}
          disabled={disabled}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            stringValue === 'false' ? 'bg-red-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          False
        </button>
      </div>
    )
  }

  if (field?.choices && field.choices.length > 0) {
    // Multiselect for "in" / "not_in" operators
    if (isMultiSelect) {
      return (
        <div className={`relative ${className}`}>
          <div className="flex flex-wrap gap-1 min-h-[38px] p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800">
            {arrayValue.length === 0 ? (
              <span className="text-[13px] text-gray-400">Select values...</span>
            ) : (
              arrayValue.map((val) => {
                const choice = field.choices?.find(c => c.value === val)
                return (
                  <span
                    key={val}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-[12px]"
                  >
                    {choice?.label || val}
                    <button
                      type="button"
                      onClick={() => onChange(arrayValue.filter(v => v !== val))}
                      className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      ×
                    </button>
                  </span>
                )
              })
            )}
          </div>
          <select
            value=""
            onChange={(e) => {
              if (e.target.value && !arrayValue.includes(e.target.value)) {
                onChange([...arrayValue, e.target.value])
              }
            }}
            disabled={disabled}
            className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-[13px] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          >
            <option value="">Add value...</option>
            {field.choices.filter(c => !arrayValue.includes(c.value)).map((choice) => (
              <option key={choice.value} value={choice.value}>{choice.label}</option>
            ))}
          </select>
        </div>
      )
    }

    // Single select for other operators
    return (
      <select
        value={stringValue}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-[13px] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent ${className} ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-700' : ''}`}
      >
        <option value="">Select value</option>
        {field.choices.map((choice) => (
          <option key={choice.value} value={choice.value}>{choice.label}</option>
        ))}
      </select>
    )
  }

  if (field?.type === 'DateField') {
    return (
      <input
        type="date"
        value={stringValue}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-[13px] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent ${className} ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-700' : ''}`}
      />
    )
  }

  if (field?.type === 'DateTimeField') {
    return (
      <input
        type="datetime-local"
        value={stringValue}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-[13px] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent ${className} ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-700' : ''}`}
      />
    )
  }

  if (field?.type === 'IntegerField' || field?.type === 'DecimalField' || field?.type === 'FloatField') {
    return (
      <input
        type="number"
        value={stringValue}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        step={field.type === 'IntegerField' ? '1' : 'any'}
        className={`px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-[13px] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent ${className} ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-700' : ''}`}
      />
    )
  }

  return (
    <input
      type="text"
      value={stringValue}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      className={`px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-[13px] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent ${className} ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-700' : ''}`}
    />
  )
}

interface VariablePickerProps {
  fields: ModelField[]
  onSelect: (variable: string) => void
  buttonClassName?: string
}

function VariablePicker({ fields, onSelect, buttonClassName = '' }: VariablePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')

  const filteredFields = useMemo(() => {
    if (!search) return fields
    return fields.filter(f =>
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.verbose_name.toLowerCase().includes(search.toLowerCase())
    )
  }, [fields, search])

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded ${buttonClassName}`}
      >
        <Variable className="w-3 h-3" />
        Insert Variable
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg dark:shadow-gray-900/40 z-20 max-h-64 overflow-hidden">
            <div className="p-2 border-b border-gray-100 dark:border-gray-700">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search fields..."
                  className="w-full pl-8 pr-3 py-1.5 text-[13px] border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  autoFocus
                />
              </div>
            </div>
            <div className="overflow-y-auto max-h-48">
              {filteredFields.length === 0 ? (
                <div className="p-3 text-[13px] text-gray-500 dark:text-gray-400 text-center">No fields found</div>
              ) : (
                filteredFields.map((field) => (
                  <button
                    key={field.name}
                    type="button"
                    onClick={() => {
                      onSelect(`{{${field.name}}}`)
                      setIsOpen(false)
                      setSearch('')
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-[13px] hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <span className={`p-1 rounded ${getFieldBadgeColor(field)}`}>
                      {getFieldIcon(field)}
                    </span>
                    <span className="flex-1 truncate text-gray-900 dark:text-gray-100">{field.verbose_name}</span>
                    <code className="text-[11px] text-gray-400 dark:text-gray-500">{`{{${field.name}}}`}</code>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

interface FieldSelectorProps {
  fields: ModelField[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  showSearch?: boolean
}

function FieldSelector({ fields, value, onChange, placeholder = 'Select field', className = '', disabled, showSearch }: FieldSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const selectedField = fields.find(f => f.name === value)

  const filteredFields = useMemo(() => {
    if (!search) return fields
    return fields.filter(f =>
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.verbose_name.toLowerCase().includes(search.toLowerCase())
    )
  }, [fields, search])

  if (!showSearch || fields.length < 10) {
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-[13px] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent ${className} ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-700' : ''}`}
      >
        <option value="">{placeholder}</option>
        {fields.map((field) => (
          <option key={field.name} value={field.name}>{field.verbose_name}</option>
        ))}
      </select>
    )
  }

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full flex items-center justify-between px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-[13px] text-left bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 ${
          disabled ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-700' : 'hover:border-gray-400 dark:hover:border-gray-500'
        }`}
      >
        {selectedField ? (
          <span className="flex items-center gap-2">
            <span className={`p-0.5 rounded ${getFieldBadgeColor(selectedField)}`}>
              {getFieldIcon(selectedField)}
            </span>
            {selectedField.verbose_name}
          </span>
        ) : (
          <span className="text-gray-400">{placeholder}</span>
        )}
        <ChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-500" />
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg dark:shadow-gray-900/40 z-20 max-h-64 overflow-hidden">
            <div className="p-2 border-b border-gray-100 dark:border-gray-700">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search fields..."
                  className="w-full pl-8 pr-3 py-1.5 text-[13px] border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  autoFocus
                />
              </div>
            </div>
            <div className="overflow-y-auto max-h-48">
              {filteredFields.length === 0 ? (
                <div className="p-3 text-[13px] text-gray-500 dark:text-gray-400 text-center">No fields found</div>
              ) : (
                filteredFields.map((field) => (
                  <button
                    key={field.name}
                    type="button"
                    onClick={() => {
                      onChange(field.name)
                      setIsOpen(false)
                      setSearch('')
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left text-[13px] hover:bg-gray-50 dark:hover:bg-gray-800 ${
                      value === field.name ? 'bg-gray-50 dark:bg-gray-800' : ''
                    }`}
                  >
                    <span className={`p-1 rounded ${getFieldBadgeColor(field)}`}>
                      {getFieldIcon(field)}
                    </span>
                    <span className="flex-1 text-gray-900 dark:text-gray-100">{field.verbose_name}</span>
                    {field.is_relation && <span className="text-[11px] text-purple-600 dark:text-purple-400">FK</span>}
                    {field.choices && field.choices.length > 0 && (
                      <span className="text-[11px] text-blue-600 dark:text-blue-400">{field.choices.length} options</span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function RuleDrawer({ ruleId, onClose, onSaved }: RuleDrawerProps) {
  const isNew = !ruleId
  const {
    rule,
    models,
    sampleRecords,
    isLoading,
    isLoadingRecords,
    isSaving,
    isTesting,
    testResult,
    resetTest,
    saveRule,
    testRule,
    refetchRecords,
  } = useRuleEditor(ruleId)

  // Notification templates
  const { templates: notificationTemplates, isLoading: isLoadingTemplates } = useNotificationTemplates()

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [triggerModel, setTriggerModel] = useState('')
  const [triggerType, setTriggerType] = useState<TriggerType>('model_created')
  const [signalName, setSignalName] = useState('')
  const [triggerConditions, setTriggerConditions] = useState<TriggerCondition[]>([])
  const [scheduleConfig, setScheduleConfig] = useState<ScheduleConfig>({
    datetime_field: '',
    offset_hours: 24,
    offset_type: 'before',
  })
  const [actionType, setActionType] = useState<ActionType>('send_webhook')
  const [actionConfig, setActionConfig] = useState<Record<string, unknown>>({})
  const [isActive, setIsActive] = useState(false)

  // UI state
  const [currentStep, setCurrentStep] = useState<Step>('trigger')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Get selected model's fields
  const selectedModel = models.find(m => m.key === triggerModel)
  const modelFields = selectedModel?.fields || []

  // Get target model fields for update_field action
  const getTargetModelFields = () => {
    if (actionType !== 'update_field') return modelFields
    const target = (actionConfig as { target?: string }).target
    if (target === 'related') {
      const relatedModelKey = (actionConfig as { related_model?: string }).related_model
      const relatedModel = models.find(m => m.key === relatedModelKey)
      return relatedModel?.fields || []
    }
    return modelFields
  }
  const targetModelFields = getTargetModelFields()

  // Initialize form from rule
  useEffect(() => {
    if (rule) {
      setName(rule.name)
      setDescription(rule.description || '')
      setTriggerModel(rule.trigger_model || '')
      setTriggerType(rule.trigger_type)
      setSignalName(rule.signal_name || '')
      setTriggerConditions(rule.trigger_conditions || [])
      setActionType(rule.action_type)

      // Initialize schedule config if present
      if (rule.schedule_config) {
        setScheduleConfig({
          datetime_field: rule.schedule_config.datetime_field || '',
          offset_hours: rule.schedule_config.offset_hours || 24,
          offset_type: rule.schedule_config.offset_type || 'before',
        })
      }

      // Merge notification_template into actionConfig if present
      const baseConfig = rule.action_config as Record<string, unknown> || {}
      if (rule.notification_template) {
        setActionConfig({
          ...baseConfig,
          use_template: true,
          notification_template: rule.notification_template,
        })
      } else {
        setActionConfig(baseConfig)
      }

      setIsActive(rule.is_active)
    }
  }, [rule])

  // Auto-hide toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  // Handle save
  const handleSave = async () => {
    try {
      // Extract notification_template from actionConfig if using template mode
      const useTemplate = (actionConfig as { use_template?: boolean }).use_template === true
      const notificationTemplateId = (actionConfig as { notification_template?: string }).notification_template

      // Clean up actionConfig - remove use_template and notification_template flags
      const { use_template: _, notification_template: __, ...cleanActionConfig } = actionConfig as Record<string, unknown>

      const data: UpdateRuleData = {
        name,
        description,
        trigger_model: isModelRequired(triggerType) ? triggerModel : undefined,
        trigger_type: triggerType,
        signal_name: !isModelRequired(triggerType) ? signalName : undefined,
        trigger_conditions: triggerConditions,
        schedule_config: triggerType === 'scheduled' ? scheduleConfig : undefined,
        action_type: actionType,
        action_config: cleanActionConfig,
        notification_template: useTemplate ? notificationTemplateId : undefined,
        is_active: isActive,
      }
      await saveRule(data)
      setToast({ message: 'Rule saved successfully', type: 'success' })
      onSaved()
    } catch {
      setToast({ message: 'Failed to save rule', type: 'error' })
    }
  }

  // Add condition
  const addCondition = () => {
    setTriggerConditions([
      ...triggerConditions,
      { field: modelFields[0]?.name || '', operator: 'equals', value: '' },
    ])
  }

  // Remove condition
  const removeCondition = (index: number) => {
    setTriggerConditions(triggerConditions.filter((_, i) => i !== index))
  }

  // Update condition
  const updateCondition = (index: number, updates: Partial<TriggerCondition>) => {
    setTriggerConditions(
      triggerConditions.map((c, i) => (i === index ? { ...c, ...updates } : c))
    )
  }

  // Step navigation
  const currentStepIndex = STEPS.findIndex(s => s.id === currentStep)
  const canGoNext = currentStepIndex < STEPS.length - 1
  const canGoPrev = currentStepIndex > 0

  const goToNextStep = () => {
    const nextStep = STEPS[currentStepIndex + 1]
    if (canGoNext && nextStep) {
      setCurrentStep(nextStep.id)
    }
  }

  const goToPrevStep = () => {
    const prevStep = STEPS[currentStepIndex - 1]
    if (canGoPrev && prevStep) {
      setCurrentStep(prevStep.id)
    }
  }

  // Loading state
  if (isLoading && !isNew) {
    return (
      <>
        <div className="fixed inset-0 bg-black/30 dark:bg-black/50 z-[200]" onClick={onClose} />
        <div className="fixed inset-y-0 right-0 w-1/2 min-w-[640px] max-w-2xl bg-white dark:bg-gray-900 shadow-xl dark:shadow-gray-900/50 z-[201] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </>
    )
  }

  // Not found state
  if (!isNew && !rule && !isLoading) {
    return (
      <>
        <div className="fixed inset-0 bg-black/30 dark:bg-black/50 z-[200]" onClick={onClose} />
        <div className="fixed inset-y-0 right-0 w-1/2 min-w-[640px] max-w-2xl bg-white dark:bg-gray-900 shadow-xl dark:shadow-gray-900/50 z-[201] flex flex-col items-center justify-center gap-4 p-6">
          <AlertCircle className="w-12 h-12 text-red-500" />
          <p className="text-[13px] text-gray-600 dark:text-gray-400">Rule not found</p>
          <button onClick={onClose} className="text-[13px] text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
            Close
          </button>
        </div>
      </>
    )
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 dark:bg-black/50 z-[200]" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-1/2 min-w-[640px] max-w-2xl bg-white dark:bg-gray-900 shadow-xl dark:shadow-gray-900/50 z-[201] flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-[16px] font-semibold bg-transparent border-none focus:outline-none focus:ring-0 p-0 placeholder:text-gray-400 text-gray-900 dark:text-gray-100"
                placeholder="Rule name"
              />
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full text-[13px] text-gray-500 dark:text-gray-400 bg-transparent border-none focus:outline-none focus:ring-0 p-0 mt-1 placeholder:text-gray-400"
                placeholder="Add a description..."
              />
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Step Tabs */}
          <div className="flex gap-1">
            {STEPS.map((step, index) => {
              const StepIcon = step.icon
              const isActive = currentStep === step.id
              const isPast = index < currentStepIndex
              return (
                <button
                  key={step.id}
                  onClick={() => setCurrentStep(step.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                    isActive
                      ? 'bg-gray-900 text-white'
                      : isPast
                      ? 'bg-green-50 dark:bg-green-900/30 text-green-700 hover:bg-green-100 dark:hover:bg-green-900/40'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <StepIcon className="w-4 h-4" />
                  {step.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Trigger */}
          {currentStep === 'trigger' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-[14px] font-semibold text-gray-900 dark:text-gray-100 mb-4">When should this rule trigger?</h3>

                {/* Event Type Selector */}
                <div className="mb-4">
                  <label className="block text-[12px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">Event Type</label>
                  <select
                    value={triggerType}
                    onChange={(e) => {
                      const newType = e.target.value as TriggerType
                      setTriggerType(newType)
                      // Clear model/signal when switching between model-based and non-model triggers
                      if (isModelRequired(newType)) {
                        setSignalName('')
                      } else {
                        setTriggerModel('')
                        setTriggerConditions([])
                      }
                    }}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-[13px] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  >
                    <optgroup label="Model Events">
                      <option value="model_created">Record Created</option>
                      <option value="model_updated">Record Updated</option>
                      <option value="model_deleted">Record Deleted</option>
                      <option value="stage_changed">Stage Changed</option>
                      <option value="status_changed">Status Changed</option>
                      <option value="field_changed">Field Changed</option>
                      <option value="scheduled">Scheduled (Time-based)</option>
                    </optgroup>
                    <optgroup label="System Events">
                      <option value="signal">Django Signal</option>
                      <option value="view_action">View Action</option>
                      <option value="manual">Manual Trigger</option>
                    </optgroup>
                  </select>
                </div>

                {/* Model Selector - only for model-based triggers */}
                {isModelRequired(triggerType) && (
                  <div className="mb-4">
                    <label className="block text-[12px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">Model</label>
                    <select
                      value={triggerModel}
                      onChange={(e) => {
                        setTriggerModel(e.target.value)
                        setTriggerConditions([])
                      }}
                      className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-[13px] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    >
                      <option value="">Select a model</option>
                      {models.map((model) => (
                        <option key={model.key} value={model.key}>{model.display_name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Signal/Action Selector - only for non-model triggers */}
                {!isModelRequired(triggerType) && (
                  <div className="mb-4">
                    <label className="block text-[12px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      {triggerType === 'signal' ? 'Signal Name' : triggerType === 'view_action' ? 'Action Name' : 'Trigger Name'}
                    </label>
                    <select
                      value={signalName}
                      onChange={(e) => setSignalName(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-[13px] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    >
                      <option value="">Select a {triggerType === 'signal' ? 'signal' : triggerType === 'view_action' ? 'action' : 'trigger'}...</option>
                      {SIGNAL_OPTIONS.filter(opt => opt.type === triggerType).map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    <p className="mt-1.5 text-[11px] text-gray-500 dark:text-gray-400">
                      {triggerType === 'signal' && 'Triggered by Django signals (password reset, email verification, etc.)'}
                      {triggerType === 'view_action' && 'Triggered when specific view actions occur (booking link sent, etc.)'}
                      {triggerType === 'manual' && 'Triggered manually via the admin broadcast feature'}
                    </p>
                  </div>
                )}
              </div>

              {/* Schedule Configuration for time-based triggers */}
              {triggerType === 'scheduled' && triggerModel && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 space-y-4">
                  <div className="flex items-center gap-2 text-[13px] font-medium text-blue-900 dark:text-blue-100">
                    <Calendar className="w-4 h-4" />
                    <span>Schedule Configuration</span>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[12px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">Date/Time Field</label>
                      <select
                        value={scheduleConfig.datetime_field}
                        onChange={(e) => setScheduleConfig({ ...scheduleConfig, datetime_field: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-[13px] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900"
                      >
                        <option value="">Select field</option>
                        {modelFields
                          .filter(f => f.type === 'DateTimeField' || f.type === 'DateField')
                          .map((field) => (
                            <option key={field.name} value={field.name}>{field.verbose_name}</option>
                          ))
                        }
                      </select>
                    </div>
                    <div>
                      <label className="block text-[12px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">Hours</label>
                      <input
                        type="number"
                        min="1"
                        max="720"
                        value={scheduleConfig.offset_hours}
                        onChange={(e) => setScheduleConfig({ ...scheduleConfig, offset_hours: parseInt(e.target.value) || 24 })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-[13px] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">Timing</label>
                      <select
                        value={scheduleConfig.offset_type}
                        onChange={(e) => setScheduleConfig({ ...scheduleConfig, offset_type: e.target.value as 'before' | 'after' })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-[13px] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900"
                      >
                        <option value="before">Before</option>
                        <option value="after">After</option>
                      </select>
                    </div>
                  </div>

                  {scheduleConfig.datetime_field && (
                    <div className="text-[12px] text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/40 px-3 py-2 rounded">
                      This rule will trigger <strong>{scheduleConfig.offset_hours} hours {scheduleConfig.offset_type}</strong> the{' '}
                      <strong>{modelFields.find(f => f.name === scheduleConfig.datetime_field)?.verbose_name || scheduleConfig.datetime_field}</strong>
                    </div>
                  )}
                </div>
              )}

              {/* Summary box for model-based triggers */}
              {isModelRequired(triggerType) && triggerModel && triggerType !== 'scheduled' && (
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 text-[13px] text-gray-700 dark:text-gray-300">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span>This rule will run when a <strong>{selectedModel?.display_name}</strong> is <strong>{triggerLabels[triggerType]?.toLowerCase()}</strong></span>
                  </div>
                </div>
              )}

              {/* Summary box for non-model triggers */}
              {!isModelRequired(triggerType) && signalName && (
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 text-[13px] text-gray-700 dark:text-gray-300">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span>
                      This rule will run when <strong>{SIGNAL_OPTIONS.find(o => o.value === signalName)?.label || signalName}</strong>
                      {triggerType === 'signal' && ' signal is triggered'}
                      {triggerType === 'view_action' && ' action occurs'}
                      {triggerType === 'manual' && ' is triggered manually'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Conditions */}
          {currentStep === 'conditions' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-[14px] font-semibold text-gray-900 dark:text-gray-100 mb-2">Filter conditions</h3>
                <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-4">Optional: Only run when these conditions are met</p>

                {!isModelRequired(triggerType) ? (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-[13px] text-blue-700 dark:text-blue-300">
                      Conditions are not available for {triggerType === 'signal' ? 'Django Signal' : triggerType === 'view_action' ? 'View Action' : 'Manual'} triggers.
                      These triggers run based on the signal/action name only.
                    </p>
                  </div>
                ) : !triggerModel ? (
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <p className="text-[13px] text-amber-700 dark:text-amber-300">Please select a trigger model first</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {triggerConditions.map((condition, index) => {
                      const conditionField = modelFields.find(f => f.name === condition.field)
                      const operators = getOperatorsForFieldType(
                        conditionField?.type || 'CharField',
                        !!(conditionField?.choices && conditionField.choices.length > 0)
                      )
                      return (
                        <div key={index} className="flex items-center gap-2 p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                          <FieldSelector
                            fields={modelFields}
                            value={condition.field}
                            onChange={(value) => updateCondition(index, { field: value, value: '' })}
                            placeholder="Select field"
                            className="flex-1"
                            showSearch={modelFields.length >= 10}
                          />
                          <select
                            value={condition.operator}
                            onChange={(e) => updateCondition(index, { operator: e.target.value as TriggerCondition['operator'] })}
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-[13px] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                          >
                            {Object.entries(operators).map(([value, label]) => (
                              <option key={value} value={value}>{label}</option>
                            ))}
                          </select>
                          {!['is_empty', 'is_not_empty'].includes(condition.operator) && (
                            <SmartValueInput
                              field={conditionField}
                              value={condition.value}
                              onChange={(value) => updateCondition(index, { value })}
                              placeholder="Value"
                              className="flex-1"
                              operator={condition.operator}
                            />
                          )}
                          <button
                            onClick={() => removeCondition(index)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )
                    })}

                    <button
                      onClick={addCondition}
                      className="flex items-center gap-2 px-3 py-2 text-[13px] font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add Condition
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Action */}
          {currentStep === 'action' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-[14px] font-semibold text-gray-900 dark:text-gray-100 mb-4">What should happen?</h3>

                {/* Action Type Cards */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {[
                    { type: 'send_webhook' as ActionType, icon: Send, label: 'Send Webhook', desc: 'POST to external URL' },
                    { type: 'send_notification' as ActionType, icon: Bell, label: 'Send Notification', desc: 'Email or in-app' },
                    { type: 'update_field' as ActionType, icon: Pencil, label: 'Update Field', desc: 'Modify record data' },
                    { type: 'create_activity' as ActionType, icon: FileText, label: 'Log Activity', desc: 'Add activity log' },
                  ].map(({ type, icon: Icon, label, desc }) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setActionType(type)
                        if (type === 'send_webhook') setActionConfig({ url: '', method: 'POST', headers: {}, payload_template: {} })
                        else if (type === 'send_notification') setActionConfig({ channel: 'email', recipient_type: 'assigned_user', title_template: '', body_template: '' })
                        else if (type === 'update_field') setActionConfig({ target: 'self', field: '', value: '', value_type: 'static' })
                        else if (type === 'create_activity') setActionConfig({ activity_type: 'note', content_template: '' })
                      }}
                      className={`flex items-center gap-3 p-4 border rounded-lg transition-colors ${
                        actionType === type ? 'border-gray-900 dark:border-gray-100 bg-gray-50 dark:bg-gray-800' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-900'
                      }`}
                    >
                      <Icon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      <div className="text-left">
                        <div className="text-[13px] font-medium text-gray-900 dark:text-gray-100">{label}</div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400">{desc}</div>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Action Configuration */}
                {actionType === 'send_webhook' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[12px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">Webhook URL</label>
                      <input
                        type="url"
                        value={(actionConfig as { url?: string }).url || ''}
                        onChange={(e) => setActionConfig({ ...actionConfig, url: e.target.value })}
                        className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-[13px] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                        placeholder="https://example.com/webhook"
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">HTTP Method</label>
                      <select
                        value={(actionConfig as { method?: string }).method || 'POST'}
                        onChange={(e) => setActionConfig({ ...actionConfig, method: e.target.value })}
                        className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-[13px] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                      >
                        <option value="POST">POST</option>
                        <option value="PUT">PUT</option>
                        <option value="PATCH">PATCH</option>
                      </select>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[12px] font-medium text-gray-700 dark:text-gray-300">Payload Template (JSON)</label>
                        <VariablePicker
                          fields={modelFields}
                          onSelect={(variable) => {
                            navigator.clipboard.writeText(variable)
                            setToast({ message: `Copied ${variable} to clipboard`, type: 'success' })
                          }}
                        />
                      </div>
                      <textarea
                        value={
                          typeof (actionConfig as { payload_template?: unknown }).payload_template === 'object'
                            ? JSON.stringify((actionConfig as { payload_template?: unknown }).payload_template, null, 2)
                            : ''
                        }
                        onChange={(e) => {
                          try {
                            const parsed = JSON.parse(e.target.value)
                            setActionConfig({ ...actionConfig, payload_template: parsed })
                          } catch {
                            // Allow invalid JSON while typing
                          }
                        }}
                        className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-[13px] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent font-mono"
                        rows={6}
                        placeholder={'{\n  "event": "{{trigger_type}}",\n  "data": "{{object}}"\n}'}
                      />
                    </div>
                  </div>
                )}

                {actionType === 'send_notification' && (() => {
                  const useTemplate = (actionConfig as { use_template?: boolean }).use_template === true
                  const selectedTemplateId = (actionConfig as { notification_template?: string }).notification_template
                  const selectedTemplate = notificationTemplates.find(t => t.id === selectedTemplateId)

                  return (
                    <div className="space-y-4">
                      {/* Template Mode Toggle */}
                      <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 p-1 bg-gray-50 dark:bg-gray-800">
                        <button
                          type="button"
                          onClick={() => setActionConfig({
                            ...actionConfig,
                            use_template: false,
                            notification_template: undefined,
                          })}
                          className={`flex-1 px-3 py-2 text-[13px] font-medium rounded-md transition-colors ${
                            !useTemplate ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                          }`}
                        >
                          Custom Template
                        </button>
                        <button
                          type="button"
                          onClick={() => setActionConfig({
                            ...actionConfig,
                            use_template: true,
                            title_template: undefined,
                            body_template: undefined,
                          })}
                          className={`flex-1 px-3 py-2 text-[13px] font-medium rounded-md transition-colors ${
                            useTemplate ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                          }`}
                        >
                          Use Saved Template
                        </button>
                      </div>

                      {useTemplate ? (
                        <>
                          {/* Template Selector */}
                          <div>
                            <label className="block text-[12px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">Notification Template</label>
                            {isLoadingTemplates ? (
                              <div className="flex items-center gap-2 text-[13px] text-gray-500 dark:text-gray-400 py-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Loading templates...
                              </div>
                            ) : notificationTemplates.length === 0 ? (
                              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-[13px] text-amber-700 dark:text-amber-300">
                                No notification templates found. Create templates in the Notifications section.
                              </div>
                            ) : (
                              <select
                                value={selectedTemplateId || ''}
                                onChange={(e) => {
                                  const template = notificationTemplates.find(t => t.id === e.target.value)
                                  setActionConfig({
                                    ...actionConfig,
                                    use_template: true,
                                    notification_template: e.target.value || undefined,
                                    channel: template?.default_channel || (actionConfig as { channel?: string }).channel,
                                    recipient_type: template?.recipient_type || (actionConfig as { recipient_type?: string }).recipient_type,
                                  })
                                }}
                                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-[13px] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                              >
                                <option value="">Select a template...</option>
                                {notificationTemplates.map((template) => (
                                  <option key={template.id} value={template.id}>
                                    {template.name} ({template.template_type})
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>

                          {/* Template Preview */}
                          {selectedTemplate && (
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                              <div className="text-[12px] font-medium text-blue-700 dark:text-blue-300 mb-1">Selected Template</div>
                              <div className="text-[13px] text-blue-900 dark:text-blue-100">{selectedTemplate.name}</div>
                              <div className="text-[11px] text-blue-600 dark:text-blue-400 mt-1">
                                Type: {selectedTemplate.template_type} · Channel: {selectedTemplate.default_channel} · Recipient: {selectedTemplate.recipient_type}
                              </div>
                            </div>
                          )}

                          {/* Override Options */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[12px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">Channel Override</label>
                              <select
                                value={(actionConfig as { channel?: string }).channel || selectedTemplate?.default_channel || 'email'}
                                onChange={(e) => setActionConfig({ ...actionConfig, channel: e.target.value })}
                                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-[13px] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                              >
                                <option value="email">Email</option>
                                <option value="in_app">In-App</option>
                                <option value="both">Both</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[12px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">Recipient Override</label>
                              <select
                                value={(actionConfig as { recipient_type?: string }).recipient_type || selectedTemplate?.recipient_type || 'recruiter'}
                                onChange={(e) => setActionConfig({ ...actionConfig, recipient_type: e.target.value })}
                                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-[13px] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                              >
                                {Object.entries(AutomationRecipientTypeGroups).map(([group, types]) => (
                                  <optgroup key={group} label={group}>
                                    {types.map((type) => (
                                      <option key={type} value={type}>
                                        {AutomationRecipientTypes[type as keyof typeof AutomationRecipientTypes]}
                                      </option>
                                    ))}
                                  </optgroup>
                                ))}
                              </select>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Inline Template Mode */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[12px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">Channel</label>
                              <select
                                value={(actionConfig as { channel?: string }).channel || 'email'}
                                onChange={(e) => setActionConfig({ ...actionConfig, channel: e.target.value })}
                                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-[13px] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                              >
                                <option value="email">Email</option>
                                <option value="in_app">In-App</option>
                                <option value="both">Both</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[12px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">Send To</label>
                              <select
                                value={(actionConfig as { recipient_type?: string }).recipient_type || 'assigned_user'}
                                onChange={(e) => setActionConfig({ ...actionConfig, recipient_type: e.target.value })}
                                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-[13px] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                              >
                                {Object.entries(AutomationRecipientTypeGroups).map(([group, types]) => (
                                  <optgroup key={group} label={group}>
                                    {types.map((type) => (
                                      <option key={type} value={type}>
                                        {AutomationRecipientTypes[type as keyof typeof AutomationRecipientTypes]}
                                      </option>
                                    ))}
                                  </optgroup>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <label className="text-[12px] font-medium text-gray-700 dark:text-gray-300">Notification Title</label>
                              <VariablePicker
                                fields={modelFields}
                                onSelect={(variable) => {
                                  const currentValue = (actionConfig as { title_template?: string }).title_template || ''
                                  setActionConfig({ ...actionConfig, title_template: currentValue + variable })
                                }}
                              />
                            </div>
                            <input
                              type="text"
                              value={(actionConfig as { title_template?: string }).title_template || ''}
                              onChange={(e) => setActionConfig({ ...actionConfig, title_template: e.target.value })}
                              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-[13px] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                              placeholder="New lead: {{name}}"
                            />
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <label className="text-[12px] font-medium text-gray-700 dark:text-gray-300">Notification Body</label>
                              <VariablePicker
                                fields={modelFields}
                                onSelect={(variable) => {
                                  const currentValue = (actionConfig as { body_template?: string }).body_template || ''
                                  setActionConfig({ ...actionConfig, body_template: currentValue + variable })
                                }}
                              />
                            </div>
                            <textarea
                              value={(actionConfig as { body_template?: string }).body_template || ''}
                              onChange={(e) => setActionConfig({ ...actionConfig, body_template: e.target.value })}
                              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-[13px] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                              rows={4}
                              placeholder="A new lead has been created: {{name}} from {{company_name}}"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  )
                })()}

                {actionType === 'update_field' && (() => {
                  const selectedTargetField = targetModelFields.find(f => f.name === (actionConfig as { field?: string }).field)
                  const valueType = (actionConfig as { value_type?: string }).value_type || 'static'
                  const isRelatedTarget = (actionConfig as { target?: string }).target === 'related'
                  const hasRelatedModel = !!(actionConfig as { related_model?: string }).related_model
                  const relationFields = modelFields.filter(f => f.is_relation && f.related_model)
                  const availableRelatedModels = relationFields
                    .map(f => ({
                      fieldName: f.name,
                      fieldVerboseName: f.verbose_name,
                      modelKey: f.related_model!,
                      modelDisplayName: models.find(m => m.key === f.related_model)?.display_name || f.related_model!,
                    }))
                    .filter((v, i, arr) => arr.findIndex(x => x.modelKey === v.modelKey) === i)
                  const hasNoRelations = relationFields.length === 0

                  return (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[12px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">Target Record</label>
                          <select
                            value={(actionConfig as { target?: string }).target || 'self'}
                            onChange={(e) => setActionConfig({ ...actionConfig, target: e.target.value, related_model: '', relation_field: '', field: '', value: '' })}
                            className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-[13px] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                          >
                            <option value="self">Same record (trigger model)</option>
                            <option value="related" disabled={hasNoRelations}>Related record {hasNoRelations ? '(no FK relations)' : ''}</option>
                          </select>
                        </div>
                        {isRelatedTarget && (
                          <div>
                            <label className="block text-[12px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">Related Record (via FK)</label>
                            <select
                              value={(actionConfig as { related_model?: string }).related_model || ''}
                              onChange={(e) => {
                                const selectedRelation = availableRelatedModels.find(r => r.modelKey === e.target.value)
                                setActionConfig({ ...actionConfig, related_model: e.target.value, relation_field: selectedRelation?.fieldName || '', field: '', value: '' })
                              }}
                              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-[13px] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                            >
                              <option value="">Select related model</option>
                              {availableRelatedModels.map((relation) => (
                                <option key={relation.modelKey} value={relation.modelKey}>{relation.modelDisplayName} (via {relation.fieldVerboseName})</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[12px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">Field to Update</label>
                          <FieldSelector
                            fields={targetModelFields}
                            value={(actionConfig as { field?: string }).field || ''}
                            onChange={(value) => setActionConfig({ ...actionConfig, field: value, value: '' })}
                            placeholder="Select field"
                            className="w-full"
                            disabled={isRelatedTarget && !hasRelatedModel}
                            showSearch={targetModelFields.length >= 10}
                          />
                        </div>
                        <div>
                          <label className="block text-[12px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">Value Type</label>
                          <select
                            value={valueType}
                            onChange={(e) => setActionConfig({ ...actionConfig, value_type: e.target.value, value: '' })}
                            className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-[13px] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                          >
                            <option value="static">Static value</option>
                            <option value="template">Template (with variables)</option>
                            <option value="copy_field">Copy from another field</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-[12px] font-medium text-gray-700 dark:text-gray-300">{valueType === 'copy_field' ? 'Source Field' : 'New Value'}</label>
                          {valueType === 'template' && (
                            <VariablePicker
                              fields={modelFields}
                              onSelect={(variable) => {
                                const currentValue = (actionConfig as { value?: string }).value || ''
                                setActionConfig({ ...actionConfig, value: currentValue + variable })
                              }}
                            />
                          )}
                        </div>
                        {valueType === 'copy_field' ? (
                          <FieldSelector
                            fields={modelFields}
                            value={(actionConfig as { value?: string }).value || ''}
                            onChange={(value) => setActionConfig({ ...actionConfig, value })}
                            placeholder="Select source field"
                            className="w-full"
                            showSearch={modelFields.length >= 10}
                          />
                        ) : valueType === 'static' && selectedTargetField ? (
                          <SmartValueInput
                            field={selectedTargetField}
                            value={(actionConfig as { value?: string }).value || ''}
                            onChange={(value) => setActionConfig({ ...actionConfig, value: value as string })}
                            placeholder="Enter value"
                            className="w-full"
                          />
                        ) : (
                          <input
                            type="text"
                            value={(actionConfig as { value?: string }).value || ''}
                            onChange={(e) => setActionConfig({ ...actionConfig, value: e.target.value })}
                            className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-[13px] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                            placeholder={valueType === 'template' ? 'Processed by {{assigned_to}}' : 'Enter value'}
                          />
                        )}
                      </div>
                    </div>
                  )
                })()}

                {actionType === 'create_activity' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[12px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">Activity Type</label>
                      <select
                        value={(actionConfig as { activity_type?: string }).activity_type || 'note'}
                        onChange={(e) => setActionConfig({ ...actionConfig, activity_type: e.target.value })}
                        className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-[13px] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                      >
                        <option value="note">Note</option>
                        <option value="status_change">Status Change</option>
                        <option value="email_sent">Email Sent</option>
                        <option value="call">Call</option>
                        <option value="meeting">Meeting</option>
                        <option value="task">Task</option>
                      </select>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[12px] font-medium text-gray-700 dark:text-gray-300">Activity Content</label>
                        <VariablePicker
                          fields={modelFields}
                          onSelect={(variable) => {
                            const currentValue = (actionConfig as { content_template?: string }).content_template || ''
                            setActionConfig({ ...actionConfig, content_template: currentValue + variable })
                          }}
                        />
                      </div>
                      <textarea
                        value={(actionConfig as { content_template?: string }).content_template || ''}
                        onChange={(e) => setActionConfig({ ...actionConfig, content_template: e.target.value })}
                        className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-[13px] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                        rows={4}
                        placeholder="Lead stage changed from {{old_stage}} to {{new_stage}}"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {currentStep === 'review' && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 text-[12px] font-medium text-gray-500 dark:text-gray-400 mb-2">
                    <Zap className="w-4 h-4" />
                    Trigger
                  </div>
                  <p className="text-[13px] text-gray-900 dark:text-gray-100">
                    {isModelRequired(triggerType) ? (
                      <>
                        {selectedModel?.display_name || 'Not selected'} - {triggerLabels[triggerType]}
                      </>
                    ) : (
                      <>
                        {triggerLabels[triggerType]}: {SIGNAL_OPTIONS.find(o => o.value === signalName)?.label || signalName || 'Not selected'}
                      </>
                    )}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 text-[12px] font-medium text-gray-500 dark:text-gray-400 mb-2">
                    <Filter className="w-4 h-4" />
                    Conditions
                  </div>
                  {triggerConditions.length === 0 ? (
                    <p className="text-[13px] text-gray-500 dark:text-gray-400 italic">No conditions (runs for all records)</p>
                  ) : (
                    <div className="space-y-1.5">
                      {triggerConditions.map((condition, index) => {
                        const conditionField = modelFields.find(f => f.name === condition.field)
                        const operatorLabels: Record<string, string> = {
                          equals: '=',
                          not_equals: '≠',
                          contains: 'contains',
                          not_contains: 'not contains',
                          is_empty: 'is empty',
                          is_not_empty: 'is not empty',
                          in: 'in',
                          not_in: 'not in',
                          gt: '>',
                          gte: '≥',
                          lt: '<',
                          lte: '≤',
                        }
                        return (
                          <div key={index} className="flex items-center gap-1.5 text-[12px]">
                            <span className="font-medium text-gray-700 dark:text-gray-300">
                              {conditionField?.verbose_name || condition.field}
                            </span>
                            <span className="text-gray-500 dark:text-gray-400">
                              {operatorLabels[condition.operator] || condition.operator}
                            </span>
                            {!['is_empty', 'is_not_empty'].includes(condition.operator) && (
                              <span className="font-medium text-gray-900 dark:text-gray-100">
                                {Array.isArray(condition.value) ? condition.value.join(', ') : condition.value || '(empty)'}
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 col-span-2">
                  <div className="flex items-center gap-2 text-[12px] font-medium text-gray-500 dark:text-gray-400 mb-2">
                    <Play className="w-4 h-4" />
                    Action
                  </div>

                  {actionType === 'send_webhook' && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[11px] font-medium rounded">
                          {(actionConfig as { method?: string }).method || 'POST'}
                        </span>
                        <span className="text-[13px] text-gray-900 dark:text-gray-100 font-mono truncate">
                          {(actionConfig as { url?: string }).url || '(no URL configured)'}
                        </span>
                      </div>
                      {(actionConfig as { payload_template?: object }).payload_template &&
                       Object.keys((actionConfig as { payload_template?: object }).payload_template || {}).length > 0 && (
                        <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded text-[11px] font-mono text-gray-600 dark:text-gray-300 max-h-20 overflow-auto">
                          {JSON.stringify((actionConfig as { payload_template?: object }).payload_template, null, 2)}
                        </div>
                      )}
                    </div>
                  )}

                  {actionType === 'send_notification' && (() => {
                    const useTemplate = (actionConfig as { use_template?: boolean }).use_template === true
                    const templateId = (actionConfig as { notification_template?: string }).notification_template
                    // Use notification_template_info from rule (already embedded by backend)
                    const templateInfo = rule?.notification_template_info
                    // Also try lookup from templates list as fallback
                    const effectiveTemplateId = templateId || rule?.notification_template
                    const selectedTemplate = templateInfo || notificationTemplates.find(t => t.id === effectiveTemplateId)
                    // Consider it template mode if use_template is true OR if there's a template ID/info set
                    const isTemplateMode = useTemplate || !!effectiveTemplateId || !!templateInfo

                    const channel = (actionConfig as { channel?: string }).channel || templateInfo?.default_channel || 'email'
                    const recipientType = (actionConfig as { recipient_type?: string }).recipient_type || templateInfo?.recipient_type || 'assigned_user'
                    const channelLabels: Record<string, string> = {
                      email: 'Email',
                      in_app: 'In-App',
                      both: 'Email + In-App',
                    }

                    return (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-[11px] font-medium rounded">
                            {channelLabels[channel] || channel}
                          </span>
                          <span className="text-[12px] text-gray-500 dark:text-gray-400">→</span>
                          <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-[11px] font-medium rounded">
                            {AutomationRecipientTypes[recipientType as keyof typeof AutomationRecipientTypes] || recipientType}
                          </span>
                        </div>
                        {isTemplateMode ? (
                          <div className="p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
                            <div className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">Using Template</div>
                            {selectedTemplate ? (
                              <div className="text-[13px] text-blue-900 dark:text-blue-100">{selectedTemplate.name}</div>
                            ) : isLoadingTemplates ? (
                              <div className="flex items-center gap-2 text-[13px] text-blue-700 dark:text-blue-300">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Loading...
                              </div>
                            ) : (
                              <div className="text-[13px] text-amber-700 dark:text-amber-300">
                                Template not found
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div>
                              <span className="text-[11px] text-gray-500 dark:text-gray-400">Title: </span>
                              <span className="text-[12px] text-gray-900 dark:text-gray-100">
                                {(actionConfig as { title_template?: string }).title_template || <span className="italic text-gray-400">(no title)</span>}
                              </span>
                            </div>
                            <div>
                              <span className="text-[11px] text-gray-500 dark:text-gray-400">Body: </span>
                              <span className="text-[12px] text-gray-700 dark:text-gray-300 line-clamp-2">
                                {(actionConfig as { body_template?: string }).body_template || <span className="italic text-gray-400">(no body)</span>}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })()}

                  {actionType === 'update_field' && (() => {
                    const target = (actionConfig as { target?: string }).target || 'self'
                    const field = (actionConfig as { field?: string }).field
                    const value = (actionConfig as { value?: string }).value
                    const valueType = (actionConfig as { value_type?: string }).value_type || 'static'
                    const relatedModel = (actionConfig as { related_model?: string }).related_model
                    const targetField = targetModelFields.find(f => f.name === field)

                    return (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-[11px] font-medium rounded">
                            {target === 'self' ? 'Same Record' : `Related: ${relatedModel?.split('.')[1] || relatedModel}`}
                          </span>
                        </div>
                        <div className="text-[13px]">
                          <span className="font-medium text-gray-700 dark:text-gray-300">
                            {targetField?.verbose_name || field || '(no field selected)'}
                          </span>
                          <span className="text-gray-500 dark:text-gray-400 mx-1">←</span>
                          <span className="text-gray-900 dark:text-gray-100">
                            {valueType === 'copy_field' ? (
                              <span className="font-mono text-blue-600">{`{{${value}}}`}</span>
                            ) : valueType === 'template' ? (
                              <span className="font-mono">{value || '(empty)'}</span>
                            ) : (
                              value || '(empty)'
                            )}
                          </span>
                        </div>
                      </div>
                    )
                  })()}

                  {actionType === 'create_activity' && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-[11px] font-medium rounded capitalize">
                          {(actionConfig as { activity_type?: string }).activity_type || 'note'}
                        </span>
                      </div>
                      {(actionConfig as { content_template?: string }).content_template && (
                        <div className="text-[12px] text-gray-700 dark:text-gray-300 line-clamp-2">
                          {(actionConfig as { content_template?: string }).content_template}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div>
                  <h4 className="text-[13px] font-medium text-gray-900 dark:text-gray-100">Rule Status</h4>
                  <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5">Enable this rule to start running it</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-gray-900 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900"></div>
                </label>
              </div>

              {/* Test Panel */}
              {!isNew && triggerModel && (
                <TestRulePanel
                  triggerModel={triggerModel}
                  sampleRecords={sampleRecords}
                  isLoadingRecords={isLoadingRecords}
                  isTesting={isTesting}
                  testResult={testResult}
                  onTest={testRule}
                  onRefreshRecords={refetchRecords}
                  onReset={resetTest}
                />
              )}

              {/* Execution Stats */}
              {!isNew && rule && rule.total_executions > 0 && (
                <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                  <h4 className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 mb-3">Execution Stats</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="text-xl font-semibold text-gray-900 dark:text-gray-100">{rule.total_executions}</div>
                      <div className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Total Runs</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
                      <div className="text-xl font-semibold text-green-600">{rule.total_success}</div>
                      <div className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Successful</div>
                    </div>
                    <div className="text-center p-3 bg-red-50 dark:bg-red-900/30 rounded-lg">
                      <div className="text-xl font-semibold text-red-600">{rule.total_failed}</div>
                      <div className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Failed</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Execution History */}
              {!isNew && rule?.id && (
                <ExecutionHistoryPanel ruleId={rule.id} />
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 px-6 py-4 bg-gray-50 dark:bg-gray-800 flex items-center justify-between">
          <div>
            {canGoPrev ? (
              <button
                onClick={goToPrevStep}
                className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Previous
              </button>
            ) : (
              <div />
            )}
          </div>
          <div className="flex items-center gap-3">
            {currentStep !== 'review' ? (
              <button
                onClick={goToNextStep}
                disabled={currentStep === 'trigger' && (isModelRequired(triggerType) ? !triggerModel : !signalName)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-[13px] font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={isSaving || !name || (isModelRequired(triggerType) ? !triggerModel : !signalName)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-[13px] font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {isNew ? 'Create Rule' : 'Save Changes'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[300]">
          <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg ${
            toast.type === 'success' ? 'bg-gray-900 text-white' : 'bg-red-600 text-white'
          }`}>
            {toast.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span className="text-[13px]">{toast.message}</span>
            <button onClick={() => setToast(null)} className="p-0.5 hover:bg-white/20 rounded ml-2">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
