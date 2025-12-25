import { useState, type RefObject } from 'react'
import { Loader2, ArrowRight, Clock, Video, Phone, MapPin, User, Calendar, CheckCircle2 } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import type { OnboardingInviter } from '@/services/api'
import type { RecruiterMeetingLocationType } from '@/types'
import { usePublicBookingPage, usePublicAvailability, useCreatePublicBooking } from '@/hooks'
import SlotPicker from '@/components/booking/SlotPicker'

interface BookingStepProps {
  inviter: OnboardingInviter | null
  onSubmit: () => Promise<void>
  onSkip: () => Promise<void>
  isSubmitting: boolean
  previewMode?: boolean
  formRef?: RefObject<HTMLFormElement | null>
}

function getLocationIcon(type: RecruiterMeetingLocationType) {
  switch (type) {
    case 'video':
      return <Video className="w-4 h-4" />
    case 'phone':
      return <Phone className="w-4 h-4" />
    case 'in_person':
      return <MapPin className="w-4 h-4" />
    default:
      return <Video className="w-4 h-4" />
  }
}

export function BookingStep({ inviter, onSubmit, onSkip, isSubmitting, previewMode = false, formRef }: BookingStepProps) {
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [bookingConfirmed, setBookingConfirmed] = useState(false)

  const hasBookingLink = inviter?.booking_slug

  // Fetch meeting types filtered for client onboarding
  const { pageData, isLoading: loadingPage } = usePublicBookingPage(
    hasBookingLink ? inviter.booking_slug : '',
    { onboarding: 'client' }
  )

  // Get the first (and should be only) onboarding meeting type
  const meetingType = pageData?.meeting_types[0]

  // Fetch availability for the meeting type
  const { availability, isLoading: loadingAvailability } = usePublicAvailability(
    hasBookingLink && meetingType ? inviter.booking_slug : '',
    meetingType?.slug || ''
  )

  // Create booking hook
  const { createBooking, isCreating, error: bookingError } = useCreatePublicBooking(
    hasBookingLink ? inviter.booking_slug : '',
    meetingType?.slug || ''
  )

  const handleBookCall = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (previewMode) return
    await onSubmit()
  }

  const handleConfirmBooking = async () => {
    if (!selectedSlot || !availability || previewMode) return

    try {
      await createBooking({
        scheduled_at: selectedSlot,
        timezone: availability.timezone,
      })
      setBookingConfirmed(true)
    } catch {
      // Error is handled by the hook
    }
  }

  const isLoading = loadingPage || loadingAvailability

  // No booking link available
  if (!hasBookingLink) {
    return (
      <form ref={formRef} onSubmit={handleBookCall} className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
          <p className="text-[14px] text-amber-800 mb-3">
            No booking calendar available. Please contact your account manager directly.
          </p>
          {inviter?.email && (
            <a
              href={`mailto:${inviter.email}?subject=Onboarding%20Call%20Request`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-900 text-sm font-medium rounded-lg hover:bg-amber-200 transition-colors"
            >
              Email {inviter.name}
            </a>
          )}
        </div>
        <MobileButtons onSkip={onSkip} isSubmitting={isSubmitting} previewMode={previewMode} />
      </form>
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <form ref={formRef} onSubmit={handleBookCall} className="space-y-4">
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
            <p className="text-[13px] text-gray-500">Loading calendar...</p>
          </div>
        </div>
      </form>
    )
  }

  // No meeting type configured for onboarding
  if (!meetingType) {
    return (
      <form ref={formRef} onSubmit={handleBookCall} className="space-y-4">
        <div className="flex items-center justify-center py-12 px-4">
          <div className="text-center max-w-sm">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h2 className="text-base font-medium text-gray-900 mb-2">No booking calendar available</h2>
            <p className="text-sm text-gray-500">
              No meeting type has been configured for onboarding. Please contact your account manager directly.
            </p>
            {inviter?.email && (
              <a
                href={`mailto:${inviter.email}?subject=Onboarding%20Call%20Request`}
                className="inline-flex items-center gap-2 px-4 py-2 mt-4 bg-gray-100 text-gray-900 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
              >
                Email {inviter.name}
              </a>
            )}
          </div>
        </div>
        <MobileButtons onSkip={onSkip} isSubmitting={isSubmitting} previewMode={previewMode} />
      </form>
    )
  }

  // Booking confirmed - show success
  if (bookingConfirmed && selectedSlot) {
    return (
      <form ref={formRef} onSubmit={handleBookCall} className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Meeting Booked!</h2>
          <p className="text-gray-500 mb-6">
            Your {meetingType.name} has been scheduled.
          </p>

          <div className="bg-gray-50 rounded-lg p-4 text-left space-y-3 max-w-sm mx-auto">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <span className="text-gray-700">
                {format(parseISO(selectedSlot), 'EEEE, MMMM d, yyyy')}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-gray-400" />
              <span className="text-gray-700">
                {format(parseISO(selectedSlot), 'h:mm a')} ({meetingType.duration_minutes} min)
              </span>
            </div>
            <div className="flex items-center gap-3">
              {getLocationIcon(meetingType.location_type)}
              <span className="text-gray-700">{meetingType.location_type_display}</span>
            </div>
          </div>
        </div>

        {/* Mobile Buttons */}
        <MobileButtons onSkip={onSkip} isSubmitting={isSubmitting} previewMode={previewMode} />
      </form>
    )
  }

  return (
    <form ref={formRef} onSubmit={handleBookCall} className="space-y-6">
      {/* Meeting Type Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-start gap-4">
          {meetingType.owner_avatar ? (
            <img
              src={meetingType.owner_avatar}
              alt={meetingType.owner_name}
              className="w-14 h-14 rounded-full object-cover"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
              <User className="w-7 h-7 text-gray-400" />
            </div>
          )}
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{meetingType.name}</h2>
            <p className="text-[14px] text-gray-500 mt-0.5">
              with {meetingType.owner_name}
            </p>
          </div>
        </div>

        {meetingType.description && (
          <p className="text-[14px] text-gray-600 mt-4">{meetingType.description}</p>
        )}

        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-6">
          <span className="flex items-center gap-2 text-[14px] text-gray-500">
            <Clock className="w-4 h-4" />
            {meetingType.duration_minutes} minutes
          </span>
          <span className="flex items-center gap-2 text-[14px] text-gray-500">
            {getLocationIcon(meetingType.location_type)}
            {meetingType.location_type_display}
          </span>
        </div>
      </div>

      {/* Slot Picker */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Select a time</h3>

        {availability ? (
          <>
            <SlotPicker
              slots={availability.available_slots}
              selected={selectedSlot}
              onSelect={setSelectedSlot}
              duration={meetingType.duration_minutes}
              timezone={availability.timezone}
              forceColumns
            />

            {/* Confirm Booking Button */}
            <div className="mt-6">
              {bookingError && (
                <p className="text-sm text-red-600 mb-3">{bookingError}</p>
              )}
              <button
                type="button"
                onClick={handleConfirmBooking}
                disabled={!selectedSlot || isCreating}
                className="w-full py-3 px-4 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Booking...
                  </>
                ) : (
                  'Confirm Booking'
                )}
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">Unable to load availability</p>
          </div>
        )}
      </div>

      {/* Mobile Buttons */}
      <MobileButtons onSkip={onSkip} isSubmitting={isSubmitting} previewMode={previewMode} />
    </form>
  )
}

function MobileButtons({
  onSkip,
  isSubmitting,
  previewMode
}: {
  onSkip: () => Promise<void>
  isSubmitting: boolean
  previewMode: boolean
}) {
  return (
    <div className="pt-2 flex gap-3 lg:hidden">
      <button
        type="button"
        onClick={onSkip}
        disabled={isSubmitting || previewMode}
        className="flex-1 py-2.5 px-4 text-gray-700 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Skip for now
      </button>
      <button
        type="submit"
        disabled={isSubmitting || previewMode}
        className="flex-1 py-2.5 px-4 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            Continue
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </div>
  )
}
