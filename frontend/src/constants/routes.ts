// Route constants - avoids magic strings throughout the app

export const ROUTES = {
  // Public routes
  HOME: '/',
  LOGIN: '/login',
  SIGNUP: '/signup',

  // Services
  SERVICES: '/services',
  SERVICES_CONTINGENCY: '/services/contingency',
  SERVICES_RETAINED: '/services/retained',
  SERVICES_ENTERPRISE: '/services/enterprise-team-building',

  // Jobs
  JOBS: '/jobs',
  JOB_DETAIL: (id: string) => `/jobs/${id}`,

  // Companies
  COMPANIES: '/companies',
  COMPANY_DETAIL: (slug: string) => `/companies/${slug}`,

  // Candidates (public)
  CANDIDATES: '/candidates',
  CANDIDATE_DETAIL: (slug: string) => `/candidates/${slug}`,

  // Booking
  BOOK_CALL: '/book-a-call',

  // Content
  BLOG: '/blog',
  BLOG_POST: (slug: string) => `/blog/${slug}`,
  GLOSSARY: '/glossary',
  GLOSSARY_TERM: (slug: string) => `/glossary/${slug}`,
  CASE_STUDIES: '/case-studies',
  CASE_STUDY: (slug: string) => `/case-studies/${slug}`,
  FAQS: '/faqs',
  CONTACT: '/contact',

  // Legal
  PRIVACY: '/legal/privacy',
  TERMS: '/legal/terms',
  POPIA: '/legal/popia',

  // Candidate Dashboard
  CANDIDATE_DASHBOARD: '/dashboard/candidate',
  CANDIDATE_PROFILE: '/dashboard/candidate/profile',
  CANDIDATE_APPLICATIONS: '/dashboard/candidate/applications',
  CANDIDATE_BOOKINGS: '/dashboard/candidate/bookings',
  CANDIDATE_PRIVACY: '/dashboard/candidate/privacy',

  // Client Dashboard
  CLIENT_DASHBOARD: '/dashboard/client',
  CLIENT_COMPANY: '/dashboard/client/company',
  CLIENT_JOBS: '/dashboard/client/jobs',
  CLIENT_JOB_NEW: '/dashboard/client/jobs/new',
  CLIENT_JOB_DETAIL: (id: string) => `/dashboard/client/jobs/${id}`,
  CLIENT_JOB_CANDIDATES: (id: string) => `/dashboard/client/jobs/${id}/candidates`,
  CLIENT_BOOKINGS: '/dashboard/client/bookings',

  // Recruiter Dashboard
  RECRUITER_DASHBOARD: '/dashboard/recruiter',
  RECRUITER_JOBS: '/dashboard/recruiter/jobs',
  RECRUITER_CANDIDATES: '/dashboard/recruiter/candidates',
  RECRUITER_SCHEDULE: '/dashboard/recruiter/schedule',

  // Admin Dashboard
  ADMIN_DASHBOARD: '/dashboard/admin',
  ADMIN_RECRUITERS: '/dashboard/admin/recruiters',
  ADMIN_EMAIL_TEMPLATES: '/dashboard/admin/email-templates',
  ADMIN_EMAIL_TEMPLATE_EDIT: (id: string) => `/dashboard/admin/email-templates/${id}/edit`,
  ADMIN_NETHUNT_LOGS: '/dashboard/admin/nethunt/logs',
} as const

// Helper function to check if a route is protected
export const isProtectedRoute = (path: string): boolean => {
  return path.startsWith('/dashboard')
}

// Helper function to get dashboard route based on role
export const getDashboardRoute = (role: string): string => {
  switch (role) {
    case 'candidate':
      return ROUTES.CANDIDATE_DASHBOARD
    case 'client':
      return ROUTES.CLIENT_DASHBOARD
    case 'recruiter':
      return ROUTES.RECRUITER_DASHBOARD
    case 'admin':
      return ROUTES.ADMIN_DASHBOARD
    default:
      return ROUTES.HOME
  }
}
