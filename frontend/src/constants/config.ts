// Application configuration constants

export const CONFIG = {
  // API
  API_URL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  API_TIMEOUT: 30000, // 30 seconds

  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],

  // File uploads
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'application/msword'],

  // Form validation
  MIN_PASSWORD_LENGTH: 8,
  MAX_FILE_UPLOAD_SIZE: 5 * 1024 * 1024, // 5MB

  // Timeouts
  DEBOUNCE_DELAY: 300, // milliseconds
  TOAST_DURATION: 5000, // 5 seconds

  // TanStack Query
  STALE_TIME: 5 * 60 * 1000, // 5 minutes
  CACHE_TIME: 10 * 60 * 1000, // 10 minutes

  // Application - these are fallbacks only, branding comes from BrandingSettings
  // For multi-tenant support, these should be generic or empty
  APP_NAME: '', // Loaded from BrandingSettings
  APP_DESCRIPTION: '', // Loaded from BrandingSettings

  // Contact info - loaded from BrandingSettings
  COMPANY_EMAIL: '',
  COMPANY_PHONE: '',

  // Social media - loaded from BrandingSettings
  SOCIAL: {
    linkedin: '',
    twitter: '',
    facebook: '',
  },
} as const

// Feature flags
export const FEATURES = {
  ENABLE_DARK_MODE: false,
  ENABLE_NOTIFICATIONS: true,
  ENABLE_ANALYTICS: true,
  ENABLE_ERROR_TRACKING: false, // Sentry, etc.
  ENABLE_REAL_TIME: false, // WebSockets
} as const
