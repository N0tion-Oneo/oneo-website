import { useState, useEffect } from 'react'
import type { Education, EducationInput } from '@/types'

interface EducationFormProps {
  education?: Education
  onSave: (data: EducationInput) => Promise<void>
  onCancel: () => void
  isSubmitting?: boolean
}

export default function EducationForm({
  education,
  onSave,
  onCancel,
  isSubmitting = false,
}: EducationFormProps) {
  const [formData, setFormData] = useState<EducationInput>({
    institution: '',
    degree: '',
    field_of_study: '',
    start_date: '',
    end_date: null,
    is_current: false,
    grade: '',
    description: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (education) {
      setFormData({
        institution: education.institution,
        degree: education.degree,
        field_of_study: education.field_of_study,
        start_date: education.start_date,
        end_date: education.end_date,
        is_current: education.is_current,
        grade: education.grade || '',
        description: education.description || '',
      })
    }
  }, [education])

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  const handleCurrentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked
    setFormData((prev) => ({
      ...prev,
      is_current: isChecked,
      end_date: isChecked ? null : prev.end_date,
    }))
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!formData.institution.trim()) {
      newErrors.institution = 'Institution is required'
    }
    if (!formData.degree.trim()) {
      newErrors.degree = 'Degree is required'
    }
    if (!formData.field_of_study.trim()) {
      newErrors.field_of_study = 'Field of study is required'
    }
    if (!formData.start_date) {
      newErrors.start_date = 'Start date is required'
    }
    if (!formData.is_current && formData.end_date && formData.start_date > formData.end_date) {
      newErrors.end_date = 'End date must be after start date'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    await onSave(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
          Institution *
        </label>
        <input
          type="text"
          name="institution"
          value={formData.institution}
          onChange={handleInputChange}
          placeholder="e.g. University of Cape Town"
          className={`w-full px-3 py-2 text-[14px] border rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent ${
            errors.institution ? 'border-red-300' : 'border-gray-200'
          }`}
        />
        {errors.institution && (
          <p className="mt-1 text-[12px] text-red-500">{errors.institution}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
            Degree *
          </label>
          <input
            type="text"
            name="degree"
            value={formData.degree}
            onChange={handleInputChange}
            placeholder="e.g. Bachelor of Science"
            className={`w-full px-3 py-2 text-[14px] border rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent ${
              errors.degree ? 'border-red-300' : 'border-gray-200'
            }`}
          />
          {errors.degree && (
            <p className="mt-1 text-[12px] text-red-500">{errors.degree}</p>
          )}
        </div>
        <div>
          <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
            Field of Study *
          </label>
          <input
            type="text"
            name="field_of_study"
            value={formData.field_of_study}
            onChange={handleInputChange}
            placeholder="e.g. Computer Science"
            className={`w-full px-3 py-2 text-[14px] border rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent ${
              errors.field_of_study ? 'border-red-300' : 'border-gray-200'
            }`}
          />
          {errors.field_of_study && (
            <p className="mt-1 text-[12px] text-red-500">{errors.field_of_study}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
            Start Date *
          </label>
          <input
            type="date"
            name="start_date"
            value={formData.start_date}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 text-[14px] border rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent ${
              errors.start_date ? 'border-red-300' : 'border-gray-200'
            }`}
          />
          {errors.start_date && (
            <p className="mt-1 text-[12px] text-red-500">{errors.start_date}</p>
          )}
        </div>
        <div>
          <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
            End Date
          </label>
          <input
            type="date"
            name="end_date"
            value={formData.end_date || ''}
            onChange={handleInputChange}
            disabled={formData.is_current}
            className={`w-full px-3 py-2 text-[14px] border rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400 ${
              errors.end_date ? 'border-red-300' : 'border-gray-200'
            }`}
          />
          {errors.end_date && (
            <p className="mt-1 text-[12px] text-red-500">{errors.end_date}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="is_current_edu"
          name="is_current"
          checked={formData.is_current}
          onChange={handleCurrentChange}
          className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
        />
        <label htmlFor="is_current_edu" className="text-[14px] text-gray-700">
          I am currently studying here
        </label>
      </div>

      <div>
        <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
          Grade / GPA (optional)
        </label>
        <input
          type="text"
          name="grade"
          value={formData.grade}
          onChange={handleInputChange}
          placeholder="e.g. 3.8 / 4.0 or First Class Honours"
          className="w-full max-w-[200px] px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
          Description (optional)
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          rows={3}
          placeholder="Describe your studies, achievements, or relevant coursework..."
          className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-4 py-2 text-[14px] font-medium text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 text-[14px] font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Saving...' : education ? 'Update' : 'Add Education'}
        </button>
      </div>
    </form>
  )
}
