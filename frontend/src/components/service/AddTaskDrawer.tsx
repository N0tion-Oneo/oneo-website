import { useState, useEffect, useCallback } from 'react'
import { X, Loader2, Search, Building2, Users, FileText, UserCircle } from 'lucide-react'
import type { Task, EntityType } from '@/types'
import { TaskPriority, TaskPriorityLabels } from '@/types'
import { useCreateTask, useUpdateTask, useStaffUsers, useAllCompanies, useAllCandidates, useLeads } from '@/hooks'

interface AddTaskDrawerProps {
  isOpen: boolean
  onClose: () => void
  entityType?: EntityType
  entityId?: string
  task?: Task | null
  onSuccess: () => void
  standaloneMode?: boolean // When true, shows entity picker
}

export function AddTaskDrawer({
  isOpen,
  onClose,
  entityType: propEntityType,
  entityId: propEntityId,
  task,
  onSuccess,
  standaloneMode = false,
}: AddTaskDrawerProps) {
  const isEditing = !!task

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.MEDIUM)
  const [dueDate, setDueDate] = useState('')
  const [assignedTo, setAssignedTo] = useState('')

  // Entity picker state (for standalone mode)
  const [selectedEntityType, setSelectedEntityType] = useState<EntityType | ''>('')
  const [selectedEntityId, setSelectedEntityId] = useState<string>('')
  const [selectedEntityName, setSelectedEntityName] = useState<string>('')
  const [entitySearchQuery, setEntitySearchQuery] = useState('')
  const [showEntityDropdown, setShowEntityDropdown] = useState(false)

  // Derived values
  const entityType = standaloneMode ? (selectedEntityType as EntityType) : propEntityType
  const entityId = standaloneMode ? selectedEntityId : propEntityId

  // Hooks
  const { createTask, isCreating } = useCreateTask()
  const { updateTask, isUpdating } = useUpdateTask()
  const { staffUsers, isLoading: isLoadingStaff } = useStaffUsers()

  // Entity data hooks for standalone mode
  const { companies } = useAllCompanies({ page_size: 50 })
  const { candidates } = useAllCandidates({ page_size: 50 })
  const { leads } = useLeads()

  const isSubmitting = isCreating || isUpdating

  // Get entity options based on selected type
  const getEntityOptions = useCallback(() => {
    if (!selectedEntityType) return []

    const query = entitySearchQuery.toLowerCase()

    switch (selectedEntityType) {
      case 'lead':
        return (leads || [])
          .filter((l) => !query || l.name?.toLowerCase().includes(query) || l.email?.toLowerCase().includes(query))
          .slice(0, 20)
          .map((l) => ({ id: l.id.toString(), name: l.name || l.email || `Lead #${l.id}` }))

      case 'company':
        return (companies || [])
          .filter((c) => !query || c.name?.toLowerCase().includes(query))
          .slice(0, 20)
          .map((c) => ({ id: c.id.toString(), name: c.name }))

      case 'candidate':
        return (candidates || [])
          .filter((c) => !query || c.full_name?.toLowerCase().includes(query) || c.email?.toLowerCase().includes(query))
          .slice(0, 20)
          .map((c) => ({ id: c.id.toString(), name: c.full_name || c.email || `Candidate #${c.id}` }))

      case 'application':
        // Applications are typically linked via the existing flow, not standalone
        // For now, return empty - applications should be created from the application context
        return []

      default:
        return []
    }
  }, [selectedEntityType, entitySearchQuery, leads, companies, candidates])

  // Reset form when drawer opens/closes or task changes
  useEffect(() => {
    if (isOpen) {
      if (task) {
        setTitle(task.title)
        setDescription(task.description || '')
        setPriority(task.priority)
        setDueDate(task.due_date || '')
        setAssignedTo(task.assigned_to?.toString() || '')
        if (standaloneMode) {
          setSelectedEntityType(task.entity_type)
          setSelectedEntityId(task.entity_id)
        }
      } else {
        setTitle('')
        setDescription('')
        setPriority(TaskPriority.MEDIUM)
        setDueDate('')
        setAssignedTo('')
        if (standaloneMode) {
          setSelectedEntityType('')
          setSelectedEntityId('')
          setSelectedEntityName('')
          setEntitySearchQuery('')
        }
      }
    }
  }, [isOpen, task, standaloneMode])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    if (standaloneMode && (!entityType || !entityId)) return

    try {
      if (isEditing && task) {
        await updateTask(task.id, {
          title: title.trim(),
          description: description.trim() || undefined,
          priority,
          due_date: dueDate || null,
          assigned_to: assignedTo ? parseInt(assignedTo, 10) : undefined,
        })
      } else {
        if (!assignedTo) return // assignedTo is required for new tasks
        if (!entityType || !entityId) return
        await createTask({
          entity_type: entityType,
          entity_id: entityId,
          title: title.trim(),
          description: description.trim() || undefined,
          priority,
          due_date: dueDate || undefined,
          assigned_to: parseInt(assignedTo, 10),
        })
      }
      onSuccess()
    } catch (error) {
      console.error('Failed to save task:', error)
    }
  }

  const handleSelectEntity = (id: string, name: string) => {
    setSelectedEntityId(id)
    setSelectedEntityName(name)
    setShowEntityDropdown(false)
    setEntitySearchQuery('')
  }

  const entityOptions = getEntityOptions()

  const entityTypeIcons: Record<EntityType, React.ReactNode> = {
    lead: <UserCircle className="w-4 h-4" />,
    company: <Building2 className="w-4 h-4" />,
    candidate: <Users className="w-4 h-4" />,
    application: <FileText className="w-4 h-4" />,
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 dark:bg-black/50 z-[400]"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white dark:bg-gray-900 shadow-xl dark:shadow-gray-900/50 z-[401] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {isEditing ? 'Edit Task' : 'Add Task'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Entity Picker (standalone mode only) */}
            {standaloneMode && !isEditing && (
              <>
                {/* Entity Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Entity Type <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['lead', 'company', 'candidate', 'application'] as EntityType[]).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          setSelectedEntityType(type)
                          setSelectedEntityId('')
                          setSelectedEntityName('')
                          setEntitySearchQuery('')
                        }}
                        className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors ${
                          selectedEntityType === type
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-600'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        {entityTypeIcons[type]}
                        <span className="text-[11px] capitalize">{type}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Entity Search & Selection */}
                {selectedEntityType && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Select {selectedEntityType.charAt(0).toUpperCase() + selectedEntityType.slice(1)}{' '}
                      <span className="text-red-500">*</span>
                    </label>

                    {selectedEntityId ? (
                      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <div className="flex items-center gap-2">
                          {entityTypeIcons[selectedEntityType]}
                          <span className="text-sm text-gray-900 dark:text-gray-100">{selectedEntityName}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedEntityId('')
                            setSelectedEntityName('')
                          }}
                          className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="text"
                            value={entitySearchQuery}
                            onChange={(e) => {
                              setEntitySearchQuery(e.target.value)
                              setShowEntityDropdown(true)
                            }}
                            onFocus={() => setShowEntityDropdown(true)}
                            placeholder={`Search ${selectedEntityType}s...`}
                            className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        {showEntityDropdown && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setShowEntityDropdown(false)} />
                            <div className="absolute z-20 w-full mt-1 max-h-48 overflow-y-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                              {entityOptions.length === 0 ? (
                                <div className="p-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                                  {entitySearchQuery ? 'No results found' : 'Start typing to search...'}
                                </div>
                              ) : (
                                entityOptions.map((option) => (
                                  <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => handleSelectEntity(option.id, option.name)}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800"
                                  >
                                    {entityTypeIcons[selectedEntityType]}
                                    {option.name}
                                  </button>
                                ))
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Follow up on proposal"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                autoFocus
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add details about this task..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Priority */}
            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Priority
              </label>
              <select
                id="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {Object.entries(TaskPriorityLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Due Date */}
            <div>
              <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Due Date
              </label>
              <input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Assigned To */}
            <div>
              <label htmlFor="assignedTo" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Assign To
              </label>
              <select
                id="assignedTo"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoadingStaff}
              >
                <option value="">Select assignee...</option>
                {staffUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.full_name || `${user.first_name} ${user.last_name}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                isSubmitting ||
                !title.trim() ||
                (standaloneMode && !isEditing && (!selectedEntityType || !selectedEntityId))
              }
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEditing ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}

export default AddTaskDrawer
