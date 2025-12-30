import { useState, useMemo, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Link, useSearchParams, Navigate } from 'react-router-dom'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  ColumnDef,
  SortingState,
  RowSelectionState,
} from '@tanstack/react-table'
import {
  useAllApplications,
  useShortlistApplication,
  useRejectApplication,
  useMakeOffer,
  useAcceptOffer,
  useMoveToStage,
  useJobStages,
  useCancelStage,
  useCompleteStage,
  useReopenStage,
  useAssignedUpdate,
  useHasFeature,
} from '@/hooks'
import { useAuth } from '@/contexts/AuthContext'
import { UserRole, ApplicationStatus, RejectionReason, RejectionReasonLabels, StageTypeConfig, StageType } from '@/types'
import type { ApplicationListItem, OfferDetails, ApplicationStageInstance } from '@/types'
import ApplicationFilterPanel, {
  ApplicationFilters,
  defaultFilters,
} from '@/components/applications/ApplicationFilterPanel'
import ApplicationBulkActions from '@/components/applications/ApplicationBulkActions'
import ApplicationDrawer from '@/components/applications/ApplicationDrawer'
import ApplicationKanbanBoard from '@/components/applications/ApplicationKanbanBoard'
import { ScheduleInterviewModal, AssignAssessmentModal, OfferForm, getEmptyOfferDetails } from '@/components/applications'
import { AssignedSelect } from '@/components/forms'
import api from '@/services/api'
import type { AssignedUser } from '@/types'
import {
  FileText,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  MoreVertical,
  Building2,
  Briefcase,
  LayoutList,
  Columns3,
} from 'lucide-react'

const PAGE_SIZE_OPTIONS = [20, 30, 50]

const STATUS_COLORS: Record<ApplicationStatus, { bg: string; text: string }> = {
  [ApplicationStatus.APPLIED]: { bg: 'bg-gray-100', text: 'text-gray-700' },
  [ApplicationStatus.SHORTLISTED]: { bg: 'bg-blue-100', text: 'text-blue-700' },
  [ApplicationStatus.IN_PROGRESS]: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  [ApplicationStatus.OFFER_MADE]: { bg: 'bg-purple-100', text: 'text-purple-700' },
  [ApplicationStatus.OFFER_ACCEPTED]: { bg: 'bg-green-100', text: 'text-green-700' },
  [ApplicationStatus.OFFER_DECLINED]: { bg: 'bg-orange-100', text: 'text-orange-700' },
  [ApplicationStatus.REJECTED]: { bg: 'bg-red-100', text: 'text-red-700' },
}

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  [ApplicationStatus.APPLIED]: 'Applied',
  [ApplicationStatus.SHORTLISTED]: 'Shortlisted',
  [ApplicationStatus.IN_PROGRESS]: 'In Progress',
  [ApplicationStatus.OFFER_MADE]: 'Offer Made',
  [ApplicationStatus.OFFER_ACCEPTED]: 'Accepted',
  [ApplicationStatus.OFFER_DECLINED]: 'Declined',
  [ApplicationStatus.REJECTED]: 'Rejected',
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const formatTimeInStage = (lastStatusChange: string): string => {
  const now = new Date()
  const changeDate = new Date(lastStatusChange)
  const diffMs = now.getTime() - changeDate.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return '1 day'
  if (diffDays < 7) return `${diffDays} days`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks`
  return `${Math.floor(diffDays / 30)} months`
}

// Column helper for type safety
const columnHelper = createColumnHelper<ApplicationListItem>()

export default function AdminApplicationsPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  // Check if user can access replacement feature (clients with feature, or admins/recruiters)
  const hasReplacementFeature = useHasFeature('free-replacements')
  const isClient = user?.role === UserRole.CLIENT
  const isAdminOrRecruiter = user?.role === UserRole.ADMIN || user?.role === UserRole.RECRUITER
  // Admins/recruiters always see the tab for accepted offers; clients only if they have the feature
  const showReplacementOption = isAdminOrRecruiter || (isClient && hasReplacementFeature)

  // Get job and application from URL params
  const jobIdFromUrl = searchParams.get('job')
  const applicationIdFromUrl = searchParams.get('application')

  // Initialize filters with job from URL if present
  const [filters, setFilters] = useState<ApplicationFilters>(() => ({
    ...defaultFilters,
    job: jobIdFromUrl || '',
  }))
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [showFilters, setShowFilters] = useState(false)
  const [sorting, setSorting] = useState<SortingState>([])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(
    applicationIdFromUrl || null
  )
  const [openActionsMenu, setOpenActionsMenu] = useState<string | null>(null)
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null)
  // Default to kanban when job is pre-selected from URL
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>(jobIdFromUrl ? 'kanban' : 'table')

  // Action hooks
  const { shortlist, isLoading: isShortlisting } = useShortlistApplication()
  const { reject, isLoading: isRejecting } = useRejectApplication()
  const { makeOffer, isLoading: isMakingOffer } = useMakeOffer()
  const { acceptOffer, isLoading: isAcceptingOffer } = useAcceptOffer()
  const { moveToStage, isLoading: isMoving } = useMoveToStage()
  const { cancel: cancelStage, isCancelling } = useCancelStage()
  const { complete: completeStage, isCompleting } = useCompleteStage()
  const { reopen: reopenStage, isReopening } = useReopenStage()

  // Fetch job stages when a specific job is filtered
  const { stages: jobStages } = useJobStages(filters.job || null)
  const isJobFiltered = !!filters.job

  // Local state for optimistic updates
  const [localApplications, setLocalApplications] = useState<ApplicationListItem[]>([])
  const [optimisticError, setOptimisticError] = useState<string | null>(null)

  // Modal states
  const [rejectModal, setRejectModal] = useState<{ applicationId: string } | null>(null)
  const [offerModal, setOfferModal] = useState<{ applicationId: string } | null>(null)
  const [acceptModal, setAcceptModal] = useState<{ applicationId: string; offerDetails: OfferDetails } | null>(null)
  const [scheduleModal, setScheduleModal] = useState<{
    applicationId: string
    stageInstance: ApplicationStageInstance
    candidateName: string
    mode: 'schedule' | 'reschedule'
  } | null>(null)
  const [assessmentModal, setAssessmentModal] = useState<{
    applicationId: string
    stageInstance: ApplicationStageInstance
    candidateName: string
  } | null>(null)

  // Form states
  const [rejectionReason, setRejectionReason] = useState<RejectionReason | ''>('')
  const [rejectionFeedback, setRejectionFeedback] = useState('')
  const [offerDetails, setOfferDetails] = useState<OfferDetails>(getEmptyOfferDetails())
  const [finalOfferDetails, setFinalOfferDetails] = useState<OfferDetails>({})
  const [actionError, setActionError] = useState<string | null>(null)

  const isProcessing = isShortlisting || isRejecting || isMakingOffer || isAcceptingOffer || isMoving || isCancelling || isCompleting || isReopening

  // Convert TanStack sorting to API ordering param
  const ordering = useMemo(() => {
    if (sorting.length === 0) return filters.ordering
    const sort = sorting[0]
    if (!sort) return filters.ordering
    const fieldMap: Record<string, string> = {
      candidate_name: 'candidate_name',
      job_title: 'job_title',
      applied_at: 'applied_at',
      status: 'status',
      company_name: 'company_name',
    }
    const field = fieldMap[sort.id] || sort.id
    return sort.desc ? `-${field}` : field
  }, [sorting, filters.ordering])

  const { applications, count, hasNext, hasPrevious, isLoading, error, refetch } = useAllApplications({
    search: filters.search || undefined,
    status: filters.status as ApplicationStatus || undefined,
    stage: filters.stage || undefined,
    job: filters.job || undefined,
    job_status: filters.job_status || undefined,
    company: filters.company || undefined,
    recruiter: filters.recruiter || undefined,
    applied_after: filters.applied_after || undefined,
    applied_before: filters.applied_before || undefined,
    ordering,
    page,
    page_size: pageSize,
  })

  // Sync local state with server data
  useEffect(() => {
    if (applications) {
      setLocalApplications(applications)
    }
  }, [applications])

  // Helper for optimistic updates
  const optimisticUpdate = useCallback(
    async (
      applicationId: string,
      updateFn: (app: ApplicationListItem) => ApplicationListItem,
      apiCall: () => Promise<unknown>
    ) => {
      const previousState = [...localApplications]
      setLocalApplications((prev) =>
        prev.map((app) => (app.id === applicationId ? updateFn(app) : app))
      )
      setOptimisticError(null)

      try {
        await apiCall()
        refetch()
      } catch (err) {
        setLocalApplications(previousState)
        setOptimisticError((err as Error).message || 'Action failed')
        console.error('Optimistic update failed:', err)
      }
    },
    [localApplications, refetch]
  )

  // Auto-redirect candidates to their personal applications page
  if (user?.role === UserRole.CANDIDATE) {
    return <Navigate to="/dashboard/my-applications" replace />
  }

  // Check if user has access (admin, recruiter, or client)
  if (!user || ![UserRole.ADMIN, UserRole.RECRUITER, UserRole.CLIENT].includes(user.role)) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-4" />
        <p className="text-[15px] text-gray-700 mb-2">Access Denied</p>
        <p className="text-[13px] text-gray-500">
          You do not have permission to view this page.
        </p>
      </div>
    )
  }

  const totalPages = Math.ceil(count / pageSize)

  const handleFiltersChange = (newFilters: ApplicationFilters) => {
    setFilters(newFilters)
    setPage(1)

    // Sync job filter to URL params
    if (newFilters.job !== filters.job) {
      if (newFilters.job) {
        setSearchParams({ job: newFilters.job })
      } else {
        setSearchParams({})
      }
    }
  }

  // Sync filters when URL params change externally (e.g., navigation)
  useEffect(() => {
    const urlJobId = searchParams.get('job')
    if (urlJobId !== filters.job) {
      setFilters((prev) => ({ ...prev, job: urlJobId || '' }))
      if (urlJobId) {
        setViewMode('kanban') // Switch to kanban when job is selected via URL
      }
    }
  }, [searchParams])

  // Sync selectedApplicationId when URL application param changes (e.g., from notification link)
  useEffect(() => {
    const urlApplicationId = searchParams.get('application')
    if (urlApplicationId && urlApplicationId !== selectedApplicationId) {
      setSelectedApplicationId(urlApplicationId)
    }
  }, [searchParams])

  const handleClearFilters = () => {
    setFilters(defaultFilters)
    setPage(1)
    setSearchParams({}) // Clear URL params
  }

  const activeFilterCount = useMemo(() => {
    let filterCount = 0
    if (filters.status) filterCount++
    if (filters.stage) filterCount++
    if (filters.job) filterCount++
    if (filters.job_status) filterCount++
    if (filters.company) filterCount++
    if (filters.recruiter) filterCount++
    if (filters.applied_after) filterCount++
    if (filters.applied_before) filterCount++
    return filterCount
  }, [filters])

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize)
    setPage(1)
  }

  // ============================================================================
  // Kanban Action Handlers (Optimistic)
  // ============================================================================

  const handleShortlist = (applicationId: string) => {
    optimisticUpdate(
      applicationId,
      (app) => ({ ...app, status: ApplicationStatus.SHORTLISTED, rejection_reason: null }),
      () => shortlist(applicationId)
    )
  }

  const handleResetToApplied = (applicationId: string) => {
    optimisticUpdate(
      applicationId,
      (app) => ({ ...app, status: ApplicationStatus.APPLIED, current_stage_order: 0, rejection_reason: null }),
      () => moveToStage(applicationId, { stage_order: 0 })
    )
  }

  const handleMoveToStage = async (applicationId: string, stageOrder: number) => {
    const app = localApplications.find((a) => a.id === applicationId)
    const candidateName = app?.candidate_name || 'Candidate'

    // Optimistic update
    setLocalApplications((prev) =>
      prev.map((a) =>
        a.id === applicationId
          ? { ...a, status: ApplicationStatus.IN_PROGRESS, current_stage_order: stageOrder, rejection_reason: null }
          : a
      )
    )

    try {
      await moveToStage(applicationId, { stage_order: stageOrder })

      // Fetch stage instances to check if scheduling is needed
      const instancesResponse = await api.get<ApplicationStageInstance[]>(
        `/jobs/applications/${applicationId}/stages/`
      )
      const instances = instancesResponse.data
      const stageInstance = instances.find(
        (inst) => inst.stage_template.order === stageOrder
      )

      // Open schedule modal for stage types that require scheduling
      const stageType = stageInstance?.stage_template.stage_type as StageType | undefined
      const stageConfig = stageType ? StageTypeConfig[stageType] : undefined
      if (stageInstance && stageInstance.status === 'not_started' && stageConfig?.requiresScheduling) {
        setScheduleModal({
          applicationId,
          stageInstance,
          candidateName,
          mode: 'schedule',
        })
      }

      refetch()
    } catch (err) {
      setLocalApplications(localApplications)
      setOptimisticError((err as Error).message || 'Failed to move to stage')
    }
  }

  const handleMakeOffer = async () => {
    if (!offerModal) return
    try {
      setActionError(null)
      setLocalApplications((prev) =>
        prev.map((app) =>
          app.id === offerModal.applicationId
            ? { ...app, status: ApplicationStatus.OFFER_MADE }
            : app
        )
      )
      await makeOffer(offerModal.applicationId, { offer_details: offerDetails })
      setOfferModal(null)
      setOfferDetails(getEmptyOfferDetails())
      refetch()
    } catch (err) {
      setActionError((err as Error).message)
      refetch()
    }
  }

  const handleAcceptOffer = async () => {
    if (!acceptModal) return
    try {
      setActionError(null)
      setLocalApplications((prev) =>
        prev.map((app) =>
          app.id === acceptModal.applicationId
            ? { ...app, status: ApplicationStatus.OFFER_ACCEPTED }
            : app
        )
      )
      await acceptOffer(acceptModal.applicationId, { final_offer_details: finalOfferDetails })
      setAcceptModal(null)
      setFinalOfferDetails({})
      refetch()
    } catch (err) {
      setActionError((err as Error).message)
      refetch()
    }
  }

  const handleReject = async () => {
    if (!rejectModal || !rejectionReason) return
    try {
      setActionError(null)
      setLocalApplications((prev) =>
        prev.map((app) =>
          app.id === rejectModal.applicationId
            ? { ...app, status: ApplicationStatus.REJECTED, rejection_reason: rejectionReason }
            : app
        )
      )
      await reject(rejectModal.applicationId, {
        rejection_reason: rejectionReason,
        rejection_feedback: rejectionFeedback,
      })
      setRejectModal(null)
      setRejectionReason('')
      setRejectionFeedback('')
      refetch()
    } catch (err) {
      setActionError((err as Error).message)
      refetch()
    }
  }

  // Stage instance handlers
  const handleSchedule = (application: ApplicationListItem) => {
    if (application.current_stage_instance) {
      setScheduleModal({
        applicationId: application.id,
        stageInstance: {
          id: application.current_stage_instance.id,
          status: application.current_stage_instance.status,
          stage_template: {
            id: '',
            name: application.current_stage_instance.stage_name,
            stage_type: application.current_stage_instance.stage_type,
            order: application.current_stage_order,
            duration_minutes: application.current_stage_instance.duration_minutes,
            default_interviewer_id: application.current_stage_instance.interviewer_id || undefined,
          },
          scheduled_at: application.current_stage_instance.scheduled_at,
          duration_minutes: application.current_stage_instance.duration_minutes,
          interviewer: application.current_stage_instance.interviewer_id ? {
            id: application.current_stage_instance.interviewer_id,
            full_name: application.current_stage_instance.interviewer_name || '',
          } : undefined,
          meeting_link: application.current_stage_instance.meeting_link,
          location: application.current_stage_instance.location,
        } as unknown as ApplicationStageInstance,
        candidateName: application.candidate_name,
        mode: 'schedule',
      })
    }
  }

  const handleReschedule = (application: ApplicationListItem) => {
    if (application.current_stage_instance) {
      setScheduleModal({
        applicationId: application.id,
        stageInstance: {
          id: application.current_stage_instance.id,
          status: application.current_stage_instance.status,
          stage_template: {
            id: '',
            name: application.current_stage_instance.stage_name,
            stage_type: application.current_stage_instance.stage_type,
            order: application.current_stage_order,
            duration_minutes: application.current_stage_instance.duration_minutes,
            default_interviewer_id: application.current_stage_instance.interviewer_id || undefined,
          },
          scheduled_at: application.current_stage_instance.scheduled_at,
          duration_minutes: application.current_stage_instance.duration_minutes,
          interviewer: application.current_stage_instance.interviewer_id ? {
            id: application.current_stage_instance.interviewer_id,
            full_name: application.current_stage_instance.interviewer_name || '',
          } : undefined,
          meeting_link: application.current_stage_instance.meeting_link,
          location: application.current_stage_instance.location,
        } as unknown as ApplicationStageInstance,
        candidateName: application.candidate_name,
        mode: 'reschedule',
      })
    }
  }

  const handleCancel = async (application: ApplicationListItem) => {
    if (application.current_stage_instance) {
      try {
        await cancelStage(application.id, application.current_stage_instance.id)
        refetch()
      } catch (err) {
        setOptimisticError((err as Error).message || 'Failed to cancel')
      }
    }
  }

  const handleComplete = async (application: ApplicationListItem) => {
    if (application.current_stage_instance) {
      try {
        await completeStage(application.id, application.current_stage_instance.id)
        refetch()
      } catch (err) {
        setOptimisticError((err as Error).message || 'Failed to complete')
      }
    }
  }

  const handleReopen = async (application: ApplicationListItem) => {
    if (application.current_stage_instance) {
      try {
        await reopenStage(application.id, application.current_stage_instance.id)
        refetch()
      } catch (err) {
        setOptimisticError((err as Error).message || 'Failed to reopen')
      }
    }
  }

  const handleAssignAssessment = (application: ApplicationListItem) => {
    if (application.current_stage_instance) {
      setAssessmentModal({
        applicationId: application.id,
        stageInstance: {
          id: application.current_stage_instance.id,
          status: application.current_stage_instance.status,
          stage_template: {
            id: '',
            name: application.current_stage_instance.stage_name,
            stage_type: application.current_stage_instance.stage_type,
            order: application.current_stage_order,
            duration_minutes: application.current_stage_instance.duration_minutes,
            assessment_instructions: application.current_stage_instance.assessment?.instructions || '',
            assessment_external_url: application.current_stage_instance.assessment?.submission_url || '',
            deadline_days: 7,
          },
          scheduled_at: null,
          duration_minutes: 0,
        } as unknown as ApplicationStageInstance,
        candidateName: application.candidate_name,
      })
    }
  }

  // Drawer action handlers (non-optimistic, for drawer use)
  const handleDrawerShortlist = async (applicationId: string) => {
    await shortlist(applicationId)
    refetch()
  }

  const handleDrawerMakeOffer = async (applicationId: string, details: OfferDetails) => {
    await makeOffer(applicationId, { offer_details: details })
    refetch()
  }

  const handleDrawerAcceptOffer = async (applicationId: string, details: OfferDetails) => {
    await acceptOffer(applicationId, { final_offer_details: details })
    refetch()
  }

  const handleDrawerReject = async (applicationId: string, reason: RejectionReason, feedback: string) => {
    await reject(applicationId, { rejection_reason: reason, rejection_feedback: feedback })
    refetch()
  }

  const handleDrawerMoveToStage = async (applicationId: string, stageOrder: number) => {
    await moveToStage(applicationId, { stage_order: stageOrder })
    refetch()
  }

  // Hook for optimistic updates with toast notifications
  const { updateAssigned } = useAssignedUpdate<ApplicationListItem>()

  // Handler for changing assigned recruiters on an application (optimistic)
  const handleAssignedChange = useCallback((applicationId: string, assignedTo: AssignedUser[]) => {
    updateAssigned(
      localApplications,
      setLocalApplications,
      applicationId,
      'id',
      'assigned_recruiters',
      assignedTo,
      () => api.patch(`/jobs/applications/${applicationId}/`, {
        assigned_recruiter_ids: assignedTo.map(u => u.id),
      })
    )
  }, [localApplications, updateAssigned])

  // Define columns with TanStack Table
  const columns = useMemo<ColumnDef<ApplicationListItem, any>[]>(
    () => [
      // Selection checkbox - PINNED LEFT
      {
        id: 'select',
        size: 40,
        enableResizing: false,
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllPageRowsSelected()}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
            className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500"
          />
        ),
        cell: ({ row }) => (
          <div onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={row.getIsSelected()}
              onChange={row.getToggleSelectedHandler()}
              className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500"
            />
          </div>
        ),
      },
      // Assigned Recruiters - PINNED LEFT
      columnHelper.accessor('assigned_recruiters', {
        header: 'Assigned',
        size: 140,
        cell: ({ row }) => {
          const app = row.original
          const assignedUsers = app.assigned_recruiters || []
          return (
            <div onClick={(e) => e.stopPropagation()}>
              <AssignedSelect
                selected={assignedUsers}
                onChange={(users) => handleAssignedChange(app.id, users)}
                compact
                placeholder="Assign"
              />
            </div>
          )
        },
      }),
      // Candidate - PINNED LEFT
      columnHelper.accessor('candidate_name', {
        header: 'Candidate',
        size: 200,
        enableSorting: true,
        cell: ({ row }) => {
          const app = row.original
          return (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                <span className="text-[11px] font-medium text-gray-600">
                  {app.candidate_name?.split(' ').map(n => n[0]).join('') || '--'}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-gray-900 truncate">
                  {app.candidate_name || 'No name'}
                </p>
                <p className="text-[11px] text-gray-500 truncate">
                  {app.candidate_email}
                </p>
              </div>
            </div>
          )
        },
      }),
      // Job Title
      columnHelper.accessor('job_title', {
        header: 'Job',
        size: 200,
        enableSorting: true,
        cell: ({ row }) => {
          const app = row.original
          return (
            <div className="min-w-0">
              <Link
                to={`/jobs/${app.job_slug}`}
                className="text-[13px] font-medium text-gray-900 hover:text-blue-600 truncate block"
                onClick={(e) => e.stopPropagation()}
              >
                {app.job_title}
              </Link>
              <div className="flex items-center gap-1 mt-0.5">
                <Building2 className="w-3 h-3 text-gray-400" />
                <span className="text-[11px] text-gray-500 truncate">{app.company_name}</span>
              </div>
            </div>
          )
        },
      }),
      // Stage
      columnHelper.accessor('current_stage_name', {
        header: 'Stage',
        size: 140,
        cell: ({ row }) => {
          const app = row.original
          const stageName = app.current_stage_name || 'Applied'
          return (
            <span className="px-2 py-1 text-[11px] font-medium bg-gray-100 text-gray-700 rounded">
              {stageName}
            </span>
          )
        },
      }),
      // Status
      columnHelper.accessor('status', {
        header: 'Status',
        size: 120,
        enableSorting: true,
        cell: ({ getValue }) => {
          const status = getValue() as ApplicationStatus
          const colors = STATUS_COLORS[status] || { bg: 'bg-gray-100', text: 'text-gray-700' }
          return (
            <span className={`px-2 py-1 text-[11px] font-medium rounded ${colors.bg} ${colors.text}`}>
              {STATUS_LABELS[status] || status}
            </span>
          )
        },
      }),
      // Applied Date
      columnHelper.accessor('applied_at', {
        header: 'Applied',
        size: 100,
        enableSorting: true,
        cell: ({ getValue }) => (
          <span className="text-[12px] text-gray-600">{formatDate(getValue())}</span>
        ),
      }),
      // Time in Stage
      columnHelper.accessor('last_status_change', {
        header: 'Time in Stage',
        size: 100,
        cell: ({ getValue }) => (
          <span className="text-[12px] text-gray-500">{formatTimeInStage(getValue())}</span>
        ),
      }),
      // Next Interview (if scheduled)
      columnHelper.accessor('current_stage_instance', {
        header: 'Next Interview',
        size: 130,
        cell: ({ getValue }) => {
          const instance = getValue()
          if (!instance?.scheduled_at) {
            return <span className="text-[11px] text-gray-400">-</span>
          }
          return (
            <span className="text-[12px] text-gray-600">
              {formatDate(instance.scheduled_at)}
            </span>
          )
        },
      }),
      // Actions
      columnHelper.display({
        id: 'actions',
        header: '',
        size: 50,
        enableResizing: false,
        cell: ({ row }) => {
          const app = row.original
          return (
            <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={(e) => {
                  if (openActionsMenu === app.id) {
                    setOpenActionsMenu(null)
                    setMenuPosition(null)
                  } else {
                    const rect = e.currentTarget.getBoundingClientRect()
                    setMenuPosition({ top: rect.bottom + 4, left: rect.right - 160 })
                    setOpenActionsMenu(app.id)
                  }
                }}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {openActionsMenu === app.id && menuPosition && createPortal(
                <>
                  <div
                    className="fixed inset-0 z-[9998]"
                    onClick={() => {
                      setOpenActionsMenu(null)
                      setMenuPosition(null)
                    }}
                  />
                  <div
                    className="fixed w-40 bg-white border border-gray-200 rounded-md shadow-lg z-[9999]"
                    style={{ top: menuPosition.top, left: menuPosition.left }}
                  >
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setSelectedApplicationId(app.id)
                          setOpenActionsMenu(null)
                          setMenuPosition(null)
                        }}
                        className="flex items-center gap-2 w-full px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-50 text-left"
                      >
                        <FileText className="w-4 h-4" />
                        View Details
                      </button>
                      <Link
                        to={`/jobs/${app.job_slug}`}
                        className="flex items-center gap-2 px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-50"
                        onClick={() => {
                          setOpenActionsMenu(null)
                          setMenuPosition(null)
                        }}
                      >
                        <Briefcase className="w-4 h-4" />
                        View Job
                      </Link>
                    </div>
                  </div>
                </>,
                document.body
              )}
            </div>
          )
        },
      }),
    ],
    [openActionsMenu, menuPosition, handleAssignedChange]
  )

  const table = useReactTable({
    data: localApplications,
    columns,
    state: {
      sorting,
      rowSelection,
    },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualPagination: true,
    pageCount: totalPages,
    getRowId: (row) => row.id,
    enableRowSelection: true,
  })

  // Get selected applications
  const selectedApplications = useMemo(() => {
    return table.getSelectedRowModel().rows.map(row => row.original)
  }, [table.getSelectedRowModel().rows])

  const clearSelection = () => {
    setRowSelection({})
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-semibold text-gray-900">All Applications</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">
            {count} application{count !== 1 ? 's' : ''} found
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex border border-gray-200 rounded-md overflow-hidden">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] transition-colors ${
                viewMode === 'table'
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
              title="Table view"
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] border-l border-gray-200 transition-colors ${
                viewMode === 'kanban'
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
              title="Kanban view"
            >
              <Columns3 className="w-4 h-4" />
            </button>
          </div>
          {/* Page Size Selector - only in table view */}
          {viewMode === 'table' && (
            <div className="flex items-center gap-1.5">
              <span className="text-[12px] text-gray-500">Show:</span>
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="px-2 py-1 text-[12px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300"
              >
                {PAGE_SIZE_OPTIONS.map(size => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </div>
          )}
          {/* Toggle Filters */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-1.5 text-[13px] border rounded-md transition-colors ${
              showFilters ? 'border-gray-300 bg-gray-50 text-gray-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-gray-900 text-white text-[11px] px-1.5 py-0.5 rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Error display */}
      {(error || optimisticError) && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error || optimisticError}</p>
        </div>
      )}

      <div className="flex gap-6">
        {/* Filter Sidebar */}
        {showFilters && (
          <div className="w-72 flex-shrink-0">
            <ApplicationFilterPanel
              filters={filters}
              onFiltersChange={handleFiltersChange}
              onClearFilters={handleClearFilters}
              activeFilterCount={activeFilterCount}
            />
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Active Filters Count */}
          {activeFilterCount > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[12px] text-gray-500">
                {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} applied
              </span>
              <button
                onClick={handleClearFilters}
                className="text-[12px] text-gray-500 hover:text-gray-700 underline"
              >
                Clear all
              </button>
            </div>
          )}

          {/* Bulk Actions */}
          <ApplicationBulkActions
            selectedApplications={selectedApplications}
            onClearSelection={clearSelection}
            onRefresh={refetch}
            totalCount={count}
          />

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-12">
              <p className="text-[14px] text-gray-500">Loading applications...</p>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && applications.length === 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-[15px] text-gray-700 mb-1">No applications found</p>
              <p className="text-[13px] text-gray-500">
                {activeFilterCount > 0 ? 'Try adjusting your filters' : 'No applications have been submitted yet'}
              </p>
              {activeFilterCount > 0 && (
                <button
                  onClick={handleClearFilters}
                  className="mt-4 text-[13px] text-gray-600 hover:text-gray-900 underline"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}

          {/* Table View */}
          {viewMode === 'table' && !isLoading && !error && applications.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    {table.getHeaderGroups().map(headerGroup => (
                      <tr key={headerGroup.id} className="border-b border-gray-200 bg-gray-50">
                        {headerGroup.headers.map(header => {
                          const isPinnedLeft = header.id === 'select' || header.id === 'candidate_name'
                          const isPinnedRight = header.id === 'actions'
                          return (
                            <th
                              key={header.id}
                              className={`px-3 py-2.5 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap ${
                                isPinnedLeft ? 'sticky z-20 bg-gray-50' : ''
                              } ${isPinnedRight ? 'sticky right-0 z-20 bg-gray-50' : ''}`}
                              style={{
                                width: header.getSize(),
                                left: header.id === 'select' ? 0 : header.id === 'candidate_name' ? 40 : undefined,
                              }}
                            >
                              {header.isPlaceholder ? null : (
                                <div
                                  className={`flex items-center gap-1 ${
                                    header.column.getCanSort() ? 'cursor-pointer select-none hover:text-gray-700' : ''
                                  }`}
                                  onClick={header.column.getToggleSortingHandler()}
                                >
                                  {flexRender(header.column.columnDef.header, header.getContext())}
                                  {header.column.getCanSort() && (
                                    <span className="ml-0.5">
                                      {{
                                        asc: <ArrowUp className="w-3 h-3" />,
                                        desc: <ArrowDown className="w-3 h-3" />,
                                      }[header.column.getIsSorted() as string] ?? (
                                        <ArrowUpDown className="w-3 h-3 opacity-40" />
                                      )}
                                    </span>
                                  )}
                                </div>
                              )}
                            </th>
                          )
                        })}
                      </tr>
                    ))}
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {table.getRowModel().rows.map(row => (
                      <tr
                        key={row.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => {
                          setOpenActionsMenu(null)
                          setMenuPosition(null)
                          setSelectedApplicationId(row.original.id)
                        }}
                      >
                        {row.getVisibleCells().map(cell => {
                          const colId = cell.column.id
                          const isPinnedLeft = colId === 'select' || colId === 'candidate_name'
                          const isPinnedRight = colId === 'actions'
                          return (
                            <td
                              key={cell.id}
                              className={`px-3 py-2.5 whitespace-nowrap ${
                                isPinnedLeft ? 'sticky z-10 bg-white' : ''
                              } ${isPinnedRight ? 'sticky right-0 z-10 bg-white' : ''}`}
                              style={{
                                width: cell.column.getSize(),
                                left: colId === 'select' ? 0 : colId === 'candidate_name' ? 40 : undefined,
                              }}
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Kanban View */}
          {viewMode === 'kanban' && !isLoading && !error && localApplications.length > 0 && (
            <>
              {!isJobFiltered && (
                <div className="mb-4 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-[12px] text-blue-700">
                    <strong>Tip:</strong> Select a specific job from the filters to see applications grouped by interview stages instead of status. Drag and drop is enabled!
                  </p>
                </div>
              )}
              <ApplicationKanbanBoard
                applications={localApplications}
                jobStages={jobStages}
                isJobFiltered={isJobFiltered}
                onApplicationClick={(id) => setSelectedApplicationId(id)}
                onShortlist={handleShortlist}
                onResetToApplied={handleResetToApplied}
                onMoveToStage={handleMoveToStage}
                onOpenOfferModal={(id) => setOfferModal({ applicationId: id })}
                onOpenAcceptModal={(app) => setAcceptModal({ applicationId: app.id, offerDetails: {} })}
                onOpenRejectModal={(id) => setRejectModal({ applicationId: id })}
                onSchedule={handleSchedule}
                onReschedule={handleReschedule}
                onCancel={handleCancel}
                onComplete={handleComplete}
                onReopen={handleReopen}
                onAssignAssessment={handleAssignAssessment}
                isLoading={isLoading}
              />
            </>
          )}

          {/* Pagination - Table view only */}
          {viewMode === 'table' && !isLoading && !error && totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-[13px] text-gray-500">
                Page {page} of {totalPages} ({count} total)
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={!hasPrevious}
                  className="flex items-center gap-1 px-3 py-1.5 text-[13px] border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={!hasNext}
                  className="flex items-center gap-1 px-3 py-1.5 text-[13px] border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Application Drawer */}
      <ApplicationDrawer
        applicationId={selectedApplicationId}
        isOpen={!!selectedApplicationId}
        onClose={() => {
          setSelectedApplicationId(null)
          // Clear application param from URL if present
          if (searchParams.has('application')) {
            searchParams.delete('application')
            setSearchParams(searchParams)
          }
        }}
        onUpdate={refetch}
      />

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-[16px] font-medium text-gray-900">Reject Application</h3>
            </div>
            <div className="px-6 py-4 space-y-4">
              {actionError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{actionError}</p>
                </div>
              )}

              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1">
                  Rejection Reason <span className="text-red-500">*</span>
                </label>
                <select
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value as RejectionReason)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-[14px] focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  <option value="">Select a reason...</option>
                  {Object.entries(RejectionReasonLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1">
                  Feedback (optional)
                </label>
                <textarea
                  value={rejectionFeedback}
                  onChange={(e) => setRejectionFeedback(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-[14px] focus:outline-none focus:ring-2 focus:ring-gray-900"
                  placeholder="Additional notes about the rejection..."
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => {
                  setRejectModal(null)
                  setRejectionReason('')
                  setRejectionFeedback('')
                  setActionError(null)
                }}
                disabled={isProcessing}
                className="px-4 py-2 text-[14px] font-medium text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={isProcessing || !rejectionReason}
                className="px-4 py-2 text-[14px] font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {isRejecting ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Make Offer Modal */}
      {offerModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-[16px] font-medium text-gray-900">Make Offer</h3>
              <p className="text-[13px] text-gray-500 mt-1">Enter the offer details for this candidate</p>
            </div>
            <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
              {actionError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2 mb-4">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{actionError}</p>
                </div>
              )}
              <OfferForm offerDetails={offerDetails} setOfferDetails={setOfferDetails} />
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => {
                  setOfferModal(null)
                  setOfferDetails(getEmptyOfferDetails())
                  setActionError(null)
                }}
                disabled={isProcessing}
                className="px-4 py-2 text-[14px] font-medium text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleMakeOffer}
                disabled={isProcessing}
                className="px-4 py-2 text-[14px] font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50"
              >
                {isMakingOffer ? 'Sending...' : 'Make Offer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Accept Offer Modal */}
      {acceptModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-[16px] font-medium text-gray-900">Confirm Offer Acceptance</h3>
              <p className="text-[13px] text-gray-500 mt-1">
                Confirm the final offer details. Adjust if there were any negotiations.
              </p>
            </div>
            <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
              {actionError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{actionError}</p>
                </div>
              )}

              <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                <p className="text-[13px] text-green-800">
                  This will mark the candidate as hired. The position may be marked as filled.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-gray-700 mb-1">Final Annual Salary</label>
                  <input
                    type="number"
                    value={finalOfferDetails.annual_salary || ''}
                    onChange={(e) => setFinalOfferDetails({ ...finalOfferDetails, annual_salary: e.target.value ? parseInt(e.target.value) : null })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-[14px] focus:outline-none focus:ring-2 focus:ring-gray-900"
                    placeholder="Leave blank to use original"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={finalOfferDetails.start_date || ''}
                    onChange={(e) => setFinalOfferDetails({ ...finalOfferDetails, start_date: e.target.value || null })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-[14px] focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={finalOfferDetails.notes || ''}
                  onChange={(e) => setFinalOfferDetails({ ...finalOfferDetails, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-[14px] focus:outline-none focus:ring-2 focus:ring-gray-900"
                  placeholder="Any adjustments or notes about the final offer..."
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => {
                  setAcceptModal(null)
                  setFinalOfferDetails({})
                  setActionError(null)
                }}
                disabled={isProcessing}
                className="px-4 py-2 text-[14px] font-medium text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAcceptOffer}
                disabled={isProcessing}
                className="px-4 py-2 text-[14px] font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {isAcceptingOffer ? 'Confirming...' : 'Confirm Acceptance'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Interview Modal */}
      {scheduleModal && filters.job && (
        <ScheduleInterviewModal
          isOpen={true}
          onClose={() => setScheduleModal(null)}
          instance={scheduleModal.stageInstance}
          applicationId={scheduleModal.applicationId}
          jobId={filters.job}
          candidateName={scheduleModal.candidateName}
          mode={scheduleModal.mode}
          onSuccess={() => {
            setScheduleModal(null)
            refetch()
          }}
        />
      )}

      {/* Assign Assessment Modal */}
      {assessmentModal && (
        <AssignAssessmentModal
          isOpen={true}
          onClose={() => setAssessmentModal(null)}
          instance={assessmentModal.stageInstance}
          applicationId={assessmentModal.applicationId}
          candidateName={assessmentModal.candidateName}
          onSuccess={() => {
            setAssessmentModal(null)
            refetch()
          }}
        />
      )}
    </div>
  )
}
