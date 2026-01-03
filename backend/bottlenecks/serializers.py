from rest_framework import serializers
from .models import BottleneckRule, BottleneckDetection, BottleneckRuleExecution, BottleneckEntityType, BottleneckType, DetectionSeverity


class BottleneckRuleSerializer(serializers.ModelSerializer):
    """Serializer for reading BottleneckRule."""
    created_by_name = serializers.SerializerMethodField()
    entity_type_display = serializers.CharField(source='get_entity_type_display', read_only=True)
    bottleneck_type_display = serializers.CharField(source='get_bottleneck_type_display', read_only=True)
    schedule_display = serializers.SerializerMethodField()

    class Meta:
        model = BottleneckRule
        fields = [
            'id',
            'name',
            'description',
            'entity_type',
            'entity_type_display',
            'bottleneck_type',
            'bottleneck_type_display',
            'detection_config',
            'filter_conditions',
            'send_notification',
            'notification_config',
            'create_task',
            'task_config',
            'cooldown_hours',
            'enable_warnings',
            'warning_threshold_percentage',
            'is_active',
            'run_on_schedule',
            'schedule_interval_minutes',
            'schedule_display',
            'next_run_at',
            'last_run_at',
            'total_detections',
            'total_notifications_sent',
            'total_tasks_created',
            'created_by',
            'created_by_name',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'next_run_at',
            'last_run_at',
            'total_detections',
            'total_notifications_sent',
            'total_tasks_created',
            'created_by',
            'created_at',
            'updated_at',
        ]

    def get_schedule_display(self, obj):
        """Return human-readable schedule interval."""
        minutes = obj.schedule_interval_minutes
        if minutes < 60:
            return f"Every {minutes} min"
        elif minutes == 60:
            return "Hourly"
        elif minutes < 1440:
            hours = minutes // 60
            return f"Every {hours} hour{'s' if hours > 1 else ''}"
        elif minutes == 1440:
            return "Daily"
        else:
            days = minutes // 1440
            return f"Every {days} day{'s' if days > 1 else ''}"

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.email
        return None


class BottleneckRuleCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating BottleneckRule."""

    class Meta:
        model = BottleneckRule
        fields = [
            'name',
            'description',
            'entity_type',
            'bottleneck_type',
            'detection_config',
            'filter_conditions',
            'send_notification',
            'notification_config',
            'create_task',
            'task_config',
            'cooldown_hours',
            'enable_warnings',
            'warning_threshold_percentage',
            'is_active',
            'run_on_schedule',
            'schedule_interval_minutes',
        ]

    def validate_detection_config(self, value):
        """Validate detection_config structure."""
        if not isinstance(value, dict):
            raise serializers.ValidationError("detection_config must be a dictionary")

        detection_type = value.get('type')
        valid_types = ['stage_duration', 'last_activity', 'count_in_state', 'overdue', 'custom']

        if detection_type and detection_type not in valid_types:
            raise serializers.ValidationError(
                f"Invalid detection type. Must be one of: {', '.join(valid_types)}"
            )

        return value

    def validate_filter_conditions(self, value):
        """Validate filter_conditions is a list."""
        if not isinstance(value, list):
            raise serializers.ValidationError("filter_conditions must be a list")
        return value

    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user
        return super().create(validated_data)


class BottleneckRuleUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating BottleneckRule."""

    class Meta:
        model = BottleneckRule
        fields = [
            'name',
            'description',
            'entity_type',
            'bottleneck_type',
            'detection_config',
            'filter_conditions',
            'send_notification',
            'notification_config',
            'create_task',
            'task_config',
            'cooldown_hours',
            'enable_warnings',
            'warning_threshold_percentage',
            'is_active',
            'run_on_schedule',
            'schedule_interval_minutes',
        ]

    def validate_detection_config(self, value):
        """Validate detection_config structure."""
        if not isinstance(value, dict):
            raise serializers.ValidationError("detection_config must be a dictionary")
        return value


class BottleneckDetectionSerializer(serializers.ModelSerializer):
    """Serializer for reading BottleneckDetection."""
    rule_name = serializers.CharField(source='rule.name', read_only=True)
    resolved_by_name = serializers.SerializerMethodField()
    entity_name = serializers.SerializerMethodField()
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)

    class Meta:
        model = BottleneckDetection
        fields = [
            'id',
            'rule',
            'rule_name',
            'entity_type',
            'entity_id',
            'entity_name',
            'severity',
            'severity_display',
            'current_value',
            'threshold_value',
            'projected_breach_at',
            'detection_data',
            'notification_sent',
            'notification',
            'task_created',
            'task',
            'is_resolved',
            'resolved_at',
            'resolved_by',
            'resolved_by_name',
            'resolution_notes',
            'detected_at',
        ]
        read_only_fields = fields

    def get_resolved_by_name(self, obj):
        if obj.resolved_by:
            return obj.resolved_by.get_full_name() or obj.resolved_by.email
        return None

    def get_entity_name(self, obj):
        """Resolve entity name based on entity_type and entity_id."""
        try:
            if obj.entity_type == 'candidate':
                from candidates.models import CandidateProfile
                candidate = CandidateProfile.objects.select_related('user').filter(id=obj.entity_id).first()
                if candidate:
                    return candidate.full_name
            elif obj.entity_type == 'application':
                from jobs.models import Application
                app = Application.objects.select_related('candidate__user', 'job').filter(id=obj.entity_id).first()
                if app:
                    return f"{app.candidate.full_name} - {app.job.title}"
            elif obj.entity_type == 'task':
                from core.models import Task
                task = Task.objects.filter(id=obj.entity_id).first()
                if task:
                    return task.title
            elif obj.entity_type == 'lead':
                from companies.models import Lead
                lead = Lead.objects.filter(id=obj.entity_id).first()
                if lead:
                    return lead.name or lead.company_name or f"Lead {obj.entity_id[:8]}"
            elif obj.entity_type == 'company':
                from companies.models import Company
                company = Company.objects.filter(id=obj.entity_id).first()
                if company:
                    return company.name
            elif obj.entity_type == 'stage_instance':
                from jobs.models import ApplicationStageInstance
                instance = ApplicationStageInstance.objects.select_related(
                    'application__candidate__user', 'stage_template'
                ).filter(id=obj.entity_id).first()
                if instance:
                    return f"{instance.application.candidate.full_name} - {instance.stage_template.name}"
        except Exception:
            pass
        return f"{obj.entity_type}:{obj.entity_id[:8]}..."


class BottleneckRuleQuickUpdateSerializer(serializers.Serializer):
    """Serializer for quick threshold updates from analytics UI."""
    threshold_days = serializers.IntegerField(required=False, min_value=1)
    threshold_count = serializers.IntegerField(required=False, min_value=1)
    is_active = serializers.BooleanField(required=False)

    def update(self, instance, validated_data):
        if 'threshold_days' in validated_data:
            config = instance.detection_config or {}
            config['threshold_days'] = validated_data['threshold_days']
            instance.detection_config = config

        if 'threshold_count' in validated_data:
            config = instance.detection_config or {}
            config['threshold_count'] = validated_data['threshold_count']
            instance.detection_config = config

        if 'is_active' in validated_data:
            instance.is_active = validated_data['is_active']

        instance.save()
        return instance


class EntityTypeSerializer(serializers.Serializer):
    """Serializer for available entity types."""
    value = serializers.CharField()
    label = serializers.CharField()


class BottleneckTypeSerializer(serializers.Serializer):
    """Serializer for available bottleneck types."""
    value = serializers.CharField()
    label = serializers.CharField()


class BottleneckAnalyticsSummarySerializer(serializers.Serializer):
    """Serializer for bottleneck analytics summary."""
    total_rules = serializers.IntegerField()
    active_rules = serializers.IntegerField()
    total_detections = serializers.IntegerField()
    unresolved_detections = serializers.IntegerField()
    detections_today = serializers.IntegerField()
    notifications_sent_today = serializers.IntegerField()
    tasks_created_today = serializers.IntegerField()
    by_entity_type = serializers.ListField()


class BottleneckRuleExecutionSerializer(serializers.ModelSerializer):
    """Serializer for reading BottleneckRuleExecution."""
    rule_name = serializers.CharField(source='rule.name', read_only=True)
    triggered_by_name = serializers.SerializerMethodField()
    trigger_display = serializers.CharField(source='get_trigger_display', read_only=True)
    duration_display = serializers.CharField(read_only=True)

    class Meta:
        model = BottleneckRuleExecution
        fields = [
            'id',
            'rule',
            'rule_name',
            'trigger',
            'trigger_display',
            'triggered_by',
            'triggered_by_name',
            'started_at',
            'completed_at',
            'duration_ms',
            'duration_display',
            'entities_scanned',
            'entities_matched',
            'entities_in_cooldown',
            'detections_created',
            'notifications_sent',
            'tasks_created',
            'matched_entity_ids',
            'rule_config_snapshot',
            'success',
            'error_message',
        ]
        read_only_fields = fields

    def get_triggered_by_name(self, obj):
        if obj.triggered_by:
            return obj.triggered_by.get_full_name() or obj.triggered_by.email
        return None


class BottleneckRuleExecutionListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing executions (without matched_entity_ids)."""
    rule_name = serializers.CharField(source='rule.name', read_only=True)
    triggered_by_name = serializers.SerializerMethodField()
    trigger_display = serializers.CharField(source='get_trigger_display', read_only=True)
    duration_display = serializers.CharField(read_only=True)

    class Meta:
        model = BottleneckRuleExecution
        fields = [
            'id',
            'rule',
            'rule_name',
            'trigger',
            'trigger_display',
            'triggered_by',
            'triggered_by_name',
            'started_at',
            'completed_at',
            'duration_ms',
            'duration_display',
            'entities_scanned',
            'entities_matched',
            'entities_in_cooldown',
            'detections_created',
            'notifications_sent',
            'tasks_created',
            'success',
            'error_message',
        ]
        read_only_fields = fields

    def get_triggered_by_name(self, obj):
        if obj.triggered_by:
            return obj.triggered_by.get_full_name() or obj.triggered_by.email
        return None


class ExecutionComparisonSerializer(serializers.Serializer):
    """Serializer for comparing two executions."""
    current = BottleneckRuleExecutionSerializer()
    previous = BottleneckRuleExecutionSerializer(allow_null=True)
    new_entities = serializers.ListField(child=serializers.CharField())
    resolved_entities = serializers.ListField(child=serializers.CharField())
    persistent_entities = serializers.ListField(child=serializers.CharField())
