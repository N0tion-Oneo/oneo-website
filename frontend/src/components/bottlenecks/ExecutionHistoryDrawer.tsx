import { useState } from 'react'
import {
  X,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronRight,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  AlertTriangle,
  Bell,
  ClipboardList,
  ExternalLink,
  Settings,
  Activity,
  Zap,
} from 'lucide-react'
import {
  useRuleExecutions,
  useExecutionComparison,
  type RuleExecution,
  type BottleneckRule,
  type EntityDetail,
} from '@/hooks/useBottlenecks'
import { formatDistanceToNow, format } from 'date-fns'

interface ExecutionHistoryDrawerProps {
  isOpen: boolean
  onClose: () => void
  rule: BottleneckRule
}

export function ExecutionHistoryDrawer({
  isOpen,
  onClose,
  rule,
}: ExecutionHistoryDrawerProps) {
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null)
  const { executions, totalCount, isLoading, loadMore, hasMore } = useRuleExecutions(
    isOpen ? rule.id : undefined
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="absolute inset-y-0 right-0 w-full max-w-4xl bg-white dark:bg-gray-900 shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Execution History
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {rule.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Execution List */}
          <div className={`${selectedExecutionId ? 'w-2/5 border-r border-gray-200 dark:border-gray-700' : 'w-full'} overflow-y-auto`}>
            {isLoading && executions.length === 0 ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : executions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-gray-500 dark:text-gray-400">
                <Clock className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">No executions yet</p>
                <p className="text-xs mt-1">Run the rule to see execution history</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {executions.map((execution) => (
                  <ExecutionRow
                    key={execution.id}
                    execution={execution}
                    isSelected={selectedExecutionId === execution.id}
                    onClick={() => setSelectedExecutionId(
                      selectedExecutionId === execution.id ? null : execution.id
                    )}
                  />
                ))}

                {hasMore && (
                  <div className="p-4 text-center">
                    <button
                      onClick={loadMore}
                      disabled={isLoading}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
                    >
                      {isLoading ? 'Loading...' : `Load more (${totalCount - executions.length} remaining)`}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Comparison Panel */}
          {selectedExecutionId && (
            <div className="w-3/5 overflow-y-auto">
              <ComparisonPanel executionId={selectedExecutionId} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface ExecutionRowProps {
  execution: RuleExecution
  isSelected: boolean
  onClick: () => void
}

function ExecutionRow({ execution, isSelected, onClick }: ExecutionRowProps) {
  const isSuccess = execution.success
  const hasMatches = execution.entities_matched > 0

  return (
    <button
      onClick={onClick}
      className={`w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
        isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {isSuccess ? (
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            )}
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {format(new Date(execution.started_at), 'MMM d, yyyy HH:mm')}
            </span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
              {execution.trigger_display}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {execution.entities_matched} matched
            </span>
            {execution.entities_in_cooldown > 0 && (
              <span className="text-amber-600 dark:text-amber-400">
                {execution.entities_in_cooldown} in cooldown
              </span>
            )}
            <span>{execution.duration_display}</span>
          </div>

          {hasMatches && (
            <div className="flex items-center gap-3 mt-2 text-xs">
              {execution.detections_created > 0 && (
                <span className="text-blue-600 dark:text-blue-400">
                  {execution.detections_created} detections
                </span>
              )}
              {execution.notifications_sent > 0 && (
                <span className="text-purple-600 dark:text-purple-400">
                  {execution.notifications_sent} notifications
                </span>
              )}
              {execution.tasks_created > 0 && (
                <span className="text-orange-600 dark:text-orange-400">
                  {execution.tasks_created} tasks
                </span>
              )}
            </div>
          )}

          {!isSuccess && execution.error_message && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400 truncate">
              {execution.error_message}
            </p>
          )}
        </div>

        <ChevronRight className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${
          isSelected ? 'rotate-90' : ''
        }`} />
      </div>
    </button>
  )
}

interface ComparisonPanelProps {
  executionId: string
}

function ComparisonPanel({ executionId }: ComparisonPanelProps) {
  const { comparison, isLoading, error } = useExecutionComparison(executionId)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-600 dark:text-red-400">
        <AlertTriangle className="w-6 h-6 mx-auto mb-2" />
        <p className="text-sm">{error}</p>
      </div>
    )
  }

  if (!comparison) return null

  const { current, previous, summary, detections_summary, config_changed, recent_trend } = comparison

  return (
    <div className="p-4 space-y-4">
      {/* Trend Summary */}
      <div className={`p-4 rounded-lg ${
        summary.trend === 'increasing'
          ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
          : summary.trend === 'decreasing'
          ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
          : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {summary.trend === 'increasing' ? (
              <TrendingUp className="w-5 h-5 text-red-600 dark:text-red-400" />
            ) : summary.trend === 'decreasing' ? (
              <TrendingDown className="w-5 h-5 text-green-600 dark:text-green-400" />
            ) : (
              <Minus className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            )}
            <span className={`font-medium ${
              summary.trend === 'increasing'
                ? 'text-red-700 dark:text-red-300'
                : summary.trend === 'decreasing'
                ? 'text-green-700 dark:text-green-300'
                : 'text-gray-700 dark:text-gray-300'
            }`}>
              {summary.trend === 'increasing'
                ? 'Bottleneck Growing'
                : summary.trend === 'decreasing'
                ? 'Bottleneck Shrinking'
                : 'Stable'}
            </span>
          </div>
          {summary.net_change !== 0 && (
            <span className={`text-lg font-semibold ${
              summary.net_change > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
            }`}>
              {summary.net_change > 0 ? '+' : ''}{summary.net_change}
            </span>
          )}
        </div>

        {previous ? (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Compared to {formatDistanceToNow(new Date(previous.started_at))} ago
          </p>
        ) : (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            First execution - no previous data to compare
          </p>
        )}

        {config_changed && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
            <Settings className="w-3.5 h-3.5" />
            Rule configuration changed since last execution
          </div>
        )}
      </div>

      {/* Mini Trend Chart */}
      {recent_trend && recent_trend.length > 1 && (
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-gray-500" />
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Recent Trend</span>
          </div>
          <div className="flex items-end gap-1 h-12">
            {recent_trend.slice().reverse().map((exec, idx) => {
              const maxVal = Math.max(...recent_trend.map(e => e.entities_matched), 1)
              const height = (exec.entities_matched / maxVal) * 100
              return (
                <div
                  key={idx}
                  className="flex-1 bg-blue-500 dark:bg-blue-400 rounded-t transition-all"
                  style={{ height: `${Math.max(height, 4)}%` }}
                  title={`${format(new Date(exec.started_at), 'MMM d HH:mm')}: ${exec.entities_matched} matched`}
                />
              )
            })}
          </div>
          <div className="flex justify-between mt-1 text-[10px] text-gray-500">
            <span>Oldest</span>
            <span>Latest</span>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="New"
          value={summary.new_count}
          icon={<ArrowUpRight className="w-4 h-4 text-red-500" />}
          color="red"
        />
        <StatCard
          label="Resolved"
          value={summary.resolved_count}
          icon={<ArrowDownRight className="w-4 h-4 text-green-500" />}
          color="green"
        />
        <StatCard
          label="Persistent"
          value={summary.persistent_count}
          icon={<Minus className="w-4 h-4 text-gray-500" />}
          color="gray"
        />
      </div>

      {/* Detections Summary */}
      {detections_summary && detections_summary.total > 0 && (
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" />
            Actions Taken
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center justify-between p-2 bg-white dark:bg-gray-900 rounded">
              <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                <Bell className="w-3 h-3" /> Notifications
              </span>
              <span className="font-medium text-gray-900 dark:text-white">{detections_summary.with_notification}</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-white dark:bg-gray-900 rounded">
              <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                <ClipboardList className="w-3 h-3" /> Tasks
              </span>
              <span className="font-medium text-gray-900 dark:text-white">{detections_summary.with_task}</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-white dark:bg-gray-900 rounded">
              <span className="text-red-600 dark:text-red-400">Critical</span>
              <span className="font-medium text-gray-900 dark:text-white">{detections_summary.critical}</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-white dark:bg-gray-900 rounded">
              <span className="text-amber-600 dark:text-amber-400">Warning</span>
              <span className="font-medium text-gray-900 dark:text-white">{detections_summary.warning}</span>
            </div>
          </div>
        </div>
      )}

      {/* Entity Lists */}
      {comparison.new_entities.length > 0 && (
        <EntityList
          title="New Bottlenecks"
          entities={comparison.new_entities}
          variant="new"
        />
      )}

      {comparison.resolved_entities.length > 0 && (
        <EntityList
          title="Resolved"
          entities={comparison.resolved_entities}
          variant="resolved"
        />
      )}

      {comparison.persistent_entities.length > 0 && (
        <EntityList
          title="Persistent Bottlenecks"
          entities={comparison.persistent_entities}
          variant="persistent"
          // Only collapse if there are new or resolved entities to show first
          defaultCollapsed={comparison.new_entities.length > 0 || comparison.resolved_entities.length > 0}
        />
      )}

      {/* Show message if no entities at all */}
      {comparison.new_entities.length === 0 &&
       comparison.resolved_entities.length === 0 &&
       comparison.persistent_entities.length === 0 &&
       current.entities_matched === 0 && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
          <Users className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            No entities matched this rule during this execution
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            Scanned {current.entities_scanned} entities
          </p>
        </div>
      )}

      {/* Rule Configuration Used */}
      {comparison.rule_config && (
        <RuleConfigSection config={comparison.rule_config} />
      )}

      {/* Execution Details */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
          Execution Details
        </h4>
        <div className="text-sm space-y-1 text-gray-600 dark:text-gray-400">
          <div className="flex justify-between">
            <span>Duration</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {current.duration_display}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Scanned</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {current.entities_scanned}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Matched</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {current.entities_matched}
            </span>
          </div>
          <div className="flex justify-between">
            <span>In Cooldown</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {current.entities_in_cooldown}
            </span>
          </div>
          {current.triggered_by_name && (
            <div className="flex justify-between">
              <span>Triggered by</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {current.triggered_by_name}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface StatCardProps {
  label: string
  value: number
  icon: React.ReactNode
  color: 'red' | 'green' | 'gray'
}

function StatCard({ label, value, icon, color }: StatCardProps) {
  const bgColor = {
    red: 'bg-red-50 dark:bg-red-900/20',
    green: 'bg-green-50 dark:bg-green-900/20',
    gray: 'bg-gray-50 dark:bg-gray-800',
  }[color]

  return (
    <div className={`p-3 rounded-lg ${bgColor}`}>
      <div className="flex items-center gap-1 mb-1">
        {icon}
        <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
      </div>
      <p className="text-xl font-semibold text-gray-900 dark:text-white">{value}</p>
    </div>
  )
}

interface RuleConfigSectionProps {
  config: Record<string, unknown>
}

function RuleConfigSection({ config }: RuleConfigSectionProps) {
  const detectionConfig = config.detection_config as Record<string, unknown> | undefined
  const filterConditions = config.filter_conditions as unknown[] | undefined
  const cooldownHours = config.cooldown_hours as number | undefined

  const getDetectionDescription = () => {
    if (!detectionConfig) return null
    const type = detectionConfig.type as string
    const thresholdDays = detectionConfig.threshold_days as number | undefined
    const thresholdCount = detectionConfig.threshold_count as number | undefined

    switch (type) {
      case 'stage_duration':
        return `Stage Duration > ${thresholdDays} days`
      case 'last_activity':
        return `Last Activity > ${thresholdDays} days ago`
      case 'overdue':
        return 'Overdue Tasks'
      case 'count_in_state':
        return `Count > ${thresholdCount}`
      default:
        return type
    }
  }

  return (
    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
      <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
        <Settings className="w-3.5 h-3.5" />
        Rule Configuration
      </h4>
      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-xs space-y-2">
        {detectionConfig && (
          <div>
            <span className="text-gray-500 dark:text-gray-400">Detection: </span>
            <span className="font-medium text-gray-900 dark:text-white">
              {getDetectionDescription()}
            </span>
          </div>
        )}
        {cooldownHours !== undefined && (
          <div>
            <span className="text-gray-500 dark:text-gray-400">Cooldown: </span>
            <span className="font-medium text-gray-900 dark:text-white">
              {cooldownHours} hours
            </span>
          </div>
        )}
        {filterConditions && filterConditions.length > 0 && (
          <div>
            <span className="text-gray-500 dark:text-gray-400">Filters: </span>
            <span className="font-medium text-gray-900 dark:text-white">
              {filterConditions.length} condition(s) applied
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

interface EntityListProps {
  title: string
  entities: EntityDetail[]
  variant: 'new' | 'resolved' | 'persistent'
  defaultCollapsed?: boolean
}

function EntityList({ title, entities, variant, defaultCollapsed = false }: EntityListProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)
  const [showAll, setShowAll] = useState(false)

  const borderColors = {
    new: 'border-l-red-500',
    resolved: 'border-l-green-500',
    persistent: 'border-l-gray-400',
  }

  const headerColors = {
    new: 'text-red-600 dark:text-red-400',
    resolved: 'text-green-600 dark:text-green-400',
    persistent: 'text-gray-600 dark:text-gray-400',
  }

  const displayEntities = showAll ? entities : entities.slice(0, 10)

  return (
    <div>
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={`flex items-center gap-2 text-sm font-medium ${headerColors[variant]} hover:opacity-80`}
      >
        <ChevronRight className={`w-4 h-4 transition-transform ${isCollapsed ? '' : 'rotate-90'}`} />
        {title} ({entities.length})
      </button>

      {!isCollapsed && (
        <div className="mt-2 space-y-2">
          {displayEntities.map((entity) => (
            <div
              key={entity.id}
              className={`p-2.5 bg-white dark:bg-gray-900 rounded border-l-4 ${borderColors[variant]} shadow-sm`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {entity.name}
                  </p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {entity.email && <span>{entity.email}</span>}
                    {entity.stage && <span>Stage: {entity.stage}</span>}
                    {entity.status && <span>Status: {entity.status}</span>}
                    {entity.assigned_to && <span>Assigned: {entity.assigned_to}</span>}
                    {entity.priority && <span className="capitalize">Priority: {entity.priority}</span>}
                    {entity.due_date && <span>Due: {format(new Date(entity.due_date), 'MMM d')}</span>}
                  </div>

                  {/* Detection details if present */}
                  {entity.detection && (
                    <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                      <div className="flex items-center gap-2">
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
                          <span title="Notification sent">
                            <Bell className="w-3 h-3 text-purple-500" />
                          </span>
                        )}
                        {entity.detection.task_created && (
                          <span title="Task created">
                            <ClipboardList className="w-3 h-3 text-orange-500" />
                          </span>
                        )}
                      </div>
                      {entity.detection.detection_data && Object.keys(entity.detection.detection_data).length > 0 && (
                        <div className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">
                          {Object.entries(entity.detection.detection_data).slice(0, 3).map(([key, value]) => (
                            <span key={key} className="mr-2">
                              {key.replace(/_/g, ' ')}: <span className="font-medium">{String(value)}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <button
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
                  title="View entity"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}

          {entities.length > 10 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="w-full py-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              {showAll ? 'Show less' : `Show ${entities.length - 10} more`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default ExecutionHistoryDrawer
