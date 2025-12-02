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

  // Application
  APP_NAME: 'Oneo',
  APP_DESCRIPTION: 'Premium Recruitment Platform',
  COMPANY_EMAIL: 'hello@oneo.co.za',
  COMPANY_PHONE: '+27 (0) 123 456 789',

  // Social media (placeholders)
  SOCIAL: {
    linkedin: 'https://linkedin.com/company/oneo',
    twitter: 'https://twitter.com/oneo',
    facebook: 'https://facebook.com/oneo',
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
