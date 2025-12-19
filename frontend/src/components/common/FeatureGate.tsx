import { ReactNode } from 'react'
import { useCompanyFeatures } from '@/hooks'
import { Lock, Sparkles } from 'lucide-react'

// ============================================================================
// FeatureGate Component
// ============================================================================
// Conditionally renders children based on whether the company has access
// to a specific feature based on their service type (headhunting/retained).

interface FeatureGateProps {
  /** The name of the feature to check access for */
  feature: string
  /** Content to render when the user has access to the feature */
  children: ReactNode
  /** Optional content to render when the user doesn't have access */
  fallback?: ReactNode
  /** If true, shows a default upgrade prompt when no fallback provided */
  showUpgradePrompt?: boolean
}

export function FeatureGate({
  feature,
  children,
  fallback,
  showUpgradePrompt = false,
}: FeatureGateProps) {
  const { hasFeature, isLoading, serviceType } = useCompanyFeatures()

  // While loading, don't render anything to avoid flicker
  if (isLoading) {
    return null
  }

  // If user has the feature, render children
  if (hasFeature(feature)) {
    return <>{children}</>
  }

  // If user doesn't have the feature
  if (fallback) {
    return <>{fallback}</>
  }

  // If showUpgradePrompt is true, show default upgrade prompt
  if (showUpgradePrompt) {
    return <FeatureUpgradePrompt feature={feature} currentPlan={serviceType} />
  }

  // Otherwise, render nothing
  return null
}

// ============================================================================
// ServiceTypeGate Component
// ============================================================================
// Conditionally renders children based on the company's service type.

interface ServiceTypeGateProps {
  /** Required service type(s) to access this content */
  allowedTypes: ('headhunting' | 'retained')[]
  /** Content to render when the user has the required service type */
  children: ReactNode
  /** Optional content to render when the user doesn't have access */
  fallback?: ReactNode
}

export function ServiceTypeGate({ allowedTypes, children, fallback }: ServiceTypeGateProps) {
  const { serviceType, isLoading } = useCompanyFeatures()

  // While loading, don't render anything to avoid flicker
  if (isLoading) {
    return null
  }

  // If user has an allowed service type, render children
  if (serviceType && allowedTypes.includes(serviceType)) {
    return <>{children}</>
  }

  // If user doesn't have access
  if (fallback) {
    return <>{fallback}</>
  }

  // Otherwise, render nothing
  return null
}

// ============================================================================
// FeatureUpgradePrompt Component
// ============================================================================
// Default upgrade prompt shown when a feature is not available.

interface FeatureUpgradePromptProps {
  feature: string
  currentPlan: 'headhunting' | 'retained' | null
}

function FeatureUpgradePrompt({ feature, currentPlan }: FeatureUpgradePromptProps) {
  const planName = currentPlan === 'headhunting' ? 'Headhunting' : 'Retained'

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
        <Lock className="w-5 h-5 text-gray-400" />
      </div>
      <h3 className="text-[14px] font-medium text-gray-900 mb-1">Feature Unavailable</h3>
      <p className="text-[13px] text-gray-500 mb-4">
        {currentPlan
          ? `"${feature}" is not included in your ${planName} plan.`
          : `"${feature}" requires an active service plan.`}
      </p>
      <p className="text-[12px] text-gray-400">
        Contact your account manager to upgrade your plan.
      </p>
    </div>
  )
}

// ============================================================================
// FeatureBadge Component
// ============================================================================
// Shows a badge indicating a feature is premium/locked.

interface FeatureBadgeProps {
  /** Text to display in the badge */
  label?: string
  /** Size variant */
  size?: 'sm' | 'md'
}

export function FeatureBadge({ label = 'Premium', size = 'sm' }: FeatureBadgeProps) {
  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-[10px] gap-1',
    md: 'px-2 py-1 text-[11px] gap-1.5',
  }

  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'

  return (
    <span
      className={`inline-flex items-center rounded-full bg-purple-100 text-purple-700 font-medium ${sizeClasses[size]}`}
    >
      <Sparkles className={iconSize} />
      {label}
    </span>
  )
}

// ============================================================================
// LockedFeatureOverlay Component
// ============================================================================
// Overlay to show on top of locked feature content.

interface LockedFeatureOverlayProps {
  /** The content to show behind the overlay (blurred) */
  children: ReactNode
  /** Feature name to display in the overlay */
  featureName?: string
}

export function LockedFeatureOverlay({ children, featureName }: LockedFeatureOverlayProps) {
  return (
    <div className="relative">
      {/* Blurred content */}
      <div className="blur-sm pointer-events-none select-none">{children}</div>

      {/* Overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[1px] rounded-lg">
        <div className="text-center p-4">
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <Lock className="w-5 h-5 text-gray-400" />
          </div>
          {featureName ? (
            <p className="text-[13px] text-gray-600 font-medium">{featureName}</p>
          ) : (
            <p className="text-[13px] text-gray-500">This feature is locked</p>
          )}
        </div>
      </div>
    </div>
  )
}
