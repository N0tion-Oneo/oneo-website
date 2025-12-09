import { useState, useEffect } from 'react'
import { IndustryMultiSelect, TechnologyMultiSelect, AssignedToSelect } from '@/components/forms'
import BenefitsEditor from './BenefitsEditor'
import ValuesEditor from './ValuesEditor'
import { useCountries, useCities } from '@/hooks'
import { useAuth } from '@/contexts/AuthContext'
import type { Company, CompanyInput, Industry, BenefitCategory, Technology, RemoteWorkPolicy, AssignedUser } from '@/types'
import { UserRole } from '@/types'
import { Upload, X } from 'lucide-react'

type Tab = 'basic' | 'culture' | 'benefits' | 'tech' | 'visibility'

interface CompanyFormProps {
  company?: Company
  onSave: (data: CompanyInput) => Promise<void>
  isSubmitting?: boolean
  isAdmin?: boolean
}

export default function CompanyForm({ company, onSave, isSubmitting = false, isAdmin = false }: CompanyFormProps) {
  const { user } = useAuth()
  const isStaffUser = user?.role && [UserRole.ADMIN, UserRole.RECRUITER].includes(user.role)
  const [activeTab, setActiveTab] = useState<Tab>('basic')
  const [formData, setFormData] = useState<CompanyInput>({
    name: '',
    tagline: '',
    description: '',
    industry_id: null,
    company_size: '',
    founded_year: null,
    funding_stage: '',
    website_url: '',
    linkedin_url: '',
    headquarters_city_id: null,
    headquarters_country_id: null,
    culture_description: '',
    values: [],
    benefits: [],
    technology_ids: [],
    remote_work_policy: '',
    // Legal/Registration
    legal_name: '',
    registration_number: '',
    vat_number: '',
    // Billing
    billing_address: '',
    billing_city: '',
    billing_country_id: null,
    billing_postal_code: '',
    billing_contact_name: '',
    billing_contact_email: '',
    billing_contact_phone: '',
    // Meta
    is_published: false,
  })
  const [selectedIndustry, setSelectedIndustry] = useState<Industry[]>([])
  const [selectedTechnologies, setSelectedTechnologies] = useState<Technology[]>([])
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [assignedTo, setAssignedTo] = useState<AssignedUser[]>([])

  // Location hooks
  const { countries } = useCountries()
  const { cities } = useCities({ countryId: formData.headquarters_country_id })

  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name || '',
        tagline: company.tagline || '',
        description: company.description || '',
        industry_id: company.industry?.id || null,
        company_size: company.company_size || '',
        founded_year: company.founded_year,
        funding_stage: company.funding_stage || '',
        website_url: company.website_url || '',
        linkedin_url: company.linkedin_url || '',
        headquarters_city_id: company.headquarters_city?.id || null,
        headquarters_country_id: company.headquarters_country?.id || null,
        culture_description: company.culture_description || '',
        values: company.values || [],
        benefits: company.benefits || [],
        technology_ids: company.technologies?.map((t) => t.id) || [],
        remote_work_policy: company.remote_work_policy || '',
        // Legal/Registration
        legal_name: company.legal_name || '',
        registration_number: company.registration_number || '',
        vat_number: company.vat_number || '',
        // Billing
        billing_address: company.billing_address || '',
        billing_city: company.billing_city || '',
        billing_country_id: company.billing_country?.id || null,
        billing_postal_code: company.billing_postal_code || '',
        billing_contact_name: company.billing_contact_name || '',
        billing_contact_email: company.billing_contact_email || '',
        billing_contact_phone: company.billing_contact_phone || '',
        // Meta
        is_published: company.is_published || false,
      })
      if (company.industry) {
        setSelectedIndustry([company.industry])
      }
      if (company.technologies) {
        setSelectedTechnologies(company.technologies)
      }
      if (company.logo) {
        setLogoPreview(company.logo)
      }
      if (company.assigned_to) {
        setAssignedTo(company.assigned_to)
      }
    }
  }, [company])

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target
    let processedValue: string | number | boolean | null = value

    if (type === 'checkbox') {
      processedValue = (e.target as HTMLInputElement).checked
    } else if (name === 'founded_year') {
      processedValue = value ? parseInt(value, 10) : null
    } else if (name === 'headquarters_country_id' || name === 'headquarters_city_id' || name === 'billing_country_id') {
      processedValue = value ? parseInt(value, 10) : null
      // Clear city when country changes
      if (name === 'headquarters_country_id') {
        setFormData((prev) => ({
          ...prev,
          headquarters_country_id: processedValue as number | null,
          headquarters_city_id: null,
        }))
        return
      }
    }

    setFormData((prev) => ({
      ...prev,
      [name]: processedValue,
    }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData((prev) => ({ ...prev, logo: file }))
      const reader = new FileReader()
      reader.onload = () => setLogoPreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const removeLogo = () => {
    setFormData((prev) => ({ ...prev, logo: null }))
    setLogoPreview(null)
  }

  const handleIndustryChange = (industries: Industry[]) => {
    setSelectedIndustry(industries)
    const firstIndustry = industries[0]
    setFormData((prev) => ({
      ...prev,
      industry_id: firstIndustry ? firstIndustry.id : null,
    }))
  }

  const handleTechnologiesChange = (technologies: Technology[]) => {
    setSelectedTechnologies(technologies)
    setFormData((prev) => ({
      ...prev,
      technology_ids: technologies.map((t) => t.id),
    }))
  }

  const handleValuesChange = (values: string[]) => {
    setFormData((prev) => ({ ...prev, values }))
  }

  const handleBenefitsChange = (benefits: BenefitCategory[]) => {
    setFormData((prev) => ({ ...prev, benefits }))
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!formData.name?.trim()) {
      newErrors.name = 'Company name is required'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    const dataToSave = {
      ...formData,
      // Include assigned_to_ids only when user is a platform admin/recruiter
      ...(isStaffUser && { assigned_to_ids: assignedTo.map(u => u.id) }),
    }
    await onSave(dataToSave)
  }

  const currentYear = new Date().getFullYear()

  const tabs: { id: Tab; label: string }[] = [
    { id: 'basic', label: 'Basic Info' },
    { id: 'culture', label: 'Culture' },
    { id: 'benefits', label: 'Benefits' },
    { id: 'tech', label: 'Tech Stack' },
    { id: 'visibility', label: 'Visibility' },
  ]

  const remoteWorkPolicyOptions: { value: RemoteWorkPolicy; label: string }[] = [
    { value: 'fully_remote' as RemoteWorkPolicy, label: 'Fully Remote' },
    { value: 'remote_first' as RemoteWorkPolicy, label: 'Remote First' },
    { value: 'hybrid' as RemoteWorkPolicy, label: 'Hybrid' },
    { value: 'office_first' as RemoteWorkPolicy, label: 'Office First' },
    { value: 'office_only' as RemoteWorkPolicy, label: 'Office Only' },
  ]

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 text-[13px] font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="p-6">
        {/* Basic Info Tab */}
        {activeTab === 'basic' && (
          <div className="space-y-5">
            {/* Logo */}
            <div>
              <label className="block text-[13px] font-medium text-gray-700 mb-2">Company Logo</label>
              <div className="flex items-center gap-4">
                {logoPreview ? (
                  <div className="relative">
                    <img
                      src={logoPreview}
                      alt="Company logo"
                      className="w-20 h-20 rounded-lg object-cover border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={removeLogo}
                      className="absolute -top-2 -right-2 p-1 bg-white rounded-full shadow-md border border-gray-200 text-gray-500 hover:text-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <label className="w-20 h-20 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 cursor-pointer hover:border-gray-400 transition-colors">
                    <Upload className="w-5 h-5 text-gray-400" />
                    <span className="text-[11px] text-gray-500 mt-1">Upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                  </label>
                )}
                <div className="text-[12px] text-gray-500">
                  <p>Square image, at least 200x200px</p>
                  <p>JPG, PNG, GIF (max 5MB)</p>
                </div>
              </div>
            </div>

            {/* Assigned To (Platform Admin/Recruiter only) */}
            {isStaffUser && (
              <AssignedToSelect
                selected={assignedTo}
                onChange={setAssignedTo}
                placeholder="Assign recruiters..."
              />
            )}

            {/* Name and Tagline */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                  Company Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g. Acme Inc."
                  className={`w-full px-3 py-2 text-[14px] border rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent ${
                    errors.name ? 'border-red-300' : 'border-gray-200'
                  }`}
                />
                {errors.name && <p className="mt-1 text-[12px] text-red-500">{errors.name}</p>}
              </div>
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1.5">Tagline</label>
                <input
                  type="text"
                  name="tagline"
                  value={formData.tagline}
                  onChange={handleInputChange}
                  placeholder="A short description of what you do"
                  className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                About the Company
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                placeholder="Tell candidates about your company, mission, and what makes you unique..."
                className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
              />
            </div>

            {/* Industry, Size, Founded */}
            <div className="grid grid-cols-3 gap-4">
              <IndustryMultiSelect
                selected={selectedIndustry}
                onChange={handleIndustryChange}
                maxItems={1}
                label="Industry"
              />
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                  Company Size
                </label>
                <select
                  name="company_size"
                  value={formData.company_size}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                >
                  <option value="">Select size</option>
                  <option value="1-10">1-10 employees</option>
                  <option value="11-50">11-50 employees</option>
                  <option value="51-200">51-200 employees</option>
                  <option value="201-500">201-500 employees</option>
                  <option value="501-1000">501-1000 employees</option>
                  <option value="1000+">1000+ employees</option>
                </select>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                  Founded Year
                </label>
                <input
                  type="number"
                  name="founded_year"
                  value={formData.founded_year || ''}
                  onChange={handleInputChange}
                  min={1800}
                  max={currentYear}
                  placeholder={currentYear.toString()}
                  className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>
            </div>

            {/* Funding and Location */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                  Funding Stage
                </label>
                <select
                  name="funding_stage"
                  value={formData.funding_stage}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                >
                  <option value="">Select stage</option>
                  <option value="bootstrapped">Bootstrapped</option>
                  <option value="seed">Seed</option>
                  <option value="series_a">Series A</option>
                  <option value="series_b">Series B</option>
                  <option value="series_c">Series C</option>
                  <option value="series_d_plus">Series D+</option>
                  <option value="public">Public</option>
                </select>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                  Country
                </label>
                <select
                  name="headquarters_country_id"
                  value={formData.headquarters_country_id || ''}
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
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                  Headquarters City
                </label>
                <select
                  name="headquarters_city_id"
                  value={formData.headquarters_city_id || ''}
                  onChange={handleInputChange}
                  disabled={!formData.headquarters_country_id}
                  className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
                >
                  <option value="">
                    {formData.headquarters_country_id ? 'Select city' : 'Select country first'}
                  </option>
                  {cities.map((city) => (
                    <option key={city.id} value={city.id}>
                      {city.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Links */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1.5">Website</label>
                <input
                  type="url"
                  name="website_url"
                  value={formData.website_url}
                  onChange={handleInputChange}
                  placeholder="https://www.example.com"
                  className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1.5">LinkedIn</label>
                <input
                  type="url"
                  name="linkedin_url"
                  value={formData.linkedin_url}
                  onChange={handleInputChange}
                  placeholder="https://linkedin.com/company/example"
                  className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        )}

        {/* Culture Tab */}
        {activeTab === 'culture' && (
          <div className="space-y-5">
            <div>
              <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                Culture Description
              </label>
              <textarea
                name="culture_description"
                value={formData.culture_description}
                onChange={handleInputChange}
                rows={4}
                placeholder="Describe your company culture, work environment, and team dynamics..."
                className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
              />
            </div>

            <ValuesEditor values={formData.values || []} onChange={handleValuesChange} />

            <div>
              <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                Remote Work Policy
              </label>
              <select
                name="remote_work_policy"
                value={formData.remote_work_policy}
                onChange={handleInputChange}
                className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              >
                <option value="">Select policy</option>
                {remoteWorkPolicyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Benefits Tab */}
        {activeTab === 'benefits' && (
          <div className="space-y-5">
            <BenefitsEditor benefits={formData.benefits || []} onChange={handleBenefitsChange} />
          </div>
        )}

        {/* Tech Stack Tab */}
        {activeTab === 'tech' && (
          <div className="space-y-5">
            <TechnologyMultiSelect
              selected={selectedTechnologies}
              onChange={handleTechnologiesChange}
              maxItems={30}
              label="Tech Stack"
            />
            <p className="text-[13px] text-gray-500">
              Select the technologies and tools your company uses.
            </p>
          </div>
        )}

        {/* Visibility Tab */}
        {activeTab === 'visibility' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_published"
                name="is_published"
                checked={formData.is_published}
                onChange={handleInputChange}
                className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
              />
              <label htmlFor="is_published" className="text-[14px] text-gray-700">
                Publish company profile
              </label>
            </div>
            <p className="text-[13px] text-gray-500">
              When published, your company profile will be visible in the public company directory and
              candidates can view your profile.
            </p>
          </div>
        )}
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
