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
  username: string
  email: string
  first_name: string
  last_name: string
  phone: string | null
  avatar: string | null
  role: UserRole
  is_verified: boolean
  created_at: string
  booking_slug?: string  // For recruiters/admins - their public booking URL slug
}

export interface AssignedUser {
  id: number
  email: string
  first_name: string
  last_name: string
  full_name: string
  booking_slug?: string  // For scheduling with this contact
}

// Staff user for assignment dropdowns (includes avatar)
export interface StaffUser {
  id: number
  email: string
  first_name: string
  last_name: string
  full_name: string
  avatar: string | null
  role: UserRole
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
}

// Lightweight recruiter info for dropdowns
export interface RecruiterListItem {
  id: string
  email: string
  first_name: string
  last_name: string
  full_name: string
  avatar: string | null
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
  years_of_experience: string | null
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
  // Industries
  industries: Industry[]
  // Experience & Education
  experiences?: Experience[]
  education?: Education[]
  // Visibility & Completeness
  visibility: ProfileVisibility
  profile_completeness: number
  // Assigned staff (for admin view)
  assigned_to?: AssignedUser[]
  // Onboarding stage
  onboarding_stage?: OnboardingStageMinimal | null
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
  years_of_experience: string | null
  city: string
  country: string
  location: string
  work_preference: WorkPreference | ''
  willing_to_relocate: boolean
  industries: Industry[]
  profile_completeness: number
}

// Experience for admin list display
export interface ExperienceListItem {
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
  skills: Skill[]
  technologies: Technology[]
  order: number
}

// Education for admin list display
export interface EducationListItem {
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
}

// Admin/recruiter candidate list item (full profile for management)
export interface CandidateAdminListItem {
  id: number
  slug: string
  initials: string
  full_name: string
  email: string
  phone: string | null
  professional_title: string
  headline: string
  seniority: Seniority | ''
  professional_summary: string
  years_of_experience: string | null
  location: string
  city: string
  country: string
  work_preference: WorkPreference | ''
  willing_to_relocate: boolean
  preferred_locations: string[]
  salary_expectation_min: number | null
  salary_expectation_max: number | null
  salary_currency: Currency
  notice_period_days: number | null
  has_resume: boolean
  industries: Industry[]
  experiences: ExperienceListItem[]
  education: EducationListItem[]
  visibility: ProfileVisibility
  profile_completeness: number
  assigned_to: AssignedUser[]
  onboarding_stage: OnboardingStageMinimal | null
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

export enum ServiceType {
  HEADHUNTING = 'headhunting',
  RETAINED = 'retained',
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
  // Assigned staff (for admin view)
  assigned_to?: AssignedUser[]
  // Access permissions
  can_view_all_candidates?: boolean
  // Service type
  service_type: ServiceType | null
  created_at: string
  updated_at: string
}

export interface CompanyJobSummary {
  id: string
  title: string
  slug: string
  status: JobStatus
  applications_count: number
}

export interface AdminCompanySubscription {
  id: string
  status: 'active' | 'paused' | 'terminated' | 'pending'
  service_type: 'retained' | 'headhunting'
  contract_start_date: string | null
  contract_end_date: string | null
  auto_renew: boolean
  billing_mode: 'in_system' | 'external'
  days_until_renewal: number
}

export interface AdminCompanyContact {
  id: string
  name: string
  email: string
}

export interface AdminCompanyPricing {
  monthly_retainer: string | null
  placement_fee: string | null
  csuite_placement_fee: string | null
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
  is_platform: boolean
  service_type: ServiceType | null
  created_at: string
  jobs_total: number
  jobs_draft: number
  jobs_published: number
  jobs_closed: number
  jobs_filled: number
  jobs: CompanyJobSummary[]
  assigned_to: AssignedUser[]
  onboarding_stage: OnboardingStageMinimal | null
  subscription: AdminCompanySubscription | null
  primary_contact: AdminCompanyContact | null
  pricing: AdminCompanyPricing | null
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
  // Assigned staff (admin only)
  assigned_to_ids?: number[]
  // Access permissions (admin only)
  can_view_all_candidates?: boolean
  // Service type
  service_type?: ServiceType
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
  user_role: string | null
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
  assigned_recruiters: User[]
  positions_to_fill: number
  hired_count: number
  remaining_positions: number
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

// Interview Stage Types (typed stage system)
export enum StageType {
  APPLICATION_SCREEN = 'application_screen',
  PHONE_SCREENING = 'phone_screening',
  VIDEO_CALL = 'video_call',
  IN_PERSON_INTERVIEW = 'in_person_interview',
  TAKE_HOME_ASSESSMENT = 'take_home_assessment',
  IN_PERSON_ASSESSMENT = 'in_person_assessment',
  CUSTOM = 'custom',
}

export const StageTypeLabels: Record<StageType, string> = {
  [StageType.APPLICATION_SCREEN]: 'Application Screen',
  [StageType.PHONE_SCREENING]: 'Phone Screening',
  [StageType.VIDEO_CALL]: 'Video Call Interview',
  [StageType.IN_PERSON_INTERVIEW]: 'In-Person Interview',
  [StageType.TAKE_HOME_ASSESSMENT]: 'Take-Home Assessment',
  [StageType.IN_PERSON_ASSESSMENT]: 'In-Person Assessment',
  [StageType.CUSTOM]: 'Custom',
}

export const StageTypeConfig: Record<StageType, {
  requiresScheduling: boolean
  requiresLocation: boolean
  isAssessment: boolean
  defaultDuration: number | null
  icon: string
  color: string
}> = {
  [StageType.APPLICATION_SCREEN]: {
    requiresScheduling: false,
    requiresLocation: false,
    isAssessment: false,
    defaultDuration: null,
    icon: 'FileText',
    color: 'gray',
  },
  [StageType.PHONE_SCREENING]: {
    requiresScheduling: true,
    requiresLocation: false,
    isAssessment: false,
    defaultDuration: 30,
    icon: 'Phone',
    color: 'blue',
  },
  [StageType.VIDEO_CALL]: {
    requiresScheduling: true,
    requiresLocation: false,
    isAssessment: false,
    defaultDuration: 45,
    icon: 'Video',
    color: 'purple',
  },
  [StageType.IN_PERSON_INTERVIEW]: {
    requiresScheduling: true,
    requiresLocation: true,
    isAssessment: false,
    defaultDuration: 60,
    icon: 'Users',
    color: 'green',
  },
  [StageType.TAKE_HOME_ASSESSMENT]: {
    requiresScheduling: false,
    requiresLocation: false,
    isAssessment: true,
    defaultDuration: null,
    icon: 'FileCode',
    color: 'orange',
  },
  [StageType.IN_PERSON_ASSESSMENT]: {
    requiresScheduling: true,
    requiresLocation: true,
    isAssessment: true,
    defaultDuration: 90,
    icon: 'ClipboardCheck',
    color: 'amber',
  },
  [StageType.CUSTOM]: {
    requiresScheduling: false,
    requiresLocation: false,
    isAssessment: false,
    defaultDuration: 60,
    icon: 'Settings',
    color: 'gray',
  },
}

export enum StageInstanceStatus {
  NOT_STARTED = 'not_started',
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  AWAITING_SUBMISSION = 'awaiting_submission',
  SUBMITTED = 'submitted',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
}

export const StageInstanceStatusLabels: Record<StageInstanceStatus, string> = {
  [StageInstanceStatus.NOT_STARTED]: 'Not Started',
  [StageInstanceStatus.SCHEDULED]: 'Scheduled',
  [StageInstanceStatus.IN_PROGRESS]: 'In Progress',
  [StageInstanceStatus.AWAITING_SUBMISSION]: 'Awaiting Submission',
  [StageInstanceStatus.SUBMITTED]: 'Submitted',
  [StageInstanceStatus.COMPLETED]: 'Completed',
  [StageInstanceStatus.CANCELLED]: 'Cancelled',
  [StageInstanceStatus.NO_SHOW]: 'No Show',
}

export interface InterviewStageTemplate {
  id: string
  job: string
  stage_type: StageType
  name: string
  order: number
  description: string
  default_duration_minutes: number | null
  default_interviewer: User | null
  default_interviewer_id: string | null
  default_interviewer_name: string | null
  // Assessment config
  assessment_instructions: string
  assessment_instructions_file: string | null
  assessment_external_url: string
  assessment_provider_name: string
  deadline_days: number | null
  // Location config
  use_company_address: boolean
  custom_location: string
  // Computed
  requires_scheduling: boolean
  requires_location: boolean
  is_assessment: boolean
  created_at: string
  updated_at: string
}

export interface InterviewStageTemplateInput {
  id?: string  // Optional - for updating existing templates
  stage_type: StageType
  name?: string
  order?: number
  description?: string
  default_duration_minutes?: number | null
  default_interviewer_id?: string | null
  // Assessment config
  assessment_instructions?: string
  assessment_external_url?: string
  assessment_provider_name?: string
  deadline_days?: number | null
  // Location config
  use_company_address?: boolean
  custom_location?: string
}

export interface StageParticipant {
  id: string
  full_name: string
  email: string
}

export interface BookingToken {
  id: string
  token: string
  expires_at: string
  is_used: boolean
  used_at: string | null
  is_valid: boolean
  booking_url: string
  created_at: string
}

export interface ApplicationStageInstance {
  id: string
  application: string
  stage_template: InterviewStageTemplate
  status: StageInstanceStatus
  // Scheduling
  scheduled_at: string | null
  duration_minutes: number | null
  interviewer: User | null
  participants: string[]
  participants_list: StageParticipant[]
  meeting_link: string
  location: string
  // Calendar integration
  google_calendar_event_id: string
  microsoft_calendar_event_id: string
  calendar_invite_sent: boolean
  // Assessment submission
  deadline: string | null
  submission_url: string
  submission_file: string | null
  submitted_at: string | null
  // Feedback
  feedback: string
  score: number | null
  // Booking token (for candidate self-scheduling)
  booking_token: BookingToken | null
  // Notifications
  notification_sent_at: string | null
  reminder_sent_at: string | null
  // Timestamps
  created_at: string
  updated_at: string
  completed_at: string | null
}

export interface ScheduleStageInput {
  scheduled_at: string
  duration_minutes?: number
  interviewer_id?: string
  participant_ids?: string[]
  meeting_link?: string
  location?: string
  send_calendar_invite?: boolean
}

export interface RescheduleStageInput {
  scheduled_at: string
  duration_minutes?: number
  interviewer_id?: string
  participant_ids?: string[]
  meeting_link?: string
  location?: string
  reason?: string
  send_calendar_invite?: boolean
}

export interface AssignAssessmentInput {
  deadline: string // ISO date string - required
  instructions?: string
  external_url?: string
  send_notification?: boolean
}

export interface SubmitAssessmentInput {
  submission_url?: string
  submission_file?: File
}

export interface CompleteStageInput {
  feedback?: string
  score?: number
}

export interface Job extends JobListItem {
  created_by: User | null
  assigned_recruiters: User[]
  description: string
  requirements: string
  nice_to_haves: string
  responsibilities: string
  remote_regions: string[]
  benefits: BenefitCategory[]
  nice_to_have_skills: Skill[]
  interview_stages: InterviewStage[]
  questions: ApplicationQuestion[]
  is_fully_filled: boolean
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
  assigned_recruiter_ids?: string[]
  positions_to_fill?: number
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
  OFFER_DECLINED = 'offer_declined',
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

export interface Benefit {
  name: string
  annual_cost: number
}

export interface Equity {
  vesting_years: number
  shares: number
  share_value: number
}

export interface OfferDetails {
  annual_salary?: number | null
  currency?: string
  start_date?: string | null
  notes?: string
  benefits?: Benefit[]
  equity?: Equity | null
  // Computed fields (read-only, calculated by backend)
  total_benefits_cost?: number
  year_1_equity_value?: number
  total_cost_to_company?: number
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
  questions: ApplicationQuestion[]
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
  // Stage-specific feedback (for Applied and Shortlisted)
  applied_feedback: string | null
  applied_score: number | null
  shortlisted_feedback: string | null
  shortlisted_score: number | null
  // Replacement fields
  is_replacement?: boolean
  replaced_application?: string | null
  replacement_request?: ReplacementRequest | null
  // Assigned recruiters
  assigned_recruiters?: ApplicationRecruiter[]
}

// Stage Feedback (threaded comments)
export enum StageFeedbackType {
  APPLIED = 'applied',
  SHORTLISTED = 'shortlisted',
  INTERVIEW = 'interview',
}

export interface StageFeedbackAuthor {
  id: string
  email: string
  first_name: string
  last_name: string
  full_name: string
}

export interface StageFeedback {
  id: string
  application: string
  stage_type: StageFeedbackType | null
  stage_instance: string | null
  author: StageFeedbackAuthor
  comment: string
  score: number | null
  stage_name: string | null
  created_at: string
  updated_at: string
}

export interface StageFeedbackCreateInput {
  comment: string
  score?: number | null
  stage_type?: StageFeedbackType.APPLIED | StageFeedbackType.SHORTLISTED
  stage_instance_id?: string
}

export interface StageFeedbackUpdateInput {
  comment?: string
  score?: number | null
}

// Pending booking link info for candidates
export interface PendingBooking {
  booking_url: string
  stage_name: string
  expires_at: string
}

// Next scheduled interview info for candidates
export interface NextInterview {
  stage_name: string
  scheduled_at: string
  duration_minutes: number
  meeting_link: string | null
  location: string | null
  interviewer_name: string | null
}

// Pending assessment info for candidate applications
export interface PendingAssessment {
  instance_id: string
  stage_name: string
  deadline: string
  deadline_passed: boolean
  instructions: string | null
  external_url: string | null
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
  pending_booking: PendingBooking | null
  next_interview: NextInterview | null
  pending_assessment: PendingAssessment | null
}

// Minimal application info for listing (company view)
export interface CurrentStageInstance {
  id: string
  stage_name: string
  stage_type: string
  status: string
  scheduled_at: string | null
  duration_minutes: number
  meeting_link: string | null
  location: string | null
  interviewer_id: string | null
  interviewer_name: string | null
  booking_token: {
    token: string
    booking_url: string
    created_at: string
    expires_at: string
    is_used: boolean
    used_at: string | null
    is_valid: boolean
  } | null
  is_assessment: boolean
  assessment: {
    deadline: string | null
    deadline_passed: boolean
    submission_url: string | null
    submitted_at: string | null
    instructions: string | null
  } | null
  feedback: {
    feedback: string | null
    score: number | null
    recommendation: string | null
    completed_at: string | null
  } | null
}

export interface ApplicationRecruiter {
  id: number
  email: string
  first_name: string
  last_name: string
  full_name: string
}

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
  current_stage_instance: CurrentStageInstance | null
  assigned_recruiters: ApplicationRecruiter[]
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
// Shortlist Screening Questions
// ============================================================================

// Template question (company-level reusable template)
export interface ShortlistTemplateQuestion {
  id: string
  template: string
  question_text: string
  description: string
  is_required: boolean
  order: number
  created_at: string
  updated_at: string
}

export interface ShortlistTemplateQuestionInput {
  id?: string
  question_text: string
  description?: string
  is_required?: boolean
  order?: number
}

// Company-level template (contains multiple questions)
export interface ShortlistQuestionTemplate {
  id: string
  company: string
  name: string
  description: string
  is_active: boolean
  questions: ShortlistTemplateQuestion[]
  questions_count?: number
  created_by: string | null
  created_by_name: string | null
  created_at: string
  updated_at: string
}

export interface ShortlistQuestionTemplateInput {
  name: string
  description?: string
  is_active?: boolean
  questions?: ShortlistTemplateQuestionInput[]
}

// Job-level question (copied from template or custom per job)
export interface ShortlistQuestion {
  id: string
  job: string
  question_text: string
  description: string
  is_required: boolean
  order: number
  created_at: string
  updated_at: string
}

export interface ShortlistQuestionInput {
  id?: string
  question_text: string
  description?: string
  is_required?: boolean
  order?: number
}

// Answer submitted by a reviewer (Admin/Recruiter/Client)
export interface ShortlistAnswer {
  id: string
  application: string
  question: ShortlistQuestion
  reviewer: string | null
  reviewer_name: string | null
  reviewer_avatar: string | null
  score: number  // 1-5 stars
  notes: string
  created_at: string
  updated_at: string
}

export interface ShortlistAnswerInput {
  question_id: string
  score: number  // 1-5 stars
  notes?: string
}

// Summary of all reviewer scores for an application
export interface ShortlistReviewSummary {
  total_reviewers: number
  average_overall_score: number | null
  questions: {
    question_id: string
    question_text: string
    average_score: number | null
    response_count: number
  }[]
  reviews: {
    reviewer_id: string
    reviewer_name: string
    reviewer_avatar: string | null
    average_score: number | null
    answered_at: string | null
  }[]
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
  // Booking/Scheduling activities
  BOOKING_LINK_SENT = 'booking_link_sent',
  INTERVIEW_BOOKED = 'interview_booked',
  INTERVIEW_SCHEDULED = 'interview_scheduled',
  INTERVIEW_RESCHEDULED = 'interview_rescheduled',
  INTERVIEW_CANCELLED = 'interview_cancelled',
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

// ============================================================================
// Calendar Integration
// ============================================================================

export enum CalendarProvider {
  GOOGLE = 'google',
  MICROSOFT = 'microsoft',
}

export const CalendarProviderLabels: Record<CalendarProvider, string> = {
  [CalendarProvider.GOOGLE]: 'Google Calendar',
  [CalendarProvider.MICROSOFT]: 'Microsoft 365',
}

export interface CalendarConnection {
  id: string
  provider: CalendarProvider
  provider_display: string
  provider_email: string
  calendar_id: string
  calendar_name: string
  is_active: boolean
  is_token_expired: boolean
  // Booking settings
  booking_days_ahead: number
  business_hours_start: number
  business_hours_end: number
  min_notice_hours: number
  buffer_minutes: number
  available_days: string
  available_days_list: number[]
  timezone: string
  created_at: string
  updated_at: string
}

export interface AvailableCalendar {
  id: string
  name: string
  primary: boolean
}

export interface CalendarSettingsUpdate {
  calendar_id?: string
  calendar_name?: string
  booking_days_ahead?: number
  business_hours_start?: number
  business_hours_end?: number
  min_notice_hours?: number
  buffer_minutes?: number
  available_days?: number[]
  timezone?: string
}

// ============================================================================
// Notifications
// ============================================================================

export enum NotificationType {
  // Account & Onboarding
  WELCOME = 'welcome',
  EMAIL_VERIFICATION = 'email_verification',
  PASSWORD_RESET = 'password_reset',
  PASSWORD_CHANGED = 'password_changed',
  // Invitations
  TEAM_INVITE = 'team_invite',
  CLIENT_INVITE = 'client_invite',
  COMPANY_MEMBER_INVITE = 'company_member_invite',
  CANDIDATE_BOOKING_INVITE = 'candidate_booking_invite',
  // Stage/Interview
  STAGE_SCHEDULED = 'stage_scheduled',
  STAGE_REMINDER = 'stage_reminder',
  STAGE_RESCHEDULED = 'stage_rescheduled',
  STAGE_CANCELLED = 'stage_cancelled',
  STAGE_COMPLETED = 'stage_completed',
  STAGE_FEEDBACK_RECEIVED = 'stage_feedback_received',
  // Booking (self-scheduling)
  BOOKING_LINK_SENT = 'booking_link_sent',
  BOOKING_CONFIRMED = 'booking_confirmed',
  BOOKING_REMINDER = 'booking_reminder',
  // Assessment
  ASSESSMENT_ASSIGNED = 'assessment_assigned',
  ASSESSMENT_REMINDER = 'assessment_reminder',
  SUBMISSION_RECEIVED = 'submission_received',
  // Application Lifecycle
  APPLICATION_RECEIVED = 'application_received',
  APPLICATION_UNDER_REVIEW = 'application_under_review',
  APPLICATION_SHORTLISTED = 'application_shortlisted',
  APPLICATION_REJECTED = 'application_rejected',
  APPLICATION_WITHDRAWN = 'application_withdrawn',
  // Stage-Specific Advancement
  ADVANCED_TO_APPLICATION_SCREEN = 'advanced_to_application_screen',
  ADVANCED_TO_PHONE_SCREENING = 'advanced_to_phone_screening',
  ADVANCED_TO_VIDEO_INTERVIEW = 'advanced_to_video_interview',
  ADVANCED_TO_IN_PERSON_INTERVIEW = 'advanced_to_in_person_interview',
  ADVANCED_TO_TAKE_HOME_ASSESSMENT = 'advanced_to_take_home_assessment',
  ADVANCED_TO_IN_PERSON_ASSESSMENT = 'advanced_to_in_person_assessment',
  ADVANCED_TO_CUSTOM_STAGE = 'advanced_to_custom_stage',
  // Offers
  OFFER_RECEIVED = 'offer_received',
  OFFER_ACCEPTED = 'offer_accepted',
  OFFER_DECLINED = 'offer_declined',
  // Job Lifecycle
  JOB_PUBLISHED = 'job_published',
  JOB_CLOSED = 'job_closed',
  JOB_FILLED = 'job_filled',
  JOB_UPDATED = 'job_updated',
  // Admin/Custom
  ADMIN_BROADCAST = 'admin_broadcast',
  CUSTOM = 'custom',
}

export enum NotificationChannel {
  EMAIL = 'email',
  IN_APP = 'in_app',
  BOTH = 'both',
}

export const NotificationTypeLabels: Record<NotificationType, string> = {
  // Account & Onboarding
  [NotificationType.WELCOME]: 'Welcome',
  [NotificationType.EMAIL_VERIFICATION]: 'Email Verification',
  [NotificationType.PASSWORD_RESET]: 'Password Reset',
  [NotificationType.PASSWORD_CHANGED]: 'Password Changed',
  // Invitations
  [NotificationType.TEAM_INVITE]: 'Team Invitation',
  [NotificationType.CLIENT_INVITE]: 'Client Invitation',
  [NotificationType.COMPANY_MEMBER_INVITE]: 'Company Invitation',
  [NotificationType.CANDIDATE_BOOKING_INVITE]: 'Candidate Booking Invitation',
  // Stage/Interview
  [NotificationType.STAGE_SCHEDULED]: 'Interview Scheduled',
  [NotificationType.STAGE_REMINDER]: 'Interview Reminder',
  [NotificationType.STAGE_RESCHEDULED]: 'Interview Rescheduled',
  [NotificationType.STAGE_CANCELLED]: 'Interview Cancelled',
  [NotificationType.STAGE_COMPLETED]: 'Interview Completed',
  [NotificationType.STAGE_FEEDBACK_RECEIVED]: 'Feedback Received',
  // Booking
  [NotificationType.BOOKING_LINK_SENT]: 'Booking Link Sent',
  [NotificationType.BOOKING_CONFIRMED]: 'Booking Confirmed',
  [NotificationType.BOOKING_REMINDER]: 'Booking Reminder',
  // Assessment
  [NotificationType.ASSESSMENT_ASSIGNED]: 'Assessment Assigned',
  [NotificationType.ASSESSMENT_REMINDER]: 'Assessment Reminder',
  [NotificationType.SUBMISSION_RECEIVED]: 'Submission Received',
  // Application Lifecycle
  [NotificationType.APPLICATION_RECEIVED]: 'New Application',
  [NotificationType.APPLICATION_UNDER_REVIEW]: 'Under Review',
  [NotificationType.APPLICATION_SHORTLISTED]: 'Shortlisted',
  [NotificationType.APPLICATION_REJECTED]: 'Application Rejected',
  [NotificationType.APPLICATION_WITHDRAWN]: 'Application Withdrawn',
  // Stage-Specific Advancement
  [NotificationType.ADVANCED_TO_APPLICATION_SCREEN]: 'Advanced to Application Screen',
  [NotificationType.ADVANCED_TO_PHONE_SCREENING]: 'Advanced to Phone Screening',
  [NotificationType.ADVANCED_TO_VIDEO_INTERVIEW]: 'Advanced to Video Interview',
  [NotificationType.ADVANCED_TO_IN_PERSON_INTERVIEW]: 'Advanced to In-Person Interview',
  [NotificationType.ADVANCED_TO_TAKE_HOME_ASSESSMENT]: 'Advanced to Take-Home Assessment',
  [NotificationType.ADVANCED_TO_IN_PERSON_ASSESSMENT]: 'Advanced to In-Person Assessment',
  [NotificationType.ADVANCED_TO_CUSTOM_STAGE]: 'Advanced to Next Stage',
  // Offers
  [NotificationType.OFFER_RECEIVED]: 'Offer Received',
  [NotificationType.OFFER_ACCEPTED]: 'Offer Accepted',
  [NotificationType.OFFER_DECLINED]: 'Offer Declined',
  // Job Lifecycle
  [NotificationType.JOB_PUBLISHED]: 'Job Published',
  [NotificationType.JOB_CLOSED]: 'Job Closed',
  [NotificationType.JOB_FILLED]: 'Job Filled',
  [NotificationType.JOB_UPDATED]: 'Job Updated',
  // Admin/Custom
  [NotificationType.ADMIN_BROADCAST]: 'Admin Broadcast',
  [NotificationType.CUSTOM]: 'Custom Notification',
}

export const NotificationChannelLabels: Record<NotificationChannel, string> = {
  [NotificationChannel.EMAIL]: 'Email',
  [NotificationChannel.IN_APP]: 'In-App',
  [NotificationChannel.BOTH]: 'Email & In-App',
}

export enum RecipientType {
  CANDIDATE = 'candidate',
  CLIENT = 'client',
  RECRUITER = 'recruiter',
  INTERVIEWER = 'interviewer',
  COMPANY_ADMIN = 'company_admin',
  COMPANY_EDITOR = 'company_editor',
  COMPANY_VIEWER = 'company_viewer',
  COMPANY_TEAM = 'company_team',
  ALL = 'all',
}

export const RecipientTypeLabels: Record<RecipientType, string> = {
  [RecipientType.CANDIDATE]: 'Candidate',
  [RecipientType.CLIENT]: 'Client',
  [RecipientType.RECRUITER]: 'Recruiter',
  [RecipientType.INTERVIEWER]: 'Interviewer',
  [RecipientType.COMPANY_ADMIN]: 'Company Admin',
  [RecipientType.COMPANY_EDITOR]: 'Company Editor',
  [RecipientType.COMPANY_VIEWER]: 'Company Viewer',
  [RecipientType.COMPANY_TEAM]: 'Company Team (All)',
  [RecipientType.ALL]: 'All Users',
}

// Automation recipient types - used for automation rules to dynamically resolve recipients
// These are different from RecipientType which describes template audience
export const AutomationRecipientTypes = {
  // Record-based
  assigned_user: 'Assigned User',
  record_owner: 'Record Owner',
  assigned_client: 'Assigned Client',

  // Job/Application context
  recruiter: 'Assigned Recruiter',
  all_assigned_recruiters: 'All Assigned Recruiters',
  candidate: 'Candidate',
  interviewer: 'Interviewer',
  active_applicants: 'Active Applicants',

  // Company context
  company_admin: 'Company Admin',
  company_team: 'Company Team',
  company_assignees: 'Company Assignees',

  // System-wide
  all_recruiters: 'All Recruiters',
  all_admins: 'All Admins',

  // Invitation context
  invitation_email: 'Invitation Email',
  invitation_creator: 'Invitation Creator',

  // Booking context
  booking_organizer: 'Booking Organizer',
  booking_attendee: 'Booking Attendee',

  // Self (for User model)
  self: 'Self (User)',

  // Billing
  billing_contact: 'Billing Contact',
  subscription_company: 'Subscription Company',

  // Lead context
  lead_assignees: 'Lead Assignees',
  lead_email: 'Lead Email',

  // Replacement context
  replacement_requester: 'Replacement Requester',
  job_recruiters: 'Job Recruiters',

  // Specific users
  specific_users: 'Specific Users',
} as const

export type AutomationRecipientType = keyof typeof AutomationRecipientTypes

// Grouped recipient types for UI dropdowns
export const AutomationRecipientTypeGroups = {
  'Record Context': ['assigned_user', 'record_owner', 'assigned_client'],
  'Job/Application': ['recruiter', 'all_assigned_recruiters', 'candidate', 'interviewer', 'active_applicants'],
  'Company': ['company_admin', 'company_team', 'company_assignees'],
  'System-wide': ['all_recruiters', 'all_admins'],
  'Invitations': ['invitation_email', 'invitation_creator'],
  'Bookings': ['booking_organizer', 'booking_attendee'],
  'Leads': ['lead_assignees', 'lead_email'],
  'Billing': ['billing_contact', 'subscription_company'],
  'Other': ['self', 'replacement_requester', 'job_recruiters', 'specific_users'],
} as const

export interface Notification {
  id: string
  recipient: string
  notification_type: NotificationType
  notification_type_display?: string
  channel?: NotificationChannel
  channel_display?: string
  application: string | null
  stage_instance: string | null
  title: string
  body: string
  action_url: string
  is_read: boolean
  email_sent: boolean
  sent_at: string
  created_at: string
}

export interface AdminNotification extends Notification {
  recipient_email: string
  recipient_name: string
  read_at: string | null
  email_sent_at: string | null
  email_error: string
}

export interface NotificationTemplate {
  id: string
  name: string
  description: string
  template_type: string
  recipient_type: RecipientType
  is_custom: boolean
  title_template: string
  body_template: string
  email_subject_template: string
  email_body_template: string
  default_channel: NotificationChannel
  is_active: boolean
  created_by: string | null
  created_by_email?: string
  created_at: string
  updated_at: string
}

export interface SendNotificationInput {
  recipient_ids: number[]
  title: string
  body: string
  channel: NotificationChannel
  action_url?: string
  template_id?: string
}

export interface UserSearchResult {
  id: number
  email: string
  first_name: string
  last_name: string
  full_name: string
  role: UserRole
}

export type RecipientFilter = 'all' | 'candidates' | 'clients' | 'recruiters'

export interface BroadcastInput {
  recipient_filter: RecipientFilter
  title: string
  body: string
  channel: NotificationChannel
  action_url?: string
}

export const RecipientFilterLabels: Record<RecipientFilter, string> = {
  all: 'All Users',
  candidates: 'All Candidates',
  clients: 'All Clients',
  recruiters: 'Recruiters & Admins',
}

// ============================================================================
// Branding Settings
// ============================================================================

export interface BrandingSettings {
  id: string
  // Company Info
  company_name: string
  tagline: string
  // Logo - File uploads
  logo: string | null
  logo_dark: string | null
  favicon: string | null
  // Logo - URL fallbacks
  logo_url: string
  logo_dark_url: string
  favicon_url: string
  // Logo - Effective URLs (computed - file takes precedence over URL)
  effective_logo_url: string
  effective_logo_dark_url: string
  effective_favicon_url: string
  // Typography
  font_family: string
  // Primary Colors
  primary_color: string
  primary_color_dark: string
  primary_color_light: string
  // Secondary Colors
  secondary_color: string
  secondary_color_dark: string
  secondary_color_light: string
  // Accent Colors
  accent_color: string
  accent_color_dark: string
  accent_color_light: string
  // Status Colors
  success_color: string
  warning_color: string
  error_color: string
  // Email settings
  email_background_color: string
  email_header_background: string
  email_footer_text: string
  // Social Links
  website_url: string
  facebook_url: string
  twitter_url: string
  linkedin_url: string
  instagram_url: string
  has_social_links: boolean
  // Contact
  support_email: string
  contact_phone: string
  address: string
  // Legal
  privacy_policy_url: string
  terms_of_service_url: string
  // Advanced
  custom_css: string
  // Email Template
  email_base_template: string
  // Meta
  updated_at: string
}

export interface BrandingSettingsUpdate {
  // Company Info
  company_name?: string
  tagline?: string
  // Logo - File uploads (File object or null to clear)
  logo?: File | null
  logo_dark?: File | null
  favicon?: File | null
  // Logo - URL fallbacks
  logo_url?: string
  logo_dark_url?: string
  favicon_url?: string
  // Typography
  font_family?: string
  // Primary Colors
  primary_color?: string
  primary_color_dark?: string
  primary_color_light?: string
  // Secondary Colors
  secondary_color?: string
  secondary_color_dark?: string
  secondary_color_light?: string
  // Accent Colors
  accent_color?: string
  accent_color_dark?: string
  accent_color_light?: string
  // Status Colors
  success_color?: string
  warning_color?: string
  error_color?: string
  // Email settings
  email_background_color?: string
  email_header_background?: string
  email_footer_text?: string
  // Social Links
  website_url?: string
  facebook_url?: string
  twitter_url?: string
  linkedin_url?: string
  instagram_url?: string
  // Contact
  support_email?: string
  contact_phone?: string
  address?: string
  // Legal
  privacy_policy_url?: string
  terms_of_service_url?: string
  // Advanced
  custom_css?: string
  // Email Template
  email_base_template?: string
}

export interface PublicBranding {
  company_name: string
  tagline: string
  logo_url: string
  logo_dark_url: string
  favicon_url: string
  font_family: string
  // Primary Colors
  primary_color: string
  primary_color_dark: string
  primary_color_light: string
  // Secondary Colors
  secondary_color: string
  secondary_color_dark: string
  secondary_color_light: string
  // Accent Colors
  accent_color: string
  accent_color_dark: string
  accent_color_light: string
  // Status Colors
  success_color: string
  warning_color: string
  error_color: string
  // Links
  website_url: string
  privacy_policy_url: string
  terms_of_service_url: string
}

// ============================================================================
// Resume Parser
// ============================================================================

export interface ParsedResumeProfile {
  first_name: string
  last_name: string
  professional_title: string
  headline: string
  professional_summary: string
  city: string | null
  country: string | null
}

export interface ParsedResumeExperience {
  job_title: string
  company_name: string
  start_date: string
  end_date: string | null
  is_current: boolean
  description: string
  technologies: string[]
  skills: string[]
}

export interface ParsedResumeEducation {
  institution: string
  degree: string
  field_of_study: string
  start_date: string | null
  end_date: string | null
  is_current: boolean
  grade: string | null
}

export interface ParsedResumeData {
  profile: ParsedResumeProfile
  experiences: ParsedResumeExperience[]
  education: ParsedResumeEducation[]
  all_technologies: string[]
  all_skills: string[]
}

// ============================================================================
// Profile Suggestions
// ============================================================================

export type ProfileSuggestionFieldType = 'profile' | 'experience' | 'education'
export type ProfileSuggestionStatus = 'pending' | 'resolved' | 'declined' | 'closed'

export interface ProfileSuggestion {
  id: string
  candidate: number
  field_type: ProfileSuggestionFieldType
  field_name: string
  related_object_id: string | null
  suggestion_text: string
  status: ProfileSuggestionStatus
  created_by: string | null
  created_by_name: string | null
  created_by_email: string | null
  created_at: string
  resolved_at: string | null
  resolved_by: string | null
  resolved_by_name: string | null
  resolution_note: string
  reopened_at: string | null
  reopened_by: string | null
  reopened_by_name: string | null
}

export interface ProfileSuggestionCreate {
  field_type: ProfileSuggestionFieldType
  field_name: string
  related_object_id?: string
  suggestion_text: string
}

// Field labels for suggestions display
export const SUGGESTION_FIELD_LABELS: Record<string, string> = {
  // Profile fields
  professional_title: 'Job Title',
  headline: 'Headline',
  professional_summary: 'Professional Summary',
  city: 'City',
  country: 'Country',
  work_preference: 'Work Preference',
  seniority: 'Seniority Level',
  // Experience fields
  job_title: 'Job Title',
  company_name: 'Company Name',
  description: 'Description',
  achievements: 'Achievements',
  // Education fields
  institution: 'Institution',
  degree: 'Degree',
  field_of_study: 'Field of Study',
}

// Suggestible fields by type
export const SUGGESTIBLE_FIELDS = {
  profile: ['professional_title', 'headline', 'professional_summary', 'city', 'country', 'work_preference', 'seniority'],
  experience: ['job_title', 'company_name', 'description', 'achievements'],
  education: ['institution', 'degree', 'field_of_study', 'description'],
}

// ============================================================================
// Recruiter Profile Types
// ============================================================================

export interface RecruiterProfile {
  id: string
  user_name: string
  user_email: string
  user_avatar: string | null
  user_phone: string | null
  professional_title: string
  bio: string
  linkedin_url: string
  years_of_experience: number | null
  country: Country | null
  city: City | null
  timezone: string
  industries: Industry[]
  created_at: string
  updated_at: string
}

export interface RecruiterProfileUpdate {
  professional_title?: string
  bio?: string
  linkedin_url?: string
  years_of_experience?: number | null
  country_id?: number | null
  city_id?: number | null
  timezone?: string
  industry_ids?: number[]
}

// ============================================================================
// Recruiter Public Booking System
// ============================================================================

export enum RecruiterMeetingCategory {
  LEADS = 'leads',
  ONBOARDING = 'onboarding',
  RECRUITMENT = 'recruitment',
}

export const RecruiterMeetingCategoryLabels: Record<RecruiterMeetingCategory, string> = {
  [RecruiterMeetingCategory.LEADS]: 'Leads',
  [RecruiterMeetingCategory.ONBOARDING]: 'Onboarding',
  [RecruiterMeetingCategory.RECRUITMENT]: 'Recruitment',
}

export enum RecruiterBookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
  NO_SHOW = 'no_show',
}

export const RecruiterBookingStatusLabels: Record<RecruiterBookingStatus, string> = {
  [RecruiterBookingStatus.PENDING]: 'Pending Approval',
  [RecruiterBookingStatus.CONFIRMED]: 'Confirmed',
  [RecruiterBookingStatus.CANCELLED]: 'Cancelled',
  [RecruiterBookingStatus.COMPLETED]: 'Completed',
  [RecruiterBookingStatus.NO_SHOW]: 'No Show',
}

export type RecruiterMeetingLocationType = 'video' | 'phone' | 'in_person'

export const RecruiterMeetingLocationLabels: Record<RecruiterMeetingLocationType, string> = {
  video: 'Video Call',
  phone: 'Phone Call',
  in_person: 'In Person',
}

export type StageChangeBehavior = 'always' | 'only_forward' | 'only_if_not_set'

export const StageChangeBehaviorLabels: Record<StageChangeBehavior, string> = {
  always: 'Always set to this stage',
  only_forward: 'Only move forward (never go backwards)',
  only_if_not_set: 'Only if no stage is currently set',
}

export interface OnboardingStageMinimal {
  id: number
  name: string
  slug: string
  entity_type: 'candidate' | 'company'
  color: string
  order: number
}

export interface RecruiterMeetingType {
  id: string
  owner: string
  owner_name: string
  owner_email: string
  name: string
  slug: string
  category: RecruiterMeetingCategory
  category_display: string
  description: string
  duration_minutes: number
  buffer_before_minutes: number
  buffer_after_minutes: number
  location_type: RecruiterMeetingLocationType
  location_type_display: string
  custom_location: string
  is_active: boolean
  show_on_dashboard: boolean
  use_for_onboarding: boolean
  requires_approval: boolean
  max_bookings_per_day: number | null
  confirmation_message: string
  redirect_url: string
  color: string
  // Onboarding stage settings
  target_onboarding_stage: number | null
  target_onboarding_stage_details: OnboardingStageMinimal | null
  target_onboarding_stage_authenticated: number | null
  target_onboarding_stage_authenticated_details: OnboardingStageMinimal | null
  stage_change_behavior: StageChangeBehavior
  stage_change_behavior_display: string
  // Allowed users
  allowed_users_details: MeetingTypeAllowedUser[]
  created_at: string
  updated_at: string
}

export interface MeetingTypeAllowedUser {
  id: number
  email: string
  first_name: string
  last_name: string
  full_name: string
}

export interface RecruiterMeetingTypeInput {
  name: string
  slug?: string
  category: RecruiterMeetingCategory
  description?: string
  duration_minutes?: number
  buffer_before_minutes?: number
  buffer_after_minutes?: number
  location_type?: RecruiterMeetingLocationType
  custom_location?: string
  is_active?: boolean
  show_on_dashboard?: boolean
  use_for_onboarding?: boolean
  requires_approval?: boolean
  max_bookings_per_day?: number | null
  confirmation_message?: string
  redirect_url?: string
  color?: string
  // Onboarding stage settings
  target_onboarding_stage?: number | null
  target_onboarding_stage_authenticated?: number | null
  stage_change_behavior?: StageChangeBehavior
  // Allowed users (admins only)
  allowed_user_ids?: number[]
}

export interface RecruiterMeetingTypePublic {
  id: string
  owner_name: string
  owner_avatar: string | null
  name: string
  slug: string
  category: RecruiterMeetingCategory
  description: string
  duration_minutes: number
  location_type: RecruiterMeetingLocationType
  location_type_display: string
  color: string
}

export interface RecruiterBookingParticipant {
  id: string
  name: string
  email: string
  role: 'interviewer' | 'participant'
}

export interface RecruiterBookingCandidateInfo {
  name: string
  slug: string
  professional_title?: string
}

export interface RecruiterBooking {
  id: string
  booking_type?: 'booking' | 'interview'
  meeting_type: string
  meeting_type_name: string
  meeting_type_category: RecruiterMeetingCategory
  organizer: string
  organizer_name: string
  organizer_email: string
  attendee_user: string | null
  attendee_name: string
  attendee_email: string
  attendee_phone: string
  attendee_company: string
  candidate_profile?: string | null
  candidate_info?: RecruiterBookingCandidateInfo | null
  title: string
  description: string
  scheduled_at: string | null  // null for unscheduled interviews
  end_time: string | null  // null for unscheduled interviews
  duration_minutes: number
  timezone: string
  location_type: RecruiterMeetingLocationType
  location_type_display: string
  meeting_url: string
  location: string
  status: RecruiterBookingStatus
  status_display: string
  is_upcoming: boolean
  is_past: boolean
  notes: string
  source: 'public' | 'manual' | 'invite' | 'application'
  created_at: string
  updated_at: string
  cancelled_at?: string | null
  cancellation_reason?: string
  // Interview-specific fields (when booking_type === 'interview')
  job_title?: string
  job_id?: string
  application_id?: string
  stage_id?: string
  company_name?: string
  company_id?: string
  participants?: RecruiterBookingParticipant[]
}

export interface RecruiterBookingInput {
  meeting_type: string
  attendee_name?: string  // Optional for authenticated users
  attendee_email?: string // Optional for authenticated users
  attendee_phone?: string
  attendee_company?: string
  scheduled_at: string
  timezone?: string
}

export interface RecruiterPublicBookingPage {
  user: {
    id: string
    booking_slug: string
    name: string
    email: string
    avatar: string | null
    professional_title: string | null
    bio: string | null
  }
  meeting_types: RecruiterMeetingTypePublic[]
}

export interface RecruiterAvailabilitySlot {
  start: string
  end: string
}

export interface RecruiterMeetingAvailability {
  meeting_type: RecruiterMeetingTypePublic
  available_slots: RecruiterAvailabilitySlot[]
  timezone: string
}

// Candidate Invitation (for booking-triggered invitations)
export interface CandidateInvitation {
  id: number
  token: string
  email: string
  name: string
  created_at: string
  expires_at: string
  used_at: string | null
  is_valid: boolean
  is_expired: boolean
  signup_url: string
  booking_info: {
    id: string
    meeting_type: string | null
    scheduled_at: string | null
    status: RecruiterBookingStatus
  } | null
}

// ============================================================================
// Onboarding Stages
// ============================================================================

export type OnboardingEntityType = 'lead' | 'company' | 'candidate'

// EntityType extends OnboardingEntityType with additional types for Tasks, Timeline, etc.
export type EntityType = OnboardingEntityType | 'application'

export interface OnboardingStage {
  id: number
  name: string
  slug: string
  entity_type: OnboardingEntityType
  order: number
  color: string
  is_terminal: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface OnboardingStageMinimal {
  id: number
  name: string
  slug: string
  color: string
  is_terminal: boolean
  order: number
}

export interface OnboardingStageInput {
  name: string
  entity_type: OnboardingEntityType
  order?: number
  color?: string
  is_terminal?: boolean
}

export interface OnboardingStageUpdateInput {
  name?: string
  order?: number
  color?: string
  is_terminal?: boolean
  is_active?: boolean
}

export interface OnboardingHistory {
  id: number
  entity_type: OnboardingEntityType
  entity_id: number
  from_stage: OnboardingStage | null
  to_stage: OnboardingStage
  changed_by: number | null
  changed_by_name: string | null
  notes: string
  created_at: string
}

export interface StageIntegrationMeetingType {
  id: number
  name: string
  slug: string
  type: 'unauthenticated' | 'authenticated'
}

export interface StageIntegration {
  stage_id: number
  stage_name: string
  stage_slug: string
  entity_type: OnboardingEntityType
  meeting_types: StageIntegrationMeetingType[]
  wizard_step: string | null
  entity_counts: {
    companies: number
    leads: number
    candidates: number
  }
  total_integrations: number
}

// ============================================================================
// Tasks (Service Center)
// ============================================================================

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export const TaskPriorityLabels: Record<TaskPriority, string> = {
  [TaskPriority.LOW]: 'Low',
  [TaskPriority.MEDIUM]: 'Medium',
  [TaskPriority.HIGH]: 'High',
  [TaskPriority.URGENT]: 'Urgent',
}

export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export const TaskStatusLabels: Record<TaskStatus, string> = {
  [TaskStatus.PENDING]: 'Pending',
  [TaskStatus.IN_PROGRESS]: 'In Progress',
  [TaskStatus.COMPLETED]: 'Completed',
  [TaskStatus.CANCELLED]: 'Cancelled',
}

export interface TaskBottleneckDetection {
  id: string
  rule_name: string
  severity: 'warning' | 'critical'
  detected_at: string
}

export interface Task {
  id: string
  entity_type: EntityType
  entity_id: string
  stage_template: string | null  // UUID of InterviewStageTemplate
  stage_template_name: string | null
  title: string
  description: string
  priority: TaskPriority
  status: TaskStatus
  due_date: string | null
  completed_at: string | null
  assigned_to: number
  assigned_to_name: string | null
  created_by: number | null
  created_by_name: string | null
  is_overdue: boolean
  created_at: string
  updated_at: string
  bottleneck_detection: TaskBottleneckDetection | null
}

export interface TaskCreateInput {
  entity_type: EntityType
  entity_id: string
  stage_template?: string | null  // UUID of InterviewStageTemplate
  title: string
  description?: string
  priority?: TaskPriority
  due_date?: string | null
  assigned_to: number
}

export interface TaskUpdateInput {
  title?: string
  description?: string
  priority?: TaskPriority
  status?: TaskStatus
  due_date?: string | null
  assigned_to?: number
  stage_template?: string | null
}

// ============================================================================
// Timeline (Service Center - Aggregate View)
// ============================================================================

export type TimelineSource =
  | 'lead_activity'
  | 'onboarding_history'
  | 'activity_log'
  | 'candidate_activity'
  | 'booking'
  | 'stage_feedback'
  | 'task'

export interface TimelinePerformer {
  id: string
  name: string
  email: string
}

export interface TimelineEntry {
  id: string
  source: TimelineSource
  activity_type: string
  title: string
  content: string
  performed_by: TimelinePerformer | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface TimelineResponse {
  results: TimelineEntry[]
  count: number
  sources_available: TimelineSource[]
}

// ============================================================================
// Service Center
// ============================================================================

export interface ServiceCenterData {
  entity: Record<string, unknown>  // Lead | Company | CandidateProfile depending on entity_type
  tasks: Task[]
  timeline: TimelineEntry[]
  upcoming_meetings: RecruiterBooking[]
  health_score: number | null
}

// ============================================================================
// Replacements
// ============================================================================

export enum ReplacementStatus {
  PENDING = 'pending',
  APPROVED_FREE = 'approved_free',
  APPROVED_DISCOUNTED = 'approved_discounted',
  REJECTED = 'rejected',
}

export const ReplacementStatusLabels: Record<ReplacementStatus, string> = {
  [ReplacementStatus.PENDING]: 'Pending Review',
  [ReplacementStatus.APPROVED_FREE]: 'Approved (Free)',
  [ReplacementStatus.APPROVED_DISCOUNTED]: 'Approved (Discounted)',
  [ReplacementStatus.REJECTED]: 'Rejected',
}

export enum ReplacementReasonCategory {
  RESIGNATION = 'resignation',
  TERMINATION = 'termination',
  PERFORMANCE = 'performance',
  CULTURAL_FIT = 'cultural_fit',
  NO_SHOW = 'no_show',
  OTHER = 'other',
}

export const ReplacementReasonLabels: Record<ReplacementReasonCategory, string> = {
  [ReplacementReasonCategory.RESIGNATION]: 'Candidate Resigned',
  [ReplacementReasonCategory.TERMINATION]: 'Candidate Terminated',
  [ReplacementReasonCategory.PERFORMANCE]: 'Performance Issues',
  [ReplacementReasonCategory.CULTURAL_FIT]: 'Cultural Fit Issues',
  [ReplacementReasonCategory.NO_SHOW]: 'Candidate Did Not Start',
  [ReplacementReasonCategory.OTHER]: 'Other',
}

export interface ReplacementRequest {
  id: string
  application: string
  company_id: string
  company_name: string
  job_id: string
  job_title: string
  candidate_name: string
  candidate_slug: string
  reason_category: ReplacementReasonCategory
  reason_category_display: string
  reason_details: string
  status: ReplacementStatus
  status_display: string
  discount_percentage: number | null
  requested_by: string | null
  requested_by_name: string | null
  requested_at: string
  reviewed_by: string | null
  reviewed_by_name: string | null
  reviewed_at: string | null
  review_notes: string
  created_at: string
  original_offer_details?: Record<string, unknown>
  original_start_date?: string | null
  original_invoiced_amount?: number | null
}

export interface ReplacementEligibility {
  eligible: boolean
  reason: string | null
  replacement_period_days: number
  start_date: string | null
  expiry_date: string | null
  days_remaining: number | null
  has_existing_request: boolean
  existing_request_status: ReplacementStatus | null
}

export interface ReplacementRequestInput {
  reason_category: ReplacementReasonCategory
  reason_details?: string
}

export interface ReplacementApproveInput {
  approval_type: 'free' | 'discounted'
  discount_percentage?: number
  review_notes?: string
}

export interface ReplacementRejectInput {
  review_notes?: string
}

// ============================================================================
// Analytics
// ============================================================================

export * from './analytics'
export * from './cms'
export * from './feed'
