/**
 * FeedCard Component
 *
 * Displays a single feed post in the feed list.
 * Handles articles and updates (jobs are shown in sidebar).
 */
import { formatDistanceToNow } from 'date-fns'
import { getMediaUrl } from '@/services/api'
import { FeedPostType } from '@/types'
import type { FeedPostListItem } from '@/types'
import CommentSection from './CommentSection'

interface FeedCardProps {
  post: FeedPostListItem
}

export default function FeedCard({ post }: FeedCardProps) {
  const timeAgo = post.published_at
    ? formatDistanceToNow(new Date(post.published_at), { addSuffix: true })
    : formatDistanceToNow(new Date(post.created_at), { addSuffix: true })

  const companyLogo = post.company?.logo ? getMediaUrl(post.company.logo) : null
  const featuredImage = post.featured_image ? getMediaUrl(post.featured_image) : null

  const isArticle = post.post_type === FeedPostType.ARTICLE
  const commentCount = post.comment_count ?? 0

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* Featured Image (for articles only) */}
      {featuredImage && isArticle && (
        <div className="aspect-[2.5/1] relative overflow-hidden bg-gray-100 dark:bg-gray-800">
          <img
            src={featuredImage}
            alt={post.featured_image_alt || post.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="p-4">
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-2.5">
          {/* Company Logo */}
          <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {companyLogo ? (
              <img src={companyLogo} alt={post.company?.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {post.company?.name?.[0]?.toUpperCase()}
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-medium text-gray-900 dark:text-gray-100">{post.company?.name}</span>
              <span className="text-[11px] text-gray-400 dark:text-gray-500">·</span>
              <span className="text-[11px] text-gray-400 dark:text-gray-500">{timeAgo}</span>
            </div>
            <span className={`text-[11px] font-medium ${isArticle ? 'text-blue-600 dark:text-blue-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {isArticle ? 'Article' : 'Update'}
            </span>
          </div>
        </div>

        {/* Content */}
        <div>
          {/* Title */}
          {post.title && (
            <h3 className="text-[15px] font-semibold text-gray-900 dark:text-gray-100 mb-1.5 line-clamp-2">
              {post.title}
            </h3>
          )}

          {/* Content/Excerpt */}
          {post.post_type === FeedPostType.UPDATE && post.content && (
            <p className="text-[14px] text-gray-600 dark:text-gray-300 whitespace-pre-wrap line-clamp-3">
              {post.content}
            </p>
          )}

          {post.post_type === FeedPostType.ARTICLE && post.excerpt && (
            <p className="text-[13px] text-gray-500 dark:text-gray-400 line-clamp-2">
              {post.excerpt}
            </p>
          )}

          {/* Update Image (if present) */}
          {featuredImage && post.post_type === FeedPostType.UPDATE && (
            <div className="mt-3 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
              <img
                src={featuredImage}
                alt={post.featured_image_alt || ''}
                className="w-full h-auto max-h-72 object-cover"
              />
            </div>
          )}
        </div>
      </div>

      {/* Comments Section - auto expand if has comments */}
      <CommentSection
        postId={post.id}
        initialCommentCount={commentCount}
        autoExpandIfComments
      />
    </div>
  )
}
