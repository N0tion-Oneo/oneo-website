import { useState, useCallback } from 'react'
import { useEducation, useEducationMutations } from '@/hooks'
import EducationForm from './EducationForm'
import type { Education, EducationInput } from '@/types'

export default function EducationEditor() {
  const { education, isLoading, error, refetch } = useEducation()
  const { createEducation, updateEducation, deleteEducation, reorderEducation, isSubmitting } = useEducationMutations()

  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [localEducation, setLocalEducation] = useState<Education[]>([])

  // Keep local state in sync
  const displayEducation = localEducation.length > 0 ? localEducation : education

  const handleCreate = async (data: EducationInput) => {
    await createEducation(data)
    setIsAdding(false)
    await refetch()
  }

  const handleUpdate = async (data: EducationInput) => {
    if (!editingId) return
    await updateEducation(editingId, data)
    setEditingId(null)
    await refetch()
  }

  const handleDelete = async (id: string) => {
    await deleteEducation(id)
    setDeleteConfirmId(null)
    await refetch()
  }

  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    setDraggedId(id)
    e.dataTransfer.effectAllowed = 'move'
    setLocalEducation([...education])
  }, [education])

  const handleDragOver = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (!draggedId || draggedId === targetId) return

    setLocalEducation((prev) => {
      const items = [...prev]
      const draggedIndex = items.findIndex((item) => item.id === draggedId)
      const targetIndex = items.findIndex((item) => item.id === targetId)

      if (draggedIndex === -1 || targetIndex === -1) return prev

      const removed = items.splice(draggedIndex, 1)[0]
      if (removed) {
        items.splice(targetIndex, 0, removed)
      }
      return items
    })
  }, [draggedId])

  const handleDragEnd = useCallback(async () => {
    if (draggedId && localEducation.length > 0) {
      const orderedIds = localEducation.map((edu) => edu.id)
      await reorderEducation(orderedIds)
      await refetch()
    }
    setDraggedId(null)
    setLocalEducation([])
  }, [draggedId, localEducation, reorderEducation, refetch])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-[14px] text-gray-500">Loading education...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-[14px] text-red-500">{error}</div>
      </div>
    )
  }

  const editingEducation = editingId ? education.find((edu) => edu.id === editingId) : undefined

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[14px] font-medium text-gray-900">Education</h3>
          <p className="text-[13px] text-gray-500">Add your educational background (drag to reorder)</p>
        </div>
        {!isAdding && !editingId && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="px-3 py-1.5 text-[13px] font-medium text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
          >
            Add Education
          </button>
        )}
      </div>

      {/* Add Form */}
      {isAdding && (
        <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
          <h4 className="text-[13px] font-medium text-gray-700 mb-4">Add New Education</h4>
          <EducationForm
            onSave={handleCreate}
            onCancel={() => setIsAdding(false)}
            isSubmitting={isSubmitting}
          />
        </div>
      )}

      {/* Edit Form */}
      {editingId && editingEducation && (
        <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
          <h4 className="text-[13px] font-medium text-gray-700 mb-4">Edit Education</h4>
          <EducationForm
            education={editingEducation}
            onSave={handleUpdate}
            onCancel={() => setEditingId(null)}
            isSubmitting={isSubmitting}
          />
        </div>
      )}

      {/* Education List */}
      {!isAdding && !editingId && (
        <>
          {displayEducation.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-gray-200 rounded-lg">
              <p className="text-[14px] text-gray-500">No education added yet</p>
              <p className="text-[13px] text-gray-400 mt-1">Click "Add Education" to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayEducation.map((edu) => (
                <div
                  key={edu.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, edu.id)}
                  onDragOver={(e) => handleDragOver(e, edu.id)}
                  onDragEnd={handleDragEnd}
                  className={`p-4 border border-gray-200 rounded-lg bg-white cursor-move transition-all ${
                    draggedId === edu.id ? 'opacity-50 shadow-lg' : 'hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Drag Handle */}
                    <div className="flex-shrink-0 pt-1 text-gray-300 cursor-grab active:cursor-grabbing">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="9" cy="6" r="1.5" />
                        <circle cx="15" cy="6" r="1.5" />
                        <circle cx="9" cy="12" r="1.5" />
                        <circle cx="15" cy="12" r="1.5" />
                        <circle cx="9" cy="18" r="1.5" />
                        <circle cx="15" cy="18" r="1.5" />
                      </svg>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-[14px] font-medium text-gray-900">{edu.degree}</h4>
                          <p className="text-[13px] text-gray-600">{edu.institution}</p>
                          <p className="text-[12px] text-gray-500 mt-0.5">{edu.field_of_study}</p>
                          <p className="text-[12px] text-gray-400 mt-0.5">
                            {formatDate(edu.start_date)} - {edu.is_current ? 'Present' : edu.end_date ? formatDate(edu.end_date) : ''}
                            {edu.grade && ` • ${edu.grade}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingId(edu.id)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" strokeLinecap="round" strokeLinejoin="round" />
                              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>
                          {deleteConfirmId === edu.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleDelete(edu.id)}
                                disabled={isSubmitting}
                                className="px-2 py-1 text-[12px] font-medium text-red-600 hover:text-red-700 transition-colors"
                              >
                                Confirm
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-2 py-1 text-[12px] font-medium text-gray-500 hover:text-gray-600 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(edu.id)}
                              className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>

                      {edu.description && (
                        <p className="text-[13px] text-gray-600 mt-2 line-clamp-2">{edu.description}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
