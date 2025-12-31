import { Users, Building2, CheckCircle, TrendingUp } from 'lucide-react'

interface OnboardingSummaryCardsProps {
  total: number
  newInPeriod: number
  completed: number
  completionRate: number
  loading?: boolean
  entityType: 'company' | 'candidate'
}

export function OnboardingSummaryCards({
  total,
  newInPeriod,
  completed,
  completionRate,
  loading,
  entityType,
}: OnboardingSummaryCardsProps) {
  const Icon = entityType === 'company' ? Building2 : Users
  const entityLabel = entityType === 'company' ? 'Companies' : 'Candidates'

  const cards = [
    {
      title: `Total ${entityLabel}`,
      value: total,
      icon: Icon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'New This Period',
      value: newInPeriod,
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Fully Onboarded',
      value: completed,
      icon: CheckCircle,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      title: 'Completion Rate',
      value: `${completionRate}%`,
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      isPercentage: true,
    },
  ]

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((_, index) => (
          <div
            key={index}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
          >
            <div className="h-4 w-24 bg-gray-100 dark:bg-gray-700 rounded animate-pulse mb-2" />
            <div className="h-8 w-16 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.title}
          className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] text-gray-500 dark:text-gray-400 mb-1">{card.title}</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {card.value}
              </p>
            </div>
            <div className={`p-2 rounded-lg ${card.bgColor}`}>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
