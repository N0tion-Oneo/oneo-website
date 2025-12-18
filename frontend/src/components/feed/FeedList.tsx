/**
 * FeedList Component
 *
 * Displays a list of feed posts with infinite scroll support.
 */
import { useRef, useCallback } from 'react'
import FeedCard from './FeedCard'
import type { FeedPostListItem } from '@/types'

interface FeedListProps {
  posts: FeedPostListItem[]
  isLoading: boolean
  hasMore: boolean
  onLoadMore: () => void
  emptyMessage?: string
}

export default function FeedList({
  posts,
  isLoading,
  hasMore,
  onLoadMore,
  emptyMessage = 'No posts yet',
}: FeedListProps) {
  const observer = useRef<IntersectionObserver | null>(null)

  // Infinite scroll trigger
  const lastPostRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (isLoading) return
      if (observer.current) observer.current.disconnect()

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          onLoadMore()
        }
      })

      if (node) observer.current.observe(node)
    },
    [isLoading, hasMore, onLoadMore]
  )

  // Empty state
  if (!posts.length && !isLoading) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-3">📭</div>
        <p className="text-[14px] text-gray-500">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {posts.map((post, index) => (
        <div
          key={post.id}
          ref={index === posts.length - 1 ? lastPostRef : undefined}
        >
          <FeedCard post={post} />
        </div>
      ))}

      {isLoading && (
        <div className="py-6 text-center">
          <div className="inline-block w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
        </div>
      )}

      {!isLoading && hasMore && (
        <div className="text-center py-3">
          <button
            onClick={onLoadMore}
            className="text-[13px] text-gray-500 hover:text-gray-700"
          >
            Load more
          </button>
        </div>
      )}
    </div>
  )
}
