import { useState, useMemo } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  type ColumnDef,
} from '@tanstack/react-table'
import { DataTable } from '@/components/common/DataTable'
import {
  useAllExecutions,
  useExecutionDetail,
  ExecutionStatus,
  RuleExecution,
  ActionType,
  TriggerType,
} from '@/hooks/useAutomations'
import ExecutionDetailsDrawer from '@/components/automations/ExecutionDetailsDrawer'
import { formatDistanceToNow } from 'date-fns'
import {
  Loader2,
  AlertCircle,
  Send,
  Bell,
  FileText,
  Pencil,
  Check,
  X,
  RefreshCw,
  TestTube,
  History,
} from 'lucide-react'

// Action type icons
const actionIcons: Record<ActionType, React.ReactNode> = {
  send_webhook: <Send className="w-4 h-4" />,
  send_notification: <Bell className="w-4 h-4" />,
  create_activity: <FileText className="w-4 h-4" />,
  update_field: <Pencil className="w-4 h-4" />,
}

// Action type labels
const actionLabels: Record<ActionType, string> = {
  send_webhook: 'Send Webhook',
  send_notification: 'Send Notification',
  create_activity: 'Log Activity',
  update_field: 'Update Field',
}

// Trigger type labels
const triggerLabels: Record<TriggerType, string> = {
  model_created: 'Created',
  model_updated: 'Updated',
  model_deleted: 'Deleted',
  stage_changed: 'Stage Changed',
  status_changed: 'Status Changed',
  field_changed: 'Field Changed',
  scheduled: 'Scheduled',
  manual: 'Manual',
  signal: 'Signal',
  view_action: 'View Action',
}

// Status badge styles
const statusStyles: Record<ExecutionStatus, string> = {
  success: 'bg-green-50 text-green-700',
  failed: 'bg-red-50 text-red-700',
  running: 'bg-blue-50 text-blue-700',
  skipped: 'bg-amber-50 text-amber-700',
}

const statusIcons: Record<ExecutionStatus, React.ReactNode> = {
  success: <Check className="w-3.5 h-3.5" />,
  failed: <X className="w-3.5 h-3.5" />,
  running: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
  skipped: <AlertCircle className="w-3.5 h-3.5" />,
}

const executionsColumnHelper = createColumnHelper<RuleExecution>()

export default function ExecutionsTab() {
  // Executions state
  const [statusFilter, setStatusFilter] = useState<ExecutionStatus | ''>('')
  const { executions, isLoading: isLoadingExecutions, refetch: refetchExecutions } = useAllExecutions(
    statusFilter ? { status: statusFilter, limit: 100 } : { limit: 100 }
  )
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null)
  const { execution: executionDetail, isLoading: isLoadingDetail } = useExecutionDetail(selectedExecutionId)

  // Column definitions
  const executionsColumns = useMemo<ColumnDef<RuleExecution, unknown>[]>(() => [
    executionsColumnHelper.accessor('status', {
      header: 'Status',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${statusStyles[row.original.status]}`}>
            {statusIcons[row.original.status]}
            {row.original.status}
          </span>
          {row.original.is_test && (
            <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-[11px] font-medium inline-flex items-center gap-1">
              <TestTube className="w-3 h-3" />
              Test
            </span>
          )}
        </div>
      ),
      enableSorting: false,
    }),
    executionsColumnHelper.accessor('rule_name', {
      header: 'Rule',
      cell: ({ row }) => (
        <span className="text-[13px] font-medium text-gray-900 dark:text-gray-100">
          {row.original.rule_name || 'Unknown Rule'}
        </span>
      ),
      enableSorting: false,
    }),
    executionsColumnHelper.accessor('trigger_type', {
      header: 'Trigger',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 bg-green-50 text-green-700 text-[11px] font-medium rounded">
            {triggerLabels[row.original.trigger_type as TriggerType] || row.original.trigger_type}
          </span>
          <span className="text-[12px] text-gray-600 dark:text-gray-400">
            {row.original.trigger_model?.split('.')[1] || row.original.trigger_model}
          </span>
        </div>
      ),
      enableSorting: false,
    }),
    executionsColumnHelper.accessor('action_type', {
      header: 'Action',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="p-1 bg-blue-50 text-blue-600 rounded">
            {actionIcons[row.original.action_type as ActionType]}
          </span>
          <span className="text-[12px] text-gray-600 dark:text-gray-400">
            {actionLabels[row.original.action_type as ActionType] || row.original.action_type}
          </span>
        </div>
      ),
      enableSorting: false,
    }),
    executionsColumnHelper.display({
      id: 'duration',
      header: 'Duration',
      cell: ({ row }) => (
        <span className="text-[12px] text-gray-500 dark:text-gray-400">
          {row.original.duration_display || '—'}
        </span>
      ),
      enableSorting: false,
    }),
    executionsColumnHelper.accessor('started_at', {
      header: 'Time',
      cell: ({ row }) => (
        <span className="text-[12px] text-gray-500 dark:text-gray-400">
          {formatDistanceToNow(new Date(row.original.started_at), { addSuffix: true })}
        </span>
      ),
      enableSorting: false,
    }),
  ], [])

  const table = useReactTable({
    data: executions,
    columns: executionsColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    enableSorting: false,
  })

  return (
    <div className="flex gap-6">
      {/* Executions List */}
      <div className="flex-1">
        {/* Filters */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ExecutionStatus | '')}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            >
              <option value="">All statuses</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
              <option value="running">Running</option>
              <option value="skipped">Skipped</option>
            </select>
          </div>
          <button
            onClick={() => refetchExecutions()}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Executions Table */}
        <DataTable
          table={table}
          onRowClick={(row) => setSelectedExecutionId(row.id)}
          isLoading={isLoadingExecutions}
          loadingMessage="Loading executions..."
          emptyState={{
            icon: <History className="w-6 h-6 text-gray-400 dark:text-gray-500" />,
            title: 'No executions yet',
            description: 'Executions will appear here when rules are triggered',
          }}
        />
      </div>

      {/* Execution Details Drawer */}
      <ExecutionDetailsDrawer
        execution={executionDetail || null}
        isOpen={selectedExecutionId !== null && !isLoadingDetail}
        onClose={() => setSelectedExecutionId(null)}
      />
    </div>
  )
}
