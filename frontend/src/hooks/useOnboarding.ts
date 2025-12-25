import { useState, useEffect, useCallback } from 'react'
import {
  getOnboardingStatus,
  completeOnboardingStep,
  skipOnboardingStep,
  type OnboardingStatus,
  type OnboardingProfileStepData,
  type OnboardingBillingStepData,
  type OnboardingContractStepData,
} from '@/services/api'

// =============================================================================
// Types
// =============================================================================

export type OnboardingStep = 'profile' | 'billing' | 'contract' | 'team' | 'booking'

export interface UseOnboardingReturn {
  status: OnboardingStatus | null
  isLoading: boolean
  error: string | null
  isSubmitting: boolean
  completeStep: (
    step: OnboardingStep,
    data: OnboardingProfileStepData | OnboardingBillingStepData | OnboardingContractStepData | Record<string, unknown>
  ) => Promise<OnboardingStatus | null>
  skipStep: (step: OnboardingStep) => Promise<OnboardingStatus | null>
  refetch: () => Promise<void>
}

// =============================================================================
// Hook
// =============================================================================

export function useOnboarding(): UseOnboardingReturn {
  const [status, setStatus] = useState<OnboardingStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchStatus = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await getOnboardingStatus()
      setStatus(data)
    } catch (err) {
      // Don't set error for non-client users (they get 400)
      const errorMessage = err instanceof Error ? err.message : 'Failed to load onboarding status'
      if (!errorMessage.includes('Only client users')) {
        setError(errorMessage)
      }
      setStatus(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const completeStep = useCallback(
    async (
      step: OnboardingStep,
      data: OnboardingProfileStepData | OnboardingBillingStepData | OnboardingContractStepData | Record<string, unknown>
    ): Promise<OnboardingStatus | null> => {
      try {
        setIsSubmitting(true)
        setError(null)
        const updatedStatus = await completeOnboardingStep(step, data)
        setStatus(updatedStatus)
        return updatedStatus
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to complete step'
        setError(errorMessage)
        return null
      } finally {
        setIsSubmitting(false)
      }
    },
    []
  )

  const skipStepFn = useCallback(async (step: OnboardingStep): Promise<OnboardingStatus | null> => {
    try {
      setIsSubmitting(true)
      setError(null)
      const updatedStatus = await skipOnboardingStep(step)
      setStatus(updatedStatus)
      return updatedStatus
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to skip step'
      setError(errorMessage)
      return null
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  return {
    status,
    isLoading,
    error,
    isSubmitting,
    completeStep,
    skipStep: skipStepFn,
    refetch: fetchStatus,
  }
}
