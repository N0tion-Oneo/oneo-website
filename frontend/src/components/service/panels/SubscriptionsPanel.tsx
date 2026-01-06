/**
 * SubscriptionsPanel - Subscription management panel for companies
 *
 * Displays subscription status, contract details, pricing, features, and invoices.
 * For use in drawer-based entity views (CompanyDetailDrawer, etc.)
 */

import { useState } from 'react'
import {
  CreditCard,
  FileText,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle,
  PauseCircle,
  XCircle,
  Clock,
  RefreshCw,
  ChevronRight,
  ExternalLink,
  Activity,
  Settings,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react'
import {
  useCompanySubscription,
  useEffectivePricing,
  useCompanyInvoices,
  useCompanyActivity,
  useCompanyFeatureOverrides,
  useUpdateFeatureOverride,
} from '@/hooks'
import type { SubscriptionStatus, InvoiceStatus, FeatureWithOverride } from '@/hooks'
import { InvoiceDetailDrawer } from '@/components/subscriptions'
import { ChangeServiceTypeModal } from '@/components/company'

interface SubscriptionsPanelProps {
  companyId: string
  companyName?: string
  onRefresh?: () => void
}

// Helper functions
function formatCurrency(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// Status badge component
function StatusBadge({ status }: { status: SubscriptionStatus | 'none' }) {
  const configs: Record<SubscriptionStatus | 'none', { bg: string; text: string; icon: React.ReactNode; label: string }> = {
    active: {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-700 dark:text-green-400',
      icon: <CheckCircle className="w-3.5 h-3.5" />,
      label: 'Active',
    },
    paused: {
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      text: 'text-yellow-700 dark:text-yellow-400',
      icon: <PauseCircle className="w-3.5 h-3.5" />,
      label: 'Paused',
    },
    terminated: {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-700 dark:text-red-400',
      icon: <XCircle className="w-3.5 h-3.5" />,
      label: 'Terminated',
    },
    expired: {
      bg: 'bg-gray-100 dark:bg-gray-700',
      text: 'text-gray-600 dark:text-gray-400',
      icon: <Clock className="w-3.5 h-3.5" />,
      label: 'Expired',
    },
    none: {
      bg: 'bg-gray-50 dark:bg-gray-800',
      text: 'text-gray-400 dark:text-gray-500',
      icon: <CreditCard className="w-3.5 h-3.5" />,
      label: 'No Subscription',
    },
  }
  const config = configs[status]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${config.bg} ${config.text}`}>
      {config.icon}
      {config.label}
    </span>
  )
}

function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const configs: Record<InvoiceStatus, { bg: string; text: string; label: string }> = {
    draft: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-600 dark:text-gray-400', label: 'Draft' },
    sent: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', label: 'Sent' },
    paid: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', label: 'Paid' },
    partially_paid: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400', label: 'Partial' },
    overdue: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', label: 'Overdue' },
    cancelled: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-500 dark:text-gray-400', label: 'Cancelled' },
  }
  const config = configs[status]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  )
}

// Feature Toggle Component
function FeatureToggle({
  feature,
  onToggle,
  isUpdating,
}: {
  feature: FeatureWithOverride
  onToggle: () => void
  isUpdating: boolean
}) {
  return (
    <div
      className={`flex items-center justify-between p-2.5 rounded-lg ${
        feature.is_overridden
          ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800'
          : 'bg-gray-50 dark:bg-gray-800'
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-medium text-gray-900 dark:text-gray-100 truncate">
          {feature.name}
        </p>
        <p className="text-[10px] text-gray-500 dark:text-gray-400">
          {feature.is_overridden ? (
            <span className="text-blue-600 dark:text-blue-400">Overridden</span>
          ) : (
            <span>Default: {feature.default_enabled ? 'On' : 'Off'}</span>
          )}
        </p>
      </div>
      <button
        onClick={onToggle}
        disabled={isUpdating}
        className="flex-shrink-0 disabled:opacity-50"
      >
        {feature.effective_enabled ? (
          <ToggleRight className="w-6 h-6 text-green-600 dark:text-green-500" />
        ) : (
          <ToggleLeft className="w-6 h-6 text-gray-400 dark:text-gray-500" />
        )}
      </button>
    </div>
  )
}

export function SubscriptionsPanel({ companyId, companyName, onRefresh }: SubscriptionsPanelProps) {
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null)
  const [updatingFeatureId, setUpdatingFeatureId] = useState<string | null>(null)
  const [showChangeServiceTypeModal, setShowChangeServiceTypeModal] = useState(false)

  // Fetch subscription data
  const {
    recruitmentSubscription: subscription,
    isLoading: subscriptionLoading,
    isPermissionDenied,
    refetch: refetchSubscription,
  } = useCompanySubscription(companyId)

  const { pricing, isLoading: pricingLoading } = useEffectivePricing(companyId)
  const { invoices, refetch: refetchInvoices } = useCompanyInvoices(companyId)
  const { activities } = useCompanyActivity(companyId)
  const { features, refetch: refetchFeatures } = useCompanyFeatureOverrides(companyId)
  const { updateFeatureOverride, isUpdating: isFeatureUpdating } = useUpdateFeatureOverride()

  const isLoading = subscriptionLoading || pricingLoading

  // Handle refresh
  const handleRefresh = () => {
    refetchSubscription()
    refetchInvoices()
    refetchFeatures()
    onRefresh?.()
  }

  // Handle feature toggle
  const handleFeatureToggle = async (feature: FeatureWithOverride) => {
    setUpdatingFeatureId(feature.id)
    try {
      let newValue: boolean | null
      if (feature.is_overridden) {
        // Clear override - revert to default
        newValue = null
      } else {
        // Set override to opposite of default
        newValue = !feature.default_enabled
      }
      await updateFeatureOverride(companyId, feature.id, newValue)
      refetchFeatures()
    } catch (error) {
      console.error('Failed to update feature override:', error)
    } finally {
      setUpdatingFeatureId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="h-full overflow-y-auto p-4 space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-24 bg-gray-100 dark:bg-gray-800 rounded-lg" />
          <div className="h-32 bg-gray-100 dark:bg-gray-800 rounded-lg" />
          <div className="h-48 bg-gray-100 dark:bg-gray-800 rounded-lg" />
        </div>
      </div>
    )
  }

  if (isPermissionDenied) {
    return (
      <div className="h-full overflow-y-auto p-4">
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-red-300 dark:text-red-500 mx-auto mb-3" />
          <p className="text-[13px] text-gray-700 dark:text-gray-300">Access Denied</p>
          <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-1">
            Staff access required to view subscriptions
          </p>
        </div>
      </div>
    )
  }

  const hasSubscription = !!subscription
  const recentInvoices = invoices.slice(0, 5)
  const recentActivities = activities.slice(0, 5)

  // Group features by category
  const groupedFeatures = features.reduce(
    (acc, feature) => {
      const category = feature.category || 'Other'
      if (!acc[category]) acc[category] = []
      acc[category].push(feature)
      return acc
    },
    {} as Record<string, FeatureWithOverride[]>
  )

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[14px] font-medium text-gray-900 dark:text-gray-100">
            Subscription & Billing
          </h3>
          <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5">
            {hasSubscription ? `${subscription.service_type_display} plan` : 'No active subscription'}
          </p>
        </div>
        <a
          href={`/dashboard/admin/subscriptions?company=${companyId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Manage
        </a>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-2 gap-4">
        {/* Left Column - Contract, Pricing, Invoices, Activity */}
        <div className="space-y-4">
          {/* Subscription Status Card */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span className="text-[13px] font-medium text-gray-900 dark:text-gray-100">Contract</span>
              </div>
              <StatusBadge status={subscription?.status || 'none'} />
            </div>

            {hasSubscription ? (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-gray-600 dark:text-gray-400">Service Type</span>
                  <span className="text-[12px] font-medium text-gray-900 dark:text-gray-100 capitalize">
                    {subscription.service_type}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-gray-600 dark:text-gray-400">Contract Period</span>
                  <span className="text-[12px] text-gray-900 dark:text-gray-100 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                    {formatDate(subscription.contract_start_date)} - {formatDate(subscription.contract_end_date)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-gray-600 dark:text-gray-400">Auto Renew</span>
                  <span className="text-[12px] text-gray-900 dark:text-gray-100 flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                    {subscription.auto_renew ? 'Yes' : 'No'}
                  </span>
                </div>

                {subscription.days_until_renewal > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-gray-600 dark:text-gray-400">Renewal In</span>
                    <span className="text-[12px] font-medium text-gray-900 dark:text-gray-100">
                      {subscription.days_until_renewal} days
                    </span>
                  </div>
                )}

                {/* Change Service Type Button */}
                <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                  <button
                    onClick={() => setShowChangeServiceTypeModal(true)}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-[12px] font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Change to {subscription.service_type === 'retained' ? 'Headhunting' : 'Retained'}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-[12px] text-gray-500 dark:text-gray-400 text-center py-4">
                No subscription on record
              </p>
            )}
          </div>

          {/* Pricing Card */}
          {pricing && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span className="text-[13px] font-medium text-gray-900 dark:text-gray-100">Pricing</span>
              </div>

              <div className="space-y-2.5">
                {subscription?.service_type === 'retained' && (
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-gray-600 dark:text-gray-400">Monthly Retainer</span>
                    <span className="text-[12px] font-medium text-gray-900 dark:text-gray-100">
                      {formatCurrency(pricing.monthly_retainer)}
                      {pricing.is_custom_retainer && (
                        <span className="ml-1 text-[10px] text-blue-600 dark:text-blue-400">(custom)</span>
                      )}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-gray-600 dark:text-gray-400">Placement Fee</span>
                  <span className="text-[12px] font-medium text-gray-900 dark:text-gray-100">
                    {(parseFloat(pricing.placement_fee) * 100).toFixed(1)}%
                    {pricing.is_custom_placement && (
                      <span className="ml-1 text-[10px] text-blue-600 dark:text-blue-400">(custom)</span>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-gray-600 dark:text-gray-400">C-Suite Fee</span>
                  <span className="text-[12px] font-medium text-gray-900 dark:text-gray-100">
                    {(parseFloat(pricing.csuite_placement_fee) * 100).toFixed(1)}%
                    {pricing.is_custom_csuite && (
                      <span className="ml-1 text-[10px] text-blue-600 dark:text-blue-400">(custom)</span>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-gray-600 dark:text-gray-400">Replacement Period</span>
                  <span className="text-[12px] font-medium text-gray-900 dark:text-gray-100">
                    {pricing.replacement_period_days} days
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Recent Invoices */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span className="text-[13px] font-medium text-gray-900 dark:text-gray-100">Recent Invoices</span>
            </div>

            {recentInvoices.length > 0 ? (
              <div className="space-y-2">
                {recentInvoices.map((invoice) => (
                  <button
                    key={invoice.id}
                    onClick={() => setSelectedInvoiceId(invoice.id)}
                    className="w-full flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-medium text-gray-900 dark:text-gray-100">
                          {invoice.invoice_number}
                        </span>
                        <InvoiceStatusBadge status={invoice.status} />
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
                        <span>{invoice.invoice_type_display}</span>
                        <span>•</span>
                        <span>{formatDate(invoice.invoice_date)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-medium text-gray-900 dark:text-gray-100">
                        {formatCurrency(invoice.total_amount)}
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                    </div>
                  </button>
                ))}

                {invoices.length > 5 && (
                  <a
                    href={`/dashboard/admin/subscriptions?company=${companyId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full py-2 text-[12px] text-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                  >
                    View all {invoices.length} invoices
                  </a>
                )}
              </div>
            ) : (
              <p className="text-[12px] text-gray-500 dark:text-gray-400 text-center py-4">
                No invoices found
              </p>
            )}
          </div>

          {/* Recent Activity */}
          {recentActivities.length > 0 && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span className="text-[13px] font-medium text-gray-900 dark:text-gray-100">Recent Activity</span>
              </div>

              <div className="space-y-2">
                {recentActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex gap-3 py-2 border-b border-gray-100 dark:border-gray-800 last:border-0"
                  >
                    <div className="w-2 h-2 mt-1.5 rounded-full bg-gray-300 dark:bg-gray-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] text-gray-900 dark:text-gray-100">
                        {activity.activity_type_display}
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        {activity.performed_by_name || 'System'} &middot; {formatDate(activity.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Features */}
        <div className="space-y-4">
          {/* Features Card */}
          {features.length > 0 ? (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Settings className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span className="text-[13px] font-medium text-gray-900 dark:text-gray-100">Features</span>
              </div>

              <div className="space-y-4">
                {Object.entries(groupedFeatures).map(([category, categoryFeatures]) => (
                  <div key={category}>
                    <h4 className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                      {category}
                    </h4>
                    <div className="space-y-1.5">
                      {categoryFeatures.map((feature) => (
                        <FeatureToggle
                          key={feature.id}
                          feature={feature}
                          onToggle={() => handleFeatureToggle(feature)}
                          isUpdating={isFeatureUpdating && updatingFeatureId === feature.id}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Settings className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span className="text-[13px] font-medium text-gray-900 dark:text-gray-100">Features</span>
              </div>
              <p className="text-[12px] text-gray-500 dark:text-gray-400 text-center py-4">
                No features configured
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Invoice Detail Drawer */}
      {selectedInvoiceId && (
        <InvoiceDetailDrawer
          invoiceId={selectedInvoiceId}
          onClose={() => setSelectedInvoiceId(null)}
          onUpdated={() => {
            refetchInvoices()
            handleRefresh()
          }}
          isAdmin={true}
        />
      )}

      {/* Change Service Type Modal */}
      {showChangeServiceTypeModal && subscription && companyName && (
        <ChangeServiceTypeModal
          companyId={companyId}
          companyName={companyName}
          currentType={subscription.service_type as 'retained' | 'headhunting'}
          subscriptionId={subscription.id}
          monthsRemaining={subscription.months_remaining}
          isWithinLockoutPeriod={subscription.is_within_lockout_period}
          isAdmin={true}
          onClose={() => setShowChangeServiceTypeModal(false)}
          onChanged={() => {
            setShowChangeServiceTypeModal(false)
            handleRefresh()
          }}
        />
      )}
    </div>
  )
}

export default SubscriptionsPanel
