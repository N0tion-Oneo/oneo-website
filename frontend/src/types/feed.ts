/**
 * Feed Types
 *
 * Types for the private feed system where clients can post
 * articles, updates, and job announcements appear automatically.
 */

// =============================================================================
// Enums
// =============================================================================

export enum FeedPostType {
  ARTICLE = 'article',
  UPDATE = 'update',
  JOB_ANNOUNCEMENT = 'job_announcement',
}

export enum FeedPostStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
}

// =============================================================================
// Embedded Types
// =============================================================================

export interface FeedCompany {
  id: string
  name: string
  slug: string
  logo: string | null
}

export interface FeedAuthor {
  id: string
  full_name: string
  role: string
}

export interface FeedJob {
  id: string
  title: string
  slug: string
  seniority: string | null
  job_type: string
  work_mode: string
  location_display: string | null
  salary_display: string | null
}

// =============================================================================
// Feed Post Types
// =============================================================================

export interface FeedPost {
  id: string
  post_type: FeedPostType
  post_type_display: string
  title: string
  content: string
  content_blocks: EditorJSData | null
  excerpt: string
  featured_image: string | null
  featured_image_alt: string
  company: FeedCompany
  author: FeedAuthor | null
  job: FeedJob | null
  status: FeedPostStatus
  published_at: string | null
  created_at: string
  updated_at?: string
}

export interface FeedPostListItem {
  id: string
  post_type: FeedPostType
  post_type_display: string
  title: string
  content: string
  excerpt: string
  featured_image: string | null
  featured_image_alt: string
  company: FeedCompany
  author: FeedAuthor | null
  job: FeedJob | null
  status: FeedPostStatus
  published_at: string | null
  created_at: string
  comment_count: number | null
}

// =============================================================================
// Input Types
// =============================================================================

export interface FeedPostCreateInput {
  post_type: FeedPostType
  title?: string
  content?: string
  content_blocks?: EditorJSData
  featured_image?: File | null
  featured_image_alt?: string
  status?: FeedPostStatus
  published_at?: string | null
  company_id?: string
}

export interface FeedPostUpdateInput {
  title?: string
  content?: string
  content_blocks?: EditorJSData
  featured_image?: File | null
  featured_image_alt?: string
  status?: FeedPostStatus
  published_at?: string | null
}

// =============================================================================
// API Response Types
// =============================================================================

export interface FeedListResponse {
  count: number
  next: string | null
  previous: string | null
  results: FeedPostListItem[]
}

export interface FeedFilters {
  post_type?: FeedPostType
  company?: string
  page?: number
  page_size?: number
}

export interface MyPostsFilters {
  status?: FeedPostStatus
}

// =============================================================================
// Editor.js Types (shared with CMS)
// =============================================================================

export interface EditorJSBlock {
  id?: string
  type: string
  data: Record<string, unknown>
}

export interface EditorJSData {
  time?: number
  blocks: EditorJSBlock[]
  version?: string
}

// =============================================================================
// Comment Types
// =============================================================================

export interface CommentAuthor {
  id: string
  full_name: string
  role: string
}

export interface Comment {
  id: string
  content: string
  author: CommentAuthor
  parent: string | null
  reply_count: number
  replies: Comment[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CommentCreateInput {
  content_type: string
  object_id: string
  content: string
  parent?: string | null
}

export interface CommentUpdateInput {
  content: string
}

export interface CommentListResponse {
  count: number
  next: string | null
  previous: string | null
  results: Comment[]
}

export interface CommentFilters {
  content_type: string
  object_id: string
  page?: number
}
