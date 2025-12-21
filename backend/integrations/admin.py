"""
Admin configuration for the integrations app.
"""

from django.contrib import admin

from .models import (
    XeroConnection,
    XeroContactMapping,
    XeroInvoiceMapping,
    XeroPaymentMapping,
)


@admin.register(XeroConnection)
class XeroConnectionAdmin(admin.ModelAdmin):
    list_display = [
        'tenant_name',
        'tenant_id',
        'is_active',
        'last_sync_at',
        'connected_by',
        'created_at',
    ]
    list_filter = ['is_active', 'created_at']
    search_fields = ['tenant_name', 'tenant_id']
    readonly_fields = [
        'id',
        'tenant_id',
        'tenant_name',
        'token_expires_at',
        'connected_by',
        'created_at',
        'updated_at',
    ]


@admin.register(XeroContactMapping)
class XeroContactMappingAdmin(admin.ModelAdmin):
    list_display = [
        'company',
        'xero_contact_id',
        'created_at',
    ]
    search_fields = ['company__name', 'xero_contact_id']
    readonly_fields = ['id', 'created_at', 'updated_at']
    raw_id_fields = ['company']


@admin.register(XeroInvoiceMapping)
class XeroInvoiceMappingAdmin(admin.ModelAdmin):
    list_display = [
        'invoice',
        'xero_invoice_id',
        'xero_invoice_number',
        'sync_status',
        'last_synced_at',
    ]
    list_filter = ['sync_status', 'created_at']
    search_fields = ['invoice__invoice_number', 'xero_invoice_id', 'xero_invoice_number']
    readonly_fields = ['id', 'created_at', 'updated_at']
    raw_id_fields = ['invoice']


@admin.register(XeroPaymentMapping)
class XeroPaymentMappingAdmin(admin.ModelAdmin):
    list_display = [
        'payment',
        'xero_payment_id',
        'created_at',
    ]
    search_fields = ['xero_payment_id']
    readonly_fields = ['id', 'created_at', 'updated_at']
    raw_id_fields = ['payment']
