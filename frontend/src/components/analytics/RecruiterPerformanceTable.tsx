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
import type { RecruiterMetrics } from '@/types'

interface RecruiterPerformanceTableProps {
  recruiters: RecruiterMetrics[]
  totals: {
    actions_count: number
    applications_viewed: number
    shortlisted: number
    interviews_scheduled: number
    offers_made: number
    rejections: number
    conversion_rate: number
  }
  loading?: boolean
}

export function RecruiterPerformanceTable({
  recruiters,
  totals,
  loading = false,
}: RecruiterPerformanceTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'actions_count', desc: true },
  ])

  const columns = useMemo<ColumnDef<RecruiterMetrics>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Recruiter',
        cell: ({ row }) => (
          <div>
            <p className="text-[13px] font-medium text-gray-900 dark:text-gray-100">
              {row.original.name}
            </p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">{row.original.email}</p>
          </div>
        ),
      },
      {
        accessorKey: 'actions_count',
        header: 'Actions',
        cell: ({ getValue }) => (
          <span className="text-[13px] text-gray-900 dark:text-gray-100">{getValue<number>()}</span>
        ),
      },
      {
        accessorKey: 'applications_viewed',
        header: 'Viewed',
        cell: ({ getValue }) => (
          <span className="text-[13px] text-gray-900 dark:text-gray-100">{getValue<number>()}</span>
        ),
      },
      {
        accessorKey: 'shortlisted',
        header: 'Shortlisted',
        cell: ({ getValue }) => (
          <span className="text-[13px] text-gray-900 dark:text-gray-100">{getValue<number>()}</span>
        ),
      },
      {
        accessorKey: 'interviews_scheduled',
        header: 'Interviews',
        cell: ({ getValue }) => (
          <span className="text-[13px] text-gray-900 dark:text-gray-100">{getValue<number>()}</span>
        ),
      },
      {
        accessorKey: 'offers_made',
        header: 'Offers',
        cell: ({ getValue }) => (
          <span className="text-[13px] text-gray-900 dark:text-gray-100">{getValue<number>()}</span>
        ),
      },
      {
        accessorKey: 'conversion_rate',
        header: 'Conv. Rate',
        cell: ({ getValue }) => (
          <span className="text-[13px] font-medium text-gray-900 dark:text-gray-100">
            {getValue<number>().toFixed(1)}%
          </span>
        ),
      },
    ],
    []
  )

  const table = useReactTable({
    data: recruiters,
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
          Recruiter Performance
        </h3>
      </div>

      {recruiters.length === 0 ? (
        <div className="p-8 text-center text-[13px] text-gray-500 dark:text-gray-400">
          No recruiter activity in this period
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
                    {totals.actions_count}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-[13px] font-medium text-gray-900 dark:text-gray-100">
                    {totals.applications_viewed}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-[13px] font-medium text-gray-900 dark:text-gray-100">
                    {totals.shortlisted}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-[13px] font-medium text-gray-900 dark:text-gray-100">
                    {totals.interviews_scheduled}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-[13px] font-medium text-gray-900 dark:text-gray-100">
                    {totals.offers_made}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-[13px] font-semibold text-gray-900 dark:text-gray-100">
                    {totals.conversion_rate.toFixed(1)}%
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}

export default RecruiterPerformanceTable
