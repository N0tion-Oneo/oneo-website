import { useState } from 'react'
import {
  Webhook,
  Plus,
  Pencil,
  Trash2,
  ArrowLeftRight,
  Send,
  Mail,
  FileText,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { AutomatableModel } from '@/hooks/useAutomations'

interface NodePaletteProps {
  models: AutomatableModel[]
  onAddNode: (type: 'trigger' | 'action', nodeType: string, label: string) => void
}

const triggerNodes = [
  {
    type: 'webhook_receive',
    label: 'Receive Webhook',
    description: 'Receive data from external systems',
    icon: Webhook,
  },
  {
    type: 'model_created',
    label: 'Record Created',
    description: 'Trigger when a record is created',
    icon: Plus,
  },
  {
    type: 'model_updated',
    label: 'Record Updated',
    description: 'Trigger when a record is updated',
    icon: Pencil,
  },
  {
    type: 'model_deleted',
    label: 'Record Deleted',
    description: 'Trigger when a record is deleted',
    icon: Trash2,
  },
  {
    type: 'stage_changed',
    label: 'Stage Changed',
    description: 'Trigger when stage/status changes',
    icon: ArrowLeftRight,
  },
]

const actionNodes = [
  {
    type: 'send_webhook',
    label: 'Send Webhook',
    description: 'Send HTTP request to external URL',
    icon: Send,
  },
  {
    type: 'send_email',
    label: 'Send Email',
    description: 'Send email notification',
    icon: Mail,
  },
  {
    type: 'create_activity',
    label: 'Log Activity',
    description: 'Create activity log entry',
    icon: FileText,
  },
]

export default function NodePalette({ models, onAddNode }: NodePaletteProps) {
  const [triggersExpanded, setTriggersExpanded] = useState(true)
  const [actionsExpanded, setActionsExpanded] = useState(true)
  const [modelsExpanded, setModelsExpanded] = useState(false)

  return (
    <div className="flex-1 overflow-auto">
      {/* Triggers */}
      <div>
        <button
          onClick={() => setTriggersExpanded(!triggersExpanded)}
          className="w-full flex items-center justify-between px-3 py-2 bg-green-100 text-green-800 hover:bg-green-200 transition-colors"
        >
          <span className="text-sm font-semibold">Triggers</span>
          {triggersExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
        {triggersExpanded && (
          <div className="py-1">
            {triggerNodes.map(node => (
              <button
                key={node.type}
                onClick={() => onAddNode('trigger', node.type, node.label)}
                className="w-full flex items-start gap-2 px-3 py-2 hover:bg-gray-100 transition-colors text-left"
              >
                <node.icon className="w-4 h-4 mt-0.5 text-green-600 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{node.label}</p>
                  <p className="text-xs text-gray-500 truncate">{node.description}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div>
        <button
          onClick={() => setActionsExpanded(!actionsExpanded)}
          className="w-full flex items-center justify-between px-3 py-2 bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
        >
          <span className="text-sm font-semibold">Actions</span>
          {actionsExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
        {actionsExpanded && (
          <div className="py-1">
            {actionNodes.map(node => (
              <button
                key={node.type}
                onClick={() => onAddNode('action', node.type, node.label)}
                className="w-full flex items-start gap-2 px-3 py-2 hover:bg-gray-100 transition-colors text-left"
              >
                <node.icon className="w-4 h-4 mt-0.5 text-blue-600 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{node.label}</p>
                  <p className="text-xs text-gray-500 truncate">{node.description}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Models Reference */}
      <div>
        <button
          onClick={() => setModelsExpanded(!modelsExpanded)}
          className="w-full flex items-center justify-between px-3 py-2 bg-gray-100 text-gray-800 hover:bg-gray-200 transition-colors"
        >
          <span className="text-sm font-semibold">Available Models</span>
          {modelsExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
        {modelsExpanded && (
          <div className="p-3">
            <p className="text-xs text-gray-500 mb-2">
              Models that can be used in triggers:
            </p>
            <div className="flex flex-wrap gap-1">
              {models.map(model => (
                <span
                  key={model.key}
                  className="px-2 py-0.5 bg-gray-200 rounded text-xs text-gray-700"
                >
                  {model.display_name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
