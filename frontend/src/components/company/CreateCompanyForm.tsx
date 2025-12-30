import { useState, useCallback, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCreateCompany, useCountries, useCities } from '@/hooks'
import { Building2, Target, Handshake, Check, ChevronDown } from 'lucide-react'
import { TermsSection } from './ChangeServiceTypeModal/TermsSection'

const createCompanySchema = z.object({
  name: z.string().min(1, 'Company name is required').max(100, 'Name too long'),
  tagline: z.string().max(200, 'Tagline too long').optional(),
  headquarters_country: z.number().nullable().optional(),
  headquarters_city: z.number().nullable().optional(),
  service_type: z.enum(['headhunting', 'retained'], {
    required_error: 'Please select a service package',
  }),
  terms_agreed: z.literal(true, {
    errorMap: () => ({ message: 'You must agree to the terms and conditions' }),
  }),
})

type CreateCompanyFormData = z.infer<typeof createCompanySchema>

interface CreateCompanyFormProps {
  onSuccess: () => void
}

interface ServiceTypeCardProps {
  type: 'headhunting' | 'retained'
  selected: boolean
  onSelect: () => void
}

function ServiceTypeCard({ type, selected, onSelect }: ServiceTypeCardProps) {
  const isHeadhunting = type === 'headhunting'

  const config = {
    headhunting: {
      icon: Target,
      title: 'Headhunting',
      tagline: 'Pay-per-placement',
      description: 'Project-based recruitment with no upfront costs',
      features: [
        'No monthly fees',
        '20% placement fee',
        'Ideal for occasional hires',
        'Flexible engagement',
      ],
      pricing: '20% placement fee',
    },
    retained: {
      icon: Handshake,
      title: 'Retained',
      tagline: 'Strategic partnership',
      description: 'Ongoing partnership with dedicated support',
      features: [
        'Monthly retainer model',
        '10% placement fee',
        'Priority candidate access',
        'Dedicated account manager',
      ],
      pricing: 'R20,000/month + 10% fee',
    },
  }

  const { icon: Icon, title, tagline, description, features, pricing } = config[type]

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative flex flex-col p-5 rounded-lg border-2 text-left transition-all
        ${
          selected
            ? 'border-gray-900 dark:border-gray-100 bg-gray-50 dark:bg-gray-800 ring-1 ring-gray-900 dark:ring-gray-100'
            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
        }
      `}
    >
      {/* Selected indicator */}
      {selected && (
        <div className="absolute top-3 right-3 w-5 h-5 bg-gray-900 dark:bg-gray-100 rounded-full flex items-center justify-center">
          <Check className="w-3 h-3 text-white dark:text-gray-900" />
        </div>
      )}

      {/* Icon and title */}
      <div className="flex items-center gap-3 mb-3">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center
          ${isHeadhunting ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-purple-100 dark:bg-purple-900/30'}
        `}
        >
          <Icon className={`w-5 h-5 ${isHeadhunting ? 'text-blue-600 dark:text-blue-400' : 'text-purple-600 dark:text-purple-400'}`} />
        </div>
        <div>
          <h3 className="text-[15px] font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
          <p className="text-[12px] text-gray-500 dark:text-gray-400">{tagline}</p>
        </div>
      </div>

      {/* Description */}
      <p className="text-[13px] text-gray-600 dark:text-gray-400 mb-3">{description}</p>

      {/* Features */}
      <ul className="space-y-1.5 mb-4">
        {features.map((feature, idx) => (
          <li key={idx} className="flex items-center gap-2 text-[12px] text-gray-600 dark:text-gray-400">
            <Check
              className={`w-3.5 h-3.5 ${isHeadhunting ? 'text-blue-500 dark:text-blue-400' : 'text-purple-500 dark:text-purple-400'}`}
            />
            {feature}
          </li>
        ))}
      </ul>

      {/* Pricing */}
      <div className="mt-auto pt-3 border-t border-gray-200 dark:border-gray-700">
        <p className="text-[13px] font-medium text-gray-900 dark:text-gray-100">{pricing}</p>
      </div>
    </button>
  )
}

export default function CreateCompanyForm({ onSuccess }: CreateCompanyFormProps) {
  const { createCompany, isCreating, error: createError } = useCreateCompany()
  const { countries, isLoading: countriesLoading } = useCountries()
  const [selectedCountryId, setSelectedCountryId] = useState<number | null>(null)
  const { cities, isLoading: citiesLoading } = useCities({ countryId: selectedCountryId })

  // Terms state
  const [selectedTermsSlug, setSelectedTermsSlug] = useState('')
  const [termsAgreed, setTermsAgreed] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateCompanyFormData>({
    resolver: zodResolver(createCompanySchema),
    defaultValues: {
      headquarters_country: null,
      headquarters_city: null,
    },
  })

  const selectedServiceType = watch('service_type')

  // Reset terms when service type changes
  useEffect(() => {
    setSelectedTermsSlug('')
    setTermsAgreed(false)
    setValue('terms_agreed', undefined as unknown as true)
  }, [selectedServiceType, setValue])

  // Handle document selection
  const handleSelectDocument = useCallback((slug: string) => {
    setSelectedTermsSlug(slug)
  }, [])

  // Handle terms agreement
  const handleAgreeChange = useCallback(
    (agreed: boolean) => {
      setTermsAgreed(agreed)
      setValue('terms_agreed', agreed as true, { shouldValidate: true })
    },
    [setValue]
  )

  const onSubmit = async (data: CreateCompanyFormData) => {
    try {
      await createCompany({
        name: data.name,
        tagline: data.tagline,
        service_type: data.service_type,
        headquarters_country: data.headquarters_country ?? undefined,
        headquarters_city: data.headquarters_city ?? undefined,
        // Terms acceptance - will be recorded in backend
        terms_document_slug: selectedTermsSlug || undefined,
      })
      onSuccess()
    } catch {
      // Error is already set by the hook
    }
  }

  const handleCountryChange = (countryId: number | null) => {
    setSelectedCountryId(countryId)
    setValue('headquarters_country', countryId)
    // Reset city when country changes
    setValue('headquarters_city', null)
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-8 max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
          <Building2 className="w-6 h-6 text-gray-600 dark:text-gray-400" />
        </div>
        <h2 className="text-[18px] font-semibold text-gray-900 dark:text-gray-100">Create Your Company</h2>
        <p className="text-[14px] text-gray-500 dark:text-gray-400 mt-1">
          Set up your company profile and choose your recruitment package
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {createError && (
          <div className="px-3 py-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-[13px] text-red-600 dark:text-red-400">{createError}</p>
          </div>
        )}

        {/* Service Type Selection */}
        <div>
          <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-3">
            Select Your Package <span className="text-red-500">*</span>
          </label>
          <Controller
            name="service_type"
            control={control}
            render={({ field }) => (
              <div className="grid grid-cols-2 gap-4">
                <ServiceTypeCard
                  type="headhunting"
                  selected={field.value === 'headhunting'}
                  onSelect={() => field.onChange('headhunting')}
                />
                <ServiceTypeCard
                  type="retained"
                  selected={field.value === 'retained'}
                  onSelect={() => field.onChange('retained')}
                />
              </div>
            )}
          />
          {errors.service_type && (
            <p className="mt-2 text-[12px] text-red-500 dark:text-red-400">{errors.service_type.message}</p>
          )}
        </div>

        {/* Company Details */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <h3 className="text-[14px] font-medium text-gray-900 dark:text-gray-100 mb-4">Company Details</h3>

          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Company name <span className="text-red-500">*</span>
              </label>
              <input
                {...register('name')}
                id="name"
                type="text"
                placeholder="Acme Inc."
                className={`w-full h-10 px-3 text-[14px] border rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-colors
                  ${
                    errors.name
                      ? 'border-red-300 dark:border-red-700 focus:border-red-400 dark:focus:border-red-600 focus:ring-1 focus:ring-red-400 dark:focus:ring-red-600'
                      : 'border-gray-300 dark:border-gray-600 focus:border-gray-900 dark:focus:border-gray-100 focus:ring-1 focus:ring-gray-900 dark:focus:ring-gray-100'
                  } outline-none`}
              />
              {errors.name && <p className="mt-1 text-[12px] text-red-500 dark:text-red-400">{errors.name.message}</p>}
            </div>

            <div>
              <label
                htmlFor="tagline"
                className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1.5"
              >
                Tagline
              </label>
              <input
                {...register('tagline')}
                id="tagline"
                type="text"
                placeholder="A short description of your company"
                className={`w-full h-10 px-3 text-[14px] border rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-colors
                  ${
                    errors.tagline
                      ? 'border-red-300 dark:border-red-700 focus:border-red-400 dark:focus:border-red-600 focus:ring-1 focus:ring-red-400 dark:focus:ring-red-600'
                      : 'border-gray-300 dark:border-gray-600 focus:border-gray-900 dark:focus:border-gray-100 focus:ring-1 focus:ring-gray-900 dark:focus:ring-gray-100'
                  } outline-none`}
              />
              {errors.tagline && (
                <p className="mt-1 text-[12px] text-red-500 dark:text-red-400">{errors.tagline.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Country Dropdown */}
              <div>
                <label
                  htmlFor="headquarters_country"
                  className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1.5"
                >
                  Country
                </label>
                <div className="relative">
                  <select
                    id="headquarters_country"
                    value={selectedCountryId ?? ''}
                    onChange={(e) => {
                      const value = e.target.value ? parseInt(e.target.value, 10) : null
                      handleCountryChange(value)
                    }}
                    disabled={countriesLoading}
                    className="w-full h-10 px-3 pr-8 text-[14px] border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors focus:border-gray-900 dark:focus:border-gray-100 focus:ring-1 focus:ring-gray-900 dark:focus:ring-gray-100 outline-none appearance-none cursor-pointer disabled:opacity-50"
                  >
                    <option value="">Select country</option>
                    {countries.map((country) => (
                      <option key={country.id} value={country.id}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
                </div>
              </div>

              {/* City Dropdown */}
              <div>
                <label
                  htmlFor="headquarters_city"
                  className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1.5"
                >
                  City
                </label>
                <Controller
                  name="headquarters_city"
                  control={control}
                  render={({ field }) => (
                    <div className="relative">
                      <select
                        id="headquarters_city"
                        value={field.value ?? ''}
                        onChange={(e) => {
                          const value = e.target.value ? parseInt(e.target.value, 10) : null
                          field.onChange(value)
                        }}
                        disabled={!selectedCountryId || citiesLoading}
                        className="w-full h-10 px-3 pr-8 text-[14px] border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors focus:border-gray-900 dark:focus:border-gray-100 focus:ring-1 focus:ring-gray-900 dark:focus:ring-gray-100 outline-none appearance-none cursor-pointer disabled:opacity-50 disabled:bg-gray-50 dark:disabled:bg-gray-800"
                      >
                        <option value="">
                          {!selectedCountryId ? 'Select country first' : 'Select city'}
                        </option>
                        {cities.map((city) => (
                          <option key={city.id} value={city.id}>
                            {city.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
                    </div>
                  )}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Terms & Conditions Section */}
        {selectedServiceType && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <TermsSection
              newType={selectedServiceType}
              selectedSlug={selectedTermsSlug}
              onSelectDocument={handleSelectDocument}
              termsAgreed={termsAgreed}
              onAgreeChange={handleAgreeChange}
            />
            {errors.terms_agreed && (
              <p className="mt-2 text-[12px] text-red-500 dark:text-red-400">{errors.terms_agreed.message}</p>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={isCreating || !termsAgreed}
          className="w-full h-10 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[14px] font-medium rounded-md hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isCreating ? 'Creating...' : 'Create Company'}
        </button>
      </form>
    </div>
  )
}
