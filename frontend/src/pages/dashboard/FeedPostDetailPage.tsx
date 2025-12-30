/**
 * FeedPostDetailPage
 *
 * Displays a single feed post with full content and comments.
 * Handles articles (with rich content) and updates.
 */
import { useParams, Link, useNavigate } from 'react-router-dom'
import { formatDistanceToNow, format } from 'date-fns'
import { ArrowLeft, Calendar, User, Building2, Loader2 } from 'lucide-react'
import { useFeedPost } from '@/hooks'
import { getMediaUrl } from '@/services/api'
import { FeedPostType } from '@/types'
import BlockRenderer from '@/components/cms/BlockRenderer'
import CommentSection from '@/components/feed/CommentSection'

export default function FeedPostDetailPage() {
  const { postId } = useParams<{ postId: string }>()
  const navigate = useNavigate()
  const { data: post, isLoading, error } = useFeedPost(postId)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
          <p className="text-red-700 dark:text-red-400">Post not found or you don't have permission to view it.</p>
          <Link
            to="/dashboard/feed"
            className="mt-4 inline-flex items-center gap-2 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Feed
          </Link>
        </div>
      </div>
    )
  }

  // Redirect job announcements to job page
  if (post.post_type === FeedPostType.JOB_ANNOUNCEMENT && post.job) {
    navigate(`/jobs/${post.job.slug}`, { replace: true })
    return null
  }

  const companyLogo = post.company?.logo ? getMediaUrl(post.company.logo) : null
  const featuredImage = post.featured_image ? getMediaUrl(post.featured_image) : null
  const publishedDate = post.published_at
    ? format(new Date(post.published_at), 'MMMM d, yyyy')
    : format(new Date(post.created_at), 'MMMM d, yyyy')
  const timeAgo = post.published_at
    ? formatDistanceToNow(new Date(post.published_at), { addSuffix: true })
    : formatDistanceToNow(new Date(post.created_at), { addSuffix: true })

  const isArticle = post.post_type === FeedPostType.ARTICLE

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back Link */}
      <Link
        to="/dashboard/feed"
        className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Feed
      </Link>

      <article className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Featured Image (for articles) */}
        {featuredImage && isArticle && (
          <div className="aspect-[2/1] relative overflow-hidden bg-gray-100 dark:bg-gray-800">
            <img
              src={featuredImage}
              alt={post.featured_image_alt || post.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="p-6 md:p-8">
          {/* Header */}
          <header className="mb-6">
            {/* Type Badge */}
            <span className={`inline-block text-xs font-medium px-2 py-1 rounded mb-4 ${
              isArticle
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                : 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
            }`}>
              {post.post_type_display}
            </span>

            {/* Title */}
            {post.title && (
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                {post.title}
              </h1>
            )}

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              {/* Company */}
              <div className="flex items-center gap-2">
                {companyLogo ? (
                  <img
                    src={companyLogo}
                    alt={post.company?.name}
                    className="w-6 h-6 rounded-full object-cover"
                  />
                ) : (
                  <Building2 className="w-4 h-4" />
                )}
                <span className="font-medium text-gray-700 dark:text-gray-300">{post.company?.name}</span>
              </div>

              {/* Author */}
              {post.author && (
                <div className="flex items-center gap-1.5">
                  <User className="w-4 h-4" />
                  <span>{post.author.first_name} {post.author.last_name}</span>
                </div>
              )}

              {/* Date */}
              <div className="flex items-center gap-1.5" title={publishedDate}>
                <Calendar className="w-4 h-4" />
                <span>{timeAgo}</span>
              </div>
            </div>
          </header>

          {/* Content */}
          <div className="prose prose-gray dark:prose-invert max-w-none">
            {/* Article with rich content blocks */}
            {isArticle && post.content_blocks ? (
              <BlockRenderer blocks={post.content_blocks} />
            ) : (
              /* Update with plain text content */
              <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 text-base leading-relaxed">
                {post.content}
              </div>
            )}

            {/* Update Image (if present) */}
            {featuredImage && !isArticle && (
              <div className="mt-6 rounded-lg overflow-hidden">
                <img
                  src={featuredImage}
                  alt={post.featured_image_alt || ''}
                  className="w-full h-auto"
                />
              </div>
            )}
          </div>
        </div>

        {/* Comments */}
        <div className="border-t border-gray-200 dark:border-gray-700">
          <CommentSection postId={post.id} expanded />
        </div>
      </article>
    </div>
  )
}
