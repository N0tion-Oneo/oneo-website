/**
 * FeedPage
 *
 * Main feed page with two-column layout:
 * - Left: Articles and Updates feed
 * - Right: Jobs sidebar
 */
import { useState } from 'react'
import { useFeed, useCompanyFeatures } from '@/hooks'
import { FeedList, CreatePostModal, JobsSidebar } from '@/components/feed'
import { FeedPostType } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { UserRole } from '@/types'

const filterOptions: Array<{ value: 'all' | FeedPostType.ARTICLE | FeedPostType.UPDATE; label: string }> = [
  { value: 'all', label: 'All' },
  { value: FeedPostType.ARTICLE, label: 'Articles' },
  { value: FeedPostType.UPDATE, label: 'Updates' },
]

export default function FeedPage() {
  const { user } = useAuth()
  const [activeFilter, setActiveFilter] = useState<'all' | FeedPostType.ARTICLE | FeedPostType.UPDATE>('all')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const { hasFeature } = useCompanyFeatures()

  // Fetch feed excluding job announcements (those go in sidebar)
  const { posts, isLoading, error, hasMore, loadMore, refetch } = useFeed({
    postType: activeFilter === 'all' ? undefined : activeFilter,
    pageSize: 20,
  })

  // Filter out job announcements from main feed (they're in the sidebar)
  const filteredPosts = posts.filter(post => post.post_type !== FeedPostType.JOB_ANNOUNCEMENT)

  const handleFilterChange = (filter: 'all' | FeedPostType.ARTICLE | FeedPostType.UPDATE) => {
    setActiveFilter(filter)
  }

  // Check if user can create posts
  // - Staff (admin/recruiter) can always create posts
  // - Clients can only create posts if they have the "Employer Branding" feature
  const isStaff = user?.role === UserRole.ADMIN || user?.role === UserRole.RECRUITER
  const isClient = user?.role === UserRole.CLIENT
  const hasEmployerBranding = hasFeature('Employer Branding')
  const canCreatePost = isStaff || (isClient && hasEmployerBranding)

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-semibold text-gray-900">Feed</h1>
          <p className="text-[14px] text-gray-500 mt-1">
            Latest updates from companies
          </p>
        </div>
        {canCreatePost && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-[14px] font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Post
          </button>
        )}
      </div>

      {/* Two Column Layout */}
      <div className="flex gap-6">
        {/* Main Feed (Left) */}
        <div className="flex-1 min-w-0 max-w-xl">
          {/* Filters */}
          <div className="flex items-center gap-2 mb-5">
            {filterOptions.map((filter) => (
              <button
                key={filter.value}
                onClick={() => handleFilterChange(filter.value)}
                className={`px-3 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors ${
                  activeFilter === filter.value
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {/* Error State */}
          {error && (
            <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-[14px] text-red-600">{error}</p>
            </div>
          )}

          {/* Feed List */}
          <FeedList
            posts={filteredPosts}
            isLoading={isLoading}
            hasMore={hasMore}
            onLoadMore={loadMore}
            emptyMessage={
              activeFilter === 'all'
                ? 'No posts yet. Check back soon!'
                : `No ${filterOptions.find(f => f.value === activeFilter)?.label.toLowerCase()} yet.`
            }
          />
        </div>

        {/* Jobs Sidebar (Right) */}
        <div className="hidden lg:block w-80 flex-shrink-0">
          <div className="sticky top-6">
            <JobsSidebar />
          </div>
        </div>
      </div>

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  )
}
