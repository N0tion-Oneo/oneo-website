import { useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { CandidateAdminListItem, ProfileVisibility, Currency } from '@/types'
import {
  X,
  Pencil,
  Eye,
  Mail,
  MapPin,
  Briefcase,
  Calendar,
  DollarSign,
  Clock,
  FileText,
  Globe,
  Check,
} from 'lucide-react'
import {
  aggregateSkillsWithProficiency,
  aggregateTechsWithProficiency,
  getProficiencyStyle,
  formatTotalDuration,
} from '@/utils/proficiency'

interface CandidatePreviewPanelProps {
  candidate: CandidateAdminListItem | null
  onClose: () => void
}

const SENIORITY_LABELS: Record<string, string> = {
  intern: 'Intern',
  junior: 'Junior',
  mid: 'Mid-level',
  senior: 'Senior',
  lead: 'Lead',
  principal: 'Principal',
  executive: 'Executive',
}

const WORK_PREFERENCE_LABELS: Record<string, string> = {
  remote: 'Remote',
  hybrid: 'Hybrid',
  onsite: 'On-site',
  flexible: 'Flexible',
}

const formatCurrency = (currency: Currency): string => {
  const symbols: Record<Currency, string> = {
    ZAR: 'R',
    USD: '$',
    EUR: '\u20AC',
    GBP: '\u00A3',
  }
  return symbols[currency] || currency
}

const formatSalary = (min: number | null, max: number | null, currency: Currency): string => {
  if (!min && !max) return 'Not specified'
  const symbol = formatCurrency(currency)
  const formatNum = (n: number) => new Intl.NumberFormat().format(n)
  if (min && max) return `${symbol}${formatNum(min)} - ${symbol}${formatNum(max)}`
  if (min) return `${symbol}${formatNum(min)}+`
  if (max) return `Up to ${symbol}${formatNum(max)}`
  return 'Not specified'
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function CandidatePreviewPanel({ candidate, onClose }: CandidatePreviewPanelProps) {
  // Handle escape key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }, [onClose])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Prevent body scroll when panel is open
  useEffect(() => {
    if (candidate) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [candidate])

  // Aggregate skills and technologies from experiences
  const aggregatedSkills = useMemo(
    () => (candidate ? aggregateSkillsWithProficiency(candidate.experiences || []) : []),
    [candidate]
  )
  const aggregatedTechs = useMemo(
    () => (candidate ? aggregateTechsWithProficiency(candidate.experiences || []) : []),
    [candidate]
  )

  if (!candidate) return null

  const location = candidate.location || [candidate.city, candidate.country].filter(Boolean).join(', ') || 'Not specified'

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-[200]"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-1/2 bg-white shadow-xl z-[201] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-[16px] font-semibold text-gray-900">Candidate Details</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Profile Header */}
          <div className="px-6 py-5 border-b border-gray-100">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                <span className="text-[20px] font-medium text-gray-600">
                  {candidate.initials || '--'}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-[18px] font-semibold text-gray-900">
                  {candidate.full_name || 'No name'}
                </h3>
                <p className="text-[14px] text-gray-600 mt-0.5">
                  {candidate.professional_title || 'No title'}
                </p>
                <p className="text-[13px] text-gray-500 mt-1">
                  {candidate.email}
                </p>
                {candidate.phone && (
                  <p className="text-[13px] text-gray-500">{candidate.phone}</p>
                )}
              </div>
              <span
                className={`px-2 py-1 text-[11px] font-medium rounded ${
                  candidate.visibility === ProfileVisibility.PUBLIC_SANITISED
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {candidate.visibility === ProfileVisibility.PUBLIC_SANITISED ? 'Public' : 'Private'}
              </span>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 mt-4">
              <Link
                to={`/dashboard/admin/candidates/${candidate.slug}`}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium bg-gray-900 text-white rounded-md hover:bg-gray-800"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit Profile
              </Link>
              <Link
                to={`/candidates/${candidate.slug}`}
                target="_blank"
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium border border-gray-200 text-gray-700 rounded-md hover:bg-gray-50"
              >
                <Eye className="w-3.5 h-3.5" />
                View Public
              </Link>
              <a
                href={`mailto:${candidate.email}`}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium border border-gray-200 text-gray-700 rounded-md hover:bg-gray-50"
              >
                <Mail className="w-3.5 h-3.5" />
                Email
              </a>
            </div>
          </div>

          {/* Profile Completeness */}
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-medium text-gray-600">Profile Completeness</span>
              <span className="text-[13px] font-semibold text-gray-900">{candidate.profile_completeness}%</span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  candidate.profile_completeness >= 70
                    ? 'bg-green-500'
                    : candidate.profile_completeness >= 40
                    ? 'bg-yellow-500'
                    : 'bg-red-400'
                }`}
                style={{ width: `${candidate.profile_completeness}%` }}
              />
            </div>
          </div>

          {/* Headline */}
          {candidate.headline && (
            <div className="px-6 py-4 border-b border-gray-100">
              <h4 className="text-[12px] font-medium text-gray-500 uppercase tracking-wider mb-2">
                Headline
              </h4>
              <p className="text-[14px] text-gray-700">{candidate.headline}</p>
            </div>
          )}

          {/* Professional Summary */}
          {candidate.professional_summary && (
            <div className="px-6 py-4 border-b border-gray-100">
              <h4 className="text-[12px] font-medium text-gray-500 uppercase tracking-wider mb-2">
                Summary
              </h4>
              <p className="text-[14px] text-gray-700 whitespace-pre-wrap">{candidate.professional_summary}</p>
            </div>
          )}

          {/* Details Grid */}
          <div className="px-6 py-4 border-b border-gray-100">
            <h4 className="text-[12px] font-medium text-gray-500 uppercase tracking-wider mb-3">
              Details
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <InfoItem
                icon={<Briefcase className="w-4 h-4" />}
                label="Seniority"
                value={SENIORITY_LABELS[candidate.seniority] || '-'}
              />
              <InfoItem
                icon={<Calendar className="w-4 h-4" />}
                label="Experience"
                value={candidate.years_of_experience || '-'}
              />
              <InfoItem
                icon={<MapPin className="w-4 h-4" />}
                label="Location"
                value={location}
              />
              <InfoItem
                icon={<Globe className="w-4 h-4" />}
                label="Work Preference"
                value={WORK_PREFERENCE_LABELS[candidate.work_preference] || '-'}
              />
              <InfoItem
                icon={<Check className="w-4 h-4" />}
                label="Willing to Relocate"
                value={candidate.willing_to_relocate ? 'Yes' : 'No'}
              />
              <InfoItem
                icon={<FileText className="w-4 h-4" />}
                label="Resume"
                value={candidate.has_resume ? 'Uploaded' : 'Not uploaded'}
              />
            </div>
          </div>

          {/* Compensation */}
          <div className="px-6 py-4 border-b border-gray-100">
            <h4 className="text-[12px] font-medium text-gray-500 uppercase tracking-wider mb-3">
              Compensation
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <InfoItem
                icon={<DollarSign className="w-4 h-4" />}
                label="Salary Expectation"
                value={formatSalary(
                  candidate.salary_expectation_min,
                  candidate.salary_expectation_max,
                  candidate.salary_currency
                )}
              />
              <InfoItem
                icon={<Clock className="w-4 h-4" />}
                label="Notice Period"
                value={candidate.notice_period_days !== null ? `${candidate.notice_period_days} days` : '-'}
              />
            </div>
          </div>

          {/* Preferred Locations */}
          {candidate.preferred_locations && candidate.preferred_locations.length > 0 && (
            <div className="px-6 py-4 border-b border-gray-100">
              <h4 className="text-[12px] font-medium text-gray-500 uppercase tracking-wider mb-2">
                Preferred Locations
              </h4>
              <div className="flex flex-wrap gap-2">
                {candidate.preferred_locations.map((loc, idx) => (
                  <span key={idx} className="px-2 py-1 text-[12px] bg-gray-100 text-gray-700 rounded">
                    {loc}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Skills (aggregated from experiences) */}
          {aggregatedSkills.length > 0 && (
            <div className="px-6 py-4 border-b border-gray-100">
              <h4 className="text-[12px] font-medium text-gray-500 uppercase tracking-wider mb-2">
                Skills
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {aggregatedSkills.map(skill => (
                  <span
                    key={skill.id}
                    className={`px-2 py-0.5 text-[11px] rounded ${getProficiencyStyle(skill.count, 'skill')}`}
                    title={`${skill.count} role${skill.count > 1 ? 's' : ''} • ${formatTotalDuration(skill.totalMonths)} total`}
                  >
                    {skill.name}
                    {skill.count > 1 && <span className="ml-1 opacity-75">×{skill.count}</span>}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Technologies (aggregated from experiences) */}
          {aggregatedTechs.length > 0 && (
            <div className="px-6 py-4 border-b border-gray-100">
              <h4 className="text-[12px] font-medium text-gray-500 uppercase tracking-wider mb-2">
                Technologies
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {aggregatedTechs.map(tech => (
                  <span
                    key={tech.id}
                    className={`px-2 py-0.5 text-[11px] rounded ${getProficiencyStyle(tech.count, 'tech')}`}
                    title={`${tech.count} role${tech.count > 1 ? 's' : ''} • ${formatTotalDuration(tech.totalMonths)} total`}
                  >
                    {tech.name}
                    {tech.count > 1 && <span className="ml-1 opacity-75">×{tech.count}</span>}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Industries */}
          {candidate.industries && candidate.industries.length > 0 && (
            <div className="px-6 py-4 border-b border-gray-100">
              <h4 className="text-[12px] font-medium text-gray-500 uppercase tracking-wider mb-2">
                Industries
              </h4>
              <div className="flex flex-wrap gap-2">
                {candidate.industries.map(ind => (
                  <span key={ind.id} className="px-2 py-1 text-[12px] bg-blue-50 text-blue-700 rounded">
                    {ind.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Experience */}
          {candidate.experiences && candidate.experiences.length > 0 && (
            <div className="px-6 py-4 border-b border-gray-100">
              <h4 className="text-[12px] font-medium text-gray-500 uppercase tracking-wider mb-3">
                Experience ({candidate.experiences.length})
              </h4>
              <div className="space-y-4">
                {candidate.experiences.map(exp => (
                  <div key={exp.id} className="border-l-2 border-gray-200 pl-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[13px] font-medium text-gray-900">{exp.job_title}</p>
                        <p className="text-[12px] text-gray-600">
                          {exp.company_name}
                          {exp.industry && <span className="text-gray-400"> · {exp.industry.name}</span>}
                        </p>
                      </div>
                      {exp.is_current && (
                        <span className="px-1.5 py-0.5 text-[10px] font-medium bg-green-100 text-green-700 rounded">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {new Date(exp.start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      {' - '}
                      {exp.is_current ? 'Present' : exp.end_date ? new Date(exp.end_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '-'}
                    </p>
                    {exp.description && (
                      <p className="text-[12px] text-gray-600 mt-1.5 line-clamp-2">{exp.description}</p>
                    )}
                    {exp.skills && exp.skills.length > 0 && (
                      <div className="mt-2">
                        <p className="text-[10px] text-gray-400 mb-1">Skills</p>
                        <div className="flex flex-wrap gap-1">
                          {exp.skills.slice(0, 5).map(skill => (
                            <span key={skill.id} className="px-1.5 py-0.5 text-[10px] bg-gray-100 text-gray-600 rounded">
                              {skill.name}
                            </span>
                          ))}
                          {exp.skills.length > 5 && (
                            <span className="text-[10px] text-gray-400">+{exp.skills.length - 5}</span>
                          )}
                        </div>
                      </div>
                    )}
                    {exp.technologies && exp.technologies.length > 0 && (
                      <div className="mt-2">
                        <p className="text-[10px] text-gray-400 mb-1">Technologies</p>
                        <div className="flex flex-wrap gap-1">
                          {exp.technologies.slice(0, 5).map(tech => (
                            <span key={tech.id} className="px-1.5 py-0.5 text-[10px] bg-blue-50 text-blue-600 rounded">
                              {tech.name}
                            </span>
                          ))}
                          {exp.technologies.length > 5 && (
                            <span className="text-[10px] text-gray-400">+{exp.technologies.length - 5}</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Education */}
          {candidate.education && candidate.education.length > 0 && (
            <div className="px-6 py-4 border-b border-gray-100">
              <h4 className="text-[12px] font-medium text-gray-500 uppercase tracking-wider mb-3">
                Education ({candidate.education.length})
              </h4>
              <div className="space-y-4">
                {candidate.education.map(edu => (
                  <div key={edu.id} className="border-l-2 border-gray-200 pl-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[13px] font-medium text-gray-900">
                          {edu.degree}{edu.field_of_study ? ` in ${edu.field_of_study}` : ''}
                        </p>
                        <p className="text-[12px] text-gray-600">{edu.institution}</p>
                      </div>
                      {edu.is_current && (
                        <span className="px-1.5 py-0.5 text-[10px] font-medium bg-green-100 text-green-700 rounded">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {new Date(edu.start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      {' - '}
                      {edu.is_current ? 'Present' : edu.end_date ? new Date(edu.end_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '-'}
                      {edu.grade && <span className="ml-2">· Grade: {edu.grade}</span>}
                    </p>
                    {edu.description && (
                      <p className="text-[12px] text-gray-600 mt-1.5 line-clamp-2">{edu.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="px-6 py-4">
            <div className="flex items-center justify-between text-[12px] text-gray-500">
              <span>Created: {formatDate(candidate.created_at)}</span>
              <span>Updated: {formatDate(candidate.updated_at)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
          <p className="text-[11px] text-gray-500 text-center">
            Press <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-[10px] font-mono">Esc</kbd> to close
          </p>
        </div>
      </div>
    </>
  )
}

// Info Item Component
function InfoItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-2">
      <div className="text-gray-400 mt-0.5">{icon}</div>
      <div>
        <p className="text-[11px] text-gray-500">{label}</p>
        <p className="text-[13px] text-gray-900">{value}</p>
      </div>
    </div>
  )
}
