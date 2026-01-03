import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  type ColumnDef,
} from '@tanstack/react-table'
import { DataTable } from '@/components/common/DataTable'
import {
  useAutomationRules,
  useUpdateAutomationRule,
  useDeleteAutomationRule,
  AutomationRule,
  ActionType,
  TriggerType,
} from '@/hooks/useAutomations'
import RuleDrawer from '@/components/automations/RuleDrawer'
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
  Search,
  Zap,
  Bell,
  Send,
  FileText,
  LayoutGrid,
} from 'lucide-react'

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

const formatDate = (dateString: string | null) => {
  if (!dateString) return 'Never'
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const rulesColumnHelper = createColumnHelper<AutomationRule>()

export default function RulesTab() {
  const { rules, isLoading, error, refetch } = useAutomationRules()
  const { update } = useUpdateAutomationRule()
  const { deleteRule, isDeleting } = useDeleteAutomationRule()

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null)

  // Dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedRule, setSelectedRule] = useState<AutomationRule | null>(null)

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [actionFilter, setActionFilter] = useState<ActionType | 'all'>('all')
  const [modelFilter, setModelFilter] = useState<string>('all')

  // Menu state
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null)

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

  // Filter rules by search query
  const filteredRules = useMemo(() => {
    return filteredByAction.filter(rule =>
      rule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rule.trigger_display?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rule.action_display?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [filteredByAction, searchQuery])

  // Handlers
  const handleNewRule = () => {
    setSelectedRuleId(null)
    setDrawerOpen(true)
  }

  const handleEditRule = (ruleId: string) => {
    setSelectedRuleId(ruleId)
    setDrawerOpen(true)
  }

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
    setMenuPosition(null)
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

  // Column definitions
  const columns = useMemo<ColumnDef<AutomationRule, unknown>[]>(() => [
    rulesColumnHelper.accessor('name', {
      header: 'Rule',
      cell: ({ row }) => (
        <div>
          <p className="text-[13px] font-medium text-gray-900 dark:text-gray-100">{row.original.name}</p>
          {row.original.description && (
            <p className="text-[12px] text-gray-500 dark:text-gray-400 truncate max-w-xs">
              {row.original.description}
            </p>
          )}
        </div>
      ),
      enableSorting: false,
    }),
    rulesColumnHelper.accessor('trigger_type', {
      header: 'Trigger',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 bg-green-50 text-green-700 text-[11px] font-medium rounded">
            {triggerLabels[row.original.trigger_type] || row.original.trigger_type}
          </span>
          <span className="text-[12px] text-gray-600 dark:text-gray-400">
            {row.original.trigger_model?.split('.')[1] || row.original.trigger_model}
          </span>
        </div>
      ),
      enableSorting: false,
    }),
    rulesColumnHelper.accessor('action_type', {
      header: 'Action',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="p-1 bg-blue-50 text-blue-600 rounded">
            {actionIcons[row.original.action_type]}
          </span>
          <span className="text-[12px] text-gray-600 dark:text-gray-400">
            {actionLabels[row.original.action_type] || row.original.action_type}
          </span>
        </div>
      ),
      enableSorting: false,
    }),
    rulesColumnHelper.accessor('is_active', {
      header: 'Status',
      cell: ({ row }) => (
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${
            row.original.is_active
              ? 'bg-green-50 text-green-700'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              row.original.is_active ? 'bg-green-500' : 'bg-gray-400'
            }`}
          />
          {row.original.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
      enableSorting: false,
    }),
    rulesColumnHelper.accessor('total_executions', {
      header: 'Executions',
      cell: ({ row }) => (
        <div className="inline-flex items-center gap-2">
          <span className="text-[13px] font-medium text-gray-900 dark:text-gray-100">{row.original.total_executions}</span>
          <span className="text-[12px] text-green-600">{row.original.total_success}</span>
          <span className="text-gray-300">/</span>
          <span className="text-[12px] text-red-600">{row.original.total_failed}</span>
        </div>
      ),
      enableSorting: false,
    }),
    rulesColumnHelper.accessor('last_triggered_at', {
      header: 'Last Run',
      cell: ({ row }) => (
        <span className="text-[12px] text-gray-500 dark:text-gray-400">
          {formatDate(row.original.last_triggered_at)}
        </span>
      ),
      enableSorting: false,
    }),
    rulesColumnHelper.display({
      id: 'menu',
      header: '',
      cell: ({ row }) => (
        <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={(e) => {
              const rule = row.original
              if (menuOpen === rule.id) {
                setMenuOpen(null)
                setMenuPosition(null)
              } else {
                const rect = e.currentTarget.getBoundingClientRect()
                setMenuPosition({ top: rect.bottom + 4, left: rect.right - 160 })
                setMenuOpen(rule.id)
              }
            }}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <MoreVertical className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
      ),
      meta: { className: 'w-12' },
    }),
  ], [menuOpen])

  const table = useReactTable({
    data: filteredRules,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    enableSorting: false,
  })

  // Stats calculations
  const totalRules = rules.length
  const activeRules = rules.filter(r => r.is_active).length

  if (error) {
    return (
      <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 p-4 rounded-lg">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <span className="text-[13px]">Failed to load automation rules: {String(error)}</span>
      </div>
    )
  }

  // Get open rule for menu
  const openRule = menuOpen ? filteredRules.find(r => r.id === menuOpen) : null

  return (
    <>
      {/* Rules Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">
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
                  ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {action.label}
              <span className={`ml-0.5 px-1.5 py-0.5 rounded text-[10px] ${
                isActive
                  ? 'bg-white/20 dark:bg-gray-900/20'
                  : 'bg-gray-200 dark:bg-gray-700'
              }`}>
                {count}
              </span>
            </button>
          )
        })}

        {/* Model Sub-filter */}
        {actionFilter !== 'all' && availableModels.length > 1 && (
          <>
            <div className="w-px h-6 bg-gray-300 mx-2" />
            <select
              value={modelFilter}
              onChange={(e) => setModelFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-[12px] font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
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
      <div className="relative max-w-sm mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
        <input
          type="text"
          placeholder="Search rules..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
        />
      </div>

      {/* Rules Table */}
      <DataTable
        table={table}
        onRowClick={(row) => handleEditRule(row.id)}
        stickyColumns={{ left: [], right: ['menu'] }}
        isLoading={isLoading}
        loadingMessage="Loading rules..."
        emptyState={{
          icon: <Zap className="w-6 h-6 text-gray-400 dark:text-gray-500" />,
          title: searchQuery
            ? 'No rules match your search'
            : actionFilter !== 'all' || modelFilter !== 'all'
              ? 'No rules match your filters'
              : 'No automation rules yet',
          description: searchQuery
            ? 'Try adjusting your search query'
            : actionFilter !== 'all' || modelFilter !== 'all'
              ? 'Try adjusting your filter selection'
              : 'Create your first rule to automate actions based on triggers',
          action: !searchQuery && actionFilter === 'all' && modelFilter === 'all' ? (
            <button
              onClick={handleNewRule}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-[13px] font-medium rounded-lg hover:bg-gray-800"
            >
              <Plus className="w-4 h-4" />
              Create Rule
            </button>
          ) : undefined,
        }}
      />

      {/* Action Menu Portal */}
      {openRule && menuPosition && createPortal(
        <>
          <div
            className="fixed inset-0 z-[9998]"
            onClick={() => {
              setMenuOpen(null)
              setMenuPosition(null)
            }}
          />
          <div
            className="fixed w-40 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-[9999]"
            style={{ top: menuPosition.top, left: menuPosition.left }}
          >
            <button
              onClick={() => {
                handleEditRule(openRule.id)
                setMenuOpen(null)
                setMenuPosition(null)
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </button>
            <button
              onClick={() => handleToggleActive(openRule)}
              className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              {openRule.is_active ? (
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
              onClick={() => {
                handleEditRule(openRule.id)
                setMenuOpen(null)
                setMenuPosition(null)
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <History className="w-3.5 h-3.5" />
              View History
            </button>
            <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
            <button
              onClick={() => {
                setSelectedRule(openRule)
                setDeleteDialogOpen(true)
                setMenuOpen(null)
                setMenuPosition(null)
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          </div>
        </>,
        document.body
      )}

      {/* Rule Drawer */}
      {drawerOpen && (
        <RuleDrawer
          ruleId={selectedRuleId}
          onClose={handleDrawerClose}
          onSaved={handleDrawerSaved}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deleteDialogOpen && selectedRule && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[300]">
          <div className="bg-white dark:bg-gray-900 rounded-lg w-full max-w-sm mx-4 shadow-xl">
            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-[15px] font-semibold text-gray-900 dark:text-gray-100">Delete Rule</h2>
            </div>
            <div className="p-5">
              <p className="text-[13px] text-gray-600 dark:text-gray-400">
                Are you sure you want to delete <span className="font-medium">"{selectedRule.name}"</span>?
                This action cannot be undone.
              </p>
            </div>
            <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => {
                  setDeleteDialogOpen(false)
                  setSelectedRule(null)
                }}
                className="px-4 py-2 text-[13px] font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteRule}
                disabled={isDeleting}
                className="px-4 py-2 text-[13px] font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
              >
                {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
