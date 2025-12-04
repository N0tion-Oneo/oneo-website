import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone


class CalendarProvider(models.TextChoices):
    """Supported calendar providers for OAuth integration."""
    GOOGLE = 'google', 'Google Calendar'
    MICROSOFT = 'microsoft', 'Microsoft 365'


class UserCalendarConnection(models.Model):
    """
    OAuth connection to a user's calendar.
    Stores tokens securely for calendar event management.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='calendar_connections',
    )

    provider = models.CharField(
        max_length=20,
        choices=CalendarProvider.choices,
    )

    # OAuth tokens (should be encrypted in production)
    access_token = models.TextField(
        help_text='OAuth access token (encrypted)',
    )
    refresh_token = models.TextField(
        blank=True,
        help_text='OAuth refresh token (encrypted)',
    )
    token_expires_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When the access token expires',
    )

    # User info from provider
    provider_user_id = models.CharField(
        max_length=255,
        blank=True,
        help_text='User ID from the calendar provider',
    )
    provider_email = models.EmailField(
        blank=True,
        help_text='Email associated with the calendar account',
    )

    # Settings
    is_active = models.BooleanField(
        default=True,
        help_text='Whether this connection is active',
    )
    calendar_id = models.CharField(
        max_length=255,
        default='primary',
        help_text='Which calendar to use (primary or specific calendar ID)',
    )
    calendar_name = models.CharField(
        max_length=255,
        blank=True,
        default='',
        help_text='Display name of the selected calendar',
    )

    # Booking availability settings
    booking_days_ahead = models.PositiveIntegerField(
        default=14,
        help_text='How many days in advance bookings are allowed',
    )
    business_hours_start = models.PositiveSmallIntegerField(
        default=9,
        help_text='Start hour for availability (0-23)',
    )
    business_hours_end = models.PositiveSmallIntegerField(
        default=18,
        help_text='End hour for availability (0-23)',
    )
    min_notice_hours = models.PositiveIntegerField(
        default=24,
        help_text='Minimum hours notice required before booking',
    )
    buffer_minutes = models.PositiveIntegerField(
        default=0,
        help_text='Buffer time between meetings in minutes',
    )
    # Days available: comma-separated day numbers (0=Monday, 6=Sunday)
    available_days = models.CharField(
        max_length=20,
        default='0,1,2,3,4',  # Monday to Friday
        help_text='Available days (0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun)',
    )
    timezone = models.CharField(
        max_length=50,
        default='Africa/Johannesburg',
        help_text='Timezone for availability display',
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'user_calendar_connections'  # Keep existing table name
        unique_together = ['user', 'provider']

    def __str__(self):
        return f"{self.user.email} - {self.get_provider_display()}"

    @property
    def is_token_expired(self):
        """Check if the access token has expired."""
        if self.token_expires_at:
            return timezone.now() >= self.token_expires_at
        return True
