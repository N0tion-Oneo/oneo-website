import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Video,
  Building2,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { useBookingInfo, useBookSlot } from '@/hooks/useBooking'
import SlotPicker from '@/components/booking/SlotPicker'

export default function BookingPage() {
  const { token } = useParams<{ token: string }>()
  const { bookingInfo, isLoading, error, isExpired, isNotFound } = useBookingInfo(token)
  const { bookSlot, isBooking, bookingResult, error: bookError } = useBookSlot()
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)

  // Handle booking confirmation
  const handleConfirmBooking = async () => {
    if (!selectedSlot || !token) return

    try {
      await bookSlot({ token, scheduledAt: selectedSlot })
    } catch {
      // Error handled by hook
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Loading booking information...</p>
        </div>
      </div>
    )
  }

  // Error: Token expired
  if (isExpired) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-amber-600" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Booking Link Expired</h1>
          <p className="text-gray-500">
            This booking link has expired or has already been used. Please contact the recruiter to
            request a new booking link.
          </p>
        </div>
      </div>
    )
  }

  // Error: Token not found
  if (isNotFound || error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Booking Link Not Found</h1>
          <p className="text-gray-500">
            This booking link is invalid or no longer exists. Please check the link or contact the
            recruiter.
          </p>
        </div>
      </div>
    )
  }

  // Success: Booking confirmed
  if (bookingResult?.success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Interview Scheduled!</h1>
          <p className="text-gray-500 mb-6">{bookingResult.message}</p>

          <div className="bg-gray-50 rounded-lg p-4 text-left space-y-3">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <span className="text-gray-700">
                {format(parseISO(bookingResult.scheduled_at), 'EEEE, MMMM d, yyyy')}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-gray-400" />
              <span className="text-gray-700">
                {format(parseISO(bookingResult.scheduled_at), 'h:mm a')} (
                {bookingResult.duration_minutes} minutes)
              </span>
            </div>
            {bookingResult.meeting_link && (
              <div className="flex items-center gap-3">
                <Video className="w-5 h-5 text-gray-400" />
                <a
                  href={bookingResult.meeting_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline truncate"
                >
                  Join meeting link
                </a>
              </div>
            )}
            {bookingResult.location && (
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-gray-400" />
                <span className="text-gray-700">{bookingResult.location}</span>
              </div>
            )}
          </div>

          <p className="text-sm text-gray-500 mt-6">
            A calendar invite has been sent to your email with all the details.
          </p>
        </div>
      </div>
    )
  }

  // Main booking form
  if (!bookingInfo) return null

  return (
    <div className="min-h-screen bg-gray-50 py-8 sm:py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header with company info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start gap-4">
            {bookingInfo.company_logo ? (
              <img
                src={bookingInfo.company_logo}
                alt={bookingInfo.company_name}
                className="w-14 h-14 rounded-lg object-cover"
              />
            ) : (
              <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center">
                <Building2 className="w-7 h-7 text-gray-400" />
              </div>
            )}
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Schedule your {bookingInfo.stage_name}
              </h1>
              <div className="flex items-center gap-2 mt-1 text-gray-500">
                <Briefcase className="w-4 h-4" />
                <span>
                  {bookingInfo.job_title} at {bookingInfo.company_name}
                </span>
              </div>
            </div>
          </div>

          {/* Interview details */}
          <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-gray-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Duration</p>
                <p className="font-medium text-gray-900">{bookingInfo.duration_minutes} minutes</p>
              </div>
            </div>
            {bookingInfo.interviewer_name && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                  <User className="w-5 h-5 text-gray-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">With</p>
                  <p className="font-medium text-gray-900">{bookingInfo.interviewer_name}</p>
                </div>
              </div>
            )}
            {bookingInfo.location && (
              <div className="flex items-center gap-3 col-span-2">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-gray-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Location</p>
                  <p className="font-medium text-gray-900">{bookingInfo.location}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Time slot selection */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Select a time</h2>

          <SlotPicker
            slots={bookingInfo.available_slots}
            selected={selectedSlot}
            onSelect={setSelectedSlot}
            duration={bookingInfo.duration_minutes}
            timezone={bookingInfo.timezone}
          />

          {/* Error message */}
          {bookError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-red-700">
                {(bookError as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to book this time slot. Please try again.'}
              </span>
            </div>
          )}

          {/* Confirm button */}
          <div className="mt-6">
            <button
              type="button"
              onClick={handleConfirmBooking}
              disabled={!selectedSlot || isBooking}
              className="w-full py-3 px-4 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isBooking ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Confirming...
                </>
              ) : (
                'Confirm Booking'
              )}
            </button>
          </div>

          {/* Selected time preview */}
          {selectedSlot && (
            <p className="text-center text-sm text-gray-500 mt-3">
              Selected: {format(parseISO(selectedSlot), 'EEEE, MMMM d')} at{' '}
              {format(parseISO(selectedSlot), 'h:mm a')}
            </p>
          )}
        </div>

        {/* Expiration notice */}
        <p className="text-center text-xs text-gray-400 mt-6">
          This booking link expires on {format(parseISO(bookingInfo.expires_at), 'MMMM d, yyyy')}
        </p>
      </div>
    </div>
  )
}
