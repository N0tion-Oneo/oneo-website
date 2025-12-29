"""
Serializers for Automations API.
"""

from rest_framework import serializers
from django.contrib.contenttypes.models import ContentType
from .models import (
    Workflow,
    WebhookEndpoint,
    AutomationRule,
    WebhookDelivery,
    WebhookReceipt,
    WorkflowExecution,
    RuleExecution,
)
from .registry import AutomatableModelRegistry


class WorkflowSerializer(serializers.ModelSerializer):
    """Serializer for Workflow model."""

    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Workflow
        fields = [
            'id',
            'name',
            'description',
            'nodes',
            'edges',
            'is_active',
            'last_executed_at',
            'total_executions',
            'total_success',
            'total_failed',
            'created_by',
            'created_by_name',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'last_executed_at',
            'total_executions',
            'total_success',
            'total_failed',
            'created_by',
            'created_by_name',
            'created_at',
            'updated_at',
        ]

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.email
        return None


class WorkflowListSerializer(serializers.ModelSerializer):
    """Simplified serializer for workflow list view."""

    created_by_name = serializers.SerializerMethodField()
    trigger_count = serializers.SerializerMethodField()
    action_count = serializers.SerializerMethodField()

    class Meta:
        model = Workflow
        fields = [
            'id',
            'name',
            'description',
            'is_active',
            'trigger_count',
            'action_count',
            'last_executed_at',
            'total_executions',
            'total_success',
            'total_failed',
            'created_by_name',
            'created_at',
            'updated_at',
        ]

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.email
        return None

    def get_trigger_count(self, obj):
        return len([n for n in obj.nodes if n.get('type') == 'trigger'])

    def get_action_count(self, obj):
        return len([n for n in obj.nodes if n.get('type') == 'action'])


class WebhookEndpointSerializer(serializers.ModelSerializer):
    """Full serializer for WebhookEndpoint model."""

    webhook_url = serializers.ReadOnlyField()
    target_model = serializers.SerializerMethodField()
    target_model_display = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    target_fields = serializers.SerializerMethodField()

    class Meta:
        model = WebhookEndpoint
        fields = [
            'id',
            'workflow',
            'node_id',
            'name',
            'slug',
            'description',
            'auth_type',
            'api_key',
            'target_content_type',
            'target_model',
            'target_model_display',
            'target_action',
            'field_mapping',
            'default_values',
            'dedupe_field',
            'is_active',
            'rate_limit_per_minute',
            'webhook_url',
            'last_received_at',
            'total_received',
            'total_success',
            'total_failed',
            'created_by',
            'created_by_name',
            'created_at',
            'updated_at',
            'target_fields',
        ]
        read_only_fields = [
            'id',
            'api_key',
            'webhook_url',
            'last_received_at',
            'total_received',
            'total_success',
            'total_failed',
            'created_by',
            'created_by_name',
            'created_at',
            'updated_at',
            'target_fields',
        ]

    def get_target_model(self, obj):
        ct = obj.target_content_type
        return f"{ct.app_label}.{ct.model}"

    def get_target_model_display(self, obj):
        """Get human-readable model name."""
        ct = obj.target_content_type
        model_key = f"{ct.app_label}.{ct.model}"
        config = AutomatableModelRegistry.get_by_key(model_key)
        if config:
            return config.get('display_name', ct.model.title())
        return ct.model.title()

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.email
        return None

    def get_target_fields(self, obj):
        """Get available fields for the target model."""
        ct = obj.target_content_type
        model_key = f"{ct.app_label}.{ct.model}"
        config = AutomatableModelRegistry.get_by_key(model_key)
        if config:
            return config.get('fields', [])
        return []


class WebhookEndpointListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for webhook endpoint list view."""

    webhook_url = serializers.ReadOnlyField()
    target_model = serializers.SerializerMethodField()
    target_model_display = serializers.SerializerMethodField()
    success_rate = serializers.SerializerMethodField()

    class Meta:
        model = WebhookEndpoint
        fields = [
            'id',
            'name',
            'slug',
            'description',
            'auth_type',
            'target_model',
            'target_model_display',
            'target_action',
            'is_active',
            'webhook_url',
            'last_received_at',
            'total_received',
            'total_success',
            'total_failed',
            'success_rate',
            'created_at',
        ]

    def get_target_model(self, obj):
        ct = obj.target_content_type
        return f"{ct.app_label}.{ct.model}"

    def get_target_model_display(self, obj):
        ct = obj.target_content_type
        model_key = f"{ct.app_label}.{ct.model}"
        config = AutomatableModelRegistry.get_by_key(model_key)
        if config:
            return config.get('display_name', ct.model.title())
        return ct.model.title()

    def get_success_rate(self, obj):
        if obj.total_received > 0:
            return round((obj.total_success / obj.total_received) * 100, 1)
        return None


class WebhookEndpointCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating webhook endpoints."""

    target_model = serializers.CharField(write_only=True)

    class Meta:
        model = WebhookEndpoint
        fields = [
            'name',
            'slug',
            'description',
            'auth_type',
            'target_model',
            'target_action',
            'field_mapping',
            'default_values',
            'dedupe_field',
            'is_active',
            'rate_limit_per_minute',
        ]

    def validate_target_model(self, value):
        """Convert model string to ContentType."""
        if not value:
            raise serializers.ValidationError("Target model is required.")
        try:
            app_label, model = value.split('.')
            ct = ContentType.objects.get(app_label=app_label, model=model)
            # Verify model is in the automatable registry
            config = AutomatableModelRegistry.get_by_key(value)
            if not config:
                raise serializers.ValidationError(
                    f"Model '{value}' is not registered for automation."
                )
            return ct
        except ValueError:
            raise serializers.ValidationError(
                f"Invalid model format: '{value}'. Use 'app_label.model' format."
            )
        except ContentType.DoesNotExist:
            raise serializers.ValidationError(f"Model not found: {value}")

    def validate_slug(self, value):
        """Ensure slug is unique (except for current instance on update)."""
        instance = self.instance
        if instance:
            # Update - allow same slug for this instance
            if WebhookEndpoint.objects.filter(slug=value).exclude(id=instance.id).exists():
                raise serializers.ValidationError("A webhook endpoint with this slug already exists.")
        else:
            # Create - slug must be unique
            if WebhookEndpoint.objects.filter(slug=value).exists():
                raise serializers.ValidationError("A webhook endpoint with this slug already exists.")
        return value

    def validate_field_mapping(self, value):
        """Validate field mapping structure."""
        if not isinstance(value, dict):
            raise serializers.ValidationError("Field mapping must be a dictionary.")
        return value

    def validate_default_values(self, value):
        """Validate default values structure."""
        if not isinstance(value, dict):
            raise serializers.ValidationError("Default values must be a dictionary.")
        return value

    def create(self, validated_data):
        target_model = validated_data.pop('target_model')
        validated_data['target_content_type'] = target_model
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)

    def update(self, instance, validated_data):
        target_model = validated_data.pop('target_model', None)
        if target_model:
            validated_data['target_content_type'] = target_model
        return super().update(instance, validated_data)


class AutomationRuleSerializer(serializers.ModelSerializer):
    """Serializer for AutomationRule model."""

    trigger_model = serializers.SerializerMethodField()
    trigger_display = serializers.ReadOnlyField()
    action_display = serializers.ReadOnlyField()
    notification_template_info = serializers.SerializerMethodField()

    class Meta:
        model = AutomationRule
        fields = [
            'id',
            'workflow',
            'name',
            'description',
            'trigger_type',
            'trigger_content_type',
            'trigger_model',
            'trigger_display',
            'trigger_conditions',
            'schedule_config',
            'signal_name',
            'action_type',
            'action_config',
            'action_display',
            'notification_template',
            'notification_template_info',
            'is_active',
            'run_async',
            'rate_limit_per_minute',
            'last_triggered_at',
            'total_executions',
            'total_success',
            'total_failed',
            'created_by',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'trigger_display',
            'action_display',
            'notification_template_info',
            'last_triggered_at',
            'total_executions',
            'total_success',
            'total_failed',
            'created_by',
            'created_at',
            'updated_at',
        ]

    def get_trigger_model(self, obj):
        ct = obj.trigger_content_type
        if ct:
            return f"{ct.app_label}.{ct.model}"
        return None

    def get_notification_template_info(self, obj):
        """Return template details if a notification template is set."""
        if not obj.notification_template:
            return None
        t = obj.notification_template
        return {
            'id': str(t.id),
            'name': t.name,
            'template_type': t.template_type,
            'recipient_type': t.recipient_type,
            'default_channel': t.default_channel,
            'title_template': t.title_template,
        }


class AutomationRuleListSerializer(serializers.ModelSerializer):
    """Simplified serializer for rule list view."""

    trigger_model = serializers.SerializerMethodField()
    trigger_display = serializers.ReadOnlyField()
    action_display = serializers.ReadOnlyField()
    notification_template_name = serializers.SerializerMethodField()

    class Meta:
        model = AutomationRule
        fields = [
            'id',
            'name',
            'description',
            'trigger_type',
            'trigger_model',
            'trigger_display',
            'trigger_conditions',
            'schedule_config',
            'signal_name',
            'action_type',
            'action_display',
            'notification_template',
            'notification_template_name',
            'is_active',
            'last_triggered_at',
            'total_executions',
            'total_success',
            'total_failed',
            'created_at',
            'updated_at',
        ]

    def get_trigger_model(self, obj):
        ct = obj.trigger_content_type
        if ct:
            return f"{ct.app_label}.{ct.model}"
        return None

    def get_notification_template_name(self, obj):
        """Return template name if set."""
        return obj.notification_template.name if obj.notification_template else None


class AutomationRuleCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating automation rules."""

    trigger_model = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = AutomationRule
        fields = [
            'name',
            'description',
            'trigger_type',
            'trigger_model',
            'signal_name',
            'trigger_conditions',
            'schedule_config',
            'action_type',
            'action_config',
            'notification_template',
            'is_active',
        ]

    def validate_trigger_model(self, value):
        """Convert model string to ContentType."""
        if not value:
            return None
        try:
            app_label, model = value.split('.')
            ct = ContentType.objects.get(app_label=app_label, model=model)
            return ct
        except (ValueError, ContentType.DoesNotExist):
            raise serializers.ValidationError(f"Invalid model: {value}")

    def validate(self, data):
        """Validate that either trigger_model or signal_name is provided."""
        trigger_type = data.get('trigger_type')
        trigger_model = data.get('trigger_model')
        signal_name = data.get('signal_name')

        # Non-model triggers require signal_name
        if trigger_type in ['manual', 'signal', 'view_action']:
            if not signal_name:
                raise serializers.ValidationError({
                    'signal_name': 'Signal name is required for manual, signal, and view_action triggers.'
                })
        else:
            # Model-based triggers require trigger_model
            if not trigger_model:
                raise serializers.ValidationError({
                    'trigger_model': 'Trigger model is required for model-based triggers.'
                })
        return data

    def create(self, validated_data):
        trigger_model = validated_data.pop('trigger_model', None)
        if trigger_model:
            validated_data['trigger_content_type'] = trigger_model
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class WebhookDeliverySerializer(serializers.ModelSerializer):
    """Serializer for WebhookDelivery model."""

    workflow_name = serializers.SerializerMethodField()
    rule_name = serializers.SerializerMethodField()

    class Meta:
        model = WebhookDelivery
        fields = [
            'id',
            'automation_rule',
            'rule_name',
            'workflow',
            'workflow_name',
            'url',
            'method',
            'headers',
            'payload',
            'status_code',
            'response_body',
            'response_time_ms',
            'status',
            'attempts',
            'max_attempts',
            'next_retry_at',
            'error_message',
            'trigger_object_id',
            'is_test',
            'created_at',
            'completed_at',
        ]

    def get_workflow_name(self, obj):
        return obj.workflow.name if obj.workflow else None

    def get_rule_name(self, obj):
        return obj.automation_rule.name if obj.automation_rule else None


class WebhookReceiptSerializer(serializers.ModelSerializer):
    """Serializer for WebhookReceipt model."""

    endpoint_name = serializers.SerializerMethodField()

    class Meta:
        model = WebhookReceipt
        fields = [
            'id',
            'endpoint',
            'endpoint_name',
            'headers',
            'payload',
            'ip_address',
            'status',
            'error_message',
            'created_object_id',
            'processing_time_ms',
            'created_at',
        ]

    def get_endpoint_name(self, obj):
        return obj.endpoint.name if obj.endpoint else None


class WorkflowExecutionSerializer(serializers.ModelSerializer):
    """Serializer for WorkflowExecution model."""

    workflow_name = serializers.SerializerMethodField()
    triggered_by_name = serializers.SerializerMethodField()

    class Meta:
        model = WorkflowExecution
        fields = [
            'id',
            'workflow',
            'workflow_name',
            'trigger_type',
            'trigger_object_id',
            'trigger_data',
            'status',
            'nodes_executed',
            'node_results',
            'error_message',
            'is_test',
            'execution_time_ms',
            'triggered_by',
            'triggered_by_name',
            'started_at',
            'completed_at',
        ]

    def get_workflow_name(self, obj):
        return obj.workflow.name if obj.workflow else None

    def get_triggered_by_name(self, obj):
        if obj.triggered_by:
            return obj.triggered_by.get_full_name() or obj.triggered_by.email
        return None


class AutomatableModelSerializer(serializers.Serializer):
    """Serializer for automatable model metadata."""

    key = serializers.CharField()
    display_name = serializers.CharField()
    fields = serializers.ListField(child=serializers.CharField())
    events = serializers.ListField(child=serializers.CharField())
    status_field = serializers.CharField(allow_null=True)


class ModelFieldSerializer(serializers.Serializer):
    """Serializer for model field metadata."""

    name = serializers.CharField()
    type = serializers.CharField()
    required = serializers.BooleanField()
    choices = serializers.ListField(child=serializers.DictField(), required=False)


class RuleExecutionSerializer(serializers.ModelSerializer):
    """Serializer for RuleExecution model."""

    rule_name = serializers.SerializerMethodField()
    trigger_model = serializers.SerializerMethodField()
    triggered_by_name = serializers.SerializerMethodField()
    duration_display = serializers.ReadOnlyField()

    # Live Notification objects (source of truth) - or legacy data for old executions
    notifications = serializers.SerializerMethodField()
    external_emails = serializers.SerializerMethodField()

    class Meta:
        model = RuleExecution
        fields = [
            'id',
            'rule',
            'rule_name',
            'trigger_type',
            'trigger_content_type',
            'trigger_model',
            'trigger_object_id',
            'trigger_data',
            'status',
            'action_type',
            'action_result',
            'error_message',
            'is_test',
            'execution_time_ms',
            'duration_display',
            'triggered_by',
            'triggered_by_name',
            'started_at',
            'completed_at',
            # Live notification data
            'notifications',
            'external_emails',
        ]
        read_only_fields = fields

    def get_rule_name(self, obj):
        return obj.rule.name if obj.rule else None

    def get_trigger_model(self, obj):
        if obj.trigger_content_type:
            return f"{obj.trigger_content_type.app_label}.{obj.trigger_content_type.model}"
        return None

    def get_triggered_by_name(self, obj):
        if obj.triggered_by:
            return obj.triggered_by.get_full_name() or obj.triggered_by.email
        return None

    def get_notifications(self, obj):
        """Fetch Notification objects linked to this execution."""
        from notifications.serializers import NotificationSerializer

        # Query via the FK relationship
        notifications = obj.notifications.all()
        return NotificationSerializer(notifications, many=True).data

    def get_external_emails(self, obj):
        """Get external email recipients (no Notification record)."""
        result = obj.action_result or {}
        return result.get('external_emails', [])


class RuleExecutionListSerializer(serializers.ModelSerializer):
    """Serializer for listing RuleExecutions with full notification details."""

    rule_name = serializers.SerializerMethodField()
    trigger_model = serializers.SerializerMethodField()
    duration_display = serializers.ReadOnlyField()

    # Full notification data via FK
    notifications = serializers.SerializerMethodField()
    external_emails = serializers.SerializerMethodField()

    class Meta:
        model = RuleExecution
        fields = [
            'id',
            'rule',
            'rule_name',
            'trigger_type',
            'trigger_model',
            'trigger_object_id',
            'status',
            'action_type',
            'is_test',
            'duration_display',
            'started_at',
            'completed_at',
            'error_message',
            # Notification data
            'notifications',
            'external_emails',
        ]
        read_only_fields = fields

    def get_rule_name(self, obj):
        return obj.rule.name if obj.rule else None

    def get_trigger_model(self, obj):
        if obj.trigger_content_type:
            return f"{obj.trigger_content_type.app_label}.{obj.trigger_content_type.model}"
        return None

    def get_notifications(self, obj):
        """Fetch Notification objects linked to this execution."""
        from notifications.serializers import NotificationSerializer
        notifications = obj.notifications.all()
        return NotificationSerializer(notifications, many=True).data

    def get_external_emails(self, obj):
        """Get external email recipients."""
        result = obj.action_result or {}
        return result.get('external_emails', [])
