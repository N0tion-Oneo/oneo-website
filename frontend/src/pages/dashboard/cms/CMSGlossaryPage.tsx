import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { cmsGlossary } from '@/services/cms'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { UserRole } from '@/types'
import {
  Plus,
  Search,
  Trash2,
  Pencil,
  Eye,
  BookOpen,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react'
import type { CMSGlossaryTermListItem } from '@/types'

export default function CMSGlossaryPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  const { data: terms = [], isLoading, error } = useQuery({
    queryKey: ['cms', 'glossary', { search, is_active: showInactive ? undefined : true }],
    queryFn: () => cmsGlossary.list({ search: search || undefined, is_active: showInactive ? undefined : true }),
  })

  const deleteMutation = useMutation({
    mutationFn: cmsGlossary.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms', 'glossary'] })
      showToast('Term deleted successfully', 'success')
    },
    onError: () => {
      showToast('Failed to delete term', 'error')
    },
  })

  const handleDelete = (term: CMSGlossaryTermListItem) => {
    if (window.confirm(`Are you sure you want to delete "${term.title}"?`)) {
      deleteMutation.mutate(term.id)
    }
  }

  // Filter terms by search
  const filteredTerms = useMemo(() => {
    if (!search) return terms
    const searchLower = search.toLowerCase()
    return terms.filter(
      (term) =>
        term.title.toLowerCase().includes(searchLower) ||
        (term.definition_plain && term.definition_plain.toLowerCase().includes(searchLower))
    )
  }, [terms, search])

  // Group terms by first letter
  const groupedTerms = filteredTerms.reduce((acc, term) => {
    const letter = term.title.charAt(0).toUpperCase()
    if (!acc[letter]) acc[letter] = []
    acc[letter].push(term)
    return acc
  }, {} as Record<string, CMSGlossaryTermListItem[]>)

  const sortedLetters = Object.keys(groupedTerms).sort()

  // Access check
  if (!user || ![UserRole.ADMIN, UserRole.RECRUITER].includes(user.role)) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-4" />
        <p className="text-[15px] text-gray-700 mb-2">Access Denied</p>
        <p className="text-[13px] text-gray-500">
          You do not have permission to manage glossary terms.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-semibold text-gray-900">Glossary</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">
            Manage recruitment and HR terminology definitions
          </p>
        </div>
        <Link
          to="/dashboard/cms/glossary/new"
          className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Term
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search terms..."
            className="w-full pl-10 pr-4 py-2 text-[13px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300"
          />
        </div>

        {/* Show Inactive Toggle */}
        <button
          onClick={() => setShowInactive(!showInactive)}
          className={`flex items-center gap-1.5 px-3 py-2 text-[13px] border rounded-md transition-colors ${
            showInactive
              ? 'border-gray-300 bg-gray-100 text-gray-900'
              : 'border-gray-200 text-gray-500 hover:bg-gray-50'
          }`}
        >
          {showInactive ? (
            <ToggleRight className="w-4 h-4" />
          ) : (
            <ToggleLeft className="w-4 h-4" />
          )}
          Show Inactive
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <p className="text-[14px] text-gray-500">Loading terms...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-12">
          <p className="text-[14px] text-red-500">Failed to load terms</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredTerms.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-[15px] text-gray-700 mb-1">No glossary terms found</p>
          <p className="text-[13px] text-gray-500 mb-4">
            {search || showInactive
              ? 'Try adjusting your filters'
              : 'Create your first glossary term'}
          </p>
          {!search && !showInactive && (
            <Link
              to="/dashboard/cms/glossary/new"
              className="inline-flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800"
            >
              <Plus className="w-4 h-4" />
              Create Term
            </Link>
          )}
        </div>
      )}

      {/* Terms List */}
      {!isLoading && !error && filteredTerms.length > 0 && (
        <div className="space-y-6">
          {sortedLetters.map((letter) => (
            <div key={letter}>
              <h2 className="text-[14px] font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">
                {letter}
              </h2>
              <div className="space-y-2">
                {groupedTerms[letter].map((term) => (
                  <div
                    key={term.id}
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Link
                            to={`/dashboard/cms/glossary/${term.id}`}
                            className="text-[14px] font-medium text-gray-900 hover:text-gray-600"
                          >
                            {term.title}
                          </Link>
                          {!term.is_active && (
                            <span className="inline-flex px-2 py-0.5 text-[11px] font-medium rounded bg-gray-100 text-gray-600">
                              Inactive
                            </span>
                          )}
                        </div>
                        <p className="text-[12px] text-gray-500 line-clamp-2">
                          {term.definition_plain || 'No definition'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Link
                          to={`/dashboard/cms/glossary/${term.id}`}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-[12px] text-gray-600 hover:bg-gray-50 rounded-md transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Edit
                        </Link>
                        <Link
                          to={`/glossary/${term.slug}`}
                          target="_blank"
                          className="flex items-center gap-1 px-2.5 py-1.5 text-[12px] text-gray-600 hover:bg-gray-50 rounded-md transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </Link>
                        <button
                          onClick={() => handleDelete(term)}
                          disabled={deleteMutation.isPending}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-[12px] text-red-500 hover:bg-red-50 rounded-md transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
