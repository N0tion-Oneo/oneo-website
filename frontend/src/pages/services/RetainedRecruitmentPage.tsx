// Retained Recruitment Service Page
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { SEO } from '@/components/seo'
import { useSEODefaults } from '@/contexts/SEOContext'
import Navbar from '@/components/layout/Navbar'
import { cmsPricing, CMSPricingConfig } from '@/services/cms'
import {
  Target,
  Users,
  CheckCircle2,
  ArrowRight,
  Building2,
  Briefcase,
  Clock,
  Shield,
  Handshake,
  Percent,
  Calendar,
  Infinity,
  LayoutDashboard,
  UserSearch,
  BarChart3,
  RefreshCw,
  MessageSquare,
  FileSearch,
} from 'lucide-react'

// Helper to format decimal as percentage
const formatPercent = (decimal: string | number): string => {
  const num = typeof decimal === 'string' ? parseFloat(decimal) : decimal
  return `${Math.round(num * 100)}%`
}

// Helper to format currency
const formatCurrency = (amount: string | number): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return `R${num.toLocaleString()}`
}

const benefits = [
  {
    icon: Percent,
    title: '50% Reduced Fees',
    description: 'Your placement fees drop from 20% to just 10% — a 50% reduction on every hire you make through us.',
  },
  {
    icon: Infinity,
    title: 'Unlimited Searches',
    description: 'No limit on concurrent roles. Run as many searches as you need without additional retainer fees.',
  },
  {
    icon: Clock,
    title: 'SLA-Backed Delivery',
    description: 'Guaranteed shortlist within 10 business days. We continue providing candidates until the role is filled.',
  },
  {
    icon: RefreshCw,
    title: 'Free Replacement Guarantee',
    description: 'If a hire doesn\'t work out within 3 months, we\'ll find a replacement at no additional cost.',
  },
]

const platformFeatures = [
  {
    icon: LayoutDashboard,
    title: 'Full ATS Access',
    description: 'Complete applicant tracking system to manage all your candidates and hiring workflows.',
  },
  {
    icon: UserSearch,
    title: 'Talent Pool Access',
    description: 'Browse and search our pre-vetted candidate database to find talent proactively.',
  },
  {
    icon: BarChart3,
    title: 'Analytics Dashboard',
    description: 'Real-time hiring metrics, pipeline visibility, and reporting to track your recruitment success.',
  },
]

const slaCommitments = [
  {
    icon: FileSearch,
    metric: '10 Days',
    label: 'To Shortlist',
    description: 'Qualified candidates presented within 10 business days',
  },
  {
    icon: MessageSquare,
    metric: '24 Hours',
    label: 'Response Time',
    description: 'Dedicated communication and rapid response to queries',
  },
  {
    icon: RefreshCw,
    metric: 'Continuous',
    label: 'Candidate Supply',
    description: 'We keep sourcing until you\'ve made your hire',
  },
]

const process = [
  {
    step: '01',
    title: 'Discovery & Briefing',
    description: 'We conduct in-depth sessions to understand your company culture, team dynamics, and the ideal candidate profile.',
  },
  {
    step: '02',
    title: 'Market Mapping',
    description: 'We identify and map the talent landscape, including passive candidates and competitor analysis.',
  },
  {
    step: '03',
    title: 'Targeted Search',
    description: 'Our recruiters proactively approach qualified candidates through our extensive networks.',
  },
  {
    step: '04',
    title: 'Rigorous Assessment',
    description: 'Comprehensive interviews, skills assessment, and reference checks ensure candidate quality.',
  },
  {
    step: '05',
    title: 'Shortlist Presentation',
    description: 'You receive a curated shortlist with detailed candidate profiles and our expert recommendations.',
  },
  {
    step: '06',
    title: 'Offer & Onboarding',
    description: 'We support negotiations and ensure a smooth transition for your new hire.',
  },
]

const idealFor = [
  {
    icon: Building2,
    title: 'Growing Companies',
    description: 'Businesses with ongoing hiring needs who want predictable costs and priority service.',
  },
  {
    icon: Briefcase,
    title: 'Volume Hirers',
    description: 'Teams making multiple hires who benefit from reduced fees across all placements.',
  },
  {
    icon: Users,
    title: 'Strategic Partners',
    description: 'Organizations seeking a long-term recruitment partner invested in their success.',
  },
]

export default function RetainedRecruitmentPage() {
  const seoDefaults = useSEODefaults()
  const [pricingConfig, setPricingConfig] = useState<CMSPricingConfig | null>(null)

  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const config = await cmsPricing.getConfigPublic()
        setPricingConfig(config)
      } catch (error) {
        console.error('Failed to fetch pricing config:', error)
      }
    }
    fetchPricing()
  }, [])

  // Calculate annual and monthly retainer from CMS
  const monthlyRetainer = pricingConfig ? formatCurrency(pricingConfig.retained_monthly_retainer) : ''
  const annualRetainer = pricingConfig ? formatCurrency(parseFloat(pricingConfig.retained_monthly_retainer) * 12) : ''
  const placementFee = pricingConfig ? formatPercent(pricingConfig.retained_placement_fee) : ''
  const standardFee = pricingConfig ? formatPercent(pricingConfig.headhunting_placement_fee) : ''

  return (
    <div className="min-h-screen bg-white">
      <SEO />
      <Navbar />

      {/* Hero Section */}
      <div className="bg-gradient-to-b from-emerald-950 to-emerald-900 text-white">
        <div className="max-w-5xl mx-auto px-6 py-20 md:py-28">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-white/10 backdrop-blur rounded-xl flex items-center justify-center">
              <Handshake className="w-6 h-6 text-emerald-300" />
            </div>
            <span className="text-[13px] font-medium text-emerald-300 uppercase tracking-wide">
              Retained Recruitment
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            Predictable Costs,<br />
            <span className="text-emerald-300">Premium Service</span>
          </h1>
          <p className="text-lg text-emerald-100 max-w-2xl mb-8">
            Lock in a 50% reduction on placement fees with our retained partnership.
            Get SLA-backed delivery, unlimited searches, and full access to the Oneo Talent Platform.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-emerald-900 font-medium rounded-lg hover:bg-emerald-50 transition-colors"
            >
              Become a Partner
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#pricing"
              className="inline-flex items-center gap-2 px-6 py-3 border border-white/30 text-white font-medium rounded-lg hover:bg-white/10 transition-colors"
            >
              View Pricing
            </a>
          </div>
        </div>
      </div>

      {/* What is Retained */}
      <div className="max-w-5xl mx-auto px-6 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              What is Retained Recruitment?
            </h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Retained recruitment is a partnership model where you commit to a monthly retainer
              in exchange for significantly reduced placement fees and premium service levels.
              Unlike traditional contingency recruitment where you pay per placement, our retained
              model rewards ongoing partnerships with better rates and priority service.
            </p>
            <p className="text-gray-600 mb-8 leading-relaxed">
              This model is ideal for companies with consistent hiring needs who want predictable
              costs, dedicated support, and access to our full talent platform.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[14px] font-medium text-gray-900">50% Fee Reduction</p>
                  <p className="text-[12px] text-gray-500">From 20% down to 10% on placements</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[14px] font-medium text-gray-900">Unlimited Searches</p>
                  <p className="text-[12px] text-gray-500">No limit on concurrent roles</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[14px] font-medium text-gray-900">SLA Guarantees</p>
                  <p className="text-[12px] text-gray-500">Committed delivery timelines</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[14px] font-medium text-gray-900">Platform Access</p>
                  <p className="text-[12px] text-gray-500">Full Oneo Talent Platform</p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-emerald-50 rounded-2xl p-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">
              Retained vs Contingency
            </h3>
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-4 border border-emerald-100">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                  <span className="text-[14px] font-medium text-gray-900">Retained Partnership</span>
                </div>
                <p className="text-[13px] text-gray-600">
                  Monthly commitment unlocks reduced fees ({placementFee || '–'}), unlimited searches,
                  SLA guarantees, and full platform access. Ideal for ongoing hiring needs.
                </p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full" />
                  <span className="text-[14px] font-medium text-gray-900">Contingency (Standard)</span>
                </div>
                <p className="text-[13px] text-gray-600">
                  Pay-per-placement at {standardFee || '–'} with no upfront commitment.
                  Best for occasional hires or testing our service.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Key Benefits */}
      <div className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              The Retained Advantage
            </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            A simple monthly commitment unlocks significant savings and premium service levels.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {benefits.map((benefit) => (
            <div
              key={benefit.title}
              className="flex gap-4 p-6 rounded-xl border border-gray-200 hover:border-emerald-200 hover:shadow-sm transition-all"
            >
              <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <benefit.icon className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-[17px] font-semibold text-gray-900 mb-2">
                  {benefit.title}
                </h3>
                <p className="text-[14px] text-gray-600 leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            </div>
          ))}
        </div>
        </div>
      </div>

      {/* Process Section */}
      <div id="process" className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Our Process
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              A structured, thorough approach to finding exceptional talent.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {process.map((item) => (
              <div key={item.step} className="relative p-6 bg-white border border-gray-200 rounded-xl">
                <div className="text-[32px] font-bold text-emerald-100 mb-2">
                  {item.step}
                </div>
                <h3 className="text-[15px] font-semibold text-gray-900 mb-2">
                  {item.title}
                </h3>
                <p className="text-[13px] text-gray-600">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div id="pricing" className="bg-white">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              One annual commitment, paid monthly, unlocks premium benefits for your entire organization.
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              {/* Pricing Header */}
              <div className="bg-emerald-600 text-white p-8 text-center">
                <p className="text-emerald-100 text-sm mb-2">Annual Commitment</p>
                <div className="text-4xl md:text-5xl font-bold mb-2">{annualRetainer || '–'}</div>
                <p className="text-emerald-100">
                  {monthlyRetainer ? `${monthlyRetainer}/month for 12 months` : '–'}
                </p>
              </div>

              {/* Pricing Details */}
              <div className="p-8">
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  <div className="text-center p-4 bg-gray-50 rounded-xl">
                    <div className="text-3xl font-bold text-emerald-600 mb-1">{placementFee || '–'}</div>
                    <p className="text-[13px] text-gray-600">Placement fee (reduced from {standardFee || '–'})</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-xl">
                    <div className="text-3xl font-bold text-emerald-600 mb-1">50%</div>
                    <p className="text-[13px] text-gray-600">Savings on every placement</p>
                  </div>
                </div>

                <div className="space-y-3 mb-8">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    <span className="text-[14px] text-gray-700">Unlimited concurrent searches</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    <span className="text-[14px] text-gray-700">SLA-backed delivery (10-day shortlist guarantee)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    <span className="text-[14px] text-gray-700">3-month free replacement guarantee</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    <span className="text-[14px] text-gray-700">Full Oneo Talent Platform access</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    <span className="text-[14px] text-gray-700">Dedicated account management</span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 text-[13px] text-gray-500 mb-6">
                  <Calendar className="w-4 h-4" />
                  <span>12-month minimum commitment</span>
                </div>

                <Link
                  to="/contact"
                  className="block w-full text-center px-6 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  Get Started
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SLA Commitments */}
      <div className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Service Level Commitments
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            We back our service with concrete commitments, not just promises.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {slaCommitments.map((sla) => (
            <div key={sla.label} className="text-center p-6 border border-gray-200 rounded-xl">
              <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <sla.icon className="w-6 h-6 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">{sla.metric}</div>
              <div className="text-[14px] font-medium text-emerald-600 mb-2">{sla.label}</div>
              <p className="text-[13px] text-gray-500">{sla.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Platform Access */}
      <div className="bg-emerald-950 text-white">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              Oneo Talent Platform Access
            </h2>
            <p className="text-emerald-200 max-w-2xl mx-auto">
              Retained partners get full access to our talent platform — included in your partnership.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {platformFeatures.map((feature) => (
              <div key={feature.title} className="bg-white/10 backdrop-blur rounded-xl p-6">
                <feature.icon className="w-8 h-8 text-emerald-300 mb-4" />
                <h3 className="text-[17px] font-semibold mb-2">{feature.title}</h3>
                <p className="text-[14px] text-emerald-200">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Ideal For */}
      <div className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ideal For
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Retained partnerships work best for organizations with ongoing hiring needs.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {idealFor.map((item) => (
            <div key={item.title} className="p-6 border border-gray-200 rounded-xl hover:border-emerald-200 transition-colors">
              <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center mb-4">
                <item.icon className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-[17px] font-semibold text-gray-900 mb-2">{item.title}</h3>
              <p className="text-[14px] text-gray-600">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Comparison */}
      <div className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Retained vs Standard Recruitment
            </h2>
          </div>

          <div className="max-w-3xl mx-auto overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-4 px-4 text-[13px] font-medium text-gray-500">Feature</th>
                  <th className="text-left py-4 px-4 text-[13px] font-medium text-emerald-600">Retained</th>
                  <th className="text-left py-4 px-4 text-[13px] font-medium text-gray-500">Standard</th>
                </tr>
              </thead>
              <tbody className="text-[14px]">
                <tr className="border-b border-gray-100">
                  <td className="py-4 px-4 text-gray-600">Placement Fee</td>
                  <td className="py-4 px-4 font-medium text-gray-900">{placementFee || '–'}</td>
                  <td className="py-4 px-4 text-gray-500">{standardFee || '–'}</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-4 px-4 text-gray-600">Shortlist SLA</td>
                  <td className="py-4 px-4 font-medium text-gray-900">10 business days</td>
                  <td className="py-4 px-4 text-gray-500">Best effort</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-4 px-4 text-gray-600">Replacement Guarantee</td>
                  <td className="py-4 px-4 font-medium text-gray-900">3 months (free)</td>
                  <td className="py-4 px-4 text-gray-500">30 days</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-4 px-4 text-gray-600">Platform Access</td>
                  <td className="py-4 px-4 font-medium text-gray-900">Full access</td>
                  <td className="py-4 px-4 text-gray-500">Limited</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-4 px-4 text-gray-600">Concurrent Searches</td>
                  <td className="py-4 px-4 font-medium text-gray-900">Unlimited</td>
                  <td className="py-4 px-4 text-gray-500">Per-role basis</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 text-gray-600">Account Management</td>
                  <td className="py-4 px-4 font-medium text-gray-900">Dedicated</td>
                  <td className="py-4 px-4 text-gray-500">Shared</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-5xl mx-auto px-6 py-20">
        <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-2xl p-8 md:p-12 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
            Ready to Partner With Us?
          </h2>
          <p className="text-gray-600 max-w-xl mx-auto mb-8">
            Let's discuss how a retained partnership can transform your hiring
            while cutting your recruitment costs in half.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
            >
              Start a Conversation
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-white transition-colors"
            >
              <Target className="w-4 h-4" />
              Pricing Calculator
            </Link>
          </div>
        </div>
      </div>

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
