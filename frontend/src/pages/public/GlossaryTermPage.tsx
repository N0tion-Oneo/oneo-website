// Public Glossary Term Detail Page
import { useState, useMemo } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { cmsGlossary } from '@/services/cms'
import { BlockRenderer, FAQWidget } from '@/components/cms'
import { SEO, createDefinedTermSchema } from '@/components/seo'
import { useSEODefaults } from '@/contexts/SEOContext'
import { buildGlossaryTermSEOData } from '@/utils/seoTemplates'
import Navbar from '@/components/layout/Navbar'
import {
  ArrowLeft,
  Book,
  Twitter,
  Linkedin,
  Link as LinkIcon,
  Loader2,
  Eye,
  Check,
  ArrowRight,
} from 'lucide-react'

export default function GlossaryTermPage() {
  const { slug } = useParams<{ slug: string }>()
  const [searchParams] = useSearchParams()
  const isPreview = searchParams.get('preview') === 'true'
  const [copied, setCopied] = useState(false)
  const seoDefaults = useSEODefaults()

  const { data: term, isLoading, error } = useQuery({
    queryKey: ['public-glossary-term', slug, isPreview],
    queryFn: () => cmsGlossary.getBySlug(slug!),
    enabled: !!slug,
  })

  // Build SEO data for programmatic templates - must be before early returns
  const termSeoData = useMemo(() => {
    if (!term) return undefined
    return buildGlossaryTermSEOData({
      title: term.title,
      definition_plain: term.definition_plain || undefined,
      meta_title: term.meta_title || undefined,
      meta_description: term.meta_description || undefined,
    })
  }, [term])

  // Generate structured data for the term - must be before early returns
  const termSchema = useMemo(() => {
    if (!term) return undefined
    const shareUrl = typeof window !== 'undefined' ? window.location.href : ''
    return createDefinedTermSchema({
      name: term.title,
      description: term.definition_plain || '',
      url: shareUrl,
    })
  }, [term])

  // Share handlers
  const shareUrl = typeof window !== 'undefined' ? window.location.href : ''
  const shareTitle = term?.title ? `${term.title} - Definition` : ''

  const shareOnTwitter = () => {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(shareUrl)}`,
      '_blank'
    )
  }

  const shareOnLinkedIn = () => {
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
      '_blank'
    )
  }

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

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
  if (error || !term) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="max-w-3xl mx-auto px-6 py-16">
          <div className="text-center">
            <Book className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h1 className="text-[24px] font-semibold text-gray-900 mb-2">Term Not Found</h1>
            <p className="text-[15px] text-gray-500 mb-6">
              The term you're looking for doesn't exist or has been removed.
            </p>
            <Link
              to="/glossary"
              className="inline-flex items-center gap-2 text-[14px] text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Glossary
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <SEO
        title={term.meta_title || undefined}
        description={term.meta_description || undefined}
        contentData={termSeoData ? { term: termSeoData } : undefined}
        ogType="article"
        ogImage={term.og_image || undefined}
        structuredData={termSchema}
      />
      <Navbar />

      {/* Preview Banner */}
      {isPreview && (
        <div className="bg-amber-50 border-b border-amber-100">
          <div className="max-w-5xl mx-auto px-6 py-2">
            <div className="flex items-center justify-center gap-2 text-[13px] text-amber-700">
              <Eye className="w-4 h-4" />
              <span>Preview Mode</span>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div className="bg-gradient-to-b from-emerald-50 to-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6 py-16 md:py-20">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-[13px] text-gray-500 mb-6">
            <Link to="/glossary" className="hover:text-gray-700 transition-colors">
              Glossary
            </Link>
            <span>/</span>
            <span className="text-gray-900">{term.title}</span>
          </div>

          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Book className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <span className="text-[12px] font-medium text-emerald-600 uppercase tracking-wider">
                Definition
              </span>
              <h1 className="text-[36px] md:text-[44px] font-bold text-gray-900 leading-tight">
                {term.title}
              </h1>
            </div>
          </div>

          {/* Short Definition */}
          {term.definition_plain && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
              <p className="text-[17px] text-gray-700 leading-relaxed italic">
                "{term.definition_plain}"
              </p>
            </div>
          )}

          {/* Share Links */}
          <div className="flex items-center gap-1">
            <span className="text-[13px] text-gray-500 mr-2">Share:</span>
            <button
              onClick={shareOnTwitter}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Share on Twitter"
            >
              <Twitter className="w-4 h-4" />
            </button>
            <button
              onClick={shareOnLinkedIn}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Share on LinkedIn"
            >
              <Linkedin className="w-4 h-4" />
            </button>
            <button
              onClick={copyLink}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Copy link"
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <LinkIcon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Full Definition */}
        {term.content && term.content.blocks && term.content.blocks.length > 0 && (
          <article className="prose prose-gray max-w-none mb-12">
            <BlockRenderer content={term.content} />
          </article>
        )}

        {/* Related Terms */}
        {term.related_terms && term.related_terms.length > 0 && (
          <div className="mb-12 pt-8 border-t border-gray-100">
            <h3 className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-4">
              Related Terms
            </h3>
            <div className="flex flex-wrap gap-2">
              {term.related_terms.map((relatedTerm) => (
                <Link
                  key={relatedTerm.slug}
                  to={`/glossary/${relatedTerm.slug}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-50 text-gray-700 text-[14px] font-medium rounded-lg border border-gray-200 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 transition-all"
                >
                  {relatedTerm.title}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* FAQ Section */}
        {term.faqs && term.faqs.length > 0 && (
          <div className="mb-12 pt-8 border-t border-gray-100">
            <FAQWidget faqs={term.faqs} includeSchema={true} />
          </div>
        )}

        {/* Back to Glossary */}
        <div className="pt-8 border-t border-gray-100">
          <Link
            to="/glossary"
            className="inline-flex items-center gap-2 text-[14px] text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Glossary
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-4xl mx-auto px-6">
          <p className="text-[13px] text-gray-400 text-center">
            © {new Date().getFullYear()} {seoDefaults.companyName}. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
