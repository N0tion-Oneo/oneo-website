// CMS Case Study Editor Page
import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cmsCaseStudies } from '@/services/cms'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { useSEODefaults } from '@/contexts/SEOContext'
import { BlockEditor, type BlockEditorHandle } from '@/components/cms'
import { UserRole, ContentStatus } from '@/types'
import type { EditorJSData, CMSCaseStudyHighlight } from '@/types'
import {
  ArrowLeft,
  Save,
  Eye,
  AlertCircle,
  Loader2,
  Settings2,
  Star,
  Plus,
  X,
  Quote,
  ImageIcon,
  Building2,
} from 'lucide-react'

const STATUS_OPTIONS = [
  { value: ContentStatus.DRAFT, label: 'Draft' },
  { value: ContentStatus.PUBLISHED, label: 'Published' },
  { value: ContentStatus.ARCHIVED, label: 'Archived' },
]

const defaultContent: EditorJSData = {
  time: Date.now(),
  blocks: [],
  version: '2.28.0',
}

export default function CMSCaseStudyEditorPage() {
  const { studyId } = useParams<{ studyId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const seoDefaults = useSEODefaults()
  const editorRef = useRef<BlockEditorHandle>(null)

  const isNew = !studyId

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    excerpt: '',
    client_name: '',
    industry: '',
    highlights: [] as CMSCaseStudyHighlight[],
    testimonial_quote: '',
    testimonial_author: '',
    testimonial_role: '',
    meta_title: '',
    meta_description: '',
    status: ContentStatus.DRAFT,
    is_featured: false,
  })
  const [showSettings, setShowSettings] = useState(true)
  const [hasChanges, setHasChanges] = useState(false)
  const [featuredImagePreview, setFeaturedImagePreview] = useState<string | null>(null)
  const [featuredImageFile, setFeaturedImageFile] = useState<File | null>(null)
  const [clientLogoPreview, setClientLogoPreview] = useState<string | null>(null)
  const [clientLogoFile, setClientLogoFile] = useState<File | null>(null)

  // Fetch existing case study
  const { data: study, isLoading: studyLoading, error: studyError } = useQuery({
    queryKey: ['cms', 'case-studies', studyId],
    queryFn: () => cmsCaseStudies.get(studyId!),
    enabled: !isNew && !!studyId,
  })

  // Populate form when study data loads
  useEffect(() => {
    if (study) {
      setFormData({
        title: study.title,
        slug: study.slug,
        excerpt: study.excerpt || '',
        client_name: study.client_name || '',
        industry: study.industry || '',
        highlights: study.highlights || [],
        testimonial_quote: study.testimonial_quote || '',
        testimonial_author: study.testimonial_author || '',
        testimonial_role: study.testimonial_role || '',
        meta_title: study.meta_title || '',
        meta_description: study.meta_description || '',
        status: study.status,
        is_featured: study.is_featured,
      })
      // Set image previews
      if (study.featured_image) {
        setFeaturedImagePreview(study.featured_image)
      }
      if (study.client_logo) {
        setClientLogoPreview(study.client_logo)
      }
    }
  }, [study])

  // Create mutation
  const createMutation = useMutation({
    mutationFn: cmsCaseStudies.create,
    onSuccess: (newStudy) => {
      queryClient.invalidateQueries({ queryKey: ['cms', 'case-studies'] })
      showToast('Case study created successfully', 'success')
      navigate(`/dashboard/cms/case-studies/${newStudy.id}`)
    },
    onError: () => {
      showToast('Failed to create case study', 'error')
    },
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: Parameters<typeof cmsCaseStudies.update>[1]) =>
      cmsCaseStudies.update(studyId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms', 'case-studies'] })
      queryClient.invalidateQueries({ queryKey: ['cms', 'case-studies', studyId] })
      showToast('Case study saved successfully', 'success')
      setHasChanges(false)
    },
    onError: () => {
      showToast('Failed to save case study', 'error')
    },
  })

  const handleChange = (field: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setHasChanges(true)
  }

  const handleContentChange = () => {
    setHasChanges(true)
  }

  // Auto-generate slug from title
  const handleTitleChange = (title: string) => {
    handleChange('title', title)
    if (isNew || !study?.slug) {
      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
      handleChange('slug', slug)
    }
  }

  // Highlight management
  const addHighlight = () => {
    setFormData((prev) => ({
      ...prev,
      highlights: [...prev.highlights, { label: '', value: '' }],
    }))
    setHasChanges(true)
  }

  const updateHighlight = (index: number, field: 'label' | 'value', value: string) => {
    setFormData((prev) => ({
      ...prev,
      highlights: prev.highlights.map((h, i) =>
        i === index ? { ...h, [field]: value } : h
      ),
    }))
    setHasChanges(true)
  }

  const removeHighlight = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      highlights: prev.highlights.filter((_, i) => i !== index),
    }))
    setHasChanges(true)
  }

  // Image handlers
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

  const handleClientLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setClientLogoFile(file)
      const reader = new FileReader()
      reader.onload = () => {
        setClientLogoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
      setHasChanges(true)
    }
  }

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      showToast('Title is required', 'error')
      return
    }

    // Get content from editor
    const content = await editorRef.current?.save()

    const submitData = {
      ...formData,
      content: content || defaultContent,
      ...(featuredImageFile && { featured_image: featuredImageFile }),
      ...(clientLogoFile && { client_logo: clientLogoFile }),
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
          You do not have permission to edit case studies.
        </p>
      </div>
    )
  }

  // Loading state
  if (!isNew && studyLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  // Error state
  if (!isNew && studyError) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-4" />
        <p className="text-[15px] text-gray-700 dark:text-gray-300 mb-2">Case study not found</p>
        <Link
          to="/dashboard/cms/case-studies"
          className="text-[13px] text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 underline"
        >
          Back to case studies
        </Link>
      </div>
    )
  }

  // Determine initial content for editor
  const initialContent = isNew ? defaultContent : (study?.content || defaultContent)

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 -mx-6 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/dashboard/cms/case-studies"
              className="flex items-center gap-1 text-[13px] text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Link>
            <div className="h-4 w-px bg-gray-200 dark:bg-gray-700" />
            <h1 className="text-[16px] font-medium text-gray-900 dark:text-gray-100">
              {isNew ? 'New Case Study' : 'Edit Case Study'}
            </h1>
            {hasChanges && (
              <span className="text-[11px] text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-2 py-0.5 rounded">
                Unsaved changes
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Status Selector */}
            <select
              value={formData.status}
              onChange={(e) => handleChange('status', e.target.value)}
              className="px-3 py-1.5 text-[12px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
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
                  ? 'border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400'
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
            {!isNew && study?.slug && (
              <Link
                to={`/case-studies/${study.slug}?preview=true`}
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
            placeholder="Case Study Title"
            value={formData.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="w-full text-[28px] font-semibold text-gray-900 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-600 border-0 focus:outline-none focus:ring-0 mb-2 bg-transparent"
          />

          {/* Client & Industry */}
          <div className="flex items-center gap-4 mb-4">
            <input
              type="text"
              placeholder="Client Name"
              value={formData.client_name}
              onChange={(e) => handleChange('client_name', e.target.value)}
              className="text-[14px] text-gray-600 dark:text-gray-400 placeholder-gray-400 dark:placeholder-gray-500 border-b border-gray-200 dark:border-gray-700 px-1 py-1 focus:outline-none focus:border-gray-400 dark:focus:border-gray-500 bg-transparent"
            />
            <span className="text-gray-300 dark:text-gray-600">•</span>
            <input
              type="text"
              placeholder="Industry"
              value={formData.industry}
              onChange={(e) => handleChange('industry', e.target.value)}
              className="text-[14px] text-gray-600 dark:text-gray-400 placeholder-gray-400 dark:placeholder-gray-500 border-b border-gray-200 dark:border-gray-700 px-1 py-1 focus:outline-none focus:border-gray-400 dark:focus:border-gray-500 bg-transparent"
            />
          </div>

          {/* Excerpt */}
          <textarea
            placeholder="Write a brief summary of this case study..."
            value={formData.excerpt}
            onChange={(e) => handleChange('excerpt', e.target.value)}
            rows={2}
            className="w-full text-[14px] text-gray-600 dark:text-gray-400 placeholder-gray-400 dark:placeholder-gray-500 border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600 mb-4 resize-none bg-white dark:bg-gray-900"
          />

          {/* Key Highlights */}
          <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[13px] font-medium text-gray-700 dark:text-gray-300">Key Highlights</h3>
              <button
                type="button"
                onClick={addHighlight}
                className="flex items-center gap-1 text-[12px] text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>
            {formData.highlights.length === 0 ? (
              <p className="text-[12px] text-gray-400 dark:text-gray-500 text-center py-3">
                Add key metrics like "50% time saved" or "200+ hires"
              </p>
            ) : (
              <div className="space-y-2">
                {formData.highlights.map((highlight, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={highlight.label}
                      onChange={(e) => updateHighlight(index, 'label', e.target.value)}
                      placeholder="Label"
                      className="flex-1 px-2 py-1.5 text-[12px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                    />
                    <input
                      type="text"
                      value={highlight.value}
                      onChange={(e) => updateHighlight(index, 'value', e.target.value)}
                      placeholder="Value"
                      className="w-24 px-2 py-1.5 text-[12px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                    />
                    <button
                      type="button"
                      onClick={() => removeHighlight(index)}
                      className="p-1 text-gray-400 hover:text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Block Editor */}
          <BlockEditor
            key={studyId || 'new'}
            ref={editorRef}
            initialData={initialContent}
            onChange={handleContentChange}
            placeholder="Write the full case study content..."
            minHeight={300}
            editorId={`case-study-editor-${studyId || 'new'}`}
          />

          {/* Testimonial Section */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
            <div className="flex items-center gap-2 mb-3">
              <Quote className="w-4 h-4 text-blue-500 dark:text-blue-400" />
              <h3 className="text-[13px] font-medium text-gray-700 dark:text-gray-300">Client Testimonial</h3>
            </div>
            <textarea
              placeholder="What did the client say about working with you?"
              value={formData.testimonial_quote}
              onChange={(e) => handleChange('testimonial_quote', e.target.value)}
              rows={3}
              className="w-full text-[13px] text-gray-600 dark:text-gray-400 placeholder-gray-400 dark:placeholder-gray-500 border border-blue-200 dark:border-blue-700 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-300 dark:focus:ring-blue-600 mb-3 resize-none bg-white dark:bg-gray-900"
            />
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Author name"
                value={formData.testimonial_author}
                onChange={(e) => handleChange('testimonial_author', e.target.value)}
                className="flex-1 px-3 py-1.5 text-[12px] border border-blue-200 dark:border-blue-700 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-300 dark:focus:ring-blue-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              />
              <input
                type="text"
                placeholder="Role & Company"
                value={formData.testimonial_role}
                onChange={(e) => handleChange('testimonial_role', e.target.value)}
                className="flex-1 px-3 py-1.5 text-[12px] border border-blue-200 dark:border-blue-700 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-300 dark:focus:ring-blue-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
        </div>

        {/* Settings Sidebar */}
        {showSettings && (
          <div className="w-80 flex-shrink-0">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 sticky top-20">
              <h3 className="text-[14px] font-medium text-gray-900 dark:text-gray-100 mb-4">Case Study Settings</h3>

              {/* Featured Image */}
              <div className="mb-4">
                <label className="block text-[12px] font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Featured Image
                </label>
                {featuredImagePreview ? (
                  <div className="relative aspect-video bg-gray-100 dark:bg-gray-800 rounded-md overflow-hidden">
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

              {/* Client Logo */}
              <div className="mb-4">
                <label className="block text-[12px] font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Client Logo
                </label>
                {clientLogoPreview ? (
                  <div className="relative h-16 bg-gray-50 dark:bg-gray-800 rounded-md overflow-hidden flex items-center justify-center p-2">
                    <img
                      src={clientLogoPreview}
                      alt="Client Logo"
                      className="max-h-full max-w-full object-contain"
                    />
                    <button
                      onClick={() => {
                        setClientLogoPreview(null)
                        setClientLogoFile(null)
                        setHasChanges(true)
                      }}
                      className="absolute top-1 right-1 p-1 bg-white dark:bg-gray-800 rounded-full shadow dark:shadow-gray-900/40 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <X className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 h-16 bg-gray-50 dark:bg-gray-800 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-md cursor-pointer hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
                    <Building2 className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                    <span className="text-[11px] text-gray-500 dark:text-gray-400">Add logo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleClientLogoChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Slug */}
              <div className="mb-4">
                <label className="block text-[12px] font-medium text-gray-700 dark:text-gray-300 mb-1">
                  URL Slug
                </label>
                <div className="flex items-center">
                  <span className="text-[12px] text-gray-500 dark:text-gray-400 mr-1">/case-studies/</span>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => handleChange('slug', e.target.value)}
                    className="flex-1 px-2 py-1.5 text-[12px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
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
                    placeholder={formData.title || 'Case study title'}
                    maxLength={60}
                    className="w-full px-3 py-1.5 text-[12px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                  <span className="text-[10px] text-gray-400 mt-1">
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
                    placeholder={formData.excerpt || 'Case study description for search engines'}
                    maxLength={160}
                    rows={3}
                    className="w-full px-3 py-1.5 text-[12px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600 resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                  <span className="text-[10px] text-gray-400 mt-1">
                    {(formData.meta_description || formData.excerpt).length}/160
                  </span>
                </div>
              </div>

              {/* Case Study Info */}
              {!isNew && study && (
                <div className="border-t border-gray-200 dark:border-gray-700 mt-4 pt-4">
                  <h4 className="text-[12px] font-medium text-gray-900 dark:text-gray-100 mb-3">Info</h4>
                  <div className="space-y-2 text-[11px] text-gray-500 dark:text-gray-400">
                    <p>Created: {new Date(study.created_at).toLocaleString()}</p>
                    <p>Updated: {new Date(study.updated_at).toLocaleString()}</p>
                    {study.published_at && (
                      <p>Published: {new Date(study.published_at).toLocaleString()}</p>
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
