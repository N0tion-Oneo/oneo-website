import { useState, useEffect, useCallback } from 'react'
import api from '@/services/api'
import type { CalendarConnection, CalendarProvider, AvailableCalendar, CalendarSettingsUpdate } from '@/types'

// ============================================================================
// Calendar Connections List Hook
// ============================================================================

interface UseCalendarConnectionsReturn {
  connections: CalendarConnection[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useCalendarConnections(): UseCalendarConnectionsReturn {
  const [connections, setConnections] = useState<CalendarConnection[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchConnections = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get<CalendarConnection[]>('/scheduling/connections/')
      setConnections(response.data)
    } catch (err) {
      setError('Failed to load calendar connections')
      console.error('Error fetching calendar connections:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchConnections()
  }, [fetchConnections])

  return { connections, isLoading, error, refetch: fetchConnections }
}

// ============================================================================
// Initiate Calendar OAuth Hook
// ============================================================================

interface UseInitiateCalendarOAuthReturn {
  initiateOAuth: (provider: CalendarProvider) => Promise<string>
  isInitiating: boolean
  error: string | null
}

export function useInitiateCalendarOAuth(): UseInitiateCalendarOAuthReturn {
  const [isInitiating, setIsInitiating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const initiateOAuth = useCallback(async (provider: CalendarProvider): Promise<string> => {
    setIsInitiating(true)
    setError(null)
    try {
      const response = await api.get<{ auth_url: string }>(
        `/scheduling/auth/${provider}/`
      )
      return response.data.auth_url
    } catch (err) {
      const axiosError = err as { response?: { data?: { error?: string } } }
      const message = axiosError.response?.data?.error || 'Failed to initiate calendar authorization'
      setError(message)
      console.error('Error initiating calendar OAuth:', err)
      throw err
    } finally {
      setIsInitiating(false)
    }
  }, [])

  return { initiateOAuth, isInitiating, error }
}

// ============================================================================
// Connect Calendar Hook (handles OAuth flow)
// ============================================================================

interface UseConnectCalendarReturn {
  connect: (provider: CalendarProvider) => Promise<void>
  isConnecting: boolean
  error: string | null
}

export function useConnectCalendar(): UseConnectCalendarReturn {
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const connect = useCallback(async (provider: CalendarProvider): Promise<void> => {
    setIsConnecting(true)
    setError(null)
    try {
      // Get the OAuth URL from the backend
      const response = await api.get<{ auth_url: string }>(
        `/scheduling/auth/${provider}/`
      )

      // Open OAuth popup or redirect
      const authUrl = response.data.auth_url

      // Open in a popup window
      const width = 600
      const height = 700
      const left = window.screenX + (window.outerWidth - width) / 2
      const top = window.screenY + (window.outerHeight - height) / 2

      const popup = window.open(
        authUrl,
        `${provider}_oauth`,
        `width=${width},height=${height},left=${left},top=${top},popup=1`
      )

      // Poll for popup close (OAuth completion)
      if (popup) {
        const checkClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkClosed)
            setIsConnecting(false)
            // Caller should refetch connections after popup closes
          }
        }, 500)
      }
    } catch (err) {
      const axiosError = err as { response?: { data?: { error?: string } } }
      const message = axiosError.response?.data?.error || 'Failed to connect calendar'
      setError(message)
      console.error('Error connecting calendar:', err)
      setIsConnecting(false)
      throw err
    }
  }, [])

  return { connect, isConnecting, error }
}

// ============================================================================
// Disconnect Calendar Hook
// ============================================================================

interface UseDisconnectCalendarReturn {
  disconnect: (provider: CalendarProvider) => Promise<void>
  isDisconnecting: boolean
  error: string | null
}

export function useDisconnectCalendar(): UseDisconnectCalendarReturn {
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const disconnect = useCallback(async (provider: CalendarProvider): Promise<void> => {
    setIsDisconnecting(true)
    setError(null)
    try {
      await api.delete(`/scheduling/disconnect/${provider}/`)
    } catch (err) {
      const axiosError = err as { response?: { data?: { error?: string } } }
      const message = axiosError.response?.data?.error || 'Failed to disconnect calendar'
      setError(message)
      console.error('Error disconnecting calendar:', err)
      throw err
    } finally {
      setIsDisconnecting(false)
    }
  }, [])

  return { disconnect, isDisconnecting, error }
}

// ============================================================================
// Check Calendar Connection Hook
// ============================================================================

interface UseHasCalendarConnectionReturn {
  hasConnection: boolean
  activeProviders: CalendarProvider[]
  isLoading: boolean
}

export function useHasCalendarConnection(): UseHasCalendarConnectionReturn {
  const { connections, isLoading } = useCalendarConnections()

  const activeConnections = connections.filter((c) => c.is_active)
  const activeProviders = activeConnections.map((c) => c.provider)

  return {
    hasConnection: activeConnections.length > 0,
    activeProviders,
    isLoading,
  }
}

// ============================================================================
// Available Calendars Hook
// ============================================================================

interface UseAvailableCalendarsReturn {
  calendars: AvailableCalendar[]
  currentCalendarId: string | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useAvailableCalendars(provider: CalendarProvider | null): UseAvailableCalendarsReturn {
  const [calendars, setCalendars] = useState<AvailableCalendar[]>([])
  const [currentCalendarId, setCurrentCalendarId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCalendars = useCallback(async () => {
    if (!provider) {
      setCalendars([])
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get<{
        calendars: AvailableCalendar[]
        current_calendar_id: string
      }>(`/scheduling/${provider}/calendars/`)
      setCalendars(response.data.calendars)
      setCurrentCalendarId(response.data.current_calendar_id)
    } catch (err) {
      const axiosError = err as { response?: { data?: { error?: string } } }
      setError(axiosError.response?.data?.error || 'Failed to load calendars')
      console.error('Error fetching calendars:', err)
    } finally {
      setIsLoading(false)
    }
  }, [provider])

  useEffect(() => {
    fetchCalendars()
  }, [fetchCalendars])

  return { calendars, currentCalendarId, isLoading, error, refetch: fetchCalendars }
}

// ============================================================================
// Update Calendar Settings Hook
// ============================================================================

interface UseUpdateCalendarSettingsReturn {
  updateSettings: (provider: CalendarProvider, settings: CalendarSettingsUpdate) => Promise<CalendarConnection>
  isUpdating: boolean
  error: string | null
}

export function useUpdateCalendarSettings(): UseUpdateCalendarSettingsReturn {
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateSettings = useCallback(async (
    provider: CalendarProvider,
    settings: CalendarSettingsUpdate
  ): Promise<CalendarConnection> => {
    setIsUpdating(true)
    setError(null)
    try {
      const response = await api.patch<CalendarConnection>(
        `/scheduling/${provider}/settings/`,
        settings
      )
      return response.data
    } catch (err) {
      const axiosError = err as { response?: { data?: { error?: string } } }
      const message = axiosError.response?.data?.error || 'Failed to update settings'
      setError(message)
      console.error('Error updating calendar settings:', err)
      throw err
    } finally {
      setIsUpdating(false)
    }
  }, [])

  return { updateSettings, isUpdating, error }
}
