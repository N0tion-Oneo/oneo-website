import { useState, useCallback, useEffect } from 'react'
import api from '@/services/api'

// =============================================================================
// Types
// =============================================================================

export interface LeadOnboardingStage {
  id: number
  name: string
  slug: string
  color: string
  order: number
}

// Uses the same format as AssignedUser from @/types
export interface LeadAssignedTo {
  id: number
  email: string
  first_name: string
  last_name: string
  full_name: string
}

export interface Lead {
  id: string
  name: string
  email: string
  phone: string
  job_title: string
  company_name: string
  company_website: string
  company_size: string
  industry_name: string | null
  onboarding_stage: LeadOnboardingStage | null
  source: string
  source_detail: string
  source_page: string
  subject: string
  is_read: boolean
  is_replied: boolean
  assigned_to: LeadAssignedTo[]
  is_converted: boolean
  converted_at: string | null
  created_at: string
  updated_at: string
}

export interface LeadDetail extends Lead {
  notes: string
  created_by: {
    id: string
    name: string
    email: string
  } | null
  converted_to_company: {
    id: string
    name: string
    slug: string
  } | null
  converted_to_user: {
    id: string
    name: string
    email: string
  } | null
  invitations: {
    id: number
    token: string
    email: string
    is_valid: boolean
    is_expired: boolean
    used_at: string | null
    created_at: string
    expires_at: string
  }[]
}

export interface CreateLeadInput {
  name: string
  email: string
  phone: string
  company_name: string
  company_website?: string
  company_size?: string
  industry_id?: number
  source?: string
  source_detail?: string
  notes?: string
  assigned_to_id?: string
}

export interface UpdateLeadInput {
  name?: string
  email?: string
  phone?: string
  job_title?: string
  company_name?: string
  company_website?: string
  company_size?: string
  industry_id?: number | null
  source?: string
  source_detail?: string
  notes?: string
  assigned_to_ids?: number[]
}

export interface LeadFilters {
  stage?: string
  source?: string
  assigned_to?: string
  converted?: 'true' | 'false' | ''
  industry?: string
  company_size?: string
  created_after?: string
  created_before?: string
  search?: string
  ordering?: string
  page?: number
  page_size?: number
}

// =============================================================================
// useLeads - List all leads with pagination
// =============================================================================

interface PaginatedLeadsResponse {
  results: Lead[]
  count: number
  page: number
  page_size: number
  total_pages: number
  has_next: boolean
  has_previous: boolean
}

interface UseLeadsReturn {
  leads: Lead[]
  count: number
  page: number
  totalPages: number
  hasNext: boolean
  hasPrevious: boolean
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useLeads(filters?: LeadFilters): UseLeadsReturn {
  const [leads, setLeads] = useState<Lead[]>([])
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [hasPrevious, setHasPrevious] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLeads = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (filters?.stage) params.append('stage', filters.stage)
      if (filters?.source) params.append('source', filters.source)
      if (filters?.assigned_to) params.append('assigned_to', filters.assigned_to)
      if (filters?.converted) params.append('converted', filters.converted)
      if (filters?.industry) params.append('industry', filters.industry)
      if (filters?.company_size) params.append('company_size', filters.company_size)
      if (filters?.created_after) params.append('created_after', filters.created_after)
      if (filters?.created_before) params.append('created_before', filters.created_before)
      if (filters?.search) params.append('search', filters.search)
      if (filters?.ordering) params.append('ordering', filters.ordering)
      if (filters?.page) params.append('page', String(filters.page))
      if (filters?.page_size) params.append('page_size', String(filters.page_size))

      const url = `/companies/leads/${params.toString() ? `?${params.toString()}` : ''}`
      const response = await api.get<PaginatedLeadsResponse>(url)
      setLeads(response.data.results)
      setCount(response.data.count)
      setPage(response.data.page)
      setTotalPages(response.data.total_pages)
      setHasNext(response.data.has_next)
      setHasPrevious(response.data.has_previous)
    } catch (err) {
      console.error('Error fetching leads:', err)
      setError('Failed to fetch leads')
    } finally {
      setIsLoading(false)
    }
  }, [
    filters?.stage,
    filters?.source,
    filters?.assigned_to,
    filters?.converted,
    filters?.industry,
    filters?.company_size,
    filters?.created_after,
    filters?.created_before,
    filters?.search,
    filters?.ordering,
    filters?.page,
    filters?.page_size,
  ])

  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  return { leads, count, page, totalPages, hasNext, hasPrevious, isLoading, error, refetch: fetchLeads }
}

// =============================================================================
// useLead - Get single lead
// =============================================================================

interface UseLeadReturn {
  lead: LeadDetail | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useLead(leadId: string | undefined): UseLeadReturn {
  const [lead, setLead] = useState<LeadDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLead = useCallback(async () => {
    if (!leadId) {
      setLead(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get<LeadDetail>(`/companies/leads/${leadId}/`)
      setLead(response.data)
    } catch (err) {
      console.error('Error fetching lead:', err)
      setError('Failed to fetch lead')
    } finally {
      setIsLoading(false)
    }
  }, [leadId])

  useEffect(() => {
    fetchLead()
  }, [fetchLead])

  return { lead, isLoading, error, refetch: fetchLead }
}

// =============================================================================
// useCreateLead
// =============================================================================

interface UseCreateLeadReturn {
  createLead: (data: CreateLeadInput) => Promise<LeadDetail>
  isCreating: boolean
  error: string | null
}

export function useCreateLead(): UseCreateLeadReturn {
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createLead = useCallback(async (data: CreateLeadInput): Promise<LeadDetail> => {
    setIsCreating(true)
    setError(null)
    try {
      const response = await api.post<LeadDetail>('/companies/leads/create/', data)
      return response.data
    } catch (err) {
      const axiosError = err as { response?: { data?: { error?: string } } }
      const message = axiosError.response?.data?.error || 'Failed to create lead'
      setError(message)
      throw err
    } finally {
      setIsCreating(false)
    }
  }, [])

  return { createLead, isCreating, error }
}

// =============================================================================
// useUpdateLead
// =============================================================================

interface UseUpdateLeadReturn {
  updateLead: (leadId: string, data: UpdateLeadInput) => Promise<LeadDetail>
  isUpdating: boolean
  error: string | null
}

export function useUpdateLead(): UseUpdateLeadReturn {
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateLead = useCallback(async (leadId: string, data: UpdateLeadInput): Promise<LeadDetail> => {
    setIsUpdating(true)
    setError(null)
    try {
      const response = await api.patch<LeadDetail>(`/companies/leads/${leadId}/update/`, data)
      return response.data
    } catch (err) {
      const axiosError = err as { response?: { data?: { error?: string } } }
      const message = axiosError.response?.data?.error || 'Failed to update lead'
      setError(message)
      throw err
    } finally {
      setIsUpdating(false)
    }
  }, [])

  return { updateLead, isUpdating, error }
}

// =============================================================================
// useDeleteLead
// =============================================================================

interface UseDeleteLeadReturn {
  deleteLead: (leadId: string) => Promise<void>
  isDeleting: boolean
  error: string | null
}

export function useDeleteLead(): UseDeleteLeadReturn {
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deleteLead = useCallback(async (leadId: string): Promise<void> => {
    setIsDeleting(true)
    setError(null)
    try {
      await api.delete(`/companies/leads/${leadId}/delete/`)
    } catch (err) {
      const axiosError = err as { response?: { data?: { error?: string } } }
      const message = axiosError.response?.data?.error || 'Failed to delete lead'
      setError(message)
      throw err
    } finally {
      setIsDeleting(false)
    }
  }, [])

  return { deleteLead, isDeleting, error }
}

// =============================================================================
// useUpdateLeadStage
// =============================================================================

interface UseUpdateLeadStageReturn {
  updateStage: (leadId: string, stageId: number) => Promise<LeadDetail>
  isUpdating: boolean
  error: string | null
}

export function useUpdateLeadStage(): UseUpdateLeadStageReturn {
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateStage = useCallback(async (leadId: string, stageId: number): Promise<LeadDetail> => {
    setIsUpdating(true)
    setError(null)
    try {
      const response = await api.post<LeadDetail>(`/companies/leads/${leadId}/stage/`, {
        stage_id: stageId,
      })
      return response.data
    } catch (err) {
      const axiosError = err as { response?: { data?: { error?: string } } }
      const message = axiosError.response?.data?.error || 'Failed to update lead stage'
      setError(message)
      throw err
    } finally {
      setIsUpdating(false)
    }
  }, [])

  return { updateStage, isUpdating, error }
}

// =============================================================================
// Lead Activity Types and Hooks
// =============================================================================

export type LeadActivityType =
  | 'note_added'
  | 'stage_changed'
  | 'meeting_scheduled'
  | 'meeting_completed'
  | 'meeting_cancelled'
  | 'email_sent'
  | 'call_logged'
  | 'invitation_sent'
  | 'converted'
  | 'assigned'
  | 'created'

export interface LeadActivity {
  id: string
  lead: string
  activity_type: LeadActivityType
  activity_type_display: string
  content: string
  previous_stage: number | null
  previous_stage_name: string | null
  previous_stage_color: string | null
  new_stage: number | null
  new_stage_name: string | null
  new_stage_color: string | null
  metadata: Record<string, unknown>
  performed_by: number | null
  performer_name: string
  created_at: string
}

export interface CreateLeadActivityInput {
  activity_type: 'note_added' | 'call_logged' | 'email_sent'
  content: string
  metadata?: Record<string, unknown>
}

// =============================================================================
// useLeadActivities - List activities for a lead
// =============================================================================

interface UseLeadActivitiesReturn {
  activities: LeadActivity[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useLeadActivities(leadId: string | undefined): UseLeadActivitiesReturn {
  const [activities, setActivities] = useState<LeadActivity[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchActivities = useCallback(async () => {
    if (!leadId) {
      setActivities([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get<LeadActivity[]>(`/companies/leads/${leadId}/activities/`)
      setActivities(response.data)
    } catch (err) {
      console.error('Error fetching lead activities:', err)
      setError('Failed to fetch activities')
    } finally {
      setIsLoading(false)
    }
  }, [leadId])

  useEffect(() => {
    fetchActivities()
  }, [fetchActivities])

  return { activities, isLoading, error, refetch: fetchActivities }
}

// =============================================================================
// useAddLeadActivity - Add an activity to a lead
// =============================================================================

interface UseAddLeadActivityReturn {
  addActivity: (leadId: string, data: CreateLeadActivityInput) => Promise<LeadActivity>
  isAdding: boolean
  error: string | null
}

export function useAddLeadActivity(): UseAddLeadActivityReturn {
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addActivity = useCallback(async (leadId: string, data: CreateLeadActivityInput): Promise<LeadActivity> => {
    setIsAdding(true)
    setError(null)
    try {
      const response = await api.post<LeadActivity>(`/companies/leads/${leadId}/activities/`, data)
      return response.data
    } catch (err) {
      const axiosError = err as { response?: { data?: { error?: string } } }
      const message = axiosError.response?.data?.error || 'Failed to add activity'
      setError(message)
      throw err
    } finally {
      setIsAdding(false)
    }
  }, [])

  return { addActivity, isAdding, error }
}
