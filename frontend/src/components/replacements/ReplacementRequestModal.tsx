import { useState, useEffect } from 'react'
import { X, AlertCircle, RefreshCw, Calendar, Info, Clock } from 'lucide-react'
import { useReplacementEligibility, useSubmitReplacement } from '@/hooks'
import { ReplacementReasonCategory } from '@/types'

interface ReplacementRequestModalProps {
  isOpen: boolean
  onClose: () => void
  applicationId: string
  candidateName: string
  jobTitle: string
  onSuccess?: () => void
}

const reasonCategoryOptions: { value: ReplacementReasonCategory; label: string; description: string }[] = [
  {
    value: ReplacementReasonCategory.RESIGNATION,
    label: 'Resignation',
    description: 'The candidate resigned from the position',
  },
  {
    value: ReplacementReasonCategory.TERMINATION,
    label: 'Termination',
    description: 'The candidate was terminated for cause',
  },
  {
    value: ReplacementReasonCategory.PERFORMANCE,
    label: 'Performance Issues',
    description: 'The candidate did not meet performance expectations',
  },
  {
    value: ReplacementReasonCategory.CULTURAL_FIT,
    label: 'Cultural Fit',
    description: 'The candidate was not a good cultural fit for the team',
  },
  {
    value: ReplacementReasonCategory.NO_SHOW,
    label: 'No Show',
    description: 'The candidate did not show up on their start date',
  },
  {
    value: ReplacementReasonCategory.OTHER,
    label: 'Other',
    description: 'Other reason not listed above',
  },
]

export default function ReplacementRequestModal({
  isOpen,
  onClose,
  applicationId,
  candidateName,
  jobTitle,
  onSuccess,
}: ReplacementRequestModalProps) {
  const { eligibility, isLoading: isCheckingEligibility, error: eligibilityError, checkEligibility } = useReplacementEligibility()
  const { isSubmitting, error: submitError, submitRequest } = useSubmitReplacement()

  const [reasonCategory, setReasonCategory] = useState<ReplacementReasonCategory | ''>('')
  const [reasonDetails, setReasonDetails] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  // Check eligibility when modal opens
  useEffect(() => {
    if (isOpen && applicationId) {
      checkEligibility(applicationId).catch(() => {
        // Error is handled in the hook
      })
      // Reset form
      setReasonCategory('')
      setReasonDetails('')
      setLocalError(null)
    }
  }, [isOpen, applicationId, checkEligibility])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)

    if (!reasonCategory) {
      setLocalError('Please select a reason for the replacement request')
      return
    }

    try {
      await submitRequest(applicationId, {
        reason_category: reasonCategory,
        reason_details: reasonDetails,
      })
      onSuccess?.()
      onClose()
    } catch (err) {
      setLocalError((err as Error).message || 'Failed to submit replacement request')
    }
  }

  if (!isOpen) return null

  const error = localError || eligibilityError || submitError
  const isEligible = eligibility?.eligible === true

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Not set'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 dark:bg-black/70 z-[300] flex items-center justify-center"
        onClick={onClose}
      >
        {/* Modal */}
        <div
          className="bg-white dark:bg-gray-900 rounded-lg shadow-xl dark:shadow-gray-900/50 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h2 className="text-[16px] font-semibold text-gray-900 dark:text-gray-100">
                  Request Replacement
                </h2>
                <p className="text-[13px] text-gray-500 dark:text-gray-400">
                  {candidateName} - {jobTitle}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6">
            {isCheckingEligibility ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-gray-100"></div>
                <span className="ml-3 text-[14px] text-gray-500 dark:text-gray-400">Checking eligibility...</span>
              </div>
            ) : eligibility && !isEligible ? (
              // Not eligible - show reason
              <div className="space-y-4">
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[14px] font-medium text-red-800 dark:text-red-300">
                        Not Eligible for Replacement
                      </p>
                      <p className="text-[13px] text-red-700 dark:text-red-400 mt-1">
                        {eligibility.reason}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Show eligibility info even when not eligible */}
                {eligibility.replacement_period_days > 0 && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg space-y-3">
                    <div className="flex items-center gap-2">
                      <Info className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      <span className="text-[13px] font-medium text-gray-700 dark:text-gray-300">Replacement Period Info</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-[13px]">
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">Period Length</p>
                        <p className="text-gray-900 dark:text-gray-100 font-medium">{eligibility.replacement_period_days} days</p>
                      </div>
                      {eligibility.start_date && (
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Start Date</p>
                          <p className="text-gray-900 dark:text-gray-100 font-medium">{formatDate(eligibility.start_date)}</p>
                        </div>
                      )}
                      {eligibility.expiry_date && (
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Expiry Date</p>
                          <p className="text-gray-900 dark:text-gray-100 font-medium">{formatDate(eligibility.expiry_date)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-800">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-[14px] font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : isEligible ? (
              // Eligible - show form
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                  </div>
                )}

                {/* Eligibility Info */}
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[14px] font-medium text-green-800 dark:text-green-300">
                        Eligible for Replacement
                      </p>
                      <p className="text-[13px] text-green-700 dark:text-green-400 mt-1">
                        {eligibility.days_remaining} days remaining in the {eligibility.replacement_period_days}-day replacement period
                      </p>
                    </div>
                  </div>
                </div>

                {/* Period Info */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-[13px]">
                  <div>
                    <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 mb-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Start Date
                    </div>
                    <p className="text-gray-900 dark:text-gray-100 font-medium">{formatDate(eligibility.start_date)}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 mb-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Expiry Date
                    </div>
                    <p className="text-gray-900 dark:text-gray-100 font-medium">{formatDate(eligibility.expiry_date)}</p>
                  </div>
                </div>

                {/* Reason Category */}
                <div>
                  <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Reason for Replacement <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    {reasonCategoryOptions.map((option) => (
                      <label
                        key={option.value}
                        className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                          reasonCategory === option.value
                            ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-600'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        <input
                          type="radio"
                          name="reasonCategory"
                          value={option.value}
                          checked={reasonCategory === option.value}
                          onChange={(e) => setReasonCategory(e.target.value as ReplacementReasonCategory)}
                          className="mt-1 w-4 h-4 text-orange-600 border-gray-300 dark:border-gray-600 focus:ring-orange-500"
                        />
                        <div>
                          <p className="text-[13px] font-medium text-gray-900 dark:text-gray-100">{option.label}</p>
                          <p className="text-[12px] text-gray-500 dark:text-gray-400">{option.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Reason Details */}
                <div>
                  <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Additional Details <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={reasonDetails}
                    onChange={(e) => setReasonDetails(e.target.value)}
                    placeholder="Provide any additional context or details about the replacement request..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md text-[14px] text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent resize-none"
                  />
                </div>

                {/* Notice */}
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md flex items-start gap-2">
                  <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div className="text-[12px] text-blue-700 dark:text-blue-400">
                    <p>Your request will be reviewed by our team. Once approved, the job will be reopened and we will begin sourcing replacement candidates.</p>
                    <p className="mt-1.5 text-blue-600 dark:text-blue-300">
                      <strong>Pricing:</strong> Approved requests may be credited (original fee applied to replacement, only difference charged if higher) or discounted (percentage off the new placement fee).
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="px-4 py-2 text-[14px] font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !reasonCategory}
                    className="px-4 py-2 text-[14px] font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="animate-spin">
                          <RefreshCw className="w-4 h-4" />
                        </span>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        Submit Request
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              // Error state
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[14px] font-medium text-red-800 dark:text-red-300">
                      Unable to Check Eligibility
                    </p>
                    <p className="text-[13px] text-red-700 dark:text-red-400 mt-1">
                      {error || 'An unexpected error occurred. Please try again.'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
