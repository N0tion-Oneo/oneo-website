"""
Serializers for the integrations app.
"""

from rest_framework import serializers

from .models import XeroConnection, XeroInvoiceMapping


class XeroConnectionSerializer(serializers.ModelSerializer):
    """Serializer for Xero connection status."""

    connected_by_name = serializers.CharField(
        source='connected_by.get_full_name',
        read_only=True,
    )

    class Meta:
        model = XeroConnection
        fields = [
            'id',
            'tenant_id',
            'tenant_name',
            'is_active',
            'last_sync_at',
            'connected_by_name',
            'created_at',
        ]
        read_only_fields = fields


class XeroAuthResponseSerializer(serializers.Serializer):
    """Serializer for OAuth initiation response."""

    auth_url = serializers.URLField()
    state = serializers.CharField()


class XeroCallbackSerializer(serializers.Serializer):
    """Serializer for OAuth callback request."""

    code = serializers.CharField(required=True)
    state = serializers.CharField(required=True)


class XeroSyncResultSerializer(serializers.Serializer):
    """Serializer for sync operation results."""

    synced = serializers.IntegerField()
    skipped = serializers.IntegerField()
    errors = serializers.IntegerField()
    message = serializers.CharField()


class XeroInvoiceMappingSerializer(serializers.ModelSerializer):
    """Serializer for invoice mapping details."""

    invoice_number = serializers.CharField(source='invoice.invoice_number', read_only=True)
    company_name = serializers.CharField(source='invoice.company.name', read_only=True)

    class Meta:
        model = XeroInvoiceMapping
        fields = [
            'id',
            'invoice_number',
            'company_name',
            'xero_invoice_id',
            'xero_invoice_number',
            'sync_status',
            'sync_error',
            'last_synced_at',
            'created_at',
        ]
        read_only_fields = fields
