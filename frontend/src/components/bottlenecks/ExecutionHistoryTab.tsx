/**
 * ExecutionHistoryTab - Execution history view matching AutomationRulesPage styling
 */

import { useState, useMemo } from 'react'
import {
  Clock,
  Check,
  X,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  Search,
  Play,
  Timer,
  Bell,
  ListTodo,
  AlertTriangle,
  RefreshCw,
  Building2,
  Users,
  Briefcase,
  ClipboardList,
  Calendar,
  Eye,
  Zap,
} from 'lucide-react'
import { formatDistanceToNow, subDays, startOfDay } from 'date-fns'
import {
  useRecentExecutions,
  useBottleneckRules,
  useRunBottleneckRule,
  useExecutionComparison,
  type BottleneckEntityType,
} from '@/hooks/useBottlenecks'

// =============================================================================
// CONSTANTS
// =============================================================================

const ENTITY_TYPES: { id: BottleneckEntityType | 'all'; label: string; icon: React.ElementType }[] = [
  { id: 'all', label: 'All', icon: Zap },
  { id: 'lead', label: 'Leads', icon: Building2 },
  { id: 'company', label: 'Companies', icon: Building2 },
  { id: 'candidate', label: 'Candidates', icon: Users },
  { id: 'application', label: 'Applications', icon: Briefcase },
  { id: 'stage_instance', label: 'Interviews', icon: Calendar },
  { id: 'task', label: 'Tasks', icon: ClipboardList },
]

const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'success', label: 'Success' },
  { id: 'failed', label: 'Failed' },
]

const DATE_FILTERS = [
  { id: 0, label: 'Today' },
  { id: 7, label: '7 days' },
  { id: 30, label: '30 days' },
  { id: -1, label: 'All' },
]

// =============================================================================
// RULE CONFIG DISPLAY
// =============================================================================

function RuleConfigDisplay({ config }: { config: Record<string, unknown> }) {
  const detectionConfig = config.detection_config as Record<string, unknown> | undefined
  const cooldownHours = config.cooldown_hours

  const getDetectionDescription = () => {
    if (!detectionConfig) return null
    const type = detectionConfig.type as string
    const thresholdDays = detectionConfig.threshold_days
    const thresholdCount = detectionConfig.threshold_count

    switch (type) {
      case 'stage_duration':
        return `Stage Duration > ${String(thresholdDays)} days`
      case 'last_activity':
        return `Last Activity > ${String(thresholdDays)} days`
      case 'overdue':
        return 'Overdue Tasks'
      case 'count_in_state':
        return `Count > ${String(thresholdCount)}`
      default:
        return String(type)
    }
  }

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
      <h3 className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
        Rule Configuration
      </h3>
      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-[12px] space-y-1">
        {detectionConfig && (
          <div>
            <span className="text-gray-500 dark:text-gray-400">Detection: </span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {getDetectionDescription()}
            </span>
          </div>
        )}
        {cooldownHours !== undefined && (
          <div>
            <span className="text-gray-500 dark:text-gray-400">Cooldown: </span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {String(cooldownHours)} hours
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// COMPARISON DRAWER
// =============================================================================

interface ComparisonDrawerProps {
  executionId: string
  onClose: () => void
}

interface EntityDetail {
  id: string
  name: string
  email?: string
  stage?: string
  status?: string
  assigned_to?: string
  priority?: string
  due_date?: string
  detection?: {
    id: string
    severity: 'warning' | 'critical'
    current_value: number | null
    threshold_value: number | null
    detection_data: Record<string, unknown>
    notification_sent: boolean
    task_created: boolean
  }
}

function ComparisonDrawer({ executionId, onClose }: ComparisonDrawerProps) {
  const { comparison, isLoading, error } = useExecutionComparison(executionId)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    new: true,
    resolved: true,
    persistent: true,
  })

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const renderEntityList = (
    entities: EntityDetail[],
    title: string,
    variant: 'new' | 'resolved' | 'persistent'
  ) => {
    if (entities.length === 0) return null

    const colors = {
      new: { border: 'border-l-red-500', text: 'text-red-600 dark:text-red-400' },
      resolved: { border: 'border-l-green-500', text: 'text-green-600 dark:text-green-400' },
      persistent: { border: 'border-l-gray-400', text: 'text-gray-600 dark:text-gray-400' },
    }

    const isExpanded = expandedSections[variant]

    return (
      <div>
        <button
          onClick={() => toggleSection(variant)}
          className={`flex items-center gap-2 text-[13px] font-medium ${colors[variant].text} hover:opacity-80 w-full`}
        >
          <span className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
          {title} ({entities.length})
        </button>
        {isExpanded && (
          <div className="mt-2 space-y-2">
            {entities.slice(0, 10).map((entity) => (
              <div
                key={entity.id}
                className={`p-2.5 bg-white dark:bg-gray-800 rounded border-l-4 ${colors[variant].border} shadow-sm`}
              >
                <p className="text-[13px] font-medium text-gray-900 dark:text-gray-100 truncate">
                  {entity.name}
                </p>
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                  {entity.email && <span>{entity.email}</span>}
                  {entity.stage && <span>Stage: {entity.stage}</span>}
                  {entity.status && <span>Status: {entity.status}</span>}
                  {entity.assigned_to && <span>Assigned: {entity.assigned_to}</span>}
                  {entity.priority && <span className="capitalize">Priority: {entity.priority}</span>}
                </div>
                {entity.detection && (
                  <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      entity.detection.severity === 'critical'
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                        : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                    }`}>
                      {entity.detection.severity.toUpperCase()}
                    </span>
                    {entity.detection.current_value !== null && entity.detection.threshold_value !== null && (
                      <span className="text-[10px] text-gray-500 dark:text-gray-400">
                        {entity.detection.current_value} / {entity.detection.threshold_value} threshold
                      </span>
                    )}
                    {entity.detection.notification_sent && (
                      <Bell className="w-3 h-3 text-purple-500" />
                    )}
                    {entity.detection.task_created && (
                      <ListTodo className="w-3 h-3 text-orange-500" />
                    )}
                  </div>
                )}
              </div>
            ))}
            {entities.length > 10 && (
              <p className="text-[11px] text-gray-500 dark:text-gray-400 text-center">
                +{entities.length - 10} more
              </p>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 w-full max-w-lg bg-white dark:bg-gray-900 shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-[14px] font-medium text-gray-900 dark:text-gray-100">
            Execution Comparison
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : error ? (
            <div className="text-center text-red-600 dark:text-red-400 py-8">
              <AlertTriangle className="w-6 h-6 mx-auto mb-2" />
              <p className="text-[13px]">{error}</p>
            </div>
          ) : comparison ? (
            <div className="space-y-4">
              {/* Trend Summary */}
              <div className={`p-3 rounded-lg ${
                comparison.summary.trend === 'increasing'
                  ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                  : comparison.summary.trend === 'decreasing'
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                  : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {comparison.summary.trend === 'increasing' ? (
                      <TrendingUp className="w-4 h-4 text-red-600 dark:text-red-400" />
                    ) : comparison.summary.trend === 'decreasing' ? (
                      <TrendingDown className="w-4 h-4 text-green-600 dark:text-green-400" />
                    ) : (
                      <Minus className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    )}
                    <span className={`text-[13px] font-medium ${
                      comparison.summary.trend === 'increasing'
                        ? 'text-red-700 dark:text-red-300'
                        : comparison.summary.trend === 'decreasing'
                        ? 'text-green-700 dark:text-green-300'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      {comparison.summary.trend === 'increasing' ? 'Bottleneck Growing' :
                       comparison.summary.trend === 'decreasing' ? 'Bottleneck Shrinking' : 'Stable'}
                    </span>
                  </div>
                  {comparison.summary.net_change !== 0 && (
                    <span className={`text-[15px] font-semibold ${
                      comparison.summary.net_change > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                    }`}>
                      {comparison.summary.net_change > 0 ? '+' : ''}{comparison.summary.net_change}
                    </span>
                  )}
                </div>
                {comparison.previous ? (
                  <p className="text-[12px] text-gray-500 dark:text-gray-400">
                    vs {formatDistanceToNow(new Date(comparison.previous.started_at))} ago
                  </p>
                ) : (
                  <p className="text-[12px] text-gray-500 dark:text-gray-400">
                    First execution - no previous data
                  </p>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2 rounded bg-red-50 dark:bg-red-900/20 text-center">
                  <p className="text-[18px] font-semibold text-red-600 dark:text-red-400">
                    {comparison.summary.new_count}
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">New</p>
                </div>
                <div className="p-2 rounded bg-green-50 dark:bg-green-900/20 text-center">
                  <p className="text-[18px] font-semibold text-green-600 dark:text-green-400">
                    {comparison.summary.resolved_count}
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">Resolved</p>
                </div>
                <div className="p-2 rounded bg-gray-50 dark:bg-gray-800 text-center">
                  <p className="text-[18px] font-semibold text-gray-600 dark:text-gray-400">
                    {comparison.summary.persistent_count}
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">Persistent</p>
                </div>
              </div>

              {/* Actions Taken */}
              {comparison.detections_summary && comparison.detections_summary.total > 0 && (
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <h3 className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    Actions Taken
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-[12px]">
                    <div className="flex items-center justify-between p-2 bg-white dark:bg-gray-900 rounded">
                      <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                        <Bell className="w-3 h-3" /> Notifications
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">{comparison.detections_summary.with_notification}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-white dark:bg-gray-900 rounded">
                      <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                        <ListTodo className="w-3 h-3" /> Tasks
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">{comparison.detections_summary.with_task}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-white dark:bg-gray-900 rounded">
                      <span className="text-red-600 dark:text-red-400">Critical</span>
                      <span className="font-medium text-gray-900 dark:text-white">{comparison.detections_summary.critical}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-white dark:bg-gray-900 rounded">
                      <span className="text-amber-600 dark:text-amber-400">Warning</span>
                      <span className="font-medium text-gray-900 dark:text-white">{comparison.detections_summary.warning}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Entity Lists */}
              {renderEntityList(comparison.new_entities || [], 'New Bottlenecks', 'new')}
              {renderEntityList(comparison.resolved_entities || [], 'Resolved', 'resolved')}
              {renderEntityList(comparison.persistent_entities || [], 'Persistent Bottlenecks', 'persistent')}

              {/* No entities message */}
              {(!comparison.new_entities?.length && !comparison.resolved_entities?.length && !comparison.persistent_entities?.length) && (
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                  <Users className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-[13px] text-gray-600 dark:text-gray-400">
                    No entities matched this rule
                  </p>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Scanned {comparison.current.entities_scanned} entities
                  </p>
                </div>
              )}

              {/* Rule Configuration */}
              {comparison.rule_config && (
                <RuleConfigDisplay config={comparison.rule_config} />
              )}

              {/* Execution Details */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h3 className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  Execution Details
                </h3>
                <div className="space-y-1.5 text-[13px]">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Rule</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {comparison.current.rule_name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Duration</span>
                    <span className="text-gray-900 dark:text-gray-100">
                      {comparison.current.duration_display}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Scanned</span>
                    <span className="text-gray-900 dark:text-gray-100">
                      {comparison.current.entities_scanned}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Matched</span>
                    <span className="text-gray-900 dark:text-gray-100">
                      {comparison.current.entities_matched}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">In Cooldown</span>
                    <span className="text-gray-900 dark:text-gray-100">
                      {comparison.current.entities_in_cooldown}
                    </span>
                  </div>
                  {comparison.current.triggered_by_name && (
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Triggered by</span>
                      <span className="text-gray-900 dark:text-gray-100">
                        {comparison.current.triggered_by_name}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ExecutionHistoryTab() {
  // State
  const [searchQuery, setSearchQuery] = useState('')
  const [entityFilter, setEntityFilter] = useState<BottleneckEntityType | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed'>('all')
  const [dateFilter, setDateFilter] = useState(7)
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null)
  const [rerunningRuleId, setRerunningRuleId] = useState<string | null>(null)

  // Data hooks
  const { executions, isLoading, error, refetch } = useRecentExecutions({ limit: 200 })
  const { rules } = useBottleneckRules()
  const { runRule } = useRunBottleneckRule()

  // Build rule lookup map
  const ruleMap = useMemo(() => {
    const map: Record<string, { name: string; entityType: BottleneckEntityType }> = {}
    rules.forEach(rule => {
      map[rule.id] = { name: rule.name, entityType: rule.entity_type }
    })
    return map
  }, [rules])

  // Filter executions
  const filteredExecutions = useMemo(() => {
    let result = [...executions]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(ex =>
        ex.rule_name.toLowerCase().includes(query) ||
        ex.triggered_by_name?.toLowerCase().includes(query)
      )
    }

    // Entity type filter
    if (entityFilter !== 'all') {
      result = result.filter(ex => {
        const rule = ruleMap[ex.rule]
        return rule?.entityType === entityFilter
      })
    }

    // Status filter
    if (statusFilter === 'success') {
      result = result.filter(ex => ex.success)
    } else if (statusFilter === 'failed') {
      result = result.filter(ex => !ex.success)
    }

    // Date filter
    if (dateFilter >= 0) {
      const cutoff = startOfDay(subDays(new Date(), dateFilter))
      result = result.filter(ex => new Date(ex.started_at) >= cutoff)
    }

    // Sort by date descending
    result.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())

    return result
  }, [executions, searchQuery, entityFilter, statusFilter, dateFilter, ruleMap])

  // Stats
  const successCount = filteredExecutions.filter(ex => ex.success).length
  const failedCount = filteredExecutions.filter(ex => !ex.success).length

  // Handlers
  const handleRerun = async (ruleId: string) => {
    try {
      setRerunningRuleId(ruleId)
      await runRule(ruleId)
      refetch()
    } catch (err) {
      console.error('Failed to re-run rule:', err)
    } finally {
      setRerunningRuleId(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 p-4 rounded-lg">
        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
        <span className="text-[13px]">Failed to load executions: {String(error)}</span>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {isLoading ? 'Loading...' : `${successCount} successful, ${failedCount} failed`}
        </p>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-3 py-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md text-sm transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {/* Entity Type Pills */}
        {ENTITY_TYPES.slice(0, 4).map((entity) => {
          const Icon = entity.icon
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
            </button>
          )
        })}

        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

        {/* Status Pills */}
        {STATUS_FILTERS.map((status) => {
          const isActive = statusFilter === status.id
          return (
            <button
              key={status.id}
              onClick={() => setStatusFilter(status.id as typeof statusFilter)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
                isActive
                  ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {status.label}
            </button>
          )
        })}

        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

        {/* Date Pills */}
        {DATE_FILTERS.map((date) => {
          const isActive = dateFilter === date.id
          return (
            <button
              key={date.id}
              onClick={() => setDateFilter(date.id)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
                isActive
                  ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {date.label}
            </button>
          )
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-sm mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
        <input
          type="text"
          placeholder="Search by rule name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-[13px] bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent"
        />
      </div>

      {/* Executions Table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-8 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400 dark:text-gray-500" />
          </div>
        ) : filteredExecutions.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3">
              <Clock className="w-6 h-6 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-[14px] font-medium text-gray-900 dark:text-gray-100 mb-1">
              No executions found
            </h3>
            <p className="text-[13px] text-gray-500 dark:text-gray-400">
              {searchQuery || entityFilter !== 'all' || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Run a rule to see execution history'}
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <th className="text-center px-4 py-3 text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-12">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Rule
                </th>
                <th className="text-left px-4 py-3 text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Trigger
                </th>
                <th className="text-center px-4 py-3 text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Matched
                </th>
                <th className="text-center px-4 py-3 text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
                <th className="text-left px-4 py-3 text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Duration
                </th>
                <th className="text-left px-4 py-3 text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Time
                </th>
                <th className="w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredExecutions.map((execution) => {
                const entityType = ruleMap[execution.rule]?.entityType || 'task'
                const EntityIcon = ENTITY_TYPES.find(e => e.id === entityType)?.icon || ClipboardList
                const hasActions = execution.detections_created > 0 || execution.notifications_sent > 0 || execution.tasks_created > 0

                return (
                  <tr
                    key={execution.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
                  >
                    {/* Status */}
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${
                        execution.success
                          ? 'bg-green-50 dark:bg-green-900/20'
                          : 'bg-red-50 dark:bg-red-900/20'
                      }`}>
                        {execution.success ? (
                          <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                        ) : (
                          <X className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                        )}
                      </span>
                    </td>

                    {/* Rule */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="p-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded">
                          <EntityIcon className="w-3.5 h-3.5" />
                        </span>
                        <span className="text-[13px] font-medium text-gray-900 dark:text-gray-100 truncate max-w-[180px]">
                          {execution.rule_name}
                        </span>
                      </div>
                    </td>

                    {/* Trigger */}
                    <td className="px-4 py-3">
                      <div>
                        <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-medium ${
                          execution.trigger === 'scheduled'
                            ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                            : execution.trigger === 'manual'
                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                            : 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400'
                        }`}>
                          {execution.trigger_display}
                        </span>
                        {execution.triggered_by_name && (
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 truncate max-w-[100px]">
                            {execution.triggered_by_name}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Matched */}
                    <td className="px-4 py-3 text-center">
                      <div className="inline-flex items-center gap-1">
                        <span className="text-[13px] font-medium text-gray-900 dark:text-gray-100">
                          {execution.entities_matched}
                        </span>
                        <span className="text-[11px] text-gray-400">
                          / {execution.entities_scanned}
                        </span>
                      </div>
                    </td>

                    {/* Actions Created */}
                    <td className="px-4 py-3 text-center">
                      {hasActions ? (
                        <div className="flex items-center justify-center gap-2">
                          {execution.detections_created > 0 && (
                            <span className="flex items-center gap-0.5 text-[11px] text-blue-600 dark:text-blue-400">
                              <AlertTriangle className="w-3 h-3" />
                              {execution.detections_created}
                            </span>
                          )}
                          {execution.notifications_sent > 0 && (
                            <span className="flex items-center gap-0.5 text-[11px] text-purple-600 dark:text-purple-400">
                              <Bell className="w-3 h-3" />
                              {execution.notifications_sent}
                            </span>
                          )}
                          {execution.tasks_created > 0 && (
                            <span className="flex items-center gap-0.5 text-[11px] text-orange-600 dark:text-orange-400">
                              <ListTodo className="w-3 h-3" />
                              {execution.tasks_created}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[12px] text-gray-400">—</span>
                      )}
                    </td>

                    {/* Duration */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Timer className="w-3 h-3 text-gray-400" />
                        <span className="text-[12px] text-gray-500 dark:text-gray-400">
                          {execution.duration_display}
                        </span>
                      </div>
                    </td>

                    {/* Time */}
                    <td className="px-4 py-3">
                      <span className="text-[12px] text-gray-500 dark:text-gray-400">
                        {formatDate(execution.started_at)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setSelectedExecutionId(execution.id)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                          title="View comparison"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleRerun(execution.rule)}
                          disabled={rerunningRuleId === execution.rule}
                          className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded disabled:opacity-50"
                          title="Re-run rule"
                        >
                          {rerunningRuleId === execution.rule ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Play className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Comparison Drawer */}
      {selectedExecutionId && (
        <ComparisonDrawer
          executionId={selectedExecutionId}
          onClose={() => setSelectedExecutionId(null)}
        />
      )}
    </div>
  )
}

export default ExecutionHistoryTab
