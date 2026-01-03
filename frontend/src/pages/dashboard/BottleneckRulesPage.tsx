/**
 * BottleneckRulesPage - Admin page for managing bottleneck detection rules
 * Styled to match AutomationRulesPage for consistency
 */

import { useState, useMemo } from 'react'
import {
  Plus,
  AlertTriangle,
  Clock,
  Play,
  Trash2,
  Pencil,
  Pause,
  Loader2,
  Search,
  Building2,
  Users,
  Briefcase,
  ClipboardList,
  Bell,
  ListTodo,
  Calendar,
  MoreVertical,
  History,
  LayoutGrid,
  Zap,
} from 'lucide-react'
import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  type ColumnDef,
} from '@tanstack/react-table'
import {
  useBottleneckRules,
  useDeleteBottleneckRule,
  useRunBottleneckRule,
  useRunAllBottleneckRules,
  useUpdateBottleneckRule,
  type BottleneckRule,
  type BottleneckEntityType,
  type RunAllRulesResult,
} from '@/hooks/useBottlenecks'
import BottleneckRuleDrawer from '@/components/bottlenecks/BottleneckRuleDrawer'
import { ExecutionHistoryDrawer, ExecutionHistoryTab, DetectionsTab } from '@/components/bottlenecks'
import { DataTable } from '@/components/common/DataTable'

// =============================================================================
// CONSTANTS
// =============================================================================

const ENTITY_TYPES: { id: BottleneckEntityType | 'all'; label: string; icon: React.ElementType }[] = [
  { id: 'all', label: 'All Types', icon: LayoutGrid },
  { id: 'lead', label: 'Leads', icon: Building2 },
  { id: 'company', label: 'Companies', icon: Building2 },
  { id: 'candidate', label: 'Candidates', icon: Users },
  { id: 'application', label: 'Applications', icon: Briefcase },
  { id: 'stage_instance', label: 'Interviews', icon: Calendar },
  { id: 'task', label: 'Tasks', icon: ClipboardList },
]

const DETECTION_TYPE_LABELS: Record<string, string> = {
  stage_duration: 'Time in Stage',
  last_activity: 'Inactivity',
  overdue: 'Overdue',
  count_in_state: 'Count',
  custom: 'Custom',
}

type TabType = 'rules' | 'detections' | 'history'

// Column helper for type-safe column definitions
const columnHelper = createColumnHelper<BottleneckRule>()

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function BottleneckRulesPage() {
  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('rules')

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [entityFilter, setEntityFilter] = useState<BottleneckEntityType | 'all'>('all')

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null)
  const [historyRule, setHistoryRule] = useState<BottleneckRule | null>(null)

  // Menu state
  const [menuOpen, setMenuOpen] = useState<string | null>(null)

  // Action state
  const [runningRuleId, setRunningRuleId] = useState<string | null>(null)

  // Hooks
  const { rules, isLoading, error, refetch } = useBottleneckRules()
  const { deleteRule, isDeleting } = useDeleteBottleneckRule()
  const { runRule } = useRunBottleneckRule()
  const { runAllRules, isRunning: isRunningAll } = useRunAllBottleneckRules()

  // Run all results state
  const [runAllResult, setRunAllResult] = useState<RunAllRulesResult | null>(null)
  const { updateRule } = useUpdateBottleneckRule()

  // Count rules per entity type
  const entityCounts = useMemo(() => {
    const counts: Record<BottleneckEntityType | 'all', number> = {
      all: rules.length,
      lead: 0,
      company: 0,
      candidate: 0,
      application: 0,
      stage_instance: 0,
      task: 0,
    }
    rules.forEach(r => {
      if (counts[r.entity_type] !== undefined) {
        counts[r.entity_type]++
      }
    })
    return counts
  }, [rules])

  // Filter rules
  const filteredRules = useMemo(() => {
    let result = rules

    if (entityFilter !== 'all') {
      result = result.filter(r => r.entity_type === entityFilter)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(r =>
        r.name.toLowerCase().includes(query) ||
        r.description?.toLowerCase().includes(query)
      )
    }

    return result
  }, [rules, entityFilter, searchQuery])

  // Stats
  const activeRules = rules.filter(r => r.is_active).length
  const totalRules = rules.length

  // Handlers
  const handleNewRule = () => {
    setSelectedRuleId(null)
    setIsDrawerOpen(true)
  }

  const handleEditRule = (ruleId: string) => {
    setSelectedRuleId(ruleId)
    setIsDrawerOpen(true)
    setMenuOpen(null)
  }

  const handleDrawerClose = () => {
    setIsDrawerOpen(false)
    setSelectedRuleId(null)
  }

  const handleDrawerSaved = () => {
    setIsDrawerOpen(false)
    setSelectedRuleId(null)
    refetch()
  }

  const handleToggleActive = async (rule: BottleneckRule) => {
    try {
      await updateRule(rule.id, { is_active: !rule.is_active })
      refetch()
    } catch (err) {
      console.error('Failed to toggle rule:', err)
    }
    setMenuOpen(null)
  }

  const handleDeleteRule = async (rule: BottleneckRule) => {
    if (!confirm(`Delete "${rule.name}"? This cannot be undone.`)) return
    try {
      await deleteRule(rule.id)
      refetch()
    } catch (err) {
      console.error('Failed to delete rule:', err)
    }
    setMenuOpen(null)
  }

  const handleRunRule = async (ruleId: string) => {
    try {
      setRunningRuleId(ruleId)
      await runRule(ruleId)
      refetch()
    } catch (err) {
      console.error('Failed to run rule:', err)
    } finally {
      setRunningRuleId(null)
    }
    setMenuOpen(null)
  }

  const handleRunAllRules = async () => {
    try {
      setRunAllResult(null)
      const result = await runAllRules()
      setRunAllResult(result)
      refetch()
    } catch (err) {
      console.error('Failed to run all rules:', err)
    }
  }

  const handleViewHistory = (rule: BottleneckRule) => {
    setHistoryRule(rule)
    setMenuOpen(null)
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

  // Column definitions for DataTable
  const columns = useMemo<ColumnDef<BottleneckRule, unknown>[]>(
    () => [
      // Rule Name
      columnHelper.accessor('name', {
        header: 'Rule',
        size: 250,
        cell: ({ row }) => {
          const rule = row.original
          return (
            <div>
              <p className="text-[13px] font-medium text-gray-900 dark:text-gray-100">{rule.name}</p>
              {rule.description && (
                <p className="text-[12px] text-gray-500 dark:text-gray-400 truncate max-w-xs">
                  {rule.description}
                </p>
              )}
            </div>
          )
        },
      }),
      // Entity Type
      columnHelper.accessor('entity_type', {
        header: 'Entity',
        size: 140,
        cell: ({ row }) => {
          const rule = row.original
          const EntityIcon = ENTITY_TYPES.find(e => e.id === rule.entity_type)?.icon || ClipboardList
          return (
            <div className="flex items-center gap-2">
              <span className="p-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded">
                <EntityIcon className="w-3.5 h-3.5" />
              </span>
              <span className="text-[12px] text-gray-600 dark:text-gray-400">
                {ENTITY_TYPES.find(e => e.id === rule.entity_type)?.label || rule.entity_type}
              </span>
            </div>
          )
        },
      }),
      // Detection Type
      columnHelper.accessor('detection_config', {
        header: 'Detection',
        size: 160,
        enableSorting: false,
        cell: ({ row }) => {
          const rule = row.original
          const detectionType = DETECTION_TYPE_LABELS[rule.detection_config.type || 'custom'] || 'Custom'
          const threshold = rule.detection_config.threshold_days ?? rule.detection_config.threshold_count
          return (
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-[11px] font-medium rounded">
                {detectionType}
              </span>
              {threshold && (
                <span className="text-[12px] text-gray-600 dark:text-gray-400">
                  {threshold}d
                </span>
              )}
            </div>
          )
        },
      }),
      // Actions (Notification/Task icons)
      columnHelper.display({
        id: 'rule_actions',
        header: 'Actions',
        size: 100,
        enableSorting: false,
        cell: ({ row }) => {
          const rule = row.original
          return (
            <div className="flex items-center justify-center gap-2">
              <span
                className={`p-1 rounded ${
                  rule.send_notification
                    ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400'
                    : 'text-gray-300 dark:text-gray-600'
                }`}
                title={rule.send_notification ? 'Sends notifications' : 'No notifications'}
              >
                <Bell className="w-3.5 h-3.5" />
              </span>
              <span
                className={`p-1 rounded ${
                  rule.create_task
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                    : 'text-gray-300 dark:text-gray-600'
                }`}
                title={rule.create_task ? 'Creates tasks' : 'No task creation'}
              >
                <ListTodo className="w-3.5 h-3.5" />
              </span>
            </div>
          )
        },
      }),
      // Status
      columnHelper.accessor('is_active', {
        header: 'Status',
        size: 100,
        cell: ({ getValue }) => {
          const isActive = getValue()
          return (
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                isActive
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isActive ? 'bg-green-500' : 'bg-gray-400'
                }`}
              />
              {isActive ? 'Active' : 'Inactive'}
            </span>
          )
        },
      }),
      // Detections Count
      columnHelper.accessor('total_detections', {
        header: 'Detections',
        size: 100,
        cell: ({ getValue }) => (
          <span className="text-[13px] font-medium text-gray-900 dark:text-gray-100 text-center block">
            {getValue()}
          </span>
        ),
      }),
      // Last Run
      columnHelper.accessor('last_run_at', {
        header: 'Last Run',
        size: 140,
        cell: ({ getValue }) => (
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-gray-400" />
            <span className="text-[12px] text-gray-500 dark:text-gray-400">
              {formatDate(getValue())}
            </span>
          </div>
        ),
      }),
      // Actions Menu
      columnHelper.display({
        id: 'menu',
        header: '',
        size: 50,
        enableSorting: false,
        cell: ({ row }) => {
          const rule = row.original
          return (
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuOpen(menuOpen === rule.id ? null : rule.id)
                }}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <MoreVertical className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </button>
              {menuOpen === rule.id && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
                  <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEditRule(rule.id)
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRunRule(rule.id)
                      }}
                      disabled={!rule.is_active || runningRuleId === rule.id}
                      className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                    >
                      {runningRuleId === rule.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Play className="w-3.5 h-3.5" />
                      )}
                      Run Now
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleViewHistory(rule)
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <History className="w-3.5 h-3.5" />
                      View History
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleToggleActive(rule)
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
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
                    <hr className="my-1 border-gray-200 dark:border-gray-700" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteRule(rule)
                      }}
                      disabled={isDeleting}
                      className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          )
        },
      }),
    ],
    [menuOpen, runningRuleId, isDeleting, handleEditRule, handleRunRule, handleViewHistory, handleToggleActive, handleDeleteRule]
  )

  // Create table instance
  const table = useReactTable({
    data: filteredRules,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    enableSorting: true,
  })

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 p-4 rounded-lg">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span className="text-[13px]">Failed to load bottleneck rules: {String(error)}</span>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Bottleneck Detection</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Configure rules to detect and alert on process bottlenecks.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b mb-6">
        <button
          onClick={() => setActiveTab('rules')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'rules'
              ? 'border-gray-900 text-gray-900 dark:border-gray-100 dark:text-gray-100'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <Zap className="w-4 h-4" />
          Rules
        </button>
        <button
          onClick={() => setActiveTab('detections')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'detections'
              ? 'border-gray-900 text-gray-900 dark:border-gray-100 dark:text-gray-100'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Detections
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'history'
              ? 'border-gray-900 text-gray-900 dark:border-gray-100 dark:text-gray-100'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <History className="w-4 h-4" />
          Run History
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'history' ? (
        <ExecutionHistoryTab />
      ) : activeTab === 'detections' ? (
        <DetectionsTab />
      ) : (
        <>
          {/* Rules Header */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isLoading ? 'Loading...' : `${activeRules} active of ${totalRules} rules`}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRunAllRules}
                disabled={isRunningAll}
                className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 dark:bg-emerald-500 text-white text-sm font-medium rounded-md hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRunningAll ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                Run All Rules
              </button>
              <button
                onClick={handleNewRule}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-medium rounded-md hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Rule
              </button>
            </div>
          </div>

          {/* Run All Results Banner */}
          {runAllResult && (
            <div className="mb-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                      {runAllResult.totals.rules_executed} rules executed
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-emerald-700 dark:text-emerald-300">
                    <span>{runAllResult.totals.detected} detected</span>
                    <span className="text-emerald-400">|</span>
                    <span>{runAllResult.totals.notifications} notifications</span>
                    <span className="text-emerald-400">|</span>
                    <span>{runAllResult.totals.tasks} tasks created</span>
                  </div>
                </div>
                <button
                  onClick={() => setRunAllResult(null)}
                  className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-200 text-sm"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Entity Type Filter */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {ENTITY_TYPES.map((entity) => {
              const Icon = entity.icon
              const count = entityCounts[entity.id]
              const isActive = entityFilter === entity.id
              return (
                <button
                  key={entity.id}
                  onClick={() => setEntityFilter(entity.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
                    isActive
                      ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {entity.label}
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
          </div>

          {/* Search */}
          <div className="relative max-w-sm mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Search rules..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-[13px] bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent"
            />
          </div>

          {/* Rules List */}
          <DataTable
            table={table}
            onRowClick={(row) => handleEditRule(row.id)}
            stickyColumns={{ left: [], right: ['menu'] }}
            isLoading={isLoading}
            loadingMessage="Loading rules..."
            emptyState={{
              icon: <Zap className="w-12 h-12 text-gray-300 dark:text-gray-600" />,
              title: searchQuery || entityFilter !== 'all'
                ? 'No rules match your filters'
                : 'No bottleneck rules yet',
              description: searchQuery || entityFilter !== 'all'
                ? 'Try adjusting your search or filter'
                : 'Create your first rule to detect process bottlenecks',
              action: !searchQuery && entityFilter === 'all' ? (
                <button
                  onClick={handleNewRule}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[13px] font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200"
                >
                  <Plus className="w-4 h-4" />
                  Create Rule
                </button>
              ) : undefined,
            }}
          />
        </>
      )}

      {/* Rule Drawer */}
      {isDrawerOpen && (
        <BottleneckRuleDrawer
          ruleId={selectedRuleId}
          onClose={handleDrawerClose}
          onSaved={handleDrawerSaved}
        />
      )}

      {/* Execution History Drawer */}
      {historyRule && (
        <ExecutionHistoryDrawer
          isOpen={!!historyRule}
          onClose={() => setHistoryRule(null)}
          rule={historyRule}
        />
      )}
    </div>
  )
}
