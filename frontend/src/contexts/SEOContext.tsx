// SEO Context - Provides CMS-managed SEO defaults and page-specific SEO across the app
import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { cmsSeoMetaDefaults, cmsPageSeo } from '@/services/cms'
import type { CMSPageSEOPublic } from '@/types'

interface SEODefaults {
  companyName: string
  tagline: string
  titleSuffix: string
  titleSuffixTemplate: string
  defaultDescription: string
  defaultOgImage: string | null
  googleSiteVerification: string
  bingSiteVerification: string
  googleAnalyticsId: string
  googleTagManagerId: string
  isLoaded: boolean
}

interface PageSEO {
  title: string | null
  description: string | null
  ogImage: string | null
  titleTemplate: string | null
  descriptionTemplate: string | null
  noindex: boolean
  canonicalUrl: string | null
}

interface SEOContextValue {
  defaults: SEODefaults
  pageSeo: PageSEO | null
  allPageSeo: CMSPageSEOPublic[]
  getPageSeo: (path: string) => PageSEO | null
  getRawPageSeo: (path: string) => CMSPageSEOPublic | null
}

// Initial state before branding loads - no hardcoded brand names for multi-tenant support
const defaultValues: SEODefaults = {
  companyName: '',
  tagline: '',
  titleSuffix: '',
  titleSuffixTemplate: '',
  defaultDescription: '',
  defaultOgImage: '/og-image.png',
  googleSiteVerification: '',
  bingSiteVerification: '',
  googleAnalyticsId: '',
  googleTagManagerId: '',
  isLoaded: false,
}

const defaultContextValue: SEOContextValue = {
  defaults: defaultValues,
  pageSeo: null,
  allPageSeo: [],
  getPageSeo: () => null,
  getRawPageSeo: () => null,
}

const SEOContext = createContext<SEOContextValue>(defaultContextValue)

export function SEOProvider({ children }: { children: ReactNode }) {
  const location = useLocation()
  const [seoDefaults, setSeoDefaults] = useState<SEODefaults>(defaultValues)
  const [allPageSeo, setAllPageSeo] = useState<CMSPageSEOPublic[]>([])
  const [currentPageSeo, setCurrentPageSeo] = useState<PageSEO | null>(null)

  // Fetch SEO defaults and all page SEO entries on mount
  useEffect(() => {
    async function fetchSEOData() {
      try {
        // Fetch both in parallel
        const [defaultsData, pagesData] = await Promise.all([
          cmsSeoMetaDefaults.getPublic(),
          cmsPageSeo.getAll(),
        ])

        setSeoDefaults({
          companyName: defaultsData.company_name || '',
          tagline: defaultsData.tagline || '',
          titleSuffix: defaultsData.resolved_title_suffix || '',
          titleSuffixTemplate: defaultsData.default_title_suffix || '',
          defaultDescription: defaultsData.default_description || '',
          defaultOgImage: defaultsData.default_og_image_url || '/og-image.png',
          googleSiteVerification: defaultsData.google_site_verification || '',
          bingSiteVerification: defaultsData.bing_site_verification || '',
          googleAnalyticsId: defaultsData.google_analytics_id || '',
          googleTagManagerId: defaultsData.google_tag_manager_id || '',
          isLoaded: true,
        })

        setAllPageSeo(pagesData)
      } catch {
        // Use defaults if API fails
        setSeoDefaults(prev => ({ ...prev, isLoaded: true }))
      }
    }

    fetchSEOData()
  }, [])

  // Find matching raw page SEO entry for a given path
  const getRawPageSeo = useCallback((path: string): CMSPageSEOPublic | null => {
    // Normalize path
    const normalizedPath = path.startsWith('/') ? path : '/' + path

    // Try exact match first
    let match = allPageSeo.find(p => p.path === normalizedPath)

    // If no exact match, try wildcard patterns
    if (!match) {
      // Get all wildcard patterns, sorted by length (longest first for more specific matches)
      const wildcardEntries = allPageSeo
        .filter(p => p.path.endsWith('*'))
        .sort((a, b) => b.path.length - a.path.length)

      for (const entry of wildcardEntries) {
        const pattern = entry.path.slice(0, -1) // Remove trailing *
        if (normalizedPath.startsWith(pattern)) {
          match = entry
          break
        }
      }
    }

    return match || null
  }, [allPageSeo])

  // Find matching page SEO for a given path (transformed for easy use)
  const getPageSeo = useCallback((path: string): PageSEO | null => {
    const match = getRawPageSeo(path)
    if (!match) return null

    return {
      title: match.title || null,
      description: match.description || null,
      ogImage: match.og_image_url || null,
      titleTemplate: match.title_template || null,
      descriptionTemplate: match.description_template || null,
      noindex: match.noindex,
      canonicalUrl: match.canonical_url || null,
    }
  }, [getRawPageSeo])

  // Update current page SEO when location changes
  useEffect(() => {
    const pageSeo = getPageSeo(location.pathname)
    setCurrentPageSeo(pageSeo)
  }, [location.pathname, getPageSeo])

  const contextValue: SEOContextValue = {
    defaults: seoDefaults,
    pageSeo: currentPageSeo,
    allPageSeo,
    getPageSeo,
  }

  return (
    <SEOContext.Provider value={contextValue}>
      {children}
    </SEOContext.Provider>
  )
}

// Hook to get all SEO data
export function useSEO() {
  return useContext(SEOContext)
}

// Convenience hook for just the defaults (backwards compatible)
export function useSEODefaults() {
  const { defaults } = useContext(SEOContext)
  return defaults
}

// Hook to get current page SEO
export function usePageSEO() {
  const { pageSeo } = useContext(SEOContext)
  return pageSeo
}
