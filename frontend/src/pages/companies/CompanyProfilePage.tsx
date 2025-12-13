import { useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useCompany } from '@/hooks'
import Navbar from '@/components/layout/Navbar'
import { SEO } from '@/components/seo'
import { buildCompanySEOData } from '@/utils/seoTemplates'
import {
  Building2,
  MapPin,
  Users,
  Globe,
  Linkedin,
  Calendar,
  Briefcase,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react'

export default function CompanyProfilePage() {
  const { slug } = useParams<{ slug: string }>()
  const { company, isLoading, error } = useCompany(slug || '')

  const getCompanySizeLabel = (size: string) => {
    const labels: Record<string, string> = {
      '1-10': '1-10 employees',
      '11-50': '11-50 employees',
      '51-200': '51-200 employees',
      '201-500': '201-500 employees',
      '501-1000': '501-1000 employees',
      '1000+': '1000+ employees',
    }
    return labels[size] || size
  }

  const getFundingStageLabel = (stage: string) => {
    const labels: Record<string, string> = {
      bootstrapped: 'Bootstrapped',
      seed: 'Seed',
      series_a: 'Series A',
      series_b: 'Series B',
      series_c: 'Series C',
      series_d_plus: 'Series D+',
      public: 'Public',
    }
    return labels[stage] || stage
  }

  // Build SEO data for programmatic templates - must be before any early returns
  const companySeoData = useMemo(() => {
    if (!company) return undefined
    return buildCompanySEOData({
      name: company.name,
      tagline: company.tagline || undefined,
      industry: company.industry || undefined,
      company_size: company.company_size || undefined,
      headquarters_location: company.headquarters_location || undefined,
      founded_year: company.founded_year || undefined,
      remote_work_policy: company.remote_work_policy || undefined,
    })
  }, [company])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-gray-900 mx-auto" />
          <p className="text-[14px] text-gray-500 mt-3">Loading company...</p>
        </div>
      </div>
    )
  }

  if (error || !company) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-5xl mx-auto px-6 py-12">
          <div className="text-center">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-[15px] text-gray-700 mb-1">Company not found</p>
            <Link to="/companies" className="text-[14px] text-gray-900 underline">
              Back to directory
            </Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SEO
        contentData={companySeoData ? { company: companySeoData } : undefined}
        ogImage={company.logo || undefined}
      />
      <Navbar />

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Back link */}
        <Link
          to="/companies"
          className="inline-flex items-center gap-1.5 text-[13px] text-gray-500 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to directory
        </Link>

        {/* Company Header */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <div className="flex items-start gap-5">
            {company.logo ? (
              <img
                src={company.logo}
                alt={company.name}
                className="w-20 h-20 rounded-xl object-cover border border-gray-100"
              />
            ) : (
              <div className="w-20 h-20 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Building2 className="w-8 h-8 text-gray-400" />
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-[24px] font-semibold text-gray-900">{company.name}</h1>
              {company.tagline && (
                <p className="text-[15px] text-gray-600 mt-1">{company.tagline}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-4 text-[13px] text-gray-500">
                {company.headquarters_location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" />
                    {company.headquarters_location}
                  </span>
                )}
                {company.company_size && (
                  <span className="flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    {getCompanySizeLabel(company.company_size)}
                  </span>
                )}
                {company.industry && (
                  <span className="flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4" />
                    {company.industry.name}
                  </span>
                )}
                {company.founded_year && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    Founded {company.founded_year}
                  </span>
                )}
              </div>
              {/* Links */}
              <div className="mt-4 flex gap-3">
                {company.website_url && (
                  <a
                    href={company.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <Globe className="w-4 h-4" />
                    Website
                  </a>
                )}
                {company.linkedin_url && (
                  <a
                    href={company.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <Linkedin className="w-4 h-4" />
                    LinkedIn
                  </a>
                )}
              </div>
            </div>
            {/* Funding Stage Badge */}
            {company.funding_stage && (
              <span className="px-3 py-1.5 text-[12px] font-medium bg-green-50 text-green-700 rounded-full">
                {getFundingStageLabel(company.funding_stage)}
              </span>
            )}
          </div>
        </div>

        {/* About */}
        {company.description && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
            <h2 className="text-[16px] font-semibold text-gray-900 mb-3">About</h2>
            <p className="text-[14px] text-gray-600 whitespace-pre-line">{company.description}</p>
          </div>
        )}

        {/* Culture & Values */}
        {(company.culture_description || (company.values && company.values.length > 0)) && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
            <h2 className="text-[16px] font-semibold text-gray-900 mb-4">Culture & Values</h2>
            {company.culture_description && (
              <p className="text-[14px] text-gray-600 whitespace-pre-line mb-4">
                {company.culture_description}
              </p>
            )}
            {company.values && company.values.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {company.values.map((value, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-700 rounded-full text-[13px]"
                  >
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    {value}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Benefits */}
        {company.benefits && company.benefits.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
            <h2 className="text-[16px] font-semibold text-gray-900 mb-4">Benefits & Perks</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {company.benefits.map((category, index) => (
                <div key={index}>
                  <h3 className="text-[14px] font-medium text-gray-800 mb-2">{category.category}</h3>
                  <ul className="space-y-1">
                    {category.items.map((item, itemIndex) => (
                      <li
                        key={itemIndex}
                        className="text-[13px] text-gray-600 flex items-start gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tech Stack */}
        {company.tech_stack && company.tech_stack.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
            <h2 className="text-[16px] font-semibold text-gray-900 mb-3">Tech Stack</h2>
            <div className="flex flex-wrap gap-2">
              {company.tech_stack.map((tech, index) => (
                <span
                  key={index}
                  className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-[13px]"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Remote Work Policy */}
        {company.remote_work_policy && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
            <h2 className="text-[16px] font-semibold text-gray-900 mb-3">Remote Work Policy</h2>
            <p className="text-[14px] text-gray-600 whitespace-pre-line">
              {company.remote_work_policy}
            </p>
          </div>
        )}

        {/* Interview Process */}
        {company.interview_process && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
            <h2 className="text-[16px] font-semibold text-gray-900 mb-3">Interview Process</h2>
            <p className="text-[14px] text-gray-600 whitespace-pre-line">
              {company.interview_process}
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
