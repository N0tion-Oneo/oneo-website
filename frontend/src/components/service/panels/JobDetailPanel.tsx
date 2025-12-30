import { useState } from 'react'
import {
  Building2,
  MapPin,
  Clock,
  DollarSign,
  Users,
  Calendar,
  CheckCircle,
  Tag,
  Layers,
  FileText,
  Globe,
  ChevronDown,
  ChevronUp,
  Cpu,
  Gift,
  Star,
  TrendingUp,
} from 'lucide-react'
import { JobStatus, Seniority, JobType, WorkMode } from '@/types'
import type { Job } from '@/types'

interface JobDetailPanelProps {
  job: Job | null | undefined
  isLoading?: boolean
}

const statusColors: Record<JobStatus, string> = {
  [JobStatus.DRAFT]: 'bg-gray-100 text-gray-700',
  [JobStatus.PUBLISHED]: 'bg-green-100 text-green-700',
  [JobStatus.CLOSED]: 'bg-red-100 text-red-700',
  [JobStatus.FILLED]: 'bg-blue-100 text-blue-700',
  [JobStatus.ARCHIVED]: 'bg-gray-100 text-gray-500',
}

const statusLabels: Record<JobStatus, string> = {
  [JobStatus.DRAFT]: 'Draft',
  [JobStatus.PUBLISHED]: 'Published',
  [JobStatus.CLOSED]: 'Closed',
  [JobStatus.FILLED]: 'Filled',
  [JobStatus.ARCHIVED]: 'Archived',
}

const seniorityLabels: Record<Seniority, string> = {
  [Seniority.INTERN]: 'Intern',
  [Seniority.JUNIOR]: 'Junior',
  [Seniority.MID]: 'Mid-Level',
  [Seniority.SENIOR]: 'Senior',
  [Seniority.LEAD]: 'Lead',
  [Seniority.PRINCIPAL]: 'Principal',
  [Seniority.EXECUTIVE]: 'Executive',
}

const jobTypeLabels: Record<JobType, string> = {
  [JobType.FULL_TIME]: 'Full-time',
  [JobType.PART_TIME]: 'Part-time',
  [JobType.CONTRACT]: 'Contract',
  [JobType.FREELANCE]: 'Freelance',
}

const workModeLabels: Record<WorkMode, string> = {
  [WorkMode.ONSITE]: 'On-site',
  [WorkMode.REMOTE]: 'Remote',
  [WorkMode.HYBRID]: 'Hybrid',
}

function formatDate(dateString: string | null): string {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// Collapsible section component
function CollapsibleSection({
  title,
  icon,
  children,
  defaultOpen = false,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium text-gray-700">{title}</span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>
      {isOpen && <div className="p-3 border-t border-gray-200">{children}</div>}
    </div>
  )
}

export function JobDetailPanel({ job, isLoading }: JobDetailPanelProps) {
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900" />
      </div>
    )
  }

  if (!job) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        No job information available
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 bg-white sticky top-0 z-10">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900">
              {job.title}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <Building2 className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">{job.company?.name}</span>
            </div>
          </div>
          <span className={`px-2 py-1 text-xs font-medium rounded-full flex-shrink-0 ${statusColors[job.status]}`}>
            {statusLabels[job.status]}
          </span>
        </div>

        {/* Quick badges */}
        <div className="flex flex-wrap gap-2 mt-3">
          {job.seniority && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">
              {seniorityLabels[job.seniority]}
            </span>
          )}
          {job.job_type && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
              {jobTypeLabels[job.job_type]}
            </span>
          )}
          {job.work_mode && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
              {workModeLabels[job.work_mode]}
            </span>
          )}
          {job.equity_offered && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
              <TrendingUp className="w-3 h-3" />
              Equity
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Key Info Grid */}
        <div className="grid grid-cols-2 gap-3">
          {job.location_display && (
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Location</p>
                <p className="text-sm text-gray-900">{job.location_display}</p>
              </div>
            </div>
          )}
          {job.salary_display && job.salary_visible && (
            <div className="flex items-start gap-2">
              <DollarSign className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Salary</p>
                <p className="text-sm text-gray-900">{job.salary_display}</p>
              </div>
            </div>
          )}
          <div className="flex items-start gap-2">
            <Users className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Positions</p>
              <p className="text-sm text-gray-900">
                {job.hired_count} / {job.positions_to_fill} filled
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <FileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Applications</p>
              <p className="text-sm text-gray-900">{job.applications_count}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Clock className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Published</p>
              <p className="text-sm text-gray-900">{formatDate(job.published_at)}</p>
            </div>
          </div>
          {job.application_deadline && (
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Deadline</p>
                <p className="text-sm text-gray-900">{formatDate(job.application_deadline)}</p>
              </div>
            </div>
          )}
          {job.department && (
            <div className="flex items-start gap-2">
              <Layers className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Department</p>
                <p className="text-sm text-gray-900 capitalize">{job.department.replace('_', ' ')}</p>
              </div>
            </div>
          )}
        </div>

        {/* Remote Regions */}
        {job.work_mode === WorkMode.REMOTE && job.remote_regions && job.remote_regions.length > 0 && (
          <div className="flex items-start gap-2">
            <Globe className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Remote Regions</p>
              <p className="text-sm text-gray-900">{job.remote_regions.join(', ')}</p>
            </div>
          </div>
        )}

        {/* Summary */}
        {job.summary && (
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Summary</p>
            <p className="text-sm text-gray-700">{job.summary}</p>
          </div>
        )}

        {/* Description */}
        {job.description && (
          <CollapsibleSection
            title="Description"
            icon={<FileText className="w-4 h-4 text-gray-400" />}
            defaultOpen={true}
          >
            <div className="text-sm text-gray-700 whitespace-pre-wrap">{job.description}</div>
          </CollapsibleSection>
        )}

        {/* Responsibilities */}
        {job.responsibilities && (
          <CollapsibleSection
            title="Responsibilities"
            icon={<CheckCircle className="w-4 h-4 text-gray-400" />}
          >
            <div className="text-sm text-gray-700 whitespace-pre-wrap">{job.responsibilities}</div>
          </CollapsibleSection>
        )}

        {/* Requirements */}
        {job.requirements && (
          <CollapsibleSection
            title="Requirements"
            icon={<Star className="w-4 h-4 text-gray-400" />}
          >
            <div className="text-sm text-gray-700 whitespace-pre-wrap">{job.requirements}</div>
          </CollapsibleSection>
        )}

        {/* Nice to Haves */}
        {job.nice_to_haves && (
          <CollapsibleSection
            title="Nice to Have"
            icon={<Gift className="w-4 h-4 text-gray-400" />}
          >
            <div className="text-sm text-gray-700 whitespace-pre-wrap">{job.nice_to_haves}</div>
          </CollapsibleSection>
        )}

        {/* Required Skills */}
        {job.required_skills && job.required_skills.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Tag className="w-4 h-4 text-gray-400" />
              <p className="text-xs font-medium text-gray-600">Required Skills</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {job.required_skills.map((skill) => (
                <span
                  key={skill.id}
                  className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-md"
                >
                  {skill.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Nice to Have Skills */}
        {job.nice_to_have_skills && job.nice_to_have_skills.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Tag className="w-4 h-4 text-gray-400" />
              <p className="text-xs font-medium text-gray-600">Nice to Have Skills</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {job.nice_to_have_skills.map((skill) => (
                <span
                  key={skill.id}
                  className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-md"
                >
                  {skill.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Technologies */}
        {job.technologies && job.technologies.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Cpu className="w-4 h-4 text-gray-400" />
              <p className="text-xs font-medium text-gray-600">Technologies</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {job.technologies.map((tech) => (
                <span
                  key={tech.id}
                  className="inline-flex items-center px-2 py-1 text-xs font-medium bg-purple-50 text-purple-700 rounded-md"
                >
                  {tech.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Benefits */}
        {job.benefits && job.benefits.length > 0 && (
          <CollapsibleSection
            title={`Benefits (${job.benefits.length})`}
            icon={<Gift className="w-4 h-4 text-gray-400" />}
          >
            <div className="space-y-3">
              {job.benefits.map((category, idx) => (
                <div key={idx}>
                  <p className="text-xs font-medium text-gray-700 mb-1">{category.category}</p>
                  <div className="flex flex-wrap gap-1">
                    {category.items.map((benefit, bidx) => (
                      <span
                        key={bidx}
                        className="inline-flex items-center px-2 py-0.5 text-xs bg-green-50 text-green-700 rounded"
                      >
                        {benefit}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Interview Stages */}
        {job.interview_stages && job.interview_stages.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-gray-400" />
              <p className="text-xs font-medium text-gray-600">
                Interview Stages ({job.interview_stages.length})
              </p>
            </div>
            <div className="space-y-2">
              {job.interview_stages.map((stage, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg"
                >
                  <span className="w-5 h-5 flex items-center justify-center text-xs font-medium bg-gray-200 text-gray-600 rounded-full flex-shrink-0">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{stage.name}</p>
                    {stage.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{stage.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Assigned Recruiters */}
        {job.assigned_recruiters && job.assigned_recruiters.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-gray-400" />
              <p className="text-xs font-medium text-gray-600">Assigned Recruiters</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {job.assigned_recruiters.map((recruiter) => (
                <div
                  key={recruiter.id}
                  className="flex items-center gap-2 px-2 py-1 bg-gray-50 rounded-lg"
                >
                  <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                    {recruiter.first_name?.charAt(0)}{recruiter.last_name?.charAt(0)}
                  </div>
                  <span className="text-xs text-gray-700">
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

export default JobDetailPanel
