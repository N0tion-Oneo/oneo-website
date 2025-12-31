import type { Table } from '@tanstack/react-table'
import type { ReactNode } from 'react'

/**
 * Configuration for sticky columns
 */
export interface StickyColumnConfig {
  /** Column IDs that should be sticky on the left */
  left?: string[]
  /** Column IDs that should be sticky on the right */
  right?: string[]
}

/**
 * Pagination configuration
 */
export interface PaginationConfig {
  /** Current page number (1-indexed) */
  page: number
  /** Total number of pages */
  totalPages: number
  /** Total count of items */
  totalCount: number
  /** Whether there's a next page */
  hasNext: boolean
  /** Whether there's a previous page */
  hasPrevious: boolean
  /** Handler for page changes */
  onPageChange: (page: number) => void
  /** Page size options (e.g., [20, 30, 50]) */
  pageSizeOptions?: number[]
  /** Current page size */
  pageSize?: number
  /** Handler for page size changes */
  onPageSizeChange?: (size: number) => void
}

/**
 * Empty state configuration
 */
export interface EmptyStateConfig {
  /** Icon component to display */
  icon?: ReactNode
  /** Title text */
  title: string
  /** Description text */
  description: string
  /** Action button (e.g., "Clear filters") */
  action?: ReactNode
}

/**
 * Main DataTable component props
 */
export interface DataTableProps<TData> {
  /** TanStack table instance - created externally with useReactTable */
  table: Table<TData>

  /** Handler for row clicks (optional) */
  onRowClick?: (row: TData) => void

  /** Sticky column configuration */
  stickyColumns?: StickyColumnConfig

  /** Enable column resizing visual handles */
  enableColumnResizing?: boolean

  /** Pagination configuration (if pagination is needed) */
  pagination?: PaginationConfig

  /** Loading state - shows loading indicator when true */
  isLoading?: boolean

  /** Loading message */
  loadingMessage?: string

  /** Error message - shows error state when provided */
  error?: string | null

  /** Empty state configuration - shown when no data */
  emptyState?: EmptyStateConfig

  /** Additional className for the table container */
  className?: string
}

/**
 * Props for DataTableHeader component
 */
export interface DataTableHeaderProps<TData> {
  table: Table<TData>
  stickyColumns: StickyColumnConfig
  enableColumnResizing: boolean
  leftPositions: Record<string, number>
}

/**
 * Props for DataTableBody component
 */
export interface DataTableBodyProps<TData> {
  table: Table<TData>
  stickyColumns: StickyColumnConfig
  leftPositions: Record<string, number>
  onRowClick?: (row: TData) => void
}

/**
 * Props for DataTablePagination component
 */
export interface DataTablePaginationProps {
  page: number
  totalPages: number
  totalCount: number
  hasNext: boolean
  hasPrevious: boolean
  onPageChange: (page: number) => void
  pageSizeOptions?: number[]
  pageSize?: number
  onPageSizeChange?: (size: number) => void
}

/**
 * Props for state components
 */
export interface LoadingStateProps {
  message?: string
}

export interface ErrorStateProps {
  message: string
}

export interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description: string
  action?: ReactNode
}
