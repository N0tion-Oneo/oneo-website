import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSkills, useTechnologies, useCountries, useCities, useQuestionTemplates } from '@/hooks'
import { useCreateJob, useUpdateJob } from '@/hooks/useJobs'
import {
  Seniority,
  JobType,
  WorkMode,
  Department,
  Currency,
} from '@/types'
import type { Job, JobInput, BenefitCategory, InterviewStage, ApplicationQuestionInput } from '@/types'
import { ChevronLeft, ChevronRight, Loader2, Plus, X, GripVertical, Trash2, ExternalLink, FileText } from 'lucide-react'
import QuestionBuilder from './QuestionBuilder'

interface JobFormProps {
  job?: Job
  companyId?: string
  onSuccess?: (job: Job) => void
}

const seniorityOptions = [
  { value: Seniority.INTERN, label: 'Intern' },
  { value: Seniority.JUNIOR, label: 'Junior' },
  { value: Seniority.MID, label: 'Mid-level' },
  { value: Seniority.SENIOR, label: 'Senior' },
  { value: Seniority.LEAD, label: 'Lead' },
  { value: Seniority.PRINCIPAL, label: 'Principal' },
  { value: Seniority.EXECUTIVE, label: 'Executive' },
]

const jobTypeOptions = [
  { value: JobType.FULL_TIME, label: 'Full-time' },
  { value: JobType.PART_TIME, label: 'Part-time' },
  { value: JobType.CONTRACT, label: 'Contract' },
  { value: JobType.FREELANCE, label: 'Freelance' },
]

const workModeOptions = [
  { value: WorkMode.REMOTE, label: 'Remote' },
  { value: WorkMode.HYBRID, label: 'Hybrid' },
  { value: WorkMode.ONSITE, label: 'On-site' },
]

const departmentOptions = [
  { value: Department.ENGINEERING, label: 'Engineering' },
  { value: Department.MARKETING, label: 'Marketing' },
  { value: Department.SALES, label: 'Sales' },
  { value: Department.OPERATIONS, label: 'Operations' },
  { value: Department.DESIGN, label: 'Design' },
  { value: Department.PRODUCT, label: 'Product' },
  { value: Department.HR, label: 'Human Resources' },
  { value: Department.FINANCE, label: 'Finance' },
]

const currencyOptions = [
  { value: Currency.ZAR, label: 'ZAR - South African Rand' },
  { value: Currency.USD, label: 'USD - US Dollar' },
  { value: Currency.EUR, label: 'EUR - Euro' },
  { value: Currency.GBP, label: 'GBP - British Pound' },
]

const steps = [
  { id: 1, title: 'Basic Info' },
  { id: 2, title: 'Description' },
  { id: 3, title: 'Requirements' },
  { id: 4, title: 'Compensation' },
  { id: 5, title: 'Interview Pipeline' },
]

const defaultInterviewStages: InterviewStage[] = [
  { name: 'Application Review', order: 1, description: 'Initial resume and application screening' },
  { name: 'Phone Screen', order: 2, description: 'Brief call to discuss experience and expectations' },
  { name: 'Technical Interview', order: 3, description: 'Technical assessment and problem-solving' },
  { name: 'Final Interview', order: 4, description: 'Final round with hiring manager' },
]

export default function JobForm({ job, companyId, onSuccess }: JobFormProps) {
  const navigate = useNavigate()
  const isEditing = !!job

  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<JobInput>({
    title: job?.title || '',
    seniority: job?.seniority || undefined,
    job_type: job?.job_type || undefined,
    department: job?.department || undefined,
    summary: job?.summary || '',
    description: job?.description || '',
    requirements: job?.requirements || '',
    nice_to_haves: job?.nice_to_haves || '',
    responsibilities: job?.responsibilities || '',
    location_city_id: job?.location_city?.id || null,
    location_country_id: job?.location_country?.id || null,
    work_mode: job?.work_mode || undefined,
    salary_min: job?.salary_min || null,
    salary_max: job?.salary_max || null,
    salary_currency: job?.salary_currency || Currency.ZAR,
    salary_visible: job?.salary_visible ?? true,
    equity_offered: job?.equity_offered || false,
    required_skill_ids: job?.required_skills?.map((s) => s.id) || [],
    nice_to_have_skill_ids: job?.nice_to_have_skills?.map((s) => s.id) || [],
    technology_ids: job?.technologies?.map((t) => t.id) || [],
    application_deadline: job?.application_deadline || null,
    benefits: job?.benefits || [],
    interview_stages: job?.interview_stages || defaultInterviewStages,
    questions: job?.questions?.map((q) => ({
      question_text: q.question_text,
      question_type: q.question_type,
      options: q.options,
      placeholder: q.placeholder,
      helper_text: q.helper_text,
      is_required: q.is_required,
      order: q.order,
    })) || [],
  })

  const { skills } = useSkills()
  const { technologies } = useTechnologies()
  const { countries } = useCountries()
  const { cities } = useCities({
    countryId: formData.location_country_id || undefined,
  })
  const { templates: questionTemplates } = useQuestionTemplates({ is_active: true })

  const { createJob, isCreating, error: createError } = useCreateJob()
  const { updateJob, isUpdating, error: updateError } = useUpdateJob()

  const error = createError || updateError
  const isSubmitting = isCreating || isUpdating

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked

    setFormData((prev) => ({
      ...prev,
      [name]:
        type === 'checkbox'
          ? checked
          : type === 'number'
          ? value === ''
            ? null
            : Number(value)
          : value || undefined,
    }))
  }

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const countryId = e.target.value ? Number(e.target.value) : null
    setFormData((prev) => ({
      ...prev,
      location_country_id: countryId,
      location_city_id: null, // Reset city when country changes
    }))
  }

  const handleSkillToggle = (skillId: string, isRequired: boolean) => {
    const fieldName = isRequired ? 'required_skill_ids' : 'nice_to_have_skill_ids'
    const currentIds = formData[fieldName] || []

    setFormData((prev) => ({
      ...prev,
      [fieldName]: currentIds.includes(skillId)
        ? currentIds.filter((id) => id !== skillId)
        : [...currentIds, skillId],
    }))
  }

  const handleTechToggle = (techId: string) => {
    const currentIds = formData.technology_ids || []

    setFormData((prev) => ({
      ...prev,
      technology_ids: currentIds.includes(techId)
        ? currentIds.filter((id) => id !== techId)
        : [...currentIds, techId],
    }))
  }

  // Interview stages handlers
  const handleAddStage = () => {
    const stages = formData.interview_stages || []
    const newStage: InterviewStage = {
      name: '',
      order: stages.length + 1,
      description: '',
    }
    setFormData((prev) => ({
      ...prev,
      interview_stages: [...stages, newStage],
    }))
  }

  const handleRemoveStage = (index: number) => {
    const stages = formData.interview_stages || []
    const updatedStages = stages
      .filter((_, i) => i !== index)
      .map((stage, i) => ({ ...stage, order: i + 1 }))
    setFormData((prev) => ({
      ...prev,
      interview_stages: updatedStages,
    }))
  }

  const handleStageChange = (index: number, field: keyof InterviewStage, value: string | number) => {
    const stages = formData.interview_stages || []
    const updatedStages = [...stages]
    updatedStages[index] = { ...updatedStages[index], [field]: value }
    setFormData((prev) => ({
      ...prev,
      interview_stages: updatedStages,
    }))
  }

  const handleMoveStage = (index: number, direction: 'up' | 'down') => {
    const stages = formData.interview_stages || []
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === stages.length - 1)
    ) {
      return
    }
    const newIndex = direction === 'up' ? index - 1 : index + 1
    const updatedStages = [...stages]
    const temp = updatedStages[index]
    updatedStages[index] = updatedStages[newIndex]
    updatedStages[newIndex] = temp
    // Update order numbers
    updatedStages.forEach((stage, i) => {
      stage.order = i + 1
    })
    setFormData((prev) => ({
      ...prev,
      interview_stages: updatedStages,
    }))
  }

  // Questions handlers
  const handleQuestionsChange = (questions: ApplicationQuestionInput[]) => {
    setFormData((prev) => ({
      ...prev,
      questions,
    }))
  }

  const handleApplyTemplate = (templateId: string) => {
    const template = questionTemplates.find((t) => t.id === templateId)
    if (template) {
      const questions: ApplicationQuestionInput[] = template.questions.map((q, i) => ({
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.options,
        placeholder: q.placeholder,
        helper_text: q.helper_text,
        is_required: q.is_required,
        order: q.order || i + 1,
      }))
      setFormData((prev) => ({
        ...prev,
        questions,
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      let result: Job
      if (isEditing && job) {
        result = await updateJob(job.id, formData)
      } else {
        result = await createJob(formData, companyId)
      }
      if (onSuccess) {
        onSuccess(result)
      } else {
        navigate('/dashboard/jobs')
      }
    } catch (err) {
      console.error('Error saving job:', err)
    }
  }

  const nextStep = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setCurrentStep((s) => Math.min(s + 1, steps.length))
  }
  const prevStep = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setCurrentStep((s) => Math.max(s - 1, 1))
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Step Indicator */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <button
                type="button"
                onClick={() => setCurrentStep(step.id)}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-medium transition-colors ${
                  currentStep >= step.id
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {step.id}
              </button>
              <span
                className={`ml-2 text-[13px] ${
                  currentStep >= step.id ? 'text-gray-900 font-medium' : 'text-gray-500'
                }`}
              >
                {step.title}
              </span>
              {index < steps.length - 1 && (
                <div
                  className={`w-12 mx-4 h-px ${
                    currentStep > step.id ? 'bg-gray-900' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-[13px] text-red-600">{error}</p>
        </div>
      )}

      {/* Step 1: Basic Info */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-gray-700 mb-1">
              Job Title *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              required
              placeholder="e.g., Senior Software Engineer"
              className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-medium text-gray-700 mb-1">
                Seniority Level *
              </label>
              <select
                name="seniority"
                value={formData.seniority || ''}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              >
                <option value="">Select level</option>
                {seniorityOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[13px] font-medium text-gray-700 mb-1">
                Job Type *
              </label>
              <select
                name="job_type"
                value={formData.job_type || ''}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              >
                <option value="">Select type</option>
                {jobTypeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-medium text-gray-700 mb-1">
                Department
              </label>
              <select
                name="department"
                value={formData.department || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              >
                <option value="">Select department</option>
                {departmentOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[13px] font-medium text-gray-700 mb-1">
                Work Mode *
              </label>
              <select
                name="work_mode"
                value={formData.work_mode || ''}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              >
                <option value="">Select mode</option>
                {workModeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-medium text-gray-700 mb-1">
                Country
              </label>
              <select
                value={formData.location_country_id || ''}
                onChange={handleCountryChange}
                className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              >
                <option value="">Select country</option>
                {countries.map((country) => (
                  <option key={country.id} value={country.id}>
                    {country.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[13px] font-medium text-gray-700 mb-1">
                City
              </label>
              <select
                name="location_city_id"
                value={formData.location_city_id || ''}
                onChange={handleInputChange}
                disabled={!formData.location_country_id}
                className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-50"
              >
                <option value="">Select city</option>
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-medium text-gray-700 mb-1">
              Application Deadline
            </label>
            <input
              type="date"
              name="application_deadline"
              value={formData.application_deadline?.split('T')[0] || ''}
              onChange={handleInputChange}
              className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          </div>
        </div>
      )}

      {/* Step 2: Description */}
      {currentStep === 2 && (
        <div className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-gray-700 mb-1">
              Summary *
            </label>
            <textarea
              name="summary"
              value={formData.summary || ''}
              onChange={handleInputChange}
              required
              rows={2}
              placeholder="Brief summary of the role (shown in job cards)"
              className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-gray-700 mb-1">
              Job Description
            </label>
            <textarea
              name="description"
              value={formData.description || ''}
              onChange={handleInputChange}
              rows={6}
              placeholder="Detailed description of the role and opportunity..."
              className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-gray-700 mb-1">
              Responsibilities
            </label>
            <textarea
              name="responsibilities"
              value={formData.responsibilities || ''}
              onChange={handleInputChange}
              rows={6}
              placeholder="Key responsibilities for this role..."
              className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
            />
          </div>
        </div>
      )}

      {/* Step 3: Requirements */}
      {currentStep === 3 && (
        <div className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-gray-700 mb-1">
              Requirements
            </label>
            <textarea
              name="requirements"
              value={formData.requirements || ''}
              onChange={handleInputChange}
              rows={6}
              placeholder="Required qualifications and experience..."
              className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-gray-700 mb-1">
              Nice to Have
            </label>
            <textarea
              name="nice_to_haves"
              value={formData.nice_to_haves || ''}
              onChange={handleInputChange}
              rows={4}
              placeholder="Nice to have qualifications..."
              className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-gray-700 mb-2">
              Required Skills
            </label>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border border-gray-200 rounded-md">
              {skills.map((skill) => (
                <button
                  key={skill.id}
                  type="button"
                  onClick={() => handleSkillToggle(skill.id, true)}
                  className={`px-2.5 py-1 text-[12px] font-medium rounded transition-colors ${
                    formData.required_skill_ids?.includes(skill.id)
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {skill.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-medium text-gray-700 mb-2">
              Technologies
            </label>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border border-gray-200 rounded-md">
              {technologies.map((tech) => (
                <button
                  key={tech.id}
                  type="button"
                  onClick={() => handleTechToggle(tech.id)}
                  className={`px-2.5 py-1 text-[12px] font-medium rounded transition-colors ${
                    formData.technology_ids?.includes(tech.id)
                      ? 'bg-purple-100 text-purple-700 border border-purple-200'
                      : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {tech.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Compensation */}
      {currentStep === 4 && (
        <div className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[13px] font-medium text-gray-700 mb-1">
                Minimum Salary
              </label>
              <input
                type="number"
                name="salary_min"
                value={formData.salary_min || ''}
                onChange={handleInputChange}
                placeholder="e.g., 50000"
                className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-gray-700 mb-1">
                Maximum Salary
              </label>
              <input
                type="number"
                name="salary_max"
                value={formData.salary_max || ''}
                onChange={handleInputChange}
                placeholder="e.g., 80000"
                className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-gray-700 mb-1">
                Currency
              </label>
              <select
                name="salary_currency"
                value={formData.salary_currency || Currency.ZAR}
                onChange={handleInputChange}
                className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              >
                {currencyOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="salary_visible"
                checked={formData.salary_visible ?? true}
                onChange={handleInputChange}
                className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
              />
              <span className="text-[13px] text-gray-700">Show salary on job listing</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="equity_offered"
                checked={formData.equity_offered || false}
                onChange={handleInputChange}
                className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
              />
              <span className="text-[13px] text-gray-700">Equity offered</span>
            </label>
          </div>
        </div>
      )}

      {/* Step 5: Interview Pipeline & Application Questions */}
      {currentStep === 5 && (
        <div className="space-y-8">
          {/* Interview Stages Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-[14px] font-medium text-gray-900">Interview Stages</h3>
                <p className="text-[12px] text-gray-500 mt-0.5">
                  Define the stages candidates will go through in your hiring process
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddStage}
                className="flex items-center gap-1 px-3 py-1.5 text-[12px] font-medium text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Stage
              </button>
            </div>

            <div className="space-y-3">
              {(formData.interview_stages || []).map((stage, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg"
                >
                  <div className="flex flex-col items-center gap-1 pt-2">
                    <button
                      type="button"
                      onClick={() => handleMoveStage(index, 'up')}
                      disabled={index === 0}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 15l-6-6-6 6" />
                      </svg>
                    </button>
                    <span className="w-6 h-6 flex items-center justify-center bg-gray-900 text-white text-[11px] font-medium rounded-full">
                      {stage.order}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleMoveStage(index, 'down')}
                      disabled={index === (formData.interview_stages?.length || 0) - 1}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </button>
                  </div>

                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      value={stage.name}
                      onChange={(e) => handleStageChange(index, 'name', e.target.value)}
                      placeholder="Stage name (e.g., Phone Screen)"
                      className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white"
                    />
                    <input
                      type="text"
                      value={stage.description || ''}
                      onChange={(e) => handleStageChange(index, 'description', e.target.value)}
                      placeholder="Brief description (optional)"
                      className="w-full px-3 py-1.5 text-[13px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white"
                    />
                    {/* Assessment URL fields */}
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-1 mb-1">
                          <ExternalLink className="w-3 h-3 text-gray-400" />
                          <span className="text-[11px] text-gray-500">External Assessment URL (optional)</span>
                        </div>
                        <input
                          type="url"
                          value={stage.assessment_url || ''}
                          onChange={(e) => handleStageChange(index, 'assessment_url', e.target.value)}
                          placeholder="e.g., https://codility.com/test/..."
                          className="w-full px-3 py-1.5 text-[12px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white"
                        />
                      </div>
                      <div className="w-1/3">
                        <div className="mb-1">
                          <span className="text-[11px] text-gray-500">Assessment Name</span>
                        </div>
                        <input
                          type="text"
                          value={stage.assessment_name || ''}
                          onChange={(e) => handleStageChange(index, 'assessment_name', e.target.value)}
                          placeholder="e.g., Codility"
                          className="w-full px-3 py-1.5 text-[12px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveStage(index)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {(formData.interview_stages || []).length === 0 && (
                <div className="text-center py-8 bg-gray-50 border border-gray-200 border-dashed rounded-lg">
                  <p className="text-[13px] text-gray-500">No interview stages defined</p>
                  <button
                    type="button"
                    onClick={handleAddStage}
                    className="mt-2 text-[13px] text-gray-900 font-medium hover:underline"
                  >
                    Add your first stage
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200" />

          {/* Application Questions Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[14px] font-medium text-gray-900 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Application Questions
                </h3>
                <p className="text-[12px] text-gray-500 mt-0.5">
                  Custom questions candidates must answer when applying
                </p>
              </div>
              {questionTemplates.length > 0 && (
                <div className="flex items-center gap-2">
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleApplyTemplate(e.target.value)
                        e.target.value = ''
                      }
                    }}
                    className="px-3 py-1.5 text-[12px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
                    defaultValue=""
                  >
                    <option value="">Apply from template...</option>
                    {questionTemplates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name} ({template.questions_count || template.questions.length} questions)
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <QuestionBuilder
              questions={formData.questions || []}
              onChange={handleQuestionsChange}
            />
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="mt-6 pt-4 border-t border-gray-200 flex items-center justify-between">
        <button
          type="button"
          onClick={(e) => prevStep(e)}
          disabled={currentStep === 1}
          className="flex items-center gap-1 px-4 py-2 text-[13px] font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </button>

        {currentStep < steps.length ? (
          <button
            type="button"
            onClick={(e) => nextStep(e)}
            className="flex items-center gap-1 px-4 py-2 text-[13px] font-medium bg-gray-900 text-white rounded-md hover:bg-gray-800"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2 text-[13px] font-medium bg-gray-900 text-white rounded-md hover:bg-gray-800 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>{isEditing ? 'Update Job' : 'Create Job'}</>
            )}
          </button>
        )}
      </div>
    </form>
  )
}
