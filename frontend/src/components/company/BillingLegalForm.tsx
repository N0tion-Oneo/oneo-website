import { useState, useEffect } from 'react'
import { useCountries } from '@/hooks'
import type { Company } from '@/types'

interface BillingLegalFormProps {
  company: Company
  onSave: (data: BillingLegalInput) => Promise<void>
  isSubmitting?: boolean
}

export interface BillingLegalInput {
  // Legal/Registration
  legal_name: string
  registration_number: string
  vat_number: string
  // Billing
  billing_address: string
  billing_city: string
  billing_country_id: number | null
  billing_postal_code: string
  billing_contact_name: string
  billing_contact_email: string
  billing_contact_phone: string
}

export default function BillingLegalForm({ company, onSave, isSubmitting = false }: BillingLegalFormProps) {
  const [formData, setFormData] = useState<BillingLegalInput>({
    legal_name: '',
    registration_number: '',
    vat_number: '',
    billing_address: '',
    billing_city: '',
    billing_country_id: null,
    billing_postal_code: '',
    billing_contact_name: '',
    billing_contact_email: '',
    billing_contact_phone: '',
  })

  const { countries } = useCountries()

  useEffect(() => {
    if (company) {
      setFormData({
        legal_name: company.legal_name || '',
        registration_number: company.registration_number || '',
        vat_number: company.vat_number || '',
        billing_address: company.billing_address || '',
        billing_city: company.billing_city || '',
        billing_country_id: company.billing_country?.id || null,
        billing_postal_code: company.billing_postal_code || '',
        billing_contact_name: company.billing_contact_name || '',
        billing_contact_email: company.billing_contact_email || '',
        billing_contact_phone: company.billing_contact_phone || '',
      })
    }
  }, [company])

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    let processedValue: string | number | null = value

    if (name === 'billing_country_id') {
      processedValue = value ? parseInt(value, 10) : null
    }

    setFormData((prev) => ({
      ...prev,
      [name]: processedValue,
    }))
  }

  const handleSubmit = async () => {
    await onSave(formData)
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="p-6">
        <div className="space-y-6">
          {/* Legal/Registration Section */}
          <div>
            <h3 className="text-[14px] font-medium text-gray-900 mb-4">Legal Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                  Legal Business Name
                </label>
                <input
                  type="text"
                  name="legal_name"
                  value={formData.legal_name}
                  onChange={handleInputChange}
                  placeholder="Official registered business name"
                  className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                    Registration Number
                  </label>
                  <input
                    type="text"
                    name="registration_number"
                    value={formData.registration_number}
                    onChange={handleInputChange}
                    placeholder="Company registration number"
                    className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                    VAT / Tax ID
                  </label>
                  <input
                    type="text"
                    name="vat_number"
                    value={formData.vat_number}
                    onChange={handleInputChange}
                    placeholder="VAT or Tax ID number"
                    className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Billing Address Section */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-[14px] font-medium text-gray-900 mb-4">Billing Address</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                  Street Address
                </label>
                <input
                  type="text"
                  name="billing_address"
                  value={formData.billing_address}
                  onChange={handleInputChange}
                  placeholder="123 Main Street, Suite 100"
                  className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-gray-700 mb-1.5">City</label>
                  <input
                    type="text"
                    name="billing_city"
                    value={formData.billing_city}
                    onChange={handleInputChange}
                    placeholder="City"
                    className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    name="billing_postal_code"
                    value={formData.billing_postal_code}
                    onChange={handleInputChange}
                    placeholder="Postal code"
                    className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                    Country
                  </label>
                  <select
                    name="billing_country_id"
                    value={formData.billing_country_id || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  >
                    <option value="">Select country</option>
                    {countries.map((country) => (
                      <option key={country.id} value={country.id}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Billing Contact Section */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-[14px] font-medium text-gray-900 mb-4">Billing Contact</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                    Contact Name
                  </label>
                  <input
                    type="text"
                    name="billing_contact_name"
                    value={formData.billing_contact_name}
                    onChange={handleInputChange}
                    placeholder="Full name"
                    className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    name="billing_contact_email"
                    value={formData.billing_contact_email}
                    onChange={handleInputChange}
                    placeholder="billing@company.com"
                    className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  name="billing_contact_phone"
                  value={formData.billing_contact_phone}
                  onChange={handleInputChange}
                  placeholder="+1 (555) 123-4567"
                  className="w-full max-w-xs px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="px-5 py-2 text-[14px] font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
