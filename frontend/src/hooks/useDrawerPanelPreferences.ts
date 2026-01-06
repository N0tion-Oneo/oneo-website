/**
 * useDrawerPanelPreferences - Hook for managing customizable drawer panels
 *
 * Stores user's panel preferences in localStorage per entity type.
 * Allows adding/removing/reordering panels from the drawer tab bar.
 */

import { useState, useEffect, useCallback } from 'react'

export interface PanelPreference {
  type: string
  visible: boolean
}

interface UseDrawerPanelPreferencesOptions {
  /** Unique key for this drawer type (e.g., 'company', 'job', 'application') */
  drawerKey: string
  /** All available panel types for this drawer */
  availablePanels: string[]
  /** Default visible panels (used if no saved preferences) */
  defaultPanels: string[]
  /** Maximum number of visible panels (default: 3) */
  maxPanels?: number
}

interface UseDrawerPanelPreferencesReturn {
  /** Currently visible panel types in order */
  visiblePanels: string[]
  /** Panel types that can be added (not currently visible) */
  hiddenPanels: string[]
  /** Add a panel to visible panels */
  addPanel: (panelType: string) => void
  /** Remove a panel from visible panels */
  removePanel: (panelType: string) => void
  /** Move a panel from one index to another */
  movePanel: (fromIndex: number, toIndex: number) => void
  /** Check if a panel can be removed (must have at least 1 panel) */
  canRemovePanel: boolean
  /** Check if a panel can be added (not at maxPanels limit) */
  canAddPanel: boolean
  /** Reset to default panels */
  resetToDefaults: () => void
  /** Whether preferences have been modified from defaults */
  isCustomized: boolean
}

const STORAGE_KEY_PREFIX = 'drawer-panels-'

export function useDrawerPanelPreferences({
  drawerKey,
  availablePanels,
  defaultPanels,
  maxPanels = 3,
}: UseDrawerPanelPreferencesOptions): UseDrawerPanelPreferencesReturn {
  const storageKey = `${STORAGE_KEY_PREFIX}${drawerKey}`

  // Initialize state from localStorage or defaults (respecting maxPanels limit)
  const [visiblePanels, setVisiblePanels] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed = JSON.parse(saved) as string[]
        // Filter out any panels that no longer exist in availablePanels
        const validPanels = parsed.filter((p) => availablePanels.includes(p))
        if (validPanels.length > 0) {
          return validPanels.slice(0, maxPanels)
        }
      }
    } catch {
      // Invalid JSON, use defaults
    }
    return defaultPanels.slice(0, maxPanels)
  })

  // Save to localStorage whenever visiblePanels changes
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(visiblePanels))
    } catch {
      // localStorage might be full or disabled
    }
  }, [storageKey, visiblePanels])

  // Compute hidden panels (available but not visible)
  const hiddenPanels = availablePanels.filter((p) => !visiblePanels.includes(p))

  // Add a panel (respecting maxPanels limit)
  const addPanel = useCallback((panelType: string) => {
    if (!availablePanels.includes(panelType)) return
    if (visiblePanels.includes(panelType)) return
    if (visiblePanels.length >= maxPanels) return

    setVisiblePanels((prev) => [...prev, panelType])
  }, [availablePanels, visiblePanels, maxPanels])

  // Remove a panel
  const removePanel = useCallback((panelType: string) => {
    setVisiblePanels((prev) => {
      // Don't allow removing the last panel
      if (prev.length <= 1) return prev
      return prev.filter((p) => p !== panelType)
    })
  }, [])

  // Move a panel from one position to another (for drag and drop)
  const movePanel = useCallback((fromIndex: number, toIndex: number) => {
    setVisiblePanels((prev) => {
      if (fromIndex < 0 || fromIndex >= prev.length) return prev
      if (toIndex < 0 || toIndex >= prev.length) return prev
      if (fromIndex === toIndex) return prev

      const result = [...prev]
      const removed = result.splice(fromIndex, 1)[0]
      if (removed) {
        result.splice(toIndex, 0, removed)
      }
      return result
    })
  }, [])

  // Reset to defaults (respecting maxPanels limit)
  const resetToDefaults = useCallback(() => {
    setVisiblePanels(defaultPanels.slice(0, maxPanels))
  }, [defaultPanels, maxPanels])

  // Check if current preferences differ from defaults (respecting maxPanels)
  const defaultsLimited = defaultPanels.slice(0, maxPanels)
  const isCustomized =
    visiblePanels.length !== defaultsLimited.length ||
    visiblePanels.some((p, i) => p !== defaultsLimited[i])

  return {
    visiblePanels,
    hiddenPanels,
    addPanel,
    removePanel,
    movePanel,
    canRemovePanel: visiblePanels.length > 1,
    canAddPanel: visiblePanels.length < maxPanels && hiddenPanels.length > 0,
    resetToDefaults,
    isCustomized,
  }
}

export default useDrawerPanelPreferences
