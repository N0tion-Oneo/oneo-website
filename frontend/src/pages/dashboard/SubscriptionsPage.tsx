/**
 * Subscriptions Management Page
 *
 * Standalone admin portal for managing all company subscriptions,
 * invoices, payments, and billing - all actions happen within this page.
 */

import { useState, useEffect } from 'react'
import {
  CreditCard,
  FileText,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Calendar,
  ChevronRight,
  Search,
  CheckCircle,
  PauseCircle,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Download,
  Eye,
  Building2,
  Plus,
  Receipt,
  Play,
  Pause,
  X,
  Settings,
  Activity,
  ToggleLeft,
  ToggleRight,
  Send,
  Trash2,
  Loader2,
} from 'lucide-react'
import {
  useSubscriptions,
  useInvoices,
  useSubscriptionAlerts,
  useSubscriptionSummary,
  useAllCompanies,
  useCompanySubscription,
  useCreateSubscription,
  useEffectivePricing,
  useCompanyFeatureOverrides,
  useCompanyInvoices,
  useCompanyActivity,
  useGenerateRetainerInvoice,
  usePauseSubscription,
  useResumeSubscription,
  useTerminateSubscription,
  useAdjustContract,
  useUpdateCompanyPricing,
  useUpdateFeatureOverride,
  useSendInvoice,
  useCancelInvoice,
  useRecordPayment,
  useInvoice,
  useInvoicePayments,
  useCreateInvoice,
  useCompanyPlacements,
  useCalculateTerminationFee,
} from '@/hooks'
import type {
  SubscriptionListItem,
  InvoiceListItem,
  Invoice,
  InvoiceLineItem,
  Payment,
  SubscriptionAlert,
  SubscriptionSummary,
  SubscriptionStatus,
  InvoiceStatus,
  InvoiceType,
  Subscription,
  FeatureWithOverride,
  SubscriptionActivity,
  PlacementForInvoice,
  EffectivePricing,
} from '@/hooks'
import type { AdminCompanyListItem } from '@/types'
import { ChangeServiceTypeModal } from '@/components/company/ChangeServiceTypeModal'

type TabType = 'overview' | 'companies' | 'invoices' | 'alerts'

// Format currency
function formatCurrency(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

// Format date
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// Subscription status badge
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

// Service type badge
function ServiceTypeBadge({ type }: { type: string | null }) {
  if (!type) {
    return <span className="text-xs text-gray-400">Not set</span>
  }
  const isRetained = type === 'retained'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
      isRetained ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
    }`}>
      {isRetained ? 'Retained' : 'Headhunting'}
    </span>
  )
}

// Invoice status badge
function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const configs: Record<InvoiceStatus, { bg: string; text: string }> = {
    draft: { bg: 'bg-gray-100', text: 'text-gray-600' },
    sent: { bg: 'bg-blue-100', text: 'text-blue-700' },
    paid: { bg: 'bg-green-100', text: 'text-green-700' },
    overdue: { bg: 'bg-red-100', text: 'text-red-700' },
    cancelled: { bg: 'bg-gray-100', text: 'text-gray-500' },
    partially_paid: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  }
  const config = configs[status]
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

// Alert severity badge
function AlertSeverityBadge({ severity }: { severity: 'info' | 'warning' | 'critical' }) {
  const configs = {
    info: { bg: 'bg-blue-100', text: 'text-blue-700', icon: <AlertCircle className="w-4 h-4" /> },
    warning: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: <AlertTriangle className="w-4 h-4" /> },
    critical: { bg: 'bg-red-100', text: 'text-red-700', icon: <AlertTriangle className="w-4 h-4" /> },
  }
  const config = configs[severity]
  return (
    <div className={`p-2 rounded-full ${config.bg} ${config.text}`}>
      {config.icon}
    </div>
  )
}

// Summary Card Component
function SummaryCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'gray',
}: {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ElementType
  color?: 'gray' | 'green' | 'yellow' | 'red' | 'blue'
}) {
  const colorClasses = {
    gray: 'bg-gray-100 text-gray-600',
    green: 'bg-green-100 text-green-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    red: 'bg-red-100 text-red-600',
    blue: 'bg-blue-100 text-blue-600',
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  )
}

// =====================================================
// CREATE SUBSCRIPTION MODAL
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!startDate) return
    const endDate = new Date(startDate)
    endDate.setFullYear(endDate.getFullYear() + 1)
    const endDateStr = endDate.toISOString().split('T')[0] ?? ''

    try {
      await createSubscription({
        company: company.id,
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
          <h3 className="text-lg font-semibold text-gray-900">Create Subscription</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Creating subscription for <strong>{company.name}</strong>
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

// =====================================================
// PAUSE SUBSCRIPTION MODAL
// =====================================================
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
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

// =====================================================
// ADJUST CONTRACT MODAL
// =====================================================
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
  const isReducing = selectedEndDate < currentEndDate
  const isValid = selectedEndDate >= today && newEndDate !== subscription.contract_end_date

  // Calculate difference in days
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

  // Quick adjustment buttons
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
    // Don't allow dates in the past
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

        {/* Current Contract Info */}
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
          {/* Quick Adjustments */}
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

          {/* Date Picker */}
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

          {/* Change Preview */}
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

// =====================================================
// TERMINATE SUBSCRIPTION MODAL
// =====================================================
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

  // Calculate termination fee when modal opens (only for retained)
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
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

          {/* Termination Fee Breakdown - Only show for retained + "without_cause" */}
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
                  <div className="flex justify-between text-sm">
                    <span className="text-amber-700">Remaining Term Value</span>
                    <span className="text-amber-900">{formatCurrency(feeCalculation.remaining_term_fee)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-amber-700">3-Month Fee (minimum)</span>
                    <span className="text-amber-900">{formatCurrency(feeCalculation.three_month_fee)}</span>
                  </div>
                  <div className="border-t border-amber-300 pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-semibold text-amber-800">Termination Fee (lesser of above)</span>
                      <span className="text-lg font-bold text-red-600">{formatCurrency(feeCalculation.early_termination_fee)}</span>
                    </div>
                  </div>
                  {feeCalculation.is_within_lockout_period && (
                    <p className="text-xs text-amber-700 mt-2">
                      ⚠️ This subscription is within the 6-month lockout period. Early termination without cause is not permitted during this time.
                    </p>
                  )}
                  {!feeCalculation.can_terminate_without_cause && (
                    <p className="text-xs text-red-600 mt-2">
                      ⚠️ This subscription cannot be terminated without cause at this time.
                    </p>
                  )}
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
              disabled={isTerminating || (isRetained && terminationType === 'without_cause' && feeCalculation && feeCalculation.can_terminate_without_cause === false)}
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

// =====================================================
// RECORD PAYMENT MODAL
// =====================================================
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
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

// =====================================================
// CREATE INVOICE MODAL
// =====================================================
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

  // Form state
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

  // Get available invoice types based on service type
  const availableTypes: { value: InvoiceType; label: string }[] = [
    ...(isRetained ? [{ value: 'retainer' as InvoiceType, label: 'Monthly Retainer' }] : []),
    { value: 'placement' as InvoiceType, label: 'Placement Fee' },
    { value: 'adjustment' as InvoiceType, label: 'Adjustment/Credit' },
    { value: 'other' as InvoiceType, label: 'Other' },
  ]

  // Get selected placement details
  const selectedPlacement = placements.find(p => p.id === selectedPlacementId)

  // Calculate placement fee based on total cost to company
  const calculatePlacementFee = (placement: PlacementForInvoice): number => {
    if (!placement.total_cost_to_company || !pricing) return 0
    const feeRate = placement.is_csuite
      ? parseFloat(pricing.csuite_placement_fee)
      : parseFloat(pricing.placement_fee)
    return placement.total_cost_to_company * feeRate
  }

  // Auto-populate line items when placement is selected
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

  // Auto-populate for retainer
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

  // Effect to handle type change
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

  // Add line item
  const addLineItem = () => {
    setLineItems([...lineItems, { description: '', quantity: '1', unit_price: '' }])
  }

  // Remove line item
  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index))
    }
  }

  // Update line item
  const updateLineItem = (index: number, field: keyof LineItemInput, value: string) => {
    const updated = [...lineItems]
    updated[index] = { ...updated[index], [field]: value }
    setLineItems(updated)
  }

  // Calculate subtotal
  const subtotal = lineItems.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0
    const price = parseFloat(item.unit_price) || 0
    return sum + (qty * price)
  }, 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate
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

  // Filter out placements that already have invoices
  const availablePlacements = placements.filter(p => !p.has_placement_invoice)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
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
            {/* Invoice Type */}
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

            {/* Placement Selection (for placement invoices) */}
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
                        <p className="text-xs text-blue-600 mt-1">
                          {selectedPlacement.is_csuite ? 'C-Suite' : 'Standard'} rate:{' '}
                          {(parseFloat(selectedPlacement.is_csuite ? pricing.csuite_placement_fee : pricing.placement_fee) * 100).toFixed(1)}%
                          of {formatCurrency(selectedPlacement.total_cost_to_company || 0)} total cost to company
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Billing Period (for retainer invoices) */}
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

            {/* Invoice Dates */}
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

            {/* Description */}
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

            {/* Line Items */}
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
              {invoiceType === 'adjustment' && (
                <p className="text-xs text-gray-500 mt-2">
                  Tip: Use negative amounts for credits
                </p>
              )}
            </div>

            {/* Totals */}
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

            {/* Actions */}
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
// INVOICE DETAIL DRAWER
// =====================================================
function InvoiceDetailDrawer({
  invoiceId,
  onClose,
  onUpdated,
}: {
  invoiceId: string
  onClose: () => void
  onUpdated: () => void
}) {
  const { invoice, isLoading, refetch } = useInvoice(invoiceId)
  const { payments, isLoading: paymentsLoading, refetch: refetchPayments } = useInvoicePayments(invoiceId)
  const { sendInvoice, isSending } = useSendInvoice()
  const { cancelInvoice, isCancelling } = useCancelInvoice()
  const [showPaymentModal, setShowPaymentModal] = useState(false)

  const handleSend = async () => {
    try {
      await sendInvoice(invoiceId)
      refetch()
      onUpdated()
    } catch (err) {
      console.error('Failed to send invoice:', err)
    }
  }

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this invoice?')) return
    try {
      await cancelInvoice(invoiceId)
      refetch()
      onUpdated()
    } catch (err) {
      console.error('Failed to cancel invoice:', err)
    }
  }

  const handlePaymentRecorded = () => {
    refetch()
    refetchPayments()
    onUpdated()
    setShowPaymentModal(false)
  }

  if (isLoading || !invoice) {
    return (
      <>
        <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
        <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-xl bg-white shadow-xl flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full" />
        </div>
      </>
    )
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-xl bg-white shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{invoice.invoice_number}</h2>
              <div className="flex items-center gap-2 mt-1">
                <InvoiceStatusBadge status={invoice.status} />
                <span className="text-sm text-gray-500">{invoice.company_name}</span>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Invoice Summary */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Invoice Date</p>
                <p className="text-sm font-medium text-gray-900">{formatDate(invoice.invoice_date)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Due Date</p>
                <p className={`text-sm font-medium ${
                  new Date(invoice.due_date) < new Date() && invoice.status !== 'paid' ? 'text-red-600' : 'text-gray-900'
                }`}>
                  {formatDate(invoice.due_date)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Type</p>
                <p className="text-sm font-medium text-gray-900 capitalize">{invoice.invoice_type_display}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Billing Period</p>
                <p className="text-sm font-medium text-gray-900">
                  {invoice.billing_period_start && invoice.billing_period_end
                    ? `${formatDate(invoice.billing_period_start)} - ${formatDate(invoice.billing_period_end)}`
                    : '-'}
                </p>
              </div>
            </div>
            {invoice.description && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500 mb-1">Description</p>
                <p className="text-sm text-gray-700">{invoice.description}</p>
              </div>
            )}
          </div>

          {/* Placement Info (for placement invoices) */}
          {invoice.placement_info && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-purple-900 mb-3">Placement Details</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs text-purple-600">Candidate</p>
                  <p className="text-sm font-medium text-purple-900">{invoice.placement_info.candidate_name}</p>
                </div>
                <div>
                  <p className="text-xs text-purple-600">Position</p>
                  <p className="text-sm font-medium text-purple-900">
                    {invoice.placement_info.job_title}
                    {invoice.placement_info.is_csuite && (
                      <span className="ml-2 px-2 py-0.5 text-xs bg-purple-200 text-purple-800 rounded">C-Suite</span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-purple-600">Offer Accepted</p>
                  <p className="text-sm font-medium text-purple-900">
                    {formatDate(invoice.placement_info.offer_accepted_at)}
                  </p>
                </div>
                {invoice.placement_info.start_date && (
                  <div>
                    <p className="text-xs text-purple-600">Start Date</p>
                    <p className="text-sm font-medium text-purple-900">
                      {formatDate(invoice.placement_info.start_date)}
                    </p>
                  </div>
                )}
              </div>

              {/* Offer Breakdown */}
              <div className="border-t border-purple-200 pt-3 mt-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-purple-700 uppercase">Offer Breakdown</h4>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                    invoice.placement_info.is_csuite
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {invoice.placement_info.is_csuite ? 'C-Suite Placement' : 'Standard Placement'}
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-purple-700">Annual Salary</span>
                    <span className="font-medium text-purple-900">
                      {invoice.placement_info.annual_salary
                        ? `${invoice.placement_info.offer_currency} ${formatCurrency(invoice.placement_info.annual_salary)}`
                        : '—'}
                    </span>
                  </div>

                  {/* Benefits */}
                  {invoice.placement_info.benefits && invoice.placement_info.benefits.length > 0 && (
                    <div>
                      <div className="flex justify-between">
                        <span className="text-purple-700">Benefits</span>
                        <span className="font-medium text-purple-900">
                          {invoice.placement_info.offer_currency} {formatCurrency(invoice.placement_info.total_benefits_cost || 0)}
                        </span>
                      </div>
                      <div className="ml-4 mt-1 space-y-0.5">
                        {invoice.placement_info.benefits.map((benefit: { name: string; annual_cost: number }, idx: number) => (
                          <div key={idx} className="flex justify-between text-xs text-purple-600">
                            <span>{benefit.name}</span>
                            <span>{invoice.placement_info.offer_currency} {formatCurrency(benefit.annual_cost)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Equity */}
                  {invoice.placement_info.equity && (
                    <div>
                      <div className="flex justify-between">
                        <span className="text-purple-700">Year 1 Equity Value</span>
                        <span className="font-medium text-purple-900">
                          {invoice.placement_info.offer_currency} {formatCurrency(invoice.placement_info.year_1_equity_value || 0)}
                        </span>
                      </div>
                      <div className="ml-4 mt-1 text-xs text-purple-600">
                        {invoice.placement_info.equity.shares?.toLocaleString()} shares @ {invoice.placement_info.offer_currency} {invoice.placement_info.equity.share_value} over {invoice.placement_info.equity.vesting_years} years
                      </div>
                    </div>
                  )}

                  {/* Total */}
                  <div className="flex justify-between pt-2 border-t border-purple-200">
                    <span className="font-semibold text-purple-800">Total Cost to Company</span>
                    <span className="font-bold text-purple-900">
                      {invoice.placement_info.offer_currency} {formatCurrency(invoice.placement_info.total_cost_to_company || 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {invoice.placement_info.notes && (
                <div className="border-t border-purple-200 pt-3 mt-3">
                  <p className="text-xs text-purple-600 mb-1">Notes</p>
                  <p className="text-sm text-purple-800">{invoice.placement_info.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Line Items */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Line Items</h3>
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {invoice.line_items.map((item: InvoiceLineItem) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 text-sm text-gray-900">{item.description}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 text-right">{item.quantity}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 text-right">{formatCurrency(item.unit_price)}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">{formatCurrency(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={3} className="px-4 py-2 text-sm text-gray-500 text-right">Subtotal</td>
                    <td className="px-4 py-2 text-sm font-medium text-gray-900 text-right">{formatCurrency(invoice.subtotal)}</td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="px-4 py-2 text-sm text-gray-500 text-right">VAT ({(parseFloat(invoice.vat_rate) * 100).toFixed(0)}%)</td>
                    <td className="px-4 py-2 text-sm font-medium text-gray-900 text-right">{formatCurrency(invoice.vat_amount)}</td>
                  </tr>
                  <tr className="border-t-2 border-gray-300">
                    <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">Total</td>
                    <td className="px-4 py-3 text-lg font-bold text-gray-900 text-right">{formatCurrency(invoice.total_amount)}</td>
                  </tr>
                  {parseFloat(invoice.amount_paid) > 0 && (
                    <>
                      <tr>
                        <td colSpan={3} className="px-4 py-2 text-sm text-green-600 text-right">Amount Paid</td>
                        <td className="px-4 py-2 text-sm font-medium text-green-600 text-right">-{formatCurrency(invoice.amount_paid)}</td>
                      </tr>
                      <tr>
                        <td colSpan={3} className="px-4 py-2 text-sm font-semibold text-gray-900 text-right">Balance Due</td>
                        <td className="px-4 py-2 text-sm font-bold text-red-600 text-right">{formatCurrency(invoice.balance_due)}</td>
                      </tr>
                    </>
                  )}
                </tfoot>
              </table>
            </div>
          </div>

          {/* Payment History */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Payment History</h3>
            {paymentsLoading ? (
              <div className="animate-pulse h-20 bg-gray-100 rounded-lg" />
            ) : payments.length === 0 ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center text-sm text-gray-500">
                No payments recorded yet
              </div>
            ) : (
              <div className="space-y-2">
                {payments.map((payment: Payment) => (
                  <div key={payment.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{formatCurrency(payment.amount)}</p>
                      <p className="text-xs text-gray-500">
                        {formatDate(payment.payment_date)} • {payment.payment_method.replace('_', ' ')}
                        {payment.reference_number && ` • Ref: ${payment.reference_number}`}
                      </p>
                    </div>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Internal Notes */}
          {invoice.internal_notes && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Internal Notes</h3>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">{invoice.internal_notes}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
          <div className="flex gap-3">
            {invoice.status === 'draft' && (
              <button
                onClick={handleSend}
                disabled={isSending}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {isSending ? 'Sending...' : 'Send Invoice'}
              </button>
            )}
            {(invoice.status === 'sent' || invoice.status === 'overdue' || invoice.status === 'partially_paid') && (
              <button
                onClick={() => setShowPaymentModal(true)}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
              >
                <DollarSign className="w-4 h-4" />
                Record Payment
              </button>
            )}
            {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
              <button
                onClick={handleCancel}
                disabled={isCancelling}
                className="px-4 py-2 text-sm font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200 disabled:opacity-50"
              >
                {isCancelling ? 'Cancelling...' : 'Cancel'}
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Record Payment Modal */}
      {showPaymentModal && (
        <RecordPaymentModal
          invoice={invoice}
          onClose={() => setShowPaymentModal(false)}
          onRecorded={handlePaymentRecorded}
        />
      )}
    </>
  )
}

// =====================================================
// COMPANY DETAIL DRAWER
// =====================================================
function CompanyDetailDrawer({
  company,
  onClose,
  onRefresh,
}: {
  company: AdminCompanyListItem
  onClose: () => void
  onRefresh: () => void
}) {
  const { subscription, hasSubscription, isLoading: subLoading, refetch: refetchSub } = useCompanySubscription(company.id)
  const { pricing, isLoading: pricingLoading, refetch: refetchPricing } = useEffectivePricing(company.id)
  const { features, isLoading: featuresLoading, refetch: refetchFeatures } = useCompanyFeatureOverrides(company.id)
  const { invoices, isLoading: invoicesLoading, refetch: refetchInvoices } = useCompanyInvoices(company.id)
  const { activities, isLoading: activitiesLoading } = useCompanyActivity(company.id)

  const { resumeSubscription, isResuming } = useResumeSubscription()
  const { updatePricing, isUpdating: isPricingUpdating } = useUpdateCompanyPricing()
  const { updateFeatureOverride } = useUpdateFeatureOverride()
  const { sendInvoice, isSending } = useSendInvoice()
  const { cancelInvoice, isCancelling } = useCancelInvoice()

  const [activeSection, setActiveSection] = useState<'overview' | 'pricing' | 'features' | 'invoices' | 'activity'>('overview')
  const [showCreateSubModal, setShowCreateSubModal] = useState(false)
  const [showAdjustModal, setShowAdjustModal] = useState(false)
  const [showPauseModal, setShowPauseModal] = useState(false)
  const [showTerminateModal, setShowTerminateModal] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceListItem | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false)
  const [viewingInvoiceId, setViewingInvoiceId] = useState<string | null>(null)
  const [showChangeServiceTypeModal, setShowChangeServiceTypeModal] = useState(false)

  // Pricing edit state
  const [editingPricing, setEditingPricing] = useState(false)
  const [retainerValue, setRetainerValue] = useState('')
  const [placementValue, setPlacementValue] = useState('')
  const [csuiteValue, setCsuiteValue] = useState('')

  const handleRefresh = () => {
    refetchSub()
    refetchPricing()
    refetchFeatures()
    refetchInvoices()
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


  const handleSavePricing = async () => {
    try {
      await updatePricing(company.id, {
        monthly_retainer: retainerValue || null,
        placement_fee: placementValue ? (parseFloat(placementValue) / 100).toFixed(4) : null,
        csuite_placement_fee: csuiteValue ? (parseFloat(csuiteValue) / 100).toFixed(4) : null,
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
    { id: 'activity', label: 'Activity', icon: Activity },
  ] as const

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-2xl bg-white shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-gray-500" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{company.name}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <ServiceTypeBadge type={company.service_type} />
                  {hasSubscription && subscription && (
                    <SubscriptionStatusBadge status={subscription.status} />
                  )}
                </div>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Section Tabs */}
          <div className="flex gap-1 mt-4 -mb-4">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  activeSection === section.id
                    ? 'bg-white text-gray-900 border-t border-x border-gray-200'
                    : 'text-gray-500 hover:text-gray-700'
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
            <div className="space-y-6">
              {subLoading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-32 bg-gray-100 rounded-lg" />
                  <div className="h-24 bg-gray-100 rounded-lg" />
                </div>
              ) : hasSubscription && subscription ? (
                <>
                  {/* Subscription Details */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-gray-900">Contract Details</h3>
                      <div className="flex items-center gap-2">
                        <ServiceTypeBadge type={company.service_type} />
                        {company.service_type && (
                          <button
                            onClick={() => setShowChangeServiceTypeModal(true)}
                            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                          >
                            Change
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500">Start Date</p>
                        <p className="text-sm font-medium text-gray-900">{formatDate(subscription.contract_start_date)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">End Date</p>
                        <p className="text-sm font-medium text-gray-900">{formatDate(subscription.contract_end_date)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Days Until Renewal</p>
                        <p className={`text-sm font-medium ${subscription.days_until_renewal <= 30 ? 'text-yellow-600' : 'text-gray-900'}`}>
                          {subscription.days_until_renewal} days
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Auto-Renew</p>
                        <p className={`text-sm font-medium ${subscription.auto_renew ? 'text-green-600' : 'text-gray-500'}`}>
                          {subscription.auto_renew ? 'Enabled' : 'Disabled'}
                        </p>
                      </div>
                    </div>

                    {subscription.status === 'paused' && subscription.pause_reason && (
                      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-800">
                          <strong>Paused:</strong> {subscription.pause_reason}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    {subscription.status === 'active' && (
                      <>
                        <button
                          onClick={() => setShowPauseModal(true)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-yellow-700 bg-yellow-100 rounded-lg hover:bg-yellow-200"
                        >
                          <Pause className="w-4 h-4" />
                          Pause
                        </button>
                        <button
                          onClick={() => setShowAdjustModal(true)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200"
                        >
                          <Calendar className="w-4 h-4" />
                          Adjust Contract
                        </button>
                        <button
                          onClick={() => setShowCreateInvoiceModal(true)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                        >
                          <Receipt className="w-4 h-4" />
                          Generate Invoice
                        </button>
                      </>
                    )}
                    {subscription.status === 'paused' && (
                      <button
                        onClick={handleResume}
                        disabled={isResuming}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-100 rounded-lg hover:bg-green-200 disabled:opacity-50"
                      >
                        <Play className="w-4 h-4" />
                        {isResuming ? 'Resuming...' : 'Resume'}
                      </button>
                    )}
                    {subscription.status !== 'terminated' && (
                      <button
                        onClick={() => setShowTerminateModal(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200"
                      >
                        <XCircle className="w-4 h-4" />
                        Terminate
                      </button>
                    )}
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    {company.service_type === 'retained' ? (
                      <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <p className="text-xs text-gray-500 mb-1">Monthly Retainer</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {pricing ? formatCurrency(pricing.monthly_retainer) : '-'}
                        </p>
                      </div>
                    ) : (
                      <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <p className="text-xs text-gray-500 mb-1">Placement Fee</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {pricing ? `${(parseFloat(pricing.placement_fee) * 100).toFixed(0)}%` : '-'}
                        </p>
                      </div>
                    )}
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <p className="text-xs text-gray-500 mb-1">Open Invoices</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {invoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled').length}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CreditCard className="w-6 h-6 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Subscription</h3>
                  <p className="text-sm text-gray-500 mb-6">
                    This company doesn't have an active subscription.
                  </p>
                  <button
                    onClick={() => setShowCreateSubModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800"
                  >
                    <Plus className="w-4 h-4" />
                    Create Subscription
                  </button>
                </div>
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
                      {/* Only show Monthly Retainer for retained clients */}
                      {company.service_type === 'retained' && (
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
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Only show Monthly Retainer for retained clients */}
                      {company.service_type === 'retained' && (
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
          companyName={company.name}
          onClose={() => setShowPauseModal(false)}
          onPaused={handleRefresh}
        />
      )}
      {showAdjustModal && subscription && (
        <AdjustContractModal
          subscription={subscription}
          companyName={company.name}
          onClose={() => setShowAdjustModal(false)}
          onAdjusted={handleRefresh}
        />
      )}
      {showTerminateModal && subscription && company?.service_type && (
        <TerminateSubscriptionModal
          subscription={subscription}
          companyName={company.name}
          serviceType={company.service_type as 'retained' | 'headhunting'}
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
      {showChangeServiceTypeModal && company?.service_type && (
        <ChangeServiceTypeModal
          companyId={company.id}
          companyName={company.name}
          currentType={company.service_type as 'retained' | 'headhunting'}
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

// =====================================================
// OVERVIEW TAB
// =====================================================
function OverviewTab({ summary }: { summary: SubscriptionSummary | null }) {
  if (!summary) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-gray-100 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard
          title="Total Subscriptions"
          value={summary.total_subscriptions}
          subtitle={`${summary.active_subscriptions} active`}
          icon={CreditCard}
          color="blue"
        />
        <SummaryCard
          title="Monthly Recurring Revenue"
          value={formatCurrency(summary.total_mrr)}
          subtitle="From active subscriptions"
          icon={DollarSign}
          color="green"
        />
        <SummaryCard
          title="Overdue Invoices"
          value={summary.overdue_invoices_count}
          subtitle={formatCurrency(summary.overdue_invoices_amount)}
          icon={AlertTriangle}
          color={summary.overdue_invoices_count > 0 ? 'red' : 'gray'}
        />
        <SummaryCard
          title="Expiring This Month"
          value={summary.expiring_this_month}
          subtitle="Contracts up for renewal"
          icon={Calendar}
          color={summary.expiring_this_month > 0 ? 'yellow' : 'gray'}
        />
      </div>

      {/* Status Breakdown */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Subscription Status</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-3xl font-bold text-green-600">{summary.active_subscriptions}</p>
            <p className="text-sm text-green-700 mt-1">Active</p>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <p className="text-3xl font-bold text-yellow-600">{summary.paused_subscriptions}</p>
            <p className="text-sm text-yellow-700 mt-1">Paused</p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <p className="text-3xl font-bold text-red-600">{summary.terminated_subscriptions}</p>
            <p className="text-sm text-red-700 mt-1">Terminated</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-3xl font-bold text-gray-600">
              {summary.total_subscriptions - summary.active_subscriptions - summary.paused_subscriptions - summary.terminated_subscriptions}
            </p>
            <p className="text-sm text-gray-600 mt-1">Expired</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// =====================================================
// COMPANIES TAB
// =====================================================
function CompaniesTab({
  onSelectCompany,
}: {
  onSelectCompany: (company: AdminCompanyListItem) => void
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>('')
  const [subscriptionFilter, setSubscriptionFilter] = useState<string>('')

  const { companies, isLoading, refetch } = useAllCompanies({
    search: searchQuery || undefined,
  })
  const { subscriptions } = useSubscriptions()

  // Create a map of company IDs to their subscription status
  const subscriptionMap = new Map<string, SubscriptionListItem>()
  subscriptions.forEach(sub => {
    subscriptionMap.set(sub.company_id, sub)
  })

  // Filter companies
  const filteredCompanies = companies.filter((company) => {
    if (serviceTypeFilter && company.service_type !== serviceTypeFilter) {
      return false
    }
    if (subscriptionFilter) {
      const sub = subscriptionMap.get(company.id)
      if (subscriptionFilter === 'none' && sub) return false
      if (subscriptionFilter === 'active' && (!sub || sub.status !== 'active')) return false
      if (subscriptionFilter === 'paused' && (!sub || sub.status !== 'paused')) return false
      if (subscriptionFilter === 'terminated' && (!sub || sub.status !== 'terminated')) return false
    }
    return true
  })

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search companies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={serviceTypeFilter}
            onChange={(e) => setServiceTypeFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
          >
            <option value="">All Service Types</option>
            <option value="retained">Retained</option>
            <option value="headhunting">Headhunting</option>
          </select>
          <select
            value={subscriptionFilter}
            onChange={(e) => setSubscriptionFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
          >
            <option value="">All Subscriptions</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="terminated">Terminated</option>
            <option value="none">No Subscription</option>
          </select>
          <button
            onClick={() => refetch()}
            className="p-2 text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="flex gap-4 text-sm">
        <span className="text-gray-500">
          Showing <span className="font-medium text-gray-900">{filteredCompanies.length}</span> companies
        </span>
        <span className="text-gray-300">|</span>
        <span className="text-gray-500">
          <span className="font-medium text-green-600">{subscriptions.filter(s => s.status === 'active').length}</span> active subscriptions
        </span>
      </div>

      {/* Companies Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full mx-auto" />
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No companies found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subscription
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contract End
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredCompanies.map((company) => {
                  const sub = subscriptionMap.get(company.id)
                  return (
                    <tr key={company.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Building2 className="w-5 h-5 text-gray-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{company.name}</p>
                            <p className="text-xs text-gray-500">{company.jobs_total} jobs</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <ServiceTypeBadge type={company.service_type} />
                      </td>
                      <td className="px-6 py-4">
                        <SubscriptionStatusBadge status={sub?.status || 'none'} />
                      </td>
                      <td className="px-6 py-4">
                        {sub ? (
                          <div className="text-sm">
                            <p className="text-gray-900">{formatDate(sub.contract_end_date)}</p>
                            <p className={`text-xs ${sub.days_until_renewal <= 30 ? 'text-yellow-600' : 'text-gray-500'}`}>
                              {sub.days_until_renewal} days left
                            </p>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => onSelectCompany(company)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                        >
                          <Eye className="w-4 h-4" />
                          Manage
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// =====================================================
// INVOICES TAB
// =====================================================
function InvoicesTab({
  onSelectCompany,
  companies,
}: {
  onSelectCompany: (companyId: string) => void
  companies: AdminCompanyListItem[]
}) {
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | ''>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null)

  const { invoices, isLoading, refetch } = useInvoices({ status: statusFilter || undefined })

  const filteredInvoices = invoices.filter((inv) =>
    inv.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleViewCompany = (companyId: string) => {
    const company = companies.find((c) => c.id === companyId)
    if (company) {
      onSelectCompany(companyId)
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search invoices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as InvoiceStatus | '')}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button
            onClick={() => refetch()}
            className="p-2 text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full mx-auto" />
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No invoices found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredInvoices.map((inv: InvoiceListItem) => (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-gray-900">{inv.invoice_number}</span>
                      <p className="text-xs text-gray-500">{formatDate(inv.invoice_date)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleViewCompany(inv.company_id)}
                        className="text-sm text-gray-900 hover:text-blue-600"
                      >
                        {inv.company_name}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 capitalize">
                      {inv.invoice_type_display}
                    </td>
                    <td className="px-6 py-4">
                      <InvoiceStatusBadge status={inv.status} />
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(inv.total_amount)}
                      </span>
                      {parseFloat(inv.balance_due) > 0 && parseFloat(inv.balance_due) < parseFloat(inv.total_amount) && (
                        <p className="text-xs text-red-600">
                          Due: {formatCurrency(inv.balance_due)}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-sm ${
                          new Date(inv.due_date) < new Date() && inv.status !== 'paid'
                            ? 'text-red-600 font-medium'
                            : 'text-gray-500'
                        }`}
                      >
                        {formatDate(inv.due_date)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedInvoiceId(inv.id)}
                        className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invoice Detail Drawer */}
      {selectedInvoiceId && (
        <InvoiceDetailDrawer
          invoiceId={selectedInvoiceId}
          onClose={() => setSelectedInvoiceId(null)}
          onUpdated={refetch}
        />
      )}
    </div>
  )
}

// =====================================================
// ALERTS TAB
// =====================================================
function AlertsTab({
  onSelectCompany,
}: {
  onSelectCompany: (companyId: string) => void
}) {
  const { alerts, isLoading, refetch } = useSubscriptionAlerts()

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">
          {alerts.length} alert{alerts.length !== 1 ? 's' : ''} requiring attention
        </p>
        <button
          onClick={() => refetch()}
          className="p-2 text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">All Clear!</h3>
          <p className="text-gray-500">No alerts or actions required at this time.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert: SubscriptionAlert, index: number) => (
            <div
              key={index}
              className="bg-white border border-gray-200 rounded-lg p-4 flex items-start gap-4"
            >
              <AlertSeverityBadge severity={alert.severity} />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{alert.message}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      <button
                        onClick={() => onSelectCompany(alert.company_id)}
                        className="hover:text-gray-700"
                      >
                        {alert.company_name}
                      </button>
                      {alert.amount && (
                        <span className="ml-2 font-medium">{formatCurrency(alert.amount)}</span>
                      )}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-gray-500">Due</p>
                    <p className={`text-sm font-medium ${
                      new Date(alert.due_date) < new Date() ? 'text-red-600' : 'text-gray-900'
                    }`}>
                      {formatDate(alert.due_date)}
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => onSelectCompany(alert.company_id)}
                className="p-2 text-gray-400 hover:text-gray-600 flex-shrink-0"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// =====================================================
// MAIN PAGE COMPONENT
// =====================================================
export function SubscriptionsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('companies')
  const [selectedCompany, setSelectedCompany] = useState<AdminCompanyListItem | null>(null)
  const { summary } = useSubscriptionSummary()
  const { alerts } = useSubscriptionAlerts()
  const { companies, refetch: refetchCompanies } = useAllCompanies({})

  const handleSelectCompanyById = (companyId: string) => {
    const company = companies.find((c: AdminCompanyListItem) => c.id === companyId)
    if (company) {
      setSelectedCompany(company)
    }
  }

  const tabs: { id: TabType; label: string; icon: React.ElementType; count?: number }[] = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'companies', label: 'Companies', icon: Building2 },
    { id: 'invoices', label: 'Invoices', icon: FileText },
    { id: 'alerts', label: 'Alerts', icon: AlertTriangle, count: alerts.length },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Subscription Management</h1>
                <p className="text-sm text-gray-500 mt-1">
                  Manage company subscriptions, invoices, and billing
                </p>
              </div>
              <div className="flex gap-3">
                <button className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                  <Download className="w-4 h-4" />
                  Export
                </button>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-6 -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 pb-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && <OverviewTab summary={summary} />}
        {activeTab === 'companies' && <CompaniesTab onSelectCompany={setSelectedCompany} />}
        {activeTab === 'invoices' && <InvoicesTab onSelectCompany={handleSelectCompanyById} companies={companies} />}
        {activeTab === 'alerts' && <AlertsTab onSelectCompany={handleSelectCompanyById} />}
      </div>

      {/* Company Detail Drawer */}
      {selectedCompany && (
        <CompanyDetailDrawer
          company={selectedCompany}
          onClose={() => setSelectedCompany(null)}
          onRefresh={refetchCompanies}
        />
      )}
    </div>
  )
}

export default SubscriptionsPage
