import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePublicBranding } from '@/hooks';
import { AxiosError } from 'axios';

const signupSchema = z
  .object({
    first_name: z.string().min(1, 'Required'),
    last_name: z.string().min(1, 'Required'),
    email: z.string().email('Please enter a valid email'),
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
  });

type SignupFormData = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const { register: registerUser } = useAuth();
  const { branding } = usePublicBranding();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const companyName = branding?.company_name || 'Oneo';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    watch,
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  const password = watch('password', '');

  const requirements = [
    { met: password.length >= 8, text: '8+ characters' },
    { met: /[A-Z]/.test(password), text: 'Uppercase' },
    { met: /[a-z]/.test(password), text: 'Lowercase' },
    { met: /[0-9]/.test(password), text: 'Number' },
  ];

  const onSubmit = async (data: SignupFormData) => {
    try {
      setServerError(null);
      await registerUser(data);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      const axiosError = error as AxiosError<Record<string, string[]>>;
      if (axiosError.response?.data) {
        const errors = axiosError.response.data;
        if (errors.email) setError('email', { message: errors.email[0] });
        if (errors.password) setError('password', { message: errors.password[0] });
        if (errors.non_field_errors?.[0]) setServerError(errors.non_field_errors[0]);
      } else {
        setServerError('Something went wrong. Please try again.');
      }
    }
  };

  const EyeIcon = ({ show }: { show: boolean }) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      {show ? (
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
    </svg>
  );

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="p-6">
        <Link to="/" className="flex items-center">
          {branding?.logo_url ? (
            <img
              src={branding.logo_url}
              alt={companyName}
              className="h-8 w-auto"
            />
          ) : (
            <span className="text-xl font-semibold text-gray-900">{companyName}</span>
          )}
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 pb-12">
        <div className="w-full max-w-[340px]">
          <h1 className="text-[28px] font-semibold text-gray-900 tracking-tight">
            Create account
          </h1>
          <p className="mt-2 text-[15px] text-gray-500">
            Get started with {companyName}
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
                  <label htmlFor="first_name" className="block text-[13px] font-medium text-gray-700 mb-1.5">
                    First name
                  </label>
                  <input
                    {...register('first_name')}
                    id="first_name"
                    type="text"
                    autoComplete="given-name"
                    className={`w-full h-10 px-3 text-[14px] border rounded-md bg-white transition-colors
                      ${errors.first_name
                        ? 'border-red-300 focus:border-red-400 focus:ring-1 focus:ring-red-400'
                        : 'border-gray-300 focus:border-gray-900 focus:ring-1 focus:ring-gray-900'
                      } outline-none`}
                  />
                  {errors.first_name && (
                    <p className="mt-1 text-[12px] text-red-500">{errors.first_name.message}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="last_name" className="block text-[13px] font-medium text-gray-700 mb-1.5">
                    Last name
                  </label>
                  <input
                    {...register('last_name')}
                    id="last_name"
                    type="text"
                    autoComplete="family-name"
                    className={`w-full h-10 px-3 text-[14px] border rounded-md bg-white transition-colors
                      ${errors.last_name
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
                <label htmlFor="email" className="block text-[13px] font-medium text-gray-700 mb-1.5">
                  Email
                </label>
                <input
                  {...register('email')}
                  id="email"
                  type="email"
                  autoComplete="email"
                  className={`w-full h-10 px-3 text-[14px] border rounded-md bg-white transition-colors
                    ${errors.email
                      ? 'border-red-300 focus:border-red-400 focus:ring-1 focus:ring-red-400'
                      : 'border-gray-300 focus:border-gray-900 focus:ring-1 focus:ring-gray-900'
                    } outline-none`}
                  placeholder="you@example.com"
                />
                {errors.email && (
                  <p className="mt-1.5 text-[12px] text-red-500">{errors.email.message}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-[13px] font-medium text-gray-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    {...register('password')}
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    className={`w-full h-10 px-3 pr-10 text-[14px] border rounded-md bg-white transition-colors
                      ${errors.password
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
                        req.met
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {req.text}
                    </span>
                  ))}
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="password_confirm" className="block text-[13px] font-medium text-gray-700 mb-1.5">
                  Confirm password
                </label>
                <input
                  {...register('password_confirm')}
                  id="password_confirm"
                  type="password"
                  autoComplete="new-password"
                  className={`w-full h-10 px-3 text-[14px] border rounded-md bg-white transition-colors
                    ${errors.password_confirm
                      ? 'border-red-300 focus:border-red-400 focus:ring-1 focus:ring-red-400'
                      : 'border-gray-300 focus:border-gray-900 focus:ring-1 focus:ring-gray-900'
                    } outline-none`}
                />
                {errors.password_confirm && (
                  <p className="mt-1.5 text-[12px] text-red-500">{errors.password_confirm.message}</p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-6 w-full h-10 bg-gray-900 text-white text-[14px] font-medium rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Creating account...' : 'Create account'}
            </button>

            <p className="mt-4 text-[12px] text-center text-gray-400">
              By signing up, you agree to our{' '}
              <Link to="/terms" className="text-gray-500 hover:underline">Terms</Link>
              {' '}and{' '}
              <Link to="/privacy" className="text-gray-500 hover:underline">Privacy Policy</Link>
            </p>
          </form>

          <p className="mt-8 text-center text-[14px] text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="text-gray-900 font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
