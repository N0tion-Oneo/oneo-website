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
  Sparkles,
  Users,
  Target,
  Zap,
  PartyPopper,
} from 'lucide-react'
import {
  usePublicAvailability,
  useCreatePublicBooking,
  usePublicBranding,
} from '@/hooks'
import type { RecruiterMeetingLocationType } from '@/types'
import SlotPicker from '@/components/booking/SlotPicker'

function getLocationIcon(type: RecruiterMeetingLocationType, className = 'w-5 h-5') {
  switch (type) {
    case 'video':
      return <Video className={className} />
    case 'phone':
      return <Phone className={className} />
    case 'in_person':
      return <MapPin className={className} />
    default:
      return <Video className={className} />
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

// Progress step component
function ProgressStep({
  label,
  isComplete,
  isCurrent,
  accentColor,
}: {
  label: string
  isComplete: boolean
  isCurrent: boolean
  accentColor: string
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
          isComplete
            ? 'text-white'
            : isCurrent
              ? 'text-white ring-2 ring-white/30'
              : 'bg-white/20 text-white/60'
        }`}
        style={isComplete || isCurrent ? { backgroundColor: accentColor } : {}}
      >
        {isComplete ? <CheckCircle2 className="w-4 h-4" /> : isCurrent ? <Sparkles className="w-3 h-3" /> : '○'}
      </div>
      <span className={`text-sm ${isComplete || isCurrent ? 'text-white font-medium' : 'text-white/60'}`}>
        {label}
      </span>
    </div>
  )
}

export default function OnboardingBookingPage() {
  const { bookingSlug, meetingTypeSlug } = useParams<{
    bookingSlug: string
    meetingTypeSlug: string
  }>()
  const [searchParams] = useSearchParams()

  // Get branding for accent color
  const { branding } = usePublicBranding()
  const accentColor = branding?.accent_color || '#8B5CF6' // Default to purple

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
      <div
        className="fixed inset-0 flex items-center justify-center dark:bg-gray-900"
        style={{ background: `linear-gradient(135deg, ${accentColor}15 0%, ${accentColor}05 100%)` }}
      >
        <div className="text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse"
            style={{ backgroundColor: `${accentColor}20` }}
          >
            <Sparkles className="w-8 h-8" style={{ color: accentColor }} />
          </div>
          <p className="text-gray-600 dark:text-gray-400 font-medium">Loading your booking experience...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !availability) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl dark:shadow-gray-900/40 border border-gray-200 dark:border-gray-700 p-8 text-center">
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

  // Success state - Celebration!
  if (step === 'success' && bookingResult) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center p-4 dark:bg-gray-900"
        style={{ background: `linear-gradient(135deg, ${accentColor}20 0%, ${accentColor}05 50%, white 100%)` }}
      >
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl dark:shadow-gray-900/40 border border-gray-100 dark:border-gray-700 p-8 text-center relative overflow-hidden">
          {/* Decorative elements */}
          <div
            className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-30"
            style={{ backgroundColor: accentColor }}
          />
          <div
            className="absolute bottom-0 left-0 w-24 h-24 rounded-full blur-2xl opacity-20"
            style={{ backgroundColor: accentColor }}
          />

          <div className="relative">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6"
              style={{ backgroundColor: `${accentColor}15` }}
            >
              <PartyPopper className="w-10 h-10" style={{ color: accentColor }} />
            </div>

            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">You're all set!</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-8">
              We can't wait to meet you and start this exciting journey together.
            </p>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-5 text-left space-y-4">
              <div className="flex items-center gap-4">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${accentColor}15` }}
                >
                  <Calendar className="w-5 h-5" style={{ color: accentColor }} />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Date</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {format(parseISO(bookingResult.scheduled_at), 'EEEE, MMMM d, yyyy')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${accentColor}15` }}
                >
                  <Clock className="w-5 h-5" style={{ color: accentColor }} />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Time</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {format(parseISO(bookingResult.scheduled_at), 'h:mm a')} ({meeting_type.duration_minutes} min)
                  </p>
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-400 mt-6">
              A calendar invite is on its way to your inbox!
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 flex bg-white dark:bg-gray-900">
      {/* Left Panel - Energetic & Exciting */}
      <div
        className="hidden lg:flex lg:w-[440px] xl:w-[500px] flex-col relative overflow-hidden"
        style={{ backgroundColor: accentColor }}
      >
        {/* Content */}
        <div className="relative flex-1 flex flex-col p-8 xl:p-10 text-white">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-10">
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

          {/* Progress Steps */}
          <div className="flex items-center gap-4 mb-10">
            <ProgressStep label="Signed Up" isComplete={true} isCurrent={false} accentColor="white" />
            <div className="w-8 h-px bg-white/30" />
            <ProgressStep label="Book Call" isComplete={false} isCurrent={true} accentColor="white" />
            <div className="w-8 h-px bg-white/30" />
            <ProgressStep label="Start Hiring" isComplete={false} isCurrent={false} accentColor="white" />
          </div>

          {/* Main Headline */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/20 rounded-full text-sm font-medium mb-4">
              <Sparkles className="w-4 h-4" />
              Almost there!
            </div>
            <h1 className="text-3xl xl:text-4xl font-bold mb-3 leading-tight">
              Let's get you<br />started!
            </h1>
            <p className="text-white/80 text-lg">
              Book your onboarding call and we'll map out your path to hiring success.
            </p>
          </div>

          {/* What you'll get */}
          <div className="space-y-4 mb-8">
            <p className="text-sm font-medium text-white/60 uppercase tracking-wide">What you'll get</p>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <Target className="w-4 h-4" />
                </div>
                <span className="text-white/90">Personalized hiring strategy</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <Zap className="w-4 h-4" />
                </div>
                <span className="text-white/90">Full platform walkthrough</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <span className="text-white/90">Meet your dedicated team</span>
              </div>
            </div>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Host Info */}
          <div className="pt-6 border-t border-white/20">
            <p className="text-sm text-white/60 mb-3">You'll be meeting with</p>
            <div className="flex items-center gap-3">
              {meeting_type.owner_avatar ? (
                <img
                  src={meeting_type.owner_avatar}
                  alt={meeting_type.owner_name}
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-white/30"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center ring-2 ring-white/30">
                  <User className="w-6 h-6 text-white/80" />
                </div>
              )}
              <div>
                <p className="font-semibold">{meeting_type.owner_name}</p>
                <div className="flex items-center gap-3 text-sm text-white/70">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {meeting_type.duration_minutes} min
                  </span>
                  <span className="flex items-center gap-1">
                    {getLocationIcon(meeting_type.location_type, 'w-3.5 h-3.5')}
                    {getLocationLabel(meeting_type.location_type)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Booking Form */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden bg-gray-50 dark:bg-gray-800">
        {/* Mobile Header */}
        <div
          className="lg:hidden flex-shrink-0 px-4 py-5"
          style={{ backgroundColor: accentColor }}
        >
          <div className="flex items-center gap-3 mb-4">
            {branding?.logo_dark_url ? (
              <img src={branding.logo_dark_url} alt={branding.company_name} className="h-6" />
            ) : (
              <>
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                  <span className="text-gray-900 font-bold text-sm">O</span>
                </div>
                <span className="font-semibold text-white">{branding?.company_name || 'Oneo'}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 text-white/80 text-sm mb-2">
            <Sparkles className="w-4 h-4" />
            <span>Almost there!</span>
          </div>
          <h2 className="text-xl font-bold text-white">Let's get you started!</h2>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
            {step === 'slots' && (
              <>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Pick a time that works</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-6">Choose a slot for your {meeting_type.duration_minutes}-minute onboarding call.</p>

                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm dark:shadow-gray-900/40 border border-gray-200 dark:border-gray-700 p-6">
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
                      className="w-full py-3.5 px-4 text-white font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:opacity-90 hover:shadow-lg"
                      style={{ backgroundColor: accentColor }}
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
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Confirm your details</h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">We'll send confirmation to this email.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep('slots')}
                    className="text-sm hover:opacity-70"
                    style={{ color: accentColor }}
                  >
                    Change time
                  </button>
                </div>

                {/* Selected time summary */}
                {selectedSlot && (
                  <div
                    className="rounded-xl p-4 mb-6 flex items-center gap-4"
                    style={{ backgroundColor: `${accentColor}10` }}
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${accentColor}20` }}
                    >
                      <Calendar className="w-6 h-6" style={{ color: accentColor }} />
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

                <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm dark:shadow-gray-900/40 border border-gray-200 dark:border-gray-700 p-6 space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Your name
                    </label>
                    <input
                      type="text"
                      name="attendee_name"
                      value={formData.attendee_name}
                      onChange={handleFormChange}
                      required
                      className="w-full px-4 py-3 text-[15px] border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:border-transparent"
                      style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                      placeholder="John Smith"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Email address
                    </label>
                    <input
                      type="email"
                      name="attendee_email"
                      value={formData.attendee_email}
                      onChange={handleFormChange}
                      required
                      className="w-full px-4 py-3 text-[15px] border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:border-transparent"
                      style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                      placeholder="john@company.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Phone number
                    </label>
                    <input
                      type="tel"
                      name="attendee_phone"
                      value={formData.attendee_phone}
                      onChange={handleFormChange}
                      required
                      className="w-full px-4 py-3 text-[15px] border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:border-transparent"
                      style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                      placeholder="+27 XX XXX XXXX"
                    />
                  </div>

                  {createError && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-red-700 dark:text-red-400">{createError}</span>
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isCreating}
                      className="w-full py-3.5 px-4 text-white font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:opacity-90 hover:shadow-lg flex items-center justify-center gap-2"
                      style={{ backgroundColor: accentColor }}
                    >
                      {isCreating ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Booking...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5" />
                          Book My Call
                        </>
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
