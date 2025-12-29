import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone


class NotificationType(models.TextChoices):
    """Types of notifications that can be sent."""
    # =========================================================================
    # Account & Onboarding
    # =========================================================================
    WELCOME = 'welcome', 'Welcome'
    EMAIL_VERIFICATION = 'email_verification', 'Email Verification'
    PASSWORD_RESET = 'password_reset', 'Password Reset'
    PASSWORD_CHANGED = 'password_changed', 'Password Changed'

    # =========================================================================
    # Invitations
    # =========================================================================
    TEAM_INVITE = 'team_invite', 'Team Member Invitation'
    CLIENT_INVITE = 'client_invite', 'Client Invitation'
    COMPANY_MEMBER_INVITE = 'company_member_invite', 'Company Member Invitation'
    CANDIDATE_BOOKING_INVITE = 'candidate_booking_invite', 'Candidate Booking Invitation'

    # =========================================================================
    # Stage/Interview
    # =========================================================================
    STAGE_SCHEDULED = 'stage_scheduled', 'Interview Scheduled'
    STAGE_REMINDER = 'stage_reminder', 'Interview Reminder'
    STAGE_RESCHEDULED = 'stage_rescheduled', 'Interview Rescheduled'
    STAGE_CANCELLED = 'stage_cancelled', 'Interview Cancelled'
    STAGE_COMPLETED = 'stage_completed', 'Interview Completed'
    STAGE_FEEDBACK_RECEIVED = 'stage_feedback_received', 'Interview Feedback Received'

    # =========================================================================
    # Booking (self-scheduling)
    # =========================================================================
    BOOKING_LINK_SENT = 'booking_link_sent', 'Booking Link Sent'
    BOOKING_CONFIRMED = 'booking_confirmed', 'Booking Confirmed'
    BOOKING_REMINDER = 'booking_reminder', 'Booking Reminder'

    # =========================================================================
    # Assessment
    # =========================================================================
    ASSESSMENT_ASSIGNED = 'assessment_assigned', 'Assessment Assigned'
    ASSESSMENT_REMINDER = 'assessment_reminder', 'Assessment Deadline Reminder'
    SUBMISSION_RECEIVED = 'submission_received', 'Submission Received'

    # =========================================================================
    # Application Lifecycle
    # =========================================================================
    APPLICATION_RECEIVED = 'application_received', 'Application Received'
    APPLICATION_SHORTLISTED = 'application_shortlisted', 'Application Shortlisted'
    APPLICATION_REJECTED = 'application_rejected', 'Application Rejected'
    APPLICATION_WITHDRAWN = 'application_withdrawn', 'Application Withdrawn'

    # =========================================================================
    # Stage-Specific Advancement Notifications
    # Each maps to a StageType from jobs.models
    # =========================================================================
    ADVANCED_TO_APPLICATION_SCREEN = 'advanced_to_application_screen', 'Advanced to Application Screen'
    ADVANCED_TO_PHONE_SCREENING = 'advanced_to_phone_screening', 'Advanced to Phone Screening'
    ADVANCED_TO_VIDEO_INTERVIEW = 'advanced_to_video_interview', 'Advanced to Video Interview'
    ADVANCED_TO_IN_PERSON_INTERVIEW = 'advanced_to_in_person_interview', 'Advanced to In-Person Interview'
    ADVANCED_TO_TAKE_HOME_ASSESSMENT = 'advanced_to_take_home_assessment', 'Advanced to Take-Home Assessment'
    ADVANCED_TO_IN_PERSON_ASSESSMENT = 'advanced_to_in_person_assessment', 'Advanced to In-Person Assessment'
    ADVANCED_TO_CUSTOM_STAGE = 'advanced_to_custom_stage', 'Advanced to Next Stage'

    # =========================================================================
    # Offers
    # =========================================================================
    OFFER_RECEIVED = 'offer_received', 'Offer Received'
    OFFER_ACCEPTED = 'offer_accepted', 'Offer Accepted'
    OFFER_DECLINED = 'offer_declined', 'Offer Declined'

    # =========================================================================
    # Job Lifecycle
    # =========================================================================
    JOB_PUBLISHED = 'job_published', 'Job Published'
    JOB_CLOSED = 'job_closed', 'Job Closed'
    JOB_FILLED = 'job_filled', 'Job Filled'
    JOB_UPDATED = 'job_updated', 'Job Updated'

    # =========================================================================
    # Replacements
    # =========================================================================
    REPLACEMENT_REQUESTED = 'replacement_requested', 'Replacement Requested'
    REPLACEMENT_APPROVED = 'replacement_approved', 'Replacement Approved'
    REPLACEMENT_REJECTED = 'replacement_rejected', 'Replacement Rejected'
    JOB_REOPENED_FOR_REPLACEMENT = 'job_reopened_for_replacement', 'Job Reopened for Replacement'

    # =========================================================================
    # Lead Pipeline
    # =========================================================================
    LEAD_CREATED = 'lead_created', 'New Lead'
    LEAD_STAGE_CHANGED = 'lead_stage_changed', 'Lead Stage Changed'
    LEAD_CONVERTED = 'lead_converted', 'Lead Converted'
    LEAD_ASSIGNED = 'lead_assigned', 'Lead Assigned'

    # =========================================================================
    # Company
    # =========================================================================
    COMPANY_CREATED = 'company_created', 'New Company'
    COMPANY_STAGE_CHANGED = 'company_stage_changed', 'Company Stage Changed'

    # =========================================================================
    # Invoicing & Subscriptions
    # =========================================================================
    INVOICE_SENT = 'invoice_sent', 'Invoice Sent'
    INVOICE_PAID = 'invoice_paid', 'Invoice Paid'
    INVOICE_OVERDUE = 'invoice_overdue', 'Invoice Overdue'
    SUBSCRIPTION_ACTIVATED = 'subscription_activated', 'Subscription Activated'
    SUBSCRIPTION_PAUSED = 'subscription_paused', 'Subscription Paused'
    SUBSCRIPTION_TERMINATED = 'subscription_terminated', 'Subscription Terminated'
    SUBSCRIPTION_RENEWED = 'subscription_renewed', 'Subscription Renewed'
    SUBSCRIPTION_EXPIRING = 'subscription_expiring', 'Subscription Expiring'

    # =========================================================================
    # Admin/Custom
    # =========================================================================
    ADMIN_BROADCAST = 'admin_broadcast', 'Admin Broadcast'
    CUSTOM = 'custom', 'Custom Notification'


class NotificationChannel(models.TextChoices):
    """Channels through which notifications can be sent."""
    EMAIL = 'email', 'Email'
    IN_APP = 'in_app', 'In-App'
    BOTH = 'both', 'Email & In-App'


class RecipientType(models.TextChoices):
    """Types of recipients for notification templates."""
    CANDIDATE = 'candidate', 'Candidate'
    CLIENT = 'client', 'Client'
    RECRUITER = 'recruiter', 'Recruiter'
    INTERVIEWER = 'interviewer', 'Interviewer'
    COMPANY_ADMIN = 'company_admin', 'Company Admin'
    COMPANY_EDITOR = 'company_editor', 'Company Editor'
    COMPANY_VIEWER = 'company_viewer', 'Company Viewer'
    COMPANY_TEAM = 'company_team', 'Company Team (All)'
    ALL = 'all', 'All Users'


class Notification(models.Model):
    """
    Notification record for users.
    Supports both email and in-app notifications.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
    )

    notification_type = models.CharField(
        max_length=50,
        choices=NotificationType.choices,
    )
    channel = models.CharField(
        max_length=20,
        choices=NotificationChannel.choices,
        default=NotificationChannel.BOTH,
    )

    # Related objects (optional) - using string references to avoid circular imports
    application = models.ForeignKey(
        'jobs.Application',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notifications',
    )
    stage_instance = models.ForeignKey(
        'jobs.ApplicationStageInstance',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notifications',
    )
    rule_execution = models.ForeignKey(
        'automations.RuleExecution',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='notifications',
    )

    # Content
    title = models.CharField(max_length=200)
    body = models.TextField()
    action_url = models.URLField(
        blank=True,
        help_text='URL to navigate to when notification is clicked',
    )

    # Status
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)

    # Email tracking
    email_sent = models.BooleanField(default=False)
    email_sent_at = models.DateTimeField(null=True, blank=True)
    email_error = models.TextField(
        blank=True,
        help_text='Error message if email sending failed',
    )

    sent_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notifications'
        ordering = ['-sent_at']
        indexes = [
            models.Index(fields=['recipient', '-sent_at']),
            models.Index(fields=['recipient', 'is_read']),
        ]

    def __str__(self):
        return f"{self.get_notification_type_display()} for {self.recipient.email}"

    def mark_as_read(self):
        """Mark notification as read."""
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at'])


class NotificationTemplate(models.Model):
    """
    Reusable templates for notifications.
    Supports variable substitution using {variable_name} syntax.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    name = models.CharField(
        max_length=100,
        unique=True,
        help_text='Unique name for this template',
    )
    description = models.TextField(
        blank=True,
        help_text='Description of when/how this template is used',
    )

    # Template type (maps to NotificationType or custom)
    template_type = models.CharField(
        max_length=50,
        choices=NotificationType.choices,
        blank=True,
        help_text='System notification type this template is for (leave blank for custom)',
    )
    is_custom = models.BooleanField(
        default=False,
        help_text='True for user-created templates',
    )

    # Recipient type - who receives this notification
    recipient_type = models.CharField(
        max_length=20,
        choices=RecipientType.choices,
        default=RecipientType.CANDIDATE,
        help_text='Type of user who receives this notification',
    )

    # Content templates - support {variable} substitution
    title_template = models.CharField(
        max_length=200,
        help_text='Title template with {variables}',
    )
    body_template = models.TextField(
        help_text='Body template with {variables}',
    )
    email_subject_template = models.CharField(
        max_length=200,
        blank=True,
        help_text='Email subject template (defaults to title if blank)',
    )
    email_body_template = models.TextField(
        blank=True,
        help_text='HTML email body template (defaults to body if blank)',
    )

    # Default settings
    default_channel = models.CharField(
        max_length=20,
        choices=NotificationChannel.choices,
        default=NotificationChannel.BOTH,
    )

    # Metadata
    is_active = models.BooleanField(
        default=True,
        help_text='Inactive templates cannot be used',
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_notification_templates',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'notification_templates'
        ordering = ['name']

    def __str__(self):
        return self.name

    def render(self, context: dict) -> dict:
        """
        Render the template with the given context.
        Returns dict with 'title', 'body', 'email_subject', 'email_body'.
        Missing variables are replaced with {variable_name} placeholder.
        """
        # Use a SafeDict that returns the key in braces for missing values
        class SafeDict(dict):
            def __missing__(self, key):
                return '{' + key + '}'

        safe_context = SafeDict(context) if context else SafeDict()

        title = self.title_template.format_map(safe_context)
        body = self.body_template.format_map(safe_context)
        email_subject = (self.email_subject_template or self.title_template).format_map(safe_context)
        email_body = (self.email_body_template or self.body_template).format_map(safe_context)

        return {
            'title': title,
            'body': body,
            'email_subject': email_subject,
            'email_body': email_body,
        }
