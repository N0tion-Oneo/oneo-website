/**
 * QuickThresholdEditor - Inline popover for editing bottleneck thresholds
 * Used in analytics cards for quick threshold adjustments
 */

import { useState, useRef, useEffect } from 'react'
import { Settings, Loader2, Check } from 'lucide-react'
import { useQuickUpdateBottleneckRule, type BottleneckRule } from '@/hooks/useBottlenecks'

interface QuickThresholdEditorProps {
  rule: BottleneckRule
  onUpdated: () => void
}

export default function QuickThresholdEditor({ rule, onUpdated }: QuickThresholdEditorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [threshold, setThreshold] = useState(
    rule.detection_config.threshold_days ?? rule.detection_config.threshold_count ?? 7
  )
  const [isActive, setIsActive] = useState(rule.is_active)
  const popoverRef = useRef<HTMLDivElement>(null)
  const { quickUpdate, isUpdating } = useQuickUpdateBottleneckRule()

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setThreshold(rule.detection_config.threshold_days ?? rule.detection_config.threshold_count ?? 7)
      setIsActive(rule.is_active)
    }
  }, [isOpen, rule])

  const handleSave = async () => {
    try {
      await quickUpdate(rule.id, {
        threshold_days: threshold,
        is_active: isActive,
      })
      setIsOpen(false)
      onUpdated()
    } catch (error) {
      console.error('Failed to update threshold:', error)
    }
  }

  const hasChanges = threshold !== (rule.detection_config.threshold_days ?? rule.detection_config.threshold_count ?? 7) ||
    isActive !== rule.is_active

  return (
    <div className="relative inline-block">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
        title="Configure threshold"
      >
        <Settings className="w-4 h-4" />
      </button>

      {/* Popover */}
      {isOpen && (
        <div
          ref={popoverRef}
          className="absolute right-0 top-full mt-2 z-50 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4"
        >
          <div className="space-y-4">
            {/* Rule Name */}
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {rule.name}
            </div>

            {/* Threshold Input */}
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                Threshold (Days)
              </label>
              <input
                type="number"
                min="1"
                value={threshold}
                onChange={(e) => setThreshold(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                  focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Active Toggle */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
              <button
                onClick={() => setIsActive(!isActive)}
                className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isActive ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isActive ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setIsOpen(false)}
                className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isUpdating || !hasChanges}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// ThresholdBadge - Display threshold with edit button
// =============================================================================

interface ThresholdBadgeProps {
  rule: BottleneckRule
  onUpdated: () => void
}

export function ThresholdBadge({ rule, onUpdated }: ThresholdBadgeProps) {
  const threshold = rule.detection_config.threshold_days ?? rule.detection_config.threshold_count ?? 7

  return (
    <div className="inline-flex items-center gap-1.5">
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
        rule.is_active
          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
          : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
      }`}>
        {threshold} days
      </span>
      <QuickThresholdEditor rule={rule} onUpdated={onUpdated} />
    </div>
  )
}
