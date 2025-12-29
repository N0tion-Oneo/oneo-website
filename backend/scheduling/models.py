import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone

from automations.registry import automatable


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


class BookingToken(models.Model):
    """
    Token for candidate self-booking (like Calendly public links).
    Allows candidates to select a time slot from interviewer's availability.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    stage_instance = models.OneToOneField(
        'jobs.ApplicationStageInstance',
        on_delete=models.CASCADE,
        related_name='booking_token',
    )

    token = models.CharField(
        max_length=64,
        unique=True,
        help_text='Secure random token for booking URL',
    )
    expires_at = models.DateTimeField(
        help_text='Token expiration time (default: 7 days from creation)',
    )

    is_used = models.BooleanField(
        default=False,
        help_text='Whether the token has been used to book',
    )
    used_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When the candidate completed the booking',
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'booking_tokens'
        indexes = [
            models.Index(fields=['token']),
            models.Index(fields=['expires_at']),
        ]

    def __str__(self):
        return f"Booking token for {self.stage_instance}"

    @property
    def is_valid(self):
        """Check if token is still valid (not used and not expired)."""
        return not self.is_used and timezone.now() < self.expires_at

    def mark_as_used(self):
        """Mark the token as used."""
        self.is_used = True
        self.used_at = timezone.now()
        self.save(update_fields=['is_used', 'used_at'])


class MeetingCategory(models.TextChoices):
    """Categories for meeting types."""
    LEADS = 'leads', 'Leads'
    ONBOARDING = 'onboarding', 'Onboarding'
    RECRUITMENT = 'recruitment', 'Recruitment'


class StageChangeBehavior(models.TextChoices):
    """How to handle stage changes when booking is created."""
    ALWAYS = 'always', 'Always set to this stage'
    ONLY_FORWARD = 'only_forward', 'Only move forward (never go backwards)'
    ONLY_IF_NOT_SET = 'only_if_not_set', 'Only if no stage is currently set'


class MeetingType(models.Model):
    """
    Configurable meeting types for recruiter/admin booking pages.
    Only admins can create meeting types. Recruiters are granted access via allowed_users.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='owned_meeting_types',
        help_text='The admin who created this meeting type',
    )

    allowed_users = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        related_name='accessible_meeting_types',
        help_text='Recruiters/admins who can use this meeting type for their booking pages',
    )

    name = models.CharField(
        max_length=100,
        help_text='Display name (e.g., "Sales Discovery Call")',
    )
    slug = models.SlugField(
        max_length=100,
        unique=True,
        help_text='URL-friendly identifier (globally unique)',
    )
    category = models.CharField(
        max_length=20,
        choices=MeetingCategory.choices,
        help_text='Category of the meeting',
    )
    description = models.TextField(
        blank=True,
        help_text='Description shown on the booking page',
    )

    # Duration and buffer settings
    duration_minutes = models.PositiveIntegerField(
        default=30,
        help_text='Duration of the meeting in minutes',
    )
    buffer_before_minutes = models.PositiveIntegerField(
        default=0,
        help_text='Buffer time before the meeting',
    )
    buffer_after_minutes = models.PositiveIntegerField(
        default=0,
        help_text='Buffer time after the meeting',
    )

    # Location settings
    location_type = models.CharField(
        max_length=20,
        choices=[
            ('video', 'Video Call'),
            ('phone', 'Phone Call'),
            ('in_person', 'In Person'),
        ],
        default='video',
        help_text='Type of meeting location',
    )
    custom_location = models.CharField(
        max_length=255,
        blank=True,
        help_text='Custom location or phone number (for in-person/phone meetings)',
    )

    # Booking settings
    is_active = models.BooleanField(
        default=True,
        help_text='Whether this meeting type is available for booking',
    )
    show_on_dashboard = models.BooleanField(
        default=False,
        help_text='Show this meeting type on candidate/company dashboards for booking with assigned contacts',
    )
    use_for_onboarding = models.BooleanField(
        default=False,
        help_text='Use this meeting type in the onboarding wizard (sales for clients, recruitment for candidates)',
    )
    requires_approval = models.BooleanField(
        default=False,
        help_text='Whether bookings require manual approval',
    )
    max_bookings_per_day = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text='Maximum number of bookings per day (null = unlimited)',
    )

    # Customization
    confirmation_message = models.TextField(
        blank=True,
        help_text='Custom message shown after booking confirmation',
    )
    redirect_url = models.URLField(
        blank=True,
        help_text='URL to redirect to after successful booking (optional)',
    )
    color = models.CharField(
        max_length=7,
        default='#3B82F6',
        help_text='Color for calendar display (hex)',
    )

    # Onboarding stage settings
    # Stage for unauthenticated/new users (e.g., "Lead" or "New Application")
    target_onboarding_stage = models.ForeignKey(
        'core.OnboardingStage',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='meeting_types_unauthenticated',
        help_text='Move candidate/company to this stage when booking is created by unauthenticated user',
    )
    # Stage for authenticated/existing users (e.g., "Interview Scheduled")
    target_onboarding_stage_authenticated = models.ForeignKey(
        'core.OnboardingStage',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='meeting_types_authenticated',
        help_text='Move candidate/company to this stage when booking is created by authenticated user',
    )
    stage_change_behavior = models.CharField(
        max_length=20,
        choices=StageChangeBehavior.choices,
        default=StageChangeBehavior.ONLY_FORWARD,
        help_text='How to handle stage changes',
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'meeting_types'
        ordering = ['category', 'name']

    def __str__(self):
        return self.name


class BookingStatus(models.TextChoices):
    """Status options for bookings."""
    PENDING = 'pending', 'Pending Approval'
    CONFIRMED = 'confirmed', 'Confirmed'
    CANCELLED = 'cancelled', 'Cancelled'
    COMPLETED = 'completed', 'Completed'
    NO_SHOW = 'no_show', 'No Show'


@automatable(
    display_name='Booking',
    events=['created', 'updated', 'deleted', 'status_changed'],
    status_field='status',
)
class Booking(models.Model):
    """
    A scheduled meeting between a recruiter/admin and an external attendee.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    meeting_type = models.ForeignKey(
        MeetingType,
        on_delete=models.CASCADE,
        related_name='bookings',
    )
    organizer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='organized_bookings',
        help_text='The recruiter/admin hosting the meeting',
    )

    # Attendee info (can be an existing user or external person)
    attendee_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='attended_bookings',
        help_text='Linked user account if attendee is a registered user',
    )
    candidate_profile = models.ForeignKey(
        'candidates.CandidateProfile',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='bookings',
        help_text='Linked candidate profile if attendee is a candidate',
    )
    lead = models.ForeignKey(
        'companies.Lead',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='bookings',
        help_text='Linked lead if attendee is a lead',
    )
    attendee_name = models.CharField(
        max_length=255,
        help_text='Name of the attendee',
    )
    attendee_email = models.EmailField(
        help_text='Email of the attendee',
    )
    attendee_phone = models.CharField(
        max_length=30,
        blank=True,
        help_text='Phone number of the attendee',
    )
    attendee_company = models.CharField(
        max_length=255,
        blank=True,
        help_text='Company name (for sales meetings)',
    )

    # Meeting details
    title = models.CharField(
        max_length=255,
        help_text='Meeting title',
    )
    description = models.TextField(
        blank=True,
        help_text='Meeting description or notes',
    )
    scheduled_at = models.DateTimeField(
        help_text='When the meeting is scheduled',
    )
    duration_minutes = models.PositiveIntegerField(
        help_text='Duration in minutes (copied from meeting type)',
    )
    timezone = models.CharField(
        max_length=50,
        default='Africa/Johannesburg',
        help_text='Timezone for the meeting',
    )

    # Location details
    location_type = models.CharField(
        max_length=20,
        choices=[
            ('video', 'Video Call'),
            ('phone', 'Phone Call'),
            ('in_person', 'In Person'),
        ],
        default='video',
    )
    meeting_url = models.URLField(
        blank=True,
        help_text='Video call URL (auto-generated for Google Meet/Teams)',
    )
    location = models.CharField(
        max_length=255,
        blank=True,
        help_text='Physical location or phone number',
    )

    # Calendar integration
    calendar_event_id = models.CharField(
        max_length=255,
        blank=True,
        help_text='ID of the calendar event (Google/Microsoft)',
    )
    calendar_provider = models.CharField(
        max_length=20,
        choices=CalendarProvider.choices,
        blank=True,
        help_text='Which calendar provider the event was created in',
    )

    # Status and tracking
    status = models.CharField(
        max_length=20,
        choices=BookingStatus.choices,
        default=BookingStatus.CONFIRMED,
    )
    cancelled_at = models.DateTimeField(
        null=True,
        blank=True,
    )
    cancelled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cancelled_bookings',
    )
    cancellation_reason = models.TextField(
        blank=True,
    )

    # Additional context
    notes = models.TextField(
        blank=True,
        help_text='Internal notes (only visible to organizer)',
    )
    source = models.CharField(
        max_length=20,
        choices=[
            ('public', 'Public Booking Page'),
            ('manual', 'Manually Created'),
            ('invite', 'Email Invitation'),
        ],
        default='public',
        help_text='How the booking was created',
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'bookings'
        ordering = ['-scheduled_at']
        indexes = [
            models.Index(fields=['organizer', 'scheduled_at']),
            models.Index(fields=['status', 'scheduled_at']),
            models.Index(fields=['attendee_email']),
        ]

    def __str__(self):
        return f"{self.title} - {self.attendee_name} ({self.scheduled_at})"

    @property
    def end_time(self):
        """Calculate the end time of the meeting."""
        from datetime import timedelta
        return self.scheduled_at + timedelta(minutes=self.duration_minutes)

    @property
    def is_upcoming(self):
        """Check if the meeting is in the future."""
        return self.scheduled_at > timezone.now() and self.status == BookingStatus.CONFIRMED

    @property
    def is_past(self):
        """Check if the meeting has passed."""
        return self.scheduled_at <= timezone.now()

    def cancel(self, cancelled_by=None, reason=''):
        """Cancel the booking."""
        self.status = BookingStatus.CANCELLED
        self.cancelled_at = timezone.now()
        self.cancelled_by = cancelled_by
        self.cancellation_reason = reason
        self.save(update_fields=['status', 'cancelled_at', 'cancelled_by', 'cancellation_reason'])

    def mark_completed(self):
        """Mark the booking as completed."""
        self.status = BookingStatus.COMPLETED
        self.save(update_fields=['status'])

    def mark_no_show(self):
        """Mark the attendee as a no-show."""
        self.status = BookingStatus.NO_SHOW
        self.save(update_fields=['status'])
