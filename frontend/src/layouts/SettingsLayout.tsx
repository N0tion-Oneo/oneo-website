import { Link, useLocation, Outlet } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { User, Calendar, ChevronLeft, Wrench, Palette, Bell, UserPlus, Users, Briefcase, CalendarClock } from 'lucide-react'

interface SettingsNavItem {
  name: string
  href: string
  icon: React.ReactNode
}

export default function SettingsLayout() {
  const { user } = useAuth()
  const location = useLocation()

  const isAdmin = user?.role === 'admin'
  const isAdminOrRecruiter = user?.role === 'admin' || user?.role === 'recruiter'
  const isClient = user?.role === 'client'
  const showCalendar = isAdminOrRecruiter || isClient

  const navigation: SettingsNavItem[] = [
    {
      name: 'My Profile',
      href: '/dashboard/settings/profile',
      icon: <User className="w-4 h-4" />,
    },
    ...(isAdminOrRecruiter
      ? [
          {
            name: 'Recruiter Profile',
            href: '/dashboard/settings/recruiter-profile',
            icon: <Briefcase className="w-4 h-4" />,
          },
          {
            name: 'Bookings',
            href: '/dashboard/settings/bookings',
            icon: <CalendarClock className="w-4 h-4" />,
          },
        ]
      : []),
    ...(showCalendar
      ? [
          {
            name: 'Calendar',
            href: '/dashboard/settings/calendar',
            icon: <Calendar className="w-4 h-4" />,
          },
        ]
      : []),
    ...(isAdminOrRecruiter
      ? [
          {
            name: 'Client Invitations',
            href: '/dashboard/settings/invitations',
            icon: <UserPlus className="w-4 h-4" />,
          },
          {
            name: 'Notifications',
            href: '/dashboard/settings/notifications',
            icon: <Bell className="w-4 h-4" />,
          },
          {
            name: 'Skills & Technologies',
            href: '/dashboard/settings/skills-technologies',
            icon: <Wrench className="w-4 h-4" />,
          },
          {
            name: 'Branding',
            href: '/dashboard/settings/branding',
            icon: <Palette className="w-4 h-4" />,
          },
        ]
      : []),
    ...(isAdmin
      ? [
          {
            name: 'Recruiters',
            href: '/dashboard/settings/recruiters',
            icon: <Users className="w-4 h-4" />,
          },
        ]
      : []),
  ]

  const isActive = (href: string) => {
    return location.pathname.startsWith(href)
  }

  return (
    <div className="flex h-full -mx-6 -mt-6">
      {/* Settings Secondary Sidebar */}
      <aside className="w-56 flex-shrink-0 border-r border-gray-200 bg-gray-50/50">
        <div className="sticky top-0 p-4">
          {/* Back link */}
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 text-[13px] text-gray-500 hover:text-gray-900 mb-4"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>

          {/* Settings Title */}
          <h2 className="text-[13px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Settings
          </h2>

          {/* Navigation */}
          <nav className="space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium transition-colors ${
                  isActive(item.href)
                    ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                    : 'text-gray-600 hover:bg-white hover:text-gray-900'
                }`}
              >
                <span
                  className={
                    isActive(item.href) ? 'text-gray-700' : 'text-gray-400'
                  }
                >
                  {item.icon}
                </span>
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
      </aside>

      {/* Settings Content */}
      <div className="flex-1 min-w-0 p-6 overflow-auto">
        <Outlet />
      </div>
    </div>
  )
}
