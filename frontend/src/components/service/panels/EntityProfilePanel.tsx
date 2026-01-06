import { useState, useMemo, useEffect } from 'react'
import {
  Building2,
  User,
  Mail,
  MapPin,
  Globe,
  Calendar,
  Briefcase,
  ExternalLink,
  Linkedin,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Target,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  FileText,
  Code,
  Tag,
  Edit,
  Plus,
  Check,
  X,
  Upload,
  Heart,
  Pencil,
} from 'lucide-react'
import type { OnboardingEntityType, ExperienceListItem, Experience, Industry, Technology, BenefitCategory, CompanyInput, CompanySize, FundingStage, RemoteWorkPolicy } from '@/types'
import { Link } from 'react-router-dom'
import {
  aggregateSkillsWithProficiency,
  aggregateTechsWithProficiency,
  getProficiencyStyle,
  formatTotalDuration,
} from '@/utils/proficiency'
import { IndustryMultiSelect, TechnologyMultiSelect } from '@/components/forms'
import { ValuesEditor, BenefitsEditor } from '@/components/company'
import { ExperienceEditor } from '@/components/experience'
import { EducationEditor } from '@/components/education'
import { useCountries, useCities } from '@/hooks'
import api from '@/services/api'

interface EntityProfilePanelProps {
  entityType: OnboardingEntityType
  entityId: string
  entity: Record<string, unknown> | undefined
  // Interactive callbacks (optional - if not provided, shows read-only)
  onToggleRead?: () => Promise<void>
  onToggleReplied?: () => Promise<void>
  onSaveNotes?: (notes: string) => Promise<void>
  // Edit mode props
  isEditing?: boolean
  onEditToggle?: (editing: boolean) => void
  onSaveProfile?: (data: Record<string, unknown>) => Promise<void>
  // Read-only mode (for application view - don't fetch, just display)
  readOnly?: boolean
  // Hide the header section (when used inside a drawer that already shows header)
  hideHeader?: boolean
}

// ============================================================================
// Helper Functions
// ============================================================================

const getCompanySizeLabel = (size: string | null | undefined) => {
  const labels: Record<string, string> = {
    '1-10': '1-10 employees',
    '11-50': '11-50 employees',
    '51-200': '51-200 employees',
    '201-500': '201-500 employees',
    '501-1000': '501-1000 employees',
    '1001-5000': '1,001-5,000 employees',
    '5001+': '5,001+ employees',
  }
  return labels[size || ''] || size || 'Not specified'
}

const getSourceLabel = (source: string | null | undefined) => {
  const labels: Record<string, string> = {
    inbound: 'Inbound',
    outbound: 'Outbound',
    referral: 'Referral',
    website: 'Website',
    linkedin: 'LinkedIn',
    event: 'Event',
    other: 'Other',
  }
  return labels[source || ''] || source || 'Unknown'
}

const getSeniorityLabel = (seniority: string | null | undefined) => {
  const labels: Record<string, string> = {
    intern: 'Intern',
    junior: 'Junior',
    mid: 'Mid-Level',
    senior: 'Senior',
    lead: 'Lead',
    principal: 'Principal',
    executive: 'Executive / C-Suite',
  }
  return labels[seniority || ''] || seniority || 'Not specified'
}

const getWorkPreferenceLabel = (pref: string | null | undefined) => {
  const labels: Record<string, string> = {
    remote: 'Remote',
    hybrid: 'Hybrid',
    onsite: 'On-site',
    flexible: 'Flexible',
  }
  return labels[pref || ''] || pref || 'Not specified'
}

const formatSalary = (min: number | null, max: number | null, currency?: string) => {
  const symbols: Record<string, string> = { ZAR: 'R', USD: '$', EUR: '€', GBP: '£' }
  const symbol = symbols[currency || 'ZAR'] || currency || 'R'
  const formatAmount = (amount: number) => {
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`
    if (amount >= 1000) return `${(amount / 1000).toFixed(0)}k`
    return amount.toString()
  }
  if (min && max) return `${symbol}${formatAmount(min)} - ${symbol}${formatAmount(max)}`
  if (min) return `${symbol}${formatAmount(min)}+`
  if (max) return `Up to ${symbol}${formatAmount(max)}`
  return null
}

const formatNoticePeriod = (days: number | null | undefined) => {
  if (!days) return null
  if (days === 0) return 'Immediately available'
  if (days <= 7) return '1 week notice'
  if (days <= 14) return '2 weeks notice'
  if (days <= 30) return '1 month notice'
  if (days <= 60) return '2 months notice'
  if (days <= 90) return '3 months notice'
  return `${Math.round(days / 30)} months notice`
}

const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return null
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}


// ============================================================================
// Company Edit Options
// ============================================================================

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

// ============================================================================
// Collapsible Section Component
// ============================================================================

interface CollapsibleSectionProps {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
  count?: number
}

function CollapsibleSection({ title, icon, children, defaultOpen = false, count }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-gray-500 dark:text-gray-400">{icon}</span>
          <span className="text-[13px] font-medium text-gray-900 dark:text-gray-100">{title}</span>
          {count !== undefined && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-400 rounded-full">
              {count}
            </span>
          )}
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400 dark:text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-500" />}
      </button>
      {isOpen && <div className="p-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">{children}</div>}
    </div>
  )
}

// ============================================================================
// Editable Collapsible Section Component
// ============================================================================

interface EditableCollapsibleSectionProps {
  title: string
  icon: React.ReactNode
  defaultOpen?: boolean
  isEditing: boolean
  isSaving?: boolean
  onEditToggle: (editing: boolean) => void
  onSave: () => Promise<void>
  viewContent: React.ReactNode
  editContent: React.ReactNode
}

function EditableCollapsibleSection({
  title,
  icon,
  defaultOpen = false,
  isEditing,
  isSaving = false,
  onEditToggle,
  onSave,
  viewContent,
  editContent,
}: EditableCollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  const handleSave = async () => {
    await onSave()
  }

  const handleCancel = () => {
    onEditToggle(false)
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 flex-1"
        >
          <span className="text-gray-500 dark:text-gray-400">{icon}</span>
          <span className="text-[13px] font-medium text-gray-900 dark:text-gray-100">{title}</span>
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          )}
        </button>
        <div className="flex items-center gap-1">
          {isEditing ? (
            <>
              <button
                onClick={handleCancel}
                className="px-2 py-1 text-[11px] font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-white bg-gray-900 dark:bg-gray-100 dark:text-gray-900 rounded hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 transition-colors"
              >
                <Check className="w-3 h-3" />
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (!isOpen) setIsOpen(true)
                onEditToggle(true)
              }}
              className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
            >
              <Pencil className="w-3 h-3" />
              Edit
            </button>
          )}
        </div>
      </div>
      {isOpen && (
        <div className="p-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
          {isEditing ? editContent : viewContent}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Info Row Component
// ============================================================================

function InfoRow({ label, value, href }: { label: string; value: string | null | undefined; href?: string }) {
  if (!value) return null
  return (
    <div className="flex items-start justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <span className="text-[12px] text-gray-500 dark:text-gray-400">{label}</span>
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-[13px] text-blue-600 hover:text-blue-700 text-right">
          {value}
        </a>
      ) : (
        <span className="text-[13px] text-gray-900 dark:text-gray-100 text-right">{value}</span>
      )}
    </div>
  )
}

// ============================================================================
// Company Profile
// ============================================================================

interface CompanyProfileProps {
  companyId: string
  entity: Record<string, unknown>
  onRefresh?: () => void
}

function CompanyProfile({ companyId, entity, onRefresh }: CompanyProfileProps) {
  // Per-section edit states
  const [isEditingDetails, setIsEditingDetails] = useState(false)
  const [isEditingCulture, setIsEditingCulture] = useState(false)
  const [isSavingDetails, setIsSavingDetails] = useState(false)
  const [isSavingCulture, setIsSavingCulture] = useState(false)

  // Form data for each section
  const [detailsForm, setDetailsForm] = useState<CompanyInput>({})
  const [cultureForm, setCultureForm] = useState<CompanyInput>({})

  // Industry and technology selections
  const [selectedIndustry, setSelectedIndustry] = useState<Industry[]>([])
  const [selectedTechnologies, setSelectedTechnologies] = useState<Technology[]>([])
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  // Location hooks
  const { countries } = useCountries()
  const { cities } = useCities({ countryId: detailsForm.headquarters_country_id })

  const company = entity as {
    id?: string
    name?: string
    slug?: string
    logo?: string
    tagline?: string
    description?: string
    industry?: Industry | string | null
    company_size?: string
    founded_year?: number
    funding_stage?: string
    remote_work_policy?: string
    headquarters_location?: string
    headquarters_city?: { id: number; name: string } | null
    headquarters_country?: { id: number; name: string } | null
    locations?: { city?: { name: string }; country?: { name: string } }[]
    website_url?: string
    linkedin_url?: string
    service_type?: string
    is_published?: boolean
    onboarding_stage?: { name: string; color: string }
    assigned_to?: { id: string; first_name: string; last_name: string; email: string }[]
    culture_description?: string
    values?: string[]
    benefits?: BenefitCategory[]
    technologies?: Technology[]
    created_at?: string
  }

  const industryObj = typeof company.industry === 'object' ? company.industry : null
  const industryName = typeof company.industry === 'string' ? company.industry : industryObj?.name

  // Initialize details form when entering edit mode
  useEffect(() => {
    if (isEditingDetails && company) {
      setDetailsForm({
        name: company.name || '',
        tagline: company.tagline || '',
        description: company.description || '',
        industry_id: industryObj?.id || null,
        company_size: (company.company_size as CompanySize) || '',
        founded_year: company.founded_year || null,
        funding_stage: (company.funding_stage as FundingStage) || '',
        remote_work_policy: (company.remote_work_policy as RemoteWorkPolicy) || '',
        headquarters_country_id: company.headquarters_country?.id || null,
        headquarters_city_id: company.headquarters_city?.id || null,
        website_url: company.website_url || '',
        linkedin_url: company.linkedin_url || '',
      })
      if (industryObj) setSelectedIndustry([industryObj])
      if (company.logo) setLogoPreview(company.logo)
    }
  }, [isEditingDetails])

  // Initialize culture form when entering edit mode
  useEffect(() => {
    if (isEditingCulture && company) {
      setCultureForm({
        culture_description: company.culture_description || '',
        values: company.values || [],
        benefits: company.benefits || [],
        technology_ids: company.technologies?.map(t => t.id) || [],
      })
      setSelectedTechnologies(company.technologies || [])
    }
  }, [isEditingCulture])

  // Save handlers
  const handleSaveDetails = async () => {
    setIsSavingDetails(true)
    try {
      await api.patch(`/companies/${companyId}/detail/`, detailsForm)
      setIsEditingDetails(false)
      onRefresh?.()
    } catch (err) {
      console.error('Failed to save details:', err)
    } finally {
      setIsSavingDetails(false)
    }
  }

  const handleSaveCulture = async () => {
    setIsSavingCulture(true)
    try {
      await api.patch(`/companies/${companyId}/detail/`, cultureForm)
      setIsEditingCulture(false)
      onRefresh?.()
    } catch (err) {
      console.error('Failed to save culture:', err)
    } finally {
      setIsSavingCulture(false)
    }
  }

  // Form change handlers
  const handleDetailsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    let processedValue: string | number | null = value
    if (name === 'founded_year') {
      processedValue = value ? parseInt(value, 10) : null
    } else if (name === 'headquarters_country_id' || name === 'headquarters_city_id') {
      processedValue = value ? parseInt(value, 10) : null
      if (name === 'headquarters_country_id') {
        setDetailsForm(prev => ({ ...prev, headquarters_country_id: processedValue as number | null, headquarters_city_id: null }))
        return
      }
    }
    setDetailsForm(prev => ({ ...prev, [name]: processedValue }))
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setDetailsForm(prev => ({ ...prev, logo: file }))
      const reader = new FileReader()
      reader.onload = () => setLogoPreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const removeLogo = () => {
    setDetailsForm(prev => ({ ...prev, logo: null }))
    setLogoPreview(null)
  }

  // Helper to get display values
  const getDisplayValue = (key: string) => {
    switch (key) {
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

  return (
    <div className="space-y-4">
      {/* Header with Logo and Name */}
      <div className="flex items-start gap-3">
        {company.logo ? (
          <img src={company.logo} alt={company.name} className="w-14 h-14 rounded-lg object-cover" />
        ) : (
          <div className="w-14 h-14 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
            <Building2 className="w-7 h-7 text-blue-600" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{company.name || 'Unknown Company'}</h3>
          {company.tagline && <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{company.tagline}</p>}
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-2">
        {company.onboarding_stage && (
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ backgroundColor: `${company.onboarding_stage.color}20`, color: company.onboarding_stage.color }}
          >
            {company.onboarding_stage.name}
          </span>
        )}
        {company.service_type && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 font-medium capitalize">
            {company.service_type}
          </span>
        )}
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${company.is_published ? 'bg-green-100 dark:bg-green-900/40 text-green-700' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
          {company.is_published ? 'Published' : 'Draft'}
        </span>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        {company.is_published && (
          <Link
            to={`/companies/${company.slug}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            View Public
          </Link>
        )}
        <Link
          to={`/dashboard/admin/jobs/new?company=${company.id}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-white bg-gray-900 dark:bg-gray-100 dark:text-gray-900 rounded-md hover:bg-gray-800 dark:hover:bg-gray-200"
        >
          <Plus className="w-3.5 h-3.5" />
          Create Job
        </Link>
      </div>

      {/* Details Subpanel */}
      <EditableCollapsibleSection
        title="Details"
        icon={<Building2 className="w-4 h-4" />}
        defaultOpen
        isEditing={isEditingDetails}
        isSaving={isSavingDetails}
        onEditToggle={setIsEditingDetails}
        onSave={handleSaveDetails}
        viewContent={
          <div className="space-y-4">
            {/* Description */}
            {company.description && (
              <p className="text-[13px] text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{company.description}</p>
            )}

            {/* Company Info */}
            <div className="space-y-0">
              <InfoRow label="Industry" value={industryName} />
              <InfoRow label="Company Size" value={getDisplayValue('company_size')} />
              <InfoRow label="Founded" value={company.founded_year?.toString()} />
              <InfoRow label="Funding Stage" value={getDisplayValue('funding_stage')} />
              <InfoRow label="Remote Policy" value={getDisplayValue('remote_work_policy')} />
            </div>

            {/* Location */}
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[13px] text-gray-900 dark:text-gray-100">{company.headquarters_location || 'Not specified'}</p>
                {company.locations && company.locations.length > 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    +{company.locations.length} other location{company.locations.length !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>

            {/* Links */}
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
            </div>
          </div>
        }
        editContent={
          <div className="space-y-4">
            {/* Logo */}
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
              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  name="name"
                  value={detailsForm.name || ''}
                  onChange={handleDetailsChange}
                  placeholder="Company Name"
                  className="w-full px-3 py-2 text-[14px] font-medium border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                />
                <input
                  type="text"
                  name="tagline"
                  value={detailsForm.tagline || ''}
                  onChange={handleDetailsChange}
                  placeholder="Tagline"
                  className="w-full px-3 py-1.5 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-[12px] font-medium text-gray-500 dark:text-gray-400 mb-1">About</label>
              <textarea
                name="description"
                value={detailsForm.description || ''}
                onChange={handleDetailsChange}
                rows={3}
                placeholder="About the company..."
                className="w-full px-3 py-2 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 resize-none bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              />
            </div>

            {/* Industry */}
            <IndustryMultiSelect
              selected={selectedIndustry}
              onChange={(industries) => {
                setSelectedIndustry(industries)
                setDetailsForm(prev => ({ ...prev, industry_id: industries[0]?.id || null }))
              }}
              maxItems={1}
              label="Industry"
            />

            {/* Company Info Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-medium text-gray-700 dark:text-gray-300 mb-1">Company Size</label>
                <select
                  name="company_size"
                  value={detailsForm.company_size || ''}
                  onChange={handleDetailsChange}
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
                  value={detailsForm.founded_year || ''}
                  onChange={handleDetailsChange}
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
                  value={detailsForm.funding_stage || ''}
                  onChange={handleDetailsChange}
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
                  value={detailsForm.remote_work_policy || ''}
                  onChange={handleDetailsChange}
                  className="w-full px-3 py-2 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Select policy</option>
                  {remoteWorkOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>

            {/* Location */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-medium text-gray-700 dark:text-gray-300 mb-1">Country</label>
                <select
                  name="headquarters_country_id"
                  value={detailsForm.headquarters_country_id || ''}
                  onChange={handleDetailsChange}
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
                  value={detailsForm.headquarters_city_id || ''}
                  onChange={handleDetailsChange}
                  disabled={!detailsForm.headquarters_country_id}
                  className="w-full px-3 py-2 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 disabled:bg-gray-100 dark:disabled:bg-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                >
                  <option value="">{detailsForm.headquarters_country_id ? 'Select city' : 'Select country first'}</option>
                  {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>

            {/* Links */}
            <div className="space-y-3">
              <div>
                <label className="block text-[12px] font-medium text-gray-700 dark:text-gray-300 mb-1">Website</label>
                <input
                  type="url"
                  name="website_url"
                  value={detailsForm.website_url || ''}
                  onChange={handleDetailsChange}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-gray-700 dark:text-gray-300 mb-1">LinkedIn</label>
                <input
                  type="url"
                  name="linkedin_url"
                  value={detailsForm.linkedin_url || ''}
                  onChange={handleDetailsChange}
                  placeholder="https://linkedin.com/company/..."
                  className="w-full px-3 py-2 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
          </div>
        }
      />

      {/* Culture & Tech Subpanel */}
      <EditableCollapsibleSection
        title="Culture & Tech"
        icon={<Heart className="w-4 h-4" />}
        defaultOpen={false}
        isEditing={isEditingCulture}
        isSaving={isSavingCulture}
        onEditToggle={setIsEditingCulture}
        onSave={handleSaveCulture}
        viewContent={
          <div className="space-y-4">
            {/* Culture Description */}
            {company.culture_description && (
              <div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Culture</p>
                <p className="text-[13px] text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{company.culture_description}</p>
              </div>
            )}

            {/* Values */}
            {company.values && company.values.length > 0 && (
              <div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Values</p>
                <div className="flex flex-wrap gap-2">
                  {company.values.map((value, idx) => (
                    <span key={idx} className="px-3 py-1.5 text-[13px] bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full">
                      {value}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Benefits */}
            {company.benefits && company.benefits.length > 0 && (
              <div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Benefits & Perks</p>
                <div className="space-y-3">
                  {company.benefits.map((category, idx) => (
                    <div key={idx}>
                      <p className="text-[12px] font-medium text-gray-700 dark:text-gray-300 mb-1">{category.category}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {category.items.map((item, itemIdx) => (
                          <span key={itemIdx} className="px-2 py-1 text-[11px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tech Stack */}
            {company.technologies && company.technologies.length > 0 && (
              <div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Tech Stack</p>
                <div className="flex flex-wrap gap-2">
                  {company.technologies.map((tech) => (
                    <span key={tech.id} className="px-2.5 py-1 text-[12px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full">
                      {tech.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {!company.culture_description && (!company.values || company.values.length === 0) && (!company.benefits || company.benefits.length === 0) && (!company.technologies || company.technologies.length === 0) && (
              <p className="text-[13px] text-gray-400 italic">No culture information added</p>
            )}
          </div>
        }
        editContent={
          <div className="space-y-4">
            {/* Culture Description */}
            <div>
              <label className="block text-[12px] font-medium text-gray-500 dark:text-gray-400 mb-1">Culture Description</label>
              <textarea
                value={cultureForm.culture_description || ''}
                onChange={(e) => setCultureForm(prev => ({ ...prev, culture_description: e.target.value }))}
                rows={4}
                placeholder="Describe your company culture, work environment, and team dynamics..."
                className="w-full px-3 py-2 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 resize-none bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              />
            </div>

            {/* Values */}
            <div>
              <label className="block text-[12px] font-medium text-gray-500 dark:text-gray-400 mb-1">Values</label>
              <ValuesEditor
                values={cultureForm.values || []}
                onChange={(values) => setCultureForm(prev => ({ ...prev, values }))}
              />
            </div>

            {/* Benefits */}
            <div>
              <label className="block text-[12px] font-medium text-gray-500 dark:text-gray-400 mb-1">Benefits & Perks</label>
              <BenefitsEditor
                benefits={cultureForm.benefits || []}
                onChange={(benefits) => setCultureForm(prev => ({ ...prev, benefits }))}
              />
            </div>

            {/* Tech Stack */}
            <TechnologyMultiSelect
              selected={selectedTechnologies}
              onChange={(technologies) => {
                setSelectedTechnologies(technologies)
                setCultureForm(prev => ({ ...prev, technology_ids: technologies.map(t => t.id) }))
              }}
              maxItems={30}
              label="Tech Stack"
            />
          </div>
        }
      />

      {/* Timeline */}
      <div className="flex items-center gap-2 text-[12px] text-gray-500 dark:text-gray-400 pt-2">
        <Calendar className="w-4 h-4" />
        Created {formatDate(company.created_at)}
      </div>
    </div>
  )
}

// ============================================================================
// Candidate Profile
// ============================================================================

// Candidate form data types
interface CandidateDetailsForm {
  first_name?: string
  last_name?: string
  phone?: string
  professional_title?: string
  headline?: string
  city_id?: number | null
  country_id?: number | null
  linkedin_url?: string
  github_url?: string
  portfolio_links?: { url: string; title?: string }[]
}

interface CandidatePreferencesForm {
  seniority?: string
  work_preference?: string
  willing_to_relocate?: boolean
  salary_expectation_min?: number | null
  salary_expectation_max?: number | null
  salary_currency?: string
  notice_period_days?: number | null
  availability_date?: string | null
}

interface CandidateBioForm {
  professional_summary?: string
}

const seniorityOptions = [
  { value: 'intern', label: 'Intern' },
  { value: 'junior', label: 'Junior' },
  { value: 'mid', label: 'Mid-Level' },
  { value: 'senior', label: 'Senior' },
  { value: 'lead', label: 'Lead' },
  { value: 'principal', label: 'Principal' },
  { value: 'director', label: 'Director' },
  { value: 'vp', label: 'VP' },
  { value: 'c_level', label: 'C-Level' },
]

const workPreferenceOptions = [
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'onsite', label: 'On-site' },
  { value: 'flexible', label: 'Flexible' },
]

const currencyOptions = [
  { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' },
  { value: 'GBP', label: 'GBP' },
  { value: 'CHF', label: 'CHF' },
  { value: 'CAD', label: 'CAD' },
  { value: 'AUD', label: 'AUD' },
]

interface CandidateProfileProps {
  entity: Record<string, unknown>
  onRefresh?: () => void
  readOnly?: boolean
  hideHeader?: boolean
}

function CandidateProfile({ entity, onRefresh, readOnly = false, hideHeader = false }: CandidateProfileProps) {
  // Per-section edit states
  const [isEditingDetails, setIsEditingDetails] = useState(false)
  const [isEditingPreferences, setIsEditingPreferences] = useState(false)
  const [isEditingIndustries, setIsEditingIndustries] = useState(false)
  const [isEditingBio, setIsEditingBio] = useState(false)

  // Saving states
  const [isSavingDetails, setIsSavingDetails] = useState(false)
  const [isSavingPreferences, setIsSavingPreferences] = useState(false)
  const [isSavingIndustries, setIsSavingIndustries] = useState(false)
  const [isSavingBio, setIsSavingBio] = useState(false)

  // Form data
  const [detailsForm, setDetailsForm] = useState<CandidateDetailsForm>({})
  const [preferencesForm, setPreferencesForm] = useState<CandidatePreferencesForm>({})
  const [bioForm, setBioForm] = useState<CandidateBioForm>({})
  const [selectedIndustries, setSelectedIndustries] = useState<Industry[]>([])
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  // Location hooks
  const { countries } = useCountries()
  const { cities } = useCities({ countryId: detailsForm.country_id })

  const candidate = entity as {
    id?: string
    slug?: string
    full_name?: string
    first_name?: string
    last_name?: string
    email?: string
    phone?: string
    avatar?: string
    city?: { id: number; name: string } | string
    city_id?: number
    country?: { id: number; name: string } | string
    country_id?: number
    country_name?: string
    location?: string
    professional_title?: string
    current_title?: string
    current_company?: string
    years_experience?: number
    years_of_experience?: number
    seniority?: string
    seniority_level?: string
    work_preference?: string
    willing_to_relocate?: boolean
    salary_expectation_min?: number
    salary_expectation_max?: number
    salary_currency?: string
    notice_period_days?: number
    availability_date?: string
    linkedin_url?: string
    github_url?: string
    portfolio_url?: string
    portfolio_links?: { url: string; title?: string }[]
    bio?: string
    summary?: string
    professional_summary?: string
    headline?: string
    onboarding_stage?: { name: string; color: string }
    profile_completeness?: number
    assigned_to?: { id: string; first_name: string; last_name: string; email: string; full_name?: string }[]
    industries?: Industry[]
    experiences?: (ExperienceListItem | Experience)[]
    education?: {
      id: string
      degree: string
      field_of_study: string
      institution_name: string
      start_date: string
      end_date: string | null
    }[]
    created_at?: string
    is_public?: boolean
  }

  const name = candidate.full_name || [candidate.first_name, candidate.last_name].filter(Boolean).join(' ') || 'Unknown Candidate'
  const locationDisplay = candidate.location || [
    typeof candidate.city === 'object' ? candidate.city?.name : candidate.city,
    typeof candidate.country === 'object' ? candidate.country?.name : (candidate.country_name || candidate.country)
  ].filter(Boolean).join(', ')
  const salary = formatSalary(candidate.salary_expectation_min || null, candidate.salary_expectation_max || null, candidate.salary_currency)
  const yearsExp = candidate.years_experience || candidate.years_of_experience
  const seniority = candidate.seniority || candidate.seniority_level
  const title = candidate.professional_title || candidate.current_title
  const bio = candidate.bio || candidate.summary || candidate.professional_summary

  // Aggregate skills and technologies from experiences with proficiency
  const expData = candidate.experiences || []
  const aggregatedSkills = useMemo(() => aggregateSkillsWithProficiency(expData), [expData])
  const aggregatedTechnologies = useMemo(() => aggregateTechsWithProficiency(expData), [expData])

  // Initialize details form when entering edit mode
  useEffect(() => {
    if (isEditingDetails && candidate) {
      const cityId = typeof candidate.city === 'object' ? candidate.city?.id : candidate.city_id
      const countryId = typeof candidate.country === 'object' ? candidate.country?.id : candidate.country_id
      setDetailsForm({
        first_name: candidate.first_name || '',
        last_name: candidate.last_name || '',
        phone: candidate.phone || '',
        professional_title: candidate.professional_title || candidate.current_title || '',
        headline: candidate.headline || '',
        city_id: cityId || null,
        country_id: countryId || null,
        linkedin_url: candidate.linkedin_url || '',
        github_url: candidate.github_url || '',
        portfolio_links: candidate.portfolio_links || [],
      })
      if (candidate.avatar) setAvatarPreview(candidate.avatar)
    }
  }, [isEditingDetails])

  // Initialize preferences form when entering edit mode
  useEffect(() => {
    if (isEditingPreferences && candidate) {
      setPreferencesForm({
        seniority: candidate.seniority || candidate.seniority_level || '',
        work_preference: candidate.work_preference || '',
        willing_to_relocate: candidate.willing_to_relocate || false,
        salary_expectation_min: candidate.salary_expectation_min || null,
        salary_expectation_max: candidate.salary_expectation_max || null,
        salary_currency: candidate.salary_currency || 'USD',
        notice_period_days: candidate.notice_period_days || null,
        availability_date: candidate.availability_date || null,
      })
    }
  }, [isEditingPreferences])

  // Initialize industries when entering edit mode
  useEffect(() => {
    if (isEditingIndustries && candidate) {
      setSelectedIndustries(candidate.industries || [])
    }
  }, [isEditingIndustries])

  // Initialize bio form when entering edit mode
  useEffect(() => {
    if (isEditingBio && candidate) {
      setBioForm({
        professional_summary: candidate.professional_summary || candidate.summary || candidate.bio || '',
      })
    }
  }, [isEditingBio])

  // Save handlers
  const handleSaveDetails = async () => {
    setIsSavingDetails(true)
    try {
      await api.patch(`/candidates/${candidate.slug}/`, detailsForm)
      setIsEditingDetails(false)
      onRefresh?.()
    } catch (err) {
      console.error('Failed to save details:', err)
    } finally {
      setIsSavingDetails(false)
    }
  }

  const handleSavePreferences = async () => {
    setIsSavingPreferences(true)
    try {
      await api.patch(`/candidates/${candidate.slug}/`, preferencesForm)
      setIsEditingPreferences(false)
      onRefresh?.()
    } catch (err) {
      console.error('Failed to save preferences:', err)
    } finally {
      setIsSavingPreferences(false)
    }
  }

  const handleSaveIndustries = async () => {
    setIsSavingIndustries(true)
    try {
      await api.patch(`/candidates/${candidate.slug}/`, {
        industry_ids: selectedIndustries.map(i => i.id)
      })
      setIsEditingIndustries(false)
      onRefresh?.()
    } catch (err) {
      console.error('Failed to save industries:', err)
    } finally {
      setIsSavingIndustries(false)
    }
  }

  const handleSaveBio = async () => {
    setIsSavingBio(true)
    try {
      await api.patch(`/candidates/${candidate.slug}/`, bioForm)
      setIsEditingBio(false)
      onRefresh?.()
    } catch (err) {
      console.error('Failed to save bio:', err)
    } finally {
      setIsSavingBio(false)
    }
  }

  // Avatar handlers
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // For now just preview, actual upload would need FormData
      const reader = new FileReader()
      reader.onload = () => setAvatarPreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const removeAvatar = () => {
    setAvatarPreview(null)
  }

  // Get portfolio links
  const portfolioLinks = candidate.portfolio_links || (candidate.portfolio_url ? [{ url: candidate.portfolio_url }] : [])

  return (
    <div className="space-y-4">
      {/* Header - only show if not hidden (drawer already shows header) */}
      {!hideHeader && (
        <div className="flex items-start gap-3">
          {candidate.avatar ? (
            <img src={candidate.avatar} alt={name} className="w-14 h-14 rounded-full object-cover" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <User className="w-7 h-7 text-gray-500 dark:text-gray-400" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{name}</h3>
            {title && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {title}
                {candidate.current_company && ` at ${candidate.current_company}`}
              </p>
            )}
            {candidate.headline && !title && (
              <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{candidate.headline}</p>
            )}
          </div>
        </div>
      )}

      {/* Badges */}
      <div className="flex flex-wrap gap-2">
        {candidate.onboarding_stage && (
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ backgroundColor: `${candidate.onboarding_stage.color}20`, color: candidate.onboarding_stage.color }}
          >
            {candidate.onboarding_stage.name}
          </span>
        )}
        {candidate.profile_completeness !== undefined && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            candidate.profile_completeness >= 80 ? 'bg-green-100 dark:bg-green-900/40 text-green-700' :
            candidate.profile_completeness >= 50 ? 'bg-yellow-100 text-yellow-700' :
            'bg-red-100 text-red-700'
          }`}>
            {candidate.profile_completeness}% complete
          </span>
        )}
        {yearsExp && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium">
            {yearsExp}+ years
          </span>
        )}
      </div>

      {/* Assigned Recruiters - compact inline display */}
      {candidate.assigned_to && candidate.assigned_to.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[12px] text-gray-500 dark:text-gray-400">Assigned:</span>
          <div className="flex items-center gap-1 flex-wrap">
            {candidate.assigned_to.map((user) => (
              <div
                key={user.id}
                className="inline-flex items-center gap-1.5 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-md"
                title={user.email}
              >
                <div className="w-5 h-5 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-[10px] font-medium text-gray-600 dark:text-gray-300">
                  {user.first_name?.[0]}{user.last_name?.[0]}
                </div>
                <span className="text-[12px] text-gray-700 dark:text-gray-300">
                  {user.first_name} {user.last_name?.[0]}.
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      {candidate.is_public && (
        <div className="flex flex-wrap gap-2">
          <Link
            to={`/candidates/${candidate.slug}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            View Public
          </Link>
        </div>
      )}

      {/* Two-column layout for Details, Work Preferences, Industries */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Details Subpanel */}
        <EditableCollapsibleSection
          title="Details"
          icon={<User className="w-4 h-4" />}
          defaultOpen
          isEditing={isEditingDetails}
          isSaving={isSavingDetails}
          onEditToggle={setIsEditingDetails}
          onSave={handleSaveDetails}
          viewContent={
            <div className="space-y-4">
              {/* Basic Info */}
              <div className="space-y-0">
                <InfoRow label="Email" value={candidate.email} href={candidate.email ? `mailto:${candidate.email}` : undefined} />
                <InfoRow label="Phone" value={candidate.phone} href={candidate.phone ? `tel:${candidate.phone}` : undefined} />
                <InfoRow label="Location" value={locationDisplay || undefined} />
              </div>

              {/* Links */}
              <div className="space-y-2">
                {candidate.linkedin_url && (
                  <a href={candidate.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[13px] text-blue-600 hover:text-blue-700">
                    <Linkedin className="w-4 h-4" />
                    LinkedIn Profile
                  </a>
                )}
                {candidate.github_url && (
                  <a href={candidate.github_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[13px] text-blue-600 hover:text-blue-700">
                    <Globe className="w-4 h-4" />
                    GitHub Profile
                  </a>
                )}
                {portfolioLinks.length > 0 && portfolioLinks.map((link, idx) => (
                  <a key={idx} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[13px] text-blue-600 hover:text-blue-700">
                    <Globe className="w-4 h-4" />
                    {link.title || 'Portfolio'}
                  </a>
                ))}
              </div>
            </div>
          }
        editContent={
          <div className="space-y-4">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              {avatarPreview ? (
                <div className="relative">
                  <img src={avatarPreview} alt="Avatar" className="w-16 h-16 rounded-full object-cover border border-gray-200 dark:border-gray-700" />
                  <button
                    onClick={removeAvatar}
                    className="absolute -top-2 -right-2 p-1 bg-white dark:bg-gray-800 rounded-full shadow-md border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <label className="w-16 h-16 flex flex-col items-center justify-center rounded-full border-2 border-dashed border-gray-200 dark:border-gray-700 cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
                  <Upload className="w-4 h-4 text-gray-400" />
                  <span className="text-[10px] text-gray-500 mt-0.5">Upload</span>
                  <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                </label>
              )}
              <div className="flex-1 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={detailsForm.first_name || ''}
                    onChange={(e) => setDetailsForm(prev => ({ ...prev, first_name: e.target.value }))}
                    placeholder="First Name"
                    className="w-full px-3 py-2 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  />
                  <input
                    type="text"
                    value={detailsForm.last_name || ''}
                    onChange={(e) => setDetailsForm(prev => ({ ...prev, last_name: e.target.value }))}
                    placeholder="Last Name"
                    className="w-full px-3 py-2 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>
            </div>

            {/* Title & Headline */}
            <div className="space-y-3">
              <div>
                <label className="block text-[12px] font-medium text-gray-500 dark:text-gray-400 mb-1">Professional Title</label>
                <input
                  type="text"
                  value={detailsForm.professional_title || ''}
                  onChange={(e) => setDetailsForm(prev => ({ ...prev, professional_title: e.target.value }))}
                  placeholder="e.g., Senior Software Engineer"
                  className="w-full px-3 py-2 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-gray-500 dark:text-gray-400 mb-1">Headline</label>
                <input
                  type="text"
                  value={detailsForm.headline || ''}
                  onChange={(e) => setDetailsForm(prev => ({ ...prev, headline: e.target.value }))}
                  placeholder="A brief tagline about yourself"
                  className="w-full px-3 py-2 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-[12px] font-medium text-gray-500 dark:text-gray-400 mb-1">Phone</label>
              <input
                type="tel"
                value={detailsForm.phone || ''}
                onChange={(e) => setDetailsForm(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+1 234 567 8900"
                className="w-full px-3 py-2 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              />
            </div>

            {/* Location */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-medium text-gray-500 dark:text-gray-400 mb-1">Country</label>
                <select
                  value={detailsForm.country_id || ''}
                  onChange={(e) => {
                    const val = e.target.value ? parseInt(e.target.value, 10) : null
                    setDetailsForm(prev => ({ ...prev, country_id: val, city_id: null }))
                  }}
                  className="w-full px-3 py-2 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Select country</option>
                  {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-gray-500 dark:text-gray-400 mb-1">City</label>
                <select
                  value={detailsForm.city_id || ''}
                  onChange={(e) => setDetailsForm(prev => ({ ...prev, city_id: e.target.value ? parseInt(e.target.value, 10) : null }))}
                  disabled={!detailsForm.country_id}
                  className="w-full px-3 py-2 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 disabled:bg-gray-100 dark:disabled:bg-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                >
                  <option value="">{detailsForm.country_id ? 'Select city' : 'Select country first'}</option>
                  {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>

            {/* Links */}
            <div className="space-y-3">
              <div>
                <label className="block text-[12px] font-medium text-gray-500 dark:text-gray-400 mb-1">LinkedIn URL</label>
                <input
                  type="url"
                  value={detailsForm.linkedin_url || ''}
                  onChange={(e) => setDetailsForm(prev => ({ ...prev, linkedin_url: e.target.value }))}
                  placeholder="https://linkedin.com/in/..."
                  className="w-full px-3 py-2 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-gray-500 dark:text-gray-400 mb-1">GitHub URL</label>
                <input
                  type="url"
                  value={detailsForm.github_url || ''}
                  onChange={(e) => setDetailsForm(prev => ({ ...prev, github_url: e.target.value }))}
                  placeholder="https://github.com/..."
                  className="w-full px-3 py-2 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
          </div>
        }
        />

        {/* Second column: Work Preferences + Industries stacked */}
        <div className="space-y-4">
          {/* Work Preferences Subpanel */}
          <EditableCollapsibleSection
            title="Work Preferences"
            icon={<Target className="w-4 h-4" />}
            defaultOpen
            isEditing={isEditingPreferences}
            isSaving={isSavingPreferences}
            onEditToggle={setIsEditingPreferences}
            onSave={handleSavePreferences}
            viewContent={
              <div className="space-y-0">
                <InfoRow label="Seniority Level" value={getSeniorityLabel(seniority)} />
                <InfoRow label="Work Preference" value={getWorkPreferenceLabel(candidate.work_preference)} />
                <InfoRow label="Willing to Relocate" value={candidate.willing_to_relocate ? 'Yes' : 'No'} />
                <InfoRow label="Salary Expectation" value={salary} />
                <InfoRow label="Notice Period" value={formatNoticePeriod(candidate.notice_period_days)} />
                {candidate.availability_date && (
                  <InfoRow label="Available From" value={formatDate(candidate.availability_date)} />
                )}
              </div>
            }
            editContent={
              <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-medium text-gray-500 dark:text-gray-400 mb-1">Seniority Level</label>
                <select
                  value={preferencesForm.seniority || ''}
                  onChange={(e) => setPreferencesForm(prev => ({ ...prev, seniority: e.target.value }))}
                  className="w-full px-3 py-2 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Select seniority</option>
                  {seniorityOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-gray-500 dark:text-gray-400 mb-1">Work Preference</label>
                <select
                  value={preferencesForm.work_preference || ''}
                  onChange={(e) => setPreferencesForm(prev => ({ ...prev, work_preference: e.target.value }))}
                  className="w-full px-3 py-2 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Select preference</option>
                  {workPreferenceOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="willing_to_relocate"
                checked={preferencesForm.willing_to_relocate || false}
                onChange={(e) => setPreferencesForm(prev => ({ ...prev, willing_to_relocate: e.target.checked }))}
                className="w-4 h-4 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 rounded focus:ring-gray-900 dark:focus:ring-gray-100"
              />
              <label htmlFor="willing_to_relocate" className="text-[13px] text-gray-700 dark:text-gray-300">
                Willing to relocate
              </label>
            </div>

            <div>
              <label className="block text-[12px] font-medium text-gray-500 dark:text-gray-400 mb-1">Salary Expectation</label>
              <div className="flex gap-2">
                <select
                  value={preferencesForm.salary_currency || 'USD'}
                  onChange={(e) => setPreferencesForm(prev => ({ ...prev, salary_currency: e.target.value }))}
                  className="w-20 px-2 py-2 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                >
                  {currencyOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <input
                  type="number"
                  value={preferencesForm.salary_expectation_min || ''}
                  onChange={(e) => setPreferencesForm(prev => ({ ...prev, salary_expectation_min: e.target.value ? parseInt(e.target.value, 10) : null }))}
                  placeholder="Min"
                  className="flex-1 px-3 py-2 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                />
                <span className="self-center text-gray-500">-</span>
                <input
                  type="number"
                  value={preferencesForm.salary_expectation_max || ''}
                  onChange={(e) => setPreferencesForm(prev => ({ ...prev, salary_expectation_max: e.target.value ? parseInt(e.target.value, 10) : null }))}
                  placeholder="Max"
                  className="flex-1 px-3 py-2 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-medium text-gray-500 dark:text-gray-400 mb-1">Notice Period (days)</label>
                <input
                  type="number"
                  value={preferencesForm.notice_period_days || ''}
                  onChange={(e) => setPreferencesForm(prev => ({ ...prev, notice_period_days: e.target.value ? parseInt(e.target.value, 10) : null }))}
                  placeholder="e.g., 30"
                  min={0}
                  className="w-full px-3 py-2 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-gray-500 dark:text-gray-400 mb-1">Available From</label>
                <input
                  type="date"
                  value={preferencesForm.availability_date || ''}
                  onChange={(e) => setPreferencesForm(prev => ({ ...prev, availability_date: e.target.value || null }))}
                  className="w-full px-3 py-2 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
          </div>
        }
          />

          {/* Industries Subpanel */}
          <EditableCollapsibleSection
            title="Industries"
            icon={<Tag className="w-4 h-4" />}
            defaultOpen={!!(candidate.industries && candidate.industries.length > 0)}
            isEditing={isEditingIndustries}
            isSaving={isSavingIndustries}
            onEditToggle={setIsEditingIndustries}
            onSave={handleSaveIndustries}
            viewContent={
              candidate.industries && candidate.industries.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {candidate.industries.map((industry) => (
                    <span
                      key={industry.id}
                      className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md font-medium"
                    >
                      {industry.name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-[13px] text-gray-400 italic">No industries specified</p>
              )
            }
            editContent={
              <IndustryMultiSelect
                selected={selectedIndustries}
                onChange={setSelectedIndustries}
                maxItems={10}
                label="Target Industries"
              />
            }
          />
        </div>
      </div>

      {/* Bio Subpanel */}
      <EditableCollapsibleSection
        title="Bio"
        icon={<FileText className="w-4 h-4" />}
        defaultOpen={!!bio}
        isEditing={isEditingBio}
        isSaving={isSavingBio}
        onEditToggle={setIsEditingBio}
        onSave={handleSaveBio}
        viewContent={
          bio ? (
            <p className="text-[13px] text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{bio}</p>
          ) : (
            <p className="text-[13px] text-gray-400 italic">No bio added</p>
          )
        }
        editContent={
          <div>
            <label className="block text-[12px] font-medium text-gray-500 dark:text-gray-400 mb-1">Professional Summary</label>
            <textarea
              value={bioForm.professional_summary || ''}
              onChange={(e) => setBioForm({ professional_summary: e.target.value })}
              rows={5}
              placeholder="Write a brief summary about your professional background, key achievements, and career goals..."
              className="w-full px-3 py-2 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 resize-none bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            />
          </div>
        }
      />

      {/* Experience Section */}
      <CollapsibleSection
        title="Experience"
        icon={<Briefcase className="w-4 h-4" />}
        count={candidate.experiences?.length || 0}
      >
        {readOnly ? (
          // Read-only display from entity data
          <div className="space-y-3">
            {candidate.experiences && candidate.experiences.length > 0 ? (
              candidate.experiences.map((exp) => (
                <div key={exp.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-[14px] font-medium text-gray-900 dark:text-gray-100">{exp.job_title}</h4>
                      <p className="text-[13px] text-gray-600 dark:text-gray-400">{exp.company_name}</p>
                      <p className="text-[12px] text-gray-400 dark:text-gray-500 mt-0.5">
                        {new Date(exp.start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                        {' - '}
                        {exp.is_current ? 'Present' : exp.end_date ? new Date(exp.end_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : ''}
                      </p>
                    </div>
                  </div>
                  {exp.description && (
                    <p className="text-[13px] text-gray-600 dark:text-gray-400 mt-2 line-clamp-3">{exp.description}</p>
                  )}
                  {exp.technologies && exp.technologies.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {exp.technologies.slice(0, 5).map((tech) => (
                        <span key={tech.id} className="px-2 py-0.5 text-[11px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                          {tech.name}
                        </span>
                      ))}
                      {exp.technologies.length > 5 && (
                        <span className="px-2 py-0.5 text-[11px] bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded">
                          +{exp.technologies.length - 5} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-[13px] text-gray-400 dark:text-gray-500 italic">No work experience</p>
            )}
          </div>
        ) : (
          <ExperienceEditor candidateSlug={candidate.slug} />
        )}
      </CollapsibleSection>

      {/* Education Section */}
      <CollapsibleSection
        title="Education"
        icon={<GraduationCap className="w-4 h-4" />}
        count={candidate.education?.length || 0}
      >
        {readOnly ? (
          // Read-only display from entity data
          <div className="space-y-3">
            {candidate.education && candidate.education.length > 0 ? (
              candidate.education.map((edu) => (
                <div key={edu.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <h4 className="text-[14px] font-medium text-gray-900 dark:text-gray-100">{edu.degree}</h4>
                  <p className="text-[13px] text-gray-600 dark:text-gray-400">{edu.institution_name}</p>
                  {edu.field_of_study && (
                    <p className="text-[12px] text-gray-500 dark:text-gray-400">{edu.field_of_study}</p>
                  )}
                  <p className="text-[12px] text-gray-400 dark:text-gray-500 mt-0.5">
                    {edu.start_date ? new Date(edu.start_date).getFullYear() : ''}
                    {edu.end_date ? ` - ${new Date(edu.end_date).getFullYear()}` : ' - Present'}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-[13px] text-gray-400 dark:text-gray-500 italic">No education</p>
            )}
          </div>
        ) : (
          <EducationEditor candidateSlug={candidate.slug} />
        )}
      </CollapsibleSection>

      {/* Technologies (Read-Only) */}
      {aggregatedTechnologies.length > 0 && (
        <CollapsibleSection title="Technologies" icon={<Code className="w-4 h-4" />} count={aggregatedTechnologies.length} defaultOpen>
          <div className="space-y-2">
            <p className="text-[10px] text-gray-500 dark:text-gray-400">Derived from experience • Darker = more experience</p>
            <div className="flex flex-wrap gap-1.5">
              {aggregatedTechnologies.map((tech) => (
                <span
                  key={tech.id}
                  className={`px-2 py-1 text-xs rounded-md cursor-default transition-opacity hover:opacity-80 ${getProficiencyStyle(tech.totalMonths, 'tech')}`}
                  title={`${tech.count} role${tech.count > 1 ? 's' : ''} • ${formatTotalDuration(tech.totalMonths)} total experience`}
                >
                  {tech.name}
                </span>
              ))}
            </div>
          </div>
        </CollapsibleSection>
      )}

      {/* Skills (Read-Only) */}
      {aggregatedSkills.length > 0 && (
        <CollapsibleSection title="Skills" icon={<Briefcase className="w-4 h-4" />} count={aggregatedSkills.length} defaultOpen>
          <div className="space-y-2">
            <p className="text-[10px] text-gray-500 dark:text-gray-400">Derived from experience • Darker = more experience</p>
            <div className="flex flex-wrap gap-1.5">
              {aggregatedSkills.map((skill) => (
                <span
                  key={skill.id}
                  className={`px-2 py-1 text-xs rounded-md cursor-default transition-opacity hover:opacity-80 ${getProficiencyStyle(skill.totalMonths, 'skill')}`}
                  title={`${skill.count} role${skill.count > 1 ? 's' : ''} • ${formatTotalDuration(skill.totalMonths)} total experience`}
                >
                  {skill.name}
                </span>
              ))}
            </div>
          </div>
        </CollapsibleSection>
      )}

      {/* Timeline */}
      <div className="flex items-center gap-2 text-[12px] text-gray-500 dark:text-gray-400 pt-2">
        <Calendar className="w-4 h-4" />
        Joined {formatDate(candidate.created_at)}
      </div>
    </div>
  )
}

// ============================================================================
// Lead Profile
// ============================================================================

function LeadProfile({
  entity,
  onToggleRead,
  onToggleReplied,
  onSaveNotes,
}: {
  entity: Record<string, unknown>
  onToggleRead?: () => Promise<void>
  onToggleReplied?: () => Promise<void>
  onSaveNotes?: (notes: string) => Promise<void>
}) {
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [notesValue, setNotesValue] = useState('')
  const [isSavingNotes, setIsSavingNotes] = useState(false)
  const lead = entity as {
    id?: string
    name?: string
    email?: string
    phone?: string
    job_title?: string
    company_name?: string
    company_website?: string
    company_size?: string
    industry?: { id: string; name: string; slug: string } | string | null
    industry_name?: string
    source?: string
    source_detail?: string
    source_page?: string
    subject?: string
    message?: string
    notes?: string
    is_read?: boolean
    is_replied?: boolean
    is_converted?: boolean
    onboarding_stage?: { name: string; color: string; slug?: string }
    assigned_to?: { id: string; first_name: string; last_name: string; email: string; full_name?: string }[]
    created_at?: string
  }

  const industryName = lead.industry_name || (typeof lead.industry === 'string' ? lead.industry : lead.industry?.name)
  const isTerminal = lead.onboarding_stage?.slug === 'won' || lead.onboarding_stage?.slug === 'lost'

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-14 h-14 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
          <Building2 className="w-7 h-7 text-purple-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{lead.name || 'Unknown Lead'}</h3>
          {lead.company_name && <p className="text-sm text-gray-500 dark:text-gray-400">{lead.company_name}</p>}
          {lead.job_title && <p className="text-xs text-gray-400 dark:text-gray-500">{lead.job_title}</p>}
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-2">
        {lead.onboarding_stage && (
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ backgroundColor: `${lead.onboarding_stage.color}20`, color: lead.onboarding_stage.color }}
          >
            {lead.onboarding_stage.name}
          </span>
        )}
        {lead.source && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium">
            {getSourceLabel(lead.source)}
          </span>
        )}
        {lead.is_converted && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 font-medium">
            Converted
          </span>
        )}
      </div>

      {/* Contact Information */}
      <CollapsibleSection title="Contact Information" icon={<Mail className="w-4 h-4" />} defaultOpen>
        <div className="space-y-0">
          <InfoRow label="Email" value={lead.email} href={lead.email ? `mailto:${lead.email}` : undefined} />
          <InfoRow label="Phone" value={lead.phone} href={lead.phone ? `tel:${lead.phone}` : undefined} />
          <InfoRow label="Job Title" value={lead.job_title} />
        </div>
      </CollapsibleSection>

      {/* Company Information */}
      <CollapsibleSection title="Company Information" icon={<Building2 className="w-4 h-4" />} defaultOpen>
        <div className="space-y-0">
          <InfoRow label="Company" value={lead.company_name} />
          <InfoRow label="Website" value={lead.company_website} href={lead.company_website?.startsWith('http') ? lead.company_website : `https://${lead.company_website}`} />
          <InfoRow label="Company Size" value={getCompanySizeLabel(lead.company_size)} />
          <InfoRow label="Industry" value={industryName} />
        </div>
      </CollapsibleSection>

      {/* Source & Tracking */}
      <CollapsibleSection title="Source & Tracking" icon={<Target className="w-4 h-4" />} defaultOpen>
        <div className="space-y-0">
          <InfoRow label="Source" value={getSourceLabel(lead.source)} />
          {lead.source_detail && <InfoRow label="Source Detail" value={lead.source_detail} />}
          {lead.source_page && <InfoRow label="Source Page" value={lead.source_page} />}
          {lead.subject && <InfoRow label="Subject" value={lead.subject} />}
        </div>
      </CollapsibleSection>

      {/* Admin Status (for inbound leads) */}
      {lead.source === 'inbound' && (
        <CollapsibleSection title="Admin Status" icon={<CheckCircle className="w-4 h-4" />} defaultOpen>
          <div className="flex gap-3">
            {onToggleRead ? (
              <button
                onClick={onToggleRead}
                className={`flex items-center gap-2 px-3 py-2 text-[12px] font-medium rounded-lg border transition-colors ${
                  lead.is_read
                    ? 'bg-green-50 dark:bg-green-900/30 border-green-200 text-green-700 hover:bg-green-100'
                    : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {lead.is_read ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {lead.is_read ? 'Read' : 'Unread'}
              </button>
            ) : (
              <div className={`flex items-center gap-2 px-3 py-2 text-[12px] font-medium rounded-lg border ${
                lead.is_read ? 'bg-green-50 dark:bg-green-900/30 border-green-200 text-green-700' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
              }`}>
                {lead.is_read ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {lead.is_read ? 'Read' : 'Unread'}
              </div>
            )}
            {onToggleReplied ? (
              <button
                onClick={onToggleReplied}
                className={`flex items-center gap-2 px-3 py-2 text-[12px] font-medium rounded-lg border transition-colors ${
                  lead.is_replied
                    ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 text-blue-700 hover:bg-blue-100'
                    : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {lead.is_replied ? <CheckCircle className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                {lead.is_replied ? 'Replied' : 'Not Replied'}
              </button>
            ) : (
              <div className={`flex items-center gap-2 px-3 py-2 text-[12px] font-medium rounded-lg border ${
                lead.is_replied ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 text-blue-700' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
              }`}>
                {lead.is_replied ? <CheckCircle className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                {lead.is_replied ? 'Replied' : 'Not Replied'}
              </div>
            )}
          </div>
        </CollapsibleSection>
      )}

      {/* Message */}
      {lead.message && (
        <CollapsibleSection title="Message" icon={<MessageSquare className="w-4 h-4" />}>
          <p className="text-[13px] text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{lead.message}</p>
        </CollapsibleSection>
      )}

      {/* Notes - Editable if callback provided */}
      <CollapsibleSection title="Notes" icon={<FileText className="w-4 h-4" />} defaultOpen={!!lead.notes || !!onSaveNotes}>
        {onSaveNotes ? (
          <div className="space-y-2">
            {isEditingNotes ? (
              <>
                <textarea
                  value={notesValue}
                  onChange={(e) => setNotesValue(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 text-[13px] border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  placeholder="Add notes about this lead..."
                />
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      setIsSavingNotes(true)
                      try {
                        await onSaveNotes(notesValue)
                        setIsEditingNotes(false)
                      } finally {
                        setIsSavingNotes(false)
                      }
                    }}
                    disabled={isSavingNotes}
                    className="px-3 py-1.5 text-[12px] font-medium text-white bg-gray-900 dark:bg-gray-100 dark:text-gray-900 rounded-md hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50"
                  >
                    {isSavingNotes ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => {
                      setNotesValue(lead.notes || '')
                      setIsEditingNotes(false)
                    }}
                    className="px-3 py-1.5 text-[12px] font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <div className="relative group">
                {lead.notes ? (
                  <p className="text-[13px] text-gray-700 dark:text-gray-300 whitespace-pre-wrap pr-8">{lead.notes}</p>
                ) : (
                  <p className="text-[13px] text-gray-400 dark:text-gray-500 italic">No notes yet</p>
                )}
                <button
                  onClick={() => {
                    setNotesValue(lead.notes || '')
                    setIsEditingNotes(true)
                  }}
                  className="absolute top-0 right-0 p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        ) : lead.notes ? (
          <p className="text-[13px] text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{lead.notes}</p>
        ) : (
          <p className="text-[13px] text-gray-400 dark:text-gray-500 italic">No notes</p>
        )}
      </CollapsibleSection>

      {/* Timeline */}
      <div className="flex items-center gap-2 text-[12px] text-gray-500 dark:text-gray-400 pt-2">
        <Calendar className="w-4 h-4" />
        Created {formatDate(lead.created_at)}
      </div>

      {/* Quick Actions */}
      {!isTerminal && (
        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <Link
            to={`/dashboard/admin/leads?selected=${lead.id}`}
            className="flex items-center gap-2 text-[13px] text-blue-600 hover:text-blue-700"
          >
            <ExternalLink className="w-4 h-4" />
            View Lead Details
          </Link>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function EntityProfilePanel({
  entityType,
  entityId,
  entity,
  onToggleRead,
  onToggleReplied,
  onSaveNotes,
  readOnly = false,
  hideHeader = false,
}: EntityProfilePanelProps) {
  if (!entity) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
        No profile data available
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      {entityType === 'company' && (
        <CompanyProfile
          companyId={entityId}
          entity={entity}
        />
      )}
      {entityType === 'candidate' && (
        <CandidateProfile entity={entity} readOnly={readOnly} hideHeader={hideHeader} />
      )}
      {entityType === 'lead' && (
        <LeadProfile
          entity={entity}
          onToggleRead={onToggleRead}
          onToggleReplied={onToggleReplied}
          onSaveNotes={onSaveNotes}
        />
      )}
    </div>
  )
}

export default EntityProfilePanel
