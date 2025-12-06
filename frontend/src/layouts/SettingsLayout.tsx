import { Link, useLocation, Outlet } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { User, Calendar, ChevronLeft } from 'lucide-react'

interface SettingsNavItem {
  name: string
  href: string
  icon: React.ReactNode
  roles?: ('admin' | 'recruiter' | 'client' | 'candidate')[]
}

export default function SettingsLayout() {
  const { user } = useAuth()
  const location = useLocation()

  const isAdminOrRecruiter = user?.role === 'admin' || user?.role === 'recruiter'
  const isClient = user?.role === 'client'
  const showCalendar = isAdminOrRecruiter || isClient

  const navigation: SettingsNavItem[] = [
    {
      name: 'My Profile',
      href: '/dashboard/settings/profile',
      icon: <User className="w-4 h-4" />,
    },
    ...(showCalendar
      ? [
          {
            name: 'Calendar',
            href: '/dashboard/settings/calendar',
            icon: <Calendar className="w-4 h-4" />,
          },
        ]
      : []),
  ]

  const isActive = (href: string) => {
    return location.pathname === href
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Back link */}
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-1.5 text-[13px] text-gray-500 hover:text-gray-900 mb-4"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[22px] font-semibold text-gray-900">Settings</h1>
        <p className="text-[14px] text-gray-500 mt-1">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Layout with sidebar */}
      <div className="flex gap-6">
        {/* Settings Sidebar */}
        <nav className="w-48 flex-shrink-0">
          <div className="sticky top-6 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-[14px] font-medium transition-colors ${
                  isActive(item.href)
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <span
                  className={
                    isActive(item.href) ? 'text-gray-900' : 'text-gray-400'
                  }
                >
                  {item.icon}
                </span>
                {item.name}
              </Link>
            ))}
          </div>
        </nav>

        {/* Settings Content */}
        <div className="flex-1 min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
