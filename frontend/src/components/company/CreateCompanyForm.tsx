import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCreateCompany } from '@/hooks'
import { Building2, Target, Handshake, Check } from 'lucide-react'

const createCompanySchema = z.object({
  name: z.string().min(1, 'Company name is required').max(100, 'Name too long'),
  tagline: z.string().max(200, 'Tagline too long').optional(),
  headquarters_city: z.string().max(100, 'City name too long').optional(),
  headquarters_country: z.string().max(100, 'Country name too long').optional(),
  service_type: z.enum(['headhunting', 'retained'], {
    required_error: 'Please select a service package',
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
            ? 'border-gray-900 bg-gray-50 ring-1 ring-gray-900'
            : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
        }
      `}
    >
      {/* Selected indicator */}
      {selected && (
        <div className="absolute top-3 right-3 w-5 h-5 bg-gray-900 rounded-full flex items-center justify-center">
          <Check className="w-3 h-3 text-white" />
        </div>
      )}

      {/* Icon and title */}
      <div className="flex items-center gap-3 mb-3">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center
          ${isHeadhunting ? 'bg-blue-100' : 'bg-purple-100'}
        `}
        >
          <Icon className={`w-5 h-5 ${isHeadhunting ? 'text-blue-600' : 'text-purple-600'}`} />
        </div>
        <div>
          <h3 className="text-[15px] font-semibold text-gray-900">{title}</h3>
          <p className="text-[12px] text-gray-500">{tagline}</p>
        </div>
      </div>

      {/* Description */}
      <p className="text-[13px] text-gray-600 mb-3">{description}</p>

      {/* Features */}
      <ul className="space-y-1.5 mb-4">
        {features.map((feature, idx) => (
          <li key={idx} className="flex items-center gap-2 text-[12px] text-gray-600">
            <Check
              className={`w-3.5 h-3.5 ${isHeadhunting ? 'text-blue-500' : 'text-purple-500'}`}
            />
            {feature}
          </li>
        ))}
      </ul>

      {/* Pricing */}
      <div className="mt-auto pt-3 border-t border-gray-200">
        <p className="text-[13px] font-medium text-gray-900">{pricing}</p>
      </div>
    </button>
  )
}

export default function CreateCompanyForm({ onSuccess }: CreateCompanyFormProps) {
  const { createCompany, isCreating, error: createError } = useCreateCompany()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CreateCompanyFormData>({
    resolver: zodResolver(createCompanySchema),
  })

  const onSubmit = async (data: CreateCompanyFormData) => {
    try {
      setServerError(null)
      await createCompany(data)
      onSuccess()
    } catch {
      setServerError(createError || 'Failed to create company')
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-8 max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Building2 className="w-6 h-6 text-gray-600" />
        </div>
        <h2 className="text-[18px] font-semibold text-gray-900">Create Your Company</h2>
        <p className="text-[14px] text-gray-500 mt-1">
          Set up your company profile and choose your recruitment package
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {(serverError || createError) && (
          <div className="px-3 py-2.5 bg-red-50 border border-red-200 rounded-md">
            <p className="text-[13px] text-red-600">{serverError || createError}</p>
          </div>
        )}

        {/* Service Type Selection */}
        <div>
          <label className="block text-[13px] font-medium text-gray-700 mb-3">
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
            <p className="mt-2 text-[12px] text-red-500">{errors.service_type.message}</p>
          )}
        </div>

        {/* Company Details */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-[14px] font-medium text-gray-900 mb-4">Company Details</h3>

          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-[13px] font-medium text-gray-700 mb-1.5">
                Company name <span className="text-red-500">*</span>
              </label>
              <input
                {...register('name')}
                id="name"
                type="text"
                placeholder="Acme Inc."
                className={`w-full h-10 px-3 text-[14px] border rounded-md bg-white transition-colors
                  ${
                    errors.name
                      ? 'border-red-300 focus:border-red-400 focus:ring-1 focus:ring-red-400'
                      : 'border-gray-300 focus:border-gray-900 focus:ring-1 focus:ring-gray-900'
                  } outline-none`}
              />
              {errors.name && <p className="mt-1 text-[12px] text-red-500">{errors.name.message}</p>}
            </div>

            <div>
              <label
                htmlFor="tagline"
                className="block text-[13px] font-medium text-gray-700 mb-1.5"
              >
                Tagline
              </label>
              <input
                {...register('tagline')}
                id="tagline"
                type="text"
                placeholder="A short description of your company"
                className={`w-full h-10 px-3 text-[14px] border rounded-md bg-white transition-colors
                  ${
                    errors.tagline
                      ? 'border-red-300 focus:border-red-400 focus:ring-1 focus:ring-red-400'
                      : 'border-gray-300 focus:border-gray-900 focus:ring-1 focus:ring-gray-900'
                  } outline-none`}
              />
              {errors.tagline && (
                <p className="mt-1 text-[12px] text-red-500">{errors.tagline.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="headquarters_city"
                  className="block text-[13px] font-medium text-gray-700 mb-1.5"
                >
                  City
                </label>
                <input
                  {...register('headquarters_city')}
                  id="headquarters_city"
                  type="text"
                  placeholder="Cape Town"
                  className={`w-full h-10 px-3 text-[14px] border rounded-md bg-white transition-colors
                    ${
                      errors.headquarters_city
                        ? 'border-red-300 focus:border-red-400 focus:ring-1 focus:ring-red-400'
                        : 'border-gray-300 focus:border-gray-900 focus:ring-1 focus:ring-gray-900'
                    } outline-none`}
                />
              </div>
              <div>
                <label
                  htmlFor="headquarters_country"
                  className="block text-[13px] font-medium text-gray-700 mb-1.5"
                >
                  Country
                </label>
                <input
                  {...register('headquarters_country')}
                  id="headquarters_country"
                  type="text"
                  placeholder="South Africa"
                  className={`w-full h-10 px-3 text-[14px] border rounded-md bg-white transition-colors
                    ${
                      errors.headquarters_country
                        ? 'border-red-300 focus:border-red-400 focus:ring-1 focus:ring-red-400'
                        : 'border-gray-300 focus:border-gray-900 focus:ring-1 focus:ring-gray-900'
                    } outline-none`}
                />
              </div>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isCreating}
          className="w-full h-10 bg-gray-900 text-white text-[14px] font-medium rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isCreating ? 'Creating...' : 'Create Company'}
        </button>
      </form>
    </div>
  )
}
