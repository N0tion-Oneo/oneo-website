// CMS Page SEO Management Page
// Centralized SEO management for all application pages
// Pages are automatically synced from shared/seo-routes.json
import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cmsPageSeo } from '@/services/cms'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { UserRole } from '@/types'
import type { CMSPageSEO, CMSPageSEOInput } from '@/types'
import {
  Search,
  Pencil,
  Trash2,
  Loader2,
  X,
  AlertCircle,
  Globe,
  ToggleLeft,
  ToggleRight,
  FileText,
  Image,
  Map,
  EyeOff,
  Link,
  Info,
  Lock,
  CheckCircle2,
  Code,
} from 'lucide-react'

export default function CMSPageSeoPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPage, setEditingPage] = useState<CMSPageSEO | null>(null)

  // Form state
  const [formData, setFormData] = useState<CMSPageSEOInput>({
    path: '',
    name: '',
    title: '',
    description: '',
    title_template: '',
    description_template: '',
    og_image: null,
    noindex: false,
    canonical_url: '',
    include_in_sitemap: true,
    sitemap_priority: 0.5,
    is_active: true,
  })

  // Fetch page SEO entries
  const { data: pages = [], isLoading, error, refetch } = useQuery({
    queryKey: ['cms-page-seo', activeFilter],
    queryFn: () => cmsPageSeo.list({ is_active: activeFilter }),
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CMSPageSEOInput> }) =>
      cmsPageSeo.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-page-seo'] })
      showToast('success', 'Page SEO settings updated successfully')
      closeModal()
    },
    onError: () => {
      showToast('error', 'Failed to update page SEO settings')
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: cmsPageSeo.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-page-seo'] })
      showToast('success', 'Page SEO settings deleted')
    },
    onError: (error: Error & { response?: { data?: { error?: string } } }) => {
      const message = error.response?.data?.error || 'Failed to delete page SEO settings'
      showToast('error', message)
    },
  })

  // Toggle active mutation
  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      cmsPageSeo.update(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-page-seo'] })
    },
  })

  // Filter and sort pages
  const filteredPages = useMemo(() => {
    let result = pages

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase()
      result = result.filter(
        (p) =>
          p.path.toLowerCase().includes(searchLower) ||
          p.name.toLowerCase().includes(searchLower) ||
          p.title.toLowerCase().includes(searchLower)
      )
    }

    // Sort: system pages first, then by path
    return result.sort((a, b) => {
      if (a.is_system !== b.is_system) {
        return a.is_system ? -1 : 1
      }
      return a.path.localeCompare(b.path)
    })
  }, [pages, search])

  // Count stats
  const stats = useMemo(() => {
    const systemCount = pages.filter(p => p.is_system).length
    const customCount = pages.filter(p => !p.is_system).length
    const activeCount = pages.filter(p => p.is_active).length
    // A page is "configured" if it has SEO set - for wildcard pages, check templates; for static pages, check title/description
    const configuredCount = pages.filter(p => {
      const isWildcard = p.path.endsWith('*')
      if (isWildcard) {
        return !!(p.title_template || p.description_template)
      }
      return !!(p.title || p.description)
    }).length
    return { systemCount, customCount, activeCount, configuredCount, total: pages.length }
  }, [pages])

  const openModal = (page: CMSPageSEO) => {
    setEditingPage(page)
    setFormData({
      path: page.path,
      name: page.name,
      title: page.title,
      description: page.description,
      title_template: page.title_template || '',
      description_template: page.description_template || '',
      og_image: null, // Can't pre-populate file input
      noindex: page.noindex,
      canonical_url: page.canonical_url,
      include_in_sitemap: page.include_in_sitemap,
      sitemap_priority: page.sitemap_priority,
      is_active: page.is_active,
    })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingPage(null)
    setFormData({
      path: '',
      name: '',
      title: '',
      description: '',
      title_template: '',
      description_template: '',
      og_image: null,
      noindex: false,
      canonical_url: '',
      include_in_sitemap: true,
      sitemap_priority: 0.5,
      is_active: true,
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingPage) {
      updateMutation.mutate({ id: editingPage.id, data: formData })
    }
  }

  const handleDelete = (page: CMSPageSEO) => {
    if (page.is_system) {
      showToast('error', 'System pages cannot be deleted. You can disable them instead.')
      return
    }
    if (window.confirm('Are you sure you want to delete this page SEO configuration?')) {
      deleteMutation.mutate(page.id)
    }
  }

  const handleToggle = (page: CMSPageSEO) => {
    toggleMutation.mutate({ id: page.id, is_active: !page.is_active })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setFormData({ ...formData, og_image: file })
  }

  // Access check
  if (!user || ![UserRole.ADMIN, UserRole.RECRUITER].includes(user.role)) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-4" />
        <p className="text-[15px] text-gray-700 mb-2">Access Denied</p>
        <p className="text-[13px] text-gray-500">
          You do not have permission to manage page SEO settings.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[20px] font-semibold text-gray-900">Page SEO Settings</h1>
        <p className="text-[13px] text-gray-500 mt-0.5">
          Configure SEO metadata for all pages in the application
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-[24px] font-semibold text-gray-900">{stats.total}</div>
          <div className="text-[12px] text-gray-500">Total Pages</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-[24px] font-semibold text-blue-600">{stats.systemCount}</div>
          <div className="text-[12px] text-gray-500">System Pages</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-[24px] font-semibold text-green-600">{stats.configuredCount}</div>
          <div className="text-[12px] text-gray-500">SEO Configured</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-[24px] font-semibold text-amber-600">{stats.total - stats.configuredCount}</div>
          <div className="text-[12px] text-gray-500">Needs SEO</div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-[13px] text-blue-700">
            <p className="font-medium mb-1">How it works</p>
            <p className="text-blue-600">
              Pages are <strong>automatically synced</strong> from <code className="bg-blue-100 px-1 rounded">shared/seo-routes.json</code>.
              To add a new page, add it to the JSON file and it will appear here automatically.
              Pages marked with <code className="bg-blue-100 px-1 rounded">*</code> are wildcard patterns for dynamic routes
              (e.g., <code className="bg-blue-100 px-1 rounded">/jobs/*</code> matches <code className="bg-blue-100 px-1 rounded">/jobs/software-engineer</code>).
              Wildcard pages use <strong>programmatic SEO templates</strong> with variables like{' '}
              <code className="bg-blue-100 px-1 rounded">{'{{job.title}}'}</code>.
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by path, name, or title..."
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
          <option value="">All Pages</option>
          <option value="true">Active Only</option>
          <option value="false">Inactive Only</option>
        </select>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto mb-2" />
          <p className="text-[14px] text-gray-500">Loading pages...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-12">
          <p className="text-[14px] text-red-500">Failed to load pages</p>
          <button onClick={() => refetch()} className="text-[13px] text-blue-600 hover:underline mt-2">
            Try again
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredPages.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <Globe className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-[15px] text-gray-700 mb-1">No pages found</p>
          <p className="text-[13px] text-gray-500">
            {search ? 'Try adjusting your search' : 'Add a custom page or check seo-routes.json'}
          </p>
        </div>
      )}

      {/* Pages Table */}
      {!isLoading && !error && filteredPages.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  Page
                </th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  SEO Status
                </th>
                <th className="text-center px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  Sitemap
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
              {filteredPages.map((page) => {
                const isWildcard = page.path.endsWith('*')
                const hasTitle = !!page.title
                const hasDescription = !!page.description
                const hasTitleTemplate = !!page.title_template
                const hasDescriptionTemplate = !!page.description_template
                const isConfigured = isWildcard
                  ? (hasTitleTemplate || hasDescriptionTemplate)
                  : (hasTitle || hasDescription)

                return (
                  <tr key={page.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {page.is_system ? (
                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                              <Lock className="w-4 h-4 text-blue-500" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                              <FileText className="w-4 h-4 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-medium text-gray-900">{page.name}</span>
                            {page.is_system && (
                              <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                System
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <code className="text-[11px] font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                              {page.path}
                            </code>
                            {page.path.endsWith('*') && (
                              <span className="text-[10px] font-medium text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
                                wildcard
                              </span>
                            )}
                            {page.noindex && (
                              <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                <EyeOff className="w-3 h-3" />
                                noindex
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {isConfigured ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                            <span className="text-[12px] text-green-700">
                              {isWildcard ? 'Template Set' : 'Configured'}
                            </span>
                          </div>
                          {isWildcard && page.title_template && (
                            <div className="flex items-center gap-1 text-[11px] text-gray-500 truncate max-w-[200px]" title={page.title_template}>
                              <Code className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{page.title_template}</span>
                            </div>
                          )}
                          {!isWildcard && page.title && (
                            <div className="text-[11px] text-gray-500 truncate max-w-[200px]" title={page.title}>
                              {page.title}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                          <span className="text-[12px] text-amber-700">
                            {isWildcard ? 'Needs Template' : 'Needs SEO'}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {page.include_in_sitemap ? (
                        <div className="flex items-center justify-center gap-1">
                          <Map className="w-3.5 h-3.5 text-green-500" />
                          <span className="text-[11px] text-gray-500">{page.sitemap_priority}</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggle(page)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {page.is_active ? (
                          <ToggleRight className="w-6 h-6 text-green-500" />
                        ) : (
                          <ToggleLeft className="w-6 h-6 text-gray-300" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openModal(page)}
                          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                          title="Edit SEO settings"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        {!page.is_system && (
                          <button
                            onClick={() => handleDelete(page)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={closeModal} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
              <div>
                <h2 className="text-[16px] font-semibold text-gray-900">
                  Edit Page SEO
                </h2>
                {editingPage?.is_system && (
                  <p className="text-[12px] text-blue-600 mt-0.5">
                    System page - SEO settings can be customized
                  </p>
                )}
              </div>
              <button
                onClick={closeModal}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                {/* Path */}
                <div>
                  <label className="block text-[13px] font-medium text-gray-700 mb-1">
                    URL Path *
                  </label>
                  <input
                    type="text"
                    value={formData.path}
                    onChange={(e) => setFormData({ ...formData, path: e.target.value })}
                    placeholder="/candidates"
                    required
                    disabled={editingPage?.is_system}
                    className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 disabled:bg-gray-50 disabled:text-gray-500"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    {editingPage?.is_system ? 'System page path cannot be changed' : 'Use * for wildcards (e.g., /jobs/*)'}
                  </p>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-[13px] font-medium text-gray-700 mb-1">
                    Page Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Candidates Directory"
                    required
                    className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    Internal name for this page
                  </p>
                </div>
              </div>

              {/* SEO Title & Meta Description - Only shown for non-wildcard pages */}
              {!(formData.path.endsWith('*') || editingPage?.path.endsWith('*')) && (
                <>
                  {/* SEO Title */}
                  <div>
                    <label className="block text-[13px] font-medium text-gray-700 mb-1">
                      SEO Title
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Browse Top Candidates - Find Your Perfect Hire"
                      maxLength={200}
                      className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300"
                    />
                    <p className="text-[11px] text-gray-500 mt-1">
                      {formData.title?.length || 0}/200 characters. Optimal: 50-60 characters.
                    </p>
                  </div>

                  {/* Meta Description */}
                  <div>
                    <label className="block text-[13px] font-medium text-gray-700 mb-1">
                      Meta Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Discover talented candidates for your open positions..."
                      rows={3}
                      maxLength={320}
                      className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 resize-none"
                    />
                    <p className="text-[11px] text-gray-500 mt-1">
                      {formData.description?.length || 0}/320 characters. Optimal: 150-160 characters.
                    </p>
                  </div>
                </>
              )}

              {/* Programmatic SEO Templates - Only shown for wildcard routes */}
              {(formData.path.endsWith('*') || editingPage?.path.endsWith('*')) && (
                <div className="border border-purple-200 rounded-lg p-4 bg-purple-50/50">
                  <div className="flex items-center gap-2 mb-3">
                    <Code className="w-4 h-4 text-purple-600" />
                    <h3 className="text-[14px] font-medium text-purple-900">Programmatic SEO Templates</h3>
                  </div>
                  <p className="text-[12px] text-purple-700 mb-4">
                    For wildcard pages, use templates with variables to generate dynamic SEO content.
                    Content-specific SEO (set on individual items) takes priority over these templates.
                  </p>

                  {/* Title Template */}
                  <div className="mb-4">
                    <label className="block text-[13px] font-medium text-gray-700 mb-1">
                      Title Template
                    </label>
                    <input
                      type="text"
                      value={formData.title_template}
                      onChange={(e) => setFormData({ ...formData, title_template: e.target.value })}
                      placeholder="{{job.title}} at {{job.company_name}} - {{job.location}}"
                      maxLength={300}
                      className="w-full px-3 py-2 text-[13px] font-mono border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-300 bg-white"
                    />
                    <p className="text-[11px] text-gray-500 mt-1">
                      {formData.title_template?.length || 0}/300 characters
                    </p>
                  </div>

                  {/* Description Template */}
                  <div className="mb-4">
                    <label className="block text-[13px] font-medium text-gray-700 mb-1">
                      Description Template
                    </label>
                    <textarea
                      value={formData.description_template}
                      onChange={(e) => setFormData({ ...formData, description_template: e.target.value })}
                      placeholder="Apply for {{job.title}} at {{job.company_name}}. {{job.job_type}} {{job.work_mode}} position. {{job.summary}}"
                      rows={3}
                      maxLength={500}
                      className="w-full px-3 py-2 text-[13px] font-mono border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-300 resize-none bg-white"
                    />
                    <p className="text-[11px] text-gray-500 mt-1">
                      {formData.description_template?.length || 0}/500 characters
                    </p>
                  </div>

                  {/* Variable Reference */}
                  <div className="bg-white border border-purple-100 rounded p-3">
                    <p className="text-[11px] font-medium text-gray-700 mb-2">Available Variables:</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] font-mono text-gray-600">
                      {formData.path.includes('/jobs') && (
                        <>
                          <span>{'{{job.title}}'}</span>
                          <span>{'{{job.company_name}}'}</span>
                          <span>{'{{job.location}}'}</span>
                          <span>{'{{job.job_type}}'}</span>
                          <span>{'{{job.work_mode}}'}</span>
                          <span>{'{{job.seniority}}'}</span>
                          <span>{'{{job.salary_range}}'}</span>
                          <span>{'{{job.summary}}'}</span>
                        </>
                      )}
                      {formData.path.includes('/candidates') && (
                        <>
                          <span>{'{{candidate.initials}}'}</span>
                          <span>{'{{candidate.professional_title}}'}</span>
                          <span>{'{{candidate.headline}}'}</span>
                          <span>{'{{candidate.seniority}}'}</span>
                          <span>{'{{candidate.location}}'}</span>
                          <span>{'{{candidate.work_preference}}'}</span>
                          <span>{'{{candidate.years_of_experience}}'}</span>
                          <span>{'{{candidate.industries}}'}</span>
                        </>
                      )}
                      {formData.path.includes('/companies') && (
                        <>
                          <span>{'{{company.name}}'}</span>
                          <span>{'{{company.tagline}}'}</span>
                          <span>{'{{company.industry}}'}</span>
                          <span>{'{{company.company_size}}'}</span>
                          <span>{'{{company.location}}'}</span>
                          <span>{'{{company.founded_year}}'}</span>
                        </>
                      )}
                      {formData.path.includes('/blog') && (
                        <>
                          <span>{'{{post.title}}'}</span>
                          <span>{'{{post.excerpt}}'}</span>
                          <span>{'{{post.category}}'}</span>
                          <span>{'{{post.author_name}}'}</span>
                        </>
                      )}
                      {formData.path.includes('/glossary') && (
                        <>
                          <span>{'{{term.title}}'}</span>
                          <span>{'{{term.definition_plain}}'}</span>
                        </>
                      )}
                      {formData.path.includes('/case-studies') && (
                        <>
                          <span>{'{{study.title}}'}</span>
                          <span>{'{{study.client_name}}'}</span>
                          <span>{'{{study.industry}}'}</span>
                          <span>{'{{study.excerpt}}'}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* OG Image */}
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1">
                  Open Graph Image
                </label>
                <div className="flex items-center gap-4">
                  {editingPage?.og_image_url && !formData.og_image && (
                    <div className="flex items-center gap-2">
                      <Image className="w-4 h-4 text-gray-400" />
                      <span className="text-[12px] text-gray-500">Current image set</span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="text-[13px] text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-[13px] file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                  />
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  Recommended: 1200x630px. Used when sharing on social media.
                </p>
              </div>

              {/* Canonical URL */}
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1">
                  <div className="flex items-center gap-1.5">
                    <Link className="w-3.5 h-3.5" />
                    Canonical URL
                  </div>
                </label>
                <input
                  type="url"
                  value={formData.canonical_url}
                  onChange={(e) => setFormData({ ...formData, canonical_url: e.target.value })}
                  placeholder="https://example.com/preferred-url"
                  className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300"
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  Leave empty to use the current page URL
                </p>
              </div>

              {/* Options Row */}
              <div className="grid grid-cols-2 gap-4">
                {/* Sitemap Priority */}
                <div>
                  <label className="block text-[13px] font-medium text-gray-700 mb-1">
                    Sitemap Priority
                  </label>
                  <select
                    value={formData.sitemap_priority}
                    onChange={(e) =>
                      setFormData({ ...formData, sitemap_priority: parseFloat(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300"
                  >
                    <option value="1.0">1.0 - Highest (Homepage)</option>
                    <option value="0.9">0.9 - Very High</option>
                    <option value="0.8">0.8 - High</option>
                    <option value="0.7">0.7 - Above Average</option>
                    <option value="0.6">0.6 - Average</option>
                    <option value="0.5">0.5 - Default</option>
                    <option value="0.4">0.4 - Below Average</option>
                    <option value="0.3">0.3 - Low</option>
                    <option value="0.2">0.2 - Very Low</option>
                    <option value="0.1">0.1 - Lowest</option>
                  </select>
                </div>

                {/* Checkboxes */}
                <div className="space-y-3 pt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.include_in_sitemap}
                      onChange={(e) =>
                        setFormData({ ...formData, include_in_sitemap: e.target.checked })
                      }
                      className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500"
                    />
                    <span className="text-[13px] text-gray-700">Include in Sitemap</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.noindex}
                      onChange={(e) => setFormData({ ...formData, noindex: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500"
                    />
                    <span className="text-[13px] text-gray-700">Noindex (Hide from Search)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500"
                    />
                    <span className="text-[13px] text-gray-700">Active</span>
                  </label>
                </div>
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
                  disabled={updateMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 disabled:opacity-50 transition-colors"
                >
                  {updateMutation.isPending && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
