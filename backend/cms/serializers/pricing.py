"""Pricing Configuration serializers."""
from rest_framework import serializers
from cms.models import PricingConfig, PricingFeature


class PricingConfigSerializer(serializers.ModelSerializer):
    """Full pricing config serializer for admin and public use."""
    updated_by_name = serializers.SerializerMethodField()

    class Meta:
        model = PricingConfig
        fields = [
            'id',
            # Enterprise pricing
            'enterprise_markup_year1',
            'enterprise_markup_year2',
            'enterprise_markup_year3',
            'enterprise_markup_year4_plus',
            'enterprise_additionals_fee',
            'enterprise_assets_fee',
            # EOR pricing
            'eor_monthly_fee',
            'eor_additionals_fee',
            'eor_assets_fee',
            # Retained pricing
            'retained_monthly_retainer',
            'retained_placement_fee',
            # Headhunting pricing
            'headhunting_placement_fee',
            # Default calculator values
            'default_salary',
            'default_desk_fee',
            'default_lunch_fee',
            'default_event_cost',
            'default_party_cost',
            'default_asset_cost',
            # Audit
            'updated_at',
            'updated_by_name',
        ]
        read_only_fields = ['id', 'updated_at', 'updated_by_name']

    def get_updated_by_name(self, obj):
        if obj.updated_by:
            return f"{obj.updated_by.first_name} {obj.updated_by.last_name}".strip() or obj.updated_by.email
        return None


class PricingConfigUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating pricing config."""

    class Meta:
        model = PricingConfig
        fields = [
            # Enterprise pricing
            'enterprise_markup_year1',
            'enterprise_markup_year2',
            'enterprise_markup_year3',
            'enterprise_markup_year4_plus',
            'enterprise_additionals_fee',
            'enterprise_assets_fee',
            # EOR pricing
            'eor_monthly_fee',
            'eor_additionals_fee',
            'eor_assets_fee',
            # Retained pricing
            'retained_monthly_retainer',
            'retained_placement_fee',
            # Headhunting pricing
            'headhunting_placement_fee',
            # Default calculator values
            'default_salary',
            'default_desk_fee',
            'default_lunch_fee',
            'default_event_cost',
            'default_party_cost',
            'default_asset_cost',
        ]


class PricingFeatureSerializer(serializers.ModelSerializer):
    """Serializer for pricing features."""

    class Meta:
        model = PricingFeature
        fields = [
            'id',
            'name',
            'category',
            'order',
            'is_active',
            'included_in_enterprise',
            'included_in_eor',
            'included_in_retained',
            'included_in_headhunting',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class PricingFeatureCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating pricing features."""

    class Meta:
        model = PricingFeature
        fields = [
            'name',
            'category',
            'order',
            'is_active',
            'included_in_enterprise',
            'included_in_eor',
            'included_in_retained',
            'included_in_headhunting',
        ]


class PricingFeatureReorderSerializer(serializers.Serializer):
    """Serializer for reordering features."""
    feature_ids = serializers.ListField(
        child=serializers.UUIDField(),
        help_text="Ordered list of feature IDs"
    )
