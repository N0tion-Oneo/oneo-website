from rest_framework import serializers
from .models import UserCalendarConnection, CalendarProvider


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
