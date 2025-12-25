import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  ColumnDef,
  SortingState,
  RowSelectionState,
  ColumnSizingState,
} from '@tanstack/react-table'
import { useAllCandidates, useCompanyCandidates, useAssignedUpdate, useMyCompany, useCompanyFeatures } from '@/hooks'
import { useAuth } from '@/contexts/AuthContext'
import { UserRole, Seniority, WorkPreference, ProfileVisibility, Currency } from '@/types'
import type { CandidateAdminListItem, ExperienceListItem } from '@/types'
import {
  aggregateSkillsWithProficiency,
  aggregateTechsWithProficiency,
  getProficiencyStyle,
  formatTotalDuration,
} from '@/utils/proficiency'
import CandidateFilterPanel, {
  CandidateFilters,
  defaultFilters,
} from '@/components/candidates/CandidateFilterPanel'
import SavedFiltersDropdown from '@/components/candidates/SavedFiltersDropdown'
import ColumnVisibilityMenu from '@/components/candidates/ColumnVisibilityMenu'
import CandidateBulkActions from '@/components/candidates/CandidateBulkActions'
import CandidateExportMenu from '@/components/candidates/CandidateExportMenu'
import CandidatePreviewPanel from '@/components/candidates/CandidatePreviewPanel'
import CandidateKanbanBoard from '@/components/candidates/CandidateKanbanBoard'
import { AssignedSelect } from '@/components/forms'
import api from '@/services/api'
import type { AssignedUser } from '@/types'
import {
  User,
  Eye,
  Pencil,
  Mail,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  FileText,
  Briefcase,
  GraduationCap,
  MoreVertical,
  LayoutList,
  Columns3,
  Lock,
} from 'lucide-react'

const SENIORITY_OPTIONS = [
  { value: 'intern', label: 'Intern' },
  { value: 'junior', label: 'Junior' },
  { value: 'mid', label: 'Mid-level' },
  { value: 'senior', label: 'Senior' },
  { value: 'lead', label: 'Lead' },
  { value: 'principal', label: 'Principal' },
  { value: 'executive', label: 'Executive / C-Suite' },
]

const WORK_PREFERENCE_OPTIONS = [
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'onsite', label: 'On-site' },
  { value: 'flexible', label: 'Flexible' },
]

const VISIBILITY_OPTIONS = [
  { value: 'public_sanitised', label: 'Public' },
  { value: 'private', label: 'Private' },
]

const PAGE_SIZE_OPTIONS = [20, 30, 50]

type ViewMode = 'table' | 'kanban'

const getSeniorityLabel = (seniority: Seniority | ''): string => {
  return SENIORITY_OPTIONS.find(o => o.value === seniority)?.label || '-'
}

const getWorkPreferenceLabel = (pref: WorkPreference | ''): string => {
  return WORK_PREFERENCE_OPTIONS.find(o => o.value === pref)?.label || '-'
}

const getVisibilityBadge = (visibility: ProfileVisibility) => {
  if (visibility === ProfileVisibility.PUBLIC_SANITISED) {
    return { bg: 'bg-green-100', text: 'text-green-700', label: 'Public' }
  }
  return { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Private' }
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const formatCurrency = (currency: Currency): string => {
  const symbols: Record<Currency, string> = {
    [Currency.ZAR]: 'R',
    [Currency.USD]: '$',
    [Currency.EUR]: '\u20AC',
    [Currency.GBP]: '\u00A3',
  }
  return symbols[currency] || currency
}

const formatSalary = (min: number | null, max: number | null, currency: Currency): string => {
  if (!min && !max) return '-'
  const symbol = formatCurrency(currency)
  const formatNum = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(0)}k` : n.toString()
  if (min && max) return `${symbol}${formatNum(min)} - ${symbol}${formatNum(max)}`
  if (min) return `${symbol}${formatNum(min)}+`
  if (max) return `Up to ${symbol}${formatNum(max)}`
  return '-'
}

const calculateDuration = (startDate: string, endDate: string | null, isCurrent: boolean): string => {
  const start = new Date(startDate)
  const end = isCurrent ? new Date() : endDate ? new Date(endDate) : new Date()
  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
  const years = Math.floor(months / 12)
  const remainingMonths = months % 12
  if (years === 0) return `${remainingMonths}mo`
  if (remainingMonths === 0) return `${years}y`
  return `${years}y ${remainingMonths}mo`
}

// Column helper for type safety
const columnHelper = createColumnHelper<CandidateAdminListItem>()

interface AdminCandidatesPageProps {
  mode?: 'admin' | 'client'
}

export default function AdminCandidatesPage({ mode = 'admin' }: AdminCandidatesPageProps) {
  const { user } = useAuth()
  const isClientMode = mode === 'client'
  const { hasFeature, isLoading: featuresLoading } = useCompanyFeatures()

  // For client mode, fetch company info
  const { company, isLoading: companyLoading } = useMyCompany()

  // Check if client user has access to Talent Directory
  const isClient = user?.role === UserRole.CLIENT
  const hasTalentDirectory = hasFeature('talent-directory')
  const isFeatureLocked = isClient && !hasTalentDirectory && !featuresLoading

  // All useState hooks must be called unconditionally (before any early returns)
  const [filters, setFilters] = useState<CandidateFilters>(defaultFilters)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [showFilters, setShowFilters] = useState(false)
  const [sorting, setSorting] = useState<SortingState>([])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [previewCandidate, setPreviewCandidate] = useState<CandidateAdminListItem | null>(null)
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({})
  const [openActionsMenu, setOpenActionsMenu] = useState<string | null>(null)
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('table')

  // Convert TanStack sorting to API ordering param
  const ordering = useMemo(() => {
    if (sorting.length === 0) return filters.ordering
    const sort = sorting[0]
    // Map column IDs to API field names
    const fieldMap: Record<string, string> = {
      full_name: 'user__first_name',
      created_at: 'created_at',
      profile_completeness: 'profile_completeness',
      years_of_experience: 'years_of_experience',
    }
    const field = fieldMap[sort.id] || sort.id
    return sort.desc ? `-${field}` : field
  }, [sorting, filters.ordering])

  // Conditional data fetching based on mode
  const adminCandidatesResult = useAllCandidates(
    isClientMode
      ? {}
      : {
          search: filters.search || undefined,
          seniority: filters.seniority || undefined,
          work_preference: filters.work_preference || undefined,
          visibility: filters.visibility || undefined,
          industries: filters.industries.length > 0 ? filters.industries : undefined,
          min_completeness: filters.min_completeness,
          min_experience: filters.min_experience,
          max_experience: filters.max_experience,
          min_salary: filters.min_salary,
          max_salary: filters.max_salary,
          salary_currency: filters.salary_currency || undefined,
          notice_period_min: filters.notice_period_min,
          notice_period_max: filters.notice_period_max,
          created_after: filters.created_after || undefined,
          created_before: filters.created_before || undefined,
          willing_to_relocate: filters.willing_to_relocate,
          has_resume: filters.has_resume,
          ordering,
          page,
          page_size: pageSize,
        }
  )

  const clientCandidatesResult = useCompanyCandidates(
    isClientMode
      ? {
          search: filters.search || undefined,
          seniority: filters.seniority || undefined,
          work_preference: filters.work_preference || undefined,
          min_experience: filters.min_experience,
          max_experience: filters.max_experience,
          ordering,
          page,
          page_size: pageSize,
        }
      : {}
  )

  // Select the appropriate data based on mode
  const { candidates, count, hasNext, hasPrevious, isLoading, error, refetch } = isClientMode
    ? clientCandidatesResult
    : adminCandidatesResult

  // Local state for optimistic updates
  const [localCandidates, setLocalCandidates] = useState<CandidateAdminListItem[]>([])

  // Sync local state with fetched data
  useEffect(() => {
    if (candidates) {
      setLocalCandidates(candidates)
    }
  }, [candidates])

  // Sync previewCandidate with candidates array when data changes
  useEffect(() => {
    if (previewCandidate) {
      const updated = localCandidates.find(c => c.id === previewCandidate.id)
      if (updated && JSON.stringify(updated) !== JSON.stringify(previewCandidate)) {
        setPreviewCandidate(updated)
      }
    }
  }, [localCandidates, previewCandidate])

  const totalPages = Math.ceil(count / pageSize)

  const handleFiltersChange = (newFilters: CandidateFilters) => {
    setFilters(newFilters)
    setPage(1)
  }

  const handleClearFilters = () => {
    setFilters(defaultFilters)
    setPage(1)
  }

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.seniority) count++
    if (filters.work_preference) count++
    if (filters.visibility) count++
    if (filters.industries.length > 0) count++
    if (filters.min_completeness !== undefined) count++
    if (filters.min_experience !== undefined) count++
    if (filters.max_experience !== undefined) count++
    if (filters.min_salary !== undefined) count++
    if (filters.max_salary !== undefined) count++
    if (filters.salary_currency) count++
    if (filters.notice_period_min !== undefined) count++
    if (filters.notice_period_max !== undefined) count++
    if (filters.created_after) count++
    if (filters.created_before) count++
    if (filters.willing_to_relocate !== undefined) count++
    if (filters.has_resume !== undefined) count++
    return count
  }, [filters])

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize)
    setPage(1)
  }

  // Hook for optimistic updates with toast notifications
  const { updateAssigned } = useAssignedUpdate<CandidateAdminListItem>()

  // Handler for changing assigned users on a candidate (optimistic)
  const handleAssignedToChange = useCallback((candidateSlug: string, assignedTo: AssignedUser[]) => {
    updateAssigned(
      localCandidates,
      setLocalCandidates,
      candidateSlug,
      'slug',
      'assigned_to',
      assignedTo,
      () => api.patch(`/candidates/${candidateSlug}/`, {
        assigned_to_ids: assignedTo.map(u => u.id),
      })
    )
  }, [localCandidates, updateAssigned])

  // Define columns with TanStack Table
  const columns = useMemo<ColumnDef<CandidateAdminListItem, any>[]>(
    () => {
      const baseColumns: ColumnDef<CandidateAdminListItem, any>[] = [
        // Selection checkbox
        {
          id: 'select',
          size: 40,
          enableResizing: false,
          header: ({ table }) => (
            <input
              type="checkbox"
              checked={table.getIsAllPageRowsSelected()}
              onChange={table.getToggleAllPageRowsSelectedHandler()}
              className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500"
            />
          ),
          cell: ({ row }) => (
            <div onClick={(e) => e.stopPropagation()}>
              <input
                type="checkbox"
                checked={row.getIsSelected()}
                onChange={row.getToggleSelectedHandler()}
                className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500"
              />
            </div>
          ),
        },
      ]

      // Admin-only: Assigned column
      if (!isClientMode) {
        baseColumns.push(
          columnHelper.accessor('assigned_to', {
            header: 'Assigned',
            size: 160,
            cell: ({ row }) => {
              const candidate = row.original
              const assignedUsers = candidate.assigned_to || []
              return (
                <div onClick={(e) => e.stopPropagation()}>
                  <AssignedSelect
                    selected={assignedUsers}
                    onChange={(newAssigned) => handleAssignedToChange(candidate.slug, newAssigned)}
                    compact
                    placeholder="Assign"
                  />
                </div>
              )
            },
          })
        )
      }

      // Candidate info (all modes)
      baseColumns.push(
        columnHelper.accessor('full_name', {
          header: 'Candidate',
          size: 220,
          enableSorting: true,
          cell: ({ row }) => {
            const candidate = row.original
            return (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-[11px] font-medium text-gray-600">
                    {candidate.initials || '--'}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-gray-900 truncate">
                    {candidate.full_name || 'No name'}
                  </p>
                  <p className="text-[11px] text-gray-500 truncate">
                    {candidate.email}
                  </p>
                </div>
              </div>
            )
          },
        }),
        columnHelper.accessor('phone', {
        header: 'Phone',
        size: 120,
        cell: ({ getValue }) => (
          <span className="text-[12px] text-gray-600">{getValue() || '-'}</span>
        ),
      }),
      columnHelper.accessor('professional_title', {
        header: 'Title',
        size: 180,
        cell: ({ getValue }) => (
          <span className="text-[12px] text-gray-900 truncate block max-w-[160px]">
            {getValue() || '-'}
          </span>
        ),
      }),
      columnHelper.accessor('headline', {
        header: 'Headline',
        size: 200,
        cell: ({ getValue }) => (
          <span className="text-[12px] text-gray-600 truncate block max-w-[180px]" title={getValue()}>
            {getValue() || '-'}
          </span>
        ),
      }),
      columnHelper.accessor('seniority', {
        header: 'Seniority',
        size: 100,
        cell: ({ getValue }) => (
          <span className="text-[12px] text-gray-600">{getSeniorityLabel(getValue())}</span>
        ),
      }),
      columnHelper.accessor('years_of_experience', {
        header: 'Experience',
        size: 120,
        enableSorting: true,
        cell: ({ getValue }) => (
          <span className="text-[12px] text-gray-600">
            {getValue() || '-'}
          </span>
        ),
      }),
      columnHelper.accessor('location', {
        header: 'Location',
        size: 150,
        cell: ({ row }) => {
          const { city, country, location } = row.original
          const display = location || [city, country].filter(Boolean).join(', ') || '-'
          return (
            <span className="text-[12px] text-gray-600 truncate block max-w-[130px]" title={display}>
              {display}
            </span>
          )
        },
      }),
      columnHelper.accessor('work_preference', {
        header: 'Work Pref',
        size: 100,
        cell: ({ getValue }) => (
          <span className="text-[12px] text-gray-600">{getWorkPreferenceLabel(getValue())}</span>
        ),
      }),
      columnHelper.accessor('willing_to_relocate', {
        header: 'Relocate',
        size: 80,
        cell: ({ getValue }) => (
          <span className={`text-[11px] ${getValue() ? 'text-green-600' : 'text-gray-400'}`}>
            {getValue() ? 'Yes' : 'No'}
          </span>
        ),
      }),
      columnHelper.accessor('preferred_locations', {
        header: 'Preferred Locations',
        size: 150,
        cell: ({ getValue }) => {
          const locs = getValue() || []
          return (
            <span className="text-[12px] text-gray-600 truncate block max-w-[130px]" title={locs.join(', ')}>
              {locs.length > 0 ? locs.join(', ') : '-'}
            </span>
          )
        },
      }),
      columnHelper.accessor(
        row => formatSalary(row.salary_expectation_min, row.salary_expectation_max, row.salary_currency),
        {
          id: 'salary',
          header: 'Salary Exp.',
          size: 130,
          cell: ({ getValue }) => (
            <span className="text-[12px] text-gray-600">{getValue()}</span>
          ),
        }
      ),
      columnHelper.accessor('notice_period_days', {
        header: 'Notice',
        size: 80,
        cell: ({ getValue }) => (
          <span className="text-[12px] text-gray-600">
            {getValue() !== null ? `${getValue()}d` : '-'}
          </span>
        ),
      }),
      columnHelper.accessor('has_resume', {
        header: 'Resume',
        size: 70,
        cell: ({ getValue }) => (
          getValue() ? (
            <FileText className="w-4 h-4 text-green-600" />
          ) : (
            <span className="text-[11px] text-gray-400">-</span>
          )
        ),
      }),
      columnHelper.accessor('industries', {
        header: 'Industries',
        size: 180,
        cell: ({ getValue }) => {
          const industries = getValue() || []
          if (industries.length === 0) return <span className="text-[11px] text-gray-400">-</span>
          return (
            <div className="flex flex-wrap gap-1 max-w-[160px]">
              {industries.slice(0, 2).map((ind: { id: number; name: string }) => (
                <span key={ind.id} className="px-1.5 py-0.5 text-[10px] bg-blue-50 text-blue-600 rounded">
                  {ind.name}
                </span>
              ))}
              {industries.length > 2 && (
                <span className="text-[10px] text-gray-500">+{industries.length - 2}</span>
              )}
            </div>
          )
        },
      }),
      // Experience Column Group
      columnHelper.group({
        id: 'experience',
        header: () => (
          <span className="text-[11px] font-semibold text-gray-700 uppercase tracking-wider">
            Experience
          </span>
        ),
        columns: [
          columnHelper.accessor('experiences', {
            id: 'roles',
            header: 'Roles',
            size: 280,
            cell: ({ getValue }) => {
              const experiences = getValue() || []
              if (experiences.length === 0) return <span className="text-[11px] text-gray-400">-</span>
              return (
                <div className="py-0.5 space-y-1.5 max-h-[120px] overflow-y-auto">
                  {experiences.map((exp: ExperienceListItem) => {
                    const duration = calculateDuration(exp.start_date, exp.end_date, exp.is_current)
                    return (
                      <div key={exp.id} className="flex items-start gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-1.5 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-medium text-gray-900 truncate">
                              {exp.job_title}
                            </span>
                            {exp.is_current && (
                              <span className="px-1 py-0.5 text-[8px] font-medium bg-green-100 text-green-700 rounded flex-shrink-0">
                                Current
                              </span>
                            )}
                            <span className="text-[10px] text-gray-400 flex-shrink-0">({duration})</span>
                          </div>
                          <p className="text-[10px] text-gray-500 truncate">{exp.company_name}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            },
          }),
          columnHelper.accessor(
            row => {
              const experiences = row.experiences || []
              if (experiences.length === 0) return null
              const totalMonths = experiences.reduce((acc: number, exp: ExperienceListItem) => {
                const start = new Date(exp.start_date)
                const end = exp.is_current ? new Date() : exp.end_date ? new Date(exp.end_date) : new Date()
                return acc + ((end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()))
              }, 0)
              return { count: experiences.length, totalMonths }
            },
            {
              id: 'experience_duration',
              header: 'Duration',
              size: 90,
              cell: ({ getValue }) => {
                const data = getValue()
                if (!data) return <span className="text-[11px] text-gray-400">-</span>
                const years = Math.floor(data.totalMonths / 12)
                const months = data.totalMonths % 12
                const duration = years > 0
                  ? `${years}y${months > 0 ? ` ${months}mo` : ''}`
                  : `${months}mo`
                return (
                  <div className="text-center">
                    <p className="text-[12px] font-medium text-gray-900">{duration}</p>
                    {data.count > 1 && (
                      <p className="text-[10px] text-gray-500">{data.count} roles</p>
                    )}
                  </div>
                )
              },
            }
          ),
          columnHelper.accessor(
            row => aggregateTechsWithProficiency(row.experiences || []),
            {
              id: 'exp_technologies',
              header: 'Technologies',
              size: 400,
              cell: ({ getValue }) => {
                const techs = getValue()
                if (techs.length === 0) return <span className="text-[11px] text-gray-400">-</span>
                return (
                  <div className="flex flex-wrap gap-1">
                    {techs.map(tech => (
                      <span
                        key={tech.id}
                        className={`group/tooltip relative px-1.5 py-0.5 text-[10px] rounded cursor-default ${getProficiencyStyle(tech.totalMonths, 'tech')}`}
                      >
                        {tech.name}
                        <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-[10px] text-white bg-gray-900 rounded shadow-lg whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100 transition-opacity z-[9999]">
                          {tech.count} role{tech.count > 1 ? 's' : ''} • {formatTotalDuration(tech.totalMonths)} total
                        </span>
                      </span>
                    ))}
                  </div>
                )
              },
            }
          ),
          columnHelper.accessor(
            row => aggregateSkillsWithProficiency(row.experiences || []),
            {
              id: 'exp_skills',
              header: 'Skills',
              size: 400,
              cell: ({ getValue }) => {
                const skills = getValue()
                if (skills.length === 0) return <span className="text-[11px] text-gray-400">-</span>
                return (
                  <div className="flex flex-wrap gap-1">
                    {skills.map(skill => (
                      <span
                        key={skill.id}
                        className={`group/tooltip relative px-1.5 py-0.5 text-[10px] rounded cursor-default ${getProficiencyStyle(skill.totalMonths, 'skill')}`}
                      >
                        {skill.name}
                        <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-[10px] text-white bg-gray-900 rounded shadow-lg whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100 transition-opacity z-[9999]">
                          {skill.count} role{skill.count > 1 ? 's' : ''} • {formatTotalDuration(skill.totalMonths)} total
                        </span>
                      </span>
                    ))}
                  </div>
                )
              },
            }
          ),
        ],
      }),
      columnHelper.accessor('education', {
        header: 'Education',
        size: 280,
        cell: ({ getValue }) => {
          const education = getValue() || []
          if (education.length === 0) return <span className="text-[11px] text-gray-400">-</span>
          const latest = education[0]
          const display = latest.field_of_study
            ? `${latest.degree} in ${latest.field_of_study}`
            : latest.degree

          return (
            <div className="py-1">
              <div className="flex items-start gap-2">
                <div className="w-7 h-7 rounded bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <GraduationCap className="w-3.5 h-3.5 text-gray-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-medium text-gray-900 truncate" title={display}>
                      {display}
                    </span>
                    {latest.is_current && (
                      <span className="px-1.5 py-0.5 text-[9px] font-medium bg-green-100 text-green-700 rounded flex-shrink-0">
                        Current
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                    <span className="truncate">{latest.institution}</span>
                    {latest.grade && (
                      <>
                        <span className="text-gray-300">·</span>
                        <span className="flex-shrink-0">{latest.grade}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              {education.length > 1 && (
                <div className="mt-1 ml-9 text-[10px] text-gray-500">
                  +{education.length - 1} more
                </div>
              )}
            </div>
          )
        },
      }),
      columnHelper.accessor('profile_completeness', {
        header: 'Profile',
        size: 100,
        enableSorting: true,
        cell: ({ getValue }) => {
          const completeness = getValue()
          return (
            <div className="flex items-center gap-2">
              <div className="w-10 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    completeness >= 70
                      ? 'bg-green-500'
                      : completeness >= 40
                      ? 'bg-yellow-500'
                      : 'bg-red-400'
                  }`}
                  style={{ width: `${completeness}%` }}
                />
              </div>
              <span className="text-[11px] text-gray-500 w-7">{completeness}%</span>
            </div>
          )
        },
      }),
      columnHelper.accessor('created_at', {
        header: 'Created',
        size: 100,
        enableSorting: true,
        cell: ({ getValue }) => (
          <span className="text-[11px] text-gray-500">{formatDate(getValue())}</span>
        ),
      }),
      columnHelper.accessor('updated_at', {
        header: 'Updated',
        size: 100,
        cell: ({ getValue }) => (
          <span className="text-[11px] text-gray-500">{formatDate(getValue())}</span>
        ),
      }),
      // PINNED RIGHT: Actions
      columnHelper.display({
        id: 'actions',
        header: '',
        size: 50,
        enableResizing: false,
        cell: ({ row }) => {
          const candidate = row.original
          return (
            <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={(e) => {
                  if (openActionsMenu === candidate.id) {
                    setOpenActionsMenu(null)
                    setMenuPosition(null)
                  } else {
                    const rect = e.currentTarget.getBoundingClientRect()
                    setMenuPosition({ top: rect.bottom + 4, left: rect.right - 192 })
                    setOpenActionsMenu(candidate.id)
                  }
                }}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {openActionsMenu === candidate.id && menuPosition && createPortal(
                <>
                  <div
                    className="fixed inset-0 z-[9998]"
                    onClick={() => {
                      setOpenActionsMenu(null)
                      setMenuPosition(null)
                    }}
                  />
                  <div
                    className="fixed w-48 bg-white border border-gray-200 rounded-md shadow-lg z-[9999]"
                    style={{ top: menuPosition.top, left: menuPosition.left }}
                  >
                    <div className="py-1">
                      <Link
                        to={`/dashboard/admin/candidates/${candidate.slug}`}
                        className="flex items-center gap-2 px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-50"
                        onClick={() => {
                          setOpenActionsMenu(null)
                          setMenuPosition(null)
                        }}
                      >
                        <Pencil className="w-4 h-4" />
                        Edit
                      </Link>
                      <Link
                        to={`/candidates/${candidate.slug}`}
                        className="flex items-center gap-2 px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-50"
                        onClick={() => {
                          setOpenActionsMenu(null)
                          setMenuPosition(null)
                        }}
                      >
                        <Eye className="w-4 h-4" />
                        View Profile
                      </Link>
                      <a
                        href={`mailto:${candidate.email}`}
                        className="flex items-center gap-2 px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-50"
                        onClick={() => {
                          setOpenActionsMenu(null)
                          setMenuPosition(null)
                        }}
                      >
                        <Mail className="w-4 h-4" />
                        Send Email
                      </a>
                    </div>
                  </div>
                </>,
                document.body
              )}
            </div>
          )
        },
      })
      )

      // Admin-only: Visibility column
      if (!isClientMode) {
        baseColumns.splice(baseColumns.length - 1, 0, // Insert before actions
          columnHelper.accessor('visibility', {
            header: 'Status',
            size: 80,
            cell: ({ getValue }) => {
              const badge = getVisibilityBadge(getValue())
              return (
                <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded ${badge.bg} ${badge.text}`}>
                  {badge.label}
                </span>
              )
            },
          })
        )
      }

      return baseColumns
    },
    [openActionsMenu, menuPosition, isClientMode]
  )

  const table = useReactTable({
    data: localCandidates,
    columns,
    state: {
      sorting,
      rowSelection,
      columnSizing,
    },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onColumnSizingChange: setColumnSizing,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualPagination: true,
    pageCount: totalPages,
    getRowId: (row) => row.id.toString(),
    enableRowSelection: true,
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
  })

  // Get selected candidates
  const selectedCandidates = useMemo(() => {
    return table.getSelectedRowModel().rows.map(row => row.original)
  }, [table.getSelectedRowModel().rows])

  const clearSelection = () => {
    setRowSelection({})
  }

  // Early returns - MUST be after all hooks
  if (!isClientMode && (!user || ![UserRole.ADMIN, UserRole.RECRUITER].includes(user.role))) {
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

  if (isClientMode && companyLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[14px] text-gray-500">Loading...</p>
      </div>
    )
  }

  if (isClientMode && !company) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-[15px] text-gray-700 mb-2">No Company Profile</p>
        <p className="text-[13px] text-gray-500">
          You need to be associated with a company to view candidates.
        </p>
      </div>
    )
  }

  // Show locked state for clients without the Talent Directory feature
  if (isFeatureLocked) {
    return (
      <div className="p-6">
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center max-w-xl mx-auto">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-[18px] font-semibold text-gray-900 mb-2">
            Talent Directory Access Required
          </h2>
          <p className="text-[14px] text-gray-500 max-w-md mx-auto mb-6">
            The Talent Directory feature allows you to browse and discover pre-vetted candidates
            from our talent pool. This feature is included in the Retained service plan.
          </p>
          <p className="text-[13px] text-gray-400">
            Contact your account manager to upgrade your plan and unlock this feature.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-semibold text-gray-900">
            {isClientMode ? 'Candidates' : 'All Candidates'}
          </h1>
          <p className="text-[13px] text-gray-500 mt-0.5">
            {count} candidate{count !== 1 ? 's' : ''} found
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Saved Filters */}
          <SavedFiltersDropdown
            currentFilters={filters}
            onLoadFilter={handleFiltersChange}
          />
          {/* Column Visibility */}
          <ColumnVisibilityMenu table={table} />
          {/* Export */}
          <CandidateExportMenu filters={filters} totalCount={count} />
          {/* View Toggle */}
          <div className="flex border border-gray-200 rounded-md overflow-hidden">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] transition-colors ${
                viewMode === 'table' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50'
              }`}
              title="Table view"
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] border-l border-gray-200 transition-colors ${
                viewMode === 'kanban' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50'
              }`}
              title="Kanban view"
            >
              <Columns3 className="w-4 h-4" />
            </button>
          </div>
          {/* Page Size Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] text-gray-500">Show:</span>
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="px-2 py-1 text-[12px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300"
            >
              {PAGE_SIZE_OPTIONS.map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>
          {/* Toggle Filters */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-1.5 text-[13px] border rounded-md transition-colors ${
              showFilters ? 'border-gray-300 bg-gray-50 text-gray-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-gray-900 text-white text-[11px] px-1.5 py-0.5 rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Filter Sidebar */}
        {showFilters && (
          <div className="w-72 flex-shrink-0">
            <CandidateFilterPanel
              filters={filters}
              onFiltersChange={handleFiltersChange}
              onClearFilters={handleClearFilters}
              activeFilterCount={activeFilterCount}
            />
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Active Filters Count */}
          {activeFilterCount > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[12px] text-gray-500">
                {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} applied
              </span>
              <button
                onClick={handleClearFilters}
                className="text-[12px] text-gray-500 hover:text-gray-700 underline"
              >
                Clear all
              </button>
            </div>
          )}

          {/* Bulk Actions */}
          <CandidateBulkActions
            selectedCandidates={selectedCandidates}
            onClearSelection={clearSelection}
            totalCount={count}
          />

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-12">
              <p className="text-[14px] text-gray-500">Loading candidates...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-12">
              <p className="text-[14px] text-red-500">{error}</p>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && candidates.length === 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
              <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-[15px] text-gray-700 mb-1">No candidates found</p>
              <p className="text-[13px] text-gray-500">
                {activeFilterCount > 0 ? 'Try adjusting your filters' : 'No candidates have registered yet'}
              </p>
              {activeFilterCount > 0 && (
                <button
                  onClick={handleClearFilters}
                  className="mt-4 text-[13px] text-gray-600 hover:text-gray-900 underline"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}

          {/* Kanban View */}
          {!isLoading && !error && localCandidates.length > 0 && viewMode === 'kanban' && (
            <CandidateKanbanBoard
              candidates={localCandidates}
              onStageChange={refetch}
              onCandidateClick={(candidate) => setPreviewCandidate(candidate)}
            />
          )}

          {/* Table View */}
          {!isLoading && !error && localCandidates.length > 0 && viewMode === 'table' && (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-max border-collapse">
                  <thead>
                    {table.getHeaderGroups().map((headerGroup, groupIndex) => (
                      <tr
                        key={headerGroup.id}
                        className={`border-b border-gray-200 ${
                          groupIndex === 0 && table.getHeaderGroups().length > 1
                            ? 'bg-gray-100'
                            : 'bg-gray-50'
                        }`}
                      >
                        {headerGroup.headers.map(header => {
                          const isGroupHeader = header.colSpan > 1
                          const isPinnedLeft = header.id === 'select' || header.id === 'full_name'
                          const isPinnedRight = header.id === 'actions'
                          return (
                            <th
                              key={header.id}
                              colSpan={header.colSpan}
                              className={`px-3 text-left text-[11px] font-medium uppercase tracking-wider whitespace-nowrap relative group ${
                                isGroupHeader
                                  ? 'py-1.5 text-gray-700 bg-gray-100 border-b border-gray-200 text-center'
                                  : 'py-2.5 text-gray-500'
                              } ${isPinnedLeft ? 'sticky z-20 bg-gray-50' : ''} ${isPinnedRight ? 'sticky right-0 z-20 bg-gray-50' : ''}`}
                              style={{
                                width: header.colSpan === 1 ? header.getSize() : undefined,
                                left: header.id === 'select' ? 0 : header.id === 'full_name' ? 40 : undefined,
                              }}
                            >
                              {header.isPlaceholder ? null : (
                                <div
                                  className={`flex items-center gap-1 ${
                                    isGroupHeader ? 'justify-center' : ''
                                  } ${
                                    header.column.getCanSort() ? 'cursor-pointer select-none hover:text-gray-700' : ''
                                  }`}
                                  onClick={header.column.getToggleSortingHandler()}
                                >
                                  {flexRender(header.column.columnDef.header, header.getContext())}
                                  {header.column.getCanSort() && (
                                    <span className="ml-0.5">
                                      {{
                                        asc: <ArrowUp className="w-3 h-3" />,
                                        desc: <ArrowDown className="w-3 h-3" />,
                                      }[header.column.getIsSorted() as string] ?? (
                                        <ArrowUpDown className="w-3 h-3 opacity-40" />
                                      )}
                                    </span>
                                  )}
                                </div>
                              )}
                              {/* Resize handle */}
                              {header.column.getCanResize() && (
                                <div
                                  onMouseDown={header.getResizeHandler()}
                                  onTouchStart={header.getResizeHandler()}
                                  className={`absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none ${
                                    header.column.getIsResizing()
                                      ? 'bg-blue-500'
                                      : 'bg-transparent hover:bg-gray-300'
                                  }`}
                                />
                              )}
                            </th>
                          )
                        })}
                      </tr>
                    ))}
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {table.getRowModel().rows.map(row => (
                      <tr
                        key={row.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => {
                          setOpenActionsMenu(null)
                          setMenuPosition(null)
                          setPreviewCandidate(row.original)
                        }}
                      >
                        {row.getVisibleCells().map(cell => {
                          const colId = cell.column.id
                          const isPinnedLeft = colId === 'select' || colId === 'full_name'
                          const isPinnedRight = colId === 'actions'
                          return (
                            <td
                              key={cell.id}
                              className={`px-3 py-2.5 whitespace-nowrap ${isPinnedLeft ? 'sticky z-10 bg-white' : ''} ${isPinnedRight ? 'sticky right-0 z-[100] bg-white' : ''}`}
                              style={{
                                width: cell.column.getSize(),
                                left: colId === 'select' ? 0 : colId === 'full_name' ? 40 : undefined,
                              }}
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pagination (Table View Only) */}
          {!isLoading && !error && totalPages > 1 && viewMode === 'table' && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-[13px] text-gray-500">
                Page {page} of {totalPages} ({count} total)
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={!hasPrevious}
                  className="flex items-center gap-1 px-3 py-1.5 text-[13px] border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={!hasNext}
                  className="flex items-center gap-1 px-3 py-1.5 text-[13px] border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Preview Panel */}
      <CandidatePreviewPanel
        candidate={previewCandidate}
        onClose={() => setPreviewCandidate(null)}
        onRefresh={refetch}
        mode={mode}
      />
    </div>
  )
}

// Filter Chip Component
function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 text-[12px] bg-gray-100 text-gray-700 rounded-md">
      {label}
      <button onClick={onRemove} className="hover:text-gray-900">
        <X className="w-3 h-3" />
      </button>
    </span>
  )
}
