import { Plus, Trash2 } from 'lucide-react'
import type { OfferDetails, Benefit, Equity } from '@/types'

interface OfferFormProps {
  offerDetails: OfferDetails
  setOfferDetails: (details: OfferDetails) => void
}

const currencySymbols: Record<string, string> = {
  ZAR: 'R',
  USD: '$',
  EUR: '€',
  GBP: '£',
}

const formatCurrency = (amount: number, currency: string = 'ZAR') => {
  const symbol = currencySymbols[currency] || currency
  return `${symbol}${amount.toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

export default function OfferForm({ offerDetails, setOfferDetails }: OfferFormProps) {
  const benefits = offerDetails.benefits || []
  const equity = offerDetails.equity || null

  // Calculate totals for display
  const totalBenefitsCost = benefits.reduce((sum, b) => sum + (b.annual_cost || 0), 0)
  const year1EquityValue = equity && equity.shares && equity.share_value && equity.vesting_years
    ? (equity.shares * equity.share_value) / equity.vesting_years
    : 0
  const totalEquityValue = equity && equity.shares && equity.share_value
    ? equity.shares * equity.share_value
    : 0
  const annualSalary = offerDetails.annual_salary || 0
  const totalCostToCompany = annualSalary + totalBenefitsCost + year1EquityValue

  const addBenefit = () => {
    setOfferDetails({
      ...offerDetails,
      benefits: [...benefits, { name: '', annual_cost: 0 }],
    })
  }

  const updateBenefit = (index: number, field: keyof Benefit, value: string | number) => {
    const updated = [...benefits]
    updated[index] = { ...updated[index], [field]: value }
    setOfferDetails({ ...offerDetails, benefits: updated })
  }

  const removeBenefit = (index: number) => {
    setOfferDetails({
      ...offerDetails,
      benefits: benefits.filter((_, i) => i !== index),
    })
  }

  const updateEquity = (field: keyof Equity, value: number) => {
    if (!equity && value === 0) return
    setOfferDetails({
      ...offerDetails,
      equity: equity
        ? { ...equity, [field]: value }
        : { vesting_years: 4, shares: 0, share_value: 0, [field]: value },
    })
  }

  const clearEquity = () => {
    setOfferDetails({ ...offerDetails, equity: null })
  }

  const currencySymbol = currencySymbols[offerDetails.currency || 'ZAR']

  return (
    <div className="flex gap-6">
      {/* Left Column - Form Fields */}
      <div className="flex-1 space-y-4">
        {/* Salary & Currency */}
        <div>
          <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1">Annual Salary</label>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-gray-400 dark:text-gray-500">
                {currencySymbol}
              </span>
              <input
                type="number"
                value={offerDetails.annual_salary || ''}
                onChange={(e) => setOfferDetails({ ...offerDetails, annual_salary: e.target.value ? parseFloat(e.target.value) : null })}
                className="w-full pl-6 pr-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md text-[14px] bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100"
                placeholder="e.g., 600000"
              />
            </div>
            <select
              value={offerDetails.currency || 'ZAR'}
              onChange={(e) => setOfferDetails({ ...offerDetails, currency: e.target.value })}
              className="w-24 px-2 py-2 border border-gray-200 dark:border-gray-700 rounded-md text-[14px] bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100"
            >
              <option value="ZAR">ZAR</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
          </div>
        </div>

        {/* Start Date */}
        <div>
          <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
          <input
            type="date"
            value={offerDetails.start_date || ''}
            onChange={(e) => setOfferDetails({ ...offerDetails, start_date: e.target.value || null })}
            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md text-[14px] bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100"
          />
        </div>

        {/* Benefits */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300">Benefits</label>
            <button
              type="button"
              onClick={addBenefit}
              className="flex items-center gap-1 text-[12px] font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            >
              <Plus className="w-3.5 h-3.5" />
              Add
            </button>
          </div>
          {benefits.length === 0 ? (
            <p className="text-[12px] text-gray-400 dark:text-gray-500 italic py-1">No benefits added</p>
          ) : (
            <div className="space-y-1.5">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={benefit.name}
                    onChange={(e) => updateBenefit(index, 'name', e.target.value)}
                    className="flex-1 px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-md text-[13px] bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100"
                    placeholder="Benefit name"
                  />
                  <div className="relative w-28">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] text-gray-400 dark:text-gray-500">
                      {currencySymbol}
                    </span>
                    <input
                      type="number"
                      value={benefit.annual_cost || ''}
                      onChange={(e) => updateBenefit(index, 'annual_cost', parseFloat(e.target.value) || 0)}
                      className="w-full pl-5 pr-2 py-1.5 border border-gray-200 dark:border-gray-700 rounded-md text-[13px] bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100"
                      placeholder="Cost/yr"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeBenefit(index)}
                    className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Equity */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300">Equity</label>
            {equity && (
              <button
                type="button"
                onClick={clearEquity}
                className="text-[12px] font-medium text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
              >
                Clear
              </button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[11px] text-gray-500 dark:text-gray-400 mb-0.5">Shares</label>
              <input
                type="number"
                value={equity?.shares || ''}
                onChange={(e) => updateEquity('shares', parseInt(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-md text-[13px] bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100"
                placeholder="10000"
              />
            </div>
            <div>
              <label className="block text-[11px] text-gray-500 dark:text-gray-400 mb-0.5">Share Value</label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] text-gray-400 dark:text-gray-500">
                  {currencySymbol}
                </span>
                <input
                  type="number"
                  step="0.01"
                  value={equity?.share_value || ''}
                  onChange={(e) => updateEquity('share_value', parseFloat(e.target.value) || 0)}
                  className="w-full pl-5 pr-2 py-1.5 border border-gray-200 dark:border-gray-700 rounded-md text-[13px] bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100"
                  placeholder="10.50"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] text-gray-500 dark:text-gray-400 mb-0.5">Vesting (yrs)</label>
              <input
                type="number"
                min="1"
                max="10"
                value={equity?.vesting_years || ''}
                onChange={(e) => updateEquity('vesting_years', parseInt(e.target.value) || 4)}
                className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-md text-[13px] bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100"
                placeholder="4"
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
          <textarea
            value={offerDetails.notes || ''}
            onChange={(e) => setOfferDetails({ ...offerDetails, notes: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md text-[14px] bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 resize-none"
            placeholder="Additional notes..."
          />
        </div>
      </div>

      {/* Right Column - Cost Summary */}
      <div className="w-56 flex-shrink-0">
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 sticky top-0">
          <h4 className="text-[12px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Cost Summary</h4>

          <div className="space-y-2.5 text-[13px]">
            {/* Salary */}
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Salary</span>
              <span className={annualSalary > 0 ? 'text-gray-900 dark:text-gray-100 font-medium' : 'text-gray-400 dark:text-gray-500'}>
                {annualSalary > 0 ? formatCurrency(annualSalary, offerDetails.currency) : '—'}
              </span>
            </div>

            {/* Benefits */}
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Benefits</span>
              <span className={totalBenefitsCost > 0 ? 'text-gray-900 dark:text-gray-100 font-medium' : 'text-gray-400 dark:text-gray-500'}>
                {totalBenefitsCost > 0 ? formatCurrency(totalBenefitsCost, offerDetails.currency) : '—'}
              </span>
            </div>

            {/* Equity */}
            <div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Year 1 Equity</span>
                <span className={year1EquityValue > 0 ? 'text-gray-900 dark:text-gray-100 font-medium' : 'text-gray-400 dark:text-gray-500'}>
                  {year1EquityValue > 0 ? formatCurrency(year1EquityValue, offerDetails.currency) : '—'}
                </span>
              </div>
              {totalEquityValue > 0 && (
                <p className="text-[11px] text-gray-400 dark:text-gray-500 text-right mt-0.5">
                  Total: {formatCurrency(totalEquityValue, offerDetails.currency)} over {equity?.vesting_years || 4}yr
                </p>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-2.5 mt-2.5">
              <div className="flex justify-between">
                <span className="text-gray-900 dark:text-gray-100 font-semibold">Total CTC</span>
                <span className={totalCostToCompany > 0 ? 'text-gray-900 dark:text-gray-100 font-semibold' : 'text-gray-400 dark:text-gray-500'}>
                  {totalCostToCompany > 0 ? formatCurrency(totalCostToCompany, offerDetails.currency) : '—'}
                </span>
              </div>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                Year 1 cost to company
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Default empty offer details
export const getEmptyOfferDetails = (): OfferDetails => ({
  annual_salary: null,
  currency: 'ZAR',
  start_date: null,
  notes: '',
  benefits: [],
  equity: null,
})
