import { useState, useEffect, useCallback, useRef } from 'react'
import { X } from 'lucide-react'

interface DeclineModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
  isSubmitting: boolean
}

export default function DeclineModal({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting,
}: DeclineModalProps) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setReason('')
      setError('')
      // Focus textarea after a short delay
      setTimeout(() => {
        textareaRef.current?.focus()
      }, 100)
    }
  }, [isOpen])

  // Handle escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose()
      }
    },
    [onClose, isSubmitting]
  )

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, handleKeyDown])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (reason.trim().length < 10) {
      setError('Please provide a reason with at least 10 characters')
      return
    }

    onConfirm(reason.trim())
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 dark:bg-black/70 z-[300]"
        onClick={isSubmitting ? undefined : onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[301] flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl dark:shadow-gray-900/50 w-full max-w-md">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-[16px] font-semibold text-gray-900 dark:text-gray-100">Decline Suggestion</h3>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit}>
            <div className="px-5 py-4">
              <p className="text-[13px] text-gray-600 dark:text-gray-400 mb-3">
                Please explain why you're declining this suggestion. This helps the recruiter understand your perspective.
              </p>

              <textarea
                ref={textareaRef}
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value)
                  if (error) setError('')
                }}
                placeholder="E.g., The information is already accurate, or I prefer the current wording because..."
                className="w-full h-32 px-3 py-2 text-[14px] border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
              />

              {error && (
                <p className="mt-2 text-[12px] text-red-600 dark:text-red-400">{error}</p>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-5 py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 rounded-b-lg">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-[13px] font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || reason.trim().length < 10}
                className="px-4 py-2 text-[13px] font-medium text-white bg-gray-900 dark:bg-gray-100 dark:text-gray-900 rounded-md hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Submitting...' : 'Decline Suggestion'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
