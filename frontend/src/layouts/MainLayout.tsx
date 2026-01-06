import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/utils/cn';
import { usePublicBranding } from '@/hooks';
import { useTheme } from '@/contexts/ThemeContext';

interface MainLayoutProps {
  children: ReactNode;
  className?: string;
}

function Navbar() {
  const { branding } = usePublicBranding();
  const { isDark } = useTheme();

  // Use dark logo for navbar (dark background) or when in dark mode
  // The navbar has bg-primary which is dark, so prefer dark logo if available
  const logoUrl = branding?.logo_dark_url || branding?.logo_url;

  return (
    <nav className="bg-primary text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={branding?.company_name || 'Logo'}
                className="h-8 max-w-[140px] object-contain"
                width={140}
                height={32}
              />
            ) : (
              <span className="text-2xl font-bold">{branding?.company_name || ''}</span>
            )}
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              to="/jobs"
              className="text-white/90 hover:text-white transition-colors"
            >
              Jobs
            </Link>
            <Link
              to="/candidates"
              className="text-white/90 hover:text-white transition-colors"
            >
              Candidates
            </Link>
            <Link
              to="/companies"
              className="text-white/90 hover:text-white transition-colors"
            >
              Companies
            </Link>
          </div>

          {/* Auth Buttons */}
          <div className="flex items-center space-x-4">
            <Link
              to="/login"
              className="text-white/90 hover:text-white transition-colors"
            >
              Log in
            </Link>
            <Link
              to="/signup"
              className="px-4 py-2 bg-accent text-white rounded-md hover:bg-accent-dark transition-colors"
            >
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

function Footer() {
  const currentYear = new Date().getFullYear();
  const { branding } = usePublicBranding();

  // Use dark logo for footer (dark background)
  const logoUrl = branding?.logo_dark_url || branding?.logo_url;

  return (
    <footer className="bg-primary text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={branding?.company_name || 'Logo'}
                className="h-8 max-w-[140px] object-contain mb-4"
                width={140}
                height={32}
              />
            ) : (
              <h3 className="text-2xl font-bold mb-4">{branding?.company_name || ''}</h3>
            )}
            <p className="text-white/70 text-sm">
              {branding?.tagline || 'Connecting exceptional talent with innovative companies.'}
            </p>
          </div>

          {/* For Candidates */}
          <div>
            <h4 className="font-semibold mb-4">For Candidates</h4>
            <ul className="space-y-2 text-sm text-white/70">
              <li>
                <Link to="/jobs" className="hover:text-white transition-colors">
                  Browse Jobs
                </Link>
              </li>
              <li>
                <Link to="/signup" className="hover:text-white transition-colors">
                  Create Profile
                </Link>
              </li>
              <li>
                <Link to="/book-a-call" className="hover:text-white transition-colors">
                  Book a Call
                </Link>
              </li>
            </ul>
          </div>

          {/* For Companies */}
          <div>
            <h4 className="font-semibold mb-4">For Companies</h4>
            <ul className="space-y-2 text-sm text-white/70">
              <li>
                <Link to="/services" className="hover:text-white transition-colors">
                  Our Services
                </Link>
              </li>
              <li>
                <Link to="/candidates" className="hover:text-white transition-colors">
                  Find Talent
                </Link>
              </li>
              <li>
                <Link to="/book-a-call" className="hover:text-white transition-colors">
                  Book Discovery Call
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-white/70">
              <li>
                <Link to="/about" className="hover:text-white transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-white transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <Link to="/legal/privacy" className="hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/legal/terms" className="hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 mt-8 pt-8 text-center text-sm text-white/60">
          <p>&copy; {currentYear} {branding?.company_name || ''}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

export function MainLayout({ children, className }: MainLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className={cn('flex-1', className)}>{children}</main>
      <Footer />
    </div>
  );
}

export default MainLayout;
