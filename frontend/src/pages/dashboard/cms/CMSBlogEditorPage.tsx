// CMS Blog Post Editor Page
import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cmsBlog, cmsFAQs } from '@/services/cms'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { useSEODefaults } from '@/contexts/SEOContext'
import { BlockEditor, type BlockEditorHandle } from '@/components/cms'
import { UserRole, ContentStatus } from '@/types'
import type { CMSBlogPostInput, EditorJSData } from '@/types'
import {
  ArrowLeft,
  Save,
  Eye,
  AlertCircle,
  Loader2,
  Settings2,
  Image as ImageIcon,
  Star,
  X,
  Plus,
  HelpCircle,
  Check,
} from 'lucide-react'

const STATUS_OPTIONS = [
  { value: ContentStatus.DRAFT, label: 'Draft' },
  { value: ContentStatus.PUBLISHED, label: 'Published' },
  { value: ContentStatus.ARCHIVED, label: 'Archived' },
]

const CATEGORY_SUGGESTIONS = [
  'Industry Insights',
  'Hiring Tips',
  'Career Advice',
  'Company News',
  'Product Updates',
  'Case Studies',
  'Trends',
  'Best Practices',
]

const defaultContent: EditorJSData = {
  time: Date.now(),
  blocks: [],
  version: '2.28.0',
}

export default function CMSBlogEditorPage() {
  const { postId } = useParams<{ postId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const seoDefaults = useSEODefaults()
  const editorRef = useRef<BlockEditorHandle>(null)

  const isNew = !postId

  // Form state (excludes content - managed by Editor.js)
  const [formData, setFormData] = useState<Omit<CMSBlogPostInput, 'content'>>({
    title: '',
    slug: '',
    excerpt: '',
    category: '',
    tags: [],
    meta_title: '',
    meta_description: '',
    status: ContentStatus.DRAFT,
    is_featured: false,
    featured_image_alt: '',
  })
  const [showSettings, setShowSettings] = useState(true)
  const [hasChanges, setHasChanges] = useState(false)
  const [newTag, setNewTag] = useState('')
  const [featuredImagePreview, setFeaturedImagePreview] = useState<string | null>(null)
  const [featuredImageFile, setFeaturedImageFile] = useState<File | null>(null)
  const [selectedFaqIds, setSelectedFaqIds] = useState<string[]>([])

  // Fetch all active FAQs for selection
  const { data: allFaqs = [] } = useQuery({
    queryKey: ['cms-all-faqs-active'],
    queryFn: () => cmsFAQs.list({ is_active: true }),
  })

  // Fetch existing post
  const { data: post, isLoading: postLoading, error: postError } = useQuery({
    queryKey: ['cms-blog-post', postId],
    queryFn: () => cmsBlog.get(postId!),
    enabled: !isNew && !!postId,
  })

  // Populate form when post data loads
  useEffect(() => {
    if (post) {
      setFormData({
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        category: post.category,
        tags: post.tags,
        meta_title: post.meta_title,
        meta_description: post.meta_description,
        status: post.status,
        is_featured: post.is_featured,
        featured_image_alt: post.featured_image_alt,
      })
      if (post.featured_image) {
        setFeaturedImagePreview(post.featured_image)
      }
      // Set selected FAQs
      if (post.faq_ids) {
        setSelectedFaqIds(post.faq_ids)
      }
    }
  }, [post])

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: CMSBlogPostInput) => cmsBlog.create(data),
    onSuccess: (newPost) => {
      queryClient.invalidateQueries({ queryKey: ['cms-blog'] })
      showToast('Blog post created successfully', 'success')
      navigate(`/dashboard/cms/blog/${newPost.id}`)
    },
    onError: () => {
      showToast('Failed to create blog post', 'error')
    },
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: Partial<CMSBlogPostInput>) => cmsBlog.update(postId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-blog'] })
      queryClient.invalidateQueries({ queryKey: ['cms-blog-post', postId] })
      showToast('Blog post saved successfully', 'success')
      setHasChanges(false)
    },
    onError: () => {
      showToast('Failed to save blog post', 'error')
    },
  })

  const handleChange = (field: keyof Omit<CMSBlogPostInput, 'content'>, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setHasChanges(true)
  }

  const handleContentChange = () => {
    setHasChanges(true)
  }

  // Auto-generate slug from title
  const handleTitleChange = (title: string) => {
    handleChange('title', title)
    if (isNew || !post?.slug) {
      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
      handleChange('slug', slug)
    }
  }

  const handleFeaturedImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFeaturedImageFile(file)
      const reader = new FileReader()
      reader.onload = () => {
        setFeaturedImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
      setHasChanges(true)
    }
  }

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags?.includes(newTag.trim())) {
      handleChange('tags', [...(formData.tags || []), newTag.trim()])
      setNewTag('')
    }
  }

  const handleRemoveTag = (tag: string) => {
    handleChange('tags', formData.tags?.filter((t) => t !== tag) || [])
  }

  const handleToggleFaq = (faqId: string) => {
    setSelectedFaqIds((prev) => {
      if (prev.includes(faqId)) {
        return prev.filter((id) => id !== faqId)
      }
      return [...prev, faqId]
    })
    setHasChanges(true)
  }

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      showToast('Title is required', 'error')
      return
    }

    // Get content from editor
    const content = await editorRef.current?.save()

    const submitData: CMSBlogPostInput = {
      ...formData,
      content: content || defaultContent,
      faq_ids: selectedFaqIds,
      ...(featuredImageFile && { featured_image: featuredImageFile }),
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
          You do not have permission to edit blog posts.
        </p>
      </div>
    )
  }

  // Loading state
  if (!isNew && postLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  // Error state
  if (!isNew && postError) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-4" />
        <p className="text-[15px] text-gray-700 dark:text-gray-300 mb-2">Blog post not found</p>
        <Link
          to="/dashboard/cms/blog"
          className="text-[13px] text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 underline"
        >
          Back to blog posts
        </Link>
      </div>
    )
  }

  // Determine initial content for editor
  const initialContent = isNew ? defaultContent : (post?.content || defaultContent)

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 -mx-6 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/dashboard/cms/blog"
              className="flex items-center gap-1 text-[13px] text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Link>
            <div className="h-4 w-px bg-gray-200 dark:bg-gray-700" />
            <h1 className="text-[16px] font-medium text-gray-900 dark:text-gray-100">
              {isNew ? 'New Blog Post' : 'Edit Post'}
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

            {/* Featured Toggle */}
            <button
              onClick={() => handleChange('is_featured', !formData.is_featured)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] border rounded-md transition-colors ${
                formData.is_featured
                  ? 'border-yellow-300 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                  : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <Star className={`w-4 h-4 ${formData.is_featured ? 'fill-yellow-500' : ''}`} />
              Featured
            </button>

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

            {/* Preview */}
            {!isNew && post?.slug && (
              <Link
                to={`/blog/${post.slug}?preview=true`}
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
            placeholder="Blog Post Title"
            value={formData.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="w-full text-[28px] font-semibold text-gray-900 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-600 bg-transparent border-0 focus:outline-none focus:ring-0 mb-4"
          />

          {/* Excerpt */}
          <textarea
            placeholder="Write a brief excerpt or summary..."
            value={formData.excerpt}
            onChange={(e) => handleChange('excerpt', e.target.value)}
            rows={2}
            className="w-full text-[14px] text-gray-600 dark:text-gray-400 placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600 mb-4 resize-none"
          />

          {/* Block Editor */}
          <BlockEditor
            key={postId || 'new'}
            ref={editorRef}
            initialData={initialContent}
            onChange={handleContentChange}
            placeholder="Start writing your blog post..."
            minHeight={400}
            editorId={`blog-editor-${postId || 'new'}`}
          />
        </div>

        {/* Settings Sidebar */}
        {showSettings && (
          <div className="w-80 flex-shrink-0">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 sticky top-20">
              <h3 className="text-[14px] font-medium text-gray-900 dark:text-gray-100 mb-4">Post Settings</h3>

              {/* Featured Image */}
              <div className="mb-4">
                <label className="block text-[12px] font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Featured Image
                </label>
                {featuredImagePreview ? (
                  <div className="relative aspect-video bg-gray-100 dark:bg-gray-700 rounded-md overflow-hidden">
                    <img
                      src={featuredImagePreview}
                      alt="Featured"
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => {
                        setFeaturedImagePreview(null)
                        setFeaturedImageFile(null)
                        setHasChanges(true)
                      }}
                      className="absolute top-1.5 right-1.5 p-1 bg-white dark:bg-gray-800 rounded-full shadow dark:shadow-gray-900/40 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <X className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center aspect-video bg-gray-50 dark:bg-gray-800 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-md cursor-pointer hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
                    <ImageIcon className="w-6 h-6 text-gray-400 dark:text-gray-500 mb-1" />
                    <span className="text-[11px] text-gray-500 dark:text-gray-400">Add image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFeaturedImageChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Featured Image Alt */}
              {featuredImagePreview && (
                <div className="mb-4">
                  <label className="block text-[12px] font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Image Alt Text
                  </label>
                  <input
                    type="text"
                    value={formData.featured_image_alt}
                    onChange={(e) => handleChange('featured_image_alt', e.target.value)}
                    placeholder="Describe the image"
                    className="w-full px-3 py-1.5 text-[12px] border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600"
                  />
                </div>
              )}

              {/* Slug */}
              <div className="mb-4">
                <label className="block text-[12px] font-medium text-gray-700 dark:text-gray-300 mb-1">
                  URL Slug
                </label>
                <div className="flex items-center">
                  <span className="text-[12px] text-gray-500 dark:text-gray-400 mr-1">/blog/</span>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => handleChange('slug', e.target.value)}
                    className="flex-1 px-2 py-1.5 text-[12px] border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600"
                  />
                </div>
              </div>

              {/* Category */}
              <div className="mb-4">
                <label className="block text-[12px] font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => handleChange('category', e.target.value)}
                  placeholder="e.g., Industry Insights"
                  list="category-suggestions"
                  className="w-full px-3 py-1.5 text-[12px] border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600"
                />
                <datalist id="category-suggestions">
                  {CATEGORY_SUGGESTIONS.map((cat) => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>

              {/* Tags */}
              <div className="mb-4">
                <label className="block text-[12px] font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tags
                </label>
                <div className="flex flex-wrap gap-1 mb-2">
                  {formData.tags?.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                    >
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-gray-900 dark:hover:text-gray-100"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    placeholder="Add tag..."
                    className="flex-1 px-2 py-1.5 text-[12px] border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600"
                  />
                  <button
                    onClick={handleAddTag}
                    className="px-2 py-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-md"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

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
                    placeholder={formData.title || 'Post title'}
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
                    placeholder={formData.excerpt || 'Post description for search engines'}
                    maxLength={160}
                    rows={3}
                    className="w-full px-3 py-1.5 text-[12px] border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600 resize-none"
                  />
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                    {(formData.meta_description || formData.excerpt).length}/160
                  </span>
                </div>
              </div>

              {/* FAQs Section */}
              <div className="border-t border-gray-200 dark:border-gray-700 mt-4 pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <HelpCircle className="w-4 h-4 text-purple-500" />
                  <h4 className="text-[12px] font-medium text-gray-900 dark:text-gray-100">FAQs</h4>
                  {selectedFaqIds.length > 0 && (
                    <span className="text-[10px] bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-1.5 py-0.5 rounded">
                      {selectedFaqIds.length} selected
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-3">
                  Select FAQs to display at the bottom of this post.
                </p>

                {allFaqs.length === 0 ? (
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 italic">No FAQs available</p>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-1 border border-gray-100 dark:border-gray-800 rounded-md p-2">
                    {allFaqs.map((faq) => (
                      <button
                        key={faq.id}
                        type="button"
                        onClick={() => handleToggleFaq(faq.id)}
                        className={`w-full flex items-start gap-2 p-2 rounded text-left transition-colors ${
                          selectedFaqIds.includes(faq.id)
                            ? 'bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800 border border-transparent'
                        }`}
                      >
                        <div
                          className={`flex-shrink-0 w-4 h-4 rounded border mt-0.5 flex items-center justify-center ${
                            selectedFaqIds.includes(faq.id)
                              ? 'bg-purple-500 border-purple-500'
                              : 'border-gray-300 dark:border-gray-600'
                          }`}
                        >
                          {selectedFaqIds.includes(faq.id) && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </div>
                        <span className="text-[11px] text-gray-700 dark:text-gray-300 line-clamp-2">
                          {faq.question}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Post Info */}
              {!isNew && post && (
                <div className="border-t border-gray-200 dark:border-gray-700 mt-4 pt-4">
                  <h4 className="text-[12px] font-medium text-gray-900 dark:text-gray-100 mb-3">Info</h4>
                  <div className="space-y-2 text-[11px] text-gray-500 dark:text-gray-400">
                    {post.author_name && <p>Author: {post.author_name}</p>}
                    <p>Created: {new Date(post.created_at).toLocaleString()}</p>
                    <p>Updated: {new Date(post.updated_at).toLocaleString()}</p>
                    {post.published_at && (
                      <p>Published: {new Date(post.published_at).toLocaleString()}</p>
                    )}
                    <p>Views: {post.view_count}</p>
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
