import type { EffectivePricing, InvoiceListItem } from '@/hooks'

interface QuickStatsProps {
  serviceType: 'retained' | 'headhunting'
  pricing: EffectivePricing | null
  invoices: InvoiceListItem[]
  compact?: boolean
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

export function QuickStats({
  serviceType,
  pricing,
  invoices,
  compact = false,
}: QuickStatsProps) {
  const isRetained = serviceType === 'retained'
  const openInvoices = invoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled').length

  return (
    <div className={`grid grid-cols-2 ${compact ? 'gap-3' : 'gap-4'}`}>
      {isRetained ? (
        <div className={`bg-white border border-gray-200 rounded-lg ${compact ? 'p-3' : 'p-4'}`}>
          <p className={`${compact ? 'text-xs' : 'text-xs'} text-gray-500 mb-1`}>Monthly Retainer</p>
          <p className={`${compact ? 'text-base' : 'text-lg'} font-semibold text-gray-900`}>
            {pricing ? formatCurrency(pricing.monthly_retainer) : '-'}
          </p>
        </div>
      ) : (
        <div className={`bg-white border border-gray-200 rounded-lg ${compact ? 'p-3' : 'p-4'}`}>
          <p className={`${compact ? 'text-xs' : 'text-xs'} text-gray-500 mb-1`}>Placement Fee</p>
          <p className={`${compact ? 'text-base' : 'text-lg'} font-semibold text-gray-900`}>
            {pricing ? `${(parseFloat(pricing.placement_fee) * 100).toFixed(0)}%` : '-'}
          </p>
        </div>
      )}
      <div className={`bg-white border border-gray-200 rounded-lg ${compact ? 'p-3' : 'p-4'}`}>
        <p className={`${compact ? 'text-xs' : 'text-xs'} text-gray-500 mb-1`}>Open Invoices</p>
        <p className={`${compact ? 'text-base' : 'text-lg'} font-semibold text-gray-900`}>
          {openInvoices}
        </p>
      </div>
    </div>
  )
}
