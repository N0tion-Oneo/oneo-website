/**
 * JobDetailDrawer - Panel-based drawer for viewing/editing job details
 *
 * Uses DrawerWithPanels pattern (like CompanyDetailDrawer) with:
 * - View mode first (editable subpanels)
 * - Action rail with status, duplicate, archive, etc.
 * - Panels: Details, Applications, Tasks, Timeline
 */

import { useState, useEffect } from 'react'
import { Briefcase } from 'lucide-react'
import { DrawerWithPanels, EntityActionRail, badgeStyles } from '@/components/common'
import {
  TasksPanel,
  ApplicationsPanel,
  TimelinePanel,
} from '@/components/service/panels'
import { JobProfilePanel } from '@/components/service/panels/JobProfilePanel'
import { JobPipelinePanel } from '@/components/service/panels/JobPipelinePanel'
import { JobQuestionsPanel } from '@/components/service/panels/JobQuestionsPanel'
import { JobScreeningPanel } from '@/components/service/panels/JobScreeningPanel'
import { FocusMode } from '@/components/service/FocusMode'
import { ApplicationDrawer } from '@/components/applications'
import { useJobDetail, useJobStatus, useTasks, useEntityActions, useDrawerPanelPreferences } from '@/hooks'
import { useAuth } from '@/contexts/AuthContext'
import type { ActionHandlers } from '@/components/service/actionConfig'
import { getJobPanelOptions, type JobPanelType } from '@/components/service/panelConfig'
import { JobStatus, UserRole } from '@/types'
import type { AssignedUser } from '@/types'
import api from '@/services/api'

// =============================================================================
// Status Badge Helper
// =============================================================================

const statusConfig: Record<JobStatus, { className: string; label: string }> = {
  [JobStatus.DRAFT]: { className: badgeStyles.gray, label: 'Draft' },
  [JobStatus.PUBLISHED]: { className: badgeStyles.green, label: 'Published' },
  [JobStatus.CLOSED]: { className: badgeStyles.red, label: 'Closed' },
  [JobStatus.FILLED]: { className: badgeStyles.blue, label: 'Filled' },
  [JobStatus.ARCHIVED]: { className: badgeStyles.gray, label: 'Archived' },
}

// =============================================================================
// Main Component
// =============================================================================

export interface JobDetailDrawerProps {
  jobId: string
  onClose: () => void
  onRefresh?: () => void
}

export default function JobDetailDrawer({
  jobId,
  onClose,
  onRefresh,
}: JobDetailDrawerProps) {
  const { job, isLoading, refetch } = useJobDetail(jobId)
  const { publishJob, closeJob, markJobFilled } = useJobStatus()
  const [activePanel, setActivePanel] = useState<JobPanelType>('details')
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null)
  const [showServiceMode, setShowServiceMode] = useState(false)

  const { user } = useAuth()
  const isStaffUser = user?.role === UserRole.RECRUITER || user?.role === UserRole.ADMIN

  // Tasks hook
  const { tasks, refetch: refetchTasks } = useTasks(
    jobId ? { entity_type: 'job', entity_id: jobId } : undefined
  )

  // Reset panel when drawer opens
  useEffect(() => {
    setActivePanel('details')
  }, [jobId])

  // Action handlers for the action rail
  const actionHandlers: ActionHandlers = {
    'add-application': () => {
      // TODO: Open add candidate to job modal
      setActivePanel('applications')
    },
    'view-applications': () => setActivePanel('applications'),
    'duplicate-job': async () => {
      try {
        await api.post(`/jobs/${jobId}/duplicate/`)
        onRefresh?.()
      } catch (err) {
        console.error('Failed to duplicate job:', err)
      }
    },
    'view-public': () => {
      if (job?.slug) {
        window.open(`/jobs/${job.slug}`, '_blank')
      }
    },
    'archive-job': async () => {
      try {
        await api.patch(`/jobs/${jobId}/detail/`, { status: JobStatus.ARCHIVED })
        refetch()
        onRefresh?.()
      } catch (err) {
        console.error('Failed to archive job:', err)
      }
    },
    'service-mode': () => setShowServiceMode(true),
  }

  // Get resolved actions using the declarative config
  const actions = useEntityActions(
    'job',
    job as unknown as Record<string, unknown>,
    actionHandlers
  )

  // Get available panels from shared config
  const availablePanels = getJobPanelOptions()

  // Panel customization - allows users to show/hide/reorder panels
  const panelPrefs = useDrawerPanelPreferences({
    drawerKey: 'job',
    availablePanels: availablePanels.map((p) => p.type),
    defaultPanels: ['details', 'pipeline', 'applications', 'tasks', 'timeline'],
  })

  const handleAssignedChange = async (assignedTo: AssignedUser[]) => {
    try {
      await api.patch(`/jobs/${jobId}/detail/`, {
        assigned_recruiter_ids: assignedTo.map((u) => u.id),
      })
      refetch()
      onRefresh?.()
    } catch (err) {
      console.error('Failed to update assigned recruiters:', err)
    }
  }

  const handleRefresh = () => {
    refetch()
    refetchTasks()
    onRefresh?.()
  }

  // Status change handlers
  const handleStatusChange = async (newStatus: JobStatus) => {
    try {
      if (newStatus === JobStatus.PUBLISHED) {
        await publishJob(jobId)
      } else if (newStatus === JobStatus.CLOSED) {
        await closeJob(jobId)
      } else if (newStatus === JobStatus.FILLED) {
        await markJobFilled(jobId)
      } else {
        // DRAFT and ARCHIVED use direct patch
        await api.patch(`/jobs/${jobId}/detail/`, { status: newStatus })
      }
      refetch()
      onRefresh?.()
    } catch (err) {
      console.error('Failed to change status:', err)
    }
  }

  // Render panel content
  const renderPanel = (panelType: string) => {
    if (!job) {
      return (
        <div className="flex items-center justify-center h-32">
          <p className="text-[14px] text-gray-500 dark:text-gray-400">Job not found</p>
        </div>
      )
    }

    switch (panelType) {
      case 'details':
        return (
          <JobProfilePanel
            jobId={jobId}
            entity={job}
            onRefresh={handleRefresh}
          />
        )

      case 'pipeline':
        return (
          <JobPipelinePanel
            jobId={jobId}
            job={job}
            onRefresh={handleRefresh}
          />
        )

      case 'questions':
        return (
          <JobQuestionsPanel
            jobId={jobId}
            job={job}
            onRefresh={handleRefresh}
          />
        )

      case 'screening':
        return (
          <JobScreeningPanel
            jobId={jobId}
            job={job}
            onRefresh={handleRefresh}
          />
        )

      case 'applications':
        return (
          <ApplicationsPanel
            jobId={jobId}
            mode="admin"
            onAddCandidate={() => {
              // TODO: Open add candidate modal
            }}
            onApplicationClick={(appId) => setSelectedApplicationId(appId)}
          />
        )

      case 'tasks':
        return (
          <TasksPanel
            entityType="job"
            entityId={jobId}
            tasks={tasks}
            onRefresh={refetchTasks}
          />
        )

      case 'timeline':
        return (
          <TimelinePanel
            entityType="job"
            entityId={jobId}
            onRefresh={handleRefresh}
          />
        )

      default:
        return null
    }
  }

  // Status badge for header
  const statusBadge = job ? (
    <div className="relative group">
      <span
        className={`${badgeStyles.base} ${statusConfig[job.status]?.className || badgeStyles.gray} cursor-pointer`}
      >
        {statusConfig[job.status]?.label || job.status}
      </span>
      {/* Status dropdown on hover */}
      <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg dark:shadow-gray-900/40 z-50 min-w-[140px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
        <div className="py-1">
          {Object.entries(statusConfig)
            .filter(([status]) => status !== job.status)
            .map(([status, config]) => (
              <button
                key={status}
                onClick={() => handleStatusChange(status as JobStatus)}
                className="w-full px-3 py-2 text-left text-[13px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
              >
                <span className={`w-2 h-2 rounded-full ${config.className}`} />
                {config.label}
              </button>
            ))}
        </div>
      </div>
    </div>
  ) : undefined

  // Avatar/Icon for header
  const avatar = job?.company?.logo ? (
    <img
      src={job.company.logo}
      alt={job.company.name}
      className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
    />
  ) : (
    <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
      <Briefcase className="w-5 h-5 text-purple-600 dark:text-purple-400" />
    </div>
  )

  // Service Mode (Focus Mode for Jobs)
  if (showServiceMode && job) {
    return (
      <FocusMode
        mode="job"
        jobId={jobId}
        jobName={job.title}
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
        isOpen={!!jobId}
        onClose={onClose}
        entityType="Job"
        title={job?.title || 'Job Details'}
        subtitle={job?.company?.name || undefined}
        isLoading={isLoading}
        avatar={avatar}
        statusBadge={statusBadge}
        focusModeLabel="Job Mode"
        onEnterFocusMode={() => setShowServiceMode(true)}
        actionRail={
          <EntityActionRail
            actions={actions}
            assignedTo={
              isStaffUser && job?.assigned_recruiters
                ? job.assigned_recruiters.map((r) => ({
                    id: Number(r.id),
                    email: r.email,
                    first_name: r.first_name,
                    last_name: r.last_name,
                    full_name: `${r.first_name} ${r.last_name}`,
                  }))
                : undefined
            }
            onAssignedChange={isStaffUser ? handleAssignedChange : undefined}
          />
        }
        availablePanels={availablePanels}
        defaultPanel="details"
        activePanel={activePanel}
        onPanelChange={(panel) => setActivePanel(panel as JobPanelType)}
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

      {/* Application Drawer */}
      <ApplicationDrawer
        applicationId={selectedApplicationId}
        isOpen={!!selectedApplicationId}
        onClose={() => setSelectedApplicationId(null)}
        onUpdate={() => {
          refetch()
          onRefresh?.()
        }}
      />
    </>
  )
}
