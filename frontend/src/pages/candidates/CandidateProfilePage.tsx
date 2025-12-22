import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useCandidate, useCompanyFeatures } from '@/hooks'
import { useAuth } from '@/contexts/AuthContext'
import CandidateProfileCard from '@/components/candidates/CandidateProfileCard'
import Navbar from '@/components/layout/Navbar'
import { SEO } from '@/components/seo'
import { buildCandidateSEOData } from '@/utils/seoTemplates'
import { UserRole } from '@/types'
import type { CandidateProfile, CandidateProfileSanitized } from '@/types'
import { Lock } from 'lucide-react'

// Type guard to check if profile is full or sanitized
function isFullProfile(profile: CandidateProfile | CandidateProfileSanitized): profile is CandidateProfile {
  return 'email' in profile
}

export default function CandidateProfilePage() {
  const { slug } = useParams<{ slug: string }>()
  const { user } = useAuth()
  const { hasFeature, isLoading: featuresLoading } = useCompanyFeatures()
  const { candidate, isLoading, error } = useCandidate(slug || '')

  // Check if user is a client without the Talent Directory feature
  const isClient = user?.role === UserRole.CLIENT
  const hasTalentDirectory = hasFeature('talent-directory')
  const isFeatureLocked = isClient && !hasTalentDirectory && !featuresLoading

  // Build SEO data for programmatic templates - must be before any early returns
  // For public profiles, we use initials instead of full name
  const candidateSeoData = useMemo(() => {
    if (!candidate) return undefined

    // Get initials from first_name and last_name
    const initials = `${candidate.first_name?.charAt(0) || ''}${candidate.last_name?.charAt(0) || ''}`.toUpperCase()

    return buildCandidateSEOData({
      initials,
      professional_title: candidate.current_title || undefined,
      headline: candidate.bio || undefined,
      seniority: candidate.seniority || undefined,
      city: candidate.city || undefined,
      country: candidate.country || undefined,
      work_preference: candidate.work_preference || undefined,
      years_of_experience: candidate.years_of_experience || undefined,
      industries: candidate.industries || undefined,
    })
  }, [candidate])

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
        <Navbar />
        <main className="max-w-5xl mx-auto px-6 py-10">
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

  // Show locked state for clients without the Talent Directory feature
  if (isFeatureLocked) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-5xl mx-auto px-6 py-10">
          <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-[18px] font-semibold text-gray-900 mb-2">
              Talent Directory Access Required
            </h2>
            <p className="text-[14px] text-gray-500 max-w-md mx-auto mb-6">
              Viewing candidate profiles from the Talent Directory requires access to this feature.
              This feature is included in the Retained service plan.
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
      <SEO
        contentData={candidateSeoData ? { candidate: candidateSeoData } : undefined}
        ogType="profile"
        ogImage={candidate.profile_image || undefined}
      />
      <Navbar />

      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="grid md:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="md:col-span-2">
            <CandidateProfileCard
              candidate={candidate}
              variant="page"
              hideViewProfileLink
              onContactClick={isFull ? () => {
                // TODO: Implement contact modal
                window.location.href = `mailto:${candidate.email}`
              } : undefined}
            />
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
