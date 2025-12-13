# Page SEO Configuration

This guide explains how to configure SEO settings for pages in the application.

## Overview

The SEO system automatically detects pages from a shared configuration file and allows admins to customize SEO metadata through the CMS. Pages are synced from `shared/seo-routes.json` which serves as the single source of truth for all public routes.

## Adding a New Page

### Step 1: Add the Route

Add your route to the frontend router in `App.tsx`:

```tsx
<Route path="/about" element={<AboutPage />} />
```

### Step 2: Register in SEO Routes

Add an entry to `shared/seo-routes.json`:

**For static pages** (fixed content like `/about`, `/pricing`, `/contact`):

```json
{
  "path": "/about",
  "name": "About Us",
  "description": "Learn more about our company and mission.",
  "sitemapPriority": 0.7,
  "includeInSitemap": true
}
```

**For dynamic/wildcard pages** (content-driven like `/products/*`, `/articles/*`):

```json
{
  "path": "/products/*",
  "name": "Product Detail",
  "description": "",
  "sitemapPriority": 0.6,
  "includeInSitemap": false,
  "titleTemplate": "{{product.name}} - {{product.category}}",
  "descriptionTemplate": "{{product.description}}"
}
```

### Step 3: Add SEO Component to Page

Import and use the `<SEO />` component in your page:

**Static page:**

```tsx
import { SEO } from '@/components/seo'
import { Navbar } from '@/components/layout'

export default function AboutPage() {
  return (
    <div>
      <SEO />
      <Navbar />
      {/* Page content */}
    </div>
  )
}
```

**Dynamic page with content-specific SEO:**

```tsx
import { SEO } from '@/components/seo'
import { Navbar } from '@/components/layout'
import { buildProductSEOData } from '@/utils/seoTemplates'

export default function ProductPage() {
  const { product } = useProduct()
  const seoData = buildProductSEOData(product)

  return (
    <div>
      <SEO
        title={product.meta_title}
        description={product.meta_description}
        contentData={{ product: seoData }}
      />
      <Navbar />
      {/* Page content */}
    </div>
  )
}
```

### Step 4: Configure in CMS

After adding the page, it will automatically appear in **CMS > SEO > Page SEO**. From there you can:

- Set custom title and meta description (static pages)
- Configure programmatic SEO templates (wildcard pages)
- Set Open Graph image
- Configure sitemap priority
- Enable/disable indexing

## Configuration Options

### seo-routes.json Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `path` | string | Yes | URL path. Use `*` suffix for wildcards (e.g., `/jobs/*`) |
| `name` | string | Yes | Internal name for the page |
| `description` | string | Yes | Default meta description |
| `sitemapPriority` | number | Yes | Priority in sitemap (0.0 to 1.0) |
| `includeInSitemap` | boolean | Yes | Whether to include in sitemap |
| `titleTemplate` | string | No | Template for dynamic titles (wildcard pages only) |
| `descriptionTemplate` | string | No | Template for dynamic descriptions (wildcard pages only) |

### Sitemap Priority Guidelines

| Priority | Use For |
|----------|---------|
| 1.0 | Homepage |
| 0.9 | Main navigation pages (Jobs, Candidates, Companies) |
| 0.8 | Content listing pages (Blog, Case Studies) |
| 0.7 | Secondary pages, individual content items |
| 0.6 | Tertiary pages |
| 0.5 | Default |
| 0.1-0.4 | Low priority pages |

## Programmatic SEO Templates

For wildcard routes, you can use template variables that get replaced with content data.

### Available Variables by Page Type

**Jobs (`/jobs/*`):**
- `{{job.title}}` - Job title
- `{{job.company_name}}` - Company name
- `{{job.location}}` - Job location
- `{{job.job_type}}` - Full-time, Part-time, etc.
- `{{job.work_mode}}` - Remote, Hybrid, On-site
- `{{job.seniority}}` - Junior, Mid, Senior, etc.
- `{{job.salary_range}}` - Salary range
- `{{job.summary}}` - Job summary

**Candidates (`/candidates/*`):**
- `{{candidate.initials}}` - Candidate initials
- `{{candidate.professional_title}}` - Professional title
- `{{candidate.headline}}` - Profile headline
- `{{candidate.seniority}}` - Seniority level
- `{{candidate.location}}` - Location
- `{{candidate.work_preference}}` - Work preference
- `{{candidate.years_of_experience}}` - Years of experience
- `{{candidate.industries}}` - Industries

**Companies (`/companies/*`):**
- `{{company.name}}` - Company name
- `{{company.tagline}}` - Company tagline
- `{{company.industry}}` - Industry
- `{{company.company_size}}` - Company size
- `{{company.location}}` - Location
- `{{company.founded_year}}` - Founded year

**Blog Posts (`/blog/*`):**
- `{{post.title}}` - Post title
- `{{post.excerpt}}` - Post excerpt
- `{{post.category}}` - Category
- `{{post.author_name}}` - Author name

**Case Studies (`/case-studies/*`):**
- `{{study.title}}` - Study title
- `{{study.client_name}}` - Client name
- `{{study.industry}}` - Industry
- `{{study.excerpt}}` - Excerpt

**Glossary Terms (`/glossary/*`):**
- `{{term.title}}` - Term title
- `{{term.definition_plain}}` - Plain text definition

## SEO Priority Chain

The SEO system uses a priority chain to determine the final title and description:

1. **Content-specific SEO** (highest) - `meta_title` and `meta_description` fields on the content model
2. **Programmatic templates** - Templates with variables filled from content data
3. **Static page SEO** - Title and description set in CMS > Page SEO
4. **CMS Defaults** - Default description from CMS > SEO Meta Defaults

## Title Suffix

All page titles automatically get a suffix appended (configured in **CMS > SEO Meta Defaults**).

The suffix template supports variables:
- `{{company_name}}` - Company name from Settings > Branding
- `{{tagline}}` - Tagline from Settings > Branding

Example: ` | {{company_name}}` becomes ` | Acme Corp`

## Best Practices

1. **Keep titles under 60 characters** - Search engines truncate longer titles
2. **Keep descriptions under 160 characters** - Optimal for search result display
3. **Use unique titles and descriptions** - Avoid duplicate content issues
4. **Include relevant keywords** - But don't keyword stuff
5. **Write for humans** - Titles and descriptions should be compelling and readable
6. **Use templates for consistency** - Programmatic templates ensure consistent formatting across similar pages

## Troubleshooting

### Page not appearing in CMS

- Ensure the page is added to `shared/seo-routes.json`
- Refresh the Page SEO list in CMS (pages auto-sync on load)

### SEO not updating

- Check that the `<SEO />` component is included in the page
- Verify the correct props are being passed for dynamic pages
- Check browser dev tools for the actual `<title>` and meta tags

### Template variables not replacing

- Ensure `contentData` prop is passed to `<SEO />` component
- Verify the data structure matches expected variable names
- Check that a `buildXxxSEOData()` function exists for your content type
