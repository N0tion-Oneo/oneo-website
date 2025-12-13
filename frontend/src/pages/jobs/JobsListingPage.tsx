import { useState } from 'react'
import { useJobs } from '@/hooks/useJobs'
import { useCountries } from '@/hooks/useCompanies'
import { JobCard } from '@/components/jobs'
import { Seniority, JobType, WorkMode, Department } from '@/types'
import type { JobFilters } from '@/types'
import { Briefcase, Search, X } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import { SEO } from '@/components/seo'

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
  { value: Department.HR, label: 'HR' },
  { value: Department.FINANCE, label: 'Finance' },
]

const sortOptions = [
  { value: '-published_at', label: 'Newest first' },
  { value: 'published_at', label: 'Oldest first' },
  { value: '-salary_max', label: 'Highest salary' },
  { value: 'salary_max', label: 'Lowest salary' },
  { value: 'title', label: 'Title A-Z' },
  { value: '-title', label: 'Title Z-A' },
]

export default function JobsListingPage() {
  const [filters, setFilters] = useState<JobFilters>({
    search: '',
    seniority: undefined,
    job_type: undefined,
    work_mode: undefined,
    department: undefined,
    country: undefined,
    sort: '-published_at',
  })

  const { countries } = useCountries()
  const { jobs, isLoading, error } = useJobs(filters)

  const handleFilterChange = (key: keyof JobFilters, value: string | undefined) => {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }))
  }

  const clearFilters = () => {
    setFilters({
      search: '',
      seniority: undefined,
      job_type: undefined,
      work_mode: undefined,
      department: undefined,
      country: undefined,
      sort: '-published_at',
    })
  }

  const hasActiveFilters =
    filters.seniority ||
    filters.job_type ||
    filters.work_mode ||
    filters.department ||
    filters.country ||
    filters.search

  return (
    <div className="min-h-screen bg-gray-50">
      <SEO />
      <Navbar />

      <main className="max-w-5xl mx-auto px-6 py-10">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-[26px] font-semibold text-gray-900">Job Board</h1>
          <p className="text-[15px] text-gray-500 mt-1">
            Find your next opportunity from top companies
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
          {/* Search Bar */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search jobs, companies, or keywords..."
                value={filters.search || ''}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>
          </div>

          {/* Filter Dropdowns */}
          <div className="grid md:grid-cols-6 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-1">
                Experience
              </label>
              <select
                value={filters.seniority || ''}
                onChange={(e) =>
                  handleFilterChange('seniority', e.target.value as Seniority)
                }
                className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              >
                <option value="">All levels</option>
                {seniorityOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-1">
                Job Type
              </label>
              <select
                value={filters.job_type || ''}
                onChange={(e) => handleFilterChange('job_type', e.target.value as JobType)}
                className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              >
                <option value="">All types</option>
                {jobTypeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-1">
                Work Mode
              </label>
              <select
                value={filters.work_mode || ''}
                onChange={(e) =>
                  handleFilterChange('work_mode', e.target.value as WorkMode)
                }
                className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              >
                <option value="">All modes</option>
                {workModeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-1">
                Department
              </label>
              <select
                value={filters.department || ''}
                onChange={(e) =>
                  handleFilterChange('department', e.target.value as Department)
                }
                className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              >
                <option value="">All departments</option>
                {departmentOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-1">
                Location
              </label>
              <select
                value={filters.country || ''}
                onChange={(e) => handleFilterChange('country', e.target.value)}
                className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              >
                <option value="">All locations</option>
                {countries.map((country) => (
                  <option key={country.id} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-1">
                Sort by
              </label>
              <select
                value={filters.sort || '-published_at'}
                onChange={(e) => handleFilterChange('sort', e.target.value)}
                className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              >
                {sortOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-[12px] text-gray-500">
                {jobs.length} job{jobs.length !== 1 ? 's' : ''} matching your filters
              </span>
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-[12px] font-medium text-gray-500 hover:text-gray-700"
              >
                <X className="w-3 h-3" />
                Clear filters
              </button>
            </div>
          )}
        </div>

        {/* Results Count */}
        {!hasActiveFilters && (
          <div className="text-[13px] text-gray-500 mb-4">
            {jobs.length} job{jobs.length !== 1 ? 's' : ''} available
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <p className="text-[14px] text-gray-500">Loading jobs...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <p className="text-[14px] text-red-500">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && jobs.length === 0 && (
          <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
            <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-[15px] text-gray-700 mb-1">No jobs found</p>
            <p className="text-[13px] text-gray-500">
              {hasActiveFilters
                ? 'Try adjusting your filters'
                : 'Check back later for new opportunities'}
            </p>
          </div>
        )}

        {/* Jobs List */}
        {!isLoading && !error && jobs.length > 0 && (
          <div className="space-y-4">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
