// CMS Overview/Dashboard Page
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { cmsPages, cmsBlog, cmsFAQs, cmsGlossary, cmsCaseStudies, cmsContact, cmsNewsletter } from '@/services/cms'
import { useAuth } from '@/contexts/AuthContext'
import { UserRole } from '@/types'
import {
  FileText,
  BookOpen,
  HelpCircle,
  BookMarked,
  Briefcase,
  MessageSquare,
  Mail,
  Plus,
  ArrowRight,
  AlertCircle,
} from 'lucide-react'

interface ContentCard {
  title: string
  description: string
  icon: React.ReactNode
  href: string
  count?: number
  color: string
  actions: { label: string; href: string }[]
}

export default function CMSOverviewPage() {
  const { user } = useAuth()

  // Fetch counts for each content type
  const { data: pages = [] } = useQuery({
    queryKey: ['cms-pages'],
    queryFn: () => cmsPages.list(),
  })

  const { data: posts = [] } = useQuery({
    queryKey: ['cms-blog'],
    queryFn: () => cmsBlog.list(),
  })

  const { data: faqs = [] } = useQuery({
    queryKey: ['cms-faqs'],
    queryFn: () => cmsFAQs.list(),
  })

  const { data: glossaryTerms = [] } = useQuery({
    queryKey: ['cms-glossary'],
    queryFn: () => cmsGlossary.list(),
  })

  const { data: caseStudies = [] } = useQuery({
    queryKey: ['cms-case-studies'],
    queryFn: () => cmsCaseStudies.list(),
  })

  const { data: contacts = [] } = useQuery({
    queryKey: ['cms-contact'],
    queryFn: () => cmsContact.list(),
  })

  const { data: subscribers = [] } = useQuery({
    queryKey: ['cms-newsletter'],
    queryFn: () => cmsNewsletter.list(),
  })

  const contentCards: ContentCard[] = [
    {
      title: 'Pages',
      description: 'Manage static pages like legal, about, and service pages',
      icon: <FileText className="w-6 h-6" />,
      href: '/dashboard/cms/pages',
      count: pages.length,
      color: 'bg-blue-500',
      actions: [
        { label: 'View All', href: '/dashboard/cms/pages' },
        { label: 'Create New', href: '/dashboard/cms/pages/new' },
      ],
    },
    {
      title: 'Blog Posts',
      description: 'Create and manage blog content',
      icon: <BookOpen className="w-6 h-6" />,
      href: '/dashboard/cms/blog',
      count: posts.length,
      color: 'bg-purple-500',
      actions: [
        { label: 'View All', href: '/dashboard/cms/blog' },
        { label: 'Create New', href: '/dashboard/cms/blog/new' },
      ],
    },
    {
      title: 'FAQs',
      description: 'Manage frequently asked questions',
      icon: <HelpCircle className="w-6 h-6" />,
      href: '/dashboard/cms/faqs',
      count: faqs.length,
      color: 'bg-green-500',
      actions: [
        { label: 'Manage FAQs', href: '/dashboard/cms/faqs' },
      ],
    },
    {
      title: 'Glossary',
      description: 'Define industry terms and concepts',
      icon: <BookMarked className="w-6 h-6" />,
      href: '/dashboard/cms/glossary',
      count: glossaryTerms.length,
      color: 'bg-yellow-500',
      actions: [
        { label: 'View All', href: '/dashboard/cms/glossary' },
        { label: 'Add Term', href: '/dashboard/cms/glossary/new' },
      ],
    },
    {
      title: 'Case Studies',
      description: 'Showcase client success stories',
      icon: <Briefcase className="w-6 h-6" />,
      href: '/dashboard/cms/case-studies',
      count: caseStudies.length,
      color: 'bg-cyan-500',
      actions: [
        { label: 'View All', href: '/dashboard/cms/case-studies' },
        { label: 'Create New', href: '/dashboard/cms/case-studies/new' },
      ],
    },
  ]

  const submissionCards = [
    {
      title: 'Contact Messages',
      description: 'View and respond to contact form submissions',
      icon: <MessageSquare className="w-6 h-6" />,
      href: '/dashboard/cms/contact',
      count: contacts.length,
      unread: contacts.filter((c) => !c.is_read).length,
      color: 'bg-orange-500',
    },
    {
      title: 'Newsletter Subscribers',
      description: 'Manage newsletter subscription list',
      icon: <Mail className="w-6 h-6" />,
      href: '/dashboard/cms/newsletter',
      count: subscribers.length,
      color: 'bg-pink-500',
    },
  ]

  // Access check
  if (!user || ![UserRole.ADMIN, UserRole.RECRUITER].includes(user.role)) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-4" />
        <p className="text-[15px] text-gray-700 mb-2">Access Denied</p>
        <p className="text-[13px] text-gray-500">
          You do not have permission to access the CMS.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[24px] font-semibold text-gray-900">Content Management</h1>
        <p className="text-[14px] text-gray-500 mt-1">
          Manage your website content, blog posts, and more
        </p>
      </div>

      {/* Content Cards */}
      <div className="mb-8">
        <h2 className="text-[16px] font-medium text-gray-900 mb-4">Content</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contentCards.map((card) => (
            <div
              key={card.title}
              className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className={`w-12 h-12 rounded-lg ${card.color} flex items-center justify-center text-white`}
                >
                  {card.icon}
                </div>
                {card.count !== undefined && (
                  <span className="text-[24px] font-semibold text-gray-900">
                    {card.count}
                  </span>
                )}
              </div>
              <h3 className="text-[15px] font-medium text-gray-900 mb-1">{card.title}</h3>
              <p className="text-[13px] text-gray-500 mb-4">{card.description}</p>
              <div className="flex items-center gap-3">
                {card.actions.map((action, index) => (
                  <Link
                    key={action.label}
                    to={action.href}
                    className={`flex items-center gap-1 text-[13px] ${
                      index === 0
                        ? 'text-gray-900 font-medium hover:text-gray-700'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {action.label.includes('Create') || action.label.includes('Add') ? (
                      <Plus className="w-4 h-4" />
                    ) : (
                      <ArrowRight className="w-4 h-4" />
                    )}
                    {action.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Submissions Section */}
      <div>
        <h2 className="text-[16px] font-medium text-gray-900 mb-4">Submissions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {submissionCards.map((card) => (
            <Link
              key={card.title}
              to={card.href}
              className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className={`w-12 h-12 rounded-lg ${card.color} flex items-center justify-center text-white`}
                >
                  {card.icon}
                </div>
                <div className="text-right">
                  <span className="text-[24px] font-semibold text-gray-900">{card.count}</span>
                  {'unread' in card && card.unread > 0 && (
                    <p className="text-[12px] text-orange-600">
                      {card.unread} unread
                    </p>
                  )}
                </div>
              </div>
              <h3 className="text-[15px] font-medium text-gray-900 mb-1">{card.title}</h3>
              <p className="text-[13px] text-gray-500">{card.description}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-[13px] font-medium text-gray-700 mb-3">Quick Stats</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-[11px] text-gray-500 uppercase tracking-wider">Published Pages</p>
            <p className="text-[20px] font-semibold text-gray-900">
              {pages.filter((p) => p.status === 'published').length}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-gray-500 uppercase tracking-wider">Published Posts</p>
            <p className="text-[20px] font-semibold text-gray-900">
              {posts.filter((p) => p.status === 'published').length}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-gray-500 uppercase tracking-wider">Active FAQs</p>
            <p className="text-[20px] font-semibold text-gray-900">
              {faqs.filter((f) => f.is_active).length}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-gray-500 uppercase tracking-wider">Active Subscribers</p>
            <p className="text-[20px] font-semibold text-gray-900">
              {subscribers.filter((s) => s.is_active).length}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
