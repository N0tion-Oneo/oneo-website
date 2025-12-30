/**
 * CompanyDetailDrawer - Drawer for viewing company details on admin companies page
 */

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
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
  CreditCard,
  CheckSquare,
} from 'lucide-react'
import { FocusMode } from '@/components/service'
import { DrawerWithPanels, type PanelOption } from '@/components/common'
import {
  JobsPanel,
  ContactsPanel,
  TasksPanel,
  TimelinePanel,
} from '@/components/service/panels'
import { useCompanyById, useTasks } from '@/hooks'
import type { AssignedUser } from '@/types'
import { AssignedSelect } from '@/components/forms'
import { SubscriptionDrawer } from '@/components/subscriptions'
import api from '@/services/api'

// =============================================================================
// Types
// =============================================================================

type PanelType = 'overview' | 'jobs' | 'contacts' | 'billing' | 'tasks' | 'timeline'

// =============================================================================
// Helper Functions
// =============================================================================

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
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

// =============================================================================
// Main Component
// =============================================================================

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
  const { company, isLoading, refetch } = useCompanyById(companyId)
  const [activePanel, setActivePanel] = useState<PanelType>('overview')
  const [showSubscriptionDrawer, setShowSubscriptionDrawer] = useState(false)
  const [showServiceMode, setShowServiceMode] = useState(false)

  // Tasks hook
  const { tasks, refetch: refetchTasks } = useTasks(
    companyId ? { entity_type: 'company', entity_id: companyId } : undefined
  )

  // Reset panel when drawer opens
  useEffect(() => {
    setActivePanel('overview')
  }, [companyId])

  const handleAssignedChange = async (assignedTo: AssignedUser[]) => {
    try {
      await api.patch(`/companies/${companyId}/detail/`, {
        assigned_to_ids: assignedTo.map((u) => u.id),
      })
      refetch()
      onRefresh?.()
    } catch (err) {
      console.error('Failed to update assigned:', err)
    }
  }

  const handleRefresh = () => {
    refetch()
    refetchTasks()
    onRefresh?.()
  }

  // Build available panels
  const buildAvailablePanels = (): PanelOption[] => {
    return [
      { type: 'overview', label: 'Company Overview', icon: <Building2 className="w-4 h-4" /> },
      { type: 'jobs', label: 'Jobs', icon: <Briefcase className="w-4 h-4" /> },
      { type: 'contacts', label: 'Contacts', icon: <Users className="w-4 h-4" /> },
      { type: 'billing', label: 'Billing', icon: <FileText className="w-4 h-4" /> },
      { type: 'tasks', label: 'Tasks', icon: <CheckSquare className="w-4 h-4" /> },
      { type: 'timeline', label: 'Timeline', icon: <Calendar className="w-4 h-4" /> },
    ]
  }

  // Render panel content
  const renderPanel = (panelType: string) => {
    if (!company) {
      return (
        <div className="flex items-center justify-center h-32">
          <p className="text-[14px] text-gray-500">Company not found</p>
        </div>
      )
    }

    switch (panelType) {
      case 'overview':
        return (
          <div className="h-full overflow-y-auto p-4 space-y-6">
            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2">
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
                    <p className="text-sm text-gray-900">
                      {company.industry?.name || 'Not specified'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Company Size</p>
                    <p className="text-sm text-gray-900">
                      {getCompanySizeLabel(company.company_size)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Founded</p>
                    <p className="text-sm text-gray-900">
                      {company.founded_year || 'Not specified'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Remote Policy</p>
                    <p className="text-sm text-gray-900">
                      {getRemotePolicyLabel(company.remote_work_policy)}
                    </p>
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
                    <p className="text-sm text-gray-900">
                      {company.headquarters_location || 'Not specified'}
                    </p>
                    {company.locations && company.locations.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        +{company.locations.length} other location
                        {company.locations.length !== 1 ? 's' : ''}
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
        )

      case 'jobs':
        return <JobsPanel companyId={companyId} />

      case 'contacts':
        return <ContactsPanel companyId={companyId} />

      case 'billing':
        return (
          <div className="h-full overflow-y-auto p-4 space-y-4">
            {/* Subscription Management Button */}
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
                  <p className="text-xs text-gray-500">
                    View invoices, pricing, and subscription details
                  </p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400" />
            </button>

            {/* Legal Info */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Legal Information</h3>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Legal Name</p>
                    <p className="text-sm text-gray-900">
                      {company.legal_name || 'Not specified'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Registration Number</p>
                    <p className="text-sm text-gray-900">
                      {company.registration_number || 'Not specified'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">VAT Number</p>
                    <p className="text-sm text-gray-900">
                      {company.vat_number || 'Not specified'}
                    </p>
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
                      {[company.billing_city, company.billing_postal_code]
                        .filter(Boolean)
                        .join(', ')}
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
                {company.billing_contact_name ||
                company.billing_contact_email ||
                company.billing_contact_phone ? (
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
                        <a
                          href={`mailto:${company.billing_contact_email}`}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          {company.billing_contact_email}
                        </a>
                      </div>
                    )}
                    {company.billing_contact_phone && (
                      <div>
                        <p className="text-xs text-gray-500">Phone</p>
                        <a
                          href={`tel:${company.billing_contact_phone}`}
                          className="text-sm text-blue-600 hover:underline"
                        >
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
        )

      case 'tasks':
        return (
          <TasksPanel
            entityType="company"
            entityId={companyId}
            tasks={tasks}
            onRefresh={refetchTasks}
          />
        )

      case 'timeline':
        return (
          <TimelinePanel entityType="company" entityId={companyId} onRefresh={handleRefresh} />
        )

      default:
        return null
    }
  }

  // Service type badge for header
  const serviceTypeBadge = company ? getServiceTypeBadge(company.service_type) : null
  const ServiceTypeIcon = serviceTypeBadge?.icon

  const statusBadge = company ? (
    <div className="flex items-center gap-2">
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded ${serviceTypeBadge?.bg} ${serviceTypeBadge?.text}`}
      >
        {ServiceTypeIcon && <ServiceTypeIcon className="w-3 h-3" />}
        {serviceTypeBadge?.label}
      </span>
      <span
        className={`px-2 py-0.5 text-[11px] font-medium rounded ${company.is_published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
      >
        {company.is_published ? 'Published' : 'Draft'}
      </span>
    </div>
  ) : undefined

  // Header with logo
  const headerExtra = company?.logo ? (
    <img src={company.logo} alt={company.name} className="w-8 h-8 rounded-lg object-cover" />
  ) : (
    <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center">
      <Building2 className="w-4 h-4 text-gray-500" />
    </div>
  )

  // Service Mode
  if (showServiceMode && company) {
    return (
      <FocusMode
        mode="entity"
        entityType="company"
        entityId={companyId}
        entityName={company.name}
        onClose={() => {
          setShowServiceMode(false)
          handleRefresh()
        }}
      />
    )
  }

  return (
    <>
      <DrawerWithPanels
        isOpen={!!companyId}
        onClose={onClose}
        title={company?.name || 'Company Details'}
        subtitle={company?.tagline || undefined}
        isLoading={isLoading}
        statusBadge={statusBadge}
        headerExtra={headerExtra}
        focusModeLabel="Service Mode"
        onEnterFocusMode={() => setShowServiceMode(true)}
        availablePanels={buildAvailablePanels()}
        defaultPanel="overview"
        activePanel={activePanel}
        onPanelChange={(panel) => setActivePanel(panel as PanelType)}
        renderPanel={renderPanel}
      />

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
            jobs_total: 0,
            jobs_draft: 0,
            jobs_published: 0,
            jobs_closed: 0,
            jobs_filled: 0,
            jobs: [],
            assigned_to: company.assigned_to || [],
            onboarding_stage: null,
            subscription: null,
            primary_contact: null,
            pricing: null,
          }}
          onClose={() => setShowSubscriptionDrawer(false)}
          onRefresh={handleRefresh}
        />
      )}
    </>
  )
}
