import { useState, useMemo, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  ColumnDef,
  SortingState,
  RowSelectionState,
} from '@tanstack/react-table'
import { DataTable } from '@/components/common/DataTable'
import { useAllCompanies } from '@/hooks/useCompanies'
import { useAssignedUpdate } from '@/hooks'
import { useAuth } from '@/contexts/AuthContext'
import { UserRole } from '@/types'
import type { AdminCompanyListItem, AssignedUser } from '@/types'
import { AssignedSelect } from '@/components/forms'
import api from '@/services/api'
import CompanyFilterPanel, {
  CompanyFilters,
  defaultFilters,
} from '@/components/companies/CompanyFilterPanel'
import CompanyBulkActions from '@/components/companies/CompanyBulkActions'
import CompanyKanbanBoard from '@/components/companies/CompanyKanbanBoard'
import CompanyDetailDrawer from '@/components/companies/CompanyDetailDrawer'
import CreateLeadModal from '@/components/companies/CreateLeadModal'
import {
  Building2,
  Eye,
  Edit,
  AlertCircle,
  SlidersHorizontal,
  Briefcase,
  Plus,
  MoreVertical,
  Users,
  LayoutList,
  Columns3,
  Target,
  Handshake,
} from 'lucide-react'

type ViewMode = 'table' | 'kanban'

const PAGE_SIZE_OPTIONS = [20, 30, 50]

const getStatusBadge = (isPublished: boolean) => {
  if (isPublished) {
    return { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', label: 'Published' }
  }
  return { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-500 dark:text-gray-400', label: 'Draft' }
}

const getJobStatusBadge = (status: string) => {
  switch (status) {
    case 'published':
      return { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', label: 'Live' }
    case 'draft':
      return { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-500 dark:text-gray-400', label: 'Draft' }
    case 'closed':
      return { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400', label: 'Closed' }
    case 'filled':
      return { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', label: 'Filled' }
    default:
      return { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-500 dark:text-gray-400', label: status }
  }
}

const getServiceTypeBadge = (serviceType: string | null) => {
  switch (serviceType) {
    case 'headhunting':
      return { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', label: 'Headhunting', icon: Target }
    case 'retained':
      return { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400', label: 'Retained', icon: Handshake }
    default:
      return { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-400 dark:text-gray-500', label: 'Not Set', icon: null }
  }
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const columnHelper = createColumnHelper<AdminCompanyListItem>()

export default function AdminCompaniesPage() {
  const { user } = useAuth()
  const [filters, setFilters] = useState<CompanyFilters>(defaultFilters)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [showFilters, setShowFilters] = useState(false)
  const [sorting, setSorting] = useState<SortingState>([])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [openActionsMenu, setOpenActionsMenu] = useState<string | null>(null)
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null)
  const [showCreateLeadModal, setShowCreateLeadModal] = useState(false)

  // Convert TanStack sorting to API ordering param
  const ordering = useMemo(() => {
    if (sorting.length === 0) return filters.ordering
    const sortItem = sorting[0]
    if (!sortItem) return filters.ordering
    const fieldMap: Record<string, string> = {
      name: 'name',
      created_at: 'created_at',
      jobs_total: 'jobs_total',
    }
    const field = fieldMap[sortItem.id] || sortItem.id
    return sortItem.desc ? `-${field}` : field
  }, [sorting, filters.ordering])

  const { companies, count, hasNext, hasPrevious, isLoading, error, refetch } = useAllCompanies({
    search: filters.search || undefined,
    is_published: filters.is_published,
    industry: filters.industry || undefined,
    company_size: filters.company_size || undefined,
    has_jobs: filters.has_jobs,
    created_after: filters.created_after || undefined,
    created_before: filters.created_before || undefined,
    ordering,
    page,
    page_size: pageSize,
  })

  // Local state for optimistic updates
  const [localCompanies, setLocalCompanies] = useState<AdminCompanyListItem[]>([])

  // Sync local state with fetched data
  useEffect(() => {
    if (companies) {
      setLocalCompanies(companies)
    }
  }, [companies])

  // Check if user has admin/recruiter access
  if (!user || ![UserRole.ADMIN, UserRole.RECRUITER].includes(user.role)) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-300 dark:text-red-500 mx-auto mb-4" />
        <p className="text-[15px] text-gray-700 dark:text-gray-300 mb-2">Access Denied</p>
        <p className="text-[13px] text-gray-500 dark:text-gray-400">
          You do not have permission to view this page.
        </p>
      </div>
    )
  }

  const totalPages = Math.ceil(count / pageSize)

  const handleFiltersChange = (newFilters: CompanyFilters) => {
    setFilters(newFilters)
    setPage(1)
  }

  const handleClearFilters = () => {
    setFilters(defaultFilters)
    setPage(1)
  }

  const activeFilterCount = useMemo(() => {
    let filterCount = 0
    if (filters.is_published !== undefined) filterCount++
    if (filters.industry) filterCount++
    if (filters.company_size) filterCount++
    if (filters.has_jobs !== undefined) filterCount++
    if (filters.created_after) filterCount++
    if (filters.created_before) filterCount++
    return filterCount
  }, [filters])

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize)
    setPage(1)
  }

  // Hook for optimistic updates with toast notifications
  const { updateAssigned } = useAssignedUpdate<AdminCompanyListItem>()

  // Handler for changing assigned users on a company (optimistic)
  const handleAssignedToChange = useCallback((companyId: string, assignedTo: AssignedUser[]) => {
    updateAssigned(
      localCompanies,
      setLocalCompanies,
      companyId,
      'id',
      'assigned_to',
      assignedTo,
      () => api.patch(`/companies/${companyId}/detail/`, {
        assigned_to_ids: assignedTo.map(u => u.id),
      })
    )
  }, [localCompanies, updateAssigned])

  // Define columns
  const columns = useMemo<ColumnDef<AdminCompanyListItem, any>[]>(
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
            className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:ring-gray-500 dark:focus:ring-gray-400 bg-white dark:bg-gray-800"
          />
        ),
        cell: ({ row }) => (
          <div onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={row.getIsSelected()}
              onChange={row.getToggleSelectedHandler()}
              className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:ring-gray-500 dark:focus:ring-gray-400 bg-white dark:bg-gray-800"
            />
          </div>
        ),
      },
      // Assigned (pinned to front)
      columnHelper.accessor('assigned_to', {
        header: 'Assigned',
        size: 160,
        cell: ({ row }) => {
          const company = row.original
          const assignedUsers = company.assigned_to || []
          return (
            <div onClick={(e) => e.stopPropagation()}>
              <AssignedSelect
                selected={assignedUsers}
                onChange={(newAssigned) => handleAssignedToChange(company.id, newAssigned)}
                compact
                placeholder="Assign"
              />
            </div>
          )
        },
      }),
      // Company
      columnHelper.accessor('name', {
        header: 'Company',
        size: 250,
        enableSorting: true,
        cell: ({ row }) => {
          const company = row.original
          return (
            <div className="flex items-center gap-3">
              {company.logo ? (
                <img
                  src={company.logo}
                  alt={company.name}
                  className="w-8 h-8 rounded object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                </div>
              )}
              <div className="min-w-0">
                <Link
                  to={`/dashboard/admin/companies/${company.id}`}
                  className="text-[13px] font-medium text-gray-900 dark:text-gray-100 hover:text-gray-700 dark:hover:text-gray-300 truncate block"
                >
                  {company.name}
                </Link>
                {company.tagline && (
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
                    {company.tagline}
                  </p>
                )}
              </div>
            </div>
          )
        },
      }),
      // Industry
      columnHelper.accessor('industry', {
        header: 'Industry',
        size: 140,
        cell: ({ getValue }) => {
          const industry = getValue()
          return (
            <span className="text-[12px] text-gray-600 dark:text-gray-400">
              {industry?.name || '-'}
            </span>
          )
        },
      }),
      // Company Size
      columnHelper.accessor('company_size', {
        header: 'Size',
        size: 100,
        cell: ({ getValue }) => {
          const size = getValue()
          return (
            <span className="text-[12px] text-gray-600 dark:text-gray-400">
              {size ? size.replace('_', '-') : '-'}
            </span>
          )
        },
      }),
      // Location
      columnHelper.accessor('headquarters_location', {
        header: 'Location',
        size: 140,
        cell: ({ getValue }) => (
          <span className="text-[12px] text-gray-600 dark:text-gray-400 truncate block max-w-[120px]">
            {getValue() || '-'}
          </span>
        ),
      }),
      // Jobs
      columnHelper.accessor('jobs', {
        header: 'Jobs',
        size: 280,
        enableSorting: false,
        cell: ({ row }) => {
          const company = row.original
          const jobs = company.jobs || []

          if (jobs.length === 0) {
            return <span className="text-[11px] text-gray-400 dark:text-gray-500">No jobs</span>
          }

          return (
            <div className="flex flex-col gap-1.5 max-h-[100px] overflow-y-auto">
              {jobs.map(job => {
                const statusBadge = getJobStatusBadge(job.status)
                return (
                  <div key={job.id} className="flex items-center gap-2 group">
                    <Link
                      to={`/dashboard/admin/jobs/${job.id}`}
                      className="text-[12px] text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:underline truncate max-w-[130px]"
                      title={job.title}
                    >
                      {job.title}
                    </Link>
                    <span className={`inline-flex px-1.5 py-0.5 text-[9px] font-medium rounded ${statusBadge.bg} ${statusBadge.text}`}>
                      {statusBadge.label}
                    </span>
                    <Link
                      to={`/dashboard/applications?job=${job.id}`}
                      className="inline-flex items-center gap-0.5 text-[10px] text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                      title={`${job.applications_count} application${job.applications_count !== 1 ? 's' : ''}`}
                    >
                      <Users className="w-3 h-3" />
                      {job.applications_count}
                    </Link>
                  </div>
                )
              })}
            </div>
          )
        },
      }),
      // Status
      columnHelper.accessor('is_published', {
        header: 'Status',
        size: 100,
        cell: ({ getValue }) => {
          const badge = getStatusBadge(getValue())
          return (
            <span className={`inline-flex px-2 py-0.5 text-[11px] font-medium rounded ${badge.bg} ${badge.text}`}>
              {badge.label}
            </span>
          )
        },
      }),
      // Service Type
      columnHelper.accessor('service_type', {
        header: 'Package',
        size: 120,
        cell: ({ getValue }) => {
          const serviceType = getValue()
          const badge = getServiceTypeBadge(serviceType)
          const Icon = badge.icon
          return (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded ${badge.bg} ${badge.text}`}>
              {Icon && <Icon className="w-3 h-3" />}
              {badge.label}
            </span>
          )
        },
      }),
      // Created At
      columnHelper.accessor('created_at', {
        header: 'Created',
        size: 100,
        enableSorting: true,
        cell: ({ getValue }) => (
          <span className="text-[12px] text-gray-500 dark:text-gray-400">{formatDate(getValue())}</span>
        ),
      }),
      // Actions
      columnHelper.display({
        id: 'actions',
        header: '',
        size: 50,
        enableResizing: false,
        cell: ({ row }) => {
          const company = row.original
          return (
            <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={(e) => {
                  if (openActionsMenu === company.id) {
                    setOpenActionsMenu(null)
                    setMenuPosition(null)
                  } else {
                    const rect = e.currentTarget.getBoundingClientRect()
                    setMenuPosition({ top: rect.bottom + 4, left: rect.right - 192 })
                    setOpenActionsMenu(company.id)
                  }
                }}
                className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {openActionsMenu === company.id && menuPosition && createPortal(
                <>
                  <div
                    className="fixed inset-0 z-[9998]"
                    onClick={() => {
                      setOpenActionsMenu(null)
                      setMenuPosition(null)
                    }}
                  />
                  <div
                    className="fixed w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg dark:shadow-gray-900/40 z-[9999]"
                    style={{ top: menuPosition.top, left: menuPosition.left }}
                  >
                    <div className="py-1">
                      {company.is_published && (
                        <Link
                          to={`/companies/${company.slug}`}
                          className="flex items-center gap-2 px-4 py-2 text-[13px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                          onClick={() => {
                            setOpenActionsMenu(null)
                            setMenuPosition(null)
                          }}
                        >
                          <Eye className="w-4 h-4" />
                          View Public Profile
                        </Link>
                      )}
                      <Link
                        to={`/dashboard/admin/companies/${company.id}`}
                        className="flex items-center gap-2 px-4 py-2 text-[13px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                        onClick={() => {
                          setOpenActionsMenu(null)
                          setMenuPosition(null)
                        }}
                      >
                        <Edit className="w-4 h-4" />
                        Edit Company
                      </Link>
                      <Link
                        to={`/dashboard/admin/jobs?company=${company.id}`}
                        className="flex items-center gap-2 px-4 py-2 text-[13px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                        onClick={() => {
                          setOpenActionsMenu(null)
                          setMenuPosition(null)
                        }}
                      >
                        <Briefcase className="w-4 h-4" />
                        View Jobs
                      </Link>
                      <Link
                        to={`/dashboard/admin/jobs/new?company=${company.id}`}
                        className="flex items-center gap-2 px-4 py-2 text-[13px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                        onClick={() => {
                          setOpenActionsMenu(null)
                          setMenuPosition(null)
                        }}
                      >
                        <Plus className="w-4 h-4" />
                        Create Job
                      </Link>
                    </div>
                  </div>
                </>,
                document.body
              )}
            </div>
          )
        },
      }),
    ],
    [openActionsMenu, menuPosition]
  )

  const table = useReactTable({
    data: localCompanies,
    columns,
    state: {
      sorting,
      rowSelection,
    },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualPagination: true,
    pageCount: totalPages,
    getRowId: (row) => row.id,
    enableRowSelection: true,
  })

  // Get selected companies
  const selectedCompanies = useMemo(() => {
    return table.getSelectedRowModel().rows.map(row => row.original)
  }, [table.getSelectedRowModel().rows])

  const clearSelection = () => {
    setRowSelection({})
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-semibold text-gray-900 dark:text-gray-100">All Companies</h1>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">
            {count} compan{count !== 1 ? 'ies' : 'y'} found
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
              showFilters ? 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300' : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
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
            <CompanyFilterPanel
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

          {/* Bulk Actions */}
          <CompanyBulkActions
            selectedCompanies={selectedCompanies}
            onClearSelection={clearSelection}
            totalCount={count}
          />

          {/* Table View */}
          {viewMode === 'table' && (
            <DataTable
              table={table}
              onRowClick={(company) => setSelectedCompanyId(company.id)}
              stickyColumns={{ left: ['select', 'name'], right: ['actions'] }}
              isLoading={isLoading}
              loadingMessage="Loading companies..."
              error={error}
              emptyState={{
                icon: <Building2 className="w-12 h-12 text-gray-300 dark:text-gray-600" />,
                title: 'No companies found',
                description: activeFilterCount > 0 || filters.search
                  ? 'Try adjusting your filters'
                  : 'No companies have been created yet',
                action: activeFilterCount > 0 ? (
                  <button
                    onClick={handleClearFilters}
                    className="text-[13px] text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 underline"
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
            <CompanyKanbanBoard
              companies={localCompanies}
              isLoading={isLoading}
              onStageChange={refetch}
              onCompanyClick={(company) => setSelectedCompanyId(company.id)}
            />
          )}
        </div>
      </div>

      {/* Company Detail Drawer */}
      {selectedCompanyId && (
        <CompanyDetailDrawer
          companyId={selectedCompanyId}
          onClose={() => setSelectedCompanyId(null)}
          onRefresh={refetch}
        />
      )}

      {/* Create Lead Modal */}
      <CreateLeadModal
        isOpen={showCreateLeadModal}
        onClose={() => setShowCreateLeadModal(false)}
        onSuccess={refetch}
      />
    </div>
  )
}
