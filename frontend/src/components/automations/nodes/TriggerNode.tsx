import { memo } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import {
  Webhook,
  Plus,
  Pencil,
  Trash2,
  ArrowLeftRight,
} from 'lucide-react'

interface TriggerNodeData {
  label: string
  nodeType: string
  config: Record<string, unknown>
}

const nodeTypeIcons: Record<string, React.ReactNode> = {
  webhook_receive: <Webhook className="w-4 h-4" />,
  model_created: <Plus className="w-4 h-4" />,
  model_updated: <Pencil className="w-4 h-4" />,
  model_deleted: <Trash2 className="w-4 h-4" />,
  stage_changed: <ArrowLeftRight className="w-4 h-4" />,
}

const nodeTypeLabels: Record<string, string> = {
  webhook_receive: 'Webhook',
  model_created: 'Created',
  model_updated: 'Updated',
  model_deleted: 'Deleted',
  stage_changed: 'Stage Changed',
}

function TriggerNode({ data, selected }: NodeProps<TriggerNodeData>) {
  const icon = nodeTypeIcons[data.nodeType] || <Webhook className="w-4 h-4" />
  const typeLabel = nodeTypeLabels[data.nodeType] || data.nodeType

  return (
    <div
      className={`
        bg-white border-2 rounded-lg min-w-[180px] shadow-md transition-all
        ${selected ? 'border-blue-500 shadow-lg' : 'border-green-500'}
      `}
    >
      {/* Header */}
      <div className="bg-green-500 text-white px-3 py-1.5 rounded-t-md flex items-center gap-2">
        {icon}
        <span className="text-xs font-semibold">TRIGGER</span>
      </div>

      {/* Body */}
      <div className="p-3">
        <p className="text-sm font-medium text-gray-900 mb-1">
          {data.label || 'New Trigger'}
        </p>
        <div className="flex flex-wrap gap-1">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border border-gray-300 text-gray-700">
            {typeLabel}
          </span>
          {data.config?.model != null && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border border-blue-300 text-blue-700 bg-blue-50">
              {String(data.config.model).split('.')[1] || String(data.config.model)}
            </span>
          )}
        </div>
      </div>

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        style={{
          width: 12,
          height: 12,
          background: '#22c55e',
          border: '2px solid white',
        }}
      />
    </div>
  )
}

export default memo(TriggerNode)
