import { useState, useEffect, useCallback, useMemo } from 'react'
import api from '@/services/api'

// ============================================================================
// Types
// ============================================================================

export interface CompanyFeature {
  id: string
  slug: string
  name: string
  category: string
}

export interface CompanyFeaturesResponse {
  service_type: 'headhunting' | 'retained' | null
  service_type_display: string | null
  features: CompanyFeature[]
}

// ============================================================================
// useCompanyFeatures Hook
// ============================================================================

interface UseCompanyFeaturesReturn {
  serviceType: 'headhunting' | 'retained' | null
  serviceTypeDisplay: string | null
  features: CompanyFeature[]
  featureSlugs: string[]
  /** @deprecated Use hasFeature with slug instead */
  featureNames: string[]
  /** Check if company has a feature by its slug (e.g., 'talent-directory') */
  hasFeature: (featureSlug: string) => boolean
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useCompanyFeatures(): UseCompanyFeaturesReturn {
  const [data, setData] = useState<CompanyFeaturesResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchFeatures = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get<CompanyFeaturesResponse>('/companies/my/features/')
      setData(response.data)
    } catch (err) {
      const axiosError = err as {
        response?: {
          status?: number
          data?: { error?: string; error_code?: string }
        }
      }
      // 404 is expected if user has no company - not an error
      if (axiosError.response?.status === 404) {
        setData({
          service_type: null,
          service_type_display: null,
          features: [],
        })
      } else if (
        axiosError.response?.status === 403 &&
        axiosError.response?.data?.error_code === 'subscription_blocked'
      ) {
        // Subscription blocked - don't show as error, SubscriptionContext handles this
        setData({
          service_type: null,
          service_type_display: null,
          features: [],
        })
      } else {
        setError(axiosError.response?.data?.error || 'Failed to load company features')
        console.error('Error fetching company features:', err)
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFeatures()
  }, [fetchFeatures])

  const featureSlugs = useMemo(() => {
    return data?.features.map((f) => f.slug) || []
  }, [data?.features])

  // Deprecated: use featureSlugs instead
  const featureNames = useMemo(() => {
    return data?.features.map((f) => f.name) || []
  }, [data?.features])

  const hasFeature = useCallback(
    (featureSlug: string): boolean => {
      return featureSlugs.includes(featureSlug)
    },
    [featureSlugs]
  )

  return {
    serviceType: data?.service_type || null,
    serviceTypeDisplay: data?.service_type_display || null,
    features: data?.features || [],
    featureSlugs,
    featureNames,
    hasFeature,
    isLoading,
    error,
    refetch: fetchFeatures,
  }
}

// ============================================================================
// useHasFeature Hook (convenience hook for single feature checks)
// ============================================================================

export function useHasFeature(featureName: string): boolean {
  const { hasFeature } = useCompanyFeatures()
  return hasFeature(featureName)
}

// ============================================================================
// useServiceType Hook (convenience hook for service type only)
// ============================================================================

interface UseServiceTypeReturn {
  serviceType: 'headhunting' | 'retained' | null
  serviceTypeDisplay: string | null
  isHeadhunting: boolean
  isRetained: boolean
  isLoading: boolean
}

export function useServiceType(): UseServiceTypeReturn {
  const { serviceType, serviceTypeDisplay, isLoading } = useCompanyFeatures()

  return {
    serviceType,
    serviceTypeDisplay,
    isHeadhunting: serviceType === 'headhunting',
    isRetained: serviceType === 'retained',
    isLoading,
  }
}
