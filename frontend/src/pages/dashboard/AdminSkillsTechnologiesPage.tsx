import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { UserRole } from '@/types'
import {
  adminGetSkills,
  adminCreateSkill,
  adminUpdateSkill,
  adminDeleteSkill,
  adminMergeSkill,
  adminGetTechnologies,
  adminCreateTechnology,
  adminUpdateTechnology,
  adminDeleteTechnology,
  adminMergeTechnology,
  type AdminSkill,
  type AdminTechnology,
} from '@/services/api'
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Merge,
  AlertCircle,
  Wrench,
  Lightbulb,
  X,
  Check,
  CheckCircle,
  Eye,
} from 'lucide-react'

// Categories
const SKILL_CATEGORIES = [
  { value: 'leadership', label: 'Leadership & Management' },
  { value: 'communication', label: 'Communication' },
  { value: 'project_management', label: 'Project Management' },
  { value: 'analytical', label: 'Analytical & Problem Solving' },
  { value: 'interpersonal', label: 'Interpersonal' },
  { value: 'business', label: 'Business & Strategy' },
  { value: 'domain', label: 'Domain Expertise' },
  { value: 'other', label: 'Other' },
]

const TECHNOLOGY_CATEGORIES = [
  { value: 'language', label: 'Programming Languages' },
  { value: 'framework', label: 'Frameworks & Libraries' },
  { value: 'database', label: 'Databases' },
  { value: 'cloud', label: 'Cloud & Infrastructure' },
  { value: 'devops', label: 'DevOps & CI/CD' },
  { value: 'tool', label: 'Development Tools' },
  { value: 'other', label: 'Other' },
]

type TabType = 'skills' | 'technologies'

interface EditModalProps {
  isOpen: boolean
  onClose: () => void
  item: AdminSkill | AdminTechnology | null
  type: TabType
  categories: { value: string; label: string }[]
  onSave: (data: { name: string; category: string }) => Promise<void>
  isCreating?: boolean
}

function EditModal({ isOpen, onClose, item, type, categories, onSave, isCreating }: EditModalProps) {
  const [name, setName] = useState(item?.name || '')
  const [category, setCategory] = useState(item?.category || 'other')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (item) {
      setName(item.name)
      setCategory(item.category)
    } else {
      setName('')
      setCategory('other')
    }
    setError('')
  }, [item])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Name is required')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave({ name: name.trim(), category })
      onClose()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { name?: string[] } } }
      setError(error.response?.data?.name?.[0] || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl dark:shadow-gray-900/40 w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {isCreating ? 'Create' : 'Edit'} {type === 'skills' ? 'Skill' : 'Technology'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600"
              placeholder={`Enter ${type === 'skills' ? 'skill' : 'technology'} name`}
            />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600"
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-md hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface MergeModalProps {
  isOpen: boolean
  onClose: () => void
  sourceItem: AdminSkill | AdminTechnology | null
  allItems: (AdminSkill | AdminTechnology)[]
  type: TabType
  onMerge: (targetId: number) => Promise<void>
}

function MergeModal({ isOpen, onClose, sourceItem, allItems, type, onMerge }: MergeModalProps) {
  const [targetId, setTargetId] = useState<number | null>(null)
  const [merging, setMerging] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setTargetId(null)
    setError('')
  }, [sourceItem])

  if (!isOpen || !sourceItem) return null

  const availableTargets = allItems.filter((item) => item.id !== sourceItem.id)

  const handleMerge = async () => {
    if (!targetId) {
      setError('Please select a target')
      return
    }
    setMerging(true)
    setError('')
    try {
      await onMerge(targetId)
      onClose()
    } catch {
      setError('Failed to merge')
    } finally {
      setMerging(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl dark:shadow-gray-900/40 w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Merge {type === 'skills' ? 'Skill' : 'Technology'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Merge <span className="font-semibold">"{sourceItem.name}"</span> into another{' '}
            {type === 'skills' ? 'skill' : 'technology'}. All references will be transferred and the source will be
            deleted.
          </p>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Merge into</label>
            <select
              value={targetId || ''}
              onChange={(e) => setTargetId(Number(e.target.value) || null)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600"
            >
              <option value="">Select target...</option>
              {availableTargets.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
            >
              Cancel
            </button>
            <button
              onClick={handleMerge}
              disabled={merging || !targetId}
              className="px-4 py-2 text-sm bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
            >
              {merging ? 'Merging...' : 'Merge'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AdminSkillsTechnologiesPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('skills')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [includeInactive, setIncludeInactive] = useState(true)
  const [needsReviewFilter, setNeedsReviewFilter] = useState<boolean | null>(null)

  // Skills state
  const [skills, setSkills] = useState<AdminSkill[]>([])
  const [skillsLoading, setSkillsLoading] = useState(true)
  const [skillsError, setSkillsError] = useState('')

  // Technologies state
  const [technologies, setTechnologies] = useState<AdminTechnology[]>([])
  const [technologiesLoading, setTechnologiesLoading] = useState(true)
  const [technologiesError, setTechnologiesError] = useState('')

  // Modal state
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [mergeModalOpen, setMergeModalOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<AdminSkill | AdminTechnology | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  // Fetch skills
  const fetchSkills = async () => {
    setSkillsLoading(true)
    setSkillsError('')
    try {
      const data = await adminGetSkills({
        include_inactive: includeInactive,
        category: categoryFilter || undefined,
        search: search || undefined,
        needs_review: needsReviewFilter ?? undefined,
      })
      setSkills(data)
    } catch {
      setSkillsError('Failed to load skills')
    } finally {
      setSkillsLoading(false)
    }
  }

  // Fetch technologies
  const fetchTechnologies = async () => {
    setTechnologiesLoading(true)
    setTechnologiesError('')
    try {
      const data = await adminGetTechnologies({
        include_inactive: includeInactive,
        category: categoryFilter || undefined,
        search: search || undefined,
        needs_review: needsReviewFilter ?? undefined,
      })
      setTechnologies(data)
    } catch {
      setTechnologiesError('Failed to load technologies')
    } finally {
      setTechnologiesLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'skills') {
      fetchSkills()
    } else {
      fetchTechnologies()
    }
  }, [activeTab, search, categoryFilter, includeInactive, needsReviewFilter])

  // Check permissions
  if (!user || ![UserRole.ADMIN, UserRole.RECRUITER].includes(user.role)) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-300 dark:text-red-400 mx-auto mb-4" />
        <p className="text-[15px] text-gray-700 dark:text-gray-300 mb-2">Access Denied</p>
        <p className="text-[13px] text-gray-500 dark:text-gray-400">You do not have permission to view this page.</p>
      </div>
    )
  }

  const handleCreate = () => {
    setSelectedItem(null)
    setIsCreating(true)
    setEditModalOpen(true)
  }

  const handleEdit = (item: AdminSkill | AdminTechnology) => {
    setSelectedItem(item)
    setIsCreating(false)
    setEditModalOpen(true)
  }

  const handleMerge = (item: AdminSkill | AdminTechnology) => {
    setSelectedItem(item)
    setMergeModalOpen(true)
  }

  const handleDelete = async (item: AdminSkill | AdminTechnology) => {
    if (!confirm(`Are you sure you want to deactivate "${item.name}"?`)) return
    try {
      if (activeTab === 'skills') {
        await adminDeleteSkill(item.id)
        fetchSkills()
      } else {
        await adminDeleteTechnology(item.id)
        fetchTechnologies()
      }
    } catch {
      alert('Failed to delete')
    }
  }

  const handleMarkAsReviewed = async (item: AdminSkill | AdminTechnology) => {
    try {
      if (activeTab === 'skills') {
        await adminUpdateSkill(item.id, { needs_review: false })
        fetchSkills()
      } else {
        await adminUpdateTechnology(item.id, { needs_review: false })
        fetchTechnologies()
      }
    } catch {
      alert('Failed to mark as reviewed')
    }
  }

  const handleSave = async (data: { name: string; category: string }) => {
    if (activeTab === 'skills') {
      if (isCreating) {
        await adminCreateSkill(data)
      } else if (selectedItem) {
        await adminUpdateSkill(selectedItem.id, data)
      }
      fetchSkills()
    } else {
      if (isCreating) {
        await adminCreateTechnology(data)
      } else if (selectedItem) {
        await adminUpdateTechnology(selectedItem.id, data)
      }
      fetchTechnologies()
    }
  }

  const handleMergeConfirm = async (targetId: number) => {
    if (!selectedItem) return
    if (activeTab === 'skills') {
      await adminMergeSkill(selectedItem.id, targetId)
      fetchSkills()
    } else {
      await adminMergeTechnology(selectedItem.id, targetId)
      fetchTechnologies()
    }
  }

  const currentItems = activeTab === 'skills' ? skills : technologies
  const currentLoading = activeTab === 'skills' ? skillsLoading : technologiesLoading
  const currentError = activeTab === 'skills' ? skillsError : technologiesError
  const currentCategories = activeTab === 'skills' ? SKILL_CATEGORIES : TECHNOLOGY_CATEGORIES

  const getCategoryLabel = (value: string) => {
    const cat = currentCategories.find((c) => c.value === value)
    return cat?.label || value
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-[13px] text-gray-500 dark:text-gray-400">Manage skills and technologies used across the platform</p>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm rounded-md hover:bg-gray-800 dark:hover:bg-gray-200"
        >
          <Plus className="w-4 h-4" />
          Add {activeTab === 'skills' ? 'Skill' : 'Technology'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => {
            setActiveTab('skills')
            setCategoryFilter('')
          }}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'skills'
              ? 'border-gray-900 dark:border-gray-100 text-gray-900 dark:text-gray-100'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <Lightbulb className="w-4 h-4" />
          Skills ({skills.length})
        </button>
        <button
          onClick={() => {
            setActiveTab('technologies')
            setCategoryFilter('')
          }}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'technologies'
              ? 'border-gray-900 dark:border-gray-100 text-gray-900 dark:text-gray-100'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <Wrench className="w-4 h-4" />
          Technologies ({technologies.length})
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600"
        >
          <option value="">All Categories</option>
          {currentCategories.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
        <select
          value={needsReviewFilter === null ? '' : needsReviewFilter.toString()}
          onChange={(e) => {
            const val = e.target.value
            setNeedsReviewFilter(val === '' ? null : val === 'true')
          }}
          className="px-3 py-2 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600"
        >
          <option value="">All Review Status</option>
          <option value="true">Needs Review</option>
          <option value="false">Reviewed</option>
        </select>
        <label className="flex items-center gap-2 text-[13px] text-gray-600 dark:text-gray-400">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
            className="rounded border-gray-300 dark:border-gray-600"
          />
          Show inactive
        </label>
      </div>

      {/* Loading */}
      {currentLoading && (
        <div className="text-center py-12">
          <p className="text-[14px] text-gray-500 dark:text-gray-400">Loading {activeTab}...</p>
        </div>
      )}

      {/* Error */}
      {currentError && (
        <div className="text-center py-12">
          <p className="text-[14px] text-red-500 dark:text-red-400">{currentError}</p>
        </div>
      )}

      {/* Empty */}
      {!currentLoading && !currentError && currentItems.length === 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
          {activeTab === 'skills' ? (
            <Lightbulb className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          ) : (
            <Wrench className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          )}
          <p className="text-[15px] text-gray-700 dark:text-gray-300 mb-1">No {activeTab} found</p>
          <p className="text-[13px] text-gray-500 dark:text-gray-400">
            {search ? `No ${activeTab} match your search` : `No ${activeTab} have been created yet`}
          </p>
        </div>
      )}

      {/* Table */}
      {!currentLoading && !currentError && currentItems.length > 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Slug
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {currentItems.map((item) => (
                <tr key={item.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800 ${item.is_active === false ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-medium text-gray-900 dark:text-gray-100">{item.name}</span>
                      {item.needs_review && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                          <Eye className="w-3 h-3" />
                          Needs Review
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[13px] text-gray-600 dark:text-gray-400">{getCategoryLabel(item.category)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[12px] text-gray-400 font-mono">{item.slug}</span>
                  </td>
                  <td className="px-4 py-3">
                    {item.is_active !== false ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                        <Check className="w-3 h-3" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {item.needs_review && (
                        <button
                          onClick={() => handleMarkAsReviewed(item)}
                          className="p-1.5 text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded"
                          title="Mark as Reviewed"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(item)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleMerge(item)}
                        className="p-1.5 text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/30 rounded"
                        title="Merge"
                      >
                        <Merge className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                        title="Deactivate"
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

      {/* Edit Modal */}
      <EditModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        item={selectedItem}
        type={activeTab}
        categories={currentCategories}
        onSave={handleSave}
        isCreating={isCreating}
      />

      {/* Merge Modal */}
      <MergeModal
        isOpen={mergeModalOpen}
        onClose={() => setMergeModalOpen(false)}
        sourceItem={selectedItem}
        allItems={currentItems}
        type={activeTab}
        onMerge={handleMergeConfirm}
      />
    </div>
  )
}
