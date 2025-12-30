import { useState, useMemo, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  MessageSquare,
  Phone,
  Send,
  Loader2,
  X,
  Database,
  Tag,
  User,
} from 'lucide-react'
import type { EntityType, TimelineSource } from '@/types'
import { useTimeline, useAddTimelineNote, useLogTimelineCall } from '@/hooks'
import { TimelineEntry } from '../TimelineEntry'

interface TimelinePanelProps {
  entityType: EntityType
  entityId: string
  onRefresh: () => void
}

interface TimelineFilters {
  sources: TimelineSource[]
  activityTypes: string[]
  performers: string[]
  hideViews: boolean
  hasContentOnly: boolean
}

// Source options vary by entity type
const ALL_SOURCE_OPTIONS: { value: TimelineSource | 'all'; label: string; entityTypes?: EntityType[] }[] = [
  { value: 'all', label: 'All Sources' },
  { value: 'lead_activity', label: 'Lead Activity', entityTypes: ['lead'] },
  { value: 'onboarding_history', label: 'Onboarding', entityTypes: ['lead', 'company', 'candidate'] },
  { value: 'activity_log', label: 'Application Events', entityTypes: ['candidate', 'application'] },
  { value: 'candidate_activity', label: 'Candidate Activity', entityTypes: ['candidate'] },
  { value: 'booking', label: 'Meetings', entityTypes: ['lead', 'candidate'] },
  { value: 'stage_feedback', label: 'Feedback', entityTypes: ['application'] },
  { value: 'task', label: 'Completed Tasks', entityTypes: ['lead', 'company', 'candidate', 'application'] },
]

// Activity type labels for display
const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  note: 'Notes',
  call: 'Calls',
  meeting_scheduled: 'Meetings Scheduled',
  meeting_completed: 'Meetings Completed',
  meeting_cancelled: 'Meetings Cancelled',
  meeting_pending: 'Meetings Pending',
  stage_change: 'Stage Changes',
  application: 'Applications',
  shortlist: 'Shortlisted',
  offer: 'Offers',
  offer_accepted: 'Offers Accepted',
  rejection: 'Rejections',
  profile_update: 'Profile Updates',
  login: 'Logins',
  view: 'Views',
  feedback: 'Feedback',
  task_completed: 'Tasks Completed',
  invitation: 'Invitations',
  conversion: 'Conversions',
  assignment: 'Assignments',
  created: 'Created',
  document: 'Documents',
  email: 'Emails',
}

// Activity types to hide with "Hide views" filter (these are normalized by the backend)
const VIEW_ACTIVITY_TYPES = ['view', 'login']

function getSourceOptions(entityType: EntityType) {
  return ALL_SOURCE_OPTIONS.filter(
    (opt) => opt.value === 'all' || !opt.entityTypes || opt.entityTypes.includes(entityType)
  )
}

// Multiselect dropdown component - uses portal to escape overflow:hidden containers
function MultiSelectDropdown({
  icon: Icon,
  options,
  selected,
  onChange,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>
  options: { value: string; label: string }[]
  selected: string[]
  onChange: (selected: string[]) => void
  title: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })
  const isActive = selected.length > 0

  const toggleOption = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value))
    } else {
      onChange([...selected, value])
    }
  }

  const handleButtonClick = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
      })
    }
    setIsOpen(!isOpen)
  }

  // Close on escape
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  return (
    <div className="relative flex-shrink-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleButtonClick}
        className={`relative flex items-center justify-center w-7 h-7 rounded-md border transition-colors cursor-pointer ${
          isActive
            ? 'bg-gray-900 dark:bg-gray-100 border-gray-900 dark:border-gray-100'
            : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
        }`}
        title={title}
      >
        <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white dark:text-gray-900' : 'text-gray-400 dark:text-gray-500'}`} />
        {isActive && (
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-blue-500 text-white text-[9px] font-medium rounded-full flex items-center justify-center">
            {selected.length}
          </span>
        )}
      </button>

      {isOpen &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[400]" onClick={() => setIsOpen(false)} />
            <div
              className="fixed w-48 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg dark:shadow-gray-900/40 z-[401] py-1 max-h-64 overflow-y-auto"
              style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
            >
              {options.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(option.value)}
                    onChange={() => toggleOption(option.value)}
                    className="w-3.5 h-3.5 rounded border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:ring-gray-500"
                  />
                  <span className="text-[12px] text-gray-700 dark:text-gray-300">{option.label}</span>
                </label>
              ))}
              {selected.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    onChange([])
                    setIsOpen(false)
                  }}
                  className="w-full px-3 py-1.5 text-[11px] text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 text-left border-t border-gray-100 dark:border-gray-800 mt-1"
                >
                  Clear selection
                </button>
              )}
            </div>
          </>,
          document.body
        )}
    </div>
  )
}

export function TimelinePanel({ entityType, entityId, onRefresh }: TimelinePanelProps) {
  const [filters, setFilters] = useState<TimelineFilters>({
    sources: [],
    activityTypes: [],
    performers: [],
    hideViews: true,
    hasContentOnly: false,
  })
  const [showAddNote, setShowAddNote] = useState(false)
  const [showLogCall, setShowLogCall] = useState(false)
  const [noteContent, setNoteContent] = useState('')
  const [callNotes, setCallNotes] = useState('')
  const [callDuration, setCallDuration] = useState('')

  // Get source options based on entity type (exclude 'all' for multiselect)
  const sourceOptions = useMemo(
    () => getSourceOptions(entityType).filter((o) => o.value !== 'all'),
    [entityType]
  )

  // Build filter params for API
  const filterParams = filters.sources.length === 0 ? { limit: 50 } : { limit: 50, sources: filters.sources.join(',') }

  const { entries, count, isLoading, error, refetch, loadMore, hasMore } = useTimeline(
    entityType,
    entityId,
    filterParams
  )

  const { addNote, isAdding: isAddingNote } = useAddTimelineNote(entityType, entityId)
  const { logCall, isLogging: isLoggingCall } = useLogTimelineCall(entityType, entityId)

  // Extract unique activity types and performers from entries for filter dropdowns
  const { activityTypes, performers } = useMemo(() => {
    const typeSet = new Set<string>()
    const performerSet = new Set<string>()

    entries.forEach((entry) => {
      if (entry.activity_type) typeSet.add(entry.activity_type)
      if (entry.performed_by?.name) performerSet.add(entry.performed_by.name)
    })

    return {
      activityTypes: Array.from(typeSet).sort(),
      performers: Array.from(performerSet).sort(),
    }
  }, [entries])

  // Apply client-side filters
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      // Activity type filter (multiselect)
      if (filters.activityTypes.length > 0 && !filters.activityTypes.includes(entry.activity_type)) {
        return false
      }
      // Performer filter (multiselect)
      if (filters.performers.length > 0 && (!entry.performed_by?.name || !filters.performers.includes(entry.performed_by.name))) {
        return false
      }
      // Hide views filter
      if (filters.hideViews && VIEW_ACTIVITY_TYPES.includes(entry.activity_type)) {
        return false
      }
      // Has content only filter (entries with notes/content)
      if (filters.hasContentOnly && !entry.content) {
        return false
      }
      return true
    })
  }, [entries, filters])

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.sources.length > 0) count++
    if (filters.activityTypes.length > 0) count++
    if (filters.performers.length > 0) count++
    if (filters.hideViews) count++
    if (filters.hasContentOnly) count++
    return count
  }, [filters])

  const clearFilters = () => {
    setFilters({
      sources: [],
      activityTypes: [],
      performers: [],
      hideViews: false,
      hasContentOnly: false,
    })
  }

  const handleAddNote = async () => {
    if (!noteContent.trim()) return
    try {
      await addNote(noteContent.trim())
      setNoteContent('')
      setShowAddNote(false)
      refetch()
      onRefresh()
    } catch (error) {
      console.error('Failed to add note:', error)
    }
  }

  const handleLogCall = async () => {
    if (!callNotes.trim()) return
    try {
      const duration = callDuration ? parseInt(callDuration, 10) : undefined
      await logCall(callNotes.trim(), duration)
      setCallNotes('')
      setCallDuration('')
      setShowLogCall(false)
      refetch()
      onRefresh()
    } catch (error) {
      console.error('Failed to log call:', error)
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-gray-900 dark:text-gray-100">
            Timeline
            {count > 0 && <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">({count})</span>}
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setShowLogCall(false)
                setShowAddNote(!showAddNote)
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                showAddNote ? 'bg-blue-100 text-blue-700' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              Note
            </button>
            <button
              onClick={() => {
                setShowAddNote(false)
                setShowLogCall(!showLogCall)
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                showLogCall ? 'bg-green-100 text-green-700' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Phone className="w-4 h-4" />
              Call
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {/* Quick toggle chips */}
          <button
            onClick={() => setFilters({ ...filters, hideViews: !filters.hideViews })}
            className={`flex-shrink-0 px-2 py-1 text-[11px] rounded-md border transition-colors whitespace-nowrap ${
              filters.hideViews
                ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 border-gray-900 dark:border-gray-100'
                : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            Hide views
          </button>
          <button
            onClick={() => setFilters({ ...filters, hasContentOnly: !filters.hasContentOnly })}
            className={`flex-shrink-0 px-2 py-1 text-[11px] rounded-md border transition-colors whitespace-nowrap ${
              filters.hasContentOnly
                ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 border-gray-900 dark:border-gray-100'
                : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            With notes
          </button>

          {/* Divider */}
          <div className="flex-shrink-0 w-px h-5 bg-gray-200 dark:bg-gray-600" />

          {/* Source filter */}
          <MultiSelectDropdown
            icon={Database}
            title="Filter by source"
            options={sourceOptions.map((o) => ({ value: o.value as string, label: o.label }))}
            selected={filters.sources}
            onChange={(sources) => setFilters({ ...filters, sources: sources as TimelineSource[] })}
          />

          {/* Activity type filter */}
          {activityTypes.length > 1 && (
            <MultiSelectDropdown
              icon={Tag}
              title="Filter by type"
              options={activityTypes
                .filter((type) => !filters.hideViews || !VIEW_ACTIVITY_TYPES.includes(type))
                .map((type) => ({ value: type, label: ACTIVITY_TYPE_LABELS[type] || type }))}
              selected={filters.activityTypes}
              onChange={(types) => setFilters({ ...filters, activityTypes: types })}
            />
          )}

          {/* Performer filter */}
          {performers.length > 1 && (
            <MultiSelectDropdown
              icon={User}
              title="Filter by user"
              options={performers.map((p) => ({ value: p, label: p }))}
              selected={filters.performers}
              onChange={(p) => setFilters({ ...filters, performers: p })}
            />
          )}

          {/* Clear filters */}
          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="flex-shrink-0 p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              title="Clear all filters"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          {/* Spacer to prevent last item from being cut off */}
          <div className="flex-shrink-0 w-1" />
        </div>

        {/* Filter results count */}
        {activeFilterCount > 0 && (
          <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
            Showing {filteredEntries.length} of {entries.length} entries
          </p>
        )}
      </div>

      {/* Add Note Form */}
      {showAddNote && (
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-blue-50 dark:bg-blue-900/30">
          <textarea
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            placeholder="Add a note..."
            className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            autoFocus
          />
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={() => {
                setShowAddNote(false)
                setNoteContent('')
              }}
              className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleAddNote}
              disabled={isAddingNote || !noteContent.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAddingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Add Note
            </button>
          </div>
        </div>
      )}

      {/* Log Call Form */}
      {showLogCall && (
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-green-50 dark:bg-green-900/30">
          <div className="space-y-3">
            <textarea
              value={callNotes}
              onChange={(e) => setCallNotes(e.target.value)}
              placeholder="Call notes..."
              className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
              rows={3}
              autoFocus
            />
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 dark:text-gray-400">Duration:</label>
              <input
                type="number"
                value={callDuration}
                onChange={(e) => setCallDuration(e.target.value)}
                placeholder="minutes"
                className="w-24 px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                min="1"
              />
              <span className="text-sm text-gray-500 dark:text-gray-400">minutes</span>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button
              onClick={() => {
                setShowLogCall(false)
                setCallNotes('')
                setCallDuration('')
              }}
              className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleLogCall}
              disabled={isLoggingCall || !callNotes.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoggingCall ? <Loader2 className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />}
              Log Call
            </button>
          </div>
        </div>
      )}

      {/* Timeline entries */}
      <div className="flex-1 overflow-y-auto px-4">
        {isLoading && entries.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400 dark:text-gray-500" />
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-600">{error}</div>
        ) : filteredEntries.length === 0 ? (
          <div className="text-center py-8">
            {entries.length === 0 ? (
              <>
                <p className="text-gray-500 dark:text-gray-400 text-sm">No activity yet</p>
                <button
                  onClick={() => setShowAddNote(true)}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                >
                  Add the first note
                </button>
              </>
            ) : (
              <>
                <p className="text-gray-500 dark:text-gray-400 text-sm">No entries match your filters</p>
                <button onClick={clearFilters} className="mt-2 text-sm text-blue-600 hover:text-blue-700">
                  Clear filters
                </button>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredEntries.map((entry) => (
                <TimelineEntry key={`${entry.source}-${entry.id}`} entry={entry} />
              ))}
            </div>

            {/* Load more */}
            {hasMore && (
              <div className="py-4 text-center">
                <button
                  onClick={() => loadMore()}
                  disabled={isLoading}
                  className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
                >
                  {isLoading ? 'Loading...' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default TimelinePanel
