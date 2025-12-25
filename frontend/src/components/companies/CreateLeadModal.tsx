import { useState, useEffect, useCallback, useRef } from 'react'
import { X, Loader2 } from 'lucide-react'
import { useCreateLead } from '@/hooks'
import type { CreateLeadInput } from '@/hooks'

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
  const [formData, setFormData] = useState<CreateLeadInput>({
    name: '',
    email: '',
    company_name: '',
    job_title: '',
    phone: '',
  })
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const { createLead, isCreating, error: apiError } = useCreateLead()

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: '',
        email: '',
        company_name: '',
        job_title: '',
        phone: '',
      })
      setError('')
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
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

    if (!formData.name.trim()) {
      setError('Contact name is required')
      return
    }

    if (!formData.email.trim()) {
      setError('Contact email is required')
      return
    }

    if (!formData.company_name.trim()) {
      setError('Company name is required')
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
            <div className="px-5 py-4 space-y-4">
              <p className="text-[13px] text-gray-600">
                Add a new contact to the prospecting pipeline.
              </p>

              {/* Contact Name */}
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1">
                  Contact Name <span className="text-red-500">*</span>
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Smith"
                  className="w-full px-3 py-2 text-[14px] border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>

              {/* Contact Email */}
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1">
                  Contact Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@acme.com"
                  className="w-full px-3 py-2 text-[14px] border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>

              {/* Company Name */}
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  placeholder="Acme Corp"
                  className="w-full px-3 py-2 text-[14px] border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>

              {/* Job Title */}
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1">
                  Job Title
                </label>
                <input
                  type="text"
                  value={formData.job_title || ''}
                  onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                  placeholder="Head of Talent"
                  className="w-full px-3 py-2 text-[14px] border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                  className="w-full px-3 py-2 text-[14px] border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>

              {(error || apiError) && (
                <p className="text-[12px] text-red-600">{error || apiError}</p>
              )}
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
                disabled={isCreating || !formData.name.trim() || !formData.email.trim() || !formData.company_name.trim()}
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
