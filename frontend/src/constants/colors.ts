// Oneo Brand Colors
// These reference CSS custom properties from branding settings
// Use Tailwind utility classes (bg-primary, text-accent, etc.) when possible

// Helper to get CSS variable value at runtime
export const getCSSVariable = (name: string): string => {
  if (typeof window === 'undefined') return ''
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

// CSS Variable names for programmatic access
export const CSS_VARS = {
  primary: '--color-primary',
  primaryDark: '--color-primary-dark',
  primaryLight: '--color-primary-light',
  secondary: '--color-secondary',
  secondaryDark: '--color-secondary-dark',
  secondaryLight: '--color-secondary-light',
  accent: '--color-accent',
  accentDark: '--color-accent-dark',
  accentLight: '--color-accent-light',
  success: '--color-success',
  warning: '--color-warning',
  error: '--color-error',
} as const

// Default fallback colors (used when CSS variables aren't loaded yet)
export const DEFAULT_COLORS = {
  primary: {
    DEFAULT: '#003E49',
    dark: '#002A32',
    light: '#0D646D',
  },
  secondary: {
    DEFAULT: '#0D646D',
    dark: '#064852',
    light: '#1A7A88',
  },
  accent: {
    DEFAULT: '#FF7B55',
    dark: '#E65A35',
    light: '#FFAB97',
  },
  success: '#10b981',
  warning: '#f97316',
  error: '#ef4444',
  info: '#3b82f6',
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
} as const

// Tailwind class mappings for status colors
// Use these classes instead of hardcoded colors
export const STATUS_CLASSES = {
  success: {
    bg: 'bg-success',
    bgLight: 'bg-success/10',
    text: 'text-success',
    border: 'border-success',
  },
  warning: {
    bg: 'bg-warning',
    bgLight: 'bg-warning/10',
    text: 'text-warning',
    border: 'border-warning',
  },
  error: {
    bg: 'bg-error',
    bgLight: 'bg-error/10',
    text: 'text-error',
    border: 'border-error',
  },
  info: {
    bg: 'bg-secondary',
    bgLight: 'bg-secondary/10',
    text: 'text-secondary',
    border: 'border-secondary',
  },
  primary: {
    bg: 'bg-primary',
    bgLight: 'bg-primary/10',
    text: 'text-primary',
    border: 'border-primary',
  },
  accent: {
    bg: 'bg-accent',
    bgLight: 'bg-accent/10',
    text: 'text-accent',
    border: 'border-accent',
  },
} as const

// Application status to Tailwind class mapping
export const APPLICATION_STATUS_CLASSES = {
  applied: STATUS_CLASSES.info,
  screening: STATUS_CLASSES.primary,
  shortlisted: STATUS_CLASSES.info,
  in_progress: STATUS_CLASSES.accent,
  interviewing: STATUS_CLASSES.accent,
  interview_scheduled: STATUS_CLASSES.accent,
  interview_completed: STATUS_CLASSES.primary,
  offer_made: STATUS_CLASSES.success,
  offer_accepted: STATUS_CLASSES.success,
  rejected: STATUS_CLASSES.error,
  withdrawn: { bg: 'bg-gray-500', bgLight: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-500' },
} as const

// Job status to Tailwind class mapping
export const JOB_STATUS_CLASSES = {
  draft: { bg: 'bg-gray-500', bgLight: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-300' },
  published: STATUS_CLASSES.success,
  closed: STATUS_CLASSES.warning,
  filled: STATUS_CLASSES.primary,
  archived: { bg: 'bg-gray-400', bgLight: 'bg-gray-50', text: 'text-gray-500', border: 'border-gray-300' },
} as const

// Legacy exports for backwards compatibility (prefer Tailwind classes)
export const COLORS = DEFAULT_COLORS
export const STATUS_COLORS = {
  applied: DEFAULT_COLORS.info,
  screening: DEFAULT_COLORS.primary.DEFAULT,
  shortlisted: DEFAULT_COLORS.secondary.DEFAULT,
  interviewing: DEFAULT_COLORS.accent.DEFAULT,
  interview_scheduled: DEFAULT_COLORS.accent.DEFAULT,
  interview_completed: DEFAULT_COLORS.accent.dark,
  offer: DEFAULT_COLORS.success,
  accepted: DEFAULT_COLORS.success,
  rejected: DEFAULT_COLORS.error,
  withdrawn: DEFAULT_COLORS.gray[500],
} as const

export const JOB_STATUS_COLORS = {
  draft: DEFAULT_COLORS.gray[500],
  published: DEFAULT_COLORS.success,
  closed: DEFAULT_COLORS.warning,
  filled: DEFAULT_COLORS.primary.DEFAULT,
  archived: DEFAULT_COLORS.gray[400],
} as const
