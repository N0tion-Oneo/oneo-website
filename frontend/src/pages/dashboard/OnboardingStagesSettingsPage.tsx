import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { UserRole, OnboardingStage } from '@/types'
import {
  getOnboardingStages,
  createOnboardingStage,
  updateOnboardingStage,
  deleteOnboardingStage,
  reorderOnboardingStages,
  getStageIntegrations,
} from '@/services/api'
import {
  Plus,
  Edit2,
  Trash2,
  X,
  GripVertical,
  Building2,
  User,
  Users,
  AlertCircle,
  Flag,
  Eye,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { StageIntegrationBadges, StageIntegrationsDrawer } from '@/components/onboarding'
import type { StageIntegration } from '@/types'

type TabType = 'lead' | 'company' | 'candidate'

// Preset colors for stages
const PRESET_COLORS = [
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#6366F1', // Indigo
  '#10B981', // Emerald
  '#14B8A6', // Teal
  '#06B6D4', // Cyan
  '#22C55E', // Green
  '#EF4444', // Red
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#6B7280', // Gray
]

interface EditModalProps {
  isOpen: boolean
  onClose: () => void
  stage: OnboardingStage | null
  entityType: TabType
  onSave: (data: { name: string; color: string; is_terminal: boolean }) => Promise<void>
  isCreating?: boolean
}

function EditModal({ isOpen, onClose, stage, entityType, onSave, isCreating }: EditModalProps) {
  const [name, setName] = useState(stage?.name || '')
  const [color, setColor] = useState(stage?.color || '#3B82F6')
  const [isTerminal, setIsTerminal] = useState(stage?.is_terminal || false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (stage) {
      setName(stage.name)
      setColor(stage.color)
      setIsTerminal(stage.is_terminal)
    } else {
      setName('')
      setColor('#3B82F6')
      setIsTerminal(false)
    }
    setError('')
  }, [stage])

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
      await onSave({ name: name.trim(), color, is_terminal: isTerminal })
      onClose()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { name?: string[]; error?: string } } }
      setError(error.response?.data?.name?.[0] || error.response?.data?.error || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl dark:shadow-gray-900/40 w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {isCreating ? 'Create' : 'Edit'} {entityType === 'lead' ? 'Lead' : entityType === 'company' ? 'Company' : 'Candidate'} Stage
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stage Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600"
              placeholder="e.g., Meeting Booked"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Color</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((presetColor) => (
                <button
                  key={presetColor}
                  type="button"
                  onClick={() => setColor(presetColor)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    color === presetColor ? 'border-gray-900 dark:border-gray-100 scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: presetColor }}
                />
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-10 h-10 rounded cursor-pointer"
              />
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="flex-1 px-3 py-2 border dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm font-mono"
                placeholder="#000000"
              />
            </div>
          </div>
          <div className="mb-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isTerminal}
                onChange={(e) => setIsTerminal(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:ring-gray-500 dark:focus:ring-gray-400"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Terminal stage</span>
              <Flag className="w-4 h-4 text-gray-400" />
            </label>
            <p className="ml-6 text-xs text-gray-500 dark:text-gray-400 mt-1">
              Terminal stages (e.g., "Onboarded", "Not Onboarded") represent the end of the onboarding process.
            </p>
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

interface DeleteConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  stage: OnboardingStage | null
  integrationData: StageIntegration | null
  onConfirm: () => Promise<void>
}

function DeleteConfirmModal({ isOpen, onClose, stage, integrationData, onConfirm }: DeleteConfirmModalProps) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen || !stage) return null

  // Calculate blockers
  const blockers: string[] = []
  if (integrationData) {
    if (integrationData.meeting_types.length > 0) {
      blockers.push(`${integrationData.meeting_types.length} meeting type(s)`)
    }
    if (integrationData.wizard_step) {
      blockers.push(`wizard step "${integrationData.wizard_step}"`)
    }
    const entityCount =
      integrationData.entity_counts.companies +
      integrationData.entity_counts.leads +
      integrationData.entity_counts.candidates
    if (entityCount > 0) {
      blockers.push(`${entityCount} entit${entityCount !== 1 ? 'ies' : 'y'}`)
    }
  }
  const canDelete = blockers.length === 0

  const handleDelete = async () => {
    setDeleting(true)
    setError('')
    try {
      await onConfirm()
      onClose()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } }
      setError(error.response?.data?.error || 'Failed to delete stage')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl dark:shadow-gray-900/40 w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b dark:border-gray-700">
          <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">Delete Stage</h3>
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
          {!canDelete ? (
            <>
              <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded text-amber-800 dark:text-amber-300 text-sm">
                <p className="font-medium mb-1">Cannot delete this stage</p>
                <p>This stage is connected to: {blockers.join(', ')}.</p>
                <p className="mt-2 text-amber-600 dark:text-amber-400">Remove these connections before deleting.</p>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
                >
                  Close
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Are you sure you want to delete <span className="font-semibold text-gray-900 dark:text-gray-100">"{stage.name}"</span>?
                This will deactivate the stage and it will no longer appear in the onboarding workflow.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function OnboardingStagesSettingsPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('lead')

  // Lead stages state
  const [leadStages, setLeadStages] = useState<OnboardingStage[]>([])
  const [leadLoading, setLeadLoading] = useState(true)
  const [leadError, setLeadError] = useState('')

  // Company stages state
  const [companyStages, setCompanyStages] = useState<OnboardingStage[]>([])
  const [companyLoading, setCompanyLoading] = useState(true)
  const [companyError, setCompanyError] = useState('')

  // Candidate stages state
  const [candidateStages, setCandidateStages] = useState<OnboardingStage[]>([])
  const [candidateLoading, setCandidateLoading] = useState(true)
  const [candidateError, setCandidateError] = useState('')

  // Modal state
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [selectedStage, setSelectedStage] = useState<OnboardingStage | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  // Drag state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  // Integration drawer state
  const [integrationDrawerOpen, setIntegrationDrawerOpen] = useState(false)
  const [integrationStage, setIntegrationStage] = useState<OnboardingStage | null>(null)
  const [integrationData, setIntegrationData] = useState<Record<number, StageIntegration>>({})

  // Fetch integration data for all stages
  const fetchIntegrationData = async (stageList: OnboardingStage[]) => {
    const data: Record<number, StageIntegration> = {}
    await Promise.all(
      stageList.map(async (stage) => {
        try {
          data[stage.id] = await getStageIntegrations(stage.id)
        } catch {
          // Leave undefined if fetch fails
        }
      })
    )
    setIntegrationData((prev) => ({ ...prev, ...data }))
  }

  // Permission check
  if (user?.role !== UserRole.ADMIN && user?.role !== UserRole.RECRUITER) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500 dark:text-gray-400">You don't have permission to view this page.</p>
      </div>
    )
  }

  // Fetch lead stages
  const fetchLeadStages = async () => {
    setLeadLoading(true)
    setLeadError('')
    try {
      const data = await getOnboardingStages({ entity_type: 'lead' })
      setLeadStages(data)
      fetchIntegrationData(data)
    } catch {
      setLeadError('Failed to load lead stages')
    } finally {
      setLeadLoading(false)
    }
  }

  // Fetch company stages
  const fetchCompanyStages = async () => {
    setCompanyLoading(true)
    setCompanyError('')
    try {
      const data = await getOnboardingStages({ entity_type: 'company' })
      setCompanyStages(data)
      fetchIntegrationData(data)
    } catch {
      setCompanyError('Failed to load company stages')
    } finally {
      setCompanyLoading(false)
    }
  }

  // Fetch candidate stages
  const fetchCandidateStages = async () => {
    setCandidateLoading(true)
    setCandidateError('')
    try {
      const data = await getOnboardingStages({ entity_type: 'candidate' })
      setCandidateStages(data)
      fetchIntegrationData(data)
    } catch {
      setCandidateError('Failed to load candidate stages')
    } finally {
      setCandidateLoading(false)
    }
  }

  useEffect(() => {
    fetchLeadStages()
    fetchCompanyStages()
    fetchCandidateStages()
  }, [])

  const stages = activeTab === 'lead' ? leadStages : activeTab === 'company' ? companyStages : candidateStages
  const setStages = activeTab === 'lead' ? setLeadStages : activeTab === 'company' ? setCompanyStages : setCandidateStages
  const loading = activeTab === 'lead' ? leadLoading : activeTab === 'company' ? companyLoading : candidateLoading
  const error = activeTab === 'lead' ? leadError : activeTab === 'company' ? companyError : candidateError
  const fetchStages = activeTab === 'lead' ? fetchLeadStages : activeTab === 'company' ? fetchCompanyStages : fetchCandidateStages

  // Handle create
  const handleCreate = () => {
    setSelectedStage(null)
    setIsCreating(true)
    setEditModalOpen(true)
  }

  // Handle edit
  const handleEdit = (stage: OnboardingStage) => {
    setSelectedStage(stage)
    setIsCreating(false)
    setEditModalOpen(true)
  }

  // Handle delete
  const handleDelete = (stage: OnboardingStage) => {
    setSelectedStage(stage)
    setDeleteModalOpen(true)
  }

  // Handle view integrations
  const handleViewIntegrations = (stage: OnboardingStage) => {
    setIntegrationStage(stage)
    setIntegrationDrawerOpen(true)
  }

  // Save handler
  const handleSave = async (data: { name: string; color: string; is_terminal: boolean }) => {
    if (isCreating) {
      const nextOrder = stages.length > 0 ? Math.max(...stages.map(s => s.order)) + 1 : 0
      await createOnboardingStage({
        name: data.name,
        entity_type: activeTab,
        color: data.color,
        is_terminal: data.is_terminal,
        order: nextOrder,
      })
    } else if (selectedStage) {
      await updateOnboardingStage(selectedStage.id, {
        name: data.name,
        color: data.color,
        is_terminal: data.is_terminal,
      })
    }
    await fetchStages()
  }

  // Delete confirm handler
  const handleConfirmDelete = async () => {
    if (selectedStage) {
      await deleteOnboardingStage(selectedStage.id)
      await fetchStages()
    }
  }

  // Drag handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDragOverIndex(index)
  }

  const handleDragEnd = async () => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      const newStages = [...stages]
      const [removed] = newStages.splice(draggedIndex, 1)
      newStages.splice(dragOverIndex, 0, removed)

      // Update local state immediately
      setStages(newStages)

      // Reorder on server
      try {
        await reorderOnboardingStages(
          activeTab,
          newStages.map(s => s.id)
        )
      } catch {
        // Revert on error
        await fetchStages()
      }
    }

    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Onboarding Stages</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Configure the pipeline stages for leads, companies, and candidates.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b dark:border-gray-700 mb-6">
        <button
          onClick={() => setActiveTab('lead')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'lead'
              ? 'border-gray-900 dark:border-gray-100 text-gray-900 dark:text-gray-100'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <Users className="w-4 h-4" />
          Lead Stages
        </button>
        <button
          onClick={() => setActiveTab('company')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'company'
              ? 'border-gray-900 dark:border-gray-100 text-gray-900 dark:text-gray-100'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Company Stages
        </button>
        <button
          onClick={() => setActiveTab('candidate')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'candidate'
              ? 'border-gray-900 dark:border-gray-100 text-gray-900 dark:text-gray-100'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <User className="w-4 h-4" />
          Candidate Stages
        </button>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 mb-4">
        {activeTab === 'company' && (
          <Link
            to="/dashboard?preview-onboarding=true"
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-md hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <Eye className="w-4 h-4" />
            Preview Wizard
          </Link>
        )}
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-medium rounded-md hover:bg-gray-800 dark:hover:bg-gray-200"
        >
          <Plus className="w-4 h-4" />
          Add Stage
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100" />
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-48 text-red-600 dark:text-red-400">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      ) : stages.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <p>No stages configured yet.</p>
          <p className="text-sm mt-1">Click "Add Stage" to create your first onboarding stage.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 border dark:border-gray-700 rounded-lg overflow-hidden">
          <div className="divide-y dark:divide-gray-700">
            {stages.map((stage, index) => (
              <div
                key={stage.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-4 px-4 py-3 bg-white dark:bg-gray-900 transition-colors ${
                  dragOverIndex === index ? 'bg-gray-50 dark:bg-gray-800' : ''
                } ${draggedIndex === index ? 'opacity-50' : ''}`}
              >
                {/* Drag handle */}
                <div className="cursor-grab text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <GripVertical className="w-5 h-5" />
                </div>

                {/* Order number */}
                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-sm font-medium text-gray-600 dark:text-gray-300">
                  {index + 1}
                </div>

                {/* Color indicator */}
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: stage.color }}
                />

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-gray-100">{stage.name}</span>
                    {stage.is_terminal && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                        <Flag className="w-3 h-3" />
                        Terminal
                      </span>
                    )}
                    <StageIntegrationBadges
                      meetingTypesCount={integrationData[stage.id]?.meeting_types?.length || 0}
                      wizardStep={integrationData[stage.id]?.wizard_step || null}
                      entityCount={
                        (integrationData[stage.id]?.entity_counts?.companies || 0) +
                        (integrationData[stage.id]?.entity_counts?.leads || 0) +
                        (integrationData[stage.id]?.entity_counts?.candidates || 0)
                      }
                      onClick={() => handleViewIntegrations(stage)}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(stage)}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(stage)}
                    className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Help text */}
      <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        Drag and drop stages to reorder them. The order determines the progression of the onboarding workflow.
      </p>

      {/* Modals */}
      <EditModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        stage={selectedStage}
        entityType={activeTab}
        onSave={handleSave}
        isCreating={isCreating}
      />
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        stage={selectedStage}
        integrationData={selectedStage ? integrationData[selectedStage.id] || null : null}
        onConfirm={handleConfirmDelete}
      />

      {/* Integration Drawer */}
      {integrationDrawerOpen && integrationStage && (
        <StageIntegrationsDrawer
          stage={integrationStage}
          onClose={() => {
            setIntegrationDrawerOpen(false)
            setIntegrationStage(null)
          }}
        />
      )}
    </div>
  )
}
