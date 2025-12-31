import { useRef, useState, useEffect } from 'react'
import type { DataTableProps } from './types'
import { DataTableHeader } from './DataTableHeader'
import { DataTableBody } from './DataTableBody'
import { DataTablePagination } from './DataTablePagination'
import { LoadingState, ErrorState, EmptyState } from './DataTableStates'
import { useDataTableStyles } from './hooks/useDataTableStyles'

export function DataTable<TData>({
  table,
  onRowClick,
  stickyColumns = { left: [], right: [] },
  enableColumnResizing = false,
  pagination,
  isLoading = false,
  loadingMessage,
  error = null,
  emptyState,
  className = '',
}: DataTableProps<TData>) {
  const { leftPositions } = useDataTableStyles(table, stickyColumns)
  const hasData = table.getRowModel().rows.length > 0

  // Track loading state transitions to detect when fetches complete
  // Using useState (not ref) ensures we wait one render cycle for data to sync
  const [fetchCompleted, setFetchCompleted] = useState(false)
  const wasLoadingRef = useRef(isLoading)

  useEffect(() => {
    if (isLoading) {
      // Reset when a new fetch starts
      setFetchCompleted(false)
    } else if (wasLoadingRef.current) {
      // When isLoading transitions from true to false, a fetch has completed
      // The useEffect timing ensures localState has a chance to sync first
      setFetchCompleted(true)
    }
    wasLoadingRef.current = isLoading
  }, [isLoading])

  // Show loading state
  if (isLoading) {
    return <LoadingState message={loadingMessage} />
  }

  // Show error state
  if (error) {
    return <ErrorState message={error} />
  }

  // Show empty state only after a fetch has completed with no results
  // This prevents flash of empty state during useEffect sync delays
  if (!hasData && emptyState) {
    // If we haven't completed a fetch yet, show loading (prevents flash)
    if (!fetchCompleted) {
      return <LoadingState message={loadingMessage} />
    }

    return (
      <EmptyState
        icon={emptyState.icon}
        title={emptyState.title}
        description={emptyState.description}
        action={emptyState.action}
      />
    )
  }

  // Don't render anything if no data and no empty state configured
  if (!hasData) {
    return null
  }

  return (
    <div
      className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden ${className}`}
    >
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse" style={{ width: table.getTotalSize() }}>
          <DataTableHeader
            table={table}
            stickyColumns={stickyColumns}
            enableColumnResizing={enableColumnResizing}
            leftPositions={leftPositions}
          />
          <DataTableBody
            table={table}
            stickyColumns={stickyColumns}
            leftPositions={leftPositions}
            onRowClick={onRowClick}
          />
        </table>
      </div>

      {pagination && (
        <DataTablePagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          totalCount={pagination.totalCount}
          hasNext={pagination.hasNext}
          hasPrevious={pagination.hasPrevious}
          onPageChange={pagination.onPageChange}
          pageSizeOptions={pagination.pageSizeOptions}
          pageSize={pagination.pageSize}
          onPageSizeChange={pagination.onPageSizeChange}
        />
      )}
    </div>
  )
}
