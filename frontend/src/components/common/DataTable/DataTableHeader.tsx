import { flexRender } from '@tanstack/react-table'
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'
import type { DataTableHeaderProps } from './types'

export function DataTableHeader<TData>({
  table,
  stickyColumns,
  enableColumnResizing,
  leftPositions,
}: DataTableHeaderProps<TData>) {
  const headerGroups = table.getHeaderGroups()
  const hasMultipleHeaderGroups = headerGroups.length > 1

  const isPinnedLeft = (columnId: string) => (stickyColumns.left || []).includes(columnId)
  const isPinnedRight = (columnId: string) => (stickyColumns.right || []).includes(columnId)

  return (
    <thead>
      {headerGroups.map((headerGroup, groupIndex) => (
        <tr
          key={headerGroup.id}
          className={`border-b border-gray-200 dark:border-gray-700 ${
            groupIndex === 0 && hasMultipleHeaderGroups
              ? 'bg-gray-100 dark:bg-gray-700'
              : 'bg-gray-50 dark:bg-gray-800'
          }`}
        >
          {headerGroup.headers.map(header => {
            const isGroupHeader = header.colSpan > 1
            const pinnedLeft = isPinnedLeft(header.id)
            const pinnedRight = isPinnedRight(header.id)

            // Get the background class based on context
            const bgClass = groupIndex === 0 && hasMultipleHeaderGroups
              ? 'bg-gray-100 dark:bg-gray-700'
              : 'bg-gray-50 dark:bg-gray-800'

            return (
              <th
                key={header.id}
                colSpan={header.colSpan}
                className={`px-3 text-left text-[11px] font-medium uppercase tracking-wider whitespace-nowrap relative group ${
                  isGroupHeader
                    ? 'py-1.5 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-700 text-center'
                    : 'py-2.5 text-gray-500 dark:text-gray-400'
                } ${pinnedLeft ? `sticky z-20 ${bgClass}` : ''} ${pinnedRight ? `sticky right-0 z-20 ${bgClass}` : ''}`}
                style={{
                  width: header.colSpan === 1 ? header.getSize() : undefined,
                  left: pinnedLeft ? leftPositions[header.id] : undefined,
                }}
              >
                {header.isPlaceholder ? null : (
                  <div
                    className={`flex items-center gap-1 ${
                      isGroupHeader ? 'justify-center' : ''
                    } ${
                      header.column.getCanSort()
                        ? 'cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-300'
                        : ''
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

                {/* Resize handle */}
                {enableColumnResizing && header.column.getCanResize() && (
                  <div
                    onMouseDown={header.getResizeHandler()}
                    onTouchStart={header.getResizeHandler()}
                    className={`absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none ${
                      header.column.getIsResizing()
                        ? 'bg-blue-500'
                        : 'bg-transparent hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                  />
                )}
              </th>
            )
          })}
        </tr>
      ))}
    </thead>
  )
}
