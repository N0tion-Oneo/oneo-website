import { useState, useRef, useEffect, type RefObject } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Upload, X, Loader2, ArrowRight } from 'lucide-react'
import api from '@/services/api'
import type { OnboardingProfileStepData } from '@/services/api'
import type { Industry, Company } from '@/types'

interface ProfileStepProps {
  onSubmit: (data: OnboardingProfileStepData) => Promise<void>
  isSubmitting: boolean
  previewMode?: boolean
  formRef?: RefObject<HTMLFormElement | null>
}

const COMPANY_SIZES = [
  { value: '1-10', label: '1-10 employees' },
  { value: '11-50', label: '11-50 employees' },
  { value: '51-200', label: '51-200 employees' },
  { value: '201-500', label: '201-500 employees' },
  { value: '501-1000', label: '501-1000 employees' },
  { value: '1001-5000', label: '1001-5000 employees' },
  { value: '5001+', label: '5001+ employees' },
]

export function ProfileStep({ onSubmit, isSubmitting, previewMode = false, formRef }: ProfileStepProps) {
  const [tagline, setTagline] = useState('')
  const [description, setDescription] = useState('')
  const [industryId, setIndustryId] = useState<number | null>(null)
  const [companySize, setCompanySize] = useState('')
  const [logo, setLogo] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const hasMountedRef = useRef(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch current company data to pre-populate form
  const { data: company, dataUpdatedAt } = useQuery<Company>({
    queryKey: ['my-company'],
    queryFn: async () => {
      const response = await api.get('/companies/my/')
      return response.data
    },
    enabled: !previewMode,
    retry: false,
    staleTime: 0, // Always check for fresh data
  })

  // Pre-populate form with existing company data on mount or when data refreshes
  useEffect(() => {
    if (company) {
      // Always populate on first render, or when data was just refreshed (after invalidation)
      if (!hasMountedRef.current) {
        setTagline(company.tagline || '')
        setDescription(company.description || '')
        setIndustryId(company.industry?.id ? Number(company.industry.id) : null)
        setCompanySize(company.company_size || '')
        setLogoPreview(company.logo || null)
        hasMountedRef.current = true
      }
    }
  }, [company, dataUpdatedAt])

  // Fetch industries
  const { data: industries = [] } = useQuery<Industry[]>({
    queryKey: ['industries'],
    queryFn: async () => {
      const response = await api.get('/industries/')
      return response.data
    },
  })

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setLogo(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveLogo = () => {
    setLogo(null)
    setLogoPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (previewMode) return

    const data: OnboardingProfileStepData = {}
    if (tagline.trim()) data.tagline = tagline.trim()
    if (description.trim()) data.description = description.trim()
    if (industryId) data.industry_id = industryId
    if (companySize) data.company_size = companySize
    if (logo) data.logo = logo

    await onSubmit(data)
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      {/* Logo & Tagline Card */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <h3 className="text-[13px] font-medium text-gray-900 mb-3">Branding</h3>

        {/* Logo Upload */}
        <div className="mb-4">
          <label className="block text-xs text-gray-500 mb-2">Company Logo</label>
          <div className="flex items-center gap-4">
            {logoPreview ? (
              <div className="relative flex-shrink-0">
                <img
                  src={logoPreview}
                  alt="Logo preview"
                  className="w-16 h-16 rounded-lg object-cover border border-gray-200"
                />
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow-sm"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-gray-400 hover:bg-gray-100 transition-colors flex-shrink-0"
              >
                <Upload className="w-5 h-5 text-gray-400" />
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              className="hidden"
            />
            <p className="text-xs text-gray-500">
              Upload a square logo (recommended 200x200px)
            </p>
          </div>
        </div>

        {/* Tagline */}
        <div>
          <label htmlFor="tagline" className="block text-xs text-gray-500 mb-1">
            Tagline
          </label>
          <input
            id="tagline"
            type="text"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            placeholder="A brief tagline for your company"
            maxLength={300}
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
        </div>
      </div>

      {/* Description Card */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <h3 className="text-[13px] font-medium text-gray-900 mb-3">About Your Company</h3>
        <div>
          <label htmlFor="description" className="block text-xs text-gray-500 mb-1">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tell us about your company, culture, and what you're looking for..."
            rows={3}
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
          />
        </div>
      </div>

      {/* Details Card */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <h3 className="text-[13px] font-medium text-gray-900 mb-3">Company Details</h3>
        <div className="grid grid-cols-2 gap-4">
          {/* Industry */}
          <div>
            <label htmlFor="industry" className="block text-xs text-gray-500 mb-1">
              Industry
            </label>
            <select
              id="industry"
              value={industryId || ''}
              onChange={(e) => setIndustryId(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            >
              <option value="">Select industry</option>
              {industries.map((industry) => (
                <option key={industry.id} value={industry.id}>
                  {industry.name}
                </option>
              ))}
            </select>
          </div>

          {/* Company Size */}
          <div>
            <label htmlFor="size" className="block text-xs text-gray-500 mb-1">
              Company Size
            </label>
            <select
              id="size"
              value={companySize}
              onChange={(e) => setCompanySize(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            >
              <option value="">Select size</option>
              {COMPANY_SIZES.map((size) => (
                <option key={size.value} value={size.value}>
                  {size.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Mobile Submit Button - Hidden on desktop where left panel has buttons */}
      <div className="pt-2 lg:hidden">
        <button
          type="submit"
          disabled={isSubmitting || previewMode}
          className="w-full py-2.5 px-4 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              Continue
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </form>
  )
}
