import { CheckCircle, PauseCircle, XCircle, Clock } from 'lucide-react'
import { ServiceTypeBadge } from './ServiceTypeBadge'
import type { SubscriptionStatus } from '@/hooks'

interface ServiceTypeHeaderProps {
  serviceType: 'retained' | 'headhunting'
  onChangeServiceType?: () => void
  subscriptionStatus?: SubscriptionStatus | null
  isAdmin: boolean
  compact?: boolean
}

function StatusBadge({ status }: { status: SubscriptionStatus }) {
  const defaultConfig = { bg: 'bg-gray-100', text: 'text-gray-800', icon: <Clock className="w-3.5 h-3.5" /> }
  const config: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    active: { bg: 'bg-green-100', text: 'text-green-800', icon: <CheckCircle className="w-3.5 h-3.5" /> },
    paused: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: <PauseCircle className="w-3.5 h-3.5" /> },
    terminated: { bg: 'bg-red-100', text: 'text-red-800', icon: <XCircle className="w-3.5 h-3.5" /> },
    expired: defaultConfig,
  }
  const c = config[status] ?? defaultConfig
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      {c.icon}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

export function ServiceTypeHeader({
  serviceType,
  onChangeServiceType,
  subscriptionStatus,
  isAdmin,
  compact = false,
}: ServiceTypeHeaderProps) {
  const isRetained = serviceType === 'retained'

  if (compact) {
    return (
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Service Type</h3>
        <div className="flex items-center gap-2">
          <ServiceTypeBadge type={serviceType} />
          {subscriptionStatus && <StatusBadge status={subscriptionStatus} />}
          {isAdmin && onChangeServiceType && (
            <button
              onClick={onChangeServiceType}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              Change
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">Service Type</h3>
            <ServiceTypeBadge type={serviceType} />
            {isAdmin && onChangeServiceType && (
              <button
                onClick={onChangeServiceType}
                className="text-xs text-gray-500 hover:text-gray-700 underline"
              >
                Change
              </button>
            )}
          </div>
          <p className="text-sm text-gray-500">
            {isRetained
              ? 'Monthly retainer with reduced placement fees. Includes contract management and billing.'
              : 'Pay-per-placement model. Invoice generated when candidates are successfully placed.'}
          </p>
        </div>
        {subscriptionStatus && <StatusBadge status={subscriptionStatus} />}
      </div>
    </div>
  )
}
