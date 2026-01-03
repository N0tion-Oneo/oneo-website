import { useState, useMemo } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type SortingState,
  type ColumnDef,
} from '@tanstack/react-table'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'

interface TaskAssignee {
  assigned_to: number
  assignee_name: string
  total: number
  completed: number
  pending: number
  in_progress: number
  completion_rate: number
}

interface TasksByAssigneeTableProps {
  assignees: TaskAssignee[]
  loading?: boolean
}

export function TasksByAssigneeTable({
  assignees,
  loading = false,
}: TasksByAssigneeTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'total', desc: true },
  ])

  const totals = useMemo(() => {
    return assignees.reduce(
      (acc, a) => ({
        total: acc.total + a.total,
        completed: acc.completed + a.completed,
        pending: acc.pending + a.pending,
        in_progress: acc.in_progress + a.in_progress,
      }),
      { total: 0, completed: 0, pending: 0, in_progress: 0 }
    )
  }, [assignees])

  const overallCompletionRate = totals.total > 0
    ? (totals.completed / totals.total * 100)
    : 0

  const columns = useMemo<ColumnDef<TaskAssignee>[]>(
    () => [
      {
        accessorKey: 'assignee_name',
        header: 'Assignee',
        cell: ({ getValue }) => (
          <span className="text-[13px] font-medium text-gray-900 dark:text-gray-100">
            {getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: 'total',
        header: 'Total',
        cell: ({ getValue }) => (
          <span className="text-[13px] text-gray-900 dark:text-gray-100">{getValue<number>()}</span>
        ),
      },
      {
        accessorKey: 'pending',
        header: 'Pending',
        cell: ({ getValue }) => (
          <span className="text-[13px] text-gray-500 dark:text-gray-400">{getValue<number>()}</span>
        ),
      },
      {
        accessorKey: 'in_progress',
        header: 'In Progress',
        cell: ({ getValue }) => (
          <span className="text-[13px] text-blue-600 dark:text-blue-400">{getValue<number>()}</span>
        ),
      },
      {
        accessorKey: 'completed',
        header: 'Completed',
        cell: ({ getValue }) => (
          <span className="text-[13px] text-green-600 dark:text-green-400">{getValue<number>()}</span>
        ),
      },
      {
        accessorKey: 'completion_rate',
        header: 'Completion Rate',
        cell: ({ getValue }) => {
          const rate = getValue<number>()
          return (
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden max-w-[60px]">
                <div
                  className="h-full bg-green-500 rounded-full"
                  style={{ width: `${Math.min(rate, 100)}%` }}
                />
              </div>
              <span className="text-[13px] font-medium text-gray-900 dark:text-gray-100 w-12 text-right">
                {rate.toFixed(1)}%
              </span>
            </div>
          )
        },
      },
    ],
    []
  )

  const table = useReactTable({
    data: assignees,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-6 animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <div className="p-4 border-b border-gray-100 dark:border-gray-700">
        <h3 className="text-[14px] font-medium text-gray-900 dark:text-gray-100">
          Tasks by Assignee
        </h3>
      </div>

      {assignees.length === 0 ? (
        <div className="p-8 text-center text-[13px] text-gray-500 dark:text-gray-400">
          No task data in this period
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b border-gray-100 dark:border-gray-700">
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-left text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide"
                    >
                      {header.isPlaceholder ? null : (
                        <button
                          className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {header.column.getIsSorted() === 'asc' ? (
                            <ArrowUp className="w-3 h-3" />
                          ) : header.column.getIsSorted() === 'desc' ? (
                            <ArrowDown className="w-3 h-3" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-50" />
                          )}
                        </button>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                <td className="px-4 py-3">
                  <span className="text-[13px] font-medium text-gray-900 dark:text-gray-100">
                    Total
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-[13px] font-medium text-gray-900 dark:text-gray-100">
                    {totals.total}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-[13px] font-medium text-gray-500 dark:text-gray-400">
                    {totals.pending}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-[13px] font-medium text-blue-600 dark:text-blue-400">
                    {totals.in_progress}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-[13px] font-medium text-green-600 dark:text-green-400">
                    {totals.completed}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden max-w-[60px]">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: `${Math.min(overallCompletionRate, 100)}%` }}
                      />
                    </div>
                    <span className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 w-12 text-right">
                      {overallCompletionRate.toFixed(1)}%
                    </span>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}

export default TasksByAssigneeTable
