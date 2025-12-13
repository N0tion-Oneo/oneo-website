// Public CMS Page View - Legal Documents
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { cmsPages } from '@/services/cms'
import { BlockRenderer } from '@/components/cms'
import { Navbar } from '@/components/layout'
import { SEO, createWebPageSchema } from '@/components/seo'
import { useSEODefaults } from '@/contexts/SEOContext'
import { ArrowLeft, FileText, Loader2, Scale, Calendar, Hash } from 'lucide-react'
import type { EditorJSData } from '@/types'

// Extract headers from content for table of contents
function extractHeaders(content: EditorJSData | undefined) {
  if (!content?.blocks) return []
  return content.blocks
    .filter((block) => block.type === 'header' && (block.data.level === 2 || block.data.level === 3))
    .map((block, index) => ({
      id: `section-${index}`,
      text: (block.data.text as string).replace(/<[^>]*>/g, ''), // Strip HTML tags
      level: block.data.level as number,
    }))
}

// Add IDs to header blocks for anchor linking
function addHeaderIds(content: EditorJSData | undefined): EditorJSData | undefined {
  if (!content?.blocks) return content
  let headerIndex = 0
  return {
    ...content,
    blocks: content.blocks.map((block) => {
      if (block.type === 'header' && (block.data.level === 2 || block.data.level === 3)) {
        const newBlock = {
          ...block,
          data: {
            ...block.data,
            id: `section-${headerIndex}`,
          },
        }
        headerIndex++
        return newBlock
      }
      return block
    }),
  }
}

export default function CMSPageView() {
  const { slug } = useParams<{ slug: string }>()
  const seoDefaults = useSEODefaults()

  const { data: page, isLoading, error } = useQuery({
    queryKey: ['cms-public-page', slug],
    queryFn: () => cmsPages.getBySlug(slug!),
    enabled: !!slug,
  })

  const headers = useMemo(() => extractHeaders(page?.content), [page?.content])
  const contentWithIds = useMemo(() => addHeaderIds(page?.content), [page?.content])

  // SEO Schema
  const pageSchema = useMemo(() => {
    if (!page) return undefined
    return createWebPageSchema({
      name: page.title,
      description: page.meta_description || `${page.title} - ${seoDefaults.companyName}`,
      url: `${window.location.origin}/${slug}`,
      datePublished: page.created_at,
      dateModified: page.updated_at,
      publisher: {
        name: seoDefaults.companyName,
        logo: `${window.location.origin}/logo.png`,
      },
    })
  }, [page, slug, seoDefaults.companyName])

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
  if (error || !page) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="max-w-3xl mx-auto px-6 py-16">
          <div className="text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h1 className="text-[24px] font-semibold text-gray-900 mb-2">Page Not Found</h1>
            <p className="text-[15px] text-gray-500 mb-6">
              The page you're looking for doesn't exist or has been removed.
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-[14px] text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <SEO
        title={page.title}
        description={page.meta_description || `${page.title} - ${seoDefaults.companyName}`}
        canonical={`${window.location.origin}/${slug}`}
        ogType="website"
        structuredData={pageSchema}
      />
      <Navbar />

      {/* Hero Section */}
      <div className="bg-gradient-to-b from-gray-50 to-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-16 md:py-20">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center">
              <Scale className="w-5 h-5 text-white" />
            </div>
            <span className="text-[13px] font-medium text-gray-500 uppercase tracking-wide">
              Legal
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold text-gray-900 tracking-tight mb-4">
            {page.title}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-[13px] text-gray-500">
            {page.version && (
              <div className="flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5" />
                <span>Version {page.version}</span>
              </div>
            )}
            {page.effective_date && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>Effective {new Date(page.effective_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex gap-12">
          {/* Table of Contents - Desktop Sidebar */}
          {headers.length > 3 && (
            <aside className="hidden lg:block w-64 flex-shrink-0">
              <div className="sticky top-24">
                <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-4">
                  On this page
                </h3>
                <nav className="space-y-1">
                  {headers.map((header) => (
                    <a
                      key={header.id}
                      href={`#${header.id}`}
                      className={`block text-[13px] text-gray-500 hover:text-gray-900 transition-colors py-1 ${
                        header.level === 3 ? 'pl-4' : ''
                      }`}
                    >
                      {header.text}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>
          )}

          {/* Content */}
          <article className="flex-1 min-w-0">
            {/* Mobile Table of Contents */}
            {headers.length > 3 && (
              <div className="lg:hidden mb-8 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-[12px] font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Contents
                </h3>
                <nav className="space-y-1">
                  {headers.filter(h => h.level === 2).map((header) => (
                    <a
                      key={header.id}
                      href={`#${header.id}`}
                      className="block text-[13px] text-gray-600 hover:text-gray-900 py-0.5"
                    >
                      {header.text}
                    </a>
                  ))}
                </nav>
              </div>
            )}

            <div className="legal-content">
              <BlockRenderer content={contentWithIds!} className="legal-prose" />
            </div>
          </article>
        </div>
      </div>

      {/* Related Legal Documents */}
      <div className="border-t border-gray-100 bg-gray-50">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <h3 className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-6">
            Related Documents
          </h3>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
            <Link
              to="/terms-of-service"
              className={`p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all ${
                slug === 'terms-of-service' ? 'border-gray-900 bg-gray-50' : ''
              }`}
            >
              <p className="text-[14px] font-medium text-gray-900">Terms of Service</p>
              <p className="text-[12px] text-gray-500 mt-1">Usage terms and conditions</p>
            </Link>
            <Link
              to="/privacy-policy"
              className={`p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all ${
                slug === 'privacy-policy' ? 'border-gray-900 bg-gray-50' : ''
              }`}
            >
              <p className="text-[14px] font-medium text-gray-900">Privacy Policy</p>
              <p className="text-[12px] text-gray-500 mt-1">How we handle your data</p>
            </Link>
            <Link
              to="/cookie-policy"
              className={`p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all ${
                slug === 'cookie-policy' ? 'border-gray-900 bg-gray-50' : ''
              }`}
            >
              <p className="text-[14px] font-medium text-gray-900">Cookie Policy</p>
              <p className="text-[12px] text-gray-500 mt-1">Our use of cookies</p>
            </Link>
            <Link
              to="/acceptable-use-policy"
              className={`p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all ${
                slug === 'acceptable-use-policy' ? 'border-gray-900 bg-gray-50' : ''
              }`}
            >
              <p className="text-[14px] font-medium text-gray-900">Acceptable Use</p>
              <p className="text-[12px] text-gray-500 mt-1">Platform usage guidelines</p>
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <p className="text-[13px] text-gray-400">
              Last updated: {new Date(page.updated_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
            <p className="text-[13px] text-gray-400">
              © {new Date().getFullYear()} {seoDefaults.companyName}. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
