import { useState, useEffect, useCallback } from 'react'
import api from '@/services/api'
import type {
  CandidateProfile,
  CandidateProfileSanitized,
  CandidateAdminListItem,
  Skill,
  Industry,
  Technology,
  PaginatedResponse,
  Experience,
  ExperienceInput,
  Education,
  EducationInput,
} from '@/types'

// ============================================================================
// Skills Hook
// ============================================================================

interface UseSkillsOptions {
  category?: string
  search?: string
}

interface UseSkillsReturn {
  skills: Skill[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useSkills(options: UseSkillsOptions = {}): UseSkillsReturn {
  const [skills, setSkills] = useState<Skill[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSkills = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (options.category) params.append('category', options.category)
      if (options.search) params.append('search', options.search)

      const response = await api.get<Skill[]>(`/skills/?${params.toString()}`)
      setSkills(response.data)
    } catch (err) {
      setError('Failed to load skills')
      console.error('Error fetching skills:', err)
    } finally {
      setIsLoading(false)
    }
  }, [options.category, options.search])

  useEffect(() => {
    fetchSkills()
  }, [fetchSkills])

  return { skills, isLoading, error, refetch: fetchSkills }
}

// ============================================================================
// Industries Hook
// ============================================================================

interface UseIndustriesOptions {
  search?: string
}

interface UseIndustriesReturn {
  industries: Industry[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useIndustries(options: UseIndustriesOptions = {}): UseIndustriesReturn {
  const [industries, setIndustries] = useState<Industry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchIndustries = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (options.search) params.append('search', options.search)

      const response = await api.get<Industry[]>(`/industries/?${params.toString()}`)
      setIndustries(response.data)
    } catch (err) {
      setError('Failed to load industries')
      console.error('Error fetching industries:', err)
    } finally {
      setIsLoading(false)
    }
  }, [options.search])

  useEffect(() => {
    fetchIndustries()
  }, [fetchIndustries])

  return { industries, isLoading, error, refetch: fetchIndustries }
}

// ============================================================================
// Technologies Hook
// ============================================================================

interface UseTechnologiesOptions {
  category?: string
  search?: string
}

interface UseTechnologiesReturn {
  technologies: Technology[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useTechnologies(options: UseTechnologiesOptions = {}): UseTechnologiesReturn {
  const [technologies, setTechnologies] = useState<Technology[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTechnologies = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (options.category) params.append('category', options.category)
      if (options.search) params.append('search', options.search)

      const response = await api.get<Technology[]>(`/technologies/?${params.toString()}`)
      setTechnologies(response.data)
    } catch (err) {
      setError('Failed to load technologies')
      console.error('Error fetching technologies:', err)
    } finally {
      setIsLoading(false)
    }
  }, [options.category, options.search])

  useEffect(() => {
    fetchTechnologies()
  }, [fetchTechnologies])

  return { technologies, isLoading, error, refetch: fetchTechnologies }
}

// ============================================================================
// My Profile Hook
// ============================================================================

interface UseMyProfileReturn {
  profile: CandidateProfile | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  updateProfile: (data: Partial<ProfileUpdateData>) => Promise<CandidateProfile>
  isUpdating: boolean
}

export interface ProfileUpdateData {
  // User fields
  first_name?: string
  last_name?: string
  phone?: string
  // Professional info
  professional_title?: string
  headline?: string
  seniority?: string
  professional_summary?: string
  // Location (FK IDs)
  city_id?: number | null
  country_id?: number | null
  // Legacy location fields (kept for backward compatibility)
  city?: string
  country?: string
  region?: string
  // Work preferences
  work_preference?: string
  willing_to_relocate?: boolean
  preferred_locations?: string[]
  // Compensation
  salary_expectation_min?: number | null
  salary_expectation_max?: number | null
  salary_currency?: string
  notice_period_days?: number | null
  // Portfolio
  portfolio_links?: { url: string; title: string; description?: string }[]
  // Skills & Industries (by ID)
  skill_ids?: number[]
  industry_ids?: number[]
  // Visibility
  visibility?: string
  // Assigned staff (admin/recruiter only)
  assigned_to_ids?: number[]
}

export function useMyProfile(): UseMyProfileReturn {
  const [profile, setProfile] = useState<CandidateProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchProfile = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get<CandidateProfile>('/candidates/me/')
      setProfile(response.data)
    } catch (err) {
      setError('Failed to load profile')
      console.error('Error fetching profile:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const updateProfile = useCallback(async (data: Partial<ProfileUpdateData>): Promise<CandidateProfile> => {
    setIsUpdating(true)
    setError(null)
    try {
      const response = await api.patch<CandidateProfile>('/candidates/me/update/', data)
      setProfile(response.data)
      return response.data
    } catch (err) {
      setError('Failed to update profile')
      console.error('Error updating profile:', err)
      throw err
    } finally {
      setIsUpdating(false)
    }
  }, [])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  return { profile, isLoading, error, refetch: fetchProfile, updateProfile, isUpdating }
}

// ============================================================================
// Candidates List Hook (Public Directory)
// ============================================================================

interface UseCandidatesOptions {
  seniority?: string
  work_preference?: string
  country?: string
  city?: string
  industries?: number[]
  search?: string
  page?: number
}

interface UseCandidatesReturn {
  candidates: CandidateProfileSanitized[]
  count: number
  hasNext: boolean
  hasPrevious: boolean
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useCandidates(options: UseCandidatesOptions = {}): UseCandidatesReturn {
  const [candidates, setCandidates] = useState<CandidateProfileSanitized[]>([])
  const [count, setCount] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [hasPrevious, setHasPrevious] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCandidates = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (options.seniority) params.append('seniority', options.seniority)
      if (options.work_preference) params.append('work_preference', options.work_preference)
      if (options.country) params.append('country', options.country)
      if (options.city) params.append('city', options.city)
      if (options.industries?.length) params.append('industries', options.industries.join(','))
      if (options.search) params.append('search', options.search)
      if (options.page) params.append('page', options.page.toString())

      const response = await api.get<PaginatedResponse<CandidateProfileSanitized>>(
        `/candidates/?${params.toString()}`
      )
      setCandidates(response.data.results)
      setCount(response.data.count)
      setHasNext(!!response.data.next)
      setHasPrevious(!!response.data.previous)
    } catch (err) {
      setError('Failed to load candidates')
      console.error('Error fetching candidates:', err)
    } finally {
      setIsLoading(false)
    }
  }, [
    options.seniority,
    options.work_preference,
    options.country,
    options.city,
    options.industries,
    options.search,
    options.page,
  ])

  useEffect(() => {
    fetchCandidates()
  }, [fetchCandidates])

  return { candidates, count, hasNext, hasPrevious, isLoading, error, refetch: fetchCandidates }
}

// ============================================================================
// All Candidates Hook (Admin/Recruiter)
// ============================================================================

interface UseAllCandidatesOptions {
  seniority?: string
  work_preference?: string
  visibility?: string
  country?: string
  city?: string
  industries?: number[]
  min_experience?: number
  max_experience?: number
  min_completeness?: number
  min_salary?: number
  max_salary?: number
  salary_currency?: string
  notice_period_min?: number
  notice_period_max?: number
  created_after?: string
  created_before?: string
  willing_to_relocate?: boolean
  has_resume?: boolean
  search?: string
  ordering?: string
  page?: number
  page_size?: number
}

interface UseAllCandidatesReturn {
  candidates: CandidateAdminListItem[]
  count: number
  hasNext: boolean
  hasPrevious: boolean
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useAllCandidates(options: UseAllCandidatesOptions = {}): UseAllCandidatesReturn {
  const [candidates, setCandidates] = useState<CandidateAdminListItem[]>([])
  const [count, setCount] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [hasPrevious, setHasPrevious] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCandidates = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (options.seniority) params.append('seniority', options.seniority)
      if (options.work_preference) params.append('work_preference', options.work_preference)
      if (options.visibility) params.append('visibility', options.visibility)
      if (options.country) params.append('country', options.country)
      if (options.city) params.append('city', options.city)
      if (options.industries?.length) params.append('industries', options.industries.join(','))
      if (options.min_experience !== undefined) params.append('min_experience', options.min_experience.toString())
      if (options.max_experience !== undefined) params.append('max_experience', options.max_experience.toString())
      if (options.min_completeness !== undefined) params.append('min_completeness', options.min_completeness.toString())
      if (options.min_salary !== undefined) params.append('min_salary', options.min_salary.toString())
      if (options.max_salary !== undefined) params.append('max_salary', options.max_salary.toString())
      if (options.salary_currency) params.append('salary_currency', options.salary_currency)
      if (options.notice_period_min !== undefined) params.append('notice_period_min', options.notice_period_min.toString())
      if (options.notice_period_max !== undefined) params.append('notice_period_max', options.notice_period_max.toString())
      if (options.created_after) params.append('created_after', options.created_after)
      if (options.created_before) params.append('created_before', options.created_before)
      if (options.willing_to_relocate !== undefined) params.append('willing_to_relocate', options.willing_to_relocate.toString())
      if (options.has_resume !== undefined) params.append('has_resume', options.has_resume.toString())
      if (options.search) params.append('search', options.search)
      if (options.ordering) params.append('ordering', options.ordering)
      if (options.page) params.append('page', options.page.toString())
      if (options.page_size) params.append('page_size', options.page_size.toString())

      const response = await api.get<PaginatedResponse<CandidateAdminListItem>>(
        `/candidates/all/?${params.toString()}`
      )
      setCandidates(response.data.results)
      setCount(response.data.count)
      setHasNext(!!response.data.next)
      setHasPrevious(!!response.data.previous)
    } catch (err) {
      setError('Failed to load candidates')
      console.error('Error fetching candidates:', err)
    } finally {
      setIsLoading(false)
    }
  }, [
    options.seniority,
    options.work_preference,
    options.visibility,
    options.country,
    options.city,
    options.industries,
    options.min_experience,
    options.max_experience,
    options.min_completeness,
    options.min_salary,
    options.max_salary,
    options.salary_currency,
    options.notice_period_min,
    options.notice_period_max,
    options.created_after,
    options.created_before,
    options.willing_to_relocate,
    options.has_resume,
    options.search,
    options.ordering,
    options.page,
    options.page_size,
  ])

  useEffect(() => {
    fetchCandidates()
  }, [fetchCandidates])

  return { candidates, count, hasNext, hasPrevious, isLoading, error, refetch: fetchCandidates }
}

// ============================================================================
// Single Candidate Hook (Public Profile + Admin Edit)
// ============================================================================

interface UseCandidateReturn {
  candidate: CandidateProfile | CandidateProfileSanitized | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  updateCandidate: (data: Partial<ProfileUpdateData>) => Promise<CandidateProfile>
  isUpdating: boolean
}

export function useCandidate(slug: string): UseCandidateReturn {
  const [candidate, setCandidate] = useState<CandidateProfile | CandidateProfileSanitized | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCandidate = useCallback(async () => {
    if (!slug) return

    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get<CandidateProfile | CandidateProfileSanitized>(
        `/candidates/${slug}/`
      )
      setCandidate(response.data)
    } catch (err) {
      setError('Failed to load candidate')
      console.error('Error fetching candidate:', err)
    } finally {
      setIsLoading(false)
    }
  }, [slug])

  const updateCandidate = useCallback(async (data: Partial<ProfileUpdateData>): Promise<CandidateProfile> => {
    if (!slug) throw new Error('No candidate slug provided')

    setIsUpdating(true)
    setError(null)
    try {
      const response = await api.patch<CandidateProfile>(`/candidates/${slug}/`, data)
      setCandidate(response.data)
      return response.data
    } catch (err) {
      setError('Failed to update candidate')
      console.error('Error updating candidate:', err)
      throw err
    } finally {
      setIsUpdating(false)
    }
  }, [slug])

  useEffect(() => {
    fetchCandidate()
  }, [fetchCandidate])

  return { candidate, isLoading, error, refetch: fetchCandidate, updateCandidate, isUpdating }
}

// ============================================================================
// Experience Hooks
// ============================================================================

interface UseExperiencesReturn {
  experiences: Experience[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Hook to fetch experiences for a candidate.
 * @param candidateSlug - Optional slug for admin/recruiter to fetch another candidate's experiences
 */
export function useExperiences(candidateSlug?: string): UseExperiencesReturn {
  const [experiences, setExperiences] = useState<Experience[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchExperiences = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const endpoint = candidateSlug
        ? `/candidates/${candidateSlug}/experiences/`
        : '/candidates/me/experiences/'
      const response = await api.get<Experience[]>(endpoint)
      setExperiences(response.data)
    } catch (err) {
      setError('Failed to load experiences')
      console.error('Error fetching experiences:', err)
    } finally {
      setIsLoading(false)
    }
  }, [candidateSlug])

  useEffect(() => {
    fetchExperiences()
  }, [fetchExperiences])

  return { experiences, isLoading, error, refetch: fetchExperiences }
}

interface UseExperienceMutationsReturn {
  createExperience: (data: ExperienceInput) => Promise<Experience>
  updateExperience: (id: string, data: Partial<ExperienceInput>) => Promise<Experience>
  deleteExperience: (id: string) => Promise<void>
  reorderExperiences: (orderedIds: string[]) => Promise<void>
  isSubmitting: boolean
  error: string | null
}

/**
 * Hook for experience mutations (create, update, delete, reorder).
 * @param candidateSlug - Optional slug for admin/recruiter to edit another candidate's experiences
 */
export function useExperienceMutations(candidateSlug?: string): UseExperienceMutationsReturn {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const basePath = candidateSlug
    ? `/candidates/${candidateSlug}/experiences`
    : '/candidates/me/experiences'

  const createExperience = useCallback(async (data: ExperienceInput): Promise<Experience> => {
    setIsSubmitting(true)
    setError(null)
    try {
      const response = await api.post<Experience>(`${basePath}/create/`, data)
      return response.data
    } catch (err) {
      setError('Failed to create experience')
      console.error('Error creating experience:', err)
      throw err
    } finally {
      setIsSubmitting(false)
    }
  }, [basePath])

  const updateExperience = useCallback(async (id: string, data: Partial<ExperienceInput>): Promise<Experience> => {
    setIsSubmitting(true)
    setError(null)
    try {
      const response = await api.patch<Experience>(`${basePath}/${id}/`, data)
      return response.data
    } catch (err) {
      setError('Failed to update experience')
      console.error('Error updating experience:', err)
      throw err
    } finally {
      setIsSubmitting(false)
    }
  }, [basePath])

  const deleteExperience = useCallback(async (id: string): Promise<void> => {
    setIsSubmitting(true)
    setError(null)
    try {
      await api.delete(`${basePath}/${id}/delete/`)
    } catch (err) {
      setError('Failed to delete experience')
      console.error('Error deleting experience:', err)
      throw err
    } finally {
      setIsSubmitting(false)
    }
  }, [basePath])

  const reorderExperiences = useCallback(async (orderedIds: string[]): Promise<void> => {
    setIsSubmitting(true)
    setError(null)
    try {
      await api.post(`${basePath}/reorder/`, { ordered_ids: orderedIds })
    } catch (err) {
      setError('Failed to reorder experiences')
      console.error('Error reordering experiences:', err)
      throw err
    } finally {
      setIsSubmitting(false)
    }
  }, [basePath])

  return { createExperience, updateExperience, deleteExperience, reorderExperiences, isSubmitting, error }
}

// ============================================================================
// Education Hooks
// ============================================================================

interface UseEducationReturn {
  education: Education[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Hook to fetch education for a candidate.
 * @param candidateSlug - Optional slug for admin/recruiter to fetch another candidate's education
 */
export function useEducation(candidateSlug?: string): UseEducationReturn {
  const [education, setEducation] = useState<Education[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEducation = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const endpoint = candidateSlug
        ? `/candidates/${candidateSlug}/education/`
        : '/candidates/me/education/'
      const response = await api.get<Education[]>(endpoint)
      setEducation(response.data)
    } catch (err) {
      setError('Failed to load education')
      console.error('Error fetching education:', err)
    } finally {
      setIsLoading(false)
    }
  }, [candidateSlug])

  useEffect(() => {
    fetchEducation()
  }, [fetchEducation])

  return { education, isLoading, error, refetch: fetchEducation }
}

interface UseEducationMutationsReturn {
  createEducation: (data: EducationInput) => Promise<Education>
  updateEducation: (id: string, data: Partial<EducationInput>) => Promise<Education>
  deleteEducation: (id: string) => Promise<void>
  reorderEducation: (orderedIds: string[]) => Promise<void>
  isSubmitting: boolean
  error: string | null
}

/**
 * Hook for education mutations (create, update, delete, reorder).
 * @param candidateSlug - Optional slug for admin/recruiter to edit another candidate's education
 */
export function useEducationMutations(candidateSlug?: string): UseEducationMutationsReturn {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const basePath = candidateSlug
    ? `/candidates/${candidateSlug}/education`
    : '/candidates/me/education'

  const createEducation = useCallback(async (data: EducationInput): Promise<Education> => {
    setIsSubmitting(true)
    setError(null)
    try {
      const response = await api.post<Education>(`${basePath}/create/`, data)
      return response.data
    } catch (err) {
      setError('Failed to create education')
      console.error('Error creating education:', err)
      throw err
    } finally {
      setIsSubmitting(false)
    }
  }, [basePath])

  const updateEducation = useCallback(async (id: string, data: Partial<EducationInput>): Promise<Education> => {
    setIsSubmitting(true)
    setError(null)
    try {
      const response = await api.patch<Education>(`${basePath}/${id}/`, data)
      return response.data
    } catch (err) {
      setError('Failed to update education')
      console.error('Error updating education:', err)
      throw err
    } finally {
      setIsSubmitting(false)
    }
  }, [basePath])

  const deleteEducation = useCallback(async (id: string): Promise<void> => {
    setIsSubmitting(true)
    setError(null)
    try {
      await api.delete(`${basePath}/${id}/delete/`)
    } catch (err) {
      setError('Failed to delete education')
      console.error('Error deleting education:', err)
      throw err
    } finally {
      setIsSubmitting(false)
    }
  }, [basePath])

  const reorderEducation = useCallback(async (orderedIds: string[]): Promise<void> => {
    setIsSubmitting(true)
    setError(null)
    try {
      await api.post(`${basePath}/reorder/`, { ordered_ids: orderedIds })
    } catch (err) {
      setError('Failed to reorder education')
      console.error('Error reordering education:', err)
      throw err
    } finally {
      setIsSubmitting(false)
    }
  }, [basePath])

  return { createEducation, updateEducation, deleteEducation, reorderEducation, isSubmitting, error }
}
