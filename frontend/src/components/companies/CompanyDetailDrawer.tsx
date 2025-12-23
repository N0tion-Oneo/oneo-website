/**
 * CompanyDetailDrawer - Drawer for viewing company details on admin companies page
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  X,
  Building2,
  Briefcase,
  Users,
  FileText,
  Globe,
  Linkedin,
  MapPin,
  Calendar,
  ExternalLink,
  Edit,
  Plus,
  Target,
  Handshake,
  Phone,
  Mail,
  Clock,
  CreditCard,
} from 'lucide-react'
import {
  useCompanyById,
  useAllJobs,
  useCompanyUsers,
} from '@/hooks'
import type { Company, CompanyJobSummary, AssignedUser, AdminCompanyListItem } from '@/types'
import { AssignedSelect } from '@/components/forms'
import { SubscriptionDrawer } from '@/components/subscriptions'
import api from '@/services/api'

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function getJobStatusBadge(status: string) {
  switch (status) {
    case 'published':
      return { bg: 'bg-green-100', text: 'text-green-700', label: 'Live' }
    case 'draft':
      return { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Draft' }
    case 'closed':
      return { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Closed' }
    case 'filled':
      return { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Filled' }
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-500', label: status }
  }
}

function getServiceTypeBadge(serviceType: string | null) {
  switch (serviceType) {
    case 'headhunting':
      return { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Headhunting', icon: Target }
    case 'retained':
      return { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Retained', icon: Handshake }
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-400', label: 'Not Set', icon: null }
  }
}

function getCompanySizeLabel(size: string | null): string {
  if (!size) return 'Not specified'
  return size.replace('_', '-')
}

function getRemotePolicyLabel(policy: string | null): string {
  if (!policy) return 'Not specified'
  const labels: Record<string, string> = {
    remote: 'Fully Remote',
    hybrid: 'Hybrid',
    office: 'Office Only',
  }
  return labels[policy] || policy
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export interface CompanyDetailDrawerProps {
  companyId: string
  onClose: () => void
  onRefresh?: () => void
}

export default function CompanyDetailDrawer({
  companyId,
  onClose,
  onRefresh,
}: CompanyDetailDrawerProps) {
  const { company, isLoading, refetch, updateCompany, isUpdating } = useCompanyById(companyId)
  const { jobs, isLoading: jobsLoading } = useAllJobs({ company: companyId })
  const { users, isLoading: usersLoading } = useCompanyUsers(companyId)

  const [activeSection, setActiveSection] = useState<'overview' | 'jobs' | 'contacts' | 'billing'>('overview')
  const [showSubscriptionDrawer, setShowSubscriptionDrawer] = useState(false)

  const handleAssignedChange = async (assignedTo: AssignedUser[]) => {
    try {
      await api.patch(`/companies/${companyId}/detail/`, {
        assigned_to_ids: assignedTo.map(u => u.id),
      })
      refetch()
      onRefresh?.()
    } catch (err) {
      console.error('Failed to update assigned:', err)
    }
  }

  const sections = [
    { id: 'overview', label: 'Overview', icon: Building2 },
    { id: 'jobs', label: 'Jobs', icon: Briefcase },
    { id: 'contacts', label: 'Contacts', icon: Users },
    { id: 'billing', label: 'Billing', icon: FileText },
  ] as const

  if (isLoading || !company) {
    return (
      <>
        <div className="fixed inset-0 z-[200] bg-black/30" onClick={onClose} />
        <div className="fixed right-0 top-0 bottom-0 z-[201] w-full max-w-2xl bg-white shadow-xl flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full" />
        </div>
      </>
    )
  }

  const serviceTypeBadge = getServiceTypeBadge(company.service_type)
  const ServiceTypeIcon = serviceTypeBadge.icon

  return (
    <>
      <div className="fixed inset-0 z-[200] bg-black/30" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-[201] w-full max-w-2xl bg-white shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {company.logo ? (
                <img
                  src={company.logo}
                  alt={company.name}
                  className="w-10 h-10 rounded-lg object-cover"
                />
              ) : (
                <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-gray-500" />
                </div>
              )}
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{company.name}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded ${serviceTypeBadge.bg} ${serviceTypeBadge.text}`}>
                    {ServiceTypeIcon && <ServiceTypeIcon className="w-3 h-3" />}
                    {serviceTypeBadge.label}
                  </span>
                  <span className={`px-2 py-0.5 text-[11px] font-medium rounded ${company.is_published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {company.is_published ? 'Published' : 'Draft'}
                  </span>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Section Tabs */}
          <div className="flex gap-1 mt-4 -mb-4">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center gap-2 px-4 py-2 text-[13px] font-medium rounded-md transition-colors ${
                  activeSection === section.id
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <section.icon className="w-4 h-4" />
                {section.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Overview Section */}
          {activeSection === 'overview' && (
            <div className="space-y-6">
              {/* Quick Actions */}
              <div className="flex gap-2">
                <Link
                  to={`/dashboard/admin/companies/${company.id}`}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  <Edit className="w-4 h-4" />
                  Edit Company
                </Link>
                {company.is_published && (
                  <Link
                    to={`/companies/${company.slug}`}
                    target="_blank"
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View Public Profile
                  </Link>
                )}
                <Link
                  to={`/dashboard/admin/jobs/new?company=${company.id}`}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800"
                >
                  <Plus className="w-4 h-4" />
                  Create Job
                </Link>
              </div>

              {/* Assigned To */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Assigned To</h3>
                <AssignedSelect
                  selected={company.assigned_to || []}
                  onChange={handleAssignedChange}
                  placeholder="Assign recruiters..."
                />
              </div>

              {/* Basic Info */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Company Info</h3>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                  {company.tagline && (
                    <div>
                      <p className="text-xs text-gray-500">Tagline</p>
                      <p className="text-sm text-gray-900">{company.tagline}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Industry</p>
                      <p className="text-sm text-gray-900">{company.industry?.name || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Company Size</p>
                      <p className="text-sm text-gray-900">{getCompanySizeLabel(company.company_size)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Founded</p>
                      <p className="text-sm text-gray-900">{company.founded_year || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Remote Policy</p>
                      <p className="text-sm text-gray-900">{getRemotePolicyLabel(company.remote_work_policy)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Location */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Location</h3>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-900">{company.headquarters_location || 'Not specified'}</p>
                      {company.locations && company.locations.length > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          +{company.locations.length} other location{company.locations.length !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Links */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Links</h3>
                <div className="space-y-2">
                  {company.website_url && (
                    <a
                      href={company.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <Globe className="w-4 h-4 text-gray-400" />
                      {company.website_url}
                      <ExternalLink className="w-3 h-3 ml-auto text-gray-400" />
                    </a>
                  )}
                  {company.linkedin_url && (
                    <a
                      href={company.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <Linkedin className="w-4 h-4 text-gray-400" />
                      LinkedIn Profile
                      <ExternalLink className="w-3 h-3 ml-auto text-gray-400" />
                    </a>
                  )}
                  {!company.website_url && !company.linkedin_url && (
                    <p className="text-sm text-gray-500">No links added</p>
                  )}
                </div>
              </div>

              {/* Dates */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Timeline</h3>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Calendar className="w-4 h-4" />
                  Created {formatDate(company.created_at)}
                </div>
              </div>
            </div>
          )}

          {/* Jobs Section */}
          {activeSection === 'jobs' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Jobs</h3>
                <Link
                  to={`/dashboard/admin/jobs/new?company=${company.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800"
                >
                  <Plus className="w-4 h-4" />
                  Create Job
                </Link>
              </div>

              {jobsLoading ? (
                <div className="animate-pulse space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-gray-100 rounded-lg" />
                  ))}
                </div>
              ) : jobs.length === 0 ? (
                <div className="text-center py-8">
                  <Briefcase className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No jobs yet</p>
                  <Link
                    to={`/dashboard/admin/jobs/new?company=${company.id}`}
                    className="mt-3 inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
                  >
                    <Plus className="w-4 h-4" />
                    Create first job
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {jobs.map((job) => {
                    const statusBadge = getJobStatusBadge(job.status)
                    return (
                      <Link
                        key={job.id}
                        to={`/dashboard/jobs/${job.id}/applications`}
                        className="block bg-gray-50 border border-gray-200 rounded-lg p-3 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{job.title}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {job.location_display || 'No location'} &middot; {job.applications_count} application{job.applications_count !== 1 ? 's' : ''}
                            </p>
                          </div>
                          <span className={`px-2 py-0.5 text-[11px] font-medium rounded ${statusBadge.bg} ${statusBadge.text}`}>
                            {statusBadge.label}
                          </span>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Contacts Section */}
          {activeSection === 'contacts' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900">Company Users</h3>

              {usersLoading ? (
                <div className="animate-pulse space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-14 bg-gray-100 rounded-lg" />
                  ))}
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No users linked to this company</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className={`bg-gray-50 border rounded-lg p-4 ${
                        user.is_active ? 'border-gray-200' : 'border-orange-200 bg-orange-50/50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {user.user_avatar ? (
                          <img
                            src={user.user_avatar}
                            alt={`${user.user_first_name} ${user.user_last_name}`}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-600">
                              {user.user_first_name?.[0]}{user.user_last_name?.[0]}
                            </span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-900">
                              {user.user_first_name} {user.user_last_name}
                            </p>
                            <span className={`px-2 py-0.5 text-[11px] font-medium rounded ${
                              user.role === 'admin'
                                ? 'bg-purple-100 text-purple-700'
                                : user.role === 'editor'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {user.role === 'admin' ? 'Admin' : user.role === 'editor' ? 'Editor' : 'Viewer'}
                            </span>
                            {user.user_role && (
                              <span className={`px-2 py-0.5 text-[11px] font-medium rounded ${
                                user.user_role === 'admin'
                                  ? 'bg-red-100 text-red-700'
                                  : user.user_role === 'recruiter'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-cyan-100 text-cyan-700'
                              }`}>
                                {user.user_role.charAt(0).toUpperCase() + user.user_role.slice(1)}
                              </span>
                            )}
                            {!user.is_active && (
                              <span className="px-2 py-0.5 text-[11px] font-medium rounded bg-orange-100 text-orange-700">
                                Inactive
                              </span>
                            )}
                          </div>
                          {user.job_title && (
                            <p className="text-xs text-gray-500 mt-0.5">{user.job_title}</p>
                          )}

                          {/* Contact details */}
                          <div className="mt-2 space-y-1">
                            <a
                              href={`mailto:${user.user_email}`}
                              className="flex items-center gap-2 text-xs text-gray-600 hover:text-gray-900"
                            >
                              <Mail className="w-3.5 h-3.5 text-gray-400" />
                              {user.user_email}
                            </a>
                            {user.user_phone && (
                              <a
                                href={`tel:${user.user_phone}`}
                                className="flex items-center gap-2 text-xs text-gray-600 hover:text-gray-900"
                              >
                                <Phone className="w-3.5 h-3.5 text-gray-400" />
                                {user.user_phone}
                              </a>
                            )}
                          </div>

                          {/* Meta info */}
                          <div className="mt-2 flex items-center gap-3 text-[11px] text-gray-400">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Joined {formatDate(user.joined_at)}
                            </span>
                            {user.invited_by_email && (
                              <span>Invited by {user.invited_by_email}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Billing Section */}
          {activeSection === 'billing' && (
            <div className="space-y-6">
              {/* Subscription Management */}
              <div>
                <button
                  onClick={() => setShowSubscriptionDrawer(true)}
                  className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg hover:from-purple-100 hover:to-blue-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <CreditCard className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-900">Manage Subscription</p>
                      <p className="text-xs text-gray-500">View invoices, pricing, and subscription details</p>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              {/* Legal Info */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Legal Information</h3>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Legal Name</p>
                      <p className="text-sm text-gray-900">{company.legal_name || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Registration Number</p>
                      <p className="text-sm text-gray-900">{company.registration_number || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">VAT Number</p>
                      <p className="text-sm text-gray-900">{company.vat_number || 'Not specified'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Billing Address */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Billing Address</h3>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  {company.billing_address ? (
                    <div className="space-y-1">
                      <p className="text-sm text-gray-900">{company.billing_address}</p>
                      <p className="text-sm text-gray-900">
                        {[company.billing_city, company.billing_postal_code].filter(Boolean).join(', ')}
                      </p>
                      {company.billing_country && (
                        <p className="text-sm text-gray-900">{company.billing_country.name}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No billing address specified</p>
                  )}
                </div>
              </div>

              {/* Billing Contact */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Billing Contact</h3>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  {company.billing_contact_name || company.billing_contact_email || company.billing_contact_phone ? (
                    <div className="space-y-2">
                      {company.billing_contact_name && (
                        <div>
                          <p className="text-xs text-gray-500">Name</p>
                          <p className="text-sm text-gray-900">{company.billing_contact_name}</p>
                        </div>
                      )}
                      {company.billing_contact_email && (
                        <div>
                          <p className="text-xs text-gray-500">Email</p>
                          <a href={`mailto:${company.billing_contact_email}`} className="text-sm text-blue-600 hover:underline">
                            {company.billing_contact_email}
                          </a>
                        </div>
                      )}
                      {company.billing_contact_phone && (
                        <div>
                          <p className="text-xs text-gray-500">Phone</p>
                          <a href={`tel:${company.billing_contact_phone}`} className="text-sm text-blue-600 hover:underline">
                            {company.billing_contact_phone}
                          </a>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No billing contact specified</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Subscription Drawer */}
      {showSubscriptionDrawer && company && (
        <SubscriptionDrawer
          company={{
            id: company.id,
            name: company.name,
            slug: company.slug,
            logo: company.logo,
            tagline: company.tagline,
            industry: company.industry,
            company_size: company.company_size,
            headquarters_location: company.headquarters_location,
            is_published: company.is_published,
            is_platform: false,
            service_type: company.service_type || null,
            created_at: company.created_at,
            jobs_total: jobs.length,
            jobs_draft: jobs.filter(j => j.status === 'draft').length,
            jobs_published: jobs.filter(j => j.status === 'published').length,
            jobs_closed: jobs.filter(j => j.status === 'closed').length,
            jobs_filled: jobs.filter(j => j.status === 'filled').length,
            jobs: [],
            assigned_to: company.assigned_to || [],
            onboarding_stage: null,
          }}
          onClose={() => setShowSubscriptionDrawer(false)}
          onRefresh={() => {
            refetch()
            onRefresh?.()
          }}
        />
      )}
    </>
  )
}
