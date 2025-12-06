import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Mail,
  MapPin,
  Briefcase,
  GraduationCap,
  Building2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Pencil,
  Eye
} from 'lucide-react'
import type { CandidateProfile, CandidateProfileSanitized, CandidateAdminListItem, Experience, Education, ExperienceListItem, EducationListItem, Industry, ProfileSuggestion, ProfileSuggestionFieldType } from '@/types'
import {
  aggregateSkillsWithProficiency,
  aggregateTechsWithProficiency,
  getProficiencyStyle,
  formatTotalDuration,
} from '@/utils/proficiency'
import { SuggestionIndicator } from '@/components/suggestions'

// Type guard to check if profile is full or sanitized
type CandidateData = CandidateProfile | CandidateProfileSanitized | CandidateAdminListItem

function isFullProfile(profile: CandidateData): profile is CandidateProfile | CandidateAdminListItem {
  return 'email' in profile
}

function hasProfileCompleteness(profile: CandidateData): profile is CandidateAdminListItem {
  return 'profile_completeness' in profile
}

function isCandidateProfile(profile: CandidateData): profile is CandidateProfile {
  return 'first_name' in profile && 'portfolio_links' in profile
}

// Union types for experience and education (both admin list items and full items)
type ExperienceData = Experience | ExperienceListItem
type EducationData = Education | EducationListItem

interface CandidateProfileCardProps {
  candidate: CandidateData
  experiences?: ExperienceData[]
  education?: EducationData[]
  showContactInfo?: boolean
  coveringStatement?: string
  variant?: 'page' | 'compact'
  hideViewProfileLink?: boolean
  onContactClick?: () => void
  // Admin-specific props
  showAdminActions?: boolean
  showProfileCompleteness?: boolean
  editLink?: string
  onEdit?: () => void
  // Suggestion props
  enableSuggestions?: boolean
  suggestions?: ProfileSuggestion[]
  onAddSuggestion?: (
    fieldType: ProfileSuggestionFieldType,
    fieldName: string,
    relatedObjectId?: string
  ) => void
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  })
}

const formatDateRange = (startDate: string, endDate: string | null, isCurrent: boolean) => {
  const start = formatDate(startDate)
  if (isCurrent) {
    return `${start} - Present`
  }
  return endDate ? `${start} - ${formatDate(endDate)}` : start
}

const getSeniorityLabel = (seniority: string) => {
  const labels: Record<string, string> = {
    intern: 'Intern',
    junior: 'Junior',
    mid: 'Mid-Level',
    senior: 'Senior',
    lead: 'Lead',
    principal: 'Principal',
    executive: 'Executive',
  }
  return labels[seniority] || seniority
}

const getWorkPreferenceLabel = (pref: string) => {
  const labels: Record<string, string> = {
    remote: 'Remote',
    hybrid: 'Hybrid',
    onsite: 'On-site',
    flexible: 'Flexible',
  }
  return labels[pref] || pref
}

const formatSalaryExpectation = (min: number | null, max: number | null, currency: string) => {
  const symbols: Record<string, string> = {
    ZAR: 'R',
    USD: '$',
    EUR: '€',
    GBP: '£',
  }
  const symbol = symbols[currency] || currency + ' '

  const formatAmount = (amount: number) => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`
    }
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(0)}k`
    }
    return amount.toString()
  }

  if (min && max) {
    return `${symbol}${formatAmount(min)} - ${symbol}${formatAmount(max)}`
  }
  if (min) {
    return `${symbol}${formatAmount(min)}+`
  }
  if (max) {
    return `Up to ${symbol}${formatAmount(max)}`
  }
  return null
}

const formatNoticePeriod = (days: number | null) => {
  if (!days) return null
  if (days === 0) return 'Immediately available'
  if (days <= 7) return '1 week notice'
  if (days <= 14) return '2 weeks notice'
  if (days <= 30) return '1 month notice'
  if (days <= 60) return '2 months notice'
  if (days <= 90) return '3 months notice'
  return `${Math.round(days / 30)} months notice`
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
    <div className="bg-gray-50 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-gray-500">{icon}</span>
          <span className="text-[13px] font-medium text-gray-900">{title}</span>
          {count !== undefined && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-gray-200 text-gray-600 rounded-full">
              {count}
            </span>
          )}
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>
      {isOpen && (
        <div className="px-3 pb-3">
          {children}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export default function CandidateProfileCard({
  candidate,
  experiences = [],
  education = [],
  showContactInfo = true,
  coveringStatement,
  variant = 'compact',
  hideViewProfileLink = false,
  onContactClick,
  showAdminActions = false,
  showProfileCompleteness = false,
  editLink,
  onEdit,
  enableSuggestions = false,
  suggestions = [],
  onAddSuggestion,
}: CandidateProfileCardProps) {
  const isPage = variant === 'page'
  const isFull = isFullProfile(candidate)

  // Helper to wrap content with suggestion indicator when suggestions are enabled
  const withSuggestion = (
    fieldType: ProfileSuggestionFieldType,
    fieldName: string,
    content: React.ReactNode,
    relatedObjectId?: string
  ) => {
    if (!enableSuggestions || !onAddSuggestion) {
      return content
    }
    return (
      <SuggestionIndicator
        fieldType={fieldType}
        fieldName={fieldName}
        relatedObjectId={relatedObjectId}
        suggestions={suggestions}
        onAddSuggestion={onAddSuggestion}
      >
        {content}
      </SuggestionIndicator>
    )
  }

  // Use candidate's embedded data if available, otherwise use passed props
  const expData = (isFull && candidate.experiences) || experiences
  const eduData = (isFull && candidate.education) || education

  // Aggregate skills and technologies from experiences with proficiency
  const aggregatedSkills = useMemo(() => aggregateSkillsWithProficiency(expData), [expData])
  const aggregatedTechs = useMemo(() => aggregateTechsWithProficiency(expData), [expData])

  // Get initials for avatar
  const getInitials = () => {
    // CandidateProfile has first_name and last_name
    if (isCandidateProfile(candidate) && candidate.first_name && candidate.last_name) {
      return `${candidate.first_name[0]}${candidate.last_name[0]}`
    }
    // CandidateAdminListItem has initials
    if ('initials' in candidate && candidate.initials) {
      return candidate.initials
    }
    // CandidateProfileSanitized has initials
    if (!isFull) {
      return (candidate as CandidateProfileSanitized).initials || '?'
    }
    // Fallback: parse from full_name
    return candidate.full_name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?'
  }

  // Get the most recent/current job title
  const getCurrentRole = () => {
    if (expData.length > 0) {
      const current = expData.find(exp => exp.is_current) ?? expData[0]
      if (current) {
        return {
          title: current.job_title,
          company: current.company_name,
        }
      }
    }
    return null
  }

  const currentRole = getCurrentRole()

  // ============================================================================
  // PAGE VARIANT (unchanged)
  // ============================================================================
  if (isPage) {
    return (
      <div className="space-y-6">
        {/* Page Header */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 bg-gray-900 rounded-full flex items-center justify-center text-white text-[22px] font-medium flex-shrink-0">
              {getInitials()}
            </div>
            <div className="flex-1">
              <h1 className="text-[22px] font-semibold text-gray-900">
                {isFull ? candidate.full_name : candidate.professional_title || 'Professional'}
              </h1>
              {candidate.professional_title && isFull && (
                <p className="text-[15px] text-gray-600 mt-0.5">{candidate.professional_title}</p>
              )}
              {candidate.headline && (
                <p className="text-[14px] text-gray-500 mt-1">{candidate.headline}</p>
              )}
              {candidate.location && (
                <p className="text-[13px] text-gray-400 mt-2 flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {candidate.location}
                </p>
              )}

              {/* Tags */}
              <div className="mt-4 flex flex-wrap gap-2">
                {candidate.seniority && (
                  <span className="px-2.5 py-1 text-[12px] font-medium bg-gray-100 text-gray-700 rounded-md">
                    {getSeniorityLabel(candidate.seniority)}
                  </span>
                )}
                {candidate.work_preference && (
                  <span className="px-2.5 py-1 text-[12px] font-medium bg-blue-50 text-blue-700 rounded-md">
                    {getWorkPreferenceLabel(candidate.work_preference)}
                  </span>
                )}
                {candidate.years_of_experience && (
                  <span className="px-2.5 py-1 text-[12px] font-medium bg-green-50 text-green-700 rounded-md">
                    {candidate.years_of_experience}
                  </span>
                )}
                {candidate.willing_to_relocate && (
                  <span className="px-2.5 py-1 text-[12px] font-medium bg-purple-50 text-purple-700 rounded-md">
                    Open to relocate
                  </span>
                )}
              </div>
            </div>

            {/* Contact Button - Only for full profiles */}
            {isFull && onContactClick && (
              <button
                onClick={onContactClick}
                className="px-5 py-2.5 text-[14px] font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 transition-colors flex-shrink-0"
              >
                Contact Candidate
              </button>
            )}
          </div>
        </div>

        {/* Professional Summary */}
        {candidate.professional_summary && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="text-[15px] font-medium text-gray-900 mb-3">About</h4>
            <p className="text-[14px] text-gray-700 leading-relaxed whitespace-pre-wrap">
              {candidate.professional_summary}
            </p>
          </div>
        )}

        {/* Skills & Technologies (Aggregated from Experience) */}
        {(aggregatedSkills.length > 0 || aggregatedTechs.length > 0) && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="text-[15px] font-medium text-gray-900 mb-3">Skills & Technologies</h4>
            <p className="text-[12px] text-gray-500 mb-3">Based on experience - darker colors indicate more experience</p>

            {aggregatedTechs.length > 0 && (
              <div className="mb-4">
                <p className="text-[12px] font-medium text-gray-500 mb-2">Technologies</p>
                <div className="flex flex-wrap gap-1.5">
                  {aggregatedTechs.map((tech) => (
                    <span
                      key={tech.id}
                      className={`px-3 py-1.5 text-[13px] rounded ${getProficiencyStyle(tech.totalMonths, 'tech')}`}
                      title={`${tech.count} role${tech.count > 1 ? 's' : ''} • ${formatTotalDuration(tech.totalMonths)} total`}
                    >
                      {tech.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {aggregatedSkills.length > 0 && (
              <div>
                <p className="text-[12px] font-medium text-gray-500 mb-2">Skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {aggregatedSkills.map((skill) => (
                    <span
                      key={skill.id}
                      className={`px-3 py-1.5 text-[13px] rounded ${getProficiencyStyle(skill.totalMonths, 'skill')}`}
                      title={`${skill.count} role${skill.count > 1 ? 's' : ''} • ${formatTotalDuration(skill.totalMonths)} total`}
                    >
                      {skill.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Industries */}
        {candidate.industries && candidate.industries.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="text-[15px] font-medium text-gray-900 mb-3">Industries</h4>
            <div className="flex flex-wrap gap-1.5">
              {candidate.industries.map((industry: Industry) => (
                <span key={industry.id} className="px-3 py-1.5 text-[13px] text-gray-700 bg-gray-100 rounded">
                  {industry.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Experience */}
        {isFull && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="text-[15px] font-medium text-gray-900 mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-gray-400" />
              Experience
            </h4>
            {expData.length === 0 ? (
              <p className="text-[14px] text-gray-400 italic">No experience listed</p>
            ) : (
              <div className="space-y-6">
                {expData.map((exp) => (
                  <div key={exp.id} className="border-l-2 border-gray-200 pl-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[15px] font-medium text-gray-900">{exp.job_title}</p>
                        <p className="text-[14px] text-gray-600 flex items-center gap-1">
                          <Building2 className="w-4 h-4 text-gray-400" />
                          {exp.company_name}
                          {exp.company_size && <span className="text-gray-400">• {exp.company_size}</span>}
                        </p>
                        {exp.industry && <p className="text-[12px] text-gray-500">{exp.industry.name}</p>}
                      </div>
                      <span className="text-[13px] text-gray-500 whitespace-nowrap">
                        {formatDateRange(exp.start_date, exp.end_date, exp.is_current)}
                      </span>
                    </div>
                    {exp.description && (
                      <p className="text-[14px] mt-3 text-gray-600 leading-relaxed whitespace-pre-wrap">
                        {exp.description}
                      </p>
                    )}
                    {exp.achievements && (
                      <div className="mt-2">
                        <p className="text-[13px] font-medium text-gray-700">Key Achievements:</p>
                        <p className="text-[14px] text-gray-600 whitespace-pre-wrap">{exp.achievements}</p>
                      </div>
                    )}
                    {exp.technologies && exp.technologies.length > 0 && (
                      <div className="mt-2">
                        <p className="text-[12px] font-medium text-gray-500 mb-1">Technologies</p>
                        <div className="flex flex-wrap gap-1">
                          {exp.technologies.map((tech) => (
                            <span key={tech.id} className="px-2 py-0.5 text-[12px] bg-blue-50 text-blue-700 rounded">
                              {tech.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {exp.skills && exp.skills.length > 0 && (
                      <div className="mt-1.5">
                        <p className="text-[12px] font-medium text-gray-500 mb-1">Skills</p>
                        <div className="flex flex-wrap gap-1">
                          {exp.skills.map((skill) => (
                            <span key={skill.id} className="px-2 py-0.5 text-[12px] bg-gray-100 text-gray-700 rounded">
                              {skill.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Education */}
        {isFull && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="text-[15px] font-medium text-gray-900 mb-4 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-gray-400" />
              Education
            </h4>
            {eduData.length === 0 ? (
              <p className="text-[14px] text-gray-400 italic">No education listed</p>
            ) : (
              <div className="space-y-6">
                {eduData.map((edu) => (
                  <div key={edu.id} className="border-l-2 border-gray-200 pl-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[15px] font-medium text-gray-900">{edu.degree}</p>
                        <p className="text-[14px] text-gray-600">{edu.field_of_study}</p>
                        <p className="text-[14px] text-gray-500">{edu.institution}</p>
                      </div>
                      <span className="text-[13px] text-gray-500 whitespace-nowrap">
                        {formatDateRange(edu.start_date, edu.end_date, edu.is_current)}
                      </span>
                    </div>
                    {edu.grade && <p className="text-[13px] text-gray-500 mt-1">Grade: {edu.grade}</p>}
                    {edu.description && (
                      <p className="text-[14px] text-gray-600 mt-2 whitespace-pre-wrap">{edu.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Portfolio Links */}
        {isCandidateProfile(candidate) && candidate.portfolio_links && candidate.portfolio_links.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="text-[15px] font-medium text-gray-900 mb-3">Portfolio</h4>
            <div className="space-y-2">
              {candidate.portfolio_links.map((link: { url: string; title: string; description?: string }, index: number) => (
                <a
                  key={index}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 border border-gray-200 rounded-md hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <ExternalLink className="w-4 h-4 text-gray-400" />
                    <span className="text-[14px] font-medium text-gray-900">{link.title}</span>
                  </div>
                  {link.description && (
                    <p className="text-[13px] text-gray-500 mt-1">{link.description}</p>
                  )}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Get profile completeness color
  const getCompletenessColor = (percentage: number) => {
    if (percentage >= 70) return 'bg-green-500'
    if (percentage >= 40) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  // ============================================================================
  // COMPACT VARIANT (Redesigned - Single Unified Header)
  // ============================================================================
  return (
    <div className="space-y-4">
      {/* Unified Header Card */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        {/* Top Row: Avatar + Name/Role + Actions */}
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="w-14 h-14 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl flex items-center justify-center text-white text-[16px] font-semibold flex-shrink-0">
            {getInitials()}
          </div>

          {/* Main Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-[16px] font-semibold text-gray-900 truncate">
                  {isFull ? candidate.full_name : candidate.professional_title || 'Professional'}
                </h3>
                {currentRole && (
                  <p className="text-[13px] text-gray-600 truncate">
                    {currentRole.title} at {currentRole.company}
                  </p>
                )}
                {candidate.location && (
                  <p className="text-[12px] text-gray-500 mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {candidate.location}
                  </p>
                )}
              </div>

              {/* Admin Actions (top-right) */}
              {showAdminActions && isFull && (
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  {/* Contact Details */}
                  {showContactInfo && (
                    <div className="flex flex-col items-end gap-0.5 text-[11px] text-gray-500">
                      <a href={`mailto:${candidate.email}`} className="hover:text-gray-700">{candidate.email}</a>
                      {candidate.phone && <span>{candidate.phone}</span>}
                    </div>
                  )}
                  {/* Action Buttons */}
                  <div className="flex items-center gap-1.5">
                    {editLink ? (
                      <Link
                        to={editLink}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        title="Edit Profile"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Link>
                    ) : onEdit && (
                      <button
                        onClick={onEdit}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        title="Edit Profile"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {candidate.slug && (
                      <a
                        href={`/candidates/${candidate.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        title="View Public Profile"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <a
                      href={`mailto:${candidate.email}`}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                      title="Send Email"
                    >
                      <Mail className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Meta Tags Row */}
        <div className="flex items-center justify-between gap-4 mt-3 pt-3 border-t border-gray-100 text-[11px]">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {candidate.seniority && (
              <span className="font-medium text-gray-600">{getSeniorityLabel(candidate.seniority)}</span>
            )}
            {candidate.years_of_experience && (
              <>
                <span className="text-gray-300">•</span>
                <span className="text-gray-500">{candidate.years_of_experience}</span>
              </>
            )}
            {candidate.work_preference && (
              <>
                <span className="text-gray-300">•</span>
                <span className="text-gray-500">{getWorkPreferenceLabel(candidate.work_preference)}</span>
              </>
            )}
            {isFull && formatSalaryExpectation(candidate.salary_expectation_min, candidate.salary_expectation_max, candidate.salary_currency) && (
              <>
                <span className="text-gray-300">•</span>
                <span className="text-gray-500">
                  {formatSalaryExpectation(candidate.salary_expectation_min, candidate.salary_expectation_max, candidate.salary_currency)}
                </span>
              </>
            )}
            {isFull && formatNoticePeriod(candidate.notice_period_days) && (
              <>
                <span className="text-gray-300">•</span>
                <span className="text-gray-500">{formatNoticePeriod(candidate.notice_period_days)}</span>
              </>
            )}
            {candidate.willing_to_relocate && (
              <>
                <span className="text-gray-300">•</span>
                <span className="px-1.5 py-0.5 text-[10px] font-medium bg-purple-50 text-purple-700 rounded">Relocate</span>
              </>
            )}
          </div>

          {/* Profile Completeness (right side) */}
          {showProfileCompleteness && hasProfileCompleteness(candidate) && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full ${getCompletenessColor(candidate.profile_completeness)}`}
                  style={{ width: `${candidate.profile_completeness}%` }}
                />
              </div>
              <span className="text-[11px] text-gray-500">{candidate.profile_completeness}%</span>
            </div>
          )}
        </div>

      </div>

      {/* Cover Statement - Highlighted */}
      {coveringStatement && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
          <h4 className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider mb-2">Cover Statement</h4>
          <p className="text-[13px] text-blue-900 leading-relaxed">
            {coveringStatement}
          </p>
        </div>
      )}

      {/* About */}
      {candidate.professional_summary && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">About</h4>
          {withSuggestion('profile', 'professional_summary', (
            <p className="text-[13px] text-gray-700 leading-relaxed line-clamp-4">
              {candidate.professional_summary}
            </p>
          ))}
        </div>
      )}

      {/* Skills, Technologies & Industries */}
      {(aggregatedSkills.length > 0 || aggregatedTechs.length > 0 || (candidate.industries && candidate.industries.length > 0)) && (
        <div className="space-y-3">
          {/* Technologies (from experience) */}
          {aggregatedTechs.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Technologies</h4>
              <div className="flex flex-wrap gap-1">
                {aggregatedTechs.map((tech) => (
                  <span
                    key={tech.id}
                    className={`px-2 py-0.5 text-[11px] rounded ${getProficiencyStyle(tech.totalMonths, 'tech')}`}
                    title={`${tech.count} role${tech.count > 1 ? 's' : ''} • ${formatTotalDuration(tech.totalMonths)}`}
                  >
                    {tech.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Skills (from experience) */}
          {aggregatedSkills.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Skills</h4>
              <div className="flex flex-wrap gap-1">
                {aggregatedSkills.map((skill) => (
                  <span
                    key={skill.id}
                    className={`px-2 py-0.5 text-[11px] rounded ${getProficiencyStyle(skill.totalMonths, 'skill')}`}
                    title={`${skill.count} role${skill.count > 1 ? 's' : ''} • ${formatTotalDuration(skill.totalMonths)}`}
                  >
                    {skill.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Industries */}
          {candidate.industries && candidate.industries.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Industries</h4>
              <div className="flex flex-wrap gap-1">
                {candidate.industries.map((industry: Industry) => (
                  <span
                    key={industry.id}
                    className="px-2 py-0.5 text-[11px] text-gray-700 bg-gray-100 rounded"
                  >
                    {industry.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Experience - Collapsible */}
      <CollapsibleSection
        title="Experience"
        icon={<Briefcase className="w-4 h-4" />}
        count={expData.length}
        defaultOpen={expData.length > 0 && expData.length <= 2}
      >
        {expData.length === 0 ? (
          <p className="text-[12px] text-gray-400 italic py-2">No experience listed</p>
        ) : (
          <div className="space-y-3 pt-2">
            {expData.map((exp, index) => (
              <div
                key={exp.id}
                className={`${index > 0 ? 'pt-3 border-t border-gray-200' : ''}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    {withSuggestion('experience', 'job_title', (
                      <p className="text-[13px] font-medium text-gray-900 truncate">{exp.job_title}</p>
                    ), exp.id)}
                    {withSuggestion('experience', 'company_name', (
                      <p className="text-[12px] text-gray-600 truncate flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        {exp.company_name}
                      </p>
                    ), exp.id)}
                  </div>
                  <span className="text-[11px] text-gray-500 whitespace-nowrap flex-shrink-0">
                    {formatDateRange(exp.start_date, exp.end_date, exp.is_current)}
                  </span>
                </div>
                {exp.description && withSuggestion('experience', 'description', (
                  <p className="text-[12px] text-gray-600 mt-1.5 leading-relaxed line-clamp-2">
                    {exp.description}
                  </p>
                ), exp.id)}
                {/* Technologies */}
                {exp.technologies && exp.technologies.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {exp.technologies.map((tech) => (
                      <span key={tech.id} className="px-1.5 py-0.5 text-[10px] bg-blue-50 text-blue-700 rounded">
                        {tech.name}
                      </span>
                    ))}
                  </div>
                )}
                {/* Skills */}
                {exp.skills && exp.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {exp.skills.map((skill) => (
                      <span key={skill.id} className="px-1.5 py-0.5 text-[10px] bg-gray-100 text-gray-700 rounded">
                        {skill.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>

      {/* Education - Collapsible */}
      <CollapsibleSection
        title="Education"
        icon={<GraduationCap className="w-4 h-4" />}
        count={eduData.length}
        defaultOpen={false}
      >
        {eduData.length === 0 ? (
          <p className="text-[12px] text-gray-400 italic py-2">No education listed</p>
        ) : (
          <div className="space-y-3 pt-2">
            {eduData.map((edu, index) => (
              <div
                key={edu.id}
                className={`${index > 0 ? 'pt-3 border-t border-gray-200' : ''}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    {withSuggestion('education', 'degree', (
                      <p className="text-[13px] font-medium text-gray-900 truncate">{edu.degree}</p>
                    ), edu.id)}
                    {withSuggestion('education', 'field_of_study', (
                      <p className="text-[12px] text-gray-600 truncate">{edu.field_of_study}</p>
                    ), edu.id)}
                    {withSuggestion('education', 'institution', (
                      <p className="text-[12px] text-gray-500 truncate">{edu.institution}</p>
                    ), edu.id)}
                  </div>
                  <span className="text-[11px] text-gray-500 whitespace-nowrap flex-shrink-0">
                    {formatDateRange(edu.start_date, edu.end_date, edu.is_current)}
                  </span>
                </div>
                {edu.grade && (
                  <p className="text-[11px] text-gray-500 mt-1">Grade: {edu.grade}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>

      {/* Portfolio Links */}
      {isCandidateProfile(candidate) && candidate.portfolio_links && candidate.portfolio_links.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Portfolio</h4>
          <div className="flex flex-wrap gap-2">
            {candidate.portfolio_links.map((link: { url: string; title: string; description?: string }, index: number) => (
              <a
                key={index}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                {link.title}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* View Full Profile Link */}
      {!hideViewProfileLink && candidate.slug && (
        <a
          href={`/candidates/${candidate.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-2.5 text-[13px] font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
        >
          View Full Profile
          <ExternalLink className="w-4 h-4" />
        </a>
      )}
    </div>
  )
}
