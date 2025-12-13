// Public Case Studies List Page
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { cmsCaseStudies } from '@/services/cms'
import { Navbar } from '@/components/layout'
import { SEO } from '@/components/seo'
import { useSEODefaults } from '@/contexts/SEOContext'
import { Loader2, ArrowRight, Building2, TrendingUp } from 'lucide-react'
import type { CMSCaseStudyListItem } from '@/types'

export default function CaseStudyListPage() {
  const [selectedIndustry, setSelectedIndustry] = useState<string>('')
  const seoDefaults = useSEODefaults()

  const { data: studies, isLoading } = useQuery({
    queryKey: ['public-case-studies', selectedIndustry],
    queryFn: () => cmsCaseStudies.listPublic({ industry: selectedIndustry || undefined }),
  })

  const { data: industries } = useQuery({
    queryKey: ['case-study-industries'],
    queryFn: cmsCaseStudies.getIndustries,
  })

  return (
    <div className="min-h-screen bg-white">
      <SEO />
      <Navbar />

      {/* Hero Section */}
      <div className="bg-gradient-to-b from-gray-50 to-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-20">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <span className="text-[13px] font-medium text-gray-500 uppercase tracking-wide">
              Case Studies
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold text-gray-900 tracking-tight mb-4">
            Success Stories
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl">
            Discover how businesses across industries have transformed their hiring process and achieved remarkable results{seoDefaults.companyName ? ` with ${seoDefaults.companyName}` : ''}.
          </p>
        </div>
      </div>

      {/* Filters */}
      {industries && industries.length > 0 && (
        <div className="border-b border-gray-100">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center gap-2 overflow-x-auto">
              <button
                onClick={() => setSelectedIndustry('')}
                className={`px-4 py-2 text-[13px] font-medium rounded-full whitespace-nowrap transition-colors ${
                  !selectedIndustry
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All Industries
              </button>
              {industries.map((industry) => (
                <button
                  key={industry.name}
                  onClick={() => setSelectedIndustry(industry.name)}
                  className={`px-4 py-2 text-[13px] font-medium rounded-full whitespace-nowrap transition-colors ${
                    selectedIndustry === industry.name
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {industry.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : !studies?.results?.length ? (
          <div className="text-center py-16">
            <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No case studies yet</h2>
            <p className="text-gray-500">Check back soon for success stories.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {studies.results.map((study: CMSCaseStudyListItem) => (
              <CaseStudyCard key={study.id} study={study} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function CaseStudyCard({ study }: { study: CMSCaseStudyListItem }) {
  return (
    <Link
      to={`/case-studies/${study.slug}`}
      className="group block bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow"
    >
      {/* Image */}
      {study.featured_image && (
        <div className="aspect-[16/9] overflow-hidden bg-gray-100">
          <img
            src={study.featured_image}
            alt={study.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      )}

      {/* Content */}
      <div className="p-6">
        {/* Industry Badge */}
        {study.industry && (
          <span className="inline-block px-2.5 py-1 text-[11px] font-medium text-primary bg-primary/10 rounded-full mb-3">
            {study.industry}
          </span>
        )}

        {/* Company */}
        <p className="text-[13px] font-medium text-gray-500 mb-2">
          {study.company_name}
        </p>

        {/* Title */}
        <h3 className="text-lg font-semibold text-gray-900 mb-3 group-hover:text-primary transition-colors line-clamp-2">
          {study.title}
        </h3>

        {/* Excerpt */}
        {study.excerpt && (
          <p className="text-[14px] text-gray-600 mb-4 line-clamp-2">
            {study.excerpt}
          </p>
        )}

        {/* Read More */}
        <div className="flex items-center gap-1.5 text-[13px] font-medium text-primary">
          Read Case Study
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </Link>
  )
}
