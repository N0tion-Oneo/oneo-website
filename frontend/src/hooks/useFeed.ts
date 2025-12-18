/**
 * Feed Hooks
 *
 * React hooks for interacting with the feed API.
 */
import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { feedApi, commentApi } from '@/services/feed'
import type {
  FeedPost,
  FeedPostListItem,
  FeedPostCreateInput,
  FeedPostUpdateInput,
  FeedFilters,
  FeedPostType,
  FeedPostStatus,
  MyPostsFilters,
  Comment,
  CommentCreateInput,
  CommentUpdateInput,
} from '@/types'

// =============================================================================
// Feed List Hook (with pagination)
// =============================================================================

interface UseFeedOptions {
  postType?: FeedPostType
  company?: string
  pageSize?: number
  enabled?: boolean
}

interface UseFeedReturn {
  posts: FeedPostListItem[]
  totalCount: number
  isLoading: boolean
  error: string | null
  hasMore: boolean
  page: number
  loadMore: () => void
  refetch: () => void
  setPostType: (type: FeedPostType | undefined) => void
}

export function useFeed(options: UseFeedOptions = {}): UseFeedReturn {
  const { pageSize = 20, enabled = true } = options
  const [postType, setPostType] = useState<FeedPostType | undefined>(options.postType)
  const [company] = useState<string | undefined>(options.company)

  // Use React Query's built-in infinite query pattern would be ideal,
  // but for simplicity, we'll use a single page query
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['feed', postType, company, pageSize],
    queryFn: () =>
      feedApi.list({
        post_type: postType,
        company,
        page: 1,
        page_size: pageSize,
      }),
    enabled,
    staleTime: 0, // Always fetch fresh data
  })

  const handleRefetch = useCallback(() => {
    refetch()
  }, [refetch])

  const handleSetPostType = useCallback((type: FeedPostType | undefined) => {
    setPostType(type)
  }, [])

  // Derive posts directly from data to avoid stale state issues
  const posts = data?.results || []
  const totalCount = data?.count || 0
  const hasMore = !!data?.next

  return {
    posts,
    totalCount,
    isLoading: isLoading || isFetching,
    error: error ? 'Failed to load feed' : null,
    hasMore,
    page: 1,
    loadMore: handleRefetch, // For now, just refetch (can implement proper pagination later)
    refetch: handleRefetch,
    setPostType: handleSetPostType,
  }
}

// =============================================================================
// Feed Summary Hook (for dashboard widget)
// =============================================================================

interface UseFeedSummaryOptions {
  limit?: number
}

export function useFeedSummary(options: UseFeedSummaryOptions = {}) {
  const { limit = 5 } = options

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['feed-summary', limit],
    queryFn: () => feedApi.list({ page_size: limit }),
    staleTime: 0, // Always fetch fresh data
  })

  return {
    posts: data?.results || [],
    isLoading: isLoading || isFetching,
    error: error ? 'Failed to load feed' : null,
    refetch,
  }
}

// =============================================================================
// Single Feed Post Hook
// =============================================================================

export function useFeedPost(postId: string | undefined) {
  return useQuery({
    queryKey: ['feed-post', postId],
    queryFn: () => feedApi.get(postId!),
    enabled: !!postId,
  })
}

// =============================================================================
// My Posts Hook (for managing own posts)
// =============================================================================

interface UseMyPostsOptions {
  status?: FeedPostStatus
}

export function useMyPosts(options: UseMyPostsOptions = {}) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['my-posts', options.status],
    queryFn: () => feedApi.listMyPosts({ status: options.status }),
  })

  return {
    posts: data || [],
    isLoading,
    error: error ? 'Failed to load posts' : null,
    refetch,
  }
}

export function useMyPost(postId: string | undefined) {
  return useQuery({
    queryKey: ['my-post', postId],
    queryFn: () => feedApi.getMyPost(postId!),
    enabled: !!postId,
  })
}

// =============================================================================
// Feed Mutations
// =============================================================================

export function useCreateFeedPost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: FeedPostCreateInput | FormData) => feedApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      queryClient.invalidateQueries({ queryKey: ['feed-summary'] })
      queryClient.invalidateQueries({ queryKey: ['my-posts'] })
    },
  })
}

export function useUpdateFeedPost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ postId, input }: { postId: string; input: FeedPostUpdateInput }) =>
      feedApi.update(postId, input),
    onSuccess: (_, { postId }) => {
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      queryClient.invalidateQueries({ queryKey: ['feed-summary'] })
      queryClient.invalidateQueries({ queryKey: ['feed-post', postId] })
      queryClient.invalidateQueries({ queryKey: ['my-posts'] })
      queryClient.invalidateQueries({ queryKey: ['my-post', postId] })
    },
  })
}

export function useDeleteFeedPost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (postId: string) => feedApi.delete(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      queryClient.invalidateQueries({ queryKey: ['feed-summary'] })
      queryClient.invalidateQueries({ queryKey: ['my-posts'] })
    },
  })
}

// =============================================================================
// Comment Hooks
// =============================================================================

interface UseCommentsOptions {
  contentType: string
  objectId: string
  enabled?: boolean
}

interface UseCommentsReturn {
  comments: Comment[]
  totalCount: number
  isLoading: boolean
  error: string | null
  hasMore: boolean
  page: number
  loadMore: () => void
  refetch: () => void
}

export function useComments(options: UseCommentsOptions): UseCommentsReturn {
  const { contentType, objectId, enabled = true } = options
  const [comments, setComments] = useState<Comment[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [totalCount, setTotalCount] = useState(0)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['comments', contentType, objectId, page],
    queryFn: () =>
      commentApi.list({
        content_type: contentType,
        object_id: objectId,
        page,
      }),
    enabled: enabled && !!contentType && !!objectId,
  })

  useEffect(() => {
    if (data) {
      if (page === 1) {
        setComments(data.results)
      } else {
        setComments((prev) => [...prev, ...data.results])
      }
      setTotalCount(data.count)
      setHasMore(!!data.next)
    }
  }, [data, page])

  // Reset when object changes
  useEffect(() => {
    setPage(1)
    setComments([])
  }, [contentType, objectId])

  const loadMore = useCallback(() => {
    if (hasMore && !isLoading) {
      setPage((p) => p + 1)
    }
  }, [hasMore, isLoading])

  const handleRefetch = useCallback(() => {
    setPage(1)
    setComments([])
    refetch()
  }, [refetch])

  return {
    comments,
    totalCount,
    isLoading,
    error: error ? 'Failed to load comments' : null,
    hasMore,
    page,
    loadMore,
    refetch: handleRefetch,
  }
}

export function useCreateComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CommentCreateInput) => commentApi.create(input),
    onSuccess: (_, { content_type, object_id }) => {
      queryClient.invalidateQueries({ queryKey: ['comments', content_type, object_id] })
    },
  })
}

export function useUpdateComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ commentId, input }: { commentId: string; input: CommentUpdateInput }) =>
      commentApi.update(commentId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments'] })
    },
  })
}

export function useDeleteComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (commentId: string) => commentApi.delete(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments'] })
    },
  })
}
