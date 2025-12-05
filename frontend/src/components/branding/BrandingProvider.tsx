import { useBrandingCSS } from '@/hooks'

interface BrandingProviderProps {
  children: React.ReactNode
}

/**
 * Provider component that loads branding settings and injects CSS variables.
 * Wrap your app with this component to enable dynamic branding.
 */
export function BrandingProvider({ children }: BrandingProviderProps) {
  // This hook fetches branding and injects CSS variables on mount
  useBrandingCSS()

  // Render children immediately - CSS will be injected asynchronously
  return <>{children}</>
}
