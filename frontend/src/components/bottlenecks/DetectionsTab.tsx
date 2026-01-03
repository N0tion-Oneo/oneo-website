/**
 * DetectionsTab - List all bottleneck detections with filtering and resolution
 */

import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  Check,
  CheckCircle,
  Clock,
  Loader2,
  Search,
  Building2,
  Users,
  Briefcase,
  ClipboardList,
  Calendar,
  LayoutGrid,
  RefreshCw,
  ExternalLink,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  type ColumnDef,
} from '@tanstack/react-table'
import { DataTable } from '@/components/common/DataTable'
import { formatDistanceToNow } from 'date-fns'
import {
  useBottleneckDetections,
  useResolveDetection,
  useBottleneckRules,
  type BottleneckEntityType,
  type BottleneckDetection,
  type DetectionSeverity,
} from '@/hooks/useBottlenecks'

const columnHelper = createColumnHelper<BottleneckDetection>()

// =============================================================================
// CONSTANTS
// =============================================================================

const ENTITY_TYPES: { id: BottleneckEntityType | 'all'; label: string; icon: React.ElementType; linkPrefix: string }[] = [
  { id: 'all', label: 'All', icon: LayoutGrid, linkPrefix: '' },
  { id: 'lead', label: 'Leads', icon: Building2, linkPrefix: '/dashboard/leads' },
  { id: 'company', label: 'Companies', icon: Building2, linkPrefix: '/dashboard/admin/companies' },
  { id: 'candidate', label: 'Candidates', icon: Users, linkPrefix: '/dashboard/admin/candidates' },
  { id: 'application', label: 'Applications', icon: Briefcase, linkPrefix: '/dashboard/applications' },
  { id: 'stage_instance', label: 'Interviews', icon: Calendar, linkPrefix: '' },
  { id: 'task', label: 'Tasks', icon: ClipboardList, linkPrefix: '/dashboard/tasks' },
]

const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'unresolved', label: 'Unresolved' },
  { id: 'resolved', label: 'Resolved' },
]

const SEVERITY_FILTERS = [
  { id: 'all', label: 'All Severity' },
  { id: 'critical', label: 'Critical', color: 'text-red-600' },
  { id: 'warning', label: 'Warning', color: 'text-amber-600' },
]

// =============================================================================
// DETECTION DETAILS DRAWER
// =============================================================================

interface DetectionDrawerProps {
  detection: BottleneckDetection
  onClose: () => void
  onResolve: () => void
  isResolving: boolean
}

function DetectionDrawer({ detection, onClose, onResolve, isResolving }: DetectionDrawerProps) {
  const entityConfig = ENTITY_TYPES.find(e => e.id === detection.entity_type)
  const EntityIcon = entityConfig?.icon || ClipboardList

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 w-full max-w-md bg-white dark:bg-gray-900 shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-[14px] font-medium text-gray-900 dark:text-gray-100">
            Detection Details
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
          <div className="space-y-4">
            {/* Status Banner */}
            <div className={`p-3 rounded-lg ${
              detection.is_resolved
                ? 'bg-green-50 dark:bg-green-900/20'
                : detection.severity === 'warning'
                ? 'bg-amber-50 dark:bg-amber-900/20'
                : 'bg-red-50 dark:bg-red-900/20'
            }`}>
              <div className="flex items-center gap-2">
                {detection.is_resolved ? (
                  <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                ) : detection.severity === 'warning' ? (
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                )}
                <span className={`text-[13px] font-medium ${
                  detection.is_resolved
                    ? 'text-green-700 dark:text-green-300'
                    : detection.severity === 'warning'
                    ? 'text-amber-700 dark:text-amber-300'
                    : 'text-red-700 dark:text-red-300'
                }`}>
                  {detection.is_resolved ? 'Resolved' : detection.severity === 'warning' ? 'Warning' : 'Critical'}
                </span>
              </div>
              {detection.resolved_at && (
                <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-1">
                  Resolved {formatDistanceToNow(new Date(detection.resolved_at))} ago
                  {detection.resolved_by_name && ` by ${detection.resolved_by_name}`}
                </p>
              )}
              {!detection.is_resolved && detection.severity === 'warning' && detection.projected_breach_at && (
                <p className="text-[12px] text-amber-600 dark:text-amber-400 mt-1">
                  Becomes critical in {formatDistanceToNow(new Date(detection.projected_breach_at))}
                </p>
              )}
            </div>

            {/* Entity Info */}
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="p-1 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 rounded">
                  <EntityIcon className="w-4 h-4" />
                </span>
                <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {entityConfig?.label || detection.entity_type}
                </span>
              </div>
              <p className="text-[14px] font-medium text-gray-900 dark:text-gray-100">
                {detection.entity_name}
              </p>
              {entityConfig?.linkPrefix && (
                <Link
                  to={`${entityConfig.linkPrefix}/${detection.entity_id}`}
                  className="inline-flex items-center gap-1 mt-2 text-[12px] text-blue-600 dark:text-blue-400 hover:underline"
                >
                  View {entityConfig.label.slice(0, -1)}
                  <ExternalLink className="w-3 h-3" />
                </Link>
              )}
            </div>

            {/* Rule Info */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h3 className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Triggered Rule
              </h3>
              <p className="text-[13px] font-medium text-gray-900 dark:text-gray-100">
                {detection.rule_name}
              </p>
            </div>

            {/* Actions Taken */}
            {(detection.notification_sent || detection.task_created) && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h3 className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  Actions Taken
                </h3>
                <div className="space-y-2">
                  {detection.notification_sent && (
                    <div className="flex items-center gap-2 p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <span className="p-1 bg-purple-100 dark:bg-purple-900/40 rounded">
                        <AlertTriangle className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                      </span>
                      <span className="text-[13px] text-purple-700 dark:text-purple-300">
                        Notification sent
                      </span>
                    </div>
                  )}
                  {detection.task_created && detection.task && (
                    <div className="flex items-center justify-between p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="p-1 bg-orange-100 dark:bg-orange-900/40 rounded">
                          <ClipboardList className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                        </span>
                        <span className="text-[13px] text-orange-700 dark:text-orange-300">
                          Task created
                        </span>
                      </div>
                      <Link
                        to={`/dashboard/tasks/${detection.task}`}
                        className="inline-flex items-center gap-1 text-[12px] text-orange-600 dark:text-orange-400 hover:underline"
                      >
                        View Task
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Threshold Progress (for warnings) */}
            {detection.current_value !== null && detection.threshold_value !== null && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h3 className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  Threshold Progress
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-[13px]">
                    <span className="text-gray-500 dark:text-gray-400">Current</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {detection.current_value} days
                    </span>
                  </div>
                  <div className="flex justify-between text-[13px]">
                    <span className="text-gray-500 dark:text-gray-400">Threshold</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {detection.threshold_value} days
                    </span>
                  </div>
                  <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`absolute inset-y-0 left-0 rounded-full transition-all ${
                        detection.severity === 'warning'
                          ? 'bg-amber-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(100, (detection.current_value / detection.threshold_value) * 100)}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-gray-500 dark:text-gray-400 text-right">
                    {Math.round((detection.current_value / detection.threshold_value) * 100)}% of threshold
                  </div>
                </div>
              </div>
            )}

            {/* Detection Data */}
            {detection.detection_data && Object.keys(detection.detection_data).length > 0 && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h3 className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  Detection Context
                </h3>
                <div className="space-y-1.5 text-[13px]">
                  {Object.entries(detection.detection_data).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400 capitalize">
                        {key.replace(/_/g, ' ')}
                      </span>
                      <span className="text-gray-900 dark:text-gray-100">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Timestamps */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h3 className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Timeline
              </h3>
              <div className="space-y-1.5 text-[13px]">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Detected</span>
                  <span className="text-gray-900 dark:text-gray-100">
                    {formatDistanceToNow(new Date(detection.detected_at))} ago
                  </span>
                </div>
                {detection.resolved_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Resolved</span>
                    <span className="text-gray-900 dark:text-gray-100">
                      {formatDistanceToNow(new Date(detection.resolved_at))} ago
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        {!detection.is_resolved && (
          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            <button
              onClick={onResolve}
              disabled={isResolving}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-[13px] font-medium disabled:opacity-50 transition-colors"
            >
              {isResolving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Mark as Resolved
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function DetectionsTab() {
  // State
  const [searchQuery, setSearchQuery] = useState('')
  const [entityFilter, setEntityFilter] = useState<BottleneckEntityType | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'unresolved' | 'resolved'>('unresolved')
  const [severityFilter, setSeverityFilter] = useState<DetectionSeverity | 'all'>('all')
  const [ruleFilter, setRuleFilter] = useState<string>('all')
  const [selectedDetection, setSelectedDetection] = useState<BottleneckDetection | null>(null)
  const [page, setPage] = useState(1)
  const pageSize = 20

  // Build query params for server-side filtering
  const queryParams = useMemo(() => {
    const params: {
      entity_type?: BottleneckEntityType
      is_resolved?: boolean
      severity?: DetectionSeverity
      page: number
      pageSize: number
    } = { page, pageSize }

    if (entityFilter !== 'all') {
      params.entity_type = entityFilter
    }
    if (statusFilter === 'unresolved') {
      params.is_resolved = false
    } else if (statusFilter === 'resolved') {
      params.is_resolved = true
    }
    if (severityFilter !== 'all') {
      params.severity = severityFilter
    }

    return params
  }, [entityFilter, statusFilter, severityFilter, page, pageSize])

  // Data hooks - now using server-side pagination and filtering
  const { detections, count, numPages, hasNext, hasPrevious, isLoading, error, refetch } = useBottleneckDetections(queryParams)
  const { resolveDetection, isResolving } = useResolveDetection()
  const { rules } = useBottleneckRules()

  // Client-side search filter (only for search query since backend doesn't support it yet)
  const filteredDetections = useMemo(() => {
    if (!searchQuery) return detections

    const query = searchQuery.toLowerCase()
    return detections.filter(d =>
      d.entity_name.toLowerCase().includes(query) ||
      d.rule_name.toLowerCase().includes(query)
    )
  }, [detections, searchQuery])

  // Reset page when filters change
  const handleFilterChange = <T,>(setter: React.Dispatch<React.SetStateAction<T>>, value: T) => {
    setter(value)
    setPage(1)
  }

  // Handlers
  const handleResolve = async (detection: BottleneckDetection) => {
    try {
      await resolveDetection(detection.id)
      refetch()
      setSelectedDetection(null)
    } catch (err) {
      console.error('Failed to resolve detection:', err)
    }
  }

  const handleQuickResolve = async (e: React.MouseEvent, detection: BottleneckDetection) => {
    e.stopPropagation()
    try {
      await resolveDetection(detection.id)
      refetch()
    } catch (err) {
      console.error('Failed to resolve detection:', err)
    }
  }

  // Column definitions for DataTable
  const columns = useMemo<ColumnDef<BottleneckDetection, unknown>[]>(() => [
    // Status column
    columnHelper.accessor('is_resolved', {
      header: 'Status',
      size: 80,
      enableSorting: false,
      cell: ({ row }) => {
        const detection = row.original
        return (
          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${
            detection.is_resolved
              ? 'bg-green-50 dark:bg-green-900/20'
              : detection.severity === 'warning'
              ? 'bg-amber-50 dark:bg-amber-900/20'
              : 'bg-red-50 dark:bg-red-900/20'
          }`}>
            {detection.is_resolved ? (
              <CheckCircle className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
            ) : detection.severity === 'warning' ? (
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
            )}
          </span>
        )
      },
    }),
    // Entity column
    columnHelper.accessor('entity_name', {
      header: 'Entity',
      enableSorting: false,
      cell: ({ row }) => {
        const detection = row.original
        const entityConfig = ENTITY_TYPES.find(e => e.id === detection.entity_type)
        const EntityIcon = entityConfig?.icon || ClipboardList
        return (
          <div className="flex items-center gap-2">
            <span className="p-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded">
              <EntityIcon className="w-3.5 h-3.5" />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-gray-900 dark:text-gray-100 truncate max-w-[200px]">
                {detection.entity_name}
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                {entityConfig?.label || detection.entity_type}
              </p>
            </div>
          </div>
        )
      },
    }),
    // Rule column
    columnHelper.accessor('rule_name', {
      header: 'Rule',
      enableSorting: false,
      cell: ({ getValue }) => (
        <span className="text-[13px] text-gray-700 dark:text-gray-300 truncate max-w-[180px] block">
          {getValue()}
        </span>
      ),
    }),
    // Detected column
    columnHelper.accessor('detected_at', {
      header: 'Detected',
      enableSorting: false,
      cell: ({ getValue }) => (
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-gray-400" />
          <span className="text-[12px] text-gray-500 dark:text-gray-400">
            {formatDistanceToNow(new Date(getValue()))} ago
          </span>
        </div>
      ),
    }),
    // Actions column
    columnHelper.display({
      id: 'actions',
      header: '',
      size: 60,
      enableSorting: false,
      cell: ({ row }) => {
        const detection = row.original
        if (detection.is_resolved) return null
        return (
          <button
            onClick={(e) => handleQuickResolve(e, detection)}
            disabled={isResolving}
            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-all disabled:opacity-50"
            title="Mark as resolved"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
        )
      },
    }),
  ], [isResolving])

  // Create table instance
  const table = useReactTable({
    data: filteredDetections,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    enableSorting: false,
  })

  if (error) {
    return (
      <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 p-4 rounded-lg">
        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
        <span className="text-[13px]">Failed to load detections: {String(error)}</span>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {isLoading ? 'Loading...' : `${count} detections found`}
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
        {ENTITY_TYPES.slice(0, 5).map((entity) => {
          const Icon = entity.icon
          const isActive = entityFilter === entity.id
          return (
            <button
              key={entity.id}
              onClick={() => handleFilterChange(setEntityFilter, entity.id)}
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
              onClick={() => handleFilterChange(setStatusFilter, status.id as typeof statusFilter)}
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

        {/* Severity Pills */}
        {SEVERITY_FILTERS.map((severity) => {
          const isActive = severityFilter === severity.id
          return (
            <button
              key={severity.id}
              onClick={() => handleFilterChange(setSeverityFilter, severity.id as typeof severityFilter)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
                isActive
                  ? severity.id === 'critical'
                    ? 'bg-red-600 text-white'
                    : severity.id === 'warning'
                    ? 'bg-amber-500 text-white'
                    : 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {severity.label}
            </button>
          )
        })}

        {/* Rule Filter Dropdown */}
        {rules.length > 0 && (
          <>
            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
            <div className="relative">
              <select
                value={ruleFilter}
                onChange={(e) => handleFilterChange(setRuleFilter, e.target.value)}
                className="appearance-none pl-8 pr-8 py-1.5 rounded-lg text-[12px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-0 focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 cursor-pointer"
              >
                <option value="all">All Rules</option>
                {rules.map(rule => (
                  <option key={rule.id} value={rule.id}>{rule.name}</option>
                ))}
              </select>
              <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
          </>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-sm mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
        <input
          type="text"
          placeholder="Search by entity or rule name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-[13px] bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent"
        />
      </div>

      {/* Detections Table */}
      <DataTable
        table={table}
        onRowClick={(row) => setSelectedDetection(row)}
        stickyColumns={{ left: [], right: ['actions'] }}
        isLoading={isLoading}
        loadingMessage="Loading detections..."
        emptyState={{
          icon: <AlertTriangle className="w-6 h-6 text-gray-400 dark:text-gray-500" />,
          title: 'No detections found',
          description: searchQuery || entityFilter !== 'all' || statusFilter !== 'all' || ruleFilter !== 'all'
            ? 'Try adjusting your filters'
            : 'No bottlenecks have been detected yet',
        }}
      />

      {/* Pagination */}
      {numPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border border-t-0 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-b-lg -mt-px">
          <span className="text-[13px] text-gray-600 dark:text-gray-400">
            Page {page} of {numPages} ({count} total)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => p - 1)}
              disabled={!hasPrevious}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-[13px] border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-white dark:hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!hasNext}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-[13px] border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-white dark:hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Detection Details Drawer */}
      {selectedDetection && (
        <DetectionDrawer
          detection={selectedDetection}
          onClose={() => setSelectedDetection(null)}
          onResolve={() => handleResolve(selectedDetection)}
          isResolving={isResolving}
        />
      )}
    </div>
  )
}

export default DetectionsTab
