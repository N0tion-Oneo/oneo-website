import { useState, useEffect, useRef } from 'react'
import { Table } from '@tanstack/react-table'
import { Columns, ChevronDown, Eye, EyeOff, RotateCcw } from 'lucide-react'

const STORAGE_KEY = 'candidateColumnVisibility'

interface ColumnVisibilityMenuProps<T> {
  table: Table<T>
}

export default function ColumnVisibilityMenu<T>({ table }: ColumnVisibilityMenuProps<T>) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Load column visibility from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const visibility = JSON.parse(stored)
        table.setColumnVisibility(visibility)
      } catch (e) {
        console.error('Failed to parse column visibility:', e)
      }
    }
  }, [])

  // Save column visibility to localStorage when it changes
  const handleVisibilityChange = (columnId: string, isVisible: boolean) => {
    const column = table.getColumn(columnId)
    if (column) {
      column.toggleVisibility(isVisible)
      // Save to localStorage
      setTimeout(() => {
        const visibility = table.getState().columnVisibility
        localStorage.setItem(STORAGE_KEY, JSON.stringify(visibility))
      }, 0)
    }
  }

  const resetVisibility = () => {
    table.resetColumnVisibility()
    localStorage.removeItem(STORAGE_KEY)
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const allColumns = table.getAllLeafColumns()
  const visibleCount = allColumns.filter(col => col.getIsVisible()).length

  // Group columns by category for better organization
  const columnGroups = [
    {
      name: 'Identity',
      columns: ['full_name', 'phone'],
    },
    {
      name: 'Professional',
      columns: ['professional_title', 'headline', 'seniority', 'years_of_experience'],
    },
    {
      name: 'Location',
      columns: ['location', 'work_preference', 'willing_to_relocate', 'preferred_locations'],
    },
    {
      name: 'Compensation',
      columns: ['salary', 'notice_period_days'],
    },
    {
      name: 'Assets',
      columns: ['has_resume', 'skills', 'industries'],
    },
    {
      name: 'Status',
      columns: ['profile_completeness', 'visibility', 'created_at', 'updated_at'],
    },
    {
      name: 'Actions',
      columns: ['actions'],
    },
  ]

  const getColumnLabel = (columnId: string): string => {
    const labels: Record<string, string> = {
      full_name: 'Candidate',
      phone: 'Phone',
      professional_title: 'Title',
      headline: 'Headline',
      seniority: 'Seniority',
      years_of_experience: 'Experience',
      location: 'Location',
      work_preference: 'Work Pref',
      willing_to_relocate: 'Relocate',
      preferred_locations: 'Preferred Locations',
      salary: 'Salary Exp.',
      notice_period_days: 'Notice',
      has_resume: 'Resume',
      skills: 'Skills',
      industries: 'Industries',
      profile_completeness: 'Profile',
      visibility: 'Status',
      created_at: 'Created',
      updated_at: 'Updated',
      actions: 'Actions',
    }
    return labels[columnId] || columnId
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
      >
        <Columns className="w-3.5 h-3.5 text-gray-500" />
        <span className="text-gray-600">Columns</span>
        <span className="bg-gray-100 text-gray-600 text-[10px] px-1.5 py-0.5 rounded-full">
          {visibleCount}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="flex items-center justify-between p-2 border-b border-gray-100">
            <p className="text-[11px] text-gray-500 uppercase tracking-wider font-medium">
              Visible Columns
            </p>
            <button
              onClick={resetVisibility}
              className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto p-2 space-y-3">
            {columnGroups.map(group => {
              const groupColumns = group.columns
                .map(id => table.getColumn(id))
                .filter(Boolean)

              if (groupColumns.length === 0) return null

              return (
                <div key={group.name}>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5 px-1">
                    {group.name}
                  </p>
                  <div className="space-y-0.5">
                    {groupColumns.map(column => {
                      if (!column) return null
                      const isVisible = column.getIsVisible()
                      return (
                        <button
                          key={column.id}
                          onClick={() => handleVisibilityChange(column.id, !isVisible)}
                          className={`flex items-center justify-between w-full px-2 py-1.5 text-[12px] rounded hover:bg-gray-50 transition-colors ${
                            isVisible ? 'text-gray-700' : 'text-gray-400'
                          }`}
                        >
                          <span>{getColumnLabel(column.id)}</span>
                          {isVisible ? (
                            <Eye className="w-3.5 h-3.5 text-green-500" />
                          ) : (
                            <EyeOff className="w-3.5 h-3.5 text-gray-300" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="border-t border-gray-100 p-2">
            <div className="flex items-center justify-between text-[11px] text-gray-400">
              <span>{visibleCount} of {allColumns.length} visible</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
