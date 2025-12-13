// Headhunting Service Page
import { Link } from 'react-router-dom'
import { SEO } from '@/components/seo'
import { useSEODefaults } from '@/contexts/SEOContext'
import Navbar from '@/components/layout/Navbar'
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
} from 'lucide-react'

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
    description: 'Years of relationship-building give us access to senior talent and industry leaders across sectors.',
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
    title: 'C-Suite & Board',
    description: 'CEOs, CFOs, CTOs, Board Directors, and executive leadership positions.',
  },
  {
    icon: Building2,
    title: 'Senior Management',
    description: 'VPs, Directors, General Managers, and senior functional leaders.',
  },
  {
    icon: Zap,
    title: 'Specialist Experts',
    description: 'Niche technical experts, industry specialists, and rare skill sets.',
  },
  {
    icon: Briefcase,
    title: 'Revenue Leaders',
    description: 'Sales directors, business development leaders, and commercial executives.',
  },
]

export default function HeadhuntingPage() {
  const seoDefaults = useSEODefaults()

  return (
    <div className="min-h-screen bg-white">
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
              Executive Headhunting
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            Finding Leaders Who<br />
            <span className="text-purple-300">Transform Businesses</span>
          </h1>
          <p className="text-lg text-purple-100 max-w-2xl mb-8">
            When you need exceptional talent that isn't actively looking, our headhunters
            go directly to the source. We identify, approach, and secure the industry's
            best performers for your most critical roles.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-purple-900 font-medium rounded-lg hover:bg-purple-50 transition-colors"
            >
              Discuss Your Search
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#approach"
              className="inline-flex items-center gap-2 px-6 py-3 border border-white/30 text-white font-medium rounded-lg hover:bg-white/10 transition-colors"
            >
              Our Approach
            </a>
          </div>
        </div>
      </div>

      {/* What is Headhunting */}
      <div className="max-w-5xl mx-auto px-6 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Beyond Traditional Recruitment
            </h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Headhunting is the art and science of identifying exceptional talent and
              persuading them to consider new opportunities. Unlike traditional recruitment
              that waits for candidates to apply, headhunting is proactive and targeted.
            </p>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Our headhunters are skilled relationship builders who understand how to
              engage senior professionals, present compelling opportunities, and navigate
              the complexities of executive transitions.
            </p>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 text-[13px] text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full">
                <CheckCircle2 className="w-4 h-4 text-purple-500" />
                Proactive Sourcing
              </div>
              <div className="flex items-center gap-2 text-[13px] text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full">
                <CheckCircle2 className="w-4 h-4 text-purple-500" />
                Confidential Approaches
              </div>
              <div className="flex items-center gap-2 text-[13px] text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full">
                <CheckCircle2 className="w-4 h-4 text-purple-500" />
                Passive Candidates
              </div>
              <div className="flex items-center gap-2 text-[13px] text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full">
                <CheckCircle2 className="w-4 h-4 text-purple-500" />
                Executive Focus
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-purple-50 rounded-xl p-6">
              <div className="text-[40px] font-bold text-purple-600 mb-1">85%</div>
              <p className="text-[13px] text-gray-600">of senior executives are passive candidates</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-6">
              <div className="text-[40px] font-bold text-purple-600 mb-1">3x</div>
              <p className="text-[13px] text-gray-600">higher quality candidates vs job boards</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-6">
              <div className="text-[40px] font-bold text-purple-600 mb-1">95%</div>
              <p className="text-[13px] text-gray-600">placement success rate</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-6">
              <div className="text-[40px] font-bold text-purple-600 mb-1">6mo</div>
              <p className="text-[13px] text-gray-600">guarantee on all placements</p>
            </div>
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              The Headhunting Advantage
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Why leading companies trust us to find their most important hires.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {benefits.map((benefit) => (
              <div
                key={benefit.title}
                className="flex gap-4 p-6 bg-white rounded-xl border border-gray-200"
              >
                <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <benefit.icon className="w-6 h-6 text-purple-600" />
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

      {/* Our Approach */}
      <div id="approach" className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Our Approach
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            A methodical process refined over years of executive search.
          </p>
        </div>

        <div className="space-y-6">
          {approach.map((item, index) => (
            <div
              key={item.step}
              className="flex gap-6 items-start p-6 border border-gray-200 rounded-xl hover:border-purple-200 transition-colors"
            >
              <div className="w-14 h-14 bg-purple-600 text-white rounded-xl flex items-center justify-center text-xl font-bold flex-shrink-0">
                {item.step}
              </div>
              <div>
                <h3 className="text-[17px] font-semibold text-gray-900 mb-2">
                  {item.title}
                </h3>
                <p className="text-[14px] text-gray-600">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Role Types */}
      <div className="bg-purple-950 text-white">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              Roles We Recruit
            </h2>
            <p className="text-purple-200 max-w-2xl mx-auto">
              We specialize in senior and executive-level positions across industries.
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
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Why Choose Us?
            </h2>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Search className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-gray-900 mb-1">
                    Deep Market Knowledge
                  </h3>
                  <p className="text-[13px] text-gray-600">
                    Our headhunters have extensive networks and understand the talent landscape in their sectors.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-gray-900 mb-1">
                    Relationship-First Approach
                  </h3>
                  <p className="text-[13px] text-gray-600">
                    We build long-term relationships with candidates, not transactional interactions.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <UserCheck className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-gray-900 mb-1">
                    Thorough Assessment
                  </h3>
                  <p className="text-[13px] text-gray-600">
                    Beyond skills—we assess leadership style, cultural fit, and long-term potential.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 rounded-2xl p-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">
              Our Commitment
            </h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                <span className="text-[14px] text-gray-600">
                  Exclusive, dedicated focus on your search
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                <span className="text-[14px] text-gray-600">
                  Regular progress updates and market insights
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                <span className="text-[14px] text-gray-600">
                  Comprehensive candidate assessments
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                <span className="text-[14px] text-gray-600">
                  Extended guarantee on all placements
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                <span className="text-[14px] text-gray-600">
                  Post-placement support and check-ins
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="border-t border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <div className="bg-purple-50 rounded-2xl p-8 md:p-12 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              Ready to Find Your Next Leader?
            </h2>
            <p className="text-gray-600 max-w-xl mx-auto mb-8">
              Let's discuss your executive search requirements and how our
              headhunting expertise can deliver the talent you need.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
              >
                Start Your Search
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/retained-recruitment"
                className="inline-flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition-colors"
              >
                Explore Retained Recruitment
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
