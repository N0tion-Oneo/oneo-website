from rest_framework import serializers
from .models import BrandingSettings


class BrandingSettingsSerializer(serializers.ModelSerializer):
    """Serializer for branding settings."""
    has_social_links = serializers.SerializerMethodField()
    # Effective URLs (file upload takes precedence over URL)
    effective_logo_url = serializers.SerializerMethodField()
    effective_logo_dark_url = serializers.SerializerMethodField()
    effective_favicon_url = serializers.SerializerMethodField()

    class Meta:
        model = BrandingSettings
        fields = [
            'id',
            # Company Info
            'company_name',
            'tagline',
            # Logo - Files
            'logo',
            'logo_dark',
            'favicon',
            # Logo - URL fallbacks
            'logo_url',
            'logo_dark_url',
            'favicon_url',
            # Effective URLs (computed)
            'effective_logo_url',
            'effective_logo_dark_url',
            'effective_favicon_url',
            # Typography
            'font_family',
            # Primary Colors
            'primary_color',
            'primary_color_dark',
            'primary_color_light',
            # Secondary Colors
            'secondary_color',
            'secondary_color_dark',
            'secondary_color_light',
            # Accent Colors
            'accent_color',
            'accent_color_dark',
            'accent_color_light',
            # Status Colors
            'success_color',
            'warning_color',
            'error_color',
            # Email settings
            'email_background_color',
            'email_header_background',
            'email_footer_text',
            # Social Links
            'website_url',
            'facebook_url',
            'twitter_url',
            'linkedin_url',
            'instagram_url',
            'has_social_links',
            # Contact
            'support_email',
            'contact_phone',
            'address',
            # Legal
            'privacy_policy_url',
            'terms_of_service_url',
            # Advanced
            'custom_css',
            # Email Template
            'email_base_template',
            # Meta
            'updated_at',
        ]
        read_only_fields = [
            'id', 'updated_at', 'has_social_links',
            'effective_logo_url', 'effective_logo_dark_url', 'effective_favicon_url',
        ]

    def get_has_social_links(self, obj):
        return obj.has_social_links()

    def get_effective_logo_url(self, obj):
        return obj.effective_logo_url

    def get_effective_logo_dark_url(self, obj):
        return obj.effective_logo_dark_url

    def get_effective_favicon_url(self, obj):
        return obj.effective_favicon_url


class BrandingSettingsUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating branding settings."""
    # Allow clearing file fields by sending null
    logo = serializers.ImageField(required=False, allow_null=True)
    logo_dark = serializers.ImageField(required=False, allow_null=True)
    favicon = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = BrandingSettings
        fields = [
            # Company Info
            'company_name',
            'tagline',
            # Logo - Files
            'logo',
            'logo_dark',
            'favicon',
            # Logo - URL fallbacks
            'logo_url',
            'logo_dark_url',
            'favicon_url',
            # Typography
            'font_family',
            # Primary Colors
            'primary_color',
            'primary_color_dark',
            'primary_color_light',
            # Secondary Colors
            'secondary_color',
            'secondary_color_dark',
            'secondary_color_light',
            # Accent Colors
            'accent_color',
            'accent_color_dark',
            'accent_color_light',
            # Status Colors
            'success_color',
            'warning_color',
            'error_color',
            # Email settings
            'email_background_color',
            'email_header_background',
            'email_footer_text',
            # Social Links
            'website_url',
            'facebook_url',
            'twitter_url',
            'linkedin_url',
            'instagram_url',
            # Contact
            'support_email',
            'contact_phone',
            'address',
            # Legal
            'privacy_policy_url',
            'terms_of_service_url',
            # Advanced
            'custom_css',
            # Email Template
            'email_base_template',
        ]

    def validate_primary_color(self, value):
        """Validate hex color format."""
        if value and not value.startswith('#'):
            raise serializers.ValidationError("Color must be a hex value starting with #")
        if value and len(value) != 7:
            raise serializers.ValidationError("Color must be in format #RRGGBB")
        return value

    validate_primary_color_dark = validate_primary_color
    validate_primary_color_light = validate_primary_color
    validate_secondary_color = validate_primary_color
    validate_secondary_color_dark = validate_primary_color
    validate_secondary_color_light = validate_primary_color
    validate_accent_color = validate_primary_color
    validate_accent_color_dark = validate_primary_color
    validate_accent_color_light = validate_primary_color
    validate_success_color = validate_primary_color
    validate_warning_color = validate_primary_color
    validate_error_color = validate_primary_color
    validate_email_background_color = validate_primary_color
    validate_email_header_background = validate_primary_color

    def update(self, instance, validated_data):
        """Handle file field clearing when null is sent."""
        # Handle clearing file fields
        for field in ['logo', 'logo_dark', 'favicon']:
            if field in validated_data and validated_data[field] is None:
                # Clear the existing file
                current_file = getattr(instance, field)
                if current_file:
                    current_file.delete(save=False)
                validated_data[field] = None

        return super().update(instance, validated_data)


class PublicBrandingSerializer(serializers.ModelSerializer):
    """Public-facing branding info (no sensitive data)."""
    # Use effective URLs that check file uploads first
    logo_url = serializers.SerializerMethodField()
    logo_dark_url = serializers.SerializerMethodField()
    favicon_url = serializers.SerializerMethodField()

    class Meta:
        model = BrandingSettings
        fields = [
            'company_name',
            'tagline',
            'logo_url',
            'logo_dark_url',
            'favicon_url',
            'font_family',
            # Primary Colors
            'primary_color',
            'primary_color_dark',
            'primary_color_light',
            # Secondary Colors
            'secondary_color',
            'secondary_color_dark',
            'secondary_color_light',
            # Accent Colors
            'accent_color',
            'accent_color_dark',
            'accent_color_light',
            # Status Colors
            'success_color',
            'warning_color',
            'error_color',
            # Links
            'website_url',
            'privacy_policy_url',
            'terms_of_service_url',
        ]

    def get_logo_url(self, obj):
        return obj.effective_logo_url

    def get_logo_dark_url(self, obj):
        return obj.effective_logo_dark_url

    def get_favicon_url(self, obj):
        return obj.effective_favicon_url
