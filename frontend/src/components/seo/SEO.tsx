// SEO Component - Manages document head meta tags
import { useEffect, useMemo } from 'react'
import { useSEODefaults, usePageSEO } from '@/contexts/SEOContext'
import {
  SEOContentData,
  getEffectiveTitle,
  getEffectiveDescription,
} from '@/utils/seoTemplates'

interface SEOProps {
  // Custom SEO from content (highest priority)
  title?: string
  description?: string
  // Programmatic SEO content data (for template parsing)
  contentData?: SEOContentData
  // Standard SEO props
  canonical?: string
  ogType?: 'website' | 'article' | 'profile'
  ogImage?: string
  ogImageAlt?: string
  noindex?: boolean
  structuredData?: object
  article?: {
    publishedTime?: string
    modifiedTime?: string
    author?: string
    section?: string
    tags?: string[]
  }
}

// No hardcoded brand fallbacks for multi-tenant support
// Branding comes from BrandingSettings via SEOContext
const FALLBACK_OG_IMAGE = '/og-image.png'

export default function SEO({
  title,
  description,
  contentData,
  canonical,
  ogType = 'website',
  ogImage,
  ogImageAlt,
  noindex,
  structuredData,
  article,
}: SEOProps) {
  const seoDefaults = useSEODefaults()
  const pageSeo = usePageSEO()

  // Compute effective title and description using the priority chain:
  // 1. Custom SEO (title/description props from content) - highest priority
  // 2. Programmatic SEO (template with contentData)
  // 3. Static page SEO (from PageSEO)
  // 4. CMS Defaults - lowest priority
  const effectiveTitle = useMemo(() => {
    return getEffectiveTitle(
      title,                           // Custom SEO from content
      pageSeo?.titleTemplate,          // Template for programmatic SEO
      pageSeo?.title,                  // Static page SEO
      contentData || {},               // Content data for template parsing
      null                             // Fallback (null means use page name or default)
    )
  }, [title, pageSeo?.titleTemplate, pageSeo?.title, contentData])

  const effectiveDescription = useMemo(() => {
    return getEffectiveDescription(
      description,                     // Custom SEO from content
      pageSeo?.descriptionTemplate,    // Template for programmatic SEO
      pageSeo?.description,            // Static page SEO
      contentData || {},               // Content data for template parsing
      seoDefaults.defaultDescription,  // From CMS settings
      160                              // Max length for descriptions
    )
  }, [description, pageSeo?.descriptionTemplate, pageSeo?.description, contentData, seoDefaults.defaultDescription])

  const effectiveOgImage = ogImage || pageSeo?.ogImage || seoDefaults.defaultOgImage || FALLBACK_OG_IMAGE
  const effectiveNoindex = noindex ?? pageSeo?.noindex ?? false
  const titleSuffix = seoDefaults.titleSuffix

  // Build fallback title from branding settings (no hardcoded fallbacks)
  const siteName = seoDefaults.companyName
  const tagline = seoDefaults.tagline
  const fallbackTitle = siteName ? (tagline ? `${siteName} - ${tagline}` : siteName) : ''

  const pageTitle = effectiveTitle ? `${effectiveTitle}${titleSuffix}` : fallbackTitle
  const currentUrl = typeof window !== 'undefined' ? window.location.href : ''
  const canonicalUrl = canonical || pageSeo?.canonicalUrl || currentUrl

  useEffect(() => {
    // Update document title
    document.title = pageTitle

    // Helper to set or update meta tag
    const setMetaTag = (name: string, content: string, property?: boolean) => {
      const attr = property ? 'property' : 'name'
      let element = document.querySelector(`meta[${attr}="${name}"]`)
      if (!element) {
        element = document.createElement('meta')
        element.setAttribute(attr, name)
        document.head.appendChild(element)
      }
      element.setAttribute('content', content)
    }

    // Helper to remove meta tag
    const removeMetaTag = (name: string, property?: boolean) => {
      const attr = property ? 'property' : 'name'
      const element = document.querySelector(`meta[${attr}="${name}"]`)
      if (element) {
        element.remove()
      }
    }

    // Helper to set or update link tag
    const setLinkTag = (rel: string, href: string) => {
      let element = document.querySelector(`link[rel="${rel}"]`)
      if (!element) {
        element = document.createElement('link')
        element.setAttribute('rel', rel)
        document.head.appendChild(element)
      }
      element.setAttribute('href', href)
    }

    // Set meta description
    setMetaTag('description', effectiveDescription)

    // Set robots meta
    if (effectiveNoindex) {
      setMetaTag('robots', 'noindex, nofollow')
    } else {
      setMetaTag('robots', 'index, follow')
    }

    // Set canonical URL
    setLinkTag('canonical', canonicalUrl)

    // Site verification meta tags (from CMS defaults)
    if (seoDefaults.googleSiteVerification) {
      setMetaTag('google-site-verification', seoDefaults.googleSiteVerification)
    } else {
      removeMetaTag('google-site-verification')
    }
    if (seoDefaults.bingSiteVerification) {
      setMetaTag('msvalidate.01', seoDefaults.bingSiteVerification)
    } else {
      removeMetaTag('msvalidate.01')
    }

    // Open Graph tags
    setMetaTag('og:title', effectiveTitle || fallbackTitle, true)
    setMetaTag('og:description', effectiveDescription, true)
    setMetaTag('og:type', ogType, true)
    setMetaTag('og:url', canonicalUrl, true)
    setMetaTag('og:site_name', siteName, true)
    setMetaTag('og:image', effectiveOgImage, true)
    if (ogImageAlt) {
      setMetaTag('og:image:alt', ogImageAlt, true)
    }

    // Article specific Open Graph tags
    if (ogType === 'article' && article) {
      if (article.publishedTime) {
        setMetaTag('article:published_time', article.publishedTime, true)
      }
      if (article.modifiedTime) {
        setMetaTag('article:modified_time', article.modifiedTime, true)
      }
      if (article.author) {
        setMetaTag('article:author', article.author, true)
      }
      if (article.section) {
        setMetaTag('article:section', article.section, true)
      }
      article.tags?.forEach((tag, index) => {
        setMetaTag(`article:tag:${index}`, tag, true)
      })
    }

    // Twitter Card tags
    setMetaTag('twitter:card', 'summary_large_image')
    setMetaTag('twitter:title', effectiveTitle || fallbackTitle)
    setMetaTag('twitter:description', effectiveDescription)
    setMetaTag('twitter:image', effectiveOgImage)

    // Structured data
    if (structuredData) {
      let scriptElement = document.querySelector('script[type="application/ld+json"]')
      if (!scriptElement) {
        scriptElement = document.createElement('script')
        scriptElement.setAttribute('type', 'application/ld+json')
        document.head.appendChild(scriptElement)
      }
      scriptElement.textContent = JSON.stringify(structuredData)
    }

    // Cleanup function
    return () => {
      // We don't remove tags on unmount to avoid flashing
      // They will be overwritten by the next page
    }
  }, [pageTitle, effectiveDescription, canonicalUrl, ogType, effectiveOgImage, ogImageAlt, effectiveNoindex, structuredData, article, effectiveTitle, seoDefaults, siteName, fallbackTitle])

  return null
}

// Structured Data Helpers
export const createOrganizationSchema = (data: {
  name: string
  url: string
  logo?: string
  description?: string
  email?: string
  phone?: string
  address?: {
    streetAddress?: string
    addressLocality?: string
    addressRegion?: string
    postalCode?: string
    addressCountry?: string
  }
  sameAs?: string[]
}) => ({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: data.name,
  url: data.url,
  ...(data.logo && { logo: data.logo }),
  ...(data.description && { description: data.description }),
  ...(data.email && { email: data.email }),
  ...(data.phone && { telephone: data.phone }),
  ...(data.address && {
    address: {
      '@type': 'PostalAddress',
      ...data.address,
    },
  }),
  ...(data.sameAs && { sameAs: data.sameAs }),
})

export const createJobPostingSchema = (data: {
  title: string
  description: string
  datePosted: string
  validThrough?: string
  employmentType: string | string[]
  hiringOrganization: {
    name: string
    sameAs?: string
    logo?: string
  }
  jobLocation?: {
    addressLocality?: string
    addressRegion?: string
    addressCountry?: string
  }
  isRemote?: boolean
  baseSalary?: {
    currency: string
    minValue?: number
    maxValue?: number
    unitText?: 'HOUR' | 'DAY' | 'WEEK' | 'MONTH' | 'YEAR'
  }
}) => ({
  '@context': 'https://schema.org',
  '@type': 'JobPosting',
  title: data.title,
  description: data.description,
  datePosted: data.datePosted,
  ...(data.validThrough && { validThrough: data.validThrough }),
  employmentType: data.employmentType,
  hiringOrganization: {
    '@type': 'Organization',
    name: data.hiringOrganization.name,
    ...(data.hiringOrganization.sameAs && { sameAs: data.hiringOrganization.sameAs }),
    ...(data.hiringOrganization.logo && { logo: data.hiringOrganization.logo }),
  },
  ...(data.jobLocation && {
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        ...data.jobLocation,
      },
    },
  }),
  ...(data.isRemote && { jobLocationType: 'TELECOMMUTE' }),
  ...(data.baseSalary && {
    baseSalary: {
      '@type': 'MonetaryAmount',
      currency: data.baseSalary.currency,
      value: {
        '@type': 'QuantitativeValue',
        ...(data.baseSalary.minValue && { minValue: data.baseSalary.minValue }),
        ...(data.baseSalary.maxValue && { maxValue: data.baseSalary.maxValue }),
        unitText: data.baseSalary.unitText || 'YEAR',
      },
    },
  }),
})

export const createBreadcrumbSchema = (items: { name: string; url: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: item.url,
  })),
})

export const createArticleSchema = (data: {
  headline: string
  description: string
  image?: string
  datePublished: string
  dateModified?: string
  author: {
    name: string
    url?: string
  }
  publisher: {
    name: string
    logo?: string
  }
}) => ({
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: data.headline,
  description: data.description,
  ...(data.image && { image: data.image }),
  datePublished: data.datePublished,
  ...(data.dateModified && { dateModified: data.dateModified }),
  author: {
    '@type': 'Person',
    name: data.author.name,
    ...(data.author.url && { url: data.author.url }),
  },
  publisher: {
    '@type': 'Organization',
    name: data.publisher.name,
    ...(data.publisher.logo && {
      logo: {
        '@type': 'ImageObject',
        url: data.publisher.logo,
      },
    }),
  },
})

export const createFAQSchema = (faqs: { question: string; answer: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((faq) => ({
    '@type': 'Question',
    name: faq.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: faq.answer,
    },
  })),
})

export const createDefinedTermSchema = (data: {
  name: string
  description: string
  url?: string
}) => ({
  '@context': 'https://schema.org',
  '@type': 'DefinedTerm',
  name: data.name,
  description: data.description,
  ...(data.url && { url: data.url }),
})

export const createWebPageSchema = (data: {
  name: string
  description: string
  url?: string
  datePublished?: string
  dateModified?: string
  publisher?: {
    name: string
    logo?: string
  }
}) => ({
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: data.name,
  description: data.description,
  ...(data.url && { url: data.url }),
  ...(data.datePublished && { datePublished: data.datePublished }),
  ...(data.dateModified && { dateModified: data.dateModified }),
  ...(data.publisher && {
    publisher: {
      '@type': 'Organization',
      name: data.publisher.name,
      ...(data.publisher.logo && {
        logo: {
          '@type': 'ImageObject',
          url: data.publisher.logo,
        },
      }),
    },
  }),
})

export const createCaseStudySchema = (data: {
  name: string
  description: string
  url?: string
  image?: string
  datePublished?: string
  dateModified?: string
  author?: {
    name: string
  }
  publisher?: {
    name: string
    logo?: string
  }
  about?: {
    name: string
    industry?: string
  }
}) => ({
  '@context': 'https://schema.org',
  '@type': 'Article',
  '@id': data.url,
  headline: data.name,
  description: data.description,
  ...(data.url && { url: data.url }),
  ...(data.image && { image: data.image }),
  ...(data.datePublished && { datePublished: data.datePublished }),
  ...(data.dateModified && { dateModified: data.dateModified }),
  ...(data.author && {
    author: {
      '@type': 'Person',
      name: data.author.name,
    },
  }),
  ...(data.publisher && {
    publisher: {
      '@type': 'Organization',
      name: data.publisher.name,
      ...(data.publisher.logo && {
        logo: {
          '@type': 'ImageObject',
          url: data.publisher.logo,
        },
      }),
    },
  }),
  ...(data.about && {
    about: {
      '@type': 'Organization',
      name: data.about.name,
      ...(data.about.industry && { industry: data.about.industry }),
    },
  }),
})
