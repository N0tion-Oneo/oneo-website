"""
Django Admin configuration for Automations models.
"""

from django.contrib import admin
from .models import (
    Workflow,
    WebhookEndpoint,
    AutomationRule,
    WebhookDelivery,
    WebhookReceipt,
    WorkflowExecution,
)


@admin.register(Workflow)
class WorkflowAdmin(admin.ModelAdmin):
    list_display = ['name', 'is_active', 'total_executions', 'total_success', 'total_failed', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'description']
    readonly_fields = ['id', 'total_executions', 'total_success', 'total_failed', 'last_executed_at', 'created_at', 'updated_at']


@admin.register(WebhookEndpoint)
class WebhookEndpointAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'is_active', 'auth_type', 'total_received', 'total_success', 'created_at']
    list_filter = ['is_active', 'auth_type', 'target_action', 'created_at']
    search_fields = ['name', 'slug', 'description']
    readonly_fields = ['id', 'api_key', 'webhook_url', 'total_received', 'total_success', 'total_failed', 'last_received_at', 'created_at', 'updated_at']


@admin.register(AutomationRule)
class AutomationRuleAdmin(admin.ModelAdmin):
    list_display = ['name', 'trigger_type', 'action_type', 'is_active', 'total_executions', 'created_at']
    list_filter = ['is_active', 'trigger_type', 'action_type', 'created_at']
    search_fields = ['name', 'description']
    readonly_fields = ['id', 'total_executions', 'total_success', 'total_failed', 'last_triggered_at', 'created_at', 'updated_at']


@admin.register(WebhookDelivery)
class WebhookDeliveryAdmin(admin.ModelAdmin):
    list_display = ['url', 'method', 'status', 'status_code', 'attempts', 'created_at']
    list_filter = ['status', 'method', 'is_test', 'created_at']
    search_fields = ['url', 'error_message']
    readonly_fields = ['id', 'created_at', 'completed_at']


@admin.register(WebhookReceipt)
class WebhookReceiptAdmin(admin.ModelAdmin):
    list_display = ['endpoint', 'status', 'ip_address', 'processing_time_ms', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['endpoint__name', 'ip_address', 'error_message']
    readonly_fields = ['id', 'created_at']


@admin.register(WorkflowExecution)
class WorkflowExecutionAdmin(admin.ModelAdmin):
    list_display = ['workflow', 'trigger_type', 'status', 'execution_time_ms', 'is_test', 'started_at']
    list_filter = ['status', 'trigger_type', 'is_test', 'started_at']
    search_fields = ['workflow__name', 'error_message']
    readonly_fields = ['id', 'started_at', 'completed_at']
