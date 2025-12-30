import { useState } from 'react'
import { ChevronDown, Maximize2, Minimize2 } from 'lucide-react'

export interface PanelOption<T extends string = string> {
  type: T
  label: string
  icon: React.ReactNode
}

interface PanelHeaderProps<T extends string = string> {
  title: string
  icon: React.ReactNode
  panelOptions: PanelOption<T>[]
  onChangePanel: (type: T) => void
  onMaximize?: () => void
  isMaximized?: boolean
}

export function PanelHeader<T extends string = string>({
  title,
  icon,
  panelOptions,
  onChangePanel,
  onMaximize,
  isMaximized,
}: PanelHeaderProps<T>) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
      <div className="relative">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          {icon}
          {title}
          <ChevronDown className="w-3 h-3" />
        </button>

        {isDropdownOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsDropdownOpen(false)}
            />
            <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
              {panelOptions.map((option) => (
                <button
                  key={option.type}
                  onClick={() => {
                    onChangePanel(option.type)
                    setIsDropdownOpen(false)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  {option.icon}
                  {option.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {onMaximize && (
        <button
          onClick={onMaximize}
          className="p-1 text-gray-400 hover:text-gray-600 rounded"
          title={isMaximized ? 'Restore' : 'Maximize'}
        >
          {isMaximized ? (
            <Minimize2 className="w-4 h-4" />
          ) : (
            <Maximize2 className="w-4 h-4" />
          )}
        </button>
      )}
    </div>
  )
}

export default PanelHeader
