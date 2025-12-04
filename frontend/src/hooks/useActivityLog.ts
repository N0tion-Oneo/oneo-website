import { useState, useEffect, useCallback, useRef } from 'react'
import api from '@/services/api'
import type { ActivityLogEntry, ActivityNote } from '@/types'

// ============================================================================
// Activity Log Hook
// ============================================================================

interface UseActivityLogReturn {
  activities: ActivityLogEntry[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useActivityLog(applicationId: string | null): UseActivityLogReturn {
  const [activities, setActivities] = useState<ActivityLogEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchActivities = useCallback(async () => {
    if (!applicationId) return

    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get<ActivityLogEntry[]>(
        `/jobs/applications/${applicationId}/activities/`
      )
      setActivities(response.data)
    } catch (err) {
      setError('Failed to load activity log')
      console.error('Error fetching activities:', err)
    } finally {
      setIsLoading(false)
    }
  }, [applicationId])

  useEffect(() => {
    if (applicationId) {
      fetchActivities()
    } else {
      setActivities([])
    }
  }, [applicationId, fetchActivities])

  return { activities, isLoading, error, refetch: fetchActivities }
}

// ============================================================================
// Add Activity Note Hook
// ============================================================================

interface UseAddActivityNoteReturn {
  addNote: (activityId: string, content: string) => Promise<ActivityNote>
  isLoading: boolean
  error: string | null
}

export function useAddActivityNote(applicationId: string | null): UseAddActivityNoteReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addNote = useCallback(
    async (activityId: string, content: string): Promise<ActivityNote> => {
      if (!applicationId) {
        throw new Error('Application ID is required')
      }

      setIsLoading(true)
      setError(null)
      try {
        const response = await api.post<ActivityNote>(
          `/jobs/applications/${applicationId}/activities/${activityId}/notes/`,
          { content }
        )
        return response.data
      } catch (err: unknown) {
        const errorMessage =
          (err as { response?: { data?: { error?: string } } })?.response?.data
            ?.error || 'Failed to add note'
        setError(errorMessage)
        throw new Error(errorMessage)
      } finally {
        setIsLoading(false)
      }
    },
    [applicationId]
  )

  return { addNote, isLoading, error }
}

// ============================================================================
// Record Application View Hook
// ============================================================================

export function useRecordApplicationView(applicationId: string | null) {
  const hasRecorded = useRef<string | null>(null)

  useEffect(() => {
    // Only record if we have an applicationId and haven't recorded for this one yet
    if (!applicationId || hasRecorded.current === applicationId) return

    const recordView = async () => {
      try {
        await api.post(`/jobs/applications/${applicationId}/view/`)
        hasRecorded.current = applicationId
      } catch (err) {
        // Silently fail - view recording is non-critical
        console.error('Failed to record view:', err)
      }
    }

    // Debounce: only record after 2 seconds of drawer being open
    const timer = setTimeout(recordView, 2000)
    return () => clearTimeout(timer)
  }, [applicationId])
}
