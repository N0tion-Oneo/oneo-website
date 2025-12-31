/**
 * JobsSidebar Component
 *
 * Displays latest job announcements in a compact sidebar format.
 */
import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { MapPin, Banknote, Briefcase, Loader2 } from 'lucide-react'
import { useFeed } from '@/hooks'
import { getMediaUrl } from '@/services/api'
import { FeedPostType } from '@/types'
import type { FeedPostListItem } from '@/types'

function JobCard({ post }: { post: FeedPostListItem }) {
  if (!post.job) return null

  const timeAgo = post.published_at
    ? formatDistanceToNow(new Date(post.published_at), { addSuffix: true })
    : formatDistanceToNow(new Date(post.created_at), { addSuffix: true })

  const companyLogo = post.company?.logo ? getMediaUrl(post.company.logo) : null

  return (
    <Link
      to={`/jobs/${post.job.slug}`}
      className="block p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
    >
      <div className="flex items-start gap-3">
        {/* Company Logo */}
        <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {companyLogo ? (
            <img src={companyLogo} alt={post.company?.name} className="w-full h-full object-cover" />
          ) : (
            <Briefcase className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="text-[13px] font-medium text-gray-900 dark:text-gray-100 line-clamp-1 group-hover:text-gray-700 dark:group-hover:text-gray-300">
            {post.job.title}
          </h4>
          <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5">{post.company?.name}</p>

          <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px] text-gray-400 dark:text-gray-500">
            {post.job.location_display && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {post.job.location_display}
              </span>
            )}
            {post.job.salary_display && (
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <Banknote className="w-3 h-3" />
                {post.job.salary_display}
              </span>
            )}
          </div>

          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1.5">{timeAgo}</p>
        </div>
      </div>
    </Link>
  )
}

export default function JobsSidebar() {
  const { posts, isLoading } = useFeed({
    postType: FeedPostType.JOB_ANNOUNCEMENT,
    pageSize: 10,
  })

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <h2 className="text-[14px] font-semibold text-gray-900 dark:text-gray-100">Latest Jobs</h2>
        </div>
        <Link
          to="/jobs"
          className="text-[12px] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
        >
          View all →
        </Link>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400 dark:text-gray-500" />
        </div>
      ) : posts.length === 0 ? (
        <div className="py-8 text-center">
          <Briefcase className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
          <p className="text-[13px] text-gray-500 dark:text-gray-400">No jobs posted yet</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {posts.map((post) => (
            <JobCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  )
}
