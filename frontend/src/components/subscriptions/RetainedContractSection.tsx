import { Calendar, Plus, Pause, Play, XCircle, Receipt } from 'lucide-react'
import type { Subscription, SubscriptionServiceType } from '@/hooks'

interface ContractSectionProps {
  subscription: Subscription | null
  serviceType: SubscriptionServiceType
  onPause: () => void
  onResume: () => void
  onAdjust: () => void
  onTerminate: () => void
  onCreateSubscription: () => void
  onGenerateInvoice?: () => void
  isPausing: boolean
  isResuming: boolean
  isAdmin: boolean
  compact?: boolean
}

/** @deprecated Use ContractSection instead */
interface RetainedContractSectionProps {
  subscription: Subscription | null
  onPause: () => void
  onResume: () => void
  onAdjust: () => void
  onTerminate: () => void
  onCreateSubscription: () => void
  onGenerateInvoice?: () => void
  isPausing: boolean
  isResuming: boolean
  isAdmin: boolean
  compact?: boolean
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const SERVICE_TYPE_LABELS: Record<SubscriptionServiceType, string> = {
  retained: 'Retained',
  headhunting: 'Headhunting',
  eor: 'EOR',
}

const SERVICE_TYPE_DESCRIPTIONS: Record<SubscriptionServiceType, string> = {
  retained: 'Retained service requires a subscription contract to manage billing and retainer invoices.',
  headhunting: 'Headhunting service requires a contract to track agreement terms and billing schedules.',
  eor: 'EOR service requires a contract to manage employment terms and billing.',
}

/**
 * Generic contract section that works for all service types.
 * Shows contract details, management buttons, and status.
 */
export function ContractSection({
  subscription,
  serviceType,
  onPause,
  onResume,
  onAdjust,
  onTerminate,
  onCreateSubscription,
  onGenerateInvoice,
  isPausing,
  isResuming,
  isAdmin,
  compact = false,
}: ContractSectionProps) {
  const isRetained = serviceType === 'retained'
  const serviceLabel = SERVICE_TYPE_LABELS[serviceType]

  if (!subscription) {
    // Company without subscription contract
    return (
      <div className={`bg-amber-50 border border-amber-200 rounded-lg ${compact ? 'p-4' : 'p-6'}`}>
        <div className="flex items-start gap-4">
          <div className={`${compact ? 'w-8 h-8' : 'w-10 h-10'} bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0`}>
            <Calendar className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} text-amber-600`} />
          </div>
          <div className="flex-1">
            <h4 className={`${compact ? 'text-sm' : 'text-base'} font-semibold text-amber-900 mb-1`}>
              {serviceLabel} Contract Required
            </h4>
            <p className={`${compact ? 'text-xs' : 'text-sm'} text-amber-700 mb-4`}>
              {SERVICE_TYPE_DESCRIPTIONS[serviceType]}
            </p>
            {isAdmin && (
              <button
                onClick={onCreateSubscription}
                className={`inline-flex items-center gap-2 ${compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'} font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700`}
              >
                <Plus className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
                Create Contract
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${compact ? 'p-4' : 'p-6'}`}>
      <div className="flex items-center justify-between mb-4">
        <h4 className={`${compact ? 'text-sm' : 'text-base'} font-semibold text-gray-900`}>
          {serviceLabel} Contract
        </h4>
      </div>

      <div className={`grid ${compact ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'} gap-4 mb-4`}>
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Contract Start</p>
          <p className="text-sm font-medium text-gray-900">{formatDate(subscription.contract_start_date)}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Contract End</p>
          <p className="text-sm font-medium text-gray-900">{formatDate(subscription.contract_end_date)}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Days Until Renewal</p>
          <p className={`text-sm font-medium ${subscription.days_until_renewal <= 30 ? 'text-yellow-600' : 'text-gray-900'}`}>
            {subscription.days_until_renewal} days
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Auto-Renew</p>
          <p className={`text-sm font-medium ${subscription.auto_renew ? 'text-green-600' : 'text-gray-500'}`}>
            {subscription.auto_renew ? 'Enabled' : 'Disabled'}
          </p>
        </div>
      </div>

      {subscription.status === 'paused' && subscription.pause_reason && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Paused:</strong> {subscription.pause_reason}
          </p>
        </div>
      )}

      {isAdmin && (
        <div className="flex flex-wrap gap-2">
          {subscription.status === 'active' && (
            <>
              <button
                onClick={onPause}
                disabled={isPausing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-yellow-700 bg-yellow-100 rounded-lg hover:bg-yellow-200 disabled:opacity-50"
              >
                <Pause className="w-4 h-4" />
                {isPausing ? 'Pausing...' : 'Pause'}
              </button>
              <button
                onClick={onAdjust}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200"
              >
                <Calendar className="w-4 h-4" />
                Adjust Contract
              </button>
              {/* Only show Generate Invoice for retained (retainer invoices) */}
              {isRetained && onGenerateInvoice && (
                <button
                  onClick={onGenerateInvoice}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  <Receipt className="w-4 h-4" />
                  Generate Retainer Invoice
                </button>
              )}
            </>
          )}
          {subscription.status === 'paused' && (
            <button
              onClick={onResume}
              disabled={isResuming}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-100 rounded-lg hover:bg-green-200 disabled:opacity-50"
            >
              <Play className="w-4 h-4" />
              {isResuming ? 'Resuming...' : 'Resume'}
            </button>
          )}
          {subscription.status !== 'terminated' && (
            <button
              onClick={onTerminate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200"
            >
              <XCircle className="w-4 h-4" />
              Terminate
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * @deprecated Use ContractSection with serviceType='retained' instead
 */
export function RetainedContractSection({
  subscription,
  onPause,
  onResume,
  onAdjust,
  onTerminate,
  onCreateSubscription,
  onGenerateInvoice,
  isPausing,
  isResuming,
  isAdmin,
  compact = false,
}: RetainedContractSectionProps) {
  return (
    <ContractSection
      subscription={subscription}
      serviceType="retained"
      onPause={onPause}
      onResume={onResume}
      onAdjust={onAdjust}
      onTerminate={onTerminate}
      onCreateSubscription={onCreateSubscription}
      onGenerateInvoice={onGenerateInvoice}
      isPausing={isPausing}
      isResuming={isResuming}
      isAdmin={isAdmin}
      compact={compact}
    />
  )
}
