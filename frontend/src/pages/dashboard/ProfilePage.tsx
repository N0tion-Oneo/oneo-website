import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useMyProfile, useCandidate, useCountries, useCities, useCandidateSuggestions } from '@/hooks'
import { IndustryMultiSelect, AssignedToSelect } from '@/components/forms'
import { ExperienceEditor } from '@/components/experience'
import { EducationEditor } from '@/components/education'
import { ResumeImportButton, ResumePreviewModal } from '@/components/resume'
import { SuggestionsSidebar } from '@/components/suggestions'
import { importResume, type ResumeImportResult } from '@/services/api'
import type { Industry, PortfolioLink, CandidateProfile as CandidateProfileType, ParsedResumeData, ProfileSuggestion, AssignedUser } from '@/types'
import { Seniority, WorkPreference, Currency, ProfileVisibility, UserRole } from '@/types'

type Tab = 'basic' | 'professional' | 'experience' | 'education' | 'preferences' | 'portfolio'

// ============================================================================
// Basic User Profile (for non-candidates: clients, admins, recruiters)
// ============================================================================

function BasicUserProfile() {
  const { user, updateUserProfile } = useAuth()
  const [isUpdating, setIsUpdating] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
  })

  // Populate form when user loads
  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        phone: user.phone || '',
      })
    }
  }, [user])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSave = async () => {
    setSaveError(null)
    setSaveSuccess(false)
    setIsUpdating(true)
    try {
      await updateUserProfile({
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone || undefined,
      })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch {
      setSaveError('Failed to save profile. Please try again.')
    } finally {
      setIsUpdating(false)
    }
  }

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case UserRole.CLIENT:
        return 'Client'
      case UserRole.ADMIN:
        return 'Administrator'
      case UserRole.RECRUITER:
        return 'Recruiter'
      default:
        return role
    }
  }

  return (
    <div className="max-w-xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[22px] font-semibold text-gray-900">My Profile</h1>
        <p className="text-[14px] text-gray-500 mt-1">
          Update your personal information
        </p>
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

      {/* Form */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="space-y-5">
          {/* Email (read-only) */}
          <div>
            <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
            />
            <p className="text-[12px] text-gray-400 mt-1">Email cannot be changed</p>
          </div>

          {/* Role (read-only) */}
          <div>
            <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
              Role
            </label>
            <input
              type="text"
              value={user?.role ? getRoleLabel(user.role) : ''}
              disabled
              className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
            />
          </div>

          {/* Name fields */}
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

          {/* Phone */}
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

          {/* Save Button */}
          <div className="pt-4 border-t border-gray-100">
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
    </div>
  )
}

// ============================================================================
// Candidate Profile (full profile editor)
// ============================================================================

interface CandidateProfileProps {
  candidateSlug?: string
  onBack?: () => void
}

export function CandidateProfile({ candidateSlug, onBack }: CandidateProfileProps) {
  // Use different hooks based on whether we're editing our own profile or another candidate's
  const myProfile = useMyProfile()
  const adminProfile = useCandidate(candidateSlug || '')

  // Suggestions hook (only for non-admin candidate mode)
  const {
    suggestions,
    isLoading: suggestionsLoading,
    resolveSuggestion,
    declineSuggestion,
    isUpdating: suggestionsUpdating,
    pendingCount: suggestionsPendingCount,
  } = useCandidateSuggestions()

  // Select the appropriate data source
  const isAdminMode = !!candidateSlug
  const {
    profile,
    isLoading,
    error,
    updateProfile,
    isUpdating,
  } = isAdminMode
    ? {
        profile: adminProfile.candidate as CandidateProfileType | null,
        isLoading: adminProfile.isLoading,
        error: adminProfile.error,
        updateProfile: adminProfile.updateCandidate,
        isUpdating: adminProfile.isUpdating,
      }
    : {
        profile: myProfile.profile,
        isLoading: myProfile.isLoading,
        error: myProfile.error,
        updateProfile: myProfile.updateProfile,
        isUpdating: myProfile.isUpdating,
      }

  // Location data
  const { countries } = useCountries()
  const [selectedCountryId, setSelectedCountryId] = useState<number | null>(null)
  const { cities } = useCities({ countryId: selectedCountryId || undefined })

  const [activeTab, setActiveTab] = useState<Tab>('basic')
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [highlightedFieldId, setHighlightedFieldId] = useState<string | null>(null)

  // Map suggestion field to the correct tab
  const getTabForSuggestion = useCallback((suggestion: ProfileSuggestion): Tab => {
    // Experience and education have their own tabs
    if (suggestion.field_type === 'experience') return 'experience'
    if (suggestion.field_type === 'education') return 'education'

    // Profile fields are spread across tabs
    const fieldName = suggestion.field_name
    const basicFields = ['professional_title', 'headline', 'city', 'country']
    const professionalFields = ['professional_summary', 'seniority']
    const preferencesFields = ['work_preference']

    if (basicFields.includes(fieldName)) return 'basic'
    if (professionalFields.includes(fieldName)) return 'professional'
    if (preferencesFields.includes(fieldName)) return 'preferences'

    // Default to basic
    return 'basic'
  }, [])

  // Get element ID for a suggestion field
  const getFieldElementId = useCallback((suggestion: ProfileSuggestion): string => {
    if (suggestion.field_type === 'experience' && suggestion.related_object_id) {
      return `experience-${suggestion.related_object_id}`
    }
    if (suggestion.field_type === 'education' && suggestion.related_object_id) {
      return `education-${suggestion.related_object_id}`
    }
    return `field-${suggestion.field_name}`
  }, [])

  // Handle suggestion navigation - switch tab, scroll to field, and highlight
  const handleSuggestionNavigate = useCallback((suggestion: ProfileSuggestion) => {
    const targetTab = getTabForSuggestion(suggestion)
    const fieldId = getFieldElementId(suggestion)

    setActiveTab(targetTab)

    // Wait for tab content to render, then scroll and highlight
    setTimeout(() => {
      const element = document.getElementById(fieldId)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })

        // Set state for profile fields
        setHighlightedFieldId(fieldId)

        // Also add classes directly to DOM for experience/education entries
        element.classList.add('ring-2', 'ring-amber-400', 'ring-offset-2', 'bg-amber-50', 'animate-pulse')

        // Remove highlight after animation
        setTimeout(() => {
          setHighlightedFieldId(null)
          element.classList.remove('ring-2', 'ring-amber-400', 'ring-offset-2', 'bg-amber-50', 'animate-pulse')
        }, 2000)
      }
    }, 100)
  }, [getTabForSuggestion, getFieldElementId])

  // Get highlight class for a field
  const getHighlightClass = (fieldId: string) => {
    if (highlightedFieldId === fieldId) {
      return 'ring-2 ring-amber-400 ring-offset-2 bg-amber-50 animate-pulse'
    }
    return ''
  }

  // Resume import state
  const [showResumePreview, setShowResumePreview] = useState(false)
  const [parsedResumeData, setParsedResumeData] = useState<ParsedResumeData | null>(null)
  const [isImportingResume, setIsImportingResume] = useState(false)
  const [resumeImportError, setResumeImportError] = useState<string | null>(null)

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
    industries: [] as Industry[],
    // Location & Preferences
    city_id: null as number | null,
    country_id: null as number | null,
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

  // Assigned staff state (separate from form - updates independently)
  const [assignedTo, setAssignedTo] = useState<AssignedUser[]>([])

  // Populate assigned_to from profile
  useEffect(() => {
    if (profile?.assigned_to) {
      setAssignedTo(profile.assigned_to)
    }
  }, [profile?.assigned_to])

  // Handle assigned_to changes (save immediately)
  const handleAssignedToChange = async (newAssigned: AssignedUser[]) => {
    setAssignedTo(newAssigned)
    try {
      await updateProfile({
        assigned_to_ids: newAssigned.map(u => u.id),
      })
    } catch (err) {
      console.error('Failed to update assigned_to:', err)
      // Revert on error
      if (profile?.assigned_to) {
        setAssignedTo(profile.assigned_to)
      }
    }
  }

  // Populate form when profile loads
  useEffect(() => {
    if (profile) {
      // Set location IDs from FK relationships
      const countryId = profile.country_rel?.id || null
      const cityId = profile.city_rel?.id || null

      if (countryId) {
        setSelectedCountryId(countryId)
      }

      setFormData({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        phone: profile.phone || '',
        professional_title: profile.professional_title || '',
        headline: profile.headline || '',
        seniority: profile.seniority || '',
        professional_summary: profile.professional_summary || '',
        industries: profile.industries || [],
        city_id: cityId,
        country_id: countryId,
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
        city_id: formData.city_id,
        country_id: formData.country_id,
        work_preference: formData.work_preference || undefined,
        willing_to_relocate: formData.willing_to_relocate,
        preferred_locations: formData.preferred_locations,
        salary_expectation_min: formData.salary_expectation_min,
        salary_expectation_max: formData.salary_expectation_max,
        salary_currency: formData.salary_currency,
        notice_period_days: formData.notice_period_days,
        portfolio_links: formData.portfolio_links,
        visibility: formData.visibility,
        industry_ids: formData.industries.map((i) => parseInt(i.id as string)),
      })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch {
      setSaveError('Failed to save profile. Please try again.')
    }
  }

  const handleResumeImportComplete = (data: ParsedResumeData) => {
    setParsedResumeData(data)
    setShowResumePreview(true)
    setResumeImportError(null)
  }

  const handleResumeImportError = (error: string) => {
    setResumeImportError(error)
    setTimeout(() => setResumeImportError(null), 5000)
  }

  const handleResumeConfirm = async (data: ParsedResumeData) => {
    setIsImportingResume(true)
    try {
      // Call the import endpoint which handles everything
      const result: ResumeImportResult = await importResume(data)

      // Close modal
      setShowResumePreview(false)
      setParsedResumeData(null)

      // Show success with details
      const { results } = result
      const summary = [
        results.experiences_created > 0 && `${results.experiences_created} experiences`,
        results.education_created > 0 && `${results.education_created} education entries`,
      ].filter(Boolean).join(', ')

      setSaveSuccess(true)
      setSaveError(null)

      // Log unmatched items for debugging
      if (results.technologies_unmatched.length > 0) {
        console.log('Unmatched technologies:', results.technologies_unmatched)
      }
      if (results.skills_unmatched.length > 0) {
        console.log('Unmatched skills:', results.skills_unmatched)
      }

      setTimeout(() => setSaveSuccess(false), 5000)

      // Refresh the profile data to show new experiences/education
      window.location.reload()
    } catch {
      setSaveError('Failed to import resume data. Please try again.')
    } finally {
      setIsImportingResume(false)
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
    <div>
      {/* Back Link (admin mode only) */}
      {isAdminMode && onBack && (
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-[13px] text-gray-500 hover:text-gray-900 mb-4"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to Candidates
        </button>
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[22px] font-semibold text-gray-900">
          {isAdminMode ? 'Edit Candidate Profile' : 'My Profile'}
        </h1>
        <p className="text-[14px] text-gray-500 mt-1">
          {isAdminMode
            ? `Editing profile for ${profile?.first_name} ${profile?.last_name} (${profile?.email})`
            : 'Complete your profile to increase visibility to recruiters'}
        </p>
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

      {/* Two Column Layout */}
      <div className="flex gap-6">
        {/* Main Content */}
        <div className="flex-1 min-w-0">
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

              <div id="field-professional_title" className={`rounded-md ${getHighlightClass('field-professional_title')}`}>
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

              <div id="field-headline" className={`rounded-md ${getHighlightClass('field-headline')}`}>
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

              <div className="grid grid-cols-2 gap-4">
                <div id="field-country" className={`rounded-md ${getHighlightClass('field-country')}`}>
                  <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                    Country
                  </label>
                  <select
                    value={formData.country_id || ''}
                    onChange={(e) => {
                      const countryId = e.target.value ? parseInt(e.target.value) : null
                      setSelectedCountryId(countryId)
                      setFormData((prev) => ({
                        ...prev,
                        country_id: countryId,
                        city_id: null, // Reset city when country changes
                      }))
                    }}
                    className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  >
                    <option value="">Select a country</option>
                    {countries.map((country) => (
                      <option key={country.id} value={country.id}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div id="field-city" className={`rounded-md ${getHighlightClass('field-city')}`}>
                  <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                    City
                  </label>
                  <select
                    value={formData.city_id || ''}
                    onChange={(e) => {
                      const cityId = e.target.value ? parseInt(e.target.value) : null
                      setFormData((prev) => ({ ...prev, city_id: cityId }))
                    }}
                    disabled={!formData.country_id}
                    className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
                  >
                    <option value="">
                      {formData.country_id ? 'Select a city' : 'Select country first'}
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
                <div id="field-seniority" className={`rounded-md ${getHighlightClass('field-seniority')}`}>
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
                    type="text"
                    value={profile?.years_of_experience || 'Add work experience to calculate'}
                    disabled
                    className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                  <p className="text-[12px] text-gray-400 mt-1">Calculated from your work history</p>
                </div>
              </div>

              <div id="field-professional_summary" className={`rounded-md ${getHighlightClass('field-professional_summary')}`}>
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

              <IndustryMultiSelect
                selected={formData.industries}
                onChange={(industries) => setFormData((prev) => ({ ...prev, industries }))}
                maxItems={5}
                label="Industries (max 5)"
              />
            </div>
          )}

          {/* Experience Tab */}
          {activeTab === 'experience' && <ExperienceEditor candidateSlug={candidateSlug} />}

          {/* Education Tab */}
          {activeTab === 'education' && <EducationEditor candidateSlug={candidateSlug} />}

          {/* Work Preferences Tab */}
          {activeTab === 'preferences' && (
            <div className="space-y-5">
              <div id="field-work_preference" className={`rounded-md ${getHighlightClass('field-work_preference')}`}>
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
                            if (newLinks[index]) {
                              newLinks[index].title = e.target.value
                              setFormData((prev) => ({ ...prev, portfolio_links: newLinks }))
                            }
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
                            if (newLinks[index]) {
                              newLinks[index].url = e.target.value
                              setFormData((prev) => ({ ...prev, portfolio_links: newLinks }))
                            }
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
                            if (newLinks[index]) {
                              newLinks[index].description = e.target.value
                              setFormData((prev) => ({ ...prev, portfolio_links: newLinks }))
                            }
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

        {/* Right Sidebar - Shows suggestions or normal sidebar */}
        {!isAdminMode && suggestionsPendingCount > 0 ? (
          <SuggestionsSidebar
            suggestions={suggestions}
            profile={profile}
            isLoading={suggestionsLoading}
            onResolve={resolveSuggestion}
            onDecline={declineSuggestion}
            onNavigate={handleSuggestionNavigate}
            isUpdating={suggestionsUpdating}
          />
        ) : (
          <div className="w-72 flex-shrink-0">
            <div className="sticky top-6 space-y-4">
              {/* Resume Import (candidates only, not admin mode) */}
              {!isAdminMode && (
                <div className="p-4 bg-white border border-gray-200 rounded-lg">
                  <h3 className="text-[13px] font-medium text-gray-700 mb-2">Quick Import</h3>
                  <p className="text-[12px] text-gray-500 mb-3">
                    Upload your resume to auto-fill your profile
                  </p>
                  <ResumeImportButton
                    onImportComplete={handleResumeImportComplete}
                    onError={handleResumeImportError}
                    className="w-full justify-center"
                  />
                  {resumeImportError && (
                    <p className="mt-2 text-[12px] text-red-600">{resumeImportError}</p>
                  )}
                </div>
              )}

              {/* Assigned To (admin mode only) */}
              {isAdminMode && (
                <div className="p-4 bg-white border border-gray-200 rounded-lg">
                  <AssignedToSelect
                    selected={assignedTo}
                    onChange={handleAssignedToChange}
                    placeholder="Assign recruiters..."
                  />
                </div>
              )}

              {/* Profile Completeness */}
              <div className="p-4 bg-white border border-gray-200 rounded-lg">
                <h3 className="text-[13px] font-medium text-gray-700 mb-3">Profile Completeness</h3>
                <div className="relative">
                  <div className="flex items-center justify-center">
                    <svg className="w-24 h-24 transform -rotate-90">
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        stroke="#f3f4f6"
                        strokeWidth="8"
                        fill="none"
                      />
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        stroke="#111827"
                        strokeWidth="8"
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray={`${(profile?.profile_completeness || 0) * 2.51} 251`}
                      />
                    </svg>
                    <span className="absolute text-[20px] font-semibold text-gray-900">
                      {profile?.profile_completeness || 0}%
                    </span>
                  </div>
                </div>
                <p className="text-[12px] text-gray-500 text-center mt-2">
                  {(profile?.profile_completeness || 0) < 50
                    ? 'Add more details to improve visibility'
                    : (profile?.profile_completeness || 0) < 80
                    ? 'Good progress! Keep going'
                    : 'Great job! Your profile is comprehensive'}
                </p>
              </div>

              {/* Quick Tips */}
              <div className="p-4 bg-white border border-gray-200 rounded-lg">
                <h3 className="text-[13px] font-medium text-gray-700 mb-3">Quick Tips</h3>
                <ul className="space-y-2 text-[12px] text-gray-600">
                  <li className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Add a professional title and headline
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Include at least 3 work experiences
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Select relevant industries
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Set your profile to public when ready
                  </li>
                </ul>
              </div>

              {/* Visibility Status */}
              <div className="p-4 bg-white border border-gray-200 rounded-lg">
                <h3 className="text-[13px] font-medium text-gray-700 mb-2">Profile Status</h3>
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      formData.visibility === 'public_sanitised' ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  />
                  <span className="text-[13px] text-gray-600">
                    {formData.visibility === 'public_sanitised' ? 'Visible in directory' : 'Private'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Resume Preview Modal */}
      {parsedResumeData && (
        <ResumePreviewModal
          data={parsedResumeData}
          isOpen={showResumePreview}
          onClose={() => {
            setShowResumePreview(false)
            setParsedResumeData(null)
          }}
          onConfirm={handleResumeConfirm}
          isImporting={isImportingResume}
        />
      )}
    </div>
  )
}

// ============================================================================
// Main Profile Page - Routes to correct profile based on user role
// ============================================================================

export default function ProfilePage() {
  const { user } = useAuth()
  const isCandidate = user?.role === UserRole.CANDIDATE

  // Show candidate profile for candidates, basic user profile for everyone else
  if (isCandidate) {
    return <CandidateProfile />
  }

  return <BasicUserProfile />
}
