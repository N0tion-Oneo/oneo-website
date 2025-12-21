"""
Celery tasks for the integrations app.

These tasks handle:
- Syncing payments from Xero
- Retrying failed invoice syncs
"""

import logging

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

logger = logging.getLogger(__name__)


@shared_task(name="integrations.sync_xero_payments")
def sync_xero_payments():
    """
    Pull payments from Xero and reconcile with invoices.

    Runs hourly. Fetches all payments since the last sync and
    creates corresponding Payment records in Oneo.
    """
    from integrations.models import XeroConnection
    from integrations.services.xero_service import XeroService, XeroError

    try:
        connection = XeroConnection.objects.get(is_active=True)
    except XeroConnection.DoesNotExist:
        logger.info("No active Xero connection, skipping payment sync")
        return "No active Xero connection"

    service = XeroService()

    try:
        result = service.sync_all_payments(connection)
        message = (
            f"Xero payment sync complete: {result['synced']} synced, "
            f"{result['skipped']} skipped, {result['errors']} errors"
        )
        logger.info(message)
        return message
    except XeroError as e:
        logger.error(f"Xero payment sync failed: {e}")
        return f"Sync failed: {e}"


@shared_task(name="integrations.push_pending_invoices")
def push_pending_invoices():
    """
    Push pending invoices to Xero.

    Runs every 15 minutes. Retries any invoices that failed to sync
    or are still pending.
    """
    from integrations.models import (
        XeroConnection,
        XeroInvoiceMapping,
        XeroInvoiceMappingSyncStatus,
    )
    from integrations.services.xero_service import XeroService, XeroError
    from subscriptions.models import Invoice, InvoiceStatus

    try:
        connection = XeroConnection.objects.get(is_active=True)
    except XeroConnection.DoesNotExist:
        logger.info("No active Xero connection, skipping invoice sync")
        return "No active Xero connection"

    service = XeroService()
    synced = 0
    errors = 0

    # Find invoices with pending or error status
    mappings_to_retry = XeroInvoiceMapping.objects.filter(
        sync_status__in=[
            XeroInvoiceMappingSyncStatus.PENDING,
            XeroInvoiceMappingSyncStatus.ERROR,
        ]
    ).select_related('invoice')

    for mapping in mappings_to_retry:
        try:
            service.sync_invoice(connection, mapping.invoice)
            synced += 1
        except XeroError as e:
            logger.error(f"Failed to sync invoice {mapping.invoice.id}: {e}")
            errors += 1

    # Find sent invoices without any mapping
    synced_invoice_ids = XeroInvoiceMapping.objects.values_list('invoice_id', flat=True)
    unsynced_invoices = Invoice.objects.filter(
        status=InvoiceStatus.SENT,
    ).exclude(id__in=synced_invoice_ids)

    for invoice in unsynced_invoices:
        try:
            service.sync_invoice(connection, invoice)
            synced += 1
        except XeroError as e:
            logger.error(f"Failed to sync invoice {invoice.id}: {e}")
            errors += 1

    message = f"Invoice sync complete: {synced} synced, {errors} errors"
    logger.info(message)
    return message


@shared_task(name="integrations.sync_single_invoice")
def sync_single_invoice(invoice_id: str):
    """
    Sync a single invoice to Xero.

    Called asynchronously when an invoice is created/sent.
    """
    from integrations.models import XeroConnection
    from integrations.services.xero_service import XeroService, XeroError
    from subscriptions.models import Invoice

    try:
        connection = XeroConnection.objects.get(is_active=True)
    except XeroConnection.DoesNotExist:
        logger.info(f"No active Xero connection, skipping sync for invoice {invoice_id}")
        return "No active Xero connection"

    try:
        invoice = Invoice.objects.get(id=invoice_id)
    except Invoice.DoesNotExist:
        logger.error(f"Invoice {invoice_id} not found")
        return f"Invoice not found: {invoice_id}"

    service = XeroService()

    try:
        xero_invoice_id = service.sync_invoice(connection, invoice)
        logger.info(f"Synced invoice {invoice_id} to Xero as {xero_invoice_id}")
        return f"Synced to Xero: {xero_invoice_id}"
    except XeroError as e:
        logger.error(f"Failed to sync invoice {invoice_id}: {e}")
        return f"Sync failed: {e}"


@shared_task(name="integrations.sync_company_contact")
def sync_company_contact(company_id: str):
    """
    Sync a company's contact details to Xero.

    Called asynchronously when a company's billing information is updated.
    Only syncs if the company already has a Xero contact mapping (i.e., has
    had an invoice synced before).
    """
    from integrations.models import XeroConnection, XeroContactMapping
    from integrations.services.xero_service import XeroService, XeroError
    from companies.models import Company

    try:
        connection = XeroConnection.objects.get(is_active=True)
    except XeroConnection.DoesNotExist:
        logger.info(f"No active Xero connection, skipping contact sync for company {company_id}")
        return "No active Xero connection"

    try:
        company = Company.objects.get(id=company_id)
    except Company.DoesNotExist:
        logger.error(f"Company {company_id} not found")
        return f"Company not found: {company_id}"

    # Only sync if company already has a Xero contact mapping
    if not XeroContactMapping.objects.filter(company=company).exists():
        logger.debug(f"Company {company_id} has no Xero contact mapping, skipping sync")
        return "No existing Xero contact mapping"

    service = XeroService()

    try:
        xero_contact_id = service.sync_contact(connection, company)
        logger.info(f"Synced company {company_id} contact to Xero as {xero_contact_id}")
        return f"Synced to Xero: {xero_contact_id}"
    except XeroError as e:
        logger.error(f"Failed to sync company {company_id} contact: {e}")
        return f"Sync failed: {e}"
