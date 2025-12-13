// CMS Glossary Term Editor Page
import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cmsGlossary, cmsFAQs } from '@/services/cms'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { useSEODefaults } from '@/contexts/SEOContext'
import { BlockEditor, type BlockEditorHandle } from '@/components/cms'
import { UserRole } from '@/types'
import type { EditorJSData } from '@/types'
import {
  ArrowLeft,
  Save,
  Eye,
  AlertCircle,
  Loader2,
  Settings2,
  HelpCircle,
  Check,
} from 'lucide-react'

const defaultContent: EditorJSData = {
  time: Date.now(),
  blocks: [],
  version: '2.28.0',
}

export default function CMSGlossaryEditorPage() {
  const { termId } = useParams<{ termId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const seoDefaults = useSEODefaults()
  const editorRef = useRef<BlockEditorHandle>(null)

  const isNew = !termId

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    definition_plain: '',
    meta_title: '',
    meta_description: '',
    is_active: true,
  })
  const [showSettings, setShowSettings] = useState(true)
  const [hasChanges, setHasChanges] = useState(false)
  const [selectedFaqIds, setSelectedFaqIds] = useState<string[]>([])

  // Fetch all active FAQs for selection
  const { data: allFaqs = [] } = useQuery({
    queryKey: ['cms-all-faqs-active'],
    queryFn: () => cmsFAQs.list({ is_active: true }),
  })

  // Fetch existing term
  const { data: term, isLoading: termLoading, error: termError } = useQuery({
    queryKey: ['cms', 'glossary', termId],
    queryFn: () => cmsGlossary.get(termId!),
    enabled: !isNew && !!termId,
  })

  // Populate form when term data loads
  useEffect(() => {
    if (term) {
      setFormData({
        title: term.title,
        slug: term.slug,
        definition_plain: term.definition_plain || '',
        meta_title: term.meta_title || '',
        meta_description: term.meta_description || '',
        is_active: term.is_active,
      })
      if (term.faq_ids) {
        setSelectedFaqIds(term.faq_ids)
      }
    }
  }, [term])

  // Create mutation
  const createMutation = useMutation({
    mutationFn: cmsGlossary.create,
    onSuccess: (newTerm) => {
      queryClient.invalidateQueries({ queryKey: ['cms', 'glossary'] })
      showToast('Glossary term created successfully', 'success')
      navigate(`/dashboard/cms/glossary/${newTerm.id}`)
    },
    onError: () => {
      showToast('Failed to create glossary term', 'error')
    },
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: Parameters<typeof cmsGlossary.update>[1]) =>
      cmsGlossary.update(termId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms', 'glossary'] })
      queryClient.invalidateQueries({ queryKey: ['cms', 'glossary', termId] })
      showToast('Glossary term saved successfully', 'success')
      setHasChanges(false)
    },
    onError: () => {
      showToast('Failed to save glossary term', 'error')
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
    if (isNew || !term?.slug) {
      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
      handleChange('slug', slug)
    }
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

    const submitData = {
      ...formData,
      content: content || defaultContent,
      faq_ids: selectedFaqIds,
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
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-4" />
        <p className="text-[15px] text-gray-700 mb-2">Access Denied</p>
        <p className="text-[13px] text-gray-500">
          You do not have permission to edit glossary terms.
        </p>
      </div>
    )
  }

  // Loading state
  if (!isNew && termLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  // Error state
  if (!isNew && termError) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-4" />
        <p className="text-[15px] text-gray-700 mb-2">Glossary term not found</p>
        <Link
          to="/dashboard/cms/glossary"
          className="text-[13px] text-gray-500 hover:text-gray-700 underline"
        >
          Back to glossary
        </Link>
      </div>
    )
  }

  // Determine initial content for editor
  const initialContent = isNew ? defaultContent : (term?.content || defaultContent)

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 -mx-6 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/dashboard/cms/glossary"
              className="flex items-center gap-1 text-[13px] text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Link>
            <div className="h-4 w-px bg-gray-200" />
            <h1 className="text-[16px] font-medium text-gray-900">
              {isNew ? 'New Glossary Term' : 'Edit Term'}
            </h1>
            {hasChanges && (
              <span className="text-[11px] text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                Unsaved changes
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Active/Inactive Toggle */}
            <button
              onClick={() => handleChange('is_active', !formData.is_active)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] border rounded-md transition-colors ${
                formData.is_active
                  ? 'border-green-300 bg-green-50 text-green-700'
                  : 'border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}
            >
              <Eye className={`w-4 h-4 ${formData.is_active ? '' : 'opacity-50'}`} />
              {formData.is_active ? 'Active' : 'Inactive'}
            </button>

            {/* Settings Toggle */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] border rounded-md transition-colors ${
                showSettings
                  ? 'border-gray-300 bg-gray-100 text-gray-700'
                  : 'border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}
            >
              <Settings2 className="w-4 h-4" />
              Settings
            </button>

            {/* Preview */}
            {!isNew && term?.slug && (
              <Link
                to={`/glossary/${term.slug}?preview=true`}
                target="_blank"
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] border border-gray-200 text-gray-500 rounded-md hover:bg-gray-50"
              >
                <Eye className="w-4 h-4" />
                Preview
              </Link>
            )}

            {/* Save Button */}
            <button
              onClick={handleSubmit}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-1.5 text-[12px] font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
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
            placeholder="Glossary Term"
            value={formData.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="w-full text-[28px] font-semibold text-gray-900 placeholder-gray-300 border-0 focus:outline-none focus:ring-0 mb-4"
          />

          {/* Short Definition */}
          <textarea
            placeholder="Write a brief definition (used for previews and SEO)..."
            value={formData.definition_plain}
            onChange={(e) => handleChange('definition_plain', e.target.value)}
            rows={2}
            className="w-full text-[14px] text-gray-600 placeholder-gray-400 border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-gray-300 mb-4 resize-none"
          />

          {/* Block Editor */}
          <BlockEditor
            key={termId || 'new'}
            ref={editorRef}
            initialData={initialContent}
            onChange={handleContentChange}
            placeholder="Write the full definition with examples..."
            minHeight={300}
            editorId={`glossary-editor-${termId || 'new'}`}
          />
        </div>

        {/* Settings Sidebar */}
        {showSettings && (
          <div className="w-80 flex-shrink-0">
            <div className="bg-white border border-gray-200 rounded-lg p-4 sticky top-20">
              <h3 className="text-[14px] font-medium text-gray-900 mb-4">Term Settings</h3>

              {/* Slug */}
              <div className="mb-4">
                <label className="block text-[12px] font-medium text-gray-700 mb-1">
                  URL Slug
                </label>
                <div className="flex items-center">
                  <span className="text-[12px] text-gray-500 mr-1">/glossary/</span>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => handleChange('slug', e.target.value)}
                    className="flex-1 px-2 py-1.5 text-[12px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300"
                  />
                </div>
              </div>

              {/* SEO Section */}
              <div className="border-t border-gray-200 mt-4 pt-4">
                <h4 className="text-[12px] font-medium text-gray-900 mb-3">SEO</h4>

                <div className="mb-4">
                  <label className="block text-[12px] font-medium text-gray-700 mb-1">
                    Meta Title
                  </label>
                  <input
                    type="text"
                    value={formData.meta_title}
                    onChange={(e) => handleChange('meta_title', e.target.value)}
                    placeholder={formData.title || 'Term title'}
                    maxLength={60}
                    className="w-full px-3 py-1.5 text-[12px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300"
                  />
                  <span className="text-[10px] text-gray-400 mt-1">
                    {(formData.meta_title || formData.title).length}/60 · "{seoDefaults.titleSuffix}" added automatically
                  </span>
                </div>

                <div className="mb-4">
                  <label className="block text-[12px] font-medium text-gray-700 mb-1">
                    Meta Description
                  </label>
                  <textarea
                    value={formData.meta_description}
                    onChange={(e) => handleChange('meta_description', e.target.value)}
                    placeholder={formData.definition_plain || 'Term description for search engines'}
                    maxLength={160}
                    rows={3}
                    className="w-full px-3 py-1.5 text-[12px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 resize-none"
                  />
                  <span className="text-[10px] text-gray-400 mt-1">
                    {(formData.meta_description || formData.definition_plain).length}/160
                  </span>
                </div>
              </div>

              {/* FAQs Section */}
              <div className="border-t border-gray-200 mt-4 pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <HelpCircle className="w-4 h-4 text-purple-500" />
                  <h4 className="text-[12px] font-medium text-gray-900">FAQs</h4>
                  {selectedFaqIds.length > 0 && (
                    <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                      {selectedFaqIds.length} selected
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-500 mb-3">
                  Select FAQs to display on this term page.
                </p>

                {allFaqs.length === 0 ? (
                  <p className="text-[11px] text-gray-400 italic">No FAQs available</p>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-1 border border-gray-100 rounded-md p-2">
                    {allFaqs.map((faq) => (
                      <button
                        key={faq.id}
                        type="button"
                        onClick={() => handleToggleFaq(faq.id)}
                        className={`w-full flex items-start gap-2 p-2 rounded text-left transition-colors ${
                          selectedFaqIds.includes(faq.id)
                            ? 'bg-purple-50 border border-purple-200'
                            : 'hover:bg-gray-50 border border-transparent'
                        }`}
                      >
                        <div
                          className={`flex-shrink-0 w-4 h-4 rounded border mt-0.5 flex items-center justify-center ${
                            selectedFaqIds.includes(faq.id)
                              ? 'bg-purple-500 border-purple-500'
                              : 'border-gray-300'
                          }`}
                        >
                          {selectedFaqIds.includes(faq.id) && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </div>
                        <span className="text-[11px] text-gray-700 line-clamp-2">
                          {faq.question}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Term Info */}
              {!isNew && term && (
                <div className="border-t border-gray-200 mt-4 pt-4">
                  <h4 className="text-[12px] font-medium text-gray-900 mb-3">Info</h4>
                  <div className="space-y-2 text-[11px] text-gray-500">
                    <p>Created: {new Date(term.created_at).toLocaleString()}</p>
                    <p>Updated: {new Date(term.updated_at).toLocaleString()}</p>
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
