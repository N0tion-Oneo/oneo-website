/**
 * SEO Route Registry
 *
 * This file defines all public routes that should have SEO settings.
 * The backend syncs from this registry when "Sync Pages" is clicked.
 *
 * To add a new page:
 * 1. Add your route to React Router in App.tsx
 * 2. Add an entry here with SEO metadata
 * 3. Click "Sync Pages" in CMS > SEO > Page SEO
 */

export interface SEORouteConfig {
  path: string
  name: string
  description: string
  sitemapPriority: number
  includeInSitemap: boolean
  // For wildcard routes - programmatic SEO templates
  titleTemplate?: string
  descriptionTemplate?: string
}

/**
 * Public routes that should have SEO settings.
 * Dashboard/admin routes are excluded as they shouldn't be indexed.
 */
export const SEO_ROUTES: SEORouteConfig[] = [
  // ============================================================================
  // Main Public Pages (Static SEO)
  // ============================================================================
  {
    path: '/',
    name: 'Home',
    description: 'A modern recruitment platform connecting talented candidates with great companies.',
    sitemapPriority: 1.0,
    includeInSitemap: true,
  },
  {
    path: '/candidates',
    name: 'Candidates Directory',
    description: 'Browse our directory of talented candidates looking for their next opportunity.',
    sitemapPriority: 0.9,
    includeInSitemap: true,
  },
  {
    path: '/companies',
    name: 'Companies Directory',
    description: 'Discover companies hiring and learn about their culture and open positions.',
    sitemapPriority: 0.9,
    includeInSitemap: true,
  },
  {
    path: '/jobs',
    name: 'Jobs Board',
    description: 'Find your next career opportunity. Browse open positions from top companies.',
    sitemapPriority: 0.9,
    includeInSitemap: true,
  },

  // ============================================================================
  // Content Listing Pages (Static SEO)
  // ============================================================================
  {
    path: '/blog',
    name: 'Blog',
    description: 'Read the latest insights, tips, and news about recruitment and careers.',
    sitemapPriority: 0.8,
    includeInSitemap: true,
  },
  {
    path: '/case-studies',
    name: 'Case Studies',
    description: 'See how companies have successfully hired using our platform.',
    sitemapPriority: 0.8,
    includeInSitemap: true,
  },
  {
    path: '/faqs',
    name: 'FAQs',
    description: 'Find answers to frequently asked questions about our platform.',
    sitemapPriority: 0.7,
    includeInSitemap: true,
  },
  {
    path: '/glossary',
    name: 'Glossary',
    description: 'Recruitment and HR terminology explained.',
    sitemapPriority: 0.7,
    includeInSitemap: true,
  },
  {
    path: '/contact',
    name: 'Contact',
    description: "Get in touch with our team. We'd love to hear from you.",
    sitemapPriority: 0.6,
    includeInSitemap: true,
  },

  // ============================================================================
  // Dynamic Pages with Programmatic SEO Templates
  // These use {{variable}} placeholders filled from content data
  // ============================================================================
  {
    path: '/jobs/*',
    name: 'Job Listing',
    description: '',
    sitemapPriority: 0.7,
    includeInSitemap: false, // Individual jobs added dynamically to sitemap
    titleTemplate: '{{job.title}} at {{job.company_name}} - {{job.location}}',
    descriptionTemplate: 'Apply for {{job.title}} at {{job.company_name}}. {{job.job_type}} {{job.work_mode}} position. {{job.summary}}',
  },
  {
    path: '/candidates/*',
    name: 'Candidate Profile',
    description: '',
    sitemapPriority: 0.7,
    includeInSitemap: false,
    titleTemplate: '{{candidate.professional_title}} ({{candidate.initials}}) - {{candidate.seniority}} Professional',
    descriptionTemplate: '{{candidate.seniority}} {{candidate.professional_title}} with {{candidate.years_of_experience}} years experience in {{candidate.industries}}. {{candidate.headline}}',
  },
  {
    path: '/companies/*',
    name: 'Company Profile',
    description: '',
    sitemapPriority: 0.7,
    includeInSitemap: false,
    titleTemplate: '{{company.name}} - {{company.industry}} Company',
    descriptionTemplate: '{{company.name}} is a {{company.company_size}} {{company.industry}} company. {{company.tagline}}',
  },
  {
    path: '/blog/*',
    name: 'Blog Post',
    description: '',
    sitemapPriority: 0.6,
    includeInSitemap: false,
    titleTemplate: '{{post.title}}',
    descriptionTemplate: '{{post.excerpt}}',
  },
  {
    path: '/case-studies/*',
    name: 'Case Study',
    description: '',
    sitemapPriority: 0.6,
    includeInSitemap: false,
    titleTemplate: '{{study.title}} - {{study.client_name}} Case Study',
    descriptionTemplate: '{{study.excerpt}}',
  },
  {
    path: '/glossary/*',
    name: 'Glossary Term',
    description: '',
    sitemapPriority: 0.5,
    includeInSitemap: false,
    titleTemplate: '{{term.title}} - Recruitment Glossary',
    descriptionTemplate: '{{term.definition_plain}}',
  },
]

// Export as JSON-compatible format for backend consumption
export const getSEORoutesJSON = () => JSON.stringify(SEO_ROUTES, null, 2)
