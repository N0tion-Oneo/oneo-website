import { useState, useCallback, useEffect } from 'react'
import api from '@/services/api'

// =============================================================================
// Types
// =============================================================================

export type BottleneckEntityType = 'lead' | 'company' | 'candidate' | 'application' | 'stage_instance' | 'task'
export type BottleneckType = 'threshold' | 'count' | 'percentage' | 'duration' | 'overdue'

export interface DetectionConfig {
  type: 'stage_duration' | 'last_activity' | 'overdue' | 'count_in_state' | 'custom'
  threshold_days?: number
  threshold_count?: number
  stage_field?: string
  activity_field?: string
  exclude_terminal?: boolean
  field?: string
  value?: string | number
  filters?: FilterCondition[]
}

export interface FilterCondition {
  field: string
  operator: 'equals' | 'not_equals' | 'contains' | 'gt' | 'gte' | 'lt' | 'lte' | 'is_empty' | 'is_not_empty' | 'in' | 'not_in'
  value: string | string[] | number
}

export interface NotificationConfig {
  recipient_type: 'assigned_user' | 'all_admins' | 'all_recruiters' | 'entity_owner' | 'specific_users'
  channel: 'email' | 'in_app' | 'both'
  title_template: string
  body_template: string
}

export interface TaskConfig {
  title_template: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  due_days: number
  assign_to: 'entity_owner' | 'entity_creator' | 'specific_user'
}

export type DetectionSeverity = 'warning' | 'critical'

export interface BottleneckRule {
  id: string
  name: string
  description: string
  entity_type: BottleneckEntityType
  entity_type_display: string
  bottleneck_type: BottleneckType
  bottleneck_type_display: string
  detection_config: DetectionConfig
  filter_conditions: FilterCondition[]
  send_notification: boolean
  notification_config: NotificationConfig
  create_task: boolean
  task_config: TaskConfig
  cooldown_hours: number
  enable_warnings: boolean
  warning_threshold_percentage: number
  is_active: boolean
  run_on_schedule: boolean
  schedule_interval_minutes: number
  schedule_display: string
  next_run_at: string | null
  last_run_at: string | null
  total_detections: number
  total_notifications_sent: number
  total_tasks_created: number
  created_by: number | null
  created_by_name: string | null
  created_at: string
  updated_at: string
}

export interface BottleneckRuleCreateInput {
  name: string
  description?: string
  entity_type: BottleneckEntityType
  bottleneck_type?: BottleneckType
  detection_config: DetectionConfig
  filter_conditions?: FilterCondition[]
  send_notification?: boolean
  notification_config?: Partial<NotificationConfig>
  create_task?: boolean
  task_config?: Partial<TaskConfig>
  cooldown_hours?: number
  enable_warnings?: boolean
  warning_threshold_percentage?: number
  is_active?: boolean
  run_on_schedule?: boolean
  schedule_interval_minutes?: number
}

export interface BottleneckRuleUpdateInput {
  name?: string
  description?: string
  entity_type?: BottleneckEntityType
  bottleneck_type?: BottleneckType
  detection_config?: DetectionConfig
  filter_conditions?: FilterCondition[]
  send_notification?: boolean
  notification_config?: Partial<NotificationConfig>
  create_task?: boolean
  task_config?: Partial<TaskConfig>
  cooldown_hours?: number
  enable_warnings?: boolean
  warning_threshold_percentage?: number
  is_active?: boolean
  run_on_schedule?: boolean
  schedule_interval_minutes?: number
}

export interface BottleneckQuickUpdateInput {
  threshold_days?: number
  threshold_count?: number
  is_active?: boolean
}

export interface BottleneckDetection {
  id: string
  rule: string
  rule_name: string
  entity_type: BottleneckEntityType
  entity_id: string
  entity_name: string
  severity: DetectionSeverity
  severity_display: string
  current_value: number | null
  threshold_value: number | null
  projected_breach_at: string | null
  detection_data: Record<string, unknown>
  notification_sent: boolean
  notification: string | null
  task_created: boolean
  task: string | null
  is_resolved: boolean
  resolved_at: string | null
  resolved_by: number | null
  resolved_by_name: string | null
  detected_at: string
}

export interface BottleneckAnalyticsSummary {
  total_rules: number
  active_rules: number
  total_detections: number
  unresolved_detections: number
  detections_today: number
  notifications_sent_today: number
  tasks_created_today: number
  by_entity_type: Array<{ entity_type: string; count: number }>
}

export interface EntityTypeOption {
  value: BottleneckEntityType
  label: string
}

export interface BottleneckTypeOption {
  value: BottleneckType
  label: string
}

export interface FieldOperator {
  value: string
  label: string
}

export interface FieldChoice {
  value: string
  label: string
}

export interface ModelField {
  field: string
  label: string
  type: 'stage' | 'datetime' | 'date' | 'boolean' | 'choice' | 'string' | 'number'
  operators?: FieldOperator[]
  choices?: FieldChoice[]
}

export interface OnboardingStage {
  id: number
  name: string
  color: string
  is_terminal: boolean
  order: number
}

export interface RuleExecutionResult {
  success: boolean
  rule_id: string
  rule_name: string
  result?: {
    scanned: number
    detected: number
    notifications: number
    tasks: number
  }
  error?: string
}

export interface RulePreviewResult {
  rule_id: string
  rule_name: string
  match_count: number
  matches: Array<{
    id: string
    entity_type: string
    name?: string
    stage?: string
    status?: string
    created_at?: string
    due_date?: string
    priority?: string
    severity?: DetectionSeverity
    current_value?: number
    threshold_value?: number
    projected_breach_at?: string
  }>
}

export type ExecutionTrigger = 'scheduled' | 'manual' | 'api'

export interface RuleExecution {
  id: string
  rule: string
  rule_name: string
  trigger: ExecutionTrigger
  trigger_display: string
  triggered_by: number | null
  triggered_by_name: string | null
  started_at: string
  completed_at: string | null
  duration_ms: number | null
  duration_display: string
  entities_scanned: number
  entities_matched: number
  entities_in_cooldown: number
  detections_created: number
  notifications_sent: number
  tasks_created: number
  matched_entity_ids?: string[]
  rule_config_snapshot?: {
    detection_config: DetectionConfig
    filter_conditions: FilterCondition[]
    cooldown_hours: number
  }
  success: boolean
  error_message: string
}

export interface RuleExecutionsResponse {
  rule_id: string
  rule_name: string
  total_count: number
  executions: RuleExecution[]
}

export interface EntityDetail {
  id: string
  name: string
  email?: string
  stage?: string
  candidate_name?: string
  job_title?: string
  status?: string
  assigned_to?: string
  priority?: string
  due_date?: string
  stage_name?: string
  detection?: {
    id: string
    severity: 'warning' | 'critical'
    current_value: number | null
    threshold_value: number | null
    detection_data: Record<string, unknown>
    notification_sent: boolean
    task_created: boolean
  }
}

export interface ExecutionComparison {
  current: RuleExecution
  previous: RuleExecution | null
  new_entities: EntityDetail[]
  resolved_entities: EntityDetail[]
  persistent_entities: EntityDetail[]
  summary: {
    new_count: number
    resolved_count: number
    persistent_count: number
    trend: 'increasing' | 'decreasing' | 'stable'
    net_change: number
  }
  rule_config: Record<string, unknown>
  config_changed: boolean
  recent_trend: Array<{
    started_at: string
    entities_matched: number
  }>
  detections_summary: {
    total: number
    with_notification: number
    with_task: number
    critical: number
    warning: number
  }
}

// =============================================================================
// useBottleneckRules - List rules with optional filters
// =============================================================================

interface UseBottleneckRulesReturn {
  rules: BottleneckRule[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

interface RulesListParams {
  entity_type?: BottleneckEntityType
  is_active?: boolean
}

export function useBottleneckRules(params?: RulesListParams): UseBottleneckRulesReturn {
  const [rules, setRules] = useState<BottleneckRule[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRules = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const queryParams = new URLSearchParams()
      if (params?.entity_type) queryParams.set('entity_type', params.entity_type)
      if (params?.is_active !== undefined) queryParams.set('is_active', String(params.is_active))

      const url = `/bottlenecks/rules/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
      const response = await api.get<BottleneckRule[]>(url)
      setRules(response.data)
    } catch (err) {
      console.error('Error fetching bottleneck rules:', err)
      setError('Failed to fetch bottleneck rules')
    } finally {
      setIsLoading(false)
    }
  }, [params?.entity_type, params?.is_active])

  useEffect(() => {
    fetchRules()
  }, [fetchRules])

  return { rules, isLoading, error, refetch: fetchRules }
}

// =============================================================================
// useBottleneckRulesByEntity - Rules for a specific entity type
// =============================================================================

export function useBottleneckRulesByEntity(entityType: BottleneckEntityType | undefined): UseBottleneckRulesReturn {
  const [rules, setRules] = useState<BottleneckRule[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRules = useCallback(async () => {
    if (!entityType) {
      setRules([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get<BottleneckRule[]>(`/bottlenecks/rules/entity/${entityType}/`)
      setRules(response.data)
    } catch (err) {
      console.error('Error fetching bottleneck rules by entity:', err)
      setError('Failed to fetch bottleneck rules')
    } finally {
      setIsLoading(false)
    }
  }, [entityType])

  useEffect(() => {
    fetchRules()
  }, [fetchRules])

  return { rules, isLoading, error, refetch: fetchRules }
}

// =============================================================================
// useBottleneckRule - Single rule
// =============================================================================

interface UseBottleneckRuleReturn {
  rule: BottleneckRule | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useBottleneckRule(ruleId: string | undefined): UseBottleneckRuleReturn {
  const [rule, setRule] = useState<BottleneckRule | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRule = useCallback(async () => {
    if (!ruleId) {
      setRule(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get<BottleneckRule>(`/bottlenecks/rules/${ruleId}/`)
      setRule(response.data)
    } catch (err) {
      console.error('Error fetching bottleneck rule:', err)
      setError('Failed to fetch bottleneck rule')
    } finally {
      setIsLoading(false)
    }
  }, [ruleId])

  useEffect(() => {
    fetchRule()
  }, [fetchRule])

  return { rule, isLoading, error, refetch: fetchRule }
}

// =============================================================================
// useCreateBottleneckRule
// =============================================================================

interface UseCreateBottleneckRuleReturn {
  createRule: (data: BottleneckRuleCreateInput) => Promise<BottleneckRule>
  isCreating: boolean
  error: string | null
}

export function useCreateBottleneckRule(): UseCreateBottleneckRuleReturn {
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createRule = useCallback(async (data: BottleneckRuleCreateInput): Promise<BottleneckRule> => {
    setIsCreating(true)
    setError(null)
    try {
      const response = await api.post<BottleneckRule>('/bottlenecks/rules/', data)
      return response.data
    } catch (err) {
      const axiosError = err as { response?: { data?: { error?: string } } }
      const message = axiosError.response?.data?.error || 'Failed to create rule'
      setError(message)
      throw err
    } finally {
      setIsCreating(false)
    }
  }, [])

  return { createRule, isCreating, error }
}

// =============================================================================
// useUpdateBottleneckRule
// =============================================================================

interface UseUpdateBottleneckRuleReturn {
  updateRule: (ruleId: string, data: BottleneckRuleUpdateInput) => Promise<BottleneckRule>
  isUpdating: boolean
  error: string | null
}

export function useUpdateBottleneckRule(): UseUpdateBottleneckRuleReturn {
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateRule = useCallback(async (ruleId: string, data: BottleneckRuleUpdateInput): Promise<BottleneckRule> => {
    setIsUpdating(true)
    setError(null)
    try {
      const response = await api.patch<BottleneckRule>(`/bottlenecks/rules/${ruleId}/`, data)
      return response.data
    } catch (err) {
      const axiosError = err as { response?: { data?: { error?: string } } }
      const message = axiosError.response?.data?.error || 'Failed to update rule'
      setError(message)
      throw err
    } finally {
      setIsUpdating(false)
    }
  }, [])

  return { updateRule, isUpdating, error }
}

// =============================================================================
// useQuickUpdateBottleneckRule - For inline threshold editing
// =============================================================================

interface UseQuickUpdateBottleneckRuleReturn {
  quickUpdate: (ruleId: string, data: BottleneckQuickUpdateInput) => Promise<BottleneckRule>
  isUpdating: boolean
  error: string | null
}

export function useQuickUpdateBottleneckRule(): UseQuickUpdateBottleneckRuleReturn {
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const quickUpdate = useCallback(async (ruleId: string, data: BottleneckQuickUpdateInput): Promise<BottleneckRule> => {
    setIsUpdating(true)
    setError(null)
    try {
      const response = await api.patch<BottleneckRule>(`/bottlenecks/rules/${ruleId}/quick-update/`, data)
      return response.data
    } catch (err) {
      const axiosError = err as { response?: { data?: { error?: string } } }
      const message = axiosError.response?.data?.error || 'Failed to update threshold'
      setError(message)
      throw err
    } finally {
      setIsUpdating(false)
    }
  }, [])

  return { quickUpdate, isUpdating, error }
}

// =============================================================================
// useDeleteBottleneckRule
// =============================================================================

interface UseDeleteBottleneckRuleReturn {
  deleteRule: (ruleId: string) => Promise<void>
  isDeleting: boolean
  error: string | null
}

export function useDeleteBottleneckRule(): UseDeleteBottleneckRuleReturn {
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deleteRule = useCallback(async (ruleId: string): Promise<void> => {
    setIsDeleting(true)
    setError(null)
    try {
      await api.delete(`/bottlenecks/rules/${ruleId}/`)
    } catch (err) {
      const axiosError = err as { response?: { data?: { error?: string } } }
      const message = axiosError.response?.data?.error || 'Failed to delete rule'
      setError(message)
      throw err
    } finally {
      setIsDeleting(false)
    }
  }, [])

  return { deleteRule, isDeleting, error }
}

// =============================================================================
// useRunBottleneckRule - Manually trigger a rule
// =============================================================================

interface UseRunBottleneckRuleReturn {
  runRule: (ruleId: string) => Promise<RuleExecutionResult>
  isRunning: boolean
  error: string | null
}

export function useRunBottleneckRule(): UseRunBottleneckRuleReturn {
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runRule = useCallback(async (ruleId: string): Promise<RuleExecutionResult> => {
    setIsRunning(true)
    setError(null)
    try {
      const response = await api.post<RuleExecutionResult>(`/bottlenecks/rules/${ruleId}/run/`)
      return response.data
    } catch (err) {
      const axiosError = err as { response?: { data?: { error?: string } } }
      const message = axiosError.response?.data?.error || 'Failed to run rule'
      setError(message)
      throw err
    } finally {
      setIsRunning(false)
    }
  }, [])

  return { runRule, isRunning, error }
}

// =============================================================================
// useRunAllBottleneckRules - Manually trigger all active rules
// =============================================================================

export interface RunAllRulesResult {
  success: boolean
  totals: {
    rules_executed: number
    rules_failed: number
    scanned: number
    detected: number
    warnings: number
    critical: number
    notifications: number
    tasks: number
  }
  rules_with_detections: Array<{
    rule_id: string
    rule_name: string
    detected?: number
    warnings?: number
    critical?: number
    notifications?: number
    tasks?: number
    error?: string
  }>
}

interface UseRunAllBottleneckRulesReturn {
  runAllRules: () => Promise<RunAllRulesResult>
  isRunning: boolean
  error: string | null
}

export function useRunAllBottleneckRules(): UseRunAllBottleneckRulesReturn {
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runAllRules = useCallback(async (): Promise<RunAllRulesResult> => {
    setIsRunning(true)
    setError(null)
    try {
      const response = await api.post<RunAllRulesResult>('/bottlenecks/rules/run-all/')
      return response.data
    } catch (err) {
      const axiosError = err as { response?: { data?: { error?: string } } }
      const message = axiosError.response?.data?.error || 'Failed to run all rules'
      setError(message)
      throw err
    } finally {
      setIsRunning(false)
    }
  }, [])

  return { runAllRules, isRunning, error }
}

// =============================================================================
// usePreviewBottleneckRule - Preview matching entities (existing rule)
// =============================================================================

interface UsePreviewBottleneckRuleReturn {
  previewRule: (ruleId: string) => Promise<RulePreviewResult>
  isPreviewing: boolean
  error: string | null
}

export function usePreviewBottleneckRule(): UsePreviewBottleneckRuleReturn {
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const previewRule = useCallback(async (ruleId: string): Promise<RulePreviewResult> => {
    setIsPreviewing(true)
    setError(null)
    try {
      const response = await api.get<RulePreviewResult>(`/bottlenecks/rules/${ruleId}/preview/`)
      return response.data
    } catch (err) {
      const axiosError = err as { response?: { data?: { error?: string } } }
      const message = axiosError.response?.data?.error || 'Failed to preview rule'
      setError(message)
      throw err
    } finally {
      setIsPreviewing(false)
    }
  }, [])

  return { previewRule, isPreviewing, error }
}

// =============================================================================
// usePreviewBottleneckRuleAdhoc - Preview matching entities from form data
// =============================================================================

export interface RulePreviewInput {
  name?: string
  entity_type: BottleneckEntityType
  detection_config: DetectionConfig
  filter_conditions: FilterCondition[]
  cooldown_hours?: number
}

interface UsePreviewBottleneckRuleAdhocReturn {
  previewRuleAdhoc: (data: RulePreviewInput) => Promise<RulePreviewResult>
  isPreviewing: boolean
  error: string | null
}

export function usePreviewBottleneckRuleAdhoc(): UsePreviewBottleneckRuleAdhocReturn {
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const previewRuleAdhoc = useCallback(async (data: RulePreviewInput): Promise<RulePreviewResult> => {
    setIsPreviewing(true)
    setError(null)
    try {
      const response = await api.post<RulePreviewResult>('/bottlenecks/rules/preview/', data)
      return response.data
    } catch (err) {
      const axiosError = err as { response?: { data?: { error?: string } } }
      const message = axiosError.response?.data?.error || 'Failed to preview rule'
      setError(message)
      throw err
    } finally {
      setIsPreviewing(false)
    }
  }, [])

  return { previewRuleAdhoc, isPreviewing, error }
}

// =============================================================================
// useBottleneckDetections - List detections with pagination
// =============================================================================

interface DetectionsListParams {
  rule_id?: string
  entity_type?: BottleneckEntityType
  is_resolved?: boolean
  severity?: DetectionSeverity
  page?: number
  pageSize?: number
}

interface PaginatedDetectionsResponse {
  results: BottleneckDetection[]
  count: number
  num_pages: number
  has_next: boolean
  has_previous: boolean
  severity_counts: {
    critical: number
    warning: number
  }
}

interface UseBottleneckDetectionsReturn {
  detections: BottleneckDetection[]
  count: number
  numPages: number
  hasNext: boolean
  hasPrevious: boolean
  severityCounts: {
    critical: number
    warning: number
  }
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useBottleneckDetections(params?: DetectionsListParams): UseBottleneckDetectionsReturn {
  const [detections, setDetections] = useState<BottleneckDetection[]>([])
  const [count, setCount] = useState(0)
  const [numPages, setNumPages] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [hasPrevious, setHasPrevious] = useState(false)
  const [severityCounts, setSeverityCounts] = useState<{ critical: number; warning: number }>({ critical: 0, warning: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDetections = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const queryParams = new URLSearchParams()
      if (params?.rule_id) queryParams.set('rule_id', params.rule_id)
      if (params?.entity_type) queryParams.set('entity_type', params.entity_type)
      if (params?.is_resolved !== undefined) queryParams.set('is_resolved', String(params.is_resolved))
      if (params?.severity) queryParams.set('severity', params.severity)
      if (params?.page) queryParams.set('page', String(params.page))
      if (params?.pageSize) queryParams.set('page_size', String(params.pageSize))

      const url = `/bottlenecks/detections/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
      const response = await api.get<PaginatedDetectionsResponse>(url)
      setDetections(response.data.results)
      setCount(response.data.count)
      setNumPages(response.data.num_pages)
      setHasNext(response.data.has_next)
      setHasPrevious(response.data.has_previous)
      setSeverityCounts(response.data.severity_counts || { critical: 0, warning: 0 })
    } catch (err) {
      console.error('Error fetching bottleneck detections:', err)
      setError('Failed to fetch detections')
    } finally {
      setIsLoading(false)
    }
  }, [params?.rule_id, params?.entity_type, params?.is_resolved, params?.severity, params?.page, params?.pageSize])

  useEffect(() => {
    fetchDetections()
  }, [fetchDetections])

  return { detections, count, numPages, hasNext, hasPrevious, severityCounts, isLoading, error, refetch: fetchDetections }
}

// =============================================================================
// useResolveDetection
// =============================================================================

interface UseResolveDetectionReturn {
  resolveDetection: (detectionId: string) => Promise<BottleneckDetection>
  isResolving: boolean
  error: string | null
}

export function useResolveDetection(): UseResolveDetectionReturn {
  const [isResolving, setIsResolving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resolveDetection = useCallback(async (detectionId: string): Promise<BottleneckDetection> => {
    setIsResolving(true)
    setError(null)
    try {
      const response = await api.post<BottleneckDetection>(`/bottlenecks/detections/${detectionId}/resolve/`)
      return response.data
    } catch (err) {
      const axiosError = err as { response?: { data?: { error?: string } } }
      const message = axiosError.response?.data?.error || 'Failed to resolve detection'
      setError(message)
      throw err
    } finally {
      setIsResolving(false)
    }
  }, [])

  return { resolveDetection, isResolving, error }
}

// =============================================================================
// useBottleneckAnalytics - Summary statistics
// =============================================================================

interface UseBottleneckAnalyticsReturn {
  summary: BottleneckAnalyticsSummary | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useBottleneckAnalytics(): UseBottleneckAnalyticsReturn {
  const [summary, setSummary] = useState<BottleneckAnalyticsSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSummary = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get<BottleneckAnalyticsSummary>('/bottlenecks/analytics/summary/')
      setSummary(response.data)
    } catch (err) {
      console.error('Error fetching bottleneck analytics:', err)
      setError('Failed to fetch analytics')
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
// useBottleneckModels - Available entity types and bottleneck types
// =============================================================================

interface UseBottleneckModelsReturn {
  entityTypes: EntityTypeOption[]
  bottleneckTypes: BottleneckTypeOption[]
  isLoading: boolean
  error: string | null
}

export function useBottleneckModels(): UseBottleneckModelsReturn {
  const [entityTypes, setEntityTypes] = useState<EntityTypeOption[]>([])
  const [bottleneckTypes, setBottleneckTypes] = useState<BottleneckTypeOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchModels = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await api.get<{ entity_types: EntityTypeOption[]; bottleneck_types: BottleneckTypeOption[] }>(
          '/bottlenecks/models/'
        )
        setEntityTypes(response.data.entity_types)
        setBottleneckTypes(response.data.bottleneck_types)
      } catch (err) {
        console.error('Error fetching bottleneck models:', err)
        setError('Failed to fetch model options')
      } finally {
        setIsLoading(false)
      }
    }

    fetchModels()
  }, [])

  return { entityTypes, bottleneckTypes, isLoading, error }
}

// =============================================================================
// useModelFields - Fields for a specific entity type
// =============================================================================

interface UseModelFieldsReturn {
  fields: ModelField[]
  isLoading: boolean
  error: string | null
}

export function useBottleneckModelFields(entityType: BottleneckEntityType | undefined): UseModelFieldsReturn {
  const [fields, setFields] = useState<ModelField[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!entityType) {
      setFields([])
      setIsLoading(false)
      return
    }

    const fetchFields = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await api.get<{ fields: ModelField[] }>(`/bottlenecks/models/${entityType}/fields/`)
        setFields(response.data.fields)
      } catch (err) {
        console.error('Error fetching model fields:', err)
        setError('Failed to fetch fields')
      } finally {
        setIsLoading(false)
      }
    }

    fetchFields()
  }, [entityType])

  return { fields, isLoading, error }
}

// =============================================================================
// useAvailableStages - Onboarding stages for entity type
// =============================================================================

interface UseAvailableStagesReturn {
  stages: OnboardingStage[]
  isLoading: boolean
  error: string | null
}

export function useAvailableStages(entityType: BottleneckEntityType | undefined): UseAvailableStagesReturn {
  const [stages, setStages] = useState<OnboardingStage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!entityType) {
      setStages([])
      setIsLoading(false)
      return
    }

    const fetchStages = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await api.get<{ stages: OnboardingStage[] }>(`/bottlenecks/models/${entityType}/stages/`)
        setStages(response.data.stages)
      } catch (err) {
        console.error('Error fetching available stages:', err)
        setError('Failed to fetch stages')
      } finally {
        setIsLoading(false)
      }
    }

    fetchStages()
  }, [entityType])

  return { stages, isLoading, error }
}

// =============================================================================
// Helper function to get threshold from rule config
// =============================================================================

export function getThresholdFromRule(rule: BottleneckRule): number {
  const config = rule.detection_config
  return config.threshold_days ?? config.threshold_count ?? 7
}

// =============================================================================
// useRuleExecutions - List execution history for a rule
// =============================================================================

interface UseRuleExecutionsReturn {
  executions: RuleExecution[]
  totalCount: number
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  loadMore: () => Promise<void>
  hasMore: boolean
}

export function useRuleExecutions(ruleId: string | undefined, limit = 20): UseRuleExecutionsReturn {
  const [executions, setExecutions] = useState<RuleExecution[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [offset, setOffset] = useState(0)

  const fetchExecutions = useCallback(async (reset = true) => {
    if (!ruleId) return

    setIsLoading(true)
    setError(null)
    try {
      const currentOffset = reset ? 0 : offset
      const response = await api.get<RuleExecutionsResponse>(
        `/bottlenecks/rules/${ruleId}/executions/?limit=${limit}&offset=${currentOffset}`
      )
      if (reset) {
        setExecutions(response.data.executions)
        setOffset(limit)
      } else {
        setExecutions(prev => [...prev, ...response.data.executions])
        setOffset(currentOffset + limit)
      }
      setTotalCount(response.data.total_count)
    } catch (err) {
      const axiosError = err as { response?: { data?: { error?: string } } }
      setError(axiosError.response?.data?.error || 'Failed to fetch executions')
    } finally {
      setIsLoading(false)
    }
  }, [ruleId, limit, offset])

  useEffect(() => {
    if (ruleId) {
      fetchExecutions(true)
    }
  }, [ruleId])

  const loadMore = useCallback(async () => {
    await fetchExecutions(false)
  }, [fetchExecutions])

  const refetch = useCallback(async () => {
    await fetchExecutions(true)
  }, [fetchExecutions])

  return {
    executions,
    totalCount,
    isLoading,
    error,
    refetch,
    loadMore,
    hasMore: executions.length < totalCount
  }
}

// =============================================================================
// useExecutionDetail - Get detailed execution info
// =============================================================================

interface UseExecutionDetailReturn {
  execution: RuleExecution | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useExecutionDetail(executionId: string | undefined): UseExecutionDetailReturn {
  const [execution, setExecution] = useState<RuleExecution | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchExecution = useCallback(async () => {
    if (!executionId) return

    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get<RuleExecution>(`/bottlenecks/executions/${executionId}/`)
      setExecution(response.data)
    } catch (err) {
      const axiosError = err as { response?: { data?: { error?: string } } }
      setError(axiosError.response?.data?.error || 'Failed to fetch execution')
    } finally {
      setIsLoading(false)
    }
  }, [executionId])

  useEffect(() => {
    if (executionId) {
      fetchExecution()
    }
  }, [executionId])

  return { execution, isLoading, error, refetch: fetchExecution }
}

// =============================================================================
// useExecutionComparison - Compare execution with previous
// =============================================================================

interface UseExecutionComparisonReturn {
  comparison: ExecutionComparison | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useExecutionComparison(executionId: string | undefined): UseExecutionComparisonReturn {
  const [comparison, setComparison] = useState<ExecutionComparison | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchComparison = useCallback(async () => {
    if (!executionId) return

    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get<ExecutionComparison>(`/bottlenecks/executions/${executionId}/compare/`)
      setComparison(response.data)
    } catch (err) {
      const axiosError = err as { response?: { data?: { error?: string } } }
      setError(axiosError.response?.data?.error || 'Failed to fetch comparison')
    } finally {
      setIsLoading(false)
    }
  }, [executionId])

  useEffect(() => {
    if (executionId) {
      fetchComparison()
    }
  }, [executionId])

  return { comparison, isLoading, error, refetch: fetchComparison }
}

// =============================================================================
// useRecentExecutions - Get recent executions across all rules
// =============================================================================

interface UseRecentExecutionsParams {
  limit?: number
  entity_type?: BottleneckEntityType
  success?: boolean
}

interface UseRecentExecutionsReturn {
  executions: RuleExecution[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useRecentExecutions(params?: UseRecentExecutionsParams): UseRecentExecutionsReturn {
  const [executions, setExecutions] = useState<RuleExecution[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchExecutions = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const queryParams = new URLSearchParams()
      if (params?.limit) queryParams.set('limit', String(params.limit))
      if (params?.entity_type) queryParams.set('entity_type', params.entity_type)
      if (params?.success !== undefined) queryParams.set('success', String(params.success))

      const url = `/bottlenecks/executions/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
      const response = await api.get<RuleExecution[]>(url)
      setExecutions(response.data)
    } catch (err) {
      const axiosError = err as { response?: { data?: { error?: string } } }
      setError(axiosError.response?.data?.error || 'Failed to fetch executions')
    } finally {
      setIsLoading(false)
    }
  }, [params?.limit, params?.entity_type, params?.success])

  useEffect(() => {
    fetchExecutions()
  }, [fetchExecutions])

  return { executions, isLoading, error, refetch: fetchExecutions }
}
