import { useState, useEffect, useCallback } from 'react'
import { X, Loader2 } from 'lucide-react'
import { useCreateLead } from '@/hooks'
import { LeadForm, emptyLeadFormData, isLeadFormValid } from '@/components/forms'
import type { LeadFormData } from '@/components/forms'

interface CreateLeadModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function CreateLeadModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateLeadModalProps) {
  const [formData, setFormData] = useState<LeadFormData>(emptyLeadFormData)
  const [error, setError] = useState('')

  const { createLead, isCreating, error: apiError } = useCreateLead()

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData(emptyLeadFormData)
      setError('')
    }
  }, [isOpen])

  // Handle escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isCreating) {
        onClose()
      }
    },
    [onClose, isCreating]
  )

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, handleKeyDown])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!isLeadFormValid(formData)) {
      setError('Please fill in all required fields')
      return
    }

    try {
      await createLead(formData)
      onSuccess()
      onClose()
    } catch {
      // Error is handled by the hook
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[300]"
        onClick={isCreating ? undefined : onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[301] flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
            <h3 className="text-[16px] font-semibold text-gray-900">Create Lead</h3>
            <button
              onClick={onClose}
              disabled={isCreating}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit}>
            <div className="px-5 py-4">
              <p className="text-[13px] text-gray-600 mb-4">
                Add a new contact to the prospecting pipeline.
              </p>

              <LeadForm
                value={formData}
                onChange={setFormData}
                error={error || apiError}
                autoFocus={isOpen}
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-5 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
              <button
                type="button"
                onClick={onClose}
                disabled={isCreating}
                className="px-4 py-2 text-[13px] font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreating || !isLeadFormValid(formData)}
                className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Lead'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
