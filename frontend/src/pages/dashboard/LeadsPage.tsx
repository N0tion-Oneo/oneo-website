import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  ColumnDef,
  SortingState,
  RowSelectionState,
} from '@tanstack/react-table'
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
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Plus,
  Users,
  LayoutList,
  Columns3,
  Mail,
  Phone,
  ChevronLeft,
  ChevronRight,
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
    inbound: 'bg-green-100 text-green-700',
    referral: 'bg-purple-100 text-purple-700',
    linkedin: 'bg-blue-100 text-blue-700',
    cold_outreach: 'bg-orange-100 text-orange-700',
    event: 'bg-pink-100 text-pink-700',
    website: 'bg-cyan-100 text-cyan-700',
    other: 'bg-gray-100 text-gray-700',
  }
  return colors[source] || 'bg-gray-100 text-gray-700'
}

const columnHelper = createColumnHelper<Lead>()

export default function LeadsPage() {
  const { user } = useAuth()
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [filters, setFilters] = useState<LeadFilters>(defaultFilters)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [showFilters, setShowFilters] = useState(false)
  const [sorting, setSorting] = useState<SortingState>([])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [showCreateLeadModal, setShowCreateLeadModal] = useState(false)
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)

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
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllPageRowsSelected()}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
            className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500"
          />
        ),
        cell: ({ row }) => (
          <div onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={row.getIsSelected()}
              onChange={row.getToggleSelectedHandler()}
              className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500"
            />
          </div>
        ),
      },
      // Assigned (pinned to front)
      columnHelper.accessor('assigned_to', {
        header: 'Assigned',
        size: 160,
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
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 flex-shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-gray-900 truncate">{row.original.name}</p>
              {row.original.job_title && (
                <p className="text-[11px] text-gray-500 truncate max-w-[200px]">{row.original.job_title}</p>
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
          <span className="text-[12px] text-gray-600">
            {getValue() || '-'}
          </span>
        ),
      }),
      // Contact
      columnHelper.accessor('email', {
        header: 'Contact',
        size: 200,
        cell: ({ row }) => (
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <Mail className="w-3 h-3 text-gray-400" />
              <a
                href={`mailto:${row.original.email}`}
                onClick={(e) => e.stopPropagation()}
                className="text-[12px] text-blue-600 hover:underline truncate"
              >
                {row.original.email}
              </a>
            </div>
            {row.original.phone && (
              <div className="flex items-center gap-1.5">
                <Phone className="w-3 h-3 text-gray-400" />
                <span className="text-[12px] text-gray-500">{row.original.phone}</span>
              </div>
            )}
          </div>
        ),
      }),
      // Source
      columnHelper.accessor('source', {
        header: 'Source',
        size: 100,
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
        cell: ({ getValue }) => {
          const stage = getValue()
          if (!stage) return <span className="text-[12px] text-gray-400">-</span>
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
          <span className="text-[12px] text-gray-500">{formatDate(getValue())}</span>
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

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-12">
              <p className="text-[14px] text-gray-500 dark:text-gray-400">Loading leads...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-12">
              <p className="text-[14px] text-red-500 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && leads.length === 0 && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
              <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-[15px] text-gray-700 dark:text-gray-300 mb-1">No leads found</p>
              <p className="text-[13px] text-gray-500 dark:text-gray-400">
                {activeFilterCount > 0 || filters.search ? 'Try adjusting your filters' : 'No leads have been created yet'}
              </p>
              {activeFilterCount > 0 && (
                <button
                  onClick={handleClearFilters}
                  className="mt-4 text-[13px] text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 underline"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}

          {/* Table View */}
          {viewMode === 'table' && !isLoading && !error && leads.length > 0 && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    {table.getHeaderGroups().map(headerGroup => (
                      <tr key={headerGroup.id} className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                        {headerGroup.headers.map(header => {
                          const isPinnedLeft = header.id === 'select' || header.id === 'name'
                          return (
                            <th
                              key={header.id}
                              className={`px-3 py-2.5 text-left text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap ${
                                isPinnedLeft ? 'sticky z-20 bg-gray-50 dark:bg-gray-800' : ''
                              }`}
                              style={{
                                width: header.getSize(),
                                left: header.id === 'select' ? 0 : header.id === 'name' ? 40 : undefined,
                              }}
                            >
                              {header.isPlaceholder ? null : (
                                <div
                                  className={`flex items-center gap-1 ${
                                    header.column.getCanSort() ? 'cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-300' : ''
                                  }`}
                                  onClick={header.column.getToggleSortingHandler()}
                                >
                                  {flexRender(header.column.columnDef.header, header.getContext())}
                                  {header.column.getCanSort() && (
                                    <span className="ml-0.5">
                                      {{
                                        asc: <ArrowUp className="w-3 h-3" />,
                                        desc: <ArrowDown className="w-3 h-3" />,
                                      }[header.column.getIsSorted() as string] ?? (
                                        <ArrowUpDown className="w-3 h-3 opacity-40" />
                                      )}
                                    </span>
                                  )}
                                </div>
                              )}
                            </th>
                          )
                        })}
                      </tr>
                    ))}
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {table.getRowModel().rows.map(row => (
                      <tr
                        key={row.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                        onClick={() => setSelectedLeadId(row.original.id)}
                      >
                        {row.getVisibleCells().map(cell => {
                          const colId = cell.column.id
                          const isPinnedLeft = colId === 'select' || colId === 'name'
                          return (
                            <td
                              key={cell.id}
                              className={`px-3 py-2.5 whitespace-nowrap ${
                                isPinnedLeft ? 'sticky z-10 bg-white dark:bg-gray-900' : ''
                              }`}
                              style={{
                                width: cell.column.getSize(),
                                left: colId === 'select' ? 0 : colId === 'name' ? 40 : undefined,
                              }}
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
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

          {/* Pagination */}
          {!isLoading && !error && totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-[13px] text-gray-500 dark:text-gray-400">
                Page {page} of {totalPages} ({count} total)
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={!hasPrevious}
                  className="flex items-center gap-1 px-3 py-1.5 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={!hasNext}
                  className="flex items-center gap-1 px-3 py-1.5 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
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
