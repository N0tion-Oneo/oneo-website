import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useStaffUsers } from '@/hooks'
import type { StaffUser, AssignedUser } from '@/types'

interface AssignedToSelectProps {
  label?: string
  selected: AssignedUser[]
  onChange: (selected: AssignedUser[]) => void
  placeholder?: string
  maxItems?: number
  compact?: boolean
  disabled?: boolean
}

export default function AssignedToSelect({
  label = 'Assigned To',
  selected,
  onChange,
  placeholder = 'Search staff...',
  maxItems,
  compact = false,
  disabled = false,
}: AssignedToSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { staffUsers, isLoading, error } = useStaffUsers()

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      const clickedInContainer = containerRef.current?.contains(target)
      const clickedInDropdown = dropdownRef.current?.contains(target)
      if (!clickedInContainer && !clickedInDropdown) {
        setIsOpen(false)
        setDropdownPosition(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredOptions = staffUsers.filter(
    (user) =>
      (user.full_name.toLowerCase().includes(search.toLowerCase()) ||
        user.email.toLowerCase().includes(search.toLowerCase())) &&
      !selected.some((s) => s.id === user.id)
  )

  const handleSelect = (user: StaffUser) => {
    if (maxItems && selected.length >= maxItems) return
    const assignedUser: AssignedUser = {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      full_name: user.full_name,
    }
    onChange([...selected, assignedUser])
    setSearch('')
    inputRef.current?.focus()
  }

  const handleRemove = (user: AssignedUser) => {
    onChange(selected.filter((s) => s.id !== user.id))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !search && selected.length > 0) {
      const lastUser = selected[selected.length - 1]
      if (lastUser) {
        handleRemove(lastUser)
      }
    }
    if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  const getInitials = (user: AssignedUser | StaffUser) => {
    return `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase()
  }

  const handleOpenDropdown = () => {
    if (disabled) return
    if (isOpen) {
      setIsOpen(false)
      setDropdownPosition(null)
    } else {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect()
        setDropdownPosition({ top: rect.bottom + 4, left: rect.left })
      }
      setIsOpen(true)
    }
  }

  if (compact) {
    return (
      <div ref={containerRef} className="relative">
        {/* Compact mode - just show avatars that trigger dropdown */}
        <div
          ref={triggerRef}
          className={`flex items-center gap-1 cursor-pointer min-w-[100px] ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
          onClick={handleOpenDropdown}
        >
          {selected.length === 0 ? (
            <span className="text-[11px] text-gray-400">Unassigned</span>
          ) : (
            <div className="flex -space-x-2">
              {selected.slice(0, 3).map((user, idx) => (
                <div
                  key={user.id}
                  className="w-6 h-6 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center flex-shrink-0"
                  style={{ zIndex: 3 - idx }}
                  title={user.full_name}
                >
                  <span className="text-[9px] font-medium text-gray-600">
                    {getInitials(user)}
                  </span>
                </div>
              ))}
              {selected.length > 3 && (
                <div className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center flex-shrink-0">
                  <span className="text-[9px] font-medium text-gray-600">+{selected.length - 3}</span>
                </div>
              )}
            </div>
          )}
          <svg
            className={`w-3.5 h-3.5 text-gray-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* Dropdown - rendered via portal */}
        {isOpen && dropdownPosition && createPortal(
          <div
            ref={dropdownRef}
            className="fixed bg-white border border-gray-200 rounded-md shadow-lg w-64 max-h-60 overflow-y-auto z-[9999]"
            style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
          >
            {/* Search input */}
            <div className="p-2 border-b border-gray-100 sticky top-0 bg-white">
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="w-full px-2 py-1.5 text-[13px] border border-gray-200 rounded outline-none focus:ring-1 focus:ring-gray-900 focus:border-transparent"
                autoFocus
              />
            </div>

            {/* Selected items with remove option */}
            {selected.length > 0 && (
              <div className="px-2 py-1.5 border-b border-gray-100">
                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Assigned</div>
                {selected.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between py-1"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-[8px] font-medium text-gray-600">{getInitials(user)}</span>
                      </div>
                      <span className="text-[12px] text-gray-700 truncate">{user.full_name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemove(user)
                      }}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Available options */}
            {isLoading ? (
              <div className="px-3 py-2 text-[13px] text-gray-500">Loading...</div>
            ) : error ? (
              <div className="px-3 py-2 text-[13px] text-red-500">{error}</div>
            ) : filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-[13px] text-gray-500">
                {search ? 'No matches found' : 'No more staff available'}
              </div>
            ) : (
              <div className="py-1">
                <div className="px-3 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Available</div>
                {filteredOptions.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => handleSelect(user)}
                    className="w-full text-left px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                  >
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.full_name}
                        className="w-6 h-6 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-[10px] font-medium text-gray-600">{getInitials(user)}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{user.full_name}</div>
                      <div className="text-[11px] text-gray-400 truncate">{user.email}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>,
          document.body
        )}
      </div>
    )
  }

  // Full mode with label and styled input
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
          disabled ? 'bg-gray-50 opacity-60 cursor-not-allowed' : ''
        } ${
          isOpen ? 'ring-2 ring-gray-900 border-transparent' : 'border-gray-200 hover:border-gray-300'
        }`}
        onClick={() => {
          if (!disabled) {
            setIsOpen(true)
            inputRef.current?.focus()
          }
        }}
      >
        {selected.map((user) => (
          <span
            key={user.id}
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-gray-100 text-[13px] text-gray-700"
          >
            <div className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
              <span className="text-[8px] font-medium text-gray-600">{getInitials(user)}</span>
            </div>
            {user.full_name}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleRemove(user)
              }}
              className="text-gray-400 hover:text-gray-600"
              disabled={disabled}
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
          onFocus={() => !disabled && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={selected.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[100px] outline-none text-[14px] bg-transparent"
          disabled={disabled || (maxItems ? selected.length >= maxItems : false)}
        />
      </div>

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {isLoading ? (
            <div className="px-3 py-2 text-[13px] text-gray-500">Loading...</div>
          ) : error ? (
            <div className="px-3 py-2 text-[13px] text-red-500">{error}</div>
          ) : filteredOptions.length === 0 ? (
            <div className="px-3 py-2 text-[13px] text-gray-500">
              {search ? 'No matches found' : 'No more staff available'}
            </div>
          ) : (
            filteredOptions.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => handleSelect(user)}
                className="w-full text-left px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.full_name}
                    className="w-6 h-6 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-medium text-gray-600">{getInitials(user)}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{user.full_name}</div>
                  <div className="text-[11px] text-gray-400 truncate">{user.email}</div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
