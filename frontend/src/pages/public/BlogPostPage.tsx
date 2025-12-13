// Public Blog Post Detail Page
import { useState, useMemo } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { cmsBlog } from '@/services/cms'
import { BlockRenderer, FAQWidget } from '@/components/cms'
import { SEO, createArticleSchema } from '@/components/seo'
import { useSEODefaults } from '@/contexts/SEOContext'
import { buildBlogPostSEOData } from '@/utils/seoTemplates'
import Navbar from '@/components/layout/Navbar'
import {
  ArrowLeft,
  Calendar,
  User,
  Clock,
  Twitter,
  Linkedin,
  Link as LinkIcon,
  FileText,
  Loader2,
  Eye,
  Check,
  BookOpen,
} from 'lucide-react'
import type { EditorJSData } from '@/types'

// Extract headers from content for table of contents
function extractHeaders(content: EditorJSData | undefined) {
  if (!content?.blocks) return []
  return content.blocks
    .filter((block) => block.type === 'header' && (block.data.level === 2 || block.data.level === 3))
    .map((block, index) => ({
      id: `section-${index}`,
      text: (block.data.text as string).replace(/<[^>]*>/g, ''),
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

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>()
  const [searchParams] = useSearchParams()
  const isPreview = searchParams.get('preview') === 'true'
  const [copied, setCopied] = useState(false)
  const seoDefaults = useSEODefaults()

  const { data: post, isLoading, error } = useQuery({
    queryKey: ['public-blog-post', slug, isPreview],
    queryFn: () => cmsBlog.getBySlug(slug!, isPreview),
    enabled: !!slug,
  })

  // Fetch related posts
  const { data: relatedPosts = [] } = useQuery({
    queryKey: ['related-posts', post?.category],
    queryFn: () => cmsBlog.listPublic({ category: post?.category }),
    enabled: !!post?.category,
    select: (posts) => posts.filter((p) => p.id !== post?.id).slice(0, 3),
  })

  const headers = useMemo(() => extractHeaders(post?.content), [post?.content])
  const contentWithIds = useMemo(() => addHeaderIds(post?.content), [post?.content])

  // Calculate read time
  const readTime = post
    ? Math.max(1, Math.ceil(JSON.stringify(post.content).length / 1500))
    : 0

  // Build SEO data for programmatic templates - must be before early returns
  const postSeoData = useMemo(() => {
    if (!post) return undefined
    return buildBlogPostSEOData({
      title: post.title,
      meta_title: post.meta_title || undefined,
      meta_description: post.meta_description || undefined,
      excerpt: post.excerpt || undefined,
      category: post.category || undefined,
      author_name: post.author_name,
      published_at: post.published_at,
    })
  }, [post])

  // Generate structured data for article - must be before early returns
  const articleSchema = useMemo(() => {
    if (!post) return undefined
    return createArticleSchema({
      headline: post.title,
      description: post.excerpt || '',
      image: post.featured_image || undefined,
      datePublished: post.published_at || post.created_at,
      dateModified: post.updated_at,
      author: {
        name: post.author_name || `${seoDefaults.companyName} Team`,
      },
      publisher: {
        name: seoDefaults.companyName,
        logo: '/logo.png',
      },
    })
  }, [post, seoDefaults.companyName])

  // Share handlers
  const shareUrl = typeof window !== 'undefined' ? window.location.href : ''
  const shareTitle = post?.title || ''

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
  if (error || !post) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="max-w-3xl mx-auto px-6 py-16">
          <div className="text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h1 className="text-[24px] font-semibold text-gray-900 mb-2">Article Not Found</h1>
            <p className="text-[15px] text-gray-500 mb-6">
              The article you're looking for doesn't exist or has been removed.
            </p>
            <Link
              to="/blog"
              className="inline-flex items-center gap-2 text-[14px] text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Blog
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <SEO
        title={post.meta_title || undefined}
        description={post.meta_description || undefined}
        contentData={postSeoData ? { post: postSeoData } : undefined}
        ogType="article"
        ogImage={post.og_image || post.featured_image || undefined}
        ogImageAlt={post.featured_image_alt}
        article={{
          publishedTime: post.published_at || undefined,
          modifiedTime: post.updated_at,
          author: post.author_name || undefined,
          section: post.category,
          tags: post.tags,
        }}
        structuredData={articleSchema}
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
      <div className="relative">
        {/* Background Image */}
        {post.featured_image && (
          <div className="absolute inset-0">
            <img
              src={post.featured_image}
              alt={post.featured_image_alt || post.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/80 to-gray-900/60" />
          </div>
        )}

        {/* Fallback background when no image */}
        {!post.featured_image && (
          <div className="absolute inset-0 bg-gradient-to-b from-gray-800 to-gray-900" />
        )}

        <div className="relative max-w-5xl mx-auto px-6 py-20 md:py-28">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-white/10 backdrop-blur rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              {post.category ? (
                <Link
                  to={`/blog?category=${encodeURIComponent(post.category)}`}
                  className="text-[13px] font-medium text-white/70 uppercase tracking-wide hover:text-white transition-colors"
                >
                  {post.category}
                </Link>
              ) : (
                <span className="text-[13px] font-medium text-white/70 uppercase tracking-wide">
                  Blog
                </span>
              )}
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-white tracking-tight mb-4">
              {post.title}
            </h1>
            {post.excerpt && (
              <p className="text-[17px] text-white/80 leading-relaxed mb-6">
                {post.excerpt}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-4 text-[13px] text-white/60 mb-6">
              {post.author_name && (
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  <span>{post.author_name}</span>
                </div>
              )}
              {post.published_at && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{new Date(post.published_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>{readTime} min read</span>
              </div>
            </div>

            {/* Share Links */}
            <div className="flex items-center gap-1">
              <button
                onClick={shareOnTwitter}
                className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Share on Twitter"
              >
                <Twitter className="w-4 h-4" />
              </button>
              <button
                onClick={shareOnLinkedIn}
                className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Share on LinkedIn"
              >
                <Linkedin className="w-4 h-4" />
              </button>
              <button
                onClick={copyLink}
                className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Copy link"
              >
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <LinkIcon className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex gap-12">
          {/* Table of Contents - Desktop Sidebar */}
          {headers.length > 0 && (
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
            {headers.length > 0 && (
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

            <BlockRenderer content={contentWithIds!} />

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap mt-10 pt-8 border-t border-gray-100">
                {post.tags.map((tag) => (
                  <Link
                    key={tag}
                    to={`/blog?tag=${encodeURIComponent(tag)}`}
                    className="px-3 py-1 text-[12px] bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            )}

            {/* FAQ Section */}
            {post.faqs && post.faqs.length > 0 && (
              <div className="mt-12 pt-8 border-t border-gray-100">
                <FAQWidget faqs={post.faqs} includeSchema={true} />
              </div>
            )}

          </article>
        </div>
      </div>

      {/* Related Articles */}
      {relatedPosts.length > 0 && (
        <div className="border-t border-gray-100 bg-gray-50">
          <div className="max-w-5xl mx-auto px-6 py-12">
            <h3 className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-6">
              Related Articles
            </h3>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              {relatedPosts.map((relatedPost) => (
                <Link
                  key={relatedPost.id}
                  to={`/blog/${relatedPost.slug}`}
                  className="p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all"
                >
                  <p className="text-[14px] font-medium text-gray-900 line-clamp-2">{relatedPost.title}</p>
                  <p className="text-[12px] text-gray-500 mt-1 line-clamp-2">{relatedPost.excerpt}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <Link
              to="/blog"
              className="inline-flex items-center gap-2 text-[13px] text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Blog
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
