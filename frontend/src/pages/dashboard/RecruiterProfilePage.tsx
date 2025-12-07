import { useState, useEffect } from 'react'
import { useRecruiterProfile, useIndustries, useCountries, useCities } from '@/hooks'
import type { RecruiterProfileUpdate, Industry } from '@/types'

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

export default function RecruiterProfilePage() {
  const { profile, isLoading, error, updateProfile, isUpdating } = useRecruiterProfile()
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
    }
  }, [profile])

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
      await updateProfile(formData)
      setHasChanges(false)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch {
      setSaveError('Failed to save profile. Please try again.')
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-xl">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-xl">
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-[13px] text-red-700">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-xl">
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

      {/* Professional Information */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-4">
        <h2 className="text-[16px] font-medium text-gray-900 mb-4">Professional Information</h2>
        <div className="space-y-5">
          {/* Professional Title */}
          <div>
            <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
              Professional Title
            </label>
            <input
              type="text"
              name="professional_title"
              value={formData.professional_title}
              onChange={handleChange}
              placeholder="e.g., Senior Technical Recruiter"
              className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          </div>

          {/* Bio */}
          <div>
            <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
              Bio
            </label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              rows={4}
              placeholder="Tell candidates about yourself and your recruiting experience..."
              className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
            />
          </div>

          {/* Years of Experience & LinkedIn */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
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
                className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                LinkedIn URL
              </label>
              <input
                type="url"
                name="linkedin_url"
                value={formData.linkedin_url}
                onChange={handleChange}
                placeholder="https://linkedin.com/in/..."
                className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Location */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-4">
        <h2 className="text-[16px] font-medium text-gray-900 mb-4">Location</h2>
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                Country
              </label>
              <select
                name="country_id"
                value={formData.country_id ?? ''}
                onChange={handleChange}
                className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
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
              <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                City
              </label>
              <select
                name="city_id"
                value={formData.city_id ?? ''}
                onChange={handleChange}
                disabled={!formData.country_id}
                className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
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
            <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
              Timezone
            </label>
            <select
              name="timezone"
              value={formData.timezone}
              onChange={handleChange}
              className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
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
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-4">
        <h2 className="text-[16px] font-medium text-gray-900 mb-2">Industry Specializations</h2>
        <p className="text-[13px] text-gray-500 mb-4">
          Select the industries you specialize in recruiting for
        </p>
        <div className="flex flex-wrap gap-2">
          {allIndustries.map((industry: Industry) => (
            <button
              key={industry.id}
              type="button"
              onClick={() => handleIndustryToggle(industry.id)}
              className={`px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors ${
                formData.industry_ids?.includes(industry.id)
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {industry.name}
            </button>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <button
          onClick={handleSave}
          disabled={!hasChanges || isUpdating}
          className="px-5 py-2 text-[14px] font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isUpdating ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
