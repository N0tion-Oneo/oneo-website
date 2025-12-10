import { useState, useEffect, useRef } from 'react'
import { X, Calendar, Clock, MapPin, User, Send, AlertCircle, Users, Link2, CheckCircle2, Loader2, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react'
import {
  ApplicationStageInstance,
  StageTypeConfig,
  ScheduleStageInput,
  RescheduleStageInput,
} from '@/types'
import { useScheduleStage, useRescheduleStage, useHasCalendarConnection, useJobInterviewers, useSendBookingLink } from '@/hooks'
import { StageTypeBadge } from '../jobs/StageTypeSelector'

interface ScheduleInterviewModalProps {
  instance: ApplicationStageInstance
  candidateName: string
  applicationId: string
  jobId: string
  isOpen: boolean
  onClose: () => void
  onSuccess: (instance: ApplicationStageInstance) => void
  mode?: 'schedule' | 'reschedule'
}

export default function ScheduleInterviewModal({
  instance,
  candidateName,
  applicationId,
  jobId,
  isOpen,
  onClose,
  onSuccess,
  mode = 'schedule',
}: ScheduleInterviewModalProps) {
  const isReschedule = mode === 'reschedule'
  const config = StageTypeConfig[instance.stage_template.stage_type]
  const defaultDuration = instance.stage_template.default_duration_minutes || config.defaultDuration || 60

  const { schedule, isScheduling, error: scheduleError } = useScheduleStage()
  const { reschedule, isRescheduling, error: rescheduleError } = useRescheduleStage()
  const { hasConnection } = useHasCalendarConnection()
  const { interviewers, isLoading: isLoadingInterviewers } = useJobInterviewers(jobId)
  const { sendBookingLink, isSending: isSendingBookingLink, result: bookingLinkResult, error: bookingLinkError } = useSendBookingLink()

  const [showManualScheduling, setShowManualScheduling] = useState(isReschedule)
  const [copiedLink, setCopiedLink] = useState(false)
  const hasSetDefaultInterviewer = useRef(false)
  const [formData, setFormData] = useState<{
    date: string
    time: string
    interviewer_id: string
    participant_ids: string[]
    location: string
    send_calendar_invite: boolean
    reason: string
  }>({
    date: '',
    time: '',
    interviewer_id: instance.interviewer?.id || '',  // Default set via useEffect after interviewers load
    participant_ids: instance.participants || [],
    location: instance.location || instance.stage_template.custom_location || '',
    send_calendar_invite: hasConnection,
    reason: '',
  })

  // Pre-fill with existing schedule if rescheduling
  useEffect(() => {
    if (isReschedule && instance.scheduled_at) {
      const date = new Date(instance.scheduled_at)
      const dateStr = date.toISOString().split('T')[0] || ''
      setFormData((prev) => ({
        ...prev,
        date: dateStr,
        time: date.toTimeString().slice(0, 5),
        interviewer_id: instance.interviewer?.id || prev.interviewer_id,
        participant_ids: instance.participants || prev.participant_ids,
        location: instance.location || '',
      }))
    }
  }, [isReschedule, instance])

  // Set default interviewer once interviewers are loaded (only once)
  useEffect(() => {
    // Skip if already set, still loading, or no interviewers
    if (hasSetDefaultInterviewer.current || isLoadingInterviewers || interviewers.length === 0) {
      return
    }

    // Skip if an interviewer is already selected (e.g., from existing schedule)
    if (instance.interviewer?.id) {
      hasSetDefaultInterviewer.current = true
      return
    }

    const defaultId = instance.stage_template.default_interviewer_id
    console.log('Default interviewer check:', {
      defaultId,
      interviewerIds: interviewers.map(i => i.id),
      stageTemplate: instance.stage_template,
    })
    if (defaultId) {
      // Convert to string for comparison (backend may return number or string)
      const defaultIdStr = String(defaultId)
      const exists = interviewers.some(i => i.id === defaultIdStr)
      console.log('Checking interviewer:', { defaultIdStr, exists })
      if (exists) {
        setFormData(prev => ({ ...prev, interviewer_id: defaultIdStr }))
      }
    }
    hasSetDefaultInterviewer.current = true
  }, [isLoadingInterviewers, interviewers, instance.interviewer?.id, instance.stage_template.default_interviewer_id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.date || !formData.time) {
      return
    }

    const scheduledAt = new Date(`${formData.date}T${formData.time}`).toISOString()

    try {
      let result: ApplicationStageInstance

      if (isReschedule) {
        const data: RescheduleStageInput = {
          scheduled_at: scheduledAt,
          duration_minutes: defaultDuration,
          interviewer_id: formData.interviewer_id || undefined,
          participant_ids: formData.participant_ids.length > 0 ? formData.participant_ids : undefined,
          location: formData.location || undefined,
          reason: formData.reason || undefined,
          send_calendar_invite: formData.send_calendar_invite,
        }
        result = await reschedule(applicationId, instance.id, data)
      } else {
        const data: ScheduleStageInput = {
          scheduled_at: scheduledAt,
          duration_minutes: defaultDuration,
          interviewer_id: formData.interviewer_id || undefined,
          participant_ids: formData.participant_ids.length > 0 ? formData.participant_ids : undefined,
          location: formData.location || undefined,
          send_calendar_invite: formData.send_calendar_invite,
        }
        result = await schedule(applicationId, instance.id, data)
      }

      onSuccess(result)
      onClose()
    } catch {
      // Error is handled by the hook
    }
  }

  const handleSendBookingLink = async () => {
    if (!formData.interviewer_id) {
      return
    }

    try {
      await sendBookingLink({
        applicationId,
        stageId: instance.id,
        interviewerId: formData.interviewer_id,
      })
    } catch {
      // Error is handled by the hook
    }
  }

  const handleChange = (field: string, value: string | number | boolean | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleCopyBookingLink = async () => {
    if (bookingLinkResult?.booking_url) {
      await navigator.clipboard.writeText(bookingLinkResult.booking_url)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    }
  }

  if (!isOpen) return null

  const bookingError = bookingLinkError as { response?: { data?: { error?: string } } } | null
  const error = scheduleError || rescheduleError || bookingError?.response?.data?.error
  const isSubmitting = isScheduling || isRescheduling || isSendingBookingLink
  const showLocation = config.requiresLocation
  const selectedInterviewer = interviewers.find(i => i.id === formData.interviewer_id)
  const interviewerHasCalendar = selectedInterviewer?.has_calendar ?? false

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[300]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {isReschedule ? 'Reschedule Interview' : 'Schedule Interview'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {candidateName} - {instance.stage_template.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto flex-1 space-y-4">
          {/* Booking link success message */}
          {bookingLinkResult && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-800">Booking link sent!</span>
              </div>
              <p className="text-sm text-green-700 mb-2">{bookingLinkResult.message}</p>

              {/* Booking URL with copy button */}
              <div className="mt-3 p-2 bg-white border border-green-200 rounded-md">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={bookingLinkResult.booking_url}
                    className="flex-1 text-xs text-gray-700 bg-transparent border-none focus:outline-none truncate"
                  />
                  <button
                    type="button"
                    onClick={handleCopyBookingLink}
                    className="flex-shrink-0 p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                    title="Copy link"
                  >
                    {copiedLink ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <p className="text-xs text-green-600 mt-2">
                {bookingLinkResult.expires_at && (
                  <>Link expires: {new Date(bookingLinkResult.expires_at).toLocaleDateString()}</>
                )}
              </p>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          {/* Stage Info */}
          <div className="flex items-center justify-between">
            <StageTypeBadge stageType={instance.stage_template.stage_type} />
            <span className="text-sm text-gray-500">
              <Clock className="w-4 h-4 inline mr-1" />
              {defaultDuration} min
            </span>
          </div>

          {/* Interviewer Selection - Always visible */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
              <User className="w-4 h-4" />
              Primary Interviewer
            </label>
            <select
              value={formData.interviewer_id}
              onChange={(e) => handleChange('interviewer_id', e.target.value)}
              disabled={isLoadingInterviewers}
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100"
            >
              <option value="">Select interviewer...</option>
              {interviewers.map((interviewer) => (
                <option key={interviewer.id} value={interviewer.id}>
                  {interviewer.full_name}
                  {interviewer.has_calendar ? ' ✓' : ''}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              {interviewers.some((i) => i.has_calendar)
                ? '✓ indicates calendar connected'
                : 'No team members have connected their calendars yet'}
            </p>
          </div>

          {/* PRIMARY OPTION: Send Booking Link (for both schedule and reschedule) */}
          {!bookingLinkResult && (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0">
                  <Link2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">
                    {isReschedule ? 'Send new booking link' : 'Let candidate choose a time'}
                  </h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {isReschedule
                      ? 'Send a new booking link so the candidate can pick a different time'
                      : 'Send a booking link and the candidate will pick from available slots on the interviewer\'s calendar'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSendBookingLink}
                disabled={!formData.interviewer_id || isSendingBookingLink || !interviewerHasCalendar}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSendingBookingLink ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    {isReschedule ? 'Send New Booking Link' : 'Send Booking Link'}
                  </>
                )}
              </button>
              {!interviewerHasCalendar && formData.interviewer_id && !isLoadingInterviewers && (
                <p className="text-xs text-amber-600 mt-2 text-center">
                  Selected interviewer needs to connect their calendar first
                </p>
              )}
              {!formData.interviewer_id && !isLoadingInterviewers && (
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Select an interviewer above to send a booking link
                </p>
              )}
              {isLoadingInterviewers && (
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Loading interviewers...
                </p>
              )}
            </div>
          )}

          {/* EXPANDABLE: Manual Scheduling Section */}
          {!bookingLinkResult && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setShowManualScheduling(!showManualScheduling)}
                className="w-full px-4 py-3 flex items-center justify-between bg-white hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm font-medium text-gray-700">
                  {isReschedule ? 'Reschedule details' : 'Or schedule manually'}
                </span>
                {showManualScheduling ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>

              {showManualScheduling && (
                <form onSubmit={handleSubmit} className="px-4 pb-4 pt-2 space-y-4 border-t border-gray-100">
                  {/* Date & Time */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
                        <Calendar className="w-4 h-4" />
                        Date
                      </label>
                      <input
                        type="date"
                        value={formData.date}
                        onChange={(e) => handleChange('date', e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        required
                        className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
                        <Clock className="w-4 h-4" />
                        Time
                      </label>
                      <input
                        type="time"
                        value={formData.time}
                        onChange={(e) => handleChange('time', e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Additional Participants */}
                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
                      <Users className="w-4 h-4" />
                      Additional Participants
                      <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <div className="border border-gray-200 rounded-md p-2 space-y-1 max-h-32 overflow-y-auto">
                      {interviewers
                        .filter((i) => i.id !== formData.interviewer_id)
                        .map((participant) => (
                          <label
                            key={participant.id}
                            className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={formData.participant_ids.includes(participant.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  handleChange('participant_ids', [...formData.participant_ids, participant.id])
                                } else {
                                  handleChange(
                                    'participant_ids',
                                    formData.participant_ids.filter((id) => id !== participant.id)
                                  )
                                }
                              }}
                              className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
                            />
                            <span className="text-sm text-gray-700">
                              {participant.full_name}
                              {participant.has_calendar ? ' ✓' : ''}
                            </span>
                          </label>
                        ))}
                      {interviewers.filter((i) => i.id !== formData.interviewer_id).length === 0 && (
                        <p className="text-sm text-gray-500 p-1.5">No other team members available</p>
                      )}
                    </div>
                  </div>

                  {/* Location (for in-person) */}
                  {showLocation && (
                    <div>
                      <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
                        <MapPin className="w-4 h-4" />
                        Location
                      </label>
                      <input
                        type="text"
                        value={formData.location}
                        onChange={(e) => handleChange('location', e.target.value)}
                        placeholder="Office address or meeting room..."
                        className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                      />
                    </div>
                  )}

                  {/* Reschedule Reason */}
                  {isReschedule && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">
                        Reason for Rescheduling
                        <span className="text-gray-400 font-normal ml-1">(optional)</span>
                      </label>
                      <textarea
                        value={formData.reason}
                        onChange={(e) => handleChange('reason', e.target.value)}
                        placeholder="Let the candidate know why you're rescheduling..."
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
                      />
                    </div>
                  )}

                  {/* Calendar Invite Option */}
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.send_calendar_invite}
                        onChange={(e) => handleChange('send_calendar_invite', e.target.checked)}
                        disabled={!interviewerHasCalendar}
                        className="mt-0.5 w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-900">
                          Send calendar invite with meeting link
                        </span>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {interviewerHasCalendar
                            ? 'A calendar event with a Google Meet or Teams link will be auto-created'
                            : formData.interviewer_id
                              ? 'Selected interviewer hasn\'t connected their calendar'
                              : 'Select an interviewer with a connected calendar'}
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* Submit button for manual scheduling */}
                  <button
                    type="submit"
                    disabled={isSubmitting || !formData.date || !formData.time}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4" />
                    {isSubmitting
                      ? isReschedule
                        ? 'Rescheduling...'
                        : 'Scheduling...'
                      : isReschedule
                        ? 'Reschedule Interview'
                        : 'Schedule Interview'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Footer - Just close button now */}
        <div className="flex justify-end px-6 py-4 border-t border-gray-100 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
          >
            {bookingLinkResult ? 'Close' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  )
}
