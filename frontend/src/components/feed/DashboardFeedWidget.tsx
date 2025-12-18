/**
 * DashboardFeedWidget Component
 *
 * A compact feed widget for the dashboard showing the latest posts.
 */
import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { Briefcase, FileText, MessageSquare, Loader2 } from 'lucide-react'
import { useFeedSummary } from '@/hooks'
import { getMediaUrl } from '@/services/api'
import { FeedPostType } from '@/types'
import type { FeedPostListItem } from '@/types'

interface DashboardFeedWidgetProps {
  limit?: number
}

const typeConfig: Record<FeedPostType, { icon: typeof FileText; color: string }> = {
  [FeedPostType.ARTICLE]: { icon: FileText, color: 'text-blue-500' },
  [FeedPostType.UPDATE]: { icon: MessageSquare, color: 'text-emerald-500' },
  [FeedPostType.JOB_ANNOUNCEMENT]: { icon: Briefcase, color: 'text-purple-500' },
}

function CompactFeedItem({ post }: { post: FeedPostListItem }) {
  const timeAgo = post.published_at
    ? formatDistanceToNow(new Date(post.published_at), { addSuffix: false })
    : formatDistanceToNow(new Date(post.created_at), { addSuffix: false })

  const companyLogo = post.company?.logo ? getMediaUrl(post.company.logo) : null
  const { icon: TypeIcon, color: typeColor } = typeConfig[post.post_type]

  const getPostLink = () => {
    if (post.post_type === FeedPostType.JOB_ANNOUNCEMENT && post.job) {
      return `/jobs/${post.job.slug}`
    }
    return `/dashboard/feed/${post.id}`
  }

  return (
    <Link
      to={getPostLink()}
      className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors group"
    >
      {/* Company Logo */}
      <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
        {companyLogo ? (
          <img src={companyLogo} alt={post.company?.name} className="w-full h-full object-cover" />
        ) : (
          <TypeIcon className={`w-3.5 h-3.5 ${typeColor}`} />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-gray-700 truncate group-hover:text-gray-900">
          <span className="font-medium text-gray-900">{post.company?.name}</span>
          {' · '}
          {post.title || post.content.slice(0, 50)}
        </p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <TypeIcon className={`w-3.5 h-3.5 ${typeColor}`} />
        <span className="text-[11px] text-gray-400">{timeAgo}</span>
      </div>
    </Link>
  )
}

export default function DashboardFeedWidget({ limit = 5 }: DashboardFeedWidgetProps) {
  const { posts, isLoading, error } = useFeedSummary({ limit })

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h2 className="text-[14px] font-semibold text-gray-900">Latest Updates</h2>
        <Link
          to="/dashboard/feed"
          className="text-[12px] text-gray-500 hover:text-gray-900 transition-colors"
        >
          See all →
        </Link>
      </div>

      {/* Content */}
      {error ? (
        <div className="p-4 text-[13px] text-red-600">{error}</div>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      ) : posts.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-[13px] text-gray-500">No updates yet</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {posts.map((post) => (
            <CompactFeedItem key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  )
}
