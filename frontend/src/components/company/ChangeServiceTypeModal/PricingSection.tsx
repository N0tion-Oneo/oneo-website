/**
 * PricingSection
 *
 * Shows pricing comparison between current and new service type
 * with inline editing capability for admins.
 */

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Pencil, Check, X, Loader2 } from 'lucide-react'
import { useEffectivePricing, useUpdateCompanyPricing } from '@/hooks'
import { cmsPricing } from '@/services/cms'

interface PricingSectionProps {
  companyId: string
  currentType: 'retained' | 'headhunting'
  newType: 'retained' | 'headhunting'
  isAdmin: boolean
}

function formatCurrency(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

function formatPercentage(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value
  // Values stored as decimals (0.10 = 10%)
  return `${(num * 100).toFixed(0)}%`
}

export function PricingSection({
  companyId,
  currentType,
  newType,
  isAdmin,
}: PricingSectionProps) {
  const { pricing, isLoading: pricingLoading, refetch } = useEffectivePricing(companyId)
  const { updatePricing, isUpdating } = useUpdateCompanyPricing()

  const { data: defaultConfig, isLoading: configLoading } = useQuery({
    queryKey: ['cms', 'pricing', 'config'],
    queryFn: cmsPricing.getConfigPublic,
  })

  // Editing state
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  const handleStartEdit = (field: string, currentValue: string) => {
    setEditingField(field)
    // Convert decimal to percentage for display
    if (field.includes('fee')) {
      setEditValue((parseFloat(currentValue) * 100).toFixed(0))
    } else {
      setEditValue(currentValue)
    }
  }

  const handleSaveEdit = async () => {
    if (!editingField) return

    try {
      let value: string | null = editValue

      // Convert percentage back to decimal for fees
      if (editingField.includes('fee')) {
        value = (parseFloat(editValue) / 100).toFixed(4)
      }

      await updatePricing(companyId, {
        [editingField]: value || null,
      })

      await refetch()
      setEditingField(null)
    } catch (err) {
      console.error('Failed to update pricing:', err)
    }
  }

  const handleCancelEdit = () => {
    setEditingField(null)
    setEditValue('')
  }

  if (pricingLoading || configLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  // Get pricing values for each service type
  const getCurrentPricing = () => {
    if (currentType === 'retained') {
      return {
        retainer: pricing?.monthly_retainer || defaultConfig?.retained_monthly_retainer || '0',
        placement: pricing?.placement_fee || defaultConfig?.retained_placement_fee || '0',
        csuite: pricing?.csuite_placement_fee || defaultConfig?.retained_csuite_placement_fee || '0',
        isCustomRetainer: pricing?.is_custom_retainer || false,
        isCustomPlacement: pricing?.is_custom_placement || false,
        isCustomCsuite: pricing?.is_custom_csuite || false,
      }
    } else {
      return {
        retainer: null,
        placement: pricing?.placement_fee || defaultConfig?.headhunting_placement_fee || '0',
        csuite: pricing?.csuite_placement_fee || defaultConfig?.headhunting_csuite_placement_fee || '0',
        isCustomRetainer: false,
        isCustomPlacement: pricing?.is_custom_placement || false,
        isCustomCsuite: pricing?.is_custom_csuite || false,
      }
    }
  }

  const getNewPricing = () => {
    if (newType === 'retained') {
      return {
        retainer: defaultConfig?.retained_monthly_retainer || '20000',
        placement: defaultConfig?.retained_placement_fee || '0.10',
        csuite: defaultConfig?.retained_csuite_placement_fee || '0.15',
      }
    } else {
      return {
        retainer: null,
        placement: defaultConfig?.headhunting_placement_fee || '0.20',
        csuite: defaultConfig?.headhunting_csuite_placement_fee || '0.25',
      }
    }
  }

  const currentPricing = getCurrentPricing()
  const newPricing = getNewPricing()

  const renderEditableCell = (
    value: string,
    field: string,
    isPercentage: boolean,
    isCustom: boolean
  ) => {
    const isEditing = editingField === field

    if (isEditing) {
      return (
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            autoFocus
          />
          <span className="text-sm text-gray-500">{isPercentage ? '%' : 'ZAR'}</span>
          <button
            onClick={handleSaveEdit}
            disabled={isUpdating}
            className="p-1 text-green-600 hover:text-green-700"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            onClick={handleCancelEdit}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )
    }

    return (
      <div className="flex items-center gap-2">
        <span className="font-medium text-gray-900">
          {isPercentage ? formatPercentage(value) : formatCurrency(value)}
        </span>
        {isCustom && (
          <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
            custom
          </span>
        )}
        {isAdmin && (
          <button
            onClick={() => handleStartEdit(field, value)}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Pricing Comparison</h3>
        <p className="text-sm text-gray-500">
          Review the pricing changes for the new service type.
          {isAdmin && ' You can edit custom pricing before confirming.'}
        </p>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Item
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Current ({currentType === 'retained' ? 'Retained' : 'Headhunting'})
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                New ({newType === 'retained' ? 'Retained' : 'Headhunting'})
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {/* Monthly Retainer */}
            <tr>
              <td className="px-4 py-3 text-sm text-gray-700">Monthly Retainer</td>
              <td className="px-4 py-3 text-sm">
                {currentPricing.retainer ? (
                  renderEditableCell(
                    currentPricing.retainer,
                    'monthly_retainer',
                    false,
                    currentPricing.isCustomRetainer
                  )
                ) : (
                  <span className="text-gray-400">N/A</span>
                )}
              </td>
              <td className="px-4 py-3 text-sm">
                {newPricing.retainer ? (
                  <span className="font-medium text-gray-900">
                    {formatCurrency(newPricing.retainer)}
                  </span>
                ) : (
                  <span className="text-gray-400">N/A</span>
                )}
              </td>
            </tr>

            {/* Placement Fee */}
            <tr>
              <td className="px-4 py-3 text-sm text-gray-700">Placement Fee</td>
              <td className="px-4 py-3 text-sm">
                {renderEditableCell(
                  currentPricing.placement,
                  'placement_fee',
                  true,
                  currentPricing.isCustomPlacement
                )}
              </td>
              <td className="px-4 py-3 text-sm">
                <span className="font-medium text-gray-900">
                  {formatPercentage(newPricing.placement)}
                </span>
              </td>
            </tr>

            {/* C-Suite Placement Fee */}
            <tr>
              <td className="px-4 py-3 text-sm text-gray-700">C-Suite Placement Fee</td>
              <td className="px-4 py-3 text-sm">
                {renderEditableCell(
                  currentPricing.csuite,
                  'csuite_placement_fee',
                  true,
                  currentPricing.isCustomCsuite
                )}
              </td>
              <td className="px-4 py-3 text-sm">
                <span className="font-medium text-gray-900">
                  {formatPercentage(newPricing.csuite)}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {newType === 'retained' && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Switching to Retained service includes a monthly retainer fee
            of {defaultConfig ? formatCurrency(defaultConfig.retained_monthly_retainer) : 'R20,000'}
            with reduced placement fees.
          </p>
        </div>
      )}

      {newType === 'headhunting' && (
        <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
          <p className="text-sm text-purple-800">
            <strong>Note:</strong> Switching to Headhunting removes the monthly retainer.
            Placement fees will be charged at the higher success-based rate.
          </p>
        </div>
      )}
    </div>
  )
}
