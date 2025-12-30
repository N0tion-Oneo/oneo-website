// CMS Pages List Page
import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cmsPages } from '@/services/cms'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { UserRole, ContentStatus, PageType, ContentStatusLabels, PageTypeLabels } from '@/types'
import type { CMSPageListItem } from '@/types'
import {
  Plus,
  Search,
  MoreVertical,
  Pencil,
  Trash2,
  Eye,
  FileText,
  AlertCircle,
  Filter,
} from 'lucide-react'

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: ContentStatus.DRAFT, label: 'Draft' },
  { value: ContentStatus.PUBLISHED, label: 'Published' },
  { value: ContentStatus.ARCHIVED, label: 'Archived' },
]

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: PageType.LEGAL, label: 'Legal' },
  { value: PageType.ABOUT, label: 'About' },
  { value: PageType.SERVICE, label: 'Service' },
  { value: PageType.GENERIC, label: 'Generic' },
]

export default function CMSPagesListPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [openMenu, setOpenMenu] = useState<string | null>(null)

  // Fetch pages
  const { data: pages = [], isLoading, error } = useQuery({
    queryKey: ['cms-pages', statusFilter, typeFilter],
    queryFn: () => cmsPages.list({
      status: statusFilter || undefined,
      page_type: typeFilter || undefined,
    }),
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => cmsPages.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-pages'] })
      showToast('Page deleted successfully', 'success')
    },
    onError: () => {
      showToast('Failed to delete page', 'error')
    },
  })

  // Filter pages by search
  const filteredPages = useMemo(() => {
    if (!search) return pages
    const searchLower = search.toLowerCase()
    return pages.filter(
      (page) =>
        page.title.toLowerCase().includes(searchLower) ||
        page.slug.toLowerCase().includes(searchLower)
    )
  }, [pages, search])

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this page?')) {
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

  const getTypeBadge = (type: PageType) => {
    const styles: Record<PageType, string> = {
      [PageType.LEGAL]: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
      [PageType.ABOUT]: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
      [PageType.SERVICE]: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400',
      [PageType.GENERIC]: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
    }
    return (
      <span className={`inline-flex px-2 py-0.5 text-[11px] font-medium rounded ${styles[type]}`}>
        {PageTypeLabels[type]}
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
          You do not have permission to manage CMS pages.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-semibold text-gray-900 dark:text-gray-100">Pages</h1>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">
            Manage static pages like legal, about, and service pages
          </p>
        </div>
        <Link
          to="/dashboard/cms/pages/new"
          className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-gray-900 dark:bg-gray-100 dark:text-gray-900 rounded-md hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Page
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search pages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600"
          />
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Type Filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600"
        >
          {TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <p className="text-[14px] text-gray-500 dark:text-gray-400">Loading pages...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-12">
          <p className="text-[14px] text-red-500 dark:text-red-400">Failed to load pages</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredPages.length === 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
          <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-[15px] text-gray-700 dark:text-gray-300 mb-1">No pages found</p>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-4">
            {search || statusFilter || typeFilter
              ? 'Try adjusting your filters'
              : 'Create your first page to get started'}
          </p>
          {!search && !statusFilter && !typeFilter && (
            <Link
              to="/dashboard/cms/pages/new"
              className="inline-flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-gray-900 dark:bg-gray-100 dark:text-gray-900 rounded-md hover:bg-gray-800 dark:hover:bg-gray-200"
            >
              <Plus className="w-4 h-4" />
              Create Page
            </Link>
          )}
        </div>
      )}

      {/* Pages Table */}
      {!isLoading && !error && filteredPages.length > 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-visible">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Slug
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Updated
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredPages.map((page) => (
                <tr key={page.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-[13px] font-medium text-gray-900 dark:text-gray-100">{page.title}</p>
                      {page.excerpt && (
                        <p className="text-[12px] text-gray-500 dark:text-gray-400 truncate max-w-[300px]">
                          {page.excerpt}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <code className="text-[12px] text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                      /{page.slug}
                    </code>
                  </td>
                  <td className="px-4 py-3">{getTypeBadge(page.page_type)}</td>
                  <td className="px-4 py-3">{getStatusBadge(page.status)}</td>
                  <td className="px-4 py-3">
                    <span className="text-[12px] text-gray-500 dark:text-gray-400">
                      {new Date(page.updated_at).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="relative inline-block">
                      <button
                        onClick={() => setOpenMenu(openMenu === page.id ? null : page.id)}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {openMenu === page.id && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setOpenMenu(null)}
                          />
                          <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg dark:shadow-gray-900/40 z-20">
                            <div className="py-1">
                              <Link
                                to={`/dashboard/cms/pages/${page.id}`}
                                className="flex items-center gap-2 px-4 py-2 text-[13px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                                onClick={() => setOpenMenu(null)}
                              >
                                <Pencil className="w-4 h-4" />
                                Edit
                              </Link>
                              <Link
                                to={`/${page.slug}`}
                                target="_blank"
                                className="flex items-center gap-2 px-4 py-2 text-[13px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                                onClick={() => setOpenMenu(null)}
                              >
                                <Eye className="w-4 h-4" />
                                View
                              </Link>
                              <button
                                onClick={() => handleDelete(page.id)}
                                className="flex items-center gap-2 w-full px-4 py-2 text-[13px] text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
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
