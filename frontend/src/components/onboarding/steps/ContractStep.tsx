import { useState, useEffect, useMemo, type RefObject } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Check, ExternalLink, ArrowRight, Target, Handshake, Building2 } from 'lucide-react'
import { cmsPages, cmsPricing } from '@/services/cms'
import api from '@/services/api'
import type { OnboardingContractStepData, OnboardingContractOffer } from '@/services/api'
import type { Company } from '@/types'

// Default features (fallback if API fails)
const defaultFeatures = [
  { name: 'Talent Sourcing & Recruitment', category: 'recruitment' },
  { name: 'Candidate Screening', category: 'recruitment' },
  { name: 'Interview Coordination', category: 'recruitment' },
  { name: 'Free Replacements', category: 'retained' },
  { name: 'Guaranteed Placements', category: 'retained' },
  { name: 'Always-On Recruitment', category: 'retained' },
]

interface ContractStepProps {
  contractOffer: OnboardingContractOffer | null
  onSubmit: (data: OnboardingContractStepData) => Promise<void>
  isSubmitting: boolean
  previewMode?: boolean
  formRef?: RefObject<HTMLFormElement | null>
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
  return `${(num * 100).toFixed(0)}%`
}

export function ContractStep({ contractOffer, onSubmit, isSubmitting, previewMode = false, formRef }: ContractStepProps) {
  const [companyName, setCompanyName] = useState('')
  const [serviceType, setServiceType] = useState<'headhunting' | 'retained'>(
    (contractOffer?.service_type as 'headhunting' | 'retained') || 'headhunting'
  )
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [termsDocument, setTermsDocument] = useState<{ slug: string; title: string } | null>(null)
  const [initialized, setInitialized] = useState(false)

  // Fetch current company data to pre-populate form (if already created)
  const { data: company } = useQuery<Company>({
    queryKey: ['my-company'],
    queryFn: async () => {
      const response = await api.get('/companies/my/')
      return response.data
    },
    enabled: !previewMode,
    retry: false,
  })

  // Pre-populate company name if it exists
  useEffect(() => {
    if (company && !initialized) {
      if (company.name) setCompanyName(company.name)
      setInitialized(true)
    }
  }, [company, initialized])

  // Fetch default pricing config
  const { data: defaultConfig } = useQuery({
    queryKey: ['cms', 'pricing', 'config'],
    queryFn: cmsPricing.getConfigPublic,
  })

  // Fetch features from CMS
  const { data: apiFeatures } = useQuery({
    queryKey: ['cms', 'pricing', 'features-public'],
    queryFn: cmsPricing.getFeaturesPublic,
  })

  // Build features list based on service type
  const serviceFeatures = useMemo(() => {
    if (apiFeatures && apiFeatures.length > 0) {
      return apiFeatures
        .filter(f => serviceType === 'retained' ? f.included_in_retained : f.included_in_headhunting)
        .map(f => f.name)
    }
    // Fallback to default logic
    return defaultFeatures
      .filter(f => serviceType === 'retained'
        ? (f.category === 'recruitment' || f.category === 'retained')
        : f.category === 'recruitment'
      )
      .map(f => f.name)
  }, [apiFeatures, serviceType])

  // Fetch terms document for the selected service type
  const { data: termsDocuments = [], isLoading: termsLoading } = useQuery({
    queryKey: ['cms-legal-documents', serviceType],
    queryFn: () => cmsPages.listPublic({ service_type: serviceType }),
    enabled: !!serviceType,
  })

  // Auto-select terms document
  useEffect(() => {
    if (termsDocuments.length > 0) {
      const doc = termsDocuments[0]
      if (doc) {
        setTermsDocument({ slug: doc.slug, title: doc.title })
      }
    } else {
      setTermsDocument(null)
    }
    setTermsAccepted(false)
  }, [termsDocuments])

  // Get pricing values
  const getPricing = () => {
    if (contractOffer) {
      return {
        retainer: contractOffer.monthly_retainer,
        placement: contractOffer.placement_fee,
        csuite: contractOffer.csuite_placement_fee,
      }
    }
    return {
      retainer:
        serviceType === 'retained'
          ? defaultConfig?.retained_monthly_retainer || '20000'
          : null,
      placement:
        serviceType === 'retained'
          ? defaultConfig?.retained_placement_fee || '0.10'
          : defaultConfig?.headhunting_placement_fee || '0.20',
      csuite:
        serviceType === 'retained'
          ? defaultConfig?.retained_csuite_placement_fee || '0.15'
          : defaultConfig?.headhunting_csuite_placement_fee || '0.25',
    }
  }

  const pricing = getPricing()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (previewMode) return
    if (!companyName.trim() || !termsAccepted || !termsDocument) return

    const data: OnboardingContractStepData = {
      company_name: companyName.trim(),
      service_type: serviceType,
      terms_accepted: termsAccepted,
      terms_document_slug: termsDocument.slug,
      terms_document_title: termsDocument.title,
    }

    await onSubmit(data)
  }

  const canSubmit = companyName.trim() && termsAccepted && termsDocument

  const hasContractOffer = !!contractOffer

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Left Column - Form */}
      <form ref={formRef} onSubmit={handleSubmit} className="flex-1 space-y-6">
        {/* Company Name */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="w-4 h-4 text-gray-500" />
            <h3 className="text-[13px] font-medium text-gray-900">Company Name</h3>
          </div>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Enter your company name"
            className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            required
          />
        </div>

        {/* Contract Offer Badge */}
        {hasContractOffer && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-600" />
              <span className="text-[13px] font-medium text-green-800">
                Custom pricing has been prepared for you
              </span>
            </div>
          </div>
        )}

        {/* Service Type Selection (only if no contract offer) */}
        {!hasContractOffer && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <h3 className="text-[13px] font-medium text-gray-900 mb-3">Select Service Type</h3>
            <div className="grid grid-cols-2 gap-3">
              {/* Headhunting Option */}
              <button
                type="button"
                onClick={() => setServiceType('headhunting')}
                className={`relative p-4 bg-white border-2 rounded-xl text-left transition-all ${
                  serviceType === 'headhunting'
                    ? 'border-purple-500 ring-1 ring-purple-500'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {serviceType === 'headhunting' && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${
                  serviceType === 'headhunting' ? 'bg-purple-100' : 'bg-gray-100'
                }`}>
                  <Target className={`w-4 h-4 ${serviceType === 'headhunting' ? 'text-purple-600' : 'text-gray-500'}`} />
                </div>
                <span className={`text-sm font-medium ${
                  serviceType === 'headhunting' ? 'text-purple-900' : 'text-gray-900'
                }`}>
                  Headhunting
                </span>
                <p className="text-xs text-gray-500 mt-1">
                  Pay only when you hire. No monthly fees.
                </p>
              </button>

              {/* Retained Option */}
              <button
                type="button"
                onClick={() => setServiceType('retained')}
                className={`relative p-4 bg-white border-2 rounded-xl text-left transition-all ${
                  serviceType === 'retained'
                    ? 'border-emerald-500 ring-1 ring-emerald-500'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {serviceType === 'retained' && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${
                  serviceType === 'retained' ? 'bg-emerald-100' : 'bg-gray-100'
                }`}>
                  <Handshake className={`w-4 h-4 ${serviceType === 'retained' ? 'text-emerald-600' : 'text-gray-500'}`} />
                </div>
                <span className={`text-sm font-medium ${
                  serviceType === 'retained' ? 'text-emerald-900' : 'text-gray-900'
                }`}>
                  Retained
                </span>
                <p className="text-xs text-gray-500 mt-1">
                  Dedicated service with full talent access.
                </p>
              </button>
            </div>
          </div>
        )}

        {/* Terms Agreement */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <h3 className="text-[13px] font-medium text-gray-900 mb-3">Terms & Conditions</h3>
          {termsLoading ? (
            <div className="flex items-center gap-2 text-[13px] text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading terms...
            </div>
          ) : termsDocument ? (
            <label className="flex items-start gap-3 cursor-pointer p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
              />
              <span className="text-[13px] text-gray-600">
                I have read and agree to the{' '}
                <a
                  href={`/${termsDocument.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-900 font-medium hover:underline inline-flex items-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  {termsDocument.title}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </span>
            </label>
          ) : (
            <p className="text-[13px] text-amber-600">
              No terms document available for this service type.
            </p>
          )}
        </div>

        {/* Mobile Submit Button - Hidden on desktop where left panel has buttons */}
        <div className="pt-2 lg:hidden">
          <button
            type="submit"
            disabled={!canSubmit || isSubmitting || previewMode}
            className="w-full py-2.5 px-4 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Accept & Continue
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Right Column - Service Summary Card (Calculator Results Style) */}
      <div className="flex-1">
        <div className={`sticky top-4 rounded-xl border-2 overflow-hidden bg-white shadow-lg h-fit ${
          serviceType === 'retained' ? 'border-emerald-500' : 'border-purple-500'
        }`}>
          {/* Colored Header */}
          <div className={`px-5 py-5 ${
            serviceType === 'retained'
              ? 'bg-gradient-to-r from-emerald-600 to-emerald-500'
              : 'bg-gradient-to-r from-purple-600 to-purple-500'
          }`}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-11 h-11 bg-white/20 rounded-lg flex items-center justify-center">
                {serviceType === 'retained' ? (
                  <Handshake className="w-5 h-5 text-white" />
                ) : (
                  <Target className="w-5 h-5 text-white" />
                )}
              </div>
              <div>
                <h3 className="text-white font-semibold text-[17px]">
                  {serviceType === 'retained' ? 'Retained Service' : 'Headhunting'}
                </h3>
                <p className="text-white/70 text-[12px]">
                  {serviceType === 'retained' ? 'Priority recruitment partnership' : 'Pay-per-placement model'}
                </p>
              </div>
            </div>
          </div>

          {/* Pricing Summary */}
          <div className="px-5 py-5 border-b border-gray-100 bg-gray-50">
            <div className="text-[11px] text-gray-500 uppercase tracking-wide mb-3">Your Rates</div>
            <div className="space-y-2">
              {(serviceType === 'retained' || hasContractOffer) && pricing.retainer && (
                <div className="flex justify-between text-[13px]">
                  <span className="text-gray-600">Monthly Retainer</span>
                  <span className="font-medium text-gray-900">{formatCurrency(pricing.retainer)}/mo</span>
                </div>
              )}
              <div className="flex justify-between text-[13px]">
                <span className="text-gray-600">Standard Placement</span>
                <span className="font-medium text-gray-900">
                  {pricing.placement ? formatPercentage(pricing.placement) : '—'}
                </span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-gray-600">C-Suite Placement</span>
                <span className="font-medium text-gray-900">
                  {pricing.csuite ? formatPercentage(pricing.csuite) : '—'}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-gray-400 mt-3">
              Placement fees based on first-year salary
            </p>
          </div>

          {/* Features */}
          <div className="px-5 py-4">
            <div className="text-[11px] text-gray-500 uppercase tracking-wide mb-3">What's Included</div>
            <div className="space-y-2">
              {serviceFeatures.map((feature) => (
                <div key={feature} className="flex items-center gap-2 text-[13px]">
                  <Check className={`w-4 h-4 flex-shrink-0 ${
                    serviceType === 'retained' ? 'text-emerald-500' : 'text-purple-500'
                  }`} />
                  <span className="text-gray-700">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
