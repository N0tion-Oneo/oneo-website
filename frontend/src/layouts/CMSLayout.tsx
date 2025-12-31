import { Link, useLocation, Outlet } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  ChevronLeft,
  LayoutDashboard,
  Scale,
  BookOpen,
  HelpCircle,
  BookMarked,
  Briefcase,
  Mail,
  Users,
  Bot,
  FileCode,
  Map,
  ArrowRightLeft,
  Globe,
  FileText,
  Calculator,
} from 'lucide-react'

interface CMSNavItem {
  name: string
  href: string
  icon: React.ReactNode
  description?: string
}

interface CMSNavSection {
  title: string
  items: CMSNavItem[]
}

export default function CMSLayout() {
  const { user } = useAuth()
  const location = useLocation()

  const isAdmin = user?.role === 'admin'

  // Only allow admin access
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-500 dark:text-gray-400">You don't have permission to access the CMS.</p>
      </div>
    )
  }

  const navigationSections: CMSNavSection[] = [
    {
      title: 'Content',
      items: [
        {
          name: 'Overview',
          href: '/dashboard/cms',
          icon: <LayoutDashboard className="w-4 h-4" />,
        },
        {
          name: 'Legal',
          href: '/dashboard/cms/legal',
          icon: <Scale className="w-4 h-4" />,
        },
        {
          name: 'Blog',
          href: '/dashboard/cms/blog',
          icon: <BookOpen className="w-4 h-4" />,
        },
        {
          name: 'FAQs',
          href: '/dashboard/cms/faqs',
          icon: <HelpCircle className="w-4 h-4" />,
        },
        {
          name: 'Glossary',
          href: '/dashboard/cms/glossary',
          icon: <BookMarked className="w-4 h-4" />,
        },
        {
          name: 'Case Studies',
          href: '/dashboard/cms/case-studies',
          icon: <Briefcase className="w-4 h-4" />,
        },
        {
          name: 'Pricing',
          href: '/dashboard/cms/pricing',
          icon: <Calculator className="w-4 h-4" />,
        },
      ],
    },
    {
      title: 'Submissions',
      items: [
        {
          name: 'Contact',
          href: '/dashboard/cms/contact',
          icon: <Mail className="w-4 h-4" />,
        },
        {
          name: 'Newsletter',
          href: '/dashboard/cms/newsletter',
          icon: <Users className="w-4 h-4" />,
        },
      ],
    },
    {
      title: 'SEO & Technical',
      items: [
        {
          name: 'SEO & Analytics',
          href: '/dashboard/cms/seo/meta',
          icon: <Globe className="w-4 h-4" />,
        },
        {
          name: 'Page SEO',
          href: '/dashboard/cms/seo/pages',
          icon: <FileText className="w-4 h-4" />,
        },
        {
          name: 'Redirects',
          href: '/dashboard/cms/seo/redirects',
          icon: <ArrowRightLeft className="w-4 h-4" />,
        },
        {
          name: 'Sitemap',
          href: '/dashboard/cms/settings/sitemap',
          icon: <Map className="w-4 h-4" />,
        },
        {
          name: 'Robots.txt',
          href: '/dashboard/cms/settings/robots',
          icon: <FileCode className="w-4 h-4" />,
        },
        {
          name: 'LLMs.txt',
          href: '/dashboard/cms/settings/llms',
          icon: <Bot className="w-4 h-4" />,
        },
      ],
    },
  ]

  const isActive = (href: string) => {
    if (href === '/dashboard/cms') {
      return location.pathname === '/dashboard/cms'
    }
    return location.pathname.startsWith(href)
  }

  return (
    <div className="flex h-full -mx-6 -mt-6">
      {/* CMS Secondary Sidebar */}
      <aside className="w-56 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
        <div className="sticky top-0 p-4 overflow-y-auto max-h-[calc(100vh-3.5rem)]">
          {/* Back link */}
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 text-[13px] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-4"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>

          {/* CMS Title */}
          <h2 className="text-[13px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
            Content Management
          </h2>

          {/* Navigation Sections */}
          {navigationSections.map((section, sectionIndex) => (
            <div key={section.title} className={sectionIndex > 0 ? 'mt-6' : ''}>
              <h3 className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-3">
                {section.title}
              </h3>
              <nav className="space-y-1">
                {section.items.map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium transition-colors ${
                      isActive(item.href)
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm dark:shadow-gray-900/20 border border-gray-200 dark:border-gray-600'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100'
                    }`}
                  >
                    <span
                      className={
                        isActive(item.href) ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'
                      }
                    >
                      {item.icon}
                    </span>
                    {item.name}
                  </Link>
                ))}
              </nav>
            </div>
          ))}
        </div>
      </aside>

      {/* CMS Content */}
      <div className="flex-1 min-w-0 p-6 overflow-auto">
        <Outlet />
      </div>
    </div>
  )
}
