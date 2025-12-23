import type { ReactNode } from 'react'

/**
 * Configuration for a single kanban column
 */
export interface KanbanColumnConfig<TItem = unknown> {
  /** Unique identifier for the column */
  id: string
  /** Display title for the column header */
  title: string
  /** Tailwind background color class (e.g., 'bg-blue-500') */
  color: string
  /** Items to display in this column */
  items: TItem[]
  /** Whether items can be dropped into this column (default: true) */
  droppable?: boolean
}

/**
 * Props passed to the renderCard function
 */
export interface CardRenderProps<TItem = unknown> {
  /** The item to render */
  item: TItem
  /** Handler to call when the card is clicked */
  onClick?: () => void
  /** Props to spread onto the draggable element */
  dragHandleProps: {
    draggable: boolean
    onDragStart: (e: React.DragEvent) => void
  }
  /** Whether drag is enabled for this item */
  isDragEnabled: boolean
}

/**
 * Result of a drop operation
 */
export interface DropResult<TItem = unknown> {
  /** The item that was dropped */
  item: TItem
  /** ID of the target column */
  targetColumnId: string
  /** ID of the source column */
  sourceColumnId: string
}

/**
 * Props for the main KanbanBoard component
 */
export interface KanbanBoardProps<TItem = unknown> {
  /** Column configurations with their items */
  columns: KanbanColumnConfig<TItem>[]

  /** Function to get unique key for each item */
  getItemId: (item: TItem) => string

  /** Render function for individual cards */
  renderCard: (props: CardRenderProps<TItem>) => ReactNode

  /** Whether drag and drop is enabled (default: true) */
  dragEnabled?: boolean

  /** Custom function to determine if an item can be dropped in a column */
  canDropInColumn?: (item: TItem, sourceColumnId: string, targetColumnId: string) => boolean

  /** Handler called when an item is dropped into a new column */
  onDrop?: (result: DropResult<TItem>) => void | Promise<void>

  /** Handler called when a card is clicked */
  onItemClick?: (item: TItem) => void

  /** Whether the board is in a loading state */
  isLoading?: boolean

  /** Additional class names for the board container */
  className?: string
}

/**
 * Internal props for KanbanColumn component
 */
export interface KanbanColumnProps<TItem = unknown> {
  column: KanbanColumnConfig<TItem>
  getItemId: (item: TItem) => string
  renderCard: (props: CardRenderProps<TItem>) => ReactNode
  dragEnabled: boolean
  isDragOver: boolean
  onDragStart: (item: TItem, e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent) => void
  onItemClick?: (item: TItem) => void
}
