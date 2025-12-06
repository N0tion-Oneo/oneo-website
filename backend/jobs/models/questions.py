from django.db import models
from django.conf import settings
import uuid

from .job import Job
from .application import Application


class QuestionType(models.TextChoices):
    TEXT = 'text', 'Short Text'
    TEXTAREA = 'textarea', 'Long Text'
    SELECT = 'select', 'Single Select'
    MULTI_SELECT = 'multi_select', 'Multi Select'
    FILE = 'file', 'File Upload'
    EXTERNAL_LINK = 'external_link', 'External Link'


class ApplicationQuestion(models.Model):
    """
    Custom application questions defined by a company for a specific job.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    job = models.ForeignKey(
        Job,
        on_delete=models.CASCADE,
        related_name='questions',
    )

    question_text = models.CharField(max_length=500)
    question_type = models.CharField(
        max_length=20,
        choices=QuestionType.choices,
        default=QuestionType.TEXT,
    )
    options = models.JSONField(
        default=list,
        blank=True,
        help_text='Options for select/multi_select types: ["Option 1", "Option 2"]',
    )
    placeholder = models.CharField(
        max_length=200,
        blank=True,
        help_text='Placeholder text for text/textarea inputs',
    )
    helper_text = models.CharField(
        max_length=300,
        blank=True,
        help_text='Help text shown below the question',
    )
    is_required = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'application_questions'
        ordering = ['order', 'created_at']

    def __str__(self):
        return f"{self.question_text[:50]} ({self.job.title})"


class ApplicationAnswer(models.Model):
    """
    Candidate's answer to an application question.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    application = models.ForeignKey(
        Application,
        on_delete=models.CASCADE,
        related_name='answers',
    )
    question = models.ForeignKey(
        ApplicationQuestion,
        on_delete=models.CASCADE,
        related_name='answers',
    )

    answer_text = models.TextField(
        blank=True,
        help_text='Text answer or JSON array for multi_select',
    )
    answer_file = models.FileField(
        upload_to='applications/answers/',
        null=True,
        blank=True,
        help_text='File upload for file type questions',
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'application_answers'
        unique_together = ['application', 'question']

    def __str__(self):
        return f"Answer to '{self.question.question_text[:30]}'"


# ============================================================================
# Question Templates (Company-level reusable question sets)
# ============================================================================

class QuestionTemplate(models.Model):
    """
    Company-level question template that can be reused across jobs.
    Contains a set of questions that can be applied to new job postings.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='question_templates',
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='question_templates_created',
    )

    name = models.CharField(
        max_length=100,
        help_text='Template name (e.g., "Engineering Questions", "Sales Assessment")',
    )
    description = models.TextField(
        blank=True,
        help_text='Description of when to use this template',
    )
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'question_templates'
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.company.name})"


class TemplateQuestion(models.Model):
    """
    A question that belongs to a QuestionTemplate.
    When a template is applied to a job, these become ApplicationQuestions.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    template = models.ForeignKey(
        QuestionTemplate,
        on_delete=models.CASCADE,
        related_name='questions',
    )

    question_text = models.CharField(max_length=500)
    question_type = models.CharField(
        max_length=20,
        choices=QuestionType.choices,
        default=QuestionType.TEXT,
    )
    options = models.JSONField(
        default=list,
        blank=True,
        help_text='Options for select/multi_select types: ["Option 1", "Option 2"]',
    )
    placeholder = models.CharField(
        max_length=200,
        blank=True,
        help_text='Placeholder text for text/textarea inputs',
    )
    helper_text = models.CharField(
        max_length=300,
        blank=True,
        help_text='Help text shown below the question',
    )
    is_required = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'template_questions'
        ordering = ['order', 'created_at']

    def __str__(self):
        return f"{self.question_text[:50]} ({self.template.name})"
