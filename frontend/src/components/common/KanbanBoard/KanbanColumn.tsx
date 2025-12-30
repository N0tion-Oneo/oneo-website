import type { KanbanColumnProps } from './types'

export function KanbanColumn<TItem>({
  column,
  getItemId,
  renderCard,
  dragEnabled,
  isDragOver,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onItemClick,
}: KanbanColumnProps<TItem>) {
  const canDrop = column.droppable !== false && dragEnabled

  return (
    <div
      className={`w-72 flex-shrink-0 flex flex-col bg-gray-50 dark:bg-gray-800 rounded-lg transition-all ${
        isDragOver && canDrop ? 'ring-2 ring-blue-400 bg-blue-50' : ''
      }`}
      onDragOver={canDrop ? onDragOver : undefined}
      onDragLeave={canDrop ? onDragLeave : undefined}
      onDrop={canDrop ? onDrop : undefined}
    >
      {/* Column Header */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${column.color.startsWith('bg-') ? column.color : ''}`}
              style={!column.color.startsWith('bg-') ? { backgroundColor: column.color } : undefined}
            />
            <h3 className="text-[13px] font-medium text-gray-900 dark:text-gray-100">{column.title}</h3>
          </div>
          <span className="text-[12px] text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-600 px-2 py-0.5 rounded-full">
            {column.items.length}
          </span>
        </div>
      </div>

      {/* Column Content */}
      <div
        className={`flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-280px)] ${
          isDragOver && canDrop ? 'bg-blue-50/50' : ''
        }`}
      >
        {column.items.map((item) => {
          const itemId = getItemId(item)
          const itemDragEnabled = dragEnabled

          return (
            <div key={itemId}>
              {renderCard({
                item,
                onClick: onItemClick ? () => onItemClick(item) : undefined,
                dragHandleProps: {
                  draggable: itemDragEnabled,
                  onDragStart: (e) => itemDragEnabled && onDragStart(item, e),
                },
                isDragEnabled: itemDragEnabled,
              })}
            </div>
          )
        })}

        {column.items.length === 0 && (
          <div
            className={`py-8 text-center ${
              isDragOver && canDrop ? 'border-2 border-dashed border-blue-300 rounded-md' : ''
            }`}
          >
            <p className="text-[12px] text-gray-400 dark:text-gray-500">
              {canDrop ? 'Drop here' : 'No items'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
