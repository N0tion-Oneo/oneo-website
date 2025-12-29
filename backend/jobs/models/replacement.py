"""Replacement request model for the free replacements feature."""
import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone

from automations.registry import automatable


class ReplacementStatus(models.TextChoices):
    """Status choices for replacement requests."""
    PENDING = 'pending', 'Pending Review'
    APPROVED_FREE = 'approved_free', 'Approved (Free)'
    APPROVED_DISCOUNTED = 'approved_discounted', 'Approved (Discounted)'
    REJECTED = 'rejected', 'Rejected'


class ReplacementReasonCategory(models.TextChoices):
    """Reason categories for replacement requests."""
    RESIGNATION = 'resignation', 'Candidate Resigned'
    TERMINATION = 'termination', 'Candidate Terminated'
    PERFORMANCE = 'performance', 'Performance Issues'
    CULTURAL_FIT = 'cultural_fit', 'Cultural Fit Issues'
    NO_SHOW = 'no_show', 'Candidate Did Not Start'
    OTHER = 'other', 'Other'


@automatable(
    display_name='Replacement Request',
    events=['created', 'updated', 'status_changed'],
    status_field='status',
)
class ReplacementRequest(models.Model):
    """
    Request for a free or discounted replacement hire.

    When a hired candidate leaves within the replacement period,
    the client can request a replacement. Admins can approve
    (free or discounted) or reject the request.

    One replacement per hire - enforced by OneToOneField.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Core relation - one replacement request per application/placement
    application = models.OneToOneField(
        'jobs.Application',
        on_delete=models.CASCADE,
        related_name='replacement_request',
        help_text='The original placement/hire being replaced',
    )

    # Request details
    reason_category = models.CharField(
        max_length=20,
        choices=ReplacementReasonCategory.choices,
        help_text='Category of reason for the replacement request',
    )
    reason_details = models.TextField(
        blank=True,
        help_text='Detailed explanation of why replacement is needed',
    )

    # Status
    status = models.CharField(
        max_length=20,
        choices=ReplacementStatus.choices,
        default=ReplacementStatus.PENDING,
    )

    # Discount percentage (only for APPROVED_DISCOUNTED status)
    discount_percentage = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text='Discount percentage if approved as discounted (e.g., 50 = 50% off placement fee)',
    )

    # Request audit
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='replacement_requests_made',
        help_text='Client user who submitted the request',
    )
    requested_at = models.DateTimeField(
        auto_now_add=True,
        help_text='When the request was submitted',
    )

    # Review audit
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='replacement_requests_reviewed',
        help_text='Admin who reviewed the request',
    )
    reviewed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When the request was reviewed',
    )
    review_notes = models.TextField(
        blank=True,
        help_text='Notes from the reviewer explaining the decision',
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'replacement_requests'
        verbose_name = 'Replacement Request'
        verbose_name_plural = 'Replacement Requests'
        ordering = ['-requested_at']

    def __str__(self):
        candidate_name = self.application.candidate.user.get_full_name()
        job_title = self.application.job.title
        return f"Replacement for {candidate_name} - {job_title} ({self.get_status_display()})"

    @property
    def company(self):
        """Get the company from the application's job."""
        return self.application.job.company

    @property
    def job(self):
        """Get the job from the application."""
        return self.application.job

    @property
    def candidate(self):
        """Get the candidate from the application."""
        return self.application.candidate

    @property
    def is_pending(self):
        """Check if request is pending review."""
        return self.status == ReplacementStatus.PENDING

    @property
    def is_approved(self):
        """Check if request was approved (free or discounted)."""
        return self.status in [ReplacementStatus.APPROVED_FREE, ReplacementStatus.APPROVED_DISCOUNTED]

    @property
    def is_free(self):
        """Check if this is a free replacement."""
        return self.status == ReplacementStatus.APPROVED_FREE

    @property
    def is_discounted(self):
        """Check if this is a discounted replacement."""
        return self.status == ReplacementStatus.APPROVED_DISCOUNTED

    def approve_free(self, reviewed_by, credit_percentage=100, notes=''):
        """Approve the request as a free replacement with credit.

        Args:
            reviewed_by: The user approving the request
            credit_percentage: Percentage of original fee to credit (1-100, default 100)
            notes: Optional review notes
        """
        self.status = ReplacementStatus.APPROVED_FREE
        self.discount_percentage = credit_percentage  # Credit percentage of original fee
        self.reviewed_by = reviewed_by
        self.reviewed_at = timezone.now()
        self.review_notes = notes
        self.save()
        self._on_approved()

    def approve_discounted(self, reviewed_by, discount_percentage, notes=''):
        """Approve the request with a discount."""
        self.status = ReplacementStatus.APPROVED_DISCOUNTED
        self.discount_percentage = discount_percentage
        self.reviewed_by = reviewed_by
        self.reviewed_at = timezone.now()
        self.review_notes = notes
        self.save()
        self._on_approved()

    def reject(self, reviewed_by, notes=''):
        """Reject the replacement request."""
        self.status = ReplacementStatus.REJECTED
        self.reviewed_by = reviewed_by
        self.reviewed_at = timezone.now()
        self.review_notes = notes
        self.save()

    def _on_approved(self):
        """
        Actions to take when a replacement is approved.
        - Increment job positions_to_fill
        - Update job fill status (may reopen the job)
        """
        job = self.application.job
        job.positions_to_fill += 1
        job.save(update_fields=['positions_to_fill'])
        job.update_fill_status()
