import { useState, useCallback, useEffect } from 'react'
import api from '@/services/api'
import {
  RecruiterBookingStatus,
} from '@/types'
import type {
  RecruiterMeetingType,
  RecruiterMeetingTypeInput,
  RecruiterBooking,
  RecruiterBookingInput,
  RecruiterPublicBookingPage,
  RecruiterMeetingAvailability,
  RecruiterMeetingCategory,
  CandidateInvitation,
} from '@/types'

// ============================================================================
// Meeting Types Hook (for recruiters/admins to manage their meeting types)
// ============================================================================

interface UseMeetingTypesReturn {
  meetingTypes: RecruiterMeetingType[]
  isLoading: boolean
  error: string | null
  createMeetingType: (data: RecruiterMeetingTypeInput) => Promise<RecruiterMeetingType>
  updateMeetingType: (id: string, data: Partial<RecruiterMeetingTypeInput>) => Promise<RecruiterMeetingType>
  deleteMeetingType: (id: string) => Promise<void>
  isCreating: boolean
  isUpdating: boolean
  isDeleting: boolean
  refetch: () => Promise<void>
}

interface UseMeetingTypesOptions {
  enabled?: boolean
}

export function useMeetingTypes(options: UseMeetingTypesOptions = {}): UseMeetingTypesReturn {
  const { enabled = true } = options
  const [meetingTypes, setMeetingTypes] = useState<RecruiterMeetingType[]>([])
  const [isLoading, setIsLoading] = useState(enabled)
  const [isCreating, setIsCreating] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchMeetingTypes = useCallback(async () => {
    if (!enabled) return
    try {
      setIsLoading(true)
      setError(null)
      const response = await api.get('/scheduling/meeting-types/')
      setMeetingTypes(response.data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load meeting types'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [enabled])

  const createMeetingType = useCallback(async (data: RecruiterMeetingTypeInput) => {
    try {
      setIsCreating(true)
      setError(null)
      const response = await api.post('/scheduling/meeting-types/', data)
      setMeetingTypes((prev) => [...prev, response.data])
      return response.data
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create meeting type'
      setError(message)
      throw err
    } finally {
      setIsCreating(false)
    }
  }, [])

  const updateMeetingType = useCallback(async (id: string, data: Partial<RecruiterMeetingTypeInput>) => {
    try {
      setIsUpdating(true)
      setError(null)
      const response = await api.patch(`/scheduling/meeting-types/${id}/`, data)
      setMeetingTypes((prev) =>
        prev.map((mt) => (mt.id === id ? response.data : mt))
      )
      return response.data
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update meeting type'
      setError(message)
      throw err
    } finally {
      setIsUpdating(false)
    }
  }, [])

  const deleteMeetingType = useCallback(async (id: string) => {
    try {
      setIsDeleting(true)
      setError(null)
      await api.delete(`/scheduling/meeting-types/${id}/`)
      setMeetingTypes((prev) => prev.filter((mt) => mt.id !== id))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete meeting type'
      setError(message)
      throw err
    } finally {
      setIsDeleting(false)
    }
  }, [])

  useEffect(() => {
    fetchMeetingTypes()
  }, [fetchMeetingTypes])

  return {
    meetingTypes,
    isLoading,
    error,
    createMeetingType,
    updateMeetingType,
    deleteMeetingType,
    isCreating,
    isUpdating,
    isDeleting,
    refetch: fetchMeetingTypes,
  }
}

// ============================================================================
// Bookings Hook (for recruiters/admins to manage their bookings)
// ============================================================================

interface BookingsFilters {
  status?: RecruiterBookingStatus
  category?: RecruiterMeetingCategory
  start_date?: string
  end_date?: string
  upcoming?: boolean
}

interface UseRecruiterBookingsReturn {
  bookings: RecruiterBooking[]
  isLoading: boolean
  error: string | null
  filters: BookingsFilters
  setFilters: (filters: BookingsFilters) => void
  cancelBooking: (id: string, reason?: string, isInterview?: boolean) => Promise<void>
  completeBooking: (id: string, isInterview?: boolean) => Promise<void>
  markNoShow: (id: string, isInterview?: boolean) => Promise<void>
  updateBooking: (id: string, data: { scheduled_at?: string; notes?: string }) => Promise<RecruiterBooking>
  isCancelling: boolean
  isCompleting: boolean
  isUpdating: boolean
  refetch: () => Promise<void>
}

export function useRecruiterBookings(initialFilters?: BookingsFilters): UseRecruiterBookingsReturn {
  const [bookings, setBookings] = useState<RecruiterBooking[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCancelling, setIsCancelling] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<BookingsFilters>(initialFilters || {})

  const fetchBookings = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const params = new URLSearchParams()
      if (filters.status) params.append('status', filters.status)
      if (filters.category) params.append('category', filters.category)
      if (filters.start_date) params.append('start_date', filters.start_date)
      if (filters.end_date) params.append('end_date', filters.end_date)
      if (filters.upcoming) params.append('upcoming', 'true')

      const response = await api.get(`/scheduling/bookings/?${params.toString()}`)
      setBookings(response.data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load bookings'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  const cancelBooking = useCallback(async (id: string, reason?: string, isInterview = false) => {
    try {
      setIsCancelling(true)
      setError(null)
      const endpoint = isInterview
        ? `/scheduling/interviews/${id}/cancel/`
        : `/scheduling/bookings/${id}/cancel/`
      const response = await api.post(endpoint, { reason })
      // For interviews, update the status locally since backend returns simpler response
      if (isInterview) {
        setBookings((prev) =>
          prev.map((b) => (b.id === id ? { ...b, status: RecruiterBookingStatus.CANCELLED } : b))
        )
      } else {
        setBookings((prev) =>
          prev.map((b) => (b.id === id ? response.data : b))
        )
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to cancel booking'
      setError(message)
      throw err
    } finally {
      setIsCancelling(false)
    }
  }, [])

  const completeBooking = useCallback(async (id: string, isInterview = false) => {
    try {
      setIsCompleting(true)
      setError(null)
      const endpoint = isInterview
        ? `/scheduling/interviews/${id}/complete/`
        : `/scheduling/bookings/${id}/complete/`
      const response = await api.post(endpoint)
      // For interviews, update the status locally since backend returns simpler response
      if (isInterview) {
        setBookings((prev) =>
          prev.map((b) => (b.id === id ? { ...b, status: RecruiterBookingStatus.COMPLETED } : b))
        )
      } else {
        setBookings((prev) =>
          prev.map((b) => (b.id === id ? response.data : b))
        )
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to complete booking'
      setError(message)
      throw err
    } finally {
      setIsCompleting(false)
    }
  }, [])

  const markNoShow = useCallback(async (id: string, isInterview = false) => {
    try {
      setIsCompleting(true)
      setError(null)
      const endpoint = isInterview
        ? `/scheduling/interviews/${id}/no-show/`
        : `/scheduling/bookings/${id}/no-show/`
      const response = await api.post(endpoint)
      // For interviews, update the status locally since backend returns simpler response
      if (isInterview) {
        setBookings((prev) =>
          prev.map((b) => (b.id === id ? { ...b, status: RecruiterBookingStatus.NO_SHOW } : b))
        )
      } else {
        setBookings((prev) =>
          prev.map((b) => (b.id === id ? response.data : b))
        )
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to mark as no-show'
      setError(message)
      throw err
    } finally {
      setIsCompleting(false)
    }
  }, [])

  const updateBooking = useCallback(async (id: string, data: { scheduled_at?: string; notes?: string }) => {
    try {
      setIsUpdating(true)
      setError(null)
      const response = await api.patch(`/scheduling/bookings/${id}/`, data)
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? response.data : b))
      )
      return response.data
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update booking'
      setError(message)
      throw err
    } finally {
      setIsUpdating(false)
    }
  }, [])

  useEffect(() => {
    fetchBookings()
  }, [fetchBookings])

  return {
    bookings,
    isLoading,
    error,
    filters,
    setFilters,
    cancelBooking,
    completeBooking,
    markNoShow,
    updateBooking,
    isCancelling,
    isCompleting,
    isUpdating,
    refetch: fetchBookings,
  }
}

// ============================================================================
// Single Booking Hook
// ============================================================================

interface UseRecruiterBookingReturn {
  booking: RecruiterBooking | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useRecruiterBooking(bookingId: string): UseRecruiterBookingReturn {
  const [booking, setBooking] = useState<RecruiterBooking | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBooking = useCallback(async () => {
    if (!bookingId) return
    try {
      setIsLoading(true)
      setError(null)
      const response = await api.get(`/scheduling/bookings/${bookingId}/`)
      setBooking(response.data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load booking'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [bookingId])

  useEffect(() => {
    fetchBooking()
  }, [fetchBooking])

  return {
    booking,
    isLoading,
    error,
    refetch: fetchBooking,
  }
}

// ============================================================================
// Public Booking Page Hook (for public visitors)
// ============================================================================

interface UsePublicBookingPageReturn {
  pageData: RecruiterPublicBookingPage | null
  isLoading: boolean
  error: string | null
}

export function usePublicBookingPage(bookingSlug: string): UsePublicBookingPageReturn {
  const [pageData, setPageData] = useState<RecruiterPublicBookingPage | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!bookingSlug) return

    const fetchData = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const response = await api.get(`/scheduling/book/${bookingSlug}/`)
        setPageData(response.data)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load booking page'
        setError(message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [bookingSlug])

  return { pageData, isLoading, error }
}

// ============================================================================
// Meeting Type Availability Hook (for public booking)
// ============================================================================

interface UsePublicAvailabilityReturn {
  availability: RecruiterMeetingAvailability | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function usePublicAvailability(bookingSlug: string, meetingTypeSlug: string): UsePublicAvailabilityReturn {
  const [availability, setAvailability] = useState<RecruiterMeetingAvailability | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAvailability = useCallback(async () => {
    if (!bookingSlug || !meetingTypeSlug) return
    try {
      setIsLoading(true)
      setError(null)
      const response = await api.get(`/scheduling/book/${bookingSlug}/${meetingTypeSlug}/availability/`)
      setAvailability(response.data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load availability'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [bookingSlug, meetingTypeSlug])

  useEffect(() => {
    fetchAvailability()
  }, [fetchAvailability])

  return {
    availability,
    isLoading,
    error,
    refetch: fetchAvailability,
  }
}

// ============================================================================
// Create Public Booking Hook
// ============================================================================

interface CreateBookingResult {
  booking: RecruiterBooking
  redirect_url: string | null
  confirmation_message: string
  invitation_created: boolean
  signup_url?: string
}

interface UseCreatePublicBookingReturn {
  createBooking: (data: Omit<RecruiterBookingInput, 'meeting_type'>) => Promise<CreateBookingResult>
  isCreating: boolean
  error: string | null
}

export function useCreatePublicBooking(bookingSlug: string, meetingTypeSlug: string): UseCreatePublicBookingReturn {
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createBooking = useCallback(async (data: Omit<RecruiterBookingInput, 'meeting_type'>) => {
    try {
      setIsCreating(true)
      setError(null)
      const response = await api.post(`/scheduling/book/${bookingSlug}/${meetingTypeSlug}/`, data)
      return response.data as CreateBookingResult
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create booking'
      setError(message)
      throw err
    } finally {
      setIsCreating(false)
    }
  }, [bookingSlug, meetingTypeSlug])

  return { createBooking, isCreating, error }
}

// ============================================================================
// Candidate Invitations Hook (for managing booking-triggered invitations)
// ============================================================================

interface UseCandidateInvitationsReturn {
  invitations: CandidateInvitation[]
  isLoading: boolean
  error: string | null
  resendInvitation: (token: string) => Promise<void>
  deleteInvitation: (token: string) => Promise<void>
  isResending: boolean
  isDeleting: boolean
  refetch: () => Promise<void>
}

interface UseCandidateInvitationsOptions {
  enabled?: boolean
}

export function useCandidateInvitations(options: UseCandidateInvitationsOptions = {}): UseCandidateInvitationsReturn {
  const { enabled = true } = options
  const [invitations, setInvitations] = useState<CandidateInvitation[]>([])
  const [isLoading, setIsLoading] = useState(enabled)
  const [isResending, setIsResending] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchInvitations = useCallback(async () => {
    if (!enabled) return
    try {
      setIsLoading(true)
      setError(null)
      const response = await api.get('/auth/candidate-invitations/')
      setInvitations(response.data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load invitations'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [enabled])

  const resendInvitation = useCallback(async (token: string) => {
    try {
      setIsResending(true)
      setError(null)
      const response = await api.post(`/auth/candidate-invitations/${token}/resend/`)
      // Update the invitation in the list with new expiry
      setInvitations((prev) =>
        prev.map((inv) =>
          inv.token === token
            ? { ...inv, expires_at: response.data.expires_at, is_expired: false, is_valid: true }
            : inv
        )
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to resend invitation'
      setError(message)
      throw err
    } finally {
      setIsResending(false)
    }
  }, [])

  const deleteInvitation = useCallback(async (token: string) => {
    try {
      setIsDeleting(true)
      setError(null)
      await api.delete(`/auth/candidate-invitations/${token}/delete/`)
      setInvitations((prev) => prev.filter((inv) => inv.token !== token))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete invitation'
      setError(message)
      throw err
    } finally {
      setIsDeleting(false)
    }
  }, [])

  useEffect(() => {
    fetchInvitations()
  }, [fetchInvitations])

  return {
    invitations,
    isLoading,
    error,
    resendInvitation,
    deleteInvitation,
    isResending,
    isDeleting,
    refetch: fetchInvitations,
  }
}

// ============================================================================
// Dashboard Meeting Type Hook (get meeting type for dashboard scheduling card)
// ============================================================================

import type { RecruiterMeetingTypePublic } from '@/types'

interface UseDashboardMeetingTypeReturn {
  meetingType: RecruiterMeetingTypePublic | null
  isLoading: boolean
  error: string | null
}

export function useDashboardMeetingType(category: 'recruitment' | 'sales'): UseDashboardMeetingTypeReturn {
  const [meetingType, setMeetingType] = useState<RecruiterMeetingTypePublic | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchMeetingType = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const response = await api.get(`/scheduling/meeting-types/dashboard/${category}/`)
        setMeetingType(response.data.meeting_type)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load meeting type'
        setError(message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchMeetingType()
  }, [category])

  return { meetingType, isLoading, error }
}
