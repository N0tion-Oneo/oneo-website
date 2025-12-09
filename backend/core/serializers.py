from rest_framework import serializers
from .models import OnboardingStage, OnboardingHistory


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
