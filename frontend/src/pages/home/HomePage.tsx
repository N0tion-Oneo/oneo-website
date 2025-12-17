import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Navbar } from '@/components/layout'
import { SEO } from '@/components/seo'
import { useSEODefaults } from '@/contexts/SEOContext'
import { usePublicBranding } from '@/hooks'
import { useJobs } from '@/hooks/useJobs'
import { cmsCaseStudies, cmsBlog, cmsPricing } from '@/services/cms'
import type { CMSPricingConfig } from '@/services/cms'
import type { CMSBlogPostListItem, CMSCaseStudy } from '@/types'
import {
  ArrowRight,
  Building2,
  Users,
  Briefcase,
  CheckCircle2,
  TrendingUp,
  Shield,
  Clock,
  Zap,
  Globe,
  Search,
  FileText,
  BarChart3,
  Calendar,
  MapPin,
  ChevronRight,
  Quote,
  Target,
  Rocket,
  UserCheck,
  Award,
  Sparkles,
  Play,
  Star,
  CircleDollarSign,
  Handshake,
  LineChart,
  BadgeCheck,
  Building,
  Cpu,
  PenTool,
  Scale,
  TrendingDown,
  Crosshair,
} from 'lucide-react'

// View mode type
type ViewMode = 'company' | 'candidate'

// Storage key for persistence
const VIEW_MODE_KEY = 'oneo_homepage_view'

// Placeholder client logos
const clientLogos = [
  { name: 'TechCorp', placeholder: true },
  { name: 'InnovateCo', placeholder: true },
  { name: 'GlobalFinance', placeholder: true },
  { name: 'DataDriven', placeholder: true },
  { name: 'CreativeAgency', placeholder: true },
  { name: 'StartupHub', placeholder: true },
]

// Industries we serve (client sectors)
const industries = [
  'FinTech',
  'SaaS',
  'E-commerce',
  'Banking',
  'Financial Services',
  'Media',
  'Entertainment',
  'Advertising',
  'MarTech',
  'Professional Services',
  'HealthTech',
  'EdTech',
  'Logistics',
  'Insurance',
  'Consulting',
  'Cybersecurity',
  'AI & Machine Learning',
  'Gaming & Esports',
  'Telecommunications',
  'Cloud & Infrastructure',
  'Investment Management',
  'Private Equity & VC',
  'Crypto',
  'Blockchain',
  'CleanTech',
  'AgriTech',
  'GovTech',
  'Automotive',
  'Legal Tech',
]

// Talent types we place (specialist categories)
const talentTypes = [
  { name: 'Software Engineering', icon: Cpu, description: 'Frontend, backend, full-stack, mobile, and embedded engineers' },
  { name: 'Data & Analytics', icon: LineChart, description: 'Data scientists, analysts, engineers, and BI specialists' },
  { name: 'Product Management', icon: Rocket, description: 'Product managers, owners, and strategists' },
  { name: 'Design & UX', icon: PenTool, description: 'UI/UX designers, product designers, and researchers' },
  { name: 'Marketing & Growth', icon: TrendingUp, description: 'Performance, content, brand, and growth marketers' },
  { name: 'Finance & Accounting', icon: CircleDollarSign, description: 'Financial analysts, accountants, and FP&A professionals' },
  { name: 'Legal & Compliance', icon: Scale, description: 'Legal counsel, compliance officers, and contract specialists' },
  { name: 'DevOps & Cloud', icon: Globe, description: 'DevOps engineers, SREs, and cloud architects' },
  { name: 'Creative & Content', icon: Sparkles, description: 'Copywriters, content strategists, and creative directors' },
  { name: 'Sales & Business Dev', icon: Handshake, description: 'Sales executives, BDRs, and account managers' },
  { name: 'HR & People Ops', icon: Users, description: 'HR managers, talent partners, and people operations' },
  { name: 'Project Management', icon: Target, description: 'Project managers, scrum masters, and delivery leads' },
]

// Helper to format decimal as percentage
const formatPercent = (decimal: string | number): string => {
  const num = typeof decimal === 'string' ? parseFloat(decimal) : decimal
  return `${Math.round(num * 100)}%`
}

// Helper to format currency
const formatCurrency = (amount: string | number): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return `R${num.toLocaleString('en-ZA', { maximumFractionDigits: 0 })}`
}

// Service colors (static)
const serviceColors = {
  enterprise: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    hoverBorder: 'hover:border-amber-300',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    accent: 'bg-amber-500',
    accentText: 'text-amber-700',
    badge: 'bg-amber-200 text-amber-800',
  },
  retained: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    hoverBorder: 'hover:border-blue-300',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    accent: 'bg-blue-500',
    accentText: 'text-blue-700',
    badge: 'bg-blue-200 text-blue-800',
  },
  eor: {
    bg: 'bg-teal-50',
    border: 'border-teal-200',
    hoverBorder: 'hover:border-teal-300',
    iconBg: 'bg-teal-100',
    iconColor: 'text-teal-600',
    accent: 'bg-teal-500',
    accentText: 'text-teal-700',
    badge: 'bg-teal-200 text-teal-800',
  },
  headhunting: {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    hoverBorder: 'hover:border-purple-300',
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
    accent: 'bg-purple-500',
    accentText: 'text-purple-700',
    badge: 'bg-purple-200 text-purple-800',
  },
}

// Build services with dynamic pricing
const buildServices = (pricing: CMSPricingConfig | null) => [
  {
    id: 'enterprise',
    title: 'Enterprise',
    subtitle: 'Recruitment + EOR Combined',
    description: 'The ultimate talent solution. We find your talent, employ them compliantly, and manage everything — with cashflow-friendly pricing that rewards long-term partnerships.',
    icon: Building2,
    href: '/enterprise',
    featured: true,
    highlights: ['No upfront placement fees', 'Margins decrease over time', 'Full compliance & payroll included', 'Asset & office management'],
    color: serviceColors.enterprise,
    stats: {
      label: 'Starting margin',
      value: pricing ? formatPercent(pricing.enterprise_markup_year1) : '22%',
      sub: pricing ? `decreasing to ${formatPercent(pricing.enterprise_markup_year4_plus)}` : 'decreasing to 16%',
    },
  },
  {
    id: 'retained',
    title: 'Retained Recruitment',
    subtitle: 'Dedicated Search, Reduced Fees',
    description: 'Priority access to our recruitment team with SLA commitments. Your monthly retainer investment unlocks a 50% reduction in placement fees and unlimited searches.',
    icon: Target,
    href: '/retained-recruitment',
    highlights: ['50% lower placement fees', '10-day shortlist SLA', 'Unlimited searches', 'Full platform access'],
    color: serviceColors.retained,
    stats: {
      label: 'Placement fee',
      value: pricing ? formatPercent(pricing.retained_placement_fee) : '10%',
      sub: pricing ? `vs ${formatPercent(pricing.headhunting_placement_fee)} standard` : 'vs 20% standard',
    },
  },
  {
    id: 'eor',
    title: 'Employer of Record',
    subtitle: 'Employ in South Africa, Hassle-Free',
    description: 'Already found your candidate? We become their legal employer, handling payroll, compliance, benefits, and HR — so you can focus on the work, not the paperwork.',
    icon: Shield,
    href: '/eor',
    highlights: ['Full legal compliance', 'Payroll & benefits admin', 'HR support included', 'No entity required'],
    color: serviceColors.eor,
    stats: {
      label: 'Monthly fee',
      value: pricing ? formatCurrency(pricing.eor_monthly_fee) : 'R7,000',
      sub: 'per employee',
    },
  },
  {
    id: 'headhunting',
    title: 'Headhunting',
    subtitle: 'Pay Only on Success',
    description: 'Targeted search for passive talent who aren\'t actively looking. No exclusivity required, no upfront fees — you only pay when we deliver the right candidate.',
    icon: Crosshair,
    href: '/headhunting',
    highlights: ['Access passive candidates', 'Pay on success only', 'No exclusivity required', '4-month replacement cover'],
    color: serviceColors.headhunting,
    stats: {
      label: 'Placement fee',
      value: pricing ? formatPercent(pricing.headhunting_placement_fee) : '20%',
      sub: 'of total package',
    },
  },
]

// Company stats
const companyStats = [
  { value: '100+', label: 'Companies Served' },
  { value: '500+', label: 'Placements Made' },
  { value: '95%', label: 'Client Retention' },
  { value: '<21', label: 'Days to Shortlist' },
]

// Candidate stats
const candidateStats = [
  { value: '30,000+', label: 'Candidates in Network' },
  { value: '85%', label: 'Passive Talent Reached' },
  { value: '93%', label: 'Placement Success Rate' },
  { value: '15%+', label: 'Avg. Salary Increase' },
]

// Platform benefits for candidates
const candidateBenefits = [
  {
    icon: Sparkles,
    title: 'Exclusive Opportunities',
    description: 'Access roles from leading companies that aren\'t advertised on public job boards.',
  },
  {
    icon: TrendingUp,
    title: 'Salary Growth',
    description: 'Our candidates see an average 15%+ salary increase when making their next move.',
  },
  {
    icon: UserCheck,
    title: 'Dedicated Recruiter',
    description: 'Work one-on-one with an experienced recruiter who understands your industry.',
  },
  {
    icon: Zap,
    title: 'Fast-Track Process',
    description: 'Skip the queue with streamlined applications and direct access to hiring managers.',
  },
  {
    icon: FileText,
    title: 'Profile That Works',
    description: 'Build a comprehensive profile that showcases your full experience to employers.',
  },
  {
    icon: BarChart3,
    title: 'Track Everything',
    description: 'Real-time visibility into your applications, interviews, and feedback.',
  },
]

// How we're different (for companies)
const differentiators = [
  {
    icon: TrendingDown,
    title: 'Cashflow-Friendly',
    description: 'No large upfront fees. Our models spread costs over time or charge only on success.',
  },
  {
    icon: Handshake,
    title: 'True Partnership',
    description: 'We\'re invested in your long-term success, not just filling seats quickly.',
  },
  {
    icon: BadgeCheck,
    title: 'Quality Over Quantity',
    description: 'Thoroughly vetted candidates. We\'d rather send 3 great fits than 30 maybes.',
  },
  {
    icon: Shield,
    title: 'Compliance Handled',
    description: 'From contracts to payroll to labour law — we keep you protected.',
  },
]

// Process steps for companies
const companyProcess = [
  { step: '01', title: 'Consultation', description: 'We learn your needs, culture, and what success looks like.' },
  { step: '02', title: 'Strategy', description: 'We recommend the right service model for your situation.' },
  { step: '03', title: 'Search', description: 'Our team identifies and engages top candidates.' },
  { step: '04', title: 'Delivery', description: 'Shortlisted candidates, interviews, and seamless onboarding.' },
]

// Process steps for candidates
const candidateProcess = [
  { step: '01', title: 'Create Profile', description: 'Build your professional profile with skills, experience, and preferences.' },
  { step: '02', title: 'Get Discovered', description: 'Our recruiters match you with opportunities that fit your goals.' },
  { step: '03', title: 'Interview', description: 'We prepare you and guide you through each stage of the process.' },
  { step: '04', title: 'Start Your Role', description: 'Accept your offer and begin your next career chapter.' },
]

// Toggle Switch Component
function ViewToggle({
  mode,
  onChange
}: {
  mode: ViewMode
  onChange: (mode: ViewMode) => void
}) {
  return (
    <div className="inline-flex items-center gap-1 bg-gray-100 rounded-full p-1">
      <button
        onClick={() => onChange('company')}
        className={`px-3 py-1.5 text-[12px] font-medium rounded-full transition-all ${
          mode === 'company'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        For Companies
      </button>
      <button
        onClick={() => onChange('candidate')}
        className={`px-3 py-1.5 text-[12px] font-medium rounded-full transition-all ${
          mode === 'candidate'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        For Candidates
      </button>
    </div>
  )
}

// Job Card Component
function JobCard({ job }: { job: {
  id: string
  title: string
  slug: string
  company_name: string
  company_logo?: string | null
  location?: string
  work_mode?: string
  salary_min?: number
  salary_max?: number
  salary_currency?: string
  seniority?: string
} }) {
  const formatSalary = (min?: number, max?: number, currency?: string) => {
    if (!min && !max) return null
    const curr = currency || 'ZAR'
    const formatter = new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: curr,
      maximumFractionDigits: 0
    })
    if (min && max) return `${formatter.format(min)} - ${formatter.format(max)}`
    if (min) return `From ${formatter.format(min)}`
    if (max) return `Up to ${formatter.format(max)}`
    return null
  }

  const salary = formatSalary(job.salary_min, job.salary_max, job.salary_currency)

  return (
    <Link
      to={`/jobs/${job.slug}`}
      className="block p-5 bg-white border border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-md transition-all group"
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
          {job.company_logo ? (
            <img src={job.company_logo} alt={job.company_name} className="w-full h-full object-contain" />
          ) : (
            <Building2 className="w-6 h-6 text-gray-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-semibold text-gray-900 group-hover:text-gray-700 truncate">
            {job.title}
          </h3>
          <p className="text-[13px] text-gray-600 mt-0.5">{job.company_name}</p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {job.location && (
              <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
                <MapPin className="w-3 h-3" />
                {job.location}
              </span>
            )}
            {job.work_mode && (
              <span className="text-[11px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                {job.work_mode.charAt(0).toUpperCase() + job.work_mode.slice(1).replace('_', '-')}
              </span>
            )}
            {job.seniority && (
              <span className="text-[11px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                {job.seniority.charAt(0).toUpperCase() + job.seniority.slice(1)}
              </span>
            )}
          </div>
          {salary && (
            <p className="text-[12px] font-medium text-gray-700 mt-2">{salary}</p>
          )}
        </div>
        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
      </div>
    </Link>
  )
}

// Blog Card Component
function BlogCard({ post }: { post: CMSBlogPostListItem }) {
  return (
    <Link
      to={`/blog/${post.slug}`}
      className="block bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-gray-300 hover:shadow-md transition-all group"
    >
      {post.featured_image && (
        <div className="aspect-[16/9] bg-gray-100 overflow-hidden">
          <img
            src={post.featured_image}
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      )}
      <div className="p-5">
        {post.category && (
          <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
            {post.category}
          </span>
        )}
        <h3 className="text-[15px] font-semibold text-gray-900 mt-1 line-clamp-2 group-hover:text-gray-700">
          {post.title}
        </h3>
        <p className="text-[13px] text-gray-600 mt-2 line-clamp-2">
          {post.excerpt}
        </p>
      </div>
    </Link>
  )
}

// Main Homepage Component
export default function HomePage() {
  const { isAuthenticated } = useAuth()
  const seoDefaults = useSEODefaults()
  const { branding } = usePublicBranding()

  // Scroll position for parallax effects
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // View mode state with localStorage persistence
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(VIEW_MODE_KEY)
      if (stored === 'candidate' || stored === 'company') {
        return stored
      }
    }
    return 'company'
  })

  // Data states
  const { jobs } = useJobs({ sort: '-created_at' })
  const [caseStudies, setCaseStudies] = useState<CMSCaseStudy[]>([])
  const [blogPosts, setBlogPosts] = useState<CMSBlogPostListItem[]>([])
  const [pricingConfig, setPricingConfig] = useState<CMSPricingConfig | null>(null)

  // Persist view mode
  useEffect(() => {
    localStorage.setItem(VIEW_MODE_KEY, viewMode)
  }, [viewMode])

  // Fetch CMS data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [caseStudiesRes, blogRes, pricingRes] = await Promise.all([
          cmsCaseStudies.listPublic({ featured: true }),
          cmsBlog.listPublic({ featured: true }),
          cmsPricing.getConfigPublic(),
        ])

        if (caseStudiesRes.length > 0) {
          const fullCaseStudies = await Promise.all(
            caseStudiesRes.slice(0, 3).map(cs => cmsCaseStudies.getPublicBySlug(cs.slug))
          )
          setCaseStudies(fullCaseStudies)
        }

        let posts = blogRes
        if (posts.length === 0) {
          posts = await cmsBlog.listPublic()
        }
        setBlogPosts(posts.slice(0, 3))

        setPricingConfig(pricingRes)
      } catch (error) {
        console.error('Failed to fetch CMS data:', error)
      }
    }
    fetchData()
  }, [])

  // Get testimonials from case studies
  const testimonials = caseStudies
    .filter(cs => cs.testimonial_quote)
    .map(cs => ({
      quote: cs.testimonial_quote,
      author: cs.testimonial_author,
      role: cs.testimonial_role,
      company: cs.client_name,
      logo: cs.client_logo,
    }))

  // Limit jobs to 9
  const displayJobs = jobs.slice(0, 9)

  // Get colors from branding
  const primaryColor = branding?.primary_color || '#003E49'
  const accentColor = branding?.accent_color || '#FF7B55'

  return (
    <div className="min-h-screen bg-white">
      <SEO />
      <Navbar />

      {viewMode === 'company' ? (
        // =====================================================================
        // COMPANY VIEW
        // =====================================================================
        <>
          {/* Hero Section */}
          <div className="bg-gradient-to-b from-gray-900 to-gray-800 text-white">
            <div className="max-w-5xl mx-auto px-6 py-16 md:py-24">
              <div className="flex justify-start mb-8">
                <ViewToggle mode={viewMode} onChange={setViewMode} />
              </div>

              <div className="max-w-3xl">
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight">
                  Talent Solutions That<br />
                  <span className="text-amber-400">Scale With Your Business</span>
                </h1>
                <p className="mt-6 text-lg text-gray-300 max-w-2xl">
                  From recruitment to employment to ongoing management — we provide end-to-end
                  talent solutions for companies hiring specialists in tech, data, product,
                  marketing, finance, and legal.
                </p>
                <div className="mt-8 flex flex-wrap gap-4">
                  <Link
                    to="/contact"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 text-gray-900 text-[14px] font-semibold rounded-lg hover:bg-amber-400 transition-colors"
                  >
                    Book a Consultation
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    to="/pricing"
                    className="inline-flex items-center gap-2 px-6 py-3 border border-white/30 text-white text-[14px] font-medium rounded-lg hover:bg-white/10 transition-colors"
                  >
                    Compare Services
                  </Link>
                </div>
              </div>

              {/* Stats Bar */}
              <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 pt-8 border-t border-white/10">
                {companyStats.map((stat) => (
                  <div key={stat.label}>
                    <div className="text-3xl md:text-4xl font-bold text-amber-400">{stat.value}</div>
                    <div className="text-[13px] text-gray-400 mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Industries in Hero - Scroll Animated */}
              <div className="mt-12 pt-8 border-t border-white/10">
                <p className="text-[12px] font-medium text-gray-500 uppercase tracking-wide mb-4">
                  Industries We Serve
                </p>
                <div className="space-y-2 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]">
                  {/* Row 1 - moves left on scroll */}
                  <div
                    className="flex w-max transition-transform duration-100 ease-out"
                    style={{ transform: `translateX(${-scrollY * 0.15}px)` }}
                  >
                    {[...industries.slice(0, 15), ...industries.slice(0, 15)].map((industry, i) => (
                      <span
                        key={`row1-${industry}-${i}`}
                        className="px-3 py-1.5 bg-white/10 text-gray-300 text-[12px] font-medium rounded-full whitespace-nowrap mx-1 flex-shrink-0"
                      >
                        {industry}
                      </span>
                    ))}
                  </div>
                  {/* Row 2 - moves right on scroll */}
                  <div
                    className="flex w-max transition-transform duration-100 ease-out"
                    style={{ transform: `translateX(${-200 + scrollY * 0.15}px)` }}
                  >
                    {[...industries.slice(15), ...industries.slice(15)].map((industry, i) => (
                      <span
                        key={`row2-${industry}-${i}`}
                        className="px-3 py-1.5 bg-white/10 text-gray-300 text-[12px] font-medium rounded-full whitespace-nowrap mx-1 flex-shrink-0"
                      >
                        {industry}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Client Logos */}
          <div className="border-b border-gray-100">
            <div className="max-w-5xl mx-auto px-6 py-10">
              <p className="text-center text-[12px] font-medium text-gray-400 uppercase tracking-wide mb-6">
                Trusted by Leading Companies
              </p>
              <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12">
                {clientLogos.map((logo) => (
                  <div
                    key={logo.name}
                    className="w-28 h-12 bg-gray-100 rounded-lg flex items-center justify-center"
                  >
                    <span className="text-[11px] text-gray-400 font-medium">{logo.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Services Section */}
          <div className="max-w-5xl mx-auto px-6 py-20">
            <div className="max-w-2xl mb-12">
              <h2 className="text-3xl font-bold text-gray-900">Choose Your Model</h2>
              <p className="mt-3 text-gray-600">
                Four distinct service models to match your hiring needs and budget.
                Not sure which is right? We'll help you decide.
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              {buildServices(pricingConfig).map((service) => (
                <Link
                  key={service.id}
                  to={service.href}
                  className={`block p-6 rounded-xl border-2 transition-all hover:shadow-lg group ${service.color.bg} ${service.color.border} ${service.color.hoverBorder}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${service.color.iconBg}`}>
                      <service.icon className={`w-6 h-6 ${service.color.iconColor}`} />
                    </div>
                    {service.featured && (
                      <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full uppercase ${service.color.badge}`}>
                        Most Popular
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl font-bold text-gray-900 group-hover:text-gray-700">
                    {service.title}
                  </h3>
                  <p className={`text-[13px] font-medium ${service.color.accentText} mt-1`}>
                    {service.subtitle}
                  </p>
                  <p className="text-[14px] text-gray-600 mt-3 leading-relaxed">
                    {service.description}
                  </p>

                  {/* Stats highlight */}
                  <div className="mt-4 p-3 bg-white/80 rounded-lg">
                    <div className="text-[11px] text-gray-500 uppercase tracking-wide">{service.stats.label}</div>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="text-2xl font-bold text-gray-900">{service.stats.value}</span>
                      <span className="text-[12px] text-gray-500">{service.stats.sub}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-4">
                    {service.highlights.map((highlight) => (
                      <span
                        key={highlight}
                        className="inline-flex items-center gap-1 text-[11px] text-gray-700 bg-white border border-gray-200 px-2 py-1 rounded-full"
                      >
                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                        {highlight}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 mt-5 text-[13px] font-semibold text-gray-900 group-hover:gap-3 transition-all">
                    Learn more <ArrowRight className="w-4 h-4" />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* How We're Different */}
          <div className="bg-gray-50 border-y border-gray-100">
            <div className="max-w-5xl mx-auto px-6 py-20">
              <div className="max-w-2xl mb-12">
                <h2 className="text-3xl font-bold text-gray-900">Why Companies Choose Us</h2>
                <p className="mt-3 text-gray-600">
                  We're not your typical recruitment agency. Here's what makes us different.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {differentiators.map((item) => (
                  <div key={item.title} className="bg-white p-6 rounded-xl border border-gray-200">
                    <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-4">
                      <item.icon className="w-6 h-6 text-gray-700" />
                    </div>
                    <h3 className="text-[16px] font-semibold text-gray-900 mb-2">{item.title}</h3>
                    <p className="text-[13px] text-gray-600 leading-relaxed">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Process Section */}
          <div className="max-w-5xl mx-auto px-6 py-20">
            <div className="max-w-2xl mb-12">
              <h2 className="text-3xl font-bold text-gray-900">How It Works</h2>
              <p className="mt-3 text-gray-600">
                A simple, transparent process from first conversation to successful hire.
              </p>
            </div>

            <div className="grid md:grid-cols-4 gap-6">
              {companyProcess.map((item, index) => (
                <div key={item.step} className="relative">
                  {index < companyProcess.length - 1 && (
                    <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-[2px] bg-gray-200" />
                  )}
                  <div className="relative bg-white p-6 rounded-xl border border-gray-200">
                    <div className="w-12 h-12 bg-gray-900 text-white rounded-xl flex items-center justify-center text-[15px] font-bold mb-4">
                      {item.step}
                    </div>
                    <h3 className="text-[16px] font-semibold text-gray-900 mb-2">{item.title}</h3>
                    <p className="text-[13px] text-gray-600">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Talent Types */}
          <div className="bg-gray-900 text-white">
            <div className="max-w-5xl mx-auto px-6 py-20">
              <div className="max-w-2xl mb-12">
                <h2 className="text-3xl font-bold">Specialists We Place</h2>
                <p className="mt-3 text-gray-400">
                  Deep expertise across the full spectrum of specialist talent.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {talentTypes.map((talent) => (
                  <div
                    key={talent.name}
                    className="p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors"
                  >
                    <div className="w-9 h-9 bg-amber-500/20 rounded-lg flex items-center justify-center mb-3">
                      <talent.icon className="w-4 h-4 text-amber-400" />
                    </div>
                    <h3 className="text-[14px] font-semibold mb-1">{talent.name}</h3>
                    <p className="text-[12px] text-gray-400 leading-relaxed">
                      {talent.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Testimonials */}
          {testimonials.length > 0 && (
            <div className="max-w-5xl mx-auto px-6 py-20">
              <div className="max-w-2xl mb-12">
                <h2 className="text-3xl font-bold text-gray-900">What Our Clients Say</h2>
                <p className="mt-3 text-gray-600">
                  Hear from companies who've transformed their hiring with us.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                {testimonials.map((testimonial, index) => (
                  <div key={index} className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                    <div className="flex gap-1 mb-4">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <p className="text-[14px] text-gray-700 leading-relaxed mb-6">
                      "{testimonial.quote}"
                    </p>
                    <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                      {testimonial.logo ? (
                        <img src={testimonial.logo} alt={testimonial.company} className="w-10 h-10 rounded-lg object-contain bg-white border border-gray-100" />
                      ) : (
                        <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-gray-400" />
                        </div>
                      )}
                      <div>
                        <p className="text-[13px] font-semibold text-gray-900">{testimonial.author}</p>
                        <p className="text-[12px] text-gray-500">{testimonial.role}, {testimonial.company}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-center mt-8">
                <Link
                  to="/case-studies"
                  className="inline-flex items-center gap-2 text-[14px] font-medium text-gray-600 hover:text-gray-900"
                >
                  View all case studies
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}

          {/* CTA Section */}
          <div className="bg-gradient-to-r from-amber-50 to-amber-100 border-y border-amber-200">
            <div className="max-w-5xl mx-auto px-6 py-16">
              <div className="md:flex md:items-center md:justify-between">
                <div className="max-w-xl">
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                    Ready to Transform Your Hiring?
                  </h2>
                  <p className="mt-3 text-gray-600">
                    Book a free consultation. We'll learn about your needs and recommend the right approach.
                  </p>
                </div>
                <div className="mt-6 md:mt-0 flex flex-wrap gap-4">
                  <Link
                    to="/contact"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white text-[14px] font-semibold rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    Book a Call
                    <Calendar className="w-4 h-4" />
                  </Link>
                  <Link
                    to="/pricing"
                    className="inline-flex items-center gap-2 px-6 py-3 border border-gray-300 bg-white text-gray-700 text-[14px] font-medium rounded-lg hover:border-gray-400 transition-colors"
                  >
                    View Pricing
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        // =====================================================================
        // CANDIDATE VIEW
        // =====================================================================
        <>
          {/* Hero Section */}
          <div style={{ background: `linear-gradient(to bottom, ${accentColor}15, white)` }}>
            <div className="max-w-5xl mx-auto px-6 py-16 md:py-24">
              <div className="flex justify-start mb-8">
                <ViewToggle mode={viewMode} onChange={setViewMode} />
              </div>

              <div className="max-w-3xl">
                <h1 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight leading-tight">
                  Find Your Next<br />
                  <span style={{ color: accentColor }}>Career Move</span>
                </h1>
                <p className="mt-6 text-lg text-gray-600 max-w-2xl">
                  Access exclusive opportunities at leading companies. Join our talent network,
                  get matched with roles that fit your goals, and work with dedicated recruiters
                  who champion your success.
                </p>
                <div className="mt-8 flex flex-wrap gap-4">
                  {isAuthenticated ? (
                    <Link
                      to="/jobs"
                      className="inline-flex items-center gap-2 px-6 py-3 text-white text-[14px] font-semibold rounded-lg transition-colors"
                      style={{ backgroundColor: accentColor }}
                    >
                      Browse Opportunities
                      <Search className="w-4 h-4" />
                    </Link>
                  ) : (
                    <Link
                      to="/signup/candidate"
                      className="inline-flex items-center gap-2 px-6 py-3 text-white text-[14px] font-semibold rounded-lg transition-colors"
                      style={{ backgroundColor: accentColor }}
                    >
                      Join the Network
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  )}
                  <Link
                    to="/jobs"
                    className="inline-flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 text-[14px] font-medium rounded-lg hover:border-gray-400 transition-colors"
                  >
                    View All Jobs
                  </Link>
                </div>
              </div>

              {/* Stats Bar */}
              <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 pt-8 border-t border-gray-200">
                {candidateStats.map((stat) => (
                  <div key={stat.label}>
                    <div className="text-3xl md:text-4xl font-bold" style={{ color: accentColor }}>{stat.value}</div>
                    <div className="text-[13px] text-gray-500 mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Industries in Hero - Scroll Animated */}
              <div className="mt-12 pt-8 border-t border-gray-200">
                <p className="text-[12px] font-medium text-gray-400 uppercase tracking-wide mb-4">
                  Industries Hiring
                </p>
                <div className="space-y-2 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]">
                  {/* Row 1 - moves left on scroll */}
                  <div
                    className="flex w-max transition-transform duration-100 ease-out"
                    style={{ transform: `translateX(${-scrollY * 0.15}px)` }}
                  >
                    {[...industries.slice(0, 15), ...industries.slice(0, 15)].map((industry, i) => (
                      <span
                        key={`row1-${industry}-${i}`}
                        className="px-3 py-1.5 bg-gray-100 text-gray-600 text-[12px] font-medium rounded-full whitespace-nowrap mx-1 flex-shrink-0"
                      >
                        {industry}
                      </span>
                    ))}
                  </div>
                  {/* Row 2 - moves right on scroll */}
                  <div
                    className="flex w-max transition-transform duration-100 ease-out"
                    style={{ transform: `translateX(${-200 + scrollY * 0.15}px)` }}
                  >
                    {[...industries.slice(15), ...industries.slice(15)].map((industry, i) => (
                      <span
                        key={`row2-${industry}-${i}`}
                        className="px-3 py-1.5 bg-gray-100 text-gray-600 text-[12px] font-medium rounded-full whitespace-nowrap mx-1 flex-shrink-0"
                      >
                        {industry}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Jobs Preview */}
          {displayJobs.length > 0 && (
            <div className="max-w-5xl mx-auto px-6 py-20">
              <div className="flex items-end justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">Latest Opportunities</h2>
                  <p className="mt-2 text-gray-600">
                    Fresh roles from companies actively hiring through our network.
                  </p>
                </div>
                <Link
                  to="/jobs"
                  className="hidden sm:inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 text-[13px] font-medium rounded-lg hover:bg-gray-200 transition-colors"
                >
                  View all {jobs.length}+ jobs
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayJobs.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>

              <div className="text-center mt-8 sm:hidden">
                <Link
                  to="/jobs"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 text-[13px] font-medium rounded-lg hover:bg-gray-200 transition-colors"
                >
                  View all jobs
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}

          {/* Why Join */}
          <div className="bg-gray-50 border-y border-gray-100">
            <div className="max-w-5xl mx-auto px-6 py-20">
              <div className="max-w-2xl mb-12">
                <h2 className="text-3xl font-bold text-gray-900">Why Join Our Network?</h2>
                <p className="mt-3 text-gray-600">
                  More than a job board — we're invested in your career success.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {candidateBenefits.map((benefit) => (
                  <div key={benefit.title} className="bg-white p-6 rounded-xl border border-gray-200">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                      style={{ backgroundColor: `${accentColor}15` }}
                    >
                      <benefit.icon className="w-6 h-6" style={{ color: accentColor }} />
                    </div>
                    <h3 className="text-[16px] font-semibold text-gray-900 mb-2">{benefit.title}</h3>
                    <p className="text-[13px] text-gray-600 leading-relaxed">{benefit.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* How It Works */}
          <div className="max-w-5xl mx-auto px-6 py-20">
            <div className="max-w-2xl mb-12">
              <h2 className="text-3xl font-bold text-gray-900">How It Works</h2>
              <p className="mt-3 text-gray-600">
                Your journey to your next role, simplified.
              </p>
            </div>

            <div className="grid md:grid-cols-4 gap-6">
              {candidateProcess.map((item, index) => (
                <div key={item.step} className="relative">
                  {index < candidateProcess.length - 1 && (
                    <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-[2px] bg-gray-200" />
                  )}
                  <div className="relative bg-white p-6 rounded-xl border border-gray-200">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-[15px] font-bold mb-4 text-white"
                      style={{ backgroundColor: accentColor }}
                    >
                      {item.step}
                    </div>
                    <h3 className="text-[16px] font-semibold text-gray-900 mb-2">{item.title}</h3>
                    <p className="text-[13px] text-gray-600">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Talent Types */}
          <div className="bg-gray-900 text-white">
            <div className="max-w-5xl mx-auto px-6 py-20">
              <div className="max-w-2xl mb-12">
                <h2 className="text-3xl font-bold">Roles We Recruit For</h2>
                <p className="mt-3 text-gray-400">
                  Find opportunities that match your expertise. We place specialists across these fields.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {talentTypes.map((talent) => (
                  <div
                    key={talent.name}
                    className="p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                      style={{ backgroundColor: `${accentColor}25` }}
                    >
                      <talent.icon className="w-4 h-4" style={{ color: accentColor }} />
                    </div>
                    <h3 className="text-[14px] font-semibold mb-1">{talent.name}</h3>
                    <p className="text-[12px] text-gray-400 leading-relaxed">
                      {talent.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div
            className="border-y"
            style={{ backgroundColor: `${accentColor}10`, borderColor: `${accentColor}30` }}
          >
            <div className="max-w-5xl mx-auto px-6 py-16">
              <div className="md:flex md:items-center md:justify-between">
                <div className="max-w-xl">
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                    Ready to Find Your Next Role?
                  </h2>
                  <p className="mt-3 text-gray-600">
                    Join thousands of professionals who've advanced their careers through our network.
                  </p>
                </div>
                <div className="mt-6 md:mt-0 flex flex-wrap gap-4">
                  {isAuthenticated ? (
                    <Link
                      to="/jobs"
                      className="inline-flex items-center gap-2 px-6 py-3 text-white text-[14px] font-semibold rounded-lg transition-colors"
                      style={{ backgroundColor: accentColor }}
                    >
                      Browse Jobs
                      <Search className="w-4 h-4" />
                    </Link>
                  ) : (
                    <Link
                      to="/signup/candidate"
                      className="inline-flex items-center gap-2 px-6 py-3 text-white text-[14px] font-semibold rounded-lg transition-colors"
                      style={{ backgroundColor: accentColor }}
                    >
                      Create Your Profile
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  )}
                  <Link
                    to="/jobs"
                    className="inline-flex items-center gap-2 px-6 py-3 border border-gray-300 bg-white text-gray-700 text-[14px] font-medium rounded-lg hover:border-gray-400 transition-colors"
                  >
                    Browse All Jobs
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Blog Section (Shared) */}
      {blogPosts.length > 0 && (
        <div className="max-w-5xl mx-auto px-6 py-20">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">From Our Blog</h2>
              <p className="mt-2 text-gray-600">
                Insights, tips, and industry news to help you succeed.
              </p>
            </div>
            <Link
              to="/blog"
              className="hidden sm:inline-flex items-center gap-2 text-[14px] font-medium text-gray-600 hover:text-gray-900"
            >
              View all posts
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {blogPosts.map((post) => (
              <BlogCard key={post.id} post={post} />
            ))}
          </div>

          <div className="text-center mt-8 sm:hidden">
            <Link
              to="/blog"
              className="inline-flex items-center gap-2 text-[14px] font-medium text-gray-600 hover:text-gray-900"
            >
              View all posts
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-[13px] text-gray-400 text-center">
            © {new Date().getFullYear()} {seoDefaults.companyName || 'All rights reserved'}.{seoDefaults.companyName ? ' All rights reserved.' : ''}
          </p>
        </div>
      </footer>
    </div>
  )
}
