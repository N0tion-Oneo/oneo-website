import { useState, useMemo } from 'react'
import {
  MessageSquare,
  User,
  ChevronDown,
  ChevronUp,
  Send,
  UserCheck,
  ArrowRight,
  Gift,
  CheckCircle,
  XCircle,
  Eye,
  FileText,
  Filter,
  X,
} from 'lucide-react'
import { useActivityLog, useAddActivityNote } from '@/hooks'
import { ActivityType } from '@/types'
import type { ActivityLogEntry, ActivityNote } from '@/types'

interface ActivityTimelineProps {
  applicationId: string
}

interface ActivityFilters {
  types: ActivityType[]
  hideViews: boolean
  hasNotesOnly: boolean
  performer: string | null
  dateFrom: string | null
  dateTo: string | null
}

const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  [ActivityType.APPLIED]: 'Applied',
  [ActivityType.SHORTLISTED]: 'Shortlisted',
  [ActivityType.STAGE_CHANGED]: 'Stage Changed',
  [ActivityType.OFFER_MADE]: 'Offer Made',
  [ActivityType.OFFER_UPDATED]: 'Offer Updated',
  [ActivityType.OFFER_ACCEPTED]: 'Offer Accepted',
  [ActivityType.REJECTED]: 'Rejected',
  [ActivityType.WITHDRAWN]: 'Withdrawn',
  [ActivityType.APPLICATION_VIEWED]: 'Viewed',
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const getActivityIcon = (type: ActivityType) => {
  switch (type) {
    case ActivityType.APPLIED:
      return <FileText className="w-4 h-4 text-gray-600" />
    case ActivityType.SHORTLISTED:
      return <UserCheck className="w-4 h-4 text-blue-600" />
    case ActivityType.STAGE_CHANGED:
      return <ArrowRight className="w-4 h-4 text-yellow-600" />
    case ActivityType.OFFER_MADE:
    case ActivityType.OFFER_UPDATED:
      return <Gift className="w-4 h-4 text-purple-600" />
    case ActivityType.OFFER_ACCEPTED:
      return <CheckCircle className="w-4 h-4 text-green-600" />
    case ActivityType.REJECTED:
      return <XCircle className="w-4 h-4 text-red-600" />
    case ActivityType.APPLICATION_VIEWED:
      return <Eye className="w-4 h-4 text-gray-400" />
    case ActivityType.WITHDRAWN:
      return <XCircle className="w-4 h-4 text-orange-600" />
    default:
      return <FileText className="w-4 h-4 text-gray-600" />
  }
}

const getActivityColor = (type: ActivityType) => {
  switch (type) {
    case ActivityType.APPLIED:
      return 'bg-gray-100'
    case ActivityType.SHORTLISTED:
      return 'bg-blue-100'
    case ActivityType.STAGE_CHANGED:
      return 'bg-yellow-100'
    case ActivityType.OFFER_MADE:
    case ActivityType.OFFER_UPDATED:
      return 'bg-purple-100'
    case ActivityType.OFFER_ACCEPTED:
      return 'bg-green-100'
    case ActivityType.REJECTED:
      return 'bg-red-100'
    case ActivityType.APPLICATION_VIEWED:
      return 'bg-gray-50'
    case ActivityType.WITHDRAWN:
      return 'bg-orange-100'
    default:
      return 'bg-gray-100'
  }
}

const getActivityLabel = (activity: ActivityLogEntry) => {
  const performer = activity.performed_by_name || 'System'

  switch (activity.activity_type) {
    case ActivityType.APPLIED:
      return `${performer} submitted application`
    case ActivityType.SHORTLISTED:
      return `${performer} shortlisted this candidate`
    case ActivityType.STAGE_CHANGED:
      if (activity.stage_name) {
        return `${performer} moved to ${activity.stage_name}`
      }
      return `${performer} changed stage`
    case ActivityType.OFFER_MADE:
      return `${performer} made an offer`
    case ActivityType.OFFER_UPDATED:
      return `${performer} updated the offer`
    case ActivityType.OFFER_ACCEPTED:
      return `${performer} accepted the offer`
    case ActivityType.REJECTED:
      return `${performer} rejected this application`
    case ActivityType.APPLICATION_VIEWED:
      return `${performer} viewed this application`
    case ActivityType.WITHDRAWN:
      return `${performer} withdrew application`
    default:
      return activity.activity_type
  }
}

function NoteItem({ note }: { note: ActivityNote }) {
  return (
    <div className="text-[13px]">
      <div className="flex items-center gap-2">
        <span className="font-medium text-gray-700">
          {note.author_name || 'Unknown'}
        </span>
        <span className="text-gray-400 text-[11px]">
          {formatDate(note.created_at)}
        </span>
      </div>
      <p className="text-gray-600 mt-0.5 whitespace-pre-wrap">{note.content}</p>
    </div>
  )
}

function ActivityEntry({
  activity,
  applicationId,
  onNoteAdded,
  showViewsNormally,
}: {
  activity: ActivityLogEntry
  applicationId: string
  onNoteAdded: () => void
  showViewsNormally?: boolean
}) {
  const [isExpanded, setIsExpanded] = useState(activity.notes_count > 0)
  const [isAddingNote, setIsAddingNote] = useState(false)
  const [newNote, setNewNote] = useState('')
  const { addNote, isLoading } = useAddActivityNote(applicationId)

  const handleAddNote = async () => {
    if (!newNote.trim()) return
    try {
      await addNote(activity.id, newNote)
      setNewNote('')
      setIsAddingNote(false)
      onNoteAdded()
    } catch (err) {
      console.error('Failed to add note:', err)
    }
  }

  // Don't show view events prominently (they clutter the timeline)
  const isViewEvent = activity.activity_type === ActivityType.APPLICATION_VIEWED
  if (isViewEvent && activity.notes_count === 0 && !showViewsNormally) {
    return (
      <div className="relative flex gap-3 opacity-50">
        <div
          className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center ${getActivityColor(activity.activity_type)}`}
        >
          {getActivityIcon(activity.activity_type)}
        </div>
        <div className="flex-1 pb-4">
          <div className="flex items-center justify-between">
            <p className="text-[13px] text-gray-500">
              {getActivityLabel(activity)}
            </p>
            <span className="text-[11px] text-gray-400">
              {formatDate(activity.created_at)}
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex gap-3">
      {/* Timeline dot */}
      <div
        className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center ${getActivityColor(activity.activity_type)}`}
      >
        {getActivityIcon(activity.activity_type)}
      </div>

      {/* Content */}
      <div className="flex-1 pb-5">
        <div className="flex items-center justify-between">
          <p className="text-[14px] font-medium text-gray-900">
            {getActivityLabel(activity)}
          </p>
          <span className="text-[11px] text-gray-500">
            {formatDate(activity.created_at)}
          </span>
        </div>

        {/* Metadata display (offer details, rejection reason, etc.) */}
        {activity.metadata && Object.keys(activity.metadata).length > 0 && (
          <div className="mt-2 p-2.5 bg-gray-50 rounded-md text-[12px] text-gray-600">
            {activity.metadata.rejection_reason && (
              <p>
                <span className="font-medium">Reason:</span>{' '}
                {String(activity.metadata.rejection_reason).replace(/_/g, ' ')}
              </p>
            )}
            {activity.metadata.rejection_feedback && (
              <p className="mt-1">
                <span className="font-medium">Feedback:</span>{' '}
                {String(activity.metadata.rejection_feedback)}
              </p>
            )}
            {activity.metadata.offer_details &&
              typeof activity.metadata.offer_details === 'object' && (
                <div>
                  {(activity.metadata.offer_details as Record<string, unknown>)
                    .salary && (
                    <p>
                      <span className="font-medium">Salary:</span>{' '}
                      {(
                        activity.metadata.offer_details as Record<
                          string,
                          unknown
                        >
                      ).currency || 'ZAR'}{' '}
                      {Number(
                        (
                          activity.metadata.offer_details as Record<
                            string,
                            unknown
                          >
                        ).salary
                      ).toLocaleString()}
                    </p>
                  )}
                </div>
              )}
          </div>
        )}

        {/* Notes section */}
        {activity.notes_count > 0 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-2 flex items-center gap-1 text-[12px] text-gray-600 hover:text-gray-900"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            {activity.notes_count} note{activity.notes_count > 1 ? 's' : ''}
            {isExpanded ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>
        )}

        {isExpanded && activity.notes.length > 0 && (
          <div className="mt-2 space-y-2 pl-3 border-l-2 border-gray-200">
            {activity.notes.map((note) => (
              <NoteItem key={note.id} note={note} />
            ))}
          </div>
        )}

        {/* Add note button/form */}
        {isAddingNote ? (
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add a note..."
              className="flex-1 px-3 py-1.5 text-[13px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300"
              onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
              autoFocus
            />
            <button
              onClick={handleAddNote}
              disabled={isLoading || !newNote.trim()}
              className="px-3 py-1.5 bg-gray-900 text-white rounded-md disabled:opacity-50 hover:bg-gray-800"
            >
              <Send className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setIsAddingNote(false)
                setNewNote('')
              }}
              className="px-3 py-1.5 text-gray-500 border border-gray-200 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsAddingNote(true)}
            className="mt-2 text-[12px] text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            <MessageSquare className="w-3 h-3" />
            Add note
          </button>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Filter Bar Component
// ============================================================================

function ActivityFilterBar({
  filters,
  setFilters,
  performers,
  activityTypes,
}: {
  filters: ActivityFilters
  setFilters: (filters: ActivityFilters) => void
  performers: string[]
  activityTypes: ActivityType[]
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.types.length > 0 && filters.types.length < activityTypes.length) count++
    if (filters.hideViews) count++
    if (filters.hasNotesOnly) count++
    if (filters.performer) count++
    if (filters.dateFrom || filters.dateTo) count++
    return count
  }, [filters, activityTypes.length])

  const clearFilters = () => {
    setFilters({
      types: [],
      hideViews: false,
      hasNotesOnly: false,
      performer: null,
      dateFrom: null,
      dateTo: null,
    })
  }

  const toggleType = (type: ActivityType) => {
    const newTypes = filters.types.includes(type)
      ? filters.types.filter((t) => t !== type)
      : [...filters.types, type]
    setFilters({ ...filters, types: newTypes })
  }

  return (
    <div className="mb-4 border border-gray-200 rounded-lg bg-white">
      {/* Filter Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-2 flex items-center justify-between text-[13px] text-gray-700 hover:bg-gray-50"
      >
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4" />
          <span className="font-medium">Filters</span>
          {activeFilterCount > 0 && (
            <span className="px-1.5 py-0.5 text-[11px] font-medium bg-gray-900 text-white rounded-full">
              {activeFilterCount}
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </button>

      {/* Filter Content */}
      {isExpanded && (
        <div className="px-3 pb-3 border-t border-gray-100 space-y-4">
          {/* Quick Toggles */}
          <div className="pt-3 flex flex-wrap gap-2">
            <button
              onClick={() => setFilters({ ...filters, hideViews: !filters.hideViews })}
              className={`px-2.5 py-1 text-[12px] rounded-full border transition-colors ${
                filters.hideViews
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              Hide views
            </button>
            <button
              onClick={() => setFilters({ ...filters, hasNotesOnly: !filters.hasNotesOnly })}
              className={`px-2.5 py-1 text-[12px] rounded-full border transition-colors ${
                filters.hasNotesOnly
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              With notes only
            </button>
          </div>

          {/* Activity Types */}
          <div>
            <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-2">
              Activity Type
            </p>
            <div className="flex flex-wrap gap-1.5">
              {activityTypes
                .filter((type) => type !== ActivityType.APPLICATION_VIEWED || !filters.hideViews)
                .map((type) => (
                  <button
                    key={type}
                    onClick={() => toggleType(type)}
                    className={`px-2 py-1 text-[11px] rounded border transition-colors ${
                      filters.types.length === 0 || filters.types.includes(type)
                        ? 'bg-gray-100 text-gray-800 border-gray-200'
                        : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    {ACTIVITY_TYPE_LABELS[type]}
                  </button>
                ))}
            </div>
          </div>

          {/* Performer Filter */}
          {performers.length > 1 && (
            <div>
              <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-2">
                Performed By
              </p>
              <select
                value={filters.performer || ''}
                onChange={(e) =>
                  setFilters({ ...filters, performer: e.target.value || null })
                }
                className="w-full px-2.5 py-1.5 text-[12px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300"
              >
                <option value="">All users</option>
                {performers.map((performer) => (
                  <option key={performer} value={performer}>
                    {performer}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Date Range */}
          <div>
            <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-2">
              Date Range
            </p>
            <div className="flex gap-2 items-center">
              <input
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) =>
                  setFilters({ ...filters, dateFrom: e.target.value || null })
                }
                className="flex-1 px-2.5 py-1.5 text-[12px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300"
              />
              <span className="text-[12px] text-gray-400">to</span>
              <input
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) =>
                  setFilters({ ...filters, dateTo: e.target.value || null })
                }
                className="flex-1 px-2.5 py-1.5 text-[12px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300"
              />
            </div>
          </div>

          {/* Clear Filters */}
          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-[12px] text-gray-500 hover:text-gray-700"
            >
              <X className="w-3 h-3" />
              Clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export default function ActivityTimeline({
  applicationId,
}: ActivityTimelineProps) {
  const { activities, isLoading, error, refetch } = useActivityLog(applicationId)

  const [filters, setFilters] = useState<ActivityFilters>({
    types: [],
    hideViews: false,
    hasNotesOnly: false,
    performer: null,
    dateFrom: null,
    dateTo: null,
  })

  // Extract unique performers and activity types from activities
  const { performers, activityTypes } = useMemo(() => {
    const performerSet = new Set<string>()
    const typeSet = new Set<ActivityType>()

    activities.forEach((activity) => {
      if (activity.performed_by_name) {
        performerSet.add(activity.performed_by_name)
      }
      typeSet.add(activity.activity_type)
    })

    return {
      performers: Array.from(performerSet).sort(),
      activityTypes: Array.from(typeSet),
    }
  }, [activities])

  // Apply filters
  const filteredActivities = useMemo(() => {
    return activities.filter((activity) => {
      // Hide views filter
      if (filters.hideViews && activity.activity_type === ActivityType.APPLICATION_VIEWED) {
        return false
      }

      // Has notes only filter
      if (filters.hasNotesOnly && activity.notes_count === 0) {
        return false
      }

      // Activity type filter
      if (filters.types.length > 0 && !filters.types.includes(activity.activity_type)) {
        return false
      }

      // Performer filter
      if (filters.performer && activity.performed_by_name !== filters.performer) {
        return false
      }

      // Date range filter
      if (filters.dateFrom) {
        const activityDate = new Date(activity.created_at)
        const fromDate = new Date(filters.dateFrom)
        fromDate.setHours(0, 0, 0, 0)
        if (activityDate < fromDate) {
          return false
        }
      }

      if (filters.dateTo) {
        const activityDate = new Date(activity.created_at)
        const toDate = new Date(filters.dateTo)
        toDate.setHours(23, 59, 59, 999)
        if (activityDate > toDate) {
          return false
        }
      }

      return true
    })
  }, [activities, filters])

  if (isLoading) {
    return (
      <div className="text-center py-8 text-gray-500 text-[14px]">
        Loading activity...
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-500 text-[14px]">{error}</div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8">
        <User className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-[14px] text-gray-500">No activity yet</p>
        <p className="text-[12px] text-gray-400 mt-1">
          Activity will appear here as the application progresses
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h4 className="text-[12px] font-medium text-gray-500 uppercase tracking-wider">
        Activity Log
      </h4>

      {/* Filters */}
      <ActivityFilterBar
        filters={filters}
        setFilters={setFilters}
        performers={performers}
        activityTypes={activityTypes}
      />

      {/* Results count */}
      {(filters.hideViews || filters.hasNotesOnly || filters.types.length > 0 || filters.performer || filters.dateFrom || filters.dateTo) && (
        <p className="text-[12px] text-gray-500">
          Showing {filteredActivities.length} of {activities.length} activities
        </p>
      )}

      {filteredActivities.length === 0 ? (
        <div className="text-center py-8">
          <Filter className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-[13px] text-gray-500">No activities match your filters</p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-3.5 top-4 bottom-4 w-0.5 bg-gray-200" />

          <div className="space-y-0">
            {filteredActivities.map((activity) => (
              <ActivityEntry
                key={activity.id}
                activity={activity}
                applicationId={applicationId}
                onNoteAdded={refetch}
                showViewsNormally={filters.types.includes(ActivityType.APPLICATION_VIEWED)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
