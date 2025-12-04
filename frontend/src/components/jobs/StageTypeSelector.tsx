import {
  FileText,
  Phone,
  Video,
  Users,
  FileCode,
  ClipboardCheck,
  Settings,
  Plus,
} from 'lucide-react'
import { StageType, StageTypeLabels, StageTypeConfig } from '@/types'

interface StageTypeSelectorProps {
  onSelect: (stageType: StageType) => void
  disabled?: boolean
}

const StageTypeIcons: Record<StageType, React.ReactNode> = {
  [StageType.APPLICATION_SCREEN]: <FileText className="w-5 h-5" />,
  [StageType.PHONE_SCREENING]: <Phone className="w-5 h-5" />,
  [StageType.VIDEO_CALL]: <Video className="w-5 h-5" />,
  [StageType.IN_PERSON_INTERVIEW]: <Users className="w-5 h-5" />,
  [StageType.TAKE_HOME_ASSESSMENT]: <FileCode className="w-5 h-5" />,
  [StageType.IN_PERSON_ASSESSMENT]: <ClipboardCheck className="w-5 h-5" />,
  [StageType.CUSTOM]: <Settings className="w-5 h-5" />,
}

const StageTypeColors: Record<StageType, string> = {
  [StageType.APPLICATION_SCREEN]: 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-gray-200',
  [StageType.PHONE_SCREENING]: 'bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200',
  [StageType.VIDEO_CALL]: 'bg-purple-50 text-purple-600 hover:bg-purple-100 border-purple-200',
  [StageType.IN_PERSON_INTERVIEW]: 'bg-green-50 text-green-600 hover:bg-green-100 border-green-200',
  [StageType.TAKE_HOME_ASSESSMENT]: 'bg-orange-50 text-orange-600 hover:bg-orange-100 border-orange-200',
  [StageType.IN_PERSON_ASSESSMENT]: 'bg-amber-50 text-amber-600 hover:bg-amber-100 border-amber-200',
  [StageType.CUSTOM]: 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-gray-200',
}

const StageTypeDescriptions: Record<StageType, string> = {
  [StageType.APPLICATION_SCREEN]: 'Initial review of candidate applications',
  [StageType.PHONE_SCREENING]: 'Quick phone call to assess basic fit',
  [StageType.VIDEO_CALL]: 'Video interview via Zoom, Meet, etc.',
  [StageType.IN_PERSON_INTERVIEW]: 'Face-to-face meeting at your office',
  [StageType.TAKE_HOME_ASSESSMENT]: 'Technical test or assignment sent to candidate',
  [StageType.IN_PERSON_ASSESSMENT]: 'Technical test conducted on-site',
  [StageType.CUSTOM]: 'Define your own stage type',
}

export default function StageTypeSelector({
  onSelect,
  disabled = false,
}: StageTypeSelectorProps) {
  const stageTypes = Object.values(StageType)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Plus className="w-4 h-4" />
        <span>Add an interview stage</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {stageTypes.map((type) => {
          const config = StageTypeConfig[type]
          const badges: string[] = []
          if (config.requiresScheduling) badges.push('Scheduling')
          if (config.requiresLocation) badges.push('Location')
          if (config.isAssessment) badges.push('Assessment')
          if (config.defaultDuration) badges.push(`${config.defaultDuration}min`)

          return (
            <button
              key={type}
              onClick={() => onSelect(type)}
              disabled={disabled}
              className={`p-4 rounded-lg border text-left transition-all ${StageTypeColors[type]} ${
                disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">{StageTypeIcons[type]}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{StageTypeLabels[type]}</div>
                  <div className="text-xs opacity-75 mt-1">{StageTypeDescriptions[type]}</div>
                  {badges.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {badges.map((badge) => (
                        <span
                          key={badge}
                          className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded bg-white/50"
                        >
                          {badge}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Compact version for inline use
interface StageTypeBadgeProps {
  stageType: StageType
  size?: 'sm' | 'md'
}

export function StageTypeBadge({ stageType, size = 'md' }: StageTypeBadgeProps) {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md font-medium ${sizeClasses} ${StageTypeColors[stageType]}`}
    >
      <span className={size === 'sm' ? '[&>svg]:w-3 [&>svg]:h-3' : ''}>
        {StageTypeIcons[stageType]}
      </span>
      {StageTypeLabels[stageType]}
    </span>
  )
}

// Dropdown selector version
interface StageTypeDropdownProps {
  value: StageType
  onChange: (stageType: StageType) => void
  disabled?: boolean
}

export function StageTypeDropdown({
  value,
  onChange,
  disabled = false,
}: StageTypeDropdownProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as StageType)}
      disabled={disabled}
      className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {Object.values(StageType).map((type) => (
        <option key={type} value={type}>
          {StageTypeLabels[type]}
        </option>
      ))}
    </select>
  )
}
