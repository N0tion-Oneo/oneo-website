import { ReplacementStatus } from '@/types'

interface ReplacementStatusBadgeProps {
  status: ReplacementStatus
  /** For APPROVED_FREE: credit percentage. For APPROVED_DISCOUNTED: discount percentage */
  discountPercentage?: number | null
  size?: 'sm' | 'md'
}

const statusConfig: Record<ReplacementStatus, { label: string; className: string }> = {
  [ReplacementStatus.PENDING]: {
    label: 'Pending Review',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
  [ReplacementStatus.APPROVED_FREE]: {
    label: 'Approved',
    className: 'bg-green-100 text-green-800 border-green-200',
  },
  [ReplacementStatus.APPROVED_DISCOUNTED]: {
    label: 'Approved',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  [ReplacementStatus.REJECTED]: {
    label: 'Rejected',
    className: 'bg-red-100 text-red-800 border-red-200',
  },
}

export default function ReplacementStatusBadge({
  status,
  discountPercentage,
  size = 'sm',
}: ReplacementStatusBadgeProps) {
  const config = statusConfig[status]

  if (!config) {
    return null
  }

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-[12px]'

  let label = config.label

  // Show percentage in badge for approved statuses
  if (status === ReplacementStatus.APPROVED_FREE) {
    const creditPct = discountPercentage || 100
    label = creditPct === 100 ? 'Approved (100% Credit)' : `Approved (${creditPct}% Credit)`
  } else if (status === ReplacementStatus.APPROVED_DISCOUNTED && discountPercentage) {
    label = `Approved (${discountPercentage}% Discount)`
  }

  return (
    <span
      className={`inline-flex items-center font-medium border rounded-full ${config.className} ${sizeClasses}`}
    >
      {label}
    </span>
  )
}
