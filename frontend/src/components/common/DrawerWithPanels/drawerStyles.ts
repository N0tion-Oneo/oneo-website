/**
 * Shared styling constants for drawer components
 * Ensures consistency across ApplicationDrawer, LeadDrawer, CompanyDetailDrawer, CandidatePreviewPanel
 */

// =============================================================================
// Status Badge Styles
// =============================================================================

export const badgeStyles = {
  base: 'inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded',
  // Color variants
  gray: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-green-100 text-green-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  orange: 'bg-orange-100 text-orange-700',
  red: 'bg-red-100 text-red-700',
  purple: 'bg-purple-100 text-purple-700',
  cyan: 'bg-cyan-100 text-cyan-700',
}

// =============================================================================
// Stage/Status Dropdown Styles
// =============================================================================

export const stageDropdownStyles = {
  // Trigger button
  trigger: 'flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium rounded cursor-pointer hover:opacity-80 transition-opacity',
  triggerDisabled: 'opacity-50 cursor-not-allowed',

  // Dropdown container
  dropdown: 'absolute top-full right-0 mt-1 w-56 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg dark:shadow-gray-900/40 py-1',
  dropdownZIndex: 210,

  // Section headers
  sectionHeader: 'px-3 py-2 text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-gray-100 dark:border-gray-800',
  sectionDivider: 'border-t border-gray-100 dark:border-gray-800 mt-1 pt-1',

  // Menu items
  menuItem: 'w-full flex items-center gap-2 px-3 py-2 text-[12px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 text-left',
  menuItemActive: 'bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-medium',

  // Current stage indicator
  currentBadge: 'text-[10px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded',

  // Stage color dot
  stageDot: 'inline-block w-2 h-2 rounded-full mr-2',
}

// =============================================================================
// Quick Action Button Styles
// =============================================================================

export const actionButtonStyles = {
  base: 'inline-flex items-center gap-2 px-3 py-1.5 text-[12px] font-medium rounded-md transition-colors',

  // Variants
  primary: 'text-white bg-gray-900 hover:bg-gray-800',
  secondary: 'text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600',
  success: 'text-white bg-green-600 hover:bg-green-700',
  danger: 'text-white bg-red-600 hover:bg-red-700',

  // Soft variants (colored background)
  softBlue: 'text-blue-700 bg-blue-100 hover:bg-blue-200',
  softGreen: 'text-green-700 bg-green-100 hover:bg-green-200',
  softRed: 'text-red-700 bg-red-100 hover:bg-red-200',
  softPurple: 'text-purple-700 bg-purple-100 hover:bg-purple-200',
  softOrange: 'text-orange-700 bg-orange-100 hover:bg-orange-200',
}

// =============================================================================
// Icon Sizes
// =============================================================================

export const iconSizes = {
  // Use in badges, dropdowns, compact buttons
  sm: 'w-3.5 h-3.5',
  // Use in panels, content areas, larger buttons
  md: 'w-4 h-4',
  // Use in empty states, large callouts
  lg: 'w-5 h-5',
}

// =============================================================================
// Panel Content Styles
// =============================================================================

export const panelStyles = {
  // Section headers in panels
  sectionHeader: 'text-[13px] font-medium text-gray-900 dark:text-gray-100',
  sectionSubheader: 'text-[12px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide',

  // Empty states
  emptyState: 'text-center py-8 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg',
  emptyStateIcon: 'w-8 h-8 text-gray-300 mx-auto mb-2',
  emptyStateTitle: 'text-[13px] text-gray-500 dark:text-gray-400',

  // List items
  listItem: 'flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg',
}

// =============================================================================
// Modal Z-Index Constants
// =============================================================================

export const zIndexLayers = {
  drawerBackdrop: 200,
  drawer: 201,
  panelSelectorOverlay: 202,
  panelSelectorDropdown: 203,
  stageDropdown: 210,
  modalBackdrop: 300,
  modal: 301,
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get badge style based on status color
 */
export function getBadgeStyle(variant: keyof typeof badgeStyles): string {
  return `${badgeStyles.base} ${badgeStyles[variant] || badgeStyles.gray}`
}

/**
 * Get action button style with variant
 */
export function getActionButtonStyle(variant: keyof typeof actionButtonStyles = 'secondary'): string {
  return `${actionButtonStyles.base} ${actionButtonStyles[variant] || actionButtonStyles.secondary}`
}

/**
 * Combine dropdown menu item styles
 */
export function getMenuItemStyle(isActive: boolean = false): string {
  return `${stageDropdownStyles.menuItem} ${isActive ? stageDropdownStyles.menuItemActive : ''}`
}
