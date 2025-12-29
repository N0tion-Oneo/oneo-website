import { Calendar, Wand2, Users } from 'lucide-react'

interface StageIntegrationBadgesProps {
  meetingTypesCount: number
  wizardStep: string | null
  entityCount: number
  onClick: () => void
}

export function StageIntegrationBadges({
  meetingTypesCount,
  wizardStep,
  entityCount,
  onClick
}: StageIntegrationBadgesProps) {
  const hasBadges = meetingTypesCount > 0 || wizardStep || entityCount > 0

  if (!hasBadges) {
    return null
  }

  return (
    <div className="inline-flex items-center gap-1.5">
      {meetingTypesCount > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onClick()
          }}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors cursor-pointer"
          title={`${meetingTypesCount} meeting type${meetingTypesCount !== 1 ? 's' : ''}`}
        >
          <Calendar className="w-3 h-3" />
          {meetingTypesCount}
        </button>
      )}
      {wizardStep && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onClick()
          }}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors cursor-pointer"
          title={`Wizard: ${wizardStep}`}
        >
          <Wand2 className="w-3 h-3" />
        </button>
      )}
      {entityCount > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onClick()
          }}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors cursor-pointer"
          title={`${entityCount} entit${entityCount !== 1 ? 'ies' : 'y'} at this stage`}
        >
          <Users className="w-3 h-3" />
          {entityCount}
        </button>
      )}
    </div>
  )
}
