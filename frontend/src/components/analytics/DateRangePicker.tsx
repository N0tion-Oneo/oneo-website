import { useState } from 'react'
import { Calendar, ChevronDown } from 'lucide-react'
import type { DateRangePreset } from '@/types'

interface DateRangePickerProps {
  startDate: string
  endDate: string
  preset: DateRangePreset
  onPresetChange: (preset: DateRangePreset) => void
  onCustomDateChange: (startDate: string, endDate: string) => void
}

const PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: 'last7days', label: 'Last 7 days' },
  { value: 'last30days', label: 'Last 30 days' },
  { value: 'last90days', label: 'Last 90 days' },
  { value: 'thisMonth', label: 'This month' },
  { value: 'lastMonth', label: 'Last month' },
  { value: 'custom', label: 'Custom range' },
]

export function DateRangePicker({
  startDate,
  endDate,
  preset,
  onPresetChange,
  onCustomDateChange,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [tempStartDate, setTempStartDate] = useState(startDate)
  const [tempEndDate, setTempEndDate] = useState(endDate)

  const currentPresetLabel =
    PRESETS.find((p) => p.value === preset)?.label || 'Select range'

  const handlePresetClick = (newPreset: DateRangePreset) => {
    if (newPreset === 'custom') {
      setTempStartDate(startDate)
      setTempEndDate(endDate)
    }
    onPresetChange(newPreset)
    if (newPreset !== 'custom') {
      setIsOpen(false)
    }
  }

  const handleApplyCustom = () => {
    onCustomDateChange(tempStartDate, tempEndDate)
    setIsOpen(false)
  }

  const formatDisplayDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 text-[13px] bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
      >
        <Calendar className="w-4 h-4 text-gray-500" />
        <span className="text-gray-700">
          {preset === 'custom'
            ? `${formatDisplayDate(startDate)} - ${formatDisplayDate(endDate)}`
            : currentPresetLabel}
        </span>
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
            {/* Preset options */}
            <div className="p-2 border-b border-gray-100">
              {PRESETS.map((presetOption) => (
                <button
                  key={presetOption.value}
                  onClick={() => handlePresetClick(presetOption.value)}
                  className={`w-full text-left px-3 py-1.5 text-[13px] rounded-md transition-colors ${
                    preset === presetOption.value
                      ? 'bg-gray-100 text-gray-900 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {presetOption.label}
                </button>
              ))}
            </div>

            {/* Custom date inputs */}
            {preset === 'custom' && (
              <div className="p-3">
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={tempStartDate}
                      onChange={(e) => setTempStartDate(e.target.value)}
                      className="w-full px-2 py-1.5 text-[13px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={tempEndDate}
                      onChange={(e) => setTempEndDate(e.target.value)}
                      className="w-full px-2 py-1.5 text-[13px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300"
                    />
                  </div>
                  <button
                    onClick={handleApplyCustom}
                    className="w-full px-3 py-1.5 text-[13px] font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 transition-colors"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default DateRangePicker
