import { useState, useEffect, useCallback } from 'react'
import api, { getMediaUrl } from '@/services/api'
import type { BrandingSettings, BrandingSettingsUpdate, PublicBranding } from '@/types'

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
// Public Branding Hook (No Auth Required)
// ============================================================================

interface UsePublicBrandingReturn {
  branding: PublicBranding | null
  isLoading: boolean
  error: string | null
}

export function usePublicBranding(): UsePublicBrandingReturn {
  const [branding, setBranding] = useState<PublicBranding | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchBranding = async () => {
      try {
        const response = await api.get<PublicBranding>('/branding/public/')
        const data = response.data

        // Convert relative media URLs to absolute URLs
        const transformedBranding: PublicBranding = {
          ...data,
          logo_url: getMediaUrl(data.logo_url),
          logo_dark_url: getMediaUrl(data.logo_dark_url),
          favicon_url: getMediaUrl(data.favicon_url),
        }

        setBranding(transformedBranding)
      } catch (err) {
        setError('Failed to load branding')
        console.error('Error fetching public branding:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchBranding()
  }, [])

  return { branding, isLoading, error }
}

// ============================================================================
// Branding CSS Injection Hook
// ============================================================================

/**
 * Hook that fetches branding settings and injects them as CSS custom properties.
 * This allows the entire app to use dynamic branding colors and fonts.
 */
export function useBrandingCSS(): { isLoading: boolean; error: string | null } {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const injectBrandingCSS = async () => {
      try {
        const response = await api.get<PublicBranding>('/branding/public/')
        const branding = response.data

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

      } catch (err) {
        setError('Failed to load branding CSS')
        console.error('Error injecting branding CSS:', err)
      } finally {
        setIsLoading(false)
      }
    }

    injectBrandingCSS()
  }, [])

  return { isLoading, error }
}
