/**
 * SEO Template Parser
 *
 * Parses SEO templates with {{variable}} syntax and replaces them with content data.
 * Used for programmatic SEO on dynamic pages like /jobs/*, /candidates/*, etc.
 *
 * Priority chain:
 * 1. Custom SEO (meta_title, meta_description from content) - highest
 * 2. Programmatic SEO (template with variables)
 * 3. Static page SEO (title, description from PageSEO)
 * 4. CMS Defaults - lowest
 */

// Content data types for different page types
export interface JobSEOData {
  title: string
  company_name: string
  seniority: string
  job_type: string
  department: string
  location: string
  work_mode: string
  salary_range: string
  summary: string
}

export interface CandidateSEOData {
  initials: string
  professional_title: string
  headline: string
  seniority: string
  location: string
  work_preference: string
  years_of_experience: string | number
  industries: string
}

export interface CompanySEOData {
  name: string
  tagline: string
  industry: string
  company_size: string
  location: string
  founded_year: string | number
  remote_work_policy: string
}

export interface BlogPostSEOData {
  title: string
  meta_title?: string
  meta_description?: string
  excerpt: string
  category: string
  author_name: string
  published_at: string
}

export interface GlossaryTermSEOData {
  title: string
  definition_plain: string
  meta_title?: string
  meta_description?: string
}

export interface CaseStudySEOData {
  title: string
  client_name: string
  industry: string
  excerpt: string
  meta_title?: string
  meta_description?: string
}

// Union type for all SEO data
export type SEOContentData = {
  job?: JobSEOData
  candidate?: CandidateSEOData
  company?: CompanySEOData
  post?: BlogPostSEOData
  term?: GlossaryTermSEOData
  study?: CaseStudySEOData
}

/**
 * Parse a template string and replace {{variable}} placeholders with values
 *
 * @param template - Template string with {{variable.field}} syntax
 * @param data - Content data object with values to substitute
 * @param maxLength - Optional max length for the result (truncates if exceeded)
 * @returns Parsed string with variables replaced
 */
export function parseTemplate(
  template: string,
  data: SEOContentData,
  maxLength?: number
): string {
  if (!template) return ''

  // Replace all {{variable.field}} patterns
  let result = template.replace(/\{\{(\w+)\.(\w+)\}\}/g, (match, objectName, fieldName) => {
    const obj = data[objectName as keyof SEOContentData]
    if (!obj) return ''

    const value = obj[fieldName as keyof typeof obj]
    if (value === undefined || value === null) return ''

    // Convert to string
    return String(value)
  })

  // Clean up multiple spaces and trim
  result = result.replace(/\s+/g, ' ').trim()

  // Remove any unreplaced variables (show empty rather than {{variable}})
  result = result.replace(/\{\{[^}]+\}\}/g, '').trim()

  // Clean up orphaned punctuation (e.g., "Apply for . position" -> "Apply for position")
  result = result.replace(/\s*\.\s*\./g, '.').replace(/\s+\./g, '.').replace(/\.\s+,/g, ',')

  // Truncate if maxLength specified
  if (maxLength && result.length > maxLength) {
    result = result.substring(0, maxLength - 3).trim() + '...'
  }

  return result
}

/**
 * Get effective SEO title for content
 *
 * Priority:
 * 1. Custom meta_title from content (if available)
 * 2. Programmatic template (if provided and has variables)
 * 3. Static title from PageSEO
 * 4. Fallback
 */
export function getEffectiveTitle(
  customTitle: string | undefined | null,
  template: string | undefined | null,
  staticTitle: string | undefined | null,
  data: SEOContentData,
  fallback: string = ''
): string {
  // 1. Custom title from content takes priority
  if (customTitle) return customTitle

  // 2. Try template if available
  if (template) {
    const parsed = parseTemplate(template, data)
    if (parsed) return parsed
  }

  // 3. Static title
  if (staticTitle) return staticTitle

  // 4. Fallback
  return fallback
}

/**
 * Get effective SEO description for content
 *
 * Priority:
 * 1. Custom meta_description from content (if available)
 * 2. Programmatic template (if provided and has variables)
 * 3. Static description from PageSEO
 * 4. Fallback
 */
export function getEffectiveDescription(
  customDescription: string | undefined | null,
  template: string | undefined | null,
  staticDescription: string | undefined | null,
  data: SEOContentData,
  fallback: string = '',
  maxLength: number = 160
): string {
  // 1. Custom description from content takes priority
  if (customDescription) {
    return customDescription.length > maxLength
      ? customDescription.substring(0, maxLength - 3) + '...'
      : customDescription
  }

  // 2. Try template if available
  if (template) {
    const parsed = parseTemplate(template, data, maxLength)
    if (parsed) return parsed
  }

  // 3. Static description
  if (staticDescription) {
    return staticDescription.length > maxLength
      ? staticDescription.substring(0, maxLength - 3) + '...'
      : staticDescription
  }

  // 4. Fallback
  return fallback
}

// Helper functions to build SEO data from API responses

export function buildJobSEOData(job: {
  title: string
  company?: { name: string } | null
  seniority?: string
  job_type?: string
  department?: string
  location_city?: { name: string } | null
  location_country?: { name: string } | null
  work_mode?: string
  salary_min?: number | null
  salary_max?: number | null
  salary_currency?: string
  salary_visible?: boolean
  summary?: string
}): JobSEOData {
  // Build location string
  const locationParts = []
  if (job.location_city?.name) locationParts.push(job.location_city.name)
  if (job.location_country?.name) locationParts.push(job.location_country.name)
  const location = locationParts.join(', ') || 'Remote'

  // Build salary range string
  let salaryRange = ''
  if (job.salary_visible && job.salary_min && job.salary_max) {
    const currency = job.salary_currency || 'ZAR'
    const formatter = new Intl.NumberFormat('en-ZA', { style: 'currency', currency, maximumFractionDigits: 0 })
    salaryRange = `${formatter.format(job.salary_min)} - ${formatter.format(job.salary_max)}`
  }

  // Format job type
  const jobTypeMap: Record<string, string> = {
    full_time: 'Full-time',
    part_time: 'Part-time',
    contract: 'Contract',
    freelance: 'Freelance',
  }

  // Format work mode
  const workModeMap: Record<string, string> = {
    remote: 'Remote',
    hybrid: 'Hybrid',
    onsite: 'On-site',
  }

  // Format seniority
  const seniorityMap: Record<string, string> = {
    intern: 'Intern',
    junior: 'Junior',
    mid: 'Mid-Level',
    senior: 'Senior',
    lead: 'Lead',
    principal: 'Principal',
    executive: 'Executive / C-Suite',
  }

  return {
    title: job.title,
    company_name: job.company?.name || '',
    seniority: seniorityMap[job.seniority || ''] || job.seniority || '',
    job_type: jobTypeMap[job.job_type || ''] || job.job_type || '',
    department: job.department || '',
    location,
    work_mode: workModeMap[job.work_mode || ''] || job.work_mode || '',
    salary_range: salaryRange,
    summary: job.summary || '',
  }
}

export function buildCandidateSEOData(candidate: {
  initials?: string
  professional_title?: string
  headline?: string
  seniority?: string
  city?: string
  country?: string
  location?: string
  work_preference?: string
  years_of_experience?: number
  industries?: { name: string }[]
}): CandidateSEOData {
  // Build location
  const location = candidate.location || [candidate.city, candidate.country].filter(Boolean).join(', ') || ''

  // Build industries string
  const industries = candidate.industries?.map(i => i.name).join(', ') || ''

  // Format seniority
  const seniorityMap: Record<string, string> = {
    intern: 'Intern',
    junior: 'Junior',
    mid: 'Mid-Level',
    senior: 'Senior',
    lead: 'Lead',
    principal: 'Principal',
    executive: 'Executive / C-Suite',
  }

  // Format work preference
  const workPrefMap: Record<string, string> = {
    remote: 'Remote',
    hybrid: 'Hybrid',
    onsite: 'On-site',
    flexible: 'Flexible',
  }

  return {
    initials: candidate.initials || '',
    professional_title: candidate.professional_title || '',
    headline: candidate.headline || '',
    seniority: seniorityMap[candidate.seniority || ''] || candidate.seniority || '',
    location,
    work_preference: workPrefMap[candidate.work_preference || ''] || candidate.work_preference || '',
    years_of_experience: candidate.years_of_experience || 0,
    industries,
  }
}

export function buildCompanySEOData(company: {
  name: string
  tagline?: string
  industry?: { name: string } | null
  company_size?: string
  headquarters_location?: string
  headquarters_city?: { name: string } | null
  headquarters_country?: { name: string } | null
  founded_year?: number | null
  remote_work_policy?: string
}): CompanySEOData {
  // Build location
  const location = company.headquarters_location ||
    [company.headquarters_city?.name, company.headquarters_country?.name].filter(Boolean).join(', ') || ''

  // Format company size
  const sizeMap: Record<string, string> = {
    '1-10': '1-10 employees',
    '11-50': '11-50 employees',
    '51-200': '51-200 employees',
    '201-500': '201-500 employees',
    '501-1000': '501-1000 employees',
    '1001-5000': '1001-5000 employees',
    '5001+': '5001+ employees',
  }

  return {
    name: company.name,
    tagline: company.tagline || '',
    industry: company.industry?.name || '',
    company_size: sizeMap[company.company_size || ''] || company.company_size || '',
    location,
    founded_year: company.founded_year || '',
    remote_work_policy: company.remote_work_policy || '',
  }
}

export function buildBlogPostSEOData(post: {
  title: string
  meta_title?: string
  meta_description?: string
  excerpt?: string
  category?: string
  author_name?: string | null
  published_at?: string | null
}): BlogPostSEOData {
  return {
    title: post.title,
    meta_title: post.meta_title,
    meta_description: post.meta_description,
    excerpt: post.excerpt || '',
    category: post.category || '',
    author_name: post.author_name || '',
    published_at: post.published_at || '',
  }
}

export function buildGlossaryTermSEOData(term: {
  title: string
  definition_plain?: string
  meta_title?: string
  meta_description?: string
}): GlossaryTermSEOData {
  return {
    title: term.title,
    definition_plain: term.definition_plain || '',
    meta_title: term.meta_title,
    meta_description: term.meta_description,
  }
}

export function buildCaseStudySEOData(study: {
  title: string
  client_name?: string
  industry?: string
  excerpt?: string
  meta_title?: string
  meta_description?: string
}): CaseStudySEOData {
  return {
    title: study.title,
    client_name: study.client_name || '',
    industry: study.industry || '',
    excerpt: study.excerpt || '',
    meta_title: study.meta_title,
    meta_description: study.meta_description,
  }
}
