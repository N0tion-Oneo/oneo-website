// CMS Types - Content Management System

// ============================================================================
// Enums
// ============================================================================

export enum ContentStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export enum LegalDocumentType {
  TERMS = 'terms',
  PRIVACY = 'privacy',
  COOKIES = 'cookies',
  ACCEPTABLE_USE = 'acceptable_use',
  OTHER = 'other',
}

export enum ServiceTypeApplicability {
  ALL = 'all',
  RETAINED = 'retained',
  HEADHUNTING = 'headhunting',
}

export const ContentStatusLabels: Record<ContentStatus, string> = {
  [ContentStatus.DRAFT]: 'Draft',
  [ContentStatus.PUBLISHED]: 'Published',
  [ContentStatus.ARCHIVED]: 'Archived',
}

export const LegalDocumentTypeLabels: Record<LegalDocumentType, string> = {
  [LegalDocumentType.TERMS]: 'Terms & Conditions',
  [LegalDocumentType.PRIVACY]: 'Privacy Policy',
  [LegalDocumentType.COOKIES]: 'Cookie Policy',
  [LegalDocumentType.ACCEPTABLE_USE]: 'Acceptable Use Policy',
  [LegalDocumentType.OTHER]: 'Other Legal Document',
}

export const ServiceTypeApplicabilityLabels: Record<ServiceTypeApplicability, string> = {
  [ServiceTypeApplicability.ALL]: 'All Service Types',
  [ServiceTypeApplicability.RETAINED]: 'Retained Only',
  [ServiceTypeApplicability.HEADHUNTING]: 'Headhunting Only',
}

// Legacy alias
export const PageType = LegalDocumentType
export const PageTypeLabels = LegalDocumentTypeLabels

// ============================================================================
// Editor.js Block Types
// ============================================================================

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

// ============================================================================
// Legal Document (formerly Page)
// ============================================================================

export interface CMSLegalDocument {
  id: string
  title: string
  slug: string
  document_type: LegalDocumentType
  service_type: ServiceTypeApplicability
  content: EditorJSData
  // Version tracking
  version: string
  effective_date: string | null
  // SEO
  meta_title: string
  meta_description: string
  og_image: string | null
  // Status
  status: ContentStatus
  published_at: string | null
  // Tracking
  created_by: string | null
  created_by_name: string | null
  updated_by: string | null
  updated_by_name: string | null
  created_at: string
  updated_at: string
}

export interface CMSLegalDocumentInput {
  title: string
  slug?: string
  document_type?: LegalDocumentType
  service_type?: ServiceTypeApplicability
  content?: EditorJSData
  version?: string
  effective_date?: string | null
  meta_title?: string
  meta_description?: string
  og_image?: File | null
  status?: ContentStatus
  published_at?: string | null
}

export interface CMSLegalDocumentListItem {
  id: string
  title: string
  slug: string
  document_type: LegalDocumentType
  service_type: ServiceTypeApplicability
  status: ContentStatus
  version: string
  effective_date: string | null
  updated_at: string
}

// Legacy aliases
export type CMSPage = CMSLegalDocument
export type CMSPageInput = CMSLegalDocumentInput
export type CMSPageListItem = CMSLegalDocumentListItem

// ============================================================================
// Blog Post
// ============================================================================

export interface CMSBlogPost {
  id: string
  title: string
  slug: string
  content: EditorJSData
  excerpt: string
  // Media
  featured_image: string | null
  featured_image_alt: string
  // Categorization
  category: string
  tags: string[]
  // SEO
  meta_title: string
  meta_description: string
  og_image: string | null
  // Status
  status: ContentStatus
  is_featured: boolean
  // Author
  author: string | null
  author_name: string | null
  // Dates
  published_at: string | null
  created_at: string
  updated_at: string
  // Analytics
  view_count: number
  // FAQs assigned to this post
  faqs?: CMSEmbeddedFAQ[]
  faq_ids?: string[]
}

export interface CMSBlogPostInput {
  title: string
  slug?: string
  content?: EditorJSData
  excerpt?: string
  featured_image?: File | null
  featured_image_alt?: string
  category?: string
  tags?: string[]
  meta_title?: string
  meta_description?: string
  og_image?: File | null
  status?: ContentStatus
  is_featured?: boolean
  published_at?: string | null
  faq_ids?: string[]
}

export interface CMSBlogPostListItem {
  id: string
  title: string
  slug: string
  excerpt: string
  featured_image: string | null
  featured_image_alt: string
  category: string
  tags: string[]
  is_featured: boolean
  author_name: string | null
  published_at: string | null
  view_count: number
}

// ============================================================================
// FAQ
// ============================================================================

export interface CMSFAQCategory {
  id: string
  name: string
  slug: string
  description: string
  order: number
  is_active: boolean
  faq_count: number
}

export interface CMSFAQCategoryInput {
  name: string
  slug?: string
  description?: string
  order?: number
  is_active?: boolean
}

export interface CMSFAQ {
  id: string
  question: string
  content: EditorJSData // Answer
  answer_plain: string
  category: string | null
  category_name: string | null
  order: number
  is_active: boolean
  is_featured: boolean
  created_at: string
  updated_at: string
}

export interface CMSFAQInput {
  question: string
  content?: EditorJSData
  answer_plain?: string
  category?: string | null
  order?: number
  is_active?: boolean
  is_featured?: boolean
}

export interface CMSFAQPublic {
  id: string
  question: string
  content: EditorJSData
  category: string | null
  category_name: string | null
  order: number
}

export interface CMSFAQCategoryWithFAQs {
  id: string | null
  name: string
  slug: string
  description: string
  order: number
  faqs: CMSFAQPublic[]
}

// Embedded FAQ for blog/glossary pages
export interface CMSEmbeddedFAQ {
  id: string
  question: string
  content: EditorJSData
  answer_plain: string
}

// ============================================================================
// Glossary
// ============================================================================

export interface CMSGlossaryTerm {
  id: string
  title: string
  slug: string
  content: EditorJSData // Definition
  definition_plain: string
  related_terms: { title: string; slug: string }[]
  // SEO
  meta_title: string
  meta_description: string
  og_image: string | null
  // Status
  is_active: boolean
  created_at: string
  updated_at: string
  // FAQs assigned to this term
  faqs?: CMSEmbeddedFAQ[]
  faq_ids?: string[]
}

export interface CMSGlossaryTermInput {
  title: string
  slug?: string
  content?: EditorJSData
  definition_plain?: string
  related_term_ids?: string[]
  faq_ids?: string[]
  meta_title?: string
  meta_description?: string
  og_image?: File | null
  is_active?: boolean
}

export interface CMSGlossaryTermListItem {
  id: string
  title: string
  slug: string
  definition_plain: string
  is_active: boolean
}

// ============================================================================
// Case Study
// ============================================================================

export interface CMSCaseStudyHighlight {
  label: string
  value: string
}

export interface CMSCaseStudy {
  id: string
  title: string
  slug: string
  content: EditorJSData
  excerpt: string
  // Client
  client_name: string
  industry: string
  highlights: CMSCaseStudyHighlight[]
  // Media
  featured_image: string | null
  client_logo: string | null
  // Testimonial
  testimonial_quote: string
  testimonial_author: string
  testimonial_role: string
  // SEO
  meta_title: string
  meta_description: string
  og_image: string | null
  // Status
  status: ContentStatus
  is_featured: boolean
  published_at: string | null
  created_at: string
  updated_at: string
}

export interface CMSCaseStudyInput {
  title: string
  slug?: string
  content?: EditorJSData
  excerpt?: string
  client_name?: string
  industry?: string
  highlights?: CMSCaseStudyHighlight[]
  featured_image?: File | null
  client_logo?: File | null
  testimonial_quote?: string
  testimonial_author?: string
  testimonial_role?: string
  meta_title?: string
  meta_description?: string
  og_image?: File | null
  status?: ContentStatus
  is_featured?: boolean
  published_at?: string | null
}

export interface CMSCaseStudyListItem {
  id: string
  title: string
  slug: string
  excerpt: string
  client_name: string
  industry: string
  featured_image: string | null
  client_logo: string | null
  is_featured: boolean
  status: ContentStatus
  published_at: string | null
}

// ============================================================================
// Contact Submission (now backed by Lead model with source='inbound')
// ============================================================================

export interface CMSContactSubmission {
  id: string
  name: string
  email: string
  phone: string
  job_title: string
  company_name: string
  company_website: string
  company_size: string
  industry_name: string | null
  onboarding_stage: {
    id: number
    name: string
    slug: string
    color: string
    order: number
  } | null
  source: string
  source_detail: string
  source_page: string
  subject: string
  is_read: boolean
  is_replied: boolean
  notes: string
  assigned_to: {
    id: string
    name: string
    email: string
    avatar: string | null
  } | null
  is_converted: boolean
  converted_at: string | null
  created_at: string
  updated_at: string
}

export interface CMSContactSubmissionInput {
  name: string
  email: string
  phone?: string
  company?: string
  subject?: string
  message: string
  source_page?: string
}

export interface CMSContactSubmissionUpdate {
  is_read?: boolean
  is_replied?: boolean
  notes?: string
}

// ============================================================================
// Newsletter Subscriber
// ============================================================================

export interface CMSNewsletterSubscriber {
  id: string
  email: string
  name: string
  is_active: boolean
  confirmed_at: string | null
  unsubscribed_at: string | null
  source: string
  created_at: string
}

export interface CMSNewsletterSubscribeInput {
  email: string
  name?: string
  source?: string
}

// ============================================================================
// Site Settings
// ============================================================================

export interface CMSSiteSettings {
  id: string
  // Analytics
  ga_measurement_id: string
  gtm_container_id: string
  enable_analytics: boolean
  // Robots.txt
  robots_txt_content: string
  // LLMs.txt
  llms_txt_content: string
  // Sitemap
  sitemap_enabled: boolean
  sitemap_include_pages: boolean
  sitemap_include_blog: boolean
  sitemap_include_jobs: boolean
  sitemap_include_candidates: boolean
  sitemap_include_companies: boolean
  sitemap_include_glossary: boolean
  sitemap_include_case_studies: boolean
  // Site meta
  site_name: string
  site_url: string
  site_description: string
  // Timestamps
  created_at: string
  updated_at: string
}

export interface CMSAnalyticsSettings {
  ga_measurement_id: string
  gtm_container_id: string
  enable_analytics: boolean
}

export interface CMSRobotsTxtSettings {
  robots_txt_content: string
}

export interface CMSLLMsTxtSettings {
  llms_txt_content: string
}

export interface CMSSitemapSettings {
  sitemap_enabled: boolean
  sitemap_include_pages: boolean
  sitemap_include_blog: boolean
  sitemap_include_jobs: boolean
  sitemap_include_candidates: boolean
  sitemap_include_companies: boolean
  sitemap_include_glossary: boolean
  sitemap_include_case_studies: boolean
  site_url: string
}

// ============================================================================
// SEO - Redirects
// ============================================================================

export enum RedirectType {
  PERMANENT = '301',
  TEMPORARY = '302',
  GONE = '410',
}

export const RedirectTypeLabels: Record<RedirectType, string> = {
  [RedirectType.PERMANENT]: '301 Permanent Redirect',
  [RedirectType.TEMPORARY]: '302 Temporary Redirect',
  [RedirectType.GONE]: '410 Gone (Deleted)',
}

export interface CMSRedirect {
  id: string
  source_path: string
  destination_url: string
  redirect_type: RedirectType
  is_active: boolean
  is_regex: boolean
  is_auto_generated: boolean
  hit_count: number
  created_at: string
  updated_at: string
}

export interface CMSRedirectInput {
  source_path: string
  destination_url?: string
  redirect_type?: RedirectType
  is_active?: boolean
  is_regex?: boolean
}

// ============================================================================
// SEO - Meta Tag Defaults
// ============================================================================

export interface CMSMetaTagDefaults {
  id: string
  company_name: string
  tagline: string
  default_title_suffix: string
  resolved_title_suffix: string
  default_description: string
  default_og_image: string | null
  default_og_image_url: string | null
  google_site_verification: string
  bing_site_verification: string
  google_analytics_id: string
  google_tag_manager_id: string
  updated_at: string
}

export interface CMSMetaTagDefaultsInput {
  company_name?: string
  tagline?: string
  default_title_suffix?: string
  default_description?: string
  default_og_image?: File | null
  google_site_verification?: string
  bing_site_verification?: string
  google_analytics_id?: string
  google_tag_manager_id?: string
}

// ============================================================================
// Page SEO Settings
// ============================================================================

export interface CMSPageSEO {
  id: string
  path: string
  name: string
  title: string
  description: string
  og_image: string | null
  og_image_url: string | null
  title_template: string
  description_template: string
  noindex: boolean
  canonical_url: string
  include_in_sitemap: boolean
  sitemap_priority: number
  is_active: boolean
  is_system: boolean
  created_at: string
  updated_at: string
}

export interface CMSPageSEOInput {
  path: string
  name: string
  title?: string
  description?: string
  og_image?: File | null
  title_template?: string
  description_template?: string
  noindex?: boolean
  canonical_url?: string
  include_in_sitemap?: boolean
  sitemap_priority?: number
  is_active?: boolean
}

export interface CMSPageSEOPublic {
  path: string
  title: string
  description: string
  og_image_url: string | null
  title_template: string
  description_template: string
  noindex: boolean
  canonical_url: string
}

