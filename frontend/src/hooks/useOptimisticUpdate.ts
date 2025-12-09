import { useCallback } from 'react'
import { useToast } from '@/contexts/ToastContext'

interface OptimisticUpdateOptions<T> {
  // Current state array
  items: T[]
  // State setter
  setItems: React.Dispatch<React.SetStateAction<T[]>>
  // Function to identify the item (returns true if match)
  findItem: (item: T) => boolean
  // Function to update the item
  updateItem: (item: T) => T
  // API call to sync with server
  apiCall: () => Promise<unknown>
  // Success message (optional - if not provided, no toast shown on success)
  successMessage?: string
  // Error message
  errorMessage?: string
}

/**
 * Hook for performing optimistic updates with automatic rollback and toast notifications
 */
export function useOptimisticUpdate() {
  const { showSuccess, showError } = useToast()

  const performUpdate = useCallback(<T>(options: OptimisticUpdateOptions<T>) => {
    const {
      items,
      setItems,
      findItem,
      updateItem,
      apiCall,
      successMessage,
      errorMessage = 'Update failed',
    } = options

    // Save previous state for rollback
    const previousState = [...items]

    // Optimistic update
    setItems((prev) => prev.map((item) => (findItem(item) ? updateItem(item) : item)))

    // Sync with server
    apiCall()
      .then(() => {
        if (successMessage) {
          showSuccess(successMessage)
        }
      })
      .catch((err) => {
        // Rollback on error
        setItems(previousState)
        showError(errorMessage)
        console.error(errorMessage, err)
      })
  }, [showSuccess, showError])

  return { performUpdate }
}

/**
 * Simplified hook specifically for updating assigned users
 */
export function useAssignedUpdate<T extends { id: string } | { slug: string }>() {
  const { showError } = useToast()

  const updateAssigned = useCallback(<TItem extends T>(
    items: TItem[],
    setItems: React.Dispatch<React.SetStateAction<TItem[]>>,
    itemId: string,
    idField: 'id' | 'slug',
    assignedField: string,
    newValue: unknown,
    apiCall: () => Promise<unknown>,
  ) => {
    // Save previous state for rollback
    const previousState = [...items]

    // Optimistic update
    setItems((prev) =>
      prev.map((item) =>
        (item as Record<string, unknown>)[idField] === itemId
          ? { ...item, [assignedField]: newValue }
          : item
      )
    )

    // Sync with server (silent success, toast on error)
    apiCall().catch((err) => {
      setItems(previousState)
      showError('Failed to update assignment')
      console.error('Failed to update assignment:', err)
    })
  }, [showError])

  return { updateAssigned }
}
