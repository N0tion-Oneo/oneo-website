import { useState, useEffect, useRef } from 'react'
import { CandidateFilters, defaultFilters } from './CandidateFilterPanel'
import { Bookmark, ChevronDown, Trash2, Plus, Check } from 'lucide-react'

const STORAGE_KEY = 'candidateFilterPresets'

interface SavedFilter {
  id: string
  name: string
  filters: CandidateFilters
  createdAt: string
}

interface SavedFiltersDropdownProps {
  currentFilters: CandidateFilters
  onLoadFilter: (filters: CandidateFilters) => void
}

export default function SavedFiltersDropdown({
  currentFilters,
  onLoadFilter,
}: SavedFiltersDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([])
  const [showSaveInput, setShowSaveInput] = useState(false)
  const [newFilterName, setNewFilterName] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Load saved filters from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        setSavedFilters(JSON.parse(stored))
      } catch (e) {
        console.error('Failed to parse saved filters:', e)
      }
    }
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setShowSaveInput(false)
        setNewFilterName('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const hasActiveFilters = () => {
    return (
      currentFilters.seniority ||
      currentFilters.work_preference ||
      currentFilters.visibility ||
      currentFilters.industries.length > 0 ||
      currentFilters.min_completeness !== undefined ||
      currentFilters.min_experience !== undefined ||
      currentFilters.max_experience !== undefined ||
      currentFilters.min_salary !== undefined ||
      currentFilters.max_salary !== undefined ||
      currentFilters.salary_currency ||
      currentFilters.notice_period_min !== undefined ||
      currentFilters.notice_period_max !== undefined ||
      currentFilters.created_after ||
      currentFilters.created_before ||
      currentFilters.willing_to_relocate !== undefined ||
      currentFilters.has_resume !== undefined
    )
  }

  const saveCurrentFilters = () => {
    if (!newFilterName.trim()) return

    const newFilter: SavedFilter = {
      id: Date.now().toString(),
      name: newFilterName.trim(),
      filters: { ...currentFilters },
      createdAt: new Date().toISOString(),
    }

    const updated = [...savedFilters, newFilter]
    setSavedFilters(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    setNewFilterName('')
    setShowSaveInput(false)
  }

  const deleteFilter = (id: string) => {
    const updated = savedFilters.filter(f => f.id !== id)
    setSavedFilters(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  const loadFilter = (filter: SavedFilter) => {
    onLoadFilter(filter.filters)
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
      >
        <Bookmark className="w-3.5 h-3.5 text-gray-500" />
        <span className="text-gray-600">Saved</span>
        {savedFilters.length > 0 && (
          <span className="bg-gray-100 text-gray-600 text-[10px] px-1.5 py-0.5 rounded-full">
            {savedFilters.length}
          </span>
        )}
        <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-2 border-b border-gray-100">
            <p className="text-[11px] text-gray-500 uppercase tracking-wider font-medium">
              Saved Filters
            </p>
          </div>

          {/* Saved filter list */}
          <div className="max-h-48 overflow-y-auto">
            {savedFilters.length === 0 ? (
              <p className="text-[12px] text-gray-400 p-3 text-center">
                No saved filters yet
              </p>
            ) : (
              savedFilters.map(filter => (
                <div
                  key={filter.id}
                  className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 group"
                >
                  <button
                    onClick={() => loadFilter(filter)}
                    className="flex-1 text-left text-[13px] text-gray-700 truncate"
                  >
                    {filter.name}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteFilter(filter.id)
                    }}
                    className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Save current filters */}
          <div className="border-t border-gray-100 p-2">
            {showSaveInput ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newFilterName}
                  onChange={(e) => setNewFilterName(e.target.value)}
                  placeholder="Filter name..."
                  className="flex-1 px-2 py-1 text-[12px] border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-300"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveCurrentFilters()
                    if (e.key === 'Escape') {
                      setShowSaveInput(false)
                      setNewFilterName('')
                    }
                  }}
                />
                <button
                  onClick={saveCurrentFilters}
                  disabled={!newFilterName.trim()}
                  className="p-1.5 bg-gray-900 text-white rounded hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowSaveInput(true)}
                disabled={!hasActiveFilters()}
                className="flex items-center gap-1.5 w-full px-2 py-1.5 text-[12px] text-gray-600 hover:bg-gray-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-3.5 h-3.5" />
                Save current filters
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
