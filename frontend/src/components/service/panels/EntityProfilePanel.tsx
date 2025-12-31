import { useState, useMemo } from 'react'
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
  Users,
  Code,
  Tag,
  Edit,
  Plus,
} from 'lucide-react'
import type { OnboardingEntityType, ExperienceListItem, Experience } from '@/types'
import { Link } from 'react-router-dom'
import {
  aggregateSkillsWithProficiency,
  aggregateTechsWithProficiency,
  getProficiencyStyle,
  formatTotalDuration,
} from '@/utils/proficiency'

interface EntityProfilePanelProps {
  entityType: OnboardingEntityType
  entityId: string
  entity: Record<string, unknown> | undefined
  // Interactive callbacks (optional - if not provided, shows read-only)
  onToggleRead?: () => Promise<void>
  onToggleReplied?: () => Promise<void>
  onSaveNotes?: (notes: string) => Promise<void>
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

const getRemotePolicyLabel = (policy: string | null | undefined) => {
  const labels: Record<string, string> = {
    remote_first: 'Remote First',
    hybrid: 'Hybrid',
    office_first: 'Office First',
    flexible: 'Flexible',
  }
  return labels[policy || ''] || policy || 'Not specified'
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

const formatDateShort = (dateString: string | null | undefined) => {
  if (!dateString) return null
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  })
}

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

function CompanyProfile({ entity }: { entity: Record<string, unknown> }) {
  const company = entity as {
    id?: string
    name?: string
    slug?: string
    logo?: string
    tagline?: string
    description?: string
    industry?: { id: string; name: string; slug: string } | string | null
    company_size?: string
    founded_year?: number
    funding_stage?: string
    remote_work_policy?: string
    headquarters_location?: string
    headquarters_city?: { name: string } | null
    headquarters_country?: { name: string } | null
    locations?: { city?: { name: string }; country?: { name: string } }[]
    website_url?: string
    linkedin_url?: string
    service_type?: string
    is_published?: boolean
    onboarding_stage?: { name: string; color: string }
    assigned_to?: { id: string; first_name: string; last_name: string; email: string }[]
    culture_description?: string
    values?: string
    created_at?: string
  }

  const industryName = typeof company.industry === 'string' ? company.industry : company.industry?.name

  return (
    <div className="space-y-4">
      {/* Header */}
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

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Link
          to={`/dashboard/admin/companies/${company.id}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
        >
          <Edit className="w-3.5 h-3.5" />
          Edit
        </Link>
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

      {/* Company Info Section */}
      <CollapsibleSection title="Company Info" icon={<Building2 className="w-4 h-4" />} defaultOpen>
        <div className="space-y-0">
          <InfoRow label="Industry" value={industryName} />
          <InfoRow label="Company Size" value={getCompanySizeLabel(company.company_size)} />
          <InfoRow label="Founded" value={company.founded_year?.toString()} />
          <InfoRow label="Funding Stage" value={company.funding_stage} />
          <InfoRow label="Remote Policy" value={getRemotePolicyLabel(company.remote_work_policy)} />
        </div>
      </CollapsibleSection>

      {/* Location Section */}
      <CollapsibleSection title="Location" icon={<MapPin className="w-4 h-4" />} defaultOpen>
        <div className="space-y-2">
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
        </div>
      </CollapsibleSection>

      {/* Links Section */}
      <CollapsibleSection title="Links" icon={<Globe className="w-4 h-4" />} defaultOpen>
        <div className="space-y-2">
          {company.website_url && (
            <a
              href={company.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-[13px] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Globe className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              <span className="truncate flex-1">{company.website_url}</span>
              <ExternalLink className="w-3 h-3 text-gray-400 dark:text-gray-500" />
            </a>
          )}
          {company.linkedin_url && (
            <a
              href={company.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-[13px] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Linkedin className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              <span className="truncate flex-1">LinkedIn Profile</span>
              <ExternalLink className="w-3 h-3 text-gray-400 dark:text-gray-500" />
            </a>
          )}
          {!company.website_url && !company.linkedin_url && (
            <p className="text-[13px] text-gray-500 dark:text-gray-400">No links added</p>
          )}
        </div>
      </CollapsibleSection>

      {/* Description */}
      {(company.description || company.culture_description) && (
        <CollapsibleSection title="About" icon={<FileText className="w-4 h-4" />}>
          <div className="space-y-3">
            {company.description && (
              <p className="text-[13px] text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{company.description}</p>
            )}
            {company.culture_description && (
              <div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Culture</p>
                <p className="text-[13px] text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{company.culture_description}</p>
              </div>
            )}
          </div>
        </CollapsibleSection>
      )}

      {/* Timeline */}
      <div className="flex items-center gap-2 text-[12px] text-gray-500 dark:text-gray-400 pt-2">
        <Calendar className="w-4 h-4" />
        Created {formatDate(company.created_at)}
      </div>

      {/* View Full Profile Link */}
      <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
        <Link
          to={`/dashboard/admin/companies/${company.id}`}
          className="flex items-center gap-2 text-[13px] text-blue-600 hover:text-blue-700"
        >
          <ExternalLink className="w-4 h-4" />
          Edit Company Profile
        </Link>
      </div>
    </div>
  )
}

// ============================================================================
// Candidate Profile
// ============================================================================

function CandidateProfile({ entity }: { entity: Record<string, unknown> }) {
  const candidate = entity as {
    id?: string
    slug?: string
    full_name?: string
    first_name?: string
    last_name?: string
    email?: string
    phone?: string
    avatar?: string
    city?: string
    country?: string
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
    industries?: { id: string; name: string; slug: string }[]
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
  }

  const name = candidate.full_name || [candidate.first_name, candidate.last_name].filter(Boolean).join(' ') || 'Unknown Candidate'
  const locationDisplay = candidate.location || [candidate.city, candidate.country_name || candidate.country].filter(Boolean).join(', ')
  const salary = formatSalary(candidate.salary_expectation_min || null, candidate.salary_expectation_max || null, candidate.salary_currency)
  const yearsExp = candidate.years_experience || candidate.years_of_experience
  const seniority = candidate.seniority || candidate.seniority_level
  const title = candidate.professional_title || candidate.current_title
  const bio = candidate.bio || candidate.summary || candidate.professional_summary

  // Aggregate skills and technologies from experiences with proficiency
  const expData = candidate.experiences || []
  const aggregatedSkills = useMemo(() => aggregateSkillsWithProficiency(expData), [expData])
  const aggregatedTechnologies = useMemo(() => aggregateTechsWithProficiency(expData), [expData])

  // Get portfolio links
  const portfolioLinks = candidate.portfolio_links || (candidate.portfolio_url ? [{ url: candidate.portfolio_url }] : [])

  return (
    <div className="space-y-4">
      {/* Header */}
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

      {/* Contact Info */}
      <CollapsibleSection title="Contact Information" icon={<Mail className="w-4 h-4" />} defaultOpen>
        <div className="space-y-0">
          <InfoRow label="Email" value={candidate.email} href={candidate.email ? `mailto:${candidate.email}` : undefined} />
          <InfoRow label="Phone" value={candidate.phone} href={candidate.phone ? `tel:${candidate.phone}` : undefined} />
          <InfoRow label="Location" value={locationDisplay || undefined} />
          {candidate.linkedin_url && <InfoRow label="LinkedIn" value="View Profile" href={candidate.linkedin_url} />}
          {candidate.github_url && <InfoRow label="GitHub" value="View Profile" href={candidate.github_url} />}
          {portfolioLinks.length > 0 && portfolioLinks.map((link, idx) => (
            <InfoRow key={idx} label={link.title || 'Portfolio'} value="View Site" href={link.url} />
          ))}
        </div>
      </CollapsibleSection>

      {/* Work Preferences */}
      <CollapsibleSection title="Work Preferences" icon={<Target className="w-4 h-4" />} defaultOpen>
        <div className="space-y-0">
          <InfoRow label="Seniority Level" value={getSeniorityLabel(seniority)} />
          <InfoRow label="Work Preference" value={getWorkPreferenceLabel(candidate.work_preference)} />
          <InfoRow label="Salary Expectation" value={salary} />
          <InfoRow label="Notice Period" value={formatNoticePeriod(candidate.notice_period_days)} />
          {candidate.availability_date && (
            <InfoRow label="Available From" value={formatDate(candidate.availability_date)} />
          )}
        </div>
      </CollapsibleSection>

      {/* Industries / Tags */}
      {candidate.industries && candidate.industries.length > 0 && (
        <CollapsibleSection title="Industries" icon={<Tag className="w-4 h-4" />} count={candidate.industries.length} defaultOpen>
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
        </CollapsibleSection>
      )}

      {/* Technologies with Proficiency */}
      {aggregatedTechnologies.length > 0 && (
        <CollapsibleSection title="Technologies" icon={<Code className="w-4 h-4" />} count={aggregatedTechnologies.length} defaultOpen>
          <div className="space-y-2">
            <p className="text-[10px] text-gray-500 dark:text-gray-400">Darker colors indicate more experience</p>
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

      {/* Skills with Proficiency */}
      {aggregatedSkills.length > 0 && (
        <CollapsibleSection title="Skills" icon={<Briefcase className="w-4 h-4" />} count={aggregatedSkills.length} defaultOpen>
          <div className="space-y-2">
            <p className="text-[10px] text-gray-500 dark:text-gray-400">Darker colors indicate more experience</p>
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

      {/* Experience */}
      {candidate.experiences && candidate.experiences.length > 0 && (
        <CollapsibleSection title="Experience" icon={<Briefcase className="w-4 h-4" />} count={candidate.experiences.length}>
          <div className="space-y-4">
            {candidate.experiences.map((exp) => {
              const expWithDetails = exp as ExperienceListItem
              const duration = formatTotalDuration(
                Math.max(1, Math.round(
                  (new Date(exp.is_current ? Date.now() : exp.end_date || Date.now()).getTime() - new Date(exp.start_date).getTime()) / (1000 * 60 * 60 * 24 * 30)
                ))
              )
              return (
                <div key={exp.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-gray-900 dark:text-gray-100">{exp.job_title}</p>
                      <p className="text-[12px] text-gray-700 dark:text-gray-300">{exp.company_name}</p>
                    </div>
                    {exp.is_current && (
                      <span className="px-1.5 py-0.5 text-[10px] font-medium bg-green-100 dark:bg-green-900/40 text-green-700 rounded flex-shrink-0">
                        Current
                      </span>
                    )}
                  </div>

                  {/* Meta info */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500 dark:text-gray-400">
                    <span>
                      {formatDateShort(exp.start_date)} - {exp.is_current ? 'Present' : formatDateShort(exp.end_date)}
                    </span>
                    <span className="text-gray-300">•</span>
                    <span className="font-medium text-gray-600 dark:text-gray-400">{duration}</span>
                    {expWithDetails.industry && (
                      <>
                        <span className="text-gray-300">•</span>
                        <span>{expWithDetails.industry.name}</span>
                      </>
                    )}
                    {expWithDetails.company_size && (
                      <>
                        <span className="text-gray-300">•</span>
                        <span>{expWithDetails.company_size} employees</span>
                      </>
                    )}
                  </div>

                  {/* Description */}
                  {expWithDetails.description && (
                    <p className="text-[12px] text-gray-600 dark:text-gray-400 line-clamp-3">{expWithDetails.description}</p>
                  )}

                  {/* Achievements */}
                  {expWithDetails.achievements && (
                    <div className="pt-1">
                      <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Key Achievements</p>
                      <p className="text-[12px] text-gray-600 dark:text-gray-400 line-clamp-2">{expWithDetails.achievements}</p>
                    </div>
                  )}

                  {/* Technologies for this role */}
                  {expWithDetails.technologies && expWithDetails.technologies.length > 0 && (
                    <div className="pt-1">
                      <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Technologies</p>
                      <div className="flex flex-wrap gap-1">
                        {expWithDetails.technologies.map((tech) => (
                          <span
                            key={tech.id}
                            className="px-1.5 py-0.5 text-[10px] bg-blue-50 dark:bg-blue-900/30 text-blue-700 rounded"
                          >
                            {tech.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Skills for this role */}
                  {expWithDetails.skills && expWithDetails.skills.length > 0 && (
                    <div className="pt-1">
                      <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Skills</p>
                      <div className="flex flex-wrap gap-1">
                        {expWithDetails.skills.map((skill) => (
                          <span
                            key={skill.id}
                            className="px-1.5 py-0.5 text-[10px] bg-purple-50 dark:bg-purple-900/30 text-purple-700 rounded"
                          >
                            {skill.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CollapsibleSection>
      )}

      {/* Education */}
      {candidate.education && candidate.education.length > 0 && (
        <CollapsibleSection title="Education" icon={<GraduationCap className="w-4 h-4" />} count={candidate.education.length}>
          <div className="space-y-3">
            {candidate.education.map((edu) => (
              <div key={edu.id} className="border-l-2 border-gray-200 dark:border-gray-700 pl-3">
                <p className="text-[13px] font-medium text-gray-900 dark:text-gray-100">{edu.degree}</p>
                <p className="text-[12px] text-gray-600 dark:text-gray-400">{edu.field_of_study}</p>
                <p className="text-[12px] text-gray-500 dark:text-gray-400">{edu.institution_name}</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  {formatDateShort(edu.start_date)} - {formatDateShort(edu.end_date) || 'Present'}
                </p>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Bio */}
      {bio && (
        <CollapsibleSection title="Bio" icon={<FileText className="w-4 h-4" />}>
          <p className="text-[13px] text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{bio}</p>
        </CollapsibleSection>
      )}

      {/* Assigned To */}
      {candidate.assigned_to && candidate.assigned_to.length > 0 && (
        <CollapsibleSection title="Assigned Recruiters" icon={<Users className="w-4 h-4" />} count={candidate.assigned_to.length}>
          <div className="space-y-2">
            {candidate.assigned_to.map((user) => (
              <div key={user.id} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                  <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-gray-900 dark:text-gray-100 truncate">
                    {user.full_name || `${user.first_name} ${user.last_name}`}
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Timeline */}
      <div className="flex items-center gap-2 text-[12px] text-gray-500 dark:text-gray-400 pt-2">
        <Calendar className="w-4 h-4" />
        Joined {formatDate(candidate.created_at)}
      </div>

      {/* View Full Profile Link */}
      <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
        <Link
          to={`/dashboard/admin/candidates/${candidate.slug || candidate.id}`}
          className="flex items-center gap-2 text-[13px] text-blue-600 hover:text-blue-700"
        >
          <ExternalLink className="w-4 h-4" />
          View Full Profile
        </Link>
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
  entityId: _entityId,
  entity,
  onToggleRead,
  onToggleReplied,
  onSaveNotes,
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
      {entityType === 'company' && <CompanyProfile entity={entity} />}
      {entityType === 'candidate' && <CandidateProfile entity={entity} />}
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
