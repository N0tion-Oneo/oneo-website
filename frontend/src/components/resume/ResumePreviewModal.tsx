import { useState } from 'react'
import { X, Check, Briefcase, GraduationCap, User, Code, Star } from 'lucide-react'
import type { ParsedResumeData } from '@/types'

type Tab = 'profile' | 'experience' | 'education' | 'skills'

interface ResumePreviewModalProps {
  data: ParsedResumeData
  isOpen: boolean
  onClose: () => void
  onConfirm: (data: ParsedResumeData) => void
  isImporting?: boolean
}

export function ResumePreviewModal({
  data,
  isOpen,
  onClose,
  onConfirm,
  isImporting = false,
}: ResumePreviewModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('profile')

  if (!isOpen) return null

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    {
      id: 'profile',
      label: 'Profile',
      icon: <User size={16} />,
    },
    {
      id: 'experience',
      label: 'Experience',
      icon: <Briefcase size={16} />,
      count: data.experiences.length,
    },
    {
      id: 'education',
      label: 'Education',
      icon: <GraduationCap size={16} />,
      count: data.education.length,
    },
    {
      id: 'skills',
      label: 'Skills & Tech',
      icon: <Code size={16} />,
      count: data.all_technologies.length + data.all_skills.length,
    },
  ]

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Present'
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 dark:bg-black/70 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-xl dark:shadow-gray-900/50 max-w-3xl w-full max-h-[85vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Resume Import Preview
              </h2>
              <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">
                Review the extracted data before importing
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700 px-6">
            <nav className="flex gap-1 -mb-px">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-[13px] font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-gray-900 dark:border-gray-100 text-gray-900 dark:text-gray-100'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                  {tab.count !== undefined && (
                    <span
                      className={`ml-1 px-1.5 py-0.5 text-[11px] rounded-full ${
                        activeTab === tab.id
                          ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="px-6 py-5 overflow-y-auto max-h-[calc(85vh-220px)]">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                      First Name
                    </label>
                    <p className="text-[14px] text-gray-900 dark:text-gray-100">
                      {data.profile.first_name || '—'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                      Last Name
                    </label>
                    <p className="text-[14px] text-gray-900 dark:text-gray-100">
                      {data.profile.last_name || '—'}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                    Professional Title
                  </label>
                  <p className="text-[14px] text-gray-900 dark:text-gray-100">
                    {data.profile.professional_title || '—'}
                  </p>
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                    Headline
                  </label>
                  <p className="text-[14px] text-gray-900 dark:text-gray-100">
                    {data.profile.headline || '—'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                      City
                    </label>
                    <p className="text-[14px] text-gray-900 dark:text-gray-100">
                      {data.profile.city || '—'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                      Country
                    </label>
                    <p className="text-[14px] text-gray-900 dark:text-gray-100">
                      {data.profile.country || '—'}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                    Professional Summary
                  </label>
                  <p className="text-[14px] text-gray-700 dark:text-gray-300 whitespace-pre-line">
                    {data.profile.professional_summary || '—'}
                  </p>
                </div>
              </div>
            )}

            {/* Experience Tab */}
            {activeTab === 'experience' && (
              <div className="space-y-4">
                {data.experiences.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No experience data extracted
                  </div>
                ) : (
                  data.experiences.map((exp, index) => (
                    <div
                      key={index}
                      className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-[14px] font-medium text-gray-900 dark:text-gray-100">
                            {exp.job_title}
                          </h3>
                          <p className="text-[13px] text-gray-600 dark:text-gray-400">
                            {exp.company_name}
                          </p>
                        </div>
                        <span className="text-[12px] text-gray-500 dark:text-gray-400">
                          {formatDate(exp.start_date)} — {exp.is_current ? 'Present' : formatDate(exp.end_date)}
                        </span>
                      </div>

                      {exp.description && (
                        <p className="text-[13px] text-gray-600 dark:text-gray-400 mb-3 whitespace-pre-line">
                          {exp.description}
                        </p>
                      )}

                      {exp.technologies.length > 0 && (
                        <div className="mb-2">
                          <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            Technologies:
                          </span>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {exp.technologies.map((tech, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 text-[11px] bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded"
                              >
                                {tech}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {exp.skills.length > 0 && (
                        <div>
                          <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            Skills:
                          </span>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {exp.skills.map((skill, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 text-[11px] bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Education Tab */}
            {activeTab === 'education' && (
              <div className="space-y-4">
                {data.education.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No education data extracted
                  </div>
                ) : (
                  data.education.map((edu, index) => (
                    <div
                      key={index}
                      className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                    >
                      <div className="flex items-start justify-between mb-1">
                        <div>
                          <h3 className="text-[14px] font-medium text-gray-900 dark:text-gray-100">
                            {edu.degree}
                            {edu.field_of_study && ` in ${edu.field_of_study}`}
                          </h3>
                          <p className="text-[13px] text-gray-600 dark:text-gray-400">
                            {edu.institution}
                          </p>
                        </div>
                        <span className="text-[12px] text-gray-500 dark:text-gray-400">
                          {edu.start_date ? formatDate(edu.start_date) : ''}
                          {edu.start_date && ' — '}
                          {edu.is_current ? 'Present' : formatDate(edu.end_date)}
                        </span>
                      </div>
                      {edu.grade && (
                        <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">
                          Grade: {edu.grade}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Skills & Tech Tab */}
            {activeTab === 'skills' && (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Code size={16} className="text-blue-600 dark:text-blue-400" />
                    <h3 className="text-[13px] font-medium text-gray-900 dark:text-gray-100">
                      Technologies ({data.all_technologies.length})
                    </h3>
                  </div>
                  {data.all_technologies.length === 0 ? (
                    <p className="text-[13px] text-gray-500 dark:text-gray-400">No technologies extracted</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {data.all_technologies.map((tech, index) => (
                        <span
                          key={index}
                          className="px-3 py-1.5 text-[13px] bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md border border-blue-100 dark:border-blue-800"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Star size={16} className="text-purple-600 dark:text-purple-400" />
                    <h3 className="text-[13px] font-medium text-gray-900 dark:text-gray-100">
                      Skills ({data.all_skills.length})
                    </h3>
                  </div>
                  {data.all_skills.length === 0 ? (
                    <p className="text-[13px] text-gray-500 dark:text-gray-400">No skills extracted</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {data.all_skills.map((skill, index) => (
                        <span
                          key={index}
                          className="px-3 py-1.5 text-[13px] bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-md border border-purple-100 dark:border-purple-800"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <p className="text-[12px] text-gray-500 dark:text-gray-400">
              You can edit these details after importing
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isImporting}
                className="px-4 py-2 text-[13px] font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => onConfirm(data)}
                disabled={isImporting}
                className="inline-flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-gray-900 dark:bg-gray-100 dark:text-gray-900 rounded-md hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 transition-colors"
              >
                {isImporting ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Importing...
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    Import to Profile
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
