from django.db import models
from django.conf import settings
import uuid


class StageFeedbackType(models.TextChoices):
    """Types of stages that can have feedback."""
    APPLIED = 'applied', 'Applied'
    SHORTLISTED = 'shortlisted', 'Shortlisted'
    INTERVIEW = 'interview', 'Interview Stage'


class StageFeedback(models.Model):
    """
    Threaded feedback/comments for application stages.
    Can be attached to either:
    - A status stage (Applied, Shortlisted) via application + stage_type
    - An interview stage instance via stage_instance
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # The application this feedback belongs to
    application = models.ForeignKey(
        'jobs.Application',
        on_delete=models.CASCADE,
        related_name='stage_feedbacks',
    )

    # For status stages (Applied, Shortlisted)
    stage_type = models.CharField(
        max_length=20,
        choices=StageFeedbackType.choices,
        null=True,
        blank=True,
        help_text='Type of status stage (for Applied/Shortlisted feedback)',
    )

    # For interview stages
    stage_instance = models.ForeignKey(
        'jobs.ApplicationStageInstance',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='feedbacks',
        help_text='Interview stage instance (for interview stage feedback)',
    )

    # Who wrote this feedback
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='stage_feedbacks',
    )

    # The feedback content
    comment = models.TextField(
        help_text='The feedback comment text',
    )

    # Optional score (1-10)
    score = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        help_text='Optional score (1-10)',
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'stage_feedbacks'
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['application', 'stage_type']),
            models.Index(fields=['stage_instance']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        author_name = self.author.full_name if self.author else 'Unknown'
        if self.stage_instance:
            return f"Feedback by {author_name} on {self.stage_instance.stage_template.name}"
        return f"Feedback by {author_name} on {self.get_stage_type_display()}"

    def clean(self):
        from django.core.exceptions import ValidationError
        # Must have either stage_type or stage_instance, not both
        if self.stage_type and self.stage_instance:
            raise ValidationError('Cannot have both stage_type and stage_instance')
        if not self.stage_type and not self.stage_instance:
            raise ValidationError('Must have either stage_type or stage_instance')
        # Validate score range
        if self.score is not None and (self.score < 1 or self.score > 10):
            raise ValidationError('Score must be between 1 and 10')
