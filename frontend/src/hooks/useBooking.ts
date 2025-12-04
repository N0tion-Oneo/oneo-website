import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'
import { AxiosError } from 'axios'

// Types
export interface BookingInfo {
  company_name: string
  company_logo: string | null
  job_title: string
  stage_name: string
  stage_type: string
  duration_minutes: number
  interviewer_name: string | null
  location: string
  available_slots: Array<{ start: string; end: string }>
  expires_at: string
  timezone: string
}

export interface BookingResult {
  success: boolean
  scheduled_at: string
  duration_minutes: number
  meeting_link: string | null
  location: string | null
  message: string
}

export interface SendBookingLinkResult {
  booking_url: string
  expires_at: string
  message: string
}

// Hooks

/**
 * Fetch booking info and available slots for a booking token.
 * This is a public endpoint that doesn't require authentication.
 */
export function useBookingInfo(token: string | undefined) {
  const query = useQuery({
    queryKey: ['booking', token],
    queryFn: async () => {
      const response = await api.get<BookingInfo>(`/jobs/booking/${token}/`)
      return response.data
    },
    enabled: !!token,
    retry: false, // Don't retry on 404/410
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  const axiosError = query.error as AxiosError<{ error: string }> | null
  return {
    bookingInfo: query.data,
    isLoading: query.isLoading,
    error: query.error,
    isExpired: axiosError?.response?.status === 410,
    isNotFound: axiosError?.response?.status === 404,
  }
}

/**
 * Book a specific time slot.
 * This is a public endpoint that doesn't require authentication.
 */
export function useBookSlot() {
  const mutation = useMutation({
    mutationFn: async ({
      token,
      scheduledAt,
    }: {
      token: string
      scheduledAt: string
    }) => {
      const response = await api.post<BookingResult>(`/jobs/booking/${token}/book/`, {
        scheduled_at: scheduledAt,
      })
      return response.data
    },
  })

  return {
    bookSlot: mutation.mutateAsync,
    isBooking: mutation.isPending,
    error: mutation.error,
    bookingResult: mutation.data,
    reset: mutation.reset,
  }
}

/**
 * Send a booking link to a candidate for self-scheduling.
 * This is an authenticated endpoint for recruiters/company admins.
 */
export function useSendBookingLink() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async ({
      applicationId,
      stageId,
      interviewerId,
    }: {
      applicationId: string
      stageId: string
      interviewerId: string
    }) => {
      const response = await api.post<SendBookingLinkResult>(
        `/jobs/applications/${applicationId}/stages/${stageId}/send-booking-link/`,
        { interviewer_id: interviewerId }
      )
      return response.data
    },
    onSuccess: (_, variables) => {
      // Invalidate stage instances to reflect the booking link was sent
      queryClient.invalidateQueries({
        queryKey: ['stageInstances', variables.applicationId],
      })
    },
  })

  return {
    sendBookingLink: mutation.mutateAsync,
    isSending: mutation.isPending,
    error: mutation.error,
    result: mutation.data,
    reset: mutation.reset,
  }
}
