/**
 * SubscriptionDrawer - Drawer for viewing and managing company subscription details
 */

import { useState, useEffect } from 'react'
import {
  X,
  Building2,
  CreditCard,
  DollarSign,
  FileText,
  Settings,
  Activity,
  RefreshCw,
  Plus,
  Send,
  Trash2,
  Loader2,
  CheckCircle,
  PauseCircle,
  XCircle,
  Clock,
  Calendar,
  ToggleLeft,
  ToggleRight,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
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
  useSendInvoice,
  useCancelInvoice,
  useRecordPayment,
  useCreateInvoice,
  useCompanyPlacements,
  useCalculateTerminationFee,
  useCompanyById,
  useReplacementRequests,
  useReplacementActions,
} from '@/hooks'
import type {
  SubscriptionStatus,
  InvoiceStatus,
  InvoiceListItem,
  Subscription,
  FeatureWithOverride,
  SubscriptionActivity,
  PlacementForInvoice,
  EffectivePricing,
  InvoiceType,
} from '@/hooks'
import type { AdminCompanyListItem, ReplacementRequest } from '@/types'
import { ServiceType } from '@/types'
import { ChangeServiceTypeModal } from '@/components/company/ChangeServiceTypeModal'
import {
  ServiceTypeBadge,
  NoServiceType,
  ServiceTypeHeader,
  ContractSection,
  RetainedContractSection,
  QuickStats,
} from '@/components/subscriptions'
import { ReplacementReviewCard } from '@/components/replacements'
import { cmsPricing, type CMSPricingConfig } from '@/services/cms'
import InvoiceDetailDrawer from './InvoiceDetailDrawer'

// =====================================================
// HELPER FUNCTIONS
// =====================================================

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

// =====================================================
// BADGE COMPONENTS
// =====================================================

function SubscriptionStatusBadge({ status }: { status: SubscriptionStatus | 'none' }) {
  const configs: Record<SubscriptionStatus | 'none', { bg: string; text: string; icon: React.ReactNode; label: string }> = {
    active: { bg: 'bg-green-100', text: 'text-green-700', icon: <CheckCircle className="w-3.5 h-3.5" />, label: 'Active' },
    paused: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: <PauseCircle className="w-3.5 h-3.5" />, label: 'Paused' },
    terminated: { bg: 'bg-red-100', text: 'text-red-700', icon: <XCircle className="w-3.5 h-3.5" />, label: 'Terminated' },
    expired: { bg: 'bg-gray-100', text: 'text-gray-600', icon: <Clock className="w-3.5 h-3.5" />, label: 'Expired' },
    none: { bg: 'bg-gray-50', text: 'text-gray-400', icon: <CreditCard className="w-3.5 h-3.5" />, label: 'No Subscription' },
  }
  const config = configs[status]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.icon}
      {config.label}
    </span>
  )
}

function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const configs: Record<InvoiceStatus, { bg: string; text: string; label: string }> = {
    draft: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Draft' },
    sent: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Sent' },
    paid: { bg: 'bg-green-100', text: 'text-green-700', label: 'Paid' },
    partially_paid: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Partial' },
    overdue: { bg: 'bg-red-100', text: 'text-red-700', label: 'Overdue' },
    cancelled: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Cancelled' },
  }
  const config = configs[status]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  )
}

// =====================================================
// MODAL COMPONENTS
// =====================================================

function CreateSubscriptionModal({
  company,
  onClose,
  onCreated,
}: {
  company: AdminCompanyListItem
  onClose: () => void
  onCreated: () => void
}) {
  const { createSubscription, isCreating, error } = useCreateSubscription()
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0] ?? '')
  const [billingDay, setBillingDay] = useState('1')
  const [autoRenew, setAutoRenew] = useState(true)
  const [internalNotes, setInternalNotes] = useState('')

  // Custom pricing state
  const [showPricing, setShowPricing] = useState(false)
  const [pricingConfig, setPricingConfig] = useState<CMSPricingConfig | null>(null)
  const [customRetainer, setCustomRetainer] = useState('')
  const [customPlacementFee, setCustomPlacementFee] = useState('')
  const [customCsuiteFee, setCustomCsuiteFee] = useState('')

  // Fetch default pricing config
  useEffect(() => {
    cmsPricing.getConfigPublic().then(setPricingConfig).catch(console.error)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!startDate) return
    const endDate = new Date(startDate)
    endDate.setFullYear(endDate.getFullYear() + 1)
    const endDateStr = endDate.toISOString().split('T')[0] ?? ''

    // Build custom pricing object if any values are set
    const hasCustomPricing = customRetainer || customPlacementFee || customCsuiteFee
    const customPricing = hasCustomPricing ? {
      monthly_retainer: customRetainer ? parseFloat(customRetainer) : undefined,
      placement_fee: customPlacementFee ? parseFloat(customPlacementFee) / 100 : undefined,
      csuite_placement_fee: customCsuiteFee ? parseFloat(customCsuiteFee) / 100 : undefined,
    } : undefined

    try {
      await createSubscription({
        company: company.id,
        service_type: company.service_type || 'retained',
        contract_start_date: startDate,
        contract_end_date: endDateStr,
        billing_day_of_month: parseInt(billingDay, 10),
        auto_renew: autoRenew,
        internal_notes: internalNotes || undefined,
        custom_pricing: customPricing,
      })
      onCreated()
      onClose()
    } catch (err) {
      console.error('Failed to create subscription:', err)
    }
  }

  const serviceTypeLabel = company.service_type === 'headhunting' ? 'Headhunting' : 'Retained'
  const isHeadhunting = company.service_type === 'headhunting'

  // Default pricing based on service type
  const defaultRetainer = pricingConfig?.retained_monthly_retainer || '20000'
  const defaultPlacementFee = isHeadhunting
    ? (parseFloat(pricingConfig?.headhunting_placement_fee || '0.20') * 100).toFixed(0)
    : (parseFloat(pricingConfig?.retained_placement_fee || '0.10') * 100).toFixed(0)
  const defaultCsuiteFee = isHeadhunting
    ? (parseFloat(pricingConfig?.headhunting_csuite_placement_fee || '0.25') * 100).toFixed(0)
    : (parseFloat(pricingConfig?.retained_csuite_placement_fee || '0.15') * 100).toFixed(0)

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Create {serviceTypeLabel} Contract</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Creating {serviceTypeLabel.toLowerCase()} contract for <strong>{company.name}</strong>
          {isHeadhunting && (
            <span className="block mt-1 text-xs text-gray-500">
              This contract tracks agreement terms. Invoices are created per placement.
            </span>
          )}
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contract Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
            <p className="text-xs text-gray-500 mt-1">Contract will be for 1 year from this date</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Billing Day of Month</label>
            <select
              value={billingDay}
              onChange={(e) => setBillingDay(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                <option key={day} value={day}>{day}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="autoRenew"
              checked={autoRenew}
              onChange={(e) => setAutoRenew(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300"
            />
            <label htmlFor="autoRenew" className="text-sm text-gray-700">Auto-renew annually</label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contract Notes <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              rows={3}
              placeholder="Special terms, negotiated conditions, internal notes..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">Internal use only - not visible to client</p>
          </div>

          {/* Custom Pricing Section */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setShowPricing(!showPricing)}
              className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <span className="text-sm font-medium text-gray-700">Custom Pricing (Optional)</span>
              {showPricing ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
            </button>

            {showPricing && (
              <div className="p-4 space-y-4 border-t border-gray-200 bg-white">
                <p className="text-xs text-gray-500">
                  Leave fields empty to use standard pricing. Custom values override defaults for this contract.
                </p>

                {/* Monthly Retainer - Only for Retained */}
                {!isHeadhunting && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Monthly Retainer (ZAR)
                    </label>
                    <input
                      type="number"
                      value={customRetainer}
                      onChange={(e) => setCustomRetainer(e.target.value)}
                      placeholder={`Default: R${parseInt(defaultRetainer).toLocaleString()}`}
                      min="0"
                      step="1000"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm"
                    />
                  </div>
                )}

                {/* Placement Fee */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Placement Fee (%)
                  </label>
                  <input
                    type="number"
                    value={customPlacementFee}
                    onChange={(e) => setCustomPlacementFee(e.target.value)}
                    placeholder={`Default: ${defaultPlacementFee}%`}
                    min="0"
                    max="100"
                    step="0.5"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">Fee charged on regular placements (% of annual salary)</p>
                </div>

                {/* C-Suite Fee */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    C-Suite Placement Fee (%)
                  </label>
                  <input
                    type="number"
                    value={customCsuiteFee}
                    onChange={(e) => setCustomCsuiteFee(e.target.value)}
                    placeholder={`Default: ${defaultCsuiteFee}%`}
                    min="0"
                    max="100"
                    step="0.5"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">Fee charged on executive-level placements</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-50"
            >
              {isCreating ? 'Creating...' : 'Create Subscription'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function PauseSubscriptionModal({
  subscription,
  companyName,
  onClose,
  onPaused,
}: {
  subscription: Subscription
  companyName: string
  onClose: () => void
  onPaused: () => void
}) {
  const { pauseSubscription, isPausing } = usePauseSubscription()
  const [reason, setReason] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await pauseSubscription(subscription.id, reason || 'Paused by admin')
      onPaused()
      onClose()
    } catch (err) {
      console.error('Failed to pause subscription:', err)
    }
  }

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Pause Subscription</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Pause subscription for <strong>{companyName}</strong>. The subscription can be resumed later.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Enter reason for pausing..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

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
              disabled={isPausing}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-lg hover:bg-yellow-700 disabled:opacity-50"
            >
              {isPausing ? 'Pausing...' : 'Pause Subscription'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AdjustContractModal({
  subscription,
  companyName,
  onClose,
  onAdjusted,
}: {
  subscription: Subscription
  companyName: string
  onClose: () => void
  onAdjusted: () => void
}) {
  const { adjustContract, isAdjusting } = useAdjustContract()
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
    <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/50">
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

function TerminateSubscriptionModal({
  subscription,
  companyName,
  serviceType,
  onClose,
  onTerminated,
}: {
  subscription: Subscription
  companyName: string
  serviceType: 'retained' | 'headhunting'
  onClose: () => void
  onTerminated: () => void
}) {
  const { terminateSubscription, isTerminating } = useTerminateSubscription()
  const { calculateFee, feeCalculation, isCalculating, error: feeError } = useCalculateTerminationFee()
  const [terminationType, setTerminationType] = useState<'for_cause' | 'without_cause'>('without_cause')
  const [notes, setNotes] = useState('')

  const isRetained = serviceType === 'retained'

  useEffect(() => {
    if (isRetained) {
      calculateFee(subscription.id)
    }
  }, [subscription.id, calculateFee, isRetained])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await terminateSubscription(subscription.id, {
        termination_type: terminationType,
        termination_reason: terminationType === 'for_cause' ? 'material_breach' : 'client_request',
        termination_notes: notes,
      })
      onTerminated()
      onClose()
    } catch (err) {
      console.error('Failed to terminate subscription:', err)
    }
  }

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-red-600">Terminate Subscription</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">
            <strong>Warning:</strong> This action cannot be undone. Terminating will end the subscription for <strong>{companyName}</strong>.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Termination Type</label>
            <div className="space-y-2">
              <label className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                terminationType === 'without_cause' ? 'border-red-300 bg-red-50' : 'border-gray-200'
              }`}>
                <input
                  type="radio"
                  name="terminationType"
                  value="without_cause"
                  checked={terminationType === 'without_cause'}
                  onChange={() => setTerminationType('without_cause')}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Without Cause</p>
                  <p className="text-xs text-gray-500">
                    {isRetained ? 'Standard termination, early termination fee applies' : 'Standard termination, no termination fee applies'}
                  </p>
                </div>
              </label>
              <label className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                terminationType === 'for_cause' ? 'border-gray-400 bg-gray-50' : 'border-gray-200'
              }`}>
                <input
                  type="radio"
                  name="terminationType"
                  value="for_cause"
                  checked={terminationType === 'for_cause'}
                  onChange={() => setTerminationType('for_cause')}
                  className="mt-0.5"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">For Cause</p>
                  <p className="text-xs text-gray-500">Breach of contract, no termination fee</p>
                </div>
              </label>
            </div>
          </div>

          {terminationType === 'without_cause' && isRetained && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <h4 className="text-sm font-semibold text-amber-800 mb-3">Early Termination Fee</h4>
              {isCalculating ? (
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
                    <span className="font-medium text-amber-900">{formatCurrency(feeCalculation.monthly_retainer)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-amber-700">Months Remaining</span>
                    <span className="font-medium text-amber-900">{feeCalculation.months_remaining} months</span>
                  </div>
                  <div className="border-t border-amber-300 pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-semibold text-amber-800">Termination Fee</span>
                      <span className="text-lg font-bold text-red-600">{formatCurrency(feeCalculation.early_termination_fee)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-amber-700">Unable to calculate fee</p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              required
              placeholder="Enter termination notes..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

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
              disabled={isTerminating}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {isTerminating ? 'Terminating...' : 'Terminate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function RecordPaymentModal({
  invoice,
  onClose,
  onRecorded,
}: {
  invoice: InvoiceListItem
  onClose: () => void
  onRecorded: () => void
}) {
  const { recordPayment, isRecording } = useRecordPayment()
  const [amount, setAmount] = useState(invoice.balance_due)
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer')
  const [reference, setReference] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await recordPayment(invoice.id, {
        amount,
        payment_date: paymentDate,
        payment_method: paymentMethod,
        reference_number: reference,
      })
      onRecorded()
      onClose()
    } catch (err) {
      console.error('Failed to record payment:', err)
    }
  }

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Record Payment</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Recording payment for invoice <strong>{invoice.invoice_number}</strong>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (ZAR)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              step="0.01"
              max={invoice.balance_due}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
            <p className="text-xs text-gray-500 mt-1">Balance due: {formatCurrency(invoice.balance_due)}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date</label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value="bank_transfer">Bank Transfer</option>
              <option value="credit_card">Credit Card</option>
              <option value="debit_order">Debit Order</option>
              <option value="cash">Cash</option>
              <option value="cheque">Cheque</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reference Number</label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g., Bank reference"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

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
              disabled={isRecording}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {isRecording ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface LineItemInput {
  description: string
  quantity: string
  unit_price: string
}

function CreateInvoiceModal({
  company,
  pricing,
  onClose,
  onCreated,
}: {
  company: AdminCompanyListItem
  pricing: EffectivePricing | null
  onClose: () => void
  onCreated: () => void
}) {
  const { createInvoice, isCreating, error: createError } = useCreateInvoice()
  const { placements, isLoading: placementsLoading } = useCompanyPlacements(company.id)

  const isRetained = company.service_type === 'retained'

  const [invoiceType, setInvoiceType] = useState<InvoiceType>('placement')
  const [selectedPlacementId, setSelectedPlacementId] = useState<string>('')
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0] ?? '')
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 30)
    return d.toISOString().split('T')[0] ?? ''
  })
  const [billingPeriodStart, setBillingPeriodStart] = useState('')
  const [billingPeriodEnd, setBillingPeriodEnd] = useState('')
  const [description, setDescription] = useState('')
  const [lineItems, setLineItems] = useState<LineItemInput[]>([
    { description: '', quantity: '1', unit_price: '' }
  ])

  const availableTypes: { value: InvoiceType; label: string }[] = [
    ...(isRetained ? [{ value: 'retainer' as InvoiceType, label: 'Monthly Retainer' }] : []),
    { value: 'placement' as InvoiceType, label: 'Placement Fee' },
    { value: 'adjustment' as InvoiceType, label: 'Adjustment/Credit' },
    { value: 'other' as InvoiceType, label: 'Other' },
  ]

  const selectedPlacement = placements.find(p => p.id === selectedPlacementId)

  const calculatePlacementFee = (placement: PlacementForInvoice): number => {
    if (!placement.total_cost_to_company || !pricing) return 0
    const feeRate = placement.is_csuite
      ? parseFloat(pricing.csuite_placement_fee)
      : parseFloat(pricing.placement_fee)
    return placement.total_cost_to_company * feeRate
  }

  const handlePlacementChange = (placementId: string) => {
    setSelectedPlacementId(placementId)
    const placement = placements.find(p => p.id === placementId)
    if (placement && pricing) {
      const fee = calculatePlacementFee(placement)
      const feeRate = placement.is_csuite
        ? parseFloat(pricing.csuite_placement_fee) * 100
        : parseFloat(pricing.placement_fee) * 100
      setLineItems([{
        description: `Placement fee for ${placement.candidate_name} - ${placement.job_title} (${feeRate.toFixed(1)}% of ${formatCurrency(placement.total_cost_to_company || 0)} total cost)`,
        quantity: '1',
        unit_price: fee.toFixed(2),
      }])
      setDescription(`Placement fee for successful hire: ${placement.candidate_name} as ${placement.job_title}`)
    }
  }

  const handleRetainerSetup = () => {
    if (pricing && invoiceType === 'retainer') {
      const now = new Date()
      const year = now.getFullYear()
      const month = now.getMonth()
      const startDate = new Date(year, month, 1)
      const endDate = new Date(year, month + 1, 0)
      setBillingPeriodStart(startDate.toISOString().split('T')[0] ?? '')
      setBillingPeriodEnd(endDate.toISOString().split('T')[0] ?? '')
      setLineItems([{
        description: `Monthly Retainer - ${startDate.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })}`,
        quantity: '1',
        unit_price: pricing.monthly_retainer,
      }])
      setDescription(`Monthly retainer fee for ${startDate.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })}`)
    }
  }

  const handleTypeChange = (type: InvoiceType) => {
    setInvoiceType(type)
    setSelectedPlacementId('')
    setBillingPeriodStart('')
    setBillingPeriodEnd('')
    setDescription('')
    setLineItems([{ description: '', quantity: '1', unit_price: '' }])
    if (type === 'retainer') {
      setTimeout(handleRetainerSetup, 0)
    }
  }

  const addLineItem = () => {
    setLineItems([...lineItems, { description: '', quantity: '1', unit_price: '' }])
  }

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index))
    }
  }

  const updateLineItem = (index: number, field: keyof LineItemInput, value: string) => {
    const updated = [...lineItems]
    updated[index] = { ...updated[index], [field]: value }
    setLineItems(updated)
  }

  const subtotal = lineItems.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0
    const price = parseFloat(item.unit_price) || 0
    return sum + (qty * price)
  }, 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (invoiceType === 'placement' && !selectedPlacementId) {
      alert('Please select a placement for the placement invoice')
      return
    }

    if (lineItems.every(item => !item.description || !item.unit_price)) {
      alert('Please add at least one line item with description and amount')
      return
    }

    try {
      await createInvoice({
        company: company.id,
        placement: invoiceType === 'placement' ? selectedPlacementId : undefined,
        invoice_type: invoiceType,
        invoice_date: invoiceDate,
        due_date: dueDate,
        billing_period_start: billingPeriodStart || undefined,
        billing_period_end: billingPeriodEnd || undefined,
        subtotal: subtotal.toFixed(2),
        description,
        line_items: lineItems
          .filter(item => item.description && item.unit_price)
          .map(item => ({
            description: item.description,
            quantity: item.quantity || '1',
            unit_price: item.unit_price,
          })),
      })
      onCreated()
      onClose()
    } catch (err) {
      console.error('Failed to create invoice:', err)
    }
  }

  const availablePlacements = placements.filter(p => !p.has_placement_invoice)

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Create Invoice</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <p className="text-sm text-gray-600 mb-4">
            Creating invoice for <strong>{company.name}</strong>
            <span className="ml-2">
              <ServiceTypeBadge type={company.service_type} />
            </span>
          </p>

          {createError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {createError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Type</label>
              <div className="grid grid-cols-2 gap-2">
                {availableTypes.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => handleTypeChange(type.value)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg border ${
                      invoiceType === type.value
                        ? 'bg-gray-900 text-white border-gray-900'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {invoiceType === 'placement' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Placement</label>
                {placementsLoading ? (
                  <div className="animate-pulse h-10 bg-gray-100 rounded-lg" />
                ) : availablePlacements.length === 0 ? (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
                    No placements available. All accepted offers already have invoices or there are no accepted offers.
                  </div>
                ) : (
                  <>
                    <select
                      value={selectedPlacementId}
                      onChange={(e) => handlePlacementChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                      required
                    >
                      <option value="">Select a placement...</option>
                      {availablePlacements.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.candidate_name} - {p.job_title}
                          {p.is_csuite && ' (C-Suite)'}
                          {p.total_cost_to_company && ` - ${formatCurrency(p.total_cost_to_company)} total`}
                        </option>
                      ))}
                    </select>
                    {selectedPlacement && pricing && (
                      <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex justify-between text-sm">
                          <span className="text-blue-700">Calculated Fee:</span>
                          <span className="font-semibold text-blue-900">
                            {formatCurrency(calculatePlacementFee(selectedPlacement))}
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {invoiceType === 'retainer' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Billing Period Start</label>
                  <input
                    type="date"
                    value={billingPeriodStart}
                    onChange={(e) => setBillingPeriodStart(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Billing Period End</label>
                  <input
                    type="date"
                    value={billingPeriodEnd}
                    onChange={(e) => setBillingPeriodEnd(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Date</label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Invoice description..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Line Items</label>
                <button
                  type="button"
                  onClick={addLineItem}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  + Add Item
                </button>
              </div>
              <div className="space-y-3">
                {lineItems.map((item, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                        placeholder="Description"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                      />
                    </div>
                    <div className="w-20">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(index, 'quantity', e.target.value)}
                        placeholder="Qty"
                        step="1"
                        min="1"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                      />
                    </div>
                    <div className="w-32">
                      <input
                        type="number"
                        value={item.unit_price}
                        onChange={(e) => updateLineItem(index, 'unit_price', e.target.value)}
                        placeholder="Amount"
                        step="0.01"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLineItem(index)}
                      disabled={lineItems.length === 1}
                      className="p-2 text-gray-400 hover:text-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium text-gray-900">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span className="text-gray-600">VAT (15%)</span>
                <span className="font-medium text-gray-900">{formatCurrency(subtotal * 0.15)}</span>
              </div>
              <div className="flex justify-between text-base mt-3 pt-3 border-t border-gray-200">
                <span className="font-semibold text-gray-900">Total</span>
                <span className="font-bold text-gray-900">{formatCurrency(subtotal * 1.15)}</span>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreating}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-50"
              >
                {isCreating ? 'Creating...' : 'Create Invoice (Draft)'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// =====================================================
// MAIN SUBSCRIPTION DRAWER COMPONENT
// =====================================================

export interface SubscriptionDrawerProps {
  company: AdminCompanyListItem
  onClose: () => void
  onRefresh: () => void
}

export default function SubscriptionDrawer({
  company,
  onClose,
  onRefresh,
}: SubscriptionDrawerProps) {
  const { recruitmentSubscription: subscription, hasSubscription, isLoading: subLoading, refetch: refetchSub } = useCompanySubscription(company.id)
  const { pricing, isLoading: pricingLoading, refetch: refetchPricing } = useEffectivePricing(company.id)
  const { features, isLoading: featuresLoading, refetch: refetchFeatures } = useCompanyFeatureOverrides(company.id)
  const { invoices, isLoading: invoicesLoading, refetch: refetchInvoices } = useCompanyInvoices(company.id)
  const { activities, isLoading: activitiesLoading } = useCompanyActivity(company.id)
  const { company: fetchedCompany, updateCompany, isUpdating: isUpdatingCompany, refetch: refetchCompany } = useCompanyById(company.id)
  const { requests: replacementRequests, isLoading: replacementsLoading, refetch: refetchReplacements } = useReplacementRequests({ companyId: company.id })
  const { isApproving, isRejecting, approveRequest, rejectRequest } = useReplacementActions()

  const currentCompany = fetchedCompany || company

  const { resumeSubscription, isResuming } = useResumeSubscription()
  const { updatePricing, isUpdating: isPricingUpdating } = useUpdateCompanyPricing()
  const { updateFeatureOverride } = useUpdateFeatureOverride()
  const { sendInvoice, isSending } = useSendInvoice()
  const { cancelInvoice, isCancelling } = useCancelInvoice()

  const [activeSection, setActiveSection] = useState<'overview' | 'pricing' | 'features' | 'invoices' | 'activity' | 'replacements'>('overview')
  const [showCreateSubModal, setShowCreateSubModal] = useState(false)
  const [showAdjustModal, setShowAdjustModal] = useState(false)
  const [showPauseModal, setShowPauseModal] = useState(false)
  const [showTerminateModal, setShowTerminateModal] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceListItem | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false)
  const [viewingInvoiceId, setViewingInvoiceId] = useState<string | null>(null)
  const [showChangeServiceTypeModal, setShowChangeServiceTypeModal] = useState(false)

  const [editingPricing, setEditingPricing] = useState(false)
  const [retainerValue, setRetainerValue] = useState('')
  const [placementValue, setPlacementValue] = useState('')
  const [csuiteValue, setCsuiteValue] = useState('')
  const [replacementPeriodValue, setReplacementPeriodValue] = useState('')

  const handleRefresh = () => {
    refetchSub()
    refetchPricing()
    refetchFeatures()
    refetchInvoices()
    refetchCompany()
    refetchReplacements()
    onRefresh()
  }

  const handleResume = async () => {
    if (!subscription) return
    try {
      await resumeSubscription(subscription.id)
      handleRefresh()
    } catch (err) {
      console.error('Failed to resume:', err)
    }
  }

  const handleSetServiceType = async (type: 'retained' | 'headhunting') => {
    try {
      const serviceTypeEnum = type === 'retained' ? ServiceType.RETAINED : ServiceType.HEADHUNTING
      await updateCompany({ service_type: serviceTypeEnum })
      handleRefresh()
    } catch (err) {
      console.error('Failed to set service type:', err)
    }
  }

  const handleSavePricing = async () => {
    try {
      await updatePricing(company.id, {
        monthly_retainer: retainerValue || null,
        placement_fee: placementValue ? (parseFloat(placementValue) / 100).toFixed(4) : null,
        csuite_placement_fee: csuiteValue ? (parseFloat(csuiteValue) / 100).toFixed(4) : null,
        replacement_period_days: replacementPeriodValue ? parseInt(replacementPeriodValue) : null,
      })
      setEditingPricing(false)
      refetchPricing()
    } catch (err) {
      console.error('Failed to update pricing:', err)
    }
  }

  const handleToggleFeature = async (feature: FeatureWithOverride) => {
    try {
      let newValue: boolean | null
      if (feature.is_overridden) {
        newValue = null
      } else {
        newValue = !feature.default_enabled
      }
      await updateFeatureOverride(company.id, feature.id, newValue)
      refetchFeatures()
    } catch (err) {
      console.error('Failed to update feature:', err)
    }
  }

  const handleSendInvoice = async (invoice: InvoiceListItem) => {
    try {
      await sendInvoice(invoice.id)
      refetchInvoices()
    } catch (err) {
      console.error('Failed to send invoice:', err)
    }
  }

  const handleCancelInvoice = async (invoice: InvoiceListItem) => {
    if (!confirm('Are you sure you want to cancel this invoice?')) return
    try {
      await cancelInvoice(invoice.id)
      refetchInvoices()
    } catch (err) {
      console.error('Failed to cancel invoice:', err)
    }
  }

  const sections = [
    { id: 'overview', label: 'Overview', icon: CreditCard },
    { id: 'pricing', label: 'Pricing', icon: DollarSign },
    { id: 'features', label: 'Features', icon: Settings },
    { id: 'invoices', label: 'Invoices', icon: FileText },
    { id: 'replacements', label: 'Replacements', icon: RefreshCw },
    { id: 'activity', label: 'Activity', icon: Activity },
  ] as const

  return (
    <>
      <div className="fixed inset-0 z-[200] bg-black/30" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-[201] w-full max-w-2xl bg-white shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-gray-500" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{currentCompany.name}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <ServiceTypeBadge type={currentCompany.service_type} />
                  {hasSubscription && subscription && (
                    <SubscriptionStatusBadge status={subscription.status} />
                  )}
                </div>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Section Tabs - Dark pill style */}
          <div className="flex gap-1 mt-4 overflow-x-auto">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center gap-2 px-4 py-2 text-[13px] font-medium rounded-md transition-colors whitespace-nowrap ${
                  activeSection === section.id
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <section.icon className="w-4 h-4" />
                {section.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Overview Section */}
          {activeSection === 'overview' && (
            <div className="space-y-4">
              {subLoading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-32 bg-gray-100 rounded-lg" />
                  <div className="h-24 bg-gray-100 rounded-lg" />
                </div>
              ) : !currentCompany.service_type ? (
                <NoServiceType
                  companyName={currentCompany.name}
                  onSelectServiceType={handleSetServiceType}
                  isAdmin={true}
                  isUpdating={isUpdatingCompany}
                  compact
                />
              ) : currentCompany.service_type === 'headhunting' ? (
                <>
                  <ServiceTypeHeader
                    serviceType="headhunting"
                    onChangeServiceType={() => setShowChangeServiceTypeModal(true)}
                    subscriptionStatus={subscription?.status}
                    isAdmin={true}
                    compact
                  />
                  <ContractSection
                    subscription={subscription}
                    serviceType="headhunting"
                    onPause={() => setShowPauseModal(true)}
                    onResume={handleResume}
                    onAdjust={() => setShowAdjustModal(true)}
                    onTerminate={() => setShowTerminateModal(true)}
                    onCreateSubscription={() => setShowCreateSubModal(true)}
                    isPausing={false}
                    isResuming={isResuming}
                    isAdmin={true}
                    compact
                  />
                  <QuickStats
                    serviceType="headhunting"
                    pricing={pricing}
                    invoices={invoices}
                    compact
                  />
                </>
              ) : (
                <>
                  <ServiceTypeHeader
                    serviceType="retained"
                    onChangeServiceType={() => setShowChangeServiceTypeModal(true)}
                    subscriptionStatus={subscription?.status}
                    isAdmin={true}
                    compact
                  />
                  <RetainedContractSection
                    subscription={subscription}
                    onPause={() => setShowPauseModal(true)}
                    onResume={handleResume}
                    onAdjust={() => setShowAdjustModal(true)}
                    onTerminate={() => setShowTerminateModal(true)}
                    onCreateSubscription={() => setShowCreateSubModal(true)}
                    onGenerateInvoice={() => setShowCreateInvoiceModal(true)}
                    isPausing={false}
                    isResuming={isResuming}
                    isAdmin={true}
                    compact
                  />
                  <QuickStats
                    serviceType="retained"
                    pricing={pricing}
                    invoices={invoices}
                    compact
                  />
                </>
              )}
            </div>
          )}

          {/* Pricing Section */}
          {activeSection === 'pricing' && (
            <div className="space-y-4">
              {pricingLoading ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-16 bg-gray-100 rounded-lg" />
                  <div className="h-16 bg-gray-100 rounded-lg" />
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900">Custom Pricing</h3>
                    {!editingPricing ? (
                      <button
                        onClick={() => {
                          setRetainerValue(pricing?.is_custom_retainer ? pricing.monthly_retainer : '')
                          setPlacementValue(pricing?.is_custom_placement ? (parseFloat(pricing.placement_fee) * 100).toString() : '')
                          setCsuiteValue(pricing?.is_custom_csuite ? (parseFloat(pricing.csuite_placement_fee) * 100).toString() : '')
                          setReplacementPeriodValue(pricing?.is_custom_replacement_period ? pricing.replacement_period_days.toString() : '')
                          setEditingPricing(true)
                        }}
                        className="text-sm text-gray-600 hover:text-gray-900"
                      >
                        Edit
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingPricing(false)}
                          className="text-sm text-gray-500 hover:text-gray-700"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSavePricing}
                          disabled={isPricingUpdating}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                        >
                          {isPricingUpdating ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    )}
                  </div>

                  {editingPricing ? (
                    <div className="space-y-4 bg-gray-50 rounded-lg p-4">
                      {currentCompany.service_type === 'retained' && (
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            Monthly Retainer (ZAR)
                          </label>
                          <input
                            type="number"
                            value={retainerValue}
                            onChange={(e) => setRetainerValue(e.target.value)}
                            placeholder={pricing ? `Default: ${formatCurrency(20000)}` : '20,000'}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                          />
                        </div>
                      )}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Placement Fee (%)
                        </label>
                        <input
                          type="number"
                          value={placementValue}
                          onChange={(e) => setPlacementValue(e.target.value)}
                          placeholder="Default based on service type"
                          step="0.1"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          C-Suite Placement Fee (%)
                        </label>
                        <input
                          type="number"
                          value={csuiteValue}
                          onChange={(e) => setCsuiteValue(e.target.value)}
                          placeholder="Default based on service type"
                          step="0.1"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Free Replacement Period (days)
                        </label>
                        <input
                          type="number"
                          value={replacementPeriodValue}
                          onChange={(e) => setReplacementPeriodValue(e.target.value)}
                          placeholder={pricing ? `Default: ${pricing.replacement_period_days} days` : 'Default based on service type'}
                          step="1"
                          min="0"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {currentCompany.service_type === 'retained' && (
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="text-sm text-gray-600">Monthly Retainer</span>
                          <span className="text-sm font-medium text-gray-900">
                            {pricing ? formatCurrency(pricing.monthly_retainer) : '-'}
                            {pricing?.is_custom_retainer && (
                              <span className="ml-1 text-xs text-blue-600">(custom)</span>
                            )}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-600">Placement Fee</span>
                        <span className="text-sm font-medium text-gray-900">
                          {pricing ? `${(parseFloat(pricing.placement_fee) * 100).toFixed(1)}%` : '-'}
                          {pricing?.is_custom_placement && (
                            <span className="ml-1 text-xs text-blue-600">(custom)</span>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-600">C-Suite Placement Fee</span>
                        <span className="text-sm font-medium text-gray-900">
                          {pricing ? `${(parseFloat(pricing.csuite_placement_fee) * 100).toFixed(1)}%` : '-'}
                          {pricing?.is_custom_csuite && (
                            <span className="ml-1 text-xs text-blue-600">(custom)</span>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-600">Free Replacement Period</span>
                        <span className="text-sm font-medium text-gray-900">
                          {pricing ? `${pricing.replacement_period_days} days` : '-'}
                          {pricing?.is_custom_replacement_period && (
                            <span className="ml-1 text-xs text-blue-600">(custom)</span>
                          )}
                        </span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Features Section */}
          {activeSection === 'features' && (
            <div className="space-y-4">
              {featuresLoading ? (
                <div className="animate-pulse space-y-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-14 bg-gray-100 rounded-lg" />
                  ))}
                </div>
              ) : features.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">No features available</p>
              ) : (
                <>
                  <p className="text-xs text-gray-500">
                    Toggle features to override the default settings for this company's service type.
                  </p>
                  {Object.entries(
                    features.reduce((acc, f) => {
                      const cat = f.category || 'Other'
                      if (!acc[cat]) acc[cat] = []
                      acc[cat].push(f)
                      return acc
                    }, {} as Record<string, FeatureWithOverride[]>)
                  ).map(([category, catFeatures]) => (
                    <div key={category}>
                      <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">{category}</h4>
                      <div className="space-y-2">
                        {catFeatures.map((feature) => (
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
                                  <span>Default: {feature.default_enabled ? 'On' : 'Off'}</span>
                                )}
                              </p>
                            </div>
                            <button
                              onClick={() => handleToggleFeature(feature)}
                              className="flex items-center"
                            >
                              {feature.effective_enabled ? (
                                <ToggleRight className="w-8 h-8 text-green-600" />
                              ) : (
                                <ToggleLeft className="w-8 h-8 text-gray-400" />
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* Invoices Section */}
          {activeSection === 'invoices' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Invoices</h3>
                <button
                  onClick={() => setShowCreateInvoiceModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800"
                >
                  <Plus className="w-4 h-4" />
                  Create Invoice
                </button>
              </div>

              {invoicesLoading ? (
                <div className="animate-pulse space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-gray-100 rounded-lg" />
                  ))}
                </div>
              ) : invoices.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">No invoices yet</p>
              ) : (
                <div className="space-y-2">
                  {invoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      onClick={() => setViewingInvoiceId(invoice.id)}
                      className="bg-gray-50 border border-gray-200 rounded-lg p-4 cursor-pointer hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{invoice.invoice_number}</p>
                          <p className="text-xs text-gray-500">{formatDate(invoice.invoice_date)}</p>
                        </div>
                        <InvoiceStatusBadge status={invoice.status} />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-lg font-semibold text-gray-900">{formatCurrency(invoice.total_amount)}</p>
                          {parseFloat(invoice.balance_due) > 0 && parseFloat(invoice.balance_due) < parseFloat(invoice.total_amount) && (
                            <p className="text-xs text-red-600">Balance: {formatCurrency(invoice.balance_due)}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          {invoice.status === 'draft' && (
                            <button
                              onClick={() => handleSendInvoice(invoice)}
                              disabled={isSending}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                              title="Send Invoice"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          )}
                          {(invoice.status === 'sent' || invoice.status === 'overdue' || invoice.status === 'partially_paid') && (
                            <button
                              onClick={() => {
                                setSelectedInvoice(invoice)
                                setShowPaymentModal(true)
                              }}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                              title="Record Payment"
                            >
                              <DollarSign className="w-4 h-4" />
                            </button>
                          )}
                          {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                            <button
                              onClick={() => handleCancelInvoice(invoice)}
                              disabled={isCancelling}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                              title="Cancel Invoice"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Replacements Section */}
          {activeSection === 'replacements' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Replacement Requests</h3>
                {replacementRequests.length > 0 && (
                  <span className="text-xs text-gray-500">
                    {replacementRequests.filter(r => r.status === 'pending').length} pending
                  </span>
                )}
              </div>
              {replacementsLoading ? (
                <div className="animate-pulse space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-gray-100 rounded-lg" />
                  ))}
                </div>
              ) : replacementRequests.length === 0 ? (
                <div className="text-center py-8">
                  <RefreshCw className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No replacement requests</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Replacement requests from this company will appear here
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {replacementRequests.map((request) => (
                    <ReplacementReviewCard
                      key={request.id}
                      request={request}
                      canReview
                      onApprove={async (type, discount) => {
                        await approveRequest(request.id, { approval_type: type, discount_percentage: discount })
                        refetchReplacements()
                      }}
                      onReject={async (notes) => {
                        await rejectRequest(request.id, { review_notes: notes })
                        refetchReplacements()
                      }}
                      isApproving={isApproving}
                      isRejecting={isRejecting}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Activity Section */}
          {activeSection === 'activity' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900">Activity Log</h3>
              {activitiesLoading ? (
                <div className="animate-pulse space-y-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-12 bg-gray-100 rounded-lg" />
                  ))}
                </div>
              ) : activities.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">No activity yet</p>
              ) : (
                <div className="space-y-3">
                  {activities.map((activity: SubscriptionActivity) => (
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
          )}
        </div>
      </div>

      {/* Modals */}
      {showCreateSubModal && (
        <CreateSubscriptionModal
          company={company}
          onClose={() => setShowCreateSubModal(false)}
          onCreated={handleRefresh}
        />
      )}
      {showPauseModal && subscription && (
        <PauseSubscriptionModal
          subscription={subscription}
          companyName={currentCompany.name}
          onClose={() => setShowPauseModal(false)}
          onPaused={handleRefresh}
        />
      )}
      {showAdjustModal && subscription && (
        <AdjustContractModal
          subscription={subscription}
          companyName={currentCompany.name}
          onClose={() => setShowAdjustModal(false)}
          onAdjusted={handleRefresh}
        />
      )}
      {showTerminateModal && subscription && currentCompany?.service_type && (
        <TerminateSubscriptionModal
          subscription={subscription}
          companyName={currentCompany.name}
          serviceType={currentCompany.service_type as 'retained' | 'headhunting'}
          onClose={() => setShowTerminateModal(false)}
          onTerminated={handleRefresh}
        />
      )}
      {showPaymentModal && selectedInvoice && (
        <RecordPaymentModal
          invoice={selectedInvoice}
          onClose={() => {
            setShowPaymentModal(false)
            setSelectedInvoice(null)
          }}
          onRecorded={() => {
            refetchInvoices()
            setShowPaymentModal(false)
            setSelectedInvoice(null)
          }}
        />
      )}
      {showCreateInvoiceModal && (
        <CreateInvoiceModal
          company={company}
          pricing={pricing}
          onClose={() => setShowCreateInvoiceModal(false)}
          onCreated={() => {
            refetchInvoices()
            setShowCreateInvoiceModal(false)
          }}
        />
      )}
      {viewingInvoiceId && (
        <InvoiceDetailDrawer
          invoiceId={viewingInvoiceId}
          onClose={() => setViewingInvoiceId(null)}
          onUpdated={() => {
            refetchInvoices()
          }}
        />
      )}
      {showChangeServiceTypeModal && currentCompany?.service_type && (
        <ChangeServiceTypeModal
          companyId={currentCompany.id}
          companyName={currentCompany.name}
          currentType={currentCompany.service_type as 'retained' | 'headhunting'}
          subscriptionId={subscription?.id}
          monthsRemaining={subscription?.months_remaining}
          isWithinLockoutPeriod={subscription?.is_within_lockout_period}
          isAdmin={true}
          onClose={() => setShowChangeServiceTypeModal(false)}
          onChanged={() => {
            handleRefresh()
            setShowChangeServiceTypeModal(false)
          }}
        />
      )}
    </>
  )
}
