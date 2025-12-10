import { useState } from 'react'
import { X, AlertCircle, ClipboardCheck, Upload, Link, FileText, ExternalLink, Clock, Info } from 'lucide-react'
import { useSubmitAssessment } from '@/hooks'
import type { PendingAssessment, ApplicationStageInstance, SubmitAssessmentInput } from '@/types'

interface AssessmentSubmissionModalProps {
  isOpen: boolean
  onClose: () => void
  applicationId: string
  assessment: PendingAssessment
  onSuccess?: () => void
}

const formatDeadline = (deadline: string | null): string => {
  if (!deadline) return 'No deadline'
  const date = new Date(deadline)
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function AssessmentSubmissionModal({
  isOpen,
  onClose,
  applicationId,
  assessment,
  onSuccess,
}: AssessmentSubmissionModalProps) {
  const { submit, isSubmitting, error: submitError } = useSubmitAssessment()

  const [formData, setFormData] = useState<{
    submission_url: string
    submission_file: File | null
  }>({
    submission_url: '',
    submission_file: null,
  })

  const [localError, setLocalError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)

    // Require at least one submission method
    if (!formData.submission_url && !formData.submission_file) {
      setLocalError('Please provide a submission URL or upload a file')
      return
    }

    try {
      const data: SubmitAssessmentInput = {
        submission_url: formData.submission_url || undefined,
        submission_file: formData.submission_file || undefined,
      }

      await submit(applicationId, assessment.instance_id, data)
      onSuccess?.()
      onClose()
    } catch (err) {
      setLocalError((err as Error).message || 'Failed to submit assessment')
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setLocalError('File size must be less than 10MB')
        return
      }
      setFormData({ ...formData, submission_file: file })
      setLocalError(null)
    }
  }

  if (!isOpen) return null

  const error = localError || submitError

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[300] flex items-center justify-center"
        onClick={onClose}
      >
        {/* Modal */}
        <div
          className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Upload className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-[16px] font-semibold text-gray-900">
                  Submit Assessment
                </h2>
                <p className="text-[13px] text-gray-500">
                  {assessment.stage_name}
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

            {/* Deadline Info */}
            {assessment.deadline && (
              <div className={`p-3 rounded-md flex items-start gap-2 ${
                assessment.deadline_passed
                  ? 'bg-red-50 border border-red-200'
                  : 'bg-blue-50 border border-blue-200'
              }`}>
                <Clock className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                  assessment.deadline_passed ? 'text-red-500' : 'text-blue-500'
                }`} />
                <div>
                  <p className={`text-sm font-medium ${
                    assessment.deadline_passed ? 'text-red-700' : 'text-blue-700'
                  }`}>
                    {assessment.deadline_passed ? 'Deadline passed' : 'Deadline'}
                  </p>
                  <p className={`text-sm ${
                    assessment.deadline_passed ? 'text-red-600' : 'text-blue-600'
                  }`}>
                    {formatDeadline(assessment.deadline)}
                  </p>
                </div>
              </div>
            )}

            {/* Instructions */}
            {assessment.instructions && (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4 text-gray-500" />
                  <span className="text-[13px] font-medium text-gray-700">Instructions</span>
                </div>
                <p className="text-[13px] text-gray-600 whitespace-pre-wrap">
                  {assessment.instructions}
                </p>
              </div>
            )}

            {/* External URL (if provided by recruiter) */}
            {assessment.external_url && (
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-md">
                <div className="flex items-center gap-2 mb-2">
                  <ExternalLink className="w-4 h-4 text-purple-500" />
                  <span className="text-[13px] font-medium text-purple-700">Assessment Platform</span>
                </div>
                <a
                  href={assessment.external_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[13px] text-purple-600 hover:text-purple-800 underline"
                >
                  {assessment.external_url}
                </a>
              </div>
            )}

            <hr className="border-gray-200" />

            <p className="text-[13px] text-gray-600">
              Submit your completed assessment by providing a link to your work or uploading a file.
            </p>

            {/* Submission URL */}
            <div>
              <label className="flex items-center gap-1.5 text-[13px] font-medium text-gray-700 mb-1.5">
                <Link className="w-4 h-4" />
                Submission URL
              </label>
              <input
                type="url"
                value={formData.submission_url}
                onChange={(e) => setFormData({ ...formData, submission_url: e.target.value })}
                placeholder="https://github.com/... or https://drive.google.com/..."
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-[14px] focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <p className="mt-1 text-[12px] text-gray-500">
                Link to your completed work (GitHub, Google Drive, etc.)
              </p>
            </div>

            {/* Or separator */}
            <div className="flex items-center gap-3">
              <div className="flex-1 border-t border-gray-200" />
              <span className="text-[12px] text-gray-400 font-medium">OR</span>
              <div className="flex-1 border-t border-gray-200" />
            </div>

            {/* File Upload */}
            <div>
              <label className="flex items-center gap-1.5 text-[13px] font-medium text-gray-700 mb-1.5">
                <FileText className="w-4 h-4" />
                Upload File
              </label>
              <div className="relative">
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                  id="assessment-file"
                  accept=".pdf,.doc,.docx,.zip,.tar.gz,.txt,.md"
                />
                <label
                  htmlFor="assessment-file"
                  className="flex items-center justify-center w-full px-4 py-6 border-2 border-dashed border-gray-200 rounded-md cursor-pointer hover:border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  {formData.submission_file ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <FileText className="w-5 h-5" />
                      <span className="text-[14px] font-medium">
                        {formData.submission_file.name}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          setFormData({ ...formData, submission_file: null })
                        }}
                        className="ml-2 text-gray-400 hover:text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-[14px] text-gray-600">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-[12px] text-gray-400 mt-1">
                        PDF, DOC, DOCX, ZIP, TXT, MD (max 10MB)
                      </p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-[14px] font-medium text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || (!formData.submission_url && !formData.submission_file)}
                className="px-4 py-2 text-[14px] font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="animate-spin">
                      <Upload className="w-4 h-4" />
                    </span>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Submit Assessment
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
