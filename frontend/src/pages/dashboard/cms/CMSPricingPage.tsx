import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cmsPricing, CMSPricingConfig, CMSPricingFeature, CMSPricingFeatureInput } from '@/services/cms'
import { useToast } from '@/contexts/ToastContext'
import {
  Loader2,
  Save,
  Plus,
  Trash2,
  GripVertical,
  Building2,
  Users,
  Search,
  Briefcase,
  Calculator,
  Check,
  X,
  Pencil,
  Info,
  Code,
} from 'lucide-react'

// Features that have coded feature gates in the application
// These slugs are checked in code to control access to features
const CODED_FEATURE_GATES: Record<string, { description: string; locations: string[] }> = {
  'talent-directory': {
    description: 'Controls access to browse all candidates in the talent pool',
    locations: [
      'backend/candidates/views.py - list_company_candidates()',
      'frontend/src/pages/candidates/CandidatesDirectoryPage.tsx',
      'frontend/src/pages/candidates/CandidateProfilePage.tsx',
      'frontend/src/pages/dashboard/AdminCandidatesPage.tsx',
    ],
  },
  'employer-branding': {
    description: 'Controls ability to create company posts in the feed',
    locations: [
      'backend/feed/views.py - company_has_employer_branding()',
      'frontend/src/pages/dashboard/FeedPage.tsx',
    ],
  },
  'free-replacements': {
    description: 'Controls eligibility for free replacement hires within the replacement period',
    locations: [
      'backend/jobs/services/replacement.py - check_replacement_eligibility()',
      'backend/subscriptions/signals.py - auto_generate_placement_invoice()',
      'frontend/src/components/applications/ApplicationDrawer.tsx - ReplacementTab',
      'frontend/src/components/replacements/ReplacementRequestModal.tsx',
    ],
  },
}

const categoryLabels: Record<string, string> = {
  recruitment: 'Recruitment',
  retained: 'Retained',
  employment: 'Employment',
  additional: 'Additional',
}

const categoryColors: Record<string, string> = {
  recruitment: 'bg-blue-100 text-blue-700',
  retained: 'bg-purple-100 text-purple-700',
  employment: 'bg-green-100 text-green-700',
  additional: 'bg-orange-100 text-orange-700',
}

export default function CMSPricingPage() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  // Config state
  const [configData, setConfigData] = useState<CMSPricingConfig | null>(null)
  const [configInitialized, setConfigInitialized] = useState(false)

  // Feature editing state
  const [editingFeature, setEditingFeature] = useState<CMSPricingFeature | null>(null)
  const [newFeature, setNewFeature] = useState<CMSPricingFeatureInput | null>(null)

  // Drag and drop state
  const [draggedFeatureId, setDraggedFeatureId] = useState<string | null>(null)
  const [dragOverFeatureId, setDragOverFeatureId] = useState<string | null>(null)

  // Queries
  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ['cms', 'pricing', 'config'],
    queryFn: cmsPricing.getConfig,
  })

  const { data: features = [], isLoading: featuresLoading } = useQuery({
    queryKey: ['cms', 'pricing', 'features'],
    queryFn: cmsPricing.listFeatures,
  })

  // Initialize config form
  useEffect(() => {
    if (config && !configInitialized) {
      setConfigData(config)
      setConfigInitialized(true)
    }
  }, [config, configInitialized])

  // Mutations
  const updateConfigMutation = useMutation({
    mutationFn: cmsPricing.updateConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms', 'pricing', 'config'] })
      showToast('success', 'Pricing configuration saved')
    },
    onError: () => {
      showToast('error', 'Failed to save pricing configuration')
    },
  })

  const createFeatureMutation = useMutation({
    mutationFn: cmsPricing.createFeature,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms', 'pricing', 'features'] })
      showToast('success', 'Feature created')
      setNewFeature(null)
    },
    onError: () => {
      showToast('error', 'Failed to create feature')
    },
  })

  const updateFeatureMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<CMSPricingFeatureInput> }) =>
      cmsPricing.updateFeature(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms', 'pricing', 'features'] })
      showToast('success', 'Feature updated')
      setEditingFeature(null)
    },
    onError: () => {
      showToast('error', 'Failed to update feature')
    },
  })

  const deleteFeatureMutation = useMutation({
    mutationFn: cmsPricing.deleteFeature,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms', 'pricing', 'features'] })
      showToast('success', 'Feature deleted')
    },
    onError: () => {
      showToast('error', 'Failed to delete feature')
    },
  })

  const reorderFeaturesMutation = useMutation({
    mutationFn: cmsPricing.reorderFeatures,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms', 'pricing', 'features'] })
      showToast('success', 'Features reordered')
    },
    onError: () => {
      showToast('error', 'Failed to reorder features')
    },
  })

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, featureId: string) => {
    setDraggedFeatureId(featureId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, featureId: string) => {
    e.preventDefault()
    if (featureId !== draggedFeatureId) {
      setDragOverFeatureId(featureId)
    }
  }

  const handleDragLeave = () => {
    setDragOverFeatureId(null)
  }

  const handleDrop = (e: React.DragEvent, targetFeatureId: string) => {
    e.preventDefault()
    setDragOverFeatureId(null)

    if (!draggedFeatureId || draggedFeatureId === targetFeatureId) {
      setDraggedFeatureId(null)
      return
    }

    // Reorder the features array
    const draggedIndex = features.findIndex(f => f.id === draggedFeatureId)
    const targetIndex = features.findIndex(f => f.id === targetFeatureId)

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedFeatureId(null)
      return
    }

    // Create new order
    const newFeatures = [...features]
    const [draggedItem] = newFeatures.splice(draggedIndex, 1)
    newFeatures.splice(targetIndex, 0, draggedItem)

    // Send new order to server
    const featureIds = newFeatures.map(f => f.id)
    reorderFeaturesMutation.mutate(featureIds)

    setDraggedFeatureId(null)
  }

  const handleDragEnd = () => {
    setDraggedFeatureId(null)
    setDragOverFeatureId(null)
  }

  const handleConfigSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!configData) return
    updateConfigMutation.mutate(configData)
  }

  // Fields that are stored as decimals but displayed as percentages
  const percentageFields = [
    'enterprise_markup_year1',
    'enterprise_markup_year2',
    'enterprise_markup_year3',
    'enterprise_markup_year4_plus',
    'enterprise_additionals_fee',
    'enterprise_assets_fee',
    'eor_additionals_fee',
    'eor_assets_fee',
    'retained_placement_fee',
    'retained_csuite_placement_fee',
    'headhunting_placement_fee',
    'headhunting_csuite_placement_fee',
  ]

  const isPercentageField = (field: string) => percentageFields.includes(field)

  // Convert decimal to percentage for display
  const toPercent = (value: string | undefined) => {
    if (!value) return ''
    const num = parseFloat(value)
    if (isNaN(num)) return ''
    // Round to avoid floating point precision issues (e.g., 0.28 * 100 = 28.000000000000004)
    return Math.round(num * 100).toString()
  }

  // Convert percentage to decimal for storage
  const toDecimal = (value: string) => {
    const num = parseFloat(value)
    if (isNaN(num)) return ''
    // Use toFixed to avoid floating point precision issues
    return (num / 100).toFixed(4)
  }

  const handleConfigChange = (field: keyof CMSPricingConfig, value: string) => {
    if (!configData) return
    // If it's a percentage field, convert to decimal for storage
    const storedValue = isPercentageField(field) ? toDecimal(value) : value
    setConfigData({ ...configData, [field]: storedValue })
  }

  // Get display value for an input (convert decimals to percentages)
  const getDisplayValue = (field: keyof CMSPricingConfig) => {
    const value = configData?.[field]
    if (!value) return ''
    return isPercentageField(field) ? toPercent(value as string) : value
  }

  const handleAddFeature = () => {
    setNewFeature({
      name: '',
      category: 'recruitment',
      is_active: true,
      included_in_enterprise: true,
      included_in_eor: false,
      included_in_retained: false,
      included_in_headhunting: false,
    })
  }

  const handleSaveNewFeature = () => {
    if (!newFeature || !newFeature.name.trim()) {
      showToast('error', 'Feature name is required')
      return
    }
    createFeatureMutation.mutate(newFeature)
  }

  const handleSaveEditFeature = () => {
    if (!editingFeature) return
    updateFeatureMutation.mutate({
      id: editingFeature.id,
      input: {
        name: editingFeature.name,
        category: editingFeature.category,
        is_active: editingFeature.is_active,
        included_in_enterprise: editingFeature.included_in_enterprise,
        included_in_eor: editingFeature.included_in_eor,
        included_in_retained: editingFeature.included_in_retained,
        included_in_headhunting: editingFeature.included_in_headhunting,
      },
    })
  }

  const handleDeleteFeature = (id: string) => {
    if (confirm('Are you sure you want to delete this feature?')) {
      deleteFeatureMutation.mutate(id)
    }
  }

  const handleToggleFeatureService = async (
    feature: CMSPricingFeature,
    field: 'included_in_enterprise' | 'included_in_eor' | 'included_in_retained' | 'included_in_headhunting'
  ) => {
    updateFeatureMutation.mutate({
      id: feature.id,
      input: { [field]: !feature[field] },
    })
  }

  if (configLoading || featuresLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Pricing Configuration</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage pricing rates, fees, and feature comparison for the pricing calculator.
        </p>
      </div>

      {/* Config Form */}
      <form onSubmit={handleConfigSubmit} className="space-y-6 mb-8">
        {/* Service Pricing Cards - 2x2 Grid */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Enterprise Pricing */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="bg-amber-500 px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <Building2 className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Enterprise</h3>
                <p className="text-[10px] text-white/80">Recruitment + EOR combined</p>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-2">Markup by Employee Tenure</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'Year 1', field: 'enterprise_markup_year1' as const },
                    { label: 'Year 2', field: 'enterprise_markup_year2' as const },
                    { label: 'Year 3', field: 'enterprise_markup_year3' as const },
                    { label: 'Year 4+', field: 'enterprise_markup_year4_plus' as const },
                  ].map(({ label, field }) => (
                    <div key={field} className="text-center">
                      <span className="block text-[10px] text-gray-400 mb-1">{label}</span>
                      <div className="relative">
                        <input
                          type="number"
                          step="1"
                          value={getDisplayValue(field)}
                          onChange={(e) => handleConfigChange(field, e.target.value)}
                          className="w-full px-2 py-1.5 pr-6 border border-gray-200 rounded-md text-sm text-center focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">Additionals Fee</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      value={getDisplayValue('enterprise_additionals_fee')}
                      onChange={(e) => handleConfigChange('enterprise_additionals_fee', e.target.value)}
                      className="w-full px-2 py-1.5 pr-6 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">%</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">Assets Fee</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      value={getDisplayValue('enterprise_assets_fee')}
                      onChange={(e) => handleConfigChange('enterprise_assets_fee', e.target.value)}
                      className="w-full px-2 py-1.5 pr-6 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">%</span>
                  </div>
                </div>
              </div>
              <div className="pt-2 border-t border-gray-100">
                <label className="block text-[10px] text-gray-500 mb-1">Free Replacement Period</label>
                <div className="relative">
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={configData?.enterprise_replacement_period_days || ''}
                    onChange={(e) => setConfigData(prev => prev ? { ...prev, enterprise_replacement_period_days: parseInt(e.target.value) || 0 } : prev)}
                    className="w-full px-2 py-1.5 pr-12 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">days</span>
                </div>
              </div>
            </div>
          </div>

          {/* EOR Pricing */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="bg-blue-500 px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Employer of Record</h3>
                <p className="text-[10px] text-white/80">Employment services only</p>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-[10px] text-gray-500 mb-1">Monthly Fee per Person</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">R</span>
                  <input
                    type="number"
                    step="0.01"
                    value={configData?.eor_monthly_fee || ''}
                    onChange={(e) => handleConfigChange('eor_monthly_fee', e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">Additionals Fee</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      value={getDisplayValue('eor_additionals_fee')}
                      onChange={(e) => handleConfigChange('eor_additionals_fee', e.target.value)}
                      className="w-full px-2 py-1.5 pr-6 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">%</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">Assets Fee</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      value={getDisplayValue('eor_assets_fee')}
                      onChange={(e) => handleConfigChange('eor_assets_fee', e.target.value)}
                      className="w-full px-2 py-1.5 pr-6 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Retained Recruitment */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="bg-emerald-500 px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <Search className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Retained Recruitment</h3>
                <p className="text-[10px] text-white/80">Ongoing recruitment partnership</p>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-[10px] text-gray-500 mb-1">Monthly Retainer</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">R</span>
                  <input
                    type="number"
                    step="0.01"
                    value={configData?.retained_monthly_retainer || ''}
                    onChange={(e) => handleConfigChange('retained_monthly_retainer', e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">Regular Placement Fee</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      value={getDisplayValue('retained_placement_fee')}
                      onChange={(e) => handleConfigChange('retained_placement_fee', e.target.value)}
                      className="w-full px-2 py-1.5 pr-6 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">%</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">C-Suite Placement Fee</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      value={getDisplayValue('retained_csuite_placement_fee')}
                      onChange={(e) => handleConfigChange('retained_csuite_placement_fee', e.target.value)}
                      className="w-full px-2 py-1.5 pr-6 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">%</span>
                  </div>
                </div>
              </div>
              <div className="pt-2 border-t border-gray-100">
                <label className="block text-[10px] text-gray-500 mb-1">Free Replacement Period</label>
                <div className="relative">
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={configData?.retained_replacement_period_days || ''}
                    onChange={(e) => setConfigData(prev => prev ? { ...prev, retained_replacement_period_days: parseInt(e.target.value) || 0 } : prev)}
                    className="w-full px-2 py-1.5 pr-12 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">days</span>
                </div>
              </div>
            </div>
          </div>

          {/* Headhunting */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="bg-purple-500 px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <Briefcase className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Headhunting</h3>
                <p className="text-[10px] text-white/80">Executive search services</p>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">Regular Placement Fee</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      value={getDisplayValue('headhunting_placement_fee')}
                      onChange={(e) => handleConfigChange('headhunting_placement_fee', e.target.value)}
                      className="w-full px-2 py-1.5 pr-6 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">%</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">C-Suite Placement Fee</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      value={getDisplayValue('headhunting_csuite_placement_fee')}
                      onChange={(e) => handleConfigChange('headhunting_csuite_placement_fee', e.target.value)}
                      className="w-full px-2 py-1.5 pr-6 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">%</span>
                  </div>
                </div>
              </div>
              <div className="pt-2 border-t border-gray-100">
                <label className="block text-[10px] text-gray-500 mb-1">Free Replacement Period</label>
                <div className="relative">
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={configData?.headhunting_replacement_period_days || ''}
                    onChange={(e) => setConfigData(prev => prev ? { ...prev, headhunting_replacement_period_days: parseInt(e.target.value) || 0 } : prev)}
                    className="w-full px-2 py-1.5 pr-12 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">days</span>
                </div>
              </div>
              <p className="text-[10px] text-gray-400">One-time fee per successful placement</p>
            </div>
          </div>
        </div>

        {/* Note about percentage values */}
        <p className="text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
          <span className="font-medium">Note:</span> Enter percentages as whole numbers (e.g., 22 for 22%, 5 for 5%). Values are automatically converted for storage.
        </p>

        {/* Default Calculator Values */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="bg-gray-800 px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
              <Calculator className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Default Calculator Values</h3>
              <p className="text-[10px] text-white/70">Pre-filled values when users load the calculator</p>
            </div>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: 'Default Salary', field: 'default_salary' as const, prefix: 'R' },
                { label: 'Desk Fee', field: 'default_desk_fee' as const, prefix: 'R', suffix: '/mo' },
                { label: 'Lunch Fee', field: 'default_lunch_fee' as const, prefix: 'R', suffix: '/pp' },
                { label: 'Quarterly Event', field: 'default_event_cost' as const, prefix: 'R' },
                { label: 'Year-End Party', field: 'default_party_cost' as const, prefix: 'R' },
                { label: 'Asset Cost', field: 'default_asset_cost' as const, prefix: 'R', suffix: '/hire' },
              ].map(({ label, field, prefix, suffix }) => (
                <div key={field}>
                  <label className="block text-[10px] text-gray-500 mb-1">{label}</label>
                  <div className="relative">
                    {prefix && <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">{prefix}</span>}
                    <input
                      type="number"
                      step="0.01"
                      value={configData?.[field] || ''}
                      onChange={(e) => handleConfigChange(field, e.target.value)}
                      className={`w-full ${prefix ? 'pl-6' : 'px-2'} ${suffix ? 'pr-10' : 'pr-2'} py-1.5 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-gray-500/20 focus:border-gray-500`}
                    />
                    {suffix && <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">{suffix}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer with Last Updated & Save */}
        <div className="flex items-center justify-between pt-2">
          {configData?.updated_at ? (
            <p className="text-xs text-gray-400">
              Last updated {new Date(configData.updated_at).toLocaleDateString()}
              {configData.updated_by_name && ` by ${configData.updated_by_name}`}
            </p>
          ) : (
            <div />
          )}
          <button
            type="submit"
            disabled={updateConfigMutation.isPending}
            className="inline-flex items-center gap-2 px-5 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {updateConfigMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Changes
          </button>
        </div>
      </form>

      {/* Features Section */}
      <div className="border-t border-gray-200 pt-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Pricing Features</h2>
            <p className="text-sm text-gray-500">
              Manage features shown in the service comparison table.
            </p>
          </div>
          <button
            onClick={handleAddFeature}
            disabled={!!newFeature}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-900 text-white rounded-md text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Add Feature
          </button>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-4">
          <div className="flex gap-2">
            <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700 space-y-1">
              <p>Drag rows to reorder. Toggle checkboxes to set which services include each feature. Changes save automatically.</p>
              <p className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-100 text-violet-700">
                  <Code className="w-3 h-3" />
                  Gated
                </span>
                <span>Features with this badge have coded access controls. Hover for details and code locations.</span>
              </p>
            </div>
          </div>
        </div>

        {/* Features Table */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-8"></th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Feature</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Enterprise</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">EOR</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Retained</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Headhunting</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-20">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {/* New Feature Row */}
              {newFeature && (
                <tr className="bg-green-50">
                  <td className="px-4 py-3">
                    <GripVertical className="w-4 h-4 text-gray-300" />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={newFeature.name}
                      onChange={(e) => setNewFeature({ ...newFeature, name: e.target.value })}
                      placeholder="Feature name"
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      autoFocus
                    />
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={newFeature.category}
                      onChange={(e) => setNewFeature({ ...newFeature, category: e.target.value as CMSPricingFeatureInput['category'] })}
                      className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      {Object.entries(categoryLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={newFeature.included_in_enterprise}
                      onChange={(e) => setNewFeature({ ...newFeature, included_in_enterprise: e.target.checked })}
                      className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={newFeature.included_in_eor}
                      onChange={(e) => setNewFeature({ ...newFeature, included_in_eor: e.target.checked })}
                      className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={newFeature.included_in_retained}
                      onChange={(e) => setNewFeature({ ...newFeature, included_in_retained: e.target.checked })}
                      className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={newFeature.included_in_headhunting}
                      onChange={(e) => setNewFeature({ ...newFeature, included_in_headhunting: e.target.checked })}
                      className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={handleSaveNewFeature}
                        disabled={createFeatureMutation.isPending}
                        className="p-1.5 text-green-600 hover:bg-green-100 rounded"
                      >
                        {createFeatureMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => setNewFeature(null)}
                        className="p-1.5 text-gray-400 hover:bg-gray-100 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {/* Existing Features */}
              {features.map((feature, index) => (
                <tr
                  key={feature.id}
                  draggable={!editingFeature}
                  onDragStart={(e) => handleDragStart(e, feature.id)}
                  onDragOver={(e) => handleDragOver(e, feature.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, feature.id)}
                  onDragEnd={handleDragEnd}
                  className={`
                    border-b border-gray-100 transition-all duration-150
                    ${editingFeature?.id === feature.id ? 'bg-yellow-50' : 'bg-white hover:bg-gray-50'}
                    ${draggedFeatureId === feature.id ? 'opacity-40 bg-gray-100' : ''}
                    ${dragOverFeatureId === feature.id ? 'relative' : ''}
                  `}
                  style={dragOverFeatureId === feature.id ? { boxShadow: 'inset 0 2px 0 0 #3b82f6' } : undefined}
                >
                  <td className="px-4 py-3">
                    <div
                      className={`
                        w-6 h-6 flex items-center justify-center rounded
                        ${!editingFeature ? 'cursor-grab active:cursor-grabbing hover:bg-gray-200' : 'opacity-30'}
                        transition-colors
                      `}
                    >
                      <GripVertical className="w-4 h-4 text-gray-400" />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {editingFeature?.id === feature.id ? (
                      <input
                        type="text"
                        value={editingFeature.name}
                        onChange={(e) => setEditingFeature({ ...editingFeature, name: e.target.value })}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className={!feature.is_active ? 'text-gray-400' : 'text-gray-900'}>
                          {feature.name}
                        </span>
                        {CODED_FEATURE_GATES[feature.slug] && (
                          <div className="relative group">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-100 text-violet-700 cursor-help">
                              <Code className="w-3 h-3" />
                              Gated
                            </span>
                            {/* Tooltip */}
                            <div className="absolute left-0 top-full mt-1 z-50 hidden group-hover:block">
                              <div className="bg-gray-900 text-white text-xs rounded-lg p-3 shadow-lg min-w-[320px] max-w-[500px]">
                                <p className="font-medium">{CODED_FEATURE_GATES[feature.slug].description}</p>
                                <details className="mt-2 border-t border-gray-700 pt-2">
                                  <summary className="text-gray-400 text-[10px] uppercase tracking-wide cursor-pointer hover:text-gray-300 select-none">
                                    Code Locations ({CODED_FEATURE_GATES[feature.slug].locations.length})
                                  </summary>
                                  <ul className="mt-2 space-y-1">
                                    {CODED_FEATURE_GATES[feature.slug].locations.map((loc, i) => (
                                      <li key={i} className="text-gray-300 font-mono text-[11px] break-all">{loc}</li>
                                    ))}
                                  </ul>
                                </details>
                                {/* Arrow */}
                                <div className="absolute -top-1 left-4 w-2 h-2 bg-gray-900 rotate-45" />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingFeature?.id === feature.id ? (
                      <select
                        value={editingFeature.category}
                        onChange={(e) => setEditingFeature({ ...editingFeature, category: e.target.value as CMSPricingFeature['category'] })}
                        className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      >
                        {Object.entries(categoryLabels).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    ) : (
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${categoryColors[feature.category]}`}>
                        {categoryLabels[feature.category]}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={editingFeature?.id === feature.id ? editingFeature.included_in_enterprise : feature.included_in_enterprise}
                      onChange={() => {
                        if (editingFeature?.id === feature.id) {
                          setEditingFeature({ ...editingFeature, included_in_enterprise: !editingFeature.included_in_enterprise })
                        } else {
                          handleToggleFeatureService(feature, 'included_in_enterprise')
                        }
                      }}
                      className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={editingFeature?.id === feature.id ? editingFeature.included_in_eor : feature.included_in_eor}
                      onChange={() => {
                        if (editingFeature?.id === feature.id) {
                          setEditingFeature({ ...editingFeature, included_in_eor: !editingFeature.included_in_eor })
                        } else {
                          handleToggleFeatureService(feature, 'included_in_eor')
                        }
                      }}
                      className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={editingFeature?.id === feature.id ? editingFeature.included_in_retained : feature.included_in_retained}
                      onChange={() => {
                        if (editingFeature?.id === feature.id) {
                          setEditingFeature({ ...editingFeature, included_in_retained: !editingFeature.included_in_retained })
                        } else {
                          handleToggleFeatureService(feature, 'included_in_retained')
                        }
                      }}
                      className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={editingFeature?.id === feature.id ? editingFeature.included_in_headhunting : feature.included_in_headhunting}
                      onChange={() => {
                        if (editingFeature?.id === feature.id) {
                          setEditingFeature({ ...editingFeature, included_in_headhunting: !editingFeature.included_in_headhunting })
                        } else {
                          handleToggleFeatureService(feature, 'included_in_headhunting')
                        }
                      }}
                      className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {editingFeature?.id === feature.id ? (
                        <>
                          <button
                            onClick={handleSaveEditFeature}
                            disabled={updateFeatureMutation.isPending}
                            className="p-1.5 text-green-600 hover:bg-green-100 rounded"
                          >
                            {updateFeatureMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Check className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => setEditingFeature(null)}
                            className="p-1.5 text-gray-400 hover:bg-gray-100 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => setEditingFeature(feature)}
                            className="p-1.5 text-gray-400 hover:bg-gray-100 rounded"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          {CODED_FEATURE_GATES[feature.slug] ? (
                            <div className="relative group">
                              <button
                                disabled
                                className="p-1.5 text-gray-300 cursor-not-allowed rounded"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                              {/* Tooltip */}
                              <div className="absolute right-0 bottom-full mb-1 z-50 hidden group-hover:block">
                                <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg whitespace-nowrap">
                                  Cannot delete: feature has coded gates
                                  <div className="absolute -bottom-1 right-3 w-2 h-2 bg-gray-900 rotate-45" />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleDeleteFeature(feature.id)}
                              disabled={deleteFeatureMutation.isPending}
                              className="p-1.5 text-red-400 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {features.length === 0 && !newFeature && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    No features yet. Click "Add Feature" to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
