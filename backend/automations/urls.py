"""
URL routing for Automations API.
"""

from django.urls import path
from . import views

urlpatterns = [
    # ==========================================================================
    # Automation Rules (Standalone - form-based UI)
    # ==========================================================================
    path('rules/', views.list_automation_rules, name='list-automation-rules'),
    path('rules/create/', views.create_automation_rule, name='create-automation-rule'),
    path('rules/<uuid:rule_id>/', views.get_automation_rule, name='get-automation-rule'),
    path('rules/<uuid:rule_id>/update/', views.update_automation_rule, name='update-automation-rule'),
    path('rules/<uuid:rule_id>/delete/', views.delete_automation_rule, name='delete-automation-rule'),
    path('rules/<uuid:rule_id>/toggle/', views.toggle_automation_rule, name='toggle-automation-rule'),
    path('rules/<uuid:rule_id>/test/', views.test_automation_rule, name='test-automation-rule'),
    path('rules/<uuid:rule_id>/executions/', views.rule_executions, name='rule-executions'),

    # ==========================================================================
    # Workflows (React Flow - legacy, kept for backwards compatibility)
    # ==========================================================================
    path('workflows/', views.list_workflows, name='list-workflows'),
    path('workflows/create/', views.create_workflow, name='create-workflow'),
    path('workflows/<uuid:workflow_id>/', views.get_workflow, name='get-workflow'),
    path('workflows/<uuid:workflow_id>/update/', views.update_workflow, name='update-workflow'),
    path('workflows/<uuid:workflow_id>/delete/', views.delete_workflow, name='delete-workflow'),
    path('workflows/<uuid:workflow_id>/toggle/', views.toggle_workflow, name='toggle-workflow'),
    path('workflows/<uuid:workflow_id>/test/', views.test_workflow, name='test-workflow'),
    path('workflows/<uuid:workflow_id>/executions/', views.workflow_executions, name='workflow-executions'),

    # ==========================================================================
    # Inbound webhook receiver (public endpoint)
    # ==========================================================================
    path('in/<slug:slug>/', views.receive_webhook, name='receive-webhook'),

    # ==========================================================================
    # Webhook Endpoint Management
    # ==========================================================================
    path('endpoints/', views.list_webhook_endpoints, name='list-webhook-endpoints'),
    path('endpoints/create/', views.create_webhook_endpoint, name='create-webhook-endpoint'),
    path('endpoints/<uuid:endpoint_id>/', views.get_webhook_endpoint, name='get-webhook-endpoint'),
    path('endpoints/<uuid:endpoint_id>/update/', views.update_webhook_endpoint, name='update-webhook-endpoint'),
    path('endpoints/<uuid:endpoint_id>/delete/', views.delete_webhook_endpoint, name='delete-webhook-endpoint'),
    path('endpoints/<uuid:endpoint_id>/toggle/', views.toggle_webhook_endpoint, name='toggle-webhook-endpoint'),
    path('endpoints/<uuid:endpoint_id>/regenerate-key/', views.regenerate_webhook_api_key, name='regenerate-webhook-api-key'),
    path('endpoints/<uuid:endpoint_id>/test/', views.test_webhook_endpoint, name='test-webhook-endpoint'),
    path('endpoints/<uuid:endpoint_id>/receipts/', views.webhook_endpoint_receipts, name='webhook-endpoint-receipts'),

    # ==========================================================================
    # Metadata endpoints
    # ==========================================================================
    path('models/', views.list_automatable_models, name='list-automatable-models'),
    path('models/<str:model_key>/fields/', views.get_model_fields, name='get-model-fields'),
    path('models/<str:model_key>/records/', views.get_sample_records, name='get-sample-records'),
    path('notification-templates/', views.list_automation_templates, name='list-automation-templates'),

    # ==========================================================================
    # Logs
    # ==========================================================================
    path('deliveries/', views.list_deliveries, name='list-deliveries'),
    path('receipts/', views.list_receipts, name='list-receipts'),

    # ==========================================================================
    # Execution History
    # ==========================================================================
    path('executions/', views.all_rule_executions, name='all-rule-executions'),
    path('executions/<uuid:execution_id>/', views.rule_execution_detail, name='rule-execution-detail'),

    # ==========================================================================
    # Manual/Signal/View Action Triggers
    # ==========================================================================
    path('rules/<uuid:rule_id>/trigger/', views.trigger_manual_rule, name='trigger-manual-rule'),
    path('manual-rules/', views.list_manual_rules, name='list-manual-rules'),
    path('signal-rules/', views.list_signal_rules, name='list-signal-rules'),
    path('view-action-rules/', views.list_view_action_rules, name='list-view-action-rules'),
]
