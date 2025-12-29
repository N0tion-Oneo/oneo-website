import { useState } from 'react'
import {
  History,
  Check,
  X,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Loader2,
  Play,
  TestTube,
  Mail,
  Bell,
  User,
  ExternalLink,
} from 'lucide-react'
import { useRuleExecutions, RuleExecution, ExecutionStatus, Notification, ExternalEmail } from '@/hooks/useAutomations'
import { formatDistanceToNow } from 'date-fns'

interface ExecutionHistoryPanelProps {
  ruleId: string
}

export default function ExecutionHistoryPanel({ ruleId }: ExecutionHistoryPanelProps) {
  const { executions, isLoading, refetch } = useRuleExecutions(ruleId)
  const [expandedId, setExpandedId] = useState<string | null>(null)

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
      success: 'bg-green-50 text-green-700',
      failed: 'bg-red-50 text-red-700',
      running: 'bg-blue-50 text-blue-700',
      skipped: 'bg-amber-50 text-amber-700',
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
      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[11px] font-medium">
        {labels[actionType] || actionType}
      </span>
    )
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-center gap-2 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-[13px]">Loading execution history...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-[13px] font-semibold text-gray-900 flex items-center gap-2">
          <History className="w-4 h-4 text-gray-500" />
          Execution History
        </h3>
        <button
          onClick={() => refetch()}
          className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Execution List */}
      <div className="divide-y divide-gray-200 max-h-80 overflow-y-auto">
        {executions.length === 0 ? (
          <div className="p-6 text-center">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-2">
              <Play className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-[13px] font-medium text-gray-900">No executions yet</p>
            <p className="text-[12px] text-gray-500 mt-0.5">
              Executions will appear here when the rule triggers
            </p>
          </div>
        ) : (
          executions.map((execution: RuleExecution) => (
            <div key={execution.id} className="hover:bg-gray-50 transition-colors">
              {/* Execution Row */}
              <button
                onClick={() => setExpandedId(expandedId === execution.id ? null : execution.id)}
                className="w-full px-4 py-3 flex items-center gap-3 text-left"
              >
                {expandedId === execution.id ? (
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                )}

                {getStatusIcon(execution.status)}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getStatusBadge(execution.status)}
                    {getActionTypeBadge(execution.action_type)}
                    {execution.is_test && (
                      <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-[11px] font-medium flex items-center gap-1">
                        <TestTube className="w-3 h-3" />
                        Test
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-gray-500 mt-1">
                    {formatDistanceToNow(new Date(execution.started_at), { addSuffix: true })}
                    {execution.duration_display && (
                      <span className="ml-2 text-gray-400">({execution.duration_display})</span>
                    )}
                  </div>
                </div>
              </button>

              {/* Expanded Details */}
              {expandedId === execution.id && (
                <div className="px-4 pb-4 pl-11 space-y-3">
                  {/* Notification Content - from first notification */}
                  {execution.notifications && execution.notifications.length > 0 && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Bell className="w-3.5 h-3.5 text-blue-600" />
                        <span className="text-[11px] font-medium text-blue-700">Notification Sent</span>
                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px]">
                          {execution.notifications[0].channel}
                        </span>
                      </div>
                      <div className="text-[13px] font-medium text-gray-900">
                        {execution.notifications[0].title}
                      </div>
                      {execution.notifications[0].body && (
                        <div className="text-[12px] text-gray-600 mt-1 line-clamp-2">
                          {execution.notifications[0].body}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Recipients - from notifications array */}
                  {((execution.notifications && execution.notifications.length > 0) ||
                    (execution.external_emails && execution.external_emails.length > 0)) && (
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-gray-500" />
                          <span className="text-[11px] font-medium text-gray-700">
                            Recipients ({(execution.notifications?.length || 0) + (execution.external_emails?.length || 0)})
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px]">
                          {(() => {
                            const emailsSent = (execution.notifications?.filter(n => n.email_sent).length || 0) +
                              (execution.external_emails?.filter(e => e.email_sent).length || 0)
                            const emailsFailed = (execution.external_emails?.filter(e => e.email_error).length || 0)
                            return (
                              <>
                                {emailsSent > 0 && (
                                  <span className="flex items-center gap-1 text-green-600">
                                    <Mail className="w-3 h-3" />
                                    {emailsSent} sent
                                  </span>
                                )}
                                {emailsFailed > 0 && (
                                  <span className="flex items-center gap-1 text-red-600">
                                    <X className="w-3 h-3" />
                                    {emailsFailed} failed
                                  </span>
                                )}
                              </>
                            )
                          })()}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        {/* User notifications */}
                        {execution.notifications?.map((notif) => (
                          <div key={notif.id} className="flex items-center justify-between text-[12px]">
                            <div className="flex items-center gap-2">
                              <User className="w-3 h-3 text-gray-400" />
                              <span className="text-gray-700">{notif.title}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {notif.email_sent && (
                                <span className="flex items-center gap-1 text-green-600 text-[11px]">
                                  <Check className="w-3 h-3" /> Sent
                                </span>
                              )}
                              {notif.is_read && (
                                <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-[10px]">
                                  Read
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                        {/* External emails */}
                        {execution.external_emails?.map((ext, idx) => (
                          <div key={idx} className="flex items-center justify-between text-[12px]">
                            <div className="flex items-center gap-2">
                              <ExternalLink className="w-3 h-3 text-gray-400" />
                              <span className="text-gray-700">
                                {ext.name || ext.email}
                              </span>
                              {ext.name && (
                                <span className="text-gray-400 text-[11px]">{ext.email}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {ext.email_sent ? (
                                <span className="flex items-center gap-1 text-green-600 text-[11px]">
                                  <Check className="w-3 h-3" /> Sent
                                </span>
                              ) : ext.email_error ? (
                                <span className="flex items-center gap-1 text-red-600 text-[11px]" title={ext.email_error}>
                                  <X className="w-3 h-3" /> Failed
                                </span>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Trigger Info */}
                  <div className="text-[12px]">
                    <span className="text-gray-500">Trigger:</span>{' '}
                    <span className="font-medium text-gray-700">{execution.trigger_type}</span>
                    {execution.trigger_model && (
                      <>
                        <span className="text-gray-400 mx-1">on</span>
                        <span className="font-mono text-[11px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">
                          {execution.trigger_model}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Object ID */}
                  {execution.trigger_object_id && (
                    <div className="text-[12px]">
                      <span className="text-gray-500">Record ID:</span>{' '}
                      <span className="font-mono text-[11px] text-gray-700">{execution.trigger_object_id}</span>
                    </div>
                  )}

                  {/* Error Message */}
                  {execution.error_message && (
                    <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg">
                      <div className="text-[11px] font-medium text-red-700 mb-1">Error:</div>
                      <div className="font-mono text-[11px] text-red-600">{execution.error_message}</div>
                    </div>
                  )}

                  {/* Timestamps */}
                  <div className="text-[11px] text-gray-400 flex gap-4">
                    <span>Started: {new Date(execution.started_at).toLocaleString()}</span>
                    {execution.completed_at && (
                      <span>Completed: {new Date(execution.completed_at).toLocaleString()}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
