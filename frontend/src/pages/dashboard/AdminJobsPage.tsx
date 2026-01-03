import { useState, useMemo, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Link, useSearchParams } from 'react-router-dom'
import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  ColumnDef,
  SortingState,
  RowSelectionState,
} from '@tanstack/react-table'
import { DataTable } from '@/components/common/DataTable'
import { useAllJobs, useCompanyJobs, useJobStatus, useDeleteJob, useUpdateJob } from '@/hooks/useJobs'
import { useAssignedUpdate, useMyCompany } from '@/hooks'
import { useAuth } from '@/contexts/AuthContext'
import { JobStatus, UserRole } from '@/types'
import type { JobListItem, User, AssignedUser } from '@/types'
import JobFilterPanel, {
  JobFilters,
  defaultFilters,
} from '@/components/jobs/JobFilterPanel'
import JobBulkActions from '@/components/jobs/JobBulkActions'
import JobDrawer from '@/components/jobs/JobDrawer'
import { AssignedSelect } from '@/components/forms'
import { getStatusBadge, formatJobDate } from '@/utils/jobs'
import {
  Briefcase,
  Eye,
  Edit,
  AlertCircle,
  SlidersHorizontal,
  Building2,
  Plus,
  MoreVertical,
  Users,
  Play,
  Pause,
  CheckCircle,
  Trash2,
} from 'lucide-react'

const PAGE_SIZE_OPTIONS = [20, 30, 50]

const columnHelper = createColumnHelper<JobListItem>()

interface AdminJobsPageProps {
  mode?: 'admin' | 'client'
}

export default function AdminJobsPage({ mode = 'admin' }: AdminJobsPageProps) {
  const isClientMode = mode === 'client'
  const { user } = useAuth()
  const { company, isLoading: companyLoading } = useMyCompany()
  const [searchParams] = useSearchParams()
  const [filters, setFilters] = useState<JobFilters>(() => {
    // Initialize company filter from URL params
    const companyFromUrl = searchParams.get('company')
    return {
      ...defaultFilters,
      company: companyFromUrl || '',
    }
  })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [showFilters, setShowFilters] = useState(false)
  const [sorting, setSorting] = useState<SortingState>([{ id: 'created_at', desc: true }])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [openActionsMenu, setOpenActionsMenu] = useState<string | null>(null)
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null)

  // Job Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)

  const { publishJob, closeJob, markJobFilled, isSubmitting } = useJobStatus()
  const { deleteJob, isDeleting } = useDeleteJob()
  const { updateJob } = useUpdateJob()

  // Convert TanStack sorting to API ordering param
  const ordering = useMemo(() => {
    if (sorting.length === 0) return filters.ordering
    const sortItem = sorting[0]
    if (!sortItem) return filters.ordering
    const fieldMap: Record<string, string> = {
      title: 'title',
      created_at: 'created_at',
      applications_count: 'applications_count',
      views_count: 'views_count',
    }
    const field = fieldMap[sortItem.id] || sortItem.id
    return sortItem.desc ? `-${field}` : field
  }, [sorting, filters.ordering])

  // Use different hooks based on mode
  const adminJobsResult = useAllJobs(isClientMode ? {} : {
    search: filters.search || undefined,
    status: filters.status as JobStatus | undefined,
    company: filters.company || undefined,
    seniority: filters.seniority || undefined,
    job_type: filters.job_type || undefined,
    work_mode: filters.work_mode || undefined,
    department: filters.department || undefined,
    recruiter: filters.recruiter || undefined,
    created_after: filters.created_after || undefined,
    created_before: filters.created_before || undefined,
    ordering,
    page,
    page_size: pageSize,
  })

  const clientJobsResult = useCompanyJobs(isClientMode ? {
    status: filters.status as JobStatus | undefined,
    ordering,
    page,
    page_size: pageSize,
  } : {})

  // Select the appropriate result based on mode
  const { jobs, count, hasNext, hasPrevious, isLoading, error, refetch } = isClientMode
    ? clientJobsResult
    : adminJobsResult

  // Local state for optimistic updates
  const [localJobs, setLocalJobs] = useState<JobListItem[]>([])

  // Sync local state with fetched data
  useEffect(() => {
    if (jobs) {
      setLocalJobs(jobs)
    }
  }, [jobs])

  const totalPages = Math.ceil(count / pageSize)

  const handleFiltersChange = (newFilters: JobFilters) => {
    setFilters(newFilters)
    setPage(1)
  }

  const handleClearFilters = () => {
    setFilters(defaultFilters)
    setPage(1)
  }

  const activeFilterCount = useMemo(() => {
    let filterCount = 0
    if (filters.status) filterCount++
    if (filters.company) filterCount++
    if (filters.seniority) filterCount++
    if (filters.job_type) filterCount++
    if (filters.work_mode) filterCount++
    if (filters.department) filterCount++
    if (filters.recruiter) filterCount++
    if (filters.created_after) filterCount++
    if (filters.created_before) filterCount++
    return filterCount
  }, [filters])

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize)
    setPage(1)
  }

  const handlePublish = async (jobId: string) => {
    try {
      await publishJob(jobId)
      refetch()
      setOpenActionsMenu(null)
      setMenuPosition(null)
    } catch (err) {
      console.error('Failed to publish job:', err)
    }
  }

  const handleClose = async (jobId: string) => {
    try {
      await closeJob(jobId)
      refetch()
      setOpenActionsMenu(null)
      setMenuPosition(null)
    } catch (err) {
      console.error('Failed to close job:', err)
    }
  }

  const handleMarkFilled = async (jobId: string) => {
    try {
      await markJobFilled(jobId)
      refetch()
      setOpenActionsMenu(null)
      setMenuPosition(null)
    } catch (err) {
      console.error('Failed to mark job as filled:', err)
    }
  }

  const handleDelete = async (jobId: string) => {
    if (!window.confirm('Are you sure you want to delete this job? This action cannot be undone.')) {
      return
    }
    try {
      await deleteJob(jobId)
      refetch()
      setOpenActionsMenu(null)
      setMenuPosition(null)
    } catch (err) {
      console.error('Failed to delete job:', err)
    }
  }

  // Drawer handlers
  const handleOpenDrawer = useCallback((jobId: string | null = null) => {
    setSelectedJobId(jobId)
    setIsDrawerOpen(true)
  }, [])

  const handleCloseDrawer = useCallback(() => {
    setIsDrawerOpen(false)
    setSelectedJobId(null)
  }, [])

  const handleDrawerSuccess = useCallback(() => {
    refetch()
    handleCloseDrawer()
  }, [refetch, handleCloseDrawer])

  // Hook for optimistic updates with toast notifications
  const { updateAssigned } = useAssignedUpdate<JobListItem>()

  // Handler for updating assigned recruiters inline (optimistic)
  const handleAssignedChange = useCallback((jobId: string, assignedUsers: AssignedUser[]) => {
    updateAssigned(
      localJobs,
      setLocalJobs,
      jobId,
      'id',
      'assigned_recruiters',
      assignedUsers,
      () => updateJob(jobId, { assigned_recruiter_ids: assignedUsers.map(u => u.id) })
    )
  }, [localJobs, updateAssigned, updateJob])

  // Define columns
  const columns = useMemo<ColumnDef<JobListItem, any>[]>(
    () => {
      const baseColumns: ColumnDef<JobListItem, any>[] = [
        // Selection checkbox - PINNED LEFT
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
              className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:ring-gray-500 dark:focus:ring-gray-400"
            />
          ),
          cell: ({ row }) => (
            <div onClick={(e) => e.stopPropagation()}>
              <input
                type="checkbox"
                checked={row.getIsSelected()}
                onChange={row.getToggleSelectedHandler()}
                className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:ring-gray-500 dark:focus:ring-gray-400"
              />
            </div>
          ),
        },
      ]

      // Admin-only: Assigned Recruiters column
      if (!isClientMode) {
        baseColumns.push(
          columnHelper.accessor('assigned_recruiters', {
            header: 'Assigned',
            size: 140,
            enableSorting: false,
            cell: ({ row }) => {
              const job = row.original
              const recruiters = job.assigned_recruiters || []
              const assignedUsers = recruiters.map((r: User) => ({
                id: r.id,
                email: r.email,
                first_name: r.first_name,
                last_name: r.last_name,
                full_name: `${r.first_name} ${r.last_name}`,
              }))
              return (
                <div onClick={(e) => e.stopPropagation()}>
                  <AssignedSelect
                    selected={assignedUsers}
                    onChange={(users) => handleAssignedChange(job.id, users)}
                    compact
                    placeholder="Assign"
                  />
                </div>
              )
            },
          })
        )
      }

      // Job Title - PINNED LEFT
      baseColumns.push(columnHelper.accessor('title', {
        header: 'Job Title',
        size: isClientMode ? 280 : 220,
        enableSorting: true,
        cell: ({ row }) => {
          const job = row.original
          return (
            <div className="min-w-0">
              <span className="text-[13px] font-medium text-gray-900 dark:text-gray-100 truncate block">
                {job.title}
              </span>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                {job.location_display || 'No location'}
              </p>
            </div>
          )
        },
      }))

      // Admin-only: Company column
      if (!isClientMode) {
        baseColumns.push(columnHelper.accessor('company', {
          header: 'Company',
          size: 160,
          enableSorting: false,
          cell: ({ getValue }) => {
            const companyData = getValue()
            return (
              <div className="flex items-center gap-2">
                {companyData?.logo ? (
                  <img
                    src={companyData.logo}
                    alt={companyData.name}
                    className="w-6 h-6 rounded object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-6 h-6 rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                  </div>
                )}
                <span className="text-[12px] text-gray-600 dark:text-gray-400 truncate">
                  {companyData?.name || 'Unknown'}
                </span>
              </div>
            )
          },
        }))
      }

      // Seniority
      baseColumns.push(columnHelper.accessor('seniority', {
        header: 'Seniority',
        size: 90,
        enableSorting: false,
        cell: ({ getValue }) => (
          <span className="text-[12px] text-gray-600 dark:text-gray-400 capitalize">
            {getValue()?.replace('_', ' ') || '-'}
          </span>
        ),
      }))

      // Work Mode
      baseColumns.push(columnHelper.accessor('work_mode', {
        header: 'Work Mode',
        size: 90,
        enableSorting: false,
        cell: ({ getValue }) => (
          <span className="text-[12px] text-gray-600 dark:text-gray-400 capitalize">
            {getValue() || '-'}
          </span>
        ),
      }))

      // Status
      baseColumns.push(columnHelper.accessor('status', {
        header: 'Status',
        size: 100,
        enableSorting: false,
        cell: ({ getValue }) => {
          const status = getValue()
          const badge = getStatusBadge(status)
          return (
            <span className={`inline-flex px-2 py-0.5 text-[11px] font-medium rounded ${badge?.bg || 'bg-gray-100 dark:bg-gray-700'} ${badge?.text || 'text-gray-700 dark:text-gray-300'}`}>
              {badge?.label || status}
            </span>
          )
        },
      }))

      // Applications
      baseColumns.push(columnHelper.accessor('applications_count', {
        header: 'Applications',
        size: 100,
        enableSorting: true,
        cell: ({ row }) => {
          const job = row.original
          return (
            <Link
              to={`/dashboard/applications?job=${job.id}`}
              className="text-[12px] text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {job.applications_count || 0}
            </Link>
          )
        },
      }))

      // Created At
      baseColumns.push(columnHelper.accessor('created_at', {
        header: 'Created',
        size: 100,
        enableSorting: true,
        cell: ({ getValue }) => (
          <span className="text-[12px] text-gray-500 dark:text-gray-400">{formatJobDate(getValue())}</span>
        ),
      }))

      // Actions
      baseColumns.push(columnHelper.display({
        id: 'actions',
        header: '',
        size: 50,
        enableResizing: false,
        enableSorting: false,
        cell: ({ row }) => {
          const job = row.original
          return (
            <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={(e) => {
                  if (openActionsMenu === job.id) {
                    setOpenActionsMenu(null)
                    setMenuPosition(null)
                  } else {
                    const rect = e.currentTarget.getBoundingClientRect()
                    setMenuPosition({ top: rect.bottom + 4, left: rect.right - 192 })
                    setOpenActionsMenu(job.id)
                  }
                }}
                className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {openActionsMenu === job.id && menuPosition && createPortal(
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
                      {job.status === JobStatus.PUBLISHED && (
                        <Link
                          to={`/jobs/${job.slug}`}
                          className="flex items-center gap-2 px-4 py-2 text-[13px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                          onClick={() => {
                            setOpenActionsMenu(null)
                            setMenuPosition(null)
                          }}
                        >
                          <Eye className="w-4 h-4" />
                          View Listing
                        </Link>
                      )}
                      <button
                        onClick={() => {
                          setOpenActionsMenu(null)
                          setMenuPosition(null)
                          handleOpenDrawer(job.id)
                        }}
                        className="flex items-center gap-2 w-full px-4 py-2 text-[13px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <Edit className="w-4 h-4" />
                        Edit Job
                      </button>
                      <Link
                        to={`/dashboard/jobs/${job.id}/applications`}
                        className="flex items-center gap-2 px-4 py-2 text-[13px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                        onClick={() => {
                          setOpenActionsMenu(null)
                          setMenuPosition(null)
                        }}
                      >
                        <Users className="w-4 h-4" />
                        View Applications
                      </Link>

                      {job.status === JobStatus.DRAFT && (
                        <button
                          onClick={() => handlePublish(job.id)}
                          disabled={isSubmitting}
                          className="flex items-center gap-2 w-full px-4 py-2 text-[13px] text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"
                        >
                          <Play className="w-4 h-4" />
                          Publish
                        </button>
                      )}

                      {job.status === JobStatus.PUBLISHED && (
                        <>
                          <button
                            onClick={() => handleClose(job.id)}
                            disabled={isSubmitting}
                            className="flex items-center gap-2 w-full px-4 py-2 text-[13px] text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                          >
                            <Pause className="w-4 h-4" />
                            Close Job
                          </button>
                          <button
                            onClick={() => handleMarkFilled(job.id)}
                            disabled={isSubmitting}
                            className="flex items-center gap-2 w-full px-4 py-2 text-[13px] text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Mark as Filled
                          </button>
                        </>
                      )}

                      <hr className="my-1 border-gray-200 dark:border-gray-700" />
                      <button
                        onClick={() => handleDelete(job.id)}
                        disabled={isDeleting}
                        className="flex items-center gap-2 w-full px-4 py-2 text-[13px] text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete Job
                      </button>
                    </div>
                  </div>
                </>,
                document.body
              )}
            </div>
          )
        },
      }))

      return baseColumns
    },
    [openActionsMenu, menuPosition, isSubmitting, isDeleting, handleAssignedChange, isClientMode]
  )

  const table = useReactTable({
    data: localJobs,
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
    enableSorting: true,
  })

  // Get selected jobs
  const selectedJobs = useMemo(() => {
    return table.getSelectedRowModel().rows.map(row => row.original)
  }, [table.getSelectedRowModel().rows])

  const clearSelection = () => {
    setRowSelection({})
  }

  // Early returns - MUST be after all hooks
  // Check access: admin mode requires admin/recruiter role
  if (!isClientMode && (!user || ![UserRole.ADMIN, UserRole.RECRUITER].includes(user.role))) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-300 dark:text-red-400 mx-auto mb-4" />
        <p className="text-[15px] text-gray-700 dark:text-gray-300 mb-2">Access Denied</p>
        <p className="text-[13px] text-gray-500 dark:text-gray-400">
          You do not have permission to view this page.
        </p>
      </div>
    )
  }

  // Client mode: check for company loading and existence
  if (isClientMode && companyLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-[14px] text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    )
  }

  if (isClientMode && !company) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
        <AlertCircle className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <p className="text-[15px] text-gray-700 dark:text-gray-300 mb-2">No company profile</p>
        <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-4">
          You need to create a company profile before posting jobs.
        </p>
        <a
          href="/dashboard/company"
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[13px] font-medium rounded-md hover:bg-gray-800 dark:hover:bg-gray-200"
        >
          Create Company Profile
        </a>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-semibold text-gray-900 dark:text-gray-100">
            {isClientMode ? 'Job Postings' : 'All Jobs'}
          </h1>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">
            {count} job{count !== 1 ? 's' : ''}{isClientMode && company ? ` • ${company.name}` : ' found'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Page Size Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] text-gray-500 dark:text-gray-400">Show:</span>
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="px-2 py-1 text-[12px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              {PAGE_SIZE_OPTIONS.map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
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
          {/* Create Job */}
          <button
            onClick={() => handleOpenDrawer(null)}
            className="flex items-center gap-2 px-4 py-1.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[13px] font-medium rounded-md hover:bg-gray-800 dark:hover:bg-gray-200"
          >
            <Plus className="w-4 h-4" />
            {isClientMode ? 'Post New Job' : 'Create Job'}
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Filter Sidebar */}
        {showFilters && (
          <div className="w-72 flex-shrink-0">
            <JobFilterPanel
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
          <JobBulkActions
            selectedJobs={selectedJobs}
            onClearSelection={clearSelection}
            totalCount={count}
          />

          {/* Table */}
          <DataTable
            table={table}
            onRowClick={(job) => handleOpenDrawer(job.id)}
            stickyColumns={{ left: ['select', 'title'], right: ['actions'] }}
            isLoading={isLoading}
            loadingMessage="Loading jobs..."
            error={error}
            emptyState={{
              icon: <Briefcase className="w-12 h-12 text-gray-300 dark:text-gray-600" />,
              title: 'No jobs found',
              description: activeFilterCount > 0 || filters.search
                ? 'Try adjusting your filters'
                : 'No jobs have been created yet',
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
        </div>
      </div>

      {/* Job Drawer */}
      <JobDrawer
        jobId={selectedJobId}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        onSuccess={handleDrawerSuccess}
        companyId={isClientMode && company ? company.id : undefined}
      />
    </div>
  )
}
