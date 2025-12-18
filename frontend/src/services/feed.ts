/**
 * Feed API Service
 *
 * Handles all API calls for the private feed system.
 */
import api from './api'
import type {
  FeedPost,
  FeedPostListItem,
  FeedPostCreateInput,
  FeedPostUpdateInput,
  FeedListResponse,
  FeedFilters,
  MyPostsFilters,
  Comment,
  CommentCreateInput,
  CommentUpdateInput,
  CommentListResponse,
  CommentFilters,
} from '@/types'

const FEED_BASE = '/feed'

/**
 * Convert object to FormData for file uploads
 */
function toFormData(data: Record<string, unknown>): FormData {
  const formData = new FormData()

  Object.entries(data).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return
    }

    if (value instanceof File) {
      formData.append(key, value)
    } else if (typeof value === 'object') {
      formData.append(key, JSON.stringify(value))
    } else {
      formData.append(key, String(value))
    }
  })

  return formData
}

// =============================================================================
// Feed API
// =============================================================================

export const feedApi = {
  /**
   * List published feed posts (all authenticated users)
   */
  list: async (filters?: FeedFilters): Promise<FeedListResponse> => {
    const params = new URLSearchParams()
    if (filters?.post_type) params.append('post_type', filters.post_type)
    if (filters?.company) params.append('company', filters.company)
    if (filters?.page) params.append('page', String(filters.page))
    if (filters?.page_size) params.append('page_size', String(filters.page_size))

    const { data } = await api.get(`${FEED_BASE}/?${params.toString()}`)
    return data
  },

  /**
   * Get a single published feed post
   */
  get: async (postId: string): Promise<FeedPost> => {
    const { data } = await api.get(`${FEED_BASE}/${postId}/`)
    return data
  },

  /**
   * Create a new feed post (clients & staff)
   */
  create: async (input: FeedPostCreateInput | FormData): Promise<FeedPost> => {
    // Handle FormData directly
    if (input instanceof FormData) {
      const { data } = await api.post(
        `${FEED_BASE}/create/`,
        input,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )
      return data
    }

    // Handle object input
    const hasFile = input.featured_image instanceof File

    if (hasFile) {
      const { data } = await api.post(
        `${FEED_BASE}/create/`,
        toFormData(input as Record<string, unknown>),
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )
      return data
    }

    const { data } = await api.post(`${FEED_BASE}/create/`, input)
    return data
  },

  /**
   * Update a feed post (author, company admins/editors, staff)
   */
  update: async (postId: string, input: FeedPostUpdateInput): Promise<FeedPost> => {
    const hasFile = input.featured_image instanceof File

    if (hasFile) {
      const { data } = await api.patch(
        `${FEED_BASE}/${postId}/update/`,
        toFormData(input as Record<string, unknown>),
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )
      return data
    }

    const { data } = await api.patch(`${FEED_BASE}/${postId}/update/`, input)
    return data
  },

  /**
   * Delete a feed post (author, company admins, staff)
   */
  delete: async (postId: string): Promise<void> => {
    await api.delete(`${FEED_BASE}/${postId}/delete/`)
  },

  /**
   * List posts for editing (includes drafts)
   * - Staff: all posts
   * - Clients: their company's posts
   */
  listMyPosts: async (filters?: MyPostsFilters): Promise<FeedPostListItem[]> => {
    const params = new URLSearchParams()
    if (filters?.status) params.append('status', filters.status)

    const { data } = await api.get(`${FEED_BASE}/my/?${params.toString()}`)
    return data
  },

  /**
   * Get a single post for editing (includes drafts)
   */
  getMyPost: async (postId: string): Promise<FeedPost> => {
    const { data } = await api.get(`${FEED_BASE}/my/${postId}/`)
    return data
  },
}

// =============================================================================
// Comment API
// =============================================================================

export const commentApi = {
  /**
   * List comments for a specific object
   */
  list: async (filters: CommentFilters): Promise<CommentListResponse> => {
    const params = new URLSearchParams()
    params.append('content_type', filters.content_type)
    params.append('object_id', filters.object_id)
    if (filters.page) params.append('page', String(filters.page))

    const { data } = await api.get(`${FEED_BASE}/comments/?${params.toString()}`)
    return data
  },

  /**
   * Create a new comment
   */
  create: async (input: CommentCreateInput): Promise<Comment> => {
    const { data } = await api.post(`${FEED_BASE}/comments/create/`, input)
    return data
  },

  /**
   * Update a comment
   */
  update: async (commentId: string, input: CommentUpdateInput): Promise<Comment> => {
    const { data } = await api.patch(`${FEED_BASE}/comments/${commentId}/update/`, input)
    return data
  },

  /**
   * Delete a comment
   */
  delete: async (commentId: string): Promise<void> => {
    await api.delete(`${FEED_BASE}/comments/${commentId}/delete/`)
  },
}

export default feedApi
