import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AxiosError } from 'axios';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const from = (location.state as { from?: Location })?.from?.pathname || '/dashboard';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setServerError(null);
      await login(data);
      navigate(from, { replace: true });
    } catch (error) {
      const axiosError = error as AxiosError<{ non_field_errors?: string[] }>;
      if (axiosError.response?.data?.non_field_errors?.[0]) {
        setServerError(axiosError.response.data.non_field_errors[0]);
      } else {
        setServerError('Invalid email or password.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="p-6">
        <Link to="/" className="text-xl font-semibold text-gray-900">
          Oneo
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 pb-20">
        <div className="w-full max-w-[340px]">
          <h1 className="text-[28px] font-semibold text-gray-900 tracking-tight">
            Sign in
          </h1>
          <p className="mt-2 text-[15px] text-gray-500">
            Welcome back to Oneo
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8" noValidate>
            {serverError && (
              <div className="mb-6 px-3 py-2.5 bg-red-50 border border-red-200 rounded-md">
                <p className="text-[13px] text-red-600">{serverError}</p>
              </div>
            )}

            <div className="space-y-4">
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

              <div>
                <label htmlFor="password" className="block text-[13px] font-medium text-gray-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    {...register('password')}
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
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
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      {showPassword ? (
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22" strokeLinecap="round" strokeLinejoin="round" />
                      ) : (
                        <>
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeLinecap="round" strokeLinejoin="round" />
                          <circle cx="12" cy="12" r="3" />
                        </>
                      )}
                    </svg>
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1.5 text-[12px] text-red-500">{errors.password.message}</p>
                )}
              </div>
            </div>

            <div className="mt-4 text-right">
              <Link to="/forgot-password" className="text-[13px] text-gray-500 hover:text-gray-700">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-6 w-full h-10 bg-gray-900 text-white text-[14px] font-medium rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="mt-8 text-center text-[14px] text-gray-500">
            Don't have an account?{' '}
            <Link to="/signup" className="text-gray-900 font-medium hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
