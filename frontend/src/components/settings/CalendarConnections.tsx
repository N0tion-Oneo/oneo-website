import React, { useState, useEffect, useCallback } from 'react'
import { Calendar, Check, X, ExternalLink, RefreshCw, ChevronDown, ChevronUp, Settings, Save, Loader2 } from 'lucide-react'
import {
  useCalendarConnections,
  useConnectCalendar,
  useDisconnectCalendar,
  useAvailableCalendars,
  useUpdateCalendarSettings,
} from '@/hooks/useCalendarConnections'
import type { CalendarProvider, CalendarConnection, CalendarSettingsUpdate, AvailableCalendar } from '@/types'

// Common timezones
const COMMON_TIMEZONES = [
  { value: 'Africa/Johannesburg', label: 'South Africa (SAST)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
  { value: 'America/New_York', label: 'New York (EST/EDT)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST/PDT)' },
  { value: 'America/Chicago', label: 'Chicago (CST/CDT)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
]

const DAYS_OF_WEEK = [
  { value: 0, label: 'Mon' },
  { value: 1, label: 'Tue' },
  { value: 2, label: 'Wed' },
  { value: 3, label: 'Thu' },
  { value: 4, label: 'Fri' },
  { value: 5, label: 'Sat' },
  { value: 6, label: 'Sun' },
]

const HOURS = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: `${i.toString().padStart(2, '0')}:00`,
}))

// Provider configuration
const CALENDAR_PROVIDERS: {
  id: CalendarProvider
  name: string
  icon: string
  color: string
  description: string
}[] = [
  {
    id: 'google',
    name: 'Google Calendar',
    icon: '🗓️',
    color: 'bg-red-50 border-red-200 hover:bg-red-100',
    description: 'Connect your Google Calendar to automatically create interview events',
  },
  {
    id: 'microsoft',
    name: 'Microsoft 365',
    icon: '📅',
    color: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
    description: 'Connect your Outlook calendar to sync interview schedules',
  },
]

// ============================================================================
// Calendar Settings Form Component
// ============================================================================

interface CalendarSettingsFormProps {
  connection: CalendarConnection
  onSave: () => void
}

function CalendarSettingsForm({ connection, onSave }: CalendarSettingsFormProps) {
  const { calendars, currentCalendarId, isLoading: isLoadingCalendars } = useAvailableCalendars(connection.provider)
  const { updateSettings, isUpdating } = useUpdateCalendarSettings()

  const [formData, setFormData] = useState<CalendarSettingsUpdate>({
    calendar_id: connection.calendar_id || '',
    booking_days_ahead: connection.booking_days_ahead,
    business_hours_start: connection.business_hours_start,
    business_hours_end: connection.business_hours_end,
    min_notice_hours: connection.min_notice_hours,
    buffer_minutes: connection.buffer_minutes,
    available_days: connection.available_days_list,
    timezone: connection.timezone,
  })

  const [isDirty, setIsDirty] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Update calendar_id when calendars load
  useEffect(() => {
    if (calendars.length > 0 && !formData.calendar_id) {
      const primaryCalendar = calendars.find(c => c.primary) || calendars[0]
      setFormData(prev => ({ ...prev, calendar_id: currentCalendarId || primaryCalendar.id }))
    }
  }, [calendars, currentCalendarId, formData.calendar_id])

  const handleChange = useCallback(<K extends keyof CalendarSettingsUpdate>(
    field: K,
    value: CalendarSettingsUpdate[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setIsDirty(true)
    setSaveSuccess(false)
  }, [])

  const toggleDay = useCallback((day: number) => {
    const currentDays = formData.available_days || []
    const newDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day].sort((a, b) => a - b)
    handleChange('available_days', newDays)
  }, [formData.available_days, handleChange])

  const handleSave = async () => {
    try {
      // Find calendar name for the selected calendar
      const selectedCalendar = calendars.find(c => c.id === formData.calendar_id)
      await updateSettings(connection.provider, {
        ...formData,
        calendar_name: selectedCalendar?.name,
      })
      setIsDirty(false)
      setSaveSuccess(true)
      onSave()
      // Clear success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch {
      // Error handled in hook
    }
  }

  return (
    <div className="mt-4 pt-4 border-t border-gray-200 space-y-5">
      {/* Calendar Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Calendar for Events
        </label>
        {isLoadingCalendars ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading calendars...
          </div>
        ) : calendars.length === 0 ? (
          <p className="text-sm text-gray-500">No calendars available</p>
        ) : (
          <select
            value={formData.calendar_id}
            onChange={(e) => handleChange('calendar_id', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          >
            {calendars.map((cal) => (
              <option key={cal.id} value={cal.id}>
                {cal.name} {cal.primary && '(Primary)'}
              </option>
            ))}
          </select>
        )}
        <p className="mt-1 text-xs text-gray-500">
          Interview events will be created in this calendar
        </p>
      </div>

      {/* Timezone */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Timezone
        </label>
        <select
          value={formData.timezone}
          onChange={(e) => handleChange('timezone', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
        >
          {COMMON_TIMEZONES.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
        </select>
      </div>

      {/* Business Hours */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Available Hours
        </label>
        <div className="flex items-center gap-3">
          <select
            value={formData.business_hours_start}
            onChange={(e) => handleChange('business_hours_start', parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          >
            {HOURS.slice(0, 20).map((hour) => (
              <option key={hour.value} value={hour.value}>
                {hour.label}
              </option>
            ))}
          </select>
          <span className="text-gray-500">to</span>
          <select
            value={formData.business_hours_end}
            onChange={(e) => handleChange('business_hours_end', parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          >
            {HOURS.slice(4).map((hour) => (
              <option key={hour.value} value={hour.value}>
                {hour.label}
              </option>
            ))}
          </select>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Time slots will only be offered during these hours
        </p>
      </div>

      {/* Available Days */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Available Days
        </label>
        <div className="flex flex-wrap gap-2">
          {DAYS_OF_WEEK.map((day) => {
            const isSelected = formData.available_days?.includes(day.value)
            return (
              <button
                key={day.value}
                type="button"
                onClick={() => toggleDay(day.value)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md border transition-colors ${
                  isSelected
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                }`}
              >
                {day.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Booking Window */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Booking Window
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="1"
            max="90"
            value={formData.booking_days_ahead}
            onChange={(e) => handleChange('booking_days_ahead', parseInt(e.target.value) || 14)}
            className="w-20 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
          <span className="text-sm text-gray-600">days in advance</span>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Candidates can book up to this many days ahead
        </p>
      </div>

      {/* Minimum Notice */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Minimum Notice
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            max="168"
            value={formData.min_notice_hours}
            onChange={(e) => handleChange('min_notice_hours', parseInt(e.target.value) || 0)}
            className="w-20 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
          <span className="text-sm text-gray-600">hours before a slot</span>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Prevents last-minute bookings
        </p>
      </div>

      {/* Buffer Time */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Buffer Between Meetings
        </label>
        <div className="flex items-center gap-2">
          <select
            value={formData.buffer_minutes}
            onChange={(e) => handleChange('buffer_minutes', parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          >
            <option value={0}>No buffer</option>
            <option value={5}>5 minutes</option>
            <option value={10}>10 minutes</option>
            <option value={15}>15 minutes</option>
            <option value={30}>30 minutes</option>
          </select>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Extra time between interviews
        </p>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-between pt-2">
        <div className="text-sm">
          {saveSuccess && (
            <span className="text-green-600 flex items-center gap-1">
              <Check className="h-4 w-4" />
              Settings saved
            </span>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={!isDirty || isUpdating}
          className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            isDirty
              ? 'bg-gray-900 text-white hover:bg-gray-800'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {isUpdating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Settings
            </>
          )}
        </button>
      </div>
    </div>
  )
}

interface CalendarConnectionsProps {
  className?: string
}

export default function CalendarConnections({ className = '' }: CalendarConnectionsProps) {
  const { connections, isLoading, refetch } = useCalendarConnections()
  const { connect, isConnecting } = useConnectCalendar()
  const { disconnect, isDisconnecting } = useDisconnectCalendar()
  const [connectingProvider, setConnectingProvider] = useState<CalendarProvider | null>(null)
  const [disconnectingProvider, setDisconnectingProvider] = useState<CalendarProvider | null>(null)
  const [expandedProvider, setExpandedProvider] = useState<CalendarProvider | null>(null)

  // Listen for OAuth callback messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'calendar_oauth_success') {
        refetch()
        setConnectingProvider(null)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [refetch])

  const getConnectionForProvider = (provider: CalendarProvider) => {
    return connections.find((c) => c.provider === provider && c.is_active)
  }

  const handleConnect = async (provider: CalendarProvider) => {
    setConnectingProvider(provider)
    try {
      await connect(provider)
      // After popup closes, refetch connections
      setTimeout(() => refetch(), 1000)
    } catch {
      // Error handled in hook
    } finally {
      setConnectingProvider(null)
    }
  }

  const handleDisconnect = async (provider: CalendarProvider) => {
    if (!confirm(`Are you sure you want to disconnect your ${provider === 'google' ? 'Google' : 'Microsoft'} calendar?`)) {
      return
    }

    setDisconnectingProvider(provider)
    try {
      await disconnect(provider)
      await refetch()
    } catch {
      // Error handled in hook
    } finally {
      setDisconnectingProvider(null)
    }
  }

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <div className="flex items-center gap-3 mb-4">
          <Calendar className="h-5 w-5 text-gray-500" />
          <h3 className="text-lg font-medium">Calendar Integrations</h3>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-20 bg-gray-100 rounded-lg" />
          <div className="h-20 bg-gray-100 rounded-lg" />
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-gray-500" />
          <h3 className="text-lg font-medium">Calendar Integrations</h3>
        </div>
        <button
          onClick={() => refetch()}
          className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
          title="Refresh"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      <p className="text-sm text-gray-500 mb-6">
        Connect your calendar to automatically create interview events and send calendar invites to candidates.
      </p>

      <div className="space-y-4">
        {CALENDAR_PROVIDERS.map((provider) => {
          const connection = getConnectionForProvider(provider.id)
          const isThisConnecting = connectingProvider === provider.id && isConnecting
          const isThisDisconnecting = disconnectingProvider === provider.id && isDisconnecting
          const isExpanded = expandedProvider === provider.id

          return (
            <div
              key={provider.id}
              className={`rounded-lg border transition-colors ${
                connection ? 'bg-green-50 border-green-200' : provider.color
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{provider.icon}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{provider.name}</span>
                      {connection && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          <Check className="h-3 w-3" />
                          Connected
                        </span>
                      )}
                    </div>
                    {connection ? (
                      <p className="text-sm text-gray-600 mt-0.5">
                        {connection.provider_email}
                        {connection.calendar_name && (
                          <span className="text-gray-400"> • {connection.calendar_name}</span>
                        )}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-500 mt-0.5">
                        {provider.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {connection ? (
                    <>
                      {/* Settings Toggle Button */}
                      <button
                        onClick={() => setExpandedProvider(isExpanded ? null : provider.id)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-green-100 rounded-md transition-colors"
                      >
                        <Settings className="h-4 w-4" />
                        Settings
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                      {/* Disconnect Button */}
                      <button
                        onClick={() => handleDisconnect(provider.id)}
                        disabled={isThisDisconnecting}
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                      >
                        {isThisDisconnecting ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            Disconnecting...
                          </>
                        ) : (
                          <>
                            <X className="h-4 w-4" />
                            Disconnect
                          </>
                        )}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleConnect(provider.id)}
                      disabled={isThisConnecting}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-md transition-colors disabled:opacity-50"
                    >
                      {isThisConnecting ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <ExternalLink className="h-4 w-4" />
                          Connect
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Expandable Settings Panel */}
              {connection && isExpanded && (
                <div className="px-4 pb-4">
                  <CalendarSettingsForm
                    connection={connection}
                    onSave={() => refetch()}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-2">How it works</h4>
        <ul className="text-sm text-gray-500 space-y-1">
          <li>• When you schedule an interview, an event is created in your calendar</li>
          <li>• Calendar invites are automatically sent to candidates and interviewers</li>
          <li>• Rescheduling or cancelling updates the calendar event automatically</li>
          <li>• Your calendar credentials are securely stored and encrypted</li>
        </ul>
      </div>
    </div>
  )
}
