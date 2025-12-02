import { useState, useEffect } from 'react'
import { useMyProfile } from '@/hooks'
import { SkillMultiSelect, IndustryMultiSelect } from '@/components/forms'
import { ExperienceEditor } from '@/components/experience'
import { EducationEditor } from '@/components/education'
import type { Skill, Industry, PortfolioLink } from '@/types'
import { Seniority, WorkPreference, Currency, ProfileVisibility } from '@/types'

type Tab = 'basic' | 'professional' | 'experience' | 'education' | 'preferences' | 'portfolio'

export default function ProfilePage() {
  const { profile, isLoading, error, updateProfile, isUpdating } = useMyProfile()
  const [activeTab, setActiveTab] = useState<Tab>('basic')
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    // Basic Info
    first_name: '',
    last_name: '',
    phone: '',
    professional_title: '',
    headline: '',
    // Professional
    seniority: '' as Seniority | '',
    professional_summary: '',
    years_of_experience: null as number | null,
    skills: [] as Skill[],
    industries: [] as Industry[],
    // Location & Preferences
    city: '',
    country: '',
    region: '',
    work_preference: '' as WorkPreference | '',
    willing_to_relocate: false,
    preferred_locations: [] as string[],
    // Compensation
    salary_expectation_min: null as number | null,
    salary_expectation_max: null as number | null,
    salary_currency: 'ZAR' as Currency,
    notice_period_days: null as number | null,
    // Portfolio
    portfolio_links: [] as PortfolioLink[],
    // Visibility
    visibility: 'private' as ProfileVisibility,
  })

  // Populate form when profile loads
  useEffect(() => {
    if (profile) {
      setFormData({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        phone: profile.phone || '',
        professional_title: profile.professional_title || '',
        headline: profile.headline || '',
        seniority: profile.seniority || '',
        professional_summary: profile.professional_summary || '',
        years_of_experience: profile.years_of_experience,
        skills: profile.skills || [],
        industries: profile.industries || [],
        city: profile.city || '',
        country: profile.country || '',
        region: profile.region || '',
        work_preference: profile.work_preference || '',
        willing_to_relocate: profile.willing_to_relocate || false,
        preferred_locations: profile.preferred_locations || [],
        salary_expectation_min: profile.salary_expectation_min,
        salary_expectation_max: profile.salary_expectation_max,
        salary_currency: profile.salary_currency || 'ZAR',
        notice_period_days: profile.notice_period_days,
        portfolio_links: profile.portfolio_links || [],
        visibility: profile.visibility || 'private',
      })
    }
  }, [profile])

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }))
  }

  const handleNumberChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value === '' ? null : parseInt(value, 10),
    }))
  }

  const handleSave = async () => {
    setSaveError(null)
    setSaveSuccess(false)
    try {
      await updateProfile({
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone || undefined,
        professional_title: formData.professional_title,
        headline: formData.headline,
        seniority: formData.seniority || undefined,
        professional_summary: formData.professional_summary,
        years_of_experience: formData.years_of_experience,
        city: formData.city,
        country: formData.country,
        region: formData.region,
        work_preference: formData.work_preference || undefined,
        willing_to_relocate: formData.willing_to_relocate,
        preferred_locations: formData.preferred_locations,
        salary_expectation_min: formData.salary_expectation_min,
        salary_expectation_max: formData.salary_expectation_max,
        salary_currency: formData.salary_currency,
        notice_period_days: formData.notice_period_days,
        portfolio_links: formData.portfolio_links,
        visibility: formData.visibility,
        skill_ids: formData.skills.map((s) => parseInt(s.id as string)),
        industry_ids: formData.industries.map((i) => parseInt(i.id as string)),
      })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch {
      setSaveError('Failed to save profile. Please try again.')
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'basic', label: 'Basic Info' },
    { id: 'professional', label: 'Professional' },
    { id: 'experience', label: 'Experience' },
    { id: 'education', label: 'Education' },
    { id: 'preferences', label: 'Preferences' },
    { id: 'portfolio', label: 'Portfolio' },
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[14px] text-gray-500">Loading profile...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[14px] text-red-500">{error}</div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[22px] font-semibold text-gray-900">My Profile</h1>
        <p className="text-[14px] text-gray-500 mt-1">
          Complete your profile to increase visibility to recruiters
        </p>
      </div>

      {/* Profile Completeness */}
      <div className="mb-6 p-4 bg-white border border-gray-200 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[13px] font-medium text-gray-700">Profile Completeness</span>
          <span className="text-[13px] font-medium text-gray-900">
            {profile?.profile_completeness || 0}%
          </span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gray-900 rounded-full transition-all duration-300"
            style={{ width: `${profile?.profile_completeness || 0}%` }}
          />
        </div>
      </div>

      {/* Success/Error Messages */}
      {saveSuccess && (
        <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-[13px] text-green-700">Profile saved successfully</p>
        </div>
      )}
      {saveError && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-[13px] text-red-700">{saveError}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                    First Name *
                  </label>
                  <input
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                  Phone
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="+27 12 345 6789"
                  className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                  Professional Title *
                </label>
                <input
                  type="text"
                  name="professional_title"
                  value={formData.professional_title}
                  onChange={handleInputChange}
                  placeholder="e.g. Senior Software Engineer"
                  className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                  Headline
                </label>
                <input
                  type="text"
                  name="headline"
                  value={formData.headline}
                  onChange={handleInputChange}
                  placeholder="A brief tagline about yourself"
                  className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                    City
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    placeholder="Cape Town"
                    className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                    Region
                  </label>
                  <input
                    type="text"
                    name="region"
                    value={formData.region}
                    onChange={handleInputChange}
                    placeholder="Western Cape"
                    className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                    Country
                  </label>
                  <input
                    type="text"
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                    placeholder="South Africa"
                    className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                  Profile Visibility
                </label>
                <select
                  name="visibility"
                  value={formData.visibility}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                >
                  <option value="private">Private - Only visible to you</option>
                  <option value="public_sanitised">
                    Public - Visible in directory (name hidden)
                  </option>
                </select>
              </div>
            </div>
          )}

          {/* Professional Tab */}
          {activeTab === 'professional' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                    Seniority Level
                  </label>
                  <select
                    name="seniority"
                    value={formData.seniority}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  >
                    <option value="">Select level</option>
                    <option value={Seniority.INTERN}>Intern</option>
                    <option value={Seniority.JUNIOR}>Junior</option>
                    <option value={Seniority.MID}>Mid-Level</option>
                    <option value={Seniority.SENIOR}>Senior</option>
                    <option value={Seniority.LEAD}>Lead</option>
                    <option value={Seniority.PRINCIPAL}>Principal</option>
                    <option value={Seniority.EXECUTIVE}>Executive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                    Years of Experience
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={formData.years_of_experience ?? ''}
                    onChange={(e) => handleNumberChange('years_of_experience', e.target.value)}
                    className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                  Professional Summary
                </label>
                <textarea
                  name="professional_summary"
                  value={formData.professional_summary}
                  onChange={handleInputChange}
                  rows={5}
                  placeholder="Tell us about your experience, skills, and career goals..."
                  className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
                />
              </div>

              <SkillMultiSelect
                selected={formData.skills}
                onChange={(skills) => setFormData((prev) => ({ ...prev, skills }))}
                maxItems={15}
                label="Skills (max 15)"
              />

              <IndustryMultiSelect
                selected={formData.industries}
                onChange={(industries) => setFormData((prev) => ({ ...prev, industries }))}
                maxItems={5}
                label="Industries (max 5)"
              />
            </div>
          )}

          {/* Experience Tab */}
          {activeTab === 'experience' && <ExperienceEditor />}

          {/* Education Tab */}
          {activeTab === 'education' && <EducationEditor />}

          {/* Work Preferences Tab */}
          {activeTab === 'preferences' && (
            <div className="space-y-5">
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                  Work Preference
                </label>
                <select
                  name="work_preference"
                  value={formData.work_preference}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                >
                  <option value="">Select preference</option>
                  <option value={WorkPreference.REMOTE}>Remote</option>
                  <option value={WorkPreference.HYBRID}>Hybrid</option>
                  <option value={WorkPreference.ONSITE}>On-site</option>
                  <option value={WorkPreference.FLEXIBLE}>Flexible</option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="willing_to_relocate"
                  name="willing_to_relocate"
                  checked={formData.willing_to_relocate}
                  onChange={handleInputChange}
                  className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                />
                <label htmlFor="willing_to_relocate" className="text-[14px] text-gray-700">
                  I am willing to relocate for the right opportunity
                </label>
              </div>

              <div className="border-t border-gray-100 pt-5">
                <h3 className="text-[14px] font-medium text-gray-900 mb-4">
                  Salary Expectations
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                      Currency
                    </label>
                    <select
                      name="salary_currency"
                      value={formData.salary_currency}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    >
                      <option value={Currency.ZAR}>ZAR</option>
                      <option value={Currency.USD}>USD</option>
                      <option value={Currency.EUR}>EUR</option>
                      <option value={Currency.GBP}>GBP</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                      Minimum (Annual)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.salary_expectation_min ?? ''}
                      onChange={(e) => handleNumberChange('salary_expectation_min', e.target.value)}
                      className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                      Maximum (Annual)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.salary_expectation_max ?? ''}
                      onChange={(e) => handleNumberChange('salary_expectation_max', e.target.value)}
                      className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                  Notice Period (Days)
                </label>
                <input
                  type="number"
                  min="0"
                  max="180"
                  value={formData.notice_period_days ?? ''}
                  onChange={(e) => handleNumberChange('notice_period_days', e.target.value)}
                  placeholder="e.g. 30"
                  className="w-full max-w-[200px] px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* Portfolio Tab */}
          {activeTab === 'portfolio' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[14px] font-medium text-gray-900">Portfolio Links</h3>
                  <p className="text-[13px] text-gray-500">Add links to your work</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFormData((prev) => ({
                      ...prev,
                      portfolio_links: [
                        ...prev.portfolio_links,
                        { url: '', title: '', description: '' },
                      ],
                    }))
                  }}
                  className="px-3 py-1.5 text-[13px] font-medium text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Add Link
                </button>
              </div>

              {formData.portfolio_links.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-gray-200 rounded-lg">
                  <p className="text-[14px] text-gray-500">No portfolio links added yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.portfolio_links.map((link, index) => (
                    <div
                      key={index}
                      className="p-4 border border-gray-200 rounded-lg space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <span className="text-[12px] font-medium text-gray-400">
                          Link {index + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({
                              ...prev,
                              portfolio_links: prev.portfolio_links.filter((_, i) => i !== index),
                            }))
                          }}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          >
                            <path
                              d="M18 6L6 18M6 6l12 12"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                      </div>
                      <div>
                        <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                          Title
                        </label>
                        <input
                          type="text"
                          value={link.title}
                          onChange={(e) => {
                            const newLinks = [...formData.portfolio_links]
                            newLinks[index].title = e.target.value
                            setFormData((prev) => ({ ...prev, portfolio_links: newLinks }))
                          }}
                          placeholder="e.g. GitHub Profile"
                          className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                          URL
                        </label>
                        <input
                          type="url"
                          value={link.url}
                          onChange={(e) => {
                            const newLinks = [...formData.portfolio_links]
                            newLinks[index].url = e.target.value
                            setFormData((prev) => ({ ...prev, portfolio_links: newLinks }))
                          }}
                          placeholder="https://..."
                          className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                          Description (optional)
                        </label>
                        <input
                          type="text"
                          value={link.description || ''}
                          onChange={(e) => {
                            const newLinks = [...formData.portfolio_links]
                            newLinks[index].description = e.target.value
                            setFormData((prev) => ({ ...prev, portfolio_links: newLinks }))
                          }}
                          placeholder="Brief description"
                          className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-end">
          <button
            onClick={handleSave}
            disabled={isUpdating}
            className="px-5 py-2 text-[14px] font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isUpdating ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
