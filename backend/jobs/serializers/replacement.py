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


class ReplacementRequestDetailSerializer(ReplacementRequestListSerializer):
    """Detailed serializer for a single replacement request."""
    original_offer_details = serializers.JSONField(source='application.final_offer_details', read_only=True)
    original_start_date = serializers.SerializerMethodField()

    class Meta(ReplacementRequestListSerializer.Meta):
        fields = ReplacementRequestListSerializer.Meta.fields + [
            'original_offer_details',
            'original_start_date',
        ]

    def get_original_start_date(self, obj):
        """Get the start date from offer details."""
        offer = obj.application.final_offer_details or obj.application.offer_details or {}
        return offer.get('start_date')


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
        help_text="Type of approval: 'free' for 100% discount, 'discounted' for partial discount"
    )
    discount_percentage = serializers.IntegerField(
        required=False,
        min_value=1,
        max_value=99,
        help_text="Discount percentage (required if approval_type is 'discounted')"
    )
    review_notes = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Notes explaining the approval decision"
    )

    def validate(self, data):
        if data['approval_type'] == 'discounted' and not data.get('discount_percentage'):
            raise serializers.ValidationError({
                'discount_percentage': 'Discount percentage is required for discounted approvals.'
            })
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
