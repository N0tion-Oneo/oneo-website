import { useRef, useEffect } from 'react'

export interface LeadFormData {
  name: string
  email: string
  company_name: string
  phone: string
}

export const emptyLeadFormData: LeadFormData = {
  name: '',
  email: '',
  company_name: '',
  phone: '',
}

interface LeadFormProps {
  value: LeadFormData
  onChange: (data: LeadFormData) => void
  error?: string | null
  autoFocus?: boolean
}

export default function LeadForm({
  value,
  onChange,
  error,
  autoFocus = false,
}: LeadFormProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (autoFocus) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [autoFocus])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value: inputValue } = e.target
    onChange({ ...value, [name]: inputValue })
  }

  return (
    <div className="space-y-4">
      {/* Name */}
      <div>
        <label
          htmlFor="lead-name"
          className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Full Name <span className="text-red-500">*</span>
        </label>
        <input
          ref={inputRef}
          type="text"
          id="lead-name"
          name="name"
          value={value.name}
          onChange={handleChange}
          placeholder="John Smith"
          required
          className="w-full px-3 py-2 text-[14px] border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent"
        />
      </div>

      {/* Email */}
      <div>
        <label
          htmlFor="lead-email"
          className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Email <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          id="lead-email"
          name="email"
          value={value.email}
          onChange={handleChange}
          placeholder="john@company.com"
          required
          className="w-full px-3 py-2 text-[14px] border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent"
        />
      </div>

      {/* Company Name */}
      <div>
        <label
          htmlFor="lead-company"
          className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Company Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="lead-company"
          name="company_name"
          value={value.company_name}
          onChange={handleChange}
          placeholder="Acme Corp"
          required
          className="w-full px-3 py-2 text-[14px] border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent"
        />
      </div>

      {/* Phone */}
      <div>
        <label
          htmlFor="lead-phone"
          className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Phone <span className="text-red-500">*</span>
        </label>
        <input
          type="tel"
          id="lead-phone"
          name="phone"
          value={value.phone}
          onChange={handleChange}
          placeholder="+27 12 345 6789"
          required
          className="w-full px-3 py-2 text-[14px] border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent"
        />
      </div>

      {error && <p className="text-[12px] text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}

// Helper to validate form data
export function isLeadFormValid(data: LeadFormData): boolean {
  return !!(
    data.name.trim() &&
    data.email.trim() &&
    data.company_name.trim() &&
    data.phone.trim()
  )
}
