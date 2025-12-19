"""
Management command to auto-generate monthly retainer invoices.

Run daily via cron:
    0 6 * * * cd /path/to/backend && python manage.py generate_retainer_invoices

This command:
1. Finds all active retained subscriptions where today is their billing_day_of_month
2. Checks if a retainer invoice already exists for the current billing period
3. If not, generates the invoice with status SENT
"""

from datetime import date, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db.models import Q

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
)


class Command(BaseCommand):
    help = 'Auto-generate monthly retainer invoices for retained service subscriptions'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be generated without actually creating invoices',
        )
        parser.add_argument(
            '--force-day',
            type=int,
            help='Override billing day check (useful for testing)',
        )
        parser.add_argument(
            '--company-id',
            type=str,
            help='Generate invoice for a specific company only',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        force_day = options.get('force_day')
        company_id = options.get('company_id')

        today = date.today()
        billing_day = force_day or today.day

        self.stdout.write(f"Running retainer invoice generation for day {billing_day} of {today.strftime('%B %Y')}")

        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN - No invoices will be created'))

        # Find all active retained subscriptions due for billing today
        subscriptions = Subscription.objects.filter(
            status=SubscriptionStatus.ACTIVE,
            company__service_type='retained',
            billing_day_of_month=billing_day,
        ).select_related('company')

        if company_id:
            subscriptions = subscriptions.filter(company_id=company_id)

        if not subscriptions.exists():
            self.stdout.write(self.style.SUCCESS(f'No subscriptions due for billing on day {billing_day}'))
            return

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
                self.stdout.write(
                    f"  SKIP: {company.name} - Invoice already exists for {billing_period_start.strftime('%B %Y')}"
                )
                invoices_skipped += 1
                continue

            # Get effective monthly retainer
            try:
                pricing = CompanyPricing.objects.get(company=company)
                monthly_retainer = pricing.get_effective_retainer()
            except CompanyPricing.DoesNotExist:
                from cms.models.pricing import PricingConfig
                config = PricingConfig.get_config()
                monthly_retainer = Decimal(str(config.retained_monthly_retainer))

            if dry_run:
                self.stdout.write(
                    f"  WOULD CREATE: {company.name} - R{monthly_retainer:,.2f} for {billing_period_start.strftime('%B %Y')}"
                )
                invoices_created += 1
                continue

            # Create invoice
            invoice = Invoice.objects.create(
                company=company,
                subscription=subscription,
                invoice_number=Invoice.generate_invoice_number(),
                invoice_type=InvoiceType.RETAINER,
                billing_mode=BillingMode.IN_SYSTEM,
                invoice_date=today,
                due_date=today + timedelta(days=30),
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

            self.stdout.write(
                self.style.SUCCESS(
                    f"  CREATED: {company.name} - {invoice.invoice_number} - R{monthly_retainer:,.2f}"
                )
            )
            invoices_created += 1

        # Summary
        self.stdout.write('')
        if dry_run:
            self.stdout.write(self.style.WARNING(f'Would create {invoices_created} invoice(s)'))
        else:
            self.stdout.write(self.style.SUCCESS(f'Created {invoices_created} invoice(s)'))
        self.stdout.write(f'Skipped {invoices_skipped} (already invoiced)')
