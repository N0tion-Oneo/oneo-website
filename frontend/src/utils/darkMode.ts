/**
 * Dark Mode Utility Classes
 *
 * This file provides standardized class mappings for dark mode support.
 * Use these utilities to ensure consistent dark mode styling across the app.
 *
 * Usage:
 *   import { dm } from '@/utils/darkMode';
 *   <div className={dm.card}>...</div>
 *
 * Or for more specific control:
 *   import { darkMode } from '@/utils/darkMode';
 *   <div className={`${darkMode.bg.white} ${darkMode.text.primary}`}>...</div>
 */

// Background color mappings
export const darkModeBg = {
  // Primary backgrounds
  white: 'bg-white dark:bg-gray-900',
  gray50: 'bg-gray-50 dark:bg-gray-800',
  gray100: 'bg-gray-100 dark:bg-gray-700',
  gray200: 'bg-gray-200 dark:bg-gray-600',

  // Elevated surfaces (modals, dropdowns, drawers)
  elevated: 'bg-white dark:bg-gray-800',

  // Hover states
  hoverWhite: 'hover:bg-gray-50 dark:hover:bg-gray-800',
  hoverGray50: 'hover:bg-gray-100 dark:hover:bg-gray-700',
  hoverGray100: 'hover:bg-gray-200 dark:hover:bg-gray-600',
} as const;

// Text color mappings
export const darkModeText = {
  // Primary text
  primary: 'text-gray-900 dark:text-gray-100',
  secondary: 'text-gray-700 dark:text-gray-300',
  tertiary: 'text-gray-600 dark:text-gray-400',
  muted: 'text-gray-500 dark:text-gray-500',
  placeholder: 'text-gray-400 dark:text-gray-500',

  // Hover text
  hoverPrimary: 'hover:text-gray-900 dark:hover:text-gray-100',
  hoverSecondary: 'hover:text-gray-700 dark:hover:text-gray-300',
} as const;

// Border color mappings
export const darkModeBorder = {
  default: 'border-gray-200 dark:border-gray-700',
  strong: 'border-gray-300 dark:border-gray-600',
  muted: 'border-gray-100 dark:border-gray-800',

  // Hover borders
  hoverDefault: 'hover:border-gray-300 dark:hover:border-gray-600',
} as const;

// Ring/Focus color mappings
export const darkModeRing = {
  default: 'ring-gray-200 dark:ring-gray-700',
  focus: 'focus:ring-gray-900 dark:focus:ring-gray-100',
  focusWithin: 'focus-within:ring-gray-900 dark:focus-within:ring-gray-100',
} as const;

// Shadow mappings
export const darkModeShadow = {
  sm: 'shadow-sm dark:shadow-gray-900/20',
  default: 'shadow dark:shadow-gray-900/30',
  md: 'shadow-md dark:shadow-gray-900/30',
  lg: 'shadow-lg dark:shadow-gray-900/40',
} as const;

// Divide color mappings
export const darkModeDivide = {
  default: 'divide-gray-200 dark:divide-gray-700',
  strong: 'divide-gray-300 dark:divide-gray-600',
} as const;

// Common component patterns (shortcuts)
export const dm = {
  // Containers & Cards
  card: 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700',
  cardHover: 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800',
  panel: 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
  elevated: 'bg-white dark:bg-gray-800 shadow-lg dark:shadow-gray-900/40',

  // Inputs
  input: 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500',
  inputFocus: 'focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 focus:border-transparent',

  // Text
  textPrimary: 'text-gray-900 dark:text-gray-100',
  textSecondary: 'text-gray-700 dark:text-gray-300',
  textTertiary: 'text-gray-600 dark:text-gray-400',
  textMuted: 'text-gray-500 dark:text-gray-500',

  // Labels
  label: 'text-gray-700 dark:text-gray-300',

  // Borders
  border: 'border-gray-200 dark:border-gray-700',
  borderStrong: 'border-gray-300 dark:border-gray-600',

  // Dividers
  divider: 'border-gray-200 dark:border-gray-700',

  // Backgrounds
  bgPrimary: 'bg-white dark:bg-gray-900',
  bgSecondary: 'bg-gray-50 dark:bg-gray-800',
  bgTertiary: 'bg-gray-100 dark:bg-gray-700',

  // Hover states
  hoverBg: 'hover:bg-gray-50 dark:hover:bg-gray-800',
  hoverBgStrong: 'hover:bg-gray-100 dark:hover:bg-gray-700',

  // Active/Selected states
  activeBg: 'bg-gray-100 dark:bg-gray-700',
  selectedBg: 'bg-gray-100 dark:bg-gray-700',

  // Disabled states
  disabled: 'disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-500',

  // Modals & Overlays
  modal: 'bg-white dark:bg-gray-900 shadow-xl dark:shadow-gray-900/50',
  overlay: 'bg-black/50 dark:bg-black/70',
  drawer: 'bg-white dark:bg-gray-900 shadow-xl dark:shadow-gray-900/50',

  // Tables
  tableHeader: 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
  tableRow: 'bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700',
  tableRowHover: 'hover:bg-gray-50 dark:hover:bg-gray-800',
  tableRowAlt: 'even:bg-gray-50 dark:even:bg-gray-800',

  // Navigation
  navItem: 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100',
  navItemActive: 'text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-700',

  // Sidebar
  sidebar: 'bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700',

  // Dropdown menus
  dropdown: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg dark:shadow-gray-900/40',
  dropdownItem: 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700',
  dropdownItemActive: 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100',
} as const;

// Full grouped export for structured access
export const darkMode = {
  bg: darkModeBg,
  text: darkModeText,
  border: darkModeBorder,
  ring: darkModeRing,
  shadow: darkModeShadow,
  divide: darkModeDivide,
} as const;

export default dm;
