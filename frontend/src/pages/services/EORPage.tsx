// EOR (Employer of Record) Service Page
import { Link } from 'react-router-dom'
import { SEO } from '@/components/seo'
import { useSEODefaults } from '@/contexts/SEOContext'
import Navbar from '@/components/layout/Navbar'
import {
  Globe,
  Shield,
  FileText,
  Users,
  ArrowRight,
  Building2,
  Briefcase,
  Scale,
  Clock,
  CreditCard,
  HeadphonesIcon,
  Laptop,
  Building,
  Heart,
} from 'lucide-react'

const benefits = [
  {
    icon: Globe,
    title: 'Global Expansion Made Easy',
    description: 'Hire employees in new countries without setting up a local entity. We handle the legal complexities so you can focus on growth.',
  },
  {
    icon: Shield,
    title: 'Full Compliance',
    description: 'Stay compliant with local labor laws, tax regulations, and employment requirements in every country you operate.',
  },
  {
    icon: FileText,
    title: 'Payroll & Benefits',
    description: 'We manage payroll, taxes, benefits, and statutory contributions according to local requirements.',
  },
  {
    icon: Users,
    title: 'Employee Experience',
    description: 'Your team members receive locally compliant contracts, competitive benefits, and dedicated HR support.',
  },
]

const services = [
  {
    icon: Building2,
    title: 'Entity-Free Employment',
    description: 'Employ talent in countries where you don\'t have a legal entity.',
  },
  {
    icon: CreditCard,
    title: 'Payroll Management',
    description: 'Accurate, timely payroll processing in local currencies.',
  },
  {
    icon: Scale,
    title: 'Legal Compliance',
    description: 'Employment contracts that meet local legal requirements.',
  },
  {
    icon: Shield,
    title: 'Risk Mitigation',
    description: 'Protection from misclassification and compliance risks.',
  },
  {
    icon: HeadphonesIcon,
    title: 'HR Support',
    description: 'Dedicated support for you and your employees.',
  },
  {
    icon: Clock,
    title: 'Fast Onboarding',
    description: 'Get new hires onboarded in days, not months.',
  },
  {
    icon: Laptop,
    title: 'Asset Management',
    description: 'Provision, track, and manage equipment for your remote team members.',
  },
  {
    icon: Building,
    title: 'Office Management',
    description: 'Co-working spaces, local office setup, and workspace solutions for your teams.',
  },
  {
    icon: Heart,
    title: 'Culture Management',
    description: 'Team events, local engagement activities, and culture-building for distributed teams.',
  },
]

const process = [
  {
    step: '01',
    title: 'Identify Your Hire',
    description: 'Find the perfect candidate for your role, anywhere in the world.',
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

export default function EORPage() {
  const seoDefaults = useSEODefaults()

  return (
    <div className="min-h-screen bg-white">
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
            Hire Globally Without<br />
            <span className="text-blue-300">Setting Up Entities</span>
          </h1>
          <p className="text-lg text-blue-100 max-w-2xl mb-8">
            Expand your team into new markets quickly and compliantly. Our Employer of Record
            service handles all the legal, payroll, and HR complexities so you can focus on
            what matters most — your business.
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
              href="#how-it-works"
              className="inline-flex items-center gap-2 px-6 py-3 border border-white/30 text-white font-medium rounded-lg hover:bg-white/10 transition-colors"
            >
              Learn More
            </a>
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Why Choose EOR?
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            An Employer of Record allows you to legally employ workers in countries where
            you don't have a registered entity, handling all compliance and administrative tasks.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {benefits.map((benefit) => (
            <div
              key={benefit.title}
              className="flex gap-4 p-6 rounded-xl border border-gray-200 hover:border-blue-200 hover:shadow-sm transition-all"
            >
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <benefit.icon className="w-6 h-6 text-blue-600" />
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

      {/* Services Grid */}
      <div className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              What's Included
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Our comprehensive EOR service covers everything you need to employ talent globally.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => (
              <div
                key={service.title}
                className="bg-white p-6 rounded-xl border border-gray-200"
              >
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mb-4">
                  <service.icon className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="text-[15px] font-semibold text-gray-900 mb-2">
                  {service.title}
                </h3>
                <p className="text-[13px] text-gray-600">
                  {service.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div id="how-it-works" className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            How It Works
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Getting started with our EOR service is simple and straightforward.
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-8">
          {process.map((item, index) => (
            <div key={item.step} className="relative">
              {index < process.length - 1 && (
                <div className="hidden md:block absolute top-8 left-full w-full h-[2px] bg-gray-200 -translate-x-1/2" />
              )}
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="text-[15px] font-semibold text-gray-900 mb-2">
                  {item.title}
                </h3>
                <p className="text-[13px] text-gray-600">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Use Cases */}
      <div className="bg-blue-950 text-white">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              Ideal For
            </h2>
            <p className="text-blue-200 max-w-2xl mx-auto">
              Our EOR service is perfect for companies looking to expand globally.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white/10 backdrop-blur rounded-xl p-6">
              <Briefcase className="w-8 h-8 text-blue-300 mb-4" />
              <h3 className="text-[17px] font-semibold mb-2">Startups & Scale-ups</h3>
              <p className="text-[14px] text-blue-200">
                Access global talent without the overhead of establishing foreign entities.
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-6">
              <Building2 className="w-8 h-8 text-blue-300 mb-4" />
              <h3 className="text-[17px] font-semibold mb-2">Enterprises</h3>
              <p className="text-[14px] text-blue-200">
                Test new markets or hire specialized talent in countries without existing presence.
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-6">
              <Users className="w-8 h-8 text-blue-300 mb-4" />
              <h3 className="text-[17px] font-semibold mb-2">Remote-First Companies</h3>
              <p className="text-[14px] text-blue-200">
                Build distributed teams across multiple countries with full compliance.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-5xl mx-auto px-6 py-20">
        <div className="bg-gray-50 rounded-2xl p-8 md:p-12 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
            Ready to Expand Globally?
          </h2>
          <p className="text-gray-600 max-w-xl mx-auto mb-8">
            Let's discuss how our EOR service can help you hire the best talent,
            anywhere in the world, without the complexity.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
            >
              Contact Us
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/case-studies"
              className="inline-flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition-colors"
            >
              View Case Studies
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
