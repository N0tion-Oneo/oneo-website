/**
 * JobProfilePanel - Editable job details panel with collapsible subpanels
 *
 * Similar to CandidateProfile/CompanyProfile pattern with per-section editing
 */

import { useState, useEffect } from 'react'
import {
  Building2,
  DollarSign,
  Users,
  Calendar,
  FileText,
  ChevronDown,
  ChevronUp,
  Star,
  TrendingUp,
  Briefcase,
  Pencil,
  X,
  Loader2,
} from 'lucide-react'
import { JobStatus, Seniority, JobType, WorkMode, Department } from '@/types'
import type { Job, Skill, Technology } from '@/types'
import { useCountries, useCities } from '@/hooks'
import { SkillMultiSelect, TechnologyMultiSelect } from '@/components/forms'
import api from '@/services/api'

// =============================================================================
// Types
// =============================================================================

interface JobProfilePanelProps {
  jobId: string
  entity: Job | null | undefined
  onRefresh?: () => void
}

// Form interfaces for each section
interface BasicInfoForm {
  title?: string
  seniority?: Seniority
  job_type?: JobType
  department?: Department
  work_mode?: WorkMode
  location_country_id?: number | null
  location_city_id?: number | null
  application_deadline?: string | null
  positions_to_fill?: number
}

interface DescriptionForm {
  summary?: string
  description?: string
  responsibilities?: string
}

interface RequirementsForm {
  requirements?: string
  nice_to_haves?: string
  required_skill_ids?: number[]
  nice_to_have_skill_ids?: number[]
  technology_ids?: number[]
}

interface CompensationForm {
  salary_min?: number | null
  salary_max?: number | null
  salary_currency?: string
  salary_visible?: boolean
  equity_offered?: boolean
}

// =============================================================================
// Constants
// =============================================================================

const statusColors: Record<JobStatus, string> = {
  [JobStatus.DRAFT]: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
  [JobStatus.PUBLISHED]: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  [JobStatus.CLOSED]: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  [JobStatus.FILLED]: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  [JobStatus.ARCHIVED]: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
}

const statusLabels: Record<JobStatus, string> = {
  [JobStatus.DRAFT]: 'Draft',
  [JobStatus.PUBLISHED]: 'Published',
  [JobStatus.CLOSED]: 'Closed',
  [JobStatus.FILLED]: 'Filled',
  [JobStatus.ARCHIVED]: 'Archived',
}

const seniorityOptions = [
  { value: Seniority.INTERN, label: 'Intern' },
  { value: Seniority.JUNIOR, label: 'Junior' },
  { value: Seniority.MID, label: 'Mid-Level' },
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
  { value: WorkMode.ONSITE, label: 'On-site' },
  { value: WorkMode.REMOTE, label: 'Remote' },
  { value: WorkMode.HYBRID, label: 'Hybrid' },
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
  { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' },
  { value: 'GBP', label: 'GBP' },
  { value: 'ZAR', label: 'ZAR' },
]

// =============================================================================
// Helper Functions
// =============================================================================

function formatDate(dateString: string | null): string {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function getSeniorityLabel(value?: Seniority): string {
  return seniorityOptions.find(o => o.value === value)?.label || 'Not set'
}

function getJobTypeLabel(value?: JobType): string {
  return jobTypeOptions.find(o => o.value === value)?.label || 'Not set'
}

function getWorkModeLabel(value?: WorkMode): string {
  return workModeOptions.find(o => o.value === value)?.label || 'Not set'
}

function getDepartmentLabel(value?: Department): string {
  return departmentOptions.find(o => o.value === value)?.label || 'Not set'
}

// =============================================================================
// Editable Collapsible Section Component
// =============================================================================

interface EditableCollapsibleSectionProps {
  title: string
  icon: React.ReactNode
  defaultOpen?: boolean
  isEditing: boolean
  isSaving: boolean
  onEditToggle: (editing: boolean) => void
  onSave: () => Promise<void>
  viewContent: React.ReactNode
  editContent: React.ReactNode
}

function EditableCollapsibleSection({
  title,
  icon,
  defaultOpen = false,
  isEditing,
  isSaving,
  onEditToggle,
  onSave,
  viewContent,
  editContent,
}: EditableCollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  const handleSave = async () => {
    await onSave()
  }

  const handleCancel = () => {
    onEditToggle(false)
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 flex-1 text-left hover:bg-gray-100 dark:hover:bg-gray-700 -m-2 p-2 rounded transition-colors"
        >
          {icon}
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{title}</span>
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-gray-400 dark:text-gray-500 ml-auto" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-500 ml-auto" />
          )}
        </button>

        {/* Edit/Save/Cancel buttons */}
        {isOpen && (
          <div className="flex items-center gap-1 ml-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-3 py-1 text-[12px] font-medium text-white bg-gray-900 dark:bg-gray-100 dark:text-gray-900 rounded-md hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 transition-colors"
                >
                  {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save'}
                </button>
              </>
            ) : (
              <button
                onClick={() => onEditToggle(true)}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {isOpen && (
        <div className="p-3 border-t border-gray-200 dark:border-gray-700">
          {isEditing ? editContent : viewContent}
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Info Row Component
// =============================================================================

function InfoRow({ label, value, icon }: { label: string; value?: string | number | null; icon?: React.ReactNode }) {
  if (!value && value !== 0) return null
  return (
    <div className="flex items-start gap-2 py-1">
      {icon && <div className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0">{icon}</div>}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-[13px] text-gray-900 dark:text-gray-100">{value}</p>
      </div>
    </div>
  )
}

// =============================================================================
// Main Component
// =============================================================================

export function JobProfilePanel({ jobId, entity, onRefresh }: JobProfilePanelProps) {
  const job = entity

  // Per-section edit states
  const [isEditingBasicInfo, setIsEditingBasicInfo] = useState(false)
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [isEditingRequirements, setIsEditingRequirements] = useState(false)
  const [isEditingCompensation, setIsEditingCompensation] = useState(false)

  // Saving states
  const [isSavingBasicInfo, setIsSavingBasicInfo] = useState(false)
  const [isSavingDescription, setIsSavingDescription] = useState(false)
  const [isSavingRequirements, setIsSavingRequirements] = useState(false)
  const [isSavingCompensation, setIsSavingCompensation] = useState(false)

  // Form data
  const [basicInfoForm, setBasicInfoForm] = useState<BasicInfoForm>({})
  const [descriptionForm, setDescriptionForm] = useState<DescriptionForm>({})
  const [requirementsForm, setRequirementsForm] = useState<RequirementsForm>({})
  const [compensationForm, setCompensationForm] = useState<CompensationForm>({})

  // Skills/Tech selection state
  const [selectedRequiredSkills, setSelectedRequiredSkills] = useState<Skill[]>([])
  const [selectedNiceSkills, setSelectedNiceSkills] = useState<Skill[]>([])
  const [selectedTechnologies, setSelectedTechnologies] = useState<Technology[]>([])

  // Location hooks
  const { countries } = useCountries()
  const { cities } = useCities({ countryId: basicInfoForm.location_country_id })

  // Initialize form data when entering edit mode
  useEffect(() => {
    if (isEditingBasicInfo && job) {
      setBasicInfoForm({
        title: job.title,
        seniority: job.seniority,
        job_type: job.job_type,
        department: job.department,
        work_mode: job.work_mode,
        location_country_id: job.location_country?.id || null,
        location_city_id: job.location_city?.id || null,
        application_deadline: job.application_deadline,
        positions_to_fill: job.positions_to_fill,
      })
    }
  }, [isEditingBasicInfo, job])

  useEffect(() => {
    if (isEditingDescription && job) {
      setDescriptionForm({
        summary: job.summary,
        description: job.description,
        responsibilities: job.responsibilities,
      })
    }
  }, [isEditingDescription, job])

  useEffect(() => {
    if (isEditingRequirements && job) {
      setRequirementsForm({
        requirements: job.requirements,
        nice_to_haves: job.nice_to_haves,
      })
      setSelectedRequiredSkills(job.required_skills || [])
      setSelectedNiceSkills(job.nice_to_have_skills || [])
      setSelectedTechnologies(job.technologies || [])
    }
  }, [isEditingRequirements, job])

  useEffect(() => {
    if (isEditingCompensation && job) {
      setCompensationForm({
        salary_min: job.salary_min,
        salary_max: job.salary_max,
        salary_currency: job.salary_currency,
        salary_visible: job.salary_visible,
        equity_offered: job.equity_offered,
      })
    }
  }, [isEditingCompensation, job])

  // Save handlers
  const handleSaveBasicInfo = async () => {
    setIsSavingBasicInfo(true)
    try {
      await api.patch(`/jobs/${jobId}/detail/`, basicInfoForm)
      setIsEditingBasicInfo(false)
      onRefresh?.()
    } catch (err) {
      console.error('Failed to save basic info:', err)
    }
    setIsSavingBasicInfo(false)
  }

  const handleSaveDescription = async () => {
    setIsSavingDescription(true)
    try {
      await api.patch(`/jobs/${jobId}/detail/`, descriptionForm)
      setIsEditingDescription(false)
      onRefresh?.()
    } catch (err) {
      console.error('Failed to save description:', err)
    }
    setIsSavingDescription(false)
  }

  const handleSaveRequirements = async () => {
    setIsSavingRequirements(true)
    try {
      await api.patch(`/jobs/${jobId}/detail/`, {
        ...requirementsForm,
        required_skill_ids: selectedRequiredSkills.map(s => s.id),
        nice_to_have_skill_ids: selectedNiceSkills.map(s => s.id),
        technology_ids: selectedTechnologies.map(t => t.id),
      })
      setIsEditingRequirements(false)
      onRefresh?.()
    } catch (err) {
      console.error('Failed to save requirements:', err)
    }
    setIsSavingRequirements(false)
  }

  const handleSaveCompensation = async () => {
    setIsSavingCompensation(true)
    try {
      await api.patch(`/jobs/${jobId}/detail/`, compensationForm)
      setIsEditingCompensation(false)
      onRefresh?.()
    } catch (err) {
      console.error('Failed to save compensation:', err)
    }
    setIsSavingCompensation(false)
  }

  if (!job) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
        No job information available
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 sticky top-0 z-10">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {job.title}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <Building2 className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">{job.company?.name}</span>
            </div>
          </div>
          <span className={`px-2 py-1 text-xs font-medium rounded-full flex-shrink-0 ${statusColors[job.status]}`}>
            {statusLabels[job.status]}
          </span>
        </div>

        {/* Quick badges */}
        <div className="flex flex-wrap gap-2 mt-3">
          {job.seniority && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full">
              {getSeniorityLabel(job.seniority)}
            </span>
          )}
          {job.job_type && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
              {getJobTypeLabel(job.job_type)}
            </span>
          )}
          {job.work_mode && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full">
              {getWorkModeLabel(job.work_mode)}
            </span>
          )}
          {job.equity_offered && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full">
              <TrendingUp className="w-3 h-3" />
              Equity
            </span>
          )}
        </div>

        {/* Key stats */}
        <div className="flex flex-wrap gap-4 mt-3 text-[12px] text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            {job.applications_count} applications
          </span>
          <span className="flex items-center gap-1">
            <Briefcase className="w-3.5 h-3.5" />
            {job.hired_count}/{job.positions_to_fill} filled
          </span>
          {job.published_at && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Published {formatDate(job.published_at)}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Basic Info Subpanel */}
        <EditableCollapsibleSection
          title="Basic Info"
          icon={<Briefcase className="w-4 h-4 text-gray-400 dark:text-gray-500" />}
          defaultOpen
          isEditing={isEditingBasicInfo}
          isSaving={isSavingBasicInfo}
          onEditToggle={setIsEditingBasicInfo}
          onSave={handleSaveBasicInfo}
          viewContent={
            <div className="grid grid-cols-2 gap-3">
              <InfoRow label="Job Type" value={getJobTypeLabel(job.job_type)} />
              <InfoRow label="Seniority" value={getSeniorityLabel(job.seniority)} />
              <InfoRow label="Department" value={getDepartmentLabel(job.department)} />
              <InfoRow label="Work Mode" value={getWorkModeLabel(job.work_mode)} />
              <InfoRow label="Location" value={job.location_display || 'Not specified'} />
              <InfoRow label="Positions" value={job.positions_to_fill} />
              <InfoRow label="Deadline" value={formatDate(job.application_deadline)} />
            </div>
          }
          editContent={
            <div className="space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-gray-500 dark:text-gray-400 mb-1">Job Title</label>
                <input
                  type="text"
                  value={basicInfoForm.title || ''}
                  onChange={(e) => setBasicInfoForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-gray-500 dark:text-gray-400 mb-1">Seniority</label>
                  <select
                    value={basicInfoForm.seniority || ''}
                    onChange={(e) => setBasicInfoForm(prev => ({ ...prev, seniority: e.target.value as Seniority }))}
                    className="w-full px-3 py-2 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">Select...</option>
                    {seniorityOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-gray-500 dark:text-gray-400 mb-1">Job Type</label>
                  <select
                    value={basicInfoForm.job_type || ''}
                    onChange={(e) => setBasicInfoForm(prev => ({ ...prev, job_type: e.target.value as JobType }))}
                    className="w-full px-3 py-2 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">Select...</option>
                    {jobTypeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-gray-500 dark:text-gray-400 mb-1">Department</label>
                  <select
                    value={basicInfoForm.department || ''}
                    onChange={(e) => setBasicInfoForm(prev => ({ ...prev, department: e.target.value as Department }))}
                    className="w-full px-3 py-2 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">Select...</option>
                    {departmentOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-gray-500 dark:text-gray-400 mb-1">Work Mode</label>
                  <select
                    value={basicInfoForm.work_mode || ''}
                    onChange={(e) => setBasicInfoForm(prev => ({ ...prev, work_mode: e.target.value as WorkMode }))}
                    className="w-full px-3 py-2 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">Select...</option>
                    {workModeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-gray-500 dark:text-gray-400 mb-1">Country</label>
                  <select
                    value={basicInfoForm.location_country_id || ''}
                    onChange={(e) => {
                      const val = e.target.value ? parseInt(e.target.value, 10) : null
                      setBasicInfoForm(prev => ({ ...prev, location_country_id: val, location_city_id: null }))
                    }}
                    className="w-full px-3 py-2 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">Select country</option>
                    {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-gray-500 dark:text-gray-400 mb-1">City</label>
                  <select
                    value={basicInfoForm.location_city_id || ''}
                    onChange={(e) => setBasicInfoForm(prev => ({ ...prev, location_city_id: e.target.value ? parseInt(e.target.value, 10) : null }))}
                    disabled={!basicInfoForm.location_country_id}
                    className="w-full px-3 py-2 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 disabled:bg-gray-100 dark:disabled:bg-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">{basicInfoForm.location_country_id ? 'Select city' : 'Select country first'}</option>
                    {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-gray-500 dark:text-gray-400 mb-1">Positions to Fill</label>
                  <input
                    type="number"
                    min={1}
                    value={basicInfoForm.positions_to_fill || 1}
                    onChange={(e) => setBasicInfoForm(prev => ({ ...prev, positions_to_fill: parseInt(e.target.value, 10) || 1 }))}
                    className="w-full px-3 py-2 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-gray-500 dark:text-gray-400 mb-1">Application Deadline</label>
                  <input
                    type="date"
                    value={basicInfoForm.application_deadline || ''}
                    onChange={(e) => setBasicInfoForm(prev => ({ ...prev, application_deadline: e.target.value || null }))}
                    className="w-full px-3 py-2 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>
            </div>
          }
        />

        {/* Description Subpanel */}
        <EditableCollapsibleSection
          title="Description"
          icon={<FileText className="w-4 h-4 text-gray-400 dark:text-gray-500" />}
          defaultOpen
          isEditing={isEditingDescription}
          isSaving={isSavingDescription}
          onEditToggle={setIsEditingDescription}
          onSave={handleSaveDescription}
          viewContent={
            <div className="space-y-4">
              {job.summary && (
                <div>
                  <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">Summary</p>
                  <p className="text-[13px] text-gray-700 dark:text-gray-300">{job.summary}</p>
                </div>
              )}
              {job.description && (
                <div>
                  <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">Full Description</p>
                  <p className="text-[13px] text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{job.description}</p>
                </div>
              )}
              {job.responsibilities && (
                <div>
                  <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">Responsibilities</p>
                  <p className="text-[13px] text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{job.responsibilities}</p>
                </div>
              )}
              {!job.summary && !job.description && !job.responsibilities && (
                <p className="text-[13px] text-gray-400 italic">No description added</p>
              )}
            </div>
          }
          editContent={
            <div className="space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-gray-500 dark:text-gray-400 mb-1">Summary</label>
                <textarea
                  value={descriptionForm.summary || ''}
                  onChange={(e) => setDescriptionForm(prev => ({ ...prev, summary: e.target.value }))}
                  rows={2}
                  placeholder="Brief overview of the role..."
                  className="w-full px-3 py-2 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 resize-none bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-gray-500 dark:text-gray-400 mb-1">Full Description</label>
                <textarea
                  value={descriptionForm.description || ''}
                  onChange={(e) => setDescriptionForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={6}
                  placeholder="Detailed job description..."
                  className="w-full px-3 py-2 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 resize-none bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-gray-500 dark:text-gray-400 mb-1">Responsibilities</label>
                <textarea
                  value={descriptionForm.responsibilities || ''}
                  onChange={(e) => setDescriptionForm(prev => ({ ...prev, responsibilities: e.target.value }))}
                  rows={4}
                  placeholder="Key responsibilities..."
                  className="w-full px-3 py-2 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 resize-none bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
          }
        />

        {/* Requirements Subpanel */}
        <EditableCollapsibleSection
          title="Requirements"
          icon={<Star className="w-4 h-4 text-gray-400 dark:text-gray-500" />}
          defaultOpen
          isEditing={isEditingRequirements}
          isSaving={isSavingRequirements}
          onEditToggle={setIsEditingRequirements}
          onSave={handleSaveRequirements}
          viewContent={
            <div className="space-y-4">
              {job.requirements && (
                <div>
                  <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">Requirements</p>
                  <p className="text-[13px] text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{job.requirements}</p>
                </div>
              )}
              {job.nice_to_haves && (
                <div>
                  <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">Nice to Have</p>
                  <p className="text-[13px] text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{job.nice_to_haves}</p>
                </div>
              )}
              {job.required_skills && job.required_skills.length > 0 && (
                <div>
                  <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">Required Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {job.required_skills.map((skill) => (
                      <span key={skill.id} className="px-2 py-1 text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md">
                        {skill.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {job.nice_to_have_skills && job.nice_to_have_skills.length > 0 && (
                <div>
                  <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">Nice to Have Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {job.nice_to_have_skills.map((skill) => (
                      <span key={skill.id} className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-md">
                        {skill.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {job.technologies && job.technologies.length > 0 && (
                <div>
                  <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">Technologies</p>
                  <div className="flex flex-wrap gap-1.5">
                    {job.technologies.map((tech) => (
                      <span key={tech.id} className="px-2 py-1 text-xs font-medium bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-md">
                        {tech.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {!job.requirements && !job.nice_to_haves && (!job.required_skills || job.required_skills.length === 0) && (
                <p className="text-[13px] text-gray-400 italic">No requirements specified</p>
              )}
            </div>
          }
          editContent={
            <div className="space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-gray-500 dark:text-gray-400 mb-1">Requirements</label>
                <textarea
                  value={requirementsForm.requirements || ''}
                  onChange={(e) => setRequirementsForm(prev => ({ ...prev, requirements: e.target.value }))}
                  rows={4}
                  placeholder="Required qualifications..."
                  className="w-full px-3 py-2 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 resize-none bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-gray-500 dark:text-gray-400 mb-1">Nice to Have</label>
                <textarea
                  value={requirementsForm.nice_to_haves || ''}
                  onChange={(e) => setRequirementsForm(prev => ({ ...prev, nice_to_haves: e.target.value }))}
                  rows={3}
                  placeholder="Preferred qualifications..."
                  className="w-full px-3 py-2 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 resize-none bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                />
              </div>
              <SkillMultiSelect
                selected={selectedRequiredSkills}
                onChange={setSelectedRequiredSkills}
                label="Required Skills"
                maxItems={15}
              />
              <SkillMultiSelect
                selected={selectedNiceSkills}
                onChange={setSelectedNiceSkills}
                label="Nice to Have Skills"
                maxItems={10}
              />
              <TechnologyMultiSelect
                selected={selectedTechnologies}
                onChange={setSelectedTechnologies}
                label="Technologies"
                maxItems={15}
              />
            </div>
          }
        />

        {/* Compensation Subpanel */}
        <EditableCollapsibleSection
          title="Compensation"
          icon={<DollarSign className="w-4 h-4 text-gray-400 dark:text-gray-500" />}
          defaultOpen={!!job.salary_min || !!job.salary_max || job.equity_offered}
          isEditing={isEditingCompensation}
          isSaving={isSavingCompensation}
          onEditToggle={setIsEditingCompensation}
          onSave={handleSaveCompensation}
          viewContent={
            <div className="space-y-2">
              {job.salary_display && job.salary_visible && (
                <InfoRow label="Salary Range" value={job.salary_display} />
              )}
              {!job.salary_visible && job.salary_min && (
                <p className="text-[13px] text-gray-500 italic">Salary hidden from candidates</p>
              )}
              <InfoRow label="Equity Offered" value={job.equity_offered ? 'Yes' : 'No'} />
              {!job.salary_min && !job.salary_max && !job.equity_offered && (
                <p className="text-[13px] text-gray-400 italic">No compensation info specified</p>
              )}
            </div>
          }
          editContent={
            <div className="space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-gray-500 dark:text-gray-400 mb-1">Salary Range</label>
                <div className="flex gap-2 items-center">
                  <select
                    value={compensationForm.salary_currency || 'USD'}
                    onChange={(e) => setCompensationForm(prev => ({ ...prev, salary_currency: e.target.value }))}
                    className="w-20 px-2 py-2 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  >
                    {currencyOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <input
                    type="number"
                    value={compensationForm.salary_min || ''}
                    onChange={(e) => setCompensationForm(prev => ({ ...prev, salary_min: e.target.value ? parseInt(e.target.value, 10) : null }))}
                    placeholder="Min"
                    className="flex-1 px-3 py-2 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  />
                  <span className="text-gray-500">-</span>
                  <input
                    type="number"
                    value={compensationForm.salary_max || ''}
                    onChange={(e) => setCompensationForm(prev => ({ ...prev, salary_max: e.target.value ? parseInt(e.target.value, 10) : null }))}
                    placeholder="Max"
                    className="flex-1 px-3 py-2 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={compensationForm.salary_visible || false}
                    onChange={(e) => setCompensationForm(prev => ({ ...prev, salary_visible: e.target.checked }))}
                    className="w-4 h-4 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 rounded focus:ring-gray-900 dark:focus:ring-gray-100"
                  />
                  <span className="text-[13px] text-gray-700 dark:text-gray-300">Show salary to candidates</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={compensationForm.equity_offered || false}
                    onChange={(e) => setCompensationForm(prev => ({ ...prev, equity_offered: e.target.checked }))}
                    className="w-4 h-4 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 rounded focus:ring-gray-900 dark:focus:ring-gray-100"
                  />
                  <span className="text-[13px] text-gray-700 dark:text-gray-300">Equity offered</span>
                </label>
              </div>
            </div>
          }
        />

        {/* Assigned Recruiters (Read-only) */}
        {job.assigned_recruiters && job.assigned_recruiters.length > 0 && (
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Assigned Recruiters</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {job.assigned_recruiters.map((recruiter) => (
                <div key={recruiter.id} className="flex items-center gap-2 px-2 py-1 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-300">
                    {recruiter.first_name?.charAt(0)}{recruiter.last_name?.charAt(0)}
                  </div>
                  <span className="text-xs text-gray-700 dark:text-gray-300">
                    {recruiter.first_name} {recruiter.last_name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default JobProfilePanel
