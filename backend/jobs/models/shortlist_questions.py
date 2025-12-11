from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid

from .job import Job
from .application import Application


# ============================================================================
# Shortlist Screening Question Templates (Company-level reusable sets)
# ============================================================================

class ShortlistQuestionTemplate(models.Model):
    """
    Company-level template for shortlist screening questions.
    Can be applied to jobs for consistent candidate evaluation.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='shortlist_question_templates',
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='shortlist_templates_created',
    )

    name = models.CharField(
        max_length=100,
        help_text='Template name (e.g., "Technical Screening", "Culture Fit")',
    )
    description = models.TextField(
        blank=True,
        help_text='Description of when to use this template',
    )
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'shortlist_question_templates'
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.company.name})"


class ShortlistTemplateQuestion(models.Model):
    """
    A screening question within a ShortlistQuestionTemplate.
    When applied to a job, these become ShortlistQuestions.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    template = models.ForeignKey(
        ShortlistQuestionTemplate,
        on_delete=models.CASCADE,
        related_name='questions',
    )

    question_text = models.CharField(
        max_length=500,
        help_text='The screening question text',
    )
    description = models.TextField(
        blank=True,
        help_text='Guidance for reviewers on how to evaluate this question',
    )
    is_required = models.BooleanField(
        default=False,
        help_text='Whether reviewers must answer this question',
    )
    order = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'shortlist_template_questions'
        ordering = ['order', 'created_at']

    def __str__(self):
        return f"{self.question_text[:50]} ({self.template.name})"


# ============================================================================
# Job-Level Shortlist Questions
# ============================================================================

class ShortlistQuestion(models.Model):
    """
    Screening question specific to a job's shortlist review process.
    Reviewers (Admins, Recruiters, Clients) answer these with 1-5 star scores.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    job = models.ForeignKey(
        Job,
        on_delete=models.CASCADE,
        related_name='shortlist_questions',
    )

    question_text = models.CharField(
        max_length=500,
        help_text='The screening question text',
    )
    description = models.TextField(
        blank=True,
        help_text='Guidance for reviewers on how to evaluate this question',
    )
    is_required = models.BooleanField(
        default=False,
        help_text='Whether reviewers must answer this question',
    )
    order = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'shortlist_questions'
        ordering = ['order', 'created_at']

    def __str__(self):
        return f"{self.question_text[:50]} ({self.job.title})"


# ============================================================================
# Shortlist Answers (Reviewer Scores)
# ============================================================================

class ShortlistAnswer(models.Model):
    """
    A reviewer's score and notes for a shortlist screening question.

    Multiple reviewers can answer the same question for the same application,
    allowing aggregated scoring from multiple perspectives.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    application = models.ForeignKey(
        Application,
        on_delete=models.CASCADE,
        related_name='shortlist_answers',
    )
    question = models.ForeignKey(
        ShortlistQuestion,
        on_delete=models.CASCADE,
        related_name='answers',
    )
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='shortlist_reviews',
        help_text='The user who provided this score',
    )

    score = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text='Score from 1-5 stars',
    )
    notes = models.TextField(
        blank=True,
        help_text='Optional notes explaining the score',
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'shortlist_answers'
        # NOTE: No unique_together - multiple reviewers can answer same question
        indexes = [
            models.Index(fields=['application', 'reviewer']),
            models.Index(fields=['question']),
        ]
        # Unique per reviewer per question per application
        unique_together = ['application', 'question', 'reviewer']

    def __str__(self):
        reviewer_name = self.reviewer.email if self.reviewer else 'Unknown'
        return f"{reviewer_name}: {self.score}/5 for '{self.question.question_text[:30]}'"
