import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAllCompanies } from '@/hooks/useCompanies'
import { useAuth } from '@/contexts/AuthContext'
import { UserRole } from '@/types'
import type { AdminCompanyListItem } from '@/types'
import {
  Building2,
  Search,
  MoreVertical,
  Eye,
  Edit,
  ExternalLink,
  AlertCircle,
  Briefcase,
  Plus,
} from 'lucide-react'

const getStatusBadge = (isPublished: boolean) => {
  if (isPublished) {
    return { className: 'badge-success', label: 'Published' }
  }
  return { className: 'bg-gray-100 text-gray-500', label: 'Draft' }
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function AdminCompaniesPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [publishedFilter, setPublishedFilter] = useState<boolean | undefined>(undefined)
  const [openMenu, setOpenMenu] = useState<string | null>(null)

  const { companies, isLoading, error, refetch } = useAllCompanies({
    search: search || undefined,
    is_published: publishedFilter,
  })

  // Check if user has admin/recruiter access
  if (!user || ![UserRole.ADMIN, UserRole.RECRUITER].includes(user.role)) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-4" />
        <p className="text-[15px] text-gray-700 mb-2">Access Denied</p>
        <p className="text-[13px] text-gray-500">
          You do not have permission to view this page.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-semibold text-gray-900">All Companies</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">
            View and manage all companies on the platform
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search companies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-[13px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300"
          />
        </div>

        {/* Status Filter */}
        <select
          value={publishedFilter === undefined ? '' : publishedFilter.toString()}
          onChange={(e) => {
            const val = e.target.value
            setPublishedFilter(val === '' ? undefined : val === 'true')
          }}
          className="px-3 py-2 text-[13px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300"
        >
          <option value="">All Statuses</option>
          <option value="true">Published</option>
          <option value="false">Draft</option>
        </select>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <p className="text-[14px] text-gray-500">Loading companies...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-12">
          <p className="text-[14px] text-red-500">{error}</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && companies.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-[15px] text-gray-700 mb-1">No companies found</p>
          <p className="text-[13px] text-gray-500">
            {search ? 'No companies match your search' : 'No companies have been created yet'}
          </p>
        </div>
      )}

      {/* Companies List */}
      {!isLoading && !error && companies.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                  Industry
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                  Size
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                  Jobs
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {companies.map((company: AdminCompanyListItem) => {
                const badge = getStatusBadge(company.is_published)
                return (
                  <tr key={company.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {company.logo ? (
                          <img
                            src={company.logo}
                            alt={company.name}
                            className="w-8 h-8 rounded object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center">
                            <Building2 className="w-4 h-4 text-gray-400" />
                          </div>
                        )}
                        <div>
                          <Link
                            to={`/dashboard/admin/companies/${company.id}`}
                            className="text-[14px] font-medium text-gray-900 hover:text-gray-700"
                          >
                            {company.name}
                          </Link>
                          {company.tagline && (
                            <p className="text-[12px] text-gray-500 mt-0.5 truncate max-w-xs">
                              {company.tagline}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-gray-600">
                      {company.industry?.name || '-'}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-gray-600">
                      {company.company_size ? company.company_size.replace('_', '-') : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/dashboard/admin/jobs?company=${company.id}`}
                        className="flex flex-col gap-1 items-start"
                      >
                        {company.jobs_published > 0 && (
                          <span className="inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded badge-success">
                            {company.jobs_published} Published
                          </span>
                        )}
                        {company.jobs_draft > 0 && (
                          <span className="inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded bg-gray-100 text-gray-600">
                            {company.jobs_draft} Draft
                          </span>
                        )}
                        {company.jobs_closed > 0 && (
                          <span className="inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded badge-warning">
                            {company.jobs_closed} Closed
                          </span>
                        )}
                        {company.jobs_filled > 0 && (
                          <span className="inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded badge-primary">
                            {company.jobs_filled} Filled
                          </span>
                        )}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 text-[11px] font-medium rounded ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-gray-600">
                      {formatDate(company.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="relative inline-block">
                        <button
                          onClick={() =>
                            setOpenMenu(openMenu === company.id ? null : company.id)
                          }
                          className="p-1 text-gray-400 hover:text-gray-600 rounded"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {openMenu === company.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setOpenMenu(null)}
                            />
                            <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-20">
                              <div className="py-1">
                                {company.is_published && (
                                  <Link
                                    to={`/companies/${company.slug}`}
                                    className="flex items-center gap-2 px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-50"
                                  >
                                    <Eye className="w-4 h-4" />
                                    View Public Profile
                                  </Link>
                                )}
                                <Link
                                  to={`/dashboard/admin/companies/${company.id}`}
                                  className="flex items-center gap-2 px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-50"
                                >
                                  <Edit className="w-4 h-4" />
                                  Edit Company
                                </Link>
                                <Link
                                  to={`/dashboard/admin/jobs?company=${company.id}`}
                                  className="flex items-center gap-2 px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-50"
                                >
                                  <Briefcase className="w-4 h-4" />
                                  View Jobs
                                </Link>
                                <Link
                                  to={`/dashboard/admin/jobs/new?company=${company.id}`}
                                  className="flex items-center gap-2 px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-50"
                                >
                                  <Plus className="w-4 h-4" />
                                  Create Job
                                </Link>
                                {company.website_url && (
                                  <a
                                    href={company.website_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-50"
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                    Visit Website
                                  </a>
                                )}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
