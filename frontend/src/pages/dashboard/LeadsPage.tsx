import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  ColumnDef,
  SortingState,
  RowSelectionState,
} from '@tanstack/react-table'
import { DataTable } from '@/components/common/DataTable'
import { useLeads } from '@/hooks/useLeads'
import type { Lead } from '@/hooks/useLeads'
import { useAuth } from '@/contexts/AuthContext'
import { useAssignedUpdate } from '@/hooks'
import { UserRole, type AssignedUser } from '@/types'
import { AssignedSelect } from '@/components/forms'
import api from '@/services/api'
import LeadFilterPanel, {
  LeadFilters,
  defaultFilters,
} from '@/components/companies/LeadFilterPanel'
import LeadKanbanBoard from '@/components/companies/LeadKanbanBoard'
import CreateLeadModal from '@/components/companies/CreateLeadModal'
import LeadDrawer from '@/components/companies/LeadDrawer'
import {
  AlertCircle,
  Plus,
  Users,
  LayoutList,
  Columns3,
  Mail,
  Phone,
  SlidersHorizontal,
} from 'lucide-react'

type ViewMode = 'table' | 'kanban'

const PAGE_SIZE_OPTIONS = [20, 30, 50]

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const getSourceLabel = (source: string) => {
  const labels: Record<string, string> = {
    inbound: 'Inbound',
    referral: 'Referral',
    website: 'Website',
    linkedin: 'LinkedIn',
    cold_outreach: 'Cold Outreach',
    event: 'Event',
    other: 'Other',
  }
  return labels[source] || source
}

const getSourceColor = (source: string) => {
  const colors: Record<string, string> = {
    inbound: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    referral: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
    linkedin: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    cold_outreach: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
    event: 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400',
    website: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400',
    other: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
  }
  return colors[source] || 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
}

const columnHelper = createColumnHelper<Lead>()

export default function LeadsPage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [filters, setFilters] = useState<LeadFilters>(() => {
    // Initialize filters from URL params
    const stageParam = searchParams.get('stage')
    return stageParam ? { ...defaultFilters, stage: stageParam } : defaultFilters
  })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [showFilters, setShowFilters] = useState(false)
  const [sorting, setSorting] = useState<SortingState>([{ id: 'created_at', desc: true }])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [showCreateLeadModal, setShowCreateLeadModal] = useState(false)
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(() => {
    // Initialize selected lead from URL param
    return searchParams.get('selected')
  })

  // Convert TanStack sorting to API ordering param
  const ordering = useMemo(() => {
    if (sorting.length === 0) return filters.ordering
    const sortItem = sorting[0]
    if (!sortItem) return filters.ordering
    const fieldMap: Record<string, string> = {
      name: 'name',
      company_name: 'company_name',
      created_at: 'created_at',
    }
    const field = fieldMap[sortItem.id] || sortItem.id
    return sortItem.desc ? `-${field}` : field
  }, [sorting, filters.ordering])

  // Fetch leads with pagination
  const { leads, count, totalPages, hasNext, hasPrevious, isLoading, error, refetch } = useLeads({
    search: filters.search || undefined,
    source: filters.source || undefined,
    stage: filters.stage || undefined,
    industry: filters.industry || undefined,
    company_size: filters.company_size || undefined,
    converted: filters.converted || undefined,
    created_after: filters.created_after || undefined,
    created_before: filters.created_before || undefined,
    ordering,
    page,
    page_size: pageSize,
  })

  // Local state for optimistic updates
  const [localLeads, setLocalLeads] = useState<Lead[]>([])

  // Sync local state with fetched data
  useEffect(() => {
    if (leads) {
      setLocalLeads(leads)
    }
  }, [leads])

  // Sync selectedLeadId when URL param changes
  const selectedParamProcessed = useRef(false)
  useEffect(() => {
    const selected = searchParams.get('selected')
    if (selected && !selectedParamProcessed.current) {
      selectedParamProcessed.current = true
      setSelectedLeadId(selected)
    }
  }, [searchParams])

  // Check if user has admin/recruiter access
  if (!user || ![UserRole.ADMIN, UserRole.RECRUITER].includes(user.role)) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-4" />
        <p className="text-[15px] text-gray-700 dark:text-gray-300 mb-2">Access Denied</p>
        <p className="text-[13px] text-gray-500 dark:text-gray-400">
          You do not have permission to view this page.
        </p>
      </div>
    )
  }

  const handleFiltersChange = (newFilters: LeadFilters) => {
    setFilters(newFilters)
    setPage(1)
  }

  const handleClearFilters = () => {
    setFilters(defaultFilters)
    setPage(1)
  }

  const activeFilterCount = useMemo(() => {
    let filterCount = 0
    if (filters.source) filterCount++
    if (filters.stage) filterCount++
    if (filters.industry) filterCount++
    if (filters.company_size) filterCount++
    if (filters.converted && filters.converted !== 'false') filterCount++ // 'false' is default
    if (filters.created_after) filterCount++
    if (filters.created_before) filterCount++
    return filterCount
  }, [filters])

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize)
    setPage(1)
  }

  // Hook for optimistic updates with toast notifications
  const { updateAssigned } = useAssignedUpdate<Lead>()

  // Handler for changing assigned users on a lead (optimistic)
  const handleAssignedToChange = useCallback((leadId: string, assignedTo: AssignedUser[]) => {
    updateAssigned(
      localLeads,
      setLocalLeads,
      leadId,
      'id',
      'assigned_to',
      assignedTo,
      () => api.patch(`/companies/leads/${leadId}/update/`, {
        assigned_to_ids: assignedTo.map(u => u.id),
      })
    )
  }, [localLeads, updateAssigned])

  // Define columns
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const columns = useMemo<ColumnDef<Lead, any>[]>(
    () => [
      // Selection checkbox
      {
        id: 'select',
        size: 40,
        enableResizing: false,
        enableSorting: false,
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllPageRowsSelected()}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
            className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-gray-500 dark:focus:ring-gray-400"
          />
        ),
        cell: ({ row }) => (
          <div onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={row.getIsSelected()}
              onChange={row.getToggleSelectedHandler()}
              className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-gray-500 dark:focus:ring-gray-400"
            />
          </div>
        ),
      },
      // Assigned (pinned to front)
      columnHelper.accessor('assigned_to', {
        header: 'Assigned',
        size: 160,
        enableSorting: false,
        cell: ({ row }) => {
          const lead = row.original
          const assignedUsers = (lead.assigned_to || []) as AssignedUser[]
          return (
            <div onClick={(e) => e.stopPropagation()}>
              <AssignedSelect
                selected={assignedUsers}
                onChange={(newAssigned) => handleAssignedToChange(lead.id, newAssigned)}
                compact
                placeholder="Assign"
              />
            </div>
          )
        },
      }),
      // Name
      columnHelper.accessor('name', {
        header: 'Lead',
        size: 250,
        enableSorting: true,
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-gray-900 dark:text-gray-100 truncate">{row.original.name}</p>
              {row.original.job_title && (
                <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-[200px]">{row.original.job_title}</p>
              )}
            </div>
          </div>
        ),
      }),
      // Company
      columnHelper.accessor('company_name', {
        header: 'Company',
        size: 160,
        enableSorting: true,
        cell: ({ getValue }) => (
          <span className="text-[12px] text-gray-600 dark:text-gray-400">
            {getValue() || '-'}
          </span>
        ),
      }),
      // Contact
      columnHelper.accessor('email', {
        header: 'Contact',
        size: 200,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <Mail className="w-3 h-3 text-gray-400 dark:text-gray-500" />
              <a
                href={`mailto:${row.original.email}`}
                onClick={(e) => e.stopPropagation()}
                className="text-[12px] text-blue-600 dark:text-blue-400 hover:underline truncate"
              >
                {row.original.email}
              </a>
            </div>
            {row.original.phone && (
              <div className="flex items-center gap-1.5">
                <Phone className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                <span className="text-[12px] text-gray-500 dark:text-gray-400">{row.original.phone}</span>
              </div>
            )}
          </div>
        ),
      }),
      // Source
      columnHelper.accessor('source', {
        header: 'Source',
        size: 100,
        enableSorting: false,
        cell: ({ getValue }) => (
          <span className={`inline-flex px-2 py-0.5 text-[11px] font-medium rounded ${getSourceColor(getValue())}`}>
            {getSourceLabel(getValue())}
          </span>
        ),
      }),
      // Stage
      columnHelper.accessor('onboarding_stage', {
        header: 'Stage',
        size: 120,
        enableSorting: false,
        cell: ({ getValue }) => {
          const stage = getValue()
          if (!stage) return <span className="text-[12px] text-gray-400 dark:text-gray-500">-</span>
          return (
            <span
              className="inline-flex px-2 py-0.5 text-[11px] font-medium rounded"
              style={{ backgroundColor: `${stage.color}20`, color: stage.color }}
            >
              {stage.name}
            </span>
          )
        },
      }),
      // Created
      columnHelper.accessor('created_at', {
        header: 'Created',
        size: 100,
        enableSorting: true,
        cell: ({ getValue }) => (
          <span className="text-[12px] text-gray-500 dark:text-gray-400">{formatDate(getValue())}</span>
        ),
      }),
    ],
    [handleAssignedToChange]
  )

  const table = useReactTable({
    data: localLeads,
    columns,
    state: { sorting, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualPagination: true,
    pageCount: totalPages,
    getRowId: (row) => row.id,
    enableRowSelection: true,
    enableSorting: true,
  })

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-semibold text-gray-900 dark:text-gray-100">All Leads</h1>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">
            {count} lead{count !== 1 ? 's' : ''} found
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Page Size Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] text-gray-500 dark:text-gray-400">Show:</span>
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="px-2 py-1 text-[12px] border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600"
            >
              {PAGE_SIZE_OPTIONS.map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>
          {/* View Toggle */}
          <div className="flex border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] transition-colors ${
                viewMode === 'table' ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
              title="Table view"
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] border-l border-gray-200 dark:border-gray-700 transition-colors ${
                viewMode === 'kanban' ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
              title="Kanban view"
            >
              <Columns3 className="w-4 h-4" />
            </button>
          </div>
          {/* Toggle Filters */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-1.5 text-[13px] border rounded-md transition-colors ${
              showFilters ? 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300' : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[11px] px-1.5 py-0.5 rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>
          {/* Create Lead Button */}
          <button
            onClick={() => setShowCreateLeadModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-[13px] font-medium text-white bg-gray-900 dark:bg-gray-100 dark:text-gray-900 rounded-md hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Lead
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Filter Sidebar */}
        {showFilters && (
          <div className="w-72 flex-shrink-0">
            <LeadFilterPanel
              filters={filters}
              onFiltersChange={handleFiltersChange}
              onClearFilters={handleClearFilters}
              activeFilterCount={activeFilterCount}
            />
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Active Filters Count */}
          {activeFilterCount > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[12px] text-gray-500 dark:text-gray-400">
                {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} applied
              </span>
              <button
                onClick={handleClearFilters}
                className="text-[12px] text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 underline"
              >
                Clear all
              </button>
            </div>
          )}

          {/* Table View */}
          {viewMode === 'table' && (
            <DataTable
              table={table}
              onRowClick={(lead) => setSelectedLeadId(lead.id)}
              stickyColumns={{ left: ['select', 'name'] }}
              isLoading={isLoading}
              loadingMessage="Loading leads..."
              error={error}
              emptyState={{
                icon: <Users className="w-12 h-12 text-gray-300 dark:text-gray-600" />,
                title: 'No leads found',
                description: activeFilterCount > 0 || filters.search
                  ? 'Try adjusting your filters'
                  : 'No leads have been created yet',
                action: activeFilterCount > 0 ? (
                  <button
                    onClick={handleClearFilters}
                    className="text-[13px] text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 underline"
                  >
                    Clear all filters
                  </button>
                ) : undefined,
              }}
              pagination={{
                page,
                totalPages,
                totalCount: count,
                hasNext,
                hasPrevious,
                onPageChange: setPage,
                pageSizeOptions: PAGE_SIZE_OPTIONS,
                pageSize,
                onPageSizeChange: handlePageSizeChange,
              }}
            />
          )}

          {/* Kanban View */}
          {viewMode === 'kanban' && !isLoading && !error && (
            <LeadKanbanBoard
              leads={localLeads}
              isLoading={isLoading}
              onStageChange={refetch}
              onLeadClick={(lead) => setSelectedLeadId(lead.id)}
            />
          )}
        </div>
      </div>

      {/* Create Lead Modal */}
      <CreateLeadModal
        isOpen={showCreateLeadModal}
        onClose={() => setShowCreateLeadModal(false)}
        onSuccess={refetch}
      />

      {/* Lead Drawer */}
      {selectedLeadId && (
        <LeadDrawer
          leadId={selectedLeadId}
          onClose={() => setSelectedLeadId(null)}
          onRefresh={refetch}
          onDeleted={() => {
            setSelectedLeadId(null)
            refetch()
          }}
        />
      )}
    </div>
  )
}
