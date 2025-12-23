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
  ChevronDown,
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
  Briefcase,
  Users,
} from 'lucide-react'
import {
  useSubscriptions,
  useInvoices,
  useFilteredInvoices,
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
  useCompanyById,
  useReplacementRequests,
  useReplacementActions,
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
  InvoiceTab,
  TimeRange,
  PlacementBreakdown,
  InvoiceType,
  Subscription,
  FeatureWithOverride,
  SubscriptionActivity,
  PlacementForInvoice,
  EffectivePricing,
} from '@/hooks'
import type { AdminCompanyListItem } from '@/types'
import { ServiceType } from '@/types'
import { ChangeServiceTypeModal } from '@/components/company/ChangeServiceTypeModal'
import {
  NoServiceType,
  ServiceTypeHeader,
  ContractSection,
  RetainedContractSection,
  QuickStats,
  SubscriptionDrawer,
  InvoiceDetailDrawer,
} from '@/components/subscriptions'
import { ReplacementStatusBadge } from '@/components/replacements'
import type { ReplacementRequest, ReplacementStatus } from '@/types'

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
        service_type: company.service_type || 'retained',
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

  const serviceTypeLabel = company.service_type === 'headhunting' ? 'Headhunting' : 'Retained'
  const isHeadhunting = company.service_type === 'headhunting'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
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

// SubscriptionDrawer and InvoiceDetailDrawer are imported from @/components/subscriptions

// =====================================================
// PLACEMENT ROW COMPONENT (Expandable with Invoice List)
// =====================================================
function PlacementRow({
  label,
  count,
  revenue,
  breakdown,
  variant = 'default',
  serviceType,
  placementType,
  onInvoiceClick,
}: {
  label: string
  count: number
  revenue: string
  breakdown: PlacementBreakdown
  variant?: 'default' | 'csuite'
  serviceType: 'retained' | 'headhunting'
  placementType: 'regular' | 'csuite'
  onInvoiceClick?: (invoiceId: string) => void
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)
  const isCsuite = variant === 'csuite'

  // Fetch invoices when a status card is selected
  const { invoices, isLoading } = useFilteredInvoices({
    serviceType,
    placementType,
    invoiceType: 'placement',
    invoiceStatus: selectedStatus as 'paid' | 'partially_paid' | 'pending' | 'overdue' | 'draft' | 'cancelled' | undefined,
    enabled: !!selectedStatus,
  })

  const statusCards = [
    { key: 'paid', label: 'Paid', data: breakdown.paid, bgColor: 'bg-green-50', textColor: 'text-green-700', borderColor: 'border-green-200', selectedBg: 'bg-green-100', ring: 'ring-green-400' },
    { key: 'partially_paid', label: 'Partial', data: breakdown.partially_paid, bgColor: 'bg-yellow-50', textColor: 'text-yellow-700', borderColor: 'border-yellow-200', selectedBg: 'bg-yellow-100', ring: 'ring-yellow-400' },
    { key: 'pending', label: 'Pending', data: breakdown.pending, bgColor: 'bg-blue-50', textColor: 'text-blue-700', borderColor: 'border-blue-200', selectedBg: 'bg-blue-100', ring: 'ring-blue-400' },
    { key: 'overdue', label: 'Overdue', data: breakdown.overdue, bgColor: 'bg-red-50', textColor: 'text-red-700', borderColor: 'border-red-200', selectedBg: 'bg-red-100', ring: 'ring-red-400' },
    { key: 'draft', label: 'Draft', data: breakdown.draft, bgColor: 'bg-gray-50', textColor: 'text-gray-600', borderColor: 'border-gray-200', selectedBg: 'bg-gray-100', ring: 'ring-gray-400' },
    { key: 'cancelled', label: 'Cancelled', data: breakdown.cancelled, bgColor: 'bg-slate-50', textColor: 'text-slate-500', borderColor: 'border-slate-200', selectedBg: 'bg-slate-100', ring: 'ring-slate-400' },
  ]

  const handleStatusClick = (statusKey: string) => {
    if (selectedStatus === statusKey) {
      setSelectedStatus(null) // Toggle off
    } else {
      setSelectedStatus(statusKey)
    }
  }

  return (
    <div className={`rounded-lg overflow-hidden ${isCsuite ? 'bg-amber-50' : 'bg-gray-50'}`}>
      {/* Main Row - Clickable */}
      <button
        onClick={() => {
          setIsExpanded(!isExpanded)
          if (isExpanded) setSelectedStatus(null) // Clear selection when collapsing
        }}
        className={`w-full flex items-center justify-between p-3 hover:bg-opacity-80 transition-colors ${
          isCsuite ? 'hover:bg-amber-100' : 'hover:bg-gray-100'
        }`}
      >
        <div className="flex items-center gap-2">
          <ChevronDown
            className={`w-4 h-4 transition-transform ${isExpanded ? '' : '-rotate-90'} ${
              isCsuite ? 'text-amber-600' : 'text-gray-500'
            }`}
          />
          <div className="text-left">
            <p className={`text-sm font-medium ${isCsuite ? 'text-amber-900' : 'text-gray-900'}`}>{label}</p>
            <p className={`text-xs ${isCsuite ? 'text-amber-700' : 'text-gray-500'}`}>
              {count} invoice{count !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-sm font-semibold ${isCsuite ? 'text-amber-900' : 'text-gray-900'}`}>
            {formatCurrency(revenue)}
          </p>
          <p className={`text-xs ${isCsuite ? 'text-amber-700' : 'text-gray-500'}`}>Total</p>
        </div>
      </button>

      {/* Expanded Breakdown - Cards Grid */}
      {isExpanded && (
        <div className={`px-3 pb-3 pt-2 border-t ${isCsuite ? 'border-amber-200' : 'border-gray-200'}`}>
          <div className="grid grid-cols-6 gap-2">
            {statusCards.map(({ key, label, data, bgColor, textColor, borderColor, selectedBg, ring }) => {
              const isSelected = selectedStatus === key
              return (
                <button
                  key={key}
                  onClick={() => handleStatusClick(key)}
                  disabled={data.count === 0}
                  className={`
                    ${isSelected ? selectedBg : bgColor} ${textColor} border ${borderColor} rounded-lg p-2 text-center
                    transition-all duration-150
                    ${data.count > 0 ? 'cursor-pointer hover:scale-105' : 'opacity-50 cursor-not-allowed'}
                    ${isSelected ? `ring-2 ${ring}` : ''}
                  `}
                >
                  <p className="text-lg font-bold">{data.count}</p>
                  <p className="text-[10px] font-medium uppercase tracking-wide">{label}</p>
                  <p className="text-xs font-semibold mt-1">{formatCurrency(data.amount)}</p>
                </button>
              )
            })}
          </div>

          {/* Invoice List when a status is selected */}
          {selectedStatus && (
            <div className="mt-3 border-t border-gray-200 pt-3">
              {isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                  <span className="ml-2 text-sm text-gray-500">Loading invoices...</span>
                </div>
              ) : invoices.length === 0 ? (
                <p className="text-center text-sm text-gray-500 py-4">No invoices found</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {invoices.map((invoice) => (
                    <button
                      key={invoice.id}
                      onClick={() => onInvoiceClick?.(invoice.id)}
                      className="w-full flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{invoice.invoice_number}</p>
                          <p className="text-xs text-gray-500">{invoice.company_name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">{formatCurrency(invoice.total_amount)}</p>
                        <p className="text-xs text-gray-500">{formatDate(invoice.invoice_date)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// =====================================================
// RETAINER ROW COMPONENT (for subscription invoices)
// =====================================================
function RetainerRow({
  count,
  revenue,
  breakdown,
  serviceType,
  onInvoiceClick,
}: {
  count: number
  revenue: string
  breakdown: PlacementBreakdown
  serviceType: 'retained' | 'headhunting'
  onInvoiceClick?: (invoiceId: string) => void
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)

  // Fetch invoices when a status card is selected
  const { invoices, isLoading } = useFilteredInvoices({
    serviceType,
    invoiceType: 'retainer',
    invoiceStatus: selectedStatus as 'paid' | 'partially_paid' | 'pending' | 'overdue' | 'draft' | 'cancelled' | undefined,
    enabled: !!selectedStatus,
  })

  const statusCards = [
    { key: 'paid', label: 'Paid', data: breakdown.paid, bgColor: 'bg-green-50', textColor: 'text-green-700', borderColor: 'border-green-200', selectedBg: 'bg-green-100', ring: 'ring-green-400' },
    { key: 'partially_paid', label: 'Partial', data: breakdown.partially_paid, bgColor: 'bg-yellow-50', textColor: 'text-yellow-700', borderColor: 'border-yellow-200', selectedBg: 'bg-yellow-100', ring: 'ring-yellow-400' },
    { key: 'pending', label: 'Pending', data: breakdown.pending, bgColor: 'bg-blue-50', textColor: 'text-blue-700', borderColor: 'border-blue-200', selectedBg: 'bg-blue-100', ring: 'ring-blue-400' },
    { key: 'overdue', label: 'Overdue', data: breakdown.overdue, bgColor: 'bg-red-50', textColor: 'text-red-700', borderColor: 'border-red-200', selectedBg: 'bg-red-100', ring: 'ring-red-400' },
    { key: 'draft', label: 'Draft', data: breakdown.draft, bgColor: 'bg-gray-50', textColor: 'text-gray-600', borderColor: 'border-gray-200', selectedBg: 'bg-gray-100', ring: 'ring-gray-400' },
    { key: 'cancelled', label: 'Cancelled', data: breakdown.cancelled, bgColor: 'bg-slate-50', textColor: 'text-slate-500', borderColor: 'border-slate-200', selectedBg: 'bg-slate-100', ring: 'ring-slate-400' },
  ]

  const handleStatusClick = (statusKey: string) => {
    if (selectedStatus === statusKey) {
      setSelectedStatus(null) // Toggle off
    } else {
      setSelectedStatus(statusKey)
    }
  }

  return (
    <div className="rounded-lg overflow-hidden bg-gray-50">
      {/* Main Row - Clickable */}
      <button
        onClick={() => {
          setIsExpanded(!isExpanded)
          if (isExpanded) setSelectedStatus(null) // Clear selection when collapsing
        }}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <ChevronDown
            className={`w-4 h-4 transition-transform text-gray-500 ${isExpanded ? '' : '-rotate-90'}`}
          />
          <div className="text-left">
            <p className="text-sm font-medium text-gray-900">Subscription Invoices</p>
            <p className="text-xs text-gray-500">
              {count} invoice{count !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-gray-900">
            {formatCurrency(revenue)}
          </p>
          <p className="text-xs text-gray-500">Total</p>
        </div>
      </button>

      {/* Expanded Breakdown - Cards Grid */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-2 border-t border-gray-200">
          <div className="grid grid-cols-6 gap-2">
            {statusCards.map(({ key, label, data, bgColor, textColor, borderColor, selectedBg, ring }) => {
              const isSelected = selectedStatus === key
              return (
                <button
                  key={key}
                  onClick={() => handleStatusClick(key)}
                  disabled={data.count === 0}
                  className={`
                    ${isSelected ? selectedBg : bgColor} ${textColor} border ${borderColor} rounded-lg p-2 text-center
                    transition-all duration-150
                    ${data.count > 0 ? 'cursor-pointer hover:scale-105' : 'opacity-50 cursor-not-allowed'}
                    ${isSelected ? `ring-2 ${ring}` : ''}
                  `}
                >
                  <p className="text-lg font-bold">{data.count}</p>
                  <p className="text-[10px] font-medium uppercase tracking-wide">{label}</p>
                  <p className="text-xs font-semibold mt-1">{formatCurrency(data.amount)}</p>
                </button>
              )
            })}
          </div>

          {/* Invoice List when a status is selected */}
          {selectedStatus && (
            <div className="mt-3 border-t border-gray-200 pt-3">
              {isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                  <span className="ml-2 text-sm text-gray-500">Loading invoices...</span>
                </div>
              ) : invoices.length === 0 ? (
                <p className="text-center text-sm text-gray-500 py-4">No invoices found</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {invoices.map((invoice) => (
                    <button
                      key={invoice.id}
                      onClick={() => onInvoiceClick?.(invoice.id)}
                      className="w-full flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{invoice.invoice_number}</p>
                          <p className="text-xs text-gray-500">{invoice.company_name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">{formatCurrency(invoice.total_amount)}</p>
                        <p className="text-xs text-gray-500">{formatDate(invoice.invoice_date)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// =====================================================
// SERVICE TYPE CARD COMPONENT
// =====================================================
function ServiceTypeCard({
  type,
  companies,
  activeSubscriptions,
  pausedSubscriptions,
  terminatedSubscriptions,
  expiredSubscriptions,
  regularPlacements,
  csuitePlacements,
  regularRevenue,
  csuiteRevenue,
  regularBreakdown,
  csuiteBreakdown,
  retainerCount,
  retainerRevenue,
  retainerBreakdown,
  mrr,
  onInvoiceClick,
}: {
  type: 'retained' | 'headhunting'
  companies: number
  // Subscription status counts (only for retained)
  activeSubscriptions?: number
  pausedSubscriptions?: number
  terminatedSubscriptions?: number
  expiredSubscriptions?: number
  regularPlacements: number
  csuitePlacements: number
  regularRevenue: string
  csuiteRevenue: string
  regularBreakdown: PlacementBreakdown
  csuiteBreakdown: PlacementBreakdown
  // Retainer stats only for retained (headhunting doesn't have subscriptions)
  retainerCount?: number
  retainerRevenue?: string
  retainerBreakdown?: PlacementBreakdown
  mrr?: string
  onInvoiceClick?: (invoiceId: string) => void
}) {
  const isRetained = type === 'retained'
  const totalPlacements = regularPlacements + csuitePlacements
  const totalRevenue = parseFloat(regularRevenue) + parseFloat(csuiteRevenue)

  return (
    <div className={`bg-white border rounded-lg overflow-hidden ${isRetained ? 'border-purple-200' : 'border-indigo-200'}`}>
      {/* Header */}
      <div className={`px-6 py-4 ${isRetained ? 'bg-purple-50' : 'bg-indigo-50'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isRetained ? (
              <Briefcase className="w-5 h-5 text-purple-600" />
            ) : (
              <Users className="w-5 h-5 text-indigo-600" />
            )}
            <h3 className={`text-lg font-semibold ${isRetained ? 'text-purple-900' : 'text-indigo-900'}`}>
              {isRetained ? 'Retained' : 'Headhunting'}
            </h3>
          </div>
          <div className="text-right">
            <p className={`text-2xl font-bold ${isRetained ? 'text-purple-600' : 'text-indigo-600'}`}>
              {companies}
            </p>
            <p className={`text-xs ${isRetained ? 'text-purple-700' : 'text-indigo-700'}`}>
              {companies === 1 ? 'Company' : 'Companies'}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="p-6 space-y-4">
        {/* Subscriptions & MRR (for Retained) */}
        {isRetained && (
          <div className="space-y-3">
            {/* Subscription Status Cards */}
            <div className="grid grid-cols-4 gap-2">
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-center">
                <p className="text-2xl font-bold text-green-700">{activeSubscriptions ?? 0}</p>
                <p className="text-[10px] font-medium text-green-600 uppercase tracking-wide">Active</p>
              </div>
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
                <p className="text-2xl font-bold text-yellow-700">{pausedSubscriptions ?? 0}</p>
                <p className="text-[10px] font-medium text-yellow-600 uppercase tracking-wide">Paused</p>
              </div>
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-center">
                <p className="text-2xl font-bold text-red-700">{terminatedSubscriptions ?? 0}</p>
                <p className="text-[10px] font-medium text-red-600 uppercase tracking-wide">Terminated</p>
              </div>
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-center">
                <p className="text-2xl font-bold text-gray-600">{expiredSubscriptions ?? 0}</p>
                <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Expired</p>
              </div>
            </div>
            {/* Monthly MRR */}
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-center justify-between">
                <p className="text-xs text-purple-700 uppercase tracking-wide font-medium">Monthly Recurring Revenue</p>
                <p className="text-xl font-bold text-purple-700">{formatCurrency(mrr || '0')}</p>
              </div>
            </div>
          </div>
        )}

        {/* Placements Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-700">Placements</p>
            <p className="text-sm font-semibold text-gray-900">{totalPlacements} total</p>
          </div>

          <div className="space-y-2">
            {/* Regular Placements - Expandable */}
            <PlacementRow
              label="Regular"
              count={regularPlacements}
              revenue={regularRevenue}
              breakdown={regularBreakdown}
              variant="default"
              serviceType={type}
              placementType="regular"
              onInvoiceClick={onInvoiceClick}
            />

            {/* C-Suite Placements - Expandable */}
            <PlacementRow
              label="C-Suite"
              count={csuitePlacements}
              revenue={csuiteRevenue}
              breakdown={csuiteBreakdown}
              variant="csuite"
              serviceType={type}
              placementType="csuite"
              onInvoiceClick={onInvoiceClick}
            />
          </div>
        </div>

        {/* Subscription Invoices Section (Retainer) - Only for retained */}
        {retainerCount != null && retainerCount > 0 && retainerBreakdown && retainerRevenue && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-700">Subscriptions</p>
              <p className="text-sm font-semibold text-gray-900">{retainerCount} invoice{retainerCount !== 1 ? 's' : ''}</p>
            </div>

            <RetainerRow
              count={retainerCount}
              revenue={retainerRevenue}
              breakdown={retainerBreakdown}
              serviceType={type}
              onInvoiceClick={onInvoiceClick}
            />
          </div>
        )}

        {/* Total Revenue */}
        <div className={`p-4 rounded-lg ${isRetained ? 'bg-purple-50' : 'bg-indigo-50'}`}>
          <div className="flex items-center justify-between">
            <p className={`text-sm font-medium ${isRetained ? 'text-purple-900' : 'text-indigo-900'}`}>
              Total Placement Revenue
            </p>
            <p className={`text-lg font-bold ${isRetained ? 'text-purple-600' : 'text-indigo-600'}`}>
              {formatCurrency(totalRevenue)}
            </p>
          </div>
          {retainerCount != null && retainerCount > 0 && retainerRevenue && (
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200">
              <p className={`text-sm font-medium ${isRetained ? 'text-purple-900' : 'text-indigo-900'}`}>
                Total Subscription Revenue
              </p>
              <p className={`text-lg font-bold ${isRetained ? 'text-purple-600' : 'text-indigo-600'}`}>
                {formatCurrency(retainerRevenue)}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// =====================================================
// INVOICE LIST SECTION WITH TABS
// =====================================================
function InvoiceListSection() {
  const [activeTab, setActiveTab] = useState<InvoiceTab>('all')
  const [timeRange, setTimeRange] = useState<TimeRange>('30d')

  const { invoices, isLoading, error } = useFilteredInvoices({
    tab: activeTab,
    timeRange: timeRange,
  })

  const tabs: { key: InvoiceTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'paid', label: 'Paid' },
    { key: 'pending', label: 'Pending' },
    { key: 'overdue', label: 'Overdue' },
  ]

  const timeRanges: { key: TimeRange; label: string }[] = [
    { key: '7d', label: '7 days' },
    { key: '30d', label: '30 days' },
    { key: '90d', label: '90 days' },
    { key: '6m', label: '6 months' },
    { key: '1y', label: '1 year' },
    { key: 'all', label: 'All time' },
  ]

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      {/* Header with tabs and time range */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === tab.key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Time Range Selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Show:</span>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as TimeRange)}
              className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {timeRanges.map((range) => (
                <option key={range.key} value={range.key}>
                  {range.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Invoice List */}
      <div className="divide-y divide-gray-100">
        {isLoading ? (
          <div className="p-8 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto" />
            <p className="text-sm text-gray-500 mt-2">Loading invoices...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <AlertCircle className="w-6 h-6 text-red-400 mx-auto" />
            <p className="text-sm text-red-600 mt-2">{error}</p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="w-8 h-8 text-gray-300 mx-auto" />
            <p className="text-sm text-gray-500 mt-2">No invoices found</p>
          </div>
        ) : (
          invoices.slice(0, 10).map((invoice) => (
            <div key={invoice.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-medium text-gray-900">{invoice.invoice_number}</p>
                    <InvoiceStatusBadge status={invoice.status} />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {invoice.company_name} &middot; {formatDate(invoice.invoice_date)}
                    {invoice.due_date && (
                      <span className="ml-2">Due: {formatDate(invoice.due_date)}</span>
                    )}
                  </p>
                </div>
                <div className="text-right ml-4">
                  <p className="text-sm font-semibold text-gray-900">{formatCurrency(invoice.total_amount)}</p>
                  {invoice.balance_due && parseFloat(invoice.balance_due) > 0 && parseFloat(invoice.balance_due) < parseFloat(invoice.total_amount) && (
                    <p className="text-xs text-gray-500">
                      Balance: {formatCurrency(invoice.balance_due)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}

        {invoices.length > 10 && (
          <div className="px-6 py-3 text-center bg-gray-50">
            <p className="text-sm text-gray-500">
              Showing 10 of {invoices.length} invoices
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// =====================================================
// OVERVIEW TAB
// =====================================================
function OverviewTab({ summary }: { summary: SubscriptionSummary | null }) {
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null)

  if (!summary) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-gray-100 rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 bg-gray-100 rounded-lg" />
          <div className="h-64 bg-gray-100 rounded-lg" />
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6">
        {/* Summary Cards - Row 1 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <SummaryCard
            title="Monthly Recurring Revenue"
            value={formatCurrency(summary.total_mrr)}
            subtitle={`${summary.active_subscriptions} active subscriptions`}
            icon={DollarSign}
            color="green"
          />
          <SummaryCard
            title="Collected This Month"
            value={formatCurrency(summary.collected_this_month)}
            subtitle="Payments received"
            icon={TrendingUp}
            color="blue"
          />
          <SummaryCard
            title="Overdue Invoices"
            value={summary.overdue_invoices_count}
            subtitle={formatCurrency(summary.overdue_invoices_amount)}
            icon={AlertTriangle}
            color={summary.overdue_invoices_count > 0 ? 'red' : 'gray'}
          />
          <SummaryCard
            title="Pending Invoices"
            value={summary.pending_invoices_count}
            subtitle={formatCurrency(summary.pending_invoices_amount)}
            icon={Clock}
            color={summary.pending_invoices_count > 0 ? 'yellow' : 'gray'}
          />
        </div>

        {/* Service Type Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ServiceTypeCard
            type="retained"
            companies={summary.retained_companies}
            activeSubscriptions={summary.active_subscriptions}
            pausedSubscriptions={summary.paused_subscriptions}
            terminatedSubscriptions={summary.terminated_subscriptions}
            expiredSubscriptions={summary.expired_subscriptions}
            regularPlacements={summary.retained_regular_placements}
            csuitePlacements={summary.retained_csuite_placements}
            regularRevenue={summary.retained_regular_revenue}
            csuiteRevenue={summary.retained_csuite_revenue}
            regularBreakdown={summary.retained_regular_breakdown}
            csuiteBreakdown={summary.retained_csuite_breakdown}
            retainerCount={summary.retained_retainer_count}
            retainerRevenue={summary.retained_retainer_revenue}
            retainerBreakdown={summary.retained_retainer_breakdown}
            mrr={summary.retained_mrr}
            onInvoiceClick={setSelectedInvoiceId}
          />
          <ServiceTypeCard
            type="headhunting"
            companies={summary.headhunting_companies}
            regularPlacements={summary.headhunting_regular_placements}
            csuitePlacements={summary.headhunting_csuite_placements}
            regularRevenue={summary.headhunting_regular_revenue}
            csuiteRevenue={summary.headhunting_csuite_revenue}
            regularBreakdown={summary.headhunting_regular_breakdown}
            csuiteBreakdown={summary.headhunting_csuite_breakdown}
            onInvoiceClick={setSelectedInvoiceId}
          />
        </div>

        {/* Upcoming Renewals */}
        {summary.upcoming_renewals.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Renewals (30 days)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {summary.upcoming_renewals.map((renewal) => (
                <div key={renewal.company_id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{renewal.company_name}</p>
                    <p className="text-xs text-gray-500">
                      Expires {formatDate(renewal.contract_end_date)} ({renewal.days_until_renewal} days)
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{formatCurrency(renewal.monthly_retainer)}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      renewal.auto_renew ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {renewal.auto_renew ? 'Auto-renew' : 'Manual'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Invoice List with Tabs */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Invoices</h3>
          <InvoiceListSection />
        </div>
      </div>

      {/* Invoice Detail Drawer */}
      {selectedInvoiceId && (
        <InvoiceDetailDrawer
          invoiceId={selectedInvoiceId}
          onClose={() => setSelectedInvoiceId(null)}
          onUpdated={() => {
            // Summary will refresh on next load
          }}
        />
      )}
    </>
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

  // Filter companies using embedded subscription data
  const filteredCompanies = companies.filter((company) => {
    if (serviceTypeFilter && company.service_type !== serviceTypeFilter) {
      return false
    }
    if (subscriptionFilter) {
      const sub = company.subscription
      if (subscriptionFilter === 'none' && sub) return false
      if (subscriptionFilter === 'active' && (!sub || sub.status !== 'active')) return false
      if (subscriptionFilter === 'paused' && (!sub || sub.status !== 'paused')) return false
      if (subscriptionFilter === 'terminated' && (!sub || sub.status !== 'terminated')) return false
    }
    return true
  })

  // Stats
  const activeCount = companies.filter(c => c.subscription?.status === 'active').length
  const retainedCount = companies.filter(c => c.service_type === 'retained').length
  const headhuntingCount = companies.filter(c => c.service_type === 'headhunting').length

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
      <div className="flex flex-wrap gap-4 text-sm">
        <span className="text-gray-500">
          Showing <span className="font-medium text-gray-900">{filteredCompanies.length}</span> of {companies.length} companies
        </span>
        <span className="text-gray-300">|</span>
        <span className="text-gray-500">
          <span className="font-medium text-green-600">{activeCount}</span> active contracts
        </span>
        <span className="text-gray-300">|</span>
        <span className="text-gray-500">
          <span className="font-medium text-purple-600">{retainedCount}</span> retained
        </span>
        <span className="text-gray-300">|</span>
        <span className="text-gray-500">
          <span className="font-medium text-blue-600">{headhuntingCount}</span> headhunting
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contract
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pricing
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredCompanies.map((company) => {
                  const sub = company.subscription
                  const contact = company.primary_contact
                  const pricing = company.pricing
                  return (
                    <tr key={company.id} className="hover:bg-gray-50">
                      {/* Company */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {company.logo ? (
                            <img
                              src={company.logo}
                              alt={company.name}
                              className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Building2 className="w-4 h-4 text-gray-400" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{company.name}</p>
                            <p className="text-xs text-gray-500">{company.jobs_total} jobs</p>
                          </div>
                        </div>
                      </td>
                      {/* Contact */}
                      <td className="px-4 py-3">
                        {contact ? (
                          <div className="min-w-0">
                            <p className="text-sm text-gray-900 truncate">{contact.name}</p>
                            <p className="text-xs text-gray-500 truncate">{contact.email}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">No contact</span>
                        )}
                      </td>
                      {/* Service Type */}
                      <td className="px-4 py-3">
                        <ServiceTypeBadge type={company.service_type} />
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <SubscriptionStatusBadge status={sub?.status || 'none'} />
                          {sub && (
                            <div className="flex items-center gap-1.5 text-xs">
                              {sub.auto_renew ? (
                                <span className="text-green-600 flex items-center gap-0.5">
                                  <RefreshCw className="w-3 h-3" />
                                  Auto
                                </span>
                              ) : (
                                <span className="text-gray-400">No auto-renew</span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      {/* Contract */}
                      <td className="px-4 py-3">
                        {sub?.contract_end_date ? (
                          <div className="text-sm">
                            <p className="text-gray-900">{formatDate(sub.contract_end_date)}</p>
                            <p className={`text-xs ${
                              sub.days_until_renewal <= 30
                                ? sub.days_until_renewal <= 7
                                  ? 'text-red-600 font-medium'
                                  : 'text-yellow-600'
                                : 'text-gray-500'
                            }`}>
                              {sub.days_until_renewal <= 0
                                ? 'Expired'
                                : `${sub.days_until_renewal} days left`}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">No contract</span>
                        )}
                      </td>
                      {/* Pricing */}
                      <td className="px-4 py-3">
                        {pricing ? (
                          <div className="text-xs space-y-0.5">
                            {pricing.monthly_retainer && (
                              <p className="text-gray-900">
                                R{parseInt(pricing.monthly_retainer).toLocaleString()}/mo
                              </p>
                            )}
                            <p className="text-gray-500">
                              {pricing.placement_fee
                                ? `${(parseFloat(pricing.placement_fee) * 100).toFixed(0)}%`
                                : '—'} placement
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">Default</span>
                        )}
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
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

      {/* Subscription Drawer */}
      {selectedCompany && (
        <SubscriptionDrawer
          company={selectedCompany}
          onClose={() => setSelectedCompany(null)}
          onRefresh={refetchCompanies}
        />
      )}
    </div>
  )
}

export default SubscriptionsPage
