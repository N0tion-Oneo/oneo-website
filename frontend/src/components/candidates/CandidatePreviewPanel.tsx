import { useState, useEffect, useCallback, useRef } from 'react'
import {
  User,
  Briefcase,
  Activity,
  CheckSquare,
  Calendar,
} from 'lucide-react'
import { CandidateAdminListItem, ProfileSuggestionFieldType, AssignedUser } from '@/types'
import { FocusMode } from '@/components/service'
import { DrawerWithPanels, type PanelOption } from '@/components/common'
import { TasksPanel, TimelinePanel, ApplicationsPanel } from '@/components/service/panels'
import api from '@/services/api'
import { useAdminSuggestions, useTasks } from '@/hooks'
import CandidateProfileCard from './CandidateProfileCard'
import CandidateActivityTab from './CandidateActivityTab'
import AddToJobModal from './AddToJobModal'
import { SuggestionsPanel } from '@/components/suggestions'

// =============================================================================
// Types
// =============================================================================

type PanelType = 'profile' | 'applications' | 'activity' | 'tasks' | 'timeline'

interface SuggestionPanelState {
  isOpen: boolean
  fieldType: ProfileSuggestionFieldType | null
  fieldName: string | null
  relatedObjectId?: string
  relatedObjectLabel?: string
}

interface CandidatePreviewPanelProps {
  candidate: CandidateAdminListItem | null
  onClose: () => void
  onRefresh?: () => void
  mode?: 'admin' | 'client'
}

// =============================================================================
// Main Component
// =============================================================================

export default function CandidatePreviewPanel({
  candidate,
  onClose,
  onRefresh,
  mode = 'admin',
}: CandidatePreviewPanelProps) {
  const isClientMode = mode === 'client'
  const [activePanel, setActivePanel] = useState<PanelType>('profile')
  const viewRecordedRef = useRef<number | null>(null)
  const [showAddToJobModal, setShowAddToJobModal] = useState(false)
  const [applicationsRefreshKey, setApplicationsRefreshKey] = useState(0)
  const [suggestionPanel, setSuggestionPanel] = useState<SuggestionPanelState>({
    isOpen: false,
    fieldType: null,
    fieldName: null,
  })
  const [showServiceMode, setShowServiceMode] = useState(false)

  const candidateId = candidate?.id ? String(candidate.id) : ''

  // Suggestions hook - only load for admin mode
  const {
    suggestions,
    createSuggestion,
    reopenSuggestion,
    closeSuggestion,
    isCreating,
    isUpdating,
  } = useAdminSuggestions(isClientMode ? null : (candidate?.id ?? null))

  // Tasks hook - only for admin mode
  const { tasks, refetch: refetchTasks } = useTasks(
    !isClientMode && candidateId
      ? { entity_type: 'candidate', entity_id: candidateId }
      : undefined
  )

  // Reset panel and close suggestions panel when candidate changes
  useEffect(() => {
    setActivePanel('profile')
    setSuggestionPanel({ isOpen: false, fieldType: null, fieldName: null })
  }, [candidate?.id])

  // Record profile view when panel opens (admin only)
  useEffect(() => {
    if (!isClientMode && candidate && candidate.id !== viewRecordedRef.current) {
      viewRecordedRef.current = candidate.id
      // Fire and forget - we don't need to wait for this
      api.post(`/admin/candidates/${candidate.id}/view/`).catch(() => {
        // Silently fail - view recording is non-critical
      })
    }
  }, [candidate, isClientMode])

  // Handle adding a suggestion (opens the suggestions panel)
  const handleAddSuggestion = useCallback(
    (fieldType: ProfileSuggestionFieldType, fieldName: string, relatedObjectId?: string) => {
      // Find related object label for better UX
      let relatedObjectLabel: string | undefined
      if (relatedObjectId && candidate) {
        if (fieldType === 'experience') {
          const exp = candidate.experiences?.find((e) => e.id === relatedObjectId)
          if (exp) {
            relatedObjectLabel = `${exp.job_title} at ${exp.company_name}`
          }
        } else if (fieldType === 'education') {
          const edu = candidate.education?.find((e) => e.id === relatedObjectId)
          if (edu) {
            relatedObjectLabel = `${edu.degree} - ${edu.institution}`
          }
        }
      }

      setSuggestionPanel({
        isOpen: true,
        fieldType,
        fieldName,
        relatedObjectId,
        relatedObjectLabel,
      })
    },
    [candidate]
  )

  const handleCloseSuggestionPanel = useCallback(() => {
    setSuggestionPanel({ isOpen: false, fieldType: null, fieldName: null })
  }, [])

  // Handle assigned_to changes
  const handleAssignedToChange = useCallback(
    async (newAssigned: AssignedUser[]) => {
      if (!candidate) return
      try {
        await api.patch(`/candidates/${candidate.slug}/`, {
          assigned_to_ids: newAssigned.map((u) => u.id),
        })
        // Trigger parent to refresh data
        onRefresh?.()
      } catch (err) {
        console.error('Failed to update assigned_to:', err)
      }
    },
    [candidate, onRefresh]
  )

  // Handle refresh
  const handleRefresh = () => {
    onRefresh?.()
    refetchTasks()
  }

  // Build available panels
  const buildAvailablePanels = (): PanelOption[] => {
    const panels: PanelOption[] = [
      { type: 'profile', label: 'Candidate Profile', icon: <User className="w-4 h-4" /> },
      { type: 'applications', label: 'Applications', icon: <Briefcase className="w-4 h-4" /> },
    ]

    // Admin-only panels
    if (!isClientMode) {
      panels.push(
        { type: 'activity', label: 'Activity Log', icon: <Activity className="w-4 h-4" /> },
        { type: 'tasks', label: 'Tasks', icon: <CheckSquare className="w-4 h-4" /> },
        { type: 'timeline', label: 'Timeline', icon: <Calendar className="w-4 h-4" /> }
      )
    }

    return panels
  }

  // Render panel content
  const renderPanel = (panelType: string) => {
    if (!candidate) {
      return (
        <div className="flex items-center justify-center h-32">
          <p className="text-[14px] text-gray-500 dark:text-gray-400">Candidate not found</p>
        </div>
      )
    }

    switch (panelType) {
      case 'profile':
        return (
          <div className="h-full overflow-y-auto p-4">
            <CandidateProfileCard
              candidate={candidate}
              experiences={candidate.experiences || []}
              education={candidate.education || []}
              variant="compact"
              showAdminActions={true}
              showContactInfo={true}
              showProfileCompleteness={!isClientMode}
              editLink={isClientMode ? undefined : `/dashboard/admin/candidates/${candidate.slug}`}
              hideViewProfileLink={true}
              enableSuggestions={!isClientMode}
              suggestions={isClientMode ? [] : suggestions}
              onAddSuggestion={isClientMode ? undefined : handleAddSuggestion}
              onAssignedToChange={isClientMode ? undefined : handleAssignedToChange}
            />
          </div>
        )

      case 'applications':
        return (
          <ApplicationsPanel
            key={applicationsRefreshKey}
            candidateId={candidate.id}
            mode={mode}
            onAddToJob={isClientMode ? undefined : () => setShowAddToJobModal(true)}
          />
        )

      case 'activity':
        return (
          <div className="h-full overflow-y-auto p-4">
            <CandidateActivityTab candidateId={candidate.id} />
          </div>
        )

      case 'tasks':
        return (
          <TasksPanel
            entityType="candidate"
            entityId={candidateId}
            tasks={tasks}
            onRefresh={refetchTasks}
          />
        )

      case 'timeline':
        return (
          <TimelinePanel
            entityType="candidate"
            entityId={candidateId}
            onRefresh={handleRefresh}
          />
        )

      default:
        return null
    }
  }

  // Calculate pending suggestions count for header badge
  const pendingSuggestionsCount = suggestions.filter((s) => s.status === 'pending').length
  const statusBadge =
    !isClientMode && pendingSuggestionsCount > 0 ? (
      <span className="px-2 py-0.5 text-[11px] font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full">
        {pendingSuggestionsCount} pending suggestion{pendingSuggestionsCount !== 1 ? 's' : ''}
      </span>
    ) : undefined

  // Service Mode
  if (showServiceMode && candidate && !isClientMode) {
    return (
      <FocusMode
        mode="entity"
        entityType="candidate"
        entityId={String(candidate.id)}
        entityName={candidate.full_name}
        onClose={() => {
          setShowServiceMode(false)
          handleRefresh()
        }}
      />
    )
  }

  return (
    <>
      <DrawerWithPanels
        isOpen={!!candidate}
        onClose={onClose}
        title={candidate?.full_name || 'Candidate Details'}
        subtitle={candidate?.headline || undefined}
        isLoading={false}
        statusBadge={statusBadge}
        focusModeLabel="Service Mode"
        onEnterFocusMode={isClientMode ? undefined : () => setShowServiceMode(true)}
        availablePanels={buildAvailablePanels()}
        defaultPanel="profile"
        activePanel={activePanel}
        onPanelChange={(panel) => setActivePanel(panel as PanelType)}
        renderPanel={renderPanel}
      />

      {/* Suggestions Panel - Admin only */}
      {!isClientMode && candidate && (
        <SuggestionsPanel
          isOpen={suggestionPanel.isOpen}
          onClose={handleCloseSuggestionPanel}
          fieldType={suggestionPanel.fieldType}
          fieldName={suggestionPanel.fieldName}
          relatedObjectId={suggestionPanel.relatedObjectId}
          relatedObjectLabel={suggestionPanel.relatedObjectLabel}
          suggestions={suggestions}
          candidate={candidate}
          onCreateSuggestion={createSuggestion}
          onReopenSuggestion={reopenSuggestion}
          onCloseSuggestion={closeSuggestion}
          isCreating={isCreating}
          isUpdating={isUpdating}
        />
      )}

      {/* Add to Job Modal - Admin only */}
      {!isClientMode && candidate && (
        <AddToJobModal
          isOpen={showAddToJobModal}
          onClose={() => setShowAddToJobModal(false)}
          candidateId={candidate.id}
          candidateName={candidate.full_name}
          onSuccess={() => {
            // Refresh applications panel and switch to it
            setApplicationsRefreshKey((prev) => prev + 1)
            setActivePanel('applications')
          }}
        />
      )}
    </>
  )
}
