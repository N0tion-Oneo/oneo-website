/**
 * DrawerWithPanels - Base drawer component with panel selector and Focus Mode support
 *
 * This component provides a unified drawer pattern with:
 * - Compact header with entity info
 * - Status badge / stage dropdown slot
 * - Focus Mode toggle button
 * - Quick action buttons row
 * - Panel selector dropdown
 * - Panel content area
 * - Modals slot for action modals
 */

import { useState, useEffect, ReactNode } from 'react'
import { X, ChevronDown, Maximize2, Loader2 } from 'lucide-react'

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

  // Status badge slot (can include stage dropdown)
  statusBadge?: ReactNode

  // Focus Mode configuration
  focusModeLabel?: string
  onEnterFocusMode?: () => void

  // Quick actions slot (buttons row below header)
  quickActions?: ReactNode

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

  // Optional extra header content
  headerExtra?: ReactNode

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
  statusBadge,
  focusModeLabel = 'Focus Mode',
  onEnterFocusMode,
  quickActions,
  availablePanels,
  defaultPanel,
  onPanelChange,
  renderPanel,
  modals,
  focusModeComponent,
  headerExtra,
  activePanel: controlledPanel,
  width = 'half',
}: DrawerWithPanelsProps) {
  // Panel state (controlled or uncontrolled)
  const [internalPanel, setInternalPanel] = useState(defaultPanel)
  const [isPanelDropdownOpen, setIsPanelDropdownOpen] = useState(false)
  const [showFocusMode, setShowFocusMode] = useState(false)

  const currentPanel = controlledPanel ?? internalPanel

  // Reset panel when drawer opens
  useEffect(() => {
    if (isOpen) {
      setInternalPanel(defaultPanel)
      setIsPanelDropdownOpen(false)
    }
  }, [isOpen, defaultPanel])

  const handlePanelChange = (panelType: string) => {
    setInternalPanel(panelType)
    setIsPanelDropdownOpen(false)
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
    // Clone the focus mode component to inject onClose
    return focusModeComponent
  }

  const currentPanelOption = availablePanels.find((p) => p.type === currentPanel)
  const widthClass = width === 'half' ? 'w-1/2 min-w-[640px]' : 'w-2/3 min-w-[800px]'

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-[200] transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className={`fixed inset-y-0 right-0 ${widthClass} bg-white shadow-xl z-[201] flex flex-col`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="min-w-0 flex-1">
            <h2 className="text-[16px] font-semibold text-gray-900 truncate">
              {isLoading ? 'Loading...' : title}
            </h2>
            {subtitle && (
              <p className="text-[13px] text-gray-500 mt-0.5 truncate">{subtitle}</p>
            )}
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Status Badge / Stage Dropdown */}
            {statusBadge}

            {/* Extra header content */}
            {headerExtra}

            {/* Focus Mode Button */}
            {onEnterFocusMode && (
              <button
                onClick={handleEnterFocusMode}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                title={`Enter ${focusModeLabel}`}
              >
                <Maximize2 className="w-4 h-4" />
                {focusModeLabel}
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        {quickActions && (
          <div className="px-6 py-3 border-b border-gray-100 bg-gray-50/50">
            <div className="flex flex-wrap gap-2">{quickActions}</div>
          </div>
        )}

        {/* Panel Selector */}
        <div className="px-6 py-3 border-b border-gray-200 relative z-10">
          <div className="relative inline-block">
            <button
              onClick={() => setIsPanelDropdownOpen(!isPanelDropdownOpen)}
              className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              {currentPanelOption?.icon}
              <span>{currentPanelOption?.label || currentPanel}</span>
              {currentPanelOption?.count !== undefined && currentPanelOption.count > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-medium bg-gray-200 text-gray-600 rounded-full">
                  {currentPanelOption.count}
                </span>
              )}
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isPanelDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Panel Dropdown */}
            {isPanelDropdownOpen && (
              <>
                <div
                  className="fixed inset-0"
                  onClick={() => setIsPanelDropdownOpen(false)}
                  style={{ zIndex: 202 }}
                />
                <div
                  className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg py-1 max-h-[400px] overflow-y-auto"
                  style={{ zIndex: 203 }}
                >
                  {availablePanels.map((panel) => (
                    <button
                      key={panel.type}
                      onClick={() => handlePanelChange(panel.type)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-[13px] text-left transition-colors ${
                        panel.type === currentPanel
                          ? 'bg-gray-100 text-gray-900 font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {panel.icon}
                      <span className="flex-1">{panel.label}</span>
                      {panel.count !== undefined && panel.count > 0 && (
                        <span className="px-1.5 py-0.5 text-[10px] font-medium bg-gray-200 text-gray-600 rounded-full">
                          {panel.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Panel Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
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
