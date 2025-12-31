import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { DataTablePaginationProps } from './types'

const DEFAULT_PAGE_SIZE_OPTIONS = [20, 30, 50]

export function DataTablePagination({
  page,
  totalPages,
  totalCount,
  hasNext,
  hasPrevious,
  onPageChange,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  pageSize,
  onPageSizeChange,
}: DataTablePaginationProps) {
  // Don't render if only one page
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-4">
        <p className="text-[13px] text-gray-500 dark:text-gray-400">
          Page {page} of {totalPages} ({totalCount} total)
        </p>

        {/* Page size selector (optional) */}
        {pageSize !== undefined && onPageSizeChange && (
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] text-gray-500 dark:text-gray-400">Show:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="px-2 py-1 text-[12px] border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600"
            >
              {pageSizeOptions.map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={!hasPrevious}
          className="flex items-center gap-1 px-3 py-1.5 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </button>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={!hasNext}
          className="flex items-center gap-1 px-3 py-1.5 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
