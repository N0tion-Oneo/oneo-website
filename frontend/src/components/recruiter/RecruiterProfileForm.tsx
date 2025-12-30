/**
 * RecruiterProfileForm Component
 *
 * A reusable form for editing recruiter profiles. Can be used:
 * - In RecruiterProfilePage for users editing their own profile
 * - In a modal for admins editing other staff profiles
 */
import { useState, useEffect } from 'react'
import { useIndustries, useCountries, useCities } from '@/hooks'
import type { RecruiterProfile, RecruiterProfileUpdate, Industry } from '@/types'

// Common timezone options
const TIMEZONE_OPTIONS = [
  { value: 'Africa/Johannesburg', label: 'South Africa (SAST)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
  { value: 'America/New_York', label: 'New York (EST/EDT)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST/PDT)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
]

interface RecruiterProfileFormProps {
  profile: RecruiterProfile | null
  onSave: (data: RecruiterProfileUpdate) => Promise<void>
  isUpdating: boolean
  /** If true, shows compact layout suitable for modals */
  compact?: boolean
  /** Optional callback when form has unsaved changes */
  onDirtyChange?: (isDirty: boolean) => void
}

export default function RecruiterProfileForm({
  profile,
  onSave,
  isUpdating,
  compact = false,
  onDirtyChange,
}: RecruiterProfileFormProps) {
  const { industries: allIndustries } = useIndustries()
  const { countries } = useCountries()

  // Form state
  const [formData, setFormData] = useState<RecruiterProfileUpdate>({
    professional_title: '',
    bio: '',
    linkedin_url: '',
    years_of_experience: null,
    country_id: null,
    city_id: null,
    timezone: 'Africa/Johannesburg',
    industry_ids: [],
  })
  const [hasChanges, setHasChanges] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Fetch cities based on selected country
  const { cities } = useCities({ countryId: formData.country_id ?? undefined })

  // Initialize form data when profile loads
  useEffect(() => {
    if (profile) {
      setFormData({
        professional_title: profile.professional_title || '',
        bio: profile.bio || '',
        linkedin_url: profile.linkedin_url || '',
        years_of_experience: profile.years_of_experience,
        country_id: profile.country?.id ?? null,
        city_id: profile.city?.id ?? null,
        timezone: profile.timezone || 'Africa/Johannesburg',
        industry_ids: profile.industries?.map((i) => i.id) || [],
      })
      setHasChanges(false)
    }
  }, [profile])

  // Notify parent of dirty state changes
  useEffect(() => {
    onDirtyChange?.(hasChanges)
  }, [hasChanges, onDirtyChange])

  // Handle form changes
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    let newValue: string | number | null = value

    if (name === 'years_of_experience') {
      newValue = value ? parseInt(value) : null
    } else if (name === 'country_id') {
      newValue = value ? parseInt(value) : null
      // Reset city when country changes
      setFormData((prev) => ({
        ...prev,
        country_id: newValue as number | null,
        city_id: null,
      }))
      setHasChanges(true)
      setSaveSuccess(false)
      setSaveError(null)
      return
    } else if (name === 'city_id') {
      newValue = value ? parseInt(value) : null
    }

    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
    }))
    setHasChanges(true)
    setSaveSuccess(false)
    setSaveError(null)
  }

  // Handle industry selection
  const handleIndustryToggle = (industryId: number) => {
    setFormData((prev) => ({
      ...prev,
      industry_ids: prev.industry_ids?.includes(industryId)
        ? prev.industry_ids.filter((id) => id !== industryId)
        : [...(prev.industry_ids || []), industryId],
    }))
    setHasChanges(true)
    setSaveSuccess(false)
    setSaveError(null)
  }

  // Handle save
  const handleSave = async () => {
    setSaveError(null)
    setSaveSuccess(false)
    try {
      await onSave(formData)
      setHasChanges(false)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch {
      setSaveError('Failed to save profile. Please try again.')
    }
  }

  const sectionClass = compact
    ? 'space-y-4'
    : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-4'

  const sectionTitleClass = compact
    ? 'text-[13px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3'
    : 'text-[16px] font-medium text-gray-900 dark:text-gray-100 mb-4'

  return (
    <div className={compact ? 'space-y-5' : ''}>
      {/* Success/Error Messages */}
      {saveSuccess && (
        <div className="mb-4 px-4 py-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
          <p className="text-[13px] text-green-700 dark:text-green-400">Profile saved successfully</p>
        </div>
      )}
      {saveError && (
        <div className="mb-4 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-[13px] text-red-700 dark:text-red-400">{saveError}</p>
        </div>
      )}

      {/* Professional Information */}
      <div className={sectionClass}>
        <h2 className={sectionTitleClass}>Professional Information</h2>
        <div className="space-y-4">
          {/* Professional Title */}
          <div>
            <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Professional Title
            </label>
            <input
              type="text"
              name="professional_title"
              value={formData.professional_title}
              onChange={handleChange}
              placeholder="e.g., Senior Technical Recruiter"
              className="w-full px-3 py-2 text-[14px] border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent"
            />
          </div>

          {/* Bio */}
          <div>
            <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Bio
            </label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              rows={compact ? 3 : 4}
              placeholder="Tell candidates about yourself and your recruiting experience..."
              className="w-full px-3 py-2 text-[14px] border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent resize-none"
            />
          </div>

          {/* Years of Experience & LinkedIn */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Years of Experience
              </label>
              <input
                type="number"
                name="years_of_experience"
                value={formData.years_of_experience ?? ''}
                onChange={handleChange}
                min={0}
                max={50}
                placeholder="e.g., 5"
                className="w-full px-3 py-2 text-[14px] border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                LinkedIn URL
              </label>
              <input
                type="url"
                name="linkedin_url"
                value={formData.linkedin_url}
                onChange={handleChange}
                placeholder="https://linkedin.com/in/..."
                className="w-full px-3 py-2 text-[14px] border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Location */}
      <div className={sectionClass}>
        <h2 className={sectionTitleClass}>Location</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Country
              </label>
              <select
                name="country_id"
                value={formData.country_id ?? ''}
                onChange={handleChange}
                className="w-full px-3 py-2 text-[14px] border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent"
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
              <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                City
              </label>
              <select
                name="city_id"
                value={formData.city_id ?? ''}
                onChange={handleChange}
                disabled={!formData.country_id}
                className="w-full px-3 py-2 text-[14px] border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-500"
              >
                <option value="">
                  {formData.country_id ? 'Select city' : 'Select country first'}
                </option>
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Timezone
            </label>
            <select
              name="timezone"
              value={formData.timezone}
              onChange={handleChange}
              className="w-full px-3 py-2 text-[14px] border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent"
            >
              {TIMEZONE_OPTIONS.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Industry Specializations */}
      <div className={sectionClass}>
        <h2 className={sectionTitleClass}>Industry Specializations</h2>
        {!compact && (
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-4">
            Select the industries you specialize in recruiting for
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {allIndustries.map((industry: Industry) => (
            <button
              key={industry.id}
              type="button"
              onClick={() => handleIndustryToggle(industry.id)}
              className={`px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors ${
                formData.industry_ids?.includes(industry.id)
                  ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {industry.name}
            </button>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <div className={compact ? 'pt-2' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6'}>
        <button
          onClick={handleSave}
          disabled={!hasChanges || isUpdating}
          className="px-5 py-2 text-[14px] font-medium text-white bg-gray-900 dark:bg-gray-100 dark:text-gray-900 rounded-md hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isUpdating ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
