import { useState, useCallback } from 'react'
import { X, Send, CheckCircle, AlertCircle, Upload, ExternalLink } from 'lucide-react'
import { useApplyToJob } from '@/hooks'
import { QuestionType } from '@/types'
import type { Job, Application, ApplicationQuestion, ApplicationAnswerInput } from '@/types'

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
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [success, setSuccess] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  const questions = job.questions || []

  const handleAnswerChange = useCallback((questionId: string, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }))
    setValidationErrors([])
  }, [])

  const handleMultiSelectChange = useCallback((questionId: string, option: string, checked: boolean) => {
    setAnswers((prev) => {
      const current = prev[questionId] ? prev[questionId].split(',').filter(Boolean) : []
      let updated: string[]
      if (checked) {
        updated = [...current, option]
      } else {
        updated = current.filter((o) => o !== option)
      }
      return {
        ...prev,
        [questionId]: updated.join(','),
      }
    })
    setValidationErrors([])
  }, [])

  const validateAnswers = (): boolean => {
    const errors: string[] = []
    questions.forEach((q) => {
      if (q.is_required) {
        const answer = answers[q.id]
        if (!answer || answer.trim() === '') {
          errors.push(`"${q.question_text}" is required`)
        }
      }
    })
    setValidationErrors(errors)
    return errors.length === 0
  }

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateAnswers()) {
      return
    }

    try {
      // Build answers array
      const answersArray: ApplicationAnswerInput[] = questions
        .filter((q) => answers[q.id])
        .map((q) => ({
          question_id: q.id,
          answer_text: answers[q.id],
        }))

      const application = await apply({
        job_id: job.id,
        covering_statement: coveringStatement,
        answers: answersArray,
      })
      setSuccess(true)
      onSuccess?.(application)
    } catch {
      // Error is handled by the hook
    }
  }

  const handleClose = () => {
    setCoveringStatement('')
    setAnswers({})
    setSuccess(false)
    setValidationErrors([])
    onClose()
  }

  const renderQuestionInput = (question: ApplicationQuestion) => {
    const value = answers[question.id] || ''

    switch (question.question_type) {
      case QuestionType.TEXT:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            placeholder={question.placeholder || ''}
            className="w-full px-3 py-2 border border-gray-200 rounded-md text-[14px] focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
        )

      case QuestionType.TEXTAREA:
        return (
          <textarea
            value={value}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            placeholder={question.placeholder || ''}
            rows={4}
            className="w-full px-3 py-2 border border-gray-200 rounded-md text-[14px] focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
          />
        )

      case QuestionType.SELECT:
        return (
          <select
            value={value}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-md text-[14px] focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          >
            <option value="">Select an option...</option>
            {question.options.map((option, idx) => (
              <option key={idx} value={option}>
                {option}
              </option>
            ))}
          </select>
        )

      case QuestionType.MULTI_SELECT:
        const selectedOptions = value ? value.split(',').filter(Boolean) : []
        return (
          <div className="space-y-2">
            {question.options.map((option, idx) => (
              <label key={idx} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedOptions.includes(option)}
                  onChange={(e) =>
                    handleMultiSelectChange(question.id, option, e.target.checked)
                  }
                  className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
                />
                <span className="text-[14px] text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        )

      case QuestionType.FILE:
        return (
          <div className="border border-dashed border-gray-300 rounded-md p-4 text-center">
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-[13px] text-gray-500 mb-2">
              File upload coming soon. Please paste a link to your file.
            </p>
            <input
              type="url"
              value={value}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
              placeholder="Paste file URL (Google Drive, Dropbox, etc.)"
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-[14px] focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          </div>
        )

      case QuestionType.EXTERNAL_LINK:
        return (
          <div className="flex items-center gap-2">
            <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              type="url"
              value={value}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
              placeholder={question.placeholder || 'Paste link here...'}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-md text-[14px] focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[300]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
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
        <div className="px-6 py-4 overflow-y-auto flex-1">
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
              {(error || validationErrors.length > 0) && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-red-700">
                      {error && <p>{error}</p>}
                      {validationErrors.map((err, idx) => (
                        <p key={idx}>{err}</p>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Covering Statement */}
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
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-[14px] focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
                  placeholder="Tell the hiring team why you're excited about this opportunity..."
                />
              </div>

              {/* Custom Questions */}
              {questions.length > 0 && (
                <div className="space-y-4 mb-4">
                  <div className="border-t border-gray-100 pt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">
                      Additional Questions
                    </h4>
                  </div>
                  {questions
                    .sort((a, b) => a.order - b.order)
                    .map((question) => (
                      <div key={question.id}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {question.question_text}
                          {question.is_required && (
                            <span className="text-red-500 ml-1">*</span>
                          )}
                        </label>
                        {question.helper_text && (
                          <p className="text-xs text-gray-500 mb-2">
                            {question.helper_text}
                          </p>
                        )}
                        {renderQuestionInput(question)}
                      </div>
                    ))}
                </div>
              )}

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
