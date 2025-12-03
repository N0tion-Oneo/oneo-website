import { useState, useCallback } from 'react'
import { useExperiences, useExperienceMutations } from '@/hooks'
import ExperienceForm from './ExperienceForm'
import type { Experience, ExperienceInput } from '@/types'

interface ExperienceEditorProps {
  candidateSlug?: string
}

export default function ExperienceEditor({ candidateSlug }: ExperienceEditorProps) {
  const { experiences, isLoading, error, refetch } = useExperiences(candidateSlug)
  const { createExperience, updateExperience, deleteExperience, reorderExperiences, isSubmitting } = useExperienceMutations(candidateSlug)

  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [localExperiences, setLocalExperiences] = useState<Experience[]>([])

  // Keep local state in sync
  const displayExperiences = localExperiences.length > 0 ? localExperiences : experiences

  const handleCreate = async (data: ExperienceInput) => {
    await createExperience(data)
    setIsAdding(false)
    await refetch()
  }

  const handleUpdate = async (data: ExperienceInput) => {
    if (!editingId) return
    await updateExperience(editingId, data)
    setEditingId(null)
    await refetch()
  }

  const handleDelete = async (id: string) => {
    await deleteExperience(id)
    setDeleteConfirmId(null)
    await refetch()
  }

  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    setDraggedId(id)
    e.dataTransfer.effectAllowed = 'move'
    setLocalExperiences([...experiences])
  }, [experiences])

  const handleDragOver = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (!draggedId || draggedId === targetId) return

    setLocalExperiences((prev) => {
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
    if (draggedId && localExperiences.length > 0) {
      const orderedIds = localExperiences.map((exp) => exp.id)
      await reorderExperiences(orderedIds)
      await refetch()
    }
    setDraggedId(null)
    setLocalExperiences([])
  }, [draggedId, localExperiences, reorderExperiences, refetch])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-[14px] text-gray-500">Loading experiences...</div>
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

  const editingExperience = editingId ? experiences.find((exp) => exp.id === editingId) : undefined

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[14px] font-medium text-gray-900">Work Experience</h3>
          <p className="text-[13px] text-gray-500">Add your work history (drag to reorder)</p>
        </div>
        {!isAdding && !editingId && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="px-3 py-1.5 text-[13px] font-medium text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
          >
            Add Experience
          </button>
        )}
      </div>

      {/* Add Form */}
      {isAdding && (
        <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
          <h4 className="text-[13px] font-medium text-gray-700 mb-4">Add New Experience</h4>
          <ExperienceForm
            onSave={handleCreate}
            onCancel={() => setIsAdding(false)}
            isSubmitting={isSubmitting}
          />
        </div>
      )}

      {/* Edit Form */}
      {editingId && editingExperience && (
        <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
          <h4 className="text-[13px] font-medium text-gray-700 mb-4">Edit Experience</h4>
          <ExperienceForm
            experience={editingExperience}
            onSave={handleUpdate}
            onCancel={() => setEditingId(null)}
            isSubmitting={isSubmitting}
          />
        </div>
      )}

      {/* Experience List */}
      {!isAdding && !editingId && (
        <>
          {displayExperiences.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-gray-200 rounded-lg">
              <p className="text-[14px] text-gray-500">No work experience added yet</p>
              <p className="text-[13px] text-gray-400 mt-1">Click "Add Experience" to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayExperiences.map((exp) => (
                <div
                  key={exp.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, exp.id)}
                  onDragOver={(e) => handleDragOver(e, exp.id)}
                  onDragEnd={handleDragEnd}
                  className={`p-4 border border-gray-200 rounded-lg bg-white cursor-move transition-all ${
                    draggedId === exp.id ? 'opacity-50 shadow-lg' : 'hover:border-gray-300'
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
                          <h4 className="text-[14px] font-medium text-gray-900">{exp.job_title}</h4>
                          <p className="text-[13px] text-gray-600">{exp.company_name}</p>
                          <p className="text-[12px] text-gray-400 mt-0.5">
                            {formatDate(exp.start_date)} - {exp.is_current ? 'Present' : exp.end_date ? formatDate(exp.end_date) : ''}
                            {exp.industry && ` • ${exp.industry.name}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingId(exp.id)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" strokeLinecap="round" strokeLinejoin="round" />
                              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>
                          {deleteConfirmId === exp.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleDelete(exp.id)}
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
                              onClick={() => setDeleteConfirmId(exp.id)}
                              className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>

                      {exp.description && (
                        <p className="text-[13px] text-gray-600 mt-2 line-clamp-2">{exp.description}</p>
                      )}

                      {exp.technologies && exp.technologies.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {exp.technologies.slice(0, 5).map((tech) => (
                            <span
                              key={tech.id}
                              className="px-2 py-0.5 text-[11px] bg-gray-100 text-gray-600 rounded"
                            >
                              {tech.name}
                            </span>
                          ))}
                          {exp.technologies.length > 5 && (
                            <span className="px-2 py-0.5 text-[11px] bg-gray-100 text-gray-500 rounded">
                              +{exp.technologies.length - 5} more
                            </span>
                          )}
                        </div>
                      )}
                      {exp.skills && exp.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {exp.skills.slice(0, 5).map((skill) => (
                            <span
                              key={skill.id}
                              className="px-2 py-0.5 text-[11px] bg-blue-50 text-blue-600 rounded"
                            >
                              {skill.name}
                            </span>
                          ))}
                          {exp.skills.length > 5 && (
                            <span className="px-2 py-0.5 text-[11px] bg-blue-50 text-blue-500 rounded">
                              +{exp.skills.length - 5} more
                            </span>
                          )}
                        </div>
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
