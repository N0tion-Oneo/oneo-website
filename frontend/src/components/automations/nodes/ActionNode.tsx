import { memo } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import {
  Send,
  Mail,
  FileText,
  Plus,
  Pencil,
} from 'lucide-react'

interface ActionNodeData {
  label: string
  nodeType: string
  config: Record<string, unknown>
}

const nodeTypeIcons: Record<string, React.ReactNode> = {
  send_webhook: <Send className="w-4 h-4" />,
  send_email: <Mail className="w-4 h-4" />,
  create_activity: <FileText className="w-4 h-4" />,
  create_record: <Plus className="w-4 h-4" />,
  update_record: <Pencil className="w-4 h-4" />,
}

const nodeTypeLabels: Record<string, string> = {
  send_webhook: 'Send Webhook',
  send_email: 'Send Email',
  create_activity: 'Log Activity',
  create_record: 'Create Record',
  update_record: 'Update Record',
}

function ActionNode({ data, selected }: NodeProps<ActionNodeData>) {
  const icon = nodeTypeIcons[data.nodeType] || <Send className="w-4 h-4" />
  const typeLabel = nodeTypeLabels[data.nodeType] || data.nodeType

  return (
    <div
      className={`
        bg-white border-2 rounded-lg min-w-[180px] shadow-md transition-all
        ${selected ? 'border-blue-500 shadow-lg' : 'border-blue-400'}
      `}
    >
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        style={{
          width: 12,
          height: 12,
          background: '#3b82f6',
          border: '2px solid white',
        }}
      />

      {/* Header */}
      <div className="bg-blue-500 text-white px-3 py-1.5 rounded-t-md flex items-center gap-2">
        {icon}
        <span className="text-xs font-semibold">ACTION</span>
      </div>

      {/* Body */}
      <div className="p-3">
        <p className="text-sm font-medium text-gray-900 mb-1">
          {data.label || 'New Action'}
        </p>
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border border-gray-300 text-gray-700">
          {typeLabel}
        </span>
        {data.config?.url != null && (
          <p className="text-xs text-gray-500 mt-1 truncate max-w-[150px]">
            {String(data.config.url)}
          </p>
        )}
      </div>

      {/* Output handle (for chaining actions) */}
      <Handle
        type="source"
        position={Position.Right}
        style={{
          width: 12,
          height: 12,
          background: '#3b82f6',
          border: '2px solid white',
        }}
      />
    </div>
  )
}

export default memo(ActionNode)
