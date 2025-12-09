from django.db import models
from django.conf import settings
from django.utils import timezone
import uuid

from .job import Job


class ApplicationStatus(models.TextChoices):
    APPLIED = 'applied', 'Applied'
    SHORTLISTED = 'shortlisted', 'Shortlisted'
    IN_PROGRESS = 'in_progress', 'In Progress'
    OFFER_MADE = 'offer_made', 'Offer Made'
    OFFER_ACCEPTED = 'offer_accepted', 'Offer Accepted'
    OFFER_DECLINED = 'offer_declined', 'Offer Declined'
    REJECTED = 'rejected', 'Rejected'


class RejectionReason(models.TextChoices):
    INTERNAL_REJECTION = 'internal_rejection', 'Internal Rejection'
    CLIENT_REJECTION = 'client_rejection', 'Client Rejection'
    WITHDRAWN = 'withdrawn', 'Withdrawn'
    INVALID_SHORTLIST = 'invalid_shortlist', 'Invalid Shortlist'
    CANDIDATE_NOT_INTERESTED = 'candidate_not_interested', 'Candidate Not Interested'


class ApplicationSource(models.TextChoices):
    DIRECT = 'direct', 'Direct'
    REFERRAL = 'referral', 'Referral'
    RECRUITER = 'recruiter', 'Recruiter'


class Application(models.Model):
    """
    Job application from a candidate.
    Tracks the candidate's progress through the job's interview stages.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Relations
    job = models.ForeignKey(
        Job,
        on_delete=models.CASCADE,
        related_name='applications',
    )
    candidate = models.ForeignKey(
        'candidates.CandidateProfile',
        on_delete=models.CASCADE,
        related_name='applications',
    )
    referrer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='referrals',
    )

    # Assigned recruiters/admins for this specific application
    assigned_recruiters = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        related_name='assigned_applications',
        help_text='Recruiters/admins assigned to manage this application',
    )

    # Application Content
    covering_statement = models.TextField(
        blank=True,
        help_text='Cover letter or statement from the candidate',
    )
    resume_url = models.FileField(
        upload_to='applications/resumes/',
        null=True,
        blank=True,
        help_text='Resume uploaded with this application (or uses profile resume)',
    )

    # Status & Stage Tracking
    status = models.CharField(
        max_length=20,
        choices=ApplicationStatus.choices,
        default=ApplicationStatus.APPLIED,
    )
    current_stage = models.ForeignKey(
        'jobs.InterviewStageTemplate',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='applications_at_stage',
        help_text='Current interview stage (null = Applied/not yet in pipeline)',
    )
    stage_notes = models.JSONField(
        default=dict,
        blank=True,
        help_text='Notes per stage: {"1": {"notes": "...", "updated_at": "..."}}',
    )

    # Metadata
    source = models.CharField(
        max_length=20,
        choices=ApplicationSource.choices,
        default=ApplicationSource.DIRECT,
    )

    # Offer Details
    offer_details = models.JSONField(
        default=dict,
        blank=True,
        help_text='Offer details: {"salary": 50000, "currency": "ZAR", "start_date": "2024-01-15", "notes": "..."}',
    )
    offer_made_at = models.DateTimeField(null=True, blank=True)
    offer_accepted_at = models.DateTimeField(null=True, blank=True)
    final_offer_details = models.JSONField(
        default=dict,
        blank=True,
        help_text='Final confirmed offer details after acceptance',
    )

    # Rejection Details
    rejection_reason = models.CharField(
        max_length=30,
        choices=RejectionReason.choices,
        blank=True,
        help_text='Structured rejection reason',
    )
    rejection_feedback = models.TextField(
        blank=True,
        help_text='Custom feedback/notes for the rejection',
    )
    rejected_at = models.DateTimeField(null=True, blank=True)

    # Internal Notes
    feedback = models.TextField(
        blank=True,
        help_text='Internal notes about the application',
    )

    # Dates
    applied_at = models.DateTimeField(auto_now_add=True)
    shortlisted_at = models.DateTimeField(null=True, blank=True)
    last_status_change = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'applications'
        ordering = ['-applied_at']
        unique_together = ['job', 'candidate']

    def __str__(self):
        return f"{self.candidate.user.get_full_name()} - {self.job.title}"

    def shortlist(self):
        """Move application to shortlisted status."""
        self.status = ApplicationStatus.SHORTLISTED
        self.shortlisted_at = timezone.now()
        # Clear rejection fields when shortlisting
        self.rejection_reason = ''
        self.rejection_feedback = ''
        self.rejected_at = None
        self.save()

    def reject(self, reason='', feedback=''):
        """Reject the application."""
        self.status = ApplicationStatus.REJECTED
        self.rejection_reason = reason
        self.rejection_feedback = feedback
        self.rejected_at = timezone.now()
        self.save()

    def make_offer(self, offer_details=None):
        """Make an offer to the candidate."""
        self.status = ApplicationStatus.OFFER_MADE
        self.offer_details = offer_details or {}
        self.offer_made_at = timezone.now()
        self.save()

    def accept_offer(self, final_details=None):
        """Confirm offer acceptance with final details."""
        self.status = ApplicationStatus.OFFER_ACCEPTED
        self.final_offer_details = final_details or self.offer_details
        self.offer_accepted_at = timezone.now()
        self.save()

    def decline_offer(self, reason=''):
        """Record that candidate declined the offer."""
        self.status = ApplicationStatus.OFFER_DECLINED
        self.rejection_reason = reason  # Reuse rejection_reason for decline reason
        self.rejected_at = timezone.now()  # Reuse rejected_at for declined timestamp
        self.save()

    @property
    def current_stage_order(self):
        """Get the order of the current stage (0 if not in pipeline)."""
        if self.current_stage:
            return self.current_stage.order
        return 0

    @property
    def current_stage_name(self):
        """Get the name of the current interview stage."""
        if self.current_stage:
            return self.current_stage.name
        return 'Applied'
