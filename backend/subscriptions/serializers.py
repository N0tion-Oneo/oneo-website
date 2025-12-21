"""Serializers for subscription management."""
from decimal import Decimal
from rest_framework import serializers
from .models import (
    Subscription,
    SubscriptionStatus,
    TerminationType,
    TerminationReason,
    CompanyPricing,
    CompanyFeatureOverride,
    Invoice,
    InvoiceLineItem,
    InvoiceStatus,
    InvoiceType,
    BillingMode,
    Payment,
    PaymentMethod,
    SubscriptionActivityLog,
    SubscriptionActivityType,
)


# =============================================================================
# Subscription Serializers
# =============================================================================


class SubscriptionListSerializer(serializers.ModelSerializer):
    """Serializer for subscription list view."""
    company_name = serializers.CharField(source='company.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    service_type_display = serializers.CharField(source='get_service_type_display', read_only=True)
    days_until_renewal = serializers.IntegerField(read_only=True)
    months_remaining = serializers.IntegerField(read_only=True)

    class Meta:
        model = Subscription
        fields = [
            'id',
            'company',
            'company_name',
            'service_type',
            'service_type_display',
            'status',
            'status_display',
            'contract_start_date',
            'contract_end_date',
            'auto_renew',
            'days_until_renewal',
            'months_remaining',
            'created_at',
        ]


class SubscriptionDetailSerializer(serializers.ModelSerializer):
    """Serializer for subscription detail view."""
    company_name = serializers.CharField(source='company.name', read_only=True)
    service_type_display = serializers.CharField(source='get_service_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    termination_type_display = serializers.CharField(
        source='get_termination_type_display', read_only=True
    )
    termination_reason_display = serializers.CharField(
        source='get_termination_reason_display', read_only=True
    )
    terminated_by_name = serializers.SerializerMethodField()
    paused_by_name = serializers.SerializerMethodField()
    days_until_renewal = serializers.IntegerField(read_only=True)
    months_remaining = serializers.IntegerField(read_only=True)
    is_within_lockout_period = serializers.BooleanField(read_only=True)
    is_active = serializers.BooleanField(read_only=True)

    class Meta:
        model = Subscription
        fields = [
            'id',
            'company',
            'company_name',
            'service_type',
            'service_type_display',
            # Contract
            'contract_start_date',
            'contract_end_date',
            'billing_day_of_month',
            # Status
            'status',
            'status_display',
            'auto_renew',
            'renewal_reminder_sent',
            # Computed
            'days_until_renewal',
            'months_remaining',
            'is_within_lockout_period',
            'is_active',
            # Termination
            'terminated_at',
            'terminated_by',
            'terminated_by_name',
            'termination_type',
            'termination_type_display',
            'termination_reason',
            'termination_reason_display',
            'termination_notes',
            'termination_effective_date',
            'early_termination_fee',
            'access_expires_at',
            # Pause
            'paused_at',
            'paused_by',
            'paused_by_name',
            'pause_reason',
            # Notes
            'internal_notes',
            # Timestamps
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id', 'company', 'created_at', 'updated_at',
            'terminated_at', 'terminated_by', 'paused_at', 'paused_by',
        ]

    def get_terminated_by_name(self, obj):
        if obj.terminated_by:
            return obj.terminated_by.get_full_name() or obj.terminated_by.email
        return None

    def get_paused_by_name(self, obj):
        if obj.paused_by:
            return obj.paused_by.get_full_name() or obj.paused_by.email
        return None


class SubscriptionCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a subscription."""

    class Meta:
        model = Subscription
        fields = [
            'company',
            'service_type',
            'contract_start_date',
            'contract_end_date',
            'billing_day_of_month',
            'auto_renew',
            'internal_notes',
        ]

    def validate(self, data):
        """Validate contract dates and subscription uniqueness."""
        company = data.get('company')
        service_type = data.get('service_type')

        # Check if subscription for this service type already exists
        if company and service_type:
            if Subscription.objects.filter(company=company, service_type=service_type).exists():
                raise serializers.ValidationError({
                    'service_type': f'This company already has a {service_type} subscription.'
                })

            # Check for mutually exclusive recruitment types
            from .models import SubscriptionServiceType
            if service_type in [SubscriptionServiceType.RETAINED, SubscriptionServiceType.HEADHUNTING]:
                other_type = (
                    SubscriptionServiceType.HEADHUNTING
                    if service_type == SubscriptionServiceType.RETAINED
                    else SubscriptionServiceType.RETAINED
                )
                if Subscription.objects.filter(company=company, service_type=other_type).exists():
                    raise serializers.ValidationError({
                        'service_type': f'Company already has a {other_type} subscription. '
                                        f'A company can only have one recruitment service.'
                    })

        # Validate contract dates
        start = data.get('contract_start_date')
        end = data.get('contract_end_date')
        if start and end and end <= start:
            raise serializers.ValidationError({
                'contract_end_date': 'End date must be after start date.'
            })
        return data


class SubscriptionUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating a subscription."""

    class Meta:
        model = Subscription
        fields = [
            'contract_end_date',
            'billing_day_of_month',
            'auto_renew',
            'internal_notes',
        ]


class SubscriptionPauseSerializer(serializers.Serializer):
    """Serializer for pausing a subscription."""
    pause_reason = serializers.CharField(required=True)


class SubscriptionTerminateSerializer(serializers.Serializer):
    """Serializer for terminating a subscription."""
    termination_type = serializers.ChoiceField(choices=TerminationType.choices)
    termination_reason = serializers.ChoiceField(choices=TerminationReason.choices)
    termination_notes = serializers.CharField(required=False, allow_blank=True)
    termination_effective_date = serializers.DateField(required=False)
    access_expires_days = serializers.IntegerField(
        required=False,
        default=7,
        min_value=0,
        max_value=90,
        help_text='Number of days after termination when access expires',
    )


class TerminationFeeCalculationSerializer(serializers.Serializer):
    """Serializer for termination fee calculation response."""
    monthly_retainer = serializers.DecimalField(max_digits=12, decimal_places=2)
    months_remaining = serializers.IntegerField()
    remaining_term_fee = serializers.DecimalField(max_digits=12, decimal_places=2)
    three_month_fee = serializers.DecimalField(max_digits=12, decimal_places=2)
    early_termination_fee = serializers.DecimalField(max_digits=12, decimal_places=2)
    is_within_lockout_period = serializers.BooleanField()
    can_terminate_without_cause = serializers.BooleanField()


# =============================================================================
# Company Pricing Serializers
# =============================================================================


class CompanyPricingSerializer(serializers.ModelSerializer):
    """Serializer for company pricing."""
    company_name = serializers.CharField(source='company.name', read_only=True)
    updated_by_name = serializers.SerializerMethodField()
    effective_retainer = serializers.SerializerMethodField()
    effective_placement_fee = serializers.SerializerMethodField()
    effective_csuite_fee = serializers.SerializerMethodField()

    class Meta:
        model = CompanyPricing
        fields = [
            'id',
            'company',
            'company_name',
            'monthly_retainer',
            'placement_fee',
            'csuite_placement_fee',
            'effective_from',
            'updated_by',
            'updated_by_name',
            # Computed effective values
            'effective_retainer',
            'effective_placement_fee',
            'effective_csuite_fee',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'company', 'updated_by', 'created_at', 'updated_at']

    def get_updated_by_name(self, obj):
        if obj.updated_by:
            return obj.updated_by.get_full_name() or obj.updated_by.email
        return None

    def get_effective_retainer(self, obj):
        return str(obj.get_effective_retainer())

    def get_effective_placement_fee(self, obj):
        return str(obj.get_effective_placement_fee())

    def get_effective_csuite_fee(self, obj):
        return str(obj.get_effective_csuite_fee())


class CompanyPricingUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating company pricing."""

    class Meta:
        model = CompanyPricing
        fields = [
            'monthly_retainer',
            'placement_fee',
            'csuite_placement_fee',
            'effective_from',
        ]

    def validate_placement_fee(self, value):
        if value is not None and (value < 0 or value > 1):
            raise serializers.ValidationError(
                'Placement fee must be between 0 and 1 (e.g., 0.10 for 10%)'
            )
        return value

    def validate_csuite_placement_fee(self, value):
        if value is not None and (value < 0 or value > 1):
            raise serializers.ValidationError(
                'C-Suite placement fee must be between 0 and 1'
            )
        return value


class EffectivePricingSerializer(serializers.Serializer):
    """Serializer for effective pricing (custom or defaults)."""
    monthly_retainer = serializers.DecimalField(max_digits=12, decimal_places=2)
    placement_fee = serializers.DecimalField(max_digits=5, decimal_places=4)
    placement_fee_percent = serializers.SerializerMethodField()
    csuite_placement_fee = serializers.DecimalField(max_digits=5, decimal_places=4)
    csuite_placement_fee_percent = serializers.SerializerMethodField()
    is_custom_retainer = serializers.BooleanField()
    is_custom_placement = serializers.BooleanField()
    is_custom_csuite = serializers.BooleanField()

    def get_placement_fee_percent(self, obj):
        return float(obj['placement_fee']) * 100

    def get_csuite_placement_fee_percent(self, obj):
        return float(obj['csuite_placement_fee']) * 100


# =============================================================================
# Feature Override Serializers
# =============================================================================


class CompanyFeatureOverrideSerializer(serializers.ModelSerializer):
    """Serializer for feature override."""
    feature_name = serializers.CharField(source='feature.name', read_only=True)
    feature_category = serializers.CharField(source='feature.category', read_only=True)
    updated_by_name = serializers.SerializerMethodField()

    class Meta:
        model = CompanyFeatureOverride
        fields = [
            'id',
            'company',
            'feature',
            'feature_name',
            'feature_category',
            'is_enabled',
            'updated_by',
            'updated_by_name',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'company', 'updated_by', 'created_at', 'updated_at']

    def get_updated_by_name(self, obj):
        if obj.updated_by:
            return obj.updated_by.get_full_name() or obj.updated_by.email
        return None


class FeatureWithOverrideSerializer(serializers.Serializer):
    """Serializer for feature with override status."""
    id = serializers.UUIDField()
    name = serializers.CharField()
    category = serializers.CharField()
    default_enabled = serializers.BooleanField()
    is_overridden = serializers.BooleanField()
    override_enabled = serializers.BooleanField(allow_null=True)
    effective_enabled = serializers.BooleanField()


class FeatureOverrideUpdateSerializer(serializers.Serializer):
    """Serializer for updating a feature override."""
    is_enabled = serializers.BooleanField(required=False, allow_null=True)

    def validate_is_enabled(self, value):
        # null means remove override (use default)
        return value


class BulkFeatureOverrideSerializer(serializers.Serializer):
    """Serializer for bulk updating feature overrides."""
    overrides = serializers.ListField(
        child=serializers.DictField(child=serializers.Field()),
        help_text='List of {feature_id, is_enabled} objects. is_enabled=null removes override.'
    )


# =============================================================================
# Invoice Serializers
# =============================================================================


class InvoiceLineItemSerializer(serializers.ModelSerializer):
    """Serializer for invoice line items."""

    class Meta:
        model = InvoiceLineItem
        fields = [
            'id',
            'description',
            'quantity',
            'unit_price',
            'amount',
            'placement',
            'order',
        ]
        read_only_fields = ['id']


class PlacementInfoSerializer(serializers.Serializer):
    """Nested serializer for placement (application) info on invoices."""
    id = serializers.UUIDField()
    candidate_id = serializers.UUIDField(source='candidate.id')
    candidate_name = serializers.SerializerMethodField()
    job_id = serializers.UUIDField(source='job.id')
    job_title = serializers.CharField(source='job.title')
    is_csuite = serializers.BooleanField(source='job.is_csuite')
    offer_currency = serializers.SerializerMethodField()
    offer_accepted_at = serializers.DateTimeField()
    # Full offer details
    annual_salary = serializers.SerializerMethodField()
    benefits = serializers.SerializerMethodField()
    equity = serializers.SerializerMethodField()
    total_benefits_cost = serializers.SerializerMethodField()
    year_1_equity_value = serializers.SerializerMethodField()
    total_cost_to_company = serializers.SerializerMethodField()
    start_date = serializers.SerializerMethodField()
    notes = serializers.SerializerMethodField()

    def _get_offer(self, obj):
        """Get the effective offer details (merge final with original, final takes priority)."""
        offer = obj.offer_details or {}
        final = obj.final_offer_details or {}
        # Merge: start with original, override with final values that are not None/empty
        merged = {**offer}
        for key, value in final.items():
            if value is not None and value != '' and value != []:
                merged[key] = value
        return merged

    def get_candidate_name(self, obj):
        return obj.candidate.user.get_full_name() or obj.candidate.user.email

    def get_offer_currency(self, obj):
        offer = self._get_offer(obj)
        return offer.get('currency', 'ZAR')

    def get_annual_salary(self, obj):
        offer = self._get_offer(obj)
        return offer.get('annual_salary')

    def get_benefits(self, obj):
        offer = self._get_offer(obj)
        return offer.get('benefits', [])

    def get_equity(self, obj):
        offer = self._get_offer(obj)
        return offer.get('equity')

    def get_total_benefits_cost(self, obj):
        offer = self._get_offer(obj)
        benefits = offer.get('benefits', [])
        if not benefits:
            return 0
        return sum(b.get('annual_cost', 0) for b in benefits if isinstance(b, dict))

    def get_year_1_equity_value(self, obj):
        offer = self._get_offer(obj)
        equity = offer.get('equity')
        if not equity or not isinstance(equity, dict):
            return 0
        shares = equity.get('shares', 0)
        share_value = equity.get('share_value', 0)
        vesting_years = equity.get('vesting_years', 1)
        if not shares or not share_value or not vesting_years:
            return 0
        return (shares * share_value) / vesting_years

    def get_total_cost_to_company(self, obj):
        annual_salary = self.get_annual_salary(obj) or 0
        total_benefits = self.get_total_benefits_cost(obj)
        year_1_equity = self.get_year_1_equity_value(obj)
        return annual_salary + total_benefits + year_1_equity

    def get_start_date(self, obj):
        offer = self._get_offer(obj)
        return offer.get('start_date')

    def get_notes(self, obj):
        offer = self._get_offer(obj)
        return offer.get('notes', '')


class InvoiceListSerializer(serializers.ModelSerializer):
    """Serializer for invoice list view."""
    company_name = serializers.CharField(source='company.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    invoice_type_display = serializers.CharField(
        source='get_invoice_type_display', read_only=True
    )
    balance_due = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    is_overdue = serializers.BooleanField(read_only=True)
    placement_info = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = [
            'id',
            'invoice_number',
            'company',
            'company_name',
            'invoice_type',
            'invoice_type_display',
            'invoice_date',
            'due_date',
            'total_amount',
            'amount_paid',
            'balance_due',
            'status',
            'status_display',
            'is_overdue',
            'billing_mode',
            'placement',
            'placement_info',
            'created_at',
        ]

    def get_placement_info(self, obj):
        if obj.placement:
            return PlacementInfoSerializer(obj.placement).data
        return None


class InvoiceDetailSerializer(serializers.ModelSerializer):
    """Serializer for invoice detail view."""
    company_name = serializers.CharField(source='company.name', read_only=True)
    company_address = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    invoice_type_display = serializers.CharField(
        source='get_invoice_type_display', read_only=True
    )
    billing_mode_display = serializers.CharField(
        source='get_billing_mode_display', read_only=True
    )
    line_items = InvoiceLineItemSerializer(many=True, read_only=True)
    balance_due = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    is_overdue = serializers.BooleanField(read_only=True)
    is_fully_paid = serializers.BooleanField(read_only=True)
    created_by_name = serializers.SerializerMethodField()
    placement_info = serializers.SerializerMethodField()
    can_edit_line_items = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = [
            'id',
            'invoice_number',
            'company',
            'company_name',
            'company_address',
            'subscription',
            'placement',
            'placement_info',
            'invoice_type',
            'invoice_type_display',
            'billing_mode',
            'billing_mode_display',
            # Dates
            'invoice_date',
            'due_date',
            'billing_period_start',
            'billing_period_end',
            # Amounts
            'subtotal',
            'vat_rate',
            'vat_amount',
            'total_amount',
            'amount_paid',
            'balance_due',
            'is_fully_paid',
            # Status
            'status',
            'status_display',
            'is_overdue',
            # External
            'external_invoice_number',
            'external_system',
            # Timestamps
            'sent_at',
            'paid_at',
            'cancelled_at',
            # Files
            'pdf_file',
            # Notes
            'description',
            'internal_notes',
            # Line items
            'line_items',
            'can_edit_line_items',
            # Audit
            'created_by',
            'created_by_name',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id', 'invoice_number', 'created_by',
            'sent_at', 'paid_at', 'cancelled_at',
            'created_at', 'updated_at',
        ]

    def get_company_address(self, obj):
        company = obj.company
        parts = []
        if company.billing_address:
            parts.append(company.billing_address)
        if company.billing_city:
            parts.append(company.billing_city)
        if company.billing_postal_code:
            parts.append(company.billing_postal_code)
        if company.billing_country:
            parts.append(company.billing_country.name)
        return ', '.join(parts) if parts else None

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.email
        return None

    def get_placement_info(self, obj):
        if obj.placement:
            return PlacementInfoSerializer(obj.placement).data
        return None

    def get_can_edit_line_items(self, obj):
        """Line items can only be edited if invoice is draft and has no payments."""
        return obj.status == InvoiceStatus.DRAFT and obj.amount_paid == 0


class InvoiceCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating an invoice."""
    line_items = InvoiceLineItemSerializer(many=True, required=False)

    class Meta:
        model = Invoice
        fields = [
            'company',
            'subscription',
            'placement',
            'invoice_type',
            'billing_mode',
            'invoice_date',
            'due_date',
            'billing_period_start',
            'billing_period_end',
            'subtotal',
            'vat_rate',
            'external_invoice_number',
            'external_system',
            'description',
            'internal_notes',
            'line_items',
        ]

    def validate(self, data):
        """Calculate VAT and total amounts."""
        subtotal = data.get('subtotal', Decimal('0'))
        vat_rate = data.get('vat_rate', Decimal('0.15'))
        data['vat_amount'] = subtotal * vat_rate
        data['total_amount'] = subtotal + data['vat_amount']
        return data

    def create(self, validated_data):
        line_items_data = validated_data.pop('line_items', [])
        validated_data['invoice_number'] = Invoice.generate_invoice_number()
        invoice = Invoice.objects.create(**validated_data)

        for item_data in line_items_data:
            item_data['amount'] = item_data['quantity'] * item_data['unit_price']
            InvoiceLineItem.objects.create(invoice=invoice, **item_data)

        return invoice


class InvoiceUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating an invoice."""

    class Meta:
        model = Invoice
        fields = [
            'due_date',
            'billing_period_start',
            'billing_period_end',
            'external_invoice_number',
            'external_system',
            'description',
            'internal_notes',
        ]


class InvoiceSendSerializer(serializers.Serializer):
    """Serializer for sending an invoice."""
    send_email = serializers.BooleanField(default=True)


# =============================================================================
# Payment Serializers
# =============================================================================


class PaymentSerializer(serializers.ModelSerializer):
    """Serializer for payment."""
    payment_method_display = serializers.CharField(
        source='get_payment_method_display', read_only=True
    )
    recorded_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = [
            'id',
            'invoice',
            'amount',
            'payment_date',
            'payment_method',
            'payment_method_display',
            'reference_number',
            'notes',
            'recorded_by',
            'recorded_by_name',
            'created_at',
        ]
        read_only_fields = ['id', 'invoice', 'recorded_by', 'created_at']

    def get_recorded_by_name(self, obj):
        if obj.recorded_by:
            return obj.recorded_by.get_full_name() or obj.recorded_by.email
        return None


class PaymentCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a payment."""

    class Meta:
        model = Payment
        fields = [
            'amount',
            'payment_date',
            'payment_method',
            'reference_number',
            'notes',
        ]

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError('Payment amount must be positive.')
        return value


# =============================================================================
# Activity Log Serializers
# =============================================================================


class SubscriptionActivityLogSerializer(serializers.ModelSerializer):
    """Serializer for subscription activity log."""
    activity_type_display = serializers.CharField(
        source='get_activity_type_display', read_only=True
    )
    performed_by_name = serializers.SerializerMethodField()
    company_name = serializers.CharField(source='company.name', read_only=True)

    class Meta:
        model = SubscriptionActivityLog
        fields = [
            'id',
            'company',
            'company_name',
            'subscription',
            'invoice',
            'performed_by',
            'performed_by_name',
            'activity_type',
            'activity_type_display',
            'previous_status',
            'new_status',
            'metadata',
            'created_at',
        ]

    def get_performed_by_name(self, obj):
        if obj.performed_by:
            return obj.performed_by.get_full_name() or obj.performed_by.email
        return 'System'


# =============================================================================
# Dashboard/Alert Serializers
# =============================================================================


class SubscriptionAlertSerializer(serializers.Serializer):
    """Serializer for subscription alerts."""
    type = serializers.ChoiceField(choices=[
        'renewal_due', 'overdue_invoice', 'expiring_soon', 'payment_required'
    ])
    company_id = serializers.UUIDField()
    company_name = serializers.CharField()
    message = serializers.CharField()
    severity = serializers.ChoiceField(choices=['info', 'warning', 'critical'])
    subscription_id = serializers.UUIDField(required=False, allow_null=True)
    invoice_id = serializers.UUIDField(required=False, allow_null=True)
    due_date = serializers.DateField(required=False, allow_null=True)
    amount = serializers.DecimalField(
        max_digits=12, decimal_places=2, required=False, allow_null=True
    )


class UpcomingRenewalSerializer(serializers.Serializer):
    """Serializer for upcoming contract renewals."""
    company_id = serializers.UUIDField()
    company_name = serializers.CharField()
    contract_end_date = serializers.DateField()
    days_until_renewal = serializers.IntegerField()
    auto_renew = serializers.BooleanField()
    monthly_retainer = serializers.DecimalField(max_digits=12, decimal_places=2)


class RecentInvoiceSummarySerializer(serializers.Serializer):
    """Serializer for recent invoices in summary."""
    id = serializers.UUIDField()
    invoice_number = serializers.CharField()
    company_name = serializers.CharField()
    total_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    status = serializers.CharField()
    invoice_date = serializers.DateField()
    invoice_type = serializers.CharField()


class RecentActivitySerializer(serializers.Serializer):
    """Serializer for recent activity in summary."""
    id = serializers.UUIDField()
    activity_type = serializers.CharField()
    activity_type_display = serializers.CharField()
    company_name = serializers.CharField()
    performed_by_name = serializers.CharField(allow_null=True)
    created_at = serializers.DateTimeField()


class InvoiceStatusCountSerializer(serializers.Serializer):
    """Serializer for invoice count and amount by status."""
    count = serializers.IntegerField()
    amount = serializers.DecimalField(max_digits=14, decimal_places=2)


class PlacementBreakdownSerializer(serializers.Serializer):
    """Serializer for placement invoice breakdown by status."""
    paid = InvoiceStatusCountSerializer()
    partially_paid = InvoiceStatusCountSerializer()
    pending = InvoiceStatusCountSerializer()
    overdue = InvoiceStatusCountSerializer()
    draft = InvoiceStatusCountSerializer()
    cancelled = InvoiceStatusCountSerializer()


class SubscriptionSummarySerializer(serializers.Serializer):
    """Serializer for subscription dashboard summary."""
    # Existing subscription stats
    total_subscriptions = serializers.IntegerField()
    active_subscriptions = serializers.IntegerField()
    paused_subscriptions = serializers.IntegerField()
    terminated_subscriptions = serializers.IntegerField()
    expired_subscriptions = serializers.IntegerField()
    expiring_this_month = serializers.IntegerField()
    total_mrr = serializers.DecimalField(max_digits=12, decimal_places=2)
    overdue_invoices_count = serializers.IntegerField()
    overdue_invoices_amount = serializers.DecimalField(max_digits=12, decimal_places=2)

    # Service type breakdown with subscriptions
    retained_companies = serializers.IntegerField()
    headhunting_companies = serializers.IntegerField()
    retained_subscriptions = serializers.IntegerField()
    headhunting_subscriptions = serializers.IntegerField()
    retained_mrr = serializers.DecimalField(max_digits=12, decimal_places=2)

    # Retained placement stats (revenue = placement fees)
    retained_regular_placements = serializers.IntegerField()
    retained_csuite_placements = serializers.IntegerField()
    retained_regular_revenue = serializers.DecimalField(max_digits=14, decimal_places=2)
    retained_csuite_revenue = serializers.DecimalField(max_digits=14, decimal_places=2)
    retained_regular_breakdown = PlacementBreakdownSerializer()
    retained_csuite_breakdown = PlacementBreakdownSerializer()

    # Headhunting placement stats (revenue = placement fees)
    headhunting_regular_placements = serializers.IntegerField()
    headhunting_csuite_placements = serializers.IntegerField()
    headhunting_regular_revenue = serializers.DecimalField(max_digits=14, decimal_places=2)
    headhunting_csuite_revenue = serializers.DecimalField(max_digits=14, decimal_places=2)
    headhunting_regular_breakdown = PlacementBreakdownSerializer()
    headhunting_csuite_breakdown = PlacementBreakdownSerializer()

    # Retained retainer/subscription stats (only retained companies have subscriptions)
    retained_retainer_count = serializers.IntegerField()
    retained_retainer_revenue = serializers.DecimalField(max_digits=14, decimal_places=2)
    retained_retainer_breakdown = PlacementBreakdownSerializer()

    # Invoice collection stats
    collected_this_month = serializers.DecimalField(max_digits=12, decimal_places=2)
    pending_invoices_count = serializers.IntegerField()
    pending_invoices_amount = serializers.DecimalField(max_digits=12, decimal_places=2)

    # Upcoming renewals
    upcoming_renewals = UpcomingRenewalSerializer(many=True)
