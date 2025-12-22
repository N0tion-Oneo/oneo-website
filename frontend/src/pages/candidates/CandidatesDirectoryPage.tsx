import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCandidates, useCompanyCandidates, useCompanyFeatures } from '@/hooks'
import { useAuth } from '@/contexts/AuthContext'
import { Seniority, WorkPreference, UserRole } from '@/types'
import type { CandidateProfileSanitized, CandidateAdminListItem } from '@/types'
import Navbar from '@/components/layout/Navbar'
import { SEO } from '@/components/seo'
import { Lock } from 'lucide-react'

export default function CandidatesDirectoryPage() {
  const { user } = useAuth()
  const { hasFeature, isLoading: featuresLoading } = useCompanyFeatures()

  // Check if user is a client without the Talent Directory feature
  const isClient = user?.role === UserRole.CLIENT
  const isStaff = user?.role === UserRole.ADMIN || user?.role === UserRole.RECRUITER
  const hasTalentDirectory = hasFeature('talent-directory')

  // Clients without the feature should see a locked state
  const isFeatureLocked = isClient && !hasTalentDirectory && !featuresLoading
  const [filters, setFilters] = useState({
    seniority: '',
    work_preference: '',
    search: '',
    page: 1,
  })

  // Use different endpoints based on user role:
  // - Clients use /candidates/company/ which is feature-gated on the backend
  // - Others use the public /candidates/ endpoint
  const publicCandidates = useCandidates({
    seniority: filters.seniority || undefined,
    work_preference: filters.work_preference || undefined,
    search: filters.search || undefined,
    page: filters.page,
  })

  const companyCandidates = useCompanyCandidates({
    seniority: filters.seniority || undefined,
    work_preference: filters.work_preference || undefined,
    search: filters.search || undefined,
    page: filters.page,
  })

  // Select the appropriate data source based on user role
  const { candidates, count, hasNext, hasPrevious, isLoading, error } = isClient
    ? {
        candidates: companyCandidates.candidates as unknown as CandidateProfileSanitized[],
        count: companyCandidates.count,
        hasNext: companyCandidates.hasNext,
        hasPrevious: companyCandidates.hasPrevious,
        isLoading: companyCandidates.isLoading,
        error: companyCandidates.error,
      }
    : publicCandidates

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }))
  }

  const getSeniorityLabel = (seniority: string) => {
    const labels: Record<string, string> = {
      intern: 'Intern',
      junior: 'Junior',
      mid: 'Mid-Level',
      senior: 'Senior',
      lead: 'Lead',
      principal: 'Principal',
      executive: 'Executive / C-Suite',
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

  // Show locked state for clients without the feature
  if (isFeatureLocked) {
    return (
      <div className="min-h-screen bg-gray-50">
        <SEO />
        <Navbar />

        <main className="max-w-5xl mx-auto px-6 py-10">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-[26px] font-semibold text-gray-900">Talent Directory</h1>
            <p className="text-[15px] text-gray-500 mt-1">
              Browse our pool of pre-vetted candidates
            </p>
          </div>

          {/* Locked Feature State */}
          <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-[18px] font-semibold text-gray-900 mb-2">
              Talent Directory Access Required
            </h2>
            <p className="text-[14px] text-gray-500 max-w-md mx-auto mb-6">
              The Talent Directory feature allows you to browse and discover pre-vetted candidates
              from our talent pool. This feature is included in the Retained service plan.
            </p>
            <p className="text-[13px] text-gray-400">
              Contact your account manager to upgrade your plan and unlock this feature.
            </p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SEO />
      <Navbar />

      <main className="max-w-5xl mx-auto px-6 py-10">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-[26px] font-semibold text-gray-900">Talent Directory</h1>
          <p className="text-[15px] text-gray-500 mt-1">
            Browse our pool of pre-vetted candidates
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[12px] font-medium text-gray-500 mb-1.5">Search</label>
              <input
                type="text"
                placeholder="Search by title or skills..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-gray-500 mb-1.5">Seniority</label>
              <select
                value={filters.seniority}
                onChange={(e) => handleFilterChange('seniority', e.target.value)}
                className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              >
                <option value="">All levels</option>
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
              <label className="block text-[12px] font-medium text-gray-500 mb-1.5">Work Preference</label>
              <select
                value={filters.work_preference}
                onChange={(e) => handleFilterChange('work_preference', e.target.value)}
                className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              >
                <option value="">All preferences</option>
                <option value={WorkPreference.REMOTE}>Remote</option>
                <option value={WorkPreference.HYBRID}>Hybrid</option>
                <option value={WorkPreference.ONSITE}>On-site</option>
                <option value={WorkPreference.FLEXIBLE}>Flexible</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setFilters({ seniority: '', work_preference: '', search: '', page: 1 })}
                className="w-full px-4 py-2 text-[13px] font-medium text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="text-[13px] text-gray-500 mb-4">
          {count} candidate{count !== 1 ? 's' : ''} found
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <p className="text-[14px] text-gray-500">Loading candidates...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <p className="text-[14px] text-red-500">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && candidates.length === 0 && (
          <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
            <p className="text-[15px] text-gray-700 mb-1">No candidates found</p>
            <p className="text-[13px] text-gray-500">Try adjusting your filters</p>
          </div>
        )}

        {/* Candidates Grid */}
        {!isLoading && !error && candidates.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {candidates.map((candidate: CandidateProfileSanitized) => (
              <Link
                key={candidate.id}
                to={`/candidates/${candidate.slug}`}
                className="bg-white border border-gray-200 rounded-lg p-5 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gray-900 rounded-full flex items-center justify-center text-white text-[14px] font-medium flex-shrink-0">
                    {candidate.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[15px] font-medium text-gray-900 truncate">
                      {candidate.professional_title || 'Professional'}
                    </h3>
                    {candidate.headline && (
                      <p className="text-[13px] text-gray-500 truncate mt-0.5">
                        {candidate.headline}
                      </p>
                    )}
                    {candidate.location && (
                      <p className="text-[12px] text-gray-400 mt-1 flex items-center gap-1">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                        {candidate.location}
                      </p>
                    )}
                  </div>
                </div>

                {/* Tags */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {candidate.seniority && (
                    <span className="px-2 py-0.5 text-[11px] font-medium bg-gray-100 text-gray-700 rounded">
                      {getSeniorityLabel(candidate.seniority)}
                    </span>
                  )}
                  {candidate.work_preference && (
                    <span className="px-2 py-0.5 text-[11px] font-medium bg-blue-50 text-blue-700 rounded">
                      {getWorkPreferenceLabel(candidate.work_preference)}
                    </span>
                  )}
                  {candidate.years_of_experience && (
                    <span className="px-2 py-0.5 text-[11px] font-medium bg-green-50 text-green-700 rounded">
                      {candidate.years_of_experience}
                    </span>
                  )}
                </div>

              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!isLoading && !error && (hasPrevious || hasNext) && (
          <div className="mt-8 flex items-center justify-center gap-4">
            <button
              onClick={() => setFilters((prev) => ({ ...prev, page: prev.page - 1 }))}
              disabled={!hasPrevious}
              className="px-4 py-2 text-[13px] font-medium text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <span className="text-[13px] text-gray-500">Page {filters.page}</span>
            <button
              onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
              disabled={!hasNext}
              className="px-4 py-2 text-[13px] font-medium text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
