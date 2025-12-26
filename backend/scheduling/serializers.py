from rest_framework import serializers
from django.utils.text import slugify
from .models import (
    UserCalendarConnection,
    CalendarProvider,
    MeetingType,
    MeetingCategory,
    StageChangeBehavior,
    Booking,
    BookingStatus,
)


class UserCalendarConnectionSerializer(serializers.ModelSerializer):
    """Serializer for user calendar connections (read)."""
    provider_display = serializers.CharField(source='get_provider_display', read_only=True)
    is_token_expired = serializers.BooleanField(read_only=True)
    available_days_list = serializers.SerializerMethodField()

    class Meta:
        model = UserCalendarConnection
        fields = [
            'id',
            'provider',
            'provider_display',
            'provider_email',
            'calendar_id',
            'calendar_name',
            'is_active',
            'is_token_expired',
            # Booking settings
            'booking_days_ahead',
            'business_hours_start',
            'business_hours_end',
            'min_notice_hours',
            'buffer_minutes',
            'available_days',
            'available_days_list',
            'timezone',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields

    def get_available_days_list(self, obj):
        """Convert comma-separated days to list of integers."""
        if obj.available_days:
            return [int(d) for d in obj.available_days.split(',') if d.strip()]
        return []


class CalendarConnectionUpdateSerializer(serializers.Serializer):
    """Serializer for updating calendar connection settings."""
    calendar_id = serializers.CharField(required=False)
    calendar_name = serializers.CharField(required=False, allow_blank=True)
    booking_days_ahead = serializers.IntegerField(min_value=1, max_value=90, required=False)
    business_hours_start = serializers.IntegerField(min_value=0, max_value=23, required=False)
    business_hours_end = serializers.IntegerField(min_value=0, max_value=23, required=False)
    min_notice_hours = serializers.IntegerField(min_value=0, max_value=168, required=False)  # max 1 week
    buffer_minutes = serializers.IntegerField(min_value=0, max_value=60, required=False)
    available_days = serializers.ListField(
        child=serializers.IntegerField(min_value=0, max_value=6),
        required=False,
    )
    timezone = serializers.CharField(max_length=50, required=False)

    def validate(self, data):
        # Ensure business_hours_end > business_hours_start
        start = data.get('business_hours_start')
        end = data.get('business_hours_end')
        if start is not None and end is not None and end <= start:
            raise serializers.ValidationError({
                'business_hours_end': 'End hour must be after start hour'
            })
        return data


class CalendarConnectionCreateSerializer(serializers.Serializer):
    """Serializer for initiating calendar connection (OAuth)."""
    provider = serializers.ChoiceField(choices=CalendarProvider.choices)
    redirect_uri = serializers.URLField(required=False)


# ============================================================================
# Meeting Type Serializers
# ============================================================================

class OnboardingStageMinimalSerializer(serializers.Serializer):
    """Minimal serializer for onboarding stage in meeting type context."""
    id = serializers.IntegerField()
    name = serializers.CharField()
    slug = serializers.CharField()
    entity_type = serializers.CharField()
    color = serializers.CharField()
    order = serializers.IntegerField()


class AllowedUserSerializer(serializers.Serializer):
    """Minimal serializer for allowed users in meeting type context."""
    id = serializers.IntegerField()
    email = serializers.EmailField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    full_name = serializers.CharField()


class MeetingTypeSerializer(serializers.ModelSerializer):
    """Serializer for reading MeetingType data."""
    owner_name = serializers.CharField(source='owner.full_name', read_only=True)
    owner_email = serializers.EmailField(source='owner.email', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    location_type_display = serializers.SerializerMethodField()
    target_onboarding_stage_details = serializers.SerializerMethodField()
    stage_change_behavior_display = serializers.CharField(
        source='get_stage_change_behavior_display', read_only=True
    )
    allowed_users_details = serializers.SerializerMethodField()

    target_onboarding_stage_authenticated_details = serializers.SerializerMethodField()

    class Meta:
        model = MeetingType
        fields = [
            'id',
            'owner',
            'owner_name',
            'owner_email',
            'name',
            'slug',
            'category',
            'category_display',
            'description',
            'duration_minutes',
            'buffer_before_minutes',
            'buffer_after_minutes',
            'location_type',
            'location_type_display',
            'custom_location',
            'is_active',
            'show_on_dashboard',
            'use_for_onboarding',
            'requires_approval',
            'max_bookings_per_day',
            'confirmation_message',
            'redirect_url',
            'color',
            # Onboarding stage settings
            'target_onboarding_stage',
            'target_onboarding_stage_details',
            'target_onboarding_stage_authenticated',
            'target_onboarding_stage_authenticated_details',
            'stage_change_behavior',
            'stage_change_behavior_display',
            # Allowed users
            'allowed_users_details',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'owner', 'created_at', 'updated_at']

    def get_location_type_display(self, obj):
        display_map = {
            'video': 'Video Call',
            'phone': 'Phone Call',
            'in_person': 'In Person',
        }
        return display_map.get(obj.location_type, obj.location_type)

    def get_target_onboarding_stage_details(self, obj):
        if obj.target_onboarding_stage:
            return OnboardingStageMinimalSerializer(obj.target_onboarding_stage).data
        return None

    def get_target_onboarding_stage_authenticated_details(self, obj):
        if obj.target_onboarding_stage_authenticated:
            return OnboardingStageMinimalSerializer(obj.target_onboarding_stage_authenticated).data
        return None

    def get_allowed_users_details(self, obj):
        return AllowedUserSerializer(obj.allowed_users.all(), many=True).data


class MeetingTypeCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating MeetingType (admins only)."""
    slug = serializers.SlugField(required=False, allow_blank=True)
    description = serializers.CharField(required=False, allow_blank=True)
    duration_minutes = serializers.IntegerField(required=False, min_value=5, max_value=480)
    buffer_before_minutes = serializers.IntegerField(required=False, min_value=0)
    buffer_after_minutes = serializers.IntegerField(required=False, min_value=0)
    location_type = serializers.CharField(required=False)
    custom_location = serializers.CharField(required=False, allow_blank=True)
    is_active = serializers.BooleanField(required=False)
    show_on_dashboard = serializers.BooleanField(required=False)
    use_for_onboarding = serializers.BooleanField(required=False)
    requires_approval = serializers.BooleanField(required=False)
    max_bookings_per_day = serializers.IntegerField(required=False, allow_null=True)
    confirmation_message = serializers.CharField(required=False, allow_blank=True)
    redirect_url = serializers.URLField(required=False, allow_blank=True)
    color = serializers.CharField(required=False)
    allowed_user_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        write_only=True,
    )

    class Meta:
        model = MeetingType
        fields = [
            'name',
            'slug',
            'category',
            'description',
            'duration_minutes',
            'buffer_before_minutes',
            'buffer_after_minutes',
            'location_type',
            'custom_location',
            'is_active',
            'show_on_dashboard',
            'use_for_onboarding',
            'requires_approval',
            'max_bookings_per_day',
            'confirmation_message',
            'redirect_url',
            'color',
            # Onboarding stage settings
            'target_onboarding_stage',
            'target_onboarding_stage_authenticated',
            'stage_change_behavior',
            # Allowed users
            'allowed_user_ids',
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Import here to avoid circular import
        from core.models import OnboardingStage
        # Add the target_onboarding_stage fields dynamically
        self.fields['target_onboarding_stage'] = serializers.PrimaryKeyRelatedField(
            queryset=OnboardingStage.objects.filter(is_active=True),
            required=False,
            allow_null=True,
        )
        self.fields['target_onboarding_stage_authenticated'] = serializers.PrimaryKeyRelatedField(
            queryset=OnboardingStage.objects.filter(is_active=True),
            required=False,
            allow_null=True,
        )
        self.fields['stage_change_behavior'] = serializers.ChoiceField(
            choices=StageChangeBehavior.choices,
            required=False,
        )

    def validate(self, data):
        # Auto-generate slug from name if not provided
        if not data.get('slug'):
            name = data.get('name', '')
            data['slug'] = slugify(name)
        else:
            data['slug'] = slugify(data['slug'])

        # Validate that target_onboarding_stage matches meeting category
        category = data.get('category') or (self.instance.category if self.instance else None)
        # Map category to expected entity type
        category_to_entity = {
            MeetingCategory.LEADS: 'lead',
            MeetingCategory.ONBOARDING: 'company',
            MeetingCategory.RECRUITMENT: 'candidate',
        }
        expected_entity_type = category_to_entity.get(category, 'company')

        # Validate unauthenticated stage
        target_stage = data.get('target_onboarding_stage')
        if target_stage and category:
            if target_stage.entity_type != expected_entity_type:
                raise serializers.ValidationError({
                    'target_onboarding_stage': f'Stage must be a {expected_entity_type} stage for {category} meetings.'
                })

        # Validate authenticated stage
        target_stage_auth = data.get('target_onboarding_stage_authenticated')
        if target_stage_auth and category:
            if target_stage_auth.entity_type != expected_entity_type:
                raise serializers.ValidationError({
                    'target_onboarding_stage_authenticated': f'Stage must be a {expected_entity_type} stage for {category} meetings.'
                })

        return data

    def create(self, validated_data):
        from users.models import User, UserRole
        allowed_user_ids = validated_data.pop('allowed_user_ids', [])

        # Set owner from request user
        validated_data['owner'] = self.context['request'].user
        meeting_type = super().create(validated_data)

        # Set allowed users (only recruiters and admins)
        if allowed_user_ids:
            allowed_users = User.objects.filter(
                id__in=allowed_user_ids,
                role__in=[UserRole.ADMIN, UserRole.RECRUITER]
            )
            meeting_type.allowed_users.set(allowed_users)

        return meeting_type

    def update(self, instance, validated_data):
        from users.models import User, UserRole
        allowed_user_ids = validated_data.pop('allowed_user_ids', None)

        instance = super().update(instance, validated_data)

        # Update allowed users if provided
        if allowed_user_ids is not None:
            allowed_users = User.objects.filter(
                id__in=allowed_user_ids,
                role__in=[UserRole.ADMIN, UserRole.RECRUITER]
            )
            instance.allowed_users.set(allowed_users)

        return instance


class MeetingTypePublicSerializer(serializers.ModelSerializer):
    """Serializer for public-facing meeting type info (booking page)."""
    owner_name = serializers.CharField(source='owner.full_name', read_only=True)
    owner_avatar = serializers.ImageField(source='owner.avatar', read_only=True)
    location_type_display = serializers.SerializerMethodField()

    class Meta:
        model = MeetingType
        fields = [
            'id',
            'owner_name',
            'owner_avatar',
            'name',
            'slug',
            'category',
            'description',
            'duration_minutes',
            'location_type',
            'location_type_display',
            'color',
        ]

    def get_location_type_display(self, obj):
        display_map = {
            'video': 'Video Call',
            'phone': 'Phone Call',
            'in_person': 'In Person',
        }
        return display_map.get(obj.location_type, obj.location_type)


# ============================================================================
# Booking Serializers
# ============================================================================

class BookingSerializer(serializers.ModelSerializer):
    """Serializer for reading Booking data."""
    meeting_type_name = serializers.CharField(source='meeting_type.name', read_only=True)
    meeting_type_category = serializers.CharField(source='meeting_type.category', read_only=True)
    organizer_name = serializers.CharField(source='organizer.full_name', read_only=True)
    organizer_email = serializers.EmailField(source='organizer.email', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    location_type_display = serializers.SerializerMethodField()
    end_time = serializers.DateTimeField(read_only=True)
    is_upcoming = serializers.BooleanField(read_only=True)
    is_past = serializers.BooleanField(read_only=True)
    candidate_info = serializers.SerializerMethodField()
    lead_info = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = [
            'id',
            'meeting_type',
            'meeting_type_name',
            'meeting_type_category',
            'organizer',
            'organizer_name',
            'organizer_email',
            'attendee_user',
            'attendee_name',
            'attendee_email',
            'attendee_phone',
            'attendee_company',
            'candidate_profile',
            'candidate_info',
            'lead',
            'lead_info',
            'title',
            'description',
            'scheduled_at',
            'end_time',
            'duration_minutes',
            'timezone',
            'location_type',
            'location_type_display',
            'meeting_url',
            'location',
            'status',
            'status_display',
            'is_upcoming',
            'is_past',
            'notes',
            'source',
            'created_at',
            'updated_at',
            'cancelled_at',
            'cancellation_reason',
        ]
        read_only_fields = ['id', 'organizer', 'created_at', 'updated_at']

    def get_candidate_info(self, obj):
        """Get linked candidate profile info if available."""
        if obj.candidate_profile:
            return {
                'id': str(obj.candidate_profile.id) if hasattr(obj.candidate_profile, 'id') else None,
                'slug': obj.candidate_profile.slug,
                'professional_title': obj.candidate_profile.professional_title,
                'profile_url': f'/candidates/{obj.candidate_profile.slug}',
            }
        return None

    def get_lead_info(self, obj):
        """Get linked lead info if available."""
        if obj.lead:
            return {
                'id': str(obj.lead.id),
                'name': obj.lead.name,
                'company_name': obj.lead.company_name,
            }
        return None

    def get_location_type_display(self, obj):
        display_map = {
            'video': 'Video Call',
            'phone': 'Phone Call',
            'in_person': 'In Person',
        }
        return display_map.get(obj.location_type, obj.location_type)


class BookingCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating a booking (public booking flow).

    For authenticated users:
    - attendee_name, attendee_email are optional (pulled from user profile)

    For unauthenticated users:
    - attendee_name, attendee_email are required
    """
    attendee_name = serializers.CharField(required=False, allow_blank=True)
    attendee_email = serializers.EmailField(required=False, allow_blank=True)
    attendee_phone = serializers.CharField(required=False, allow_blank=True)
    attendee_company = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = Booking
        fields = [
            'meeting_type',
            'attendee_name',
            'attendee_email',
            'attendee_phone',
            'attendee_company',
            'scheduled_at',
            'timezone',
        ]

    def validate(self, data):
        request = self.context.get('request')
        is_authenticated = request and request.user.is_authenticated

        # For unauthenticated users, name and email are required
        if not is_authenticated:
            if not data.get('attendee_name'):
                raise serializers.ValidationError({'attendee_name': 'This field is required.'})
            if not data.get('attendee_email'):
                raise serializers.ValidationError({'attendee_email': 'This field is required.'})

        return data

    def validate_scheduled_at(self, value):
        from django.utils import timezone
        if value <= timezone.now():
            raise serializers.ValidationError('Booking time must be in the future.')
        return value

    def create(self, validated_data):
        meeting_type = validated_data['meeting_type']
        request = self.context.get('request')
        user = request.user if request and request.user.is_authenticated else None

        # For authenticated users, populate attendee fields from their profile
        if user:
            validated_data['attendee_user'] = user
            validated_data['attendee_name'] = validated_data.get('attendee_name') or user.full_name
            validated_data['attendee_email'] = validated_data.get('attendee_email') or user.email

            # Try to get phone from candidate profile if available
            if not validated_data.get('attendee_phone'):
                candidate_profile = getattr(user, 'candidate_profile', None)
                if candidate_profile and candidate_profile.phone:
                    validated_data['attendee_phone'] = candidate_profile.phone

        # Set fields from meeting type
        validated_data['organizer'] = meeting_type.owner
        validated_data['duration_minutes'] = meeting_type.duration_minutes
        validated_data['location_type'] = meeting_type.location_type
        validated_data['location'] = meeting_type.custom_location

        # Set title
        validated_data['title'] = f"{meeting_type.name} with {validated_data['attendee_name']}"

        # Set initial status based on approval requirement
        if meeting_type.requires_approval:
            validated_data['status'] = BookingStatus.PENDING
        else:
            validated_data['status'] = BookingStatus.CONFIRMED

        return super().create(validated_data)


class BookingUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating a booking (reschedule, add notes)."""

    class Meta:
        model = Booking
        fields = [
            'scheduled_at',
            'notes',
            'status',
        ]

    def validate_scheduled_at(self, value):
        from django.utils import timezone
        if value and value <= timezone.now():
            raise serializers.ValidationError('Booking time must be in the future.')
        return value


class BookingCancelSerializer(serializers.Serializer):
    """Serializer for cancelling a booking."""
    reason = serializers.CharField(required=False, allow_blank=True)
