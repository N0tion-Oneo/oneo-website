import { useState } from 'react'
import { X, Send, CheckCircle, AlertCircle } from 'lucide-react'
import { useApplyToJob } from '@/hooks'
import type { Job, Application } from '@/types'

interface ApplyModalProps {
  job: Job
  isOpen: boolean
  onClose: () => void
  onSuccess?: (application: Application) => void
}

export default function ApplyModal({
  job,
  isOpen,
  onClose,
  onSuccess,
}: ApplyModalProps) {
  const { apply, isLoading, error } = useApplyToJob()
  const [coveringStatement, setCoveringStatement] = useState('')
  const [success, setSuccess] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const application = await apply({
        job_id: job.id,
        covering_statement: coveringStatement,
      })
      setSuccess(true)
      onSuccess?.(application)
    } catch {
      // Error is handled by the hook
    }
  }

  const handleClose = () => {
    setCoveringStatement('')
    setSuccess(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Apply to {job.title}
            </h2>
            <p className="text-sm text-gray-500">{job.company.name}</p>
          </div>
          <button
            onClick={handleClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {success ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Application Submitted!
              </h3>
              <p className="text-gray-500 mb-6">
                Your application has been sent to {job.company.name}. You can track
                your application status in your dashboard.
              </p>
              <button
                onClick={handleClose}
                className="px-4 py-2 text-[14px] font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 transition-colors"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="mb-4">
                <label
                  htmlFor="covering_statement"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Why are you interested in this role?
                </label>
                <textarea
                  id="covering_statement"
                  value={coveringStatement}
                  onChange={(e) => setCoveringStatement(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-[14px] focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
                  placeholder="Tell the hiring team why you're excited about this opportunity and what makes you a great fit..."
                />
                <p className="mt-1 text-xs text-gray-500">
                  This will be included with your profile when you apply.
                </p>
              </div>

              {/* Interview Process Info */}
              {job.interview_stages && job.interview_stages.length > 0 && (
                <div className="mb-4 p-3 bg-gray-50 rounded-md">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Interview Process
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {job.interview_stages.map((stage, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-md"
                      >
                        {stage.order}. {stage.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isLoading}
                  className="px-4 py-2 text-[14px] font-medium text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 text-[14px] font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                  {isLoading ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
