"""Serializers for replacement requests."""
from rest_framework import serializers
from jobs.models import ReplacementRequest, ReplacementStatus, ReplacementReasonCategory


class ReplacementRequestListSerializer(serializers.ModelSerializer):
    """Serializer for listing replacement requests."""
    company_id = serializers.UUIDField(source='application.job.company.id', read_only=True)
    company_name = serializers.CharField(source='application.job.company.name', read_only=True)
    job_id = serializers.UUIDField(source='application.job.id', read_only=True)
    job_title = serializers.CharField(source='application.job.title', read_only=True)
    candidate_name = serializers.SerializerMethodField()
    candidate_slug = serializers.CharField(source='application.candidate.slug', read_only=True)
    requested_by_name = serializers.SerializerMethodField()
    reviewed_by_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    reason_category_display = serializers.CharField(source='get_reason_category_display', read_only=True)
    # Include original offer details for pricing context in review
    original_offer_details = serializers.SerializerMethodField()
    original_start_date = serializers.SerializerMethodField()
    original_invoiced_amount = serializers.SerializerMethodField()

    class Meta:
        model = ReplacementRequest
        fields = [
            'id',
            'application',
            'company_id',
            'company_name',
            'job_id',
            'job_title',
            'candidate_name',
            'candidate_slug',
            'reason_category',
            'reason_category_display',
            'reason_details',
            'status',
            'status_display',
            'discount_percentage',
            'requested_by',
            'requested_by_name',
            'requested_at',
            'reviewed_by',
            'reviewed_by_name',
            'reviewed_at',
            'review_notes',
            'created_at',
            'original_offer_details',
            'original_start_date',
            'original_invoiced_amount',
        ]
        read_only_fields = fields

    def get_candidate_name(self, obj):
        return obj.application.candidate.user.get_full_name()

    def get_requested_by_name(self, obj):
        if obj.requested_by:
            return obj.requested_by.get_full_name() or obj.requested_by.email
        return None

    def get_reviewed_by_name(self, obj):
        if obj.reviewed_by:
            return obj.reviewed_by.get_full_name() or obj.reviewed_by.email
        return None

    def get_original_offer_details(self, obj):
        """Get the original offer details from the application.

        Merges offer_details with final_offer_details to ensure all fields
        are available (handles legacy data where final_offer_details may be incomplete).
        """
        base = obj.application.offer_details or {}
        final = obj.application.final_offer_details or {}
        # Merge: start with base, overlay with final (final takes precedence for non-empty values)
        merged = {**base}
        for key, value in final.items():
            if value is not None and value != '' and value != []:
                merged[key] = value
        return merged if merged else None

    def get_original_start_date(self, obj):
        """Get the start date from offer details."""
        # Check final_offer_details first, then offer_details
        final = obj.application.final_offer_details or {}
        start_date = final.get('start_date')
        if not start_date:
            offer = obj.application.offer_details or {}
            start_date = offer.get('start_date')
        return start_date

    def get_original_invoiced_amount(self, obj):
        """Get the invoiced amount (ex VAT) for the original placement."""
        from subscriptions.models import Invoice, InvoiceType, InvoiceStatus
        # Find the placement invoice for the original application
        invoice = Invoice.objects.filter(
            placement=obj.application,
            invoice_type=InvoiceType.PLACEMENT,
        ).exclude(
            status=InvoiceStatus.CANCELLED
        ).first()
        if invoice:
            return float(invoice.subtotal)
        return None


class ReplacementRequestDetailSerializer(ReplacementRequestListSerializer):
    """Detailed serializer for a single replacement request.

    Inherits all fields from ReplacementRequestListSerializer including
    original_offer_details and original_start_date.
    """
    pass


class ReplacementRequestCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a replacement request."""
    class Meta:
        model = ReplacementRequest
        fields = [
            'application',
            'reason_category',
            'reason_details',
        ]

    def validate_application(self, value):
        """Validate that replacement can be requested for this application."""
        from jobs.models import ApplicationStatus

        # Check application status
        if value.status != ApplicationStatus.OFFER_ACCEPTED:
            raise serializers.ValidationError(
                "Replacement can only be requested for accepted offers."
            )

        # Check if already a replacement
        if value.is_replacement:
            raise serializers.ValidationError(
                "Cannot request replacement for a replacement hire."
            )

        # Check if replacement request already exists
        if hasattr(value, 'replacement_request'):
            raise serializers.ValidationError(
                "A replacement request already exists for this placement."
            )

        return value


class ReplacementApproveSerializer(serializers.Serializer):
    """Serializer for approving a replacement request."""
    approval_type = serializers.ChoiceField(
        choices=['free', 'discounted'],
        help_text="Type of approval: 'free' to credit original fee, 'discounted' for percentage off new fee"
    )
    discount_percentage = serializers.IntegerField(
        required=False,
        min_value=1,
        max_value=100,
        help_text="For 'free': credit percentage (1-100, default 100). For 'discounted': discount percentage (1-99)"
    )
    review_notes = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Notes explaining the approval decision"
    )

    def validate(self, data):
        approval_type = data['approval_type']
        percentage = data.get('discount_percentage')

        if approval_type == 'discounted':
            if not percentage:
                raise serializers.ValidationError({
                    'discount_percentage': 'Discount percentage is required for discounted approvals.'
                })
            if percentage >= 100:
                raise serializers.ValidationError({
                    'discount_percentage': 'Discount percentage must be less than 100. Use "free" for 100% credit.'
                })

        # For 'free', default to 100% if not provided
        if approval_type == 'free' and not percentage:
            data['discount_percentage'] = 100

        return data


class ReplacementRejectSerializer(serializers.Serializer):
    """Serializer for rejecting a replacement request."""
    review_notes = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Notes explaining the rejection reason"
    )


class ReplacementEligibilitySerializer(serializers.Serializer):
    """Serializer for replacement eligibility response."""
    eligible = serializers.BooleanField()
    reason = serializers.CharField(allow_null=True)
    replacement_period_days = serializers.IntegerField()
    start_date = serializers.DateField(allow_null=True)
    expiry_date = serializers.DateField(allow_null=True)
    days_remaining = serializers.IntegerField(allow_null=True)
    has_existing_request = serializers.BooleanField()
    existing_request_status = serializers.CharField(allow_null=True)
