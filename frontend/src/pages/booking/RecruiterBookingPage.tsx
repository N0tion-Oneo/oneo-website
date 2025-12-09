import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Video,
  Phone,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react'
import {
  usePublicBookingPage,
  usePublicAvailability,
  useCreatePublicBooking,
} from '@/hooks'
import { useAuth } from '@/contexts/AuthContext'
import type {
  RecruiterMeetingTypePublic,
  RecruiterMeetingLocationType,
} from '@/types'
import SlotPicker from '@/components/booking/SlotPicker'

// Location icon based on type
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

// Meeting Type Card
function MeetingTypeCard({
  meetingType,
  bookingSlug,
}: {
  meetingType: RecruiterMeetingTypePublic
  bookingSlug: string
}) {
  return (
    <Link
      to={`/meet/${bookingSlug}/${meetingType.slug}`}
      className="block bg-white border border-gray-200 rounded-lg p-5 hover:border-gray-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div
            className="w-2 h-2 rounded-full mb-3"
            style={{ backgroundColor: meetingType.color }}
          />
          <h3 className="text-[16px] font-medium text-gray-900 mb-1">
            {meetingType.name}
          </h3>
          {meetingType.description && (
            <p className="text-[13px] text-gray-500 line-clamp-2 mb-3">
              {meetingType.description}
            </p>
          )}
          <div className="flex items-center gap-4 text-[13px] text-gray-500">
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {meetingType.duration_minutes} min
            </span>
            <span className="flex items-center gap-1.5">
              {getLocationIcon(meetingType.location_type)}
              {meetingType.location_type_display}
            </span>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
      </div>
    </Link>
  )
}

// Main Booking Page Component
export default function RecruiterBookingPage() {
  const { bookingSlug, meetingTypeSlug } = useParams<{
    bookingSlug: string
    meetingTypeSlug?: string
  }>()

  // If no meeting type slug, show the list of meeting types
  if (!meetingTypeSlug) {
    return <RecruiterBookingList bookingSlug={bookingSlug!} />
  }

  // Show the booking form for specific meeting type
  return <RecruiterBookingForm bookingSlug={bookingSlug!} meetingTypeSlug={meetingTypeSlug} />
}

// List of meeting types for a recruiter
function RecruiterBookingList({ bookingSlug }: { bookingSlug: string }) {
  const { pageData, isLoading, error } = usePublicBookingPage(bookingSlug)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  if (error || !pageData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Page Not Found</h1>
          <p className="text-gray-500">
            This booking page doesn't exist or is no longer available.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 sm:py-12 px-4">
      <div className="max-w-lg mx-auto">
        {/* Recruiter Profile Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6 text-center">
          {pageData.user.avatar ? (
            <img
              src={pageData.user.avatar}
              alt={pageData.user.name}
              className="w-20 h-20 rounded-full object-cover mx-auto mb-4"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <User className="w-10 h-10 text-gray-400" />
            </div>
          )}
          <h1 className="text-xl font-semibold text-gray-900">{pageData.user.name}</h1>
          {pageData.user.professional_title && (
            <p className="text-[14px] text-gray-500 mt-1">
              {pageData.user.professional_title}
            </p>
          )}
          {pageData.user.bio && (
            <p className="text-[13px] text-gray-500 mt-3 max-w-sm mx-auto">
              {pageData.user.bio}
            </p>
          )}
        </div>

        {/* Meeting Types */}
        <div className="space-y-3">
          <h2 className="text-[14px] font-medium text-gray-700 px-1">
            Select a meeting type
          </h2>
          {pageData.meeting_types.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
              <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-[14px] text-gray-500">
                No meeting types available at this time.
              </p>
            </div>
          ) : (
            pageData.meeting_types.map((mt) => (
              <MeetingTypeCard key={mt.id} meetingType={mt} bookingSlug={pageData.user.booking_slug} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// Booking form for a specific meeting type
function RecruiterBookingForm({
  bookingSlug,
  meetingTypeSlug,
}: {
  bookingSlug: string
  meetingTypeSlug: string
}) {
  const { user, isAuthenticated } = useAuth()
  const { availability, isLoading, error } = usePublicAvailability(bookingSlug, meetingTypeSlug)
  const { createBooking, isCreating, error: createError } = useCreatePublicBooking(
    bookingSlug,
    meetingTypeSlug
  )

  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [step, setStep] = useState<'slots' | 'form' | 'confirm' | 'success'>('slots')
  const [formData, setFormData] = useState({
    attendee_name: '',
    attendee_email: '',
    attendee_phone: '',
    attendee_company: '',
  })
  const [bookingResult, setBookingResult] = useState<{
    redirect_url: string | null
    confirmation_message: string
    scheduled_at: string
    invitation_created?: boolean
    signup_url?: string
  } | null>(null)

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  // Handle slot selection - for authenticated users, go to confirm step instead of form
  const handleContinueFromSlots = () => {
    if (isAuthenticated) {
      setStep('confirm')
    } else {
      setStep('form')
    }
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!selectedSlot) return

    try {
      // For authenticated users, we don't need to send form data
      const bookingData = isAuthenticated
        ? {
            scheduled_at: selectedSlot,
            timezone: availability?.timezone || 'Africa/Johannesburg',
          }
        : {
            ...formData,
            scheduled_at: selectedSlot,
            timezone: availability?.timezone || 'Africa/Johannesburg',
          }

      const result = await createBooking(bookingData)

      // If invitation was created, redirect to signup page immediately
      if (result.invitation_created && result.signup_url) {
        window.location.href = result.signup_url
        return
      }

      setBookingResult({
        redirect_url: result.redirect_url,
        confirmation_message: result.confirmation_message,
        scheduled_at: selectedSlot,
        invitation_created: result.invitation_created,
        signup_url: result.signup_url,
      })
      setStep('success')

      // Redirect if URL provided
      if (result.redirect_url) {
        setTimeout(() => {
          window.location.href = result.redirect_url!
        }, 3000)
      }
    } catch {
      // Error handled by hook
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Loading availability...</p>
        </div>
      </div>
    )
  }

  if (error || !availability) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load</h1>
          <p className="text-gray-500">
            {error || 'Could not load availability. Please try again later.'}
          </p>
          <Link
            to={`/meet/${bookingSlug}`}
            className="inline-flex items-center gap-2 mt-6 text-[14px] text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to meeting types
          </Link>
        </div>
      </div>
    )
  }

  const { meeting_type } = availability

  // Success state
  if (step === 'success' && bookingResult) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Booking Confirmed!</h1>
          <p className="text-gray-500 mb-6">
            {bookingResult.confirmation_message ||
              `Your ${meeting_type.name} has been scheduled successfully.`}
          </p>

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
                {meeting_type.duration_minutes} minutes)
              </span>
            </div>
            <div className="flex items-center gap-3">
              {getLocationIcon(meeting_type.location_type)}
              <span className="text-gray-700">{meeting_type.location_type_display}</span>
            </div>
          </div>

          {bookingResult.redirect_url && (
            <p className="text-sm text-gray-500 mt-6">Redirecting you shortly...</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 sm:py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Back link */}
        <Link
          to={`/meet/${bookingSlug}`}
          className="inline-flex items-center gap-2 mb-6 text-[14px] text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to meeting types
        </Link>

        {/* Meeting Type Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start gap-4">
            {meeting_type.owner_avatar ? (
              <img
                src={meeting_type.owner_avatar}
                alt={meeting_type.owner_name}
                className="w-14 h-14 rounded-full object-cover"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
                <User className="w-7 h-7 text-gray-400" />
              </div>
            )}
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{meeting_type.name}</h1>
              <p className="text-[14px] text-gray-500 mt-0.5">
                with {meeting_type.owner_name}
              </p>
            </div>
          </div>

          {meeting_type.description && (
            <p className="text-[14px] text-gray-600 mt-4">{meeting_type.description}</p>
          )}

          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-6">
            <span className="flex items-center gap-2 text-[14px] text-gray-500">
              <Clock className="w-4 h-4" />
              {meeting_type.duration_minutes} minutes
            </span>
            <span className="flex items-center gap-2 text-[14px] text-gray-500">
              {getLocationIcon(meeting_type.location_type)}
              {meeting_type.location_type_display}
            </span>
          </div>
        </div>

        {/* Step: Select Time Slot */}
        {step === 'slots' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Select a time</h2>

            <SlotPicker
              slots={availability.available_slots}
              selected={selectedSlot}
              onSelect={setSelectedSlot}
              duration={meeting_type.duration_minutes}
              timezone={availability.timezone}
            />

            <div className="mt-6">
              <button
                type="button"
                onClick={handleContinueFromSlots}
                disabled={!selectedSlot}
                className="w-full py-3 px-4 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Continue
              </button>
            </div>

            {selectedSlot && (
              <p className="text-center text-sm text-gray-500 mt-3">
                Selected: {format(parseISO(selectedSlot), 'EEEE, MMMM d')} at{' '}
                {format(parseISO(selectedSlot), 'h:mm a')}
              </p>
            )}
          </div>
        )}

        {/* Step: Enter Details */}
        {step === 'form' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Enter your details</h2>
              <button
                type="button"
                onClick={() => setStep('slots')}
                className="text-[14px] text-gray-600 hover:text-gray-900"
              >
                Change time
              </button>
            </div>

            {selectedSlot && (
              <div className="bg-gray-50 rounded-lg p-3 mb-6 flex items-center gap-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <span className="text-[14px] text-gray-700">
                  {format(parseISO(selectedSlot), 'EEEE, MMMM d, yyyy')} at{' '}
                  {format(parseISO(selectedSlot), 'h:mm a')}
                </span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                  Name *
                </label>
                <input
                  type="text"
                  name="attendee_name"
                  value={formData.attendee_name}
                  onChange={handleFormChange}
                  required
                  className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder="Your full name"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                  Email *
                </label>
                <input
                  type="email"
                  name="attendee_email"
                  value={formData.attendee_email}
                  onChange={handleFormChange}
                  required
                  className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                  Phone *
                </label>
                <input
                  type="tel"
                  name="attendee_phone"
                  value={formData.attendee_phone}
                  onChange={handleFormChange}
                  required
                  className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder="+27 XX XXX XXXX"
                />
              </div>

              {/* Only show company field for sales meetings */}
              {meeting_type.category === 'sales' && (
                <div>
                  <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                    Company
                  </label>
                  <input
                    type="text"
                    name="attendee_company"
                    value={formData.attendee_company}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    placeholder="Your company name"
                  />
                </div>
              )}

              {createError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-red-700">{createError}</span>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isCreating}
                  className="w-full py-3 px-4 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Scheduling...
                    </>
                  ) : (
                    'Schedule Meeting'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step: Confirm (for authenticated users) */}
        {step === 'confirm' && user && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Confirm your booking</h2>
              <button
                type="button"
                onClick={() => setStep('slots')}
                className="text-[14px] text-gray-600 hover:text-gray-900"
              >
                Change time
              </button>
            </div>

            {selectedSlot && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <span className="text-[14px] text-gray-700">
                    {format(parseISO(selectedSlot), 'EEEE, MMMM d, yyyy')} at{' '}
                    {format(parseISO(selectedSlot), 'h:mm a')}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-gray-400" />
                  <span className="text-[14px] text-gray-700">
                    {meeting_type.duration_minutes} minutes
                  </span>
                </div>
              </div>
            )}

            {/* Show user's details */}
            <div className="border border-gray-200 rounded-lg p-4 mb-6">
              <p className="text-[12px] font-medium text-gray-500 uppercase tracking-wide mb-3">
                Booking as
              </p>
              <div className="flex items-center gap-3">
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={`${user.first_name} ${user.last_name}`}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                    <User className="w-5 h-5 text-gray-400" />
                  </div>
                )}
                <div>
                  <p className="text-[14px] font-medium text-gray-900">
                    {user.first_name} {user.last_name}
                  </p>
                  <p className="text-[13px] text-gray-500">{user.email}</p>
                </div>
              </div>
            </div>

            {createError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 mb-4">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-red-700">{createError}</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={isCreating}
              className="w-full py-3 px-4 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Scheduling...
                </>
              ) : (
                'Confirm Booking'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
