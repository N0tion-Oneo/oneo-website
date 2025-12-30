// CMS Page Editor Page
import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cmsPages } from '@/services/cms'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { useSEODefaults } from '@/contexts/SEOContext'
import { BlockEditor, type BlockEditorHandle } from '@/components/cms'
import { UserRole, ContentStatus, PageType } from '@/types'
import type { CMSPageInput, EditorJSData } from '@/types'
import {
  ArrowLeft,
  Save,
  Eye,
  AlertCircle,
  Loader2,
  Settings2,
} from 'lucide-react'

const STATUS_OPTIONS = [
  { value: ContentStatus.DRAFT, label: 'Draft' },
  { value: ContentStatus.PUBLISHED, label: 'Published' },
  { value: ContentStatus.ARCHIVED, label: 'Archived' },
]

const TYPE_OPTIONS = [
  { value: PageType.LEGAL, label: 'Legal' },
  { value: PageType.ABOUT, label: 'About' },
  { value: PageType.SERVICE, label: 'Service' },
  { value: PageType.GENERIC, label: 'Generic' },
]

const defaultContent: EditorJSData = {
  time: Date.now(),
  blocks: [],
  version: '2.28.0',
}

export default function CMSPageEditorPage() {
  const { pageId } = useParams<{ pageId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const seoDefaults = useSEODefaults()
  const editorRef = useRef<BlockEditorHandle>(null)

  const isNew = !pageId

  // Form state (excludes content - that's managed by Editor.js)
  const [formData, setFormData] = useState<Omit<CMSPageInput, 'content'>>({
    title: '',
    slug: '',
    page_type: PageType.GENERIC,
    excerpt: '',
    meta_title: '',
    meta_description: '',
    status: ContentStatus.DRAFT,
    show_in_navigation: false,
    navigation_order: 0,
  })
  const [showSettings, setShowSettings] = useState(true)
  const [hasChanges, setHasChanges] = useState(false)

  // Fetch existing page
  const { data: page, isLoading: pageLoading, error: pageError } = useQuery({
    queryKey: ['cms-page', pageId],
    queryFn: () => cmsPages.get(pageId!),
    enabled: !isNew && !!pageId,
  })

  // Populate form when page data loads
  useEffect(() => {
    if (page) {
      setFormData({
        title: page.title,
        slug: page.slug,
        page_type: page.page_type,
        excerpt: page.excerpt,
        meta_title: page.meta_title,
        meta_description: page.meta_description,
        status: page.status,
        show_in_navigation: page.show_in_navigation,
        navigation_order: page.navigation_order,
      })
    }
  }, [page])

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: CMSPageInput) => cmsPages.create(data),
    onSuccess: (newPage) => {
      queryClient.invalidateQueries({ queryKey: ['cms-pages'] })
      showToast('Page created successfully', 'success')
      navigate(`/dashboard/cms/pages/${newPage.id}`)
    },
    onError: () => {
      showToast('Failed to create page', 'error')
    },
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: Partial<CMSPageInput>) => cmsPages.update(pageId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-pages'] })
      queryClient.invalidateQueries({ queryKey: ['cms-page', pageId] })
      showToast('Page saved successfully', 'success')
      setHasChanges(false)
    },
    onError: () => {
      showToast('Failed to save page', 'error')
    },
  })

  const handleChange = (field: keyof Omit<CMSPageInput, 'content'>, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setHasChanges(true)
  }

  const handleContentChange = () => {
    // Just mark as changed - we'll get content from editor on save
    setHasChanges(true)
  }

  // Auto-generate slug from title
  const handleTitleChange = (title: string) => {
    handleChange('title', title)
    if (isNew || !page?.slug) {
      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
      handleChange('slug', slug)
    }
  }

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      showToast('Title is required', 'error')
      return
    }

    // Get content from editor
    const content = await editorRef.current?.save()

    const submitData: CMSPageInput = {
      ...formData,
      content: content || defaultContent,
    }

    if (isNew) {
      createMutation.mutate(submitData)
    } else {
      updateMutation.mutate(submitData)
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  // Access check
  if (!user || ![UserRole.ADMIN, UserRole.RECRUITER].includes(user.role)) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-4" />
        <p className="text-[15px] text-gray-700 dark:text-gray-300 mb-2">Access Denied</p>
        <p className="text-[13px] text-gray-500 dark:text-gray-400">
          You do not have permission to edit CMS pages.
        </p>
      </div>
    )
  }

  // Loading state
  if (!isNew && pageLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  // Error state
  if (!isNew && pageError) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-4" />
        <p className="text-[15px] text-gray-700 dark:text-gray-300 mb-2">Page not found</p>
        <Link
          to="/dashboard/cms/pages"
          className="text-[13px] text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 underline"
        >
          Back to pages
        </Link>
      </div>
    )
  }

  // Determine initial content for editor
  const initialContent = isNew ? defaultContent : (page?.content || defaultContent)

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 -mx-6 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/dashboard/cms/pages"
              className="flex items-center gap-1 text-[13px] text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Link>
            <div className="h-4 w-px bg-gray-200 dark:bg-gray-700" />
            <h1 className="text-[16px] font-medium text-gray-900 dark:text-gray-100">
              {isNew ? 'New Page' : 'Edit Page'}
            </h1>
            {hasChanges && (
              <span className="text-[11px] text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 px-2 py-0.5 rounded">
                Unsaved changes
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Status Selector */}
            <select
              value={formData.status}
              onChange={(e) => handleChange('status', e.target.value)}
              className="px-3 py-1.5 text-[12px] border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {/* Settings Toggle */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] border rounded-md transition-colors ${
                showSettings
                  ? 'border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <Settings2 className="w-4 h-4" />
              Settings
            </button>

            {/* Preview (only for existing published pages) */}
            {!isNew && page?.status === ContentStatus.PUBLISHED && (
              <Link
                to={`/${page.slug}`}
                target="_blank"
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <Eye className="w-4 h-4" />
                Preview
              </Link>
            )}

            {/* Save Button */}
            <button
              onClick={handleSubmit}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-1.5 text-[12px] font-medium text-white bg-gray-900 dark:bg-gray-100 dark:text-gray-900 rounded-md hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isNew ? 'Create' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex gap-6 mt-6">
        {/* Editor Area */}
        <div className="flex-1 min-w-0">
          {/* Title Input */}
          <input
            type="text"
            placeholder="Page Title"
            value={formData.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="w-full text-[28px] font-semibold text-gray-900 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-600 bg-transparent border-0 focus:outline-none focus:ring-0 mb-4"
          />

          {/* Excerpt */}
          <textarea
            placeholder="Brief description or excerpt..."
            value={formData.excerpt}
            onChange={(e) => handleChange('excerpt', e.target.value)}
            rows={2}
            className="w-full text-[14px] text-gray-600 dark:text-gray-400 placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600 mb-4 resize-none"
          />

          {/* Block Editor - key ensures fresh instance for each page */}
          <BlockEditor
            key={pageId || 'new'}
            ref={editorRef}
            initialData={initialContent}
            onChange={handleContentChange}
            placeholder="Start writing your page content..."
            minHeight={400}
            editorId={`page-editor-${pageId || 'new'}`}
          />
        </div>

        {/* Settings Sidebar */}
        {showSettings && (
          <div className="w-80 flex-shrink-0">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 sticky top-20">
              <h3 className="text-[14px] font-medium text-gray-900 dark:text-gray-100 mb-4">Page Settings</h3>

              {/* Slug */}
              <div className="mb-4">
                <label className="block text-[12px] font-medium text-gray-700 dark:text-gray-300 mb-1">
                  URL Slug
                </label>
                <div className="flex items-center">
                  <span className="text-[12px] text-gray-500 dark:text-gray-400 mr-1">/</span>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => handleChange('slug', e.target.value)}
                    className="flex-1 px-2 py-1.5 text-[12px] border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600"
                  />
                </div>
              </div>

              {/* Page Type */}
              <div className="mb-4">
                <label className="block text-[12px] font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Page Type
                </label>
                <select
                  value={formData.page_type}
                  onChange={(e) => handleChange('page_type', e.target.value)}
                  className="w-full px-3 py-1.5 text-[12px] border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600"
                >
                  {TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Navigation Settings */}
              <div className="mb-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.show_in_navigation}
                    onChange={(e) => handleChange('show_in_navigation', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:ring-gray-500 dark:focus:ring-gray-400"
                  />
                  <span className="text-[12px] text-gray-700 dark:text-gray-300">Show in navigation</span>
                </label>
              </div>

              {formData.show_in_navigation && (
                <div className="mb-4">
                  <label className="block text-[12px] font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Navigation Order
                  </label>
                  <input
                    type="number"
                    value={formData.navigation_order}
                    onChange={(e) => handleChange('navigation_order', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 text-[12px] border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600"
                  />
                </div>
              )}

              {/* SEO Section */}
              <div className="border-t border-gray-200 dark:border-gray-700 mt-4 pt-4">
                <h4 className="text-[12px] font-medium text-gray-900 dark:text-gray-100 mb-3">SEO</h4>

                <div className="mb-4">
                  <label className="block text-[12px] font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Meta Title
                  </label>
                  <input
                    type="text"
                    value={formData.meta_title}
                    onChange={(e) => handleChange('meta_title', e.target.value)}
                    placeholder={formData.title || 'Page title'}
                    maxLength={60}
                    className="w-full px-3 py-1.5 text-[12px] border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600"
                  />
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                    {(formData.meta_title || formData.title).length}/60 · "{seoDefaults.titleSuffix}" added automatically
                  </span>
                </div>

                <div className="mb-4">
                  <label className="block text-[12px] font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Meta Description
                  </label>
                  <textarea
                    value={formData.meta_description}
                    onChange={(e) => handleChange('meta_description', e.target.value)}
                    placeholder={formData.excerpt || 'Page description for search engines'}
                    maxLength={160}
                    rows={3}
                    className="w-full px-3 py-1.5 text-[12px] border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600 resize-none"
                  />
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                    {(formData.meta_description || formData.excerpt).length}/160
                  </span>
                </div>
              </div>

              {/* Page Info (for existing pages) */}
              {!isNew && page && (
                <div className="border-t border-gray-200 dark:border-gray-700 mt-4 pt-4">
                  <h4 className="text-[12px] font-medium text-gray-900 dark:text-gray-100 mb-3">Info</h4>
                  <div className="space-y-2 text-[11px] text-gray-500 dark:text-gray-400">
                    <p>
                      Created: {new Date(page.created_at).toLocaleString()}
                      {page.created_by_name && ` by ${page.created_by_name}`}
                    </p>
                    <p>
                      Updated: {new Date(page.updated_at).toLocaleString()}
                      {page.updated_by_name && ` by ${page.updated_by_name}`}
                    </p>
                    {page.published_at && (
                      <p>Published: {new Date(page.published_at).toLocaleString()}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
