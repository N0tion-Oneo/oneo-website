// CMS FAQs Management Page
import { useState, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cmsFAQs } from '@/services/cms'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { BlockEditor, type BlockEditorHandle } from '@/components/cms'
import { UserRole } from '@/types'
import type { CMSFAQ, CMSFAQInput, CMSFAQCategory, CMSFAQCategoryInput, EditorJSData } from '@/types'
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  HelpCircle,
  Folder,
  Star,
  GripVertical,
  X,
  Save,
  Loader2,
} from 'lucide-react'

const defaultContent: EditorJSData = {
  time: Date.now(),
  blocks: [],
  version: '2.28.0',
}

export default function CMSFAQsPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const editorRef = useRef<BlockEditorHandle>(null)

  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [expandedFAQs, setExpandedFAQs] = useState<Set<string>>(new Set())
  const [editingFAQ, setEditingFAQ] = useState<CMSFAQ | null>(null)
  const [editingCategory, setEditingCategory] = useState<CMSFAQCategory | null>(null)
  const [showNewFAQ, setShowNewFAQ] = useState(false)
  const [showNewCategory, setShowNewCategory] = useState(false)

  // Form states (excludes content - managed by Editor.js)
  const [faqForm, setFaqForm] = useState<Omit<CMSFAQInput, 'content'>>({
    question: '',
    answer_plain: '',
    category: null,
    order: 0,
    is_active: true,
    is_featured: false,
  })

  // Track initial content for editor
  const [editorInitialContent, setEditorInitialContent] = useState<EditorJSData>(defaultContent)
  // Key to force editor remount when switching between new/edit
  const [editorKey, setEditorKey] = useState(0)

  const [categoryForm, setCategoryForm] = useState<CMSFAQCategoryInput>({
    name: '',
    description: '',
    order: 0,
    is_active: true,
  })

  // Fetch FAQs and categories
  const { data: faqs = [], isLoading: faqsLoading } = useQuery({
    queryKey: ['cms-faqs', selectedCategory],
    queryFn: () => cmsFAQs.list({
      category: selectedCategory || undefined,
    }),
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['cms-faq-categories'],
    queryFn: () => cmsFAQs.listCategories(),
  })

  // Mutations
  const createFAQMutation = useMutation({
    mutationFn: (data: CMSFAQInput) => cmsFAQs.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-faqs'] })
      queryClient.invalidateQueries({ queryKey: ['cms-faq-categories'] })
      showToast('FAQ created successfully', 'success')
      resetFAQForm()
    },
    onError: () => {
      showToast('Failed to create FAQ', 'error')
    },
  })

  const updateFAQMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CMSFAQInput> }) =>
      cmsFAQs.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-faqs'] })
      showToast('FAQ updated successfully', 'success')
      setEditingFAQ(null)
      resetFAQForm()
    },
    onError: () => {
      showToast('Failed to update FAQ', 'error')
    },
  })

  const deleteFAQMutation = useMutation({
    mutationFn: (id: string) => cmsFAQs.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-faqs'] })
      queryClient.invalidateQueries({ queryKey: ['cms-faq-categories'] })
      showToast('FAQ deleted successfully', 'success')
    },
    onError: () => {
      showToast('Failed to delete FAQ', 'error')
    },
  })

  const createCategoryMutation = useMutation({
    mutationFn: (data: CMSFAQCategoryInput) => cmsFAQs.createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-faq-categories'] })
      showToast('Category created successfully', 'success')
      resetCategoryForm()
    },
    onError: () => {
      showToast('Failed to create category', 'error')
    },
  })

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CMSFAQCategoryInput> }) =>
      cmsFAQs.updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-faq-categories'] })
      showToast('Category updated successfully', 'success')
      setEditingCategory(null)
    },
    onError: () => {
      showToast('Failed to update category', 'error')
    },
  })

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => cmsFAQs.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-faq-categories'] })
      queryClient.invalidateQueries({ queryKey: ['cms-faqs'] })
      showToast('Category deleted successfully', 'success')
      if (selectedCategory) setSelectedCategory(null)
    },
    onError: () => {
      showToast('Failed to delete category', 'error')
    },
  })

  // Filter FAQs by search
  const filteredFAQs = useMemo(() => {
    if (!search) return faqs
    const searchLower = search.toLowerCase()
    return faqs.filter(
      (faq) =>
        faq.question.toLowerCase().includes(searchLower) ||
        faq.answer_plain.toLowerCase().includes(searchLower)
    )
  }, [faqs, search])

  const resetFAQForm = () => {
    setFaqForm({
      question: '',
      answer_plain: '',
      category: selectedCategory,
      order: 0,
      is_active: true,
      is_featured: false,
    })
    setEditorInitialContent(defaultContent)
    setEditorKey((k) => k + 1)
    setShowNewFAQ(false)
  }

  const resetCategoryForm = () => {
    setCategoryForm({
      name: '',
      description: '',
      order: 0,
      is_active: true,
    })
    setShowNewCategory(false)
  }

  const toggleFAQ = (id: string) => {
    setExpandedFAQs((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleEditFAQ = (faq: CMSFAQ) => {
    setEditingFAQ(faq)
    setFaqForm({
      question: faq.question,
      answer_plain: faq.answer_plain,
      category: faq.category,
      order: faq.order,
      is_active: faq.is_active,
      is_featured: faq.is_featured,
    })
    setEditorInitialContent(faq.content || defaultContent)
    setEditorKey((k) => k + 1)
    setExpandedFAQs((prev) => new Set(prev).add(faq.id))
  }

  const handleEditCategory = (category: CMSFAQCategory) => {
    setEditingCategory(category)
    setCategoryForm({
      name: category.name,
      description: category.description,
      order: category.order,
      is_active: category.is_active,
    })
  }

  const handleSaveFAQ = async () => {
    if (!faqForm.question.trim()) {
      showToast('Question is required', 'error')
      return
    }

    // Get content from editor
    const content = await editorRef.current?.save()

    const submitData: CMSFAQInput = {
      ...faqForm,
      content: content || defaultContent,
    }

    if (editingFAQ) {
      updateFAQMutation.mutate({ id: editingFAQ.id, data: submitData })
    } else {
      createFAQMutation.mutate(submitData)
    }
  }

  const handleSaveCategory = () => {
    if (!categoryForm.name.trim()) {
      showToast('Category name is required', 'error')
      return
    }

    if (editingCategory) {
      updateCategoryMutation.mutate({ id: editingCategory.id, data: categoryForm })
    } else {
      createCategoryMutation.mutate(categoryForm)
    }
  }

  const handleDeleteFAQ = (id: string) => {
    if (window.confirm('Are you sure you want to delete this FAQ?')) {
      deleteFAQMutation.mutate(id)
    }
  }

  const handleDeleteCategory = (id: string) => {
    if (window.confirm('Are you sure you want to delete this category? FAQs will be uncategorized.')) {
      deleteCategoryMutation.mutate(id)
    }
  }

  const isSaving = createFAQMutation.isPending || updateFAQMutation.isPending ||
    createCategoryMutation.isPending || updateCategoryMutation.isPending

  // Access check
  if (!user || ![UserRole.ADMIN, UserRole.RECRUITER].includes(user.role)) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-4" />
        <p className="text-[15px] text-gray-700 dark:text-gray-300 mb-2">Access Denied</p>
        <p className="text-[13px] text-gray-500 dark:text-gray-400">
          You do not have permission to manage FAQs.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-semibold text-gray-900 dark:text-gray-100">FAQs</h1>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">
            Manage frequently asked questions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNewCategory(true)}
            className="flex items-center gap-2 px-3 py-2 text-[13px] font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <Folder className="w-4 h-4" />
            New Category
          </button>
          <button
            onClick={() => {
              setShowNewFAQ(true)
              setFaqForm({ ...faqForm, category: selectedCategory })
              setEditorInitialContent(defaultContent)
              setEditorKey((k) => k + 1)
            }}
            className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-gray-900 dark:bg-gray-100 dark:text-gray-900 rounded-md hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New FAQ
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Categories Sidebar */}
        <div className="w-64 flex-shrink-0">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
            <h3 className="text-[12px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              Categories
            </h3>
            <div className="space-y-1">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`w-full flex items-center justify-between px-3 py-2 text-[13px] rounded-md transition-colors ${
                  selectedCategory === null
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-medium'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <span>All FAQs</span>
                <span className="text-[11px] text-gray-400">{faqs.length}</span>
              </button>
              {categories.map((category) => (
                <div key={category.id} className="group relative">
                  <button
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-[13px] rounded-md transition-colors ${
                      selectedCategory === category.id
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-medium'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <span className="truncate">{category.name}</span>
                    <span className="text-[11px] text-gray-400">{category.faq_count}</span>
                  </button>
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEditCategory(category)
                      }}
                      className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteCategory(category.id)
                      }}
                      className="p-1 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search FAQs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            />
          </div>

          {/* New FAQ Form */}
          {(showNewFAQ || editingFAQ) && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[14px] font-medium text-gray-900 dark:text-gray-100">
                  {editingFAQ ? 'Edit FAQ' : 'New FAQ'}
                </h3>
                <button
                  onClick={() => {
                    if (editingFAQ) {
                      setEditingFAQ(null)
                    }
                    resetFAQForm()
                  }}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[12px] font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Question *
                  </label>
                  <input
                    type="text"
                    value={faqForm.question}
                    onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })}
                    placeholder="What is your question?"
                    className="w-full px-3 py-2 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Answer
                  </label>
                  <BlockEditor
                    key={editorKey}
                    ref={editorRef}
                    initialData={editorInitialContent}
                    placeholder="Write the answer..."
                    minHeight={200}
                    editorId={`faq-editor-${editorKey}`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Category
                    </label>
                    <select
                      value={faqForm.category || ''}
                      onChange={(e) => setFaqForm({ ...faqForm, category: e.target.value || null })}
                      className="w-full px-3 py-2 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    >
                      <option value="">No category</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Order
                    </label>
                    <input
                      type="number"
                      value={faqForm.order}
                      onChange={(e) => setFaqForm({ ...faqForm, order: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={faqForm.is_active}
                      onChange={(e) => setFaqForm({ ...faqForm, is_active: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:ring-gray-500"
                    />
                    <span className="text-[12px] text-gray-700 dark:text-gray-300">Active</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={faqForm.is_featured}
                      onChange={(e) => setFaqForm({ ...faqForm, is_featured: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:ring-gray-500"
                    />
                    <span className="text-[12px] text-gray-700 dark:text-gray-300">Featured</span>
                  </label>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      if (editingFAQ) {
                        setEditingFAQ(null)
                      }
                      resetFAQForm()
                    }}
                    className="px-4 py-2 text-[13px] text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveFAQ}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-gray-900 dark:bg-gray-100 dark:text-gray-900 rounded-md hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50"
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Save FAQ
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* New Category Form */}
          {(showNewCategory || editingCategory) && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[14px] font-medium text-gray-900 dark:text-gray-100">
                  {editingCategory ? 'Edit Category' : 'New Category'}
                </h3>
                <button
                  onClick={() => {
                    if (editingCategory) {
                      setEditingCategory(null)
                    }
                    resetCategoryForm()
                  }}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[12px] font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                    placeholder="Category name"
                    className="w-full px-3 py-2 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={categoryForm.description}
                    onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                    placeholder="Brief description"
                    rows={2}
                    className="w-full px-3 py-2 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600 resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Order
                    </label>
                    <input
                      type="number"
                      value={categoryForm.order}
                      onChange={(e) => setCategoryForm({ ...categoryForm, order: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 pb-2">
                      <input
                        type="checkbox"
                        checked={categoryForm.is_active}
                        onChange={(e) => setCategoryForm({ ...categoryForm, is_active: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:ring-gray-500"
                      />
                      <span className="text-[12px] text-gray-700 dark:text-gray-300">Active</span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      if (editingCategory) {
                        setEditingCategory(null)
                      }
                      resetCategoryForm()
                    }}
                    className="px-4 py-2 text-[13px] text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveCategory}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-gray-900 dark:bg-gray-100 dark:text-gray-900 rounded-md hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50"
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Save Category
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {faqsLoading && (
            <div className="text-center py-12">
              <p className="text-[14px] text-gray-500 dark:text-gray-400">Loading FAQs...</p>
            </div>
          )}

          {/* Empty State */}
          {!faqsLoading && filteredFAQs.length === 0 && !showNewFAQ && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
              <HelpCircle className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-[15px] text-gray-700 dark:text-gray-300 mb-1">No FAQs found</p>
              <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-4">
                {search ? 'Try a different search term' : 'Create your first FAQ'}
              </p>
              {!search && (
                <button
                  onClick={() => setShowNewFAQ(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-gray-900 dark:bg-gray-100 dark:text-gray-900 rounded-md hover:bg-gray-800 dark:hover:bg-gray-200"
                >
                  <Plus className="w-4 h-4" />
                  Create FAQ
                </button>
              )}
            </div>
          )}

          {/* FAQs List */}
          {!faqsLoading && filteredFAQs.length > 0 && (
            <div className="space-y-2">
              {filteredFAQs.map((faq) => (
                <div
                  key={faq.id}
                  className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                >
                  <div
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                    onClick={() => toggleFAQ(faq.id)}
                  >
                    <GripVertical className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" />
                    {expandedFAQs.has(faq.id) ? (
                      <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-gray-900 dark:text-gray-100 truncate">
                        {faq.question}
                      </p>
                      {!expandedFAQs.has(faq.id) && faq.answer_plain && (
                        <p className="text-[12px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                          {faq.answer_plain}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {faq.is_featured && (
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      )}
                      {faq.category_name && (
                        <span className="text-[11px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                          {faq.category_name}
                        </span>
                      )}
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded ${
                          faq.is_active
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        {faq.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEditFAQ(faq)
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteFAQ(faq.id)
                        }}
                        className="p-1 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {expandedFAQs.has(faq.id) && (
                    <div className="px-4 pb-4 pt-2 border-t border-gray-100 dark:border-gray-700">
                      <div className="pl-11 text-[13px] text-gray-600 dark:text-gray-400">
                        {faq.answer_plain || (
                          <span className="italic text-gray-400 dark:text-gray-500">No answer provided</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
