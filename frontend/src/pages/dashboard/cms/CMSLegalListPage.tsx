// CMS Legal Documents List Page
import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cmsPages } from '@/services/cms'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { UserRole, ContentStatus, LegalDocumentType, ContentStatusLabels, LegalDocumentTypeLabels } from '@/types'
import type { CMSLegalDocumentListItem } from '@/types'
import {
  Plus,
  Search,
  MoreVertical,
  Pencil,
  Trash2,
  Eye,
  Scale,
  AlertCircle,
} from 'lucide-react'

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: ContentStatus.DRAFT, label: 'Draft' },
  { value: ContentStatus.PUBLISHED, label: 'Published' },
  { value: ContentStatus.ARCHIVED, label: 'Archived' },
]

export default function CMSLegalListPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [openMenu, setOpenMenu] = useState<string | null>(null)

  // Fetch legal documents
  const { data: documents = [], isLoading, error } = useQuery({
    queryKey: ['cms-legal', statusFilter],
    queryFn: () => cmsPages.list({
      status: statusFilter || undefined,
    }),
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => cmsPages.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-legal'] })
      showToast('Document deleted successfully', 'success')
    },
    onError: () => {
      showToast('Failed to delete document', 'error')
    },
  })

  // Filter documents by search
  const filteredDocuments = useMemo(() => {
    if (!search) return documents
    const searchLower = search.toLowerCase()
    return documents.filter(
      (doc: CMSLegalDocumentListItem) =>
        doc.title.toLowerCase().includes(searchLower) ||
        doc.slug.toLowerCase().includes(searchLower)
    )
  }, [documents, search])

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this document?')) {
      deleteMutation.mutate(id)
    }
    setOpenMenu(null)
  }

  const getStatusBadge = (status: ContentStatus) => {
    const styles: Record<ContentStatus, string> = {
      [ContentStatus.DRAFT]: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
      [ContentStatus.PUBLISHED]: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
      [ContentStatus.ARCHIVED]: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
    }
    return (
      <span className={`inline-flex px-2 py-0.5 text-[11px] font-medium rounded ${styles[status]}`}>
        {ContentStatusLabels[status]}
      </span>
    )
  }

  const getTypeBadge = (type: LegalDocumentType) => {
    return (
      <span className="inline-flex px-2 py-0.5 text-[11px] font-medium rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
        {LegalDocumentTypeLabels[type]}
      </span>
    )
  }

  // Access check
  if (!user || ![UserRole.ADMIN, UserRole.RECRUITER].includes(user.role)) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-4" />
        <p className="text-[15px] text-gray-700 dark:text-gray-300 mb-2">Access Denied</p>
        <p className="text-[13px] text-gray-500 dark:text-gray-400">
          You do not have permission to manage legal documents.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-semibold text-gray-900 dark:text-gray-100">Legal Documents</h1>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">
            Manage Terms & Conditions, Privacy Policy, and other legal content
          </p>
        </div>
        <Link
          to="/dashboard/cms/legal/new"
          className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-gray-900 dark:bg-gray-100 dark:text-gray-900 rounded-md hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Document
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
          />
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <p className="text-[14px] text-gray-500 dark:text-gray-400">Loading documents...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-12">
          <p className="text-[14px] text-red-500">Failed to load documents</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredDocuments.length === 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
          <Scale className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-[15px] text-gray-700 dark:text-gray-300 mb-1">No legal documents found</p>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-4">
            {search || statusFilter
              ? 'Try adjusting your filters'
              : 'Create your first legal document to get started'}
          </p>
          {!search && !statusFilter && (
            <Link
              to="/dashboard/cms/legal/new"
              className="inline-flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-gray-900 dark:bg-gray-100 dark:text-gray-900 rounded-md hover:bg-gray-800 dark:hover:bg-gray-200"
            >
              <Plus className="w-4 h-4" />
              Create Document
            </Link>
          )}
        </div>
      )}

      {/* Documents Table */}
      {!isLoading && !error && filteredDocuments.length > 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-visible">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Document
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Version
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Effective Date
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredDocuments.map((doc: CMSLegalDocumentListItem) => (
                <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-[13px] font-medium text-gray-900 dark:text-gray-100">{doc.title}</p>
                      <code className="text-[11px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">
                        /{doc.slug}
                      </code>
                    </div>
                  </td>
                  <td className="px-4 py-3">{getTypeBadge(doc.document_type)}</td>
                  <td className="px-4 py-3">
                    <span className="text-[12px] text-gray-600 dark:text-gray-400">
                      {doc.version || '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3">{getStatusBadge(doc.status)}</td>
                  <td className="px-4 py-3">
                    <span className="text-[12px] text-gray-500 dark:text-gray-400">
                      {doc.effective_date
                        ? new Date(doc.effective_date).toLocaleDateString()
                        : '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="relative inline-block">
                      <button
                        onClick={() => setOpenMenu(openMenu === doc.id ? null : doc.id)}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {openMenu === doc.id && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setOpenMenu(null)}
                          />
                          <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg dark:shadow-gray-900/40 z-20">
                            <div className="py-1">
                              <Link
                                to={`/dashboard/cms/legal/${doc.id}`}
                                className="flex items-center gap-2 px-4 py-2 text-[13px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                onClick={() => setOpenMenu(null)}
                              >
                                <Pencil className="w-4 h-4" />
                                Edit
                              </Link>
                              <Link
                                to={`/${doc.slug}`}
                                target="_blank"
                                className="flex items-center gap-2 px-4 py-2 text-[13px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                onClick={() => setOpenMenu(null)}
                              >
                                <Eye className="w-4 h-4" />
                                View
                              </Link>
                              <button
                                onClick={() => handleDelete(doc.id)}
                                className="flex items-center gap-2 w-full px-4 py-2 text-[13px] text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
