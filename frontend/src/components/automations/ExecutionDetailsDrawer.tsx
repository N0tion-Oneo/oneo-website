/**
 * ExecutionDetailsDrawer - Drawer for viewing automation execution details
 * Uses DrawerWithPanels for a unified panel-based interface
 */

import { ReactNode } from 'react'
import {
  Check,
  X,
  Clock,
  AlertCircle,
  Loader2,
  Bell,
  User,
  Mail,
  ExternalLink,
  Zap,
  Play,
  TestTube,
  FileText,
  Users,
} from 'lucide-react'
import { DrawerWithPanels, type PanelOption } from '@/components/common'
import { RuleExecution, ExecutionDetail, ExecutionStatus } from '@/hooks/useAutomations'
import { formatDistanceToNow } from 'date-fns'

// =============================================================================
// Types
// =============================================================================

// Support both RuleExecution (from list) and ExecutionDetail (from detail endpoint)
type Execution = RuleExecution | ExecutionDetail

interface ExecutionDetailsDrawerProps {
  execution: Execution | null
  isOpen: boolean
  onClose: () => void
}

type ExecutionPanelType = 'overview' | 'notification' | 'recipients' | 'data'

// =============================================================================
// Helper Functions
// =============================================================================

const getStatusIcon = (status: ExecutionStatus) => {
  switch (status) {
    case 'success':
      return <Check className="w-5 h-5 text-green-600" />
    case 'failed':
      return <X className="w-5 h-5 text-red-600" />
    case 'running':
      return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
    case 'skipped':
      return <AlertCircle className="w-5 h-5 text-amber-600" />
    default:
      return <Clock className="w-5 h-5 text-gray-400" />
  }
}

const getStatusColor = (status: ExecutionStatus) => {
  const colors: Record<ExecutionStatus, string> = {
    success: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    failed: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    running: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    skipped: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  }
  return colors[status]
}

const getActionTypeLabel = (actionType: string) => {
  const labels: Record<string, string> = {
    send_webhook: 'Webhook',
    send_notification: 'Notification',
    update_field: 'Field Update',
    create_activity: 'Activity',
  }
  return labels[actionType] || actionType
}

// =============================================================================
// Panel Components
// =============================================================================

function OverviewPanel({ execution }: { execution: Execution }) {
  return (
    <div className="p-4 space-y-4">
      {/* Status Card */}
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="flex items-center gap-3 mb-4">
          {getStatusIcon(execution.status)}
          <div>
            <span className={`inline-flex px-2.5 py-1 rounded-full text-[12px] font-medium ${getStatusColor(execution.status)}`}>
              {execution.status.charAt(0).toUpperCase() + execution.status.slice(1)}
            </span>
            {execution.is_test && (
              <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full text-[11px] font-medium">
                <TestTube className="w-3 h-3" />
                Test Run
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-[13px]">
          <div>
            <div className="text-gray-500 dark:text-gray-400 text-[11px] uppercase tracking-wide mb-1">Action Type</div>
            <div className="font-medium text-gray-900 dark:text-gray-100">{getActionTypeLabel(execution.action_type)}</div>
          </div>
          <div>
            <div className="text-gray-500 dark:text-gray-400 text-[11px] uppercase tracking-wide mb-1">Duration</div>
            <div className="font-medium text-gray-900 dark:text-gray-100">{execution.duration_display || 'N/A'}</div>
          </div>
        </div>
      </div>

      {/* Trigger Info */}
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-amber-500" />
          <span className="text-[12px] font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide">Trigger</span>
        </div>
        <div className="space-y-2 text-[13px]">
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Type</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">{execution.trigger_type}</span>
          </div>
          {execution.trigger_model && (
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Model</span>
              <span className="font-mono text-[12px] bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-700 dark:text-gray-300">
                {execution.trigger_model}
              </span>
            </div>
          )}
          {execution.trigger_object_id && (
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Record ID</span>
              <span className="font-mono text-[12px] text-gray-700 dark:text-gray-300">{execution.trigger_object_id}</span>
            </div>
          )}
          {execution.triggered_by_name && (
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Triggered By</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{execution.triggered_by_name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Timestamps */}
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-gray-500" />
          <span className="text-[12px] font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide">Timing</span>
        </div>
        <div className="space-y-2 text-[13px]">
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Started</span>
            <span className="text-gray-900 dark:text-gray-100">{new Date(execution.started_at).toLocaleString()}</span>
          </div>
          {execution.completed_at && (
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Completed</span>
              <span className="text-gray-900 dark:text-gray-100">{new Date(execution.completed_at).toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>

      {/* Error Message */}
      {execution.error_message && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
            <span className="text-[12px] font-semibold text-red-700 dark:text-red-400 uppercase tracking-wide">Error</span>
          </div>
          <pre className="text-[12px] text-red-600 dark:text-red-400 whitespace-pre-wrap font-mono">
            {execution.error_message}
          </pre>
        </div>
      )}
    </div>
  )
}

function NotificationPanel({ execution }: { execution: Execution }) {
  const notification = execution.notifications?.[0]

  if (!notification) {
    return (
      <div className="p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3">
          <Bell className="w-6 h-6 text-gray-400" />
        </div>
        <p className="text-[13px] font-medium text-gray-900 dark:text-gray-100">No Notification Data</p>
        <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-1">
          This execution did not generate any notifications
        </p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Notification Preview */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <Bell className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="text-[12px] font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide">
            Notification Content
          </span>
          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 rounded text-[10px] font-medium">
            {notification.channel}
          </span>
        </div>
        <div className="space-y-2">
          <div className="text-[15px] font-semibold text-gray-900 dark:text-gray-100">
            {notification.title}
          </div>
          {notification.body && (
            <div className="text-[13px] text-gray-600 dark:text-gray-400 leading-relaxed">
              {notification.body}
            </div>
          )}
        </div>
      </div>

      {/* Delivery Status */}
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <Mail className="w-4 h-4 text-gray-500" />
          <span className="text-[12px] font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide">
            Delivery Status
          </span>
        </div>
        <div className="space-y-2 text-[13px]">
          <div className="flex justify-between items-center">
            <span className="text-gray-500 dark:text-gray-400">Email Sent</span>
            {notification.email_sent ? (
              <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                <Check className="w-4 h-4" /> Yes
              </span>
            ) : (
              <span className="text-gray-400">No</span>
            )}
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500 dark:text-gray-400">Read</span>
            {notification.is_read ? (
              <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                <Check className="w-4 h-4" /> Yes
              </span>
            ) : (
              <span className="text-gray-400">No</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function RecipientsPanel({ execution }: { execution: Execution }) {
  const notifications = execution.notifications || []
  const externalEmails = execution.external_emails || []
  const totalRecipients = notifications.length + externalEmails.length

  if (totalRecipients === 0) {
    return (
      <div className="p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3">
          <Users className="w-6 h-6 text-gray-400" />
        </div>
        <p className="text-[13px] font-medium text-gray-900 dark:text-gray-100">No Recipients</p>
        <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-1">
          This execution did not have any recipients
        </p>
      </div>
    )
  }

  const emailsSent = notifications.filter(n => n.email_sent).length + externalEmails.filter(e => e.email_sent).length
  const emailsFailed = externalEmails.filter(e => e.email_error).length

  return (
    <div className="p-4 space-y-4">
      {/* Summary */}
      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-gray-500" />
          <span className="text-[13px] font-medium text-gray-900 dark:text-gray-100">
            {totalRecipients} Recipient{totalRecipients !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[12px]">
          {emailsSent > 0 && (
            <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
              <Mail className="w-3.5 h-3.5" />
              {emailsSent} sent
            </span>
          )}
          {emailsFailed > 0 && (
            <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
              <X className="w-3.5 h-3.5" />
              {emailsFailed} failed
            </span>
          )}
        </div>
      </div>

      {/* User Notifications */}
      {notifications.length > 0 && (
        <div>
          <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Platform Users
          </div>
          <div className="space-y-2">
            {notifications.map((notif) => (
              <div key={notif.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <User className="w-4 h-4 text-gray-500" />
                  </div>
                  <span className="text-[13px] font-medium text-gray-900 dark:text-gray-100">{notif.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  {notif.email_sent && (
                    <span className="flex items-center gap-1 text-green-600 dark:text-green-400 text-[11px]">
                      <Check className="w-3.5 h-3.5" /> Email sent
                    </span>
                  )}
                  {notif.is_read && (
                    <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded text-[10px] font-medium">
                      Read
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* External Emails */}
      {externalEmails.length > 0 && (
        <div>
          <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            External Recipients
          </div>
          <div className="space-y-2">
            {externalEmails.map((ext, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <ExternalLink className="w-4 h-4 text-gray-500" />
                  </div>
                  <div>
                    <div className="text-[13px] font-medium text-gray-900 dark:text-gray-100">
                      {ext.name || ext.email}
                    </div>
                    {ext.name && (
                      <div className="text-[11px] text-gray-500 dark:text-gray-400">{ext.email}</div>
                    )}
                  </div>
                </div>
                <div>
                  {ext.email_sent ? (
                    <span className="flex items-center gap-1 text-green-600 dark:text-green-400 text-[11px]">
                      <Check className="w-3.5 h-3.5" /> Sent
                    </span>
                  ) : ext.email_error ? (
                    <span className="flex items-center gap-1 text-red-600 dark:text-red-400 text-[11px]" title={ext.email_error}>
                      <X className="w-3.5 h-3.5" /> Failed
                    </span>
                  ) : (
                    <span className="text-[11px] text-gray-400">Pending</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function DataPanel({ execution }: { execution: Execution }) {
  // Handle both RuleExecution (with old_values/new_values) and ExecutionDetail (with generic trigger_data)
  const triggerData = execution.trigger_data as Record<string, unknown> | undefined

  const hasData = triggerData && Object.keys(triggerData).length > 0

  if (!hasData) {
    return (
      <div className="p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3">
          <FileText className="w-6 h-6 text-gray-400" />
        </div>
        <p className="text-[13px] font-medium text-gray-900 dark:text-gray-100">No Data Changes</p>
        <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-1">
          No field changes were recorded for this execution
        </p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Trigger Data */}
      {triggerData && Object.keys(triggerData).length > 0 && (
        <div>
          <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Trigger Data
          </div>
          <div className="p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
            <pre className="text-[12px] text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono overflow-x-auto">
              {JSON.stringify(triggerData, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Main Component
// =============================================================================

export default function ExecutionDetailsDrawer({
  execution,
  isOpen,
  onClose,
}: ExecutionDetailsDrawerProps) {
  if (!execution) return null

  // Panel configuration
  const availablePanels: PanelOption[] = [
    { type: 'overview', label: 'Overview', icon: <Play className="w-3.5 h-3.5" /> },
    { type: 'notification', label: 'Notification', icon: <Bell className="w-3.5 h-3.5" /> },
    {
      type: 'recipients',
      label: 'Recipients',
      icon: <Users className="w-3.5 h-3.5" />,
      count: (execution.notifications?.length || 0) + (execution.external_emails?.length || 0),
    },
    { type: 'data', label: 'Data', icon: <FileText className="w-3.5 h-3.5" /> },
  ]

  // Render panel content
  const renderPanel = (panelType: string): ReactNode => {
    switch (panelType as ExecutionPanelType) {
      case 'overview':
        return <OverviewPanel execution={execution} />
      case 'notification':
        return <NotificationPanel execution={execution} />
      case 'recipients':
        return <RecipientsPanel execution={execution} />
      case 'data':
        return <DataPanel execution={execution} />
      default:
        return null
    }
  }

  // Status badge for header
  const statusBadge = (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${getStatusColor(execution.status)}`}>
      {getStatusIcon(execution.status)}
      {execution.status.charAt(0).toUpperCase() + execution.status.slice(1)}
    </span>
  )

  // Avatar
  const avatar = (
    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
      execution.status === 'success' ? 'bg-green-100 dark:bg-green-900/30' :
      execution.status === 'failed' ? 'bg-red-100 dark:bg-red-900/30' :
      execution.status === 'running' ? 'bg-blue-100 dark:bg-blue-900/30' :
      'bg-gray-100 dark:bg-gray-800'
    }`}>
      {getStatusIcon(execution.status)}
    </div>
  )

  return (
    <DrawerWithPanels
      isOpen={isOpen}
      onClose={onClose}
      title={execution.rule_name}
      subtitle={`Executed ${formatDistanceToNow(new Date(execution.started_at), { addSuffix: true })}`}
      avatar={avatar}
      statusBadge={statusBadge}
      availablePanels={availablePanels}
      defaultPanel="overview"
      renderPanel={renderPanel}
    />
  )
}
