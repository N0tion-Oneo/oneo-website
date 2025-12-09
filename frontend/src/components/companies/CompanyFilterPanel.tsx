import { useState } from 'react'
import { useIndustries } from '@/hooks'
import {
  Search,
  ChevronDown,
  ChevronUp,
  RotateCcw,
} from 'lucide-react'

const COMPANY_SIZE_OPTIONS = [
  { value: '1_10', label: '1-10 employees' },
  { value: '11_50', label: '11-50 employees' },
  { value: '51_200', label: '51-200 employees' },
  { value: '201_500', label: '201-500 employees' },
  { value: '501_1000', label: '501-1000 employees' },
  { value: '1001_5000', label: '1001-5000 employees' },
  { value: '5001_plus', label: '5001+ employees' },
]

const STATUS_OPTIONS = [
  { value: 'true', label: 'Published' },
  { value: 'false', label: 'Draft' },
]

export interface CompanyFilters {
  search: string
  is_published: boolean | undefined
  industry: string
  company_size: string
  has_jobs: boolean | undefined
  created_after: string
  created_before: string
  ordering: string
}

export const defaultFilters: CompanyFilters = {
  search: '',
  is_published: undefined,
  industry: '',
  company_size: '',
  has_jobs: undefined,
  created_after: '',
  created_before: '',
  ordering: '-created_at',
}

interface CompanyFilterPanelProps {
  filters: CompanyFilters
  onFiltersChange: (filters: CompanyFilters) => void
  onClearFilters: () => void
  activeFilterCount: number
}

export default function CompanyFilterPanel({
  filters,
  onFiltersChange,
  onClearFilters,
  activeFilterCount,
}: CompanyFilterPanelProps) {
  const { industries: allIndustries } = useIndustries()

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    basic: true,
    dates: false,
  })

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const updateFilter = <K extends keyof CompanyFilters>(key: K, value: CompanyFilters[K]) => {
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
              placeholder="Company name, tagline..."
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
                value={filters.is_published === undefined ? '' : String(filters.is_published)}
                onChange={(e) => {
                  const val = e.target.value
                  updateFilter('is_published', val === '' ? undefined : val === 'true')
                }}
                className="w-full px-2.5 py-1.5 text-[13px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300"
              >
                <option value="">All statuses</option>
                {STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Industry */}
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1.5">
                Industry
              </label>
              <select
                value={filters.industry}
                onChange={(e) => updateFilter('industry', e.target.value)}
                className="w-full px-2.5 py-1.5 text-[13px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300"
              >
                <option value="">All industries</option>
                {allIndustries.map(industry => (
                  <option key={industry.id} value={industry.id}>{industry.name}</option>
                ))}
              </select>
            </div>

            {/* Company Size */}
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1.5">
                Company Size
              </label>
              <select
                value={filters.company_size}
                onChange={(e) => updateFilter('company_size', e.target.value)}
                className="w-full px-2.5 py-1.5 text-[13px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300"
              >
                <option value="">Any size</option>
                {COMPANY_SIZE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Has Jobs */}
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1.5">
                Has Active Jobs
              </label>
              <select
                value={filters.has_jobs === undefined ? '' : String(filters.has_jobs)}
                onChange={(e) => {
                  const val = e.target.value
                  updateFilter('has_jobs', val === '' ? undefined : val === 'true')
                }}
                className="w-full px-2.5 py-1.5 text-[13px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300"
              >
                <option value="">Any</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
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
