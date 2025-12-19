import { useState } from 'react'
import { useAllCompanies } from '@/hooks/useCompanies'
import {
  Search,
  ChevronDown,
  ChevronUp,
  RotateCcw,
} from 'lucide-react'

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'closed', label: 'Closed' },
  { value: 'filled', label: 'Filled' },
]

const SENIORITY_OPTIONS = [
  { value: 'intern', label: 'Intern' },
  { value: 'junior', label: 'Junior' },
  { value: 'mid', label: 'Mid-level' },
  { value: 'senior', label: 'Senior' },
  { value: 'lead', label: 'Lead' },
  { value: 'principal', label: 'Principal' },
  { value: 'executive', label: 'Executive / C-Suite' },
]

const JOB_TYPE_OPTIONS = [
  { value: 'full_time', label: 'Full-time' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'internship', label: 'Internship' },
]

const WORK_MODE_OPTIONS = [
  { value: 'onsite', label: 'On-site' },
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
]

const DEPARTMENT_OPTIONS = [
  { value: 'engineering', label: 'Engineering' },
  { value: 'design', label: 'Design' },
  { value: 'product', label: 'Product' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'sales', label: 'Sales' },
  { value: 'operations', label: 'Operations' },
  { value: 'hr', label: 'HR' },
  { value: 'finance', label: 'Finance' },
  { value: 'legal', label: 'Legal' },
  { value: 'customer_success', label: 'Customer Success' },
  { value: 'other', label: 'Other' },
]

export interface JobFilters {
  search: string
  status: string
  company: string
  seniority: string
  job_type: string
  work_mode: string
  department: string
  recruiter: string
  created_after: string
  created_before: string
  ordering: string
}

export const defaultFilters: JobFilters = {
  search: '',
  status: '',
  company: '',
  seniority: '',
  job_type: '',
  work_mode: '',
  department: '',
  recruiter: '',
  created_after: '',
  created_before: '',
  ordering: '-created_at',
}

interface JobFilterPanelProps {
  filters: JobFilters
  onFiltersChange: (filters: JobFilters) => void
  onClearFilters: () => void
  activeFilterCount: number
}

export default function JobFilterPanel({
  filters,
  onFiltersChange,
  onClearFilters,
  activeFilterCount,
}: JobFilterPanelProps) {
  const { companies } = useAllCompanies({})

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    basic: true,
    type: true,
    dates: false,
  })

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const updateFilter = <K extends keyof JobFilters>(key: K, value: JobFilters[K]) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg sticky top-4">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-[14px] font-medium text-gray-900">Filters</h3>
        {activeFilterCount > 0 && (
          <button
            onClick={onClearFilters}
            className="flex items-center gap-1 text-[12px] text-gray-500 hover:text-gray-700"
          >
            <RotateCcw className="w-3 h-3" />
            Clear all
          </button>
        )}
      </div>

      <div className="p-4 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
        {/* Search */}
        <div>
          <label className="block text-[12px] font-medium text-gray-600 mb-1.5">
            Search
          </label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Job title, company..."
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-[13px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300"
            />
          </div>
        </div>

        {/* Basic Filters Section */}
        <CollapsibleSection
          title="Basic Filters"
          expanded={expandedSections.basic ?? true}
          onToggle={() => toggleSection('basic')}
        >
          <div className="space-y-4">
            {/* Status */}
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1.5">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => updateFilter('status', e.target.value)}
                className="w-full px-2.5 py-1.5 text-[13px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300"
              >
                <option value="">All statuses</option>
                {STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Company */}
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1.5">
                Company
              </label>
              <select
                value={filters.company}
                onChange={(e) => updateFilter('company', e.target.value)}
                className="w-full px-2.5 py-1.5 text-[13px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300"
              >
                <option value="">All companies</option>
                {companies.map(company => (
                  <option key={company.id} value={company.id}>{company.name}</option>
                ))}
              </select>
            </div>

            {/* Department */}
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1.5">
                Department
              </label>
              <select
                value={filters.department}
                onChange={(e) => updateFilter('department', e.target.value)}
                className="w-full px-2.5 py-1.5 text-[13px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300"
              >
                <option value="">All departments</option>
                {DEPARTMENT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </CollapsibleSection>

        {/* Type & Seniority Section */}
        <CollapsibleSection
          title="Type & Seniority"
          expanded={expandedSections.type ?? true}
          onToggle={() => toggleSection('type')}
        >
          <div className="space-y-4">
            {/* Seniority */}
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1.5">
                Seniority
              </label>
              <select
                value={filters.seniority}
                onChange={(e) => updateFilter('seniority', e.target.value)}
                className="w-full px-2.5 py-1.5 text-[13px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300"
              >
                <option value="">All levels</option>
                {SENIORITY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Job Type */}
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1.5">
                Job Type
              </label>
              <select
                value={filters.job_type}
                onChange={(e) => updateFilter('job_type', e.target.value)}
                className="w-full px-2.5 py-1.5 text-[13px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300"
              >
                <option value="">All types</option>
                {JOB_TYPE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Work Mode */}
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1.5">
                Work Mode
              </label>
              <select
                value={filters.work_mode}
                onChange={(e) => updateFilter('work_mode', e.target.value)}
                className="w-full px-2.5 py-1.5 text-[13px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300"
              >
                <option value="">All modes</option>
                {WORK_MODE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
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
              <label className="block text-[12px] font-medium text-gray-600 mb-1.5">
                Created After
              </label>
              <input
                type="date"
                value={filters.created_after}
                onChange={(e) => updateFilter('created_after', e.target.value)}
                className="w-full px-2.5 py-1.5 text-[13px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1.5">
                Created Before
              </label>
              <input
                type="date"
                value={filters.created_before}
                onChange={(e) => updateFilter('created_before', e.target.value)}
                className="w-full px-2.5 py-1.5 text-[13px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300"
              />
            </div>
          </div>
        </CollapsibleSection>
      </div>
    </div>
  )
}

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
    <div className="border-t border-gray-200 pt-4">
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full text-left"
      >
        <span className="text-[12px] font-medium text-gray-700">{title}</span>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>
      {expanded && <div className="mt-3">{children}</div>}
    </div>
  )
}
