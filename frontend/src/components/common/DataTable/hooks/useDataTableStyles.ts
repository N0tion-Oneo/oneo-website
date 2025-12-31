import { useMemo } from 'react'
import type { Table } from '@tanstack/react-table'
import type { StickyColumnConfig } from '../types'

/**
 * Hook to compute sticky column positions and styles
 */
export function useDataTableStyles<TData>(
  table: Table<TData>,
  stickyColumns: StickyColumnConfig
) {
  const leftPositions = useMemo(() => {
    const positions: Record<string, number> = {}
    let cumulativeWidth = 0

    // Get all visible leaf columns
    const visibleColumns = table.getVisibleLeafColumns()

    // Calculate left positions for left-sticky columns in order
    for (const columnId of stickyColumns.left || []) {
      const column = visibleColumns.find(c => c.id === columnId)
      if (column) {
        positions[columnId] = cumulativeWidth
        cumulativeWidth += column.getSize()
      }
    }

    return positions
  }, [table, stickyColumns.left, table.getState().columnSizing])

  /**
   * Check if a column is pinned left
   */
  const isPinnedLeft = (columnId: string): boolean => {
    return (stickyColumns.left || []).includes(columnId)
  }

  /**
   * Check if a column is pinned right
   */
  const isPinnedRight = (columnId: string): boolean => {
    return (stickyColumns.right || []).includes(columnId)
  }

  /**
   * Get the left position for a sticky column
   */
  const getLeftPosition = (columnId: string): number | undefined => {
    return leftPositions[columnId]
  }

  return {
    leftPositions,
    isPinnedLeft,
    isPinnedRight,
    getLeftPosition,
  }
}
