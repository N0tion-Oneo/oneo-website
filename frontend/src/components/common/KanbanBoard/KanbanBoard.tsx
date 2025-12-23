import { useState, useCallback, useMemo, useEffect } from 'react'
import type { KanbanBoardProps, KanbanColumnConfig, DropResult } from './types'
import { KanbanColumn } from './KanbanColumn'

export function KanbanBoard<TItem>({
  columns,
  getItemId,
  renderCard,
  dragEnabled = true,
  canDropInColumn,
  onDrop,
  onItemClick,
  isLoading,
  className = '',
}: KanbanBoardProps<TItem>) {
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null)
  const [draggedItem, setDraggedItem] = useState<TItem | null>(null)
  const [sourceColumnId, setSourceColumnId] = useState<string | null>(null)

  // Track optimistic moves: itemId -> targetColumnId
  const [optimisticMoves, setOptimisticMoves] = useState<Map<string, string>>(new Map())

  // Reset optimistic moves when columns change (from props/refetch)
  useEffect(() => {
    setOptimisticMoves(new Map())
  }, [columns])

  // Apply optimistic moves to columns
  const optimisticColumns = useMemo<KanbanColumnConfig<TItem>[]>(() => {
    if (optimisticMoves.size === 0) {
      return columns
    }

    // Collect all items and their target columns
    const allItems: TItem[] = []
    columns.forEach(col => allItems.push(...col.items))

    // Build new columns with optimistic moves applied
    return columns.map(col => ({
      ...col,
      items: allItems.filter(item => {
        const itemId = getItemId(item)
        const targetColumnId = optimisticMoves.get(itemId)
        if (targetColumnId !== undefined) {
          // Item has been moved optimistically
          return targetColumnId === col.id
        }
        // Item hasn't been moved, check if it originally belonged to this column
        return col.items.some(i => getItemId(i) === itemId)
      }),
    }))
  }, [columns, optimisticMoves, getItemId])

  // Handle drag start
  const handleDragStart = useCallback(
    (item: TItem, columnId: string, e: React.DragEvent) => {
      e.dataTransfer.setData(
        'application/json',
        JSON.stringify({
          itemId: getItemId(item),
          sourceColumnId: columnId,
        })
      )
      e.dataTransfer.effectAllowed = 'move'

      setDraggedItem(item)
      setSourceColumnId(columnId)
    },
    [getItemId]
  )

  // Handle drag over column
  const handleDragOver = useCallback(
    (columnId: string, e: React.DragEvent) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'

      // Check if drop is allowed
      if (draggedItem && sourceColumnId) {
        const canDrop = canDropInColumn?.(draggedItem, sourceColumnId, columnId) ?? true
        if (canDrop && columnId !== sourceColumnId) {
          setDragOverColumnId(columnId)
        }
      } else {
        setDragOverColumnId(columnId)
      }
    },
    [draggedItem, sourceColumnId, canDropInColumn]
  )

  // Handle drag leave
  const handleDragLeave = useCallback(() => {
    setDragOverColumnId(null)
  }, [])

  // Handle drop
  const handleDrop = useCallback(
    async (targetColumnId: string, e: React.DragEvent) => {
      e.preventDefault()
      setDragOverColumnId(null)

      try {
        const rawData = e.dataTransfer.getData('application/json')
        const data = JSON.parse(rawData)

        // Find the item across all columns (it may have been optimistically moved)
        let item: TItem | undefined
        let originalColumnId: string | undefined
        for (const col of columns) {
          const found = col.items.find((i) => getItemId(i) === data.itemId)
          if (found) {
            item = found
            originalColumnId = col.id
            break
          }
        }

        if (!item || !originalColumnId) {
          setDraggedItem(null)
          setSourceColumnId(null)
          return
        }

        const itemId = getItemId(item)

        // Get the item's current column (accounting for optimistic moves)
        const currentColumnId = optimisticMoves.get(itemId) ?? originalColumnId

        // Don't do anything if dropping on the same column
        if (currentColumnId === targetColumnId) {
          setDraggedItem(null)
          setSourceColumnId(null)
          return
        }

        // Check if drop is allowed
        const canDrop = canDropInColumn?.(item, currentColumnId, targetColumnId) ?? true
        if (!canDrop) {
          setDraggedItem(null)
          setSourceColumnId(null)
          return
        }

        // Apply optimistic update immediately
        setOptimisticMoves(prev => {
          const next = new Map(prev)
          next.set(itemId, targetColumnId)
          return next
        })

        const result: DropResult<TItem> = {
          item,
          targetColumnId,
          sourceColumnId: currentColumnId,
        }

        // Call the onDrop handler (API call)
        try {
          await onDrop?.(result)
        } catch (error) {
          // Revert optimistic update on error
          setOptimisticMoves(prev => {
            const next = new Map(prev)
            next.delete(itemId)
            return next
          })
          console.error('Failed to process drop:', error)
        }
      } catch (error) {
        console.error('Failed to parse drop data:', error)
      } finally {
        setDraggedItem(null)
        setSourceColumnId(null)
      }
    },
    [columns, getItemId, canDropInColumn, onDrop, optimisticMoves]
  )

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-[14px] text-gray-500">Loading...</p>
      </div>
    )
  }

  return (
    <div className={`flex gap-4 overflow-x-auto pb-4 ${className}`}>
      {optimisticColumns.map((column) => (
        <KanbanColumn
          key={column.id}
          column={column}
          getItemId={getItemId}
          renderCard={renderCard}
          dragEnabled={dragEnabled}
          isDragOver={dragOverColumnId === column.id}
          onDragStart={(item, e) => handleDragStart(item, column.id, e)}
          onDragOver={(e) => handleDragOver(column.id, e)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(column.id, e)}
          onItemClick={onItemClick}
        />
      ))}
    </div>
  )
}
