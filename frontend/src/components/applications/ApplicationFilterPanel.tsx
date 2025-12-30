import { useState, useEffect } from 'react'
import { ApplicationStatus } from '@/types'
import api from '@/services/api'
import {
  Search,
  ChevronDown,
  ChevronUp,
  RotateCcw,
} from 'lucide-react'

const APPLICATION_STATUS_OPTIONS = [
  { value: ApplicationStatus.APPLIED, label: 'Applied' },
  { value: ApplicationStatus.SHORTLISTED, label: 'Shortlisted' },
  { value: ApplicationStatus.IN_PROGRESS, label: 'In Progress' },
  { value: ApplicationStatus.OFFER_MADE, label: 'Offer Made' },
  { value: ApplicationStatus.OFFER_ACCEPTED, label: 'Offer Accepted' },
  { value: ApplicationStatus.OFFER_DECLINED, label: 'Offer Declined' },
  { value: ApplicationStatus.REJECTED, label: 'Rejected' },
]

const JOB_STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'closed', label: 'Closed' },
  { value: 'filled', label: 'Filled' },
]

export interface ApplicationFilters {
  search: string
  status: string
  stage: string
  job: string
  job_status: string
  company: string
  recruiter: string
  applied_after: string
  applied_before: string
  ordering: string
}

export const defaultFilters: ApplicationFilters = {
  search: '',
  status: '',
  stage: '',
  job: '',
  job_status: '',
  company: '',
  recruiter: '',
  applied_after: '',
  applied_before: '',
  ordering: '-applied_at',
}

interface ApplicationFilterPanelProps {
  filters: ApplicationFilters
  onFiltersChange: (filters: ApplicationFilters) => void
  onClearFilters: () => void
  activeFilterCount: number
}

interface JobOption {
  id: string
  title: string
  company_name: string
}

interface CompanyOption {
  id: string
  name: string
}

interface RecruiterOption {
  id: string
  name: string
}

export default function ApplicationFilterPanel({
  filters,
  onFiltersChange,
  onClearFilters,
  activeFilterCount,
}: ApplicationFilterPanelProps) {
  // Collapsed sections
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    status: true,
    job: true,
    dates: false,
  })

  // Options for dropdowns
  const [jobs, setJobs] = useState<JobOption[]>([])
  const [companies, setCompanies] = useState<CompanyOption[]>([])
  const [recruiters, setRecruiters] = useState<RecruiterOption[]>([])
  const [loadingOptions, setLoadingOptions] = useState(true)

  // Fetch job/company/recruiter options
  useEffect(() => {
    const fetchOptions = async () => {
      setLoadingOptions(true)
      try {
        // Fetch jobs - endpoint returns array directly
        const jobsRes = await api.get<any[] | { results: any[] }>('/jobs/all/')
        const jobsData = Array.isArray(jobsRes.data) ? jobsRes.data : (jobsRes.data.results || [])
        setJobs(jobsData.map((j: any) => ({
          id: j.id,
          title: j.title,
          company_name: j.company?.name || '',
        })))

        // Fetch companies - endpoint returns array directly
        const companiesRes = await api.get<any[] | { results: any[] }>('/companies/')
        const companiesData = Array.isArray(companiesRes.data) ? companiesRes.data : (companiesRes.data.results || [])
        setCompanies(companiesData.map((c: any) => ({
          id: c.id,
          name: c.name,
        })))

        // For recruiters, use the recruiters list endpoint
        try {
          const recruitersRes = await api.get<any[] | { results: any[] }>('/auth/recruiters/')
          const recruitersData = Array.isArray(recruitersRes.data) ? recruitersRes.data : (recruitersRes.data.results || [])
          setRecruiters(recruitersData.map((u: any) => ({
            id: u.id,
            name: u.full_name || `${u.first_name} ${u.last_name}`.trim() || u.email,
          })))
        } catch {
          // Recruiter endpoint may not exist, that's okay
          setRecruiters([])
        }
      } catch (err) {
        console.error('Failed to load filter options:', err)
      } finally {
        setLoadingOptions(false)
      }
    }
    fetchOptions()
  }, [])

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const updateFilter = <K extends keyof ApplicationFilters>(key: K, value: ApplicationFilters[K]) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg sticky top-4">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-[14px] font-medium text-gray-900 dark:text-gray-100">Filters</h3>
        {activeFilterCount > 0 && (
          <button
            onClick={onClearFilters}
            className="flex items-center gap-1 text-[12px] text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <RotateCcw className="w-3 h-3" />
            Clear all
          </button>
        )}
      </div>

      <div className="p-4 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
        {/* Search - Always visible */}
        <div>
          <label className="block text-[12px] font-medium text-gray-600 dark:text-gray-400 mb-1.5">
            Search
          </label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Candidate name, email, job..."
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>
        </div>

        {/* Status Section */}
        <CollapsibleSection
          title="Status & Stage"
          expanded={expandedSections.status ?? false}
          onToggle={() => toggleSection('status')}
        >
          <div className="space-y-4">
            {/* Application Status */}
            <div>
              <label className="block text-[12px] font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                Application Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => updateFilter('status', e.target.value)}
                className="w-full px-2.5 py-1.5 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="">All statuses</option>
                {APPLICATION_STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Stage (0 = Applied, 1+ = interview stages) */}
            <div>
              <label className="block text-[12px] font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                Current Stage
              </label>
              <select
                value={filters.stage}
                onChange={(e) => updateFilter('stage', e.target.value)}
                className="w-full px-2.5 py-1.5 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="">All stages</option>
                <option value="0">Applied (No stage)</option>
                <option value="1">Stage 1</option>
                <option value="2">Stage 2</option>
                <option value="3">Stage 3</option>
                <option value="4">Stage 4</option>
                <option value="5">Stage 5</option>
              </select>
            </div>
          </div>
        </CollapsibleSection>

        {/* Job Section */}
        <CollapsibleSection
          title="Job & Company"
          expanded={expandedSections.job ?? false}
          onToggle={() => toggleSection('job')}
        >
          <div className="space-y-4">
            {/* Job Filter */}
            <div>
              <label className="block text-[12px] font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                Job
              </label>
              <select
                value={filters.job}
                onChange={(e) => updateFilter('job', e.target.value)}
                className="w-full px-2.5 py-1.5 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                disabled={loadingOptions}
              >
                <option value="">All jobs</option>
                {jobs.map(job => (
                  <option key={job.id} value={job.id}>
                    {job.title} {job.company_name && `(${job.company_name})`}
                  </option>
                ))}
              </select>
            </div>

            {/* Job Status */}
            <div>
              <label className="block text-[12px] font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                Job Status
              </label>
              <select
                value={filters.job_status}
                onChange={(e) => updateFilter('job_status', e.target.value)}
                className="w-full px-2.5 py-1.5 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="">All job statuses</option>
                {JOB_STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Company Filter */}
            <div>
              <label className="block text-[12px] font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                Company
              </label>
              <select
                value={filters.company}
                onChange={(e) => updateFilter('company', e.target.value)}
                className="w-full px-2.5 py-1.5 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                disabled={loadingOptions}
              >
                <option value="">All companies</option>
                {companies.map(company => (
                  <option key={company.id} value={company.id}>{company.name}</option>
                ))}
              </select>
            </div>

            {/* Recruiter Filter */}
            {recruiters.length > 0 && (
              <div>
                <label className="block text-[12px] font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                  Recruiter
                </label>
                <select
                  value={filters.recruiter}
                  onChange={(e) => updateFilter('recruiter', e.target.value)}
                  className="w-full px-2.5 py-1.5 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  disabled={loadingOptions}
                >
                  <option value="">All recruiters</option>
                  {recruiters.map(recruiter => (
                    <option key={recruiter.id} value={recruiter.id}>{recruiter.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* Date Range Section */}
        <CollapsibleSection
          title="Date Filters"
          expanded={expandedSections.dates ?? false}
          onToggle={() => toggleSection('dates')}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-[12px] font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                Applied After
              </label>
              <input
                type="date"
                value={filters.applied_after}
                onChange={(e) => updateFilter('applied_after', e.target.value)}
                className="w-full px-2.5 py-1.5 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                Applied Before
              </label>
              <input
                type="date"
                value={filters.applied_before}
                onChange={(e) => updateFilter('applied_before', e.target.value)}
                className="w-full px-2.5 py-1.5 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
        </CollapsibleSection>
      </div>
    </div>
  )
}

// Collapsible Section Component
function CollapsibleSection({
  title,
  expanded,
  onToggle,
  children,
}: {
  title: string
  expanded: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full text-left"
      >
        <span className="text-[12px] font-medium text-gray-700 dark:text-gray-300">{title}</span>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400 dark:text-gray-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-500" />
        )}
      </button>
      {expanded && <div className="mt-3">{children}</div>}
    </div>
  )
}
