"""
Automation System Models

Core models for the webhook and automation system:
- Workflow: Visual workflow containing trigger and action nodes
- WebhookEndpoint: Inbound webhook endpoint configuration
- WebhookDelivery: Log of outbound webhook deliveries
- WebhookReceipt: Log of inbound webhook receipts
"""

import secrets
import uuid
from django.db import models
from django.contrib.contenttypes.models import ContentType


class Workflow(models.Model):
    """
    Visual workflow containing trigger and action nodes.

    Stores the React Flow representation of the workflow as JSON.
    The backend parses this to create/update corresponding records.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)

    # React Flow data (nodes + edges)
    nodes = models.JSONField(
        default=list,
        help_text="Array of workflow nodes (triggers and actions)"
    )
    edges = models.JSONField(
        default=list,
        help_text="Array of connections between nodes"
    )

    # Settings
    is_active = models.BooleanField(default=True)

    # Stats
    last_executed_at = models.DateTimeField(null=True, blank=True)
    total_executions = models.PositiveIntegerField(default=0)
    total_success = models.PositiveIntegerField(default=0)
    total_failed = models.PositiveIntegerField(default=0)

    # Audit
    created_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_workflows'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'workflows'
        ordering = ['-updated_at']
        verbose_name = 'Workflow'
        verbose_name_plural = 'Workflows'

    def __str__(self):
        return self.name

    @property
    def trigger_nodes(self):
        """Get all trigger nodes from the workflow."""
        return [n for n in self.nodes if n.get('type') == 'trigger']

    @property
    def action_nodes(self):
        """Get all action nodes from the workflow."""
        return [n for n in self.nodes if n.get('type') == 'action']


class WebhookEndpoint(models.Model):
    """
    Inbound webhook endpoint - receives data from external systems.

    This model represents a configured endpoint that can receive
    webhooks from external platforms like Zapier, Typeform, etc.
    """

    class AuthType(models.TextChoices):
        NONE = 'none', 'No Authentication'
        API_KEY = 'api_key', 'API Key'
        HMAC = 'hmac', 'HMAC Signature'

    class TargetAction(models.TextChoices):
        CREATE = 'create', 'Create Record'
        UPDATE = 'update', 'Update Record'
        UPSERT = 'upsert', 'Create or Update'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Link to parent workflow
    workflow = models.ForeignKey(
        Workflow,
        on_delete=models.CASCADE,
        related_name='webhook_endpoints',
        null=True,
        blank=True,
        help_text="Parent workflow this endpoint belongs to"
    )
    node_id = models.CharField(
        max_length=50,
        blank=True,
        help_text="ID of the trigger node in the workflow"
    )

    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True, help_text="URL slug: /webhooks/in/{slug}/")
    description = models.TextField(blank=True)

    # Authentication
    auth_type = models.CharField(
        max_length=20,
        choices=AuthType.choices,
        default=AuthType.API_KEY
    )
    api_key = models.CharField(max_length=64, blank=True)
    hmac_secret_encrypted = models.TextField(blank=True)

    # Target model
    target_content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        help_text="The model to create/update when webhook is received"
    )
    target_action = models.CharField(
        max_length=20,
        choices=TargetAction.choices,
        default=TargetAction.CREATE
    )

    # Field mapping: {"external_field": "internal_field"}
    field_mapping = models.JSONField(
        default=dict,
        help_text="Map external payload fields to model fields"
    )

    # Default values: {"source": "facebook", "assigned_to_id": 5}
    default_values = models.JSONField(
        default=dict,
        help_text="Default values to set on created records"
    )

    # Deduplication
    dedupe_field = models.CharField(
        max_length=50,
        blank=True,
        help_text="Field to check for duplicates (e.g., 'email')"
    )

    # Settings
    is_active = models.BooleanField(default=True)

    # Rate limiting
    rate_limit_per_minute = models.PositiveIntegerField(
        default=60,
        help_text="Maximum requests per minute"
    )

    # Stats
    last_received_at = models.DateTimeField(null=True, blank=True)
    total_received = models.PositiveIntegerField(default=0)
    total_success = models.PositiveIntegerField(default=0)
    total_failed = models.PositiveIntegerField(default=0)

    # Audit
    created_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_webhook_endpoints'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'webhook_endpoints'
        ordering = ['-created_at']
        verbose_name = 'Webhook Endpoint'
        verbose_name_plural = 'Webhook Endpoints'

    def __str__(self):
        return f"{self.name} ({self.slug})"

    def save(self, *args, **kwargs):
        if not self.api_key:
            self.api_key = secrets.token_urlsafe(32)
        super().save(*args, **kwargs)

    @property
    def webhook_url(self):
        """Get the full webhook URL."""
        return f"/api/v1/webhooks/in/{self.slug}/"


class AutomationRule(models.Model):
    """
    Automation rule: trigger -> action.

    Defines what happens when a model event occurs (e.g., Lead created)
    and what action to take (e.g., send webhook, send notification, log activity).

    This is a unified model that handles both:
    - Outbound webhooks (send data to external systems)
    - Notifications (send email/in-app to internal users)
    """

    class TriggerType(models.TextChoices):
        MODEL_CREATED = 'model_created', 'Record Created'
        MODEL_UPDATED = 'model_updated', 'Record Updated'
        MODEL_DELETED = 'model_deleted', 'Record Deleted'
        STAGE_CHANGED = 'stage_changed', 'Stage Changed'
        STATUS_CHANGED = 'status_changed', 'Status Changed'
        FIELD_CHANGED = 'field_changed', 'Field Changed'
        # Time-based triggers
        SCHEDULED = 'scheduled', 'Scheduled (Time-based)'
        # Non-model triggers
        MANUAL = 'manual', 'Manual Trigger'
        SIGNAL = 'signal', 'Django Signal'
        VIEW_ACTION = 'view_action', 'View Action'

    class ActionType(models.TextChoices):
        # Outbound actions
        SEND_WEBHOOK = 'send_webhook', 'Send Webhook'
        # Notification actions
        SEND_NOTIFICATION = 'send_notification', 'Send Notification'
        # Internal actions
        CREATE_ACTIVITY = 'create_activity', 'Log Activity'
        UPDATE_FIELD = 'update_field', 'Update Field'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Link to parent workflow (optional - rules can be standalone)
    workflow = models.ForeignKey(
        Workflow,
        on_delete=models.CASCADE,
        related_name='automation_rules',
        null=True,
        blank=True,
        help_text="Parent workflow this rule belongs to (optional)"
    )

    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)

    # Trigger configuration
    trigger_type = models.CharField(max_length=30, choices=TriggerType.choices)
    trigger_content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        related_name='automation_triggers',
        null=True,
        blank=True,
        help_text="The model that triggers this automation (optional for signal/manual triggers)"
    )
    trigger_conditions = models.JSONField(
        default=list,
        help_text='Array of conditions: [{"field": "status", "operator": "equals", "value": "active"}]'
    )

    # Scheduled trigger configuration (for SCHEDULED trigger type)
    schedule_config = models.JSONField(
        null=True,
        blank=True,
        help_text='Config for scheduled triggers: {"datetime_field": "scheduled_at", "offset_hours": -24, "offset_type": "before"}'
    )

    # Signal/View action configuration (for SIGNAL and VIEW_ACTION trigger types)
    signal_name = models.CharField(
        max_length=100,
        blank=True,
        help_text='Signal name (e.g., "password_reset", "email_verification") or view action name (e.g., "booking_link_sent")'
    )

    # Action configuration
    action_type = models.CharField(max_length=30, choices=ActionType.choices)
    action_config = models.JSONField(
        default=dict,
        help_text='Action settings. For webhook: {"url", "method", "headers", "payload_template"}. For notification: {"channel", "recipient_type", "title_template", "body_template"}'
    )

    # Notification template (optional - for SEND_NOTIFICATION action)
    notification_template = models.ForeignKey(
        'notifications.NotificationTemplate',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='automation_rules',
        help_text="Use existing notification template instead of inline config"
    )

    # Secrets (encrypted) - for webhook auth headers
    secrets_encrypted = models.TextField(
        blank=True,
        help_text="Encrypted secrets like API keys"
    )

    # Settings
    is_active = models.BooleanField(default=True)
    run_async = models.BooleanField(
        default=True,
        help_text="Run action asynchronously via Celery"
    )

    # Rate limiting
    rate_limit_per_minute = models.PositiveIntegerField(
        default=100,
        help_text="Maximum executions per minute"
    )

    # Stats
    last_triggered_at = models.DateTimeField(null=True, blank=True)
    total_executions = models.PositiveIntegerField(default=0)
    total_success = models.PositiveIntegerField(default=0)
    total_failed = models.PositiveIntegerField(default=0)

    # Audit
    created_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_automation_rules'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'automation_rules'
        ordering = ['-created_at']
        verbose_name = 'Automation Rule'
        verbose_name_plural = 'Automation Rules'

    def __str__(self):
        return self.name

    @property
    def trigger_model_name(self):
        """Get the display name of the trigger model."""
        return self.trigger_content_type.model_class()._meta.verbose_name.title()

    @property
    def trigger_display(self):
        """Get a human-readable trigger description."""
        trigger_labels = {
            'model_created': 'When {model} is created',
            'model_updated': 'When {model} is updated',
            'model_deleted': 'When {model} is deleted',
            'stage_changed': 'When {model} stage changes',
            'status_changed': 'When {model} status changes',
            'field_changed': 'When {model} field changes',
        }
        template = trigger_labels.get(self.trigger_type, 'When {model} changes')
        return template.format(model=self.trigger_model_name)

    @property
    def action_display(self):
        """Get a human-readable action description."""
        if self.action_type == 'send_webhook':
            url = self.action_config.get('url', '')
            return f"Send webhook to {url[:50]}..." if len(url) > 50 else f"Send webhook to {url}"
        elif self.action_type == 'send_notification':
            channel = self.action_config.get('channel', 'email')
            return f"Send {channel} notification"
        elif self.action_type == 'create_activity':
            return "Log activity"
        elif self.action_type == 'update_field':
            field = self.action_config.get('field', 'field')
            return f"Update {field}"
        return self.get_action_type_display()


class WebhookDelivery(models.Model):
    """
    Log of outbound webhook deliveries.

    Records every attempt to send a webhook, including request/response
    details, status, and retry information.
    """

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        SUCCESS = 'success', 'Success'
        FAILED = 'failed', 'Failed'
        RETRYING = 'retrying', 'Retrying'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Link to automation rule
    automation_rule = models.ForeignKey(
        AutomationRule,
        on_delete=models.CASCADE,
        related_name='deliveries',
        null=True,
        blank=True
    )

    # Link to workflow (for quick access)
    workflow = models.ForeignKey(
        Workflow,
        on_delete=models.CASCADE,
        related_name='deliveries',
        null=True,
        blank=True
    )

    # Request details
    url = models.URLField()
    method = models.CharField(max_length=10, default='POST')
    headers = models.JSONField(default=dict)
    payload = models.JSONField()

    # Response details
    status_code = models.IntegerField(null=True, blank=True)
    response_body = models.TextField(blank=True)
    response_time_ms = models.IntegerField(null=True, blank=True)

    # Delivery status
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )
    attempts = models.PositiveIntegerField(default=0)
    max_attempts = models.PositiveIntegerField(default=3)
    next_retry_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True)

    # Context (what triggered this delivery)
    trigger_content_type = models.ForeignKey(
        ContentType,
        on_delete=models.SET_NULL,
        null=True
    )
    trigger_object_id = models.CharField(max_length=50)
    triggered_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    # Test mode
    is_test = models.BooleanField(
        default=False,
        help_text="Whether this was a test delivery"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'webhook_deliveries'
        ordering = ['-created_at']
        verbose_name = 'Webhook Delivery'
        verbose_name_plural = 'Webhook Deliveries'

    def __str__(self):
        return f"{self.method} {self.url} - {self.status}"


class WebhookReceipt(models.Model):
    """
    Log of inbound webhook receipts.

    Records every webhook received, including the payload,
    processing result, and any records created.
    """

    class Status(models.TextChoices):
        SUCCESS = 'success', 'Success'
        FAILED = 'failed', 'Failed'
        INVALID_AUTH = 'invalid_auth', 'Invalid Authentication'
        VALIDATION_ERROR = 'validation_error', 'Validation Error'
        RATE_LIMITED = 'rate_limited', 'Rate Limited'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Link to endpoint
    endpoint = models.ForeignKey(
        WebhookEndpoint,
        on_delete=models.CASCADE,
        related_name='receipts'
    )

    # Request details
    headers = models.JSONField()
    payload = models.JSONField()
    ip_address = models.GenericIPAddressField()

    # Processing result
    status = models.CharField(max_length=20, choices=Status.choices)
    error_message = models.TextField(blank=True)

    # Result (what was created/updated)
    created_content_type = models.ForeignKey(
        ContentType,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    created_object_id = models.CharField(max_length=50, blank=True)

    # Performance
    processing_time_ms = models.IntegerField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'webhook_receipts'
        ordering = ['-created_at']
        verbose_name = 'Webhook Receipt'
        verbose_name_plural = 'Webhook Receipts'

    def __str__(self):
        return f"{self.endpoint.name} - {self.status} ({self.created_at})"


class WorkflowExecution(models.Model):
    """
    Log of workflow executions.

    Records each time a workflow is triggered, including
    all nodes executed and their results.
    """

    class Status(models.TextChoices):
        RUNNING = 'running', 'Running'
        SUCCESS = 'success', 'Success'
        PARTIAL = 'partial', 'Partial Success'
        FAILED = 'failed', 'Failed'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    workflow = models.ForeignKey(
        Workflow,
        on_delete=models.CASCADE,
        related_name='executions'
    )

    # Trigger context
    trigger_type = models.CharField(max_length=30)
    trigger_content_type = models.ForeignKey(
        ContentType,
        on_delete=models.SET_NULL,
        null=True
    )
    trigger_object_id = models.CharField(max_length=50, blank=True)
    trigger_data = models.JSONField(
        default=dict,
        help_text="Snapshot of trigger data at execution time"
    )

    # Execution details
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.RUNNING
    )
    nodes_executed = models.JSONField(
        default=list,
        help_text="List of node IDs that were executed"
    )
    node_results = models.JSONField(
        default=dict,
        help_text="Results for each node executed"
    )
    error_message = models.TextField(blank=True)

    # Test mode
    is_test = models.BooleanField(default=False)

    # Performance
    execution_time_ms = models.IntegerField(null=True, blank=True)

    # Audit
    triggered_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'workflow_executions'
        ordering = ['-started_at']
        verbose_name = 'Workflow Execution'
        verbose_name_plural = 'Workflow Executions'

    def __str__(self):
        return f"{self.workflow.name} - {self.status} ({self.started_at})"


class RuleExecution(models.Model):
    """
    Log of automation rule executions.

    Records each time an AutomationRule is triggered, including
    the trigger context, action result, and any errors.
    """

    class Status(models.TextChoices):
        RUNNING = 'running', 'Running'
        SUCCESS = 'success', 'Success'
        FAILED = 'failed', 'Failed'
        SKIPPED = 'skipped', 'Skipped (conditions not met)'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    rule = models.ForeignKey(
        AutomationRule,
        on_delete=models.CASCADE,
        related_name='executions'
    )

    # Trigger context
    trigger_type = models.CharField(max_length=30)
    trigger_content_type = models.ForeignKey(
        ContentType,
        on_delete=models.SET_NULL,
        null=True
    )
    trigger_object_id = models.CharField(max_length=50, blank=True)
    trigger_data = models.JSONField(
        default=dict,
        help_text="Snapshot of old_values and new_values at execution time"
    )

    # Execution details
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.RUNNING
    )
    action_type = models.CharField(max_length=30, blank=True)
    action_result = models.JSONField(
        default=dict,
        help_text="Result returned by the action executor"
    )
    error_message = models.TextField(blank=True)

    # Test mode
    is_test = models.BooleanField(
        default=False,
        help_text="Whether this was a test execution"
    )

    # Performance
    execution_time_ms = models.IntegerField(null=True, blank=True)

    # Audit
    triggered_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="User who triggered this (for manual/test executions)"
    )
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'rule_executions'
        ordering = ['-started_at']
        verbose_name = 'Rule Execution'
        verbose_name_plural = 'Rule Executions'
        indexes = [
            models.Index(fields=['rule', '-started_at']),
            models.Index(fields=['status', '-started_at']),
        ]

    def __str__(self):
        return f"{self.rule.name} - {self.status} ({self.started_at})"

    @property
    def duration_display(self):
        """Human-readable duration."""
        if self.execution_time_ms is None:
            return None
        if self.execution_time_ms < 1000:
            return f"{self.execution_time_ms}ms"
        return f"{self.execution_time_ms / 1000:.2f}s"


class ScheduledTriggerExecution(models.Model):
    """
    Track which records have had scheduled triggers executed.

    This prevents duplicate executions - once a scheduled trigger runs for a
    specific record (e.g., "24 hours before interview"), it won't run again
    unless the schedule changes.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    rule = models.ForeignKey(
        AutomationRule,
        on_delete=models.CASCADE,
        related_name='scheduled_executions'
    )

    # The record that was processed
    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE
    )
    object_id = models.CharField(max_length=50)

    # The datetime value that triggered this execution
    # (e.g., the scheduled_at value that was within the trigger window)
    trigger_datetime = models.DateTimeField(
        help_text="The datetime field value that triggered this execution"
    )

    # Execution tracking
    executed_at = models.DateTimeField(auto_now_add=True)
    execution = models.ForeignKey(
        RuleExecution,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='scheduled_trigger'
    )

    class Meta:
        db_table = 'scheduled_trigger_executions'
        ordering = ['-executed_at']
        verbose_name = 'Scheduled Trigger Execution'
        verbose_name_plural = 'Scheduled Trigger Executions'
        # Prevent duplicate executions for the same record+rule+datetime
        unique_together = ['rule', 'content_type', 'object_id', 'trigger_datetime']
        indexes = [
            models.Index(fields=['rule', 'content_type', 'object_id']),
        ]

    def __str__(self):
        return f"{self.rule.name} - {self.object_id} @ {self.trigger_datetime}"
