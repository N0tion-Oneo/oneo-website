from rest_framework import serializers
from django.utils.text import slugify
from .models import (
    UserCalendarConnection,
    CalendarProvider,
    MeetingType,
    MeetingCategory,
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

class MeetingTypeSerializer(serializers.ModelSerializer):
    """Serializer for reading MeetingType data."""
    owner_name = serializers.CharField(source='owner.full_name', read_only=True)
    owner_email = serializers.EmailField(source='owner.email', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    location_type_display = serializers.SerializerMethodField()

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
            'requires_approval',
            'max_bookings_per_day',
            'confirmation_message',
            'redirect_url',
            'color',
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


class MeetingTypeCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating MeetingType."""
    slug = serializers.SlugField(required=False, allow_blank=True)
    description = serializers.CharField(required=False, allow_blank=True)
    duration_minutes = serializers.IntegerField(required=False, min_value=5, max_value=480)
    buffer_before_minutes = serializers.IntegerField(required=False, min_value=0)
    buffer_after_minutes = serializers.IntegerField(required=False, min_value=0)
    location_type = serializers.CharField(required=False)
    custom_location = serializers.CharField(required=False, allow_blank=True)
    is_active = serializers.BooleanField(required=False)
    requires_approval = serializers.BooleanField(required=False)
    max_bookings_per_day = serializers.IntegerField(required=False, allow_null=True)
    confirmation_message = serializers.CharField(required=False, allow_blank=True)
    redirect_url = serializers.URLField(required=False, allow_blank=True)
    color = serializers.CharField(required=False)

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
            'requires_approval',
            'max_bookings_per_day',
            'confirmation_message',
            'redirect_url',
            'color',
        ]

    def validate(self, data):
        # Auto-generate slug from name if not provided
        if not data.get('slug'):
            name = data.get('name', '')
            data['slug'] = slugify(name)
        else:
            data['slug'] = slugify(data['slug'])
        return data

    def create(self, validated_data):
        # Set owner from request user
        validated_data['owner'] = self.context['request'].user
        return super().create(validated_data)


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

    def get_location_type_display(self, obj):
        display_map = {
            'video': 'Video Call',
            'phone': 'Phone Call',
            'in_person': 'In Person',
        }
        return display_map.get(obj.location_type, obj.location_type)


class BookingCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a booking (public booking flow)."""

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

    def validate_scheduled_at(self, value):
        from django.utils import timezone
        if value <= timezone.now():
            raise serializers.ValidationError('Booking time must be in the future.')
        return value

    def create(self, validated_data):
        meeting_type = validated_data['meeting_type']

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

        # Link to user if logged in
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['attendee_user'] = request.user

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
