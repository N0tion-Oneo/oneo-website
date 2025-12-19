import { Link } from 'react-router-dom'
import {
  Building2,
  MapPin,
  Briefcase,
  Clock,
  DollarSign,
  Eye,
  Users,
} from 'lucide-react'
import type { JobListItem } from '@/types'
import { JobType, WorkMode, Seniority } from '@/types'

interface JobCardProps {
  job: JobListItem
  showCompany?: boolean
}

const getJobTypeLabel = (type: JobType) => {
  const labels: Record<string, string> = {
    full_time: 'Full-time',
    part_time: 'Part-time',
    contract: 'Contract',
    freelance: 'Freelance',
  }
  return labels[type] || type
}

const getWorkModeLabel = (mode: WorkMode) => {
  const labels: Record<string, string> = {
    remote: 'Remote',
    hybrid: 'Hybrid',
    onsite: 'On-site',
  }
  return labels[mode] || mode
}

const getSeniorityLabel = (seniority: Seniority) => {
  const labels: Record<string, string> = {
    intern: 'Intern',
    junior: 'Junior',
    mid: 'Mid-level',
    senior: 'Senior',
    lead: 'Lead',
    principal: 'Principal',
    executive: 'Executive / C-Suite',
  }
  return labels[seniority] || seniority
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - date.getTime())
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  return `${Math.floor(diffDays / 30)} months ago`
}

export default function JobCard({ job, showCompany = true }: JobCardProps) {
  return (
    <Link
      to={`/jobs/${job.slug}`}
      className="block bg-white border border-gray-200 rounded-lg p-5 hover:border-gray-300 transition-colors"
    >
      <div className="flex items-start gap-4">
        {/* Company Logo */}
        {showCompany && (
          <>
            {job.company?.logo ? (
              <img
                src={job.company.logo}
                alt={job.company.name}
                className="w-12 h-12 rounded-lg object-cover border border-gray-100"
              />
            ) : (
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5 text-gray-400" />
              </div>
            )}
          </>
        )}

        {/* Job Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-medium text-gray-900 truncate">{job.title}</h3>
          {showCompany && job.company && (
            <p className="text-[13px] text-gray-600 truncate mt-0.5">{job.company.name}</p>
          )}
          {job.summary && (
            <p className="text-[13px] text-gray-500 mt-1 line-clamp-2">{job.summary}</p>
          )}
        </div>

        {/* Salary */}
        {job.salary_visible && job.salary_display && (
          <div className="text-right flex-shrink-0">
            <p className="text-[14px] font-medium text-gray-900">{job.salary_display}</p>
            {job.equity_offered && (
              <p className="text-[11px] text-green-600 mt-0.5">+ Equity</p>
            )}
          </div>
        )}
      </div>

      {/* Meta Info */}
      <div className="mt-3 flex flex-wrap gap-3 text-[12px] text-gray-500">
        {job.location_display && (
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            {job.location_display}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Briefcase className="w-3.5 h-3.5" />
          {getJobTypeLabel(job.job_type)}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          {getWorkModeLabel(job.work_mode)}
        </span>
      </div>

      {/* Tags */}
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="px-2 py-0.5 text-[11px] font-medium bg-gray-100 text-gray-700 rounded">
          {getSeniorityLabel(job.seniority)}
        </span>
        {job.required_skills?.slice(0, 3).map((skill) => (
          <span
            key={skill.id}
            className="px-2 py-0.5 text-[11px] font-medium bg-blue-50 text-blue-700 rounded"
          >
            {skill.name}
          </span>
        ))}
        {job.required_skills?.length > 3 && (
          <span className="px-2 py-0.5 text-[11px] font-medium bg-gray-50 text-gray-500 rounded">
            +{job.required_skills.length - 3} more
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
        <span className="flex items-center gap-3">
          {job.views_count !== undefined && (
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {job.views_count} views
            </span>
          )}
          {job.applications_count !== undefined && (
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {job.applications_count} applicants
            </span>
          )}
        </span>
        {job.published_at && <span>Posted {formatDate(job.published_at)}</span>}
      </div>
    </Link>
  )
}
