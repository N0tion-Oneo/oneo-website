/**
 * FeaturesSection
 *
 * Shows side-by-side comparison of features between current and new service type.
 * Highlights gained (green) and lost (red) features.
 */

import { useQuery } from '@tanstack/react-query'
import { Check, X, Loader2, Plus, Minus } from 'lucide-react'
import { cmsPricing, CMSPricingFeature } from '@/services/cms'

interface FeaturesSectionProps {
  currentType: 'retained' | 'headhunting'
  newType: 'retained' | 'headhunting'
}

const CATEGORY_LABELS: Record<string, string> = {
  recruitment: 'Recruitment Services',
  retained: 'Retained Benefits',
  employment: 'Employment Services',
  additional: 'Additional Services',
}

const CATEGORY_ORDER = ['recruitment', 'retained', 'employment', 'additional']

export function FeaturesSection({ currentType, newType }: FeaturesSectionProps) {
  const { data: features = [], isLoading } = useQuery({
    queryKey: ['cms', 'pricing', 'features'],
    queryFn: cmsPricing.getFeaturesPublic,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  // Filter only active features
  const activeFeatures = features.filter((f) => f.is_active)

  // Group features by category
  const groupedFeatures = CATEGORY_ORDER.reduce((acc, category) => {
    acc[category] = activeFeatures
      .filter((f) => f.category === category)
      .sort((a, b) => a.order - b.order)
    return acc
  }, {} as Record<string, CMSPricingFeature[]>)

  // Helper to check if feature is included in service type
  const isIncluded = (feature: CMSPricingFeature, serviceType: 'retained' | 'headhunting') => {
    return serviceType === 'retained' ? feature.included_in_retained : feature.included_in_headhunting
  }

  // Count changes
  const getChangeStats = () => {
    let gained = 0
    let lost = 0

    activeFeatures.forEach((feature) => {
      const currentIncluded = isIncluded(feature, currentType)
      const newIncluded = isIncluded(feature, newType)

      if (!currentIncluded && newIncluded) gained++
      if (currentIncluded && !newIncluded) lost++
    })

    return { gained, lost }
  }

  const { gained, lost } = getChangeStats()

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Feature Comparison</h3>
        <p className="text-sm text-gray-500">
          Review the feature changes when switching service types.
        </p>
      </div>

      {/* Summary */}
      <div className="flex gap-4">
        {gained > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
            <Plus className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-700">
              {gained} feature{gained !== 1 ? 's' : ''} gained
            </span>
          </div>
        )}
        {lost > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg">
            <Minus className="w-4 h-4 text-red-600" />
            <span className="text-sm font-medium text-red-700">
              {lost} feature{lost !== 1 ? 's' : ''} lost
            </span>
          </div>
        )}
        {gained === 0 && lost === 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg">
            <span className="text-sm font-medium text-gray-600">No feature changes</span>
          </div>
        )}
      </div>

      {/* Feature Table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Feature
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                Current ({currentType === 'retained' ? 'Retained' : 'Headhunting'})
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                New ({newType === 'retained' ? 'Retained' : 'Headhunting'})
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {CATEGORY_ORDER.map((category) => {
              const categoryFeatures = groupedFeatures[category]
              if (!categoryFeatures || categoryFeatures.length === 0) return null

              return (
                <>
                  {/* Category Header */}
                  <tr key={`header-${category}`} className="bg-gray-50">
                    <td colSpan={3} className="px-4 py-2">
                      <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        {CATEGORY_LABELS[category] || category}
                      </span>
                    </td>
                  </tr>

                  {/* Category Features */}
                  {categoryFeatures.map((feature) => {
                    const currentIncluded = isIncluded(feature, currentType)
                    const newIncluded = isIncluded(feature, newType)
                    const isGained = !currentIncluded && newIncluded
                    const isLost = currentIncluded && !newIncluded

                    return (
                      <tr
                        key={feature.id}
                        className={
                          isGained
                            ? 'bg-green-50'
                            : isLost
                            ? 'bg-red-50'
                            : ''
                        }
                      >
                        <td className="px-4 py-2.5">
                          <span
                            className={`text-sm ${
                              isGained
                                ? 'text-green-800 font-medium'
                                : isLost
                                ? 'text-red-800'
                                : 'text-gray-700'
                            }`}
                          >
                            {feature.name}
                          </span>
                          {isGained && (
                            <span className="ml-2 text-xs text-green-600 font-medium">
                              + New
                            </span>
                          )}
                          {isLost && (
                            <span className="ml-2 text-xs text-red-600 font-medium">
                              - Removed
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {currentIncluded ? (
                            <Check className="w-5 h-5 text-green-600 inline-block" />
                          ) : (
                            <X className="w-5 h-5 text-gray-300 inline-block" />
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {newIncluded ? (
                            <Check
                              className={`w-5 h-5 inline-block ${
                                isGained ? 'text-green-600' : 'text-green-600'
                              }`}
                            />
                          ) : (
                            <X
                              className={`w-5 h-5 inline-block ${
                                isLost ? 'text-red-400' : 'text-gray-300'
                              }`}
                            />
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </>
              )
            })}
          </tbody>
        </table>
      </div>

      {lost > 0 && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Warning:</strong> Changing service type will remove access to {lost} feature
            {lost !== 1 ? 's' : ''} currently available to you.
          </p>
        </div>
      )}
    </div>
  )
}
