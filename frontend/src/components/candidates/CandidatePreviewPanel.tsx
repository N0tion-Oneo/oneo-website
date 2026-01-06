import { useState, useEffect, useCallback, useRef } from 'react'
import { CandidateAdminListItem, ProfileSuggestionFieldType, AssignedUser } from '@/types'
import { FocusMode } from '@/components/service'
import { DrawerWithPanels, EntityActionRail, badgeStyles } from '@/components/common'
import { TasksPanel, TimelinePanel, ApplicationsPanel } from '@/components/service/panels'
import api from '@/services/api'
import { useAdminSuggestions, useTasks, useEntityActions, useDrawerPanelPreferences } from '@/hooks'
import type { ActionHandlers } from '@/components/service/actionConfig'
import { EntityProfilePanel } from '@/components/service/panels/EntityProfilePanel'
import CandidateActivityTab from './CandidateActivityTab'
import AddToJobModal from './AddToJobModal'
import ApplicationDrawer from '@/components/applications/ApplicationDrawer'
import { SuggestionsPanel } from '@/components/suggestions'
import {
  getEntityPanelOptions,
  type EntityPanelType,
} from '@/components/service/panelConfig'

// =============================================================================
// Types
// =============================================================================

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
  const [activePanel, setActivePanel] = useState<EntityPanelType>('profile')
  const viewRecordedRef = useRef<number | null>(null)
  const [showAddToJobModal, setShowAddToJobModal] = useState(false)
  const [applicationsRefreshKey, setApplicationsRefreshKey] = useState(0)
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null)
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

  const handleCloseSuggestionPanel = useCallback(() => {
    setSuggestionPanel({ isOpen: false, fieldType: null, fieldName: null })
  }, [])

  // Handle refresh
  const handleRefresh = () => {
    onRefresh?.()
    refetchTasks()
  }

  // Handle assigned change
  const handleAssignedChange = async (assignedTo: AssignedUser[]) => {
    if (!candidate) return
    try {
      await api.patch(`/admin/candidates/${candidate.id}/`, {
        assigned_to_ids: assignedTo.map((u) => u.id),
      })
      onRefresh?.()
    } catch (err) {
      console.error('Failed to update assigned:', err)
    }
  }

  // Action handlers for the action rail
  const actionHandlers: ActionHandlers = {
    'view-full-profile': () => {
      if (candidate) {
        window.open(`/dashboard/admin/candidates/${candidate.slug || candidate.id}`, '_blank')
      }
    },
    'add-to-job': () => setShowAddToJobModal(true),
    'add-activity': () => setActivePanel('timeline'),
    'add-note': () => setActivePanel('timeline'),
    'service-mode': () => setShowServiceMode(true),
  }

  // Get resolved actions using the declarative config
  const actions = useEntityActions(
    'candidate',
    candidate as unknown as Record<string, unknown>,
    actionHandlers,
    { extraContext: { isAdminMode: !isClientMode } }
  )

  // Get available panels from shared config
  // Filter to client-allowed panels in client mode
  const availablePanels = getEntityPanelOptions('candidate').filter((panel) => {
    if (isClientMode) {
      // Client mode only shows profile and applications
      return panel.type === 'profile' || panel.type === 'applications'
    }
    // Admin mode shows all panels
    return true
  })

  // Panel customization - allows users to show/hide/reorder panels (admin mode only)
  const panelPrefs = useDrawerPanelPreferences({
    drawerKey: 'candidate',
    availablePanels: availablePanels.map((p) => p.type),
    defaultPanels: isClientMode ? ['profile', 'applications'] : ['profile', 'applications', 'tasks', 'timeline'],
  })

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
          <EntityProfilePanel
            entityType="candidate"
            entityId={String(candidate.id)}
            entity={candidate as unknown as Record<string, unknown>}
            hideHeader
          />
        )

      case 'applications':
        return (
          <ApplicationsPanel
            key={applicationsRefreshKey}
            candidateId={candidate.id}
            mode={mode}
            onAddToJob={isClientMode ? undefined : () => setShowAddToJobModal(true)}
            onApplicationClick={(appId) => setSelectedApplicationId(appId)}
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
      <span className={`${badgeStyles.base} ${badgeStyles.orange}`}>
        {pendingSuggestionsCount} pending suggestion{pendingSuggestionsCount !== 1 ? 's' : ''}
      </span>
    ) : undefined

  // Avatar for header
  const avatar = candidate ? (
    <div className="w-10 h-10 bg-gray-900 dark:bg-gray-700 rounded-full flex items-center justify-center text-white text-[13px] font-medium flex-shrink-0">
      {candidate.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)}
    </div>
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
        entityType="Candidate"
        title={candidate?.full_name || 'Candidate Details'}
        subtitle={candidate?.headline || undefined}
        isLoading={false}
        avatar={avatar}
        statusBadge={statusBadge}
        focusModeLabel="Service Mode"
        onEnterFocusMode={isClientMode ? undefined : () => setShowServiceMode(true)}
        actionRail={
          <EntityActionRail
            actions={actions}
            assignedTo={!isClientMode && candidate ? candidate.assigned_to || [] : undefined}
            onAssignedChange={!isClientMode ? handleAssignedChange : undefined}
          />
        }
        availablePanels={availablePanels}
        defaultPanel="profile"
        activePanel={activePanel}
        onPanelChange={(panel) => setActivePanel(panel as EntityPanelType)}
        panelCustomization={!isClientMode ? {
          visiblePanels: panelPrefs.visiblePanels,
          hiddenPanels: panelPrefs.hiddenPanels,
          onAddPanel: panelPrefs.addPanel,
          onRemovePanel: panelPrefs.removePanel,
          onMovePanel: panelPrefs.movePanel,
          canRemovePanel: panelPrefs.canRemovePanel,
          canAddPanel: panelPrefs.canAddPanel,
          onResetToDefaults: panelPrefs.resetToDefaults,
          isCustomized: panelPrefs.isCustomized,
        } : undefined}
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

      {/* Application Drawer for viewing application details inline */}
      <ApplicationDrawer
        applicationId={selectedApplicationId}
        isOpen={!!selectedApplicationId}
        onClose={() => setSelectedApplicationId(null)}
      />
    </>
  )
}
