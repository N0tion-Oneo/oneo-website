import { useState } from 'react'
import { Link, useLocation, Outlet } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { User, Calendar, ChevronLeft, ChevronRight, Wrench, Palette, UserPlus, Users, Briefcase, CalendarClock, ListChecks, Settings, Building2, Link as LinkIcon, Zap } from 'lucide-react'

interface SettingsNavItem {
  name: string
  href: string
  icon: React.ReactNode
}

interface SettingsNavSection {
  title: string
  items: SettingsNavItem[]
}

export default function SettingsLayout() {
  const { user } = useAuth()
  const location = useLocation()
  const [isCollapsed, setIsCollapsed] = useState(false)

  const isAdmin = user?.role === 'admin'
  const isAdminOrRecruiter = user?.role === 'admin' || user?.role === 'recruiter'
  const isClient = user?.role === 'client'
  const showCalendar = isAdminOrRecruiter || isClient

  const sections: SettingsNavSection[] = [
    // Personal section - everyone gets My Profile
    {
      title: 'Personal',
      items: [
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
      ],
    },
    // Platform section - admin only
    ...(isAdmin
      ? [
          {
            title: 'Platform',
            items: [
              {
                name: 'Platform Companies',
                href: '/dashboard/settings/platform-company',
                icon: <Building2 className="w-4 h-4" />,
              },
              {
                name: 'Team',
                href: '/dashboard/settings/team',
                icon: <Users className="w-4 h-4" />,
              },
              {
                name: 'Branding',
                href: '/dashboard/settings/branding',
                icon: <Palette className="w-4 h-4" />,
              },
              {
                name: 'Integrations',
                href: '/dashboard/settings/integrations',
                icon: <LinkIcon className="w-4 h-4" />,
              },
            ],
          },
        ]
      : []),
    // Configuration section - admin/recruiter
    ...(isAdminOrRecruiter
      ? [
          {
            title: 'Configuration',
            items: [
              {
                name: 'Skills & Technologies',
                href: '/dashboard/settings/skills-technologies',
                icon: <Wrench className="w-4 h-4" />,
              },
              {
                name: 'Onboarding Stages',
                href: '/dashboard/settings/onboarding-stages',
                icon: <ListChecks className="w-4 h-4" />,
              },
              ...(isAdmin
                ? [
                    {
                      name: 'Dashboard Settings',
                      href: '/dashboard/settings/dashboard',
                      icon: <Settings className="w-4 h-4" />,
                    },
                    {
                      name: 'Automations',
                      href: '/dashboard/settings/automations',
                      icon: <Zap className="w-4 h-4" />,
                    },
                  ]
                : []),
            ],
          },
        ]
      : []),
    // Invitations section - admin/recruiter
    ...(isAdminOrRecruiter
      ? [
          {
            title: 'Invitations',
            items: [
              {
                name: 'Client Invitations',
                href: '/dashboard/settings/invitations',
                icon: <UserPlus className="w-4 h-4" />,
              },
              {
                name: 'Bookings',
                href: '/dashboard/settings/bookings',
                icon: <CalendarClock className="w-4 h-4" />,
              },
            ],
          },
        ]
      : []),
  ].filter((section) => section.items.length > 0)

  const isActive = (href: string) => {
    return location.pathname.startsWith(href)
  }

  return (
    <div className="flex h-full -mx-6 -mt-6">
      {/* Settings Secondary Sidebar */}
      <aside
        className={`flex-shrink-0 border-r border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 transition-all duration-200 ${
          isCollapsed ? 'w-16' : 'w-56'
        }`}
      >
        <div className="sticky top-0 p-4">
          {/* Back link / Collapse toggle */}
          <div className={`flex items-center mb-4 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
            {!isCollapsed && (
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-1.5 text-[13px] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </Link>
            )}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Navigation with sections */}
          <nav className="space-y-5">
            {sections.map((section) => (
              <div key={section.title}>
                {!isCollapsed && (
                  <h3 className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-3">
                    {section.title}
                  </h3>
                )}
                <div className="space-y-1">
                  {section.items.map((item) => (
                    <Link
                      key={item.href}
                      to={item.href}
                      className={`relative group flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium transition-colors ${
                        isCollapsed ? 'justify-center' : ''
                      } ${
                        isActive(item.href)
                          ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm dark:shadow-gray-900/20 border border-gray-200 dark:border-gray-700'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-900 hover:text-gray-900 dark:hover:text-gray-100'
                      }`}
                    >
                      <span
                        className={
                          isActive(item.href) ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'
                        }
                      >
                        {item.icon}
                      </span>
                      {!isCollapsed && item.name}

                      {/* Tooltip for collapsed state */}
                      {isCollapsed && (
                        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-[12px] rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
                          {item.name}
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
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
