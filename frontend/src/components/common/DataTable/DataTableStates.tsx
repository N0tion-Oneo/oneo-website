import type { LoadingStateProps, ErrorStateProps, EmptyStateProps } from './types'

export function LoadingState({ message = 'Loading...' }: LoadingStateProps) {
  return (
    <div className="text-center py-12">
      <p className="text-[14px] text-gray-500 dark:text-gray-400">{message}</p>
    </div>
  )
}

export function ErrorState({ message }: ErrorStateProps) {
  return (
    <div className="text-center py-12">
      <p className="text-[14px] text-red-500 dark:text-red-400">{message}</p>
    </div>
  )
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
      {icon && (
        <div className="flex justify-center mb-4">
          {icon}
        </div>
      )}
      <p className="text-[15px] text-gray-700 dark:text-gray-300 mb-1">{title}</p>
      <p className="text-[13px] text-gray-500 dark:text-gray-400">{description}</p>
      {action && (
        <div className="mt-4">
          {action}
        </div>
      )}
    </div>
  )
}
