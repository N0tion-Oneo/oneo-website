import type { LucideIcon } from 'lucide-react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number | null
  subtitle?: string
  trend?: {
    value: number
    direction: 'up' | 'down' | 'neutral'
    label?: string
  }
  icon?: LucideIcon
  format?: 'number' | 'percentage' | 'days' | 'currency'
  loading?: boolean
}

export function StatCard({
  title,
  value,
  subtitle,
  trend,
  icon: Icon,
  format = 'number',
  loading = false,
}: StatCardProps) {
  const formatValue = (val: string | number | null): string => {
    if (val === null || val === undefined) return '-'
    if (typeof val === 'string') return val

    switch (format) {
      case 'percentage':
        return `${val.toFixed(1)}%`
      case 'days':
        return `${val} days`
      case 'currency':
        return new Intl.NumberFormat('en-ZA', {
          style: 'currency',
          currency: 'ZAR',
          maximumFractionDigits: 0,
        }).format(val)
      case 'number':
      default:
        return new Intl.NumberFormat().format(val)
    }
  }

  const getTrendIcon = () => {
    if (!trend) return null
    switch (trend.direction) {
      case 'up':
        return <TrendingUp className="w-3 h-3" />
      case 'down':
        return <TrendingDown className="w-3 h-3" />
      default:
        return <Minus className="w-3 h-3" />
    }
  }

  const getTrendColor = () => {
    if (!trend) return ''
    switch (trend.direction) {
      case 'up':
        return 'text-green-600'
      case 'down':
        return 'text-red-600'
      default:
        return 'text-gray-500'
    }
  }

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-4 bg-gray-200 rounded w-24" />
          {Icon && <div className="w-8 h-8 bg-gray-200 rounded-full" />}
        </div>
        <div className="mt-2 h-8 bg-gray-200 rounded w-16" />
        <div className="mt-1 h-3 bg-gray-200 rounded w-20" />
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-medium text-gray-500 uppercase tracking-wide">
          {title}
        </p>
        {Icon && (
          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
            <Icon className="w-4 h-4 text-gray-600" />
          </div>
        )}
      </div>
      <p className="mt-2 text-2xl font-semibold text-gray-900">
        {formatValue(value)}
      </p>
      {(subtitle || trend) && (
        <div className="mt-1 flex items-center gap-2">
          {trend && (
            <span
              className={`flex items-center gap-0.5 text-[11px] font-medium ${getTrendColor()}`}
            >
              {getTrendIcon()}
              {Math.abs(trend.value)}%
              {trend.label && <span className="text-gray-500 ml-1">{trend.label}</span>}
            </span>
          )}
          {subtitle && (
            <span className="text-[11px] text-gray-500">{subtitle}</span>
          )}
        </div>
      )}
    </div>
  )
}

export default StatCard
