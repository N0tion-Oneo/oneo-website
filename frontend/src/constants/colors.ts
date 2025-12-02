// Oneo Brand Colors
// These match the Tailwind config

export const COLORS = {
  // Primary colors
  primary: {
    DEFAULT: '#003E49', // Dark Blue/Green
    dark: '#002A32',
    light: '#0D646D', // Light Blue
  },

  // Secondary colors
  secondary: {
    DEFAULT: '#0D646D', // Light Blue
    dark: '#064852',
    light: '#1A7A88',
  },

  // Accent colors
  accent: {
    DEFAULT: '#FF7B55', // Orange
    dark: '#E65A35',
    light: '#FFAB97', // Light Orange
  },

  // Status colors
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // Grays
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

// Status colors for application statuses
export const STATUS_COLORS = {
  applied: COLORS.info,
  screening: COLORS.primary.DEFAULT,
  shortlisted: COLORS.secondary.DEFAULT,
  interviewing: COLORS.accent.DEFAULT,
  interview_scheduled: COLORS.accent.DEFAULT,
  interview_completed: COLORS.accent.dark,
  offer: COLORS.success,
  accepted: COLORS.success,
  rejected: COLORS.error,
  withdrawn: COLORS.gray[500],
} as const

// Job status colors
export const JOB_STATUS_COLORS = {
  draft: COLORS.gray[500],
  published: COLORS.success,
  closed: COLORS.warning,
  filled: COLORS.primary.DEFAULT,
  archived: COLORS.gray[400],
} as const
