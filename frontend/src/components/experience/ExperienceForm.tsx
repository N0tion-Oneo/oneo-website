import { useState, useEffect } from 'react'
import { IndustryMultiSelect, TechnologyMultiSelect, SkillMultiSelect } from '@/components/forms'
import type { Experience, ExperienceInput, Industry, Technology, Skill } from '@/types'
import { CompanySize } from '@/types'

interface ExperienceFormProps {
  experience?: Experience
  onSave: (data: ExperienceInput) => Promise<void>
  onCancel: () => void
  isSubmitting?: boolean
}

export default function ExperienceForm({
  experience,
  onSave,
  onCancel,
  isSubmitting = false,
}: ExperienceFormProps) {
  const [formData, setFormData] = useState<ExperienceInput>({
    job_title: '',
    company_name: '',
    company_size: '',
    industry_id: null,
    start_date: '',
    end_date: null,
    is_current: false,
    description: '',
    achievements: '',
    technology_ids: [],
    skill_ids: [],
  })
  const [selectedIndustry, setSelectedIndustry] = useState<Industry[]>([])
  const [selectedTechnologies, setSelectedTechnologies] = useState<Technology[]>([])
  const [selectedSkills, setSelectedSkills] = useState<Skill[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (experience) {
      setFormData({
        job_title: experience.job_title,
        company_name: experience.company_name,
        company_size: experience.company_size || '',
        industry_id: experience.industry?.id || null,
        start_date: experience.start_date,
        end_date: experience.end_date,
        is_current: experience.is_current,
        description: experience.description || '',
        achievements: experience.achievements || '',
        technology_ids: experience.technologies?.map((t) => t.id) || [],
        skill_ids: experience.skills?.map((s) => s.id) || [],
      })
      if (experience.industry) {
        setSelectedIndustry([experience.industry])
      }
      if (experience.technologies) {
        setSelectedTechnologies(experience.technologies)
      }
      if (experience.skills) {
        setSelectedSkills(experience.skills)
      }
    }
  }, [experience])

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

  const handleIndustryChange = (industries: Industry[]) => {
    setSelectedIndustry(industries)
    const firstIndustry = industries[0]
    setFormData((prev) => ({
      ...prev,
      industry_id: firstIndustry ? firstIndustry.id : null,
    }))
  }

  const handleTechnologiesChange = (technologies: Technology[]) => {
    setSelectedTechnologies(technologies)
    setFormData((prev) => ({
      ...prev,
      technology_ids: technologies.map((t) => t.id),
    }))
  }

  const handleSkillsChange = (skills: Skill[]) => {
    setSelectedSkills(skills)
    setFormData((prev) => ({
      ...prev,
      skill_ids: skills.map((s) => s.id),
    }))
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!formData.job_title.trim()) {
      newErrors.job_title = 'Job title is required'
    }
    if (!formData.company_name.trim()) {
      newErrors.company_name = 'Company name is required'
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
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Job Title *
          </label>
          <input
            type="text"
            name="job_title"
            value={formData.job_title}
            onChange={handleInputChange}
            placeholder="e.g. Senior Software Engineer"
            className={`w-full px-3 py-2 text-[14px] border rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 ${
              errors.job_title ? 'border-red-300' : 'border-gray-200 dark:border-gray-700'
            }`}
          />
          {errors.job_title && (
            <p className="mt-1 text-[12px] text-red-500">{errors.job_title}</p>
          )}
        </div>
        <div>
          <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Company Name *
          </label>
          <input
            type="text"
            name="company_name"
            value={formData.company_name}
            onChange={handleInputChange}
            placeholder="e.g. Acme Inc."
            className={`w-full px-3 py-2 text-[14px] border rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 ${
              errors.company_name ? 'border-red-300' : 'border-gray-200 dark:border-gray-700'
            }`}
          />
          {errors.company_name && (
            <p className="mt-1 text-[12px] text-red-500">{errors.company_name}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Company Size
          </label>
          <select
            name="company_size"
            value={formData.company_size}
            onChange={handleInputChange}
            className="w-full px-3 py-2 text-[14px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
          >
            <option value="">Select size</option>
            <option value={CompanySize.SIZE_1_10}>1-10 employees</option>
            <option value={CompanySize.SIZE_11_50}>11-50 employees</option>
            <option value={CompanySize.SIZE_51_200}>51-200 employees</option>
            <option value={CompanySize.SIZE_201_500}>201-500 employees</option>
            <option value={CompanySize.SIZE_501_1000}>501-1000 employees</option>
            <option value={CompanySize.SIZE_1000_PLUS}>1000+ employees</option>
          </select>
        </div>
        <div>
          <IndustryMultiSelect
            selected={selectedIndustry}
            onChange={handleIndustryChange}
            maxItems={1}
            label="Industry"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Start Date *
          </label>
          <input
            type="date"
            name="start_date"
            value={formData.start_date}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 text-[14px] border rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 ${
              errors.start_date ? 'border-red-300' : 'border-gray-200 dark:border-gray-700'
            }`}
          />
          {errors.start_date && (
            <p className="mt-1 text-[12px] text-red-500">{errors.start_date}</p>
          )}
        </div>
        <div>
          <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            End Date
          </label>
          <input
            type="date"
            name="end_date"
            value={formData.end_date || ''}
            onChange={handleInputChange}
            disabled={formData.is_current}
            className={`w-full px-3 py-2 text-[14px] border rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 ${
              errors.end_date ? 'border-red-300' : 'border-gray-200 dark:border-gray-700'
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
          id="is_current"
          name="is_current"
          checked={formData.is_current}
          onChange={handleCurrentChange}
          className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:ring-gray-900 dark:focus:ring-gray-100"
        />
        <label htmlFor="is_current" className="text-[14px] text-gray-700 dark:text-gray-300">
          I currently work here
        </label>
      </div>

      <div>
        <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Description
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          rows={4}
          placeholder="Describe your role and responsibilities..."
          className="w-full px-3 py-2 text-[14px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent resize-none bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
        />
      </div>

      <div>
        <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Key Achievements
        </label>
        <textarea
          name="achievements"
          value={formData.achievements}
          onChange={handleInputChange}
          rows={3}
          placeholder="List your key achievements and accomplishments..."
          className="w-full px-3 py-2 text-[14px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent resize-none bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
        />
      </div>

      <div>
        <TechnologyMultiSelect
          selected={selectedTechnologies}
          onChange={handleTechnologiesChange}
          maxItems={20}
          label="Technologies Used"
        />
      </div>

      <div>
        <SkillMultiSelect
          selected={selectedSkills}
          onChange={handleSkillsChange}
          maxItems={10}
          label="Skills Applied"
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-4 py-2 text-[14px] font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 text-[14px] font-medium text-white bg-gray-900 dark:bg-gray-100 dark:text-gray-900 rounded-md hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Saving...' : experience ? 'Update' : 'Add Experience'}
        </button>
      </div>
    </form>
  )
}
