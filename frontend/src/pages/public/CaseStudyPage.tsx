// Public Case Study Detail Page
import { useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { cmsCaseStudies } from '@/services/cms'
import { BlockRenderer } from '@/components/cms'
import { Navbar } from '@/components/layout'
import { SEO, createCaseStudySchema, createBreadcrumbSchema } from '@/components/seo'
import { useSEODefaults } from '@/contexts/SEOContext'
import { buildCaseStudySEOData } from '@/utils/seoTemplates'
import {
  Loader2,
  ArrowLeft,
  Building2,
  Calendar,
  TrendingUp,
  ArrowRight,
  CheckCircle2
} from 'lucide-react'

export default function CaseStudyPage() {
  const { slug } = useParams<{ slug: string }>()
  const seoDefaults = useSEODefaults()

  const { data: study, isLoading, error } = useQuery({
    queryKey: ['public-case-study', slug],
    queryFn: () => cmsCaseStudies.getPublicBySlug(slug!),
    enabled: !!slug,
  })

  // SEO Schemas
  const caseStudySchema = useMemo(() => {
    if (!study) return undefined
    return createCaseStudySchema({
      name: study.title,
      description: study.excerpt || study.meta_description || `${study.title} - ${seoDefaults.companyName} Case Study`,
      url: `${window.location.origin}/case-studies/${slug}`,
      image: study.featured_image,
      datePublished: study.published_at || study.created_at,
      dateModified: study.updated_at,
      publisher: {
        name: seoDefaults.companyName,
        logo: `${window.location.origin}/logo.png`,
      },
      about: study.company_name ? {
        name: study.company_name,
        industry: study.industry,
      } : undefined,
    })
  }, [study, slug, seoDefaults.companyName])

  const breadcrumbSchema = useMemo(() => {
    if (!study) return undefined
    return createBreadcrumbSchema([
      { name: 'Home', url: window.location.origin },
      { name: 'Case Studies', url: `${window.location.origin}/case-studies` },
      { name: study.title, url: `${window.location.origin}/case-studies/${slug}` },
    ])
  }, [study, slug])

  const combinedSchema = useMemo(() => {
    if (!caseStudySchema || !breadcrumbSchema) return undefined
    return [caseStudySchema, breadcrumbSchema]
  }, [caseStudySchema, breadcrumbSchema])

  // Build SEO data for programmatic templates
  const studySeoData = useMemo(() => {
    if (!study) return undefined
    return buildCaseStudySEOData({
      title: study.title,
      client_name: study.company_name || undefined,
      industry: study.industry || undefined,
      excerpt: study.excerpt || undefined,
      meta_title: study.meta_title || undefined,
      meta_description: study.meta_description || undefined,
    })
  }, [study])

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </div>
    )
  }

  // Error/Not found state
  if (error || !study) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="max-w-3xl mx-auto px-6 py-16">
          <div className="text-center">
            <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h1 className="text-[24px] font-semibold text-gray-900 mb-2">Case Study Not Found</h1>
            <p className="text-[15px] text-gray-500 mb-6">
              The case study you're looking for doesn't exist or has been removed.
            </p>
            <Link
              to="/case-studies"
              className="inline-flex items-center gap-2 text-[14px] text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Case Studies
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <SEO
        title={study.meta_title || undefined}
        description={study.meta_description || undefined}
        contentData={studySeoData ? { study: studySeoData } : undefined}
        canonical={`${window.location.origin}/case-studies/${slug}`}
        ogType="article"
        ogImage={study.featured_image}
        structuredData={combinedSchema}
        article={{
          publishedTime: study.published_at || study.created_at,
          modifiedTime: study.updated_at,
          section: study.industry,
        }}
      />
      <Navbar />

      {/* Hero Section */}
      <div className="bg-gradient-to-b from-gray-50 to-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-12 md:py-16">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-[13px] text-gray-500 mb-8">
            <Link to="/" className="hover:text-gray-900">Home</Link>
            <span>/</span>
            <Link to="/case-studies" className="hover:text-gray-900">Case Studies</Link>
            <span>/</span>
            <span className="text-gray-900">{study.title}</span>
          </nav>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            {study.industry && (
              <span className="px-3 py-1 text-[12px] font-medium text-primary bg-primary/10 rounded-full">
                {study.industry}
              </span>
            )}
          </div>

          <h1 className="text-3xl md:text-4xl font-semibold text-gray-900 tracking-tight mb-4">
            {study.title}
          </h1>

          {study.excerpt && (
            <p className="text-lg text-gray-600 max-w-3xl mb-6">
              {study.excerpt}
            </p>
          )}

          {/* Meta Info */}
          <div className="flex flex-wrap items-center gap-6 text-[13px] text-gray-500">
            {study.company_name && (
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                <span>{study.company_name}</span>
              </div>
            )}
            {study.published_at && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{new Date(study.published_at).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Featured Image */}
      {study.featured_image && (
        <div className="max-w-5xl mx-auto px-6 -mt-4 mb-12">
          <div className="aspect-[21/9] rounded-xl overflow-hidden shadow-lg">
            <img
              src={study.featured_image}
              alt={study.title}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-6 pb-16">
        <div className="flex gap-12">
          {/* Sidebar - Highlights */}
          {study.highlights && study.highlights.length > 0 && (
            <aside className="hidden lg:block w-72 flex-shrink-0">
              <div className="sticky top-24 bg-gray-50 rounded-xl p-6">
                <h3 className="text-[13px] font-semibold text-gray-900 uppercase tracking-wide mb-4">
                  Key Results
                </h3>
                <div className="space-y-4">
                  {study.highlights.map((highlight: { metric: string; value: string }, index: number) => (
                    <div key={index} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-2xl font-bold text-gray-900">{highlight.value}</p>
                        <p className="text-[13px] text-gray-600">{highlight.metric}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          )}

          {/* Content */}
          <article className="flex-1 min-w-0">
            {/* Mobile Highlights */}
            {study.highlights && study.highlights.length > 0 && (
              <div className="lg:hidden bg-gray-50 rounded-xl p-6 mb-8">
                <h3 className="text-[13px] font-semibold text-gray-900 uppercase tracking-wide mb-4">
                  Key Results
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {study.highlights.map((highlight: { metric: string; value: string }, index: number) => (
                    <div key={index}>
                      <p className="text-2xl font-bold text-gray-900">{highlight.value}</p>
                      <p className="text-[13px] text-gray-600">{highlight.metric}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Content Blocks */}
            <div className="prose prose-lg max-w-none">
              <BlockRenderer content={study.content} />
            </div>
          </article>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gray-900 text-white">
        <div className="max-w-5xl mx-auto px-6 py-16 text-center">
          <h2 className="text-2xl md:text-3xl font-semibold mb-4">
            Ready to transform your hiring?
          </h2>
          <p className="text-gray-400 mb-8 max-w-xl mx-auto">
            Join companies like {study.company_name || 'industry leaders'} who have revolutionized their recruitment process with {seoDefaults.companyName}.
          </p>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-gray-900 font-medium rounded-lg hover:bg-gray-100 transition-colors"
          >
            Get Started
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <Link
              to="/case-studies"
              className="inline-flex items-center gap-2 text-[14px] text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Case Studies
            </Link>
            <p className="text-[13px] text-gray-400">
              © {new Date().getFullYear()} {seoDefaults.companyName}. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
