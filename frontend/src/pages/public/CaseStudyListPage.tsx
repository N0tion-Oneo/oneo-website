// Public Case Studies List Page
import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { cmsCaseStudies } from '@/services/cms'
import { Navbar } from '@/components/layout'
import { SEO } from '@/components/seo'
import { useSEODefaults } from '@/contexts/SEOContext'
import {
  Loader2,
  ArrowRight,
  Building2,
  TrendingUp,
  Search,
  Calendar,
} from 'lucide-react'
import type { CMSCaseStudyListItem } from '@/types'

export default function CaseStudyListPage() {
  const [search, setSearch] = useState('')
  const [selectedIndustry, setSelectedIndustry] = useState<string>('')
  const seoDefaults = useSEODefaults()

  const { data: studies = [], isLoading } = useQuery({
    queryKey: ['public-case-studies', selectedIndustry],
    queryFn: () => cmsCaseStudies.listPublic({ industry: selectedIndustry || undefined }),
  })

  const { data: industries = [] } = useQuery({
    queryKey: ['case-study-industries'],
    queryFn: cmsCaseStudies.getIndustries,
  })

  // Filter by search
  const filteredStudies = useMemo(() => {
    if (!search) return studies
    const searchLower = search.toLowerCase()
    return studies.filter(
      (study) =>
        study.title.toLowerCase().includes(searchLower) ||
        study.excerpt?.toLowerCase().includes(searchLower) ||
        study.client_name?.toLowerCase().includes(searchLower)
    )
  }, [studies, search])

  // Get featured study
  const featuredStudy = useMemo(() => {
    return studies.find((study) => study.is_featured) || studies[0]
  }, [studies])

  // Get remaining studies (excluding featured)
  const remainingStudies = useMemo(() => {
    if (!featuredStudy) return filteredStudies
    return filteredStudies.filter((study) => study.id !== featuredStudy.id)
  }, [filteredStudies, featuredStudy])

  // Clear all filters
  const clearFilters = () => {
    setSearch('')
    setSelectedIndustry('')
  }

  const hasFilters = search || selectedIndustry

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <SEO />
      <Navbar />

      {/* Hero Section */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-5xl mx-auto px-6 py-16 md:py-20">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[12px] font-medium rounded-full mb-4">
              <TrendingUp className="w-3.5 h-3.5" />
              Case Studies
            </span>
            <h1 className="text-[40px] md:text-[48px] font-bold text-gray-900 dark:text-gray-100 leading-tight mb-4">
              Success Stories
            </h1>
            <p className="text-[17px] text-gray-600 dark:text-gray-400 leading-relaxed">
              Discover how businesses across industries have transformed their hiring process and achieved remarkable results{seoDefaults.companyName ? ` with ${seoDefaults.companyName}` : ''}.
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1">
        <div className="max-w-5xl mx-auto px-6 py-12">
          {/* Search & Filters Bar */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-8 shadow-sm dark:shadow-gray-900/40">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  placeholder="Search case studies..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-[14px] bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900 focus:border-emerald-300 dark:focus:border-emerald-600 transition-all text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>

              {/* Industry Filter */}
              <div className="flex gap-2 flex-wrap">
                <select
                  value={selectedIndustry}
                  onChange={(e) => setSelectedIndustry(e.target.value)}
                  className="px-4 py-2.5 text-[14px] bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900 focus:border-emerald-300 dark:focus:border-emerald-600 transition-all cursor-pointer text-gray-900 dark:text-gray-100"
                >
                  <option value="">All Industries</option>
                  {industries.map((industry) => (
                    <option key={industry.name} value={industry.name}>
                      {industry.name} ({industry.count})
                    </option>
                  ))}
                </select>

                {hasFilters && (
                  <button
                    onClick={clearFilters}
                    className="px-4 py-2.5 text-[14px] text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400 dark:text-gray-500" />
            </div>
          )}

          {/* Empty State */}
          {!isLoading && filteredStudies.length === 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-8 h-8 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-[18px] font-semibold text-gray-900 dark:text-gray-100 mb-2">No case studies found</h3>
              <p className="text-[14px] text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
                {hasFilters
                  ? "We couldn't find any case studies matching your criteria. Try adjusting your filters."
                  : 'Check back soon for success stories.'}
              </p>
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center gap-2 px-4 py-2 text-[14px] font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}

          {/* Featured Study */}
          {!isLoading && !hasFilters && featuredStudy && (
            <div className="mb-12">
              <Link
                to={`/case-studies/${featuredStudy.slug}`}
                className="group block bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm dark:shadow-gray-900/40 hover:shadow-md dark:hover:shadow-gray-900/60 transition-shadow"
              >
                <div className="grid md:grid-cols-2 gap-0">
                  <div className="aspect-video md:aspect-auto md:h-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                    {featuredStudy.featured_image ? (
                      <img
                        src={featuredStudy.featured_image}
                        alt={featuredStudy.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full min-h-[300px] flex items-center justify-center bg-gradient-to-br from-gray-100 dark:from-gray-700 to-gray-200 dark:to-gray-800">
                        <Building2 className="w-16 h-16 text-gray-300 dark:text-gray-500" />
                      </div>
                    )}
                  </div>
                  <div className="p-8 md:p-10 flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-4">
                      {featuredStudy.is_featured && (
                        <span className="px-2.5 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[11px] font-semibold uppercase tracking-wider rounded">
                          Featured
                        </span>
                      )}
                      {featuredStudy.industry && (
                        <span className="text-[12px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                          {featuredStudy.industry}
                        </span>
                      )}
                    </div>
                    {featuredStudy.client_name && (
                      <p className="text-[13px] font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5" />
                        {featuredStudy.client_name}
                      </p>
                    )}
                    <h2 className="text-[28px] font-bold text-gray-900 dark:text-gray-100 group-hover:text-gray-700 dark:group-hover:text-gray-300 leading-tight mb-4 transition-colors">
                      {featuredStudy.title}
                    </h2>
                    {featuredStudy.excerpt && (
                      <p className="text-[15px] text-gray-600 dark:text-gray-400 leading-relaxed mb-6 line-clamp-3">
                        {featuredStudy.excerpt}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-[13px] text-gray-500 dark:text-gray-400">
                        {featuredStudy.published_at && (
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4" />
                            {new Date(featuredStudy.published_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        )}
                      </div>
                      <span className="inline-flex items-center gap-1 text-[14px] font-medium text-gray-900 dark:text-gray-100 group-hover:gap-2 transition-all">
                        Read case study
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          )}

          {/* Studies Grid */}
          {!isLoading && (hasFilters ? filteredStudies : remainingStudies).length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-[20px] font-semibold text-gray-900 dark:text-gray-100">
                  {hasFilters ? `${filteredStudies.length} case stud${filteredStudies.length !== 1 ? 'ies' : 'y'} found` : 'More Success Stories'}
                </h2>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(hasFilters ? filteredStudies : remainingStudies).map((study: CMSCaseStudyListItem) => (
                  <CaseStudyCard key={study.id} study={study} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function CaseStudyCard({ study }: { study: CMSCaseStudyListItem }) {
  return (
    <Link
      to={`/case-studies/${study.slug}`}
      className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm dark:shadow-gray-900/40 hover:shadow-md dark:hover:shadow-gray-900/60 hover:border-gray-300 dark:hover:border-gray-600 transition-all"
    >
      {/* Image */}
      <div className="aspect-[16/10] bg-gray-100 dark:bg-gray-700 overflow-hidden">
        {study.featured_image ? (
          <img
            src={study.featured_image}
            alt={study.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 dark:from-gray-700 to-gray-200 dark:to-gray-800">
            <Building2 className="w-10 h-10 text-gray-300 dark:text-gray-500" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Industry Badge */}
        <div className="flex items-center gap-2 mb-3">
          {study.industry && (
            <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              {study.industry}
            </span>
          )}
        </div>

        {/* Company */}
        {study.client_name && (
          <p className="text-[12px] font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
            <Building2 className="w-3 h-3" />
            {study.client_name}
          </p>
        )}

        {/* Title */}
        <h3 className="text-[16px] font-semibold text-gray-900 dark:text-gray-100 group-hover:text-gray-700 dark:group-hover:text-gray-300 leading-snug mb-2 line-clamp-2 transition-colors">
          {study.title}
        </h3>

        {/* Excerpt */}
        {study.excerpt && (
          <p className="text-[14px] text-gray-500 dark:text-gray-400 line-clamp-2 mb-4">
            {study.excerpt}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-[12px] text-gray-400 dark:text-gray-500">
          {study.published_at && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(study.published_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-[13px] font-medium text-emerald-600 dark:text-emerald-400 group-hover:gap-2 transition-all">
            Read more
            <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </Link>
  )
}
