// Retained Recruitment Service Page
import { Link } from 'react-router-dom'
import { SEO } from '@/components/seo'
import { useSEODefaults } from '@/contexts/SEOContext'
import Navbar from '@/components/layout/Navbar'
import {
  Target,
  Users,
  CheckCircle2,
  ArrowRight,
  Building2,
  Briefcase,
  Search,
  Clock,
  Shield,
  Award,
  Handshake,
  BarChart3,
} from 'lucide-react'

const benefits = [
  {
    icon: Target,
    title: 'Dedicated Focus',
    description: 'Your search becomes our priority. We dedicate significant resources exclusively to finding your ideal candidate.',
  },
  {
    icon: Shield,
    title: 'Commitment & Accountability',
    description: 'The retained model ensures we\'re fully invested in your success, with clear milestones and regular progress updates.',
  },
  {
    icon: Search,
    title: 'Deep Market Access',
    description: 'We proactively approach passive candidates and tap into networks that contingency searches can\'t reach.',
  },
  {
    icon: Award,
    title: 'Quality Over Speed',
    description: 'We take the time to thoroughly vet candidates, ensuring cultural fit and long-term success, not just filling a seat.',
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
    title: 'Executive & C-Suite Roles',
    description: 'Leadership positions requiring discretion, extensive vetting, and access to passive candidates.',
  },
  {
    icon: Briefcase,
    title: 'Specialist Positions',
    description: 'Hard-to-fill roles requiring niche skills or experience that are scarce in the market.',
  },
  {
    icon: Users,
    title: 'Confidential Searches',
    description: 'Sensitive replacements or new positions that require discretion until the right time.',
  },
]

const whyRetained = [
  {
    title: 'Exclusivity',
    description: 'We work exclusively on your search, not competing with other agencies.',
  },
  {
    title: 'Resource Investment',
    description: 'Significant upfront investment in research, mapping, and candidate engagement.',
  },
  {
    title: 'Partnership Approach',
    description: 'We become an extension of your team, deeply understanding your needs.',
  },
  {
    title: 'Guarantee Period',
    description: 'Extended guarantees demonstrate our confidence in placement quality.',
  },
]

export default function RetainedRecruitmentPage() {
  const seoDefaults = useSEODefaults()

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
            Strategic Hiring for<br />
            <span className="text-emerald-300">Critical Roles</span>
          </h1>
          <p className="text-lg text-emerald-100 max-w-2xl mb-8">
            When the stakes are high, you need a recruitment partner fully committed to your success.
            Our retained search service delivers exceptional candidates for your most important positions.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-emerald-900 font-medium rounded-lg hover:bg-emerald-50 transition-colors"
            >
              Start a Search
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#process"
              className="inline-flex items-center gap-2 px-6 py-3 border border-white/30 text-white font-medium rounded-lg hover:bg-white/10 transition-colors"
            >
              Our Process
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
              Retained recruitment is a partnership-based search model where you engage us exclusively
              to fill a critical role. Unlike contingency recruitment, we're paid in stages throughout
              the search process, ensuring dedicated resources and complete commitment to finding
              your ideal candidate.
            </p>
            <p className="text-gray-600 mb-8 leading-relaxed">
              This model is ideal for senior, specialist, or confidential positions where quality,
              discretion, and thoroughness are paramount.
            </p>
            <div className="grid grid-cols-2 gap-4">
              {whyRetained.map((item) => (
                <div key={item.title} className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[14px] font-medium text-gray-900">{item.title}</p>
                    <p className="text-[12px] text-gray-500">{item.description}</p>
                  </div>
                </div>
              ))}
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
                  <span className="text-[14px] font-medium text-gray-900">Retained</span>
                </div>
                <p className="text-[13px] text-gray-600">
                  Exclusive partnership with dedicated resources, ideal for critical and senior roles.
                </p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full" />
                  <span className="text-[14px] font-medium text-gray-900">Contingency</span>
                </div>
                <p className="text-[13px] text-gray-600">
                  Pay-on-success model, suitable for volume hiring and standard positions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              The Retained Advantage
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Our retained search service offers distinct advantages for mission-critical hires.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {benefits.map((benefit) => (
              <div
                key={benefit.title}
                className="flex gap-4 p-6 bg-white rounded-xl border border-gray-200"
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

      {/* Process */}
      <div id="process" className="max-w-5xl mx-auto px-6 py-20">
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
            <div key={item.step} className="relative p-6 border border-gray-200 rounded-xl">
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

      {/* Ideal For */}
      <div className="bg-emerald-950 text-white">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              Ideal For
            </h2>
            <p className="text-emerald-200 max-w-2xl mx-auto">
              Retained search is the right choice when quality and discretion matter most.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {idealFor.map((item) => (
              <div key={item.title} className="bg-white/10 backdrop-blur rounded-xl p-6">
                <item.icon className="w-8 h-8 text-emerald-300 mb-4" />
                <h3 className="text-[17px] font-semibold mb-2">{item.title}</h3>
                <p className="text-[14px] text-emerald-200">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Fee Structure */}
      <div className="max-w-5xl mx-auto px-6 py-20">
        <div className="bg-gray-50 rounded-2xl p-8 md:p-12">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Transparent Fee Structure
              </h2>
              <p className="text-gray-600 mb-6">
                Our retained fees are typically structured in three stages, aligning our
                incentives with your hiring timeline:
              </p>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-[13px] font-bold text-emerald-700">
                    1/3
                  </div>
                  <div>
                    <p className="text-[14px] font-medium text-gray-900">Engagement</p>
                    <p className="text-[12px] text-gray-500">Upon signing the agreement</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-[13px] font-bold text-emerald-700">
                    1/3
                  </div>
                  <div>
                    <p className="text-[14px] font-medium text-gray-900">Shortlist</p>
                    <p className="text-[12px] text-gray-500">When candidates are presented</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-[13px] font-bold text-emerald-700">
                    1/3
                  </div>
                  <div>
                    <p className="text-[14px] font-medium text-gray-900">Placement</p>
                    <p className="text-[12px] text-gray-500">Upon successful hire</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-center lg:text-left">
              <BarChart3 className="w-16 h-16 text-emerald-600 mx-auto lg:mx-0 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Typical Timeline
              </h3>
              <p className="text-gray-600 mb-4">
                Most retained searches are completed within 8-12 weeks, depending on
                role complexity and market conditions.
              </p>
              <p className="text-[13px] text-gray-500">
                All placements include an extended guarantee period for your peace of mind.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="border-t border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <div className="text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              Ready to Find Exceptional Talent?
            </h2>
            <p className="text-gray-600 max-w-xl mx-auto mb-8">
              Let's discuss your critical hiring needs and how our retained search
              service can deliver the results you need.
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
                to="/headhunting"
                className="inline-flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition-colors"
              >
                Explore Headhunting
              </Link>
            </div>
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
