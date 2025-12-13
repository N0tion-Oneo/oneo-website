// Google Analytics 4 Component
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useSEODefaults } from '@/contexts/SEOContext'

// Fallback to env variable if CMS settings not available
let GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || ''

declare global {
  interface Window {
    dataLayer: unknown[]
    gtag: (...args: unknown[]) => void
  }
}

// Initialize GA4 with a specific measurement ID
export function initGA(measurementId?: string) {
  const gaId = measurementId || GA_MEASUREMENT_ID
  if (!gaId || typeof window === 'undefined') return

  // Check if already initialized with this ID
  if (window.gtag) {
    // If already initialized, just configure with new ID
    window.gtag('config', gaId, {
      page_path: window.location.pathname,
      anonymize_ip: true,
      cookie_flags: 'SameSite=None;Secure',
    })
    return
  }

  // Create script element
  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`
  document.head.appendChild(script)

  // Initialize dataLayer
  window.dataLayer = window.dataLayer || []
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer.push(args)
  }
  window.gtag('js', new Date())
  window.gtag('config', gaId, {
    page_path: window.location.pathname,
    anonymize_ip: true,
    cookie_flags: 'SameSite=None;Secure',
  })

  // Update the module-level variable
  GA_MEASUREMENT_ID = gaId
}

// Track page views
export function trackPageView(path: string) {
  if (!GA_MEASUREMENT_ID || typeof window === 'undefined' || !window.gtag) return

  window.gtag('config', GA_MEASUREMENT_ID, {
    page_path: path,
  })
}

// Track custom events
export function trackEvent(
  eventName: string,
  params?: Record<string, unknown>
) {
  if (!GA_MEASUREMENT_ID || typeof window === 'undefined' || !window.gtag) return

  window.gtag('event', eventName, params)
}

// Pre-defined event trackers
export const analytics = {
  // Job events
  jobView: (jobId: string, jobTitle: string, companyName: string) => {
    trackEvent('view_job', {
      job_id: jobId,
      job_title: jobTitle,
      company_name: companyName,
    })
  },

  jobApply: (jobId: string, jobTitle: string, companyName: string) => {
    trackEvent('apply_job', {
      job_id: jobId,
      job_title: jobTitle,
      company_name: companyName,
    })
  },

  jobSearch: (query: string, resultsCount: number) => {
    trackEvent('search', {
      search_term: query,
      results_count: resultsCount,
    })
  },

  // Candidate events
  candidateView: (candidateId: string) => {
    trackEvent('view_candidate', {
      candidate_id: candidateId,
    })
  },

  candidateContact: (candidateId: string) => {
    trackEvent('contact_candidate', {
      candidate_id: candidateId,
    })
  },

  // Company events
  companyView: (companyId: string, companyName: string) => {
    trackEvent('view_company', {
      company_id: companyId,
      company_name: companyName,
    })
  },

  // Blog events
  blogPostView: (postId: string, postTitle: string, category: string) => {
    trackEvent('view_blog_post', {
      post_id: postId,
      post_title: postTitle,
      category: category,
    })
  },

  blogShare: (postId: string, platform: string) => {
    trackEvent('share_blog_post', {
      post_id: postId,
      platform: platform,
    })
  },

  // Contact events
  contactFormSubmit: (subject: string) => {
    trackEvent('contact_form_submit', {
      subject: subject,
    })
  },

  newsletterSubscribe: () => {
    trackEvent('newsletter_subscribe')
  },

  // Auth events
  signUp: (userType: string) => {
    trackEvent('sign_up', {
      method: 'email',
      user_type: userType,
    })
  },

  login: (userType: string) => {
    trackEvent('login', {
      method: 'email',
      user_type: userType,
    })
  },

  // Conversion events
  conversion: (eventName: string, value?: number, currency?: string) => {
    trackEvent('conversion', {
      send_to: GA_MEASUREMENT_ID,
      event_name: eventName,
      ...(value && { value }),
      ...(currency && { currency }),
    })
  },
}

// React component that tracks page views on route changes
export default function GoogleAnalytics() {
  const location = useLocation()
  const seoDefaults = useSEODefaults()
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize GA when SEO defaults are loaded
  useEffect(() => {
    if (!seoDefaults.isLoaded) return

    const gaId = seoDefaults.googleAnalyticsId || GA_MEASUREMENT_ID
    if (gaId) {
      initGA(gaId)
      setIsInitialized(true)
    }
  }, [seoDefaults.isLoaded, seoDefaults.googleAnalyticsId])

  // Track page views after initialization
  useEffect(() => {
    if (isInitialized) {
      trackPageView(location.pathname + location.search)
    }
  }, [location, isInitialized])

  return null
}
