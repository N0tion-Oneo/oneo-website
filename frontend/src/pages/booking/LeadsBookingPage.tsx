import { useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
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
  Building2,
} from 'lucide-react'
import {
  usePublicAvailability,
  useCreatePublicBooking,
  usePublicBranding,
} from '@/hooks'
import { useTheme } from '@/contexts/ThemeContext'
import type { RecruiterMeetingLocationType } from '@/types'
import SlotPicker from '@/components/booking/SlotPicker'

function getLocationIcon(type: RecruiterMeetingLocationType) {
  switch (type) {
    case 'video':
      return <Video className="w-5 h-5" />
    case 'phone':
      return <Phone className="w-5 h-5" />
    case 'in_person':
      return <MapPin className="w-5 h-5" />
    default:
      return <Video className="w-5 h-5" />
  }
}

function getLocationLabel(type: RecruiterMeetingLocationType) {
  switch (type) {
    case 'video':
      return 'Video Call'
    case 'phone':
      return 'Phone Call'
    case 'in_person':
      return 'In Person'
    default:
      return 'Video Call'
  }
}

export default function LeadsBookingPage() {
  const { bookingSlug, meetingTypeSlug } = useParams<{
    bookingSlug: string
    meetingTypeSlug: string
  }>()
  const [searchParams] = useSearchParams()

  // Get branding for logo
  const { branding } = usePublicBranding()
  const { isDark } = useTheme()
  const logoUrl = isDark && branding?.logo_dark_url ? branding.logo_dark_url : branding?.logo_url

  const { availability, isLoading, error } = usePublicAvailability(
    bookingSlug || '',
    meetingTypeSlug || ''
  )
  const { createBooking, isCreating, error: createError } = useCreatePublicBooking(
    bookingSlug || '',
    meetingTypeSlug || ''
  )

  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [step, setStep] = useState<'slots' | 'form' | 'success'>('slots')
  const [formData, setFormData] = useState({
    attendee_name: searchParams.get('name') || '',
    attendee_email: searchParams.get('email') || '',
    attendee_phone: searchParams.get('phone') || '',
    attendee_company: searchParams.get('company') || '',
  })
  const [bookingResult, setBookingResult] = useState<{
    scheduled_at: string
    confirmation_message?: string
  } | null>(null)

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSlot || !availability) return

    try {
      const result = await createBooking({
        ...formData,
        scheduled_at: selectedSlot,
        timezone: availability.timezone,
      })

      setBookingResult({
        scheduled_at: selectedSlot,
        confirmation_message: result.confirmation_message,
      })
      setStep('success')
    } catch {
      // Error handled by hook
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Loading availability...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !availability) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/40 border border-gray-200 dark:border-gray-700 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-500" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Unable to Load</h1>
          <p className="text-gray-500 dark:text-gray-400">
            {error || 'Could not load availability. Please try again later.'}
          </p>
        </div>
      </div>
    )
  }

  const { meeting_type } = availability

  // Success state
  if (step === 'success' && bookingResult) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/40 border border-gray-200 dark:border-gray-700 p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">You're all set!</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8">
            {bookingResult.confirmation_message || 'Your meeting has been scheduled successfully.'}
          </p>

          <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-5 text-left space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Date</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {format(parseISO(bookingResult.scheduled_at), 'EEEE, MMMM d, yyyy')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 flex items-center justify-center">
                <Clock className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Time</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {format(parseISO(bookingResult.scheduled_at), 'h:mm a')} ({meeting_type.duration_minutes} min)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 flex items-center justify-center">
                {getLocationIcon(meeting_type.location_type)}
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Location</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">{getLocationLabel(meeting_type.location_type)}</p>
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-400 mt-6">
            A calendar invite has been sent to your email.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 flex bg-white dark:bg-gray-900">
      {/* Left Panel - Meeting Info */}
      <div className="hidden lg:flex lg:w-[420px] xl:w-[480px] flex-col bg-gray-900 text-white relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
        </div>

        {/* Content */}
        <div className="relative flex-1 flex flex-col p-8 xl:p-10">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            {branding?.logo_dark_url ? (
              <img src={branding.logo_dark_url} alt={branding.company_name} className="h-8" />
            ) : (
              <>
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
                  <span className="text-gray-900 font-bold text-lg">O</span>
                </div>
                <span className="text-xl font-semibold">{branding?.company_name || 'Oneo'}</span>
              </>
            )}
          </div>

          {/* Host Info */}
          <div className="flex items-center gap-4 mb-8">
            {meeting_type.owner_avatar ? (
              <img
                src={meeting_type.owner_avatar}
                alt={meeting_type.owner_name}
                className="w-16 h-16 rounded-full object-cover ring-2 ring-white/20"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center ring-2 ring-white/20">
                <User className="w-8 h-8 text-white/60" />
              </div>
            )}
            <div>
              <p className="text-sm text-gray-400">Meet with</p>
              <p className="text-lg font-semibold">{meeting_type.owner_name}</p>
            </div>
          </div>

          {/* Meeting Name */}
          <h1 className="text-2xl xl:text-3xl font-bold mb-3">{meeting_type.name}</h1>

          {/* Description */}
          {meeting_type.description && (
            <p className="text-gray-400 mb-8 leading-relaxed">{meeting_type.description}</p>
          )}

          {/* Meeting Details */}
          <div className="space-y-4 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-white/80" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Duration</p>
                <p className="font-medium">{meeting_type.duration_minutes} minutes</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                {getLocationIcon(meeting_type.location_type)}
              </div>
              <div>
                <p className="text-sm text-gray-500">Location</p>
                <p className="font-medium">{getLocationLabel(meeting_type.location_type)}</p>
              </div>
            </div>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Trust signals */}
          <div className="pt-8 border-t border-white/10">
            <div className="flex items-center gap-3 text-sm text-gray-400">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <span>Free consultation, no commitment</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Booking Form */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden bg-gray-50 dark:bg-gray-800">
        {/* Mobile Header */}
        <div className="lg:hidden flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            {logoUrl ? (
              <img src={logoUrl} alt={branding?.company_name} className="h-6" />
            ) : (
              <>
                <div className="w-8 h-8 bg-gray-900 dark:bg-gray-100 rounded-lg flex items-center justify-center">
                  <span className="text-white dark:text-gray-900 font-bold text-sm">O</span>
                </div>
                <span className="font-semibold text-gray-900 dark:text-gray-100">{branding?.company_name || 'Oneo'}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            {meeting_type.owner_avatar ? (
              <img
                src={meeting_type.owner_avatar}
                alt={meeting_type.owner_name}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <User className="w-5 h-5 text-gray-400" />
              </div>
            )}
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">{meeting_type.name}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {meeting_type.duration_minutes} min · {getLocationLabel(meeting_type.location_type)}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
            {step === 'slots' && (
              <>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">Select a date & time</h2>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/40 border border-gray-200 dark:border-gray-700 p-6">
                  <SlotPicker
                    slots={availability.available_slots}
                    selected={selectedSlot}
                    onSelect={setSelectedSlot}
                    duration={meeting_type.duration_minutes}
                    timezone={availability.timezone}
                  />

                  <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
                    <button
                      type="button"
                      onClick={() => setStep('form')}
                      disabled={!selectedSlot}
                      className="w-full py-3 px-4 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Continue
                    </button>
                  </div>

                  {selectedSlot && (
                    <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
                      {format(parseISO(selectedSlot), 'EEEE, MMMM d')} at{' '}
                      {format(parseISO(selectedSlot), 'h:mm a')}
                    </p>
                  )}
                </div>
              </>
            )}

            {step === 'form' && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Enter your details</h2>
                  <button
                    type="button"
                    onClick={() => setStep('slots')}
                    className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    Change time
                  </button>
                </div>

                {/* Selected time summary */}
                {selectedSlot && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {format(parseISO(selectedSlot), 'EEEE, MMMM d, yyyy')}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {format(parseISO(selectedSlot), 'h:mm a')} · {meeting_type.duration_minutes} min
                      </p>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/40 border border-gray-200 dark:border-gray-700 p-6 space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Name *
                    </label>
                    <input
                      type="text"
                      name="attendee_name"
                      value={formData.attendee_name}
                      onChange={handleFormChange}
                      required
                      className="w-full px-4 py-3 text-[15px] border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent"
                      placeholder="Your full name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Email *
                    </label>
                    <input
                      type="email"
                      name="attendee_email"
                      value={formData.attendee_email}
                      onChange={handleFormChange}
                      required
                      className="w-full px-4 py-3 text-[15px] border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent"
                      placeholder="you@company.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Phone *
                    </label>
                    <input
                      type="tel"
                      name="attendee_phone"
                      value={formData.attendee_phone}
                      onChange={handleFormChange}
                      required
                      className="w-full px-4 py-3 text-[15px] border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent"
                      placeholder="+27 XX XXX XXXX"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Company *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Building2 className="w-5 h-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        name="attendee_company"
                        value={formData.attendee_company}
                        onChange={handleFormChange}
                        required
                        className="w-full pl-12 pr-4 py-3 text-[15px] border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent"
                        placeholder="Your company name"
                      />
                    </div>
                  </div>

                  {createError && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-red-700 dark:text-red-400">{createError}</span>
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isCreating}
                      className="w-full py-3.5 px-4 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
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
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
