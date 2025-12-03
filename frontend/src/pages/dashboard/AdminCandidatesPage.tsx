import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useAllCandidates } from '@/hooks'
import { useAuth } from '@/contexts/AuthContext'
import { UserRole, Seniority, WorkPreference, ProfileVisibility } from '@/types'
import type { CandidateAdminListItem } from '@/types'
import {
  User,
  Search,
  MoreVertical,
  Eye,
  Pencil,
  Mail,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

const getSeniorityLabel = (seniority: Seniority | ''): string => {
  const labels: Record<string, string> = {
    intern: 'Intern',
    junior: 'Junior',
    mid: 'Mid-level',
    senior: 'Senior',
    lead: 'Lead',
    principal: 'Principal',
    executive: 'Executive',
  }
  return labels[seniority] || '-'
}

const getWorkPreferenceLabel = (pref: WorkPreference | ''): string => {
  const labels: Record<string, string> = {
    remote: 'Remote',
    hybrid: 'Hybrid',
    onsite: 'On-site',
    flexible: 'Flexible',
  }
  return labels[pref] || '-'
}

const getVisibilityBadge = (visibility: ProfileVisibility) => {
  if (visibility === ProfileVisibility.PUBLIC_SANITISED) {
    return { bg: 'bg-green-100', text: 'text-green-700', label: 'Public' }
  }
  return { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Private' }
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function AdminCandidatesPage() {
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [seniorityFilter, setSeniorityFilter] = useState<string>('')
  const [visibilityFilter, setVisibilityFilter] = useState<string>('')
  const [openMenu, setOpenMenu] = useState<number | null>(null)
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null)
  const menuButtonRefs = useRef<Map<number, HTMLButtonElement>>(new Map())
  const [page, setPage] = useState(1)

  const { candidates, count, hasNext, hasPrevious, isLoading, error } = useAllCandidates({
    search: search || undefined,
    seniority: seniorityFilter || undefined,
    visibility: visibilityFilter || undefined,
    page,
  })

  // Check if user has admin/recruiter access
  if (!user || ![UserRole.ADMIN, UserRole.RECRUITER].includes(user.role)) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-4" />
        <p className="text-[15px] text-gray-700 mb-2">Access Denied</p>
        <p className="text-[13px] text-gray-500">
          You do not have permission to view this page.
        </p>
      </div>
    )
  }

  const totalPages = Math.ceil(count / 20)

  const handleOpenMenu = (candidateId: number) => {
    if (openMenu === candidateId) {
      setOpenMenu(null)
      setMenuPosition(null)
      return
    }

    const button = menuButtonRefs.current.get(candidateId)
    if (button) {
      const rect = button.getBoundingClientRect()
      setMenuPosition({
        top: rect.bottom + 4,
        left: rect.right - 192, // 192px = w-48 (menu width)
      })
    }
    setOpenMenu(candidateId)
  }

  const closeMenu = () => {
    setOpenMenu(null)
    setMenuPosition(null)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-semibold text-gray-900">All Candidates</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">
            View and manage all candidates on the platform ({count} total)
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search candidates by name, email, or title..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="w-full pl-10 pr-4 py-2 text-[13px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300"
          />
        </div>

        {/* Seniority Filter */}
        <select
          value={seniorityFilter}
          onChange={(e) => {
            setSeniorityFilter(e.target.value)
            setPage(1)
          }}
          className="px-3 py-2 text-[13px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300"
        >
          <option value="">All Seniority</option>
          <option value="intern">Intern</option>
          <option value="junior">Junior</option>
          <option value="mid">Mid-level</option>
          <option value="senior">Senior</option>
          <option value="lead">Lead</option>
          <option value="principal">Principal</option>
          <option value="executive">Executive</option>
        </select>

        {/* Visibility Filter */}
        <select
          value={visibilityFilter}
          onChange={(e) => {
            setVisibilityFilter(e.target.value)
            setPage(1)
          }}
          className="px-3 py-2 text-[13px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300"
        >
          <option value="">All Visibility</option>
          <option value="public_sanitised">Public</option>
          <option value="private">Private</option>
        </select>
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
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-[15px] text-gray-700 mb-1">No candidates found</p>
          <p className="text-[13px] text-gray-500">
            {search ? 'No candidates match your search' : 'No candidates have registered yet'}
          </p>
        </div>
      )}

      {/* Candidates List */}
      {!isLoading && !error && candidates.length > 0 && (
        <>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                    Candidate
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                    Seniority
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                    Profile %
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                    Visibility
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {candidates.map((candidate: CandidateAdminListItem) => {
                  const visibilityBadge = getVisibilityBadge(candidate.visibility)
                  return (
                    <tr key={candidate.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                            <span className="text-[12px] font-medium text-gray-600">
                              {candidate.initials || '--'}
                            </span>
                          </div>
                          <div>
                            <p className="text-[14px] font-medium text-gray-900">
                              {candidate.full_name || 'No name'}
                            </p>
                            <p className="text-[12px] text-gray-500">
                              {candidate.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-[13px] text-gray-900">
                          {candidate.professional_title || '-'}
                        </p>
                        {candidate.headline && (
                          <p className="text-[12px] text-gray-500 truncate max-w-xs">
                            {candidate.headline}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-gray-600">
                        {candidate.location || '-'}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-gray-600">
                        {getSeniorityLabel(candidate.seniority)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                candidate.profile_completeness >= 70
                                  ? 'bg-green-500'
                                  : candidate.profile_completeness >= 40
                                  ? 'bg-yellow-500'
                                  : 'bg-red-400'
                              }`}
                              style={{ width: `${candidate.profile_completeness}%` }}
                            />
                          </div>
                          <span className="text-[12px] text-gray-500">
                            {candidate.profile_completeness}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 text-[11px] font-medium rounded ${visibilityBadge.bg} ${visibilityBadge.text}`}
                        >
                          {visibilityBadge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-gray-600">
                        {formatDate(candidate.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          ref={(el) => {
                            if (el) menuButtonRefs.current.set(candidate.id, el)
                          }}
                          onClick={() => handleOpenMenu(candidate.id)}
                          className="p-1 text-gray-400 hover:text-gray-600 rounded"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-[13px] text-gray-500">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={!hasPrevious}
                  className="flex items-center gap-1 px-3 py-1.5 text-[13px] border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={!hasNext}
                  className="flex items-center gap-1 px-3 py-1.5 text-[13px] border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Dropdown menu rendered via portal */}
      {openMenu !== null && menuPosition && createPortal(
        <>
          <div
            className="fixed inset-0 z-[9998]"
            onClick={closeMenu}
          />
          <div
            className="fixed z-[9999] w-48 bg-white border border-gray-200 rounded-md shadow-lg"
            style={{
              top: menuPosition.top,
              left: menuPosition.left,
            }}
          >
            <div className="py-1">
              {(() => {
                const candidate = candidates.find((c: CandidateAdminListItem) => c.id === openMenu)
                if (!candidate) return null
                return (
                  <>
                    <Link
                      to={`/dashboard/admin/candidates/${candidate.slug}`}
                      onClick={closeMenu}
                      className="flex items-center gap-2 px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-50"
                    >
                      <Pencil className="w-4 h-4" />
                      Edit Profile
                    </Link>
                    <Link
                      to={`/candidates/${candidate.slug}`}
                      onClick={closeMenu}
                      className="flex items-center gap-2 px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-50"
                    >
                      <Eye className="w-4 h-4" />
                      View Profile
                    </Link>
                    <a
                      href={`mailto:${candidate.email}`}
                      onClick={closeMenu}
                      className="flex items-center gap-2 px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-50"
                    >
                      <Mail className="w-4 h-4" />
                      Send Email
                    </a>
                  </>
                )
              })()}
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  )
}
