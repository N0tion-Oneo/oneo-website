import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSEODefaults } from '@/contexts/SEOContext';
import { ChevronDown } from 'lucide-react';

interface NavbarProps {
  variant?: 'default' | 'transparent';
}

const serviceLinks = [
  { name: 'Enterprise', href: '/enterprise', description: 'Recruitment + EOR combined' },
  { name: 'Employer of Record', href: '/eor', description: 'Hire globally without entities' },
  { name: 'Retained Recruitment', href: '/retained-recruitment', description: 'Strategic hiring for critical roles' },
  { name: 'Headhunting', href: '/headhunting', description: 'Executive search services' },
  { name: 'Pricing Calculator', href: '/pricing', description: 'Compare service costs' },
];

const directoryLinks = [
  { name: 'Jobs', href: '/jobs', description: 'Browse open positions' },
  { name: 'Candidates', href: '/candidates', description: 'Find talented professionals' },
  { name: 'Companies', href: '/companies', description: 'Discover hiring companies' },
];

const resourceLinks = [
  { name: 'Blog', href: '/blog', description: 'Latest insights and news' },
  { name: 'Case Studies', href: '/case-studies', description: 'Success stories' },
  { name: 'Glossary', href: '/glossary', description: 'Industry terminology' },
  { name: 'FAQs', href: '/faqs', description: 'Common questions answered' },
];

export default function Navbar({ variant = 'default' }: NavbarProps) {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [directoryOpen, setDirectoryOpen] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const servicesRef = useRef<HTMLDivElement>(null);
  const directoryRef = useRef<HTMLDivElement>(null);
  const resourcesRef = useRef<HTMLDivElement>(null);
  const seoDefaults = useSEODefaults();

  const isActive = (href: string) => location.pathname === href;
  const isServiceActive = serviceLinks.some(link => location.pathname === link.href);
  const isDirectoryActive = directoryLinks.some(link => location.pathname === link.href);
  const isResourceActive = resourceLinks.some(link => location.pathname === link.href);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (servicesRef.current && !servicesRef.current.contains(event.target as Node)) {
        setServicesOpen(false);
      }
      if (directoryRef.current && !directoryRef.current.contains(event.target as Node)) {
        setDirectoryOpen(false);
      }
      if (resourcesRef.current && !resourcesRef.current.contains(event.target as Node)) {
        setResourcesOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on route change
  useEffect(() => {
    setServicesOpen(false);
    setDirectoryOpen(false);
    setResourcesOpen(false);
  }, [location.pathname]);

  const authenticatedLinks = [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Companies', href: '/companies' },
    { name: 'Candidates', href: '/candidates' },
  ];

  return (
    <header className={`border-b ${variant === 'transparent' ? 'border-transparent bg-transparent' : 'border-gray-200 bg-white'}`}>
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" className="text-lg font-semibold text-gray-900 min-w-[60px]">
            {seoDefaults.isLoaded ? (seoDefaults.companyName || 'Home') : '\u00A0'}
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            {isLoading ? null : isAuthenticated ? (
              // Authenticated users see direct links
              authenticatedLinks.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`text-[13px] font-medium transition-colors ${
                    isActive(item.href)
                      ? 'text-gray-900'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {item.name}
                </Link>
              ))
            ) : (
              // Public navigation with dropdowns
              <>
                {/* Directory Dropdown */}
                <div ref={directoryRef} className="relative">
                  <button
                    onClick={() => setDirectoryOpen(!directoryOpen)}
                    className={`flex items-center gap-1 text-[13px] font-medium transition-colors ${
                      isDirectoryActive
                        ? 'text-gray-900'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    Directory
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${directoryOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {directoryOpen && (
                    <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-50">
                      {directoryLinks.map((link) => (
                        <Link
                          key={link.href}
                          to={link.href}
                          className={`block px-4 py-2.5 hover:bg-gray-50 transition-colors ${
                            isActive(link.href) ? 'bg-gray-50' : ''
                          }`}
                        >
                          <span className={`block text-[13px] font-medium ${
                            isActive(link.href) ? 'text-gray-900' : 'text-gray-700'
                          }`}>
                            {link.name}
                          </span>
                          <span className="block text-[11px] text-gray-500 mt-0.5">
                            {link.description}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                {/* Services Dropdown */}
                <div ref={servicesRef} className="relative">
                  <button
                    onClick={() => setServicesOpen(!servicesOpen)}
                    className={`flex items-center gap-1 text-[13px] font-medium transition-colors ${
                      isServiceActive
                        ? 'text-gray-900'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    Services
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${servicesOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {servicesOpen && (
                    <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-50">
                      {serviceLinks.map((link) => (
                        <Link
                          key={link.href}
                          to={link.href}
                          className={`block px-4 py-2.5 hover:bg-gray-50 transition-colors ${
                            isActive(link.href) ? 'bg-gray-50' : ''
                          }`}
                        >
                          <span className={`block text-[13px] font-medium ${
                            isActive(link.href) ? 'text-gray-900' : 'text-gray-700'
                          }`}>
                            {link.name}
                          </span>
                          <span className="block text-[11px] text-gray-500 mt-0.5">
                            {link.description}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                {/* Resources Dropdown */}
                <div ref={resourcesRef} className="relative">
                  <button
                    onClick={() => setResourcesOpen(!resourcesOpen)}
                    className={`flex items-center gap-1 text-[13px] font-medium transition-colors ${
                      isResourceActive
                        ? 'text-gray-900'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    Resources
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${resourcesOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {resourcesOpen && (
                    <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-50">
                      {resourceLinks.map((link) => (
                        <Link
                          key={link.href}
                          to={link.href}
                          className={`block px-4 py-2.5 hover:bg-gray-50 transition-colors ${
                            isActive(link.href) ? 'bg-gray-50' : ''
                          }`}
                        >
                          <span className={`block text-[13px] font-medium ${
                            isActive(link.href) ? 'text-gray-900' : 'text-gray-700'
                          }`}>
                            {link.name}
                          </span>
                          <span className="block text-[11px] text-gray-500 mt-0.5">
                            {link.description}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {isLoading ? (
            // Placeholder to prevent layout shift while auth loads
            <div className="w-24 h-8" />
          ) : isAuthenticated ? (
            <>
              <div className="hidden sm:flex items-center gap-3">
                <div className="w-7 h-7 bg-gray-900 rounded-full flex items-center justify-center text-white text-[11px] font-medium">
                  {user?.first_name?.[0]?.toUpperCase()}
                </div>
                <span className="text-[13px] text-gray-700">{user?.first_name}</span>
              </div>
              <button
                onClick={logout}
                className="text-[13px] text-gray-500 hover:text-gray-900 transition-colors"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-[13px] font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Sign in
              </Link>
              <Link
                to="/signup"
                className="text-[13px] font-medium text-white bg-gray-900 px-4 py-2 rounded-md hover:bg-gray-800 transition-colors"
              >
                Get started
              </Link>
            </>
          )}

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 text-gray-500 hover:text-gray-900"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              {mobileMenuOpen ? (
                <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileMenuOpen && !isLoading && (
        <div className="md:hidden border-t border-gray-100 px-6 py-3 space-y-1 bg-white">
          {isAuthenticated ? (
            // Authenticated mobile links
            authenticatedLinks.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block py-2 text-[14px] font-medium ${
                  isActive(item.href) ? 'text-gray-900' : 'text-gray-500'
                }`}
              >
                {item.name}
              </Link>
            ))
          ) : (
            // Public mobile links with sections
            <>
              {/* Directory section */}
              <div className="pb-1">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  Directory
                </span>
              </div>
              {directoryLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block py-2 text-[14px] font-medium ${
                    isActive(link.href) ? 'text-gray-900' : 'text-gray-500'
                  }`}
                >
                  {link.name}
                </Link>
              ))}

              {/* Services section */}
              <div className="pt-2 pb-1 border-t border-gray-100 mt-2">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  Services
                </span>
              </div>
              {serviceLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block py-2 text-[14px] font-medium ${
                    isActive(link.href) ? 'text-gray-900' : 'text-gray-500'
                  }`}
                >
                  {link.name}
                </Link>
              ))}

              {/* Resources section */}
              <div className="pt-2 pb-1 border-t border-gray-100 mt-2">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  Resources
                </span>
              </div>
              {resourceLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block py-2 text-[14px] font-medium ${
                    isActive(link.href) ? 'text-gray-900' : 'text-gray-500'
                  }`}
                >
                  {link.name}
                </Link>
              ))}
            </>
          )}
        </div>
      )}
    </header>
  );
}
