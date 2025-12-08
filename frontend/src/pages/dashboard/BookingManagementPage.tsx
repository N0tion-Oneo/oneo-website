import { useState } from 'react'
import { format, parseISO, isToday, isTomorrow, isPast, isFuture } from 'date-fns'
import {
  Calendar,
  Clock,
  User,
  Users,
  Video,
  Phone,
  MapPin,
  Mail,
  Building2,
  Plus,
  Filter,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Copy,
  ExternalLink,
  Loader2,
  X,
  UserPlus,
  Send,
  Trash2,
  Briefcase,
} from 'lucide-react'
import { useMeetingTypes, useRecruiterBookings, useCandidateInvitations } from '@/hooks'
import { useAuth } from '@/contexts/AuthContext'
import type {
  RecruiterMeetingType,
  RecruiterMeetingTypeInput,
  RecruiterBooking,
  RecruiterBookingStatus,
  RecruiterMeetingCategory,
  RecruiterMeetingLocationType,
  CandidateInvitation,
} from '@/types'
import {
  RecruiterBookingStatusLabels,
  RecruiterMeetingCategoryLabels,
  RecruiterMeetingLocationLabels,
} from '@/types'

type TabType = 'bookings' | 'meeting-types' | 'invitations'

// Status badge colors
const statusColors: Record<RecruiterBookingStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-600',
  completed: 'bg-blue-100 text-blue-700',
  no_show: 'bg-red-100 text-red-700',
}

// Location icon
function LocationIcon({ type }: { type: RecruiterMeetingLocationType }) {
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

// Format date for grouping
function formatDateGroup(date: string) {
  const d = parseISO(date)
  if (isToday(d)) return 'Today'
  if (isTomorrow(d)) return 'Tomorrow'
  return format(d, 'EEEE, MMMM d')
}

// Booking Card Component
function BookingCard({
  booking,
  onCancel,
  onComplete,
  onNoShow,
  isRecruiter = true,
  isClient = false,
}: {
  booking: RecruiterBooking
  onCancel: (id: string, isInterview: boolean) => void
  onComplete: (id: string, isInterview: boolean) => void
  onNoShow: (id: string, isInterview: boolean) => void
  isRecruiter?: boolean
  isClient?: boolean
}) {
  const [showMenu, setShowMenu] = useState(false)
  const isPastBooking = isPast(parseISO(booking.scheduled_at))
  const isInterviewBooking = booking.booking_type === 'interview'
  // Allow actions for recruiters on regular bookings, or recruiters/clients on interviews
  const canTakeAction = booking.status === 'confirmed' && (
    (isRecruiter && !isInterviewBooking) ||
    ((isRecruiter || isClient) && isInterviewBooking)
  )

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Time and Duration */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[16px] font-medium text-gray-900">
              {format(parseISO(booking.scheduled_at), 'h:mm a')}
            </span>
            <span className="text-[13px] text-gray-400">-</span>
            <span className="text-[14px] text-gray-500">
              {format(parseISO(booking.end_time), 'h:mm a')}
            </span>
            <span
              className={`ml-2 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                statusColors[booking.status]
              }`}
            >
              {RecruiterBookingStatusLabels[booking.status]}
            </span>
            {isInterviewBooking && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-100 text-purple-700">
                Interview
              </span>
            )}
          </div>

          {/* Meeting Type */}
          <p className="text-[14px] font-medium text-gray-800 mb-1">
            {booking.meeting_type_name}
          </p>

          {/* Job and Company context for interviews */}
          {isInterviewBooking && (booking.job_title || booking.company_name) && (
            <div className="flex items-center gap-3 text-[13px] text-purple-600 mb-2">
              {booking.job_title && (
                <span className="flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4" />
                  {booking.job_title}
                </span>
              )}
              {booking.company_name && (
                <span className="flex items-center gap-1.5 text-gray-500">
                  <Building2 className="w-4 h-4" />
                  {booking.company_name}
                </span>
              )}
            </div>
          )}

          {/* Host/Organizer info */}
          <div className="flex items-center gap-4 text-[13px] text-gray-500 mb-2">
            <span className="flex items-center gap-1.5">
              <User className="w-4 h-4 text-blue-500" />
              <span className="text-gray-600">Host:</span>
              <span className="font-medium text-gray-700">{booking.organizer_name}</span>
            </span>
            {booking.organizer_email && (
              <span className="flex items-center gap-1.5">
                <Mail className="w-4 h-4" />
                {booking.organizer_email}
              </span>
            )}
          </div>

          {/* Attendee/Candidate info */}
          <div className="flex items-center gap-4 text-[13px] text-gray-500 mb-2">
            <span className="flex items-center gap-1.5">
              <User className="w-4 h-4 text-green-500" />
              <span className="text-gray-600">{isInterviewBooking ? 'Candidate:' : 'Attendee:'}</span>
              <span className="font-medium text-gray-700">{booking.attendee_name}</span>
              {booking.candidate_info?.professional_title && (
                <span className="text-gray-400">({booking.candidate_info.professional_title})</span>
              )}
            </span>
          </div>

          {/* Attendee contact details */}
          <div className="flex items-center gap-4 text-[13px] text-gray-500 mb-2">
            {booking.attendee_email && (
              <span className="flex items-center gap-1.5">
                <Mail className="w-4 h-4" />
                {booking.attendee_email}
              </span>
            )}
            {booking.attendee_phone && (
              <span className="flex items-center gap-1.5">
                <Phone className="w-4 h-4" />
                {booking.attendee_phone}
              </span>
            )}
            {!isInterviewBooking && booking.attendee_company && (
              <span className="flex items-center gap-1.5">
                <Building2 className="w-4 h-4" />
                {booking.attendee_company}
              </span>
            )}
          </div>

          {/* Additional Participants (for interviews with multiple interviewers) */}
          {isInterviewBooking && booking.participants && booking.participants.length > 1 && (
            <div className="flex items-center gap-2 text-[13px] text-gray-500 mb-2">
              <Users className="w-4 h-4" />
              <span className="font-medium text-gray-600">Panel:</span>
              <span>
                {booking.participants.map((p, idx) => (
                  <span key={p.id}>
                    {p.name}
                    {p.role === 'interviewer' && <span className="text-blue-600 text-[11px] ml-1">(Lead)</span>}
                    {idx < booking.participants!.length - 1 && ', '}
                  </span>
                ))}
              </span>
            </div>
          )}

          {/* Location info */}
          <div className="flex items-center gap-4 text-[13px] text-gray-500">
            <span className="flex items-center gap-1.5">
              <LocationIcon type={booking.location_type} />
              {booking.location_type_display}
            </span>
          </div>

          {/* Location details for in-person meetings */}
          {booking.location && booking.location_type === 'in_person' && (
            <div className="mt-2 flex items-start gap-1.5 text-[13px] text-gray-600">
              <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{booking.location}</span>
            </div>
          )}

          {/* Join Meeting Button - prominent for upcoming video meetings */}
          {booking.meeting_url && booking.status === 'confirmed' && isFuture(parseISO(booking.scheduled_at)) && (
            <a
              href={booking.meeting_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
            >
              <Video className="w-4 h-4" />
              Join Meeting
            </a>
          )}
        </div>

        {/* Actions */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 rounded-md hover:bg-gray-100 transition-colors"
          >
            <MoreHorizontal className="w-5 h-5 text-gray-500" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
                {/* For recruiters: email attendee. For others: email organizer */}
                {isRecruiter ? (
                  <a
                    href={`mailto:${booking.attendee_email}`}
                    className="flex items-center gap-2 px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50"
                  >
                    <Mail className="w-4 h-4" />
                    Email Attendee
                  </a>
                ) : (
                  <a
                    href={`mailto:${booking.organizer_email}`}
                    className="flex items-center gap-2 px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50"
                  >
                    <Mail className="w-4 h-4" />
                    Email Organizer
                  </a>
                )}
                {booking.meeting_url && (
                  <a
                    href={booking.meeting_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Join Meeting
                  </a>
                )}
                {canTakeAction && !isPastBooking && (
                  <button
                    onClick={() => {
                      onCancel(booking.id, isInterviewBooking)
                      setShowMenu(false)
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-[13px] text-red-600 hover:bg-red-50"
                  >
                    <XCircle className="w-4 h-4" />
                    Cancel {isInterviewBooking ? 'Interview' : 'Booking'}
                  </button>
                )}
                {canTakeAction && isPastBooking && (
                  <>
                    <button
                      onClick={() => {
                        onComplete(booking.id, isInterviewBooking)
                        setShowMenu(false)
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-[13px] text-green-600 hover:bg-green-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Mark Complete
                    </button>
                    <button
                      onClick={() => {
                        onNoShow(booking.id, isInterviewBooking)
                        setShowMenu(false)
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-[13px] text-amber-600 hover:bg-amber-50"
                    >
                      <AlertCircle className="w-4 h-4" />
                      Mark No-Show
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Meeting Type Card Component
function MeetingTypeCard({
  meetingType,
  bookingUrl,
  onEdit,
  onToggleActive,
}: {
  meetingType: RecruiterMeetingType
  bookingUrl: string
  onEdit: () => void
  onToggleActive: () => void
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(bookingUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div
            className="w-3 h-3 rounded-full mb-2"
            style={{ backgroundColor: meetingType.color }}
          />
          <h3 className="text-[15px] font-medium text-gray-900">{meetingType.name}</h3>
          <p className="text-[12px] text-gray-500 mt-0.5">
            {RecruiterMeetingCategoryLabels[meetingType.category]}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleActive}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${
              meetingType.is_active
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            {meetingType.is_active ? 'Active' : 'Inactive'}
          </button>
        </div>
      </div>

      {meetingType.description && (
        <p className="text-[13px] text-gray-500 mb-3 line-clamp-2">
          {meetingType.description}
        </p>
      )}

      <div className="flex items-center gap-4 text-[13px] text-gray-500 mb-4">
        <span className="flex items-center gap-1.5">
          <Clock className="w-4 h-4" />
          {meetingType.duration_minutes} min
        </span>
        <span className="flex items-center gap-1.5">
          <LocationIcon type={meetingType.location_type} />
          {RecruiterMeetingLocationLabels[meetingType.location_type]}
        </span>
      </div>

      {/* Booking Link */}
      <div className="flex items-center gap-2 bg-gray-50 rounded-md p-2">
        <input
          type="text"
          readOnly
          value={bookingUrl}
          className="flex-1 bg-transparent text-[12px] text-gray-600 truncate"
        />
        <button
          onClick={handleCopy}
          className="p-1.5 rounded hover:bg-gray-200 transition-colors"
          title="Copy link"
        >
          {copied ? (
            <CheckCircle2 className="w-4 h-4 text-green-600" />
          ) : (
            <Copy className="w-4 h-4 text-gray-500" />
          )}
        </button>
        <a
          href={bookingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 rounded hover:bg-gray-200 transition-colors"
          title="Open in new tab"
        >
          <ExternalLink className="w-4 h-4 text-gray-500" />
        </a>
      </div>

      <div className="mt-4 pt-3 border-t border-gray-100">
        <button
          onClick={onEdit}
          className="text-[13px] text-gray-600 hover:text-gray-900"
        >
          Edit Settings
        </button>
      </div>
    </div>
  )
}

// Meeting Type Form Modal
function MeetingTypeModal({
  meetingType,
  onClose,
  onSave,
  isSaving,
}: {
  meetingType: RecruiterMeetingType | null
  onClose: () => void
  onSave: (data: RecruiterMeetingTypeInput) => Promise<void>
  isSaving: boolean
}) {
  const [formData, setFormData] = useState<RecruiterMeetingTypeInput>({
    name: meetingType?.name || '',
    slug: meetingType?.slug || '',
    category: meetingType?.category || 'recruitment',
    description: meetingType?.description || '',
    duration_minutes: meetingType?.duration_minutes || 30,
    buffer_before_minutes: meetingType?.buffer_before_minutes || 0,
    buffer_after_minutes: meetingType?.buffer_after_minutes || 0,
    location_type: meetingType?.location_type || 'video',
    custom_location: meetingType?.custom_location || '',
    is_active: meetingType?.is_active ?? true,
    requires_approval: meetingType?.requires_approval || false,
    max_bookings_per_day: meetingType?.max_bookings_per_day || null,
    confirmation_message: meetingType?.confirmation_message || '',
    redirect_url: meetingType?.redirect_url || '',
    color: meetingType?.color || '#3B82F6',
  })

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target
    let newValue: string | number | boolean | null = value

    if (type === 'number') {
      newValue = value ? parseInt(value) : null
    } else if (type === 'checkbox') {
      newValue = (e.target as HTMLInputElement).checked
    }

    setFormData((prev) => ({ ...prev, [name]: newValue }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSave(formData)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-[16px] font-semibold text-gray-900">
            {meetingType ? 'Edit Meeting Type' : 'New Meeting Type'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
              Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
              placeholder="e.g., Sales Discovery Call"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
              Category *
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value="sales">Sales</option>
              <option value="recruitment">Recruitment</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
              placeholder="Brief description shown on the booking page"
            />
          </div>

          {/* Duration and Location */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                Duration (minutes)
              </label>
              <input
                type="number"
                name="duration_minutes"
                value={formData.duration_minutes || ''}
                onChange={handleChange}
                min={5}
                max={480}
                className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                Location Type
              </label>
              <select
                name="location_type"
                value={formData.location_type}
                onChange={handleChange}
                className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                <option value="video">Video Call</option>
                <option value="phone">Phone Call</option>
                <option value="in_person">In Person</option>
              </select>
            </div>
          </div>

          {/* Buffer Times */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                Buffer Before (min)
              </label>
              <input
                type="number"
                name="buffer_before_minutes"
                value={formData.buffer_before_minutes || ''}
                onChange={handleChange}
                min={0}
                max={60}
                className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                Buffer After (min)
              </label>
              <input
                type="number"
                name="buffer_after_minutes"
                value={formData.buffer_after_minutes || ''}
                onChange={handleChange}
                min={0}
                max={60}
                className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
              Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                name="color"
                value={formData.color}
                onChange={handleChange}
                className="w-10 h-10 rounded border border-gray-200 cursor-pointer"
              />
              <input
                type="text"
                value={formData.color}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, color: e.target.value }))
                }
                className="flex-1 px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
          </div>

          {/* Confirmation Message */}
          <div>
            <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
              Confirmation Message
            </label>
            <textarea
              name="confirmation_message"
              value={formData.confirmation_message}
              onChange={handleChange}
              rows={2}
              className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
              placeholder="Message shown after successful booking"
            />
          </div>

          {/* Redirect URL */}
          <div>
            <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
              Redirect URL (after booking)
            </label>
            <input
              type="url"
              name="redirect_url"
              value={formData.redirect_url}
              onChange={handleChange}
              className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
              placeholder="https://example.com/thank-you"
            />
          </div>

          {/* Checkboxes */}
          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
                className="w-4 h-4 rounded border-gray-300"
              />
              <span className="text-[13px] text-gray-700">Active (visible on booking page)</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="requires_approval"
                checked={formData.requires_approval}
                onChange={handleChange}
                className="w-4 h-4 rounded border-gray-300"
              />
              <span className="text-[13px] text-gray-700">Require approval before confirming</span>
            </label>
          </div>

          {/* Submit */}
          <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[14px] text-gray-600 hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 text-[14px] font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              {meetingType ? 'Save Changes' : 'Create Meeting Type'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Main Page Component
export default function BookingManagementPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('bookings')
  const [statusFilter, setStatusFilter] = useState<RecruiterBookingStatus | ''>('')
  const [categoryFilter, setCategoryFilter] = useState<RecruiterMeetingCategory | ''>('')

  // Check if user is a recruiter/admin (can manage meeting types and invitations)
  const isRecruiter = user?.role === 'admin' || user?.role === 'recruiter'
  const isClient = user?.role === 'client'

  // Only load meeting types for recruiters/admins
  const {
    meetingTypes,
    isLoading: loadingMeetingTypes,
    createMeetingType,
    updateMeetingType,
    isCreating,
    isUpdating,
  } = useMeetingTypes({ enabled: isRecruiter })

  const {
    bookings,
    isLoading: loadingBookings,
    cancelBooking,
    completeBooking,
    markNoShow,
  } = useRecruiterBookings({
    status: statusFilter || undefined,
    category: categoryFilter || undefined,
  })

  // Only load invitations for recruiters/admins
  const {
    invitations,
    isLoading: loadingInvitations,
    resendInvitation,
    deleteInvitation,
    isResending,
    isDeleting,
  } = useCandidateInvitations({ enabled: isRecruiter })

  const [editingMeetingType, setEditingMeetingType] = useState<RecruiterMeetingType | null>(null)
  const [showNewMeetingType, setShowNewMeetingType] = useState(false)

  // Group bookings by date
  const bookingsByDate = bookings.reduce((acc, booking) => {
    const dateKey = format(parseISO(booking.scheduled_at), 'yyyy-MM-dd')
    if (!acc[dateKey]) acc[dateKey] = []
    acc[dateKey].push(booking)
    return acc
  }, {} as Record<string, RecruiterBooking[]>)

  // Sort dates
  const sortedDates = Object.keys(bookingsByDate).sort()

  // Base URL for booking pages
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  const handleSaveMeetingType = async (data: RecruiterMeetingTypeInput) => {
    if (editingMeetingType) {
      await updateMeetingType(editingMeetingType.id, data)
    } else {
      await createMeetingType(data)
    }
    setEditingMeetingType(null)
    setShowNewMeetingType(false)
  }

  const handleToggleMeetingTypeActive = async (mt: RecruiterMeetingType) => {
    await updateMeetingType(mt.id, { is_active: !mt.is_active })
  }

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[20px] font-semibold text-gray-900">Bookings</h1>
        <p className="text-[14px] text-gray-500 mt-1">
          {isRecruiter
            ? 'Manage your meeting types and scheduled bookings'
            : 'View your scheduled meetings'}
        </p>
      </div>

      {/* Your Booking Page Link - only for recruiters/admins */}
      {isRecruiter && user && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[14px] font-medium text-blue-900">Your Booking Page</p>
              <p className="text-[13px] text-blue-700 mt-0.5">
                Share this link to let people schedule meetings with you
              </p>
            </div>
            <div className="flex items-center gap-2">
              <code className="px-3 py-1.5 bg-white rounded text-[13px] text-blue-800">
                {baseUrl}/meet/{user.booking_slug}
              </code>
              <button
                onClick={() => navigator.clipboard.writeText(`${baseUrl}/meet/${user.booking_slug}`)}
                className="p-2 bg-white rounded hover:bg-blue-100 transition-colors"
              >
                <Copy className="w-4 h-4 text-blue-600" />
              </button>
              <a
                href={`${baseUrl}/meet/${user.booking_slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-white rounded hover:bg-blue-100 transition-colors"
              >
                <ExternalLink className="w-4 h-4 text-blue-600" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Tabs - only show for recruiters/admins */}
      {isRecruiter && (
        <div className="border-b border-gray-200 mb-6">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab('bookings')}
              className={`pb-3 text-[14px] font-medium border-b-2 -mb-px transition-colors ${
                activeTab === 'bookings'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Bookings
            </button>
            <button
              onClick={() => setActiveTab('meeting-types')}
              className={`pb-3 text-[14px] font-medium border-b-2 -mb-px transition-colors ${
                activeTab === 'meeting-types'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Meeting Types
            </button>
            <button
              onClick={() => setActiveTab('invitations')}
              className={`pb-3 text-[14px] font-medium border-b-2 -mb-px transition-colors ${
                activeTab === 'invitations'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Invitations
              {invitations.filter((i) => i.is_valid && !i.used_at).length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-[11px] bg-amber-100 text-amber-700 rounded-full">
                  {invitations.filter((i) => i.is_valid && !i.used_at).length}
                </span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Bookings Tab - always show for non-recruiters, or when tab is active for recruiters */}
      {(!isRecruiter || activeTab === 'bookings') && (
        <div>
          {/* Filters */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-[13px] text-gray-500">Filter:</span>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as RecruiterBookingStatus | '')}
              className="px-3 py-1.5 text-[13px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no_show">No Show</option>
            </select>
            {/* Category filter only for recruiters - candidates/clients always see recruitment */}
            {isRecruiter && (
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as RecruiterMeetingCategory | '')}
                className="px-3 py-1.5 text-[13px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                <option value="">All Categories</option>
                <option value="sales">Sales</option>
                <option value="recruitment">Recruitment</option>
              </select>
            )}
          </div>

          {/* Bookings List */}
          {loadingBookings ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : bookings.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-[14px] text-gray-500">No bookings found</p>
            </div>
          ) : (
            <div className="space-y-6">
              {sortedDates.map((date) => (
                <div key={date}>
                  <h3 className="text-[13px] font-medium text-gray-500 mb-3">
                    {formatDateGroup(date)}
                  </h3>
                  <div className="space-y-2">
                    {bookingsByDate[date].map((booking) => (
                      <BookingCard
                        key={booking.id}
                        booking={booking}
                        onCancel={(id, isInterview) => cancelBooking(id, undefined, isInterview)}
                        onComplete={(id, isInterview) => completeBooking(id, isInterview)}
                        onNoShow={(id, isInterview) => markNoShow(id, isInterview)}
                        isRecruiter={isRecruiter}
                        isClient={isClient}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Meeting Types Tab - recruiters/admins only */}
      {isRecruiter && activeTab === 'meeting-types' && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <p className="text-[13px] text-gray-500">
              Create different meeting types for sales calls, recruitment consultations, etc.
            </p>
            <button
              onClick={() => setShowNewMeetingType(true)}
              className="flex items-center gap-2 px-4 py-2 text-[14px] font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800"
            >
              <Plus className="w-4 h-4" />
              New Meeting Type
            </button>
          </div>

          {loadingMeetingTypes ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : meetingTypes.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-[14px] text-gray-500 mb-4">No meeting types yet</p>
              <button
                onClick={() => setShowNewMeetingType(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-[14px] font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800"
              >
                <Plus className="w-4 h-4" />
                Create Your First Meeting Type
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {meetingTypes.map((mt) => (
                <MeetingTypeCard
                  key={mt.id}
                  meetingType={mt}
                  bookingUrl={`${baseUrl}/meet/${user?.booking_slug}/${mt.slug}`}
                  onEdit={() => setEditingMeetingType(mt)}
                  onToggleActive={() => handleToggleMeetingTypeActive(mt)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Invitations Tab - recruiters/admins only */}
      {isRecruiter && activeTab === 'invitations' && (
        <div>
          <div className="mb-6">
            <p className="text-[13px] text-gray-500">
              Manage invitations sent to candidates who booked meetings. Pending invitations are waiting for candidates to sign up.
            </p>
          </div>

          {loadingInvitations ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : invitations.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
              <UserPlus className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-[14px] text-gray-500">No invitations yet</p>
              <p className="text-[13px] text-gray-400 mt-1">
                Invitations are automatically created when non-users book meetings
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Candidate Info */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[15px] font-medium text-gray-900">
                          {invitation.name || 'Unknown'}
                        </span>
                        {invitation.used_at ? (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-green-100 text-green-700">
                            Signed Up
                          </span>
                        ) : invitation.is_expired ? (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600">
                            Expired
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-700">
                            Pending
                          </span>
                        )}
                      </div>

                      {/* Email */}
                      <div className="flex items-center gap-1.5 text-[13px] text-gray-500 mb-2">
                        <Mail className="w-4 h-4" />
                        {invitation.email}
                      </div>

                      {/* Booking Info */}
                      {invitation.booking_info && (
                        <div className="flex items-center gap-4 text-[13px] text-gray-500">
                          {invitation.booking_info.meeting_type && (
                            <span className="flex items-center gap-1.5">
                              <Calendar className="w-4 h-4" />
                              {invitation.booking_info.meeting_type}
                            </span>
                          )}
                          {invitation.booking_info.scheduled_at && (
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-4 h-4" />
                              {format(parseISO(invitation.booking_info.scheduled_at), 'MMM d, h:mm a')}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Dates */}
                      <div className="flex items-center gap-4 text-[12px] text-gray-400 mt-2">
                        <span>Created: {format(parseISO(invitation.created_at), 'MMM d, yyyy')}</span>
                        <span>Expires: {format(parseISO(invitation.expires_at), 'MMM d, yyyy')}</span>
                        {invitation.used_at && (
                          <span>Signed up: {format(parseISO(invitation.used_at), 'MMM d, yyyy')}</span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {!invitation.used_at && (
                        <>
                          <button
                            onClick={() => navigator.clipboard.writeText(invitation.signup_url)}
                            className="p-2 rounded-md hover:bg-gray-100 transition-colors"
                            title="Copy signup link"
                          >
                            <Copy className="w-4 h-4 text-gray-500" />
                          </button>
                          <button
                            onClick={() => resendInvitation(invitation.token)}
                            disabled={isResending}
                            className="p-2 rounded-md hover:bg-gray-100 transition-colors disabled:opacity-50"
                            title="Resend invitation"
                          >
                            {isResending ? (
                              <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                            ) : (
                              <Send className="w-4 h-4 text-gray-500" />
                            )}
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => {
                          if (window.confirm('Are you sure you want to delete this invitation?')) {
                            deleteInvitation(invitation.token)
                          }
                        }}
                        disabled={isDeleting}
                        className="p-2 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50"
                        title="Delete invitation"
                      >
                        {isDeleting ? (
                          <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                        ) : (
                          <Trash2 className="w-4 h-4 text-red-500" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Meeting Type Modal */}
      {(showNewMeetingType || editingMeetingType) && (
        <MeetingTypeModal
          meetingType={editingMeetingType}
          onClose={() => {
            setShowNewMeetingType(false)
            setEditingMeetingType(null)
          }}
          onSave={handleSaveMeetingType}
          isSaving={isCreating || isUpdating}
        />
      )}
    </div>
  )
}
