import { Briefcase, Users } from 'lucide-react'

interface ServiceTypeBadgeProps {
  type: 'retained' | 'headhunting' | string | null
}

export function ServiceTypeBadge({ type }: ServiceTypeBadgeProps) {
  if (!type) {
    return <span className="text-xs text-gray-400">Not set</span>
  }
  const isRetained = type === 'retained'
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
      isRetained
        ? 'bg-purple-100 text-purple-800'
        : 'bg-indigo-100 text-indigo-800'
    }`}>
      {isRetained ? <Briefcase className="w-3.5 h-3.5" /> : <Users className="w-3.5 h-3.5" />}
      {isRetained ? 'Retained' : 'Headhunting'}
    </span>
  )
}
