import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCreateCompany } from '@/hooks'
import { Building2 } from 'lucide-react'

const createCompanySchema = z.object({
  name: z.string().min(1, 'Company name is required').max(100, 'Name too long'),
  tagline: z.string().max(200, 'Tagline too long').optional(),
  headquarters_city: z.string().max(100, 'City name too long').optional(),
  headquarters_country: z.string().max(100, 'Country name too long').optional(),
})

type CreateCompanyFormData = z.infer<typeof createCompanySchema>

interface CreateCompanyFormProps {
  onSuccess: () => void
}

export default function CreateCompanyForm({ onSuccess }: CreateCompanyFormProps) {
  const { createCompany, isCreating, error: createError } = useCreateCompany()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
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
    <div className="bg-white border border-gray-200 rounded-lg p-8 max-w-md mx-auto">
      <div className="text-center mb-6">
        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Building2 className="w-6 h-6 text-gray-600" />
        </div>
        <h2 className="text-[18px] font-semibold text-gray-900">Create Your Company</h2>
        <p className="text-[14px] text-gray-500 mt-1">
          Set up your company profile to start managing your team
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {(serverError || createError) && (
          <div className="px-3 py-2.5 bg-red-50 border border-red-200 rounded-md">
            <p className="text-[13px] text-red-600">{serverError || createError}</p>
          </div>
        )}

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
          <label htmlFor="tagline" className="block text-[13px] font-medium text-gray-700 mb-1.5">
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

        <button
          type="submit"
          disabled={isCreating}
          className="w-full h-10 bg-gray-900 text-white text-[14px] font-medium rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-6"
        >
          {isCreating ? 'Creating...' : 'Create Company'}
        </button>
      </form>
    </div>
  )
}
