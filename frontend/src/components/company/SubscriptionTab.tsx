/**
 * SubscriptionTab Component
 *
 * Admin-only component for managing company service types, subscriptions,
 * pricing, feature overrides, invoices, and billing.
 *
 * Service Types:
 * - Retained: Monthly retainer + placement fees (requires Subscription record)
 * - Headhunting: Placement fees only (requires Subscription record for contract tracking)
 *
 * The service_type on Company determines feature gating.
 * The Subscription model tracks contracts for both Retained and Headhunting.
 * Only Retained generates monthly retainer invoices.
 */

import { useState, useEffect } from 'react'
import {
  Settings,
  FileText,
  Activity,
  Plus,
  AlertCircle,
  CheckCircle,
  PauseCircle,
  XCircle,
  Clock,
  ChevronRight,
  DollarSign,
  ToggleLeft,
  ToggleRight,
  Calendar,
  X,
  Loader2,
} from 'lucide-react'
import type { Company } from '@/types'
import { ServiceType } from '@/types'
import {
  useCompanySubscription,
  useEffectivePricing,
  useCompanyFeatureOverrides,
  useCompanyInvoices,
  useCompanyActivity,
  useCreateSubscription,
  usePauseSubscription,
  useResumeSubscription,
  useTerminateSubscription,
  useAdjustContract,
  useUpdateCompanyPricing,
  useUpdateFeatureOverride,
  useGenerateRetainerInvoice,
  useCompanyById,
  useCalculateTerminationFee,
} from '@/hooks'
import type {
  Subscription,
  SubscriptionStatus,
  FeatureWithOverride,
  InvoiceListItem,
  SubscriptionActivity,
} from '@/hooks'
import {
  InvoiceDetailDrawer,
  NoServiceType,
  ServiceTypeHeader,
  ContractSection,
  RetainedContractSection,
  QuickStats,
} from '@/components/subscriptions'
import { ChangeServiceTypeModal } from './ChangeServiceTypeModal'

interface SubscriptionTabProps {
  company: Company
  isAdmin?: boolean
}

// =============================================================================
// Helper Components
// =============================================================================

function StatusBadge({ status }: { status: SubscriptionStatus | string }) {
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

function InvoiceStatusBadge({ status }: { status: string }) {
  const defaultConfig = { bg: 'bg-gray-100', text: 'text-gray-600' }
  const config: Record<string, { bg: string; text: string }> = {
    draft: defaultConfig,
    sent: { bg: 'bg-blue-100', text: 'text-blue-700' },
    paid: { bg: 'bg-green-100', text: 'text-green-700' },
    overdue: { bg: 'bg-red-100', text: 'text-red-700' },
    cancelled: { bg: 'bg-gray-100', text: 'text-gray-500' },
    partially_paid: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  }
  const c = config[status] ?? defaultConfig
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${c.bg} ${c.text}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

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

// =============================================================================
// Pricing Editor (adapts based on service type)
// =============================================================================

function PricingEditor({
  companyId,
  isRetained,
  isAdmin,
}: {
  companyId: string
  isRetained: boolean
  isAdmin: boolean
}) {
  const { pricing: effectivePricing, isLoading, refetch } = useEffectivePricing(companyId)
  const { updatePricing, isUpdating } = useUpdateCompanyPricing()

  const [editMode, setEditMode] = useState(false)
  const [retainer, setRetainer] = useState('')
  const [placementFee, setPlacementFee] = useState('')
  const [csuiteFee, setCsuiteFee] = useState('')

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-32 mb-4" />
        <div className="space-y-3">
          <div className="h-10 bg-gray-100 rounded" />
          <div className="h-10 bg-gray-100 rounded" />
        </div>
      </div>
    )
  }

  const handleSave = async () => {
    try {
      await updatePricing(companyId, {
        monthly_retainer: retainer || null,
        placement_fee: placementFee ? (parseFloat(placementFee) / 100).toFixed(4) : null,
        csuite_placement_fee: csuiteFee ? (parseFloat(csuiteFee) / 100).toFixed(4) : null,
      })
      setEditMode(false)
      refetch()
    } catch (error) {
      console.error('Failed to update pricing:', error)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900">Pricing</h3>
        </div>
        {isAdmin && !editMode && (
          <button
            onClick={() => {
              setRetainer(effectivePricing?.is_custom_retainer ? effectivePricing.monthly_retainer : '')
              setPlacementFee(
                effectivePricing?.is_custom_placement
                  ? (parseFloat(effectivePricing.placement_fee) * 100).toString()
                  : ''
              )
              setCsuiteFee(
                effectivePricing?.is_custom_csuite
                  ? (parseFloat(effectivePricing.csuite_placement_fee) * 100).toString()
                  : ''
              )
              setEditMode(true)
            }}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Edit
          </button>
        )}
      </div>

      {editMode ? (
        <div className="space-y-4">
          {isRetained && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Monthly Retainer (leave blank for default)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R</span>
                <input
                  type="number"
                  value={retainer}
                  onChange={(e) => setRetainer(e.target.value)}
                  placeholder="20000"
                  className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Placement Fee % (leave blank for default)
            </label>
            <div className="relative">
              <input
                type="number"
                value={placementFee}
                onChange={(e) => setPlacementFee(e.target.value)}
                placeholder={isRetained ? '10' : '20'}
                step="0.1"
                className="w-full pr-8 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              C-Suite Placement Fee % (leave blank for default)
            </label>
            <div className="relative">
              <input
                type="number"
                value={csuiteFee}
                onChange={(e) => setCsuiteFee(e.target.value)}
                placeholder={isRetained ? '15' : '25'}
                step="0.1"
                className="w-full pr-8 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSave}
              disabled={isUpdating}
              className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-50"
            >
              {isUpdating ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => setEditMode(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {isRetained && (
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Monthly Retainer</span>
              <span className="text-sm font-medium text-gray-900">
                {formatCurrency(effectivePricing?.monthly_retainer || '20000')}
                {effectivePricing?.is_custom_retainer && (
                  <span className="ml-1 text-xs text-blue-600">(custom)</span>
                )}
              </span>
            </div>
          )}
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-sm text-gray-600">Placement Fee</span>
            <span className="text-sm font-medium text-gray-900">
              {(parseFloat(effectivePricing?.placement_fee || '0') * 100).toFixed(1)}%
              {effectivePricing?.is_custom_placement && (
                <span className="ml-1 text-xs text-blue-600">(custom)</span>
              )}
            </span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-sm text-gray-600">C-Suite Placement Fee</span>
            <span className="text-sm font-medium text-gray-900">
              {(parseFloat(effectivePricing?.csuite_placement_fee || '0') * 100).toFixed(1)}%
              {effectivePricing?.is_custom_csuite && (
                <span className="ml-1 text-xs text-blue-600">(custom)</span>
              )}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Feature Overrides
// =============================================================================

function FeatureOverrides({ companyId, isAdmin }: { companyId: string; isAdmin: boolean }) {
  const { features, isLoading, refetch } = useCompanyFeatureOverrides(companyId)
  const { updateFeatureOverride, isUpdating } = useUpdateFeatureOverride()
  const [updatingFeatureId, setUpdatingFeatureId] = useState<string | null>(null)

  const handleToggle = async (feature: FeatureWithOverride) => {
    setUpdatingFeatureId(feature.id)
    try {
      let newValue: boolean | null
      if (feature.is_overridden) {
        newValue = null
      } else {
        newValue = !feature.default_enabled
      }
      await updateFeatureOverride(companyId, feature.id, newValue)
      refetch()
    } catch (error) {
      console.error('Failed to update feature override:', error)
    } finally {
      setUpdatingFeatureId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-32 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-gray-100 rounded" />
          ))}
        </div>
      </div>
    )
  }

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
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="w-5 h-5 text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-900">Feature Overrides</h3>
      </div>

      <div className="space-y-6">
        {Object.entries(groupedFeatures).map(([category, categoryFeatures]) => (
          <div key={category}>
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">{category}</h4>
            <div className="space-y-2">
              {categoryFeatures.map((feature) => (
                <div
                  key={feature.id}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    feature.is_overridden ? 'bg-blue-50 border border-blue-100' : 'bg-gray-50'
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{feature.name}</p>
                    <p className="text-xs text-gray-500">
                      {feature.is_overridden ? (
                        <span className="text-blue-600">Overridden</span>
                      ) : (
                        <span>Default: {feature.default_enabled ? 'Enabled' : 'Disabled'}</span>
                      )}
                    </p>
                  </div>
                  {isAdmin ? (
                    <button
                      onClick={() => handleToggle(feature)}
                      disabled={isUpdating && updatingFeatureId === feature.id}
                      className="flex items-center gap-1 text-sm disabled:opacity-50"
                    >
                      {feature.effective_enabled ? (
                        <ToggleRight className="w-8 h-8 text-green-600" />
                      ) : (
                        <ToggleLeft className="w-8 h-8 text-gray-400" />
                      )}
                    </button>
                  ) : (
                    <div className="flex items-center gap-1 text-sm">
                      {feature.effective_enabled ? (
                        <ToggleRight className="w-8 h-8 text-green-600" />
                      ) : (
                        <ToggleLeft className="w-8 h-8 text-gray-400" />
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// =============================================================================
// Invoices Section
// =============================================================================

function InvoicesList({
  companyId,
  isRetained,
  isAdmin,
}: {
  companyId: string
  isRetained: boolean
  isAdmin: boolean
}) {
  const { invoices, isLoading, refetch } = useCompanyInvoices(companyId)
  const { generateRetainerInvoice, isGenerating } = useGenerateRetainerInvoice()
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null)

  const handleGenerateInvoice = async () => {
    try {
      await generateRetainerInvoice(companyId)
      refetch()
    } catch (error) {
      console.error('Failed to generate invoice:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-32 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900">Invoices</h3>
        </div>
        {isAdmin && isRetained && (
          <button
            onClick={handleGenerateInvoice}
            disabled={isGenerating}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            {isGenerating ? 'Generating...' : 'Generate Retainer Invoice'}
          </button>
        )}
      </div>

      {invoices.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">No invoices yet</p>
      ) : (
        <div className="space-y-2">
          {invoices.slice(0, 5).map((invoice: InvoiceListItem) => (
            <div
              key={invoice.id}
              onClick={() => setSelectedInvoiceId(invoice.id)}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">{invoice.invoice_number}</p>
                  <p className="text-xs text-gray-500">{formatDate(invoice.invoice_date)}</p>
                </div>
                <InvoiceStatusBadge status={invoice.status} />
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{formatCurrency(invoice.total_amount)}</p>
                  {parseFloat(invoice.balance_due) > 0 && (
                    <p className="text-xs text-red-600">Due: {formatCurrency(invoice.balance_due)}</p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            </div>
          ))}
          {invoices.length > 5 && (
            <button className="w-full py-2 text-sm text-gray-600 hover:text-gray-900">
              View all {invoices.length} invoices
            </button>
          )}
        </div>
      )}

      {selectedInvoiceId && (
        <InvoiceDetailDrawer
          invoiceId={selectedInvoiceId}
          onClose={() => setSelectedInvoiceId(null)}
          onUpdated={refetch}
          isAdmin={isAdmin}
        />
      )}
    </div>
  )
}

// =============================================================================
// Activity Log
// =============================================================================

function ActivityLog({ companyId }: { companyId: string }) {
  const { activities, isLoading } = useCompanyActivity(companyId)

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-32 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-gray-100 rounded" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-5 h-5 text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-900">Activity Log</h3>
      </div>

      {activities.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">No activity yet</p>
      ) : (
        <div className="space-y-3">
          {activities.slice(0, 10).map((activity: SubscriptionActivity) => (
            <div key={activity.id} className="flex gap-3 py-2 border-b border-gray-100 last:border-0">
              <div className="w-2 h-2 mt-1.5 rounded-full bg-gray-300 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">{activity.activity_type_display}</p>
                <p className="text-xs text-gray-500">
                  {activity.performed_by_name || 'System'} &middot; {formatDate(activity.created_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Create Subscription Contract Modal (for Retained and Headhunting)
// =============================================================================

type ServiceTypeForContract = 'retained' | 'headhunting'

function CreateContractModal({
  companyName,
  onClose,
  onCreated,
  companyId,
  serviceType = 'retained',
}: {
  companyName: string
  onClose: () => void
  onCreated: () => void
  companyId: string
  serviceType?: ServiceTypeForContract
}) {
  const { createSubscription, isCreating, error } = useCreateSubscription()
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0] ?? '')
  const [billingDay, setBillingDay] = useState('1')
  const [autoRenew, setAutoRenew] = useState(true)

  const isHeadhunting = serviceType === 'headhunting'
  const serviceLabel = isHeadhunting ? 'Headhunting' : 'Retained'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!startDate) return

    const endDate = new Date(startDate)
    endDate.setFullYear(endDate.getFullYear() + 1)
    const endDateStr = endDate.toISOString().split('T')[0] ?? ''

    try {
      await createSubscription({
        company: companyId,
        service_type: serviceType,
        contract_start_date: startDate,
        contract_end_date: endDateStr,
        billing_day_of_month: parseInt(billingDay, 10),
        auto_renew: autoRenew,
      })
      onCreated()
      onClose()
    } catch (err) {
      console.error('Failed to create subscription:', err)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Create {serviceLabel} Contract</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Set up the {serviceLabel.toLowerCase()} contract for <strong>{companyName}</strong>.
          {isHeadhunting && (
            <span className="block mt-1 text-xs text-gray-500">
              This contract tracks agreement terms. Invoices are created per placement.
            </span>
          )}
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contract Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
              required
            />
            <p className="mt-1 text-xs text-gray-500">Contract will be 1 year from start date</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Billing Day of Month</label>
            <select
              value={billingDay}
              onChange={(e) => setBillingDay(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">Day of month when retainer invoices are generated</p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="autoRenew"
              checked={autoRenew}
              onChange={(e) => setAutoRenew(e.target.checked)}
              className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
            />
            <label htmlFor="autoRenew" className="text-sm text-gray-700">
              Auto-renew contract at end of term
            </label>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              disabled={isCreating}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-50"
            >
              {isCreating ? 'Creating...' : 'Create Contract'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isCreating}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// =============================================================================
// Adjust Contract Modal
// =============================================================================

function AdjustContractModal({
  subscription,
  companyName,
  onClose,
  onAdjusted,
  adjustContract,
  isAdjusting,
}: {
  subscription: Subscription
  companyName: string
  onClose: () => void
  onAdjusted: () => void
  adjustContract: (subscriptionId: string, newEndDate: string) => Promise<Subscription>
  isAdjusting: boolean
}) {
  const [newEndDate, setNewEndDate] = useState(subscription.contract_end_date)

  const currentEndDate = new Date(subscription.contract_end_date)
  const selectedEndDate = new Date(newEndDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const isExtending = selectedEndDate > currentEndDate
  const isValid = selectedEndDate >= today && newEndDate !== subscription.contract_end_date

  const diffTime = selectedEndDate.getTime() - currentEndDate.getTime()
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return
    try {
      await adjustContract(subscription.id, newEndDate)
      onAdjusted()
      onClose()
    } catch (err) {
      console.error('Failed to adjust contract:', err)
    }
  }

  const quickAdjustments = [
    { months: -3, label: '-3 months' },
    { months: -1, label: '-1 month' },
    { months: 1, label: '+1 month' },
    { months: 3, label: '+3 months' },
    { months: 6, label: '+6 months' },
    { months: 12, label: '+1 year' },
  ]

  const applyQuickAdjustment = (months: number) => {
    const date = new Date(subscription.contract_end_date)
    date.setMonth(date.getMonth() + months)
    if (date >= today) {
      setNewEndDate(date.toISOString().split('T')[0] ?? '')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Adjust Contract</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Adjust the contract end date for <strong>{companyName}</strong>.
        </p>

        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500">Current End Date</p>
              <p className="text-sm font-medium text-gray-900">
                {formatDate(subscription.contract_end_date)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Days Remaining</p>
              <p className="text-sm font-medium text-gray-900">
                {subscription.days_until_renewal} days
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Quick Adjust</label>
            <div className="flex flex-wrap gap-2">
              {quickAdjustments.map((adj) => (
                <button
                  key={adj.months}
                  type="button"
                  onClick={() => applyQuickAdjustment(adj.months)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                    adj.months < 0
                      ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                      : 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                  }`}
                >
                  {adj.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">New End Date</label>
            <input
              type="date"
              value={newEndDate}
              onChange={(e) => setNewEndDate(e.target.value)}
              min={today.toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

          {newEndDate !== subscription.contract_end_date && (
            <div className={`border rounded-lg p-4 ${
              isExtending
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <Calendar className={`w-4 h-4 ${isExtending ? 'text-green-600' : 'text-red-600'}`} />
                <p className={`text-sm font-medium ${isExtending ? 'text-green-900' : 'text-red-900'}`}>
                  {isExtending ? 'Contract Extended' : 'Contract Reduced'}
                </p>
              </div>
              <p className={`text-lg font-semibold ${isExtending ? 'text-green-900' : 'text-red-900'}`}>
                {selectedEndDate.toLocaleDateString('en-ZA', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
              <p className={`text-xs mt-1 ${isExtending ? 'text-green-700' : 'text-red-700'}`}>
                {isExtending ? '+' : ''}{diffDays} days from current end date
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isAdjusting || !isValid}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-50"
            >
              {isAdjusting ? 'Adjusting...' : 'Confirm Adjustment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// =============================================================================
// Permission Denied
// =============================================================================

function PermissionDenied() {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <AlertCircle className="w-6 h-6 text-red-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h3>
      <p className="text-sm text-gray-500 mb-2">
        You don't have permission to view service and billing details.
      </p>
      <p className="text-xs text-gray-400">
        Staff access (Admin or Recruiter role) is required.
      </p>
    </div>
  )
}

// =============================================================================
// Main Component
// =============================================================================

export default function SubscriptionTab({ company, isAdmin = false }: SubscriptionTabProps) {
  const { recruitmentSubscription: subscription, isLoading, hasSubscription, isPermissionDenied, refetch } = useCompanySubscription(company.id)
  const { updateCompany, refetch: refetchCompany } = useCompanyById(company.id)
  const { pauseSubscription, isPausing } = usePauseSubscription()
  const { resumeSubscription, isResuming } = useResumeSubscription()
  const { adjustContract, isAdjusting } = useAdjustContract()
  const { terminateSubscription, isTerminating } = useTerminateSubscription()
  const { calculateFee, feeCalculation, isCalculating: isCalculatingFee, error: feeError } = useCalculateTerminationFee()

  const [showCreateContractModal, setShowCreateContractModal] = useState(false)
  const [showPauseModal, setShowPauseModal] = useState(false)
  const [showTerminateModal, setShowTerminateModal] = useState(false)
  const [showAdjustModal, setShowAdjustModal] = useState(false)
  const [showChangeServiceTypeModal, setShowChangeServiceTypeModal] = useState(false)
  const [pauseReason, setPauseReason] = useState('')
  const [terminationReason, setTerminationReason] = useState('')

  const serviceType = company.service_type as 'retained' | 'headhunting' | undefined
  const isRetained = serviceType === 'retained'
  const isHeadhunting = serviceType === 'headhunting'
  const hasServiceType = !!serviceType

  // Calculate termination fee when modal opens (only for retained)
  useEffect(() => {
    if (showTerminateModal && subscription && isRetained) {
      calculateFee(subscription.id)
    }
  }, [showTerminateModal, subscription, calculateFee, isRetained])

  const handleSelectServiceType = async (type: 'retained' | 'headhunting') => {
    const serviceTypeEnum = type === 'retained' ? ServiceType.RETAINED : ServiceType.HEADHUNTING
    await updateCompany({ service_type: serviceTypeEnum })
    refetchCompany()
    refetch()
  }

  const handlePause = async () => {
    if (!subscription || !pauseReason) return
    try {
      await pauseSubscription(subscription.id, pauseReason)
      setShowPauseModal(false)
      setPauseReason('')
      refetch()
    } catch (error) {
      console.error('Failed to pause subscription:', error)
    }
  }

  const handleResume = async () => {
    if (!subscription) return
    try {
      await resumeSubscription(subscription.id)
      refetch()
    } catch (error) {
      console.error('Failed to resume subscription:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-32 bg-gray-100 rounded-lg" />
        <div className="grid grid-cols-2 gap-6">
          <div className="h-64 bg-gray-100 rounded-lg" />
          <div className="h-64 bg-gray-100 rounded-lg" />
        </div>
      </div>
    )
  }

  if (isPermissionDenied) {
    return <PermissionDenied />
  }

  // No service type set - show selection UI
  if (!hasServiceType) {
    return (
      <NoServiceType
        companyName={company.name}
        onSelectServiceType={handleSelectServiceType}
        isAdmin={isAdmin}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Service Type Header */}
      <ServiceTypeHeader
        serviceType={serviceType}
        onChangeServiceType={() => setShowChangeServiceTypeModal(true)}
        subscriptionStatus={subscription ? subscription.status : null}
        isAdmin={isAdmin}
      />

      {/* Contract Section - for both retained and headhunting */}
      {(isRetained || isHeadhunting) && (
        <ContractSection
          subscription={subscription}
          serviceType={serviceType}
          onPause={() => setShowPauseModal(true)}
          onResume={handleResume}
          onAdjust={() => setShowAdjustModal(true)}
          onTerminate={() => setShowTerminateModal(true)}
          onCreateSubscription={() => setShowCreateContractModal(true)}
          isPausing={isPausing}
          isResuming={isResuming}
          isAdmin={isAdmin}
        />
      )}

      {/* Pricing & Features */}
      <div className={`grid grid-cols-1 ${isAdmin ? 'lg:grid-cols-2' : ''} gap-6`}>
        <PricingEditor companyId={company.id} isRetained={isRetained} isAdmin={isAdmin} />
        {isAdmin && <FeatureOverrides companyId={company.id} isAdmin={isAdmin} />}
      </div>

      {/* Invoices & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InvoicesList companyId={company.id} isRetained={isRetained} isAdmin={isAdmin} />
        <ActivityLog companyId={company.id} />
      </div>

      {/* Create Contract Modal */}
      {showCreateContractModal && (
        <CreateContractModal
          companyName={company.name}
          companyId={company.id}
          serviceType={serviceType}
          onClose={() => setShowCreateContractModal(false)}
          onCreated={refetch}
        />
      )}

      {/* Pause Modal */}
      {showPauseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Pause Subscription</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason for pausing</label>
              <textarea
                value={pauseReason}
                onChange={(e) => setPauseReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                placeholder="Enter reason..."
                required
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handlePause}
                disabled={!pauseReason || isPausing}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-lg hover:bg-yellow-700 disabled:opacity-50"
              >
                {isPausing ? 'Pausing...' : 'Pause Subscription'}
              </button>
              <button
                onClick={() => {
                  setShowPauseModal(false)
                  setPauseReason('')
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Terminate Modal */}
      {showTerminateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Terminate Subscription</h3>
            </div>

            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">
                <strong>Warning:</strong> This action cannot be undone. Terminating will end the subscription for <strong>{company.name}</strong>.
              </p>
            </div>

            {/* Early Termination Fee Breakdown */}
            <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <h4 className="text-sm font-semibold text-amber-800 mb-3">Early Termination Fee</h4>
              {isCalculatingFee ? (
                <div className="flex items-center gap-2 text-sm text-amber-700">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Calculating fee...
                </div>
              ) : feeError ? (
                <p className="text-sm text-red-600">{feeError}</p>
              ) : feeCalculation ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-amber-700">Monthly Retainer</span>
                    <span className="font-medium text-amber-900">
                      {formatCurrency(feeCalculation.monthly_retainer)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-amber-700">Months Remaining</span>
                    <span className="font-medium text-amber-900">{feeCalculation.months_remaining} months</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-amber-700">Remaining Term Value</span>
                    <span className="text-amber-900">
                      {formatCurrency(feeCalculation.remaining_term_fee)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-amber-700">3-Month Fee (minimum)</span>
                    <span className="text-amber-900">
                      {formatCurrency(feeCalculation.three_month_fee)}
                    </span>
                  </div>
                  <div className="border-t border-amber-300 pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-semibold text-amber-800">Termination Fee</span>
                      <span className="text-lg font-bold text-red-600">
                        {formatCurrency(feeCalculation.early_termination_fee)}
                      </span>
                    </div>
                    <p className="text-xs text-amber-600 mt-1">Lesser of remaining term value or 3-month fee</p>
                  </div>
                  {feeCalculation.is_within_lockout_period && (
                    <p className="text-xs text-amber-700 mt-2">
                      Warning: This subscription is within the 6-month lockout period.
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-amber-700">Unable to calculate fee</p>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Termination</label>
              <textarea
                value={terminationReason}
                onChange={(e) => setTerminationReason(e.target.value)}
                rows={3}
                placeholder="Enter termination reason..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={async () => {
                  if (!subscription) return
                  try {
                    await terminateSubscription(subscription.id, {
                      termination_type: 'without_cause',
                      termination_reason: 'client_request',
                      termination_notes: terminationReason,
                    })
                    setShowTerminateModal(false)
                    setTerminationReason('')
                    refetch()
                  } catch (error) {
                    console.error('Failed to terminate subscription:', error)
                  }
                }}
                disabled={isTerminating || (feeCalculation && feeCalculation.can_terminate_without_cause === false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {isTerminating ? 'Terminating...' : 'Terminate Subscription'}
              </button>
              <button
                onClick={() => {
                  setShowTerminateModal(false)
                  setTerminationReason('')
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Adjust Contract Modal */}
      {showAdjustModal && subscription && (
        <AdjustContractModal
          subscription={subscription}
          companyName={company.name}
          onClose={() => setShowAdjustModal(false)}
          onAdjusted={refetch}
          adjustContract={adjustContract}
          isAdjusting={isAdjusting}
        />
      )}

      {/* Change Service Type Modal */}
      {showChangeServiceTypeModal && (
        <ChangeServiceTypeModal
          companyId={company.id}
          companyName={company.name}
          currentType={serviceType}
          subscriptionId={subscription?.id}
          monthsRemaining={subscription?.months_remaining}
          isWithinLockoutPeriod={subscription?.is_within_lockout_period}
          isAdmin={isAdmin}
          onClose={() => setShowChangeServiceTypeModal(false)}
          onChanged={() => {
            refetch()
            refetchCompany()
          }}
        />
      )}
    </div>
  )
}
