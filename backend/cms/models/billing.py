"""Billing Configuration models for invoice and payment terms management."""
import uuid
from django.db import models
from django.conf import settings
from .base import TimestampedModel


class BillingConfig(TimestampedModel):
    """
    Singleton model for billing and invoice configuration.
    Stores default payment terms per invoice type and other billing settings.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Available payment terms options (days)
    # Stored as JSON for flexibility - can add/remove options without migration
    available_payment_terms = models.JSONField(
        default=list,
        help_text="Available payment term options in days. E.g., [0, 7, 14, 30, 45, 60]"
    )

    # Default payment terms per invoice type (in days)
    # 0 = Due on Receipt
    retainer_payment_terms_days = models.PositiveSmallIntegerField(
        default=30,
        help_text="Default payment terms for monthly retainer invoices"
    )
    placement_payment_terms_days = models.PositiveSmallIntegerField(
        default=30,
        help_text="Default payment terms for placement fee invoices"
    )
    termination_payment_terms_days = models.PositiveSmallIntegerField(
        default=30,
        help_text="Default payment terms for early termination invoices"
    )
    service_type_change_payment_terms_days = models.PositiveSmallIntegerField(
        default=7,
        help_text="Payment terms for service type change fees (blocking payment - requires payment before change)"
    )
    adjustment_payment_terms_days = models.PositiveSmallIntegerField(
        default=14,
        help_text="Default payment terms for adjustment invoices"
    )
    other_payment_terms_days = models.PositiveSmallIntegerField(
        default=14,
        help_text="Default payment terms for other invoice types"
    )

    # VAT Configuration
    default_vat_rate = models.DecimalField(
        max_digits=5,
        decimal_places=4,
        default=0.15,
        help_text="Default VAT rate as decimal (0.15 = 15%)"
    )

    # Invoice numbering configuration
    invoice_number_prefix = models.CharField(
        max_length=10,
        default='INV',
        help_text="Prefix for invoice numbers (e.g., INV-202412-0001)"
    )

    # Audit
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='billing_config_updates',
    )

    class Meta:
        verbose_name = "Billing Configuration"
        verbose_name_plural = "Billing Configuration"

    def __str__(self):
        return "Billing Configuration"

    def save(self, *args, **kwargs):
        # Singleton pattern - ensure only one instance exists
        if not self.pk and BillingConfig.objects.exists():
            existing = BillingConfig.objects.first()
            self.pk = existing.pk

        # Set default available terms if empty
        if not self.available_payment_terms:
            self.available_payment_terms = [0, 7, 14, 30, 45, 60]

        super().save(*args, **kwargs)

    @classmethod
    def get_config(cls):
        """Get or create the singleton config instance."""
        config, created = cls.objects.get_or_create(
            pk=cls.objects.first().pk if cls.objects.exists() else None
        )
        if created:
            # Ensure defaults are set on first creation
            config.save()
        return config

    def get_payment_terms_for_invoice_type(self, invoice_type: str) -> int:
        """
        Get default payment terms for a given invoice type.

        Args:
            invoice_type: One of 'retainer', 'placement', 'termination',
                         'service_type_change', 'adjustment', 'other'

        Returns:
            Payment terms in days
        """
        mapping = {
            'retainer': self.retainer_payment_terms_days,
            'placement': self.placement_payment_terms_days,
            'termination': self.termination_payment_terms_days,
            'service_type_change': self.service_type_change_payment_terms_days,
            'adjustment': self.adjustment_payment_terms_days,
            'other': self.other_payment_terms_days,
        }
        return mapping.get(invoice_type, self.other_payment_terms_days)

    def get_payment_terms_label(self, days: int) -> str:
        """Get display label for payment terms."""
        if days == 0:
            return "Due on Receipt"
        return f"Net {days}"
