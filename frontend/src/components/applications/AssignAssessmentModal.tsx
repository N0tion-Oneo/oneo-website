import { useState, useEffect } from 'react'
import { X, AlertCircle, ClipboardCheck, Calendar, ExternalLink, Bell, Info } from 'lucide-react'
import { useAssignAssessment } from '@/hooks'
import type { ApplicationStageInstance, AssignAssessmentInput } from '@/types'

interface AssignAssessmentModalProps {
  isOpen: boolean
  onClose: () => void
  instance: ApplicationStageInstance
  applicationId: string
  candidateName: string
  onSuccess?: (updatedInstance: ApplicationStageInstance) => void
}

const formatDateTimeLocal = (date: Date): string => {
  // Format as YYYY-MM-DDTHH:MM for datetime-local input
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

export default function AssignAssessmentModal({
  isOpen,
  onClose,
  instance,
  applicationId,
  candidateName,
  onSuccess,
}: AssignAssessmentModalProps) {
  const { assign, isAssigning, error: assignError } = useAssignAssessment()

  // Calculate default deadline based on deadline_days from template (default 7 days)
  const deadlineDays = instance.stage_template.deadline_days || 7
  const defaultDeadline = new Date()
  defaultDeadline.setDate(defaultDeadline.getDate() + deadlineDays)
  defaultDeadline.setHours(17, 0, 0, 0) // Default to 5pm

  const [formData, setFormData] = useState<{
    deadline: string
    instructions: string
    external_url: string
    send_notification: boolean
  }>({
    deadline: formatDateTimeLocal(defaultDeadline),
    instructions: instance.stage_template.assessment_instructions || '',
    external_url: instance.stage_template.assessment_external_url || '',
    send_notification: true,
  })

  const [localError, setLocalError] = useState<string | null>(null)

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      const deadline = new Date()
      deadline.setDate(deadline.getDate() + deadlineDays)
      deadline.setHours(17, 0, 0, 0)

      setFormData({
        deadline: formatDateTimeLocal(deadline),
        instructions: instance.stage_template.assessment_instructions || '',
        external_url: instance.stage_template.assessment_external_url || '',
        send_notification: true,
      })
      setLocalError(null)
    }
  }, [isOpen, instance, deadlineDays])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)

    // Validate deadline is in the future
    const deadlineDate = new Date(formData.deadline)
    if (deadlineDate <= new Date()) {
      setLocalError('Deadline must be in the future')
      return
    }

    try {
      const data: AssignAssessmentInput = {
        deadline: new Date(formData.deadline).toISOString(),
        instructions: formData.instructions || undefined,
        external_url: formData.external_url || undefined,
        send_notification: formData.send_notification,
      }

      const updatedInstance = await assign(applicationId, instance.id, data)
      onSuccess?.(updatedInstance)
      onClose()
    } catch (err) {
      setLocalError((err as Error).message || 'Failed to assign assessment')
    }
  }

  if (!isOpen) return null

  const error = localError || assignError
  const providerName = instance.stage_template.assessment_provider_name

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
        onClick={onClose}
      >
        {/* Modal */}
        <div
          className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <ClipboardCheck className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h2 className="text-[16px] font-semibold text-gray-900">
                  Assign Assessment
                </h2>
                <p className="text-[13px] text-gray-500">
                  {instance.stage_template.name} for {candidateName}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Provider Info */}
            {providerName && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md flex items-start gap-2">
                <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-700">
                  Assessment provider: <strong>{providerName}</strong>
                </p>
              </div>
            )}

            {/* Deadline */}
            <div>
              <label className="flex items-center gap-1.5 text-[13px] font-medium text-gray-700 mb-1.5">
                <Calendar className="w-4 h-4" />
                Deadline <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                required
                min={formatDateTimeLocal(new Date())}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-[14px] focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
              <p className="mt-1 text-[12px] text-gray-500">
                Default is {deadlineDays} days from now (based on stage template)
              </p>
            </div>

            {/* External URL */}
            <div>
              <label className="flex items-center gap-1.5 text-[13px] font-medium text-gray-700 mb-1.5">
                <ExternalLink className="w-4 h-4" />
                Assessment URL <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="url"
                value={formData.external_url}
                onChange={(e) => setFormData({ ...formData, external_url: e.target.value })}
                placeholder="https://..."
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-[14px] focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
              <p className="mt-1 text-[12px] text-gray-500">
                Link to the assessment platform (e.g., Codility, HackerRank)
              </p>
            </div>

            {/* Instructions */}
            <div>
              <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                Instructions <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                placeholder="Enter any specific instructions for the candidate..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-[14px] focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
              />
            </div>

            {/* Send Notification */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.send_notification}
                onChange={(e) => setFormData({ ...formData, send_notification: e.target.checked })}
                className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
              />
              <Bell className="w-4 h-4 text-gray-500" />
              <span className="text-[13px] text-gray-700">
                Send notification to candidate
              </span>
            </label>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                disabled={isAssigning}
                className="px-4 py-2 text-[14px] font-medium text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isAssigning}
                className="px-4 py-2 text-[14px] font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2"
              >
                {isAssigning ? (
                  <>
                    <span className="animate-spin">
                      <ClipboardCheck className="w-4 h-4" />
                    </span>
                    Assigning...
                  </>
                ) : (
                  <>
                    <ClipboardCheck className="w-4 h-4" />
                    Assign Assessment
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
