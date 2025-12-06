from django.db import models
from django.conf import settings
from django.utils import timezone
import uuid

from .job import Job
from .application import Application


class StageType(models.TextChoices):
    """
    Predefined interview stage types with specific requirements.
    """
    APPLICATION_SCREEN = 'application_screen', 'Application Screen'
    PHONE_SCREENING = 'phone_screening', 'Phone Screening'
    VIDEO_CALL = 'video_call', 'Video Call Interview'
    IN_PERSON_INTERVIEW = 'in_person_interview', 'In-Person Interview'
    TAKE_HOME_ASSESSMENT = 'take_home_assessment', 'Take-Home Assessment'
    IN_PERSON_ASSESSMENT = 'in_person_assessment', 'In-Person Assessment'
    CUSTOM = 'custom', 'Custom'


# Default stage names and durations by type
STAGE_TYPE_DEFAULTS = {
    StageType.APPLICATION_SCREEN: {'name': 'Application Screen', 'duration': None},
    StageType.PHONE_SCREENING: {'name': 'Phone Screening', 'duration': 30},
    StageType.VIDEO_CALL: {'name': 'Video Call Interview', 'duration': 45},
    StageType.IN_PERSON_INTERVIEW: {'name': 'In-Person Interview', 'duration': 60},
    StageType.TAKE_HOME_ASSESSMENT: {'name': 'Take-Home Assessment', 'duration': None},
    StageType.IN_PERSON_ASSESSMENT: {'name': 'In-Person Assessment', 'duration': 90},
    StageType.CUSTOM: {'name': 'Custom Stage', 'duration': 60},
}


class ApplicationStage(models.Model):
    """
    Custom pipeline stages for a job's application process.
    Replaces the JSON-based interview_stages field for better querying.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    job = models.ForeignKey(
        Job,
        on_delete=models.CASCADE,
        related_name='stages',
    )

    name = models.CharField(max_length=100)
    order = models.PositiveIntegerField(default=0)
    is_default = models.BooleanField(
        default=False,
        help_text='Default stages that come pre-populated',
    )
    color = models.CharField(
        max_length=7,
        default='#6B7280',
        help_text='Hex color code for UI display',
    )
    description = models.TextField(
        blank=True,
        help_text='Description of what happens at this stage',
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'application_stages'
        ordering = ['order']
        unique_together = ['job', 'order']

    def __str__(self):
        return f"{self.name} (Stage {self.order}) - {self.job.title}"


class InterviewStageTemplate(models.Model):
    """
    Defines a stage in a job's interview pipeline.
    Replaces the JSON-based interview_stages field with a typed model.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    job = models.ForeignKey(
        Job,
        on_delete=models.CASCADE,
        related_name='stage_templates',
    )

    # Stage definition
    stage_type = models.CharField(
        max_length=30,
        choices=StageType.choices,
        default=StageType.CUSTOM,
    )
    name = models.CharField(
        max_length=100,
        help_text='Stage name (auto-filled from type or custom)',
    )
    order = models.PositiveIntegerField(
        help_text='Position in the interview pipeline (1-indexed)',
    )
    description = models.TextField(
        blank=True,
        help_text='Description of what happens at this stage',
    )

    # Scheduling defaults (for interview types)
    default_duration_minutes = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text='Default interview duration in minutes',
    )
    default_interviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='default_interview_stages',
        help_text='Default interviewer for this stage',
    )

    # Assessment configuration (for assessment types)
    assessment_instructions = models.TextField(
        blank=True,
        help_text='Instructions for the candidate (Markdown supported)',
    )
    assessment_instructions_file = models.FileField(
        upload_to='stage_instructions/',
        null=True,
        blank=True,
        help_text='PDF or document with detailed instructions',
    )
    assessment_external_url = models.URLField(
        blank=True,
        help_text='External assessment URL (e.g., Codility, HackerRank)',
    )
    assessment_provider_name = models.CharField(
        max_length=100,
        blank=True,
        help_text='Assessment provider name (e.g., "Codility", "HackerRank")',
    )
    deadline_days = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text='Days from assignment to deadline for assessments',
    )

    # Location configuration (for in-person types)
    use_company_address = models.BooleanField(
        default=True,
        help_text='Use company office address by default',
    )
    custom_location = models.CharField(
        max_length=500,
        blank=True,
        help_text='Custom location if not using company address',
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'interview_stage_templates'
        ordering = ['order']
        unique_together = ['job', 'order']

    def __str__(self):
        return f"{self.name} (Stage {self.order}) - {self.job.title}"

    def save(self, *args, **kwargs):
        # Auto-fill name and duration from stage type defaults if not set
        if not self.name and self.stage_type in STAGE_TYPE_DEFAULTS:
            self.name = STAGE_TYPE_DEFAULTS[self.stage_type]['name']
        if self.default_duration_minutes is None and self.stage_type in STAGE_TYPE_DEFAULTS:
            self.default_duration_minutes = STAGE_TYPE_DEFAULTS[self.stage_type]['duration']
        super().save(*args, **kwargs)

    @property
    def requires_scheduling(self):
        """Returns True if this stage type requires scheduling."""
        return self.stage_type in [
            StageType.PHONE_SCREENING,
            StageType.VIDEO_CALL,
            StageType.IN_PERSON_INTERVIEW,
            StageType.IN_PERSON_ASSESSMENT,
        ]

    @property
    def requires_location(self):
        """Returns True if this stage type requires a location."""
        return self.stage_type in [
            StageType.IN_PERSON_INTERVIEW,
            StageType.IN_PERSON_ASSESSMENT,
        ]

    @property
    def is_assessment(self):
        """Returns True if this is an assessment stage."""
        return self.stage_type in [
            StageType.TAKE_HOME_ASSESSMENT,
            StageType.IN_PERSON_ASSESSMENT,
        ]


class StageInstanceStatus(models.TextChoices):
    """Status of a candidate's progress through a specific stage."""
    NOT_STARTED = 'not_started', 'Not Started'
    SCHEDULED = 'scheduled', 'Scheduled'
    IN_PROGRESS = 'in_progress', 'In Progress'
    AWAITING_SUBMISSION = 'awaiting_submission', 'Awaiting Submission'
    SUBMITTED = 'submitted', 'Submitted'
    COMPLETED = 'completed', 'Completed'
    CANCELLED = 'cancelled', 'Cancelled'
    NO_SHOW = 'no_show', 'No Show'


class ApplicationStageInstance(models.Model):
    """
    Instance of a stage for a specific candidate/application.
    Tracks scheduling details, submission info, and status.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    application = models.ForeignKey(
        Application,
        on_delete=models.CASCADE,
        related_name='stage_instances',
    )
    stage_template = models.ForeignKey(
        InterviewStageTemplate,
        on_delete=models.CASCADE,
        related_name='instances',
    )

    # Status
    status = models.CharField(
        max_length=30,
        choices=StageInstanceStatus.choices,
        default=StageInstanceStatus.NOT_STARTED,
    )

    # Scheduling fields (for interview types)
    scheduled_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Scheduled date and time for the interview',
    )
    duration_minutes = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text='Actual duration (may differ from template default)',
    )
    interviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='interviews_assigned',
        help_text='Primary interviewer',
    )
    participants = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        related_name='interview_participations',
        help_text='Additional participants (besides the primary interviewer)',
    )

    # Meeting details
    meeting_link = models.URLField(
        blank=True,
        help_text='Video meeting link (Zoom, Teams, Google Meet, etc.)',
    )
    location = models.CharField(
        max_length=500,
        blank=True,
        help_text='Physical location for in-person interviews',
    )
    meeting_notes = models.TextField(
        blank=True,
        help_text='Additional meeting notes visible to candidate',
    )

    # Calendar integration
    google_calendar_event_id = models.CharField(
        max_length=255,
        blank=True,
        help_text='Google Calendar event ID for syncing',
    )
    microsoft_calendar_event_id = models.CharField(
        max_length=255,
        blank=True,
        help_text='Microsoft 365 Calendar event ID for syncing',
    )
    calendar_invite_sent = models.BooleanField(
        default=False,
        help_text='Whether calendar invite was sent to participants',
    )

    # Assessment submission (for take-home types)
    deadline = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Deadline for assessment submission',
    )
    submission_url = models.URLField(
        blank=True,
        help_text='External submission link or completed assessment URL',
    )
    submission_file = models.FileField(
        upload_to='assessment_submissions/',
        null=True,
        blank=True,
        help_text='Uploaded submission file',
    )
    submitted_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When the candidate submitted their work',
    )

    # Recruiter notes (internal)
    recruiter_notes = models.TextField(
        blank=True,
        help_text='Internal notes for recruiters (not visible to candidate)',
    )

    # Feedback/scoring (after stage completion)
    feedback = models.TextField(
        blank=True,
        help_text='Interviewer feedback after the stage',
    )
    score = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        help_text='Score or rating (1-5 scale)',
    )
    recommendation = models.CharField(
        max_length=20,
        choices=[
            ('strong_yes', 'Strong Yes'),
            ('yes', 'Yes'),
            ('maybe', 'Maybe'),
            ('no', 'No'),
            ('strong_no', 'Strong No'),
        ],
        blank=True,
        help_text='Interviewer recommendation',
    )

    # Notification tracking
    notification_sent_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When initial notification was sent',
    )
    reminder_sent_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When reminder notification was sent',
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When the stage was marked as completed',
    )

    class Meta:
        db_table = 'application_stage_instances'
        ordering = ['stage_template__order']
        unique_together = ['application', 'stage_template']

    def __str__(self):
        return f"{self.application.candidate} - {self.stage_template.name}"

    def schedule(self, scheduled_at, interviewer=None, duration_minutes=None, meeting_link='', location=''):
        """Schedule the stage instance."""
        self.scheduled_at = scheduled_at
        self.interviewer = interviewer or self.stage_template.default_interviewer
        self.duration_minutes = duration_minutes or self.stage_template.default_duration_minutes
        self.meeting_link = meeting_link
        self.location = location or (
            self.stage_template.custom_location if not self.stage_template.use_company_address else ''
        )
        self.status = StageInstanceStatus.SCHEDULED
        self.save()

    def complete(self, feedback='', score=None, recommendation=''):
        """Mark the stage as completed."""
        self.status = StageInstanceStatus.COMPLETED
        self.feedback = feedback
        self.score = score
        self.recommendation = recommendation
        self.completed_at = timezone.now()
        self.save()

    def cancel(self):
        """Cancel the scheduled stage."""
        self.status = StageInstanceStatus.CANCELLED
        self.save()

    @property
    def is_overdue(self):
        """Check if assessment deadline has passed."""
        if self.deadline and self.status == StageInstanceStatus.AWAITING_SUBMISSION:
            return timezone.now() > self.deadline
        return False
