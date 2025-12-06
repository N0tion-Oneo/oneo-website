import { useState, useEffect, useCallback, useRef } from 'react'
import api from '@/services/api'
import type { ActivityLogEntry, ActivityNote } from '@/types'

// ============================================================================
// Activity Log Hook
// ============================================================================

interface UseActivityLogOptions {
  applicationId?: string | null
  candidateId?: number | null
  jobId?: string | null  // For filtering candidate activities by job
}

interface UseActivityLogReturn {
  activities: ActivityLogEntry[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  jobs: { id: string; title: string }[]  // Unique jobs for filtering
}

export function useActivityLog(options: UseActivityLogOptions | string | null): UseActivityLogReturn {
  // Support legacy usage with just applicationId string
  const normalizedOptions: UseActivityLogOptions = typeof options === 'string' || options === null
    ? { applicationId: options }
    : options

  const { applicationId, candidateId, jobId } = normalizedOptions

  const [activities, setActivities] = useState<ActivityLogEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [jobs, setJobs] = useState<{ id: string; title: string }[]>([])

  const fetchActivities = useCallback(async () => {
    // Need either applicationId or candidateId
    if (!applicationId && !candidateId) return

    setIsLoading(true)
    setError(null)
    try {
      let response
      if (candidateId) {
        // Fetch candidate activities (merged candidate + application activities)
        const params = new URLSearchParams()
        if (jobId) {
          params.append('job_id', jobId)
        }
        response = await api.get<ActivityLogEntry[]>(
          `/admin/candidates/${candidateId}/activity/${params.toString() ? '?' + params.toString() : ''}`
        )

        // Extract unique jobs for the filter dropdown
        const jobMap = new Map<string, string>()
        response.data.forEach((activity: ActivityLogEntry & { job_id?: string; job_title?: string }) => {
          if (activity.job_id && activity.job_title) {
            jobMap.set(activity.job_id, activity.job_title)
          }
        })
        setJobs(Array.from(jobMap.entries()).map(([id, title]) => ({ id, title })))
      } else {
        // Fetch application activities (existing behavior)
        response = await api.get<ActivityLogEntry[]>(
          `/jobs/applications/${applicationId}/activities/`
        )
        setJobs([])
      }
      setActivities(response.data)
    } catch (err) {
      setError('Failed to load activity log')
      console.error('Error fetching activities:', err)
    } finally {
      setIsLoading(false)
    }
  }, [applicationId, candidateId, jobId])

  useEffect(() => {
    if (applicationId || candidateId) {
      fetchActivities()
    } else {
      setActivities([])
      setJobs([])
    }
  }, [applicationId, candidateId, jobId, fetchActivities])

  return { activities, isLoading, error, refetch: fetchActivities, jobs }
}

// ============================================================================
// Add Activity Note Hook
// ============================================================================

interface UseAddActivityNoteOptions {
  applicationId?: string | null
  candidateId?: number | null
}

interface UseAddActivityNoteReturn {
  addNote: (activityId: string, content: string, source?: 'application' | 'candidate') => Promise<ActivityNote>
  isLoading: boolean
  error: string | null
}

export function useAddActivityNote(options: UseAddActivityNoteOptions | string | null): UseAddActivityNoteReturn {
  // Support legacy usage with just applicationId string
  const normalizedOptions: UseAddActivityNoteOptions = typeof options === 'string' || options === null
    ? { applicationId: options }
    : options

  const { applicationId, candidateId } = normalizedOptions

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addNote = useCallback(
    async (activityId: string, content: string, source: 'application' | 'candidate' = 'application'): Promise<ActivityNote> => {
      setIsLoading(true)
      setError(null)
      try {
        let response
        if (source === 'candidate' && candidateId) {
          // Add note to candidate activity
          response = await api.post<ActivityNote>(
            `/admin/candidates/${candidateId}/activity/${activityId}/notes/`,
            { content }
          )
        } else if (applicationId) {
          // Add note to application activity
          response = await api.post<ActivityNote>(
            `/jobs/applications/${applicationId}/activities/${activityId}/notes/`,
            { content }
          )
        } else {
          throw new Error('Either applicationId or candidateId is required')
        }
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
    [applicationId, candidateId]
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
