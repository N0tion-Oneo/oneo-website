// EOR (Employer of Record) Service Page
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { SEO } from '@/components/seo'
import { useSEODefaults } from '@/contexts/SEOContext'
import Navbar from '@/components/layout/Navbar'
import { cmsPricing, CMSPricingConfig } from '@/services/cms'
import {
  Globe,
  Shield,
  FileText,
  Users,
  ArrowRight,
  Building2,
  Briefcase,
  Clock,
  CheckCircle2,
  Calculator,
} from 'lucide-react'

// Helper to format currency
const formatCurrency = (amount: string | number): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return `R${num.toLocaleString()}`
}

const benefits = [
  {
    icon: Shield,
    title: 'Full Compliance',
    description: 'Stay compliant with South African labor laws, tax regulations, BBBEE requirements, and all employment legislation.',
  },
  {
    icon: FileText,
    title: 'Payroll & Benefits',
    description: 'We manage payroll, PAYE, UIF, SDL contributions, and benefits administration according to SA requirements.',
  },
  {
    icon: Clock,
    title: 'Fast Onboarding',
    description: 'Get new hires onboarded in days with proper contracts, registration, and documentation.',
  },
  {
    icon: Users,
    title: 'Employee Experience',
    description: 'Your team members receive compliant contracts, competitive benefits, and dedicated HR support.',
  },
]

const includedServices = [
  'Legal employment contracts',
  'SARS registration & compliance',
  'Monthly payroll processing',
  'PAYE, UIF, SDL submissions',
  'Leave management',
  'HR support & guidance',
  'Employee onboarding',
  'Termination & offboarding',
]


const process = [
  {
    step: '01',
    title: 'Share Your Requirements',
    description: 'Tell us about the role and the candidate you want to employ.',
  },
  {
    step: '02',
    title: 'We Handle Employment',
    description: 'We become the legal employer, handling contracts and compliance.',
  },
  {
    step: '03',
    title: 'Seamless Onboarding',
    description: 'Your new hire is onboarded with proper documentation and benefits.',
  },
  {
    step: '04',
    title: 'Ongoing Management',
    description: 'We manage payroll, taxes, and HR while they work for you.',
  },
]

const idealFor = [
  {
    icon: Globe,
    title: 'International Companies',
    description: 'Employ South African talent without setting up a local entity or navigating complex registration.',
  },
  {
    icon: Building2,
    title: 'Growing Businesses',
    description: 'Focus on growth while we handle the administrative burden of employment compliance.',
  },
  {
    icon: Briefcase,
    title: 'Project-Based Hiring',
    description: 'Flexible employment for contract roles without long-term entity commitments.',
  },
]

export default function EORPage() {
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

  const monthlyFee = pricingConfig ? formatCurrency(pricingConfig.eor_monthly_fee) : ''

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <SEO />
      <Navbar />

      {/* Hero Section */}
      <div className="bg-gradient-to-b from-blue-950 to-blue-900 text-white">
        <div className="max-w-5xl mx-auto px-6 py-20 md:py-28">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-white/10 backdrop-blur rounded-xl flex items-center justify-center">
              <Globe className="w-6 h-6 text-blue-300" />
            </div>
            <span className="text-[13px] font-medium text-blue-300 uppercase tracking-wide">
              Employer of Record
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            Compliant Employment<br />
            <span className="text-blue-300">In South Africa</span>
          </h1>
          <p className="text-lg text-blue-100 max-w-2xl mb-8">
            Employ talent in South Africa without the complexity. We handle legal employment,
            payroll, compliance, and HR — so you can focus on what your team delivers.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-900 font-medium rounded-lg hover:bg-blue-50 transition-colors"
            >
              Get Started
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

      {/* What is EOR */}
      <div className="max-w-5xl mx-auto px-6 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">
              What is Employer of Record?
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
              An Employer of Record (EOR) is a service where we become the legal employer of your
              team members in South Africa. While you manage their day-to-day work, we handle all
              the employment administration, compliance, and payroll.
            </p>
            <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
              This is ideal for international companies wanting to hire in South Africa without
              setting up a local entity, or local businesses wanting to outsource employment
              administration.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0" />
                <span className="text-[14px] text-gray-700 dark:text-gray-300">No entity required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0" />
                <span className="text-[14px] text-gray-700 dark:text-gray-300">Full SA compliance</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0" />
                <span className="text-[14px] text-gray-700 dark:text-gray-300">Fast onboarding</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0" />
                <span className="text-[14px] text-gray-700 dark:text-gray-300">Flexible terms</span>
              </div>
            </div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/30 rounded-2xl p-8">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
              How It Works
            </h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                  1
                </div>
                <div>
                  <p className="text-[14px] font-medium text-gray-900 dark:text-gray-100">You find the talent</p>
                  <p className="text-[13px] text-gray-500 dark:text-gray-400">Identify who you want to employ</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                  2
                </div>
                <div>
                  <p className="text-[14px] font-medium text-gray-900 dark:text-gray-100">We employ them</p>
                  <p className="text-[13px] text-gray-500 dark:text-gray-400">Legal employment through our entity</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                  3
                </div>
                <div>
                  <p className="text-[14px] font-medium text-gray-900 dark:text-gray-100">They work for you</p>
                  <p className="text-[13px] text-gray-500 dark:text-gray-400">You manage their work, we handle the rest</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="bg-gray-50 dark:bg-gray-800 border-y border-gray-100 dark:border-gray-700">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Why Choose EOR?
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Let us handle the complexity of South African employment compliance.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {benefits.map((benefit) => (
              <div
                key={benefit.title}
                className="flex gap-4 p-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700"
              >
                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                  <benefit.icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
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
            Simple, Transparent Pricing
          </h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            One flat monthly fee per employee. No hidden costs, no surprises.
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Pricing Header */}
            <div className="bg-blue-600 text-white p-8 text-center">
              <p className="text-blue-100 text-sm mb-2">Per Employee</p>
              <div className="text-4xl md:text-5xl font-bold mb-2">{monthlyFee || '–'}</div>
              <p className="text-blue-100">per month</p>
            </div>

            {/* What's Included */}
            <div className="p-8">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">What's Included</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {includedServices.map((service) => (
                  <div key={service} className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0" />
                    <span className="text-[14px] text-gray-700 dark:text-gray-300">{service}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8">
                <Link
                  to="/contact"
                  className="block w-full text-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Get Started
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Process */}
      <div className="bg-gray-50 dark:bg-gray-800 border-y border-gray-100 dark:border-gray-700">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Getting Started
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Simple and straightforward — we can have your employee onboarded in days.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {process.map((item, index) => (
              <div key={item.step} className="relative">
                {index < process.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-full w-full h-[2px] bg-gray-200 dark:bg-gray-700 -translate-x-1/2" />
                )}
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                    {item.step}
                  </div>
                  <h3 className="text-[15px] font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    {item.title}
                  </h3>
                  <p className="text-[13px] text-gray-600 dark:text-gray-400">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Ideal For */}
      <div className="bg-blue-950 text-white">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              Ideal For
            </h2>
            <p className="text-blue-200 max-w-2xl mx-auto">
              Our EOR service works for any company wanting compliant employment in South Africa.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {idealFor.map((item) => (
              <div key={item.title} className="bg-white/10 backdrop-blur rounded-xl p-6">
                <item.icon className="w-8 h-8 text-blue-300 mb-4" />
                <h3 className="text-[17px] font-semibold mb-2">{item.title}</h3>
                <p className="text-[14px] text-blue-200">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-5xl mx-auto px-6 py-20">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-2xl p-8 md:p-12 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Ready to Simplify Employment?
          </h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-xl mx-auto mb-8">
            Let's discuss how our EOR service can help you employ talent in South Africa
            without the complexity.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
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
