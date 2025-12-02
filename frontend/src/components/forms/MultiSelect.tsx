import { useState, useRef, useEffect } from 'react'

interface Option {
  id: string | number
  name: string
  category?: string
}

interface MultiSelectProps {
  label: string
  options: Option[]
  selected: Option[]
  onChange: (selected: Option[]) => void
  placeholder?: string
  maxItems?: number
  groupByCategory?: boolean
  isLoading?: boolean
  error?: string | null
}

export default function MultiSelect({
  label,
  options,
  selected,
  onChange,
  placeholder = 'Search...',
  maxItems,
  groupByCategory = false,
  isLoading = false,
  error,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredOptions = options.filter(
    (option) =>
      option.name.toLowerCase().includes(search.toLowerCase()) &&
      !selected.some((s) => s.id === option.id)
  )

  // Group options by category if enabled
  const groupedOptions = groupByCategory
    ? filteredOptions.reduce((acc, option) => {
        const category = option.category || 'Other'
        if (!acc[category]) acc[category] = []
        acc[category].push(option)
        return acc
      }, {} as Record<string, Option[]>)
    : null

  const handleSelect = (option: Option) => {
    if (maxItems && selected.length >= maxItems) return
    onChange([...selected, option])
    setSearch('')
    inputRef.current?.focus()
  }

  const handleRemove = (option: Option) => {
    onChange(selected.filter((s) => s.id !== option.id))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !search && selected.length > 0) {
      handleRemove(selected[selected.length - 1])
    }
    if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
        {label}
        {maxItems && (
          <span className="text-gray-400 font-normal ml-1">
            ({selected.length}/{maxItems})
          </span>
        )}
      </label>

      {/* Selected items and input */}
      <div
        className={`min-h-[42px] border rounded-md px-2 py-1.5 flex flex-wrap gap-1.5 cursor-text bg-white ${
          isOpen ? 'ring-2 ring-gray-900 border-transparent' : 'border-gray-200 hover:border-gray-300'
        }`}
        onClick={() => {
          setIsOpen(true)
          inputRef.current?.focus()
        }}
      >
        {selected.map((option) => (
          <span
            key={option.id}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100 text-[13px] text-gray-700"
          >
            {option.name}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleRemove(option)
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={selected.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[100px] outline-none text-[14px] bg-transparent"
          disabled={maxItems ? selected.length >= maxItems : false}
        />
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {isLoading ? (
            <div className="px-3 py-2 text-[13px] text-gray-500">Loading...</div>
          ) : error ? (
            <div className="px-3 py-2 text-[13px] text-red-500">{error}</div>
          ) : filteredOptions.length === 0 ? (
            <div className="px-3 py-2 text-[13px] text-gray-500">
              {search ? 'No matches found' : 'No options available'}
            </div>
          ) : groupedOptions ? (
            Object.entries(groupedOptions).map(([category, categoryOptions]) => (
              <div key={category}>
                <div className="px-3 py-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wide bg-gray-50 sticky top-0">
                  {category.replace('_', ' ')}
                </div>
                {categoryOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleSelect(option)}
                    className="w-full text-left px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    {option.name}
                  </button>
                ))}
              </div>
            ))
          ) : (
            filteredOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => handleSelect(option)}
                className="w-full text-left px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {option.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
