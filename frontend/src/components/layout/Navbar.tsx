import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface NavbarProps {
  variant?: 'default' | 'transparent';
}

export default function Navbar({ variant = 'default' }: NavbarProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (href: string) => location.pathname === href;

  const publicLinks = [
    { name: 'Candidates', href: '/candidates' },
    { name: 'Companies', href: '/companies' },
  ];

  const navLinks = isAuthenticated
    ? [
        { name: 'Dashboard', href: '/dashboard' },
        { name: 'Companies', href: '/companies' },
        { name: 'Candidates', href: '/candidates' },
      ]
    : publicLinks;

  return (
    <header className={`border-b ${variant === 'transparent' ? 'border-transparent bg-transparent' : 'border-gray-200 bg-white'}`}>
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" className="text-lg font-semibold text-gray-900">
            Oneo
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((item) => (
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
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {isAuthenticated ? (
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
          {isAuthenticated && (
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
          )}
        </div>
      </div>

      {/* Mobile nav */}
      {mobileMenuOpen && isAuthenticated && (
        <div className="md:hidden border-t border-gray-100 px-6 py-3 space-y-1 bg-white">
          {navLinks.map((item) => (
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
          ))}
        </div>
      )}
    </header>
  );
}
