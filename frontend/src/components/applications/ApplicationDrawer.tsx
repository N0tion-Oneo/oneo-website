import { useState, useEffect, useRef } from 'react'
import {
  User,
  Clock,
  ChevronDown,
  FileText,
  GitBranch,
  Zap,
  Briefcase,
  CheckSquare,
  Calendar,
} from 'lucide-react'
import {
  useApplication,
  useRecordApplicationView,
  useTasks,
} from '@/hooks'
import { DrawerWithPanels, type PanelOption } from '@/components/common'
import { CandidateProfileCard } from '@/components/candidates'
import ActivityTimeline from './ActivityTimeline'
import { FocusMode } from '@/components/service'
import {
  AnswersPanel,
  TasksPanel,
  TimelinePanel,
  PipelinePanel,
  JobDetailPanel,
  ActionsPanel,
} from '@/components/service/panels'
import { ApplicationStatus } from '@/types'
import type { Application } from '@/types'

// =============================================================================
// Types
// =============================================================================

interface ApplicationDrawerProps {
  applicationId: string | null
  isOpen: boolean
  onClose: () => void
  onUpdate?: () => void
}

type PanelType = 'profile' | 'answers' | 'pipeline' | 'activity' | 'job' | 'actions' | 'tasks' | 'timeline'

// =============================================================================
// Helper Functions
// =============================================================================

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const getStatusColor = (status: ApplicationStatus) => {
  const colors = {
    [ApplicationStatus.APPLIED]: 'bg-gray-100 text-gray-700',
    [ApplicationStatus.SHORTLISTED]: 'bg-blue-100 text-blue-700',
    [ApplicationStatus.IN_PROGRESS]: 'bg-yellow-100 text-yellow-700',
    [ApplicationStatus.OFFER_MADE]: 'bg-purple-100 text-purple-700',
    [ApplicationStatus.OFFER_ACCEPTED]: 'bg-green-100 text-green-700',
    [ApplicationStatus.OFFER_DECLINED]: 'bg-orange-100 text-orange-700',
    [ApplicationStatus.REJECTED]: 'bg-red-100 text-red-700',
  }
  return colors[status] || 'bg-gray-100 text-gray-700'
}

const getKanbanColumnName = (application: Application): string => {
  switch (application.status) {
    case ApplicationStatus.APPLIED:
      return 'Applied'
    case ApplicationStatus.SHORTLISTED:
      return 'Shortlisted'
    case ApplicationStatus.IN_PROGRESS:
      return application.current_stage_name || `Stage ${application.current_stage_order}`
    case ApplicationStatus.OFFER_MADE:
      return 'Offer Made'
    case ApplicationStatus.OFFER_ACCEPTED:
      return 'Offer Accepted'
    case ApplicationStatus.OFFER_DECLINED:
      return 'Offer Declined'
    case ApplicationStatus.REJECTED:
      return 'Rejected'
    default:
      return application.status
  }
}

// =============================================================================
// Main Component
// =============================================================================

export default function ApplicationDrawer({
  applicationId,
  isOpen,
  onClose,
  onUpdate,
}: ApplicationDrawerProps) {
  const [activePanel, setActivePanel] = useState<PanelType>('profile')
  const [isInterviewMode, setIsInterviewMode] = useState(false)
  const [isStageDropdownOpen, setIsStageDropdownOpen] = useState(false)
  const stageDropdownRef = useRef<HTMLDivElement>(null)

  const { application, isLoading, refetch } = useApplication(applicationId || '')

  // Fetch tasks for candidate
  const candidateId = application?.candidate?.id ? String(application.candidate.id) : ''
  const { tasks, refetch: refetchTasks } = useTasks(
    candidateId ? { entity_type: 'candidate', entity_id: candidateId } : undefined
  )

  // Record application view (debounced)
  useRecordApplicationView(isOpen ? applicationId : null)

  useEffect(() => {
    if (isOpen && applicationId) {
      refetch()
      setActivePanel('profile')
      setIsStageDropdownOpen(false)
    }
  }, [isOpen, applicationId, refetch])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (stageDropdownRef.current && !stageDropdownRef.current.contains(event.target as Node)) {
        setIsStageDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle refresh and notify parent
  const handleRefresh = () => {
    refetch()
    onUpdate?.()
  }

  // Build available panels
  const buildAvailablePanels = (): PanelOption[] => {
    const panels: PanelOption[] = [
      { type: 'profile', label: 'Candidate Profile', icon: <User className="w-4 h-4" /> },
    ]

    // Add answers panel if there are answers
    if (application?.answers && application.answers.length > 0) {
      panels.push({
        type: 'answers',
        label: 'Screening Answers',
        icon: <FileText className="w-4 h-4" />,
        count: application.answers.length,
      })
    }

    panels.push(
      { type: 'pipeline', label: 'Pipeline & Stages', icon: <GitBranch className="w-4 h-4" /> },
      { type: 'actions', label: 'Actions', icon: <Zap className="w-4 h-4" /> },
      { type: 'job', label: 'Job Details', icon: <Briefcase className="w-4 h-4" /> },
      { type: 'activity', label: 'Activity Log', icon: <Clock className="w-4 h-4" /> },
      { type: 'tasks', label: 'Tasks', icon: <CheckSquare className="w-4 h-4" /> },
      { type: 'timeline', label: 'Timeline', icon: <Calendar className="w-4 h-4" /> },
    )

    return panels
  }

  // Render panel content - using same components as FocusMode
  const renderPanel = (panelType: string) => {
    if (!application || !applicationId) {
      return (
        <div className="flex items-center justify-center h-32">
          <p className="text-[14px] text-gray-500">Application not found</p>
        </div>
      )
    }

    switch (panelType) {
      case 'profile':
        return (
          <div className="h-full overflow-y-auto p-4">
            <CandidateProfileCard
              candidate={application.candidate}
              experiences={application.candidate.experiences || []}
              education={application.candidate.education || []}
              coveringStatement={application.covering_statement}
              variant="compact"
              hideViewProfileLink={false}
            />
          </div>
        )

      case 'answers':
        return (
          <AnswersPanel
            answers={application.answers || []}
            isLoading={false}
          />
        )

      case 'pipeline':
        return (
          <PipelinePanel
            applicationId={applicationId}
            onRefresh={handleRefresh}
          />
        )

      case 'activity':
        return (
          <div className="h-full overflow-y-auto p-4">
            <ActivityTimeline applicationId={applicationId} />
          </div>
        )

      case 'job':
        return (
          <JobDetailPanel
            job={application.job}
            isLoading={false}
          />
        )

      case 'actions':
        return (
          <ActionsPanel
            applicationId={applicationId}
            application={application}
            onRefresh={handleRefresh}
          />
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

  // Stage dropdown component
  const renderStatusBadge = () => {
    if (!application) return null

    return (
      <div className="relative" ref={stageDropdownRef}>
        <button
          onClick={() => setIsStageDropdownOpen(!isStageDropdownOpen)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium rounded cursor-pointer hover:opacity-80 transition-opacity ${getStatusColor(application.status)}`}
        >
          {getKanbanColumnName(application)}
          <ChevronDown className="w-3.5 h-3.5" />
        </button>

        {/* Stage Dropdown - Shows current status, opens Interview Mode for stage changes */}
        {isStageDropdownOpen && (
          <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1">
            <div className="px-3 py-2 text-[11px] text-gray-500 uppercase tracking-wide border-b border-gray-100">
              Current Status
            </div>
            <div className="px-3 py-2">
              <span className={`inline-flex items-center px-2 py-1 text-[11px] font-medium rounded ${getStatusColor(application.status)}`}>
                {getKanbanColumnName(application)}
              </span>
            </div>
            <div className="border-t border-gray-100 mt-1 pt-1">
              <button
                onClick={() => {
                  setIsStageDropdownOpen(false)
                  setIsInterviewMode(true)
                }}
                className="w-full text-left px-3 py-2 text-[12px] text-gray-700 hover:bg-gray-50"
              >
                Open Interview Mode to change stage...
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Interview Mode (FocusMode)
  if (isInterviewMode && applicationId) {
    return (
      <FocusMode
        mode="application"
        applicationId={applicationId}
        onClose={() => {
          setIsInterviewMode(false)
          handleRefresh()
        }}
      />
    )
  }

  return (
    <DrawerWithPanels
      isOpen={isOpen}
      onClose={onClose}
      title={application?.candidate?.full_name || 'Application'}
      subtitle={application ? `Applied ${formatDate(application.applied_at)}` : undefined}
      isLoading={isLoading}
      statusBadge={renderStatusBadge()}
      focusModeLabel="Interview Mode"
      onEnterFocusMode={() => setIsInterviewMode(true)}
      availablePanels={buildAvailablePanels()}
      defaultPanel="profile"
      activePanel={activePanel}
      onPanelChange={(panel) => setActivePanel(panel as PanelType)}
      renderPanel={renderPanel}
    />
  )
}
