"""Models for subscription management, invoicing, and billing."""
import uuid
from datetime import date
from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models


# =============================================================================
# Abstract Base Model
# =============================================================================


class TimestampedModel(models.Model):
    """Adds created_at and updated_at timestamps."""
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


# =============================================================================
# Subscription Enums
# =============================================================================


class SubscriptionStatus(models.TextChoices):
    PENDING_APPROVAL = 'pending_approval', 'Pending Approval'
    ACTIVE = 'active', 'Active'
    PAUSED = 'paused', 'Paused'
    TERMINATED = 'terminated', 'Terminated'
    EXPIRED = 'expired', 'Expired'


class TerminationType(models.TextChoices):
    FOR_CAUSE = 'for_cause', 'For Cause'
    WITHOUT_CAUSE = 'without_cause', 'Without Cause'
    MUTUAL = 'mutual', 'Mutual Agreement'
    EXPIRED = 'expired', 'Contract Expired'


class TerminationReason(models.TextChoices):
    # For Cause reasons
    MATERIAL_BREACH = 'material_breach', 'Material Breach'
    LIQUIDATION = 'liquidation', 'Liquidation/Business Rescue'
    NON_PAYMENT = 'non_payment', 'Non-Payment (30+ days overdue)'
    # Without Cause
    CLIENT_REQUEST = 'client_request', 'Client Request (Early Termination)'
    # Other
    CONTRACT_EXPIRED = 'contract_expired', 'Contract Expired'
    MUTUAL_AGREEMENT = 'mutual_agreement', 'Mutual Agreement'


class SubscriptionServiceType(models.TextChoices):
    """Service types that can have subscriptions/contracts."""
    RETAINED = 'retained', 'Retained Recruitment'
    HEADHUNTING = 'headhunting', 'Headhunting'
    EOR = 'eor', 'Employer of Record'

    @classmethod
    def recruitment_types(cls):
        """Return mutually exclusive recruitment service types."""
        return [cls.RETAINED, cls.HEADHUNTING]


# =============================================================================
# Subscription Model
# =============================================================================


class Subscription(TimestampedModel):
    """
    Subscription/contract for any service type.
    A company can have multiple subscriptions for different services,
    but only one recruitment service (retained OR headhunting, not both).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='subscriptions',
    )

    service_type = models.CharField(
        max_length=20,
        choices=SubscriptionServiceType.choices,
        default=SubscriptionServiceType.RETAINED,  # Default for existing subscriptions
        help_text='The service this subscription/contract is for',
    )

    # Contract Period
    contract_start_date = models.DateField(
        help_text='Start date of the subscription contract',
    )
    contract_end_date = models.DateField(
        help_text='End date of the subscription contract (typically 1 year from start)',
    )
    billing_day_of_month = models.PositiveSmallIntegerField(
        default=1,
        validators=[MinValueValidator(1), MaxValueValidator(28)],
        help_text='Day of month for auto-generating retainer invoices (1-28)',
    )
    payment_terms_days = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        help_text='Custom payment terms override in days (applies to all invoice types). If null, uses CMS defaults per invoice type.',
    )
    custom_payment_terms = models.JSONField(
        null=True,
        blank=True,
        help_text='Custom payment terms per invoice type. Keys: retainer, placement, termination, service_type_change, adjustment, other. Values in days.',
    )

    # Status
    status = models.CharField(
        max_length=20,
        choices=SubscriptionStatus.choices,
        default=SubscriptionStatus.ACTIVE,
    )
    auto_renew = models.BooleanField(
        default=True,
        help_text='Automatically renew the subscription at contract end',
    )
    renewal_reminder_sent = models.BooleanField(
        default=False,
        help_text='Whether renewal reminder has been sent for current period',
    )

    # Termination details (populated when terminated)
    terminated_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When the termination was processed',
    )
    terminated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='terminated_subscriptions',
    )
    termination_type = models.CharField(
        max_length=20,
        choices=TerminationType.choices,
        blank=True,
    )
    termination_reason = models.CharField(
        max_length=30,
        choices=TerminationReason.choices,
        blank=True,
    )
    termination_notes = models.TextField(
        blank=True,
        help_text='Additional notes about the termination',
    )
    termination_effective_date = models.DateField(
        null=True,
        blank=True,
        help_text='Date when termination takes effect',
    )
    early_termination_fee = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Calculated early termination fee if applicable',
    )
    access_expires_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When platform access should be revoked post-termination',
    )

    # Pause tracking
    paused_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When the subscription was paused',
    )
    paused_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='paused_subscriptions',
    )
    pause_reason = models.TextField(
        blank=True,
        help_text='Reason for pausing the subscription',
    )

    # Notes
    internal_notes = models.TextField(
        blank=True,
        help_text='Internal admin notes about this subscription',
    )

    class Meta:
        db_table = 'subscriptions'
        verbose_name = 'Subscription'
        verbose_name_plural = 'Subscriptions'
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['company', 'service_type'],
                name='unique_company_service_type'
            ),
        ]

    def __str__(self):
        return f"{self.company.name} - {self.get_service_type_display()} ({self.get_status_display()})"

    def clean(self):
        """Validate that company doesn't have both retained and headhunting."""
        from django.core.exceptions import ValidationError

        if self.service_type in [SubscriptionServiceType.RETAINED, SubscriptionServiceType.HEADHUNTING]:
            # Check for existing recruitment subscription of the other type
            other_type = (
                SubscriptionServiceType.HEADHUNTING
                if self.service_type == SubscriptionServiceType.RETAINED
                else SubscriptionServiceType.RETAINED
            )
            existing = Subscription.objects.filter(
                company=self.company,
                service_type=other_type,
            ).exclude(pk=self.pk).exists()

            if existing:
                raise ValidationError(
                    f'Company already has a {other_type} subscription. '
                    f'A company can only have one recruitment service (retained OR headhunting).'
                )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    @property
    def is_active(self):
        return self.status == SubscriptionStatus.ACTIVE

    @property
    def is_within_lockout_period(self):
        """Check if subscription is within the 6-month early termination lockout."""
        if not self.contract_start_date:
            return False
        from dateutil.relativedelta import relativedelta
        lockout_end = self.contract_start_date + relativedelta(months=6)
        return date.today() < lockout_end

    @property
    def months_remaining(self):
        """Calculate months remaining on the contract."""
        if not self.contract_end_date:
            return 0
        from dateutil.relativedelta import relativedelta
        today = date.today()
        if today >= self.contract_end_date:
            return 0
        delta = relativedelta(self.contract_end_date, today)
        return delta.months + (delta.years * 12) + (1 if delta.days > 0 else 0)

    @property
    def days_until_renewal(self):
        """Days until contract renewal/expiry."""
        if not self.contract_end_date:
            return None
        return (self.contract_end_date - date.today()).days


# =============================================================================
# Custom Pricing Model
# =============================================================================


class CompanyPricing(TimestampedModel):
    """
    Custom pricing overrides for a company.
    If fields are null, defaults from PricingConfig are used.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    company = models.OneToOneField(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='custom_pricing',
    )

    # Retainer (for Retained clients)
    monthly_retainer = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Custom monthly retainer fee (default: R20,000)',
    )

    # Placement fees (as decimals, e.g., 0.10 = 10%)
    placement_fee = models.DecimalField(
        max_digits=5,
        decimal_places=4,
        null=True,
        blank=True,
        help_text='Custom placement fee as decimal (e.g., 0.10 = 10%)',
    )
    csuite_placement_fee = models.DecimalField(
        max_digits=5,
        decimal_places=4,
        null=True,
        blank=True,
        help_text='Custom C-Suite placement fee as decimal (e.g., 0.15 = 15%)',
    )

    # Replacement period (for free replacements feature)
    replacement_period_days = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text='Custom replacement period in days (overrides service type default)',
    )

    # Effective date for pricing changes
    effective_from = models.DateField(
        default=date.today,
        help_text='When this pricing becomes effective',
    )

    # Audit
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='pricing_updates',
    )

    class Meta:
        db_table = 'company_pricing'
        verbose_name = 'Company Pricing'
        verbose_name_plural = 'Company Pricing'

    def __str__(self):
        return f"Pricing for {self.company.name}"

    def get_effective_retainer(self):
        """Get effective monthly retainer (custom or default)."""
        if self.monthly_retainer is not None:
            return self.monthly_retainer
        from cms.models.pricing import PricingConfig
        config = PricingConfig.get_config()
        return Decimal(str(config.retained_monthly_retainer))

    def get_effective_placement_fee(self):
        """Get effective placement fee (custom or default based on service type)."""
        if self.placement_fee is not None:
            return self.placement_fee
        from cms.models.pricing import PricingConfig
        config = PricingConfig.get_config()
        if self.company.service_type == 'retained':
            return Decimal(str(config.retained_placement_fee))
        else:
            return Decimal(str(config.headhunting_placement_fee))

    def get_effective_csuite_fee(self):
        """Get effective C-Suite placement fee (custom or default based on service type)."""
        if self.csuite_placement_fee is not None:
            return self.csuite_placement_fee
        from cms.models.pricing import PricingConfig
        config = PricingConfig.get_config()
        if self.company.service_type == 'retained':
            return Decimal(str(config.retained_csuite_placement_fee))
        else:
            return Decimal(str(config.headhunting_csuite_placement_fee))

    def get_effective_replacement_period(self):
        """Get effective replacement period in days (custom or default based on service type)."""
        if self.replacement_period_days is not None:
            return self.replacement_period_days
        from cms.models.pricing import PricingConfig
        config = PricingConfig.get_config()
        if self.company.service_type == 'retained':
            return config.retained_replacement_period_days
        elif self.company.service_type == 'headhunting':
            return config.headhunting_replacement_period_days
        else:
            return config.enterprise_replacement_period_days


# =============================================================================
# Feature Override Model
# =============================================================================


class CompanyFeatureOverride(TimestampedModel):
    """
    Override default feature availability for a specific company.
    Overrides PricingFeature.included_in_X flags.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='feature_overrides',
    )
    feature = models.ForeignKey(
        'cms.PricingFeature',
        on_delete=models.CASCADE,
        related_name='company_overrides',
    )

    is_enabled = models.BooleanField(
        help_text='True to enable, False to disable (overrides service type default)',
    )

    # Custom replacement period (only applicable for free-replacements feature)
    custom_replacement_period_days = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text='Custom replacement period for this company in days (overrides service type default). Only used for free-replacements feature.',
    )

    # Audit
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )

    class Meta:
        db_table = 'company_feature_overrides'
        verbose_name = 'Feature Override'
        verbose_name_plural = 'Feature Overrides'
        unique_together = ['company', 'feature']

    def __str__(self):
        status = 'Enabled' if self.is_enabled else 'Disabled'
        return f"{self.company.name} - {self.feature.name}: {status}"


# =============================================================================
# Invoice Enums
# =============================================================================


class BillingMode(models.TextChoices):
    IN_SYSTEM = 'in_system', 'In-System Billing'
    EXTERNAL = 'external', 'External Tracking Only'


class InvoiceStatus(models.TextChoices):
    DRAFT = 'draft', 'Draft'
    SENT = 'sent', 'Sent'
    PAID = 'paid', 'Paid'
    OVERDUE = 'overdue', 'Overdue'
    CANCELLED = 'cancelled', 'Cancelled'
    PARTIALLY_PAID = 'partially_paid', 'Partially Paid'


class InvoiceType(models.TextChoices):
    RETAINER = 'retainer', 'Monthly Retainer'
    PLACEMENT = 'placement', 'Placement Fee'
    TERMINATION = 'termination', 'Early Termination Fee'
    ADJUSTMENT = 'adjustment', 'Adjustment'
    OTHER = 'other', 'Other'


# =============================================================================
# Invoice Model
# =============================================================================

# Default payment terms in days
DEFAULT_PAYMENT_TERMS_DAYS = 14


def get_payment_terms_for_invoice(invoice_type: str, subscription=None) -> int:
    """
    Determine payment terms for an invoice.

    Priority:
    1. Subscription custom_payment_terms per invoice type (JSON field)
    2. Subscription payment_terms_days (single override for all types)
    3. CMS default for invoice type

    Args:
        invoice_type: One of 'retainer', 'placement', 'termination',
                     'service_type_change', 'adjustment', 'other'
        subscription: Optional Subscription instance for override lookup

    Returns:
        Payment terms in days
    """
    if subscription:
        # Check per-invoice-type custom terms first
        if subscription.custom_payment_terms:
            # Map invoice type to JSON key
            key_map = {
                'retainer': 'retainer',
                'placement': 'placement',
                'termination': 'termination',
                'service_type_change': 'service_type_change',
                'adjustment': 'adjustment',
                'other': 'other',
            }
            key = key_map.get(invoice_type, invoice_type)
            custom_terms = subscription.custom_payment_terms.get(key)
            if custom_terms is not None:
                return int(custom_terms)

        # Check single override for all types
        if subscription.payment_terms_days is not None:
            return subscription.payment_terms_days

    # Fall back to CMS defaults per invoice type
    try:
        from cms.models import BillingConfig
        config = BillingConfig.get_config()
        return config.get_payment_terms_for_invoice_type(invoice_type)
    except Exception:
        # Fallback to constant if CMS not available
        return DEFAULT_PAYMENT_TERMS_DAYS


class Invoice(TimestampedModel):
    """
    Invoice for subscription billing or placement fees.
    Supports both in-system billing and external tracking.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='invoices',
    )
    subscription = models.ForeignKey(
        Subscription,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='invoices',
    )
    placement = models.ForeignKey(
        'jobs.Application',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='invoices',
        help_text='For placement fee invoices, the associated application/placement',
    )

    # Replacement tracking
    is_replacement = models.BooleanField(
        default=False,
        help_text='True if this is an invoice for a replacement hire',
    )
    replacement_request = models.ForeignKey(
        'jobs.ReplacementRequest',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='invoices',
        help_text='The replacement request that led to this invoice',
    )
    original_placement_invoice = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='replacement_invoices',
        help_text='Link to the original hire\'s placement invoice',
    )

    # Invoice details
    invoice_number = models.CharField(
        max_length=50,
        unique=True,
        help_text='Auto-generated format: INV-YYYYMM-XXXX',
    )
    invoice_type = models.CharField(
        max_length=20,
        choices=InvoiceType.choices,
    )
    billing_mode = models.CharField(
        max_length=20,
        choices=BillingMode.choices,
        default=BillingMode.IN_SYSTEM,
    )

    # Dates
    invoice_date = models.DateField(
        help_text='Date the invoice was issued',
    )
    due_date = models.DateField(
        blank=True,
        null=True,
        help_text='Payment due date (defaults to 14 days from invoice date)',
    )
    billing_period_start = models.DateField(
        null=True,
        blank=True,
        help_text='Start of billing period (for retainer invoices)',
    )
    billing_period_end = models.DateField(
        null=True,
        blank=True,
        help_text='End of billing period (for retainer invoices)',
    )

    # Amounts (in ZAR)
    subtotal = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text='Amount before VAT',
    )
    vat_rate = models.DecimalField(
        max_digits=5,
        decimal_places=4,
        default=Decimal('0.15'),
        help_text='VAT rate as decimal (0.15 = 15%)',
    )
    vat_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text='VAT amount',
    )
    total_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text='Total amount including VAT',
    )
    amount_paid = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0'),
        help_text='Total amount paid against this invoice',
    )

    # Status
    status = models.CharField(
        max_length=20,
        choices=InvoiceStatus.choices,
        default=InvoiceStatus.DRAFT,
    )

    # External reference (for external billing mode)
    external_invoice_number = models.CharField(
        max_length=100,
        blank=True,
        help_text='Reference number from external accounting system',
    )
    external_system = models.CharField(
        max_length=100,
        blank=True,
        help_text='Name of external system (e.g., Xero, QuickBooks)',
    )

    # Timestamps for status changes
    sent_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When the invoice was sent to the client',
    )
    paid_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When the invoice was fully paid',
    )
    cancelled_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When the invoice was cancelled',
    )

    # PDF storage
    pdf_file = models.FileField(
        upload_to='invoices/',
        blank=True,
        null=True,
        help_text='Generated PDF invoice file',
    )

    # Notes
    description = models.TextField(
        blank=True,
        help_text='Description shown on the invoice',
    )
    internal_notes = models.TextField(
        blank=True,
        help_text='Internal admin notes (not shown on invoice)',
    )

    # Audit
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_invoices',
    )

    class Meta:
        db_table = 'invoices'
        verbose_name = 'Invoice'
        verbose_name_plural = 'Invoices'
        ordering = ['-invoice_date', '-created_at']
        indexes = [
            models.Index(fields=['company', '-invoice_date']),
            models.Index(fields=['status', 'due_date']),
            models.Index(fields=['invoice_number']),
        ]

    def __str__(self):
        return f"{self.invoice_number} - {self.company.name}"

    @property
    def is_overdue(self):
        """Check if the invoice is past due."""
        return (
            self.status in [InvoiceStatus.SENT, InvoiceStatus.PARTIALLY_PAID]
            and self.due_date < date.today()
        )

    @property
    def balance_due(self):
        """Calculate remaining balance."""
        return self.total_amount - self.amount_paid

    @property
    def is_fully_paid(self):
        """Check if invoice is fully paid."""
        return self.amount_paid >= self.total_amount

    def calculate_vat(self):
        """Calculate VAT amount based on subtotal and rate."""
        self.vat_amount = self.subtotal * self.vat_rate
        self.total_amount = self.subtotal + self.vat_amount

    @classmethod
    def generate_invoice_number(cls):
        """Generate a unique invoice number in format INV-YYYYMM-XXXX."""
        from django.utils import timezone
        now = timezone.now()
        prefix = f"INV-{now.strftime('%Y%m')}"

        # Find the highest number for this month
        last_invoice = cls.objects.filter(
            invoice_number__startswith=prefix
        ).order_by('-invoice_number').first()

        if last_invoice:
            try:
                last_num = int(last_invoice.invoice_number.split('-')[-1])
                new_num = last_num + 1
            except (ValueError, IndexError):
                new_num = 1
        else:
            new_num = 1

        return f"{prefix}-{new_num:04d}"

    def save(self, *args, **kwargs):
        """Set default due date if not provided."""
        from datetime import timedelta

        # Auto-set due_date based on invoice type and subscription payment terms
        if not self.due_date and self.invoice_date:
            # Map invoice_type to the key used by the helper
            invoice_type_key = self.invoice_type if self.invoice_type else 'other'
            payment_terms = get_payment_terms_for_invoice(invoice_type_key, self.subscription)
            self.due_date = self.invoice_date + timedelta(days=payment_terms)

        super().save(*args, **kwargs)


# =============================================================================
# Invoice Line Item Model
# =============================================================================


class InvoiceLineItem(models.Model):
    """
    Line items for an invoice.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        related_name='line_items',
    )

    description = models.CharField(
        max_length=500,
        help_text='Description of the line item',
    )
    quantity = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('1'),
    )
    unit_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text='Price per unit',
    )
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text='Total amount (quantity * unit_price)',
    )

    # Optional reference to placement
    placement = models.ForeignKey(
        'jobs.Application',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='invoice_items',
        help_text='Linked placement for placement fee invoices',
    )

    order = models.PositiveIntegerField(
        default=0,
        help_text='Display order of line items',
    )

    class Meta:
        db_table = 'invoice_line_items'
        verbose_name = 'Invoice Line Item'
        verbose_name_plural = 'Invoice Line Items'
        ordering = ['order']

    def __str__(self):
        return f"{self.invoice.invoice_number} - {self.description[:50]}"

    def calculate_amount(self):
        """Calculate amount from quantity and unit price."""
        self.amount = self.quantity * self.unit_price


# =============================================================================
# Payment Enums
# =============================================================================


class PaymentMethod(models.TextChoices):
    BANK_TRANSFER = 'bank_transfer', 'Bank Transfer (EFT)'
    CREDIT_CARD = 'credit_card', 'Credit Card'
    DEBIT_ORDER = 'debit_order', 'Debit Order'
    CASH = 'cash', 'Cash'
    CHEQUE = 'cheque', 'Cheque'
    OTHER = 'other', 'Other'


# =============================================================================
# Payment Model
# =============================================================================


class Payment(TimestampedModel):
    """
    Payment recorded against an invoice.
    Supports partial payments.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        related_name='payments',
    )

    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text='Payment amount',
    )
    payment_date = models.DateField(
        help_text='Date the payment was received',
    )
    payment_method = models.CharField(
        max_length=20,
        choices=PaymentMethod.choices,
    )

    # Reference details
    reference_number = models.CharField(
        max_length=100,
        blank=True,
        help_text='Bank reference, transaction ID, etc.',
    )

    # Notes
    notes = models.TextField(
        blank=True,
        help_text='Additional notes about this payment',
    )

    # Audit
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='recorded_payments',
    )

    class Meta:
        db_table = 'payments'
        verbose_name = 'Payment'
        verbose_name_plural = 'Payments'
        ordering = ['-payment_date', '-created_at']

    def __str__(self):
        return f"R{self.amount} on {self.payment_date} for {self.invoice.invoice_number}"


# =============================================================================
# Subscription Activity Log Enums
# =============================================================================


class SubscriptionActivityType(models.TextChoices):
    # Subscription lifecycle
    SUBSCRIPTION_CREATED = 'subscription_created', 'Subscription Created'
    SUBSCRIPTION_ACTIVATED = 'subscription_activated', 'Subscription Activated'
    SUBSCRIPTION_PAUSED = 'subscription_paused', 'Subscription Paused'
    SUBSCRIPTION_RESUMED = 'subscription_resumed', 'Subscription Resumed'
    SUBSCRIPTION_TERMINATED = 'subscription_terminated', 'Subscription Terminated'
    SUBSCRIPTION_RENEWED = 'subscription_renewed', 'Subscription Renewed'
    SUBSCRIPTION_EXPIRED = 'subscription_expired', 'Subscription Expired'
    CONTRACT_EXTENDED = 'contract_extended', 'Contract Extended'
    AUTO_RENEW_CHANGED = 'auto_renew_changed', 'Auto-Renew Setting Changed'
    SERVICE_TYPE_CHANGED = 'service_type_changed', 'Service Type Changed'

    # Pricing
    PRICING_CHANGED = 'pricing_changed', 'Pricing Changed'
    PAYMENT_TERMS_CHANGED = 'payment_terms_changed', 'Payment Terms Changed'

    # Features
    FEATURE_OVERRIDE_ADDED = 'feature_override_added', 'Feature Override Added'
    FEATURE_OVERRIDE_REMOVED = 'feature_override_removed', 'Feature Override Removed'
    FEATURE_OVERRIDE_CHANGED = 'feature_override_changed', 'Feature Override Changed'

    # Invoicing
    INVOICE_CREATED = 'invoice_created', 'Invoice Created'
    INVOICE_SENT = 'invoice_sent', 'Invoice Sent'
    INVOICE_PAID = 'invoice_paid', 'Invoice Paid'
    INVOICE_PARTIALLY_PAID = 'invoice_partially_paid', 'Invoice Partially Paid'
    INVOICE_CANCELLED = 'invoice_cancelled', 'Invoice Cancelled'
    INVOICE_OVERDUE = 'invoice_overdue', 'Invoice Marked Overdue'

    # Payments
    PAYMENT_RECORDED = 'payment_recorded', 'Payment Recorded'
    PAYMENT_DELETED = 'payment_deleted', 'Payment Deleted'


# =============================================================================
# Subscription Activity Log Model
# =============================================================================


class SubscriptionActivityLog(models.Model):
    """
    Audit log for all subscription-related activities.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='subscription_activities',
    )
    subscription = models.ForeignKey(
        Subscription,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='activity_logs',
    )
    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='activity_logs',
    )

    performed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='subscription_activities',
    )

    activity_type = models.CharField(
        max_length=30,
        choices=SubscriptionActivityType.choices,
    )

    # State tracking
    previous_status = models.CharField(
        max_length=20,
        blank=True,
        help_text='Previous status before the change',
    )
    new_status = models.CharField(
        max_length=20,
        blank=True,
        help_text='New status after the change',
    )

    # Additional context
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text='Additional context: pricing changes, termination details, etc.',
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'subscription_activity_logs'
        verbose_name = 'Subscription Activity'
        verbose_name_plural = 'Subscription Activities'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['company', '-created_at']),
            models.Index(fields=['subscription', '-created_at']),
            models.Index(fields=['activity_type']),
        ]

    def __str__(self):
        return f"{self.company.name} - {self.get_activity_type_display()} at {self.created_at}"
