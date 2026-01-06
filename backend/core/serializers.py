from rest_framework import serializers
from .models import (
    OnboardingStage,
    OnboardingHistory,
    DashboardSettings,
    Task,
    TaskPriority,
    TaskStatus,
    TaskActivity,
    TaskActivityType,
    TaskNote,
)


class OnboardingStageSerializer(serializers.ModelSerializer):
    """Serializer for OnboardingStage model."""

    class Meta:
        model = OnboardingStage
        fields = [
            'id',
            'name',
            'slug',
            'entity_type',
            'order',
            'color',
            'is_terminal',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'slug', 'created_at', 'updated_at']


class OnboardingStageCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating OnboardingStage."""

    class Meta:
        model = OnboardingStage
        fields = [
            'name',
            'entity_type',
            'order',
            'color',
            'is_terminal',
        ]

    def validate(self, data):
        """Ensure unique order within entity_type."""
        entity_type = data.get('entity_type')
        order = data.get('order')

        # Check for existing stage with same entity_type and order
        existing = OnboardingStage.objects.filter(
            entity_type=entity_type,
            order=order,
            is_active=True,
        )
        if self.instance:
            existing = existing.exclude(pk=self.instance.pk)

        if existing.exists():
            raise serializers.ValidationError({
                'order': f'A stage with order {order} already exists for {entity_type}.'
            })

        return data


class OnboardingStageUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating OnboardingStage."""

    class Meta:
        model = OnboardingStage
        fields = [
            'name',
            'order',
            'color',
            'is_terminal',
            'is_active',
        ]


class OnboardingStageReorderSerializer(serializers.Serializer):
    """Serializer for reordering stages."""
    entity_type = serializers.ChoiceField(choices=['company', 'candidate'])
    stage_ids = serializers.ListField(
        child=serializers.IntegerField(),
        min_length=1,
    )

    def validate_stage_ids(self, value):
        """Ensure all stage IDs exist and belong to the specified entity_type."""
        entity_type = self.initial_data.get('entity_type')
        stages = OnboardingStage.objects.filter(
            id__in=value,
            entity_type=entity_type,
            is_active=True,
        )
        if stages.count() != len(value):
            raise serializers.ValidationError(
                'One or more stage IDs are invalid or do not belong to the specified entity type.'
            )
        return value


class OnboardingHistorySerializer(serializers.ModelSerializer):
    """Serializer for OnboardingHistory model."""
    from_stage = OnboardingStageSerializer(read_only=True)
    to_stage = OnboardingStageSerializer(read_only=True)
    changed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = OnboardingHistory
        fields = [
            'id',
            'entity_type',
            'entity_id',
            'from_stage',
            'to_stage',
            'changed_by',
            'changed_by_name',
            'notes',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def get_changed_by_name(self, obj):
        if obj.changed_by:
            return obj.changed_by.get_full_name() or obj.changed_by.email
        return None


class OnboardingStageMinimalSerializer(serializers.ModelSerializer):
    """Minimal serializer for embedding in Company/Candidate serializers."""

    class Meta:
        model = OnboardingStage
        fields = ['id', 'name', 'slug', 'color', 'is_terminal', 'order']


class DashboardSettingsSerializer(serializers.ModelSerializer):
    """Serializer for DashboardSettings singleton model."""

    class Meta:
        model = DashboardSettings
        fields = [
            'days_without_contact',
            'days_stuck_in_stage',
            'days_before_interview_prep',
            'updated_at',
        ]
        read_only_fields = ['updated_at']


# ============================================================================
# Task Serializers
# ============================================================================

class TaskSerializer(serializers.ModelSerializer):
    """Full serializer for Task model."""
    assigned_to_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    stage_template_name = serializers.SerializerMethodField()
    is_overdue = serializers.BooleanField(read_only=True)
    bottleneck_detection = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            'id',
            'entity_type',
            'entity_id',
            'stage_template',
            'stage_template_name',
            'title',
            'description',
            'priority',
            'status',
            'due_date',
            'completed_at',
            'assigned_to',
            'assigned_to_name',
            'created_by',
            'created_by_name',
            'is_overdue',
            'created_at',
            'updated_at',
            'bottleneck_detection',
        ]
        read_only_fields = ['id', 'completed_at', 'created_by', 'created_at', 'updated_at']

    def get_assigned_to_name(self, obj):
        if obj.assigned_to:
            return obj.assigned_to.get_full_name() or obj.assigned_to.email
        return None

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.email
        return None

    def get_stage_template_name(self, obj):
        if obj.stage_template:
            return obj.stage_template.name
        return None

    def get_bottleneck_detection(self, obj):
        """Get bottleneck detection info if this task was auto-created."""
        detection = obj.bottleneck_detections.select_related('rule').first()
        if detection:
            return {
                'id': str(detection.id),
                'rule_name': detection.rule.name,
                'severity': detection.severity,
                'detected_at': detection.detected_at.isoformat(),
            }
        return None


class TaskCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating tasks."""

    class Meta:
        model = Task
        fields = [
            'entity_type',
            'entity_id',
            'stage_template',
            'title',
            'description',
            'priority',
            'due_date',
            'assigned_to',
        ]

    def create(self, validated_data):
        # Set created_by from request user
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class TaskUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating tasks."""

    class Meta:
        model = Task
        fields = [
            'title',
            'description',
            'priority',
            'status',
            'due_date',
            'assigned_to',
            'stage_template',
        ]

    def update(self, instance, validated_data):
        # Auto-set completed_at when status changes to completed
        from django.utils import timezone
        new_status = validated_data.get('status')
        if new_status == TaskStatus.COMPLETED and instance.status != TaskStatus.COMPLETED:
            validated_data['completed_at'] = timezone.now()
        elif new_status and new_status != TaskStatus.COMPLETED:
            validated_data['completed_at'] = None

        # Set current user for activity logging
        if 'request' in self.context:
            instance._current_user = self.context['request'].user

        return super().update(instance, validated_data)


class TaskActivitySerializer(serializers.ModelSerializer):
    """Serializer for TaskActivity model."""
    performed_by_name = serializers.SerializerMethodField()
    activity_type_display = serializers.CharField(source='get_activity_type_display', read_only=True)

    class Meta:
        model = TaskActivity
        fields = [
            'id',
            'task',
            'activity_type',
            'activity_type_display',
            'old_value',
            'new_value',
            'description',
            'performed_by',
            'performed_by_name',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def get_performed_by_name(self, obj):
        if obj.performed_by:
            return obj.performed_by.get_full_name() or obj.performed_by.email
        return None


class TaskNoteSerializer(serializers.ModelSerializer):
    """Serializer for TaskNote model."""
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = TaskNote
        fields = [
            'id',
            'task',
            'content',
            'created_by',
            'created_by_name',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.email
        return None

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class TaskNoteCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating TaskNote."""

    class Meta:
        model = TaskNote
        fields = ['task', 'content']

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


# ============================================================================
# Timeline Serializers (for aggregate view)
# ============================================================================

class TimelinePerformerSerializer(serializers.Serializer):
    """Serializer for the performer of a timeline entry."""
    id = serializers.CharField()
    name = serializers.CharField()
    email = serializers.EmailField()


class TimelineEntrySerializer(serializers.Serializer):
    """
    Read-only serializer for unified timeline entries.
    Maps activities from multiple sources to a common format.
    """
    id = serializers.CharField()
    source = serializers.ChoiceField(choices=[
        'lead_activity',
        'company_activity',
        'onboarding_history',
        'activity_log',
        'candidate_activity',
        'booking',
        'stage_feedback',
        'task',
    ])
    activity_type = serializers.CharField()
    title = serializers.CharField()
    content = serializers.CharField(allow_blank=True)
    performed_by = TimelinePerformerSerializer(allow_null=True)
    metadata = serializers.DictField()
    created_at = serializers.DateTimeField()
