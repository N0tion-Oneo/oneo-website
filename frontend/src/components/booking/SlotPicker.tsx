import { useState, useMemo, useCallback } from 'react'
import {
  format,
  parseISO,
  isSameDay,
  isSameMonth,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  addDays,
  isToday,
  isBefore,
  startOfDay,
} from 'date-fns'
import { ChevronLeft, ChevronRight, Clock, Globe, Check } from 'lucide-react'

interface TimeSlot {
  start: string
  end: string
}

interface SlotPickerProps {
  slots: TimeSlot[]
  selected: string | null
  onSelect: (slot: string) => void
  duration: number
  timezone?: string
  onTimezoneChange?: (timezone: string) => void
}

// Common timezones for the selector
const COMMON_TIMEZONES = [
  { value: 'Africa/Johannesburg', label: 'South Africa (SAST)', offset: '+02:00' },
  { value: 'Europe/London', label: 'London (GMT/BST)', offset: '+00:00' },
  { value: 'Europe/Paris', label: 'Paris (CET)', offset: '+01:00' },
  { value: 'America/New_York', label: 'New York (EST)', offset: '-05:00' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST)', offset: '-08:00' },
  { value: 'America/Chicago', label: 'Chicago (CST)', offset: '-06:00' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)', offset: '+04:00' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)', offset: '+08:00' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)', offset: '+09:00' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)', offset: '+11:00' },
]

export default function SlotPicker({
  slots,
  selected,
  onSelect,
  duration,
  timezone = Intl.DateTimeFormat().resolvedOptions().timeZone,
  onTimezoneChange,
}: SlotPickerProps) {
  // State for current displayed month and selected date
  const [currentMonth, setCurrentMonth] = useState(() => {
    // Start with the month of the first available slot
    if (slots.length > 0) {
      return startOfMonth(parseISO(slots[0].start))
    }
    return startOfMonth(new Date())
  })
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => {
    // Auto-select the first available date
    if (slots.length > 0) {
      return startOfDay(parseISO(slots[0].start))
    }
    return null
  })
  const [showTimezoneSelect, setShowTimezoneSelect] = useState(false)

  // Group slots by date
  const slotsByDate = useMemo(() => {
    const grouped = new Map<string, TimeSlot[]>()
    slots.forEach((slot) => {
      const date = format(parseISO(slot.start), 'yyyy-MM-dd')
      if (!grouped.has(date)) {
        grouped.set(date, [])
      }
      grouped.get(date)!.push(slot)
    })
    // Sort each day's slots by time
    grouped.forEach((daySlots) => {
      daySlots.sort((a, b) => parseISO(a.start).getTime() - parseISO(b.start).getTime())
    })
    return grouped
  }, [slots])

  // Get dates that have available slots
  const availableDates = useMemo(() => {
    return new Set(slotsByDate.keys())
  }, [slotsByDate])

  // Generate calendar days for current month view
  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 })
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 })
    const days: Date[] = []
    let day = start
    while (day <= end) {
      days.push(day)
      day = addDays(day, 1)
    }
    return days
  }, [currentMonth])

  // Get slots for selected date
  const slotsForSelectedDate = useMemo(() => {
    if (!selectedDate) return []
    const dateKey = format(selectedDate, 'yyyy-MM-dd')
    return slotsByDate.get(dateKey) || []
  }, [selectedDate, slotsByDate])

  // Navigate months
  const goToPreviousMonth = useCallback(() => {
    setCurrentMonth((prev) => subMonths(prev, 1))
  }, [])

  const goToNextMonth = useCallback(() => {
    setCurrentMonth((prev) => addMonths(prev, 1))
  }, [])

  // Handle date selection
  const handleDateSelect = useCallback((date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd')
    if (availableDates.has(dateKey)) {
      setSelectedDate(date)
    }
  }, [availableDates])

  // Get timezone display label
  const timezoneLabel = useMemo(() => {
    const tz = COMMON_TIMEZONES.find((t) => t.value === timezone)
    return tz ? tz.label : timezone
  }, [timezone])

  // Check if previous month has any available slots
  const hasPreviousMonthSlots = useMemo(() => {
    const prevMonthStart = startOfMonth(subMonths(currentMonth, 1))
    const today = startOfDay(new Date())
    // Don't allow going before today's month
    if (isBefore(endOfMonth(prevMonthStart), today)) return false
    return true
  }, [currentMonth])

  if (slots.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p className="font-medium">No available times</p>
        <p className="text-sm mt-1">
          The interviewer's calendar doesn't have any available slots in the next 2 weeks.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Left Panel: Calendar */}
      <div className="lg:w-72 flex-shrink-0">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={goToPreviousMonth}
            disabled={!hasPreviousMonthSlots}
            className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h3 className="text-base font-semibold text-gray-900">
            {format(currentMonth, 'MMMM yyyy')}
          </h3>
          <button
            onClick={goToNextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-0.5">
          {/* Weekday headers */}
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
            <div
              key={day}
              className="text-center text-xs font-medium text-gray-500 py-2"
            >
              {day}
            </div>
          ))}

          {/* Calendar days */}
          {calendarDays.map((day, idx) => {
            const dateKey = format(day, 'yyyy-MM-dd')
            const isCurrentMonth = isSameMonth(day, currentMonth)
            const hasSlots = availableDates.has(dateKey)
            const isSelected = selectedDate && isSameDay(day, selectedDate)
            const isDayToday = isToday(day)
            const isPast = isBefore(day, startOfDay(new Date()))

            return (
              <button
                key={idx}
                onClick={() => handleDateSelect(day)}
                disabled={!hasSlots || isPast}
                className={`
                  relative aspect-square flex items-center justify-center text-sm rounded-lg
                  transition-all duration-150
                  ${!isCurrentMonth ? 'text-gray-300' : ''}
                  ${isCurrentMonth && !hasSlots ? 'text-gray-400 cursor-default' : ''}
                  ${isCurrentMonth && hasSlots && !isSelected ? 'text-gray-900 font-medium hover:bg-gray-100 cursor-pointer' : ''}
                  ${isSelected ? 'bg-gray-900 text-white font-semibold' : ''}
                  ${isDayToday && !isSelected ? 'ring-2 ring-gray-300 ring-inset' : ''}
                  ${isPast && isCurrentMonth ? 'text-gray-300' : ''}
                `}
              >
                {format(day, 'd')}
                {/* Availability indicator dot */}
                {hasSlots && !isSelected && isCurrentMonth && !isPast && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-green-500" />
                )}
              </button>
            )
          })}
        </div>

        {/* Timezone Selector */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="relative">
            <button
              onClick={() => setShowTimezoneSelect(!showTimezoneSelect)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <Globe className="w-4 h-4 text-gray-400" />
              <span className="truncate">{timezoneLabel}</span>
              <ChevronRight className={`w-4 h-4 ml-auto transition-transform ${showTimezoneSelect ? 'rotate-90' : ''}`} />
            </button>

            {showTimezoneSelect && (
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto z-10">
                {COMMON_TIMEZONES.map((tz) => (
                  <button
                    key={tz.value}
                    onClick={() => {
                      onTimezoneChange?.(tz.value)
                      setShowTimezoneSelect(false)
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                      timezone === tz.value ? 'text-gray-900 font-medium' : 'text-gray-600'
                    }`}
                  >
                    {timezone === tz.value && <Check className="w-4 h-4 text-green-600" />}
                    <span className={timezone !== tz.value ? 'ml-6' : ''}>{tz.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Panel: Time Slots */}
      <div className="flex-1 min-w-0">
        {selectedDate ? (
          <>
            {/* Selected Date Header */}
            <div className="mb-4">
              <h3 className="text-base font-semibold text-gray-900">
                {isToday(selectedDate)
                  ? 'Today'
                  : isSameDay(selectedDate, addDays(new Date(), 1))
                  ? 'Tomorrow'
                  : format(selectedDate, 'EEEE')}
              </h3>
              <p className="text-sm text-gray-500">
                {format(selectedDate, 'MMMM d, yyyy')}
              </p>
            </div>

            {/* Time Slots List */}
            {slotsForSelectedDate.length > 0 ? (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                {slotsForSelectedDate.map((slot) => {
                  const isSlotSelected = selected === slot.start
                  const timeStr = format(parseISO(slot.start), 'h:mm a')
                  const endTimeStr = format(parseISO(slot.end), 'h:mm a')

                  return (
                    <button
                      key={slot.start}
                      type="button"
                      onClick={() => onSelect(slot.start)}
                      className={`
                        w-full px-4 py-3 rounded-lg border transition-all flex items-center justify-between
                        ${
                          isSlotSelected
                            ? 'bg-gray-900 text-white border-gray-900 shadow-sm'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400 hover:shadow-sm'
                        }
                      `}
                    >
                      <span className="font-medium">{timeStr} - {endTimeStr}</span>
                      {isSlotSelected && <Check className="w-5 h-5" />}
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No available times for this date</p>
              </div>
            )}

            {/* Duration Info */}
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-500">
                {duration} minute meeting
              </span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Clock className="w-12 h-12 text-gray-300 mb-3" />
            <p className="font-medium">Select a date</p>
            <p className="text-sm mt-1">Choose a date from the calendar to see available times</p>
          </div>
        )}
      </div>
    </div>
  )
}
