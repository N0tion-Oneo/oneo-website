"""
Signals for subscription-related automation.
"""
import logging
from datetime import date, timedelta
from decimal import Decimal

from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver

from jobs.models.application import Application, ApplicationStatus

logger = logging.getLogger(__name__)
from .models import (
    Invoice,
    InvoiceType,
    InvoiceStatus,
    BillingMode,
    InvoiceLineItem,
    CompanyPricing,
    SubscriptionActivityLog,
    SubscriptionActivityType,
)


@receiver(pre_save, sender=Application)
def auto_generate_placement_invoice(sender, instance, **kwargs):
    """
    Automatically generate a draft placement invoice when an application
    status changes to OFFER_ACCEPTED.
    """
    # Only trigger on status change to OFFER_ACCEPTED
    if instance.status != ApplicationStatus.OFFER_ACCEPTED:
        return

    # Check if this is an update (instance already exists)
    if not instance.pk:
        return

    try:
        old_instance = Application.objects.get(pk=instance.pk)
    except Application.DoesNotExist:
        return

    # Only trigger if status is changing TO OFFER_ACCEPTED
    if old_instance.status == ApplicationStatus.OFFER_ACCEPTED:
        return  # Already accepted, no new invoice needed

    # Check if an invoice already exists for this placement
    if Invoice.objects.filter(placement=instance).exists():
        return  # Invoice already exists

    # Get the company (from the job)
    company = instance.job.company

    # Get pricing info
    pricing, _ = CompanyPricing.objects.get_or_create(company=company)

    # Determine fee rate based on C-suite status
    if instance.job.is_csuite:
        fee_rate = pricing.get_effective_csuite_fee()
    else:
        fee_rate = pricing.get_effective_placement_fee()

    # Get offer details from final_offer_details or offer_details
    final_offer = instance.final_offer_details or {}
    offer = instance.offer_details or {}

    # Calculate annual salary
    annual_salary = final_offer.get('annual_salary') or offer.get('annual_salary')
    if not annual_salary:
        # Can't calculate fee without salary, skip auto-generation
        return

    annual_salary = Decimal(str(annual_salary))

    # Calculate total benefits cost
    benefits = final_offer.get('benefits') or offer.get('benefits') or []
    total_benefits_cost = Decimal('0')
    if isinstance(benefits, list):
        for benefit in benefits:
            if isinstance(benefit, dict) and 'annual_cost' in benefit:
                total_benefits_cost += Decimal(str(benefit['annual_cost']))

    # Calculate year 1 equity value
    equity = final_offer.get('equity') or offer.get('equity')
    year_1_equity_value = Decimal('0')
    if isinstance(equity, dict):
        shares = equity.get('shares', 0)
        share_value = equity.get('share_value', 0)
        vesting_years = equity.get('vesting_years', 1)
        if shares and share_value and vesting_years:
            total_equity = Decimal(str(shares)) * Decimal(str(share_value))
            year_1_equity_value = total_equity / Decimal(str(vesting_years))

    # Calculate total cost to company (used for placement fee)
    total_cost_to_company = annual_salary + total_benefits_cost + year_1_equity_value

    candidate_name = instance.candidate.user.get_full_name() or instance.candidate.user.email

    # Calculate placement fee based on total cost to company
    placement_fee = total_cost_to_company * fee_rate

    # Create invoice
    invoice = Invoice.objects.create(
        company=company,
        placement=instance,
        invoice_number=Invoice.generate_invoice_number(),
        invoice_type=InvoiceType.PLACEMENT,
        billing_mode=BillingMode.IN_SYSTEM,
        invoice_date=date.today(),
        due_date=date.today() + timedelta(days=30),
        subtotal=placement_fee,
        vat_rate=Decimal('0.15'),
        vat_amount=placement_fee * Decimal('0.15'),
        total_amount=placement_fee * Decimal('1.15'),
        status=InvoiceStatus.DRAFT,
        description=f'Placement fee for {candidate_name} - {instance.job.title}',
    )

    # Build description with cost breakdown
    fee_percentage = (fee_rate * 100).quantize(Decimal('0.1'))
    cost_breakdown = f'Annual Salary: {annual_salary:,.0f}'
    if total_benefits_cost > 0:
        cost_breakdown += f', Benefits: {total_benefits_cost:,.0f}'
    if year_1_equity_value > 0:
        cost_breakdown += f', Year 1 Equity: {year_1_equity_value:,.0f}'

    # Create line item
    InvoiceLineItem.objects.create(
        invoice=invoice,
        description=f'Placement Fee ({fee_percentage}% of Total Cost to Company: {total_cost_to_company:,.0f})',
        quantity=Decimal('1'),
        unit_price=placement_fee,
        amount=placement_fee,
    )

    # Log activity
    SubscriptionActivityLog.objects.create(
        company=company,
        invoice=invoice,
        activity_type=SubscriptionActivityType.INVOICE_CREATED,
        metadata={
            'invoice_type': InvoiceType.PLACEMENT,
            'auto_generated': True,
            'application_id': str(instance.id),
            'candidate_name': candidate_name,
            'job_title': instance.job.title,
        },
    )


@receiver(post_save, sender=Invoice)
def sync_invoice_to_xero(sender, instance, created, **kwargs):
    """
    Sync invoice to Xero when it's sent.

    Triggers async Celery task to push the invoice to Xero.
    Only syncs if:
    - Status is SENT (not draft or other statuses)
    - There's an active Xero connection
    """
    # Only sync sent invoices
    if instance.status != InvoiceStatus.SENT:
        return

    # Check if status just changed to SENT (on update)
    if not created:
        # For updates, we'd need to track previous status
        # For now, we'll let the periodic task handle retries
        pass

    try:
        # Check if Xero connection exists before importing task
        from integrations.models import XeroConnection

        if not XeroConnection.objects.filter(is_active=True).exists():
            return

        # Import and queue the async task
        from integrations.tasks import sync_single_invoice

        # Check if Celery is available
        try:
            from celery import current_app
            if current_app.conf.broker_url:
                sync_single_invoice.delay(str(instance.id))
                logger.info(f"Queued invoice {instance.id} for Xero sync")
        except Exception:
            # Celery not available, sync will happen via periodic task
            logger.debug(f"Celery not available, invoice {instance.id} will sync via periodic task")

    except ImportError:
        # Integrations app not installed
        pass
    except Exception as e:
        # Don't let Xero sync issues break invoice creation
        logger.error(f"Error queuing invoice {instance.id} for Xero sync: {e}")
