import { useState } from 'react'
import {
  History,
  Check,
  X,
  Clock,
  AlertCircle,
  RefreshCw,
  Loader2,
  Play,
  TestTube,
} from 'lucide-react'
import { useRuleExecutions, RuleExecution, ExecutionStatus } from '@/hooks/useAutomations'
import { formatDistanceToNow } from 'date-fns'
import ExecutionDetailsDrawer from './ExecutionDetailsDrawer'

interface ExecutionHistoryPanelProps {
  ruleId: string
}

export default function ExecutionHistoryPanel({ ruleId }: ExecutionHistoryPanelProps) {
  const { executions, isLoading, refetch } = useRuleExecutions(ruleId)
  const [selectedExecution, setSelectedExecution] = useState<RuleExecution | null>(null)

  const getStatusIcon = (status: ExecutionStatus) => {
    switch (status) {
      case 'success':
        return <Check className="w-3.5 h-3.5 text-green-600" />
      case 'failed':
        return <X className="w-3.5 h-3.5 text-red-600" />
      case 'running':
        return <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" />
      case 'skipped':
        return <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
      default:
        return <Clock className="w-3.5 h-3.5 text-gray-400" />
    }
  }

  const getStatusBadge = (status: ExecutionStatus) => {
    const styles: Record<ExecutionStatus, string> = {
      success: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400',
      failed: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400',
      running: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
      skipped: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    }
    return (
      <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${styles[status]}`}>
        {status}
      </span>
    )
  }

  const getActionTypeBadge = (actionType: string) => {
    const labels: Record<string, string> = {
      send_webhook: 'Webhook',
      send_notification: 'Notification',
      update_field: 'Field Update',
      create_activity: 'Activity',
    }
    return (
      <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-[11px] font-medium">
        {labels[actionType] || actionType}
      </span>
    )
  }

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-[13px]">Loading execution history...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h3 className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <History className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          Execution History
        </h3>
        <button
          onClick={() => refetch()}
          className="p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Execution List */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-80 overflow-y-auto">
        {executions.length === 0 ? (
          <div className="p-6 text-center">
            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-2">
              <Play className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-[13px] font-medium text-gray-900 dark:text-gray-100">No executions yet</p>
            <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5">
              Executions will appear here when the rule triggers
            </p>
          </div>
        ) : (
          executions.map((execution: RuleExecution) => (
            <button
              key={execution.id}
              onClick={() => setSelectedExecution(execution)}
              className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              {getStatusIcon(execution.status)}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {getStatusBadge(execution.status)}
                  {getActionTypeBadge(execution.action_type)}
                  {execution.is_test && (
                    <span className="px-2 py-0.5 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded text-[11px] font-medium flex items-center gap-1">
                      <TestTube className="w-3 h-3" />
                      Test
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                  {formatDistanceToNow(new Date(execution.started_at), { addSuffix: true })}
                  {execution.duration_display && (
                    <span className="ml-2 text-gray-400 dark:text-gray-500">({execution.duration_display})</span>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Execution Details Drawer */}
      <ExecutionDetailsDrawer
        execution={selectedExecution}
        isOpen={selectedExecution !== null}
        onClose={() => setSelectedExecution(null)}
      />
    </div>
  )
}
