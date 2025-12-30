import { CreditCard, FileText, Calendar, DollarSign, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react'

interface BillingPanelProps {
  companyId: string
  entity?: Record<string, unknown>
}

export function BillingPanel({ entity }: BillingPanelProps) {
  // Extract subscription info from entity if available
  const subscription = (entity as { subscription?: {
    id?: string
    status?: string
    service_type?: string
    contract_start_date?: string
    contract_end_date?: string
    auto_renew?: boolean
    billing_mode?: string
    days_until_renewal?: number
  } })?.subscription

  const pricing = (entity as { pricing?: {
    monthly_retainer?: string
    placement_fee?: string
    csuite_placement_fee?: string
    replacement_period_days?: number
    is_custom_retainer?: boolean
    is_custom_placement_fee?: boolean
    is_custom_csuite_fee?: boolean
  } })?.pricing

  // Also get service_type from entity root for display
  const serviceType = (entity as { service_type?: string })?.service_type

  // Extract recent invoices
  const recentInvoices = (entity as { recent_invoices?: {
    id: string
    invoice_number: string
    invoice_type: string
    invoice_type_display: string
    invoice_date: string | null
    due_date: string | null
    total_amount: string | null
    amount_paid: string
    status: string
    status_display: string
    is_overdue: boolean
  }[] })?.recent_invoices || []

  const hasSubscription = !!subscription
  const hasPricing = !!pricing
  const hasInvoices = recentInvoices.length > 0

  if (!hasSubscription && !hasPricing) {
    return (
      <div className="h-full overflow-y-auto p-4">
        <div className="text-center py-8">
          <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No billing information available</p>
          <p className="text-gray-400 text-xs mt-1">
            Subscription and pricing details will appear here
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {/* Subscription/Contract Section */}
      {hasSubscription && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="w-4 h-4 text-gray-500" />
            <h3 className="font-medium text-sm text-gray-900">Contract</h3>
          </div>

          <div className="space-y-3">
            {subscription?.service_type && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Service Type</span>
                <span className="text-sm font-medium text-gray-900 capitalize">
                  {subscription.service_type}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Status</span>
              <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${
                subscription?.status === 'active'
                  ? 'bg-green-100 text-green-700'
                  : subscription?.status === 'paused'
                  ? 'bg-yellow-100 text-yellow-700'
                  : subscription?.status === 'terminated' || subscription?.status === 'expired'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {subscription?.status === 'active' ? (
                  <CheckCircle className="w-3 h-3" />
                ) : subscription?.status === 'paused' ? (
                  <AlertCircle className="w-3 h-3" />
                ) : null}
                {subscription?.status || 'Unknown'}
              </span>
            </div>

            {subscription?.contract_start_date && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Start Date</span>
                <span className="text-sm text-gray-900 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-gray-400" />
                  {new Date(subscription.contract_start_date).toLocaleDateString()}
                </span>
              </div>
            )}

            {subscription?.contract_end_date && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">End Date</span>
                <span className="text-sm text-gray-900 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-gray-400" />
                  {new Date(subscription.contract_end_date).toLocaleDateString()}
                </span>
              </div>
            )}

            {subscription?.auto_renew !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Auto Renew</span>
                <span className="text-sm text-gray-900 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 text-gray-400" />
                  {subscription.auto_renew ? 'Yes' : 'No'}
                </span>
              </div>
            )}

            {subscription?.days_until_renewal !== undefined && subscription.days_until_renewal > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Renewal In</span>
                <span className="text-sm font-medium text-gray-900">
                  {subscription.days_until_renewal} days
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pricing Section */}
      {(hasPricing || serviceType) && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="w-4 h-4 text-gray-500" />
            <h3 className="font-medium text-sm text-gray-900">Pricing</h3>
          </div>

          <div className="space-y-3">
            {serviceType && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Service Type</span>
                <span className="text-sm font-medium text-gray-900 capitalize">
                  {serviceType}
                </span>
              </div>
            )}

            {pricing?.monthly_retainer && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Monthly Retainer</span>
                <span className="text-sm font-medium text-gray-900">
                  R{parseFloat(pricing.monthly_retainer).toLocaleString()}
                </span>
              </div>
            )}

            {pricing?.placement_fee && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Placement Fee</span>
                <span className="text-sm font-medium text-gray-900">
                  {pricing.placement_fee}%
                </span>
              </div>
            )}

            {pricing?.csuite_placement_fee && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">C-Suite Placement Fee</span>
                <span className="text-sm font-medium text-gray-900">
                  {pricing.csuite_placement_fee}%
                </span>
              </div>
            )}

            {pricing?.replacement_period_days && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Replacement Period</span>
                <span className="text-sm font-medium text-gray-900">
                  {pricing.replacement_period_days} days
                </span>
              </div>
            )}
          </div>

          {/* Show if using default pricing */}
          {pricing && !pricing.is_custom_placement_fee && !pricing.is_custom_retainer && (
            <p className="text-xs text-gray-400 mt-3 pt-2 border-t border-gray-100">
              Using default pricing rates
            </p>
          )}
        </div>
      )}

      {/* Invoices Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-4 h-4 text-gray-500" />
          <h3 className="font-medium text-sm text-gray-900">Recent Invoices</h3>
        </div>

        {hasInvoices ? (
          <div className="space-y-2">
            {recentInvoices.map((invoice) => (
              <div
                key={invoice.id}
                className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      {invoice.invoice_number}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      invoice.status === 'paid'
                        ? 'bg-green-100 text-green-700'
                        : invoice.status === 'overdue' || invoice.is_overdue
                        ? 'bg-red-100 text-red-700'
                        : invoice.status === 'sent'
                        ? 'bg-blue-100 text-blue-700'
                        : invoice.status === 'partially_paid'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {invoice.status_display}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                    <span>{invoice.invoice_type_display}</span>
                    {invoice.invoice_date && (
                      <>
                        <span>•</span>
                        <span>{new Date(invoice.invoice_date).toLocaleDateString()}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    R{invoice.total_amount ? parseFloat(invoice.total_amount).toLocaleString() : '0'}
                  </div>
                  {invoice.status !== 'paid' && parseFloat(invoice.amount_paid) > 0 && (
                    <div className="text-xs text-gray-500">
                      Paid: R{parseFloat(invoice.amount_paid).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-500 text-center py-4">
            No invoices found
          </p>
        )}
      </div>
    </div>
  )
}

export default BillingPanel
