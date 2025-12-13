import { useState, useEffect } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePublicBranding } from '@/hooks';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
}

export default function CandidateDashboardLayout() {
  const { user, logout } = useAuth();
  const { branding } = usePublicBranding();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Persist minimized state in localStorage
  const [isMinimized, setIsMinimized] = useState(() => {
    const saved = localStorage.getItem('sidebarMinimized');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem('sidebarMinimized', JSON.stringify(isMinimized));
  }, [isMinimized]);

  // Check if user is admin or recruiter
  const isAdmin = user?.role === 'admin'
  const isAdminOrRecruiter = user?.role === 'admin' || user?.role === 'recruiter'
  const isClient = user?.role === 'client'

  const baseNavigation: NavItem[] = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="3" width="7" height="9" rx="1" />
          <rect x="14" y="3" width="7" height="5" rx="1" />
          <rect x="14" y="12" width="7" height="9" rx="1" />
          <rect x="3" y="16" width="7" height="5" rx="1" />
        </svg>
      ),
    },
  ]

  // My Profile link - for candidates only (recruiters/admins access their profile via Settings)
  const profileNav: NavItem[] = !isClient && !isAdminOrRecruiter ? [
    {
      name: 'My Profile',
      href: '/dashboard/profile',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
    },
  ] : []

  // Add Company link for clients only
  const companyNav: NavItem[] = isClient ? [
    {
      name: 'Company',
      href: '/dashboard/company',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 21h18" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9 21V8l-4 2v11" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9 8V3h10v18" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M13 7h2M13 11h2M13 15h2" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      name: 'Job Postings',
      href: '/dashboard/jobs',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      name: 'Candidates',
      href: '/dashboard/candidates',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      name: 'Bookings',
      href: '/dashboard/bookings',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
    },
  ] : []

  // Admin/Recruiter only navigation
  const adminNav: NavItem[] = isAdminOrRecruiter ? [
    {
      name: 'All Companies',
      href: '/dashboard/admin/companies',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 21h18" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M5 21V7l8-4v18" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M19 21V11l-6-4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9 9h1M9 13h1M9 17h1" strokeLinecap="round" />
          <path d="M14 13h1M14 17h1" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      name: 'All Candidates',
      href: '/dashboard/admin/candidates',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      name: 'All Jobs',
      href: '/dashboard/admin/jobs',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M6 11h12" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      name: 'All Applications',
      href: '/dashboard/admin/applications',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="9" y="3" width="6" height="4" rx="1" />
          <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      name: 'Analytics',
      href: '/dashboard/admin/analytics',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 3v18h18" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M18 9l-5 5-4-4-3 3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
  ] : []

  // CMS navigation (Admin only)
  const cmsNav: NavItem[] = isAdmin ? [
    {
      name: 'CMS',
      href: '/dashboard/cms',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M4 4h16v16H4z" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 9h16" strokeLinecap="round" />
          <path d="M9 9v11" strokeLinecap="round" />
          <path d="M7 5.5h2" strokeLinecap="round" />
        </svg>
      ),
    },
  ] : []

  // Admin-only navigation (not visible to recruiters)
  const adminOnlyNav: NavItem[] = []

  // Candidate-specific navigation
  const candidateNav: NavItem[] = !isClient && !isAdminOrRecruiter ? [
    {
      name: 'Applications',
      href: '/dashboard/applications',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="9" y="3" width="6" height="4" rx="1" />
          <path d="M9 12h6M9 16h6" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      name: 'Browse Jobs',
      href: '/jobs',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      name: 'Bookings',
      href: '/dashboard/bookings',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
    },
  ] : []

  // Settings navigation (for all users)
  const settingsNav: NavItem[] = [
    {
      name: 'Settings',
      href: '/dashboard/settings',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
  ]

  const navigation: NavItem[] = [
    ...baseNavigation,
    ...profileNav,
    ...companyNav,
    ...adminNav,
    ...cmsNav,
    ...adminOnlyNav,
    ...candidateNav,
    ...settingsNav,
  ]

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(href);
  };

  const sidebarWidth = isMinimized ? 'w-16' : 'w-64';
  const mainPadding = isMinimized ? 'lg:pl-16' : 'lg:pl-64';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full ${sidebarWidth} bg-white border-r border-gray-200 transform transition-all duration-200 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo & Toggle */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-gray-200">
          {!isMinimized && (
            <Link to="/" className="flex items-center">
              {branding?.logo_url ? (
                <img
                  src={branding.logo_url}
                  alt={branding.company_name || 'Logo'}
                  className="h-7 w-auto"
                />
              ) : (
                <span className="text-lg font-semibold text-gray-900">
                  {branding?.company_name || ''}
                </span>
              )}
            </Link>
          )}
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className={`hidden lg:flex items-center justify-center w-8 h-8 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors ${
              isMinimized ? 'mx-auto' : ''
            }`}
            title={isMinimized ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isMinimized ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* User info */}
        <div className={`p-4 border-b border-gray-100 ${isMinimized ? 'px-2' : ''}`}>
          <div className={`flex items-center ${isMinimized ? 'justify-center' : 'gap-3'}`}>
            <div
              className="w-9 h-9 bg-gray-900 rounded-full flex items-center justify-center text-white text-[12px] font-medium flex-shrink-0"
              title={isMinimized ? `${user?.first_name} ${user?.last_name}` : undefined}
            >
              {user?.first_name?.[0]?.toUpperCase()}
              {user?.last_name?.[0]?.toUpperCase()}
            </div>
            {!isMinimized && (
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-medium text-gray-900 truncate">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-[12px] text-gray-500 truncate">{user?.email}</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className={`p-3 space-y-1 ${isMinimized ? 'px-2' : ''}`}>
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`relative group flex items-center ${isMinimized ? 'justify-center' : 'gap-3'} px-3 py-2 rounded-md text-[14px] font-medium transition-colors ${
                isActive(item.href)
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
              title={isMinimized ? item.name : undefined}
            >
              <span className={`flex-shrink-0 ${isActive(item.href) ? 'text-gray-900' : 'text-gray-400'}`}>
                {item.icon}
              </span>
              {!isMinimized && item.name}

              {/* Tooltip for minimized state */}
              {isMinimized && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-[12px] rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
                  {item.name}
                </div>
              )}
            </Link>
          ))}
        </nav>

        {/* Bottom section */}
        <div className={`absolute bottom-0 left-0 right-0 p-3 border-t border-gray-100 ${isMinimized ? 'px-2' : ''}`}>
          <button
            onClick={logout}
            className={`relative group flex items-center ${isMinimized ? 'justify-center' : 'gap-3'} w-full px-3 py-2 rounded-md text-[14px] font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors`}
            title={isMinimized ? 'Sign out' : undefined}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400 flex-shrink-0">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points="16 17 21 12 16 7" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="21" y1="12" x2="9" y2="12" strokeLinecap="round" />
            </svg>
            {!isMinimized && 'Sign out'}

            {/* Tooltip for minimized state */}
            {isMinimized && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-[12px] rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
                Sign out
              </div>
            )}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className={`${mainPadding} transition-all duration-200`}>
        {/* Top header - mobile only */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 h-14 flex items-center px-4 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 text-gray-500 hover:text-gray-900"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
