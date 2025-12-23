/**
 * ChangeServiceTypeModal
 *
 * Clean single-view modal for changing company service type with:
 * - Service type transition display
 * - Pricing comparison with admin inline editing
 * - Feature changes list
 * - T&Cs link with agreement checkbox
 */

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X, ArrowRight, RefreshCw, Check, Minus, Plus, ExternalLink, Loader2, Pencil, AlertTriangle, CreditCard, FileText } from 'lucide-react'
import { useChangeServiceType, useEffectivePricing, useUpdateCompanyPricing } from '@/hooks'
import type { PaymentRequiredResponse } from '@/hooks'
import { cmsPages, cmsPricing } from '@/services/cms'
import type { CMSPricingFeature } from '@/services/cms'

interface ChangeServiceTypeModalProps {
  companyId: string
  companyName: string
  currentType: 'retained' | 'headhunting'
  subscriptionId?: string
  monthsRemaining?: number
  isWithinLockoutPeriod?: boolean
  isAdmin?: boolean
  onClose: () => void
  onChanged: () => void
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

function formatPercentage(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value
  return `${(num * 100).toFixed(0)}%`
}

function percentageToDecimal(value: string): string {
  const num = parseFloat(value)
  return (num / 100).toString()
}

export function ChangeServiceTypeModal({
  companyId,
  companyName,
  currentType,
  subscriptionId,
  monthsRemaining = 0,
  isWithinLockoutPeriod = false,
  isAdmin = false,
  onClose,
  onChanged,
}: ChangeServiceTypeModalProps) {
  const [termsAgreed, setTermsAgreed] = useState(false)
  const [termsDocument, setTermsDocument] = useState<{ slug: string; title: string } | null>(null)
  const [isEditingPricing, setIsEditingPricing] = useState(false)

  // Custom pricing state (stored as percentages for display)
  const [customRetainer, setCustomRetainer] = useState('')
  const [customPlacement, setCustomPlacement] = useState('')
  const [customCsuite, setCustomCsuite] = useState('')

  const newType = currentType === 'retained' ? 'headhunting' : 'retained'
  const isRetainedToHeadhunting = currentType === 'retained' && newType === 'headhunting'

  const { changeServiceType, isChanging, error, paymentRequired, clearPaymentRequired } = useChangeServiceType()
  const { updatePricing, isUpdating, error: pricingError } = useUpdateCompanyPricing()

  // Fetch pricing data
  const { pricing } = useEffectivePricing(companyId)
  const { data: defaultConfig } = useQuery({
    queryKey: ['cms', 'pricing', 'config'],
    queryFn: cmsPricing.getConfigPublic,
  })

  // Fetch features
  const { data: features = [] } = useQuery({
    queryKey: ['cms', 'pricing', 'features'],
    queryFn: cmsPricing.getFeaturesPublic,
  })

  // Fetch terms document for the new service type
  const { data: termsDocuments = [], isLoading: termsLoading } = useQuery({
    queryKey: ['cms-legal-documents', newType],
    queryFn: () => cmsPages.listPublic({ service_type: newType }),
  })

  // Auto-select terms document
  useEffect(() => {
    if (termsDocuments.length > 0) {
      const doc = termsDocuments[0]
      if (doc) {
        setTermsDocument({ slug: doc.slug, title: doc.title })
      }
    }
  }, [termsDocuments])

  // Initialize custom pricing values when entering edit mode
  useEffect(() => {
    if (isEditingPricing && defaultConfig) {
      const defaultRetainer = newType === 'retained'
        ? (defaultConfig.retained_monthly_retainer || '20000')
        : ''
      const defaultPlacement = newType === 'retained'
        ? (defaultConfig.retained_placement_fee || '0.10')
        : (defaultConfig.headhunting_placement_fee || '0.20')
      const defaultCsuite = newType === 'retained'
        ? (defaultConfig.retained_csuite_placement_fee || '0.15')
        : (defaultConfig.headhunting_csuite_placement_fee || '0.25')

      setCustomRetainer(defaultRetainer)
      setCustomPlacement((parseFloat(defaultPlacement) * 100).toString())
      setCustomCsuite((parseFloat(defaultCsuite) * 100).toString())
    }
  }, [isEditingPricing, defaultConfig, newType])

  const handleConfirm = async () => {
    if (!termsAgreed || !termsDocument) return

    try {
      // If admin has set custom pricing, save it first
      if (isEditingPricing && isAdmin) {
        const pricingData: {
          monthly_retainer?: string | null
          placement_fee?: string | null
          csuite_placement_fee?: string | null
        } = {}

        if (newType === 'retained' && customRetainer) {
          pricingData.monthly_retainer = customRetainer
        } else if (newType === 'headhunting') {
          pricingData.monthly_retainer = null
        }

        if (customPlacement) {
          pricingData.placement_fee = percentageToDecimal(customPlacement)
        }
        if (customCsuite) {
          pricingData.csuite_placement_fee = percentageToDecimal(customCsuite)
        }

        await updatePricing(companyId, pricingData)
      }

      const result = await changeServiceType(companyId, newType, {
        termsDocumentSlug: termsDocument?.slug,
      })

      // Check if payment is required (402 response)
      if ('payment_required' in result && result.payment_required) {
        // Payment required - don't close modal, paymentRequired state will show the payment UI
        return
      }

      // Success - close modal
      onChanged()
      onClose()
    } catch (err) {
      console.error('Failed to change service type:', err)
    }
  }

  // Helper to check if payment response has been received
  const isPaymentRequired = (response: PaymentRequiredResponse | null): response is PaymentRequiredResponse => {
    return response !== null && response.payment_required === true
  }

  // Calculate feature changes
  const activeFeatures = features.filter((f) => f.is_active)
  const isIncluded = (feature: CMSPricingFeature, type: 'retained' | 'headhunting') => {
    return type === 'retained' ? feature.included_in_retained : feature.included_in_headhunting
  }

  const gainedFeatures: CMSPricingFeature[] = []
  const lostFeatures: CMSPricingFeature[] = []
  activeFeatures.forEach((feature) => {
    const currentIncluded = isIncluded(feature, currentType)
    const newIncluded = isIncluded(feature, newType)
    if (!currentIncluded && newIncluded) gainedFeatures.push(feature)
    if (currentIncluded && !newIncluded) lostFeatures.push(feature)
  })

  // Get current pricing values
  const currentPricing = {
    retainer: currentType === 'retained'
      ? (pricing?.monthly_retainer || defaultConfig?.retained_monthly_retainer || '0')
      : null,
    placement: pricing?.placement_fee || (currentType === 'retained'
      ? defaultConfig?.retained_placement_fee
      : defaultConfig?.headhunting_placement_fee) || '0',
    csuite: pricing?.csuite_placement_fee || (currentType === 'retained'
      ? defaultConfig?.retained_csuite_placement_fee
      : defaultConfig?.headhunting_csuite_placement_fee) || '0',
  }

  // Get new pricing values (default or custom if editing)
  const getNewPricing = () => {
    if (isEditingPricing) {
      return {
        retainer: newType === 'retained' ? customRetainer : null,
        placement: customPlacement ? percentageToDecimal(customPlacement) : '0',
        csuite: customCsuite ? percentageToDecimal(customCsuite) : '0',
      }
    }
    return {
      retainer: newType === 'retained'
        ? (defaultConfig?.retained_monthly_retainer || '20000')
        : null,
      placement: newType === 'retained'
        ? (defaultConfig?.retained_placement_fee || '0.10')
        : (defaultConfig?.headhunting_placement_fee || '0.20'),
      csuite: newType === 'retained'
        ? (defaultConfig?.retained_csuite_placement_fee || '0.15')
        : (defaultConfig?.headhunting_csuite_placement_fee || '0.25'),
    }
  }

  const newPricing = getNewPricing()

  // Calculate termination fee for retained -> headhunting switch
  const terminationFee = (() => {
    if (!isRetainedToHeadhunting || !subscriptionId) return null

    const monthlyRetainer = parseFloat(
      pricing?.monthly_retainer || defaultConfig?.retained_monthly_retainer || '20000'
    )
    const remainingTermFee = monthsRemaining * monthlyRetainer
    const threeMonthFee = 3 * monthlyRetainer
    const earlyTerminationFee = Math.min(remainingTermFee, threeMonthFee)

    return {
      monthlyRetainer,
      monthsRemaining,
      remainingTermFee,
      threeMonthFee,
      earlyTerminationFee,
      isWithinLockoutPeriod,
      canTerminate: !isWithinLockoutPeriod,
    }
  })()

  // Disable confirm if within lockout period when switching retained -> headhunting
  const isBlockedByLockout = isRetainedToHeadhunting && terminationFee?.isWithinLockoutPeriod
  const canConfirm = termsAgreed && termsDocument && !isChanging && !isUpdating && !isBlockedByLockout

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Change Service Type</h2>
              <p className="text-sm text-gray-500">{companyName}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1">
          {/* Payment Required State */}
          {isPaymentRequired(paymentRequired) ? (
            <div className="space-y-5">
              {/* Payment Required Header */}
              <div className="text-center py-4">
                <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                  <CreditCard className="w-8 h-8 text-amber-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Payment Required</h3>
                <p className="text-sm text-gray-500 mt-1">
                  An early termination fee must be paid before changing service type.
                </p>
              </div>

              {/* Invoice Details */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                  <FileText className="w-4 h-4" />
                  Invoice Details
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Invoice Number</span>
                    <span className="font-medium text-gray-900">{paymentRequired.invoice_number}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Termination Fee</span>
                    <span className="text-gray-900">{formatCurrency(paymentRequired.termination_fee)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">VAT (15%)</span>
                    <span className="text-gray-900">
                      {formatCurrency(parseFloat(paymentRequired.total_amount) - parseFloat(paymentRequired.termination_fee))}
                    </span>
                  </div>
                  <div className="border-t border-gray-200 pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-semibold text-gray-900">Total Amount Due</span>
                      <span className="text-lg font-bold text-gray-900">{formatCurrency(paymentRequired.total_amount)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  Please pay the invoice to complete your service type change. Once payment is confirmed,
                  you can return here to finalize the change.
                </p>
              </div>

              {/* View Invoice Button */}
              <div className="flex justify-center">
                <a
                  href={`/dashboard/subscriptions?invoice=${paymentRequired.invoice_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800"
                >
                  <ExternalLink className="w-4 h-4" />
                  View Invoice
                </a>
              </div>
            </div>
          ) : (
            <>
              {/* Service Type Transition */}
              <div className="flex items-center justify-center gap-4 py-3 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <span
                    className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${
                      currentType === 'retained'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-purple-100 text-purple-700'
                    }`}
                  >
                    {currentType === 'retained' ? 'Retained' : 'Headhunting'}
                  </span>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400" />
                <div className="text-center">
                  <span
                    className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${
                      newType === 'retained'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-purple-100 text-purple-700'
                    }`}
                  >
                    {newType === 'retained' ? 'Retained' : 'Headhunting'}
                  </span>
                </div>
              </div>

          {/* Pricing Changes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-900">Pricing Changes</h3>
              {isAdmin && !isEditingPricing && (
                <button
                  onClick={() => setIsEditingPricing(true)}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                >
                  <Pencil className="w-3 h-3" />
                  Set Custom
                </button>
              )}
              {isAdmin && isEditingPricing && (
                <button
                  onClick={() => setIsEditingPricing(false)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Use Defaults
                </button>
              )}
            </div>
            <div className="bg-gray-50 rounded-lg divide-y divide-gray-200">
              {/* Monthly Retainer */}
              <div className="flex items-center justify-between px-4 py-2.5">
                <span className="text-sm text-gray-600">Monthly Retainer</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-400">
                    {currentPricing.retainer ? formatCurrency(currentPricing.retainer) : 'None'}
                  </span>
                  <ArrowRight className="w-4 h-4 text-gray-300" />
                  {isEditingPricing && newType === 'retained' ? (
                    <input
                      type="number"
                      value={customRetainer}
                      onChange={(e) => setCustomRetainer(e.target.value)}
                      className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                      placeholder="20000"
                    />
                  ) : (
                    <span className="text-sm font-medium text-gray-900">
                      {newPricing.retainer ? formatCurrency(newPricing.retainer) : 'None'}
                    </span>
                  )}
                </div>
              </div>

              {/* Standard Placement Fee */}
              <div className="flex items-center justify-between px-4 py-2.5">
                <span className="text-sm text-gray-600">Standard Placement Fee</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-400">
                    {formatPercentage(currentPricing.placement)}
                  </span>
                  <ArrowRight className="w-4 h-4 text-gray-300" />
                  {isEditingPricing ? (
                    <div className="flex items-center">
                      <input
                        type="number"
                        value={customPlacement}
                        onChange={(e) => setCustomPlacement(e.target.value)}
                        className="w-16 px-2 py-1 text-sm border border-gray-300 rounded-l focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                        placeholder="20"
                        step="0.5"
                      />
                      <span className="px-2 py-1 text-sm bg-gray-100 border border-l-0 border-gray-300 rounded-r">%</span>
                    </div>
                  ) : (
                    <span className="text-sm font-medium text-gray-900">
                      {formatPercentage(newPricing.placement)}
                    </span>
                  )}
                </div>
              </div>

              {/* C-Suite Placement Fee */}
              <div className="flex items-center justify-between px-4 py-2.5">
                <span className="text-sm text-gray-600">C-Suite Placement Fee</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-400">
                    {formatPercentage(currentPricing.csuite)}
                  </span>
                  <ArrowRight className="w-4 h-4 text-gray-300" />
                  {isEditingPricing ? (
                    <div className="flex items-center">
                      <input
                        type="number"
                        value={customCsuite}
                        onChange={(e) => setCustomCsuite(e.target.value)}
                        className="w-16 px-2 py-1 text-sm border border-gray-300 rounded-l focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                        placeholder="25"
                        step="0.5"
                      />
                      <span className="px-2 py-1 text-sm bg-gray-100 border border-l-0 border-gray-300 rounded-r">%</span>
                    </div>
                  ) : (
                    <span className="text-sm font-medium text-gray-900">
                      {formatPercentage(newPricing.csuite)}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {isEditingPricing && (
              <p className="mt-2 text-xs text-amber-600">
                Custom pricing will be applied when the service type is changed.
              </p>
            )}
          </div>

          {/* Early Termination Fee - Only show when switching from retained to headhunting */}
          {isRetainedToHeadhunting && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-semibold text-amber-800">Early Termination Fee</h3>
              </div>
              <p className="text-xs text-amber-700 mb-3">
                Switching from Retained to Headhunting requires termination of your retained service contract.
              </p>
              {terminationFee ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-amber-700">Monthly Retainer</span>
                    <span className="font-medium text-amber-900">{formatCurrency(terminationFee.monthlyRetainer)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-amber-700">Months Remaining</span>
                    <span className="font-medium text-amber-900">{terminationFee.monthsRemaining} months</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-amber-700">Remaining Term Value</span>
                    <span className="text-amber-900">{formatCurrency(terminationFee.remainingTermFee)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-amber-700">3-Month Fee (minimum)</span>
                    <span className="text-amber-900">{formatCurrency(terminationFee.threeMonthFee)}</span>
                  </div>
                  <div className="border-t border-amber-300 pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-semibold text-amber-800">Termination Fee</span>
                      <span className="text-lg font-bold text-red-600">{formatCurrency(terminationFee.earlyTerminationFee)}</span>
                    </div>
                    <p className="text-xs text-amber-600 mt-1">Lesser of remaining term value or 3-month fee</p>
                  </div>
                  {terminationFee.isWithinLockoutPeriod && (
                    <p className="text-xs text-amber-700 mt-2">
                      Warning: This subscription is within the 6-month lockout period. Early termination without cause is not permitted during this time.
                    </p>
                  )}
                </div>
              ) : !subscriptionId ? (
                <p className="text-sm text-gray-500">No active subscription found.</p>
              ) : (
                <p className="text-sm text-amber-700">Unable to calculate fee</p>
              )}
            </div>
          )}

          {/* Feature Changes */}
          {(gainedFeatures.length > 0 || lostFeatures.length > 0) && (
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">Feature Changes</h3>
              <div className="space-y-3">
                {gainedFeatures.length > 0 && (
                  <div className="bg-green-50 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 text-green-700 text-sm font-medium mb-2">
                      <Plus className="w-4 h-4" />
                      <span>Features You'll Gain</span>
                    </div>
                    <ul className="space-y-1">
                      {gainedFeatures.map((feature) => (
                        <li key={feature.id} className="flex items-start gap-2 text-sm text-green-800">
                          <Check className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                          <span>{feature.name}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {lostFeatures.length > 0 && (
                  <div className="bg-red-50 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 text-red-700 text-sm font-medium mb-2">
                      <Minus className="w-4 h-4" />
                      <span>Features You'll Lose</span>
                    </div>
                    <ul className="space-y-1">
                      {lostFeatures.map((feature) => (
                        <li key={feature.id} className="flex items-start gap-2 text-sm text-red-800">
                          <X className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                          <span>{feature.name}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Terms Agreement */}
          <div className="pt-2 border-t border-gray-200">
            {termsLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading terms...
              </div>
            ) : termsDocument ? (
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={termsAgreed}
                  onChange={(e) => setTermsAgreed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                />
                <span className="text-sm text-gray-600">
                  I have read and agree to the{' '}
                  <a
                    href={`/${termsDocument.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-900 font-medium hover:underline inline-flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {termsDocument.title}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </span>
              </label>
            ) : (
              <p className="text-sm text-amber-600">
                No terms document configured for this service type.
              </p>
            )}
          </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex-shrink-0">
          {(error || pricingError) && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error || pricingError}</p>
            </div>
          )}
          {isPaymentRequired(paymentRequired) ? (
            <div className="flex justify-between items-center">
              <button
                onClick={() => {
                  clearPaymentRequired()
                  handleConfirm()
                }}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Retry after payment
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          ) : (
            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                disabled={isChanging || isUpdating}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={!canConfirm}
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
                  newType === 'retained'
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-purple-600 hover:bg-purple-700'
                }`}
              >
                {isChanging || isUpdating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    {isUpdating ? 'Saving Pricing...' : 'Changing...'}
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Confirm Change
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ChangeServiceTypeModal
