// CMS SEO Redirects Management Page
import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cmsSeoRedirects } from '@/services/cms'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { UserRole, RedirectType, RedirectTypeLabels } from '@/types'
import type { CMSRedirect, CMSRedirectInput } from '@/types'
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  ArrowRight,
  Loader2,
  X,
  AlertCircle,
  ExternalLink,
  BarChart2,
  ToggleLeft,
  ToggleRight,
  Ban,
  Zap,
} from 'lucide-react'

export default function CMSRedirectsPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRedirect, setEditingRedirect] = useState<CMSRedirect | null>(null)

  // Form state
  const [formData, setFormData] = useState<CMSRedirectInput>({
    source_path: '',
    destination_url: '',
    redirect_type: RedirectType.PERMANENT,
    is_active: true,
    is_regex: false,
  })

  // Fetch redirects
  const { data: redirects = [], isLoading, error } = useQuery({
    queryKey: ['cms-seo-redirects', activeFilter],
    queryFn: () => cmsSeoRedirects.list({ is_active: activeFilter }),
  })

  // Create mutation
  const createMutation = useMutation({
    mutationFn: cmsSeoRedirects.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-seo-redirects'] })
      showToast('success', 'Redirect created successfully')
      closeModal()
    },
    onError: () => {
      showToast('error', 'Failed to create redirect')
    },
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CMSRedirectInput> }) =>
      cmsSeoRedirects.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-seo-redirects'] })
      showToast('success', 'Redirect updated successfully')
      closeModal()
    },
    onError: () => {
      showToast('error', 'Failed to update redirect')
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: cmsSeoRedirects.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-seo-redirects'] })
      showToast('success', 'Redirect deleted')
    },
    onError: () => {
      showToast('error', 'Failed to delete redirect')
    },
  })

  // Toggle active mutation
  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      cmsSeoRedirects.update(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-seo-redirects'] })
    },
  })

  // Filter redirects by search
  const filteredRedirects = useMemo(() => {
    if (!search) return redirects
    const searchLower = search.toLowerCase()
    return redirects.filter(
      (r) =>
        r.source_path.toLowerCase().includes(searchLower) ||
        r.destination_url.toLowerCase().includes(searchLower)
    )
  }, [redirects, search])

  const openModal = (redirect?: CMSRedirect) => {
    if (redirect) {
      setEditingRedirect(redirect)
      setFormData({
        source_path: redirect.source_path,
        destination_url: redirect.destination_url,
        redirect_type: redirect.redirect_type,
        is_active: redirect.is_active,
        is_regex: redirect.is_regex,
      })
    } else {
      setEditingRedirect(null)
      setFormData({
        source_path: '',
        destination_url: '',
        redirect_type: RedirectType.PERMANENT,
        is_active: true,
        is_regex: false,
      })
    }
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingRedirect(null)
    setFormData({
      source_path: '',
      destination_url: '',
      redirect_type: RedirectType.PERMANENT,
      is_active: true,
      is_regex: false,
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingRedirect) {
      updateMutation.mutate({ id: editingRedirect.id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this redirect?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleToggle = (redirect: CMSRedirect) => {
    toggleMutation.mutate({ id: redirect.id, is_active: !redirect.is_active })
  }

  // Access check
  if (!user || ![UserRole.ADMIN, UserRole.RECRUITER].includes(user.role)) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-4" />
        <p className="text-[15px] text-gray-700 mb-2">Access Denied</p>
        <p className="text-[13px] text-gray-500">
          You do not have permission to manage SEO settings.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-semibold text-gray-900">URL Redirects</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">
            Manage 301/302 redirects and 410 Gone markers for SEO
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Redirect
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search redirects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-[13px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300"
          />
        </div>

        {/* Active Filter */}
        <select
          value={activeFilter === undefined ? '' : activeFilter.toString()}
          onChange={(e) =>
            setActiveFilter(e.target.value === '' ? undefined : e.target.value === 'true')
          }
          className="px-3 py-2 text-[13px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300"
        >
          <option value="">All Redirects</option>
          <option value="true">Active Only</option>
          <option value="false">Inactive Only</option>
        </select>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto mb-2" />
          <p className="text-[14px] text-gray-500">Loading redirects...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-12">
          <p className="text-[14px] text-red-500">Failed to load redirects</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredRedirects.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <ArrowRight className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-[15px] text-gray-700 mb-1">No redirects found</p>
          <p className="text-[13px] text-gray-500 mb-4">
            {search ? 'Try adjusting your search' : 'Create your first redirect'}
          </p>
          {!search && (
            <button
              onClick={() => openModal()}
              className="inline-flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800"
            >
              <Plus className="w-4 h-4" />
              Create Redirect
            </button>
          )}
        </div>
      )}

      {/* Redirects Table */}
      {!isLoading && !error && filteredRedirects.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  Source Path
                </th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  Destination
                </th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="text-center px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  Hits
                </th>
                <th className="text-center px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  Active
                </th>
                <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRedirects.map((redirect) => (
                <tr key={redirect.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <code className="text-[12px] font-mono text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                        {redirect.source_path}
                      </code>
                      {redirect.is_regex && (
                        <span className="text-[10px] font-medium text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
                          regex
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {redirect.redirect_type === RedirectType.GONE ? (
                      <div className="flex items-center gap-2 text-[12px] text-gray-500">
                        <Ban className="w-3 h-3 text-red-400 flex-shrink-0" />
                        <span className="italic">Page removed (410 Gone)</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-[12px] text-gray-600">
                        <ArrowRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        <span className="truncate max-w-[200px]" title={redirect.destination_url}>
                          {redirect.destination_url}
                        </span>
                        {redirect.destination_url.startsWith('http') && (
                          <a
                            href={redirect.destination_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`inline-flex px-2 py-0.5 text-[11px] font-medium rounded ${
                          redirect.redirect_type === RedirectType.PERMANENT
                            ? 'bg-green-100 text-green-700'
                            : redirect.redirect_type === RedirectType.GONE
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {RedirectTypeLabels[redirect.redirect_type]}
                      </span>
                      {redirect.is_auto_generated && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 bg-blue-50 rounded" title="Auto-generated from slug change">
                          <Zap className="w-2.5 h-2.5" />
                          auto
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1 text-[12px] text-gray-500">
                      <BarChart2 className="w-3 h-3" />
                      {redirect.hit_count}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleToggle(redirect)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {redirect.is_active ? (
                        <ToggleRight className="w-6 h-6 text-green-500" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-gray-300" />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openModal(redirect)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(redirect.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={closeModal} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-[16px] font-semibold text-gray-900">
                {editingRedirect ? 'Edit Redirect' : 'New Redirect'}
              </h2>
              <button
                onClick={closeModal}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Source Path */}
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1">
                  Source Path *
                </label>
                <input
                  type="text"
                  value={formData.source_path}
                  onChange={(e) => setFormData({ ...formData, source_path: e.target.value })}
                  placeholder="/old-page"
                  required
                  className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300"
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  The path to redirect from (e.g., /old-page)
                </p>
              </div>

              {/* Redirect Type */}
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1">
                  Redirect Type
                </label>
                <select
                  value={formData.redirect_type}
                  onChange={(e) => {
                    const newType = e.target.value as RedirectType
                    setFormData({
                      ...formData,
                      redirect_type: newType,
                      // Clear destination URL when switching to 410
                      destination_url: newType === RedirectType.GONE ? '' : formData.destination_url,
                    })
                  }}
                  className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300"
                >
                  <option value={RedirectType.PERMANENT}>301 Permanent Redirect (SEO-friendly)</option>
                  <option value={RedirectType.TEMPORARY}>302 Temporary Redirect</option>
                  <option value={RedirectType.GONE}>410 Gone (Page Deleted)</option>
                </select>
                <p className="text-[11px] text-gray-500 mt-1">
                  {formData.redirect_type === RedirectType.GONE
                    ? 'Tells search engines this page has been permanently removed'
                    : formData.redirect_type === RedirectType.PERMANENT
                    ? 'Best for permanently moved pages - search engines transfer SEO value'
                    : 'For temporarily moved pages - original URL retains SEO value'}
                </p>
              </div>

              {/* Destination URL - only show for 301/302 */}
              {formData.redirect_type !== RedirectType.GONE && (
                <div>
                  <label className="block text-[13px] font-medium text-gray-700 mb-1">
                    Destination URL *
                  </label>
                  <input
                    type="text"
                    value={formData.destination_url}
                    onChange={(e) => setFormData({ ...formData, destination_url: e.target.value })}
                    placeholder="/new-page or https://example.com/page"
                    required
                    className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    Where to redirect to (relative path or full URL)
                  </p>
                </div>
              )}

              {/* 410 Gone Info Box */}
              {formData.redirect_type === RedirectType.GONE && (
                <div className="bg-red-50 border border-red-100 rounded-md p-3">
                  <div className="flex items-start gap-2">
                    <Ban className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="text-[12px] text-red-700">
                      <p className="font-medium mb-1">Page Permanently Removed</p>
                      <p className="text-red-600">
                        This will return a 410 Gone status to search engines, indicating the page
                        has been intentionally and permanently removed. Use this when content no
                        longer exists and there's no replacement.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Options */}
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500"
                  />
                  <span className="text-[13px] text-gray-700">Active</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_regex}
                    onChange={(e) => setFormData({ ...formData, is_regex: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500"
                  />
                  <span className="text-[13px] text-gray-700">Use Regex</span>
                </label>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-[13px] font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 disabled:opacity-50 transition-colors"
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  {editingRedirect ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
