import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { CandidateProfile } from './ProfilePage'
import { UserRole } from '@/types'
import { AlertCircle } from 'lucide-react'

export default function AdminCandidateEditPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  // Check access
  if (!user || ![UserRole.ADMIN, UserRole.RECRUITER].includes(user.role)) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-4" />
        <p className="text-[15px] text-gray-700 mb-2">Access Denied</p>
        <p className="text-[13px] text-gray-500">
          You do not have permission to edit candidate profiles.
        </p>
      </div>
    )
  }

  if (!slug) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-4" />
        <p className="text-[15px] text-gray-700 mb-2">Invalid Candidate</p>
        <p className="text-[13px] text-gray-500">
          No candidate slug provided.
        </p>
      </div>
    )
  }

  return (
    <CandidateProfile
      candidateSlug={slug}
      onBack={() => navigate('/dashboard/admin/candidates')}
    />
  )
}
