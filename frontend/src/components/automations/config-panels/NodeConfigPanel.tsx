import { useState, useEffect } from 'react'
import { X, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { Node } from 'reactflow'
import { AutomatableModel } from '@/hooks/useAutomations'

interface NodeConfigPanelProps {
  node: Node
  models: AutomatableModel[]
  onClose: () => void
  onConfigUpdate: (nodeId: string, config: Record<string, unknown>) => void
  onLabelUpdate: (nodeId: string, label: string) => void
  onDelete: (nodeId: string) => void
}

export default function NodeConfigPanel({
  node,
  models,
  onClose,
  onConfigUpdate,
  onLabelUpdate,
  onDelete,
}: NodeConfigPanelProps) {
  const [label, setLabel] = useState(node.data.label || '')
  const [config, setConfig] = useState<Record<string, unknown>>(node.data.config || {})
  const [headersExpanded, setHeadersExpanded] = useState(false)
  const [payloadExpanded, setPayloadExpanded] = useState(false)
  const [conditionsExpanded, setConditionsExpanded] = useState(true)

  // Update local state when node changes
  useEffect(() => {
    setLabel(node.data.label || '')
    setConfig(node.data.config || {})
  }, [node.id, node.data])

  const handleLabelChange = (value: string) => {
    setLabel(value)
    onLabelUpdate(node.id, value)
  }

  const handleConfigChange = (key: string, value: unknown) => {
    const newConfig = { ...config, [key]: value }
    setConfig(newConfig)
    onConfigUpdate(node.id, newConfig)
  }

  const nodeType = node.data.nodeType || ''
  const isTrigger = node.type === 'trigger'

  // Get selected model info
  const selectedModel = models.find(m => m.key === config.model)

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div
        className={`px-4 py-3 border-b flex items-center justify-between ${
          isTrigger ? 'bg-green-50' : 'bg-blue-50'
        }`}
      >
        <span className="text-sm font-semibold text-gray-900">
          {isTrigger ? 'Trigger' : 'Action'} Configuration
        </span>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-200 rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Basic Settings */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Label
          </label>
          <input
            type="text"
            value={label}
            onChange={e => handleLabelChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Display name for this node"
          />
          <p className="mt-1 text-xs text-gray-500">Display name for this node</p>
        </div>

        <hr className="border-gray-200" />

        {/* Trigger-specific configuration */}
        {isTrigger && nodeType !== 'webhook_receive' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Model
              </label>
              <select
                value={(config.model as string) || ''}
                onChange={e => handleConfigChange('model', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a model...</option>
                {models.map(model => (
                  <option key={model.key} value={model.key}>
                    {model.display_name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">Which model triggers this workflow</p>
            </div>

            {selectedModel && nodeType === 'stage_changed' && selectedModel.status_field && (
              <div className="border rounded-md">
                <button
                  onClick={() => setConditionsExpanded(!conditionsExpanded)}
                  className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50"
                >
                  <span className="text-sm font-medium">Conditions</span>
                  {conditionsExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
                {conditionsExpanded && (
                  <div className="px-3 pb-3 space-y-3">
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">
                        From Stage (optional)
                      </label>
                      <input
                        type="text"
                        value={(config.stage_from as string) || ''}
                        onChange={e => handleConfigChange('stage_from', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        placeholder="Only trigger when changing FROM this stage"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">
                        To Stage (optional)
                      </label>
                      <input
                        type="text"
                        value={(config.stage_to as string) || ''}
                        onChange={e => handleConfigChange('stage_to', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        placeholder="Only trigger when changing TO this stage"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Webhook receive configuration */}
        {isTrigger && nodeType === 'webhook_receive' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Endpoint Slug
              </label>
              <input
                type="text"
                value={(config.slug as string) || ''}
                onChange={e => handleConfigChange('slug', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="my-webhook"
              />
              <p className="mt-1 text-xs text-gray-500">
                URL: /api/v1/webhooks/in/{'{slug}'}/
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Model
              </label>
              <select
                value={(config.target_model as string) || ''}
                onChange={e => handleConfigChange('target_model', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">Select a model...</option>
                {models.map(model => (
                  <option key={model.key} value={model.key}>
                    {model.display_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Action
              </label>
              <select
                value={(config.action as string) || 'create'}
                onChange={e => handleConfigChange('action', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="create">Create Record</option>
                <option value="update">Update Record</option>
                <option value="upsert">Create or Update</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Authentication
              </label>
              <select
                value={(config.auth_type as string) || 'api_key'}
                onChange={e => handleConfigChange('auth_type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="none">No Authentication</option>
                <option value="api_key">API Key</option>
                <option value="hmac">HMAC Signature</option>
              </select>
            </div>
          </>
        )}

        {/* Action-specific configuration */}
        {!isTrigger && nodeType === 'send_webhook' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Webhook URL
              </label>
              <input
                type="text"
                value={(config.url as string) || ''}
                onChange={e => handleConfigChange('url', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="https://example.com/webhook"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Method
              </label>
              <select
                value={(config.method as string) || 'POST'}
                onChange={e => handleConfigChange('method', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
                <option value="GET">GET</option>
              </select>
            </div>

            <div className="border rounded-md">
              <button
                onClick={() => setHeadersExpanded(!headersExpanded)}
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50"
              >
                <span className="text-sm font-medium">Headers</span>
                {headersExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
              {headersExpanded && (
                <div className="px-3 pb-3 space-y-3">
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">
                      Authorization
                    </label>
                    <input
                      type="text"
                      value={(config.auth_header as string) || ''}
                      onChange={e => handleConfigChange('auth_header', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      placeholder="Bearer {{secrets.api_key}}"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">
                      Content-Type
                    </label>
                    <input
                      type="text"
                      value={(config.content_type as string) || 'application/json'}
                      onChange={e => handleConfigChange('content_type', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="border rounded-md">
              <button
                onClick={() => setPayloadExpanded(!payloadExpanded)}
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50"
              >
                <span className="text-sm font-medium">Payload Template</span>
                {payloadExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
              {payloadExpanded && (
                <div className="px-3 pb-3">
                  <textarea
                    value={
                      typeof config.payload_template === 'object'
                        ? JSON.stringify(config.payload_template, null, 2)
                        : (config.payload_template as string) || ''
                    }
                    onChange={e => {
                      try {
                        const parsed = JSON.parse(e.target.value)
                        handleConfigChange('payload_template', parsed)
                      } catch {
                        handleConfigChange('payload_template', e.target.value)
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
                    rows={8}
                    placeholder={`{
  "name": "{{name}}",
  "email": "{{email}}",
  "event": "{{__event_type__}}"
}`}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Use {'{{field}}'} to insert model fields
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {!isTrigger && nodeType === 'send_email' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Recipient Email
              </label>
              <input
                type="text"
                value={(config.to as string) || ''}
                onChange={e => handleConfigChange('to', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="{{email}} or fixed@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject
              </label>
              <input
                type="text"
                value={(config.subject as string) || ''}
                onChange={e => handleConfigChange('subject', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="New Lead: {{name}}"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Body
              </label>
              <textarea
                value={(config.body as string) || ''}
                onChange={e => handleConfigChange('body', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                rows={4}
                placeholder="Hello, a new lead has been created..."
              />
            </div>
          </>
        )}

        {!isTrigger && nodeType === 'create_activity' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Activity Type
              </label>
              <input
                type="text"
                value={(config.activity_type as string) || ''}
                onChange={e => handleConfigChange('activity_type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="e.g., automation_triggered"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Content
              </label>
              <textarea
                value={(config.content as string) || ''}
                onChange={e => handleConfigChange('content', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                rows={3}
                placeholder="Automation triggered for {{name}}"
              />
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t">
        <button
          onClick={() => onDelete(node.id)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-md hover:bg-red-50 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Delete Node
        </button>
      </div>
    </div>
  )
}
