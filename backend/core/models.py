from django.db import models
from django.conf import settings
from django.utils.text import slugify
from django.core.cache import cache
import uuid


class DashboardSettings(models.Model):
    """
    Singleton model for system-wide dashboard configuration.
    Configures thresholds for "Candidates Needing Attention" section.
    """
    # Candidates Needing Attention thresholds
    days_without_contact = models.PositiveIntegerField(
        default=7,
        help_text='Flag candidates not contacted in this many days'
    )
    days_stuck_in_stage = models.PositiveIntegerField(
        default=14,
        help_text='Flag candidates stuck in the same stage for this many days'
    )
    days_before_interview_prep = models.PositiveIntegerField(
        default=2,
        help_text='Flag candidates with interviews within this many days for prep'
    )

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Dashboard Settings'
        verbose_name_plural = 'Dashboard Settings'

    def __str__(self):
        return 'Dashboard Settings'

    def save(self, *args, **kwargs):
        # Ensure only one instance exists (singleton pattern)
        self.pk = 1
        super().save(*args, **kwargs)
        # Clear cache when settings are updated
        cache.delete('dashboard_settings')

    @classmethod
    def get_settings(cls):
        """Get the singleton settings instance, with caching."""
        settings = cache.get('dashboard_settings')
        if settings is None:
            settings, _ = cls.objects.get_or_create(pk=1)
            cache.set('dashboard_settings', settings, timeout=3600)  # Cache for 1 hour
        return settings


class OnboardingEntityType(models.TextChoices):
    """Entity types that can have onboarding stages."""
    LEAD = 'lead', 'Lead'
    COMPANY = 'company', 'Company'
    CANDIDATE = 'candidate', 'Candidate'


class EntityType(models.TextChoices):
    """
    All entity types that can be linked to Tasks, Timeline entries, etc.
    Superset of OnboardingEntityType with additional types.
    """
    LEAD = 'lead', 'Lead'
    COMPANY = 'company', 'Company'
    CANDIDATE = 'candidate', 'Candidate'
    APPLICATION = 'application', 'Application'


class OnboardingStage(models.Model):
    """Configurable onboarding stages for companies and candidates."""
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=100)
    entity_type = models.CharField(
        max_length=20,
        choices=OnboardingEntityType.choices,
    )
    order = models.PositiveIntegerField(default=0)
    color = models.CharField(max_length=7, default='#6B7280')  # Hex color for Kanban
    is_terminal = models.BooleanField(default=False)  # True for "Onboarded" / "Not Onboarded"
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['entity_type', 'order']
        unique_together = [['entity_type', 'slug']]

    def __str__(self):
        return f"{self.get_entity_type_display()} - {self.name}"

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class OnboardingHistory(models.Model):
    """Tracks stage transitions for companies and candidates."""
    entity_type = models.CharField(
        max_length=20,
        choices=OnboardingEntityType.choices,
    )
    entity_id = models.CharField(max_length=36)  # Company.id (UUID) or CandidateProfile.id (int)

    from_stage = models.ForeignKey(
        OnboardingStage,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='transitions_from',
    )
    to_stage = models.ForeignKey(
        OnboardingStage,
        on_delete=models.CASCADE,
        related_name='transitions_to',
    )
    changed_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = 'Onboarding histories'
        indexes = [
            models.Index(fields=['entity_type', 'entity_id']),
        ]

    def __str__(self):
        from_name = self.from_stage.name if self.from_stage else 'None'
        return f"{self.entity_type} {self.entity_id}: {from_name} -> {self.to_stage.name}"


class TaskPriority(models.TextChoices):
    """Priority levels for tasks."""
    LOW = 'low', 'Low'
    MEDIUM = 'medium', 'Medium'
    HIGH = 'high', 'High'
    URGENT = 'urgent', 'Urgent'


class TaskStatus(models.TextChoices):
    """Status options for tasks."""
    PENDING = 'pending', 'Pending'
    IN_PROGRESS = 'in_progress', 'In Progress'
    COMPLETED = 'completed', 'Completed'
    CANCELLED = 'cancelled', 'Cancelled'


class Task(models.Model):
    """
    Tasks for managing follow-ups and actions on any entity type.
    Used in Service Center and Interview Mode for tracking ongoing activities.
    Supports: Lead, Company, Candidate, Application.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Polymorphic entity link - supports all entity types
    entity_type = models.CharField(
        max_length=20,
        choices=EntityType.choices,
    )
    entity_id = models.CharField(max_length=36)  # UUID or int as string

    # Optional: link to specific interview stage for application tasks
    # e.g., "Prepare for video interview" linked to application + stage
    stage_template = models.ForeignKey(
        'jobs.InterviewStageTemplate',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tasks',
        help_text='Optional: specific interview stage this task relates to',
    )

    # Task details
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    priority = models.CharField(
        max_length=10,
        choices=TaskPriority.choices,
        default=TaskPriority.MEDIUM,
    )
    status = models.CharField(
        max_length=20,
        choices=TaskStatus.choices,
        default=TaskStatus.PENDING,
    )

    # Dates
    due_date = models.DateField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    # Ownership
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='assigned_tasks',
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_tasks',
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tasks'
        ordering = ['due_date', '-priority', '-created_at']
        indexes = [
            models.Index(fields=['entity_type', 'entity_id']),
            models.Index(fields=['assigned_to', 'status']),
            models.Index(fields=['due_date']),
        ]

    def __str__(self):
        return f"{self.title} ({self.get_entity_type_display()} - {self.entity_id})"

    @property
    def is_overdue(self):
        """Check if task is overdue."""
        from django.utils import timezone
        if self.due_date and self.status not in [TaskStatus.COMPLETED, TaskStatus.CANCELLED]:
            return self.due_date < timezone.now().date()
        return False


class TaskActivityType(models.TextChoices):
    """Types of task activities that are logged."""
    CREATED = 'created', 'Task Created'
    STATUS_CHANGED = 'status_changed', 'Status Changed'
    PRIORITY_CHANGED = 'priority_changed', 'Priority Changed'
    ASSIGNED = 'assigned', 'Assigned'
    REASSIGNED = 'reassigned', 'Reassigned'
    DUE_DATE_CHANGED = 'due_date_changed', 'Due Date Changed'
    COMPLETED = 'completed', 'Completed'
    REOPENED = 'reopened', 'Reopened'
    NOTE_ADDED = 'note_added', 'Note Added'
    UPDATED = 'updated', 'Updated'


class TaskActivity(models.Model):
    """
    Activity log for tasks. Tracks all changes and events for analytics
    and audit purposes.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='activities',
    )
    activity_type = models.CharField(
        max_length=30,
        choices=TaskActivityType.choices,
    )

    # Change details (JSON for flexibility)
    old_value = models.JSONField(null=True, blank=True)
    new_value = models.JSONField(null=True, blank=True)
    description = models.TextField(blank=True)

    # Who made the change
    performed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='task_activities',
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'task_activities'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['task', '-created_at']),
            models.Index(fields=['activity_type', '-created_at']),
            models.Index(fields=['performed_by', '-created_at']),
        ]

    def __str__(self):
        return f"{self.get_activity_type_display()} - {self.task.title}"


class TaskNote(models.Model):
    """
    Notes/comments on tasks for collaboration and context.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='notes',
    )
    content = models.TextField()
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='task_notes',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'task_notes'
        ordering = ['-created_at']

    def __str__(self):
        return f"Note on {self.task.title}"
