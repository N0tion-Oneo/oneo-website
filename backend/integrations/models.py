"""
Models for external integrations (Xero, etc.).
"""

import uuid
from django.conf import settings
from django.db import models


class XeroConnection(models.Model):
    """
    Organization-level Xero OAuth connection.
    Only one active connection is allowed at a time.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # OAuth tokens
    access_token = models.TextField(
        help_text='OAuth access token (should be encrypted in production)'
    )
    refresh_token = models.TextField(
        help_text='OAuth refresh token'
    )
    token_expires_at = models.DateTimeField(
        help_text='When the access token expires'
    )

    # Xero organization details
    tenant_id = models.CharField(
        max_length=255,
        unique=True,
        help_text='Xero Tenant ID (organization identifier)'
    )
    tenant_name = models.CharField(
        max_length=255,
        help_text='Xero organization name'
    )

    # Status
    is_active = models.BooleanField(
        default=True,
        help_text='Whether this connection is active'
    )
    last_sync_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Last successful payment sync timestamp'
    )

    # Audit
    connected_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='xero_connections',
        help_text='User who connected the Xero account'
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'xero_connections'
        verbose_name = 'Xero Connection'
        verbose_name_plural = 'Xero Connections'

    def __str__(self):
        status = 'Active' if self.is_active else 'Inactive'
        return f"Xero: {self.tenant_name} ({status})"


class XeroContactMapping(models.Model):
    """
    Maps Oneo companies to Xero contacts.
    Created when a company's invoice is first synced to Xero.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    company = models.OneToOneField(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='xero_contact'
    )
    xero_contact_id = models.CharField(
        max_length=255,
        help_text='Xero Contact ID'
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'xero_contact_mappings'
        verbose_name = 'Xero Contact Mapping'
        verbose_name_plural = 'Xero Contact Mappings'

    def __str__(self):
        return f"{self.company.name} -> {self.xero_contact_id}"


class XeroInvoiceMappingSyncStatus(models.TextChoices):
    PENDING = 'pending', 'Pending'
    SYNCED = 'synced', 'Synced'
    ERROR = 'error', 'Error'


class XeroInvoiceMapping(models.Model):
    """
    Maps Oneo invoices to Xero invoices.
    Tracks sync status and any errors.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    invoice = models.OneToOneField(
        'subscriptions.Invoice',
        on_delete=models.CASCADE,
        related_name='xero_mapping'
    )
    xero_invoice_id = models.CharField(
        max_length=255,
        help_text='Xero Invoice ID'
    )
    xero_invoice_number = models.CharField(
        max_length=50,
        blank=True,
        help_text='Invoice number assigned by Xero'
    )

    # Sync status
    sync_status = models.CharField(
        max_length=20,
        choices=XeroInvoiceMappingSyncStatus.choices,
        default=XeroInvoiceMappingSyncStatus.PENDING,
    )
    sync_error = models.TextField(
        blank=True,
        help_text='Error message if sync failed'
    )
    last_synced_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Last successful sync timestamp'
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'xero_invoice_mappings'
        verbose_name = 'Xero Invoice Mapping'
        verbose_name_plural = 'Xero Invoice Mappings'
        indexes = [
            models.Index(fields=['xero_invoice_id']),
            models.Index(fields=['sync_status']),
        ]

    def __str__(self):
        return f"{self.invoice.invoice_number} -> {self.xero_invoice_id} ({self.sync_status})"


class XeroPaymentMapping(models.Model):
    """
    Maps Xero payments to Oneo payments.
    Prevents duplicate payment imports.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    payment = models.OneToOneField(
        'subscriptions.Payment',
        on_delete=models.CASCADE,
        related_name='xero_mapping'
    )
    xero_payment_id = models.CharField(
        max_length=255,
        unique=True,
        help_text='Xero Payment ID'
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'xero_payment_mappings'
        verbose_name = 'Xero Payment Mapping'
        verbose_name_plural = 'Xero Payment Mappings'

    def __str__(self):
        return f"Payment {self.payment.id} -> {self.xero_payment_id}"
