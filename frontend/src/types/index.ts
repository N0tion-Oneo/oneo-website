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
  PUBLIC = 'public',
}

export enum CompanyUserRole {
  ADMIN = 'admin',
  EDITOR = 'editor',
  VIEWER = 'viewer',
}

export interface Company {
  id: string
  name: string
  slug: string
  logo_url: string | null
  tagline: string
  description: string
  industry: Industry
  company_size: CompanySize
  founded_year: number | null
  funding_stage: FundingStage | null
  website_url: string
  linkedin_url: string | null
  headquarters_city: string
  headquarters_country: string
  locations: CompanyLocation[]
  culture_description: string | null
  values: string[]
  benefits: BenefitCategory[]
  tech_stack: string[]
  interview_process: string | null
  remote_work_policy: string | null
  is_published: boolean
  created_at: string
  updated_at: string
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
  user: User
  company: Company
  role: CompanyUserRole
  joined_at: string
  invited_by: User | null
  is_active: boolean
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

export interface Job {
  id: string
  company: Company
  created_by: User
  assigned_recruiter: User | null
  title: string
  slug: string
  seniority: Seniority
  job_type: JobType
  status: JobStatus
  summary: string
  description: string
  requirements: string
  nice_to_haves: string | null
  responsibilities: string
  location_city: string
  location_country: string
  work_mode: WorkMode
  remote_regions: string[]
  salary_min: number | null
  salary_max: number | null
  salary_currency: string
  salary_visible: boolean
  equity_offered: boolean
  benefits: BenefitCategory[]
  required_skills: Skill[]
  nice_to_have_skills: Skill[]
  tech_stack: string[]
  department: Department
  views_count: number
  applications_count: number
  published_at: string | null
  application_deadline: string | null
  created_at: string
  updated_at: string
}

export interface JobFilters {
  seniority?: Seniority
  job_type?: JobType
  work_mode?: WorkMode
  department?: Department
  location?: string
  salary_min?: number
  salary_max?: number
  skills?: string[]
  company?: string
  search?: string
}

// ============================================================================
// Applications
// ============================================================================

export enum ApplicationStatus {
  APPLIED = 'applied',
  SCREENING = 'screening',
  SHORTLISTED = 'shortlisted',
  INTERVIEWING = 'interviewing',
  INTERVIEW_SCHEDULED = 'interview_scheduled',
  INTERVIEW_COMPLETED = 'interview_completed',
  OFFER = 'offer',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  WITHDRAWN = 'withdrawn',
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
}

export interface Application {
  id: string
  job: Job
  candidate: CandidateProfile
  covering_statement: string
  resume_url: string | null
  status: ApplicationStatus
  applied_at: string
  last_status_change: string
  rejection_reason: string | null
  feedback: string | null
  source: ApplicationSource
  referrer: User | null
}

export interface ApplicationQuestion {
  id: string
  job: string
  question_text: string
  question_type: QuestionType
  options: string[]
  is_required: boolean
  order: number
}

export interface ApplicationAnswer {
  id: string
  application: string
  question: ApplicationQuestion
  answer_text: string | null
  answer_file_url: string | null
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
