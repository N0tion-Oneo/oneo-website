import { useState, useEffect, useCallback } from 'react'
import api from '@/services/api'
import type {
  CandidateProfile,
  CandidateProfileSanitized,
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
  years_of_experience?: number | null
  // Location
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
  skills?: number[]
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
      if (options.skills?.length) params.append('skills', options.skills.join(','))
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
    options.skills,
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
// Single Candidate Hook (Public Profile)
// ============================================================================

interface UseCandidateReturn {
  candidate: CandidateProfile | CandidateProfileSanitized | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useCandidate(slug: string): UseCandidateReturn {
  const [candidate, setCandidate] = useState<CandidateProfile | CandidateProfileSanitized | null>(null)
  const [isLoading, setIsLoading] = useState(true)
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

  useEffect(() => {
    fetchCandidate()
  }, [fetchCandidate])

  return { candidate, isLoading, error, refetch: fetchCandidate }
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

export function useExperiences(): UseExperiencesReturn {
  const [experiences, setExperiences] = useState<Experience[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchExperiences = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get<Experience[]>('/candidates/me/experiences/')
      setExperiences(response.data)
    } catch (err) {
      setError('Failed to load experiences')
      console.error('Error fetching experiences:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

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

export function useExperienceMutations(): UseExperienceMutationsReturn {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createExperience = useCallback(async (data: ExperienceInput): Promise<Experience> => {
    setIsSubmitting(true)
    setError(null)
    try {
      const response = await api.post<Experience>('/candidates/me/experiences/create/', data)
      return response.data
    } catch (err) {
      setError('Failed to create experience')
      console.error('Error creating experience:', err)
      throw err
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  const updateExperience = useCallback(async (id: string, data: Partial<ExperienceInput>): Promise<Experience> => {
    setIsSubmitting(true)
    setError(null)
    try {
      const response = await api.patch<Experience>(`/candidates/me/experiences/${id}/`, data)
      return response.data
    } catch (err) {
      setError('Failed to update experience')
      console.error('Error updating experience:', err)
      throw err
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  const deleteExperience = useCallback(async (id: string): Promise<void> => {
    setIsSubmitting(true)
    setError(null)
    try {
      await api.delete(`/candidates/me/experiences/${id}/delete/`)
    } catch (err) {
      setError('Failed to delete experience')
      console.error('Error deleting experience:', err)
      throw err
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  const reorderExperiences = useCallback(async (orderedIds: string[]): Promise<void> => {
    setIsSubmitting(true)
    setError(null)
    try {
      await api.post('/candidates/me/experiences/reorder/', { ordered_ids: orderedIds })
    } catch (err) {
      setError('Failed to reorder experiences')
      console.error('Error reordering experiences:', err)
      throw err
    } finally {
      setIsSubmitting(false)
    }
  }, [])

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

export function useEducation(): UseEducationReturn {
  const [education, setEducation] = useState<Education[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEducation = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get<Education[]>('/candidates/me/education/')
      setEducation(response.data)
    } catch (err) {
      setError('Failed to load education')
      console.error('Error fetching education:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

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

export function useEducationMutations(): UseEducationMutationsReturn {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createEducation = useCallback(async (data: EducationInput): Promise<Education> => {
    setIsSubmitting(true)
    setError(null)
    try {
      const response = await api.post<Education>('/candidates/me/education/create/', data)
      return response.data
    } catch (err) {
      setError('Failed to create education')
      console.error('Error creating education:', err)
      throw err
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  const updateEducation = useCallback(async (id: string, data: Partial<EducationInput>): Promise<Education> => {
    setIsSubmitting(true)
    setError(null)
    try {
      const response = await api.patch<Education>(`/candidates/me/education/${id}/`, data)
      return response.data
    } catch (err) {
      setError('Failed to update education')
      console.error('Error updating education:', err)
      throw err
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  const deleteEducation = useCallback(async (id: string): Promise<void> => {
    setIsSubmitting(true)
    setError(null)
    try {
      await api.delete(`/candidates/me/education/${id}/delete/`)
    } catch (err) {
      setError('Failed to delete education')
      console.error('Error deleting education:', err)
      throw err
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  const reorderEducation = useCallback(async (orderedIds: string[]): Promise<void> => {
    setIsSubmitting(true)
    setError(null)
    try {
      await api.post('/candidates/me/education/reorder/', { ordered_ids: orderedIds })
    } catch (err) {
      setError('Failed to reorder education')
      console.error('Error reordering education:', err)
      throw err
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  return { createEducation, updateEducation, deleteEducation, reorderEducation, isSubmitting, error }
}
