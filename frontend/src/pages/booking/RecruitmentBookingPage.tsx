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
  Briefcase,
  MessageSquare,
  FileText,
  Users,
} from 'lucide-react'
import {
  usePublicAvailability,
  useCreatePublicBooking,
  usePublicBranding,
} from '@/hooks'
import { useAuth } from '@/contexts/AuthContext'
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

export default function RecruitmentBookingPage() {
  const { bookingSlug, meetingTypeSlug } = useParams<{
    bookingSlug: string
    meetingTypeSlug: string
  }>()
  const [searchParams] = useSearchParams()
  const { user, isAuthenticated } = useAuth()

  // Get branding
  const { branding } = usePublicBranding()

  const { availability, isLoading, error } = usePublicAvailability(
    bookingSlug || '',
    meetingTypeSlug || ''
  )
  const { createBooking, isCreating, error: createError } = useCreatePublicBooking(
    bookingSlug || '',
    meetingTypeSlug || ''
  )

  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [step, setStep] = useState<'slots' | 'form' | 'confirm' | 'success'>('slots')
  const [formData, setFormData] = useState({
    attendee_name: searchParams.get('name') || '',
    attendee_email: searchParams.get('email') || '',
    attendee_phone: searchParams.get('phone') || '',
  })
  const [bookingResult, setBookingResult] = useState<{
    scheduled_at: string
    confirmation_message?: string
    redirect_url?: string | null
  } | null>(null)

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleContinueFromSlots = () => {
    if (isAuthenticated) {
      setStep('confirm')
    } else {
      setStep('form')
    }
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!selectedSlot || !availability) return

    try {
      const bookingData = isAuthenticated
        ? {
            scheduled_at: selectedSlot,
            timezone: availability.timezone,
          }
        : {
            ...formData,
            scheduled_at: selectedSlot,
            timezone: availability.timezone,
          }

      const result = await createBooking(bookingData)

      setBookingResult({
        scheduled_at: selectedSlot,
        confirmation_message: result.confirmation_message,
        redirect_url: result.redirect_url,
      })
      setStep('success')

      if (result.redirect_url) {
        setTimeout(() => {
          window.location.href = result.redirect_url!
        }, 3000)
      }
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

  // Success state
  if (step === 'success' && bookingResult) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl dark:shadow-gray-900/40 border border-gray-100 dark:border-gray-700 p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-500" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Interview Scheduled!</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8">
            {bookingResult.confirmation_message || "You're all set. We look forward to speaking with you."}
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

          {bookingResult.redirect_url && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">Redirecting you shortly...</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 flex bg-white dark:bg-gray-900">
      {/* Left Panel - Professional, Interview-focused */}
      <div className="hidden lg:flex lg:w-[420px] xl:w-[480px] flex-col bg-slate-900 text-white relative overflow-hidden">
        {/* Content */}
        <div className="relative flex-1 flex flex-col p-8 xl:p-10">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-10">
            {branding?.logo_dark_url ? (
              <img src={branding.logo_dark_url} alt={branding.company_name} className="h-8" />
            ) : (
              <>
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
                  <span className="text-slate-900 font-bold text-lg">O</span>
                </div>
                <span className="text-xl font-semibold">{branding?.company_name || 'Oneo'}</span>
              </>
            )}
          </div>

          {/* Meeting Type Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full text-sm font-medium mb-6 w-fit">
            <Briefcase className="w-4 h-4" />
            Interview
          </div>

          {/* Meeting Name */}
          <h1 className="text-2xl xl:text-3xl font-bold mb-3">{meeting_type.name}</h1>

          {/* Description */}
          {meeting_type.description && (
            <p className="text-slate-300 mb-8 leading-relaxed">{meeting_type.description}</p>
          )}

          {/* Interviewer Info */}
          <div className="flex items-center gap-4 mb-8 pb-8 border-b border-white/10">
            {meeting_type.owner_avatar ? (
              <img
                src={meeting_type.owner_avatar}
                alt={meeting_type.owner_name}
                className="w-14 h-14 rounded-full object-cover ring-2 ring-white/20"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center ring-2 ring-white/20">
                <User className="w-7 h-7 text-white/60" />
              </div>
            )}
            <div>
              <p className="text-sm text-slate-400">You'll be meeting with</p>
              <p className="text-lg font-semibold">{meeting_type.owner_name}</p>
            </div>
          </div>

          {/* Meeting Details */}
          <div className="space-y-4 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-white/80" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Duration</p>
                <p className="font-medium">{meeting_type.duration_minutes} minutes</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                {getLocationIcon(meeting_type.location_type, 'w-5 h-5 text-white/80')}
              </div>
              <div>
                <p className="text-sm text-slate-400">Location</p>
                <p className="font-medium">{getLocationLabel(meeting_type.location_type)}</p>
              </div>
            </div>
          </div>

          {/* What to Expect */}
          <div className="mb-8">
            <p className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-4">What to expect</p>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-white/70" />
                </div>
                <span className="text-sm text-slate-300">Introductions and role overview</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <Users className="w-4 h-4 text-white/70" />
                </div>
                <span className="text-sm text-slate-300">Discussion about your experience</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-white/70" />
                </div>
                <span className="text-sm text-slate-300">Q&A and next steps</span>
              </div>
            </div>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Trust signal */}
          <div className="pt-6 border-t border-white/10">
            <p className="text-xs text-slate-500">
              Powered by {branding?.company_name || 'Oneo'}
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Booking Form */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden bg-gray-50 dark:bg-gray-800">
        {/* Mobile Header */}
        <div className="lg:hidden flex-shrink-0 bg-slate-900 text-white px-4 py-5">
          <div className="flex items-center gap-3 mb-4">
            {branding?.logo_dark_url ? (
              <img src={branding.logo_dark_url} alt={branding.company_name} className="h-6" />
            ) : (
              <>
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                  <span className="text-slate-900 font-bold text-sm">O</span>
                </div>
                <span className="font-semibold">{branding?.company_name || 'Oneo'}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
            <Briefcase className="w-4 h-4" />
            <span>Interview</span>
          </div>
          <h2 className="text-xl font-bold">{meeting_type.name}</h2>
          <div className="flex items-center gap-4 mt-3 text-sm text-slate-300">
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {meeting_type.duration_minutes} min
            </span>
            <span className="flex items-center gap-1.5">
              {getLocationIcon(meeting_type.location_type, 'w-4 h-4')}
              {getLocationLabel(meeting_type.location_type)}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
            {step === 'slots' && (
              <>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Select a time</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-6">Choose a time that works best for your interview.</p>

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
                      onClick={handleContinueFromSlots}
                      disabled={!selectedSlot}
                      className="w-full py-3.5 px-4 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-medium rounded-xl hover:bg-slate-800 dark:hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Your details</h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">We'll send your interview confirmation here.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep('slots')}
                    className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  >
                    Change time
                  </button>
                </div>

                {/* Selected time summary */}
                {selectedSlot && (
                  <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 mb-6 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-600 flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-slate-600 dark:text-slate-300" />
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
                      Full name
                    </label>
                    <input
                      type="text"
                      name="attendee_name"
                      value={formData.attendee_name}
                      onChange={handleFormChange}
                      required
                      className="w-full px-4 py-3 text-[15px] border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-100 focus:border-transparent"
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
                      className="w-full px-4 py-3 text-[15px] border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-100 focus:border-transparent"
                      placeholder="john@email.com"
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
                      className="w-full px-4 py-3 text-[15px] border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-100 focus:border-transparent"
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
                      className="w-full py-3.5 px-4 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-medium rounded-xl hover:bg-slate-800 dark:hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                      {isCreating ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Scheduling...
                        </>
                      ) : (
                        'Schedule Interview'
                      )}
                    </button>
                  </div>
                </form>
              </>
            )}

            {/* Confirm step for authenticated users */}
            {step === 'confirm' && user && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Confirm your interview</h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Review the details below.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep('slots')}
                    className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  >
                    Change time
                  </button>
                </div>

                {selectedSlot && (
                  <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 mb-6 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-600 flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-slate-600 dark:text-slate-300" />
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

                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm dark:shadow-gray-900/40 border border-gray-200 dark:border-gray-700 p-6">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
                    Booking as
                  </p>
                  <div className="flex items-center gap-4 mb-6">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={`${user.first_name} ${user.last_name}`}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                        <User className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {user.first_name} {user.last_name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                    </div>
                  </div>

                  {createError && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3 mb-4">
                      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-red-700 dark:text-red-400">{createError}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => handleSubmit()}
                    disabled={isCreating}
                    className="w-full py-3.5 px-4 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-medium rounded-xl hover:bg-slate-800 dark:hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Scheduling...
                      </>
                    ) : (
                      'Confirm Interview'
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
