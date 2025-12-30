import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { cmsCaseStudies } from '@/services/cms'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { UserRole, ContentStatus, ContentStatusLabels } from '@/types'
import type { CMSCaseStudyListItem } from '@/types'
import {
  Plus,
  Search,
  Trash2,
  Pencil,
  Eye,
  Star,
  Building2,
  AlertCircle,
} from 'lucide-react'

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: ContentStatus.DRAFT, label: 'Draft' },
  { value: ContentStatus.PUBLISHED, label: 'Published' },
  { value: ContentStatus.ARCHIVED, label: 'Archived' },
]

export default function CMSCaseStudiesPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [industryFilter, setIndustryFilter] = useState('')
  const [featuredFilter, setFeaturedFilter] = useState<boolean | undefined>()

  const { data: caseStudies = [], isLoading, error } = useQuery({
    queryKey: ['cms', 'case-studies', { status: statusFilter, industry: industryFilter }],
    queryFn: () => cmsCaseStudies.list({
      status: statusFilter || undefined,
      industry: industryFilter || undefined,
    }),
  })

  const { data: industries = [] } = useQuery({
    queryKey: ['cms', 'case-studies', 'industries'],
    queryFn: cmsCaseStudies.getIndustries,
  })

  const deleteMutation = useMutation({
    mutationFn: cmsCaseStudies.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms', 'case-studies'] })
      showToast('Case study deleted successfully', 'success')
    },
    onError: () => {
      showToast('Failed to delete case study', 'error')
    },
  })

  const handleDelete = (study: CMSCaseStudyListItem) => {
    if (window.confirm(`Are you sure you want to delete "${study.title}"?`)) {
      deleteMutation.mutate(study.id)
    }
  }

  // Filter case studies
  const filteredStudies = useMemo(() => {
    let filtered = caseStudies

    if (search) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter(
        (study) =>
          study.title.toLowerCase().includes(searchLower) ||
          study.client_name.toLowerCase().includes(searchLower)
      )
    }

    if (featuredFilter !== undefined) {
      filtered = filtered.filter((study) => study.is_featured === featuredFilter)
    }

    return filtered
  }, [caseStudies, search, featuredFilter])

  const getStatusBadge = (status: ContentStatus) => {
    const styles: Record<ContentStatus, string> = {
      [ContentStatus.DRAFT]: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
      [ContentStatus.PUBLISHED]: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
      [ContentStatus.ARCHIVED]: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
    }
    return (
      <span className={`inline-flex px-2 py-0.5 text-[11px] font-medium rounded ${styles[status]}`}>
        {ContentStatusLabels[status]}
      </span>
    )
  }

  // Access check
  if (!user || ![UserRole.ADMIN, UserRole.RECRUITER].includes(user.role)) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-4" />
        <p className="text-[15px] text-gray-700 dark:text-gray-300 mb-2">Access Denied</p>
        <p className="text-[13px] text-gray-500 dark:text-gray-400">
          You do not have permission to manage case studies.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-semibold text-gray-900 dark:text-gray-100">Case Studies</h1>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">
            Showcase successful hiring stories and client testimonials
          </p>
        </div>
        <Link
          to="/dashboard/cms/case-studies/new"
          className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-gray-900 dark:bg-gray-100 dark:text-gray-900 rounded-md hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Case Study
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search case studies..."
            className="w-full pl-10 pr-4 py-2 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
          />
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Industry Filter */}
        <select
          value={industryFilter}
          onChange={(e) => setIndustryFilter(e.target.value)}
          className="px-3 py-2 text-[13px] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
        >
          <option value="">All Industries</option>
          {industries.map((ind) => (
            <option key={ind.name} value={ind.name}>
              {ind.name} ({ind.count})
            </option>
          ))}
        </select>

        {/* Featured Filter */}
        <button
          onClick={() => setFeaturedFilter(featuredFilter === true ? undefined : true)}
          className={`flex items-center gap-1.5 px-3 py-2 text-[13px] border rounded-md transition-colors ${
            featuredFilter === true
              ? 'border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400'
              : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          <Star className="w-4 h-4" />
          Featured
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <p className="text-[14px] text-gray-500 dark:text-gray-400">Loading case studies...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-12">
          <p className="text-[14px] text-red-500">Failed to load case studies</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredStudies.length === 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
          <Building2 className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-[15px] text-gray-700 dark:text-gray-300 mb-1">No case studies found</p>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-4">
            {search || statusFilter || industryFilter || featuredFilter
              ? 'Try adjusting your filters'
              : 'Create your first case study'}
          </p>
          {!search && !statusFilter && !industryFilter && !featuredFilter && (
            <Link
              to="/dashboard/cms/case-studies/new"
              className="inline-flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-gray-900 dark:bg-gray-100 dark:text-gray-900 rounded-md hover:bg-gray-800 dark:hover:bg-gray-200"
            >
              <Plus className="w-4 h-4" />
              Create Case Study
            </Link>
          )}
        </div>
      )}

      {/* Case Studies Grid */}
      {!isLoading && !error && filteredStudies.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStudies.map((study) => (
            <div
              key={study.id}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-md dark:hover:shadow-gray-900/40 transition-shadow"
            >
              {/* Featured Image */}
              {study.featured_image ? (
                <div className="aspect-video bg-gray-100 dark:bg-gray-800">
                  <img
                    src={study.featured_image}
                    alt={study.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="aspect-video bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <Building2 className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                </div>
              )}

              <div className="p-4">
                {/* Status & Featured */}
                <div className="flex items-center gap-2 mb-2">
                  {study.industry && (
                    <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded">
                      {study.industry}
                    </span>
                  )}
                  {study.is_featured && (
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  )}
                  <div className="ml-auto">
                    {getStatusBadge(study.status)}
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-[14px] font-medium text-gray-900 dark:text-gray-100 mb-1 line-clamp-2">
                  {study.title}
                </h3>

                {/* Client */}
                <div className="flex items-center gap-2 mb-2">
                  {study.client_logo && (
                    <img
                      src={study.client_logo}
                      alt={study.client_name}
                      className="w-5 h-5 object-contain"
                    />
                  )}
                  <span className="text-[12px] text-gray-500 dark:text-gray-400">{study.client_name}</span>
                </div>

                {/* Excerpt */}
                {study.excerpt && (
                  <p className="text-[12px] text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">
                    {study.excerpt}
                  </p>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <Link
                    to={`/dashboard/cms/case-studies/${study.id}`}
                    className="flex items-center gap-1 px-3 py-1.5 text-[12px] text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit
                  </Link>
                  <Link
                    to={`/case-studies/${study.slug}`}
                    target="_blank"
                    className="flex items-center gap-1 px-3 py-1.5 text-[12px] text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    View
                  </Link>
                  <button
                    onClick={() => handleDelete(study)}
                    disabled={deleteMutation.isPending}
                    className="flex items-center gap-1 px-3 py-1.5 text-[12px] text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors ml-auto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
