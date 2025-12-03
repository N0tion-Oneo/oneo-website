import { Link, useParams } from 'react-router-dom'
import { useCandidate } from '@/hooks'
import { Briefcase, GraduationCap, Building2 } from 'lucide-react'
import type { CandidateProfile, CandidateProfileSanitized } from '@/types'

// Type guard to check if profile is full or sanitized
function isFullProfile(profile: CandidateProfile | CandidateProfileSanitized): profile is CandidateProfile {
  return 'email' in profile
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

export default function CandidateProfilePage() {
  const { slug } = useParams<{ slug: string }>()
  const { candidate, isLoading, error } = useCandidate(slug || '')

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-[14px] text-gray-500">Loading profile...</p>
      </div>
    )
  }

  if (error || !candidate) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-6 h-14 flex items-center">
            <Link to="/" className="text-lg font-semibold text-gray-900">
              Oneo
            </Link>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-6 py-10">
          <div className="text-center py-12">
            <p className="text-[15px] text-gray-700 mb-2">Profile not found</p>
            <p className="text-[13px] text-gray-500 mb-4">
              This profile may be private or doesn't exist
            </p>
            <Link
              to="/candidates"
              className="text-[14px] font-medium text-gray-900 hover:underline"
            >
              Back to directory
            </Link>
          </div>
        </main>
      </div>
    )
  }

  const isFull = isFullProfile(candidate)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link to="/" className="text-lg font-semibold text-gray-900">
            Oneo
          </Link>
          <nav className="flex items-center gap-6">
            <Link to="/candidates" className="text-[13px] font-medium text-gray-500 hover:text-gray-900">
              Back to directory
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        {/* Profile Header */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 bg-gray-900 rounded-full flex items-center justify-center text-white text-[22px] font-medium flex-shrink-0">
              {isFull
                ? `${candidate.first_name?.[0] || ''}${candidate.last_name?.[0] || ''}`
                : (candidate as CandidateProfileSanitized).initials}
            </div>
            <div className="flex-1">
              <h1 className="text-[22px] font-semibold text-gray-900">
                {isFull
                  ? candidate.full_name
                  : candidate.professional_title || 'Professional'}
              </h1>
              {candidate.professional_title && isFull && (
                <p className="text-[15px] text-gray-600 mt-0.5">{candidate.professional_title}</p>
              )}
              {candidate.headline && (
                <p className="text-[14px] text-gray-500 mt-1">{candidate.headline}</p>
              )}
              {candidate.location && (
                <p className="text-[13px] text-gray-400 mt-2 flex items-center gap-1">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
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
                    {candidate.years_of_experience}+ years experience
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
            {isFull && (
              <button className="px-5 py-2.5 text-[14px] font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 transition-colors flex-shrink-0">
                Contact Candidate
              </button>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-6">
            {/* About */}
            {candidate.professional_summary && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h2 className="text-[15px] font-medium text-gray-900 mb-3">About</h2>
                <p className="text-[14px] text-gray-600 leading-relaxed whitespace-pre-wrap">
                  {candidate.professional_summary}
                </p>
              </div>
            )}

            {/* Skills */}
            {candidate.skills && candidate.skills.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h2 className="text-[15px] font-medium text-gray-900 mb-3">Skills</h2>
                <div className="flex flex-wrap gap-2">
                  {candidate.skills.map((skill) => (
                    <span
                      key={skill.id}
                      className="px-3 py-1.5 text-[13px] text-gray-700 bg-gray-100 rounded-md"
                    >
                      {skill.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Industries */}
            {candidate.industries && candidate.industries.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h2 className="text-[15px] font-medium text-gray-900 mb-3">Industries</h2>
                <div className="flex flex-wrap gap-2">
                  {candidate.industries.map((industry) => (
                    <span
                      key={industry.id}
                      className="px-3 py-1.5 text-[13px] text-gray-700 bg-gray-100 rounded-md"
                    >
                      {industry.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Experience */}
            {isFull && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-[15px] font-medium text-gray-900 mb-4 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-gray-400" />
                Experience
              </h2>
              {!candidate.experiences || candidate.experiences.length === 0 ? (
                <p className="text-[14px] text-gray-500 italic">No experience listed</p>
              ) : (
                <div className="space-y-6">
                  {candidate.experiences.map((exp) => (
                    <div key={exp.id} className="border-l-2 border-gray-200 pl-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="text-[15px] font-medium text-gray-900">{exp.job_title}</h3>
                          <p className="text-[14px] text-gray-600 flex items-center gap-1.5 mt-0.5">
                            <Building2 className="w-4 h-4 text-gray-400" />
                            {exp.company_name}
                            {exp.company_size && (
                              <span className="text-gray-400">• {exp.company_size} employees</span>
                            )}
                          </p>
                          {exp.industry && (
                            <p className="text-[13px] text-gray-500 mt-0.5">
                              Industry: {exp.industry.name}
                            </p>
                          )}
                        </div>
                        <span className="text-[13px] text-gray-500 whitespace-nowrap">
                          {formatDateRange(exp.start_date, exp.end_date, exp.is_current)}
                        </span>
                      </div>
                      {exp.description && (
                        <p className="text-[14px] text-gray-600 mt-3 leading-relaxed whitespace-pre-wrap">
                          {exp.description}
                        </p>
                      )}
                      {exp.achievements && (
                        <div className="mt-2">
                          <p className="text-[13px] font-medium text-gray-700">Key Achievements:</p>
                          <p className="text-[14px] text-gray-600 whitespace-pre-wrap">{exp.achievements}</p>
                        </div>
                      )}
                      {/* Technologies */}
                      {exp.technologies && exp.technologies.length > 0 && (
                        <div className="mt-3">
                          <p className="text-[12px] font-medium text-gray-500 mb-1.5">Technologies</p>
                          <div className="flex flex-wrap gap-1.5">
                            {exp.technologies.map((tech) => (
                              <span
                                key={tech.id}
                                className="px-2 py-0.5 text-[12px] bg-blue-50 text-blue-700 rounded"
                              >
                                {tech.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* Skills */}
                      {exp.skills && exp.skills.length > 0 && (
                        <div className="mt-2">
                          <p className="text-[12px] font-medium text-gray-500 mb-1.5">Skills</p>
                          <div className="flex flex-wrap gap-1.5">
                            {exp.skills.map((skill) => (
                              <span
                                key={skill.id}
                                className="px-2 py-0.5 text-[12px] bg-gray-100 text-gray-700 rounded"
                              >
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
              <h2 className="text-[15px] font-medium text-gray-900 mb-4 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-gray-400" />
                Education
              </h2>
              {!candidate.education || candidate.education.length === 0 ? (
                <p className="text-[14px] text-gray-500 italic">No education listed</p>
              ) : (
                <div className="space-y-6">
                  {candidate.education.map((edu) => (
                    <div key={edu.id} className="border-l-2 border-gray-200 pl-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="text-[15px] font-medium text-gray-900">{edu.degree}</h3>
                          <p className="text-[14px] text-gray-600">{edu.field_of_study}</p>
                          <p className="text-[14px] text-gray-500">{edu.institution}</p>
                        </div>
                        <span className="text-[13px] text-gray-500 whitespace-nowrap">
                          {formatDateRange(edu.start_date, edu.end_date, edu.is_current)}
                        </span>
                      </div>
                      {edu.grade && (
                        <p className="text-[13px] text-gray-500 mt-1">Grade: {edu.grade}</p>
                      )}
                      {edu.description && (
                        <p className="text-[14px] text-gray-600 mt-2 whitespace-pre-wrap">{edu.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            )}

            {/* Portfolio - Only for full profiles */}
            {isFull && candidate.portfolio_links && candidate.portfolio_links.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h2 className="text-[15px] font-medium text-gray-900 mb-3">Portfolio</h2>
                <div className="space-y-3">
                  {candidate.portfolio_links.map((link, index) => (
                    <a
                      key={index}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-3 border border-gray-200 rounded-md hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                          <polyline points="15 3 21 3 21 9" />
                          <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
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

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Info - Only for full profiles */}
            {isFull && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h2 className="text-[15px] font-medium text-gray-900 mb-4">Contact Info</h2>
                <div className="space-y-3">
                  <div>
                    <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Email</p>
                    <p className="text-[14px] text-gray-900 mt-0.5">{candidate.email}</p>
                  </div>
                  {candidate.phone && (
                    <div>
                      <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Phone</p>
                      <p className="text-[14px] text-gray-900 mt-0.5">{candidate.phone}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Profile Completeness */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-[15px] font-medium text-gray-900 mb-3">Profile Strength</h2>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gray-900 rounded-full"
                    style={{ width: `${candidate.profile_completeness}%` }}
                  />
                </div>
                <span className="text-[13px] font-medium text-gray-700">
                  {candidate.profile_completeness}%
                </span>
              </div>
            </div>

            {/* CTA for unauthenticated users */}
            {!isFull && (
              <div className="bg-gray-900 rounded-lg p-6 text-center">
                <p className="text-[14px] text-white mb-3">
                  Sign in to view full profile and contact this candidate
                </p>
                <Link
                  to="/login"
                  className="inline-block px-5 py-2 text-[14px] font-medium text-gray-900 bg-white rounded-md hover:bg-gray-100 transition-colors"
                >
                  Sign in
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
