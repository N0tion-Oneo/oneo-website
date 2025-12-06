import { useState, useEffect } from 'react'
import { useIndustries } from '@/hooks'
import { Currency } from '@/types'
import {
  Search,
  X,
  ChevronDown,
  ChevronUp,
  RotateCcw,
} from 'lucide-react'

const SENIORITY_OPTIONS = [
  { value: 'intern', label: 'Intern' },
  { value: 'junior', label: 'Junior' },
  { value: 'mid', label: 'Mid-level' },
  { value: 'senior', label: 'Senior' },
  { value: 'lead', label: 'Lead' },
  { value: 'principal', label: 'Principal' },
  { value: 'executive', label: 'Executive' },
]

const WORK_PREFERENCE_OPTIONS = [
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'onsite', label: 'On-site' },
  { value: 'flexible', label: 'Flexible' },
]

const VISIBILITY_OPTIONS = [
  { value: 'public_sanitised', label: 'Public' },
  { value: 'private', label: 'Private' },
]

const CURRENCY_OPTIONS = [
  { value: 'ZAR', label: 'ZAR (R)' },
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (\u20AC)' },
  { value: 'GBP', label: 'GBP (\u00A3)' },
]

const NOTICE_PERIOD_OPTIONS = [
  { value: 0, label: 'Immediate' },
  { value: 7, label: '1 week' },
  { value: 14, label: '2 weeks' },
  { value: 30, label: '1 month' },
  { value: 60, label: '2 months' },
  { value: 90, label: '3 months' },
]

export interface CandidateFilters {
  search: string
  seniority: string
  work_preference: string
  visibility: string
  industries: number[]
  min_completeness: number | undefined
  min_experience: number | undefined
  max_experience: number | undefined
  min_salary: number | undefined
  max_salary: number | undefined
  salary_currency: string
  notice_period_min: number | undefined
  notice_period_max: number | undefined
  created_after: string
  created_before: string
  willing_to_relocate: boolean | undefined
  has_resume: boolean | undefined
  ordering: string
}

export const defaultFilters: CandidateFilters = {
  search: '',
  seniority: '',
  work_preference: '',
  visibility: '',
  industries: [],
  min_completeness: undefined,
  min_experience: undefined,
  max_experience: undefined,
  min_salary: undefined,
  max_salary: undefined,
  salary_currency: '',
  notice_period_min: undefined,
  notice_period_max: undefined,
  created_after: '',
  created_before: '',
  willing_to_relocate: undefined,
  has_resume: undefined,
  ordering: '-created_at',
}

interface CandidateFilterPanelProps {
  filters: CandidateFilters
  onFiltersChange: (filters: CandidateFilters) => void
  onClearFilters: () => void
  activeFilterCount: number
}

export default function CandidateFilterPanel({
  filters,
  onFiltersChange,
  onClearFilters,
  activeFilterCount,
}: CandidateFilterPanelProps) {
  const { industries: allIndustries } = useIndustries()

  // Collapsed sections
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    basic: true,
    experience: true,
    compensation: false,
    location: false,
    dates: false,
    other: false,
  })

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const updateFilter = <K extends keyof CandidateFilters>(key: K, value: CandidateFilters[K]) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const toggleIndustry = (industryId: number) => {
    const newIndustries = filters.industries.includes(industryId)
      ? filters.industries.filter(id => id !== industryId)
      : [...filters.industries, industryId]
    updateFilter('industries', newIndustries)
  }

  const getSelectedIndustryNames = () => {
    return allIndustries
      .filter(i => filters.industries.includes(i.id))
      .map(i => i.name)
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
        {/* Search - Always visible */}
        <div>
          <label className="block text-[12px] font-medium text-gray-600 mb-1.5">
            Search
          </label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Name, email, title..."
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-[13px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300"
            />
          </div>
        </div>

        {/* Basic Filters Section */}
        <CollapsibleSection
          title="Basic Filters"
          expanded={expandedSections.basic}
          onToggle={() => toggleSection('basic')}
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

            {/* Work Preference */}
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1.5">
                Work Preference
              </label>
              <select
                value={filters.work_preference}
                onChange={(e) => updateFilter('work_preference', e.target.value)}
                className="w-full px-2.5 py-1.5 text-[13px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300"
              >
                <option value="">All preferences</option>
                {WORK_PREFERENCE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Visibility */}
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1.5">
                Profile Visibility
              </label>
              <select
                value={filters.visibility}
                onChange={(e) => updateFilter('visibility', e.target.value)}
                className="w-full px-2.5 py-1.5 text-[13px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300"
              >
                <option value="">All</option>
                {VISIBILITY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Profile Completeness */}
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1.5">
                Min Profile Completeness
              </label>
              <select
                value={filters.min_completeness ?? ''}
                onChange={(e) => updateFilter('min_completeness', e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-full px-2.5 py-1.5 text-[13px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300"
              >
                <option value="">Any</option>
                <option value="25">25%+</option>
                <option value="50">50%+</option>
                <option value="75">75%+</option>
                <option value="90">90%+</option>
              </select>
            </div>
          </div>
        </CollapsibleSection>

        {/* Experience Section */}
        <CollapsibleSection
          title="Experience"
          expanded={expandedSections.experience}
          onToggle={() => toggleSection('experience')}
        >
          <div className="space-y-4">
            {/* Years of Experience Range */}
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1.5">
                Years of Experience
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="50"
                  placeholder="Min"
                  value={filters.min_experience ?? ''}
                  onChange={(e) => updateFilter('min_experience', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full px-2.5 py-1.5 text-[13px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300"
                />
                <span className="text-gray-400">-</span>
                <input
                  type="number"
                  min="0"
                  max="50"
                  placeholder="Max"
                  value={filters.max_experience ?? ''}
                  onChange={(e) => updateFilter('max_experience', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full px-2.5 py-1.5 text-[13px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300"
                />
              </div>
            </div>

            {/* Industries */}
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1.5">
                Industries
              </label>
              {filters.industries.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {getSelectedIndustryNames().map((name, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] bg-blue-50 text-blue-700 rounded"
                    >
                      {name}
                      <button
                        onClick={() => {
                          const industry = allIndustries.find(i => i.name === name)
                          if (industry) toggleIndustry(industry.id)
                        }}
                        className="hover:text-blue-900"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) toggleIndustry(parseInt(e.target.value))
                }}
                className="w-full px-2.5 py-1.5 text-[13px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300"
              >
                <option value="">Add industry filter...</option>
                {allIndustries
                  .filter(i => !filters.industries.includes(i.id))
                  .map(industry => (
                    <option key={industry.id} value={industry.id}>{industry.name}</option>
                  ))}
              </select>
            </div>
          </div>
        </CollapsibleSection>

        {/* Compensation Section */}
        <CollapsibleSection
          title="Compensation"
          expanded={expandedSections.compensation}
          onToggle={() => toggleSection('compensation')}
        >
          <div className="space-y-4">
            {/* Salary Currency */}
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1.5">
                Salary Currency
              </label>
              <select
                value={filters.salary_currency}
                onChange={(e) => updateFilter('salary_currency', e.target.value)}
                className="w-full px-2.5 py-1.5 text-[13px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300"
              >
                <option value="">Any currency</option>
                {CURRENCY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Salary Range */}
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1.5">
                Salary Range (annual)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  step="10000"
                  placeholder="Min"
                  value={filters.min_salary ?? ''}
                  onChange={(e) => updateFilter('min_salary', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full px-2.5 py-1.5 text-[13px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300"
                />
                <span className="text-gray-400">-</span>
                <input
                  type="number"
                  min="0"
                  step="10000"
                  placeholder="Max"
                  value={filters.max_salary ?? ''}
                  onChange={(e) => updateFilter('max_salary', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full px-2.5 py-1.5 text-[13px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300"
                />
              </div>
            </div>

            {/* Notice Period */}
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1.5">
                Notice Period
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={filters.notice_period_min ?? ''}
                  onChange={(e) => updateFilter('notice_period_min', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full px-2.5 py-1.5 text-[13px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300"
                >
                  <option value="">Min</option>
                  {NOTICE_PERIOD_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <span className="text-gray-400">-</span>
                <select
                  value={filters.notice_period_max ?? ''}
                  onChange={(e) => updateFilter('notice_period_max', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full px-2.5 py-1.5 text-[13px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300"
                >
                  <option value="">Max</option>
                  {NOTICE_PERIOD_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* Date Range Section */}
        <CollapsibleSection
          title="Date Filters"
          expanded={expandedSections.dates}
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

        {/* Other Filters Section */}
        <CollapsibleSection
          title="Other"
          expanded={expandedSections.other}
          onToggle={() => toggleSection('other')}
        >
          <div className="space-y-4">
            {/* Willing to Relocate */}
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1.5">
                Willing to Relocate
              </label>
              <select
                value={filters.willing_to_relocate === undefined ? '' : filters.willing_to_relocate.toString()}
                onChange={(e) => {
                  const value = e.target.value
                  updateFilter('willing_to_relocate', value === '' ? undefined : value === 'true')
                }}
                className="w-full px-2.5 py-1.5 text-[13px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300"
              >
                <option value="">Any</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>

            {/* Has Resume */}
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1.5">
                Has Resume
              </label>
              <select
                value={filters.has_resume === undefined ? '' : filters.has_resume.toString()}
                onChange={(e) => {
                  const value = e.target.value
                  updateFilter('has_resume', value === '' ? undefined : value === 'true')
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
