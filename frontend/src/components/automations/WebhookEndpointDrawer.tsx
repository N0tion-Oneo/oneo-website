/**
 * WebhookEndpointDrawer - Drawer for creating/editing webhook endpoints
 */

import { useState, useEffect, useMemo } from 'react'
import {
  X,
  Loader2,
  AlertCircle,
  Check,
  Plus,
  Trash2,
  Copy,
  RefreshCw,
  ArrowRight,
  Play,
  Save,
  TestTube,
  Settings,
  MapPin,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import {
  useWebhookEndpointEditor,
  useDeleteWebhookEndpoint,
  WebhookAuthType,
  WebhookTargetAction,
  CreateWebhookEndpointData,
  UpdateWebhookEndpointData,
} from '@/hooks/useAutomations'

// =============================================================================
// TYPES
// =============================================================================

interface WebhookEndpointDrawerProps {
  endpointId: string | null  // null for new endpoint
  onClose: () => void
  onSaved: () => void
}

type Tab = 'config' | 'mapping' | 'test'

// =============================================================================
// CONSTANTS
// =============================================================================

const AUTH_TYPES: { value: WebhookAuthType; label: string; description: string }[] = [
  { value: 'none', label: 'No Authentication', description: 'Anyone can send webhooks (not recommended)' },
  { value: 'api_key', label: 'API Key', description: 'Require X-API-Key header' },
  { value: 'hmac', label: 'HMAC Signature', description: 'Verify X-Signature header' },
]

const TARGET_ACTIONS: { value: WebhookTargetAction; label: string; description: string }[] = [
  { value: 'create', label: 'Create Record', description: 'Always create a new record' },
  { value: 'update', label: 'Update Record', description: 'Update existing record (requires dedupe field)' },
  { value: 'upsert', label: 'Create or Update', description: 'Create if not exists, update if found' },
]

// =============================================================================
// HELPER: Generate slug from name
// =============================================================================

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50)
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function WebhookEndpointDrawer({
  endpointId,
  onClose,
  onSaved,
}: WebhookEndpointDrawerProps) {
  const isNew = !endpointId

  // Hooks
  const {
    endpoint,
    isLoadingEndpoint,
    create,
    update,
    models,
    isLoadingModels,
    fields,
    test,
    isTesting,
    testResult,
    regenerate,
    isRegenerating,
    isSaving,
  } = useWebhookEndpointEditor(endpointId)

  const { deleteEndpoint, isDeleting } = useDeleteWebhookEndpoint()

  // State
  const [activeTab, setActiveTab] = useState<Tab>('config')
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [authType, setAuthType] = useState<WebhookAuthType>('api_key')
  const [targetModel, setTargetModel] = useState('')
  const [targetAction, setTargetAction] = useState<WebhookTargetAction>('create')
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({})
  const [defaultValues, setDefaultValues] = useState<Record<string, string>>({})
  const [dedupeField, setDedupeField] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [rateLimitPerMinute, setRateLimitPerMinute] = useState(60)

  // Test state
  const [testPayload, setTestPayload] = useState('{\n  \n}')

  // Auto-generate slug from name
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)

  useEffect(() => {
    if (!slugManuallyEdited && name) {
      setSlug(generateSlug(name))
    }
  }, [name, slugManuallyEdited])

  // Load endpoint data
  useEffect(() => {
    if (endpoint) {
      setName(endpoint.name)
      setSlug(endpoint.slug)
      setDescription(endpoint.description || '')
      setAuthType(endpoint.auth_type)
      setTargetModel(endpoint.target_model)
      setTargetAction(endpoint.target_action)
      setFieldMapping(endpoint.field_mapping || {})
      setDefaultValues(
        Object.fromEntries(
          Object.entries(endpoint.default_values || {}).map(([k, v]) => [k, String(v)])
        )
      )
      setDedupeField(endpoint.dedupe_field || '')
      setIsActive(endpoint.is_active)
      setRateLimitPerMinute(endpoint.rate_limit_per_minute)
      setSlugManuallyEdited(true)
    }
  }, [endpoint])

  // Get fields for selected model
  const targetFields = useMemo(() => {
    if (endpoint?.target_fields) return endpoint.target_fields
    return fields || []
  }, [endpoint?.target_fields, fields])

  // Handle save
  const handleSave = async () => {
    setError(null)

    if (!name.trim()) {
      setError('Name is required')
      return
    }
    if (!slug.trim()) {
      setError('Slug is required')
      return
    }
    if (!targetModel) {
      setError('Target model is required')
      return
    }

    try {
      if (isNew) {
        const data: CreateWebhookEndpointData = {
          name: name.trim(),
          slug: slug.trim(),
          description: description.trim(),
          auth_type: authType,
          target_model: targetModel,
          target_action: targetAction,
          field_mapping: fieldMapping,
          default_values: defaultValues,
          dedupe_field: dedupeField,
          is_active: isActive,
          rate_limit_per_minute: rateLimitPerMinute,
        }
        await create(data)
      } else {
        const data: UpdateWebhookEndpointData = {
          name: name.trim(),
          slug: slug.trim(),
          description: description.trim(),
          auth_type: authType,
          target_model: targetModel,
          target_action: targetAction,
          field_mapping: fieldMapping,
          default_values: defaultValues,
          dedupe_field: dedupeField,
          is_active: isActive,
          rate_limit_per_minute: rateLimitPerMinute,
        }
        await update({ id: endpointId!, data })
      }
      onSaved()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save webhook endpoint'
      setError(message)
    }
  }

  // Handle delete
  const handleDelete = async () => {
    if (!endpointId) return
    try {
      await deleteEndpoint(endpointId)
      onSaved()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete webhook endpoint'
      setError(message)
    }
  }

  // Handle copy
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(null), 2000)
  }

  // Handle regenerate API key
  const handleRegenerateKey = async () => {
    if (!endpointId) return
    try {
      await regenerate(endpointId)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to regenerate API key'
      setError(message)
    }
  }

  // Handle test
  const handleTest = async (dryRun: boolean) => {
    if (!endpointId) return
    try {
      const payload = JSON.parse(testPayload)
      await test(endpointId, payload, dryRun)
    } catch (err: unknown) {
      if (err instanceof SyntaxError) {
        setError('Invalid JSON payload')
      }
    }
  }

  // Add field mapping
  const addFieldMapping = () => {
    setFieldMapping({ ...fieldMapping, '': '' })
  }

  // Update field mapping
  const updateFieldMapping = (oldKey: string, newKey: string, value: string) => {
    const newMapping = { ...fieldMapping }
    if (oldKey !== newKey) {
      delete newMapping[oldKey]
    }
    newMapping[newKey] = value
    setFieldMapping(newMapping)
  }

  // Remove field mapping
  const removeFieldMapping = (key: string) => {
    const newMapping = { ...fieldMapping }
    delete newMapping[key]
    setFieldMapping(newMapping)
  }

  // Add default value
  const addDefaultValue = () => {
    setDefaultValues({ ...defaultValues, '': '' })
  }

  // Update default value
  const updateDefaultValue = (oldKey: string, newKey: string, value: string) => {
    const newValues = { ...defaultValues }
    if (oldKey !== newKey) {
      delete newValues[oldKey]
    }
    newValues[newKey] = value
    setDefaultValues(newValues)
  }

  // Remove default value
  const removeDefaultValue = (key: string) => {
    const newValues = { ...defaultValues }
    delete newValues[key]
    setDefaultValues(newValues)
  }

  // Loading state
  if (isLoadingEndpoint && endpointId) {
    return (
      <>
        <div className="fixed inset-0 bg-black/30 z-[200]" onClick={onClose} />
        <div className="fixed inset-y-0 right-0 w-[600px] bg-white shadow-xl z-[201] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </>
    )
  }

  const webhookUrl = endpoint?.webhook_url || `/api/v1/webhooks/in/${slug}/`
  const fullWebhookUrl = `${window.location.origin}${webhookUrl}`

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-[200]" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-[600px] bg-white shadow-xl z-[201] flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[16px] font-semibold text-gray-900">
              {isNew ? 'New Webhook Endpoint' : 'Edit Webhook Endpoint'}
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1">
            {[
              { id: 'config' as Tab, label: 'Configuration', icon: Settings },
              { id: 'mapping' as Tab, label: 'Field Mapping', icon: MapPin },
              { id: 'test' as Tab, label: 'Test', icon: TestTube, disabled: isNew },
            ].map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => !tab.disabled && setActiveTab(tab.id)}
                  disabled={tab.disabled}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
                    isActive
                      ? 'bg-gray-900 text-white'
                      : tab.disabled
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-[13px] text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Configuration Tab */}
          {activeTab === 'config' && (
            <div className="space-y-6">
              {/* Webhook URL (for existing) */}
              {!isNew && endpoint && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <label className="block text-[11px] font-medium text-blue-700 uppercase mb-1">
                    Webhook URL
                  </label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-[12px] text-blue-900 font-mono bg-blue-100 px-2 py-1 rounded truncate">
                      {fullWebhookUrl}
                    </code>
                    <button
                      onClick={() => handleCopy(fullWebhookUrl, 'url')}
                      className="p-1.5 text-blue-600 hover:bg-blue-100 rounded"
                    >
                      {copied === 'url' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <label className="block text-[12px] font-medium text-gray-700 mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Lead Form Webhook"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-gray-700 mb-1">
                    Slug <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] text-gray-500">/api/v1/webhooks/in/</span>
                    <input
                      type="text"
                      value={slug}
                      onChange={(e) => {
                        setSlug(e.target.value)
                        setSlugManuallyEdited(true)
                      }}
                      placeholder="lead-form"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-[13px] font-mono focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What is this webhook used for?"
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
                  />
                </div>
              </div>

              {/* Target Model */}
              <div>
                <label className="block text-[12px] font-medium text-gray-700 mb-1">
                  Target Model <span className="text-red-500">*</span>
                </label>
                <p className="text-[11px] text-gray-500 mb-2">
                  Which type of record should be created/updated?
                </p>
                <select
                  value={targetModel}
                  onChange={(e) => setTargetModel(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                >
                  <option value="">Select a model...</option>
                  {isLoadingModels ? (
                    <option disabled>Loading...</option>
                  ) : (
                    models.map((model) => (
                      <option key={model.key} value={model.key}>
                        {model.display_name}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Target Action */}
              <div>
                <label className="block text-[12px] font-medium text-gray-700 mb-2">
                  Action
                </label>
                <div className="space-y-2">
                  {TARGET_ACTIONS.map((action) => (
                    <label
                      key={action.value}
                      className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        targetAction === action.value
                          ? 'border-gray-900 bg-gray-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="targetAction"
                        value={action.value}
                        checked={targetAction === action.value}
                        onChange={(e) => setTargetAction(e.target.value as WebhookTargetAction)}
                        className="mt-0.5"
                      />
                      <div>
                        <div className="text-[13px] font-medium text-gray-900">{action.label}</div>
                        <div className="text-[11px] text-gray-500">{action.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Authentication */}
              <div>
                <label className="block text-[12px] font-medium text-gray-700 mb-2">
                  Authentication
                </label>
                <div className="space-y-2">
                  {AUTH_TYPES.map((auth) => (
                    <label
                      key={auth.value}
                      className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        authType === auth.value
                          ? 'border-gray-900 bg-gray-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="authType"
                        value={auth.value}
                        checked={authType === auth.value}
                        onChange={(e) => setAuthType(e.target.value as WebhookAuthType)}
                        className="mt-0.5"
                      />
                      <div>
                        <div className="text-[13px] font-medium text-gray-900">{auth.label}</div>
                        <div className="text-[11px] text-gray-500">{auth.description}</div>
                      </div>
                    </label>
                  ))}
                </div>

                {/* API Key display */}
                {!isNew && authType === 'api_key' && endpoint?.api_key && (
                  <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-medium text-gray-500 uppercase">
                        API Key
                      </label>
                      <button
                        onClick={handleRegenerateKey}
                        disabled={isRegenerating}
                        className="flex items-center gap-1 text-[11px] text-gray-600 hover:text-gray-900"
                      >
                        {isRegenerating ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3 h-3" />
                        )}
                        Regenerate
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-[12px] text-gray-700 font-mono bg-white px-2 py-1 rounded border">
                        {endpoint.api_key}
                      </code>
                      <button
                        onClick={() => handleCopy(endpoint.api_key, 'apiKey')}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                      >
                        {copied === 'apiKey' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1">
                      Send as header: <code className="bg-gray-100 px-1">X-API-Key: {endpoint.api_key.substring(0, 10)}...</code>
                    </p>
                  </div>
                )}
              </div>

              {/* Deduplication */}
              {(targetAction === 'update' || targetAction === 'upsert') && targetModel && (
                <div>
                  <label className="block text-[12px] font-medium text-gray-700 mb-1">
                    Deduplication Field
                  </label>
                  <p className="text-[11px] text-gray-500 mb-2">
                    Which field should be used to find existing records?
                  </p>
                  <select
                    value={dedupeField}
                    onChange={(e) => setDedupeField(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  >
                    <option value="">Select a field...</option>
                    {targetFields.map((field) => (
                      <option key={field.name} value={field.name}>
                        {field.verbose_name || field.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Active Toggle */}
              <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <div>
                  <div className="text-[13px] font-medium text-gray-900">Active</div>
                  <div className="text-[11px] text-gray-500">Endpoint will receive webhooks</div>
                </div>
                <button
                  onClick={() => setIsActive(!isActive)}
                  className={`relative w-10 h-6 rounded-full transition-colors ${
                    isActive ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      isActive ? 'translate-x-4' : ''
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* Field Mapping Tab */}
          {activeTab === 'mapping' && (
            <div className="space-y-6">
              {/* Field Mapping */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <label className="text-[12px] font-medium text-gray-700">Field Mapping</label>
                    <p className="text-[11px] text-gray-500">
                      Map incoming payload fields to model fields
                    </p>
                  </div>
                  <button
                    onClick={addFieldMapping}
                    className="flex items-center gap-1 px-2 py-1 text-[12px] text-gray-600 hover:bg-gray-100 rounded"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add
                  </button>
                </div>

                <div className="space-y-2">
                  {Object.entries(fieldMapping).map(([externalField, internalField], index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={externalField}
                        onChange={(e) => updateFieldMapping(externalField, e.target.value, internalField)}
                        placeholder="Payload field"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-[13px] font-mono focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                      />
                      <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <select
                        value={internalField}
                        onChange={(e) => updateFieldMapping(externalField, externalField, e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                      >
                        <option value="">Select field...</option>
                        {targetFields.map((field) => (
                          <option key={field.name} value={field.name}>
                            {field.verbose_name || field.name} ({field.type})
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => removeFieldMapping(externalField)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  {Object.keys(fieldMapping).length === 0 && (
                    <div className="p-4 text-center text-[13px] text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                      No field mappings configured. Click "Add" to map payload fields.
                    </div>
                  )}
                </div>
              </div>

              {/* Default Values */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <label className="text-[12px] font-medium text-gray-700">Default Values</label>
                    <p className="text-[11px] text-gray-500">
                      Set static values on created records
                    </p>
                  </div>
                  <button
                    onClick={addDefaultValue}
                    className="flex items-center gap-1 px-2 py-1 text-[12px] text-gray-600 hover:bg-gray-100 rounded"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add
                  </button>
                </div>

                <div className="space-y-2">
                  {Object.entries(defaultValues).map(([field, value], index) => (
                    <div key={index} className="flex items-center gap-2">
                      <select
                        value={field}
                        onChange={(e) => updateDefaultValue(field, e.target.value, value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                      >
                        <option value="">Select field...</option>
                        {targetFields.map((f) => (
                          <option key={f.name} value={f.name}>
                            {f.verbose_name || f.name}
                          </option>
                        ))}
                      </select>
                      <span className="text-gray-400">=</span>
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => updateDefaultValue(field, field, e.target.value)}
                        placeholder="Value"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                      />
                      <button
                        onClick={() => removeDefaultValue(field)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  {Object.keys(defaultValues).length === 0 && (
                    <div className="p-4 text-center text-[13px] text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                      No default values configured.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Test Tab */}
          {activeTab === 'test' && !isNew && (
            <div className="space-y-6">
              {/* Expected Fields Reference */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="text-[12px] font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5" />
                  Expected Payload Fields
                </h4>

                {/* Field Mappings */}
                {Object.keys(fieldMapping).length > 0 ? (
                  <div className="space-y-2 mb-3">
                    <p className="text-[11px] font-medium text-blue-800">Field Mappings:</p>
                    <div className="bg-white rounded border border-blue-100 divide-y divide-blue-100">
                      {Object.entries(fieldMapping).map(([externalKey, internalField]) => {
                        const fieldInfo = targetFields.find(f => f.name === internalField)
                        return (
                          <div key={externalKey} className="flex items-center justify-between px-3 py-2">
                            <div className="flex items-center gap-2">
                              <code className="text-[11px] font-mono text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                                {externalKey}
                              </code>
                              <ArrowRight className="w-3 h-3 text-blue-400" />
                              <span className="text-[11px] text-gray-700">
                                {fieldInfo?.verbose_name || internalField}
                              </span>
                            </div>
                            <span className="text-[10px] text-gray-500">
                              {fieldInfo?.type || 'unknown'}
                              {fieldInfo?.required && <span className="text-red-500 ml-1">*</span>}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-blue-700 mb-3">
                    No field mappings configured. Payload keys will be matched directly to model field names.
                  </p>
                )}

                {/* Default Values */}
                {Object.keys(defaultValues).length > 0 && (
                  <div className="space-y-2 mb-3">
                    <p className="text-[11px] font-medium text-blue-800">Default Values (auto-applied):</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(defaultValues).map(([field, value]) => (
                        <span key={field} className="inline-flex items-center gap-1 text-[10px] bg-white border border-blue-100 rounded px-2 py-1">
                          <span className="text-gray-600">{field}:</span>
                          <span className="font-medium text-gray-900">{String(value)}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dedupe Field */}
                {dedupeField && (targetAction === 'update' || targetAction === 'upsert') && (
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium text-blue-800">Deduplication:</p>
                    <p className="text-[11px] text-blue-700">
                      Records matched by <code className="bg-white px-1 rounded">{dedupeField}</code> field
                      {targetAction === 'upsert' ? ' (will create if not found)' : ' (must exist)'}
                    </p>
                  </div>
                )}

                {/* Sample Payload Generator */}
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <button
                    onClick={() => {
                      const sample: Record<string, string> = {}
                      Object.entries(fieldMapping).forEach(([externalKey, internalField]) => {
                        const fieldInfo = targetFields.find(f => f.name === internalField)
                        if (fieldInfo?.type === 'EmailField') {
                          sample[externalKey] = 'test@example.com'
                        } else if (fieldInfo?.type === 'CharField' || fieldInfo?.type === 'TextField') {
                          sample[externalKey] = `Test ${externalKey}`
                        } else if (fieldInfo?.type === 'IntegerField' || fieldInfo?.type === 'DecimalField') {
                          sample[externalKey] = '0'
                        } else if (fieldInfo?.type === 'BooleanField') {
                          sample[externalKey] = 'true'
                        } else {
                          sample[externalKey] = `value_for_${externalKey}`
                        }
                      })
                      setTestPayload(JSON.stringify(sample, null, 2))
                    }}
                    className="text-[11px] text-blue-700 hover:text-blue-900 font-medium"
                  >
                    Generate sample payload →
                  </button>
                </div>
              </div>

              {/* Test Payload */}
              <div>
                <label className="block text-[12px] font-medium text-gray-700 mb-1">
                  Test Payload (JSON)
                </label>
                <textarea
                  value={testPayload}
                  onChange={(e) => setTestPayload(e.target.value)}
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[13px] font-mono focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
                  placeholder='{"name": "Test Lead", "email": "test@example.com"}'
                />
              </div>

              {/* Test Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleTest(true)}
                  disabled={isTesting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 text-[13px] font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />}
                  Validate (Dry Run)
                </button>
                <button
                  onClick={() => handleTest(false)}
                  disabled={isTesting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white text-[13px] font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50"
                >
                  {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  Execute (Create Record)
                </button>
              </div>

              {/* Test Result */}
              {testResult && (
                <div className={`p-4 rounded-lg border ${
                  testResult.status === 'valid' || testResult.status === 'created' || testResult.status === 'updated'
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {testResult.status === 'valid' || testResult.status === 'created' || testResult.status === 'updated' ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                    <span className={`text-[13px] font-medium ${
                      testResult.status === 'valid' || testResult.status === 'created' || testResult.status === 'updated'
                        ? 'text-green-700'
                        : 'text-red-700'
                    }`}>
                      {testResult.message}
                    </span>
                  </div>

                  {testResult.object_id && (
                    <p className="text-[12px] text-gray-600 mb-2">
                      Record ID: <code className="bg-white px-1 rounded">{testResult.object_id}</code>
                    </p>
                  )}

                  {testResult.mapping_errors.length > 0 && (
                    <div className="mt-2">
                      <p className="text-[11px] font-medium text-red-700 mb-1">Mapping Errors:</p>
                      <ul className="text-[11px] text-red-600 list-disc list-inside">
                        {testResult.mapping_errors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {Object.keys(testResult.mapped_data).length > 0 && (
                    <div className="mt-2">
                      <p className="text-[11px] font-medium text-gray-700 mb-1">Mapped Data:</p>
                      <pre className="text-[10px] bg-white p-2 rounded border overflow-x-auto">
                        {JSON.stringify(testResult.mapped_data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            {!isNew && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-3 py-2 text-[13px] text-red-600 hover:bg-red-50 rounded-lg"
              >
                Delete
              </button>
            )}
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={onClose}
                className="px-4 py-2 text-[13px] text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-[13px] font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {isNew ? 'Create Endpoint' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-[300] flex items-center justify-center">
          <div className="bg-white rounded-lg w-full max-w-sm mx-4 p-6">
            <h3 className="text-[16px] font-semibold text-gray-900 mb-2">Delete Webhook Endpoint?</h3>
            <p className="text-[13px] text-gray-600 mb-4">
              This will permanently delete this endpoint. External systems will no longer be able to send data to this URL.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-[13px] text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-[13px] font-medium rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
