import { useState, useEffect } from 'react'
import { Building2, Globe, Linkedin, MapPin, Calendar, Users, TrendingUp, Upload, X, Pencil, Check } from 'lucide-react'
import { IndustryMultiSelect } from '@/components/forms'
import { useCountries, useCities } from '@/hooks'
import api from '@/services/api'
import type { Industry, CompanyInput, CompanySize, FundingStage, RemoteWorkPolicy } from '@/types'

interface CompanyDetailsPanelProps {
  companyId: string
  entity?: Record<string, unknown>
  onRefresh?: () => void
}

const companySizeOptions = [
  { value: '1-10', label: '1-10 employees' },
  { value: '11-50', label: '11-50 employees' },
  { value: '51-200', label: '51-200 employees' },
  { value: '201-500', label: '201-500 employees' },
  { value: '501-1000', label: '501-1000 employees' },
  { value: '1000+', label: '1000+ employees' },
]

const fundingStageOptions = [
  { value: 'bootstrapped', label: 'Bootstrapped' },
  { value: 'seed', label: 'Seed' },
  { value: 'series_a', label: 'Series A' },
  { value: 'series_b', label: 'Series B' },
  { value: 'series_c', label: 'Series C' },
  { value: 'series_d_plus', label: 'Series D+' },
  { value: 'public', label: 'Public' },
]

const remoteWorkOptions = [
  { value: 'fully_remote', label: 'Fully Remote' },
  { value: 'remote_first', label: 'Remote First' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'office_first', label: 'Office First' },
  { value: 'office_only', label: 'Office Only' },
]

interface FieldRowProps {
  label: string
  value: string | null | undefined
  icon?: React.ReactNode
  href?: string
  isEditing: boolean
  editComponent?: React.ReactNode
}

function FieldRow({ label, value, icon, href, isEditing, editComponent }: FieldRowProps) {
  if (isEditing && editComponent) {
    return (
      <div className="py-2">
        <label className="block text-[12px] font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>
        {editComponent}
      </div>
    )
  }

  if (!value && !isEditing) return null

  return (
    <div className="flex items-start justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <div className="flex items-center gap-2 text-[12px] text-gray-500 dark:text-gray-400">
        {icon}
        <span>{label}</span>
      </div>
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-[13px] text-blue-600 hover:text-blue-700 text-right max-w-[60%] truncate">
          {value}
        </a>
      ) : (
        <span className="text-[13px] text-gray-900 dark:text-gray-100 text-right max-w-[60%]">{value || '-'}</span>
      )}
    </div>
  )
}

export function CompanyDetailsPanel({ companyId, entity, onRefresh }: CompanyDetailsPanelProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState<CompanyInput>({})
  const [selectedIndustry, setSelectedIndustry] = useState<Industry[]>([])
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { countries } = useCountries()
  const { cities } = useCities({ countryId: formData.headquarters_country_id })

  const company = entity as {
    name?: string
    tagline?: string
    description?: string
    logo?: string
    industry?: Industry
    company_size?: string
    founded_year?: number
    funding_stage?: string
    remote_work_policy?: string
    headquarters_location?: string
    headquarters_city?: { id: number; name: string }
    headquarters_country?: { id: number; name: string }
    website_url?: string
    linkedin_url?: string
  } | undefined

  // Initialize form data when entering edit mode
  useEffect(() => {
    if (isEditing && company) {
      setFormData({
        name: company.name || '',
        tagline: company.tagline || '',
        description: company.description || '',
        industry_id: company.industry?.id || null,
        company_size: (company.company_size as CompanySize) || '',
        founded_year: company.founded_year || null,
        funding_stage: (company.funding_stage as FundingStage) || '',
        remote_work_policy: (company.remote_work_policy as RemoteWorkPolicy) || '',
        headquarters_country_id: company.headquarters_country?.id || null,
        headquarters_city_id: company.headquarters_city?.id || null,
        website_url: company.website_url || '',
        linkedin_url: company.linkedin_url || '',
      })
      if (company.industry) {
        setSelectedIndustry([company.industry])
      }
      if (company.logo) {
        setLogoPreview(company.logo)
      }
    }
  }, [isEditing, company])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    let processedValue: string | number | null = value

    if (name === 'founded_year') {
      processedValue = value ? parseInt(value, 10) : null
    } else if (name === 'headquarters_country_id' || name === 'headquarters_city_id') {
      processedValue = value ? parseInt(value, 10) : null
      if (name === 'headquarters_country_id') {
        setFormData(prev => ({ ...prev, headquarters_country_id: processedValue as number | null, headquarters_city_id: null }))
        return
      }
    }

    setFormData(prev => ({ ...prev, [name]: processedValue }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleIndustryChange = (industries: Industry[]) => {
    setSelectedIndustry(industries)
    setFormData(prev => ({ ...prev, industry_id: industries[0]?.id || null }))
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData(prev => ({ ...prev, logo: file }))
      const reader = new FileReader()
      reader.onload = () => setLogoPreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const removeLogo = () => {
    setFormData(prev => ({ ...prev, logo: null }))
    setLogoPreview(null)
  }

  const handleSave = async () => {
    if (!formData.name?.trim()) {
      setErrors({ name: 'Company name is required' })
      return
    }

    setIsSaving(true)
    try {
      await api.patch(`/companies/${companyId}/detail/`, formData)
      setIsEditing(false)
      onRefresh?.()
    } catch (err) {
      console.error('Failed to save:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setErrors({})
  }

  const getDisplayValue = (key: string) => {
    switch (key) {
      case 'industry':
        return company?.industry?.name
      case 'company_size':
        return companySizeOptions.find(o => o.value === company?.company_size)?.label
      case 'funding_stage':
        return fundingStageOptions.find(o => o.value === company?.funding_stage)?.label
      case 'remote_work_policy':
        return remoteWorkOptions.find(o => o.value === company?.remote_work_policy)?.label
      default:
        return null
    }
  }

  const currentYear = new Date().getFullYear()

  if (!company) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-[14px] text-gray-500 dark:text-gray-400">Company not found</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-900 dark:text-gray-100">Company Details</h3>
          {isEditing ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancel}
                className="px-2.5 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-gray-900 dark:bg-gray-100 dark:text-gray-900 rounded-md hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Pencil className="w-4 h-4" />
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Logo Section */}
        <div className="flex items-start gap-4">
          {isEditing ? (
            <div className="flex items-center gap-4">
              {logoPreview ? (
                <div className="relative">
                  <img src={logoPreview} alt="Company logo" className="w-16 h-16 rounded-lg object-cover border border-gray-200 dark:border-gray-700" />
                  <button
                    onClick={removeLogo}
                    className="absolute -top-2 -right-2 p-1 bg-white dark:bg-gray-800 rounded-full shadow-md border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <label className="w-16 h-16 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
                  <Upload className="w-4 h-4 text-gray-400" />
                  <span className="text-[10px] text-gray-500 mt-0.5">Upload</span>
                  <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                </label>
              )}
            </div>
          ) : (
            company.logo ? (
              <img src={company.logo} alt={company.name} className="w-16 h-16 rounded-lg object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <Building2 className="w-8 h-8 text-gray-400" />
              </div>
            )
          )}
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="space-y-2">
                <input
                  type="text"
                  name="name"
                  value={formData.name || ''}
                  onChange={handleInputChange}
                  placeholder="Company Name"
                  className={`w-full px-3 py-2 text-[14px] font-medium border rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 ${errors.name ? 'border-red-300' : 'border-gray-200 dark:border-gray-700'}`}
                />
                {errors.name && <p className="text-[12px] text-red-500">{errors.name}</p>}
                <input
                  type="text"
                  name="tagline"
                  value={formData.tagline || ''}
                  onChange={handleInputChange}
                  placeholder="Tagline"
                  className="w-full px-3 py-1.5 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                />
              </div>
            ) : (
              <>
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{company.name}</h4>
                {company.tagline && <p className="text-[13px] text-gray-500 dark:text-gray-400 line-clamp-2">{company.tagline}</p>}
              </>
            )}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-[12px] font-medium text-gray-500 dark:text-gray-400 mb-1">About</label>
          {isEditing ? (
            <textarea
              name="description"
              value={formData.description || ''}
              onChange={handleInputChange}
              rows={4}
              placeholder="About the company..."
              className="w-full px-3 py-2 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 resize-none bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            />
          ) : (
            <p className="text-[13px] text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {company.description || <span className="text-gray-400 italic">No description</span>}
            </p>
          )}
        </div>

        {/* Company Info Grid */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
          <h4 className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Company Info</h4>

          {isEditing ? (
            <div className="space-y-4">
              <IndustryMultiSelect
                selected={selectedIndustry}
                onChange={handleIndustryChange}
                maxItems={1}
                label="Industry"
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-gray-700 dark:text-gray-300 mb-1">Company Size</label>
                  <select
                    name="company_size"
                    value={formData.company_size || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">Select size</option>
                    {companySizeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-gray-700 dark:text-gray-300 mb-1">Founded Year</label>
                  <input
                    type="number"
                    name="founded_year"
                    value={formData.founded_year || ''}
                    onChange={handleInputChange}
                    min={1800}
                    max={currentYear}
                    className="w-full px-3 py-2 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-gray-700 dark:text-gray-300 mb-1">Funding Stage</label>
                  <select
                    name="funding_stage"
                    value={formData.funding_stage || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">Select stage</option>
                    {fundingStageOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-gray-700 dark:text-gray-300 mb-1">Remote Policy</label>
                  <select
                    name="remote_work_policy"
                    value={formData.remote_work_policy || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">Select policy</option>
                    {remoteWorkOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-0">
              <FieldRow label="Industry" value={getDisplayValue('industry')} icon={<Building2 className="w-3.5 h-3.5" />} isEditing={false} />
              <FieldRow label="Company Size" value={getDisplayValue('company_size')} icon={<Users className="w-3.5 h-3.5" />} isEditing={false} />
              <FieldRow label="Founded" value={company.founded_year?.toString()} icon={<Calendar className="w-3.5 h-3.5" />} isEditing={false} />
              <FieldRow label="Funding Stage" value={getDisplayValue('funding_stage')} icon={<TrendingUp className="w-3.5 h-3.5" />} isEditing={false} />
              <FieldRow label="Remote Policy" value={getDisplayValue('remote_work_policy')} isEditing={false} />
            </div>
          )}
        </div>

        {/* Location */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
          <h4 className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Location</h4>

          {isEditing ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-medium text-gray-700 dark:text-gray-300 mb-1">Country</label>
                <select
                  name="headquarters_country_id"
                  value={formData.headquarters_country_id || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Select country</option>
                  {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-gray-700 dark:text-gray-300 mb-1">City</label>
                <select
                  name="headquarters_city_id"
                  value={formData.headquarters_city_id || ''}
                  onChange={handleInputChange}
                  disabled={!formData.headquarters_country_id}
                  className="w-full px-3 py-2 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 disabled:bg-gray-100 dark:disabled:bg-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                >
                  <option value="">{formData.headquarters_country_id ? 'Select city' : 'Select country first'}</option>
                  {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[13px] text-gray-700 dark:text-gray-300">
              <MapPin className="w-4 h-4 text-gray-400" />
              {company.headquarters_location || <span className="text-gray-400 italic">No location set</span>}
            </div>
          )}
        </div>

        {/* Links */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
          <h4 className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Links</h4>

          {isEditing ? (
            <div className="space-y-3">
              <div>
                <label className="block text-[12px] font-medium text-gray-700 dark:text-gray-300 mb-1">Website</label>
                <input
                  type="url"
                  name="website_url"
                  value={formData.website_url || ''}
                  onChange={handleInputChange}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-gray-700 dark:text-gray-300 mb-1">LinkedIn</label>
                <input
                  type="url"
                  name="linkedin_url"
                  value={formData.linkedin_url || ''}
                  onChange={handleInputChange}
                  placeholder="https://linkedin.com/company/..."
                  className="w-full px-3 py-2 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {company.website_url && (
                <a href={company.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[13px] text-blue-600 hover:text-blue-700">
                  <Globe className="w-4 h-4" />
                  {company.website_url}
                </a>
              )}
              {company.linkedin_url && (
                <a href={company.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[13px] text-blue-600 hover:text-blue-700">
                  <Linkedin className="w-4 h-4" />
                  LinkedIn Profile
                </a>
              )}
              {!company.website_url && !company.linkedin_url && (
                <p className="text-[13px] text-gray-400 italic">No links added</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CompanyDetailsPanel
