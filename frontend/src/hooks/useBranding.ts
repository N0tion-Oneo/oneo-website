import { useState, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import api, { getMediaUrl } from '@/services/api'
import type { BrandingSettings, BrandingSettingsUpdate, PublicBranding } from '@/types'

// ============================================================================
// Query Keys
// ============================================================================

export const brandingKeys = {
  all: ['branding'] as const,
  public: () => [...brandingKeys.all, 'public'] as const,
  settings: () => [...brandingKeys.all, 'settings'] as const,
  platformCompany: () => [...brandingKeys.all, 'platformCompany'] as const,
}

// ============================================================================
// API Functions
// ============================================================================

async function fetchPublicBranding(): Promise<PublicBranding> {
  const response = await api.get<PublicBranding>('/branding/public/')
  const data = response.data

  // Convert relative media URLs to absolute URLs
  return {
    ...data,
    logo_url: getMediaUrl(data.logo_url),
    logo_dark_url: getMediaUrl(data.logo_dark_url),
    favicon_url: getMediaUrl(data.favicon_url),
  }
}

// ============================================================================
// Branding Settings Hook (Admin)
// ============================================================================

interface UseBrandingSettingsReturn {
  settings: BrandingSettings | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useBrandingSettings(): UseBrandingSettingsReturn {
  const [settings, setSettings] = useState<BrandingSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSettings = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get<BrandingSettings>('/branding/')
      setSettings(response.data)
    } catch (err) {
      const axiosError = err as { response?: { data?: { error?: string } } }
      const message = axiosError.response?.data?.error || 'Failed to load branding settings'
      setError(message)
      console.error('Error fetching branding settings:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  return { settings, isLoading, error, refetch: fetchSettings }
}

// ============================================================================
// Update Branding Settings Hook
// ============================================================================

interface UseUpdateBrandingReturn {
  updateSettings: (data: BrandingSettingsUpdate) => Promise<BrandingSettings>
  isUpdating: boolean
  error: string | null
}

export function useUpdateBranding(): UseUpdateBrandingReturn {
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateSettings = useCallback(async (data: BrandingSettingsUpdate): Promise<BrandingSettings> => {
    setIsUpdating(true)
    setError(null)
    try {
      // Check if there are file fields in the data
      const hasFiles = data.logo instanceof File || data.logo_dark instanceof File || data.favicon instanceof File
      const hasClearFiles = data.logo === null || data.logo_dark === null || data.favicon === null

      if (hasFiles || hasClearFiles) {
        // Use FormData for file uploads
        const formData = new FormData()

        // Add all non-file fields
        Object.entries(data).forEach(([key, value]) => {
          if (['logo', 'logo_dark', 'favicon'].includes(key)) {
            // Handle file fields specially
            if (value instanceof File) {
              formData.append(key, value)
            } else if (value === null) {
              // Send empty string to signal clearing the file
              formData.append(key, '')
            }
          } else if (value !== undefined && value !== null) {
            formData.append(key, String(value))
          }
        })

        const response = await api.patch<BrandingSettings>('/branding/update/', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })
        return response.data
      } else {
        // Use regular JSON for non-file updates
        const response = await api.patch<BrandingSettings>('/branding/update/', data)
        return response.data
      }
    } catch (err) {
      const axiosError = err as { response?: { data?: { error?: string } } }
      const message = axiosError.response?.data?.error || 'Failed to update branding settings'
      setError(message)
      console.error('Error updating branding settings:', err)
      throw err
    } finally {
      setIsUpdating(false)
    }
  }, [])

  return { updateSettings, isUpdating, error }
}

// ============================================================================
// Reset Branding Settings Hook
// ============================================================================

interface UseResetBrandingReturn {
  resetSettings: () => Promise<BrandingSettings>
  isResetting: boolean
  error: string | null
}

export function useResetBranding(): UseResetBrandingReturn {
  const [isResetting, setIsResetting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resetSettings = useCallback(async (): Promise<BrandingSettings> => {
    setIsResetting(true)
    setError(null)
    try {
      const response = await api.post<BrandingSettings>('/branding/reset/')
      return response.data
    } catch (err) {
      const axiosError = err as { response?: { data?: { error?: string } } }
      const message = axiosError.response?.data?.error || 'Failed to reset branding settings'
      setError(message)
      console.error('Error resetting branding settings:', err)
      throw err
    } finally {
      setIsResetting(false)
    }
  }, [])

  return { resetSettings, isResetting, error }
}

// ============================================================================
// Public Branding Hook (No Auth Required) - Uses React Query for caching
// ============================================================================

interface UsePublicBrandingReturn {
  branding: PublicBranding | null
  isLoading: boolean
  error: string | null
}

/**
 * Hook to fetch public branding settings.
 * Uses React Query with staleTime to prevent duplicate API calls.
 * The data is cached and shared across all components that use this hook.
 */
export function usePublicBranding(): UsePublicBrandingReturn {
  const { data, isLoading, error } = useQuery({
    queryKey: brandingKeys.public(),
    queryFn: fetchPublicBranding,
    staleTime: 5 * 60 * 1000, // 5 minutes - branding rarely changes
    gcTime: 30 * 60 * 1000, // 30 minutes cache
  })

  return {
    branding: data ?? null,
    isLoading,
    error: error ? 'Failed to load branding' : null,
  }
}

// ============================================================================
// Branding CSS Injection Hook
// ============================================================================

/**
 * Hook that fetches branding settings and injects them as CSS custom properties.
 * This allows the entire app to use dynamic branding colors and fonts.
 *
 * Uses the same React Query cache as usePublicBranding to avoid duplicate API calls.
 */
export function useBrandingCSS(): { isLoading: boolean; error: string | null } {
  // Use the same cached query as usePublicBranding
  const { data: branding, isLoading, error } = useQuery({
    queryKey: brandingKeys.public(),
    queryFn: fetchPublicBranding,
    staleTime: 5 * 60 * 1000, // 5 minutes - branding rarely changes
    gcTime: 30 * 60 * 1000, // 30 minutes cache
  })

  // Inject CSS variables when branding data changes
  useEffect(() => {
    if (!branding) return

    // Get the document root element
    const root = document.documentElement

    // Inject font family
    if (branding.font_family) {
      root.style.setProperty('--font-family-sans', `'${branding.font_family}', system-ui, -apple-system, sans-serif`)
    }

    // Inject primary colors
    if (branding.primary_color) {
      root.style.setProperty('--color-primary', branding.primary_color)
    }
    if (branding.primary_color_dark) {
      root.style.setProperty('--color-primary-dark', branding.primary_color_dark)
    }
    if (branding.primary_color_light) {
      root.style.setProperty('--color-primary-light', branding.primary_color_light)
    }

    // Inject secondary colors
    if (branding.secondary_color) {
      root.style.setProperty('--color-secondary', branding.secondary_color)
    }
    if (branding.secondary_color_dark) {
      root.style.setProperty('--color-secondary-dark', branding.secondary_color_dark)
    }
    if (branding.secondary_color_light) {
      root.style.setProperty('--color-secondary-light', branding.secondary_color_light)
    }

    // Inject accent colors
    if (branding.accent_color) {
      root.style.setProperty('--color-accent', branding.accent_color)
    }
    if (branding.accent_color_dark) {
      root.style.setProperty('--color-accent-dark', branding.accent_color_dark)
    }
    if (branding.accent_color_light) {
      root.style.setProperty('--color-accent-light', branding.accent_color_light)
    }

    // Inject status colors
    if (branding.success_color) {
      root.style.setProperty('--color-success', branding.success_color)
    }
    if (branding.warning_color) {
      root.style.setProperty('--color-warning', branding.warning_color)
    }
    if (branding.error_color) {
      root.style.setProperty('--color-error', branding.error_color)
    }
  }, [branding])

  return { isLoading, error: error ? 'Failed to load branding CSS' : null }
}

// ============================================================================
// Platform Company Hook (Admin)
// ============================================================================

export interface PlatformCompany {
  id: string
  name: string
  slug: string
  tagline: string
  logo: string | null
  is_published: boolean
}

interface UsePlatformCompanyReturn {
  platformCompany: PlatformCompany | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function usePlatformCompany(): UsePlatformCompanyReturn {
  const [platformCompany, setPlatformCompany] = useState<PlatformCompany | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPlatformCompany = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get<{ platform_company: PlatformCompany | null }>('/branding/platform-company/')
      setPlatformCompany(response.data.platform_company)
    } catch (err) {
      const axiosError = err as { response?: { data?: { error?: string } } }
      const message = axiosError.response?.data?.error || 'Failed to load platform company'
      setError(message)
      console.error('Error fetching platform company:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPlatformCompany()
  }, [fetchPlatformCompany])

  return { platformCompany, isLoading, error, refetch: fetchPlatformCompany }
}

// ============================================================================
// Create/Update Platform Company Hook
// ============================================================================

interface UseCreatePlatformCompanyReturn {
  createPlatformCompany: (data?: { name?: string; tagline?: string }) => Promise<PlatformCompany>
  isCreating: boolean
  error: string | null
}

export function useCreatePlatformCompany(): UseCreatePlatformCompanyReturn {
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createPlatformCompany = useCallback(async (data?: { name?: string; tagline?: string }): Promise<PlatformCompany> => {
    setIsCreating(true)
    setError(null)
    try {
      const response = await api.post<{ platform_company: PlatformCompany }>('/branding/platform-company/create/', data || {})
      return response.data.platform_company
    } catch (err) {
      const axiosError = err as { response?: { data?: { error?: string } } }
      const message = axiosError.response?.data?.error || 'Failed to create platform company'
      setError(message)
      console.error('Error creating platform company:', err)
      throw err
    } finally {
      setIsCreating(false)
    }
  }, [])

  return { createPlatformCompany, isCreating, error }
}
