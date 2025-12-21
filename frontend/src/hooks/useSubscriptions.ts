/**
 * Subscription Management Hooks
 *
 * Hooks for managing company subscriptions, pricing, invoices, and billing.
 * Only accessible by admin and recruiter users.
 */

import { useState, useEffect, useCallback } from 'react'
import api from '@/services/api'

// =============================================================================
// Types
// =============================================================================

export type SubscriptionStatus = 'active' | 'paused' | 'terminated' | 'expired'
export type SubscriptionServiceType = 'retained' | 'headhunting' | 'eor'
export type TerminationType = 'for_cause' | 'without_cause' | 'mutual' | 'expired'
export type TerminationReason =
  | 'material_breach'
  | 'liquidation'
  | 'non_payment'
  | 'client_request'
  | 'contract_expired'
  | 'mutual_agreement'
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' | 'partially_paid'
export type InvoiceType = 'retainer' | 'placement' | 'termination' | 'adjustment' | 'other'
export type BillingMode = 'in_system' | 'external'
export type PaymentMethod = 'bank_transfer' | 'credit_card' | 'debit_order' | 'cash' | 'cheque' | 'other'
export type AlertSeverity = 'info' | 'warning' | 'critical'
export type AlertType = 'renewal_due' | 'overdue_invoice'
export type ActivityType =
  | 'subscription_created'
  | 'subscription_activated'
  | 'subscription_paused'
  | 'subscription_resumed'
  | 'subscription_terminated'
  | 'subscription_renewed'
  | 'subscription_expired'
  | 'contract_extended'
  | 'auto_renew_changed'
  | 'pricing_changed'
  | 'feature_override_added'
  | 'feature_override_removed'
  | 'feature_override_changed'
  | 'invoice_created'
  | 'invoice_sent'
  | 'invoice_paid'
  | 'invoice_partially_paid'
  | 'invoice_cancelled'
  | 'invoice_overdue'
  | 'payment_recorded'
  | 'payment_deleted'

export interface Subscription {
  id: string
  company: {
    id: string
    name: string
    slug: string
  }
  service_type: SubscriptionServiceType
  service_type_display: string
  contract_start_date: string
  contract_end_date: string
  billing_day_of_month: number
  status: SubscriptionStatus
  status_display: string
  auto_renew: boolean
  renewal_reminder_sent: boolean
  terminated_at: string | null
  terminated_by: string | null
  termination_type: TerminationType | null
  termination_reason: TerminationReason | null
  termination_notes: string
  termination_effective_date: string | null
  early_termination_fee: string | null
  access_expires_at: string | null
  paused_at: string | null
  paused_by: string | null
  pause_reason: string
  internal_notes: string
  created_at: string
  updated_at: string
  days_until_renewal: number
  is_within_lockout_period: boolean
  months_remaining: number
}

export interface SubscriptionListItem {
  id: string
  company_id: string
  company_name: string
  service_type: SubscriptionServiceType
  service_type_display: string
  contract_start_date: string
  contract_end_date: string
  status: SubscriptionStatus
  status_display: string
  auto_renew: boolean
  days_until_renewal: number
  months_remaining: number
}

export interface CompanyPricing {
  id: string
  company_id: string
  monthly_retainer: string | null
  placement_fee: string | null
  csuite_placement_fee: string | null
  effective_from: string
  updated_by: string | null
  created_at: string
  updated_at: string
}

export interface EffectivePricing {
  monthly_retainer: string
  placement_fee: string
  csuite_placement_fee: string
  is_custom_retainer: boolean
  is_custom_placement: boolean
  is_custom_csuite: boolean
}

export interface FeatureWithOverride {
  id: string
  name: string
  category: string
  default_enabled: boolean
  is_overridden: boolean
  override_enabled: boolean | null
  effective_enabled: boolean
}

export interface InvoiceLineItem {
  id: string
  description: string
  quantity: string
  unit_price: string
  amount: string
  order: number
}

export interface PlacementBenefit {
  name: string
  annual_cost: number
}

export interface PlacementEquity {
  vesting_years: number
  shares: number
  share_value: number
}

export interface PlacementInfo {
  id: string
  candidate_id: string
  candidate_name: string
  job_id: string
  job_title: string
  is_csuite: boolean
  offer_currency: string
  offer_accepted_at: string
  // Full offer details
  annual_salary: number | null
  benefits: PlacementBenefit[]
  equity: PlacementEquity | null
  total_benefits_cost: number
  year_1_equity_value: number
  total_cost_to_company: number
  start_date: string | null
  notes: string
}

export interface Invoice {
  id: string
  company_id: string
  company_name: string
  subscription_id: string | null
  placement_id: string | null
  placement_info: PlacementInfo | null
  invoice_number: string
  invoice_type: InvoiceType
  invoice_type_display: string
  billing_mode: BillingMode
  invoice_date: string
  due_date: string
  billing_period_start: string | null
  billing_period_end: string | null
  subtotal: string
  vat_rate: string
  vat_amount: string
  total_amount: string
  amount_paid: string
  balance_due: string
  status: InvoiceStatus
  status_display: string
  external_invoice_number: string
  external_system: string
  sent_at: string | null
  paid_at: string | null
  cancelled_at: string | null
  description: string
  internal_notes: string
  can_edit_line_items: boolean
  created_by: string | null
  created_at: string
  updated_at: string
  line_items: InvoiceLineItem[]
}

export interface InvoiceListItem {
  id: string
  company_id: string
  company_name: string
  invoice_number: string
  invoice_type: InvoiceType
  invoice_type_display: string
  invoice_date: string
  due_date: string
  total_amount: string
  amount_paid: string
  balance_due: string
  status: InvoiceStatus
  status_display: string
  is_overdue: boolean
  billing_mode: BillingMode
  placement: string | null
  placement_info: PlacementInfo | null
  created_at: string
}

export interface Payment {
  id: string
  invoice_id: string
  amount: string
  payment_date: string
  payment_method: PaymentMethod
  payment_method_display: string
  reference_number: string
  notes: string
  recorded_by: string | null
  created_at: string
  updated_at: string
}

export interface SubscriptionActivity {
  id: string
  company_id: string
  subscription_id: string | null
  invoice_id: string | null
  performed_by: string | null
  performed_by_name: string | null
  activity_type: ActivityType
  activity_type_display: string
  previous_status: string
  new_status: string
  metadata: Record<string, unknown>
  created_at: string
}

export interface SubscriptionAlert {
  type: AlertType
  company_id: string
  company_name: string
  message: string
  severity: AlertSeverity
  subscription_id?: string
  invoice_id?: string
  due_date: string
  amount?: string
}

export interface UpcomingRenewal {
  company_id: string
  company_name: string
  contract_end_date: string
  days_until_renewal: number
  auto_renew: boolean
  monthly_retainer: string
}

export interface RecentInvoiceSummary {
  id: string
  invoice_number: string
  company_name: string
  total_amount: string
  status: string
  invoice_date: string
  invoice_type: string
}

export interface RecentActivity {
  id: string
  activity_type: string
  activity_type_display: string
  company_name: string
  performed_by_name: string | null
  created_at: string
}

export interface InvoiceStatusCount {
  count: number
  amount: string
}

export interface PlacementBreakdown {
  paid: InvoiceStatusCount
  partially_paid: InvoiceStatusCount
  pending: InvoiceStatusCount
  overdue: InvoiceStatusCount
  draft: InvoiceStatusCount
  cancelled: InvoiceStatusCount
}

export interface SubscriptionSummary {
  // Existing subscription stats
  total_subscriptions: number
  active_subscriptions: number
  paused_subscriptions: number
  terminated_subscriptions: number
  expired_subscriptions: number
  expiring_this_month: number
  total_mrr: string
  overdue_invoices_count: number
  overdue_invoices_amount: string
  // Service type breakdown with subscriptions
  retained_companies: number
  headhunting_companies: number
  retained_subscriptions: number
  headhunting_subscriptions: number
  retained_mrr: string
  // Retained placement stats (revenue = placement fees)
  retained_regular_placements: number
  retained_csuite_placements: number
  retained_regular_revenue: string
  retained_csuite_revenue: string
  retained_regular_breakdown: PlacementBreakdown
  retained_csuite_breakdown: PlacementBreakdown
  // Headhunting placement stats (revenue = placement fees)
  headhunting_regular_placements: number
  headhunting_csuite_placements: number
  headhunting_regular_revenue: string
  headhunting_csuite_revenue: string
  headhunting_regular_breakdown: PlacementBreakdown
  headhunting_csuite_breakdown: PlacementBreakdown
  // Retained retainer/subscription stats (only retained companies have subscriptions)
  retained_retainer_count: number
  retained_retainer_revenue: string
  retained_retainer_breakdown: PlacementBreakdown
  // Invoice collection stats
  collected_this_month: string
  pending_invoices_count: number
  pending_invoices_amount: string
  // Upcoming renewals
  upcoming_renewals: UpcomingRenewal[]
}

export interface TerminationFeeCalculation {
  monthly_retainer: string
  months_remaining: number
  remaining_term_fee: string
  three_month_fee: string
  early_termination_fee: string
  is_within_lockout_period: boolean
  can_terminate_without_cause: boolean
}

// =============================================================================
// Subscription Hooks
// =============================================================================

interface UseSubscriptionsReturn {
  subscriptions: SubscriptionListItem[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useSubscriptions(statusFilter?: SubscriptionStatus): UseSubscriptionsReturn {
  const [subscriptions, setSubscriptions] = useState<SubscriptionListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSubscriptions = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.append('status', statusFilter)
      const response = await api.get<SubscriptionListItem[]>(`/subscriptions/?${params.toString()}`)
      setSubscriptions(response.data)
    } catch (err) {
      setError('Failed to load subscriptions')
      console.error('Error fetching subscriptions:', err)
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    fetchSubscriptions()
  }, [fetchSubscriptions])

  return { subscriptions, isLoading, error, refetch: fetchSubscriptions }
}

interface UseSubscriptionReturn {
  subscription: Subscription | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useSubscription(subscriptionId: string): UseSubscriptionReturn {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSubscription = useCallback(async () => {
    if (!subscriptionId) return

    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get<Subscription>(`/subscriptions/${subscriptionId}/`)
      setSubscription(response.data)
    } catch (err) {
      setError('Failed to load subscription')
      console.error('Error fetching subscription:', err)
    } finally {
      setIsLoading(false)
    }
  }, [subscriptionId])

  useEffect(() => {
    fetchSubscription()
  }, [fetchSubscription])

  return { subscription, isLoading, error, refetch: fetchSubscription }
}

interface UseCompanySubscriptionsReturn {
  subscriptions: Subscription[]
  recruitmentSubscription: Subscription | null // The retained or headhunting subscription
  isLoading: boolean
  error: string | null
  hasSubscription: boolean
  isPermissionDenied: boolean
  refetch: () => Promise<void>
}

export function useCompanySubscription(companyId: string): UseCompanySubscriptionsReturn {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPermissionDenied, setIsPermissionDenied] = useState(false)

  const fetchSubscriptions = useCallback(async () => {
    if (!companyId) return

    setIsLoading(true)
    setError(null)
    setIsPermissionDenied(false)
    try {
      const response = await api.get<Subscription[]>(`/companies/${companyId}/subscriptions/`)
      setSubscriptions(response.data)
    } catch (err) {
      const axiosError = err as { response?: { status?: number } }
      if (axiosError.response?.status === 403) {
        // Permission denied - user doesn't have staff access
        setSubscriptions([])
        setIsPermissionDenied(true)
        setError('Permission denied. Staff access required.')
        console.error('Permission denied for subscription access:', err)
      } else {
        setError('Failed to load subscriptions')
        console.error('Error fetching subscriptions:', err)
      }
    } finally {
      setIsLoading(false)
    }
  }, [companyId])

  // Get the recruitment subscription (retained or headhunting)
  const recruitmentSubscription = subscriptions.find(
    (s) => s.service_type === 'retained' || s.service_type === 'headhunting'
  ) || null

  // Check if any subscriptions exist
  const hasSubscription = subscriptions.length > 0

  useEffect(() => {
    fetchSubscriptions()
  }, [fetchSubscriptions])

  return {
    subscriptions,
    recruitmentSubscription,
    isLoading,
    error,
    hasSubscription,
    isPermissionDenied,
    refetch: fetchSubscriptions,
  }
}

// =============================================================================
// Subscription Mutation Hooks
// =============================================================================

interface CreateSubscriptionInput {
  company: string
  service_type: SubscriptionServiceType
  contract_start_date: string
  contract_end_date: string
  billing_day_of_month?: number
  auto_renew?: boolean
  internal_notes?: string
}

interface UseCreateSubscriptionReturn {
  createSubscription: (data: CreateSubscriptionInput) => Promise<Subscription>
  isCreating: boolean
  error: string | null
}

export function useCreateSubscription(): UseCreateSubscriptionReturn {
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createSubscription = useCallback(async (data: CreateSubscriptionInput): Promise<Subscription> => {
    setIsCreating(true)
    setError(null)
    try {
      const response = await api.post<Subscription>('/subscriptions/create/', data)
      return response.data
    } catch (err) {
      const axiosError = err as { response?: { data?: { error?: string } } }
      const message = axiosError.response?.data?.error || 'Failed to create subscription'
      setError(message)
      throw err
    } finally {
      setIsCreating(false)
    }
  }, [])

  return { createSubscription, isCreating, error }
}

interface UpdateSubscriptionInput {
  billing_day_of_month?: number
  auto_renew?: boolean
  internal_notes?: string
  contract_end_date?: string
}

interface UseUpdateSubscriptionReturn {
  updateSubscription: (subscriptionId: string, data: UpdateSubscriptionInput) => Promise<Subscription>
  isUpdating: boolean
  error: string | null
}

export function useUpdateSubscription(): UseUpdateSubscriptionReturn {
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateSubscription = useCallback(
    async (subscriptionId: string, data: UpdateSubscriptionInput): Promise<Subscription> => {
      setIsUpdating(true)
      setError(null)
      try {
        const response = await api.patch<Subscription>(`/subscriptions/${subscriptionId}/update/`, data)
        return response.data
      } catch (err) {
        const axiosError = err as { response?: { data?: { error?: string } } }
        const message = axiosError.response?.data?.error || 'Failed to update subscription'
        setError(message)
        throw err
      } finally {
        setIsUpdating(false)
      }
    },
    []
  )

  return { updateSubscription, isUpdating, error }
}

interface UsePauseSubscriptionReturn {
  pauseSubscription: (subscriptionId: string, pauseReason: string) => Promise<Subscription>
  isPausing: boolean
  error: string | null
}

export function usePauseSubscription(): UsePauseSubscriptionReturn {
  const [isPausing, setIsPausing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pauseSubscription = useCallback(
    async (subscriptionId: string, pauseReason: string): Promise<Subscription> => {
      setIsPausing(true)
      setError(null)
      try {
        const response = await api.post<Subscription>(`/subscriptions/${subscriptionId}/pause/`, {
          pause_reason: pauseReason,
        })
        return response.data
      } catch (err) {
        const axiosError = err as { response?: { data?: { error?: string } } }
        const message = axiosError.response?.data?.error || 'Failed to pause subscription'
        setError(message)
        throw err
      } finally {
        setIsPausing(false)
      }
    },
    []
  )

  return { pauseSubscription, isPausing, error }
}

interface UseResumeSubscriptionReturn {
  resumeSubscription: (subscriptionId: string) => Promise<Subscription>
  isResuming: boolean
  error: string | null
}

export function useResumeSubscription(): UseResumeSubscriptionReturn {
  const [isResuming, setIsResuming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resumeSubscription = useCallback(async (subscriptionId: string): Promise<Subscription> => {
    setIsResuming(true)
    setError(null)
    try {
      const response = await api.post<Subscription>(`/subscriptions/${subscriptionId}/resume/`)
      return response.data
    } catch (err) {
      const axiosError = err as { response?: { data?: { error?: string } } }
      const message = axiosError.response?.data?.error || 'Failed to resume subscription'
      setError(message)
      throw err
    } finally {
      setIsResuming(false)
    }
  }, [])

  return { resumeSubscription, isResuming, error }
}

interface TerminateSubscriptionInput {
  termination_type: TerminationType
  termination_reason: TerminationReason
  termination_notes?: string
  termination_effective_date?: string
  access_expires_days?: number
}

interface UseTerminateSubscriptionReturn {
  terminateSubscription: (subscriptionId: string, data: TerminateSubscriptionInput) => Promise<Subscription>
  isTerminating: boolean
  error: string | null
}

export function useTerminateSubscription(): UseTerminateSubscriptionReturn {
  const [isTerminating, setIsTerminating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const terminateSubscription = useCallback(
    async (subscriptionId: string, data: TerminateSubscriptionInput): Promise<Subscription> => {
      setIsTerminating(true)
      setError(null)
      try {
        const response = await api.post<Subscription>(`/subscriptions/${subscriptionId}/terminate/`, data)
        return response.data
      } catch (err) {
        const axiosError = err as { response?: { data?: { error?: string } } }
        const message = axiosError.response?.data?.error || 'Failed to terminate subscription'
        setError(message)
        throw err
      } finally {
        setIsTerminating(false)
      }
    },
    []
  )

  return { terminateSubscription, isTerminating, error }
}

interface UseAdjustContractReturn {
  adjustContract: (subscriptionId: string, newEndDate: string) => Promise<Subscription>
  isAdjusting: boolean
  error: string | null
}

export function useAdjustContract(): UseAdjustContractReturn {
  const [isAdjusting, setIsAdjusting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const adjustContract = useCallback(async (subscriptionId: string, newEndDate: string): Promise<Subscription> => {
    setIsAdjusting(true)
    setError(null)
    try {
      const response = await api.post<Subscription>(`/subscriptions/${subscriptionId}/renew/`, {
        new_end_date: newEndDate,
      })
      return response.data
    } catch (err) {
      const axiosError = err as { response?: { data?: { error?: string } } }
      const message = axiosError.response?.data?.error || 'Failed to adjust contract'
      setError(message)
      throw err
    } finally {
      setIsAdjusting(false)
    }
  }, [])

  return { adjustContract, isAdjusting, error }
}

interface ChangeServiceTypeResponse {
  success: boolean
  service_type: 'retained' | 'headhunting'
  old_service_type: 'retained' | 'headhunting'
}

export interface PaymentRequiredResponse {
  payment_required: true
  invoice_id: string
  invoice_number: string
  termination_fee: string
  total_amount: string
  status: string
  message: string
}

interface ChangeServiceTypeOptions {
  termsDocumentSlug?: string
}

interface UseChangeServiceTypeReturn {
  changeServiceType: (companyId: string, serviceType: 'retained' | 'headhunting', options?: ChangeServiceTypeOptions) => Promise<ChangeServiceTypeResponse | PaymentRequiredResponse>
  isChanging: boolean
  error: string | null
  paymentRequired: PaymentRequiredResponse | null
  clearPaymentRequired: () => void
}

export function useChangeServiceType(): UseChangeServiceTypeReturn {
  const [isChanging, setIsChanging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentRequired, setPaymentRequired] = useState<PaymentRequiredResponse | null>(null)

  const changeServiceType = useCallback(async (
    companyId: string,
    serviceType: 'retained' | 'headhunting',
    options?: ChangeServiceTypeOptions
  ): Promise<ChangeServiceTypeResponse | PaymentRequiredResponse> => {
    setIsChanging(true)
    setError(null)
    setPaymentRequired(null)
    try {
      const response = await api.post<ChangeServiceTypeResponse>(
        `/companies/${companyId}/service-type/`,
        {
          service_type: serviceType,
          terms_document_slug: options?.termsDocumentSlug,
        }
      )
      return response.data
    } catch (err) {
      const axiosError = err as { response?: { status?: number; data?: { error?: string; payment_required?: boolean; invoice_id?: string; invoice_number?: string; termination_fee?: string; total_amount?: string; status?: string; message?: string } } }

      // Handle 402 Payment Required
      if (axiosError.response?.status === 402 && axiosError.response?.data?.payment_required) {
        const paymentData: PaymentRequiredResponse = {
          payment_required: true,
          invoice_id: axiosError.response.data.invoice_id || '',
          invoice_number: axiosError.response.data.invoice_number || '',
          termination_fee: axiosError.response.data.termination_fee || '0',
          total_amount: axiosError.response.data.total_amount || '0',
          status: axiosError.response.data.status || '',
          message: axiosError.response.data.message || 'Payment required',
        }
        setPaymentRequired(paymentData)
        return paymentData
      }

      const message = axiosError.response?.data?.error || 'Failed to change service type'
      setError(message)
      throw err
    } finally {
      setIsChanging(false)
    }
  }, [])

  const clearPaymentRequired = useCallback(() => {
    setPaymentRequired(null)
  }, [])

  return { changeServiceType, isChanging, error, paymentRequired, clearPaymentRequired }
}

interface UseCalculateTerminationFeeReturn {
  calculateFee: (subscriptionId: string) => Promise<TerminationFeeCalculation>
  feeCalculation: TerminationFeeCalculation | null
  isCalculating: boolean
  error: string | null
}

export function useCalculateTerminationFee(): UseCalculateTerminationFeeReturn {
  const [feeCalculation, setFeeCalculation] = useState<TerminationFeeCalculation | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const calculateFee = useCallback(async (subscriptionId: string): Promise<TerminationFeeCalculation> => {
    setIsCalculating(true)
    setError(null)
    try {
      const response = await api.post<TerminationFeeCalculation>(
        `/subscriptions/${subscriptionId}/calculate-termination-fee/`
      )
      setFeeCalculation(response.data)
      return response.data
    } catch (err) {
      const axiosError = err as { response?: { data?: { error?: string } } }
      const message = axiosError.response?.data?.error || 'Failed to calculate termination fee'
      setError(message)
      throw err
    } finally {
      setIsCalculating(false)
    }
  }, [])

  return { calculateFee, feeCalculation, isCalculating, error }
}

// =============================================================================
// Pricing Hooks
// =============================================================================

interface UseCompanyPricingReturn {
  pricing: CompanyPricing | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useCompanyPricing(companyId: string): UseCompanyPricingReturn {
  const [pricing, setPricing] = useState<CompanyPricing | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPricing = useCallback(async () => {
    if (!companyId) return

    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get<CompanyPricing>(`/companies/${companyId}/pricing/`)
      setPricing(response.data)
    } catch (err) {
      setError('Failed to load pricing')
      console.error('Error fetching pricing:', err)
    } finally {
      setIsLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    fetchPricing()
  }, [fetchPricing])

  return { pricing, isLoading, error, refetch: fetchPricing }
}

interface UseEffectivePricingReturn {
  pricing: EffectivePricing | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useEffectivePricing(companyId: string): UseEffectivePricingReturn {
  const [pricing, setPricing] = useState<EffectivePricing | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPricing = useCallback(async () => {
    if (!companyId) return

    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get<EffectivePricing>(`/companies/${companyId}/pricing/effective/`)
      setPricing(response.data)
    } catch (err) {
      setError('Failed to load effective pricing')
      console.error('Error fetching effective pricing:', err)
    } finally {
      setIsLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    fetchPricing()
  }, [fetchPricing])

  return { pricing, isLoading, error, refetch: fetchPricing }
}

interface UpdatePricingInput {
  monthly_retainer?: string | null
  placement_fee?: string | null
  csuite_placement_fee?: string | null
  effective_from?: string
}

interface UseUpdateCompanyPricingReturn {
  updatePricing: (companyId: string, data: UpdatePricingInput) => Promise<CompanyPricing>
  isUpdating: boolean
  error: string | null
}

export function useUpdateCompanyPricing(): UseUpdateCompanyPricingReturn {
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updatePricing = useCallback(
    async (companyId: string, data: UpdatePricingInput): Promise<CompanyPricing> => {
      setIsUpdating(true)
      setError(null)
      try {
        const response = await api.patch<CompanyPricing>(`/companies/${companyId}/pricing/update/`, data)
        return response.data
      } catch (err) {
        const axiosError = err as { response?: { data?: { error?: string } } }
        const message = axiosError.response?.data?.error || 'Failed to update pricing'
        setError(message)
        throw err
      } finally {
        setIsUpdating(false)
      }
    },
    []
  )

  return { updatePricing, isUpdating, error }
}

// =============================================================================
// Feature Override Hooks
// =============================================================================

interface UseCompanyFeatureOverridesReturn {
  features: FeatureWithOverride[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useCompanyFeatureOverrides(companyId: string): UseCompanyFeatureOverridesReturn {
  const [features, setFeatures] = useState<FeatureWithOverride[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchFeatures = useCallback(async () => {
    if (!companyId) return

    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get<FeatureWithOverride[]>(`/companies/${companyId}/features/`)
      setFeatures(response.data)
    } catch (err) {
      setError('Failed to load features')
      console.error('Error fetching features:', err)
    } finally {
      setIsLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    fetchFeatures()
  }, [fetchFeatures])

  return { features, isLoading, error, refetch: fetchFeatures }
}

interface UseUpdateFeatureOverrideReturn {
  updateFeatureOverride: (
    companyId: string,
    featureId: string,
    isEnabled: boolean | null
  ) => Promise<FeatureWithOverride>
  isUpdating: boolean
  error: string | null
}

export function useUpdateFeatureOverride(): UseUpdateFeatureOverrideReturn {
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateFeatureOverride = useCallback(
    async (companyId: string, featureId: string, isEnabled: boolean | null): Promise<FeatureWithOverride> => {
      setIsUpdating(true)
      setError(null)
      try {
        const response = await api.patch<FeatureWithOverride>(`/companies/${companyId}/features/${featureId}/`, {
          is_enabled: isEnabled,
        })
        return response.data
      } catch (err) {
        const axiosError = err as { response?: { data?: { error?: string } } }
        const message = axiosError.response?.data?.error || 'Failed to update feature override'
        setError(message)
        throw err
      } finally {
        setIsUpdating(false)
      }
    },
    []
  )

  return { updateFeatureOverride, isUpdating, error }
}

// =============================================================================
// Invoice Hooks
// =============================================================================

interface UseInvoicesOptions {
  companyId?: string
  status?: InvoiceStatus
}

interface UseInvoicesReturn {
  invoices: InvoiceListItem[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useInvoices(options: UseInvoicesOptions = {}): UseInvoicesReturn {
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchInvoices = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (options.companyId) params.append('company_id', options.companyId)
      if (options.status) params.append('status', options.status)
      const response = await api.get<InvoiceListItem[]>(`/invoices/?${params.toString()}`)
      setInvoices(response.data)
    } catch (err) {
      setError('Failed to load invoices')
      console.error('Error fetching invoices:', err)
    } finally {
      setIsLoading(false)
    }
  }, [options.companyId, options.status])

  useEffect(() => {
    fetchInvoices()
  }, [fetchInvoices])

  return { invoices, isLoading, error, refetch: fetchInvoices }
}

// Filtered invoices types
export type InvoiceTab = 'all' | 'paid' | 'pending' | 'overdue'
export type TimeRange = '7d' | '30d' | '90d' | '6m' | '1y' | 'all'
export type PlacementFilterType = 'regular' | 'csuite'
export type InvoiceStatusFilter = 'paid' | 'partially_paid' | 'pending' | 'overdue' | 'draft' | 'cancelled'

interface UseFilteredInvoicesOptions {
  tab?: InvoiceTab
  timeRange?: TimeRange
  dateFrom?: string
  dateTo?: string
  serviceType?: 'retained' | 'headhunting'
  placementType?: PlacementFilterType
  invoiceType?: InvoiceType
  invoiceStatus?: InvoiceStatusFilter
  enabled?: boolean // Allow disabling the query
}

interface UseFilteredInvoicesReturn {
  invoices: InvoiceListItem[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useFilteredInvoices(options: UseFilteredInvoicesOptions = {}): UseFilteredInvoicesReturn {
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const enabled = options.enabled !== false

  const fetchInvoices = useCallback(async () => {
    if (!enabled) {
      setInvoices([])
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (options.tab && options.tab !== 'all') params.append('tab', options.tab)
      if (options.timeRange) params.append('time_range', options.timeRange)
      if (options.dateFrom) params.append('date_from', options.dateFrom)
      if (options.dateTo) params.append('date_to', options.dateTo)
      if (options.serviceType) params.append('service_type', options.serviceType)
      if (options.placementType) params.append('placement_type', options.placementType)
      if (options.invoiceType) params.append('invoice_type', options.invoiceType)
      if (options.invoiceStatus) params.append('invoice_status', options.invoiceStatus)
      const response = await api.get<InvoiceListItem[]>(`/invoices/filtered/?${params.toString()}`)
      setInvoices(response.data)
    } catch (err) {
      setError('Failed to load invoices')
      console.error('Error fetching filtered invoices:', err)
    } finally {
      setIsLoading(false)
    }
  }, [
    enabled,
    options.tab,
    options.timeRange,
    options.dateFrom,
    options.dateTo,
    options.serviceType,
    options.placementType,
    options.invoiceType,
    options.invoiceStatus,
  ])

  useEffect(() => {
    fetchInvoices()
  }, [fetchInvoices])

  return { invoices, isLoading, error, refetch: fetchInvoices }
}

interface UseCompanyInvoicesReturn {
  invoices: InvoiceListItem[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useCompanyInvoices(companyId: string): UseCompanyInvoicesReturn {
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchInvoices = useCallback(async () => {
    if (!companyId) return

    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get<InvoiceListItem[]>(`/companies/${companyId}/invoices/`)
      setInvoices(response.data)
    } catch (err) {
      setError('Failed to load invoices')
      console.error('Error fetching invoices:', err)
    } finally {
      setIsLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    fetchInvoices()
  }, [fetchInvoices])

  return { invoices, isLoading, error, refetch: fetchInvoices }
}

interface UseInvoiceReturn {
  invoice: Invoice | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useInvoice(invoiceId: string): UseInvoiceReturn {
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchInvoice = useCallback(async () => {
    if (!invoiceId) return

    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get<Invoice>(`/invoices/${invoiceId}/`)
      setInvoice(response.data)
    } catch (err) {
      setError('Failed to load invoice')
      console.error('Error fetching invoice:', err)
    } finally {
      setIsLoading(false)
    }
  }, [invoiceId])

  useEffect(() => {
    fetchInvoice()
  }, [fetchInvoice])

  return { invoice, isLoading, error, refetch: fetchInvoice }
}

interface CreateInvoiceInput {
  company: string
  subscription?: string | null
  placement?: string | null
  invoice_type: InvoiceType
  billing_mode?: BillingMode
  invoice_date: string
  due_date: string
  billing_period_start?: string | null
  billing_period_end?: string | null
  subtotal: string
  vat_rate?: string
  external_invoice_number?: string
  external_system?: string
  description?: string
  internal_notes?: string
  line_items?: Array<{
    description: string
    quantity?: string
    unit_price: string
  }>
}

interface UseCreateInvoiceReturn {
  createInvoice: (data: CreateInvoiceInput) => Promise<Invoice>
  isCreating: boolean
  error: string | null
}

export function useCreateInvoice(): UseCreateInvoiceReturn {
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createInvoice = useCallback(async (data: CreateInvoiceInput): Promise<Invoice> => {
    setIsCreating(true)
    setError(null)
    try {
      const response = await api.post<Invoice>('/invoices/create/', data)
      return response.data
    } catch (err) {
      const axiosError = err as { response?: { data?: { error?: string } } }
      const message = axiosError.response?.data?.error || 'Failed to create invoice'
      setError(message)
      throw err
    } finally {
      setIsCreating(false)
    }
  }, [])

  return { createInvoice, isCreating, error }
}

interface UseGenerateRetainerInvoiceReturn {
  generateRetainerInvoice: (companyId: string) => Promise<Invoice>
  isGenerating: boolean
  error: string | null
}

export function useGenerateRetainerInvoice(): UseGenerateRetainerInvoiceReturn {
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateRetainerInvoice = useCallback(async (companyId: string): Promise<Invoice> => {
    setIsGenerating(true)
    setError(null)
    try {
      const response = await api.post<Invoice>(`/companies/${companyId}/invoices/generate-retainer/`)
      return response.data
    } catch (err) {
      const axiosError = err as { response?: { data?: { error?: string } } }
      const message = axiosError.response?.data?.error || 'Failed to generate retainer invoice'
      setError(message)
      throw err
    } finally {
      setIsGenerating(false)
    }
  }, [])

  return { generateRetainerInvoice, isGenerating, error }
}

interface UseSendInvoiceReturn {
  sendInvoice: (invoiceId: string) => Promise<Invoice>
  isSending: boolean
  error: string | null
}

export function useSendInvoice(): UseSendInvoiceReturn {
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendInvoice = useCallback(async (invoiceId: string): Promise<Invoice> => {
    setIsSending(true)
    setError(null)
    try {
      const response = await api.post<Invoice>(`/invoices/${invoiceId}/send/`)
      return response.data
    } catch (err) {
      const axiosError = err as { response?: { data?: { error?: string } } }
      const message = axiosError.response?.data?.error || 'Failed to send invoice'
      setError(message)
      throw err
    } finally {
      setIsSending(false)
    }
  }, [])

  return { sendInvoice, isSending, error }
}

interface UseCancelInvoiceReturn {
  cancelInvoice: (invoiceId: string) => Promise<Invoice>
  isCancelling: boolean
  error: string | null
}

export function useCancelInvoice(): UseCancelInvoiceReturn {
  const [isCancelling, setIsCancelling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cancelInvoice = useCallback(async (invoiceId: string): Promise<Invoice> => {
    setIsCancelling(true)
    setError(null)
    try {
      const response = await api.post<Invoice>(`/invoices/${invoiceId}/cancel/`)
      return response.data
    } catch (err) {
      const axiosError = err as { response?: { data?: { error?: string } } }
      const message = axiosError.response?.data?.error || 'Failed to cancel invoice'
      setError(message)
      throw err
    } finally {
      setIsCancelling(false)
    }
  }, [])

  return { cancelInvoice, isCancelling, error }
}

// =============================================================================
// Payment Hooks
// =============================================================================

interface UseInvoicePaymentsReturn {
  payments: Payment[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useInvoicePayments(invoiceId: string): UseInvoicePaymentsReturn {
  const [payments, setPayments] = useState<Payment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPayments = useCallback(async () => {
    if (!invoiceId) return

    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get<Payment[]>(`/invoices/${invoiceId}/payments/`)
      setPayments(response.data)
    } catch (err) {
      setError('Failed to load payments')
      console.error('Error fetching payments:', err)
    } finally {
      setIsLoading(false)
    }
  }, [invoiceId])

  useEffect(() => {
    fetchPayments()
  }, [fetchPayments])

  return { payments, isLoading, error, refetch: fetchPayments }
}

interface RecordPaymentInput {
  amount: string
  payment_date: string
  payment_method: PaymentMethod
  reference_number?: string
  notes?: string
}

interface UseRecordPaymentReturn {
  recordPayment: (invoiceId: string, data: RecordPaymentInput) => Promise<Payment>
  isRecording: boolean
  error: string | null
}

export function useRecordPayment(): UseRecordPaymentReturn {
  const [isRecording, setIsRecording] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const recordPayment = useCallback(
    async (invoiceId: string, data: RecordPaymentInput): Promise<Payment> => {
      setIsRecording(true)
      setError(null)
      try {
        const response = await api.post<Payment>(`/invoices/${invoiceId}/payments/record/`, data)
        return response.data
      } catch (err) {
        const axiosError = err as { response?: { data?: { error?: string } } }
        const message = axiosError.response?.data?.error || 'Failed to record payment'
        setError(message)
        throw err
      } finally {
        setIsRecording(false)
      }
    },
    []
  )

  return { recordPayment, isRecording, error }
}

interface UseDeletePaymentReturn {
  deletePayment: (paymentId: string) => Promise<void>
  isDeleting: boolean
  error: string | null
}

export function useDeletePayment(): UseDeletePaymentReturn {
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deletePayment = useCallback(async (paymentId: string): Promise<void> => {
    setIsDeleting(true)
    setError(null)
    try {
      await api.delete(`/payments/${paymentId}/delete/`)
    } catch (err) {
      const axiosError = err as { response?: { data?: { error?: string } } }
      const message = axiosError.response?.data?.error || 'Failed to delete payment'
      setError(message)
      throw err
    } finally {
      setIsDeleting(false)
    }
  }, [])

  return { deletePayment, isDeleting, error }
}

// =============================================================================
// Activity & Dashboard Hooks
// =============================================================================

interface UseSubscriptionActivityReturn {
  activities: SubscriptionActivity[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useSubscriptionActivity(subscriptionId: string): UseSubscriptionActivityReturn {
  const [activities, setActivities] = useState<SubscriptionActivity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchActivities = useCallback(async () => {
    if (!subscriptionId) return

    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get<SubscriptionActivity[]>(`/subscriptions/${subscriptionId}/activity/`)
      setActivities(response.data)
    } catch (err) {
      setError('Failed to load activity log')
      console.error('Error fetching activity:', err)
    } finally {
      setIsLoading(false)
    }
  }, [subscriptionId])

  useEffect(() => {
    fetchActivities()
  }, [fetchActivities])

  return { activities, isLoading, error, refetch: fetchActivities }
}

interface UseCompanyActivityReturn {
  activities: SubscriptionActivity[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useCompanyActivity(companyId: string, activityType?: ActivityType): UseCompanyActivityReturn {
  const [activities, setActivities] = useState<SubscriptionActivity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchActivities = useCallback(async () => {
    if (!companyId) return

    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (activityType) params.append('activity_type', activityType)
      const response = await api.get<SubscriptionActivity[]>(
        `/companies/${companyId}/activity/?${params.toString()}`
      )
      setActivities(response.data)
    } catch (err) {
      setError('Failed to load activity log')
      console.error('Error fetching activity:', err)
    } finally {
      setIsLoading(false)
    }
  }, [companyId, activityType])

  useEffect(() => {
    fetchActivities()
  }, [fetchActivities])

  return { activities, isLoading, error, refetch: fetchActivities }
}

interface UseSubscriptionAlertsReturn {
  alerts: SubscriptionAlert[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useSubscriptionAlerts(): UseSubscriptionAlertsReturn {
  const [alerts, setAlerts] = useState<SubscriptionAlert[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAlerts = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get<SubscriptionAlert[]>('/dashboard/alerts/')
      setAlerts(response.data)
    } catch (err) {
      setError('Failed to load alerts')
      console.error('Error fetching alerts:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAlerts()
  }, [fetchAlerts])

  return { alerts, isLoading, error, refetch: fetchAlerts }
}

interface UseSubscriptionSummaryReturn {
  summary: SubscriptionSummary | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useSubscriptionSummary(): UseSubscriptionSummaryReturn {
  const [summary, setSummary] = useState<SubscriptionSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSummary = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get<SubscriptionSummary>('/dashboard/summary/')
      setSummary(response.data)
    } catch (err) {
      setError('Failed to load summary')
      console.error('Error fetching summary:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary])

  return { summary, isLoading, error, refetch: fetchSummary }
}

// =============================================================================
// Placement (Application) Hooks for Invoice Creation
// =============================================================================

export interface PlacementForInvoice {
  id: string
  candidate_id: string
  candidate_name: string
  candidate_email: string
  job_id: string
  job_title: string
  is_csuite: boolean
  offer_currency: string
  offer_accepted_at: string | null
  company_id: string
  company_name: string
  has_placement_invoice: boolean
  // Full offer details
  annual_salary: number | null
  benefits: PlacementBenefit[]
  equity: PlacementEquity | null
  total_benefits_cost: number
  year_1_equity_value: number
  total_cost_to_company: number
}

interface UseCompanyPlacementsReturn {
  placements: PlacementForInvoice[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Fetch applications with offer_accepted status for a company,
 * suitable for creating placement invoices.
 */
export function useCompanyPlacements(companyId: string): UseCompanyPlacementsReturn {
  const [placements, setPlacements] = useState<PlacementForInvoice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPlacements = useCallback(async () => {
    if (!companyId) return

    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get<PlacementForInvoice[]>(
        `/companies/${companyId}/placements/`
      )
      setPlacements(response.data)
    } catch (err) {
      setError('Failed to load placements')
      console.error('Error fetching placements:', err)
    } finally {
      setIsLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    fetchPlacements()
  }, [fetchPlacements])

  return { placements, isLoading, error, refetch: fetchPlacements }
}
