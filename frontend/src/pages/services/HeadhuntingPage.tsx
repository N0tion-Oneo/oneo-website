// Headhunting Service Page
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { SEO } from '@/components/seo'
import { useSEODefaults } from '@/contexts/SEOContext'
import Navbar from '@/components/layout/Navbar'
import { cmsPricing, CMSPricingConfig } from '@/services/cms'
import {
  Crosshair,
  Users,
  CheckCircle2,
  ArrowRight,
  Building2,
  Briefcase,
  Search,
  Eye,
  MessageSquare,
  UserCheck,
  Network,
  Zap,
  Lock,
  Trophy,
  Calculator,
  Target,
  Clock,
  CreditCard,
} from 'lucide-react'

// Helper to format decimal as percentage
const formatPercent = (decimal: string | number): string => {
  const num = typeof decimal === 'string' ? parseFloat(decimal) : decimal
  return `${Math.round(num * 100)}%`
}

const benefits = [
  {
    icon: Crosshair,
    title: 'Precision Targeting',
    description: 'We identify and approach specific individuals who match your exact requirements, often before they even consider a move.',
  },
  {
    icon: Eye,
    title: 'Access to Passive Talent',
    description: 'The best candidates aren\'t actively looking. Our headhunters know how to find and engage top performers who aren\'t on job boards.',
  },
  {
    icon: Lock,
    title: 'Complete Discretion',
    description: 'Every approach is handled with the utmost confidentiality, protecting both your interests and the candidate\'s.',
  },
  {
    icon: Network,
    title: 'Deep Industry Networks',
    description: 'Years of relationship-building give us access to talent and industry experts across sectors.',
  },
]

const approach = [
  {
    step: '01',
    title: 'Target Profiling',
    description: 'We build a detailed profile of your ideal candidate including skills, experience, and cultural attributes.',
  },
  {
    step: '02',
    title: 'Market Intelligence',
    description: 'We map the competitive landscape to identify where target candidates are currently working.',
  },
  {
    step: '03',
    title: 'Direct Approach',
    description: 'Our headhunters make confidential, personalized approaches to identified targets.',
  },
  {
    step: '04',
    title: 'Qualification & Assessment',
    description: 'In-depth conversations to assess fit, motivation, and alignment with your opportunity.',
  },
  {
    step: '05',
    title: 'Presentation & Facilitation',
    description: 'We present qualified candidates and facilitate the interview and offer process.',
  },
]

const industries = [
  'Technology & Software',
  'Financial Services',
  'Healthcare & Life Sciences',
  'Manufacturing & Engineering',
  'Professional Services',
  'Retail & Consumer',
  'Energy & Utilities',
  'Media & Entertainment',
]

const roleTypes = [
  {
    icon: Trophy,
    title: 'Executive & Leadership',
    description: 'C-Suite, Board Directors, and senior leadership positions.',
  },
  {
    icon: Building2,
    title: 'Management Roles',
    description: 'Directors, General Managers, and functional leaders.',
  },
  {
    icon: Zap,
    title: 'Specialist Experts',
    description: 'Niche technical experts and rare skill sets.',
  },
  {
    icon: Briefcase,
    title: 'Hard-to-Fill Roles',
    description: 'Any role where passive talent outperforms active applicants.',
  },
]

const stats = [
  { value: '85%', label: 'of top performers are passive candidates' },
  { value: '3x', label: 'higher quality vs job board applicants' },
  { value: '95%', label: 'placement success rate' },
]

export default function HeadhuntingPage() {
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

  const placementFee = pricingConfig ? formatPercent(pricingConfig.headhunting_placement_fee) : ''

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <SEO />
      <Navbar />

      {/* Hero Section */}
      <div className="bg-gradient-to-b from-purple-950 to-purple-900 text-white">
        <div className="max-w-5xl mx-auto px-6 py-20 md:py-28">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-white/10 backdrop-blur rounded-xl flex items-center justify-center">
              <Crosshair className="w-6 h-6 text-purple-300" />
            </div>
            <span className="text-[13px] font-medium text-purple-300 uppercase tracking-wide">
              Headhunting
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            Find Talent That<br />
            <span className="text-purple-300">Isn't Looking</span>
          </h1>
          <p className="text-lg text-purple-100 max-w-2xl mb-8">
            The best candidates aren't on job boards. Our headhunters proactively identify
            and approach top performers — bringing you talent your competitors can't reach.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-purple-900 font-medium rounded-lg hover:bg-purple-50 transition-colors"
            >
              Start a Search
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

      {/* What is Headhunting */}
      <div className="max-w-5xl mx-auto px-6 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">
              Beyond Traditional Recruitment
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
              Headhunting is the art of identifying exceptional talent and persuading them to
              consider new opportunities. Unlike traditional recruitment that waits for candidates
              to apply, headhunting is proactive and targeted.
            </p>
            <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
              Our headhunters are skilled relationship builders who understand how to engage
              professionals, present compelling opportunities, and navigate the complexities
              of talent acquisition.
            </p>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 text-[13px] text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-full">
                <CheckCircle2 className="w-4 h-4 text-purple-500" />
                Proactive Sourcing
              </div>
              <div className="flex items-center gap-2 text-[13px] text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-full">
                <CheckCircle2 className="w-4 h-4 text-purple-500" />
                Confidential Approaches
              </div>
              <div className="flex items-center gap-2 text-[13px] text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-full">
                <CheckCircle2 className="w-4 h-4 text-purple-500" />
                Passive Candidates
              </div>
              <div className="flex items-center gap-2 text-[13px] text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-full">
                <CheckCircle2 className="w-4 h-4 text-purple-500" />
                Pay on Success
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {stats.map((stat) => (
              <div key={stat.value} className="bg-purple-50 dark:bg-purple-900/30 rounded-xl p-6">
                <div className="text-[40px] font-bold text-purple-600 dark:text-purple-400 mb-1">{stat.value}</div>
                <p className="text-[13px] text-gray-600 dark:text-gray-400">{stat.label}</p>
              </div>
            ))}
            <div className="bg-purple-600 rounded-xl p-6 text-white">
              <div className="text-[40px] font-bold mb-1">{placementFee || '–'}</div>
              <p className="text-[13px] text-purple-100">placement fee on success</p>
            </div>
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="bg-gray-50 dark:bg-gray-800 border-y border-gray-100 dark:border-gray-700">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              The Headhunting Advantage
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Why leading companies trust us to find their most important hires.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {benefits.map((benefit) => (
              <div
                key={benefit.title}
                className="flex gap-4 p-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700"
              >
                <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                  <benefit.icon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="text-[17px] font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    {benefit.title}
                  </h3>
                  <p className="text-[14px] text-gray-600 dark:text-gray-400 leading-relaxed">
                    {benefit.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div id="pricing" className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Simple, Success-Based Pricing
          </h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            No upfront costs, no retainers. You only pay when we successfully place a candidate.
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Pricing Header */}
            <div className="bg-purple-600 text-white p-8 text-center">
              <p className="text-purple-100 text-sm mb-2">Placement Fee</p>
              <div className="text-4xl md:text-5xl font-bold mb-2">{placementFee || '–'}</div>
              <p className="text-purple-100">of total package (CTC)</p>
            </div>

            {/* Pricing Details */}
            <div className="p-8">
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                  <CreditCard className="w-6 h-6 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
                  <p className="text-[14px] font-medium text-gray-900 dark:text-gray-100">Pay on Success</p>
                  <p className="text-[12px] text-gray-500 dark:text-gray-400">Fee due on candidate acceptance</p>
                </div>
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                  <Target className="w-6 h-6 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
                  <p className="text-[14px] font-medium text-gray-900 dark:text-gray-100">No Exclusivity</p>
                  <p className="text-[12px] text-gray-500 dark:text-gray-400">We work at risk alongside you</p>
                </div>
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                  <Clock className="w-6 h-6 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
                  <p className="text-[14px] font-medium text-gray-900 dark:text-gray-100">4-Month Cover</p>
                  <p className="text-[12px] text-gray-500 dark:text-gray-400">Replacement at 5% if needed</p>
                </div>
              </div>

              <div className="border-t border-gray-100 dark:border-gray-700 pt-6 mb-6">
                <h4 className="text-[14px] font-medium text-gray-900 dark:text-gray-100 mb-3">Fee Includes</h4>
                <div className="grid sm:grid-cols-2 gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-purple-500 flex-shrink-0" />
                    <span className="text-[13px] text-gray-600 dark:text-gray-400">Target identification & mapping</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-purple-500 flex-shrink-0" />
                    <span className="text-[13px] text-gray-600 dark:text-gray-400">Direct candidate approach</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-purple-500 flex-shrink-0" />
                    <span className="text-[13px] text-gray-600 dark:text-gray-400">Screening & assessment</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-purple-500 flex-shrink-0" />
                    <span className="text-[13px] text-gray-600 dark:text-gray-400">Interview coordination</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-purple-500 flex-shrink-0" />
                    <span className="text-[13px] text-gray-600 dark:text-gray-400">Offer negotiation support</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-purple-500 flex-shrink-0" />
                    <span className="text-[13px] text-gray-600 dark:text-gray-400">Reference checks</span>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-4 mb-6">
                <p className="text-[13px] text-gray-700 dark:text-gray-300">
                  <strong>Replacement Policy:</strong> If a placed candidate leaves within 4 months,
                  we'll find a replacement for just 5% of the package (instead of the full {placementFee || '20%'} fee).
                </p>
              </div>

              <Link
                to="/contact"
                className="block w-full text-center px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors"
              >
                Start a Search
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Our Approach */}
      <div id="approach" className="bg-gray-50 dark:bg-gray-800 border-y border-gray-100 dark:border-gray-700">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Our Approach
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              A methodical process refined over years of successful searches.
            </p>
          </div>

          <div className="space-y-6">
            {approach.map((item) => (
              <div
                key={item.step}
                className="flex gap-6 items-start p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-purple-200 dark:hover:border-purple-700 transition-colors"
              >
                <div className="w-14 h-14 bg-purple-600 text-white rounded-xl flex items-center justify-center text-xl font-bold flex-shrink-0">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-[17px] font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    {item.title}
                  </h3>
                  <p className="text-[14px] text-gray-600 dark:text-gray-400">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Role Types */}
      <div className="bg-purple-950 text-white">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              Roles We Headhunt
            </h2>
            <p className="text-purple-200 max-w-2xl mx-auto">
              Headhunting works for any role where the best talent isn't actively looking.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {roleTypes.map((role) => (
              <div key={role.title} className="bg-white/10 backdrop-blur rounded-xl p-6">
                <role.icon className="w-8 h-8 text-purple-300 mb-4" />
                <h3 className="text-[15px] font-semibold mb-2">{role.title}</h3>
                <p className="text-[13px] text-purple-200">
                  {role.description}
                </p>
              </div>
            ))}
          </div>

          <div className="border-t border-white/20 pt-12">
            <h3 className="text-xl font-semibold mb-6 text-center">Industries We Serve</h3>
            <div className="flex flex-wrap justify-center gap-3">
              {industries.map((industry) => (
                <span
                  key={industry}
                  className="px-4 py-2 bg-white/10 rounded-full text-[13px] text-purple-100"
                >
                  {industry}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Why Work With Us */}
      <div className="max-w-5xl mx-auto px-6 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">
              Why Choose Us?
            </h2>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Search className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    Deep Market Knowledge
                  </h3>
                  <p className="text-[13px] text-gray-600 dark:text-gray-400">
                    Our headhunters have extensive networks and understand the talent landscape in their sectors.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    Relationship-First Approach
                  </h3>
                  <p className="text-[13px] text-gray-600 dark:text-gray-400">
                    We build long-term relationships with candidates, not transactional interactions.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                  <UserCheck className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    Thorough Assessment
                  </h3>
                  <p className="text-[13px] text-gray-600 dark:text-gray-400">
                    Beyond skills — we assess cultural fit, motivation, and long-term potential.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-8">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
              Our Commitment
            </h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                <span className="text-[14px] text-gray-600 dark:text-gray-400">
                  Transparent communication throughout the search
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                <span className="text-[14px] text-gray-600 dark:text-gray-400">
                  Regular progress updates and market insights
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                <span className="text-[14px] text-gray-600 dark:text-gray-400">
                  Comprehensive candidate assessments
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                <span className="text-[14px] text-gray-600 dark:text-gray-400">
                  4-month replacement cover at reduced rate
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                <span className="text-[14px] text-gray-600 dark:text-gray-400">
                  No payment until successful placement
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="border-t border-gray-100 dark:border-gray-800">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <div className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-2xl p-8 md:p-12 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Ready to Find Hidden Talent?
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-xl mx-auto mb-8">
              Let's discuss your hiring needs and how our headhunting
              expertise can bring you candidates you won't find elsewhere.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
              >
                Start Your Search
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/retained-recruitment"
                className="inline-flex items-center gap-2 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-colors"
              >
                Explore Retained Recruitment
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-100 dark:border-gray-800 py-8">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-[13px] text-gray-400 text-center">
            © {new Date().getFullYear()} {seoDefaults.companyName || 'All rights reserved'}.{seoDefaults.companyName ? ' All rights reserved.' : ''}
          </p>
        </div>
      </footer>
    </div>
  )
}
