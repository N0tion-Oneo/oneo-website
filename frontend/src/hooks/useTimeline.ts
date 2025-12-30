import { useState, useCallback, useEffect } from 'react'
import {
  getTimeline,
  addTimelineNote,
  logTimelineCall,
  getServiceCenterData,
  type TimelineListParams,
} from '@/services/api'
import type {
  TimelineEntry,
  TimelineSource,
  EntityType,
  ServiceCenterData,
} from '@/types'

// =============================================================================
// useTimeline - Aggregate timeline for an entity
// =============================================================================

interface UseTimelineReturn {
  entries: TimelineEntry[]
  count: number
  sourcesAvailable: TimelineSource[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  loadMore: () => Promise<void>
  hasMore: boolean
}

export function useTimeline(
  entityType: EntityType | undefined,
  entityId: string | undefined,
  params?: Omit<TimelineListParams, 'offset'>
): UseTimelineReturn {
  const [entries, setEntries] = useState<TimelineEntry[]>([])
  const [count, setCount] = useState(0)
  const [sourcesAvailable, setSourcesAvailable] = useState<TimelineSource[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [offset, setOffset] = useState(0)

  const fetchTimeline = useCallback(async (reset = true) => {
    if (!entityType || !entityId) {
      setEntries([])
      setCount(0)
      setSourcesAvailable([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const currentOffset = reset ? 0 : offset
      const response = await getTimeline(entityType, entityId, {
        ...params,
        offset: currentOffset,
      })

      if (reset) {
        setEntries(response.results)
        setOffset(response.results.length)
      } else {
        setEntries(prev => [...prev, ...response.results])
        setOffset(prev => prev + response.results.length)
      }
      setCount(response.count)
      setSourcesAvailable(response.sources_available)
    } catch (err) {
      console.error('Error fetching timeline:', err)
      setError('Failed to fetch timeline')
    } finally {
      setIsLoading(false)
    }
  }, [entityType, entityId, params?.limit, params?.sources, params?.activity_types, offset])

  const loadMore = useCallback(async () => {
    if (entries.length >= count) return
    await fetchTimeline(false)
  }, [fetchTimeline, entries.length, count])

  useEffect(() => {
    setOffset(0)
    fetchTimeline(true)
  }, [entityType, entityId, params?.limit, params?.sources, params?.activity_types])

  return {
    entries,
    count,
    sourcesAvailable,
    isLoading,
    error,
    refetch: () => fetchTimeline(true),
    loadMore,
    hasMore: entries.length < count,
  }
}

// =============================================================================
// useAddTimelineNote
// =============================================================================

interface UseAddTimelineNoteReturn {
  addNote: (content: string) => Promise<TimelineEntry>
  isAdding: boolean
  error: string | null
}

export function useAddTimelineNote(
  entityType: EntityType,
  entityId: string
): UseAddTimelineNoteReturn {
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addNote = useCallback(async (content: string): Promise<TimelineEntry> => {
    setIsAdding(true)
    setError(null)
    try {
      const result = await addTimelineNote(entityType, entityId, content)
      return result
    } catch (err) {
      const axiosError = err as { response?: { data?: { error?: string } } }
      const message = axiosError.response?.data?.error || 'Failed to add note'
      setError(message)
      throw err
    } finally {
      setIsAdding(false)
    }
  }, [entityType, entityId])

  return { addNote, isAdding, error }
}

// =============================================================================
// useLogTimelineCall
// =============================================================================

interface UseLogTimelineCallReturn {
  logCall: (notes: string, durationMinutes?: number) => Promise<TimelineEntry>
  isLogging: boolean
  error: string | null
}

export function useLogTimelineCall(
  entityType: EntityType,
  entityId: string
): UseLogTimelineCallReturn {
  const [isLogging, setIsLogging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const logCall = useCallback(async (notes: string, durationMinutes?: number): Promise<TimelineEntry> => {
    setIsLogging(true)
    setError(null)
    try {
      const result = await logTimelineCall(entityType, entityId, notes, durationMinutes)
      return result
    } catch (err) {
      const axiosError = err as { response?: { data?: { error?: string } } }
      const message = axiosError.response?.data?.error || 'Failed to log call'
      setError(message)
      throw err
    } finally {
      setIsLogging(false)
    }
  }, [entityType, entityId])

  return { logCall, isLogging, error }
}

// =============================================================================
// useServiceCenter - Combined data for Service Center view
// =============================================================================

interface UseServiceCenterReturn {
  data: ServiceCenterData | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useServiceCenter(
  entityType: EntityType | undefined,
  entityId: string | undefined
): UseServiceCenterReturn {
  const [data, setData] = useState<ServiceCenterData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!entityType || !entityId) {
      setData(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const result = await getServiceCenterData(entityType, entityId)
      setData(result)
    } catch (err: unknown) {
      console.error('Error fetching service center data:', err)
      // Extract more specific error message
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { status?: number; data?: { error?: string; detail?: string } } }
        const status = axiosErr.response?.status
        const message = axiosErr.response?.data?.error || axiosErr.response?.data?.detail
        if (status === 403) {
          setError(message || 'Permission denied')
        } else if (status === 404) {
          setError(message || 'Entity not found')
        } else {
          setError(message || 'Failed to load service center data')
        }
      } else {
        setError('Failed to load service center data')
      }
    } finally {
      setIsLoading(false)
    }
  }, [entityType, entityId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, isLoading, error, refetch: fetchData }
}
