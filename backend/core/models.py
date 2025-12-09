from django.db import models
from django.utils.text import slugify


class OnboardingEntityType(models.TextChoices):
    """Entity types that can have onboarding stages."""
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
    entity_id = models.PositiveIntegerField()  # Company.id or CandidateProfile.id

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
