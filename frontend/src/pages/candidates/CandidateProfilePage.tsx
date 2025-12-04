import { Link, useParams } from 'react-router-dom'
import { useCandidate } from '@/hooks'
import CandidateProfileCard from '@/components/candidates/CandidateProfileCard'
import type { CandidateProfile, CandidateProfileSanitized } from '@/types'

// Type guard to check if profile is full or sanitized
function isFullProfile(profile: CandidateProfile | CandidateProfileSanitized): profile is CandidateProfile {
  return 'email' in profile
}

export default function CandidateProfilePage() {
  const { slug } = useParams<{ slug: string }>()
  const { candidate, isLoading, error } = useCandidate(slug || '')

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
