// Central type definitions for Oneo Platform
// These types should match the Django models and API responses

// ============================================================================
// User & Authentication
// ============================================================================

export enum UserRole {
  CANDIDATE = 'candidate',
  CLIENT = 'client',
  RECRUITER = 'recruiter',
  ADMIN = 'admin',
}

export interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  phone: string | null
  avatar: string | null
  role: UserRole
  is_verified: boolean
  created_at: string
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  password_confirm: string
  first_name: string
  last_name: string
  phone?: string
}

// ============================================================================
// Candidate
// ============================================================================

export enum Seniority {
  INTERN = 'intern',
  JUNIOR = 'junior',
  MID = 'mid',
  SENIOR = 'senior',
  LEAD = 'lead',
  PRINCIPAL = 'principal',
  EXECUTIVE = 'executive',
}

export enum WorkPreference {
  REMOTE = 'remote',
  HYBRID = 'hybrid',
  ONSITE = 'onsite',
  FLEXIBLE = 'flexible',
}

export enum Currency {
  ZAR = 'ZAR',
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
}

export enum ProfileVisibility {
  PRIVATE = 'private',
  PUBLIC_SANITISED = 'public_sanitised',
}

export enum SkillCategory {
  LEADERSHIP = 'leadership',
  COMMUNICATION = 'communication',
  PROJECT_MANAGEMENT = 'project_management',
  ANALYTICAL = 'analytical',
  INTERPERSONAL = 'interpersonal',
  BUSINESS = 'business',
  DOMAIN = 'domain',
  OTHER = 'other',
}

export enum TechnologyCategory {
  LANGUAGE = 'language',
  FRAMEWORK = 'framework',
  DATABASE = 'database',
  CLOUD = 'cloud',
  DEVOPS = 'devops',
  TOOL = 'tool',
  OTHER = 'other',
}

export interface Skill {
  id: string
  name: string
  category: string
  slug: string
}

export interface Technology {
  id: string
  name: string
  slug: string
  category: TechnologyCategory
}

export interface Industry {
  id: string
  name: string
  slug: string
}

export interface CandidateProfile {
  id: number
  slug: string
  // User info (flattened from user)
  first_name: string
  last_name: string
  full_name: string
  email: string
  phone: string | null
  avatar: string | null
  // Professional info
  professional_title: string
  headline: string
  seniority: Seniority | ''
  professional_summary: string
  years_of_experience: number | null
  // Location
  city: string
  country: string
  region: string
  city_rel: { id: number; name: string; country: { id: number; name: string; code: string } } | null
  country_rel: { id: number; name: string; code: string } | null
  location: string
  // Work preferences
  work_preference: WorkPreference | ''
  willing_to_relocate: boolean
  preferred_locations: string[]
  // Compensation
  salary_expectation_min: number | null
  salary_expectation_max: number | null
  salary_currency: Currency
  notice_period_days: number | null
  // Portfolio & Resume
  portfolio_links: PortfolioLink[]
  resume_url: string | null
  // Skills & Industries
  skills: Skill[]
  industries: Industry[]
  // Experience & Education
  experiences?: Experience[]
  education?: Education[]
  // Visibility & Completeness
  visibility: ProfileVisibility
  profile_completeness: number
  // Timestamps
  created_at: string
  updated_at: string
}

// Sanitized profile for public directory listings
export interface CandidateProfileSanitized {
  id: number
  slug: string
  initials: string
  professional_title: string
  headline: string
  seniority: Seniority | ''
  professional_summary: string
  years_of_experience: number | null
  city: string
  country: string
  location: string
  work_preference: WorkPreference | ''
  willing_to_relocate: boolean
  skills: Skill[]
  industries: Industry[]
  profile_completeness: number
}

// Admin/recruiter candidate list item
export interface CandidateAdminListItem {
  id: number
  slug: string
  initials: string
  full_name: string
  email: string
  professional_title: string
  headline: string
  seniority: Seniority | ''
  location: string
  city: string
  country: string
  years_of_experience: number | null
  work_preference: WorkPreference | ''
  visibility: ProfileVisibility
  profile_completeness: number
  created_at: string
  updated_at: string
}

export interface PortfolioLink {
  url: string
  title: string
  description?: string
}

export interface Experience {
  id: string
  job_title: string
  company_name: string
  company_size: string
  industry: Industry | null
  start_date: string
  end_date: string | null
  is_current: boolean
  description: string
  achievements: string
  technologies_used: string[]
  technologies: Technology[]
  skills: Skill[]
  order: number
  created_at: string
  updated_at: string
}

export interface ExperienceInput {
  job_title: string
  company_name: string
  company_size?: string
  industry_id?: string | null
  start_date: string
  end_date?: string | null
  is_current?: boolean
  description?: string
  achievements?: string
  technologies_used?: string[]
  technology_ids?: string[]
  skill_ids?: string[]
  order?: number
}

export interface Education {
  id: string
  institution: string
  degree: string
  field_of_study: string
  start_date: string
  end_date: string | null
  is_current: boolean
  grade: string
  description: string
  order: number
  created_at: string
  updated_at: string
}

export interface EducationInput {
  institution: string
  degree: string
  field_of_study: string
  start_date: string
  end_date?: string | null
  is_current?: boolean
  grade?: string
  description?: string
  order?: number
}

// ============================================================================
// Company
// ============================================================================

export enum CompanySize {
  SIZE_1_10 = '1-10',
  SIZE_11_50 = '11-50',
  SIZE_51_200 = '51-200',
  SIZE_201_500 = '201-500',
  SIZE_501_1000 = '501-1000',
  SIZE_1000_PLUS = '1000+',
}

export enum FundingStage {
  BOOTSTRAPPED = 'bootstrapped',
  SEED = 'seed',
  SERIES_A = 'series_a',
  SERIES_B = 'series_b',
  SERIES_C = 'series_c',
  SERIES_D_PLUS = 'series_d_plus',
  PUBLIC = 'public',
}

export enum CompanyUserRole {
  ADMIN = 'admin',
  EDITOR = 'editor',
  VIEWER = 'viewer',
}

export enum RemoteWorkPolicy {
  FULLY_REMOTE = 'fully_remote',
  REMOTE_FIRST = 'remote_first',
  HYBRID = 'hybrid',
  OFFICE_FIRST = 'office_first',
  OFFICE_ONLY = 'office_only',
}

export interface Country {
  id: number
  name: string
  code: string
}

export interface City {
  id: number
  name: string
  country: Country
}

export interface Company {
  id: string
  name: string
  slug: string
  logo: string | null
  tagline: string
  description: string
  industry: Industry | null
  company_size: CompanySize | ''
  founded_year: number | null
  funding_stage: FundingStage | ''
  website_url: string
  linkedin_url: string
  headquarters_city: City | null
  headquarters_country: Country | null
  headquarters_location: string
  locations: CompanyLocation[]
  culture_description: string
  values: string[]
  benefits: BenefitCategory[]
  technologies: Technology[]
  remote_work_policy: RemoteWorkPolicy | ''
  // Legal/Registration
  legal_name: string
  registration_number: string
  vat_number: string
  // Billing
  billing_address: string
  billing_city: string
  billing_country: Country | null
  billing_postal_code: string
  billing_contact_name: string
  billing_contact_email: string
  billing_contact_phone: string
  // Meta
  is_published: boolean
  created_at: string
  updated_at: string
}

export interface AdminCompanyListItem {
  id: string
  name: string
  slug: string
  logo: string | null
  tagline: string
  industry: Industry | null
  company_size: CompanySize | ''
  headquarters_location: string
  is_published: boolean
  created_at: string
  jobs_total: number
  jobs_draft: number
  jobs_published: number
  jobs_closed: number
  jobs_filled: number
}

export interface CompanyInput {
  name?: string
  logo?: File | null
  tagline?: string
  description?: string
  industry_id?: string | null
  company_size?: CompanySize | ''
  founded_year?: number | null
  funding_stage?: FundingStage | ''
  website_url?: string
  linkedin_url?: string
  headquarters_city_id?: number | null
  headquarters_country_id?: number | null
  locations?: CompanyLocation[]
  culture_description?: string
  values?: string[]
  benefits?: BenefitCategory[]
  technology_ids?: string[]
  remote_work_policy?: RemoteWorkPolicy | ''
  // Legal/Registration
  legal_name?: string
  registration_number?: string
  vat_number?: string
  // Billing
  billing_address?: string
  billing_city?: string
  billing_country_id?: number | null
  billing_postal_code?: string
  billing_contact_name?: string
  billing_contact_email?: string
  billing_contact_phone?: string
  // Meta
  is_published?: boolean
}

export interface CompanyLocation {
  city: string
  country: string
  is_headquarters: boolean
}

export interface BenefitCategory {
  category: string
  items: string[]
}

export interface CompanyUser {
  id: string
  user: string
  user_email: string
  user_first_name: string
  user_last_name: string
  user_avatar: string | null
  user_phone: string | null
  company: string
  role: CompanyUserRole
  job_title: string
  joined_at: string
  invited_by: string | null
  invited_by_email: string | null
  is_active: boolean
}

export interface CompanyUserInvite {
  email: string
  role: CompanyUserRole
}

export interface CompanyUserUpdate {
  role?: CompanyUserRole
  job_title?: string
  is_active?: boolean
  // User profile fields
  user_first_name?: string
  user_last_name?: string
  user_phone?: string
}

// ============================================================================
// Jobs
// ============================================================================

export enum JobStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  CLOSED = 'closed',
  FILLED = 'filled',
  ARCHIVED = 'archived',
}

export enum JobType {
  FULL_TIME = 'full_time',
  PART_TIME = 'part_time',
  CONTRACT = 'contract',
  FREELANCE = 'freelance',
}

export enum WorkMode {
  REMOTE = 'remote',
  HYBRID = 'hybrid',
  ONSITE = 'onsite',
}

export enum Department {
  ENGINEERING = 'engineering',
  MARKETING = 'marketing',
  SALES = 'sales',
  OPERATIONS = 'operations',
  DESIGN = 'design',
  PRODUCT = 'product',
  HR = 'hr',
  FINANCE = 'finance',
}

export interface JobListItem {
  id: string
  slug: string
  title: string
  company: Company
  seniority: Seniority
  job_type: JobType
  status: JobStatus
  department: Department
  summary: string
  location_city: City | null
  location_country: Country | null
  location_display: string
  work_mode: WorkMode
  salary_min: number | null
  salary_max: number | null
  salary_currency: Currency
  salary_visible: boolean
  salary_display: string
  equity_offered: boolean
  required_skills: Skill[]
  technologies: Technology[]
  views_count: number
  applications_count: number
  published_at: string | null
  application_deadline: string | null
  created_at: string
}

export interface InterviewStage {
  name: string
  order: number
  description?: string
  assessment_url?: string
  assessment_name?: string
}

export interface Job extends JobListItem {
  created_by: User | null
  assigned_recruiter: User | null
  description: string
  requirements: string
  nice_to_haves: string
  responsibilities: string
  remote_regions: string[]
  benefits: BenefitCategory[]
  nice_to_have_skills: Skill[]
  interview_stages: InterviewStage[]
  questions: ApplicationQuestion[]
  updated_at: string
}

export interface JobInput {
  title: string
  seniority?: Seniority
  job_type?: JobType
  department?: Department
  summary?: string
  description?: string
  requirements?: string
  nice_to_haves?: string
  responsibilities?: string
  location_city_id?: number | null
  location_country_id?: number | null
  work_mode?: WorkMode
  remote_regions?: string[]
  salary_min?: number | null
  salary_max?: number | null
  salary_currency?: Currency
  salary_visible?: boolean
  equity_offered?: boolean
  benefits?: BenefitCategory[]
  interview_stages?: InterviewStage[]
  questions?: ApplicationQuestionInput[]
  question_template_id?: string | null
  required_skill_ids?: string[]
  nice_to_have_skill_ids?: string[]
  technology_ids?: string[]
  application_deadline?: string | null
}

export interface JobFilters {
  seniority?: Seniority
  job_type?: JobType
  work_mode?: WorkMode
  department?: Department
  country?: string // country code
  salary_min?: number
  salary_max?: number
  skills?: string // comma-separated IDs
  technologies?: string // comma-separated IDs
  company?: string // company slug
  search?: string
  sort?: string
}

// ============================================================================
// Applications
// ============================================================================

export enum ApplicationStatus {
  APPLIED = 'applied',
  SHORTLISTED = 'shortlisted',
  IN_PROGRESS = 'in_progress',
  OFFER_MADE = 'offer_made',
  OFFER_ACCEPTED = 'offer_accepted',
  REJECTED = 'rejected',
}

export enum RejectionReason {
  INTERNAL_REJECTION = 'internal_rejection',
  CLIENT_REJECTION = 'client_rejection',
  WITHDRAWN = 'withdrawn',
  INVALID_SHORTLIST = 'invalid_shortlist',
  CANDIDATE_NOT_INTERESTED = 'candidate_not_interested',
}

export const RejectionReasonLabels: Record<RejectionReason, string> = {
  [RejectionReason.INTERNAL_REJECTION]: 'Internal Rejection',
  [RejectionReason.CLIENT_REJECTION]: 'Client Rejection',
  [RejectionReason.WITHDRAWN]: 'Withdrawn',
  [RejectionReason.INVALID_SHORTLIST]: 'Invalid Shortlist',
  [RejectionReason.CANDIDATE_NOT_INTERESTED]: 'Candidate Not Interested',
}

export enum ApplicationSource {
  DIRECT = 'direct',
  REFERRAL = 'referral',
  RECRUITER = 'recruiter',
}

export enum QuestionType {
  TEXT = 'text',
  TEXTAREA = 'textarea',
  SELECT = 'select',
  MULTI_SELECT = 'multi_select',
  FILE = 'file',
  EXTERNAL_LINK = 'external_link',
}

export interface StageNote {
  notes: string
  updated_at: string
}

export interface OfferDetails {
  salary?: number | null
  currency?: string
  start_date?: string | null
  notes?: string
  benefits?: string
  equity?: string
}

export interface Application {
  id: string
  job: Job
  candidate: CandidateProfile
  covering_statement: string
  resume_url: string | null
  status: ApplicationStatus
  current_stage_order: number
  current_stage_name: string
  stage_notes: Record<string, StageNote>
  interview_stages: InterviewStage[]
  // Offer fields
  offer_details: OfferDetails
  offer_made_at: string | null
  offer_accepted_at: string | null
  final_offer_details: OfferDetails
  // Rejection fields
  rejection_reason: RejectionReason | null
  rejection_feedback: string | null
  rejected_at: string | null
  // Other
  feedback: string | null
  source: ApplicationSource
  referrer: User | null
  answers: ApplicationAnswer[]
  applied_at: string
  shortlisted_at: string | null
  last_status_change: string
}

// Candidate's view of their applications (lighter weight)
export interface CandidateApplication {
  id: string
  job: Job
  status: ApplicationStatus
  current_stage_order: number
  current_stage_name: string
  interview_stages: InterviewStage[]
  covering_statement: string
  applied_at: string
  last_status_change: string
}

// Minimal application info for listing (company view)
export interface ApplicationListItem {
  id: string
  job: string
  job_title: string
  job_slug: string
  company_name: string
  company_logo: string | null
  candidate: string
  candidate_name: string
  candidate_email: string
  status: ApplicationStatus
  current_stage_order: number
  current_stage_name: string
  source: ApplicationSource
  applied_at: string
  shortlisted_at: string | null
  last_status_change: string
  rejection_reason: RejectionReason | null
}

export interface ApplicationQuestion {
  id: string
  job: string
  question_text: string
  question_type: QuestionType
  options: string[]
  placeholder?: string
  helper_text?: string
  is_required: boolean
  order: number
}

export interface ApplicationQuestionInput {
  question_text: string
  question_type: QuestionType
  options?: string[]
  placeholder?: string
  helper_text?: string
  is_required: boolean
  order?: number
}

export interface ApplicationAnswer {
  id: string
  application?: string
  question: ApplicationQuestion
  answer_text: string
  answer_file: string | null
  created_at?: string
}

export interface ApplicationAnswerInput {
  question_id: string
  answer_text?: string
  answer_file?: File | null
}

export interface ApplicationStage {
  id: string
  job: string
  name: string
  order: number
  is_default: boolean
  color: string
}

// ============================================================================
// Question Templates
// ============================================================================

export interface TemplateQuestion {
  id: string
  template: string
  question_text: string
  question_type: QuestionType
  options: string[]
  placeholder?: string
  helper_text?: string
  is_required: boolean
  order: number
}

export interface TemplateQuestionInput {
  id?: string
  question_text: string
  question_type: QuestionType
  options?: string[]
  placeholder?: string
  helper_text?: string
  is_required: boolean
  order?: number
}

export interface QuestionTemplate {
  id: string
  company: string
  name: string
  description: string
  is_active: boolean
  questions: TemplateQuestion[]
  questions_count?: number
  created_by: string | null
  created_by_name: string | null
  created_at: string
  updated_at: string
}

export interface QuestionTemplateInput {
  name: string
  description?: string
  is_active?: boolean
  questions?: TemplateQuestionInput[]
}

// ============================================================================
// Activity Log
// ============================================================================

export enum ActivityType {
  APPLIED = 'applied',
  SHORTLISTED = 'shortlisted',
  STAGE_CHANGED = 'stage_changed',
  OFFER_MADE = 'offer_made',
  OFFER_UPDATED = 'offer_updated',
  OFFER_ACCEPTED = 'offer_accepted',
  REJECTED = 'rejected',
  WITHDRAWN = 'withdrawn',
  APPLICATION_VIEWED = 'application_viewed',
}

export interface ActivityNote {
  id: string
  author: string | null
  author_name: string | null
  author_email: string | null
  author_avatar: string | null
  content: string
  created_at: string
  updated_at: string
}

export interface ActivityLogEntry {
  id: string
  application: string
  performed_by: string | null
  performed_by_name: string | null
  performed_by_email: string | null
  performed_by_avatar: string | null
  activity_type: ActivityType
  previous_status: ApplicationStatus | null
  new_status: ApplicationStatus | null
  previous_stage: number | null
  new_stage: number | null
  stage_name: string | null
  metadata: Record<string, unknown>
  created_at: string
  notes: ActivityNote[]
  notes_count: number
}

// ============================================================================
// Bookings
// ============================================================================

export enum MeetingTypeEnum {
  CANDIDATE_INTRO = 'candidate_intro',
  CLIENT_DISCOVERY = 'client_discovery',
  INTERVIEW = 'interview',
}

export enum BookingStatus {
  SCHEDULED = 'scheduled',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
}

export interface MeetingType {
  id: string
  name: string
  slug: string
  type: MeetingTypeEnum
  duration_minutes: number
  buffer_before_minutes: number
  buffer_after_minutes: number
  calendar_id: string
  is_active: boolean
  description: string
  confirmation_message: string
  qualification_questions: QualificationQuestion[]
  assigned_to: User | null
}

export interface QualificationQuestion {
  question: string
  type: string
  required: boolean
}

export interface Booking {
  id: string
  meeting_type: MeetingType
  organizer: User
  candidate: User | null
  client_user: User | null
  related_job: Job | null
  related_application: Application | null
  title: string
  description: string
  scheduled_at: string
  duration_minutes: number
  meeting_url: string | null
  calendar_event_id: string | null
  attendee_name: string | null
  attendee_email: string | null
  attendee_company: string | null
  attendee_topic: string | null
  status: BookingStatus
  client_proposed_times: string[]
  candidate_selected_time: string | null
  created_at: string
  cancelled_at: string | null
  cancellation_reason: string | null
}

// ============================================================================
// API Response Types
// ============================================================================

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface ApiError {
  error: {
    code: string
    message: string
    details?: Record<string, string[]>
  }
}

// ============================================================================
// Form Types
// ============================================================================

export interface FormField {
  name: string
  label: string
  type: string
  placeholder?: string
  required?: boolean
  options?: { value: string; label: string }[]
}
