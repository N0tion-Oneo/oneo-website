import { useState, useEffect, useRef, type RefObject } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, ArrowRight, Building, MapPin, User } from 'lucide-react'
import api from '@/services/api'
import type { OnboardingBillingStepData } from '@/services/api'
import type { Company } from '@/types'

interface Country {
  id: number
  name: string
  code: string
}

interface BillingStepProps {
  onSubmit: (data: OnboardingBillingStepData) => Promise<void>
  isSubmitting: boolean
  previewMode?: boolean
  formRef?: RefObject<HTMLFormElement | null>
}

export function BillingStep({ onSubmit, isSubmitting, previewMode = false, formRef }: BillingStepProps) {
  const [legalName, setLegalName] = useState('')
  const [vatNumber, setVatNumber] = useState('')
  const [registrationNumber, setRegistrationNumber] = useState('')
  const [billingAddress, setBillingAddress] = useState('')
  const [billingCity, setBillingCity] = useState('')
  const [billingCountryId, setBillingCountryId] = useState<number | null>(null)
  const [billingPostalCode, setBillingPostalCode] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const hasMountedRef = useRef(false)

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

  // Pre-populate form with existing company data on mount
  useEffect(() => {
    if (company) {
      // Only populate on first render to avoid overwriting user input
      if (!hasMountedRef.current) {
        setLegalName(company.legal_name || '')
        setVatNumber(company.vat_number || '')
        setRegistrationNumber(company.registration_number || '')
        setBillingAddress(company.billing_address || '')
        setBillingCity(company.billing_city || '')
        setBillingCountryId(company.billing_country?.id || null)
        setBillingPostalCode(company.billing_postal_code || '')
        setContactName(company.billing_contact_name || '')
        setContactEmail(company.billing_contact_email || '')
        setContactPhone(company.billing_contact_phone || '')
        hasMountedRef.current = true
      }
    }
  }, [company, dataUpdatedAt])

  // Fetch countries
  const { data: countries = [] } = useQuery<Country[]>({
    queryKey: ['countries'],
    queryFn: async () => {
      const response = await api.get('/companies/countries/')
      return response.data
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (previewMode) return

    const data: OnboardingBillingStepData = {}
    if (legalName.trim()) data.legal_name = legalName.trim()
    if (vatNumber.trim()) data.vat_number = vatNumber.trim()
    if (registrationNumber.trim()) data.registration_number = registrationNumber.trim()
    if (billingAddress.trim()) data.billing_address = billingAddress.trim()
    if (billingCity.trim()) data.billing_city = billingCity.trim()
    if (billingCountryId) data.billing_country_id = billingCountryId
    if (billingPostalCode.trim()) data.billing_postal_code = billingPostalCode.trim()
    if (contactName.trim()) data.billing_contact_name = contactName.trim()
    if (contactEmail.trim()) data.billing_contact_email = contactEmail.trim()
    if (contactPhone.trim()) data.billing_contact_phone = contactPhone.trim()

    await onSubmit(data)
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      {/* Legal Information Card */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Building className="w-4 h-4 text-gray-500" />
          <h3 className="text-[13px] font-medium text-gray-900">Legal Information</h3>
        </div>

        <div className="space-y-4">
          {/* Legal Name */}
          <div>
            <label htmlFor="legalName" className="block text-xs text-gray-500 mb-1">
              Legal Company Name
            </label>
            <input
              id="legalName"
              type="text"
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              placeholder="Enter legal company name"
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          </div>

          {/* VAT & Registration Numbers */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="vatNumber" className="block text-xs text-gray-500 mb-1">
                VAT Number
              </label>
              <input
                id="vatNumber"
                type="text"
                value={vatNumber}
                onChange={(e) => setVatNumber(e.target.value)}
                placeholder="e.g., ZA1234567890"
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="regNumber" className="block text-xs text-gray-500 mb-1">
                Registration Number
              </label>
              <input
                id="regNumber"
                type="text"
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value)}
                placeholder="e.g., 2020/123456/07"
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Billing Address Card */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="w-4 h-4 text-gray-500" />
          <h3 className="text-[13px] font-medium text-gray-900">Billing Address</h3>
        </div>

        <div className="space-y-4">
          {/* Street Address */}
          <div>
            <label htmlFor="address" className="block text-xs text-gray-500 mb-1">
              Street Address
            </label>
            <textarea
              id="address"
              value={billingAddress}
              onChange={(e) => setBillingAddress(e.target.value)}
              placeholder="Street address"
              rows={2}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
            />
          </div>

          {/* City, Country, Postal Code */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label htmlFor="city" className="block text-xs text-gray-500 mb-1">
                City
              </label>
              <input
                id="city"
                type="text"
                value={billingCity}
                onChange={(e) => setBillingCity(e.target.value)}
                placeholder="City"
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="country" className="block text-xs text-gray-500 mb-1">
                Country
              </label>
              <select
                id="country"
                value={billingCountryId || ''}
                onChange={(e) => setBillingCountryId(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              >
                <option value="">Select</option>
                {countries.map((country) => (
                  <option key={country.id} value={country.id}>
                    {country.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="postalCode" className="block text-xs text-gray-500 mb-1">
                Postal Code
              </label>
              <input
                id="postalCode"
                type="text"
                value={billingPostalCode}
                onChange={(e) => setBillingPostalCode(e.target.value)}
                placeholder="Code"
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Billing Contact Card */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <User className="w-4 h-4 text-gray-500" />
          <h3 className="text-[13px] font-medium text-gray-900">Billing Contact</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="contactName" className="block text-xs text-gray-500 mb-1">
              Contact Name
            </label>
            <input
              id="contactName"
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="Full name"
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="contactEmail" className="block text-xs text-gray-500 mb-1">
                Email
              </label>
              <input
                id="contactEmail"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="billing@company.com"
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="contactPhone" className="block text-xs text-gray-500 mb-1">
                Phone
              </label>
              <input
                id="contactPhone"
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+27 12 345 6789"
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>
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
