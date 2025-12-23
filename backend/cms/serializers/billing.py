"""Billing Configuration serializers."""
from rest_framework import serializers
from cms.models import BillingConfig


class BillingConfigSerializer(serializers.ModelSerializer):
    """Full billing config serializer for admin use."""
    updated_by_name = serializers.SerializerMethodField()
    payment_terms_options = serializers.SerializerMethodField()

    class Meta:
        model = BillingConfig
        fields = [
            'id',
            # Available payment terms
            'available_payment_terms',
            'payment_terms_options',  # Formatted for dropdowns
            # Default payment terms per invoice type
            'retainer_payment_terms_days',
            'placement_payment_terms_days',
            'termination_payment_terms_days',
            'service_type_change_payment_terms_days',
            'adjustment_payment_terms_days',
            'other_payment_terms_days',
            # VAT
            'default_vat_rate',
            # Invoice settings
            'invoice_number_prefix',
            # Audit
            'updated_at',
            'updated_by_name',
        ]
        read_only_fields = ['id', 'updated_at', 'updated_by_name', 'payment_terms_options']

    def get_updated_by_name(self, obj):
        if obj.updated_by:
            return f"{obj.updated_by.first_name} {obj.updated_by.last_name}".strip() or obj.updated_by.email
        return None

    def get_payment_terms_options(self, obj):
        """Format payment terms for dropdown display."""
        options = []
        for days in obj.available_payment_terms:
            options.append({
                'value': days,
                'label': obj.get_payment_terms_label(days),
            })
        return options


class BillingConfigUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating billing config."""

    class Meta:
        model = BillingConfig
        fields = [
            # Available payment terms
            'available_payment_terms',
            # Default payment terms per invoice type
            'retainer_payment_terms_days',
            'placement_payment_terms_days',
            'termination_payment_terms_days',
            'service_type_change_payment_terms_days',
            'adjustment_payment_terms_days',
            'other_payment_terms_days',
            # VAT
            'default_vat_rate',
            # Invoice settings
            'invoice_number_prefix',
        ]


class PaymentTermsPublicSerializer(serializers.Serializer):
    """Public serializer for available payment terms options."""
    available_terms = serializers.ListField(child=serializers.IntegerField())
    options = serializers.ListField(child=serializers.DictField())

    def to_representation(self, instance):
        return {
            'available_terms': instance.available_payment_terms,
            'options': [
                {'value': days, 'label': instance.get_payment_terms_label(days)}
                for days in instance.available_payment_terms
            ],
        }
