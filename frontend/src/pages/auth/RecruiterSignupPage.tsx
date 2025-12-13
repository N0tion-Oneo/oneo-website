import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { usePublicBranding } from '@/hooks'
import api, { setTokens } from '@/services/api'
import { AxiosError } from 'axios'

const recruiterSignupSchema = z
  .object({
    first_name: z.string().min(1, 'Required'),
    last_name: z.string().min(1, 'Required'),
    email: z.string().email('Please enter a valid email'),
    phone: z.string().optional(),
    password: z
      .string()
      .min(8, 'At least 8 characters')
      .regex(/[A-Z]/, 'Include an uppercase letter')
      .regex(/[a-z]/, 'Include a lowercase letter')
      .regex(/[0-9]/, 'Include a number'),
    password_confirm: z.string().min(1, 'Required'),
  })
  .refine((data) => data.password === data.password_confirm, {
    message: 'Passwords do not match',
    path: ['password_confirm'],
  })

type RecruiterSignupFormData = z.infer<typeof recruiterSignupSchema>

interface InvitationValidation {
  valid: boolean
  email: string
}

export default function RecruiterSignupPage() {
  const { token } = useParams<{ token: string }>()
  const { updateUser } = useAuth()
  const { branding } = usePublicBranding()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [validating, setValidating] = useState(true)
  const [invitationValid, setInvitationValid] = useState(false)
  const [invitationEmail, setInvitationEmail] = useState('')

  const brandName = branding?.company_name || ''

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    setValue,
    watch,
  } = useForm<RecruiterSignupFormData>({
    resolver: zodResolver(recruiterSignupSchema),
  })

  const password = watch('password', '')

  const requirements = [
    { met: password.length >= 8, text: '8+ characters' },
    { met: /[A-Z]/.test(password), text: 'Uppercase' },
    { met: /[a-z]/.test(password), text: 'Lowercase' },
    { met: /[0-9]/.test(password), text: 'Number' },
  ]

  // Validate invitation token on mount
  useEffect(() => {
    async function validateToken() {
      if (!token) {
        setValidating(false)
        return
      }

      try {
        const response = await api.get<InvitationValidation>(
          `/auth/recruiter-invitations/${token}/validate/`
        )
        setInvitationValid(response.data.valid)
        if (response.data.email) {
          setInvitationEmail(response.data.email)
          setValue('email', response.data.email)
        }
      } catch {
        setInvitationValid(false)
      } finally {
        setValidating(false)
      }
    }

    validateToken()
  }, [token, setValue])

  const onSubmit = async (data: RecruiterSignupFormData) => {
    if (!token) return

    try {
      setServerError(null)
      const response = await api.post(`/auth/recruiter-invitations/${token}/signup/`, data)

      // Store tokens first
      if (response.data.access && response.data.refresh) {
        setTokens(response.data.access, response.data.refresh)
      }

      // Update user in auth context
      if (response.data.user) {
        updateUser(response.data.user)
      }

      navigate('/dashboard', { replace: true })
    } catch (error) {
      const axiosError = error as AxiosError<Record<string, string | string[]>>
      if (axiosError.response?.data) {
        const errors = axiosError.response.data
        if (errors.email) {
          const msg = Array.isArray(errors.email) ? errors.email[0] : errors.email
          setError('email', { message: msg })
        }
        if (errors.password) {
          const msg = Array.isArray(errors.password) ? errors.password[0] : errors.password
          setError('password', { message: msg })
        }
        if (errors.error) {
          const msg = Array.isArray(errors.error) ? errors.error[0] : errors.error
          setServerError(msg)
        }
        if (errors.non_field_errors) {
          const msg = Array.isArray(errors.non_field_errors)
            ? errors.non_field_errors[0]
            : errors.non_field_errors
          setServerError(msg)
        }
      } else {
        setServerError('Something went wrong. Please try again.')
      }
    }
  }

  const EyeIcon = ({ show }: { show: boolean }) => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      {show ? (
        <path
          d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <>
          <path
            d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
    </svg>
  )

  if (validating) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-purple-600 mx-auto" />
          <p className="text-[14px] text-gray-500 mt-3">Validating invitation...</p>
        </div>
      </div>
    )
  }

  if (!invitationValid) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <header className="p-6">
          <Link to="/" className="flex items-center">
            {branding?.logo_url ? (
              <img src={branding.logo_url} alt={brandName} className="h-8 w-auto" />
            ) : (
              <span className="text-xl font-semibold text-gray-900">{brandName}</span>
            )}
          </Link>
        </header>

        <main className="flex-1 flex items-center justify-center px-6 pb-12">
          <div className="w-full max-w-[340px] text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h1 className="text-[22px] font-semibold text-gray-900">Invalid Invitation</h1>
            <p className="mt-2 text-[14px] text-gray-500">
              This invitation link is invalid or has expired. Please contact your administrator for
              a new invitation.
            </p>
            <Link
              to="/"
              className="mt-6 inline-block text-[14px] font-medium text-gray-900 hover:underline"
            >
              Go to homepage
            </Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="p-6">
        <Link to="/" className="flex items-center">
          {branding?.logo_url ? (
            <img src={branding.logo_url} alt={brandName} className="h-8 w-auto" />
          ) : (
            <span className="text-xl font-semibold text-gray-900">{brandName}</span>
          )}
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 pb-12">
        <div className="w-full max-w-[340px]">
          <div className="flex items-center gap-2 mb-4">
            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[11px] font-medium rounded-full">
              Recruiter
            </span>
          </div>
          <h1 className="text-[28px] font-semibold text-gray-900 tracking-tight">
            Join the team
          </h1>
          <p className="mt-2 text-[15px] text-gray-500">
            You've been invited to join {brandName} as a recruiter
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8" noValidate>
            {serverError && (
              <div className="mb-6 px-3 py-2.5 bg-red-50 border border-red-200 rounded-md">
                <p className="text-[13px] text-red-600">{serverError}</p>
              </div>
            )}

            <div className="space-y-4">
              {/* Name row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="first_name"
                    className="block text-[13px] font-medium text-gray-700 mb-1.5"
                  >
                    First name
                  </label>
                  <input
                    {...register('first_name')}
                    id="first_name"
                    type="text"
                    autoComplete="given-name"
                    className={`w-full h-10 px-3 text-[14px] border rounded-md bg-white transition-colors
                      ${
                        errors.first_name
                          ? 'border-red-300 focus:border-red-400 focus:ring-1 focus:ring-red-400'
                          : 'border-gray-300 focus:border-gray-900 focus:ring-1 focus:ring-gray-900'
                      } outline-none`}
                  />
                  {errors.first_name && (
                    <p className="mt-1 text-[12px] text-red-500">{errors.first_name.message}</p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="last_name"
                    className="block text-[13px] font-medium text-gray-700 mb-1.5"
                  >
                    Last name
                  </label>
                  <input
                    {...register('last_name')}
                    id="last_name"
                    type="text"
                    autoComplete="family-name"
                    className={`w-full h-10 px-3 text-[14px] border rounded-md bg-white transition-colors
                      ${
                        errors.last_name
                          ? 'border-red-300 focus:border-red-400 focus:ring-1 focus:ring-red-400'
                          : 'border-gray-300 focus:border-gray-900 focus:ring-1 focus:ring-gray-900'
                      } outline-none`}
                  />
                  {errors.last_name && (
                    <p className="mt-1 text-[12px] text-red-500">{errors.last_name.message}</p>
                  )}
                </div>
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-[13px] font-medium text-gray-700 mb-1.5"
                >
                  Email
                </label>
                <input
                  {...register('email')}
                  id="email"
                  type="email"
                  autoComplete="email"
                  readOnly={!!invitationEmail}
                  className={`w-full h-10 px-3 text-[14px] border rounded-md transition-colors
                    ${invitationEmail ? 'bg-gray-50' : 'bg-white'}
                    ${
                      errors.email
                        ? 'border-red-300 focus:border-red-400 focus:ring-1 focus:ring-red-400'
                        : 'border-gray-300 focus:border-gray-900 focus:ring-1 focus:ring-gray-900'
                    } outline-none`}
                  placeholder="you@example.com"
                />
                {errors.email && (
                  <p className="mt-1.5 text-[12px] text-red-500">{errors.email.message}</p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label
                  htmlFor="phone"
                  className="block text-[13px] font-medium text-gray-700 mb-1.5"
                >
                  Phone <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  {...register('phone')}
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  className="w-full h-10 px-3 text-[14px] border rounded-md bg-white transition-colors border-gray-300 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none"
                  placeholder="+1 (555) 000-0000"
                />
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-[13px] font-medium text-gray-700 mb-1.5"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    {...register('password')}
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    className={`w-full h-10 px-3 pr-10 text-[14px] border rounded-md bg-white transition-colors
                      ${
                        errors.password
                          ? 'border-red-300 focus:border-red-400 focus:ring-1 focus:ring-red-400'
                          : 'border-gray-300 focus:border-gray-900 focus:ring-1 focus:ring-gray-900'
                      } outline-none`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    <EyeIcon show={showPassword} />
                  </button>
                </div>
                {/* Requirements inline */}
                <div className="mt-2 flex flex-wrap gap-2">
                  {requirements.map((req, i) => (
                    <span
                      key={i}
                      className={`text-[11px] px-2 py-0.5 rounded-full transition-colors ${
                        req.met ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {req.text}
                    </span>
                  ))}
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label
                  htmlFor="password_confirm"
                  className="block text-[13px] font-medium text-gray-700 mb-1.5"
                >
                  Confirm password
                </label>
                <input
                  {...register('password_confirm')}
                  id="password_confirm"
                  type="password"
                  autoComplete="new-password"
                  className={`w-full h-10 px-3 text-[14px] border rounded-md bg-white transition-colors
                    ${
                      errors.password_confirm
                        ? 'border-red-300 focus:border-red-400 focus:ring-1 focus:ring-red-400'
                        : 'border-gray-300 focus:border-gray-900 focus:ring-1 focus:ring-gray-900'
                    } outline-none`}
                />
                {errors.password_confirm && (
                  <p className="mt-1.5 text-[12px] text-red-500">
                    {errors.password_confirm.message}
                  </p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-6 w-full h-10 bg-purple-600 text-white text-[14px] font-medium rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Creating account...' : 'Create account'}
            </button>

            <p className="mt-4 text-[12px] text-center text-gray-400">
              By signing up, you agree to our{' '}
              <Link to="/terms" className="text-gray-500 hover:underline">
                Terms
              </Link>{' '}
              and{' '}
              <Link to="/privacy" className="text-gray-500 hover:underline">
                Privacy Policy
              </Link>
            </p>
          </form>
        </div>
      </main>
    </div>
  )
}
