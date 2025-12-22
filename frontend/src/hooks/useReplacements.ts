import { useState, useCallback, useEffect } from 'react'
import api from '@/services/api'
import type {
  ReplacementRequest,
  ReplacementEligibility,
  ReplacementRequestInput,
  ReplacementApproveInput,
  ReplacementRejectInput,
  ReplacementStatus,
} from '@/types'

// ============================================================================
// Check Eligibility Hook
// ============================================================================

interface UseReplacementEligibilityReturn {
  eligibility: ReplacementEligibility | null
  isLoading: boolean
  error: string | null
  checkEligibility: (applicationId: string) => Promise<ReplacementEligibility>
}

export function useReplacementEligibility(): UseReplacementEligibilityReturn {
  const [eligibility, setEligibility] = useState<ReplacementEligibility | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkEligibility = useCallback(async (applicationId: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get<ReplacementEligibility>(
        `/jobs/applications/${applicationId}/replacement/eligibility/`
      )
      setEligibility(response.data)
      return response.data
    } catch (err) {
      const message = 'Failed to check replacement eligibility'
      setError(message)
      console.error('Error checking replacement eligibility:', err)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { eligibility, isLoading, error, checkEligibility }
}

// ============================================================================
// Submit Replacement Request Hook
// ============================================================================

interface UseSubmitReplacementReturn {
  isSubmitting: boolean
  error: string | null
  submitRequest: (applicationId: string, data: ReplacementRequestInput) => Promise<ReplacementRequest>
}

export function useSubmitReplacement(): UseSubmitReplacementReturn {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submitRequest = useCallback(async (applicationId: string, data: ReplacementRequestInput) => {
    setIsSubmitting(true)
    setError(null)
    try {
      const response = await api.post<ReplacementRequest>(
        `/jobs/applications/${applicationId}/replacement/request/`,
        data
      )
      return response.data
    } catch (err) {
      const message = 'Failed to submit replacement request'
      setError(message)
      console.error('Error submitting replacement request:', err)
      throw err
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  return { isSubmitting, error, submitRequest }
}

// ============================================================================
// List Replacement Requests Hook
// ============================================================================

interface UseReplacementRequestsOptions {
  companyId?: string
  status?: ReplacementStatus
}

interface UseReplacementRequestsReturn {
  requests: ReplacementRequest[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useReplacementRequests(options: UseReplacementRequestsOptions = {}): UseReplacementRequestsReturn {
  const [requests, setRequests] = useState<ReplacementRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRequests = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (options.companyId) params.append('company_id', options.companyId)
      if (options.status) params.append('status', options.status)

      const url = options.companyId
        ? `/jobs/companies/${options.companyId}/replacement-requests/?${params.toString()}`
        : `/jobs/replacement-requests/?${params.toString()}`

      const response = await api.get<ReplacementRequest[]>(url)
      setRequests(response.data)
    } catch (err) {
      setError('Failed to load replacement requests')
      console.error('Error fetching replacement requests:', err)
    } finally {
      setIsLoading(false)
    }
  }, [options.companyId, options.status])

  // Fetch on mount and when options change
  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  return { requests, isLoading, error, refetch: fetchRequests }
}

// ============================================================================
// Single Replacement Request Hook
// ============================================================================

interface UseReplacementRequestReturn {
  request: ReplacementRequest | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useReplacementRequest(requestId: string | null): UseReplacementRequestReturn {
  const [request, setRequest] = useState<ReplacementRequest | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchRequest = useCallback(async () => {
    if (!requestId) return
    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get<ReplacementRequest>(`/jobs/replacement-requests/${requestId}/`)
      setRequest(response.data)
    } catch (err) {
      setError('Failed to load replacement request')
      console.error('Error fetching replacement request:', err)
    } finally {
      setIsLoading(false)
    }
  }, [requestId])

  // Fetch on mount or when requestId changes
  useEffect(() => {
    if (requestId) fetchRequest()
  }, [requestId, fetchRequest])

  return { request, isLoading, error, refetch: fetchRequest }
}

// ============================================================================
// Admin Actions Hooks
// ============================================================================

interface UseReplacementActionsReturn {
  isApproving: boolean
  isRejecting: boolean
  error: string | null
  approveRequest: (requestId: string, data: ReplacementApproveInput) => Promise<ReplacementRequest>
  rejectRequest: (requestId: string, data?: ReplacementRejectInput) => Promise<ReplacementRequest>
}

export function useReplacementActions(): UseReplacementActionsReturn {
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const approveRequest = useCallback(async (requestId: string, data: ReplacementApproveInput) => {
    setIsApproving(true)
    setError(null)
    try {
      const response = await api.post<ReplacementRequest>(
        `/jobs/replacement-requests/${requestId}/approve/`,
        data
      )
      return response.data
    } catch (err) {
      const message = 'Failed to approve replacement request'
      setError(message)
      console.error('Error approving replacement request:', err)
      throw err
    } finally {
      setIsApproving(false)
    }
  }, [])

  const rejectRequest = useCallback(async (requestId: string, data?: ReplacementRejectInput) => {
    setIsRejecting(true)
    setError(null)
    try {
      const response = await api.post<ReplacementRequest>(
        `/jobs/replacement-requests/${requestId}/reject/`,
        data || {}
      )
      return response.data
    } catch (err) {
      const message = 'Failed to reject replacement request'
      setError(message)
      console.error('Error rejecting replacement request:', err)
      throw err
    } finally {
      setIsRejecting(false)
    }
  }, [])

  return { isApproving, isRejecting, error, approveRequest, rejectRequest }
}
