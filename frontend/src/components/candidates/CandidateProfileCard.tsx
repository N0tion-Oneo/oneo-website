import { Mail, Phone, MapPin, Briefcase, Calendar, GraduationCap, Building2, ExternalLink } from 'lucide-react'
import type { CandidateProfile, Experience, Education, Skill, Industry } from '@/types'

interface CandidateProfileCardProps {
  candidate: CandidateProfile
  experiences?: Experience[]
  education?: Education[]
  isLoadingExperiences?: boolean
  isLoadingEducation?: boolean
  showContactInfo?: boolean
  coveringStatement?: string
  compact?: boolean
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

export default function CandidateProfileCard({
  candidate,
  experiences = [],
  education = [],
  isLoadingExperiences = false,
  isLoadingEducation = false,
  showContactInfo = true,
  coveringStatement,
  compact = false,
}: CandidateProfileCardProps) {
  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="flex items-start gap-4">
        <div className={`${compact ? 'w-14 h-14 text-[16px]' : 'w-16 h-16 text-[18px]'} bg-gray-900 rounded-full flex items-center justify-center text-white font-medium flex-shrink-0`}>
          {candidate.full_name
            ?.split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`${compact ? 'text-[15px]' : 'text-[16px]'} font-semibold text-gray-900`}>
            {candidate.full_name}
          </h3>
          <p className="text-[14px] text-gray-600">{candidate.professional_title || 'No title'}</p>
          {candidate.headline && (
            <p className="text-[13px] text-gray-500 mt-1 line-clamp-2">{candidate.headline}</p>
          )}
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-2">
        {candidate.seniority && (
          <span className="px-2 py-1 text-[11px] font-medium bg-gray-100 text-gray-700 rounded">
            {getSeniorityLabel(candidate.seniority)}
          </span>
        )}
        {candidate.work_preference && (
          <span className="px-2 py-1 text-[11px] font-medium bg-blue-50 text-blue-700 rounded">
            {getWorkPreferenceLabel(candidate.work_preference)}
          </span>
        )}
        {candidate.years_of_experience && (
          <span className="px-2 py-1 text-[11px] font-medium bg-green-50 text-green-700 rounded">
            {candidate.years_of_experience}+ years
          </span>
        )}
        {candidate.willing_to_relocate && (
          <span className="px-2 py-1 text-[11px] font-medium bg-purple-50 text-purple-700 rounded">
            Open to relocate
          </span>
        )}
      </div>

      {/* Contact Info */}
      {showContactInfo && (
        <div className="space-y-2">
          <h4 className="text-[12px] font-medium text-gray-500 uppercase tracking-wider">Contact</h4>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 text-[13px]">
              <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <a href={`mailto:${candidate.email}`} className="text-gray-700 hover:text-gray-900 truncate">
                {candidate.email}
              </a>
            </div>
            {candidate.phone && (
              <div className="flex items-center gap-2.5 text-[13px]">
                <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-gray-700">{candidate.phone}</span>
              </div>
            )}
            {candidate.location && (
              <div className="flex items-center gap-2.5 text-[13px]">
                <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-gray-700">{candidate.location}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Professional Summary */}
      {candidate.professional_summary && (
        <div className="space-y-2">
          <h4 className="text-[12px] font-medium text-gray-500 uppercase tracking-wider">About</h4>
          <p className="text-[13px] text-gray-700 leading-relaxed">
            {candidate.professional_summary}
          </p>
        </div>
      )}

      {/* Cover Statement */}
      {coveringStatement && (
        <div className="space-y-2">
          <h4 className="text-[12px] font-medium text-gray-500 uppercase tracking-wider">Cover Statement</h4>
          <p className="text-[13px] text-gray-700 leading-relaxed bg-gray-50 p-3 rounded-md">
            {coveringStatement}
          </p>
        </div>
      )}

      {/* Skills */}
      {candidate.skills && candidate.skills.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-[12px] font-medium text-gray-500 uppercase tracking-wider">Skills</h4>
          <div className="flex flex-wrap gap-1.5">
            {candidate.skills.map((skill: Skill) => (
              <span
                key={skill.id}
                className="px-2 py-1 text-[12px] text-gray-700 bg-gray-100 rounded"
              >
                {skill.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Industries */}
      {candidate.industries && candidate.industries.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-[12px] font-medium text-gray-500 uppercase tracking-wider">Industries</h4>
          <div className="flex flex-wrap gap-1.5">
            {candidate.industries.map((industry: Industry) => (
              <span
                key={industry.id}
                className="px-2 py-1 text-[12px] text-gray-700 bg-gray-100 rounded"
              >
                {industry.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Experience */}
      <div className="space-y-3">
        <h4 className="text-[12px] font-medium text-gray-500 uppercase tracking-wider flex items-center gap-2">
          <Briefcase className="w-4 h-4" />
          Experience
        </h4>
        {isLoadingExperiences ? (
          <p className="text-[13px] text-gray-400 italic">Loading experience...</p>
        ) : experiences.length === 0 ? (
          <p className="text-[13px] text-gray-400 italic">No experience listed</p>
        ) : (
          <div className="space-y-4">
            {experiences.map((exp) => (
              <div key={exp.id} className="border-l-2 border-gray-200 pl-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[14px] font-medium text-gray-900">{exp.job_title}</p>
                    <p className="text-[13px] text-gray-600 flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      {exp.company_name}
                      {exp.company_size && (
                        <span className="text-gray-400">• {exp.company_size}</span>
                      )}
                    </p>
                    {exp.industry && (
                      <p className="text-[12px] text-gray-500">{exp.industry.name}</p>
                    )}
                  </div>
                  <span className="text-[12px] text-gray-500 whitespace-nowrap">
                    {formatDateRange(exp.start_date, exp.end_date, exp.is_current)}
                  </span>
                </div>
                {exp.description && (
                  <p className="text-[13px] text-gray-600 mt-2 leading-relaxed">
                    {exp.description}
                  </p>
                )}
                {exp.achievements && (
                  <p className="text-[13px] text-gray-600 mt-1">
                    <span className="font-medium">Achievements:</span> {exp.achievements}
                  </p>
                )}
                {exp.technologies && exp.technologies.length > 0 && (
                  <div className="mt-2">
                    <p className="text-[11px] font-medium text-gray-500 mb-1">Technologies</p>
                    <div className="flex flex-wrap gap-1">
                      {exp.technologies.map((tech) => (
                        <span key={tech.id} className="px-1.5 py-0.5 text-[11px] bg-blue-50 text-blue-700 rounded">
                          {tech.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {exp.skills && exp.skills.length > 0 && (
                  <div className="mt-1.5">
                    <p className="text-[11px] font-medium text-gray-500 mb-1">Skills</p>
                    <div className="flex flex-wrap gap-1">
                      {exp.skills.map((skill) => (
                        <span key={skill.id} className="px-1.5 py-0.5 text-[11px] bg-gray-100 text-gray-700 rounded">
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

      {/* Education */}
      <div className="space-y-3">
        <h4 className="text-[12px] font-medium text-gray-500 uppercase tracking-wider flex items-center gap-2">
          <GraduationCap className="w-4 h-4" />
          Education
        </h4>
        {isLoadingEducation ? (
          <p className="text-[13px] text-gray-400 italic">Loading education...</p>
        ) : education.length === 0 ? (
          <p className="text-[13px] text-gray-400 italic">No education listed</p>
        ) : (
          <div className="space-y-4">
            {education.map((edu) => (
              <div key={edu.id} className="border-l-2 border-gray-200 pl-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[14px] font-medium text-gray-900">{edu.degree}</p>
                    <p className="text-[13px] text-gray-600">{edu.field_of_study}</p>
                    <p className="text-[13px] text-gray-500">{edu.institution}</p>
                  </div>
                  <span className="text-[12px] text-gray-500 whitespace-nowrap">
                    {formatDateRange(edu.start_date, edu.end_date, edu.is_current)}
                  </span>
                </div>
                {edu.grade && (
                  <p className="text-[12px] text-gray-500 mt-1">Grade: {edu.grade}</p>
                )}
                {edu.description && (
                  <p className="text-[13px] text-gray-600 mt-1">{edu.description}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Portfolio Links */}
      {candidate.portfolio_links && candidate.portfolio_links.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-[12px] font-medium text-gray-500 uppercase tracking-wider">Portfolio</h4>
          <div className="space-y-2">
            {candidate.portfolio_links.map((link, index) => (
              <a
                key={index}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-[13px] text-gray-700 hover:text-gray-900"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                {link.title}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* View Full Profile Link */}
      {candidate.slug && (
        <a
          href={`/candidates/${candidate.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-[13px] font-medium text-gray-700 hover:text-gray-900"
        >
          View Full Profile
          <ExternalLink className="w-4 h-4" />
        </a>
      )}
    </div>
  )
}
