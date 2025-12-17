"""Pricing Configuration models for the pricing calculator."""
import uuid
from django.db import models
from django.conf import settings
from .base import TimestampedModel


class PricingConfig(TimestampedModel):
    """
    Singleton model for pricing calculator configuration.
    Stores rates, fees, and default values for all services.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Enterprise pricing (markup percentages as decimals, e.g., 0.22 = 22%)
    enterprise_markup_year1 = models.DecimalField(
        max_digits=5, decimal_places=4, default=0.22,
        help_text="Year 1 markup rate (e.g., 0.22 = 22%)"
    )
    enterprise_markup_year2 = models.DecimalField(
        max_digits=5, decimal_places=4, default=0.20,
        help_text="Year 2 markup rate"
    )
    enterprise_markup_year3 = models.DecimalField(
        max_digits=5, decimal_places=4, default=0.18,
        help_text="Year 3 markup rate"
    )
    enterprise_markup_year4_plus = models.DecimalField(
        max_digits=5, decimal_places=4, default=0.16,
        help_text="Year 4+ markup rate"
    )
    enterprise_additionals_fee = models.DecimalField(
        max_digits=5, decimal_places=4, default=0.12,
        help_text="Fee on additionals (e.g., 0.12 = 12%)"
    )
    enterprise_assets_fee = models.DecimalField(
        max_digits=5, decimal_places=4, default=0.12,
        help_text="Fee on assets (e.g., 0.12 = 12%)"
    )

    # EOR pricing
    eor_monthly_fee = models.DecimalField(
        max_digits=10, decimal_places=2, default=7000,
        help_text="Monthly fee per person (ZAR)"
    )
    eor_additionals_fee = models.DecimalField(
        max_digits=5, decimal_places=4, default=0.20,
        help_text="Fee on additionals (e.g., 0.20 = 20%)"
    )
    eor_assets_fee = models.DecimalField(
        max_digits=5, decimal_places=4, default=0.20,
        help_text="Fee on assets (e.g., 0.20 = 20%)"
    )

    # Retained pricing
    retained_monthly_retainer = models.DecimalField(
        max_digits=10, decimal_places=2, default=20000,
        help_text="Monthly retainer fee (ZAR)"
    )
    retained_placement_fee = models.DecimalField(
        max_digits=5, decimal_places=4, default=0.10,
        help_text="Placement fee for regular employees (e.g., 0.10 = 10%)"
    )
    retained_csuite_placement_fee = models.DecimalField(
        max_digits=5, decimal_places=4, default=0.15,
        help_text="Placement fee for C-Suite executives (e.g., 0.15 = 15%)"
    )

    # Headhunting pricing
    headhunting_placement_fee = models.DecimalField(
        max_digits=5, decimal_places=4, default=0.20,
        help_text="Placement fee for regular employees (e.g., 0.20 = 20%)"
    )
    headhunting_csuite_placement_fee = models.DecimalField(
        max_digits=5, decimal_places=4, default=0.25,
        help_text="Placement fee for C-Suite executives (e.g., 0.25 = 25%)"
    )

    # Default calculator values
    default_salary = models.DecimalField(
        max_digits=10, decimal_places=2, default=45000,
        help_text="Default monthly salary (ZAR)"
    )
    default_desk_fee = models.DecimalField(
        max_digits=10, decimal_places=2, default=5000,
        help_text="Default desk/co-working fee per month (ZAR)"
    )
    default_lunch_fee = models.DecimalField(
        max_digits=10, decimal_places=2, default=500,
        help_text="Default lunch fee per person per month (ZAR)"
    )
    default_event_cost = models.DecimalField(
        max_digits=10, decimal_places=2, default=15000,
        help_text="Default quarterly event cost (ZAR)"
    )
    default_party_cost = models.DecimalField(
        max_digits=10, decimal_places=2, default=50000,
        help_text="Default year-end party cost (ZAR)"
    )
    default_asset_cost = models.DecimalField(
        max_digits=10, decimal_places=2, default=25000,
        help_text="Default asset cost per hire (ZAR)"
    )

    # Audit
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='pricing_config_updates'
    )

    class Meta:
        verbose_name = "Pricing Configuration"
        verbose_name_plural = "Pricing Configuration"

    def __str__(self):
        return "Pricing Configuration"

    def save(self, *args, **kwargs):
        # Ensure only one instance exists (singleton pattern)
        if not self.pk and PricingConfig.objects.exists():
            existing = PricingConfig.objects.first()
            self.pk = existing.pk
        super().save(*args, **kwargs)

    @classmethod
    def get_config(cls):
        """Get or create the singleton config instance."""
        config, _ = cls.objects.get_or_create(
            pk=cls.objects.first().pk if cls.objects.exists() else None
        )
        return config


class FeatureCategory(models.TextChoices):
    RECRUITMENT = 'recruitment', 'Recruitment'
    RETAINED = 'retained', 'Retained'
    EMPLOYMENT = 'employment', 'Employment'
    ADDITIONAL = 'additional', 'Additional'


class PricingFeature(TimestampedModel):
    """
    Feature that can be included in pricing comparison.
    Each feature can be toggled on/off for each service.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    name = models.CharField(max_length=100)
    category = models.CharField(
        max_length=20,
        choices=FeatureCategory.choices,
        default=FeatureCategory.RECRUITMENT
    )
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    # Which services include this feature
    included_in_enterprise = models.BooleanField(default=True)
    included_in_eor = models.BooleanField(default=False)
    included_in_retained = models.BooleanField(default=False)
    included_in_headhunting = models.BooleanField(default=False)

    class Meta:
        ordering = ['order', 'name']
        verbose_name = "Pricing Feature"
        verbose_name_plural = "Pricing Features"

    def __str__(self):
        return self.name
