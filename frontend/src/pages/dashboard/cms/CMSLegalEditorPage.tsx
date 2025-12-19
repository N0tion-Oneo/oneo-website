// CMS Legal Document Editor Page
import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cmsPages } from '@/services/cms'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { useSEODefaults } from '@/contexts/SEOContext'
import { BlockEditor, type BlockEditorHandle } from '@/components/cms'
import { UserRole, ContentStatus, LegalDocumentType, LegalDocumentTypeLabels, ServiceTypeApplicability, ServiceTypeApplicabilityLabels } from '@/types'
import type { CMSLegalDocumentInput, EditorJSData } from '@/types'
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

const DOCUMENT_TYPE_OPTIONS = Object.entries(LegalDocumentTypeLabels).map(([value, label]) => ({
  value: value as LegalDocumentType,
  label,
}))

const SERVICE_TYPE_OPTIONS = Object.entries(ServiceTypeApplicabilityLabels).map(([value, label]) => ({
  value: value as ServiceTypeApplicability,
  label,
}))

const defaultContent: EditorJSData = {
  time: Date.now(),
  blocks: [],
  version: '2.28.0',
}

export default function CMSLegalEditorPage() {
  const { docId } = useParams<{ docId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const seoDefaults = useSEODefaults()
  const editorRef = useRef<BlockEditorHandle>(null)

  const isNew = !docId

  // Form state (excludes content - that's managed by Editor.js)
  const [formData, setFormData] = useState<Omit<CMSLegalDocumentInput, 'content'>>({
    title: '',
    slug: '',
    document_type: LegalDocumentType.OTHER,
    service_type: ServiceTypeApplicability.ALL,
    version: '',
    effective_date: null,
    meta_title: '',
    meta_description: '',
    status: ContentStatus.DRAFT,
  })
  const [showSettings, setShowSettings] = useState(true)
  const [hasChanges, setHasChanges] = useState(false)

  // Fetch existing document
  const { data: document, isLoading: docLoading, error: docError } = useQuery({
    queryKey: ['cms-legal', docId],
    queryFn: () => cmsPages.get(docId!),
    enabled: !isNew && !!docId,
  })

  // Populate form when document data loads
  useEffect(() => {
    if (document) {
      setFormData({
        title: document.title,
        slug: document.slug,
        document_type: document.document_type,
        service_type: document.service_type,
        version: document.version || '',
        effective_date: document.effective_date,
        meta_title: document.meta_title,
        meta_description: document.meta_description,
        status: document.status,
      })
    }
  }, [document])

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: CMSLegalDocumentInput) => cmsPages.create(data),
    onSuccess: (newDoc) => {
      queryClient.invalidateQueries({ queryKey: ['cms-legal'] })
      showToast('Document created successfully', 'success')
      navigate(`/dashboard/cms/legal/${newDoc.id}`)
    },
    onError: () => {
      showToast('Failed to create document', 'error')
    },
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: Partial<CMSLegalDocumentInput>) => cmsPages.update(docId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-legal'] })
      queryClient.invalidateQueries({ queryKey: ['cms-legal', docId] })
      showToast('Document saved successfully', 'success')
      setHasChanges(false)
    },
    onError: () => {
      showToast('Failed to save document', 'error')
    },
  })

  const handleChange = (field: keyof Omit<CMSLegalDocumentInput, 'content'>, value: unknown) => {
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
    if (isNew || !document?.slug) {
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

    const submitData: CMSLegalDocumentInput = {
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
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-4" />
        <p className="text-[15px] text-gray-700 mb-2">Access Denied</p>
        <p className="text-[13px] text-gray-500">
          You do not have permission to edit legal documents.
        </p>
      </div>
    )
  }

  // Loading state
  if (!isNew && docLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  // Error state
  if (!isNew && docError) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-4" />
        <p className="text-[15px] text-gray-700 mb-2">Document not found</p>
        <Link
          to="/dashboard/cms/legal"
          className="text-[13px] text-gray-500 hover:text-gray-700 underline"
        >
          Back to legal documents
        </Link>
      </div>
    )
  }

  // Determine initial content for editor
  const initialContent = isNew ? defaultContent : (document?.content || defaultContent)

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 -mx-6 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/dashboard/cms/legal"
              className="flex items-center gap-1 text-[13px] text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Link>
            <div className="h-4 w-px bg-gray-200" />
            <h1 className="text-[16px] font-medium text-gray-900">
              {isNew ? 'New Legal Document' : 'Edit Legal Document'}
            </h1>
            {hasChanges && (
              <span className="text-[11px] text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                Unsaved changes
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Status Selector */}
            <select
              value={formData.status}
              onChange={(e) => handleChange('status', e.target.value)}
              className="px-3 py-1.5 text-[12px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300"
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
                  ? 'border-gray-300 bg-gray-100 text-gray-700'
                  : 'border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}
            >
              <Settings2 className="w-4 h-4" />
              Settings
            </button>

            {/* Preview (only for existing published documents) */}
            {!isNew && document?.status === ContentStatus.PUBLISHED && (
              <Link
                to={`/${document.slug}`}
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
            placeholder="Document Title (e.g., Terms of Service)"
            value={formData.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="w-full text-[28px] font-semibold text-gray-900 placeholder-gray-300 border-0 focus:outline-none focus:ring-0 mb-4"
          />

          {/* Block Editor - key ensures fresh instance for each document */}
          <BlockEditor
            key={docId || 'new'}
            ref={editorRef}
            initialData={initialContent}
            onChange={handleContentChange}
            placeholder="Start writing your legal document content..."
            minHeight={400}
            editorId={`legal-editor-${docId || 'new'}`}
          />
        </div>

        {/* Settings Sidebar */}
        {showSettings && (
          <div className="w-80 flex-shrink-0">
            <div className="bg-white border border-gray-200 rounded-lg p-4 sticky top-20">
              <h3 className="text-[14px] font-medium text-gray-900 mb-4">Document Settings</h3>

              {/* Document Type */}
              <div className="mb-4">
                <label className="block text-[12px] font-medium text-gray-700 mb-1">
                  Document Type
                </label>
                <select
                  value={formData.document_type}
                  onChange={(e) => handleChange('document_type', e.target.value)}
                  className="w-full px-3 py-1.5 text-[12px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300"
                >
                  {DOCUMENT_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Service Type Applicability */}
              <div className="mb-4">
                <label className="block text-[12px] font-medium text-gray-700 mb-1">
                  Applies To
                </label>
                <select
                  value={formData.service_type}
                  onChange={(e) => handleChange('service_type', e.target.value)}
                  className="w-full px-3 py-1.5 text-[12px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300"
                >
                  {SERVICE_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-400 mt-1">
                  Which service types require this document when changing plans
                </p>
              </div>

              {/* Slug */}
              <div className="mb-4">
                <label className="block text-[12px] font-medium text-gray-700 mb-1">
                  URL Slug
                </label>
                <div className="flex items-center">
                  <span className="text-[12px] text-gray-500 mr-1">/</span>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => handleChange('slug', e.target.value)}
                    placeholder="terms-of-service"
                    className="flex-1 px-2 py-1.5 text-[12px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300"
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">
                  e.g., terms-of-service, privacy-policy
                </p>
              </div>

              {/* Version Tracking */}
              <div className="border-t border-gray-200 mt-4 pt-4">
                <h4 className="text-[12px] font-medium text-gray-900 mb-3">Version Tracking</h4>

                <div className="mb-4">
                  <label className="block text-[12px] font-medium text-gray-700 mb-1">
                    Version
                  </label>
                  <input
                    type="text"
                    value={formData.version}
                    onChange={(e) => handleChange('version', e.target.value)}
                    placeholder="e.g., 1.0, 2.1"
                    className="w-full px-3 py-1.5 text-[12px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-[12px] font-medium text-gray-700 mb-1">
                    Effective Date
                  </label>
                  <input
                    type="date"
                    value={formData.effective_date || ''}
                    onChange={(e) => handleChange('effective_date', e.target.value || null)}
                    className="w-full px-3 py-1.5 text-[12px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    When this version becomes effective
                  </p>
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
                    placeholder={formData.title || 'Document title'}
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
                    placeholder="Description for search engines"
                    maxLength={160}
                    rows={3}
                    className="w-full px-3 py-1.5 text-[12px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 resize-none"
                  />
                  <span className="text-[10px] text-gray-400 mt-1">
                    {(formData.meta_description || '').length}/160
                  </span>
                </div>
              </div>

              {/* Document Info (for existing documents) */}
              {!isNew && document && (
                <div className="border-t border-gray-200 mt-4 pt-4">
                  <h4 className="text-[12px] font-medium text-gray-900 mb-3">Info</h4>
                  <div className="space-y-2 text-[11px] text-gray-500">
                    <p>
                      Created: {new Date(document.created_at).toLocaleString()}
                      {document.created_by_name && ` by ${document.created_by_name}`}
                    </p>
                    <p>
                      Updated: {new Date(document.updated_at).toLocaleString()}
                      {document.updated_by_name && ` by ${document.updated_by_name}`}
                    </p>
                    {document.published_at && (
                      <p>Published: {new Date(document.published_at).toLocaleString()}</p>
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
