import { useState, useEffect, useCallback } from 'react'
import api from '@/services/api'
import type { RecruiterListItem } from '@/types'

// ============================================================================
// Types
// ============================================================================

export interface ClientInvitation {
  id: number
  token: string
  email: string
  created_at: string
  expires_at: string
  used_at: string | null
  is_valid: boolean
  is_expired: boolean
  signup_url: string
}

export interface CreateInvitationResponse {
  token: string
  email: string
  expires_at: string
  signup_url: string
}

// ============================================================================
// List Invitations Hook
// ============================================================================

interface UseInvitationsReturn {
  invitations: ClientInvitation[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useInvitations(): UseInvitationsReturn {
  const [invitations, setInvitations] = useState<ClientInvitation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchInvitations = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get<ClientInvitation[]>('/auth/invitations/')
      setInvitations(response.data)
    } catch (err) {
      const axiosError = err as { response?: { status?: number; data?: { error?: string } } }
      if (axiosError.response?.status === 403) {
        setError('You do not have permission to view invitations')
      } else {
        setError(axiosError.response?.data?.error || 'Failed to load invitations')
      }
      console.error('Error fetching invitations:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchInvitations()
  }, [fetchInvitations])

  return { invitations, isLoading, error, refetch: fetchInvitations }
}

// ============================================================================
// Create Invitation Hook
// ============================================================================

interface UseCreateInvitationReturn {
  createInvitation: (email?: string) => Promise<CreateInvitationResponse>
  isCreating: boolean
  error: string | null
}

export function useCreateInvitation(): UseCreateInvitationReturn {
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createInvitation = useCallback(async (email?: string): Promise<CreateInvitationResponse> => {
    setIsCreating(true)
    setError(null)
    try {
      const response = await api.post<CreateInvitationResponse>('/auth/invitations/create/', {
        email: email || '',
      })
      return response.data
    } catch (err) {
      const axiosError = err as { response?: { status?: number; data?: { error?: string } } }
      const message = axiosError.response?.data?.error || 'Failed to create invitation'
      setError(message)
      console.error('Error creating invitation:', err)
      throw err
    } finally {
      setIsCreating(false)
    }
  }, [])

  return { createInvitation, isCreating, error }
}


// ============================================================================
// Recruiter Invitation Types
// ============================================================================

export interface RecruiterInvitation {
  id: number
  token: string
  email: string
  created_at: string
  expires_at: string
  used_at: string | null
  is_valid: boolean
  is_expired: boolean
  signup_url: string
}

export interface CreateRecruiterInvitationResponse {
  token: string
  email: string
  expires_at: string
  signup_url: string
}

// ============================================================================
// List Recruiter Invitations Hook
// ============================================================================

interface UseRecruiterInvitationsReturn {
  invitations: RecruiterInvitation[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useRecruiterInvitations(): UseRecruiterInvitationsReturn {
  const [invitations, setInvitations] = useState<RecruiterInvitation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchInvitations = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get<RecruiterInvitation[]>('/auth/recruiter-invitations/')
      setInvitations(response.data)
    } catch (err) {
      const axiosError = err as { response?: { status?: number; data?: { error?: string } } }
      if (axiosError.response?.status === 403) {
        setError('You do not have permission to view recruiter invitations')
      } else {
        setError(axiosError.response?.data?.error || 'Failed to load recruiter invitations')
      }
      console.error('Error fetching recruiter invitations:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchInvitations()
  }, [fetchInvitations])

  return { invitations, isLoading, error, refetch: fetchInvitations }
}

// ============================================================================
// Create Recruiter Invitation Hook
// ============================================================================

interface UseCreateRecruiterInvitationReturn {
  createInvitation: (email?: string) => Promise<CreateRecruiterInvitationResponse>
  isCreating: boolean
  error: string | null
}

export function useCreateRecruiterInvitation(): UseCreateRecruiterInvitationReturn {
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createInvitation = useCallback(async (email?: string): Promise<CreateRecruiterInvitationResponse> => {
    setIsCreating(true)
    setError(null)
    try {
      const response = await api.post<CreateRecruiterInvitationResponse>('/auth/recruiter-invitations/create/', {
        email: email || '',
      })
      return response.data
    } catch (err) {
      const axiosError = err as { response?: { status?: number; data?: { error?: string } } }
      const message = axiosError.response?.data?.error || 'Failed to create recruiter invitation'
      setError(message)
      console.error('Error creating recruiter invitation:', err)
      throw err
    } finally {
      setIsCreating(false)
    }
  }, [])

  return { createInvitation, isCreating, error }
}

// ============================================================================
// Validate Recruiter Invitation Hook
// ============================================================================

interface ValidateRecruiterInvitationResult {
  valid: boolean
  email: string
}

interface UseValidateRecruiterInvitationReturn {
  validationResult: ValidateRecruiterInvitationResult | null
  isValidating: boolean
  error: string | null
  validate: (token: string) => Promise<ValidateRecruiterInvitationResult>
}

export function useValidateRecruiterInvitation(): UseValidateRecruiterInvitationReturn {
  const [validationResult, setValidationResult] = useState<ValidateRecruiterInvitationResult | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validate = useCallback(async (token: string): Promise<ValidateRecruiterInvitationResult> => {
    setIsValidating(true)
    setError(null)
    try {
      const response = await api.get<ValidateRecruiterInvitationResult>(`/auth/recruiter-invitations/${token}/validate/`)
      setValidationResult(response.data)
      return response.data
    } catch (err) {
      const axiosError = err as { response?: { status?: number; data?: { error?: string } } }
      const message = axiosError.response?.data?.error || 'Invalid or expired invitation'
      setError(message)
      throw err
    } finally {
      setIsValidating(false)
    }
  }, [])

  return { validationResult, isValidating, error, validate }
}

// ============================================================================
// Recruiter Signup Hook
// ============================================================================

interface RecruiterSignupData {
  email: string
  password: string
  password_confirm: string
  first_name: string
  last_name: string
  phone?: string
}

interface RecruiterSignupResult {
  message: string
  user: {
    id: string
    email: string
    first_name: string
    last_name: string
    role: string
  }
  access: string
  refresh: string
}

interface UseRecruiterSignupReturn {
  signup: (token: string, data: RecruiterSignupData) => Promise<RecruiterSignupResult>
  isSigningUp: boolean
  error: string | null
}

export function useRecruiterSignup(): UseRecruiterSignupReturn {
  const [isSigningUp, setIsSigningUp] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const signup = useCallback(async (token: string, data: RecruiterSignupData): Promise<RecruiterSignupResult> => {
    setIsSigningUp(true)
    setError(null)
    try {
      const response = await api.post<RecruiterSignupResult>(`/auth/recruiter-invitations/${token}/signup/`, data)
      return response.data
    } catch (err) {
      const axiosError = err as { response?: { status?: number; data?: { error?: string; [key: string]: unknown } } }
      const message = axiosError.response?.data?.error || 'Failed to complete signup'
      setError(message)
      throw err
    } finally {
      setIsSigningUp(false)
    }
  }, [])

  return { signup, isSigningUp, error }
}

// ============================================================================
// List Recruiters Hook (for admin job assignment)
// ============================================================================

interface UseRecruitersReturn {
  recruiters: RecruiterListItem[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useRecruiters(): UseRecruitersReturn {
  const [recruiters, setRecruiters] = useState<RecruiterListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRecruiters = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get<RecruiterListItem[]>('/auth/recruiters/')
      setRecruiters(response.data)
    } catch (err) {
      const axiosError = err as { response?: { status?: number; data?: { error?: string } } }
      if (axiosError.response?.status === 403) {
        setError('You do not have permission to view recruiters')
      } else {
        setError(axiosError.response?.data?.error || 'Failed to load recruiters')
      }
      console.error('Error fetching recruiters:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRecruiters()
  }, [fetchRecruiters])

  return { recruiters, isLoading, error, refetch: fetchRecruiters }
}
