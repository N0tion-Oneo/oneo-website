/**
 * DrawerWithPanels - Base drawer component with panel tabs and Focus Mode support
 *
 * Layout:
 * - Action Rail (optional): Vertical strip on left with icon buttons
 * - Main Content:
 *   - Row 1: Avatar + Title/Subtitle + Stage dropdown + Focus Mode + Close
 *   - Row 2: Horizontal panel tabs
 *   - Row 3: Action bar (optional)
 *   - Panel Content
 */

import { useState, useEffect, ReactNode, Children, isValidElement, cloneElement } from 'react'
import { X, Maximize2, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'

// =============================================================================
// Types
// =============================================================================

export interface PanelOption {
  type: string
  label: string
  icon: ReactNode
  count?: number
}

export interface DrawerWithPanelsProps {
  // Open/close control
  isOpen: boolean
  onClose: () => void

  // Header configuration
  title: string
  subtitle?: string
  isLoading?: boolean

  // Avatar/Logo slot (left side of header)
  avatar?: ReactNode

  // Status badge slot (stage dropdown)
  statusBadge?: ReactNode

  // Focus Mode configuration
  focusModeLabel?: string
  onEnterFocusMode?: () => void

  // Panel configuration
  availablePanels: PanelOption[]
  defaultPanel: string
  onPanelChange?: (panelType: string) => void

  // Render function for panel content
  renderPanel: (panelType: string) => ReactNode

  // Optional modals (rendered outside drawer for z-index)
  modals?: ReactNode

  // Focus Mode component (rendered when active)
  focusModeComponent?: ReactNode

  // Optional extra header content (e.g., assigned selector)
  headerExtra?: ReactNode

  // Action bar (rendered as Row 3, above panel content)
  actionBar?: ReactNode

  // Action rail (vertical strip on left side with icon buttons)
  actionRail?: ReactNode

  // Controlled panel state (optional)
  activePanel?: string

  // Width configuration
  width?: 'half' | 'wide'
}

// =============================================================================
// Component
// =============================================================================

export default function DrawerWithPanels({
  isOpen,
  onClose,
  title,
  subtitle,
  isLoading = false,
  avatar,
  statusBadge,
  focusModeLabel = 'Focus Mode',
  onEnterFocusMode,
  availablePanels,
  defaultPanel,
  onPanelChange,
  renderPanel,
  modals,
  focusModeComponent,
  headerExtra,
  actionBar,
  actionRail,
  activePanel: controlledPanel,
  width = 'half',
}: DrawerWithPanelsProps) {
  // Panel state (controlled or uncontrolled)
  const [internalPanel, setInternalPanel] = useState(defaultPanel)
  const [showFocusMode, setShowFocusMode] = useState(false)

  const currentPanel = controlledPanel ?? internalPanel

  // Reset panel when drawer opens
  useEffect(() => {
    if (isOpen) {
      setInternalPanel(defaultPanel)
    }
  }, [isOpen, defaultPanel])

  const handlePanelChange = (panelType: string) => {
    setInternalPanel(panelType)
    onPanelChange?.(panelType)
  }

  const handleEnterFocusMode = () => {
    if (onEnterFocusMode) {
      onEnterFocusMode()
    }
    setShowFocusMode(true)
  }

  if (!isOpen) return null

  // Render Focus Mode if active
  if (showFocusMode && focusModeComponent) {
    return focusModeComponent
  }

  const widthClass = width === 'half' ? 'w-1/2 min-w-[640px]' : 'w-2/3 min-w-[800px]'

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 dark:bg-black/50 z-[200] transition-opacity"
        onClick={onClose}
      />

      {/* Action Rail (floating outside drawer on left edge) */}
      {actionRail && (
        <div
          className="fixed z-[202] flex flex-col items-center gap-1 py-3 px-1.5 bg-white dark:bg-gray-800 shadow-lg dark:shadow-gray-900/50 rounded-l-xl border border-r-0 border-gray-200 dark:border-gray-700"
          style={{
            top: '50%',
            transform: 'translateY(-50%)',
            right: width === 'half' ? '50%' : '66.666%',
          }}
        >
          {actionRail}
        </div>
      )}

      {/* Drawer */}
      <div className={`fixed inset-y-0 right-0 ${widthClass} bg-white dark:bg-gray-900 shadow-xl dark:shadow-gray-900/50 z-[201] flex flex-col`}>
          {/* Row 1: Main Header */}
          <div className="flex items-center gap-4 px-5 py-3 border-b border-gray-200 dark:border-gray-700">
          {/* Left: Avatar + Title */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Avatar/Logo */}
            {avatar}

            {/* Title & Subtitle */}
            <div className="min-w-0 flex-1">
              <h2 className="text-[15px] font-semibold text-gray-900 dark:text-gray-100 truncate leading-tight">
                {isLoading ? 'Loading...' : title}
              </h2>
              {subtitle && (
                <p className="text-[12px] text-gray-500 dark:text-gray-400 truncate leading-tight mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Right: Stage + Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Status Badge / Stage Dropdown */}
            {statusBadge}

            {/* Extra header content (e.g., assigned selector) */}
            {headerExtra}

            {/* Focus Mode Button (icon only) */}
            {onEnterFocusMode && (
              <button
                onClick={handleEnterFocusMode}
                className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                title={focusModeLabel}
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            )}

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Row 2: Panel Tabs */}
        <div className="flex items-center gap-1 px-5 py-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          {availablePanels.map((panel) => {
            const isActive = panel.type === currentPanel
            return (
              <button
                key={panel.type}
                onClick={() => handlePanelChange(panel.type)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-md whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <span className={isActive ? 'opacity-100' : 'opacity-70'}>{panel.icon}</span>
                <span>{panel.label}</span>
                {panel.count !== undefined && panel.count > 0 && (
                  <span
                    className={`px-1.5 py-0.5 text-[10px] font-medium rounded-full ${
                      isActive
                        ? 'bg-white/20 text-white dark:bg-gray-900/20 dark:text-gray-900'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {panel.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Row 3: Action Bar (optional) */}
        {actionBar && (
          <div className="px-5 py-2 border-b border-gray-200 dark:border-gray-700">
            {actionBar}
          </div>
        )}

        {/* Panel Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400 dark:text-gray-500" />
            </div>
          ) : (
            renderPanel(currentPanel)
          )}
        </div>
      </div>

      {/* Modals (rendered outside drawer for proper z-index) */}
      {modals}
    </>
  )
}

export { DrawerWithPanels }

// =============================================================================
// Action Rail Components
// =============================================================================

export interface ActionRailButtonProps {
  icon: ReactNode
  label: string
  description?: string
  onClick: () => void
  variant?: 'default' | 'success' | 'danger' | 'warning' | 'info'
  disabled?: boolean
  expanded?: boolean
}

const variantStyles = {
  default: {
    base: 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700',
    icon: 'text-gray-500 dark:text-gray-400',
  },
  success: {
    base: 'text-green-600 dark:text-green-500 hover:text-green-700 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30',
    icon: 'text-green-600 dark:text-green-500',
  },
  danger: {
    base: 'text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30',
    icon: 'text-red-500 dark:text-red-400',
  },
  warning: {
    base: 'text-orange-500 dark:text-orange-400 hover:text-orange-600 dark:hover:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/30',
    icon: 'text-orange-500 dark:text-orange-400',
  },
  info: {
    base: 'text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30',
    icon: 'text-blue-500 dark:text-blue-400',
  },
}

export function ActionRailButton({
  icon,
  label,
  description,
  onClick,
  variant = 'default',
  disabled = false,
  expanded = false,
}: ActionRailButtonProps) {
  const styles = variantStyles[variant]

  if (expanded) {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${styles.base} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span className={`flex-shrink-0 mt-0.5 ${styles.icon}`}>{icon}</span>
        <div className="min-w-0">
          <div className="text-[13px] font-medium leading-tight">{label}</div>
          {description && (
            <div className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight mt-0.5">{description}</div>
          )}
        </div>
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`p-2 rounded-md transition-colors ${styles.base} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {icon}
    </button>
  )
}

// Action Rail Container with expand/collapse toggle
export interface ActionRailProps {
  children: ReactNode
  defaultExpanded?: boolean
}

export function ActionRail({ children, defaultExpanded = false }: ActionRailProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  // Clone children to pass expanded prop (works with flat children array)
  const clonedChildren = Children.map(children, (child) =>
    isValidElement<{ expanded?: boolean }>(child)
      ? cloneElement(child, { expanded })
      : child
  )

  return (
    <div className={`flex flex-col ${expanded ? 'w-48' : 'w-auto'}`}>
      {/* Toggle button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="self-end p-1 mb-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
        title={expanded ? 'Collapse' : 'Expand'}
      >
        {expanded ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>

      {/* Action buttons */}
      <div className={`flex flex-col ${expanded ? 'gap-1' : 'gap-1 items-center'}`}>
        {clonedChildren}
      </div>
    </div>
  )
}
