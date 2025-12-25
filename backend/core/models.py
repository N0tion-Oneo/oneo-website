from django.db import models
from django.utils.text import slugify
from django.core.cache import cache


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
