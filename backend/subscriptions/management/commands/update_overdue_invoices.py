"""
Management command to mark overdue invoices.

Run daily via cron (after generate_retainer_invoices):
    0 7 * * * cd /path/to/backend && python manage.py update_overdue_invoices

This command:
1. Finds all sent/partially paid invoices past their due date
2. Updates their status to OVERDUE
"""

from datetime import date

from django.core.management.base import BaseCommand

from subscriptions.models import (
    Invoice,
    InvoiceStatus,
    SubscriptionActivityLog,
    SubscriptionActivityType,
)


class Command(BaseCommand):
    help = 'Mark invoices as overdue if past their due date'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be updated without actually changing statuses',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        today = date.today()

        self.stdout.write(f"Checking for overdue invoices as of {today}")

        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN - No changes will be made'))

        # Find invoices that are past due but not yet marked overdue
        overdue_invoices = Invoice.objects.filter(
            status__in=[InvoiceStatus.SENT, InvoiceStatus.PARTIALLY_PAID],
            due_date__lt=today,
        ).select_related('company', 'subscription')

        if not overdue_invoices.exists():
            self.stdout.write(self.style.SUCCESS('No invoices to mark as overdue'))
            return

        updated_count = 0

        for invoice in overdue_invoices:
            days_overdue = (today - invoice.due_date).days

            if dry_run:
                self.stdout.write(
                    f"  WOULD UPDATE: {invoice.invoice_number} - {invoice.company.name} "
                    f"({days_overdue} days overdue)"
                )
                updated_count += 1
                continue

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

            self.stdout.write(
                self.style.WARNING(
                    f"  OVERDUE: {invoice.invoice_number} - {invoice.company.name} "
                    f"({days_overdue} days overdue)"
                )
            )
            updated_count += 1

        # Summary
        self.stdout.write('')
        if dry_run:
            self.stdout.write(self.style.WARNING(f'Would mark {updated_count} invoice(s) as overdue'))
        else:
            self.stdout.write(self.style.SUCCESS(f'Marked {updated_count} invoice(s) as overdue'))
