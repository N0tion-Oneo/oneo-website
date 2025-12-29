import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Save,
  Loader2,
  AlertCircle,
  Check,
  X,
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
} from 'lucide-react'
import {
  useRuleEditor,
  TriggerType,
  ActionType,
  TriggerCondition,
  UpdateRuleData,
  ModelField,
} from '@/hooks/useAutomations'
import TestRulePanel from '@/components/automations/TestRulePanel'
import ExecutionHistoryPanel from '@/components/automations/ExecutionHistoryPanel'

// Trigger type labels
const triggerLabels: Record<TriggerType, string> = {
  model_created: 'Record Created',
  model_updated: 'Record Updated',
  model_deleted: 'Record Deleted',
  stage_changed: 'Stage Changed',
  status_changed: 'Status Changed',
  field_changed: 'Field Changed',
  scheduled: 'Scheduled',
  manual: 'Manual Trigger',
  signal: 'Django Signal',
  view_action: 'View Action',
}

// Condition operators - contextual based on field type
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
  // Default operators for text/other fields
  return {
    equals: 'equals',
    not_equals: 'does not equal',
    contains: 'contains',
    not_contains: 'does not contain',
    is_empty: 'is empty',
    is_not_empty: 'is not empty',
  }
}

// Field type icon mapping
const getFieldIcon = (field: ModelField) => {
  if (field.is_relation) return <Link className="w-3 h-3" />
  if (field.choices && field.choices.length > 0) return <List className="w-3 h-3" />
  if (field.type === 'BooleanField') return <ToggleLeft className="w-3 h-3" />
  if (field.type === 'DateField' || field.type === 'DateTimeField') return <Calendar className="w-3 h-3" />
  if (field.type === 'IntegerField' || field.type === 'DecimalField' || field.type === 'FloatField') return <Hash className="w-3 h-3" />
  return <Type className="w-3 h-3" />
}

// Field type badge color
const getFieldBadgeColor = (field: ModelField) => {
  if (field.is_relation) return 'bg-purple-100 text-purple-700'
  if (field.choices && field.choices.length > 0) return 'bg-blue-100 text-blue-700'
  if (field.type === 'BooleanField') return 'bg-green-100 text-green-700'
  if (field.type === 'DateField' || field.type === 'DateTimeField') return 'bg-orange-100 text-orange-700'
  return 'bg-gray-100 text-gray-700'
}

// Smart Value Input Component - renders different inputs based on field type
interface SmartValueInputProps {
  field: ModelField | undefined
  value: string | string[]
  onChange: (value: string | string[]) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

function SmartValueInput({ field, value, onChange, placeholder, className = '', disabled }: SmartValueInputProps) {
  const stringValue = Array.isArray(value) ? value.join(', ') : value

  // Boolean field - toggle buttons
  if (field?.type === 'BooleanField') {
    return (
      <div className={`flex gap-2 ${className}`}>
        <button
          type="button"
          onClick={() => onChange('true')}
          disabled={disabled}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            stringValue === 'true'
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          True
        </button>
        <button
          type="button"
          onClick={() => onChange('false')}
          disabled={disabled}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            stringValue === 'false'
              ? 'bg-red-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          False
        </button>
      </div>
    )
  }

  // Choice field - dropdown
  if (field?.choices && field.choices.length > 0) {
    return (
      <select
        value={stringValue}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${className} ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-100' : ''}`}
      >
        <option value="">Select value</option>
        {field.choices.map((choice) => (
          <option key={choice.value} value={choice.value}>
            {choice.label}
          </option>
        ))}
      </select>
    )
  }

  // Date field
  if (field?.type === 'DateField') {
    return (
      <input
        type="date"
        value={stringValue}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${className} ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-100' : ''}`}
      />
    )
  }

  // DateTime field
  if (field?.type === 'DateTimeField') {
    return (
      <input
        type="datetime-local"
        value={stringValue}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${className} ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-100' : ''}`}
      />
    )
  }

  // Number fields
  if (field?.type === 'IntegerField' || field?.type === 'DecimalField' || field?.type === 'FloatField') {
    return (
      <input
        type="number"
        value={stringValue}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        step={field.type === 'IntegerField' ? '1' : 'any'}
        className={`px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${className} ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-100' : ''}`}
      />
    )
  }

  // Default text input
  return (
    <input
      type="text"
      value={stringValue}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      className={`px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${className} ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-100' : ''}`}
    />
  )
}

// Variable Picker Component - helps insert template variables
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
        className={`flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded ${buttonClassName}`}
      >
        <Variable className="w-3 h-3" />
        Insert Variable
      </button>
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-1 w-64 bg-white border rounded-lg shadow-lg z-20 max-h-64 overflow-hidden">
            <div className="p-2 border-b">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search fields..."
                  className="w-full pl-8 pr-3 py-1.5 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
            </div>
            <div className="overflow-y-auto max-h-48">
              {filteredFields.length === 0 ? (
                <div className="p-3 text-sm text-gray-500 text-center">No fields found</div>
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
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
                  >
                    <span className={`p-1 rounded ${getFieldBadgeColor(field)}`}>
                      {getFieldIcon(field)}
                    </span>
                    <span className="flex-1 truncate">{field.verbose_name}</span>
                    <code className="text-xs text-gray-400">{`{{${field.name}}}`}</code>
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

// Field Selector with type badges
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
    // Simple select for small field lists
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${className} ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-100' : ''}`}
      >
        <option value="">{placeholder}</option>
        {fields.map((field) => (
          <option key={field.name} value={field.name}>
            {field.verbose_name}
          </option>
        ))}
      </select>
    )
  }

  // Searchable dropdown for large field lists
  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full flex items-center justify-between px-3 py-2 border rounded-lg text-sm text-left ${
          disabled ? 'opacity-50 cursor-not-allowed bg-gray-100' : 'hover:border-gray-400'
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
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-20 max-h-64 overflow-hidden">
            <div className="p-2 border-b">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search fields..."
                  className="w-full pl-8 pr-3 py-1.5 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
            </div>
            <div className="overflow-y-auto max-h-48">
              {filteredFields.length === 0 ? (
                <div className="p-3 text-sm text-gray-500 text-center">No fields found</div>
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
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                      value === field.name ? 'bg-blue-50' : ''
                    }`}
                  >
                    <span className={`p-1 rounded ${getFieldBadgeColor(field)}`}>
                      {getFieldIcon(field)}
                    </span>
                    <span className="flex-1">{field.verbose_name}</span>
                    {field.is_relation && (
                      <span className="text-xs text-purple-600">FK</span>
                    )}
                    {field.choices && field.choices.length > 0 && (
                      <span className="text-xs text-blue-600">{field.choices.length} options</span>
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

export default function RuleEditorPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
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
  } = useRuleEditor(id || null)

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [triggerModel, setTriggerModel] = useState('')
  const [triggerType, setTriggerType] = useState<TriggerType>('model_created')
  const [triggerConditions, setTriggerConditions] = useState<TriggerCondition[]>([])
  const [actionType, setActionType] = useState<ActionType>('send_webhook')
  const [actionConfig, setActionConfig] = useState<Record<string, unknown>>({})
  const [isActive, setIsActive] = useState(false)

  // UI state
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [expandedSection, setExpandedSection] = useState<'trigger' | 'conditions' | 'action' | null>('trigger')

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
      setTriggerConditions(rule.trigger_conditions || [])
      setActionType(rule.action_type)
      setActionConfig(rule.action_config as Record<string, unknown> || {})
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
      const data: UpdateRuleData = {
        name,
        description,
        trigger_model: triggerModel,
        trigger_type: triggerType,
        trigger_conditions: triggerConditions,
        action_type: actionType,
        action_config: actionConfig,
        is_active: isActive,
      }
      await saveRule(data)
      setHasUnsavedChanges(false)
      setToast({ message: 'Rule saved successfully', type: 'success' })
    } catch {
      setToast({ message: 'Failed to save rule', type: 'error' })
    }
  }

  // Handle field change
  const handleFieldChange = () => {
    setHasUnsavedChanges(true)
  }

  // Add condition
  const addCondition = () => {
    setTriggerConditions([
      ...triggerConditions,
      { field: modelFields[0]?.name || '', operator: 'equals', value: '' },
    ])
    handleFieldChange()
  }

  // Remove condition
  const removeCondition = (index: number) => {
    setTriggerConditions(triggerConditions.filter((_, i) => i !== index))
    handleFieldChange()
  }

  // Update condition
  const updateCondition = (index: number, updates: Partial<TriggerCondition>) => {
    setTriggerConditions(
      triggerConditions.map((c, i) => (i === index ? { ...c, ...updates } : c))
    )
    handleFieldChange()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!rule) {
    return (
      <div className="space-y-4 p-6">
        <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 p-4 rounded-lg">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-[13px]">Rule not found</span>
        </div>
        <button
          onClick={() => navigate('/dashboard/admin/automations')}
          className="flex items-center gap-2 text-[13px] text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Automations
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/dashboard/admin/automations')}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4 text-gray-600" />
              </button>
              <div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    handleFieldChange()
                  }}
                  className="text-[15px] font-semibold bg-transparent border-none focus:outline-none focus:ring-0 p-0 w-full text-gray-900"
                  placeholder="Rule name"
                />
                {hasUnsavedChanges && (
                  <span className="text-[11px] text-amber-600 font-medium">Unsaved changes</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => {
                    setIsActive(e.target.checked)
                    handleFieldChange()
                  }}
                  className="w-3.5 h-3.5 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                />
                <span className="text-[13px] text-gray-700">
                  {isActive ? 'Active' : 'Inactive'}
                </span>
              </label>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-[13px] font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-6">
        {/* Description */}
        <div className="mb-5">
          <textarea
            value={description}
            onChange={(e) => {
              setDescription(e.target.value)
              handleFieldChange()
            }}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none placeholder:text-gray-400"
            placeholder="Add a description for this rule..."
            rows={2}
          />
        </div>

        {/* Trigger Section */}
        <div className="bg-white rounded-lg border border-gray-200 mb-3">
          <button
            onClick={() => setExpandedSection(expandedSection === 'trigger' ? null : 'trigger')}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                <span className="text-green-600 font-semibold text-[12px]">1</span>
              </div>
              <div className="text-left">
                <h3 className="text-[13px] font-semibold text-gray-900">Trigger</h3>
                <p className="text-[12px] text-gray-500 mt-0.5">
                  {selectedModel
                    ? `When ${selectedModel.display_name} ${triggerLabels[triggerType]?.toLowerCase()}`
                    : 'Configure when this rule should run'}
                </p>
              </div>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-gray-400 transition-transform ${
                expandedSection === 'trigger' ? 'rotate-180' : ''
              }`}
            />
          </button>
          {expandedSection === 'trigger' && (
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-medium text-gray-700 mb-1.5">
                    Model
                  </label>
                  <select
                    value={triggerModel}
                    onChange={(e) => {
                      setTriggerModel(e.target.value)
                      setTriggerConditions([]) // Reset conditions when model changes
                      handleFieldChange()
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  >
                    <option value="">Select a model</option>
                    {models.map((model) => (
                      <option key={model.key} value={model.key}>
                        {model.display_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-gray-700 mb-1.5">
                    Event
                  </label>
                  <select
                    value={triggerType}
                    onChange={(e) => {
                      setTriggerType(e.target.value as TriggerType)
                      handleFieldChange()
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  >
                    {Object.entries(triggerLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Conditions Section */}
        <div className="bg-white rounded-lg border border-gray-200 mb-3">
          <button
            onClick={() => setExpandedSection(expandedSection === 'conditions' ? null : 'conditions')}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                <span className="text-amber-600 font-semibold text-[12px]">2</span>
              </div>
              <div className="text-left">
                <h3 className="text-[13px] font-semibold text-gray-900">Conditions</h3>
                <p className="text-[12px] text-gray-500 mt-0.5">
                  {triggerConditions.length > 0
                    ? `${triggerConditions.length} condition${triggerConditions.length > 1 ? 's' : ''} configured`
                    : 'Optional: Filter when the rule runs'}
                </p>
              </div>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-gray-400 transition-transform ${
                expandedSection === 'conditions' ? 'rotate-180' : ''
              }`}
            />
          </button>
          {expandedSection === 'conditions' && (
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              {!triggerModel ? (
                <p className="text-[13px] text-gray-500">Select a trigger model first</p>
              ) : (
                <>
                  {triggerConditions.map((condition, index) => {
                    const conditionField = modelFields.find(f => f.name === condition.field)
                    const operators = getOperatorsForFieldType(
                      conditionField?.type || 'CharField',
                      !!(conditionField?.choices && conditionField.choices.length > 0)
                    )
                    return (
                      <div key={index} className="flex items-center gap-2 mb-3 p-3 bg-white rounded-lg border border-gray-200">
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
                          onChange={(e) =>
                            updateCondition(index, {
                              operator: e.target.value as TriggerCondition['operator'],
                            })
                          }
                          className="px-3 py-2 border border-gray-300 rounded-lg text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                        >
                          {Object.entries(operators).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                        {!['is_empty', 'is_not_empty'].includes(condition.operator) && (
                          <SmartValueInput
                            field={conditionField}
                            value={condition.value}
                            onChange={(value) => updateCondition(index, { value: value as string })}
                            placeholder="Value"
                            className="flex-1"
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
                    className="flex items-center gap-2 px-3 py-2 text-[13px] font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Condition
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Action Section */}
        <div className="bg-white rounded-lg border border-gray-200">
          <button
            onClick={() => setExpandedSection(expandedSection === 'action' ? null : 'action')}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <span className="text-blue-600 font-semibold text-[12px]">3</span>
              </div>
              <div className="text-left">
                <h3 className="text-[13px] font-semibold text-gray-900">Action</h3>
                <p className="text-[12px] text-gray-500 mt-0.5">
                  {actionType === 'send_webhook'
                    ? `Send webhook to ${(actionConfig as { url?: string }).url || '(not configured)'}`
                    : actionType === 'send_notification'
                    ? `Send ${(actionConfig as { channel?: string }).channel || 'email'} notification`
                    : actionType === 'update_field'
                    ? `Update ${(actionConfig as { field?: string }).field || 'field'} on ${(actionConfig as { target?: string }).target === 'related' ? 'related record' : 'this record'}`
                    : actionType === 'create_activity'
                    ? `Log ${(actionConfig as { activity_type?: string }).activity_type || 'activity'}`
                    : 'Configure the action'}
                </p>
              </div>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-gray-400 transition-transform ${
                expandedSection === 'action' ? 'rotate-180' : ''
              }`}
            />
          </button>
          {expandedSection === 'action' && (
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              {/* Action Type Selection */}
              <div className="mb-4">
                <label className="block text-[12px] font-medium text-gray-700 mb-2">
                  Action Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActionType('send_webhook')
                      setActionConfig({ url: '', method: 'POST', headers: {}, payload_template: {} })
                      handleFieldChange()
                    }}
                    className={`flex items-center gap-3 p-3 border rounded-lg transition-colors ${
                      actionType === 'send_webhook'
                        ? 'border-gray-900 bg-gray-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <Send className="w-4 h-4 text-gray-600" />
                    <div className="text-left">
                      <div className="text-[13px] font-medium text-gray-900">Send Webhook</div>
                      <div className="text-[11px] text-gray-500">POST to external URL</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActionType('send_notification')
                      setActionConfig({
                        channel: 'email',
                        recipient_type: 'recruiter',
                        title_template: '',
                        body_template: '',
                      })
                      handleFieldChange()
                    }}
                    className={`flex items-center gap-3 p-3 border rounded-lg transition-colors ${
                      actionType === 'send_notification'
                        ? 'border-gray-900 bg-gray-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <Bell className="w-4 h-4 text-gray-600" />
                    <div className="text-left">
                      <div className="text-[13px] font-medium text-gray-900">Send Notification</div>
                      <div className="text-[11px] text-gray-500">Email or in-app</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActionType('update_field')
                      setActionConfig({ target: 'self', field: '', value: '', value_type: 'static' })
                      handleFieldChange()
                    }}
                    className={`flex items-center gap-3 p-3 border rounded-lg transition-colors ${
                      actionType === 'update_field'
                        ? 'border-gray-900 bg-gray-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <Pencil className="w-4 h-4 text-gray-600" />
                    <div className="text-left">
                      <div className="text-[13px] font-medium text-gray-900">Update Field</div>
                      <div className="text-[11px] text-gray-500">Modify record data</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActionType('create_activity')
                      setActionConfig({ activity_type: 'note', content_template: '' })
                      handleFieldChange()
                    }}
                    className={`flex items-center gap-3 p-3 border rounded-lg transition-colors ${
                      actionType === 'create_activity'
                        ? 'border-gray-900 bg-gray-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <FileText className="w-4 h-4 text-gray-600" />
                    <div className="text-left">
                      <div className="text-[13px] font-medium text-gray-900">Log Activity</div>
                      <div className="text-[11px] text-gray-500">Add activity log</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Action-specific configuration */}
              {actionType === 'send_webhook' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Webhook URL
                    </label>
                    <input
                      type="url"
                      value={(actionConfig as { url?: string }).url || ''}
                      onChange={(e) => {
                        setActionConfig({ ...actionConfig, url: e.target.value })
                        handleFieldChange()
                      }}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="https://example.com/webhook"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      HTTP Method
                    </label>
                    <select
                      value={(actionConfig as { method?: string }).method || 'POST'}
                      onChange={(e) => {
                        setActionConfig({ ...actionConfig, method: e.target.value })
                        handleFieldChange()
                      }}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="PATCH">PATCH</option>
                    </select>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm font-medium text-gray-700">
                        Payload Template (JSON)
                      </label>
                      <VariablePicker
                        fields={modelFields}
                        onSelect={(variable) => {
                          // For JSON payload, we need to handle this differently
                          // Just copy the variable to clipboard or show a hint
                          navigator.clipboard.writeText(variable)
                          setToast({ message: `Copied ${variable} to clipboard`, type: 'success' })
                        }}
                        buttonClassName="text-xs"
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
                          handleFieldChange()
                        } catch {
                          // Allow invalid JSON while typing
                        }
                      }}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                      rows={6}
                      placeholder={'{\n  "event": "{{trigger_type}}",\n  "data": "{{object}}"\n}'}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Click "Insert Variable" to copy a variable to paste into the JSON
                    </p>
                  </div>
                </div>
              )}

              {actionType === 'send_notification' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Channel
                      </label>
                      <select
                        value={(actionConfig as { channel?: string }).channel || 'email'}
                        onChange={(e) => {
                          setActionConfig({ ...actionConfig, channel: e.target.value })
                          handleFieldChange()
                        }}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="email">Email</option>
                        <option value="in_app">In-App</option>
                        <option value="both">Both</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Send To
                      </label>
                      <select
                        value={(actionConfig as { recipient_type?: string }).recipient_type || 'recruiter'}
                        onChange={(e) => {
                          setActionConfig({ ...actionConfig, recipient_type: e.target.value })
                          handleFieldChange()
                        }}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="recruiter">Assigned Recruiter</option>
                        <option value="company_admin">Company Admin</option>
                        <option value="candidate">Candidate</option>
                        <option value="client">Client</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm font-medium text-gray-700">
                        Notification Title
                      </label>
                      <VariablePicker
                        fields={modelFields}
                        onSelect={(variable) => {
                          const currentValue = (actionConfig as { title_template?: string }).title_template || ''
                          setActionConfig({ ...actionConfig, title_template: currentValue + variable })
                          handleFieldChange()
                        }}
                      />
                    </div>
                    <input
                      type="text"
                      value={(actionConfig as { title_template?: string }).title_template || ''}
                      onChange={(e) => {
                        setActionConfig({ ...actionConfig, title_template: e.target.value })
                        handleFieldChange()
                      }}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="New lead: {{name}}"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm font-medium text-gray-700">
                        Notification Body
                      </label>
                      <VariablePicker
                        fields={modelFields}
                        onSelect={(variable) => {
                          const currentValue = (actionConfig as { body_template?: string }).body_template || ''
                          setActionConfig({ ...actionConfig, body_template: currentValue + variable })
                          handleFieldChange()
                        }}
                      />
                    </div>
                    <textarea
                      value={(actionConfig as { body_template?: string }).body_template || ''}
                      onChange={(e) => {
                        setActionConfig({ ...actionConfig, body_template: e.target.value })
                        handleFieldChange()
                      }}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={4}
                      placeholder="A new lead has been created: {{name}} from {{company_name}}"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Click "Insert Variable" above to add dynamic values
                    </p>
                  </div>
                </div>
              )}

              {actionType === 'update_field' && (() => {
                const selectedTargetField = targetModelFields.find(
                  f => f.name === (actionConfig as { field?: string }).field
                )
                const valueType = (actionConfig as { value_type?: string }).value_type || 'static'
                const isRelatedTarget = (actionConfig as { target?: string }).target === 'related'
                const hasRelatedModel = !!(actionConfig as { related_model?: string }).related_model

                // Get related models from FK fields in the trigger model
                const relationFields = modelFields.filter(f => f.is_relation && f.related_model)
                const availableRelatedModels = relationFields
                  .map(f => ({
                    fieldName: f.name,
                    fieldVerboseName: f.verbose_name,
                    modelKey: f.related_model!,
                    modelDisplayName: models.find(m => m.key === f.related_model)?.display_name || f.related_model!,
                  }))
                  .filter((v, i, arr) => arr.findIndex(x => x.modelKey === v.modelKey) === i) // unique by modelKey

                const hasNoRelations = relationFields.length === 0

                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Target Record
                        </label>
                        <select
                          value={(actionConfig as { target?: string }).target || 'self'}
                          onChange={(e) => {
                            setActionConfig({ ...actionConfig, target: e.target.value, related_model: '', relation_field: '', field: '', value: '' })
                            handleFieldChange()
                          }}
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="self">Same record (trigger model)</option>
                          <option value="related" disabled={hasNoRelations}>
                            Related record {hasNoRelations ? '(no FK relations)' : ''}
                          </option>
                        </select>
                      </div>
                      {isRelatedTarget && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Related Record (via FK)
                          </label>
                          <select
                            value={(actionConfig as { related_model?: string }).related_model || ''}
                            onChange={(e) => {
                              // Find the field that links to this model
                              const selectedRelation = availableRelatedModels.find(r => r.modelKey === e.target.value)
                              setActionConfig({
                                ...actionConfig,
                                related_model: e.target.value,
                                relation_field: selectedRelation?.fieldName || '',
                                field: '',
                                value: ''
                              })
                              handleFieldChange()
                            }}
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select related model</option>
                            {availableRelatedModels.map((relation) => (
                              <option key={relation.modelKey} value={relation.modelKey}>
                                {relation.modelDisplayName} (via {relation.fieldVerboseName})
                              </option>
                            ))}
                          </select>
                          {availableRelatedModels.length === 0 && (
                            <p className="mt-1 text-xs text-amber-600">
                              This model has no foreign key relations to other automatable models
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Field to Update
                        </label>
                        <FieldSelector
                          fields={targetModelFields}
                          value={(actionConfig as { field?: string }).field || ''}
                          onChange={(value) => {
                            setActionConfig({ ...actionConfig, field: value, value: '' })
                            handleFieldChange()
                          }}
                          placeholder="Select field"
                          className="w-full"
                          disabled={isRelatedTarget && !hasRelatedModel}
                          showSearch={targetModelFields.length >= 10}
                        />
                        {isRelatedTarget && !hasRelatedModel && (
                          <p className="mt-1 text-xs text-amber-600">Select a related model first</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Value Type
                        </label>
                        <select
                          value={valueType}
                          onChange={(e) => {
                            setActionConfig({ ...actionConfig, value_type: e.target.value, value: '' })
                            handleFieldChange()
                          }}
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="static">Static value</option>
                          <option value="template">Template (with variables)</option>
                          <option value="copy_field">Copy from another field</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-sm font-medium text-gray-700">
                          {valueType === 'copy_field' ? 'Source Field' : 'New Value'}
                        </label>
                        {valueType === 'template' && (
                          <VariablePicker
                            fields={modelFields}
                            onSelect={(variable) => {
                              const currentValue = (actionConfig as { value?: string }).value || ''
                              setActionConfig({ ...actionConfig, value: currentValue + variable })
                              handleFieldChange()
                            }}
                          />
                        )}
                      </div>
                      {valueType === 'copy_field' ? (
                        <FieldSelector
                          fields={modelFields}
                          value={(actionConfig as { value?: string }).value || ''}
                          onChange={(value) => {
                            setActionConfig({ ...actionConfig, value })
                            handleFieldChange()
                          }}
                          placeholder="Select source field"
                          className="w-full"
                          showSearch={modelFields.length >= 10}
                        />
                      ) : valueType === 'static' && selectedTargetField ? (
                        <SmartValueInput
                          field={selectedTargetField}
                          value={(actionConfig as { value?: string }).value || ''}
                          onChange={(value) => {
                            setActionConfig({ ...actionConfig, value: value as string })
                            handleFieldChange()
                          }}
                          placeholder="Enter value"
                          className="w-full"
                        />
                      ) : (
                        <input
                          type="text"
                          value={(actionConfig as { value?: string }).value || ''}
                          onChange={(e) => {
                            setActionConfig({ ...actionConfig, value: e.target.value })
                            handleFieldChange()
                          }}
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder={valueType === 'template' ? 'Processed by {{assigned_to}}' : 'Enter value'}
                        />
                      )}
                      {valueType === 'template' && (
                        <p className="mt-1 text-xs text-gray-500">
                          Use the Insert Variable button above to add dynamic values
                        </p>
                      )}
                    </div>
                  </div>
                )
              })()}

              {actionType === 'create_activity' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Activity Type
                    </label>
                    <select
                      value={(actionConfig as { activity_type?: string }).activity_type || 'note'}
                      onChange={(e) => {
                        setActionConfig({ ...actionConfig, activity_type: e.target.value })
                        handleFieldChange()
                      }}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm font-medium text-gray-700">
                        Activity Content
                      </label>
                      <VariablePicker
                        fields={modelFields}
                        onSelect={(variable) => {
                          const currentValue = (actionConfig as { content_template?: string }).content_template || ''
                          setActionConfig({ ...actionConfig, content_template: currentValue + variable })
                          handleFieldChange()
                        }}
                      />
                    </div>
                    <textarea
                      value={(actionConfig as { content_template?: string }).content_template || ''}
                      onChange={(e) => {
                        setActionConfig({ ...actionConfig, content_template: e.target.value })
                        handleFieldChange()
                      }}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={4}
                      placeholder="Lead stage changed from {{old_stage}} to {{new_stage}}"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Click "Insert Variable" to add dynamic values. For stage changes, use {"{{old_stage}}"} and {"{{new_stage}}"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Test Panel */}
        <div className="mt-6">
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
        </div>

        {/* Stats */}
        {rule.total_executions > 0 && (
          <div className="mt-5 bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-[13px] font-semibold text-gray-900 mb-3">Execution Stats</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-xl font-semibold text-gray-900">
                  {rule.total_executions}
                </div>
                <div className="text-[11px] text-gray-500 font-medium">Total Runs</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-xl font-semibold text-green-600">
                  {rule.total_success}
                </div>
                <div className="text-[11px] text-gray-500 font-medium">Successful</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-xl font-semibold text-red-600">
                  {rule.total_failed}
                </div>
                <div className="text-[11px] text-gray-500 font-medium">Failed</div>
              </div>
            </div>
          </div>
        )}

        {/* Execution History */}
        {rule.id && (
          <div className="mt-5">
            <ExecutionHistoryPanel ruleId={rule.id} />
          </div>
        )}
      </div>

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
          <div
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg ${
              toast.type === 'success'
                ? 'bg-gray-900 text-white'
                : 'bg-red-600 text-white'
            }`}
          >
            {toast.type === 'success' ? (
              <Check className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            <span className="text-[13px]">{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="p-0.5 hover:bg-white/20 rounded ml-2"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
