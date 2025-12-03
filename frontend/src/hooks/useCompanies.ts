import { useState, useEffect, useCallback } from 'react'
import api from '@/services/api'
import type {
  Company,
  AdminCompanyListItem,
  CompanyInput,
  CompanyUser,
  CompanyUserRole,
  CompanyUserUpdate,
  Country,
  City,
} from '@/types'

// ============================================================================
// Companies List Hook (Public Directory)
// ============================================================================

interface UseCompaniesOptions {
  industry?: string
  company_size?: string
  funding_stage?: string
  search?: string
}

interface UseCompaniesReturn {
  companies: Company[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useCompanies(options: UseCompaniesOptions = {}): UseCompaniesReturn {
  const [companies, setCompanies] = useState<Company[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCompanies = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (options.industry) params.append('industry', options.industry)
      if (options.company_size) params.append('company_size', options.company_size)
      if (options.funding_stage) params.append('funding_stage', options.funding_stage)
      if (options.search) params.append('search', options.search)

      const response = await api.get<Company[]>(`/companies/?${params.toString()}`)
      setCompanies(response.data)
    } catch (err) {
      setError('Failed to load companies')
      console.error('Error fetching companies:', err)
    } finally {
      setIsLoading(false)
    }
  }, [options.industry, options.company_size, options.funding_stage, options.search])

  useEffect(() => {
    fetchCompanies()
  }, [fetchCompanies])

  return { companies, isLoading, error, refetch: fetchCompanies }
}

// ============================================================================
// Single Company Hook (Public Profile)
// ============================================================================

interface UseCompanyReturn {
  company: Company | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useCompany(slug: string): UseCompanyReturn {
  const [company, setCompany] = useState<Company | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCompany = useCallback(async () => {
    if (!slug) return

    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get<Company>(`/companies/${slug}/`)
      setCompany(response.data)
    } catch (err) {
      setError('Failed to load company')
      console.error('Error fetching company:', err)
    } finally {
      setIsLoading(false)
    }
  }, [slug])

  useEffect(() => {
    fetchCompany()
  }, [fetchCompany])

  return { company, isLoading, error, refetch: fetchCompany }
}

// ============================================================================
// My Company Hook (for authenticated client users)
// ============================================================================

interface UseMyCompanyReturn {
  company: Company | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  updateCompany: (data: CompanyInput) => Promise<Company>
  isUpdating: boolean
}

export function useMyCompany(): UseMyCompanyReturn {
  const [company, setCompany] = useState<Company | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCompany = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get<Company>('/companies/my/')
      setCompany(response.data)
    } catch (err) {
      // 404 or 403 means user is not associated with any company - not an error state
      const axiosError = err as { response?: { status?: number } }
      if (axiosError.response?.status === 404 || axiosError.response?.status === 403) {
        setCompany(null)
      } else {
        setError('Failed to load company')
        console.error('Error fetching company:', err)
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const updateCompany = useCallback(async (data: CompanyInput): Promise<Company> => {
    setIsUpdating(true)
    setError(null)
    try {
      // Handle file upload separately if logo is a File
      let requestData: CompanyInput | FormData = data

      if (data.logo instanceof File) {
        const formData = new FormData()
        Object.entries(data).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (value instanceof File) {
              formData.append(key, value)
            } else if (Array.isArray(value) || typeof value === 'object') {
              formData.append(key, JSON.stringify(value))
            } else {
              formData.append(key, String(value))
            }
          }
        })
        requestData = formData
      }

      const response = await api.patch<Company>('/companies/my/update/', requestData, {
        headers: data.logo instanceof File ? { 'Content-Type': 'multipart/form-data' } : undefined,
      })
      setCompany(response.data)
      return response.data
    } catch (err) {
      setError('Failed to update company')
      console.error('Error updating company:', err)
      throw err
    } finally {
      setIsUpdating(false)
    }
  }, [])

  useEffect(() => {
    fetchCompany()
  }, [fetchCompany])

  return { company, isLoading, error, refetch: fetchCompany, updateCompany, isUpdating }
}

// ============================================================================
// Company Users Hook (Team Members)
// ============================================================================

interface UseCompanyUsersReturn {
  users: CompanyUser[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useCompanyUsers(companyId?: string): UseCompanyUsersReturn {
  const [users, setUsers] = useState<CompanyUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const url = companyId
        ? `/companies/my/users/?company_id=${companyId}`
        : '/companies/my/users/'
      const response = await api.get<CompanyUser[]>(url)
      setUsers(response.data)
    } catch (err) {
      setError('Failed to load team members')
      console.error('Error fetching company users:', err)
    } finally {
      setIsLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  return { users, isLoading, error, refetch: fetchUsers }
}

// ============================================================================
// Company User Mutations Hook
// ============================================================================

export interface InviteResult {
  type: 'added' | 'invited'
  message: string
  data: CompanyUser | CompanyInvitation
}

export interface CompanyInvitation {
  id: string
  token: string
  email: string
  role: CompanyUserRole
  status: 'pending' | 'accepted' | 'expired' | 'cancelled'
  company_name: string
  invited_by: string
  invited_by_email: string | null
  created_at: string
  expires_at: string | null
  accepted_at: string | null
  signup_url: string
}

interface UseCompanyUserMutationsReturn {
  inviteUser: (email: string, role: CompanyUserRole) => Promise<InviteResult>
  updateUserRole: (userId: string, role: CompanyUserRole, isActive?: boolean) => Promise<CompanyUser>
  updateUser: (userId: string, data: CompanyUserUpdate) => Promise<CompanyUser>
  removeUser: (userId: string) => Promise<void>
  isSubmitting: boolean
  error: string | null
}

export function useCompanyUserMutations(companyId?: string): UseCompanyUserMutationsReturn {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const inviteUser = useCallback(async (email: string, role: CompanyUserRole): Promise<InviteResult> => {
    setIsSubmitting(true)
    setError(null)
    try {
      // Include company_id for admins/recruiters managing other companies
      const payload: { email: string; role: CompanyUserRole; company_id?: string } = { email, role }
      if (companyId) {
        payload.company_id = companyId
      }
      const response = await api.post<InviteResult>('/companies/my/users/invite/', payload)
      return response.data
    } catch (err) {
      const axiosError = err as { response?: { data?: { error?: string } } }
      const message = axiosError.response?.data?.error || 'Failed to invite user'
      setError(message)
      console.error('Error inviting user:', err)
      throw err
    } finally {
      setIsSubmitting(false)
    }
  }, [companyId])

  const updateUserRole = useCallback(
    async (userId: string, role: CompanyUserRole, isActive?: boolean): Promise<CompanyUser> => {
      setIsSubmitting(true)
      setError(null)
      try {
        const data: { role: CompanyUserRole; is_active?: boolean } = { role }
        if (isActive !== undefined) {
          data.is_active = isActive
        }
        const response = await api.patch<CompanyUser>(`/companies/my/users/${userId}/`, data)
        return response.data
      } catch (err) {
        const axiosError = err as { response?: { data?: { error?: string } } }
        const message = axiosError.response?.data?.error || 'Failed to update user role'
        setError(message)
        console.error('Error updating user role:', err)
        throw err
      } finally {
        setIsSubmitting(false)
      }
    },
    []
  )

  const updateUser = useCallback(
    async (userId: string, data: CompanyUserUpdate): Promise<CompanyUser> => {
      setIsSubmitting(true)
      setError(null)
      try {
        const response = await api.patch<CompanyUser>(`/companies/my/users/${userId}/`, data)
        return response.data
      } catch (err) {
        const axiosError = err as { response?: { data?: { error?: string } } }
        const message = axiosError.response?.data?.error || 'Failed to update user'
        setError(message)
        console.error('Error updating user:', err)
        throw err
      } finally {
        setIsSubmitting(false)
      }
    },
    []
  )

  const removeUser = useCallback(async (userId: string): Promise<void> => {
    setIsSubmitting(true)
    setError(null)
    try {
      await api.delete(`/companies/my/users/${userId}/remove/`)
    } catch (err) {
      const axiosError = err as { response?: { data?: { error?: string } } }
      const message = axiosError.response?.data?.error || 'Failed to remove user'
      setError(message)
      console.error('Error removing user:', err)
      throw err
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  return { inviteUser, updateUserRole, updateUser, removeUser, isSubmitting, error }
}

// ============================================================================
// Company Invitations Hook (Pending Invitations)
// ============================================================================

interface UseCompanyInvitationsReturn {
  invitations: CompanyInvitation[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  cancelInvitation: (invitationId: string) => Promise<void>
  isCancelling: boolean
}

export function useCompanyInvitations(companyId?: string): UseCompanyInvitationsReturn {
  const [invitations, setInvitations] = useState<CompanyInvitation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCancelling, setIsCancelling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchInvitations = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      // Pass company_id as query param for admins/recruiters
      const params = companyId ? `?company_id=${companyId}` : ''
      const response = await api.get<CompanyInvitation[]>(`/companies/my/invitations/${params}`)
      setInvitations(response.data)
    } catch (err) {
      setError('Failed to load invitations')
      console.error('Error fetching invitations:', err)
    } finally {
      setIsLoading(false)
    }
  }, [companyId])

  const cancelInvitation = useCallback(async (invitationId: string): Promise<void> => {
    setIsCancelling(true)
    try {
      await api.delete(`/companies/my/invitations/${invitationId}/cancel/`)
      // Remove from local state
      setInvitations(prev => prev.filter(inv => inv.id !== invitationId))
    } catch (err) {
      const axiosError = err as { response?: { data?: { error?: string } } }
      const message = axiosError.response?.data?.error || 'Failed to cancel invitation'
      setError(message)
      throw err
    } finally {
      setIsCancelling(false)
    }
  }, [])

  useEffect(() => {
    fetchInvitations()
  }, [fetchInvitations])

  return { invitations, isLoading, error, refetch: fetchInvitations, cancelInvitation, isCancelling }
}

// ============================================================================
// Create Company Hook
// ============================================================================

interface CreateCompanyInput {
  name: string
  tagline?: string
  description?: string
  industry_id?: string | null
  company_size?: string
  headquarters_city?: string
  headquarters_country?: string
}

interface UseCreateCompanyReturn {
  createCompany: (data: CreateCompanyInput) => Promise<Company>
  isCreating: boolean
  error: string | null
}

export function useCreateCompany(): UseCreateCompanyReturn {
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createCompany = useCallback(async (data: CreateCompanyInput): Promise<Company> => {
    setIsCreating(true)
    setError(null)
    try {
      const response = await api.post<Company>('/companies/create/', data)
      return response.data
    } catch (err) {
      const axiosError = err as { response?: { data?: { error?: string; name?: string[] } } }
      const message =
        axiosError.response?.data?.error ||
        axiosError.response?.data?.name?.[0] ||
        'Failed to create company'
      setError(message)
      console.error('Error creating company:', err)
      throw err
    } finally {
      setIsCreating(false)
    }
  }, [])

  return { createCompany, isCreating, error }
}

// ============================================================================
// Countries Hook
// ============================================================================

interface UseCountriesReturn {
  countries: Country[]
  isLoading: boolean
  error: string | null
}

export function useCountries(): UseCountriesReturn {
  const [countries, setCountries] = useState<Country[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const response = await api.get<Country[]>('/companies/countries/')
        setCountries(response.data)
      } catch (err) {
        setError('Failed to load countries')
        console.error('Error fetching countries:', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchCountries()
  }, [])

  return { countries, isLoading, error }
}

// ============================================================================
// Cities Hook
// ============================================================================

interface UseCitiesOptions {
  countryId?: number | null
}

interface UseCitiesReturn {
  cities: City[]
  isLoading: boolean
  error: string | null
}

export function useCities(options: UseCitiesOptions = {}): UseCitiesReturn {
  const [cities, setCities] = useState<City[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCities = async () => {
      setIsLoading(true)
      try {
        const url = options.countryId
          ? `/companies/countries/${options.countryId}/cities/`
          : '/companies/cities/'
        const response = await api.get<City[]>(url)
        setCities(response.data)
      } catch (err) {
        setError('Failed to load cities')
        console.error('Error fetching cities:', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchCities()
  }, [options.countryId])

  return { cities, isLoading, error }
}

// ============================================================================
// All Companies Hook (Admin/Recruiter only)
// ============================================================================

interface UseAllCompaniesOptions {
  search?: string
  is_published?: boolean
}

interface UseAllCompaniesReturn {
  companies: AdminCompanyListItem[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useAllCompanies(options: UseAllCompaniesOptions = {}): UseAllCompaniesReturn {
  const [companies, setCompanies] = useState<AdminCompanyListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCompanies = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (options.search) params.append('search', options.search)
      if (options.is_published !== undefined) params.append('is_published', String(options.is_published))

      const response = await api.get<AdminCompanyListItem[]>(`/companies/all/?${params.toString()}`)
      setCompanies(response.data)
    } catch (err) {
      const axiosError = err as { response?: { status?: number } }
      if (axiosError.response?.status === 403) {
        setError('Permission denied')
      } else {
        setError('Failed to load companies')
      }
      console.error('Error fetching all companies:', err)
    } finally {
      setIsLoading(false)
    }
  }, [options.search, options.is_published])

  useEffect(() => {
    fetchCompanies()
  }, [fetchCompanies])

  return { companies, isLoading, error, refetch: fetchCompanies }
}

// ============================================================================
// Company Detail by ID Hook (Admin/Recruiter only)
// ============================================================================

interface UseCompanyByIdReturn {
  company: Company | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  updateCompany: (data: CompanyInput) => Promise<Company>
  isUpdating: boolean
}

export function useCompanyById(companyId: string): UseCompanyByIdReturn {
  const [company, setCompany] = useState<Company | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCompany = useCallback(async () => {
    if (!companyId) return

    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get<Company>(`/companies/${companyId}/detail/`)
      setCompany(response.data)
    } catch (err) {
      setError('Failed to load company')
      console.error('Error fetching company:', err)
    } finally {
      setIsLoading(false)
    }
  }, [companyId])

  const updateCompany = useCallback(async (data: CompanyInput): Promise<Company> => {
    setIsUpdating(true)
    setError(null)
    try {
      let requestData: CompanyInput | FormData = data

      if (data.logo instanceof File) {
        const formData = new FormData()
        Object.entries(data).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (value instanceof File) {
              formData.append(key, value)
            } else if (Array.isArray(value) || typeof value === 'object') {
              formData.append(key, JSON.stringify(value))
            } else {
              formData.append(key, String(value))
            }
          }
        })
        requestData = formData
      }

      const response = await api.patch<Company>(`/companies/${companyId}/detail/`, requestData, {
        headers: data.logo instanceof File ? { 'Content-Type': 'multipart/form-data' } : undefined,
      })
      setCompany(response.data)
      return response.data
    } catch (err) {
      setError('Failed to update company')
      console.error('Error updating company:', err)
      throw err
    } finally {
      setIsUpdating(false)
    }
  }, [companyId])

  useEffect(() => {
    fetchCompany()
  }, [fetchCompany])

  return { company, isLoading, error, refetch: fetchCompany, updateCompany, isUpdating }
}
