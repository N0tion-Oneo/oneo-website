/**
 * Invoice Detail Drawer Component
 *
 * Displays detailed invoice information in a side drawer,
 * including line items, payment history, and actions.
 */

import { useState } from 'react'
import {
  X,
  Send,
  DollarSign,
  CheckCircle,
} from 'lucide-react'
import {
  useInvoice,
  useInvoicePayments,
  useSendInvoice,
  useCancelInvoice,
  useRecordPayment,
} from '@/hooks'
import type {
  Invoice,
  InvoiceLineItem,
  InvoiceStatus,
  Payment,
  PaymentMethod,
} from '@/hooks'

interface InvoiceDetailDrawerProps {
  invoiceId: string
  onClose: () => void
  onUpdated?: () => void
  isAdmin?: boolean  // Whether user can perform actions (send, record payment, cancel)
}

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

// Invoice status badge
function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const configs: Record<InvoiceStatus, { bg: string; text: string }> = {
    draft: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-600 dark:text-gray-300' },
    sent: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300' },
    paid: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300' },
    overdue: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300' },
    cancelled: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-500 dark:text-gray-400' },
    partially_paid: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300' },
  }
  const config = configs[status]
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

// Record Payment Modal
function RecordPaymentModal({
  invoice,
  onClose,
  onRecorded,
}: {
  invoice: Invoice
  onClose: () => void
  onRecorded: () => void
}) {
  const { recordPayment, isRecording } = useRecordPayment()
  const [amount, setAmount] = useState(invoice.balance_due)
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank_transfer')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [notes, setNotes] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await recordPayment(invoice.id, {
        amount,
        payment_date: paymentDate,
        payment_method: paymentMethod,
        reference_number: referenceNumber,
        notes,
      })
      onRecorded()
    } catch (err) {
      console.error('Failed to record payment:', err)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-[210] bg-black/50 dark:bg-black/70" onClick={onClose} />
      <div className="fixed inset-0 z-[211] flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl dark:shadow-gray-900/50 w-full max-w-md">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Record Payment</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {invoice.invoice_number} • Balance: {formatCurrency(invoice.balance_due)}
            </p>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount</label>
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Date</label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100"
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reference Number</label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100"
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100"
                placeholder="Optional"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={isRecording}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {isRecording ? 'Recording...' : 'Record Payment'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

export default function InvoiceDetailDrawer({
  invoiceId,
  onClose,
  onUpdated,
  isAdmin = true,
}: InvoiceDetailDrawerProps) {
  const { invoice, isLoading, refetch } = useInvoice(invoiceId)
  const { payments, isLoading: paymentsLoading, refetch: refetchPayments } = useInvoicePayments(invoiceId)
  const { sendInvoice, isSending } = useSendInvoice()
  const { cancelInvoice, isCancelling } = useCancelInvoice()
  const [showPaymentModal, setShowPaymentModal] = useState(false)

  const handleSend = async () => {
    try {
      await sendInvoice(invoiceId)
      refetch()
      onUpdated?.()
    } catch (err) {
      console.error('Failed to send invoice:', err)
    }
  }

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this invoice?')) return
    try {
      await cancelInvoice(invoiceId)
      refetch()
      onUpdated?.()
    } catch (err) {
      console.error('Failed to cancel invoice:', err)
    }
  }

  const handlePaymentRecorded = () => {
    refetch()
    refetchPayments()
    onUpdated?.()
    setShowPaymentModal(false)
  }

  if (isLoading || !invoice) {
    return (
      <>
        <div className="fixed inset-0 z-[200] bg-black/30 dark:bg-black/50" onClick={onClose} />
        <div className="fixed right-0 top-0 bottom-0 z-[201] w-full max-w-2xl bg-white dark:bg-gray-900 shadow-xl dark:shadow-gray-900/50 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-gray-300 dark:border-gray-600 border-t-gray-900 dark:border-t-gray-100 rounded-full" />
        </div>
      </>
    )
  }

  return (
    <>
      <div className="fixed inset-0 z-[200] bg-black/30 dark:bg-black/50" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-[201] w-full max-w-2xl bg-white dark:bg-gray-900 shadow-xl dark:shadow-gray-900/50 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{invoice.invoice_number}</h2>
              <div className="flex items-center gap-2 mt-1">
                <InvoiceStatusBadge status={invoice.status} />
                <span className="text-sm text-gray-500 dark:text-gray-400">{invoice.company_name}</span>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Invoice Summary */}
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Invoice Date</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{formatDate(invoice.invoice_date)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Due Date</p>
                <p className={`text-sm font-medium ${
                  new Date(invoice.due_date) < new Date() && invoice.status !== 'paid' ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'
                }`}>
                  {formatDate(invoice.due_date)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Type</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">{invoice.invoice_type_display}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Billing Period</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {invoice.billing_period_start && invoice.billing_period_end
                    ? `${formatDate(invoice.billing_period_start)} - ${formatDate(invoice.billing_period_end)}`
                    : '-'}
                </p>
              </div>
            </div>
            {invoice.description && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Description</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{invoice.description}</p>
              </div>
            )}
          </div>

          {/* Placement Info (for placement invoices) */}
          {invoice.placement_info && (
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-purple-900 dark:text-purple-100 mb-3">Placement Details</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs text-purple-600 dark:text-purple-400">Candidate</p>
                  <p className="text-sm font-medium text-purple-900 dark:text-purple-100">{invoice.placement_info.candidate_name}</p>
                </div>
                <div>
                  <p className="text-xs text-purple-600 dark:text-purple-400">Position</p>
                  <p className="text-sm font-medium text-purple-900 dark:text-purple-100">
                    {invoice.placement_info.job_title}
                    {invoice.placement_info.is_csuite && (
                      <span className="ml-2 px-2 py-0.5 text-xs bg-purple-200 dark:bg-purple-700 text-purple-800 dark:text-purple-200 rounded">C-Suite</span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-purple-600 dark:text-purple-400">Offer Accepted</p>
                  <p className="text-sm font-medium text-purple-900 dark:text-purple-100">
                    {formatDate(invoice.placement_info.offer_accepted_at)}
                  </p>
                </div>
                {invoice.placement_info.start_date && (
                  <div>
                    <p className="text-xs text-purple-600 dark:text-purple-400">Start Date</p>
                    <p className="text-sm font-medium text-purple-900 dark:text-purple-100">
                      {formatDate(invoice.placement_info.start_date)}
                    </p>
                  </div>
                )}
              </div>

              {/* Offer Breakdown */}
              <div className="border-t border-purple-200 dark:border-purple-800 pt-3 mt-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase">Offer Breakdown</h4>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                    invoice.placement_info.is_csuite
                      ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300'
                      : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                  }`}>
                    {invoice.placement_info.is_csuite ? 'C-Suite Placement' : 'Standard Placement'}
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-purple-700 dark:text-purple-300">Annual Salary</span>
                    <span className="font-medium text-purple-900 dark:text-purple-100">
                      {invoice.placement_info.annual_salary
                        ? `${invoice.placement_info.offer_currency} ${formatCurrency(invoice.placement_info.annual_salary)}`
                        : '—'}
                    </span>
                  </div>

                  {/* Benefits */}
                  {invoice.placement_info.benefits && invoice.placement_info.benefits.length > 0 && (
                    <div>
                      <div className="flex justify-between">
                        <span className="text-purple-700 dark:text-purple-300">Benefits</span>
                        <span className="font-medium text-purple-900 dark:text-purple-100">
                          {invoice.placement_info.offer_currency} {formatCurrency(invoice.placement_info.total_benefits_cost || 0)}
                        </span>
                      </div>
                      <div className="ml-4 mt-1 space-y-0.5">
                        {invoice.placement_info.benefits.map((benefit: { name: string; annual_cost: number }, idx: number) => (
                          <div key={idx} className="flex justify-between text-xs text-purple-600 dark:text-purple-400">
                            <span>{benefit.name}</span>
                            <span>{invoice.placement_info!.offer_currency} {formatCurrency(benefit.annual_cost)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Equity */}
                  {invoice.placement_info.equity && (
                    <div>
                      <div className="flex justify-between">
                        <span className="text-purple-700 dark:text-purple-300">Year 1 Equity Value</span>
                        <span className="font-medium text-purple-900 dark:text-purple-100">
                          {invoice.placement_info.offer_currency} {formatCurrency(invoice.placement_info.year_1_equity_value || 0)}
                        </span>
                      </div>
                      <div className="ml-4 mt-1 text-xs text-purple-600 dark:text-purple-400">
                        {invoice.placement_info.equity.shares?.toLocaleString()} shares @ {invoice.placement_info.offer_currency} {invoice.placement_info.equity.share_value} over {invoice.placement_info.equity.vesting_years} years
                      </div>
                    </div>
                  )}

                  {/* Total */}
                  <div className="flex justify-between pt-2 border-t border-purple-200 dark:border-purple-800">
                    <span className="font-semibold text-purple-800 dark:text-purple-200">Total Cost to Company</span>
                    <span className="font-bold text-purple-900 dark:text-purple-100">
                      {invoice.placement_info.offer_currency} {formatCurrency(invoice.placement_info.total_cost_to_company || 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {invoice.placement_info.notes && (
                <div className="border-t border-purple-200 dark:border-purple-800 pt-3 mt-3">
                  <p className="text-xs text-purple-600 dark:text-purple-400 mb-1">Notes</p>
                  <p className="text-sm text-purple-800 dark:text-purple-200">{invoice.placement_info.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Line Items */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Line Items</h3>
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Description</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Qty</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Price</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {invoice.line_items.map((item: InvoiceLineItem) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{item.description}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-right">{item.quantity}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-right">{formatCurrency(item.unit_price)}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100 text-right">{formatCurrency(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <td colSpan={3} className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 text-right">Subtotal</td>
                    <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-gray-100 text-right">{formatCurrency(invoice.subtotal)}</td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 text-right">VAT ({(parseFloat(invoice.vat_rate) * 100).toFixed(0)}%)</td>
                    <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-gray-100 text-right">{formatCurrency(invoice.vat_amount)}</td>
                  </tr>
                  <tr className="border-t-2 border-gray-300 dark:border-gray-600">
                    <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100 text-right">Total</td>
                    <td className="px-4 py-3 text-lg font-bold text-gray-900 dark:text-gray-100 text-right">{formatCurrency(invoice.total_amount)}</td>
                  </tr>
                  {parseFloat(invoice.amount_paid) > 0 && (
                    <>
                      <tr>
                        <td colSpan={3} className="px-4 py-2 text-sm text-green-600 dark:text-green-400 text-right">Amount Paid</td>
                        <td className="px-4 py-2 text-sm font-medium text-green-600 dark:text-green-400 text-right">-{formatCurrency(invoice.amount_paid)}</td>
                      </tr>
                      <tr>
                        <td colSpan={3} className="px-4 py-2 text-sm font-semibold text-gray-900 dark:text-gray-100 text-right">Balance Due</td>
                        <td className="px-4 py-2 text-sm font-bold text-red-600 dark:text-red-400 text-right">{formatCurrency(invoice.balance_due)}</td>
                      </tr>
                    </>
                  )}
                </tfoot>
              </table>
            </div>
          </div>

          {/* Payment History */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Payment History</h3>
            {paymentsLoading ? (
              <div className="animate-pulse h-20 bg-gray-100 dark:bg-gray-800 rounded-lg" />
            ) : payments.length === 0 ? (
              <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                No payments recorded yet
              </div>
            ) : (
              <div className="space-y-2">
                {payments.map((payment: Payment) => (
                  <div key={payment.id} className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{formatCurrency(payment.amount)}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(payment.payment_date)} • {payment.payment_method.replace('_', ' ')}
                        {payment.reference_number && ` • Ref: ${payment.reference_number}`}
                      </p>
                    </div>
                    <CheckCircle className="w-5 h-5 text-green-500 dark:text-green-400" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Internal Notes - Only visible to admins */}
          {isAdmin && invoice.internal_notes && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Internal Notes</h3>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">{invoice.internal_notes}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions - only show when there are actions available */}
        {isAdmin && invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
          <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-6 py-4">
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
              <button
                onClick={handleCancel}
                disabled={isCancelling}
                className="px-4 py-2 text-sm font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200 disabled:opacity-50"
              >
                {isCancelling ? 'Cancelling...' : 'Cancel Invoice'}
              </button>
            </div>
          </div>
        )}
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
