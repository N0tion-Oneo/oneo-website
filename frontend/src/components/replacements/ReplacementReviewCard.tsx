/**
 * ReplacementReviewCard - Shared component for reviewing replacement requests
 * Used in both SubscriptionDrawer and ApplicationDrawer
 */

import { useState } from 'react'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'
import type { ReplacementRequest } from '@/types'
import ReplacementStatusBadge from './ReplacementStatusBadge'

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

interface ReplacementReviewCardProps {
  request: ReplacementRequest
  onApprove?: (type: 'free' | 'discounted', discount?: number) => Promise<void>
  onReject?: (notes?: string) => Promise<void>
  isApproving?: boolean
  isRejecting?: boolean
  /** Whether the current user can review (approve/reject) this request */
  canReview?: boolean
}

export default function ReplacementReviewCard({
  request,
  onApprove,
  onReject,
  isApproving = false,
  isRejecting = false,
  canReview = false,
}: ReplacementReviewCardProps) {
  const [showActions, setShowActions] = useState(false)
  const [approvalType, setApprovalType] = useState<'free' | 'discounted'>('free')
  const [creditPercentage, setCreditPercentage] = useState('100')
  const [discountPercentage, setDiscountPercentage] = useState('50')

  const handleApprove = async () => {
    if (!onApprove) return
    await onApprove(
      approvalType,
      approvalType === 'free' ? parseInt(creditPercentage) : parseInt(discountPercentage)
    )
    setShowActions(false)
  }

  const handleReject = async () => {
    if (!onReject) return
    await onReject()
    setShowActions(false)
  }

  const isPending = request.status === 'pending'

  // Extract original salary and invoiced amount if available
  const originalSalary = request.original_offer_details?.annual_salary as number | undefined
  const originalInvoicedAmount = request.original_invoiced_amount

  // Calculate credit value - use invoiced amount if available, otherwise estimate from salary
  const creditPercentageValue = request.discount_percentage || 100
  const creditValue = originalInvoicedAmount
    ? originalInvoicedAmount * (creditPercentageValue / 100)
    : null

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-900">{request.candidate_name}</p>
            <ReplacementStatusBadge status={request.status} discountPercentage={request.discount_percentage} />
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {request.job_title} &middot; Requested {formatDate(request.requested_at || request.created_at)}
          </p>
          <div className="mt-2">
            <p className="text-xs font-medium text-gray-600">
              {request.reason_category_display || request.reason_category}
            </p>
            {request.reason_details && (
              <p className="text-xs text-gray-500 mt-0.5">{request.reason_details}</p>
            )}
          </div>
          {/* Original placement info */}
          {(originalSalary || originalInvoicedAmount) && (
            <div className="mt-2 pt-2 border-t border-gray-100 space-y-0.5">
              {originalSalary && (
                <p className="text-xs text-gray-500">
                  <span className="font-medium">Original salary:</span>{' '}
                  {formatCurrency(originalSalary)}
                </p>
              )}
              {originalInvoicedAmount && (
                <p className="text-xs text-gray-500">
                  <span className="font-medium">Original fee (ex VAT):</span>{' '}
                  {formatCurrency(originalInvoicedAmount)}
                </p>
              )}
            </div>
          )}
        </div>
        {canReview && isPending && (
          <button
            onClick={() => setShowActions(!showActions)}
            className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
          >
            Review
          </button>
        )}
      </div>

      {canReview && showActions && isPending && (
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
          <div>
            <p className="text-xs font-medium text-gray-700 mb-2">Approval Type</p>
            <div className="flex gap-2">
              <label className={`flex-1 flex items-center gap-2 p-3 border rounded-lg cursor-pointer ${
                approvalType === 'free' ? 'border-green-500 bg-green-50' : 'border-gray-200'
              }`}>
                <input
                  type="radio"
                  name="approvalType"
                  value="free"
                  checked={approvalType === 'free'}
                  onChange={() => setApprovalType('free')}
                  className="w-4 h-4 text-green-600"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">Credit Original Fee</p>
                  <p className="text-xs text-gray-500">Waive up to original placement fee value</p>
                </div>
              </label>
              <label className={`flex-1 flex items-center gap-2 p-3 border rounded-lg cursor-pointer ${
                approvalType === 'discounted' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}>
                <input
                  type="radio"
                  name="approvalType"
                  value="discounted"
                  checked={approvalType === 'discounted'}
                  onChange={() => setApprovalType('discounted')}
                  className="w-4 h-4 text-blue-600"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">Discounted</p>
                  <p className="text-xs text-gray-500">Percentage discount on new placement</p>
                </div>
              </label>
            </div>
          </div>

          {/* Credit percentage input */}
          {approvalType === 'free' && (
            <div className="space-y-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Credit Percentage
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={creditPercentage}
                    onChange={(e) => setCreditPercentage(e.target.value)}
                    className="w-20 px-2 py-1.5 text-sm border border-gray-200 rounded-md"
                  />
                  <span className="text-sm text-gray-500">% of original fee credited</span>
                </div>
              </div>
              <div className="p-2.5 bg-gray-50 rounded-md">
                <p className="text-xs text-gray-600">
                  <strong>How it works:</strong> {creditPercentage}% of the original placement fee is credited toward the replacement. Any remaining balance will be invoiced.
                </p>
              </div>
            </div>
          )}

          {approvalType === 'discounted' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Discount Percentage
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="99"
                  value={discountPercentage}
                  onChange={(e) => setDiscountPercentage(e.target.value)}
                  className="w-20 px-2 py-1.5 text-sm border border-gray-200 rounded-md"
                />
                <span className="text-sm text-gray-500">% off the new placement fee</span>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleApprove}
              disabled={isApproving}
              className="flex-1 px-3 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {isApproving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              Approve
            </button>
            <button
              onClick={handleReject}
              disabled={isRejecting}
              className="flex-1 px-3 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {isRejecting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
              Reject
            </button>
            <button
              onClick={() => setShowActions(false)}
              className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Detailed value breakdown for approved requests */}
      {request.status === 'approved_free' && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="p-3 bg-green-50 rounded-lg space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <p className="text-sm font-medium text-green-800">Replacement Credit Approved</p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-white/60 rounded p-2">
                <p className="text-green-600 font-medium">Credit Percentage</p>
                <p className="text-green-900 text-sm font-semibold">{creditPercentageValue}%</p>
              </div>
              {creditValue && (
                <div className="bg-white/60 rounded p-2">
                  <p className="text-green-600 font-medium">Credit Value</p>
                  <p className="text-green-900 text-sm font-semibold">
                    {formatCurrency(creditValue)}
                  </p>
                </div>
              )}
            </div>

            <p className="text-xs text-green-700">
              {creditPercentageValue === 100
                ? 'Your original placement fee will be fully credited toward your replacement hire. You will only be invoiced if the replacement candidate has a higher total cost to company.'
                : `${creditPercentageValue}% of your original placement fee ${creditValue ? `(${formatCurrency(creditValue)})` : ''} will be credited toward your replacement hire. Any remaining balance will be invoiced.`}
            </p>
          </div>
        </div>
      )}

      {request.status === 'approved_discounted' && request.discount_percentage && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="p-3 bg-blue-50 rounded-lg space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-sm font-medium text-blue-800">Discounted Replacement Approved</p>
            </div>

            <div className="bg-white/60 rounded p-2 inline-block">
              <p className="text-blue-600 font-medium text-xs">Discount on New Placement</p>
              <p className="text-blue-900 text-lg font-semibold">{request.discount_percentage}% off</p>
            </div>

            <p className="text-xs text-blue-700">
              A {request.discount_percentage}% discount will be applied to your replacement placement fee. This discount is calculated on the new candidate's total cost to company.
            </p>
          </div>
        </div>
      )}

      {request.status === 'pending' && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="p-3 bg-amber-50 rounded-lg">
            <p className="text-xs text-amber-700">
              <span className="font-medium">Under Review:</span> Your replacement request is being reviewed by our team. Once approved, we will begin sourcing replacement candidates and you'll receive details about the pricing arrangement.
            </p>
          </div>
        </div>
      )}

      {request.status === 'rejected' && request.review_notes && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            <span className="font-medium">Rejection reason:</span> {request.review_notes}
          </p>
        </div>
      )}
    </div>
  )
}
