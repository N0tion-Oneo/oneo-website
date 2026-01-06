/**
 * CompanyDetailDrawer - Drawer for viewing company details on admin companies page
 */

import { useState, useEffect } from 'react'
import { Building2, Target, Handshake } from 'lucide-react'
import { FocusMode } from '@/components/service'
import JobDrawer from '@/components/jobs/JobDrawer'
import { DrawerWithPanels, EntityActionRail, badgeStyles } from '@/components/common'
import {
  JobsPanel,
  TeamPanel,
  TasksPanel,
  TimelinePanel,
  SubscriptionsPanel,
  CompanyDetailsPanel,
  CompanyCulturePanel,
} from '@/components/service/panels'
import { EntityProfilePanel } from '@/components/service/panels/EntityProfilePanel'
import { useCompanyById, useTasks, useEntityActions, useDrawerPanelPreferences } from '@/hooks'
import type { ActionHandlers } from '@/components/service/actionConfig'
import { SubscriptionDrawer } from '@/components/subscriptions'
import {
  getEntityPanelOptions,
  type EntityPanelType,
} from '@/components/service/panelConfig'
import type { AssignedUser } from '@/types'
import api from '@/services/api'

// =============================================================================
// Helper Functions
// =============================================================================

function getServiceTypeBadge(serviceType: string | null) {
  switch (serviceType) {
    case 'headhunting':
      return { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Headhunting', icon: Target }
    case 'retained':
      return { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Retained', icon: Handshake }
    default:
      return { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-400 dark:text-gray-500', label: 'Not Set', icon: null }
  }
}

// =============================================================================
// Main Component
// =============================================================================

export interface CompanyDetailDrawerProps {
  companyId: string
  onClose: () => void
  onRefresh?: () => void
}

export default function CompanyDetailDrawer({
  companyId,
  onClose,
  onRefresh,
}: CompanyDetailDrawerProps) {
  const { company, isLoading, refetch } = useCompanyById(companyId)
  const [activePanel, setActivePanel] = useState<EntityPanelType>('details')
  const [showSubscriptionDrawer, setShowSubscriptionDrawer] = useState(false)
  const [showServiceMode, setShowServiceMode] = useState(false)
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [showJobDrawer, setShowJobDrawer] = useState(false)

  // Tasks hook
  const { tasks, refetch: refetchTasks } = useTasks(
    companyId ? { entity_type: 'company', entity_id: companyId } : undefined
  )

  // Reset panel when drawer opens
  useEffect(() => {
    setActivePanel('details')
  }, [companyId])

  // Action handlers for the action rail
  const actionHandlers: ActionHandlers = {
    'edit-profile': () => {
      setActivePanel('details')
      // Details panel has its own edit mode
    },
    'add-job': () => setShowJobDrawer(true),
    'add-activity': () => setActivePanel('timeline'),
    'service-mode': () => setShowServiceMode(true),
  }

  // Get resolved actions using the declarative config
  const actions = useEntityActions(
    'company',
    company as unknown as Record<string, unknown>,
    actionHandlers
  )

  // Get available panels from shared config
  const availablePanels = getEntityPanelOptions('company')

  // Panel customization - allows users to show/hide/reorder panels
  const panelPrefs = useDrawerPanelPreferences({
    drawerKey: 'company',
    availablePanels: availablePanels.map((p) => p.type),
    defaultPanels: ['details', 'jobs', 'team', 'tasks', 'timeline', 'subscriptions'],
  })

  const handleAssignedChange = async (assignedTo: AssignedUser[]) => {
    try {
      await api.patch(`/companies/${companyId}/detail/`, {
        assigned_to_ids: assignedTo.map((u) => u.id),
      })
      refetch()
      onRefresh?.()
    } catch (err) {
      console.error('Failed to update assigned:', err)
    }
  }

  const handleRefresh = () => {
    refetch()
    refetchTasks()
    onRefresh?.()
  }

  // Render panel content
  const renderPanel = (panelType: string) => {
    if (!company) {
      return (
        <div className="flex items-center justify-center h-32">
          <p className="text-[14px] text-gray-500 dark:text-gray-400">Company not found</p>
        </div>
      )
    }

    switch (panelType) {
      case 'profile':
        return (
          <EntityProfilePanel
            entityType="company"
            entityId={companyId}
            entity={company as unknown as Record<string, unknown>}
            hideHeader
            isEditing={isEditingProfile}
            onEditToggle={setIsEditingProfile}
            onSaveProfile={async (data) => {
              await api.patch(`/companies/${companyId}/detail/`, data)
              refetch()
              onRefresh?.()
              setIsEditingProfile(false)
            }}
          />
        )

      case 'details':
        return (
          <CompanyDetailsPanel
            companyId={companyId}
            entity={company as unknown as Record<string, unknown>}
            onRefresh={handleRefresh}
          />
        )

      case 'culture':
        return (
          <CompanyCulturePanel
            companyId={companyId}
            entity={company as unknown as Record<string, unknown>}
            onRefresh={handleRefresh}
          />
        )

      case 'jobs':
        return <JobsPanel companyId={companyId} onCreateJob={() => setShowJobDrawer(true)} />

      case 'team':
        return (
          <TeamPanel
            companyId={companyId}
            entity={company as unknown as Record<string, unknown>}
          />
        )

      case 'subscriptions':
        return (
          <SubscriptionsPanel
            companyId={companyId}
            companyName={company?.name}
            onRefresh={handleRefresh}
          />
        )

      case 'tasks':
        return (
          <TasksPanel
            entityType="company"
            entityId={companyId}
            tasks={tasks}
            onRefresh={refetchTasks}
          />
        )

      case 'timeline':
        return (
          <TimelinePanel entityType="company" entityId={companyId} onRefresh={handleRefresh} />
        )

      default:
        return null
    }
  }

  // Service type badge for header
  const serviceTypeBadge = company ? getServiceTypeBadge(company.service_type) : null
  const ServiceTypeIcon = serviceTypeBadge?.icon

  const statusBadge = company ? (
    <div className="flex items-center gap-2">
      <span
        className={`${badgeStyles.base} ${serviceTypeBadge?.bg} ${serviceTypeBadge?.text}`}
      >
        {ServiceTypeIcon && <ServiceTypeIcon className="w-3 h-3" />}
        {serviceTypeBadge?.label}
      </span>
      <span
        className={`${badgeStyles.base} ${company.is_published ? badgeStyles.green : badgeStyles.gray}`}
      >
        {company.is_published ? 'Published' : 'Draft'}
      </span>
    </div>
  ) : undefined

  // Avatar/Logo for header
  const avatar = company?.logo ? (
    <img src={company.logo} alt={company.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
  ) : (
    <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
      <Building2 className="w-5 h-5 text-gray-500 dark:text-gray-400" />
    </div>
  )

  // Service Mode
  if (showServiceMode && company) {
    return (
      <FocusMode
        mode="entity"
        entityType="company"
        entityId={companyId}
        entityName={company.name}
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
        isOpen={!!companyId}
        onClose={onClose}
        entityType="Company"
        title={company?.name || 'Company Details'}
        subtitle={company?.tagline || company?.industry?.name || company?.headquarters_location || undefined}
        isLoading={isLoading}
        avatar={avatar}
        statusBadge={statusBadge}
        focusModeLabel="Service Mode"
        onEnterFocusMode={() => setShowServiceMode(true)}
        actionRail={
          <EntityActionRail
            actions={actions}
            assignedTo={company?.assigned_to || []}
            onAssignedChange={handleAssignedChange}
          />
        }
        availablePanels={availablePanels}
        defaultPanel="details"
        activePanel={activePanel}
        onPanelChange={(panel) => setActivePanel(panel as EntityPanelType)}
        panelCustomization={{
          visiblePanels: panelPrefs.visiblePanels,
          hiddenPanels: panelPrefs.hiddenPanels,
          onAddPanel: panelPrefs.addPanel,
          onRemovePanel: panelPrefs.removePanel,
          onMovePanel: panelPrefs.movePanel,
          canRemovePanel: panelPrefs.canRemovePanel,
          canAddPanel: panelPrefs.canAddPanel,
          onResetToDefaults: panelPrefs.resetToDefaults,
          isCustomized: panelPrefs.isCustomized,
        }}
        renderPanel={renderPanel}
      />

      {/* Subscription Drawer */}
      {showSubscriptionDrawer && company && (
        <SubscriptionDrawer
          company={{
            id: company.id,
            name: company.name,
            slug: company.slug,
            logo: company.logo,
            tagline: company.tagline,
            industry: company.industry,
            company_size: company.company_size,
            headquarters_location: company.headquarters_location,
            is_published: company.is_published,
            is_platform: false,
            service_type: company.service_type || null,
            created_at: company.created_at,
            jobs_total: 0,
            jobs_draft: 0,
            jobs_published: 0,
            jobs_closed: 0,
            jobs_filled: 0,
            jobs: [],
            assigned_to: company.assigned_to || [],
            onboarding_stage: null,
            subscription: null,
            primary_contact: null,
            pricing: null,
          }}
          onClose={() => setShowSubscriptionDrawer(false)}
          onRefresh={handleRefresh}
        />
      )}

      {/* Job Creation Drawer */}
      <JobDrawer
        jobId={null}
        isOpen={showJobDrawer}
        onClose={() => setShowJobDrawer(false)}
        companyId={companyId}
        onSuccess={() => {
          setShowJobDrawer(false)
          handleRefresh()
          setActivePanel('jobs')
        }}
      />
    </>
  )
}
