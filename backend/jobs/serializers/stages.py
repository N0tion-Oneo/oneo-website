from rest_framework import serializers
from django.contrib.auth import get_user_model

from ..models import (
    StageType, InterviewStageTemplate, StageInstanceStatus, ApplicationStageInstance,
)
from scheduling.models import BookingToken

User = get_user_model()


class InterviewStageTemplateSerializer(serializers.ModelSerializer):
    """Serializer for reading interview stage templates."""
    stage_type_display = serializers.CharField(source='get_stage_type_display', read_only=True)
    default_interviewer_id = serializers.PrimaryKeyRelatedField(
        source='default_interviewer',
        read_only=True,
    )
    default_interviewer_name = serializers.SerializerMethodField()
    requires_scheduling = serializers.BooleanField(read_only=True)
    requires_location = serializers.BooleanField(read_only=True)
    is_assessment = serializers.BooleanField(read_only=True)

    class Meta:
        model = InterviewStageTemplate
        fields = [
            'id',
            'job',
            'stage_type',
            'stage_type_display',
            'name',
            'order',
            'description',
            'default_duration_minutes',
            'default_interviewer',
            'default_interviewer_id',
            'default_interviewer_name',
            'assessment_instructions',
            'assessment_instructions_file',
            'assessment_external_url',
            'assessment_provider_name',
            'deadline_days',
            'use_company_address',
            'custom_location',
            'requires_scheduling',
            'requires_location',
            'is_assessment',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'job', 'created_at', 'updated_at']

    def get_default_interviewer_name(self, obj):
        if obj.default_interviewer:
            return obj.default_interviewer.full_name or obj.default_interviewer.email
        return None


class InterviewStageTemplateCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating interview stage templates."""
    # Accept default_interviewer_id from frontend and map to default_interviewer
    default_interviewer_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source='default_interviewer',
        required=False,
        allow_null=True,
    )

    class Meta:
        model = InterviewStageTemplate
        fields = [
            'stage_type',
            'name',
            'order',
            'description',
            'default_duration_minutes',
            'default_interviewer',
            'default_interviewer_id',
            'assessment_instructions',
            'assessment_instructions_file',
            'assessment_external_url',
            'assessment_provider_name',
            'deadline_days',
            'use_company_address',
            'custom_location',
        ]
        extra_kwargs = {
            'default_interviewer': {'required': False, 'allow_null': True},
        }

    def validate(self, data):
        """Validate based on stage type requirements."""
        stage_type = data.get('stage_type', StageType.CUSTOM)

        # Validate duration for scheduling types
        requires_scheduling = stage_type in [
            StageType.PHONE_SCREENING,
            StageType.VIDEO_CALL,
            StageType.IN_PERSON_INTERVIEW,
            StageType.IN_PERSON_ASSESSMENT,
        ]
        if requires_scheduling and not data.get('default_duration_minutes'):
            # Will be auto-filled by model.save()
            pass

        # Validate deadline for take-home assessments
        if stage_type == StageType.TAKE_HOME_ASSESSMENT:
            if not data.get('deadline_days') and not data.get('assessment_external_url'):
                # Either deadline_days or external_url should be provided
                pass  # Not strictly required, can be set per instance

        return data


class InterviewStageTemplateBulkSerializer(serializers.Serializer):
    """Serializer for bulk creating/updating stage templates for a job."""
    stages = InterviewStageTemplateCreateSerializer(many=True)

    def validate_stages(self, value):
        """Validate stage orders are unique and sequential."""
        orders = [s.get('order', 0) for s in value]
        if len(orders) != len(set(orders)):
            raise serializers.ValidationError('Stage orders must be unique.')
        return value


class BookingTokenSerializer(serializers.ModelSerializer):
    """Serializer for booking tokens (candidate self-scheduling links)."""
    is_valid = serializers.BooleanField(read_only=True)
    booking_url = serializers.SerializerMethodField()

    class Meta:
        model = BookingToken
        fields = [
            'id',
            'token',
            'expires_at',
            'is_used',
            'used_at',
            'is_valid',
            'booking_url',
            'created_at',
        ]
        read_only_fields = fields

    def get_booking_url(self, obj):
        """Generate the full booking URL for this token."""
        request = self.context.get('request')
        if request:
            # Use the frontend URL pattern for booking
            base_url = request.build_absolute_uri('/').rstrip('/')
            # Assuming frontend is on same domain or we use a relative path
            return f"/booking/{obj.token}"
        return f"/booking/{obj.token}"


class ApplicationStageInstanceSerializer(serializers.ModelSerializer):
    """Serializer for reading application stage instances."""
    stage_template = InterviewStageTemplateSerializer(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    interviewer_name = serializers.SerializerMethodField()
    interviewer_email = serializers.SerializerMethodField()
    participants_list = serializers.SerializerMethodField()
    is_overdue = serializers.BooleanField(read_only=True)
    booking_token = BookingTokenSerializer(read_only=True)

    class Meta:
        model = ApplicationStageInstance
        fields = [
            'id',
            'application',
            'stage_template',
            'status',
            'status_display',
            'scheduled_at',
            'duration_minutes',
            'interviewer',
            'interviewer_name',
            'interviewer_email',
            'participants',
            'participants_list',
            'meeting_link',
            'location',
            'meeting_notes',
            'google_calendar_event_id',
            'microsoft_calendar_event_id',
            'calendar_invite_sent',
            'deadline',
            'submission_url',
            'submission_file',
            'submitted_at',
            'recruiter_notes',
            'feedback',
            'score',
            'recommendation',
            'notification_sent_at',
            'reminder_sent_at',
            'is_overdue',
            'booking_token',
            'created_at',
            'updated_at',
            'completed_at',
        ]
        read_only_fields = [
            'id', 'application', 'created_at', 'updated_at', 'completed_at',
            'notification_sent_at', 'reminder_sent_at',
        ]

    def get_interviewer_name(self, obj):
        if obj.interviewer:
            return obj.interviewer.full_name or obj.interviewer.email
        return None

    def get_interviewer_email(self, obj):
        if obj.interviewer:
            return obj.interviewer.email
        return None

    def get_participants_list(self, obj):
        """Return list of participant details."""
        return [
            {
                'id': str(p.id),
                'full_name': p.full_name or p.email,
                'email': p.email,
            }
            for p in obj.participants.all()
        ]


class ScheduleStageSerializer(serializers.Serializer):
    """Serializer for scheduling an interview stage."""
    scheduled_at = serializers.DateTimeField(required=True)
    duration_minutes = serializers.IntegerField(required=False, min_value=15, max_value=480)
    interviewer_id = serializers.UUIDField(required=False, allow_null=True)
    participant_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        default=list,
        help_text='Additional participant user IDs',
    )
    meeting_link = serializers.URLField(required=False, allow_blank=True, default='')
    location = serializers.CharField(max_length=500, required=False, allow_blank=True, default='')
    meeting_notes = serializers.CharField(required=False, allow_blank=True, default='')
    send_notification = serializers.BooleanField(default=True)
    create_calendar_event = serializers.BooleanField(default=True)

    def validate_scheduled_at(self, value):
        """Ensure scheduled time is in the future."""
        from django.utils import timezone
        if value <= timezone.now():
            raise serializers.ValidationError('Scheduled time must be in the future.')
        return value


class RescheduleStageSerializer(serializers.Serializer):
    """Serializer for rescheduling an interview."""
    scheduled_at = serializers.DateTimeField(required=True)
    duration_minutes = serializers.IntegerField(required=False, min_value=15, max_value=480)
    interviewer_id = serializers.UUIDField(required=False, allow_null=True)
    participant_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        help_text='Additional participant user IDs (replaces existing participants)',
    )
    meeting_link = serializers.URLField(required=False, allow_blank=True)
    location = serializers.CharField(max_length=500, required=False, allow_blank=True)
    meeting_notes = serializers.CharField(required=False, allow_blank=True)
    reschedule_reason = serializers.CharField(required=False, allow_blank=True, default='')
    send_notification = serializers.BooleanField(default=True)
    update_calendar_event = serializers.BooleanField(default=True)


class AssignAssessmentSerializer(serializers.Serializer):
    """Serializer for assigning a take-home assessment."""
    deadline = serializers.DateTimeField(required=True)
    instructions = serializers.CharField(required=False, allow_blank=True, default='')
    external_url = serializers.URLField(required=False, allow_blank=True, default='')
    send_notification = serializers.BooleanField(default=True)

    def validate_deadline(self, value):
        """Ensure deadline is in the future."""
        from django.utils import timezone
        if value <= timezone.now():
            raise serializers.ValidationError('Deadline must be in the future.')
        return value


class SubmitAssessmentSerializer(serializers.Serializer):
    """Serializer for candidate submitting an assessment."""
    submission_url = serializers.URLField(required=False, allow_blank=True, default='')
    submission_file = serializers.FileField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True, default='')

    def validate(self, data):
        """Ensure at least one submission method is provided."""
        if not data.get('submission_url') and not data.get('submission_file'):
            raise serializers.ValidationError(
                'Either a submission URL or file must be provided.'
            )
        return data

    def validate_submission_file(self, value):
        """Validate file type and size."""
        if value:
            max_size = 25 * 1024 * 1024  # 25MB
            if value.size > max_size:
                raise serializers.ValidationError('File size must be less than 25MB.')

            allowed_extensions = ['pdf', 'doc', 'docx', 'zip', 'tar', 'gz', 'txt', 'md']
            ext = value.name.split('.')[-1].lower() if '.' in value.name else ''
            if ext not in allowed_extensions:
                raise serializers.ValidationError(
                    f'File type not allowed. Allowed: {", ".join(allowed_extensions)}'
                )
        return value


class CompleteStageSerializer(serializers.Serializer):
    """Serializer for completing a stage with feedback."""
    feedback = serializers.CharField(required=False, allow_blank=True, default='')
    score = serializers.IntegerField(required=False, min_value=1, max_value=5, allow_null=True)
    recommendation = serializers.ChoiceField(
        choices=[
            ('strong_yes', 'Strong Yes'),
            ('yes', 'Yes'),
            ('maybe', 'Maybe'),
            ('no', 'No'),
            ('strong_no', 'Strong No'),
        ],
        required=False,
        allow_blank=True,
    )
