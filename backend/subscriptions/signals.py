"""
Signals for subscription-related automation.
"""
import logging
from datetime import date, timedelta
from decimal import Decimal

from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver

from jobs.models.application import Application, ApplicationStatus
from jobs.models.replacement import ReplacementRequest, ReplacementStatus

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


def calculate_placement_fee(application, pricing):
    """
    Calculate the placement fee for an application based on offer details.

    Returns:
        tuple: (placement_fee, total_cost_to_company, fee_rate) or (None, None, None) if can't calculate
    """
    # Determine fee rate based on C-suite status
    if application.job.is_csuite:
        fee_rate = pricing.get_effective_csuite_fee()
    else:
        fee_rate = pricing.get_effective_placement_fee()

    # Get offer details from final_offer_details or offer_details
    final_offer = application.final_offer_details or {}
    offer = application.offer_details or {}

    # Calculate annual salary
    annual_salary = final_offer.get('annual_salary') or offer.get('annual_salary')
    if not annual_salary:
        return None, None, None

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

    # Calculate placement fee based on total cost to company
    placement_fee = total_cost_to_company * fee_rate

    return placement_fee, total_cost_to_company, fee_rate


@receiver(pre_save, sender=Application)
def auto_generate_placement_invoice(sender, instance, **kwargs):
    """
    Automatically generate a draft placement invoice when an application
    status changes to OFFER_ACCEPTED.

    Handles replacement hires:
    - Free replacements: Only invoice the difference if replacement costs more than original
    - Discounted replacements: Discount percentage applied to placement fee
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

    # Check if this is a replacement hire
    is_replacement = instance.is_replacement
    replacement_request = None
    original_application = None
    is_free_replacement = False
    discount_percentage = Decimal('0')

    if is_replacement and instance.replaced_application_id:
        # Get the replacement request from the original application
        try:
            original_application = Application.objects.get(id=instance.replaced_application_id)
            replacement_request = original_application.replacement_request
            if replacement_request and replacement_request.is_approved:
                if replacement_request.is_free:
                    is_free_replacement = True
                elif replacement_request.is_discounted and replacement_request.discount_percentage:
                    discount_percentage = Decimal(str(replacement_request.discount_percentage))
        except (Application.DoesNotExist, ReplacementRequest.DoesNotExist):
            pass

    # Calculate new placement fee
    new_placement_fee, new_total_ctc, fee_rate = calculate_placement_fee(instance, pricing)
    if new_placement_fee is None:
        # Can't calculate fee without salary, skip auto-generation
        return

    candidate_name = instance.candidate.user.get_full_name() or instance.candidate.user.email
    fee_percentage = (fee_rate * 100).quantize(Decimal('0.1'))

    # Handle free replacement - credit percentage of original fee toward new placement
    if is_free_replacement and original_application and replacement_request:
        original_fee, original_ctc, _ = calculate_placement_fee(original_application, pricing)

        if original_fee is None:
            # Can't calculate original fee, treat as regular placement
            logger.warning(f"Could not calculate original placement fee for replacement: {instance.id}")
            is_free_replacement = False
        else:
            # Get credit percentage from replacement request (defaults to 100 if not set)
            credit_percentage = Decimal(str(replacement_request.discount_percentage or 100))
            credit_amount = original_fee * (credit_percentage / Decimal('100'))

            # Calculate what's owed after credit
            amount_owed = new_placement_fee - credit_amount

            if amount_owed <= 0:
                # Credit covers the entire new placement fee - no invoice needed
                logger.info(
                    f"Free replacement fully covered: original={original_fee}, credit={credit_amount} "
                    f"({credit_percentage}%), new={new_placement_fee}, application={instance.id}"
                )
                return

            # Credit doesn't fully cover - invoice the remaining amount
            logger.info(
                f"Free replacement with remaining balance: original={original_fee}, credit={credit_amount} "
                f"({credit_percentage}%), new={new_placement_fee}, owed={amount_owed}, application={instance.id}"
            )

            description = f'Replacement placement fee for {candidate_name} - {instance.job.title}'

            invoice = Invoice.objects.create(
                company=company,
                placement=instance,
                invoice_number=Invoice.generate_invoice_number(),
                invoice_type=InvoiceType.PLACEMENT,
                billing_mode=BillingMode.IN_SYSTEM,
                invoice_date=date.today(),
                due_date=date.today() + timedelta(days=30),
                subtotal=amount_owed,
                vat_rate=Decimal('0.15'),
                vat_amount=amount_owed * Decimal('0.15'),
                total_amount=amount_owed * Decimal('1.15'),
                status=InvoiceStatus.DRAFT,
                description=description,
            )

            # Create line items showing the calculation
            InvoiceLineItem.objects.create(
                invoice=invoice,
                description=f'New Placement Fee ({fee_percentage}% of {new_total_ctc:,.0f})',
                quantity=Decimal('1'),
                unit_price=new_placement_fee,
                amount=new_placement_fee,
                order=1,
            )
            credit_description = f'Less: Original Fee Credit ({credit_percentage}% of {original_fee:,.0f})'
            InvoiceLineItem.objects.create(
                invoice=invoice,
                description=credit_description,
                quantity=Decimal('1'),
                unit_price=-credit_amount,
                amount=-credit_amount,
                order=2,
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
                    'is_replacement': True,
                    'is_free_replacement': True,
                    'original_fee': float(original_fee),
                    'credit_percentage': float(credit_percentage),
                    'credit_amount': float(credit_amount),
                    'new_fee': float(new_placement_fee),
                    'amount_owed': float(amount_owed),
                    'replacement_request_id': str(replacement_request.id) if replacement_request else None,
                },
            )
            return

    # Regular placement or discounted replacement
    base_placement_fee = new_placement_fee

    # Apply discount if this is a discounted replacement
    if discount_percentage > 0:
        discount_amount = base_placement_fee * (discount_percentage / Decimal('100'))
        placement_fee = base_placement_fee - discount_amount
    else:
        placement_fee = base_placement_fee

    # Build description
    if is_replacement and discount_percentage > 0:
        description = f'Replacement placement fee for {candidate_name} - {instance.job.title} ({discount_percentage}% discount applied)'
    else:
        description = f'Placement fee for {candidate_name} - {instance.job.title}'

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
        description=description,
    )

    # Create line item(s)
    if is_replacement and discount_percentage > 0:
        # Show original fee and discount as separate line items
        InvoiceLineItem.objects.create(
            invoice=invoice,
            description=f'Placement Fee ({fee_percentage}% of Total Cost to Company: {new_total_ctc:,.0f})',
            quantity=Decimal('1'),
            unit_price=base_placement_fee,
            amount=base_placement_fee,
            order=1,
        )
        InvoiceLineItem.objects.create(
            invoice=invoice,
            description=f'Replacement Discount ({discount_percentage}%)',
            quantity=Decimal('1'),
            unit_price=-discount_amount,
            amount=-discount_amount,
            order=2,
        )
    else:
        # Regular placement - single line item
        InvoiceLineItem.objects.create(
            invoice=invoice,
            description=f'Placement Fee ({fee_percentage}% of Total Cost to Company: {new_total_ctc:,.0f})',
            quantity=Decimal('1'),
            unit_price=placement_fee,
            amount=placement_fee,
        )

    # Log activity
    metadata = {
        'invoice_type': InvoiceType.PLACEMENT,
        'auto_generated': True,
        'application_id': str(instance.id),
        'candidate_name': candidate_name,
        'job_title': instance.job.title,
    }
    if is_replacement:
        metadata['is_replacement'] = True
        metadata['discount_percentage'] = float(discount_percentage)
        if replacement_request:
            metadata['replacement_request_id'] = str(replacement_request.id)

    SubscriptionActivityLog.objects.create(
        company=company,
        invoice=invoice,
        activity_type=SubscriptionActivityType.INVOICE_CREATED,
        metadata=metadata,
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
