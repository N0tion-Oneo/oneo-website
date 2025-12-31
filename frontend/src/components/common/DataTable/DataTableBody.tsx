import { flexRender } from '@tanstack/react-table'
import type { DataTableBodyProps } from './types'

export function DataTableBody<TData>({
  table,
  stickyColumns,
  leftPositions,
  onRowClick,
}: DataTableBodyProps<TData>) {
  const isPinnedLeft = (columnId: string) => (stickyColumns.left || []).includes(columnId)
  const isPinnedRight = (columnId: string) => (stickyColumns.right || []).includes(columnId)

  return (
    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
      {table.getRowModel().rows.map(row => (
        <tr
          key={row.id}
          className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${onRowClick ? 'cursor-pointer' : ''}`}
          onClick={() => onRowClick?.(row.original)}
        >
          {row.getVisibleCells().map(cell => {
            const colId = cell.column.id
            const pinnedLeft = isPinnedLeft(colId)
            const pinnedRight = isPinnedRight(colId)

            return (
              <td
                key={cell.id}
                className={`px-3 py-2.5 whitespace-nowrap ${
                  pinnedLeft ? 'sticky z-10 bg-white dark:bg-gray-800' : ''
                } ${
                  pinnedRight ? 'sticky right-0 z-[100] bg-white dark:bg-gray-800' : ''
                }`}
                style={{
                  width: cell.column.getSize(),
                  left: pinnedLeft ? leftPositions[colId] : undefined,
                }}
              >
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            )
          })}
        </tr>
      ))}
    </tbody>
  )
}
