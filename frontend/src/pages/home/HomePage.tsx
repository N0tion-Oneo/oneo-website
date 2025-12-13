import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/layout';
import { SEO } from '@/components/seo';
import { useSEODefaults } from '@/contexts/SEOContext';

export default function HomePage() {
  const { isAuthenticated } = useAuth();
  const seoDefaults = useSEODefaults();

  return (
    <div className="min-h-screen bg-white">
      <SEO />
      <Navbar />

      <main className="max-w-5xl mx-auto px-6">
        {/* Hero */}
        <section className="py-20 md:py-32">
          <h1 className="text-4xl md:text-5xl font-semibold text-gray-900 tracking-tight max-w-2xl">
            Find your next opportunity in recruitment
          </h1>
          <p className="mt-6 text-lg text-gray-500 max-w-xl">
            {seoDefaults.companyName ? `${seoDefaults.companyName} connects` : 'We connect'} talented candidates with leading companies.
            Start your journey today.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="px-6 py-3 bg-gray-900 text-white text-[14px] font-medium rounded-md hover:bg-gray-800 transition-colors"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/signup"
                  className="px-6 py-3 bg-gray-900 text-white text-[14px] font-medium rounded-md hover:bg-gray-800 transition-colors"
                >
                  Get started
                </Link>
                <Link
                  to="/login"
                  className="px-6 py-3 border border-gray-300 text-gray-700 text-[14px] font-medium rounded-md hover:border-gray-400 transition-colors"
                >
                  Sign in
                </Link>
              </>
            )}
          </div>
        </section>

        {/* Features */}
        <section className="py-16 border-t border-gray-100">
          <div className="grid md:grid-cols-3 gap-10">
            <div>
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <h3 className="text-[15px] font-medium text-gray-900 mb-2">Build your profile</h3>
              <p className="text-[14px] text-gray-500">
                Create a comprehensive profile showcasing your skills, experience, and career goals.
              </p>
            </div>
            <div>
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3 className="text-[15px] font-medium text-gray-900 mb-2">Discover opportunities</h3>
              <p className="text-[14px] text-gray-500">
                Browse curated job listings from top companies looking for talent like you.
              </p>
            </div>
            <div>
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M22 4L12 14.01l-3-3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3 className="text-[15px] font-medium text-gray-900 mb-2">Track applications</h3>
              <p className="text-[14px] text-gray-500">
                Stay organized with real-time updates on your application status.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 mt-16">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-[13px] text-gray-400">
            © {new Date().getFullYear()} {seoDefaults.companyName || 'All rights reserved'}.{seoDefaults.companyName ? ' All rights reserved.' : ''}
          </p>
        </div>
      </footer>
    </div>
  );
}
