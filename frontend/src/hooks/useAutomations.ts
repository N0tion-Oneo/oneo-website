import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'

// =============================================================================
// Types - Automation Rules (Form-based, simpler)
// =============================================================================

export type TriggerType =
  | 'model_created'
  | 'model_updated'
  | 'model_deleted'
  | 'stage_changed'
  | 'status_changed'
  | 'field_changed'
  | 'scheduled'
  | 'manual'
  | 'signal'
  | 'view_action'

export interface ScheduleConfig {
  datetime_field: string
  offset_hours: number
  offset_type: 'before' | 'after'
}

export type ActionType =
  | 'send_webhook'
  | 'send_notification'
  | 'create_activity'
  | 'update_field'

export interface TriggerCondition {
  field: string
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'in' | 'not_in' | 'is_empty' | 'is_not_empty' | 'gt' | 'gte' | 'lt' | 'lte'
  value: string | string[]
}

export interface WebhookActionConfig {
  url: string
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  headers: Record<string, string>
  payload_template: Record<string, unknown>
}

export interface NotificationActionConfig {
  channel: 'email' | 'in_app' | 'both'
  recipient_type: 'candidate' | 'client' | 'recruiter' | 'interviewer' | 'company_admin' | 'assigned_user'
  title_template: string
  body_template: string
  email_subject_template?: string
}

export interface NotificationTemplateInfo {
  id: string
  name: string
  template_type: string
  recipient_type: string
  default_channel: string
  title_template?: string
}

export interface AutomationRule {
  id: string
  name: string
  description: string
  trigger_type: TriggerType
  trigger_model: string | null
  trigger_display: string
  trigger_conditions: TriggerCondition[]
  schedule_config?: ScheduleConfig | null
  signal_name?: string | null
  action_type: ActionType
  action_config: WebhookActionConfig | NotificationActionConfig | Record<string, unknown>
  action_display: string
  notification_template?: string | null
  notification_template_info?: NotificationTemplateInfo | null
  is_active: boolean
  last_triggered_at: string | null
  total_executions: number
  total_success: number
  total_failed: number
  created_at: string
  updated_at: string
}

export interface CreateRuleData {
  name: string
  description?: string
  trigger_type: TriggerType
  trigger_model?: string
  signal_name?: string
  trigger_conditions?: TriggerCondition[]
  schedule_config?: ScheduleConfig
  action_type: ActionType
  action_config: Record<string, unknown>
  notification_template?: string
  is_active?: boolean
}

export interface UpdateRuleData {
  name?: string
  description?: string
  trigger_type?: TriggerType
  trigger_model?: string
  signal_name?: string
  trigger_conditions?: TriggerCondition[]
  schedule_config?: ScheduleConfig | null
  action_type?: ActionType
  action_config?: Record<string, unknown>
  notification_template?: string | null
  is_active?: boolean
}

// =============================================================================
// Types - Rule Execution History
// =============================================================================

export type ExecutionStatus = 'running' | 'success' | 'failed' | 'skipped'

// Notification object from NotificationSerializer (source of truth)
export interface Notification {
  id: string
  notification_type: string
  notification_type_display: string
  channel: string
  title: string
  body: string
  action_url?: string
  is_read: boolean
  read_at?: string
  email_sent: boolean
  email_sent_at?: string
  sent_at: string
}

// External email recipient (no Notification record)
export interface ExternalEmail {
  email: string
  name?: string
  email_sent: boolean
  email_error?: string
}

export interface RuleExecution {
  id: string
  rule: string
  rule_name: string
  trigger_type: TriggerType
  trigger_model: string | null
  trigger_object_id: string
  trigger_data?: {
    old_values: Record<string, unknown>
    new_values: Record<string, unknown>
  }
  status: ExecutionStatus
  action_type: ActionType
  action_result?: {
    external_emails?: ExternalEmail[]
    error?: string
  }
  error_message?: string
  is_test: boolean
  execution_time_ms?: number
  duration_display?: string
  triggered_by?: string
  triggered_by_name?: string
  started_at: string
  completed_at?: string

  // Live notification data via FK relationship
  notifications?: Notification[]
  external_emails?: ExternalEmail[]
}

// =============================================================================
// Types - Workflows (React Flow - legacy)
// =============================================================================

export interface WorkflowNode {
  id: string
  type: 'trigger' | 'action'
  node_type: string
  position: { x: number; y: number }
  data: {
    label: string
    config: Record<string, unknown>
  }
}

export interface WorkflowEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
}

export interface Workflow {
  id: string
  name: string
  description: string
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  is_active: boolean
  last_executed_at: string | null
  total_executions: number
  total_success: number
  total_failed: number
  created_at: string
  updated_at: string
  created_by: string | null
}

export interface WorkflowExecution {
  id: string
  workflow: string
  trigger_type: string
  trigger_content_type: string | null
  trigger_object_id: string
  trigger_data: Record<string, unknown>
  status: 'running' | 'success' | 'partial' | 'failed'
  nodes_executed: string[]
  node_results: Record<string, unknown>
  error_message: string
  is_test: boolean
  execution_time_ms: number | null
  started_at: string
  completed_at: string | null
}

export interface ModelFieldChoice {
  value: string
  label: string
}

export interface ModelField {
  name: string
  type: string
  verbose_name: string
  choices?: ModelFieldChoice[]
  is_relation?: boolean
  related_model?: string
  required?: boolean
}

export interface AutomatableModel {
  key: string
  display_name: string
  fields: ModelField[]
  events: string[]
  status_field: string | null
}

export interface WebhookDelivery {
  id: string
  workflow: string | null
  url: string
  method: string
  headers: Record<string, string>
  payload: Record<string, unknown>
  status_code: number | null
  response_body: string
  response_time_ms: number | null
  status: 'pending' | 'success' | 'failed' | 'retrying'
  attempts: number
  max_attempts: number
  error_message: string
  is_test: boolean
  created_at: string
  completed_at: string | null
}

export interface CreateWorkflowData {
  name: string
  description?: string
  nodes?: WorkflowNode[]
  edges?: WorkflowEdge[]
  is_active?: boolean
}

export interface UpdateWorkflowData {
  name?: string
  description?: string
  nodes?: WorkflowNode[]
  edges?: WorkflowEdge[]
  is_active?: boolean
}

// Hooks

// List all workflows
export function useWorkflows() {
  const query = useQuery<Workflow[]>({
    queryKey: ['workflows'],
    queryFn: async () => {
      const response = await api.get('/webhooks/workflows/')
      return response.data
    },
  })

  return {
    workflows: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}

// Get a single workflow
export function useWorkflow(id: string | null) {
  const query = useQuery<Workflow>({
    queryKey: ['workflow', id],
    queryFn: async () => {
      const response = await api.get(`/webhooks/workflows/${id}/`)
      return response.data
    },
    enabled: !!id,
  })

  return {
    workflow: query.data || null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}

// Create a workflow
export function useCreateWorkflow() {
  const queryClient = useQueryClient()
  const [error, setError] = useState<Error | null>(null)

  const mutation = useMutation({
    mutationFn: async (data: CreateWorkflowData) => {
      const response = await api.post('/webhooks/workflows/create/', data)
      return response.data as Workflow
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
    },
    onError: (err: Error) => {
      setError(err)
    },
  })

  return {
    create: mutation.mutateAsync,
    isCreating: mutation.isPending,
    error,
  }
}

// Update a workflow
export function useUpdateWorkflow() {
  const queryClient = useQueryClient()
  const [error, setError] = useState<Error | null>(null)

  const mutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateWorkflowData }) => {
      const response = await api.patch(`/webhooks/workflows/${id}/update/`, data)
      return response.data as Workflow
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
      queryClient.invalidateQueries({ queryKey: ['workflow', id] })
    },
    onError: (err: Error) => {
      setError(err)
    },
  })

  return {
    update: mutation.mutateAsync,
    isUpdating: mutation.isPending,
    error,
  }
}

// Delete a workflow
export function useDeleteWorkflow() {
  const queryClient = useQueryClient()
  const [error, setError] = useState<Error | null>(null)

  const mutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/webhooks/workflows/${id}/delete/`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
    },
    onError: (err: Error) => {
      setError(err)
    },
  })

  return {
    delete: mutation.mutateAsync,
    isDeleting: mutation.isPending,
    error,
  }
}

// Test a workflow
export function useTestWorkflow() {
  const [error, setError] = useState<Error | null>(null)

  const mutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/webhooks/workflows/${id}/test/`)
      return response.data
    },
    onError: (err: Error) => {
      setError(err)
    },
  })

  return {
    test: mutation.mutateAsync,
    isTesting: mutation.isPending,
    error,
  }
}

// Get workflow executions
export function useWorkflowExecutions(workflowId: string | null) {
  const query = useQuery<WorkflowExecution[]>({
    queryKey: ['workflow-executions', workflowId],
    queryFn: async () => {
      if (!workflowId) return []
      const response = await api.get(`/webhooks/workflows/${workflowId}/executions/`)
      return response.data
    },
    enabled: !!workflowId,
  })

  return {
    executions: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}

// Get webhook deliveries
export function useWebhookDeliveries(workflowId?: string) {
  const query = useQuery<WebhookDelivery[]>({
    queryKey: ['webhook-deliveries', workflowId],
    queryFn: async () => {
      const url = workflowId
        ? `/webhooks/deliveries/?workflow_id=${workflowId}`
        : '/webhooks/deliveries/'
      const response = await api.get(url)
      return response.data
    },
  })

  return {
    deliveries: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}

// Get automatable models (for building the UI)
export function useAutomatableModels() {
  const query = useQuery<AutomatableModel[]>({
    queryKey: ['automatable-models'],
    queryFn: async () => {
      const response = await api.get('/webhooks/models/')
      return response.data
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  })

  return {
    models: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
  }
}

// Get fields for a specific model
export function useModelFields(modelKey: string | null) {
  const { models, isLoading } = useAutomatableModels()

  const model = models.find(m => m.key === modelKey)

  return {
    fields: model?.fields || [],
    events: model?.events || [],
    statusField: model?.status_field || null,
    displayName: model?.display_name || '',
    isLoading,
  }
}

// Combined hook for workflow editor
export function useWorkflowEditor(workflowId: string | null) {
  const { workflow, isLoading: isLoadingWorkflow, refetch } = useWorkflow(workflowId)
  const { update, isUpdating } = useUpdateWorkflow()
  const { models, isLoading: isLoadingModels } = useAutomatableModels()
  const { test, isTesting } = useTestWorkflow()

  const saveWorkflow = useCallback(
    async (data: UpdateWorkflowData) => {
      if (!workflowId) return
      await update({ id: workflowId, data })
    },
    [workflowId, update]
  )

  const testWorkflow = useCallback(async () => {
    if (!workflowId) return
    return test(workflowId)
  }, [workflowId, test])

  return {
    workflow,
    models,
    isLoading: isLoadingWorkflow || isLoadingModels,
    isSaving: isUpdating,
    isTesting,
    saveWorkflow,
    testWorkflow,
    refetch,
  }
}

// =============================================================================
// Automation Rules Hooks (Form-based, simpler)
// =============================================================================

// List all automation rules
export function useAutomationRules(filters?: {
  is_active?: boolean
  action_type?: ActionType
  trigger_type?: TriggerType
  search?: string
}) {
  const query = useQuery<AutomationRule[]>({
    queryKey: ['automation-rules', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters?.is_active !== undefined) {
        params.append('is_active', String(filters.is_active))
      }
      if (filters?.action_type) {
        params.append('action_type', filters.action_type)
      }
      if (filters?.trigger_type) {
        params.append('trigger_type', filters.trigger_type)
      }
      if (filters?.search) {
        params.append('search', filters.search)
      }
      const url = params.toString()
        ? `/webhooks/rules/?${params.toString()}`
        : '/webhooks/rules/'
      const response = await api.get(url)
      return response.data
    },
  })

  return {
    rules: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}

// Get a single automation rule
export function useAutomationRule(id: string | null) {
  const query = useQuery<AutomationRule>({
    queryKey: ['automation-rule', id],
    queryFn: async () => {
      const response = await api.get(`/webhooks/rules/${id}/`)
      return response.data
    },
    enabled: !!id,
  })

  return {
    rule: query.data || null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}

// Create an automation rule
export function useCreateAutomationRule() {
  const queryClient = useQueryClient()
  const [error, setError] = useState<Error | null>(null)

  const mutation = useMutation({
    mutationFn: async (data: CreateRuleData) => {
      const response = await api.post('/webhooks/rules/create/', data)
      return response.data as AutomationRule
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] })
    },
    onError: (err: Error) => {
      setError(err)
    },
  })

  return {
    create: mutation.mutateAsync,
    isCreating: mutation.isPending,
    error,
  }
}

// Update an automation rule
export function useUpdateAutomationRule() {
  const queryClient = useQueryClient()
  const [error, setError] = useState<Error | null>(null)

  const mutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateRuleData }) => {
      const response = await api.patch(`/webhooks/rules/${id}/update/`, data)
      return response.data as AutomationRule
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] })
      queryClient.invalidateQueries({ queryKey: ['automation-rule', id] })
    },
    onError: (err: Error) => {
      setError(err)
    },
  })

  return {
    update: mutation.mutateAsync,
    isUpdating: mutation.isPending,
    error,
  }
}

// Delete an automation rule
export function useDeleteAutomationRule() {
  const queryClient = useQueryClient()
  const [error, setError] = useState<Error | null>(null)

  const mutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/webhooks/rules/${id}/delete/`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] })
    },
    onError: (err: Error) => {
      setError(err)
    },
  })

  return {
    deleteRule: mutation.mutateAsync,
    isDeleting: mutation.isPending,
    error,
  }
}

// Toggle automation rule active status
export function useToggleAutomationRule() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/webhooks/rules/${id}/toggle/`)
      return response.data as { is_active: boolean }
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] })
      queryClient.invalidateQueries({ queryKey: ['automation-rule', id] })
    },
  })

  return {
    toggle: mutation.mutateAsync,
    isToggling: mutation.isPending,
  }
}

// Sample record for testing
export interface SampleRecord {
  id: string
  display: string
  fields: Record<string, { value: unknown; display: string | null }>
}

// Test result preview
export interface TestPreview {
  action_type: string
  // Webhook
  url?: string
  method?: string
  headers?: Record<string, string>
  payload?: Record<string, unknown>
  // Notification
  channel?: string
  recipient_type?: string
  title?: string
  body?: string
  email_subject?: string
  email_body?: string
  using_template?: boolean
  template_name?: string
  // Update field
  target?: string
  field?: string
  value?: unknown
  value_type?: string
  related_model?: string
  relation_field?: string
  // Activity
  activity_type?: string
  content?: string
}

export interface TestResult {
  status: string
  rule_id: string
  rule_name: string
  record_id: string | null
  record_display: string | null
  dry_run: boolean
  executed: boolean
  execution_result: Record<string, unknown> | string | null
  preview: TestPreview
}

// Fetch sample records for a model
export function useSampleRecords(modelKey: string | null) {
  const query = useQuery({
    queryKey: ['sample-records', modelKey],
    queryFn: async () => {
      if (!modelKey) return []
      const response = await api.get(`/webhooks/models/${modelKey}/records/`, {
        params: { limit: 20 }
      })
      return response.data as SampleRecord[]
    },
    enabled: !!modelKey,
    staleTime: 30000, // Cache for 30 seconds
  })

  return {
    records: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}

// Test an automation rule
export function useTestAutomationRule() {
  const [error, setError] = useState<Error | null>(null)

  const mutation = useMutation({
    mutationFn: async ({ id, recordId, dryRun = true }: { id: string; recordId?: string; dryRun?: boolean }) => {
      const response = await api.post(`/webhooks/rules/${id}/test/`, {
        record_id: recordId,
        dry_run: dryRun,
      })
      return response.data as TestResult
    },
    onError: (err: Error) => {
      setError(err)
    },
  })

  return {
    test: mutation.mutateAsync,
    isTesting: mutation.isPending,
    testResult: mutation.data,
    error,
    reset: mutation.reset,
  }
}

// Get rule executions
export function useRuleExecutions(ruleId: string | null) {
  const query = useQuery({
    queryKey: ['rule-executions', ruleId],
    queryFn: async () => {
      if (!ruleId) return []
      const response = await api.get(`/webhooks/rules/${ruleId}/executions/`)
      return response.data as RuleExecution[]
    },
    enabled: !!ruleId,
  })

  return {
    executions: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}

// Get all executions across all rules
export interface AllExecutionsFilters {
  rule_id?: string
  status?: ExecutionStatus
  limit?: number
}

export function useAllExecutions(filters?: AllExecutionsFilters) {
  const query = useQuery({
    queryKey: ['all-executions', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters?.rule_id) params.append('rule_id', filters.rule_id)
      if (filters?.status) params.append('status', filters.status)
      if (filters?.limit) params.append('limit', String(filters.limit))
      const response = await api.get(`/webhooks/executions/?${params.toString()}`)
      return response.data as RuleExecution[]
    },
  })

  return {
    executions: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}

// Get execution detail (full version with all data)
export interface ExecutionDetail {
  id: string
  rule: string
  rule_name: string
  trigger_type: string
  trigger_content_type: number
  trigger_model: string
  trigger_object_id: string | null
  trigger_data: Record<string, unknown>
  status: ExecutionStatus
  action_type: string
  action_result: Record<string, unknown>
  error_message: string | null
  is_test: boolean
  execution_time_ms: number | null
  duration_display: string | null
  triggered_by: number | null
  triggered_by_name: string | null
  started_at: string
  completed_at: string | null
  // Live notification data via FK relationship
  notifications?: Notification[]
  external_emails?: ExternalEmail[]
}

export function useExecutionDetail(executionId: string | null) {
  const query = useQuery({
    queryKey: ['execution-detail', executionId],
    queryFn: async () => {
      if (!executionId) return null
      const response = await api.get(`/webhooks/executions/${executionId}/`)
      return response.data as ExecutionDetail
    },
    enabled: !!executionId,
  })

  return {
    execution: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}

// =============================================================================
// NOTIFICATION TEMPLATES
// =============================================================================

export interface NotificationTemplateOption {
  id: string
  name: string
  template_type: string
  recipient_type: string
  default_channel: string
}

export function useNotificationTemplates() {
  const query = useQuery({
    queryKey: ['automation-notification-templates'],
    queryFn: async () => {
      const response = await api.get('/webhooks/notification-templates/')
      return response.data as NotificationTemplateOption[]
    },
  })

  return {
    templates: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
  }
}

// Combined hook for rule editor (supports both create and update)
export function useRuleEditor(ruleId: string | null) {
  const { rule, isLoading: isLoadingRule, refetch } = useAutomationRule(ruleId)
  const { create, isCreating } = useCreateAutomationRule()
  const { update, isUpdating } = useUpdateAutomationRule()
  const { models, isLoading: isLoadingModels } = useAutomatableModels()
  const { test, isTesting, testResult, reset: resetTest } = useTestAutomationRule()

  // Get trigger model from rule
  const triggerModel = rule?.trigger_model || null

  // Get sample records for the trigger model
  const { records: sampleRecords, isLoading: isLoadingRecords, refetch: refetchRecords } = useSampleRecords(triggerModel)

  const saveRule = useCallback(
    async (data: UpdateRuleData): Promise<AutomationRule | void> => {
      if (ruleId) {
        // Update existing rule
        await update({ id: ruleId, data })
      } else {
        // Create new rule - convert UpdateRuleData to CreateRuleData
        const createData: CreateRuleData = {
          name: data.name || 'New Rule',
          description: data.description,
          trigger_type: data.trigger_type || 'model_created',
          trigger_model: data.trigger_model || '',
          trigger_conditions: data.trigger_conditions,
          action_type: data.action_type || 'send_webhook',
          action_config: data.action_config || {},
          notification_template: data.notification_template || undefined,
          is_active: data.is_active,
        }
        const newRule = await create(createData)
        return newRule
      }
    },
    [ruleId, update, create]
  )

  const testRule = useCallback(async (recordId?: string, dryRun: boolean = true) => {
    console.log('testRule called', { ruleId, recordId, dryRun })
    if (!ruleId) {
      console.warn('No ruleId, cannot test')
      return
    }
    const result = await test({ id: ruleId, recordId, dryRun })
    console.log('testRule result', result)
    return result
  }, [ruleId, test])

  return {
    rule,
    models,
    sampleRecords,
    isLoading: isLoadingRule || isLoadingModels,
    isLoadingRecords,
    isSaving: isUpdating || isCreating,
    isTesting,
    testResult,
    resetTest,
    saveRule,
    testRule,
    refetch,
    refetchRecords,
  }
}


// =============================================================================
// WEBHOOK ENDPOINTS
// =============================================================================

export type WebhookAuthType = 'none' | 'api_key' | 'hmac'
export type WebhookTargetAction = 'create' | 'update' | 'upsert'

export interface WebhookEndpoint {
  id: string
  workflow?: string | null
  node_id?: string
  name: string
  slug: string
  description: string
  auth_type: WebhookAuthType
  api_key: string
  target_content_type: number
  target_model: string
  target_model_display: string
  target_action: WebhookTargetAction
  field_mapping: Record<string, string>
  default_values: Record<string, unknown>
  dedupe_field: string
  is_active: boolean
  rate_limit_per_minute: number
  webhook_url: string
  last_received_at: string | null
  total_received: number
  total_success: number
  total_failed: number
  created_by?: number | null
  created_by_name?: string | null
  created_at: string
  updated_at: string
  target_fields?: ModelField[]
}

export interface WebhookEndpointListItem {
  id: string
  name: string
  slug: string
  description: string
  auth_type: WebhookAuthType
  target_model: string
  target_model_display: string
  target_action: WebhookTargetAction
  is_active: boolean
  webhook_url: string
  last_received_at: string | null
  total_received: number
  total_success: number
  total_failed: number
  success_rate: number | null
  created_at: string
}

export interface CreateWebhookEndpointData {
  name: string
  slug: string
  description?: string
  auth_type?: WebhookAuthType
  target_model: string
  target_action?: WebhookTargetAction
  field_mapping?: Record<string, string>
  default_values?: Record<string, unknown>
  dedupe_field?: string
  is_active?: boolean
  rate_limit_per_minute?: number
}

export interface UpdateWebhookEndpointData {
  name?: string
  slug?: string
  description?: string
  auth_type?: WebhookAuthType
  target_model?: string
  target_action?: WebhookTargetAction
  field_mapping?: Record<string, string>
  default_values?: Record<string, unknown>
  dedupe_field?: string
  is_active?: boolean
  rate_limit_per_minute?: number
}

export interface WebhookReceipt {
  id: string
  endpoint: string
  endpoint_name: string
  headers: Record<string, string>
  payload: Record<string, unknown>
  ip_address: string
  status: 'success' | 'failed' | 'invalid_auth' | 'validation_error' | 'rate_limited'
  error_message?: string
  created_object_id?: string
  processing_time_ms?: number
  created_at: string
}

export interface WebhookTestResult {
  endpoint: {
    name: string
    slug: string
    webhook_url: string
    target_model: string
    target_action: string
  }
  payload_received: Record<string, unknown>
  field_mapping: Record<string, string>
  mapped_data: Record<string, unknown>
  default_values: Record<string, unknown>
  mapping_errors: string[]
  dry_run: boolean
  status: 'valid' | 'created' | 'updated' | 'duplicate' | 'validation_error' | 'error'
  message: string
  object_id?: string
  existing_id?: string
}

// List webhook endpoints
export function useWebhookEndpoints(filters?: {
  is_active?: boolean
  target_model?: string
  search?: string
}) {
  const query = useQuery({
    queryKey: ['webhook-endpoints', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters?.is_active !== undefined) {
        params.set('is_active', String(filters.is_active))
      }
      if (filters?.target_model) {
        params.set('target_model', filters.target_model)
      }
      if (filters?.search) {
        params.set('search', filters.search)
      }
      const url = `/webhooks/endpoints/${params.toString() ? `?${params}` : ''}`
      const response = await api.get(url)
      return response.data as WebhookEndpointListItem[]
    },
  })

  return {
    endpoints: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}

// Get single webhook endpoint
export function useWebhookEndpoint(endpointId: string | null) {
  const query = useQuery({
    queryKey: ['webhook-endpoint', endpointId],
    queryFn: async () => {
      if (!endpointId) return null
      const response = await api.get(`/webhooks/endpoints/${endpointId}/`)
      return response.data as WebhookEndpoint
    },
    enabled: !!endpointId,
  })

  return {
    endpoint: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}

// Create webhook endpoint
export function useCreateWebhookEndpoint() {
  const queryClient = useQueryClient()
  const [isCreating, setIsCreating] = useState(false)

  const create = useCallback(async (data: CreateWebhookEndpointData) => {
    setIsCreating(true)
    try {
      const response = await api.post('/webhooks/endpoints/create/', data)
      queryClient.invalidateQueries({ queryKey: ['webhook-endpoints'] })
      return response.data as WebhookEndpoint
    } finally {
      setIsCreating(false)
    }
  }, [queryClient])

  return { create, isCreating }
}

// Update webhook endpoint
export function useUpdateWebhookEndpoint() {
  const queryClient = useQueryClient()
  const [isUpdating, setIsUpdating] = useState(false)

  const update = useCallback(async ({ id, data }: { id: string; data: UpdateWebhookEndpointData }) => {
    setIsUpdating(true)
    try {
      const response = await api.patch(`/webhooks/endpoints/${id}/update/`, data)
      queryClient.invalidateQueries({ queryKey: ['webhook-endpoints'] })
      queryClient.invalidateQueries({ queryKey: ['webhook-endpoint', id] })
      return response.data as WebhookEndpoint
    } finally {
      setIsUpdating(false)
    }
  }, [queryClient])

  return { update, isUpdating }
}

// Delete webhook endpoint
export function useDeleteWebhookEndpoint() {
  const queryClient = useQueryClient()
  const [isDeleting, setIsDeleting] = useState(false)

  const deleteEndpoint = useCallback(async (id: string) => {
    setIsDeleting(true)
    try {
      await api.delete(`/webhooks/endpoints/${id}/delete/`)
      queryClient.invalidateQueries({ queryKey: ['webhook-endpoints'] })
    } finally {
      setIsDeleting(false)
    }
  }, [queryClient])

  return { deleteEndpoint, isDeleting }
}

// Toggle webhook endpoint active status
export function useToggleWebhookEndpoint() {
  const queryClient = useQueryClient()

  const toggle = useCallback(async (id: string) => {
    const response = await api.post(`/webhooks/endpoints/${id}/toggle/`)
    queryClient.invalidateQueries({ queryKey: ['webhook-endpoints'] })
    queryClient.invalidateQueries({ queryKey: ['webhook-endpoint', id] })
    return response.data as { is_active: boolean }
  }, [queryClient])

  return { toggle }
}

// Regenerate API key
export function useRegenerateWebhookApiKey() {
  const queryClient = useQueryClient()
  const [isRegenerating, setIsRegenerating] = useState(false)

  const regenerate = useCallback(async (id: string) => {
    setIsRegenerating(true)
    try {
      const response = await api.post(`/webhooks/endpoints/${id}/regenerate-key/`)
      queryClient.invalidateQueries({ queryKey: ['webhook-endpoint', id] })
      return response.data as { api_key: string; message: string }
    } finally {
      setIsRegenerating(false)
    }
  }, [queryClient])

  return { regenerate, isRegenerating }
}

// Test webhook endpoint
export function useTestWebhookEndpoint() {
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<WebhookTestResult | null>(null)

  const test = useCallback(async (id: string, payload: Record<string, unknown>, dryRun = true) => {
    setIsTesting(true)
    setTestResult(null)
    try {
      const response = await api.post(`/webhooks/endpoints/${id}/test/`, {
        payload,
        dry_run: dryRun,
      })
      setTestResult(response.data)
      return response.data as WebhookTestResult
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: WebhookTestResult } }
        if (axiosError.response?.data) {
          setTestResult(axiosError.response.data)
        }
      }
      throw error
    } finally {
      setIsTesting(false)
    }
  }, [])

  const reset = useCallback(() => setTestResult(null), [])

  return { test, isTesting, testResult, reset }
}

// Get webhook endpoint receipts (logs)
export function useWebhookEndpointReceipts(endpointId: string | null, filters?: {
  status?: string
  limit?: number
}) {
  const query = useQuery({
    queryKey: ['webhook-endpoint-receipts', endpointId, filters],
    queryFn: async () => {
      if (!endpointId) return []
      const params = new URLSearchParams()
      if (filters?.status) params.set('status', filters.status)
      if (filters?.limit) params.set('limit', String(filters.limit))
      const url = `/webhooks/endpoints/${endpointId}/receipts/${params.toString() ? `?${params}` : ''}`
      const response = await api.get(url)
      return response.data as WebhookReceipt[]
    },
    enabled: !!endpointId,
  })

  return {
    receipts: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}

// Hook for all webhook receipts (across all endpoints)
export function useAllWebhookReceipts(filters?: {
  endpoint?: string
  status?: string
  limit?: number
}) {
  const query = useQuery({
    queryKey: ['webhook-receipts', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters?.endpoint) params.set('endpoint', filters.endpoint)
      if (filters?.status) params.set('status', filters.status)
      if (filters?.limit) params.set('limit', String(filters.limit))
      const url = `/webhooks/receipts/${params.toString() ? `?${params}` : ''}`
      const response = await api.get(url)
      return response.data as WebhookReceipt[]
    },
  })

  return {
    receipts: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}

// Combined hook for webhook endpoint editor
export function useWebhookEndpointEditor(endpointId: string | null) {
  const { endpoint, isLoading: isLoadingEndpoint, refetch } = useWebhookEndpoint(endpointId)
  const { create, isCreating } = useCreateWebhookEndpoint()
  const { update, isUpdating } = useUpdateWebhookEndpoint()
  const { models, isLoading: isLoadingModels } = useAutomatableModels()
  const { test, isTesting, testResult, reset: resetTest } = useTestWebhookEndpoint()
  const { regenerate, isRegenerating } = useRegenerateWebhookApiKey()

  // Get fields for target model
  const targetModel = endpoint?.target_model || null
  const { fields, isLoading: isLoadingFields } = useModelFields(targetModel)

  return {
    endpoint,
    isLoadingEndpoint,
    refetch,
    create,
    isCreating,
    update,
    isUpdating,
    models,
    isLoadingModels,
    fields,
    isLoadingFields,
    test,
    isTesting,
    testResult,
    resetTest,
    regenerate,
    isRegenerating,
    isSaving: isCreating || isUpdating,
  }
}
