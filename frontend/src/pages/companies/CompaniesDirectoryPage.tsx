import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCompanies } from '@/hooks'
import { CompanySize, FundingStage } from '@/types'
import type { Company } from '@/types'
import { Building2, MapPin, Users, Globe, ExternalLink } from 'lucide-react'

export default function CompaniesDirectoryPage() {
  const [filters, setFilters] = useState({
    company_size: '',
    funding_stage: '',
    search: '',
  })

  const { companies, isLoading, error } = useCompanies({
    company_size: filters.company_size || undefined,
    funding_stage: filters.funding_stage || undefined,
    search: filters.search || undefined,
  })

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const getCompanySizeLabel = (size: string) => {
    const labels: Record<string, string> = {
      '1-10': '1-10 employees',
      '11-50': '11-50 employees',
      '51-200': '51-200 employees',
      '201-500': '201-500 employees',
      '501-1000': '501-1000 employees',
      '1000+': '1000+ employees',
    }
    return labels[size] || size
  }

  const getFundingStageLabel = (stage: string) => {
    const labels: Record<string, string> = {
      bootstrapped: 'Bootstrapped',
      seed: 'Seed',
      series_a: 'Series A',
      series_b: 'Series B',
      series_c: 'Series C',
      series_d_plus: 'Series D+',
      public: 'Public',
    }
    return labels[stage] || stage
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link to="/" className="text-lg font-semibold text-gray-900">
            Oneo
          </Link>
          <nav className="flex items-center gap-6">
            <Link to="/jobs" className="text-[13px] font-medium text-gray-500 hover:text-gray-900">
              Jobs
            </Link>
            <Link to="/candidates" className="text-[13px] font-medium text-gray-500 hover:text-gray-900">
              Candidates
            </Link>
            <Link to="/companies" className="text-[13px] font-medium text-gray-900">
              Companies
            </Link>
            <Link to="/login" className="text-[13px] font-medium text-gray-500 hover:text-gray-900">
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-[26px] font-semibold text-gray-900">Company Directory</h1>
          <p className="text-[15px] text-gray-500 mt-1">
            Discover companies hiring on our platform
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[12px] font-medium text-gray-500 mb-1.5">Search</label>
              <input
                type="text"
                placeholder="Search companies..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-gray-500 mb-1.5">
                Company Size
              </label>
              <select
                value={filters.company_size}
                onChange={(e) => handleFilterChange('company_size', e.target.value)}
                className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              >
                <option value="">All sizes</option>
                <option value={CompanySize.SIZE_1_10}>1-10 employees</option>
                <option value={CompanySize.SIZE_11_50}>11-50 employees</option>
                <option value={CompanySize.SIZE_51_200}>51-200 employees</option>
                <option value={CompanySize.SIZE_201_500}>201-500 employees</option>
                <option value={CompanySize.SIZE_501_1000}>501-1000 employees</option>
                <option value={CompanySize.SIZE_1000_PLUS}>1000+ employees</option>
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-medium text-gray-500 mb-1.5">
                Funding Stage
              </label>
              <select
                value={filters.funding_stage}
                onChange={(e) => handleFilterChange('funding_stage', e.target.value)}
                className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              >
                <option value="">All stages</option>
                <option value={FundingStage.BOOTSTRAPPED}>Bootstrapped</option>
                <option value={FundingStage.SEED}>Seed</option>
                <option value={FundingStage.SERIES_A}>Series A</option>
                <option value={FundingStage.SERIES_B}>Series B</option>
                <option value={FundingStage.SERIES_C}>Series C</option>
                <option value={FundingStage.SERIES_D_PLUS}>Series D+</option>
                <option value={FundingStage.PUBLIC}>Public</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setFilters({ company_size: '', funding_stage: '', search: '' })}
                className="w-full px-4 py-2 text-[13px] font-medium text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="text-[13px] text-gray-500 mb-4">
          {companies.length} compan{companies.length !== 1 ? 'ies' : 'y'} found
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <p className="text-[14px] text-gray-500">Loading companies...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <p className="text-[14px] text-red-500">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && companies.length === 0 && (
          <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-[15px] text-gray-700 mb-1">No companies found</p>
            <p className="text-[13px] text-gray-500">Try adjusting your filters</p>
          </div>
        )}

        {/* Companies Grid */}
        {!isLoading && !error && companies.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {companies.map((company: Company) => (
              <Link
                key={company.id}
                to={`/companies/${company.slug}`}
                className="bg-white border border-gray-200 rounded-lg p-5 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start gap-4">
                  {company.logo ? (
                    <img
                      src={company.logo}
                      alt={company.name}
                      className="w-14 h-14 rounded-lg object-cover border border-gray-100"
                    />
                  ) : (
                    <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[15px] font-medium text-gray-900 truncate">
                      {company.name}
                    </h3>
                    {company.tagline && (
                      <p className="text-[13px] text-gray-500 truncate mt-0.5">{company.tagline}</p>
                    )}
                    {company.industry && (
                      <p className="text-[12px] text-gray-400 mt-1">{company.industry.name}</p>
                    )}
                  </div>
                </div>

                {/* Location & Size */}
                <div className="mt-4 flex flex-wrap gap-3 text-[12px] text-gray-500">
                  {company.headquarters_location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {company.headquarters_location}
                    </span>
                  )}
                  {company.company_size && (
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {getCompanySizeLabel(company.company_size)}
                    </span>
                  )}
                </div>

                {/* Tags */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {company.funding_stage && (
                    <span className="px-2 py-0.5 text-[11px] font-medium bg-green-50 text-green-700 rounded">
                      {getFundingStageLabel(company.funding_stage)}
                    </span>
                  )}
                  {company.tech_stack && company.tech_stack.length > 0 && (
                    <span className="px-2 py-0.5 text-[11px] font-medium bg-blue-50 text-blue-700 rounded">
                      {company.tech_stack.length} technologies
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
