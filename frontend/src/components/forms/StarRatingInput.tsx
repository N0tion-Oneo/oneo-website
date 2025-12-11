import { useState } from 'react'

interface StarRatingInputProps {
  value: number | null
  onChange: (value: number) => void
  maxStars?: number
  size?: 'sm' | 'md' | 'lg'
  readOnly?: boolean
  showValue?: boolean
  label?: string
}

export default function StarRatingInput({
  value,
  onChange,
  maxStars = 5,
  size = 'md',
  readOnly = false,
  showValue = false,
  label,
}: StarRatingInputProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null)

  const displayValue = hoverValue ?? value ?? 0

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  }

  const gapClasses = {
    sm: 'gap-0.5',
    md: 'gap-1',
    lg: 'gap-1.5',
  }

  return (
    <div className="flex flex-col">
      {label && (
        <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
          {label}
        </label>
      )}
      <div className={`flex items-center ${gapClasses[size]}`}>
        {Array.from({ length: maxStars }, (_, i) => i + 1).map((starValue) => (
          <button
            key={starValue}
            type="button"
            onClick={() => !readOnly && onChange(starValue)}
            onMouseEnter={() => !readOnly && setHoverValue(starValue)}
            onMouseLeave={() => !readOnly && setHoverValue(null)}
            disabled={readOnly}
            className={`${
              readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110'
            } transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 focus-visible:ring-offset-1 rounded`}
            aria-label={`Rate ${starValue} out of ${maxStars} stars`}
          >
            <svg
              className={`${sizeClasses[size]} ${
                starValue <= displayValue
                  ? 'text-yellow-400 fill-current'
                  : 'text-gray-300'
              } transition-colors`}
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={starValue <= displayValue ? 0 : 1.5}
              fill={starValue <= displayValue ? 'currentColor' : 'none'}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
              />
            </svg>
          </button>
        ))}
        {showValue && value !== null && (
          <span className="ml-1.5 text-[13px] text-gray-600 font-medium">
            {value}/{maxStars}
          </span>
        )}
      </div>
    </div>
  )
}

// Read-only star display for showing scores
export function StarRatingDisplay({
  value,
  maxStars = 5,
  size = 'sm',
  showValue = true,
}: {
  value: number | null
  maxStars?: number
  size?: 'sm' | 'md' | 'lg'
  showValue?: boolean
}) {
  const displayValue = value ?? 0

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  }

  const gapClasses = {
    sm: 'gap-0.5',
    md: 'gap-1',
    lg: 'gap-1.5',
  }

  return (
    <div className={`flex items-center ${gapClasses[size]}`}>
      {Array.from({ length: maxStars }, (_, i) => i + 1).map((starValue) => (
        <svg
          key={starValue}
          className={`${sizeClasses[size]} ${
            starValue <= displayValue
              ? 'text-yellow-400 fill-current'
              : 'text-gray-300'
          }`}
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={starValue <= displayValue ? 0 : 1.5}
          fill={starValue <= displayValue ? 'currentColor' : 'none'}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
          />
        </svg>
      ))}
      {showValue && value !== null && (
        <span className="ml-1 text-[13px] text-gray-600">
          {typeof value === 'number' && !Number.isInteger(value) ? value.toFixed(1) : value}
        </span>
      )}
    </div>
  )
}
