from django.db import models
from django.conf import settings
import uuid

from .application import Application, ApplicationStatus


class ActivityType(models.TextChoices):
    """Types of activities that can be logged for an application."""
    APPLIED = 'applied', 'Applied'
    SHORTLISTED = 'shortlisted', 'Shortlisted'
    STAGE_CHANGED = 'stage_changed', 'Stage Changed'
    OFFER_MADE = 'offer_made', 'Offer Made'
    OFFER_UPDATED = 'offer_updated', 'Offer Updated'
    OFFER_ACCEPTED = 'offer_accepted', 'Offer Accepted'
    REJECTED = 'rejected', 'Rejected'
    WITHDRAWN = 'withdrawn', 'Withdrawn'
    APPLICATION_VIEWED = 'application_viewed', 'Application Viewed'
    # Booking/Scheduling activities
    BOOKING_LINK_SENT = 'booking_link_sent', 'Booking Link Sent'
    INTERVIEW_BOOKED = 'interview_booked', 'Interview Booked'
    INTERVIEW_SCHEDULED = 'interview_scheduled', 'Interview Scheduled'
    INTERVIEW_RESCHEDULED = 'interview_rescheduled', 'Interview Rescheduled'
    INTERVIEW_CANCELLED = 'interview_cancelled', 'Interview Cancelled'


class ActivityLog(models.Model):
    """
    Audit log for application activities.
    Tracks all state changes and user interactions with full attribution.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Core relations
    application = models.ForeignKey(
        Application,
        on_delete=models.CASCADE,
        related_name='activity_logs',
    )
    performed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='application_activities',
        help_text='User who performed this action',
    )

    # Activity details
    activity_type = models.CharField(
        max_length=30,
        choices=ActivityType.choices,
    )

    # State tracking (for stage/status changes)
    previous_status = models.CharField(
        max_length=20,
        choices=ApplicationStatus.choices,
        blank=True,
    )
    new_status = models.CharField(
        max_length=20,
        choices=ApplicationStatus.choices,
        blank=True,
    )
    previous_stage = models.PositiveIntegerField(null=True, blank=True)
    new_stage = models.PositiveIntegerField(null=True, blank=True)
    stage_name = models.CharField(max_length=100, blank=True)

    # Additional metadata (for offer changes, rejection reasons, etc.)
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text='Additional context: offer_details, rejection_reason, etc.',
    )

    # Timestamp
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'application_activity_logs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['application', '-created_at']),
            models.Index(fields=['activity_type']),
        ]

    def __str__(self):
        return f"{self.get_activity_type_display()} - {self.application}"

    @property
    def performer_name(self):
        """Return the name of the user who performed the action."""
        if self.performed_by:
            return self.performed_by.full_name or self.performed_by.email
        return 'System'


class ActivityNote(models.Model):
    """
    Threaded notes attached to activity log entries.
    Allows multiple comments per activity.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    activity = models.ForeignKey(
        ActivityLog,
        on_delete=models.CASCADE,
        related_name='notes',
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='activity_notes',
    )

    content = models.TextField()

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'application_activity_notes'
        ordering = ['created_at']

    def __str__(self):
        author_name = self.author.full_name if self.author else 'Unknown'
        return f"Note by {author_name} on {self.activity}"
