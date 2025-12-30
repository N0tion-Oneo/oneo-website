import { useState, useEffect } from 'react'
import { useIndustries } from '@/hooks'
import { getOnboardingStages } from '@/services/api'
import type { OnboardingStage } from '@/types'
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

const SOURCE_OPTIONS = [
  { value: 'inbound', label: 'Inbound' },
  { value: 'referral', label: 'Referral' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'cold_outreach', label: 'Cold Outreach' },
  { value: 'event', label: 'Event' },
  { value: 'website', label: 'Website' },
  { value: 'other', label: 'Other' },
]

export interface LeadFilters {
  search: string
  source: string
  stage: string
  industry: string
  company_size: string
  converted: 'true' | 'false' | ''
  created_after: string
  created_before: string
  ordering: string
}

export const defaultFilters: LeadFilters = {
  search: '',
  source: '',
  stage: '',
  industry: '',
  company_size: '',
  converted: 'false', // Default to unconverted leads
  created_after: '',
  created_before: '',
  ordering: '-created_at',
}

interface LeadFilterPanelProps {
  filters: LeadFilters
  onFiltersChange: (filters: LeadFilters) => void
  onClearFilters: () => void
  activeFilterCount: number
}

export default function LeadFilterPanel({
  filters,
  onFiltersChange,
  onClearFilters,
  activeFilterCount,
}: LeadFilterPanelProps) {
  const { industries: allIndustries } = useIndustries()
  const [stages, setStages] = useState<OnboardingStage[]>([])

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    basic: true,
    dates: false,
  })

  // Fetch lead stages
  useEffect(() => {
    getOnboardingStages({ entity_type: 'lead' })
      .then(setStages)
      .catch((err) => console.error('Failed to fetch stages:', err))
  }, [])

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const updateFilter = <K extends keyof LeadFilters>(key: K, value: LeadFilters[K]) => {
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
        {/* Search */}
        <div>
          <label className="block text-[12px] font-medium text-gray-600 dark:text-gray-400 mb-1.5">
            Search
          </label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Name, email, company..."
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
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
            {/* Stage */}
            <div>
              <label className="block text-[12px] font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                Stage
              </label>
              <select
                value={filters.stage}
                onChange={(e) => updateFilter('stage', e.target.value)}
                className="w-full px-2.5 py-1.5 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="">All stages</option>
                {stages.map(stage => (
                  <option key={stage.id} value={stage.id}>{stage.name}</option>
                ))}
              </select>
            </div>

            {/* Source */}
            <div>
              <label className="block text-[12px] font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                Source
              </label>
              <select
                value={filters.source}
                onChange={(e) => updateFilter('source', e.target.value)}
                className="w-full px-2.5 py-1.5 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="">All sources</option>
                {SOURCE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Industry */}
            <div>
              <label className="block text-[12px] font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                Industry
              </label>
              <select
                value={filters.industry}
                onChange={(e) => updateFilter('industry', e.target.value)}
                className="w-full px-2.5 py-1.5 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="">All industries</option>
                {allIndustries.map(industry => (
                  <option key={industry.id} value={industry.id}>{industry.name}</option>
                ))}
              </select>
            </div>

            {/* Company Size */}
            <div>
              <label className="block text-[12px] font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                Company Size
              </label>
              <select
                value={filters.company_size}
                onChange={(e) => updateFilter('company_size', e.target.value)}
                className="w-full px-2.5 py-1.5 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="">Any size</option>
                {COMPANY_SIZE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Converted Status */}
            <div>
              <label className="block text-[12px] font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                Conversion Status
              </label>
              <select
                value={filters.converted}
                onChange={(e) => updateFilter('converted', e.target.value as LeadFilters['converted'])}
                className="w-full px-2.5 py-1.5 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="">All leads</option>
                <option value="false">Not Converted</option>
                <option value="true">Converted</option>
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
              <label className="block text-[12px] font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                Created After
              </label>
              <input
                type="date"
                value={filters.created_after}
                onChange={(e) => updateFilter('created_after', e.target.value)}
                className="w-full px-2.5 py-1.5 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                Created Before
              </label>
              <input
                type="date"
                value={filters.created_before}
                onChange={(e) => updateFilter('created_before', e.target.value)}
                className="w-full px-2.5 py-1.5 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
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
