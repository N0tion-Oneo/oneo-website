import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Loader2,
  Trash2,
  CheckCircle2,
  RotateCcw,
  ExternalLink,
  Calendar,
  User,
  AlertTriangle,
  Building2,
  Users,
  FileText,
  UserCircle,
  ChevronDown,
  Clock,
  MessageSquare,
  History,
  Plus,
  Mail,
  Phone,
  Briefcase,
  Zap,
} from 'lucide-react'
import type { Task, EntityType } from '@/types'
import { TaskPriority, TaskPriorityLabels, TaskStatus, TaskStatusLabels } from '@/types'
import {
  useUpdateTask,
  useCompleteTask,
  useStaffUsers,
  useLead,
  useCompanyById,
  useApplication,
} from '@/hooks'
import { format, isPast, parseISO, formatDistanceToNow, addDays } from 'date-fns'
import { DrawerWithPanels } from '@/components/common'
import { getTaskPanelOptions, type TaskPanelType } from '@/components/service/panelConfig'

// Import entity drawers
import LeadDrawer from '@/components/companies/LeadDrawer'
import CompanyDetailDrawer from '@/components/companies/CompanyDetailDrawer'
import ApplicationDrawer from '@/components/applications/ApplicationDrawer'

// =============================================================================
// Types
// =============================================================================

interface TaskDetailDrawerProps {
  isOpen: boolean
  task: Task | null
  onClose: () => void
  onSuccess: () => void
  onDelete: (taskId: string) => void
}

// =============================================================================
// Constants
// =============================================================================

const priorityColors: Record<TaskPriority, { bg: string; text: string; dot: string }> = {
  low: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-600 dark:text-gray-400', dot: 'bg-gray-400' },
  medium: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', dot: 'bg-blue-500' },
  high: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400', dot: 'bg-orange-500' },
  urgent: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400', dot: 'bg-red-500' },
}

const statusColors: Record<TaskStatus, string> = {
  pending: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
  in_progress: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600',
  completed: 'bg-green-100 dark:bg-green-900/30 text-green-600',
  cancelled: 'bg-red-100 dark:bg-red-900/30 text-red-500',
}

const entityTypeIcons: Record<EntityType, React.ReactNode> = {
  lead: <UserCircle className="w-4 h-4" />,
  company: <Building2 className="w-4 h-4" />,
  candidate: <Users className="w-4 h-4" />,
  application: <FileText className="w-4 h-4" />,
}

const entityTypeLabels: Record<EntityType, string> = {
  lead: 'Lead',
  company: 'Company',
  candidate: 'Candidate',
  application: 'Application',
}

// =============================================================================
// Main Component
// =============================================================================

export function TaskDetailDrawer({
  isOpen,
  task,
  onClose,
  onSuccess,
  onDelete,
}: TaskDetailDrawerProps) {
  const [activePanel, setActivePanel] = useState<TaskPanelType>('details')

  // Inline edit states
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  // Dropdown states
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false)
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false)
  const [showSnoozeDropdown, setShowSnoozeDropdown] = useState(false)
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)

  // Entity drawers state
  const [showLeadDrawer, setShowLeadDrawer] = useState(false)
  const [showCompanyDrawer, setShowCompanyDrawer] = useState(false)
  const [showApplicationDrawer, setShowApplicationDrawer] = useState(false)

  // Notes state (placeholder - will be connected to backend later)
  const [newNote, setNewNote] = useState('')

  // Hooks
  const navigate = useNavigate()
  const { updateTask, isUpdating } = useUpdateTask()
  const { completeTask, isCompleting } = useCompleteTask()
  const { staffUsers } = useStaffUsers()

  // Entity data hooks - only fetch when we have a task
  const { lead } = useLead(task?.entity_type === 'lead' ? task.entity_id : undefined)
  const { company } = useCompanyById(task?.entity_type === 'company' ? task.entity_id : '')
  const { application } = useApplication(task?.entity_type === 'application' ? task.entity_id : '')

  // Focus input when editing starts
  useEffect(() => {
    if (editingField && inputRef.current) {
      inputRef.current.focus()
      if (inputRef.current instanceof HTMLInputElement) {
        inputRef.current.select()
      }
    }
  }, [editingField])

  // Reset states when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setEditingField(null)
      setShowPriorityDropdown(false)
      setShowAssigneeDropdown(false)
      setShowSnoozeDropdown(false)
      setShowStatusDropdown(false)
      setActivePanel('details')
    }
  }, [isOpen])

  // Inline edit handlers
  const startEditing = (field: string, value: string) => {
    setEditingField(field)
    setEditValue(value)
  }

  const cancelEditing = () => {
    setEditingField(null)
    setEditValue('')
  }

  const saveField = async (field: string, value: string) => {
    if (!task) return
    try {
      await updateTask(task.id, { [field]: value || undefined })
      setEditingField(null)
      onSuccess()
    } catch (error) {
      console.error('Failed to update task:', error)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent, field: string) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      saveField(field, editValue)
    } else if (e.key === 'Escape') {
      cancelEditing()
    }
  }

  // Quick action handlers
  const handleComplete = async () => {
    if (!task) return
    try {
      await completeTask(task.id)
      onSuccess()
    } catch (error) {
      console.error('Failed to complete task:', error)
    }
  }

  const handleReopen = async () => {
    if (!task) return
    try {
      await updateTask(task.id, { status: TaskStatus.PENDING })
      onSuccess()
    } catch (error) {
      console.error('Failed to reopen task:', error)
    }
  }

  const handleStatusChange = async (status: TaskStatus) => {
    if (!task) return
    try {
      await updateTask(task.id, { status })
      setShowStatusDropdown(false)
      onSuccess()
    } catch (error) {
      console.error('Failed to update status:', error)
    }
  }

  const handlePriorityChange = async (priority: TaskPriority) => {
    if (!task) return
    try {
      await updateTask(task.id, { priority })
      setShowPriorityDropdown(false)
      onSuccess()
    } catch (error) {
      console.error('Failed to update priority:', error)
    }
  }

  const handleAssigneeChange = async (userId: number) => {
    if (!task) return
    try {
      await updateTask(task.id, { assigned_to: userId })
      setShowAssigneeDropdown(false)
      onSuccess()
    } catch (error) {
      console.error('Failed to reassign task:', error)
    }
  }

  const handleSnooze = async (days: number) => {
    if (!task) return
    const newDate = format(addDays(new Date(), days), 'yyyy-MM-dd')
    try {
      await updateTask(task.id, { due_date: newDate })
      setShowSnoozeDropdown(false)
      onSuccess()
    } catch (error) {
      console.error('Failed to snooze task:', error)
    }
  }

  const handleOpenEntity = () => {
    if (!task) return
    switch (task.entity_type) {
      case 'lead':
        setShowLeadDrawer(true)
        break
      case 'company':
        setShowCompanyDrawer(true)
        break
      case 'candidate':
        navigate(`/dashboard/admin/candidates/${task.entity_id}`)
        break
      case 'application':
        setShowApplicationDrawer(true)
        break
    }
  }

  const formatDueDate = (dateStr: string | null) => {
    if (!dateStr) return null
    const date = parseISO(dateStr)
    const isCompleted = task?.status === 'completed'
    const isCancelled = task?.status === 'cancelled'
    const isOverdue = isPast(date) && !isCompleted && !isCancelled

    return {
      formatted: format(date, 'MMM d, yyyy'),
      isOverdue,
      relativeText: isOverdue
        ? `Overdue by ${formatDistanceToNow(date)}`
        : `Due ${formatDistanceToNow(date, { addSuffix: true })}`,
    }
  }

  // Get entity preview data
  const getEntityPreview = () => {
    if (!task) return null

    switch (task.entity_type) {
      case 'lead':
        if (!lead) return { loading: true }
        return {
          name: lead.name || lead.email,
          subtitle: lead.company_name || lead.email,
          email: lead.email,
          phone: lead.phone,
        }
      case 'company':
        if (!company) return { loading: true }
        return {
          name: company.name,
          subtitle: company.industry?.name || 'Company',
          website: company.website_url,
        }
      case 'application':
        if (!application) return { loading: true }
        return {
          name: application.candidate?.full_name || 'Candidate',
          subtitle: `${application.job?.title || 'Job'} at ${application.job?.company?.name || 'Company'}`,
          email: application.candidate?.email,
        }
      case 'candidate':
        // No hook for candidate by ID, just show basic info
        return {
          name: 'Candidate',
          subtitle: `ID: ${task.entity_id}`,
        }
      default:
        return null
    }
  }

  if (!task) return null

  const dueDateInfo = formatDueDate(task.due_date)
  const isCompleted = task.status === 'completed'
  const isCancelled = task.status === 'cancelled'
  const entityPreview = getEntityPreview()
  const availablePanels = getTaskPanelOptions()

  // Status badge with dropdown
  const renderStatusBadge = () => {
    const isProcessing = isUpdating || isCompleting

    return (
      <div className="relative">
        <button
          onClick={() => setShowStatusDropdown(!showStatusDropdown)}
          disabled={isProcessing}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-[12px] font-medium rounded-md transition-colors ${statusColors[task.status]} ${
            isProcessing ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isProcessing ? 'Processing...' : TaskStatusLabels[task.status]}
          <ChevronDown className="w-3 h-3" />
        </button>

        {showStatusDropdown && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowStatusDropdown(false)} />
            <div className="absolute left-0 top-full mt-1 z-20 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[140px]">
              {Object.entries(TaskStatusLabels).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => handleStatusChange(value as TaskStatus)}
                  className={`w-full px-3 py-1.5 text-left text-[12px] hover:bg-gray-50 dark:hover:bg-gray-800 ${
                    task.status === value ? 'font-medium bg-gray-50 dark:bg-gray-800' : ''
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    )
  }

  // Action bar with quick actions
  const renderActionBar = () => (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Complete/Reopen */}
      {isCompleted || isCancelled ? (
        <button
          onClick={handleReopen}
          disabled={isUpdating}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-900/50 rounded-lg transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reopen
        </button>
      ) : (
        <button
          onClick={handleComplete}
          disabled={isCompleting}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 rounded-lg transition-colors"
        >
          {isCompleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
          Complete
        </button>
      )}

      {/* Priority Dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowPriorityDropdown(!showPriorityDropdown)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-lg transition-colors ${priorityColors[task.priority].bg} ${priorityColors[task.priority].text}`}
        >
          <div className={`w-2 h-2 rounded-full ${priorityColors[task.priority].dot}`} />
          {TaskPriorityLabels[task.priority]}
          <ChevronDown className="w-3 h-3" />
        </button>
        {showPriorityDropdown && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowPriorityDropdown(false)} />
            <div className="absolute left-0 top-full mt-1 z-20 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[120px]">
              {Object.entries(TaskPriorityLabels).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => handlePriorityChange(value as TaskPriority)}
                  className={`w-full px-3 py-1.5 text-left text-[12px] hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 ${
                    task.priority === value ? 'font-medium' : ''
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${priorityColors[value as TaskPriority].dot}`} />
                  {label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Reassign Dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
        >
          <User className="w-3.5 h-3.5" />
          Reassign
          <ChevronDown className="w-3 h-3" />
        </button>
        {showAssigneeDropdown && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowAssigneeDropdown(false)} />
            <div className="absolute left-0 top-full mt-1 z-20 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[180px] max-h-[200px] overflow-y-auto">
              {staffUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleAssigneeChange(user.id)}
                  className={`w-full px-3 py-1.5 text-left text-[12px] hover:bg-gray-50 dark:hover:bg-gray-800 ${
                    task.assigned_to === user.id ? 'font-medium bg-gray-50 dark:bg-gray-800' : ''
                  }`}
                >
                  {user.full_name || `${user.first_name} ${user.last_name}`}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Snooze Dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowSnoozeDropdown(!showSnoozeDropdown)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
        >
          <Clock className="w-3.5 h-3.5" />
          Snooze
          <ChevronDown className="w-3 h-3" />
        </button>
        {showSnoozeDropdown && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowSnoozeDropdown(false)} />
            <div className="absolute left-0 top-full mt-1 z-20 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[140px]">
              <button onClick={() => handleSnooze(1)} className="w-full px-3 py-1.5 text-left text-[12px] hover:bg-gray-50 dark:hover:bg-gray-800">
                Tomorrow
              </button>
              <button onClick={() => handleSnooze(2)} className="w-full px-3 py-1.5 text-left text-[12px] hover:bg-gray-50 dark:hover:bg-gray-800">
                In 2 days
              </button>
              <button onClick={() => handleSnooze(7)} className="w-full px-3 py-1.5 text-left text-[12px] hover:bg-gray-50 dark:hover:bg-gray-800">
                In 1 week
              </button>
              <button onClick={() => handleSnooze(14)} className="w-full px-3 py-1.5 text-left text-[12px] hover:bg-gray-50 dark:hover:bg-gray-800">
                In 2 weeks
              </button>
            </div>
          </>
        )}
      </div>

      {/* Delete */}
      <button
        onClick={() => onDelete(task.id)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors ml-auto"
      >
        <Trash2 className="w-3.5 h-3.5" />
        Delete
      </button>
    </div>
  )

  // Panel content rendering
  const renderPanel = (panelType: string) => {
    switch (panelType) {
      case 'details':
        return (
          <div className="p-5 space-y-6">
            {/* Title Section - Inline Editable */}
            <div>
              {editingField === 'title' ? (
                <input
                  ref={inputRef as React.RefObject<HTMLInputElement>}
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => saveField('title', editValue)}
                  onKeyDown={(e) => handleKeyDown(e, 'title')}
                  className="w-full text-lg font-semibold bg-transparent border-b-2 border-blue-500 outline-none text-gray-900 dark:text-gray-100"
                />
              ) : (
                <h3
                  onClick={() => !isCompleted && !isCancelled && startEditing('title', task.title)}
                  className={`text-lg font-semibold cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 -mx-2 px-2 py-1 rounded ${
                    isCompleted ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'
                  }`}
                >
                  {task.title}
                </h3>
              )}

              {/* Description - Inline Editable */}
              <div className="mt-3">
                {editingField === 'description' ? (
                  <textarea
                    ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => saveField('description', editValue)}
                    onKeyDown={(e) => handleKeyDown(e, 'description')}
                    rows={3}
                    className="w-full text-[14px] bg-transparent border border-blue-500 rounded-lg p-2 outline-none text-gray-600 dark:text-gray-400 resize-none"
                  />
                ) : (
                  <p
                    onClick={() => !isCompleted && !isCancelled && startEditing('description', task.description || '')}
                    className="text-[14px] text-gray-600 dark:text-gray-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 -mx-2 px-2 py-1 rounded min-h-[2rem]"
                  >
                    {task.description || <span className="text-gray-400 dark:text-gray-500 italic">Add a description...</span>}
                  </p>
                )}
              </div>
            </div>

            {/* Bottleneck Detection Info */}
            {task.bottleneck_detection && (
              <div className={`p-3 rounded-lg border ${
                task.bottleneck_detection.severity === 'critical'
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                  : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
              }`}>
                <div className="flex items-start gap-2">
                  <Zap className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                    task.bottleneck_detection.severity === 'critical'
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-amber-600 dark:text-amber-400'
                  }`} />
                  <div className="min-w-0">
                    <p className={`text-[13px] font-medium ${
                      task.bottleneck_detection.severity === 'critical'
                        ? 'text-red-700 dark:text-red-300'
                        : 'text-amber-700 dark:text-amber-300'
                    }`}>
                      Auto-created by Bottleneck Detection
                    </p>
                    <p className={`text-[12px] mt-0.5 ${
                      task.bottleneck_detection.severity === 'critical'
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}>
                      Rule: {task.bottleneck_detection.rule_name}
                    </p>
                    <p className={`text-[11px] mt-1 ${
                      task.bottleneck_detection.severity === 'critical'
                        ? 'text-red-500 dark:text-red-500'
                        : 'text-amber-500 dark:text-amber-500'
                    }`}>
                      Severity: <span className="font-medium capitalize">{task.bottleneck_detection.severity}</span>
                      {' · '}
                      Detected {format(parseISO(task.bottleneck_detection.detected_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Task Details */}
            <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              {/* Due Date */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[13px] text-gray-500 dark:text-gray-400">
                  <Calendar className="w-4 h-4" />
                  Due Date
                </div>
                {editingField === 'due_date' ? (
                  <input
                    ref={inputRef as React.RefObject<HTMLInputElement>}
                    type="date"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => saveField('due_date', editValue)}
                    onKeyDown={(e) => handleKeyDown(e, 'due_date')}
                    className="text-[13px] bg-transparent border-b border-blue-500 outline-none"
                  />
                ) : (
                  <button
                    onClick={() => startEditing('due_date', task.due_date || '')}
                    className={`text-[13px] font-medium hover:underline ${
                      dueDateInfo?.isOverdue ? 'text-red-600' : 'text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    {dueDateInfo ? (
                      <span className="flex items-center gap-1">
                        {dueDateInfo.isOverdue && <AlertTriangle className="w-3 h-3" />}
                        {dueDateInfo.formatted}
                      </span>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">Set due date</span>
                    )}
                  </button>
                )}
              </div>

              {/* Assigned To */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[13px] text-gray-500 dark:text-gray-400">
                  <User className="w-4 h-4" />
                  Assigned To
                </div>
                <span className="text-[13px] font-medium text-gray-900 dark:text-gray-100">
                  {task.assigned_to_name || 'Unassigned'}
                </span>
              </div>

              {/* Stage Template (if applicable) */}
              {task.stage_template_name && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[13px] text-gray-500 dark:text-gray-400">
                    <Briefcase className="w-4 h-4" />
                    Interview Stage
                  </div>
                  <span className="text-[13px] font-medium text-gray-900 dark:text-gray-100">
                    {task.stage_template_name}
                  </span>
                </div>
              )}

              {/* Created */}
              <div className="flex items-center justify-between text-[12px] text-gray-500 dark:text-gray-400">
                <span>Created</span>
                <span>
                  {format(parseISO(task.created_at), 'MMM d, yyyy')}
                  {task.created_by_name && ` by ${task.created_by_name}`}
                </span>
              </div>

              {task.completed_at && (
                <div className="flex items-center justify-between text-[12px] text-gray-500 dark:text-gray-400">
                  <span>Completed</span>
                  <span>{format(parseISO(task.completed_at), 'MMM d, yyyy h:mm a')}</span>
                </div>
              )}
            </div>
          </div>
        )

      case 'entity':
        return (
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-[13px] font-medium text-gray-900 dark:text-gray-100">
                Linked {entityTypeLabels[task.entity_type]}
              </h4>
              <button
                onClick={handleOpenEntity}
                className="text-[12px] text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
              >
                Open <ExternalLink className="w-3 h-3" />
              </button>
            </div>

            {entityPreview?.loading ? (
              <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                <span className="text-[13px] text-gray-500">Loading...</span>
              </div>
            ) : entityPreview ? (
              <div
                onClick={handleOpenEntity}
                className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                    {entityTypeIcons[task.entity_type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-gray-900 dark:text-gray-100 truncate">
                      {entityPreview.name}
                    </p>
                    <p className="text-[12px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                      {entityPreview.subtitle}
                    </p>
                    {'email' in entityPreview && entityPreview.email && (
                      <div className="flex items-center gap-1.5 mt-2 text-[12px] text-gray-500 dark:text-gray-400">
                        <Mail className="w-3.5 h-3.5" />
                        {entityPreview.email}
                      </div>
                    )}
                    {'phone' in entityPreview && entityPreview.phone && (
                      <div className="flex items-center gap-1.5 mt-1 text-[12px] text-gray-500 dark:text-gray-400">
                        <Phone className="w-3.5 h-3.5" />
                        {entityPreview.phone}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )

      case 'activity':
        return (
          <div className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <History className="w-4 h-4 text-gray-400" />
              <h4 className="text-[13px] font-medium text-gray-900 dark:text-gray-100">
                Activity Timeline
              </h4>
            </div>

            {/* Placeholder - will be connected to backend later */}
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-[13px] text-gray-900 dark:text-gray-100">Task created</p>
                  <p className="text-[12px] text-gray-500 dark:text-gray-400">
                    {format(parseISO(task.created_at), 'MMM d, yyyy h:mm a')}
                    {task.created_by_name && ` by ${task.created_by_name}`}
                  </p>
                </div>
              </div>

              {task.completed_at && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-[13px] text-gray-900 dark:text-gray-100">Task completed</p>
                    <p className="text-[12px] text-gray-500 dark:text-gray-400">
                      {format(parseISO(task.completed_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )

      case 'notes':
        return (
          <div className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-4 h-4 text-gray-400" />
              <h4 className="text-[13px] font-medium text-gray-900 dark:text-gray-100">
                Notes
              </h4>
            </div>

            {/* Add Note Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a note..."
                className="flex-1 px-3 py-2 text-[13px] border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => {
                  // TODO: Connect to backend
                  setNewNote('')
                }}
                disabled={!newNote.trim()}
                className="px-3 py-2 text-[13px] font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Placeholder for notes */}
            <p className="mt-6 text-[12px] text-gray-400 dark:text-gray-500 italic text-center py-8">
              No notes yet
            </p>
          </div>
        )

      default:
        return null
    }
  }

  // Avatar for task
  const avatar = (
    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${priorityColors[task.priority].bg}`}>
      <div className={`w-3 h-3 rounded-full ${priorityColors[task.priority].dot}`} />
    </div>
  )

  // Entity drawers
  const modals = (
    <>
      {showLeadDrawer && task && (
        <LeadDrawer
          leadId={task.entity_id}
          onClose={() => setShowLeadDrawer(false)}
        />
      )}

      {showCompanyDrawer && task && (
        <CompanyDetailDrawer
          companyId={task.entity_id}
          onClose={() => setShowCompanyDrawer(false)}
        />
      )}

      {showApplicationDrawer && task && (
        <ApplicationDrawer
          applicationId={task.entity_id}
          isOpen={showApplicationDrawer}
          onClose={() => setShowApplicationDrawer(false)}
        />
      )}
    </>
  )

  return (
    <DrawerWithPanels
      isOpen={isOpen}
      onClose={onClose}
      title={task.title}
      subtitle={`${entityTypeLabels[task.entity_type]} task`}
      avatar={avatar}
      statusBadge={renderStatusBadge()}
      availablePanels={availablePanels}
      defaultPanel="details"
      activePanel={activePanel}
      onPanelChange={(panel) => setActivePanel(panel as TaskPanelType)}
      renderPanel={renderPanel}
      actionBar={renderActionBar()}
      modals={modals}
    />
  )
}

export default TaskDetailDrawer
