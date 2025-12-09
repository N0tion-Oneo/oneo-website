import { useState, useEffect, useCallback } from 'react'
import api from '@/services/api'
import type { Job, JobListItem, JobInput, JobFilters, JobStatus } from '@/types'

// ============================================================================
// Jobs List Hook (Public)
// ============================================================================

interface UseJobsReturn {
  jobs: JobListItem[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useJobs(filters: JobFilters = {}): UseJobsReturn {
  const [jobs, setJobs] = useState<JobListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchJobs = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (filters.seniority) params.append('seniority', filters.seniority)
      if (filters.job_type) params.append('job_type', filters.job_type)
      if (filters.work_mode) params.append('work_mode', filters.work_mode)
      if (filters.department) params.append('department', filters.department)
      if (filters.country) params.append('country', filters.country)
      if (filters.salary_min) params.append('salary_min', String(filters.salary_min))
      if (filters.salary_max) params.append('salary_max', String(filters.salary_max))
      if (filters.skills) params.append('skills', filters.skills)
      if (filters.technologies) params.append('technologies', filters.technologies)
      if (filters.company) params.append('company', filters.company)
      if (filters.search) params.append('search', filters.search)
      if (filters.sort) params.append('sort', filters.sort)

      const response = await api.get<JobListItem[]>(`/jobs/?${params.toString()}`)
      setJobs(response.data)
    } catch (err) {
      setError('Failed to load jobs')
      console.error('Error fetching jobs:', err)
    } finally {
      setIsLoading(false)
    }
  }, [
    filters.seniority,
    filters.job_type,
    filters.work_mode,
    filters.department,
    filters.country,
    filters.salary_min,
    filters.salary_max,
    filters.skills,
    filters.technologies,
    filters.company,
    filters.search,
    filters.sort,
  ])

  useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  return { jobs, isLoading, error, refetch: fetchJobs }
}

// ============================================================================
// Single Job Hook (Public)
// ============================================================================

interface UseJobReturn {
  job: Job | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useJob(slug: string): UseJobReturn {
  const [job, setJob] = useState<Job | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchJob = useCallback(async () => {
    if (!slug) return

    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get<Job>(`/jobs/${slug}/`)
      setJob(response.data)
    } catch (err) {
      setError('Failed to load job')
      console.error('Error fetching job:', err)
    } finally {
      setIsLoading(false)
    }
  }, [slug])

  useEffect(() => {
    fetchJob()
  }, [fetchJob])

  return { job, isLoading, error, refetch: fetchJob }
}

// ============================================================================
// Company Jobs Hook (for authenticated client users)
// ============================================================================

interface UseCompanyJobsOptions {
  status?: JobStatus
}

interface UseCompanyJobsReturn {
  jobs: JobListItem[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useCompanyJobs(options: UseCompanyJobsOptions = {}): UseCompanyJobsReturn {
  const [jobs, setJobs] = useState<JobListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchJobs = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (options.status) params.append('status', options.status)

      const response = await api.get<JobListItem[]>(`/jobs/my/?${params.toString()}`)
      setJobs(response.data)
    } catch (err) {
      // 404 means user is not associated with any company
      const axiosError = err as { response?: { status?: number } }
      if (axiosError.response?.status === 404) {
        setJobs([])
      } else {
        setError('Failed to load jobs')
        console.error('Error fetching company jobs:', err)
      }
    } finally {
      setIsLoading(false)
    }
  }, [options.status])

  useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  return { jobs, isLoading, error, refetch: fetchJobs }
}

// ============================================================================
// Job Detail Hook (for management - by ID)
// ============================================================================

interface UseJobDetailReturn {
  job: Job | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useJobDetail(jobId: string): UseJobDetailReturn {
  const [job, setJob] = useState<Job | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchJob = useCallback(async () => {
    if (!jobId) return

    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get<Job>(`/jobs/${jobId}/detail/`)
      setJob(response.data)
    } catch (err) {
      setError('Failed to load job')
      console.error('Error fetching job:', err)
    } finally {
      setIsLoading(false)
    }
  }, [jobId])

  useEffect(() => {
    fetchJob()
  }, [fetchJob])

  return { job, isLoading, error, refetch: fetchJob }
}

// ============================================================================
// Create Job Hook
// ============================================================================

interface UseCreateJobReturn {
  createJob: (data: JobInput, companyId?: string) => Promise<Job>
  isCreating: boolean
  error: string | null
}

export function useCreateJob(): UseCreateJobReturn {
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createJob = useCallback(async (data: JobInput, companyId?: string): Promise<Job> => {
    setIsCreating(true)
    setError(null)
    try {
      const payload = companyId ? { ...data, company_id: companyId } : data
      const response = await api.post<Job>('/jobs/create/', payload)
      return response.data
    } catch (err) {
      const axiosError = err as { response?: { data?: { error?: string; title?: string[] } } }
      const message =
        axiosError.response?.data?.error ||
        axiosError.response?.data?.title?.[0] ||
        'Failed to create job'
      setError(message)
      console.error('Error creating job:', err)
      throw err
    } finally {
      setIsCreating(false)
    }
  }, [])

  return { createJob, isCreating, error }
}

// ============================================================================
// Update Job Hook
// ============================================================================

interface UseUpdateJobReturn {
  updateJob: (jobId: string, data: Partial<JobInput>) => Promise<Job>
  isUpdating: boolean
  error: string | null
}

export function useUpdateJob(): UseUpdateJobReturn {
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateJob = useCallback(async (jobId: string, data: Partial<JobInput>): Promise<Job> => {
    setIsUpdating(true)
    setError(null)
    try {
      const response = await api.patch<Job>(`/jobs/${jobId}/detail/`, data)
      return response.data
    } catch (err) {
      const axiosError = err as { response?: { data?: { error?: string } } }
      const message = axiosError.response?.data?.error || 'Failed to update job'
      setError(message)
      console.error('Error updating job:', err)
      throw err
    } finally {
      setIsUpdating(false)
    }
  }, [])

  return { updateJob, isUpdating, error }
}

// ============================================================================
// Delete Job Hook
// ============================================================================

interface UseDeleteJobReturn {
  deleteJob: (jobId: string) => Promise<void>
  isDeleting: boolean
  error: string | null
}

export function useDeleteJob(): UseDeleteJobReturn {
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deleteJob = useCallback(async (jobId: string): Promise<void> => {
    setIsDeleting(true)
    setError(null)
    try {
      await api.delete(`/jobs/${jobId}/detail/`)
    } catch (err) {
      const axiosError = err as { response?: { data?: { error?: string } } }
      const message = axiosError.response?.data?.error || 'Failed to delete job'
      setError(message)
      console.error('Error deleting job:', err)
      throw err
    } finally {
      setIsDeleting(false)
    }
  }, [])

  return { deleteJob, isDeleting, error }
}

// ============================================================================
// Job Status Mutations Hook
// ============================================================================

interface UseJobStatusReturn {
  publishJob: (jobId: string) => Promise<Job>
  closeJob: (jobId: string) => Promise<Job>
  markJobFilled: (jobId: string) => Promise<Job>
  isSubmitting: boolean
  error: string | null
}

export function useJobStatus(): UseJobStatusReturn {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const publishJob = useCallback(async (jobId: string): Promise<Job> => {
    setIsSubmitting(true)
    setError(null)
    try {
      const response = await api.post<Job>(`/jobs/${jobId}/publish/`)
      return response.data
    } catch (err) {
      const axiosError = err as { response?: { data?: { error?: string } } }
      const message = axiosError.response?.data?.error || 'Failed to publish job'
      setError(message)
      console.error('Error publishing job:', err)
      throw err
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  const closeJob = useCallback(async (jobId: string): Promise<Job> => {
    setIsSubmitting(true)
    setError(null)
    try {
      const response = await api.post<Job>(`/jobs/${jobId}/close/`)
      return response.data
    } catch (err) {
      const axiosError = err as { response?: { data?: { error?: string } } }
      const message = axiosError.response?.data?.error || 'Failed to close job'
      setError(message)
      console.error('Error closing job:', err)
      throw err
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  const markJobFilled = useCallback(async (jobId: string): Promise<Job> => {
    setIsSubmitting(true)
    setError(null)
    try {
      const response = await api.post<Job>(`/jobs/${jobId}/filled/`)
      return response.data
    } catch (err) {
      const axiosError = err as { response?: { data?: { error?: string } } }
      const message = axiosError.response?.data?.error || 'Failed to mark job as filled'
      setError(message)
      console.error('Error marking job as filled:', err)
      throw err
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  return { publishJob, closeJob, markJobFilled, isSubmitting, error }
}

// ============================================================================
// All Jobs Hook (Admin/Recruiter only)
// ============================================================================

interface UseAllJobsOptions {
  status?: JobStatus
  company?: string
  search?: string
  seniority?: string
  job_type?: string
  work_mode?: string
  department?: string
  recruiter?: string
  created_after?: string
  created_before?: string
  ordering?: string
  page?: number
  page_size?: number
}

interface PaginatedJobsResponse {
  results: JobListItem[]
  count: number
  next: string | null
  previous: string | null
}

interface UseAllJobsReturn {
  jobs: JobListItem[]
  count: number
  hasNext: boolean
  hasPrevious: boolean
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useAllJobs(options: UseAllJobsOptions = {}): UseAllJobsReturn {
  const [jobs, setJobs] = useState<JobListItem[]>([])
  const [count, setCount] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [hasPrevious, setHasPrevious] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchJobs = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (options.status) params.append('status', options.status)
      if (options.company) params.append('company', options.company)
      if (options.search) params.append('search', options.search)
      if (options.seniority) params.append('seniority', options.seniority)
      if (options.job_type) params.append('job_type', options.job_type)
      if (options.work_mode) params.append('work_mode', options.work_mode)
      if (options.department) params.append('department', options.department)
      if (options.recruiter) params.append('recruiter', options.recruiter)
      if (options.created_after) params.append('created_after', options.created_after)
      if (options.created_before) params.append('created_before', options.created_before)
      if (options.ordering) params.append('ordering', options.ordering)
      if (options.page) params.append('page', String(options.page))
      if (options.page_size) params.append('page_size', String(options.page_size))

      const response = await api.get<PaginatedJobsResponse | JobListItem[]>(`/jobs/all/?${params.toString()}`)

      // Handle both paginated and non-paginated responses
      if (Array.isArray(response.data)) {
        setJobs(response.data)
        setCount(response.data.length)
        setHasNext(false)
        setHasPrevious(false)
      } else {
        setJobs(response.data.results)
        setCount(response.data.count)
        setHasNext(!!response.data.next)
        setHasPrevious(!!response.data.previous)
      }
    } catch (err) {
      const axiosError = err as { response?: { status?: number } }
      if (axiosError.response?.status === 403) {
        setError('Permission denied')
      } else {
        setError('Failed to load jobs')
      }
      console.error('Error fetching all jobs:', err)
    } finally {
      setIsLoading(false)
    }
  }, [options.status, options.company, options.search, options.seniority, options.job_type, options.work_mode, options.department, options.recruiter, options.created_after, options.created_before, options.ordering, options.page, options.page_size])

  useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  return { jobs, count, hasNext, hasPrevious, isLoading, error, refetch: fetchJobs }
}

// ============================================================================
// Job Stages Hook (fetch interview stages for a job)
// ============================================================================

export interface JobStage {
  id: string
  order: number
  name: string
  stage_type: string
  description: string
  default_duration_minutes: number
}

interface UseJobStagesReturn {
  stages: JobStage[]
  isLoading: boolean
  error: string | null
}

export function useJobStages(jobId: string | null): UseJobStagesReturn {
  const [stages, setStages] = useState<JobStage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!jobId) {
      setStages([])
      return
    }

    const fetchStages = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await api.get<JobStage[]>(`/jobs/${jobId}/stages/`)
        setStages(response.data)
      } catch (err) {
        setError('Failed to load job stages')
        console.error('Error fetching job stages:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStages()
  }, [jobId])

  return { stages, isLoading, error }
}
