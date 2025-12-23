"""
Celery tasks for the subscriptions app.

These tasks handle:
- Auto-generating monthly retainer invoices
- Marking overdue invoices
"""

from datetime import date, timedelta
from decimal import Decimal

# Try to import Celery, but make it optional
try:
    from celery import shared_task
    CELERY_AVAILABLE = True
except ImportError:
    CELERY_AVAILABLE = False

    def shared_task(*args, **kwargs):
        def decorator(func):
            return func
        return decorator


@shared_task(name="subscriptions.generate_retainer_invoices")
def generate_retainer_invoices():
    """
    Auto-generate monthly retainer invoices for retained service subscriptions.

    Runs daily and generates invoices for subscriptions where today matches
    their billing_day_of_month setting.
    """
    from companies.models import Company
    from subscriptions.models import (
        Subscription,
        SubscriptionStatus,
        Invoice,
        InvoiceType,
        InvoiceStatus,
        BillingMode,
        InvoiceLineItem,
        CompanyPricing,
        SubscriptionActivityLog,
        SubscriptionActivityType,
        get_payment_terms_for_invoice,
    )
    from cms.models.pricing import PricingConfig

    today = date.today()
    billing_day = today.day

    # Find all active retained subscriptions due for billing today
    subscriptions = Subscription.objects.filter(
        status=SubscriptionStatus.ACTIVE,
        company__service_type='retained',
        billing_day_of_month=billing_day,
    ).select_related('company')

    if not subscriptions.exists():
        return f"No subscriptions due for billing on day {billing_day}"

    # Calculate billing period for current month
    billing_period_start = today.replace(day=1)
    if today.month == 12:
        billing_period_end = today.replace(year=today.year + 1, month=1, day=1) - timedelta(days=1)
    else:
        billing_period_end = today.replace(month=today.month + 1, day=1) - timedelta(days=1)

    invoices_created = 0
    invoices_skipped = 0

    for subscription in subscriptions:
        company = subscription.company

        # Check if invoice already exists for this billing period
        existing_invoice = Invoice.objects.filter(
            company=company,
            invoice_type=InvoiceType.RETAINER,
            billing_period_start=billing_period_start,
            billing_period_end=billing_period_end,
        ).exclude(status=InvoiceStatus.CANCELLED).exists()

        if existing_invoice:
            invoices_skipped += 1
            continue

        # Get effective monthly retainer
        try:
            pricing = CompanyPricing.objects.get(company=company)
            monthly_retainer = pricing.get_effective_retainer()
        except CompanyPricing.DoesNotExist:
            config = PricingConfig.get_config()
            monthly_retainer = Decimal(str(config.retained_monthly_retainer))

        # Create invoice
        payment_terms = get_payment_terms_for_invoice('retainer', subscription)
        invoice = Invoice.objects.create(
            company=company,
            subscription=subscription,
            invoice_number=Invoice.generate_invoice_number(),
            invoice_type=InvoiceType.RETAINER,
            billing_mode=BillingMode.IN_SYSTEM,
            invoice_date=today,
            due_date=today + timedelta(days=payment_terms),
            billing_period_start=billing_period_start,
            billing_period_end=billing_period_end,
            subtotal=monthly_retainer,
            vat_rate=Decimal('0.15'),
            vat_amount=monthly_retainer * Decimal('0.15'),
            total_amount=monthly_retainer * Decimal('1.15'),
            status=InvoiceStatus.SENT,
            description=f'Monthly retainer for {billing_period_start.strftime("%B %Y")}',
        )

        InvoiceLineItem.objects.create(
            invoice=invoice,
            description=f'Monthly Retainer Fee - {billing_period_start.strftime("%B %Y")}',
            quantity=Decimal('1'),
            unit_price=monthly_retainer,
            amount=monthly_retainer,
        )

        # Log activity
        SubscriptionActivityLog.objects.create(
            company=company,
            subscription=subscription,
            invoice=invoice,
            activity_type=SubscriptionActivityType.INVOICE_CREATED,
            metadata={
                'invoice_type': InvoiceType.RETAINER,
                'billing_period': f'{billing_period_start} to {billing_period_end}',
                'auto_generated': True,
            },
        )

        invoices_created += 1

    return f"Created {invoices_created} invoice(s), skipped {invoices_skipped} (already invoiced)"


@shared_task(name="subscriptions.update_overdue_invoices")
def update_overdue_invoices():
    """
    Mark invoices as overdue if past their due date.

    Runs daily and updates status for any sent/partially paid invoices
    that are past their due date.
    """
    from subscriptions.models import (
        Invoice,
        InvoiceStatus,
        SubscriptionActivityLog,
        SubscriptionActivityType,
    )

    today = date.today()

    # Find invoices that are past due but not yet marked overdue
    overdue_invoices = Invoice.objects.filter(
        status__in=[InvoiceStatus.SENT, InvoiceStatus.PARTIALLY_PAID],
        due_date__lt=today,
    ).select_related('company', 'subscription')

    if not overdue_invoices.exists():
        return "No invoices to mark as overdue"

    updated_count = 0

    for invoice in overdue_invoices:
        days_overdue = (today - invoice.due_date).days
        old_status = invoice.status

        invoice.status = InvoiceStatus.OVERDUE
        invoice.save(update_fields=['status', 'updated_at'])

        # Log activity
        SubscriptionActivityLog.objects.create(
            company=invoice.company,
            subscription=invoice.subscription,
            invoice=invoice,
            activity_type=SubscriptionActivityType.STATUS_CHANGED,
            previous_status=old_status,
            new_status=InvoiceStatus.OVERDUE,
            metadata={
                'days_overdue': days_overdue,
                'due_date': str(invoice.due_date),
                'auto_updated': True,
            },
        )

        updated_count += 1

    return f"Marked {updated_count} invoice(s) as overdue"
