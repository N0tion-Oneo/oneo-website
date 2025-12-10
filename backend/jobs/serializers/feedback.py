from rest_framework import serializers
from ..models import StageFeedback, StageFeedbackType


class StageFeedbackAuthorSerializer(serializers.Serializer):
    """Minimal author info for feedback display."""
    id = serializers.UUIDField()
    email = serializers.EmailField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    full_name = serializers.CharField()


class StageFeedbackSerializer(serializers.ModelSerializer):
    """Serializer for reading stage feedback."""
    author = StageFeedbackAuthorSerializer(read_only=True)
    stage_name = serializers.SerializerMethodField()

    class Meta:
        model = StageFeedback
        fields = [
            'id',
            'application',
            'stage_type',
            'stage_instance',
            'author',
            'comment',
            'score',
            'stage_name',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'application', 'author', 'created_at', 'updated_at']

    def get_stage_name(self, obj):
        """Return a human-readable stage name."""
        if obj.stage_instance:
            return obj.stage_instance.stage_template.name
        if obj.stage_type:
            return obj.get_stage_type_display()
        return None


class StageFeedbackCreateSerializer(serializers.Serializer):
    """Serializer for creating stage feedback."""
    comment = serializers.CharField(required=True)
    score = serializers.IntegerField(required=False, allow_null=True, min_value=1, max_value=10)
    # For status stages (Applied/Shortlisted)
    stage_type = serializers.ChoiceField(
        choices=[StageFeedbackType.APPLIED, StageFeedbackType.SHORTLISTED],
        required=False,
        allow_null=True,
    )
    # For interview stages
    stage_instance_id = serializers.UUIDField(required=False, allow_null=True)

    def validate(self, data):
        """Ensure either stage_type or stage_instance_id is provided, not both."""
        stage_type = data.get('stage_type')
        stage_instance_id = data.get('stage_instance_id')

        if stage_type and stage_instance_id:
            raise serializers.ValidationError(
                'Provide either stage_type or stage_instance_id, not both.'
            )
        if not stage_type and not stage_instance_id:
            raise serializers.ValidationError(
                'Must provide either stage_type or stage_instance_id.'
            )
        return data


class StageFeedbackUpdateSerializer(serializers.Serializer):
    """Serializer for updating stage feedback."""
    comment = serializers.CharField(required=False)
    score = serializers.IntegerField(required=False, allow_null=True, min_value=1, max_value=10)
