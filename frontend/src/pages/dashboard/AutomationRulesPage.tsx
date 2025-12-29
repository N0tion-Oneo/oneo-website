import { useState, useMemo } from 'react'
import {
  Plus,
  MoreVertical,
  Play,
  Pause,
  Trash2,
  Pencil,
  History,
  Loader2,
  AlertCircle,
  Send,
  Bell,
  FileText,
  Zap,
  Check,
  Search,
  X,
  Clock,
  RefreshCw,
  TestTube,
  ExternalLink,
  LayoutGrid,
  Mail,
  User,
  Link2,
  Key,
  Copy,
  Shield,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import {
  useAutomationRules,
  useUpdateAutomationRule,
  useDeleteAutomationRule,
  useAllExecutions,
  useExecutionDetail,
  useReplayExecution,
  useWebhookEndpoints,
  useToggleWebhookEndpoint,
  useDeleteWebhookEndpoint,
  useAllWebhookReceipts,
  AutomationRule,
  ActionType,
  TriggerType,
  ExecutionStatus,
  WebhookEndpointListItem,
  WebhookReceipt,
} from '@/hooks/useAutomations'
import {
  useNotificationTemplates,
  useDeleteTemplate,
  useAdminNotifications,
  useBulkDeleteNotifications,
} from '@/hooks/useNotificationsAdmin'
import RuleDrawer from '@/components/automations/RuleDrawer'
import WebhookEndpointDrawer from '@/components/automations/WebhookEndpointDrawer'
import TemplateDrawer from '@/components/automations/TemplateDrawer'
import SendNotificationDrawer from '@/components/automations/SendNotificationDrawer'
import { formatDistanceToNow } from 'date-fns'
import {
  NotificationChannelLabels,
  RecipientTypeLabels,
  NotificationTypeLabels,
  NotificationType,
  NotificationChannel,
  UserRole,
} from '@/types'
import { useAuth } from '@/contexts/AuthContext'

type TabType = 'rules' | 'templates' | 'notifications' | 'executions' | 'webhooks'

// Action type filter options
const ACTION_TYPES: { id: ActionType | 'all'; label: string; icon: React.ElementType }[] = [
  { id: 'all', label: 'All Actions', icon: LayoutGrid },
  { id: 'send_notification', label: 'Notifications', icon: Bell },
  { id: 'send_webhook', label: 'Webhooks', icon: Send },
  { id: 'update_field', label: 'Update Field', icon: Pencil },
  { id: 'create_activity', label: 'Log Activity', icon: FileText },
]

// Model type labels for sub-filter
const MODEL_LABELS: Record<string, string> = {
  'all': 'All Models',
  'jobs.job': 'Jobs',
  'jobs.application': 'Applications',
  'jobs.applicationstageinstance': 'Stages',
  'scheduling.booking': 'Bookings',
  'authentication.clientinvitation': 'Client Invitations',
  'authentication.recruiterinvitation': 'Recruiter Invitations',
  'authentication.candidateinvitation': 'Candidate Invitations',
  'companies.companyinvitation': 'Company Invitations',
  'companies.lead': 'Leads',
  'companies.company': 'Companies',
}

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

export default function AutomationRulesPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === UserRole.ADMIN
  const { rules, isLoading, error, refetch } = useAutomationRules()
  const { update } = useUpdateAutomationRule()
  const { deleteRule, isDeleting } = useDeleteAutomationRule()

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('rules')

  // Executions state
  const [statusFilter, setStatusFilter] = useState<ExecutionStatus | ''>('')
  const { executions, isLoading: isLoadingExecutions, refetch: refetchExecutions } = useAllExecutions(
    statusFilter ? { status: statusFilter, limit: 100 } : { limit: 100 }
  )
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null)
  const { execution: executionDetail, isLoading: isLoadingDetail } = useExecutionDetail(selectedExecutionId)
  const { replay: replayExecution, isReplaying } = useReplayExecution()

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null)

  // Webhook state
  const { endpoints, isLoading: isLoadingWebhooks, refetch: refetchWebhooks } = useWebhookEndpoints()
  const { toggle: toggleWebhook } = useToggleWebhookEndpoint()
  const { deleteEndpoint, isDeleting: isDeletingWebhook } = useDeleteWebhookEndpoint()
  const [webhookDrawerOpen, setWebhookDrawerOpen] = useState(false)
  const [selectedWebhookId, setSelectedWebhookId] = useState<string | null>(null)
  const [webhookMenuOpen, setWebhookMenuOpen] = useState<string | null>(null)
  const [deleteWebhookDialogOpen, setDeleteWebhookDialogOpen] = useState(false)
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookEndpointListItem | null>(null)
  const [copiedWebhookUrl, setCopiedWebhookUrl] = useState<string | null>(null)

  // Template state
  const [templateSearch, setTemplateSearch] = useState('')
  const [templateActiveFilter, setTemplateActiveFilter] = useState<string>('')
  const [templateDrawerOpen, setTemplateDrawerOpen] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [templateMenuOpen, setTemplateMenuOpen] = useState<string | null>(null)
  const [deleteTemplateDialogOpen, setDeleteTemplateDialogOpen] = useState(false)
  const [selectedTemplateForDelete, setSelectedTemplateForDelete] = useState<{ id: string; name: string } | null>(null)

  // Template hooks
  const { templates, isLoading: isLoadingTemplates, refetch: refetchTemplates } = useNotificationTemplates({
    search: templateSearch,
    isActive: templateActiveFilter === '' ? null : templateActiveFilter === 'true',
  })
  const { deleteTemplate, isDeleting: isDeletingTemplate } = useDeleteTemplate()

  // Sent notifications state
  const [notificationSearch, setNotificationSearch] = useState('')
  const [notificationTypeFilter, setNotificationTypeFilter] = useState<NotificationType | ''>('')
  const [notificationChannelFilter, setNotificationChannelFilter] = useState<NotificationChannel | ''>('')
  const [notificationReadFilter, setNotificationReadFilter] = useState<string>('')
  const [notificationPage, setNotificationPage] = useState(1)
  const notificationPageSize = 20
  const [selectedNotificationIds, setSelectedNotificationIds] = useState<Set<string>>(new Set())
  const [sendNotificationDrawerOpen, setSendNotificationDrawerOpen] = useState(false)

  // Sent notifications hooks
  const {
    notifications,
    count: _notificationCount,
    numPages: notificationNumPages,
    hasNext: notificationHasNext,
    hasPrevious: notificationHasPrevious,
    isLoading: isLoadingNotifications,
    refetch: refetchNotifications,
  } = useAdminNotifications({
    page: notificationPage,
    pageSize: notificationPageSize,
    notificationType: notificationTypeFilter || undefined,
    channel: notificationChannelFilter || undefined,
    isRead: notificationReadFilter === '' ? null : notificationReadFilter === 'true',
    search: notificationSearch,
  })
  const { bulkDelete: bulkDeleteNotifications, isDeleting: isDeletingNotifications } = useBulkDeleteNotifications()

  // Webhook sub-tab state
  type WebhookSubTab = 'endpoints' | 'history'
  const [webhookSubTab, setWebhookSubTab] = useState<WebhookSubTab>('endpoints')
  const [receiptStatusFilter, setReceiptStatusFilter] = useState<string>('')
  const [receiptEndpointFilter, setReceiptEndpointFilter] = useState<string>('')
  const { receipts, isLoading: isLoadingReceipts, refetch: refetchReceipts } = useAllWebhookReceipts({
    status: receiptStatusFilter || undefined,
    endpoint: receiptEndpointFilter || undefined,
    limit: 100,
  })
  const [selectedReceipt, setSelectedReceipt] = useState<WebhookReceipt | null>(null)

  // Dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedRule, setSelectedRule] = useState<AutomationRule | null>(null)

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [actionFilter, setActionFilter] = useState<ActionType | 'all'>('all')
  const [modelFilter, setModelFilter] = useState<string>('all')

  // Menu state
  const [menuOpen, setMenuOpen] = useState<string | null>(null)

  // Get unique models for the selected action type
  const availableModels = useMemo(() => {
    const actionRules = actionFilter === 'all'
      ? rules
      : rules.filter(r => r.action_type === actionFilter)

    const models = new Set<string>()
    actionRules.forEach(r => {
      if (r.trigger_model) {
        models.add(r.trigger_model)
      }
    })
    return Array.from(models).sort()
  }, [rules, actionFilter])

  // Filter rules by action type and model
  const filteredByAction = useMemo(() => {
    let result = rules

    if (actionFilter !== 'all') {
      result = result.filter(r => r.action_type === actionFilter)
    }

    if (modelFilter !== 'all') {
      result = result.filter(r => r.trigger_model === modelFilter)
    }

    return result
  }, [rules, actionFilter, modelFilter])

  // Count rules per action type
  const actionCounts = useMemo(() => {
    const counts: Record<ActionType | 'all', number> = {
      all: rules.length,
      send_notification: 0,
      send_webhook: 0,
      update_field: 0,
      create_activity: 0,
    }
    rules.forEach(r => {
      if (counts[r.action_type] !== undefined) {
        counts[r.action_type]++
      }
    })
    return counts
  }, [rules])

  // Reset model filter when action filter changes
  const handleActionFilterChange = (action: ActionType | 'all') => {
    setActionFilter(action)
    setModelFilter('all')
  }

  // Open drawer for new rule
  const handleNewRule = () => {
    setSelectedRuleId(null)
    setDrawerOpen(true)
  }

  // Open drawer for editing
  const handleEditRule = (ruleId: string) => {
    setSelectedRuleId(ruleId)
    setDrawerOpen(true)
  }

  // Close drawer and refetch
  const handleDrawerClose = () => {
    setDrawerOpen(false)
    setSelectedRuleId(null)
  }

  const handleDrawerSaved = () => {
    setDrawerOpen(false)
    setSelectedRuleId(null)
    refetch()
  }

  const handleToggleActive = async (rule: AutomationRule) => {
    try {
      await update({
        id: rule.id,
        data: { is_active: !rule.is_active },
      })
      refetch()
    } catch (err) {
      console.error('Failed to toggle rule:', err)
    }
    setMenuOpen(null)
  }

  const handleDeleteRule = async () => {
    if (!selectedRule) return

    try {
      await deleteRule(selectedRule.id)
      setDeleteDialogOpen(false)
      setSelectedRule(null)
      refetch()
    } catch (err) {
      console.error('Failed to delete rule:', err)
    }
  }

  // Template handlers
  const handleNewTemplate = () => {
    setSelectedTemplateId(null)
    setTemplateDrawerOpen(true)
  }

  const handleEditTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId)
    setTemplateDrawerOpen(true)
  }

  const handleTemplateDrawerClose = () => {
    setTemplateDrawerOpen(false)
    setSelectedTemplateId(null)
  }

  const handleTemplateDrawerSaved = () => {
    setTemplateDrawerOpen(false)
    setSelectedTemplateId(null)
    refetchTemplates()
  }

  const handleDeleteTemplate = async () => {
    if (!selectedTemplateForDelete) return

    try {
      await deleteTemplate(selectedTemplateForDelete.id)
      setDeleteTemplateDialogOpen(false)
      setSelectedTemplateForDelete(null)
      refetchTemplates()
    } catch (err) {
      console.error('Failed to delete template:', err)
    }
  }

  // Notification handlers
  const handleSelectAllNotifications = () => {
    if (selectedNotificationIds.size === notifications.length) {
      setSelectedNotificationIds(new Set())
    } else {
      setSelectedNotificationIds(new Set(notifications.map((n) => n.id)))
    }
  }

  const handleSelectNotification = (id: string) => {
    const newSet = new Set(selectedNotificationIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedNotificationIds(newSet)
  }

  const handleBulkDeleteNotifications = async () => {
    if (selectedNotificationIds.size === 0) return
    if (!confirm(`Delete ${selectedNotificationIds.size} notification(s)?`)) return

    try {
      await bulkDeleteNotifications(Array.from(selectedNotificationIds))
      setSelectedNotificationIds(new Set())
      refetchNotifications()
    } catch (err) {
      console.error('Failed to delete notifications:', err)
    }
  }

  const formatNotificationDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)

    if (hours < 1) return 'Just now'
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Filter rules by search query (on top of action/model filter)
  const filteredRules = filteredByAction.filter(rule =>
    rule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    rule.trigger_display?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    rule.action_display?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Stats calculations
  const totalRules = rules.length
  const activeRules = rules.filter(r => r.is_active).length

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 p-4 rounded-lg">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-[13px]">Failed to load automation rules: {String(error)}</span>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Automations</h1>
        <p className="text-sm text-gray-500 mt-1">
          Configure automation rules, notification templates, and webhooks.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b mb-6">
        <button
          onClick={() => setActiveTab('rules')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'rules'
              ? 'border-gray-900 text-gray-900'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Zap className="w-4 h-4" />
          Rules
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'templates'
              ? 'border-gray-900 text-gray-900'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <FileText className="w-4 h-4" />
          Templates
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'notifications'
              ? 'border-gray-900 text-gray-900'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Bell className="w-4 h-4" />
          Sent
        </button>
        <button
          onClick={() => setActiveTab('webhooks')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'webhooks'
              ? 'border-gray-900 text-gray-900'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Link2 className="w-4 h-4" />
          Webhooks
        </button>
        <button
          onClick={() => setActiveTab('executions')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'executions'
              ? 'border-gray-900 text-gray-900'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <History className="w-4 h-4" />
          History
        </button>
      </div>

      {/* Rules Tab */}
      {activeTab === 'rules' && (
        <>
          {/* Rules Header */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">
              {isLoading ? 'Loading...' : `${activeRules} active of ${totalRules} rules`}
            </p>
            <button
              onClick={handleNewRule}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Rule
            </button>
          </div>

          {/* Action Type Filter */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {ACTION_TYPES.map((action) => {
              const Icon = action.icon
              const count = actionCounts[action.id]
              const isActive = actionFilter === action.id
              return (
                <button
                  key={action.id}
                  onClick={() => handleActionFilterChange(action.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
                    isActive
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {action.label}
                  <span className={`ml-0.5 px-1.5 py-0.5 rounded text-[10px] ${
                    isActive ? 'bg-white/20' : 'bg-gray-200'
                  }`}>
                    {count}
                  </span>
                </button>
              )
            })}

            {/* Model Sub-filter - only show when not "All Actions" */}
            {actionFilter !== 'all' && availableModels.length > 1 && (
              <>
                <div className="w-px h-6 bg-gray-300 mx-2" />
                <select
                  value={modelFilter}
                  onChange={(e) => setModelFilter(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-[12px] font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                >
                  <option value="all">All Models ({filteredByAction.length})</option>
                  {availableModels.map(model => (
                    <option key={model} value={model}>
                      {MODEL_LABELS[model] || model.split('.')[1]}
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>

          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search rules..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          </div>

          {/* Rules List */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-8 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : filteredRules.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <Zap className="w-6 h-6 text-gray-400" />
            </div>
            <h3 className="text-[14px] font-medium text-gray-900 mb-1">
              {searchQuery
                ? 'No rules match your search'
                : actionFilter !== 'all' || modelFilter !== 'all'
                  ? 'No rules match your filters'
                  : 'No automation rules yet'}
            </h3>
            <p className="text-[13px] text-gray-500 mb-4">
              {searchQuery
                ? 'Try adjusting your search query'
                : actionFilter !== 'all' || modelFilter !== 'all'
                  ? 'Try adjusting your filter selection'
                  : 'Create your first rule to automate actions based on triggers'}
            </p>
            {!searchQuery && actionFilter === 'all' && modelFilter === 'all' && (
              <button
                onClick={handleNewRule}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-[13px] font-medium rounded-lg hover:bg-gray-800"
              >
                <Plus className="w-4 h-4" />
                Create Rule
              </button>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                  Rule
                </th>
                <th className="text-left px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                  Trigger
                </th>
                <th className="text-left px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                  Conditions
                </th>
                <th className="text-left px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="text-left px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-center px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                  Executions
                </th>
                <th className="text-left px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                  Last Run
                </th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredRules.map((rule) => (
                <tr
                  key={rule.id}
                  onClick={() => handleEditRule(rule.id)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-[13px] font-medium text-gray-900">{rule.name}</p>
                      {rule.description && (
                        <p className="text-[12px] text-gray-500 truncate max-w-xs">
                          {rule.description}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-green-50 text-green-700 text-[11px] font-medium rounded">
                        {triggerLabels[rule.trigger_type] || rule.trigger_type}
                      </span>
                      <span className="text-[12px] text-gray-600">
                        {rule.trigger_model?.split('.')[1] || rule.trigger_model}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {!rule.trigger_conditions || rule.trigger_conditions.length === 0 ? (
                      <span className="text-[12px] text-gray-400 italic">None</span>
                    ) : (
                      <div className="space-y-0.5 max-w-[200px]">
                        {rule.trigger_conditions.slice(0, 2).map((condition, idx) => (
                          <div key={idx} className="flex items-center gap-1 text-[11px]">
                            <span className="font-medium text-gray-700 truncate max-w-[60px]">
                              {condition.field}
                            </span>
                            <span className="text-gray-400">
                              {condition.operator === 'equals' ? '=' : condition.operator === 'not_equals' ? '≠' : condition.operator}
                            </span>
                            {!['is_empty', 'is_not_empty'].includes(condition.operator) && (
                              <span className="text-gray-600 truncate max-w-[60px]">
                                {Array.isArray(condition.value) ? condition.value.join(', ') : condition.value}
                              </span>
                            )}
                          </div>
                        ))}
                        {rule.trigger_conditions.length > 2 && (
                          <span className="text-[10px] text-gray-400">
                            +{rule.trigger_conditions.length - 2} more
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="p-1 bg-blue-50 text-blue-600 rounded">
                        {actionIcons[rule.action_type]}
                      </span>
                      <span className="text-[12px] text-gray-600">
                        {actionLabels[rule.action_type] || rule.action_type}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                        rule.is_active
                          ? 'bg-green-50 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          rule.is_active ? 'bg-green-500' : 'bg-gray-400'
                        }`}
                      />
                      {rule.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="inline-flex items-center gap-2">
                      <span className="text-[13px] font-medium text-gray-900">{rule.total_executions}</span>
                      <span className="text-[12px] text-green-600">{rule.total_success}</span>
                      <span className="text-gray-300">/</span>
                      <span className="text-[12px] text-red-600">{rule.total_failed}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[12px] text-gray-500">
                      {formatDate(rule.last_triggered_at)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setMenuOpen(menuOpen === rule.id ? null : rule.id)
                        }}
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <MoreVertical className="w-4 h-4 text-gray-500" />
                      </button>
                      {menuOpen === rule.id && (
                        <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEditRule(rule.id)
                              setMenuOpen(null)
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            Edit
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleToggleActive(rule)
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50"
                          >
                            {rule.is_active ? (
                              <>
                                <Pause className="w-3.5 h-3.5" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <Play className="w-3.5 h-3.5" />
                                Activate
                              </>
                            )}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEditRule(rule.id)
                              setMenuOpen(null)
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50"
                          >
                            <History className="w-3.5 h-3.5" />
                            View History
                          </button>
                          <div className="my-1 border-t border-gray-100" />
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedRule(rule)
                              setDeleteDialogOpen(true)
                              setMenuOpen(null)
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
        </>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <>
          {/* Templates Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={templateSearch}
                  onChange={(e) => setTemplateSearch(e.target.value)}
                  placeholder="Search templates..."
                  className="pl-9 pr-4 py-2 w-64 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>
              <select
                value={templateActiveFilter}
                onChange={(e) => setTemplateActiveFilter(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                <option value="">All Status</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
            <button
              onClick={handleNewTemplate}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Template
            </button>
          </div>

          {/* Templates Table */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            {isLoadingTemplates ? (
              <div className="p-8 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : templates.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <FileText className="w-6 h-6 text-gray-400" />
                </div>
                <h3 className="text-[14px] font-medium text-gray-900 mb-1">
                  No templates yet
                </h3>
                <p className="text-[13px] text-gray-500 mb-4">
                  Create reusable notification templates for your automation rules
                </p>
                <button
                  onClick={handleNewTemplate}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-[13px] font-medium rounded-lg hover:bg-gray-800"
                >
                  <Plus className="w-4 h-4" />
                  Create Template
                </button>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                      Template
                    </th>
                    <th className="text-left px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="text-left px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                      Recipient
                    </th>
                    <th className="text-left px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                      Channel
                    </th>
                    <th className="text-left px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {templates.map((template) => (
                    <tr
                      key={template.id}
                      onClick={() => handleEditTemplate(template.id)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-[13px] font-medium text-gray-900">
                            {template.name}
                          </p>
                          {template.description && (
                            <p className="text-[12px] text-gray-500 truncate max-w-xs">
                              {template.description}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[12px] text-gray-600">
                          {template.template_type || 'Custom'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[12px] text-gray-600">
                          {RecipientTypeLabels[template.recipient_type as keyof typeof RecipientTypeLabels] || template.recipient_type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-[11px] font-medium rounded">
                          {NotificationChannelLabels[template.default_channel as keyof typeof NotificationChannelLabels] || template.default_channel}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                            template.is_active
                              ? 'bg-green-50 text-green-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              template.is_active ? 'bg-green-500' : 'bg-gray-400'
                            }`}
                          />
                          {template.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setTemplateMenuOpen(templateMenuOpen === template.id ? null : template.id)
                            }}
                            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <MoreVertical className="w-4 h-4 text-gray-500" />
                          </button>
                          {templateMenuOpen === template.id && (
                            <div className="absolute right-0 mt-1 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleEditTemplate(template.id)
                                  setTemplateMenuOpen(null)
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                Edit
                              </button>
                              <div className="my-1 border-t border-gray-100" />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedTemplateForDelete({ id: template.id, name: template.name })
                                  setDeleteTemplateDialogOpen(true)
                                  setTemplateMenuOpen(null)
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <>
          {/* Notifications Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by email or title..."
                  value={notificationSearch}
                  onChange={(e) => {
                    setNotificationSearch(e.target.value)
                    setNotificationPage(1)
                  }}
                  className="pl-9 pr-4 py-2 w-64 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
              <select
                value={notificationTypeFilter}
                onChange={(e) => {
                  setNotificationTypeFilter(e.target.value as NotificationType | '')
                  setNotificationPage(1)
                }}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                <option value="">All Types</option>
                {Object.entries(NotificationTypeLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
              <select
                value={notificationChannelFilter}
                onChange={(e) => {
                  setNotificationChannelFilter(e.target.value as NotificationChannel | '')
                  setNotificationPage(1)
                }}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                <option value="">All Channels</option>
                {Object.entries(NotificationChannelLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
              <select
                value={notificationReadFilter}
                onChange={(e) => {
                  setNotificationReadFilter(e.target.value)
                  setNotificationPage(1)
                }}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                <option value="">All Status</option>
                <option value="true">Read</option>
                <option value="false">Unread</option>
              </select>
            </div>
            <button
              onClick={() => setSendNotificationDrawerOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 transition-colors"
            >
              <Send className="w-4 h-4" />
              Send
            </button>
          </div>

          {/* Bulk actions */}
          {isAdmin && selectedNotificationIds.size > 0 && (
            <div className="flex items-center gap-4 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg">
              <span className="text-[13px] text-gray-600">
                {selectedNotificationIds.size} selected
              </span>
              <button
                onClick={handleBulkDeleteNotifications}
                disabled={isDeletingNotifications}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] text-error hover:bg-error/10 rounded-lg disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                Delete Selected
              </button>
            </div>
          )}

          {/* Table */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            {isLoadingNotifications ? (
              <div className="p-8 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <Bell className="w-6 h-6 text-gray-400" />
                </div>
                <h3 className="text-[14px] font-medium text-gray-900 mb-1">No notifications found</h3>
                <p className="text-[13px] text-gray-500">Try adjusting your filters</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {isAdmin && (
                      <th className="px-4 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedNotificationIds.size === notifications.length && notifications.length > 0}
                          onChange={handleSelectAllNotifications}
                          className="rounded border-gray-300"
                        />
                      </th>
                    )}
                    <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                      Recipient
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                      Channel
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                      Sent
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {notifications.map((notification) => (
                    <tr key={notification.id} className="hover:bg-gray-50">
                      {isAdmin && (
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedNotificationIds.has(notification.id)}
                            onChange={() => handleSelectNotification(notification.id)}
                            className="rounded border-gray-300"
                          />
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <div className="text-[13px] text-gray-900">{notification.recipient_name}</div>
                        <div className="text-[12px] text-gray-500">{notification.recipient_email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[13px] text-gray-700">
                          {notification.notification_type_display || notification.notification_type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[13px] text-gray-900 line-clamp-1">{notification.title}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[13px] text-gray-600">
                          {notification.channel_display || notification.channel}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span
                            className={`inline-flex px-2 py-0.5 text-[11px] font-medium rounded ${
                              notification.is_read
                                ? 'bg-gray-100 text-gray-600'
                                : 'badge-secondary'
                            }`}
                          >
                            {notification.is_read ? 'Read' : 'Unread'}
                          </span>
                          {notification.email_sent && (
                            <span className="inline-flex px-2 py-0.5 text-[11px] font-medium rounded badge-success">
                              Email Sent
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[13px] text-gray-500">
                          {formatNotificationDate(notification.sent_at)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Pagination */}
            {notificationNumPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
                <span className="text-[13px] text-gray-600">
                  Page {notificationPage} of {notificationNumPages}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setNotificationPage((p) => p - 1)}
                    disabled={!notificationHasPrevious}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-[13px] border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>
                  <button
                    onClick={() => setNotificationPage((p) => p + 1)}
                    disabled={!notificationHasNext}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-[13px] border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Webhooks Tab */}
      {activeTab === 'webhooks' && (
        <div>
          {/* Header with sub-tabs */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="flex bg-gray-100 rounded-md p-1">
                <button
                  onClick={() => setWebhookSubTab('endpoints')}
                  className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                    webhookSubTab === 'endpoints'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Endpoints
                </button>
                <button
                  onClick={() => setWebhookSubTab('history')}
                  className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                    webhookSubTab === 'history'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  History
                </button>
              </div>
            </div>
            {webhookSubTab === 'endpoints' && (
              <button
                onClick={() => {
                  setSelectedWebhookId(null)
                  setWebhookDrawerOpen(true)
                }}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800"
              >
                <Plus className="w-4 h-4" />
                New Webhook
              </button>
            )}
            {webhookSubTab === 'history' && (
              <button
                onClick={() => refetchReceipts()}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            )}
          </div>

          {/* Endpoints Sub-tab */}
          {webhookSubTab === 'endpoints' && (
          <>
          {/* Webhooks Table */}
          <div className="bg-white border border-gray-200 rounded-lg">
            {isLoadingWebhooks ? (
              <div className="p-8 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : endpoints.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <Link2 className="w-6 h-6 text-gray-400" />
                </div>
                <h3 className="text-[14px] font-medium text-gray-900 mb-1">No webhook endpoints yet</h3>
                <p className="text-[13px] text-gray-500 mb-4">
                  Create a webhook endpoint to receive data from external systems like forms, Zapier, or other platforms.
                </p>
                <button
                  onClick={() => {
                    setSelectedWebhookId(null)
                    setWebhookDrawerOpen(true)
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-[13px] font-medium rounded-lg hover:bg-gray-800"
                >
                  <Plus className="w-4 h-4" />
                  Create Webhook Endpoint
                </button>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                      Endpoint
                    </th>
                    <th className="text-left px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                      Target
                    </th>
                    <th className="text-left px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                      Auth
                    </th>
                    <th className="text-left px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-center px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                      Received
                    </th>
                    <th className="text-left px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                      Last Received
                    </th>
                    <th className="w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {endpoints.map((endpoint) => (
                    <tr
                      key={endpoint.id}
                      onClick={() => {
                        setSelectedWebhookId(endpoint.id)
                        setWebhookDrawerOpen(true)
                      }}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-[13px] font-medium text-gray-900">{endpoint.name}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <code className="text-[11px] text-gray-500 font-mono truncate max-w-[200px]">
                              {endpoint.webhook_url}
                            </code>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                const fullUrl = `${window.location.origin}${endpoint.webhook_url}`
                                navigator.clipboard.writeText(fullUrl)
                                setCopiedWebhookUrl(endpoint.id)
                                setTimeout(() => setCopiedWebhookUrl(null), 2000)
                              }}
                              className="p-0.5 text-gray-400 hover:text-gray-600"
                            >
                              {copiedWebhookUrl === endpoint.id ? (
                                <Check className="w-3 h-3 text-green-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[11px] font-medium rounded">
                            {endpoint.target_action}
                          </span>
                          <span className="text-[12px] text-gray-600">
                            {endpoint.target_model_display}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${
                          endpoint.auth_type === 'api_key'
                            ? 'bg-green-50 text-green-700'
                            : endpoint.auth_type === 'hmac'
                              ? 'bg-purple-50 text-purple-700'
                              : 'bg-gray-100 text-gray-600'
                        }`}>
                          {endpoint.auth_type === 'api_key' && <Key className="w-3 h-3" />}
                          {endpoint.auth_type === 'hmac' && <Shield className="w-3 h-3" />}
                          {endpoint.auth_type === 'api_key' ? 'API Key' : endpoint.auth_type === 'hmac' ? 'HMAC' : 'None'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                            endpoint.is_active
                              ? 'bg-green-50 text-green-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              endpoint.is_active ? 'bg-green-500' : 'bg-gray-400'
                            }`}
                          />
                          {endpoint.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="inline-flex items-center gap-2">
                          <span className="text-[13px] font-medium text-gray-900">{endpoint.total_received}</span>
                          <span className="text-[12px] text-green-600">{endpoint.total_success}</span>
                          <span className="text-gray-300">/</span>
                          <span className="text-[12px] text-red-600">{endpoint.total_failed}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[12px] text-gray-500">
                          {endpoint.last_received_at
                            ? formatDistanceToNow(new Date(endpoint.last_received_at), { addSuffix: true })
                            : 'Never'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setWebhookMenuOpen(webhookMenuOpen === endpoint.id ? null : endpoint.id)
                            }}
                            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <MoreVertical className="w-4 h-4 text-gray-500" />
                          </button>
                          {webhookMenuOpen === endpoint.id && (
                            <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedWebhookId(endpoint.id)
                                  setWebhookDrawerOpen(true)
                                  setWebhookMenuOpen(null)
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                Edit
                              </button>
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation()
                                  await toggleWebhook(endpoint.id)
                                  refetchWebhooks()
                                  setWebhookMenuOpen(null)
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50"
                              >
                                {endpoint.is_active ? (
                                  <>
                                    <Pause className="w-3.5 h-3.5" />
                                    Deactivate
                                  </>
                                ) : (
                                  <>
                                    <Play className="w-3.5 h-3.5" />
                                    Activate
                                  </>
                                )}
                              </button>
                              <div className="my-1 border-t border-gray-100" />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedWebhook(endpoint)
                                  setDeleteWebhookDialogOpen(true)
                                  setWebhookMenuOpen(null)
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          </>
          )}

          {/* History Sub-tab */}
          {webhookSubTab === 'history' && (
            <div className="flex gap-6">
              {/* Receipts List */}
              <div className="flex-1">
                {/* Filters */}
                <div className="flex items-center gap-3 mb-4">
                  <select
                    value={receiptStatusFilter}
                    onChange={(e) => setReceiptStatusFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  >
                    <option value="">All statuses</option>
                    <option value="success">Success</option>
                    <option value="failed">Failed</option>
                    <option value="invalid_auth">Invalid Auth</option>
                    <option value="validation_error">Validation Error</option>
                    <option value="rate_limited">Rate Limited</option>
                  </select>
                  <select
                    value={receiptEndpointFilter}
                    onChange={(e) => setReceiptEndpointFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  >
                    <option value="">All endpoints</option>
                    {endpoints.map((ep) => (
                      <option key={ep.id} value={ep.id}>{ep.name}</option>
                    ))}
                  </select>
                </div>

                {/* Receipts Table */}
                <div className="bg-white border border-gray-200 rounded-lg">
                  {isLoadingReceipts ? (
                    <div className="p-8 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                  ) : receipts.length === 0 ? (
                    <div className="p-8 text-center">
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                        <History className="w-6 h-6 text-gray-400" />
                      </div>
                      <h3 className="text-[14px] font-medium text-gray-900 mb-1">No webhook receipts yet</h3>
                      <p className="text-[13px] text-gray-500">
                        Incoming webhook requests will appear here
                      </p>
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                          <th className="text-left px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="text-left px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                            Endpoint
                          </th>
                          <th className="text-left px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                            IP Address
                          </th>
                          <th className="text-left px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                            Processing
                          </th>
                          <th className="text-left px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                            Created Record
                          </th>
                          <th className="text-left px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                            Received
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {receipts.map((receipt) => (
                          <tr
                            key={receipt.id}
                            onClick={() => setSelectedReceipt(receipt)}
                            className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                              selectedReceipt?.id === receipt.id ? 'bg-blue-50' : ''
                            }`}
                          >
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                                receipt.status === 'success'
                                  ? 'bg-green-50 text-green-700'
                                  : receipt.status === 'failed'
                                    ? 'bg-red-50 text-red-700'
                                    : receipt.status === 'invalid_auth'
                                      ? 'bg-orange-50 text-orange-700'
                                      : receipt.status === 'rate_limited'
                                        ? 'bg-yellow-50 text-yellow-700'
                                        : 'bg-amber-50 text-amber-700'
                              }`}>
                                {receipt.status === 'success' && <Check className="w-3 h-3" />}
                                {receipt.status === 'failed' && <X className="w-3 h-3" />}
                                {receipt.status === 'invalid_auth' && <Key className="w-3 h-3" />}
                                {receipt.status === 'rate_limited' && <AlertCircle className="w-3 h-3" />}
                                {receipt.status === 'validation_error' && <AlertCircle className="w-3 h-3" />}
                                {receipt.status.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-[13px] font-medium text-gray-900">
                                {receipt.endpoint_name || 'Unknown'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <code className="text-[12px] text-gray-600 font-mono">
                                {receipt.ip_address}
                              </code>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-[12px] text-gray-600">
                                {receipt.processing_time_ms ? `${receipt.processing_time_ms}ms` : '—'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {receipt.created_object_id ? (
                                <code className="text-[11px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-mono">
                                  {receipt.created_object_id.substring(0, 8)}...
                                </code>
                              ) : (
                                <span className="text-[12px] text-gray-400">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-[12px] text-gray-500">
                                {formatDistanceToNow(new Date(receipt.created_at), { addSuffix: true })}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* Receipt Detail Panel */}
              {selectedReceipt && (
                <div className="w-[400px] flex-shrink-0">
                  <div className="bg-white border border-gray-200 rounded-lg sticky top-4">
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                      <h3 className="text-[13px] font-semibold text-gray-900">Receipt Details</h3>
                      <button
                        onClick={() => setSelectedReceipt(null)}
                        className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Content */}
                    <div className="p-4 max-h-[calc(100vh-200px)] overflow-y-auto space-y-4">
                      {/* Status */}
                      <div>
                        <label className="block text-[11px] font-medium text-gray-500 uppercase mb-1">Status</label>
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[12px] font-medium ${
                          selectedReceipt.status === 'success'
                            ? 'bg-green-50 text-green-700'
                            : 'bg-red-50 text-red-700'
                        }`}>
                          {selectedReceipt.status === 'success' ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                          {selectedReceipt.status.replace('_', ' ')}
                        </span>
                      </div>

                      {/* Endpoint */}
                      <div>
                        <label className="block text-[11px] font-medium text-gray-500 uppercase mb-1">Endpoint</label>
                        <span className="text-[13px] text-gray-900">{selectedReceipt.endpoint_name}</span>
                      </div>

                      {/* IP Address */}
                      <div>
                        <label className="block text-[11px] font-medium text-gray-500 uppercase mb-1">IP Address</label>
                        <code className="text-[12px] text-gray-700 bg-gray-100 px-2 py-1 rounded font-mono">
                          {selectedReceipt.ip_address}
                        </code>
                      </div>

                      {/* Received At */}
                      <div>
                        <label className="block text-[11px] font-medium text-gray-500 uppercase mb-1">Received</label>
                        <span className="text-[13px] text-gray-900">
                          {new Date(selectedReceipt.created_at).toLocaleString()}
                        </span>
                      </div>

                      {/* Processing Time */}
                      {selectedReceipt.processing_time_ms && (
                        <div>
                          <label className="block text-[11px] font-medium text-gray-500 uppercase mb-1">Processing Time</label>
                          <span className="text-[13px] text-gray-900">{selectedReceipt.processing_time_ms}ms</span>
                        </div>
                      )}

                      {/* Created Record */}
                      {selectedReceipt.created_object_id && (
                        <div>
                          <label className="block text-[11px] font-medium text-gray-500 uppercase mb-1">Created Record ID</label>
                          <code className="text-[12px] text-gray-700 bg-gray-100 px-2 py-1 rounded font-mono break-all">
                            {selectedReceipt.created_object_id}
                          </code>
                        </div>
                      )}

                      {/* Error Message */}
                      {selectedReceipt.error_message && (
                        <div>
                          <label className="block text-[11px] font-medium text-gray-500 uppercase mb-1">Error</label>
                          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                            <pre className="text-[12px] text-red-700 whitespace-pre-wrap font-mono">
                              {selectedReceipt.error_message}
                            </pre>
                          </div>
                        </div>
                      )}

                      {/* Payload */}
                      <div>
                        <label className="block text-[11px] font-medium text-gray-500 uppercase mb-1">Payload</label>
                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg overflow-x-auto">
                          <pre className="text-[11px] text-gray-700 font-mono">
                            {JSON.stringify(selectedReceipt.payload, null, 2)}
                          </pre>
                        </div>
                      </div>

                      {/* Headers */}
                      <div>
                        <label className="block text-[11px] font-medium text-gray-500 uppercase mb-1">Headers</label>
                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg overflow-x-auto">
                          <pre className="text-[11px] text-gray-700 font-mono">
                            {JSON.stringify(selectedReceipt.headers, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Executions Tab */}
      {activeTab === 'executions' && (
        <div className="flex gap-6">
          {/* Executions List */}
          <div className="flex-1">
            {/* Filters */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as ExecutionStatus | '')}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
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
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>

            {/* Executions Table */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              {isLoadingExecutions ? (
                <div className="p-8 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : executions.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                    <History className="w-6 h-6 text-gray-400" />
                  </div>
                  <h3 className="text-[14px] font-medium text-gray-900 mb-1">No executions yet</h3>
                  <p className="text-[13px] text-gray-500">
                    Executions will appear here when rules are triggered
                  </p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="text-left px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                        Rule
                      </th>
                      <th className="text-left px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                        Trigger
                      </th>
                      <th className="text-left px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                      <th className="text-left px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                        Duration
                      </th>
                      <th className="text-left px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                        Time
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {executions.map((execution) => (
                      <tr
                        key={execution.id}
                        onClick={() => setSelectedExecutionId(execution.id)}
                        className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                          selectedExecutionId === execution.id ? 'bg-blue-50' : ''
                        }`}
                      >
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${statusStyles[execution.status]}`}>
                            {statusIcons[execution.status]}
                            {execution.status}
                          </span>
                          {execution.is_test && (
                            <span className="ml-2 px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-[11px] font-medium inline-flex items-center gap-1">
                              <TestTube className="w-3 h-3" />
                              Test
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[13px] font-medium text-gray-900">
                            {execution.rule_name || 'Unknown Rule'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-green-50 text-green-700 text-[11px] font-medium rounded">
                              {triggerLabels[execution.trigger_type as TriggerType] || execution.trigger_type}
                            </span>
                            <span className="text-[12px] text-gray-600">
                              {execution.trigger_model?.split('.')[1] || execution.trigger_model}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="p-1 bg-blue-50 text-blue-600 rounded">
                              {actionIcons[execution.action_type as ActionType]}
                            </span>
                            <span className="text-[12px] text-gray-600">
                              {actionLabels[execution.action_type as ActionType] || execution.action_type}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[12px] text-gray-500">
                            {execution.duration_display || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[12px] text-gray-500">
                            {formatDistanceToNow(new Date(execution.started_at), { addSuffix: true })}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Execution Detail Panel */}
          {selectedExecutionId && (
            <div className="w-[400px] flex-shrink-0">
              <div className="bg-white border border-gray-200 rounded-lg sticky top-4">
                {/* Header */}
                <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-[13px] font-semibold text-gray-900">Execution Details</h3>
                  <button
                    onClick={() => setSelectedExecutionId(null)}
                    className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-4 max-h-[calc(100vh-200px)] overflow-y-auto">
                  {isLoadingDetail ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                  ) : executionDetail ? (
                    <div className="space-y-4">
                      {/* Status */}
                      <div>
                        <label className="block text-[11px] font-medium text-gray-500 uppercase mb-1">Status</label>
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[12px] font-medium ${statusStyles[executionDetail.status]}`}>
                          {statusIcons[executionDetail.status]}
                          {executionDetail.status}
                        </span>
                        {executionDetail.is_test && (
                          <span className="ml-2 px-2 py-1 bg-purple-50 text-purple-700 rounded-full text-[12px] font-medium">
                            Test Run
                          </span>
                        )}
                      </div>

                      {/* Rule */}
                      <div>
                        <label className="block text-[11px] font-medium text-gray-500 uppercase mb-1">Rule</label>
                        <button
                          onClick={() => {
                            handleEditRule(executionDetail.rule)
                            setActiveTab('rules')
                          }}
                          className="text-[13px] font-medium text-blue-600 hover:underline flex items-center gap-1"
                        >
                          {executionDetail.rule_name}
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Trigger Info */}
                      <div>
                        <label className="block text-[11px] font-medium text-gray-500 uppercase mb-1">Trigger</label>
                        <div className="text-[13px] text-gray-900">
                          <span className="px-2 py-0.5 bg-green-50 text-green-700 text-[11px] font-medium rounded mr-2">
                            {triggerLabels[executionDetail.trigger_type as TriggerType] || executionDetail.trigger_type}
                          </span>
                          {executionDetail.trigger_model}
                        </div>
                        {executionDetail.trigger_object_id && (
                          <div className="text-[12px] text-gray-500 mt-1">
                            Record ID: <code className="bg-gray-100 px-1 rounded">{executionDetail.trigger_object_id}</code>
                          </div>
                        )}
                      </div>

                      {/* Timestamps */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-medium text-gray-500 uppercase mb-1">Started</label>
                          <div className="text-[12px] text-gray-900">
                            {new Date(executionDetail.started_at).toLocaleString()}
                          </div>
                        </div>
                        {executionDetail.completed_at && (
                          <div>
                            <label className="block text-[11px] font-medium text-gray-500 uppercase mb-1">Completed</label>
                            <div className="text-[12px] text-gray-900">
                              {new Date(executionDetail.completed_at).toLocaleString()}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Duration */}
                      {executionDetail.duration_display && (
                        <div>
                          <label className="block text-[11px] font-medium text-gray-500 uppercase mb-1">Duration</label>
                          <div className="text-[13px] text-gray-900 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                            {executionDetail.duration_display}
                          </div>
                        </div>
                      )}

                      {/* Error Message */}
                      {executionDetail.error_message && (
                        <div>
                          <label className="block text-[11px] font-medium text-gray-500 uppercase mb-1">Error</label>
                          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                            <pre className="text-[12px] text-red-700 whitespace-pre-wrap font-mono">
                              {executionDetail.error_message}
                            </pre>
                          </div>
                        </div>
                      )}

                      {/* Replay Button - Show for failed executions */}
                      {executionDetail.status === 'failed' && (
                        <div>
                          <button
                            onClick={async () => {
                              try {
                                await replayExecution(executionDetail.id)
                                refetchExecutions()
                              } catch (err) {
                                console.error('Failed to replay execution:', err)
                              }
                            }}
                            disabled={isReplaying}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {isReplaying ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Replaying...
                              </>
                            ) : (
                              <>
                                <RefreshCw className="w-4 h-4" />
                                Replay Execution
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      {/* Trigger Data */}
                      {executionDetail.trigger_data && Object.keys(executionDetail.trigger_data).length > 0 && (
                        <div>
                          <label className="block text-[11px] font-medium text-gray-500 uppercase mb-1">Trigger Data</label>
                          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg overflow-x-auto">
                            <pre className="text-[11px] text-gray-700 font-mono">
                              {JSON.stringify(executionDetail.trigger_data, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}

                      {/* Action Result */}
                      {executionDetail.action_result && Object.keys(executionDetail.action_result).length > 0 && (
                        <div>
                          <label className="block text-[11px] font-medium text-gray-500 uppercase mb-1">Action Result</label>
                          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg overflow-x-auto">
                            <pre className="text-[11px] text-gray-700 font-mono">
                              {JSON.stringify(executionDetail.action_result, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}

                      {/* Triggered By */}
                      {executionDetail.triggered_by_name && (
                        <div>
                          <label className="block text-[11px] font-medium text-gray-500 uppercase mb-1">Triggered By</label>
                          <div className="text-[13px] text-gray-900">{executionDetail.triggered_by_name}</div>
                        </div>
                      )}

                      {/* Notification Details */}
                      {executionDetail.notifications && executionDetail.notifications.length > 0 && (
                        <div>
                          <label className="block text-[11px] font-medium text-gray-500 uppercase mb-1">Notification Sent</label>
                          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <Bell className="w-3.5 h-3.5 text-blue-600" />
                              <span className="text-[11px] font-medium text-blue-700">
                                {executionDetail.notifications?.length || 0} notification{(executionDetail.notifications?.length || 0) > 1 ? 's' : ''}
                              </span>
                              <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px]">
                                {executionDetail.notifications?.[0]?.channel}
                              </span>
                            </div>
                            <div className="text-[13px] font-medium text-gray-900">
                              {executionDetail.notifications?.[0]?.title}
                            </div>
                            {executionDetail.notifications?.[0]?.body && (
                              <div className="text-[12px] text-gray-600 mt-1 line-clamp-3">
                                {executionDetail.notifications?.[0]?.body}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Recipients */}
                      {((executionDetail.notifications && executionDetail.notifications.length > 0) ||
                        (executionDetail.external_emails && executionDetail.external_emails.length > 0)) && (
                        <div>
                          <label className="block text-[11px] font-medium text-gray-500 uppercase mb-1">
                            Recipients ({(executionDetail.notifications?.length || 0) + (executionDetail.external_emails?.length || 0)})
                          </label>
                          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
                            {/* Summary stats */}
                            <div className="flex items-center gap-3 text-[11px] mb-2">
                              {(() => {
                                const emailsSent = (executionDetail.notifications?.filter(n => n.email_sent).length || 0) +
                                  (executionDetail.external_emails?.filter(e => e.email_sent).length || 0)
                                const readCount = executionDetail.notifications?.filter(n => n.is_read).length || 0
                                return (
                                  <>
                                    {emailsSent > 0 && (
                                      <span className="flex items-center gap-1 text-green-600">
                                        <Mail className="w-3 h-3" />
                                        {emailsSent} email{emailsSent > 1 ? 's' : ''} sent
                                      </span>
                                    )}
                                    {readCount > 0 && (
                                      <span className="flex items-center gap-1 text-blue-600">
                                        <Check className="w-3 h-3" />
                                        {readCount} read
                                      </span>
                                    )}
                                  </>
                                )
                              })()}
                            </div>
                            {/* Individual recipients */}
                            <div className="space-y-1.5">
                              {executionDetail.notifications?.map((notif) => (
                                <div key={notif.id} className="flex items-center justify-between text-[12px]">
                                  <div className="flex items-center gap-2">
                                    <User className="w-3 h-3 text-gray-400" />
                                    <span className="text-gray-700 truncate max-w-[180px]">
                                      {notif.title}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {notif.email_sent && (
                                      <span className="flex items-center gap-1 text-green-600 text-[10px]">
                                        <Mail className="w-3 h-3" />
                                      </span>
                                    )}
                                    {notif.is_read ? (
                                      <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-[10px]">
                                        Read
                                      </span>
                                    ) : (
                                      <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px]">
                                        Unread
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                              {executionDetail.external_emails?.map((ext, idx) => (
                                <div key={idx} className="flex items-center justify-between text-[12px]">
                                  <div className="flex items-center gap-2">
                                    <ExternalLink className="w-3 h-3 text-gray-400" />
                                    <span className="text-gray-700 truncate max-w-[180px]">
                                      {ext.name || ext.email}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {ext.email_sent ? (
                                      <span className="flex items-center gap-1 text-green-600 text-[10px]">
                                        <Check className="w-3 h-3" /> Sent
                                      </span>
                                    ) : ext.email_error ? (
                                      <span className="flex items-center gap-1 text-red-600 text-[10px]" title={ext.email_error}>
                                        <X className="w-3 h-3" /> Failed
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p className="text-[13px]">Select an execution to view details</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteDialogOpen && selectedRule && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-sm mx-4">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">Delete Rule</h2>
            </div>
            <div className="p-4">
              <p className="text-gray-600">
                Are you sure you want to delete "{selectedRule.name}"? This action
                cannot be undone.
              </p>
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button
                onClick={() => setDeleteDialogOpen(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteRule}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
              >
                {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close menu when clicking outside */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setMenuOpen(null)}
        />
      )}

      {/* Rule Drawer */}
      {drawerOpen && (
        <RuleDrawer
          ruleId={selectedRuleId}
          onClose={handleDrawerClose}
          onSaved={handleDrawerSaved}
        />
      )}

      {/* Webhook Endpoint Drawer */}
      {webhookDrawerOpen && (
        <WebhookEndpointDrawer
          endpointId={selectedWebhookId}
          onClose={() => {
            setWebhookDrawerOpen(false)
            setSelectedWebhookId(null)
          }}
          onSaved={() => {
            refetchWebhooks()
            setWebhookDrawerOpen(false)
            setSelectedWebhookId(null)
          }}
        />
      )}

      {/* Delete Webhook Confirmation Dialog */}
      {deleteWebhookDialogOpen && selectedWebhook && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[300]">
          <div className="bg-white rounded-lg w-full max-w-sm mx-4">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">Delete Webhook Endpoint</h2>
            </div>
            <div className="p-4">
              <p className="text-gray-600">
                Are you sure you want to delete "{selectedWebhook.name}"? This will remove the webhook
                endpoint and any external systems sending data to it will start receiving errors.
              </p>
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button
                onClick={() => {
                  setDeleteWebhookDialogOpen(false)
                  setSelectedWebhook(null)
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (selectedWebhook) {
                    await deleteEndpoint(selectedWebhook.id)
                    setDeleteWebhookDialogOpen(false)
                    setSelectedWebhook(null)
                    refetchWebhooks()
                  }
                }}
                disabled={isDeletingWebhook}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
              >
                {isDeletingWebhook && <Loader2 className="w-4 h-4 animate-spin" />}
                {isDeletingWebhook ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close webhook menu when clicking outside */}
      {webhookMenuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setWebhookMenuOpen(null)}
        />
      )}

      {/* Template Drawer */}
      {templateDrawerOpen && (
        <TemplateDrawer
          templateId={selectedTemplateId}
          onClose={handleTemplateDrawerClose}
          onSaved={handleTemplateDrawerSaved}
        />
      )}

      {/* Send Notification Drawer */}
      {sendNotificationDrawerOpen && (
        <SendNotificationDrawer
          onClose={() => setSendNotificationDrawerOpen(false)}
          onSent={() => refetchNotifications()}
        />
      )}

      {/* Delete Template Confirmation Dialog */}
      {deleteTemplateDialogOpen && selectedTemplateForDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[300]">
          <div className="bg-white rounded-lg w-full max-w-sm mx-4 shadow-xl">
            <div className="px-5 py-4 border-b border-gray-200">
              <h2 className="text-[15px] font-semibold text-gray-900">Delete Template</h2>
            </div>
            <div className="p-5">
              <p className="text-[13px] text-gray-600">
                Are you sure you want to delete <span className="font-medium">"{selectedTemplateForDelete.name}"</span>?
                This action cannot be undone.
              </p>
            </div>
            <div className="px-5 py-4 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => setDeleteTemplateDialogOpen(false)}
                className="px-4 py-2 text-[13px] font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTemplate}
                disabled={isDeletingTemplate}
                className="px-4 py-2 bg-red-600 text-white text-[13px] font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
              >
                {isDeletingTemplate && <Loader2 className="w-4 h-4 animate-spin" />}
                {isDeletingTemplate ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close template menu when clicking outside */}
      {templateMenuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setTemplateMenuOpen(null)}
        />
      )}
    </div>
  )
}
