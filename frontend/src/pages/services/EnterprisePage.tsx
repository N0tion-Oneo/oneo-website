// Enterprise Service Page - Combined Recruitment + EOR offering
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { SEO } from '@/components/seo'
import { useSEODefaults } from '@/contexts/SEOContext'
import Navbar from '@/components/layout/Navbar'
import { cmsPricing, CMSPricingConfig } from '@/services/cms'
import {
  Building2,
  Users,
  ArrowRight,
  CheckCircle2,
  TrendingDown,
  Shield,
  CreditCard,
  BarChart3,
  Calculator,
} from 'lucide-react'

const benefits = [
  {
    icon: TrendingDown,
    title: 'Cashflow Friendly',
    description: 'Spread costs over time with our margin-based model. No large upfront placement fees — pay as you go with predictable monthly costs.',
  },
  {
    icon: Shield,
    title: 'Full Compliance & Risk Management',
    description: 'We handle all employment compliance, contracts, payroll, and statutory requirements across multiple jurisdictions.',
  },
  {
    icon: Users,
    title: 'End-to-End Talent Solution',
    description: 'From finding the right candidate to employing and managing them — one partner handles everything.',
  },
  {
    icon: TrendingDown,
    title: 'Decreasing Costs Over Time',
    description: 'Our margin decreases by 2% each year for the first 4 years, rewarding long-term partnerships.',
  },
]

const included = [
  { title: 'Talent Sourcing & Recruitment', description: 'Full recruitment service to find the perfect candidates' },
  { title: 'Employment & Compliance', description: 'We become the legal employer, handling all compliance' },
  { title: 'Payroll Management', description: 'Accurate, timely payroll in local currencies' },
  { title: 'Benefits Administration', description: 'Competitive benefits packages for your team' },
  { title: 'Asset Management', description: 'Equipment provisioning and tracking' },
  { title: 'Office Solutions', description: 'Co-working spaces and local office setup' },
  { title: 'Culture & Engagement', description: 'Team events and culture-building activities' },
  { title: 'HR Support', description: 'Dedicated support for you and your employees' },
]

// Helper to format decimal as percentage
const formatPercent = (decimal: string | number): string => {
  const num = typeof decimal === 'string' ? parseFloat(decimal) : decimal
  return `${Math.round(num * 100)}%`
}

const comparison = [
  {
    feature: 'Upfront Costs',
    enterprise: 'None',
    traditional: 'Large placement fees (15-25%)',
  },
  {
    feature: 'Monthly Predictability',
    enterprise: 'Fixed margin on salary',
    traditional: 'Variable costs',
  },
  {
    feature: 'Employment Compliance',
    enterprise: 'Included',
    traditional: 'Your responsibility',
  },
  {
    feature: 'Payroll & Benefits',
    enterprise: 'Included',
    traditional: 'Separate vendors',
  },
  {
    feature: 'Asset Management',
    enterprise: 'Available (+12% fee)',
    traditional: 'Your responsibility',
  },
  {
    feature: 'Long-term Cost Trend',
    enterprise: 'Decreases over time',
    traditional: 'Static or increases',
  },
]

export default function EnterprisePage() {
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

  // Build pricing tiers from CMS config
  const pricingTiers = pricingConfig ? [
    {
      year: 'Year 1',
      margin: formatPercent(pricingConfig.enterprise_markup_year1),
      description: 'Starting rate on salaries',
    },
    {
      year: 'Year 2',
      margin: formatPercent(pricingConfig.enterprise_markup_year2),
      description: '2% reduction',
    },
    {
      year: 'Year 3',
      margin: formatPercent(pricingConfig.enterprise_markup_year3),
      description: '2% reduction',
    },
    {
      year: 'Year 4+',
      margin: formatPercent(pricingConfig.enterprise_markup_year4_plus),
      description: 'Long-term rate',
    },
  ] : []

  // Get the additionals fee for display
  const additionalsFee = pricingConfig ? formatPercent(pricingConfig.enterprise_additionals_fee) : ''

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <SEO />
      <Navbar />

      {/* Hero Section */}
      <div className="bg-gradient-to-b from-gray-900 to-gray-800 text-white">
        <div className="max-w-5xl mx-auto px-6 py-20 md:py-28">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-white/10 backdrop-blur rounded-xl flex items-center justify-center">
              <Building2 className="w-6 h-6 text-amber-400" />
            </div>
            <span className="text-[13px] font-medium text-amber-400 uppercase tracking-wide">
              Enterprise Solution
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            Recruitment + EOR<br />
            <span className="text-amber-400">Combined for Maximum Value</span>
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl mb-8">
            The ultimate talent solution for growing businesses. We find your talent, employ them compliantly,
            and manage everything — with cashflow-friendly pricing that rewards long-term partnerships.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 text-gray-900 font-medium rounded-lg hover:bg-amber-400 transition-colors"
            >
              Get Started
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 px-6 py-3 border border-white/30 text-white font-medium rounded-lg hover:bg-white/10 transition-colors"
            >
              <Calculator className="w-4 h-4" />
              Calculate Your Costs
            </Link>
          </div>
        </div>
      </div>

      {/* Key Benefits */}
      <div className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Why Choose Enterprise?
          </h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            A single partner for all your talent needs — from recruitment to employment to ongoing management.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {benefits.map((benefit) => (
            <div
              key={benefit.title}
              className="flex gap-4 p-6 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-amber-200 dark:hover:border-amber-700 hover:shadow-sm dark:shadow-gray-900/40 transition-all"
            >
              <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                <benefit.icon className="w-6 h-6 text-amber-600 dark:text-amber-400" />
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

      {/* Pricing Structure */}
      <div className="bg-gray-50 dark:bg-gray-800 border-y border-gray-100 dark:border-gray-700">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Transparent Pricing That Rewards Loyalty
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Our margin-based model means you pay a percentage on salaries — no surprises, no large upfront fees.
              And your rate decreases over time.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            {pricingTiers.map((tier, index) => (
              <div
                key={tier.year}
                className={`p-6 rounded-xl text-center ${
                  index === 3
                    ? 'bg-amber-500 text-gray-900'
                    : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className={`text-[13px] font-medium mb-2 ${index === 3 ? 'text-gray-700' : 'text-gray-500 dark:text-gray-400'}`}>
                  {tier.year}
                </div>
                <div className={`text-3xl font-bold mb-1 ${index === 3 ? 'text-gray-900' : 'text-gray-900 dark:text-gray-100'}`}>
                  {tier.margin}
                </div>
                <div className={`text-[12px] ${index === 3 ? 'text-gray-700' : 'text-gray-500 dark:text-gray-400'}`}>
                  {tier.description}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 md:p-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">How It Works</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  <span className="font-medium text-gray-900 dark:text-gray-100">Salary Margin</span>
                </div>
                <p className="text-[14px] text-gray-600 dark:text-gray-400">
                  We charge a margin on employee salaries (starting at {pricingTiers[0]?.margin || '–'}, decreasing to {pricingTiers[3]?.margin || '–'} by year 4).
                  This covers recruitment, employment, payroll, compliance, and HR support.
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  <span className="font-medium text-gray-900 dark:text-gray-100">Additional Services</span>
                </div>
                <p className="text-[14px] text-gray-600 dark:text-gray-400">
                  Asset management, office solutions, and culture activities are charged at a {additionalsFee || '–'} management
                  fee on actual costs — completely transparent and optional.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* What's Included */}
      <div className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Everything Included
          </h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            One partnership covers your entire talent lifecycle.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {included.map((item) => (
            <div
              key={item.title}
              className="p-5 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-amber-200 dark:hover:border-amber-700 transition-colors"
            >
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-[14px] font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    {item.title}
                  </h3>
                  <p className="text-[12px] text-gray-500 dark:text-gray-400">
                    {item.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Comparison Table */}
      <div className="bg-gray-900 text-white">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              Enterprise vs Traditional Recruitment
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              See how our integrated approach compares to traditional recruitment agencies.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-4 px-4 text-[13px] font-medium text-gray-400">Feature</th>
                  <th className="text-left py-4 px-4 text-[13px] font-medium text-amber-400">Enterprise</th>
                  <th className="text-left py-4 px-4 text-[13px] font-medium text-gray-400">Traditional</th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((row) => (
                  <tr key={row.feature} className="border-b border-gray-800">
                    <td className="py-4 px-4 text-[14px] text-gray-300">{row.feature}</td>
                    <td className="py-4 px-4 text-[14px] text-white font-medium">{row.enterprise}</td>
                    <td className="py-4 px-4 text-[14px] text-gray-500">{row.traditional}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-5xl mx-auto px-6 py-20">
        <div className="bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 rounded-2xl p-8 md:p-12">
          <div className="md:flex md:items-center md:justify-between">
            <div className="mb-6 md:mb-0">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Ready to Transform Your Hiring?
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Let's discuss how Enterprise can work for your business.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
              >
                Contact Us
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/pricing"
                className="inline-flex items-center gap-2 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-colors"
              >
                <Calculator className="w-4 h-4" />
                Pricing Calculator
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
