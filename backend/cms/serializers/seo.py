"""Serializers for SEO models."""
from rest_framework import serializers
from ..models import Redirect, MetaTagDefaults, PageSEO
from branding.models import BrandingSettings


class RedirectSerializer(serializers.ModelSerializer):
    """Serializer for URL redirects."""

    class Meta:
        model = Redirect
        fields = [
            'id', 'source_path', 'destination_url', 'redirect_type',
            'is_active', 'is_regex', 'is_auto_generated',
            'hit_count', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'hit_count', 'created_at', 'updated_at']

    def validate_source_path(self, value):
        # Ensure source path starts with /
        if not value.startswith('/'):
            value = '/' + value
        # Check for duplicates
        instance = self.instance
        if Redirect.objects.filter(source_path=value).exclude(pk=instance.pk if instance else None).exists():
            raise serializers.ValidationError("A redirect with this source path already exists.")
        return value

    def validate(self, data):
        """Validate that 301/302 have destination, 410 doesn't need one."""
        redirect_type = data.get('redirect_type', self.instance.redirect_type if self.instance else '301')
        destination = data.get('destination_url', self.instance.destination_url if self.instance else '')

        if redirect_type in ['301', '302'] and not destination:
            raise serializers.ValidationError({
                'destination_url': 'Destination URL is required for redirects.'
            })

        return data


class MetaTagDefaultsSerializer(serializers.ModelSerializer):
    """Serializer for default meta tag settings."""
    default_og_image_url = serializers.SerializerMethodField()
    resolved_title_suffix = serializers.SerializerMethodField()
    # Branding fields pulled from BrandingSettings (read-only in this serializer)
    company_name = serializers.SerializerMethodField()
    tagline = serializers.SerializerMethodField()
    # Override to preserve leading/trailing whitespace in title suffix
    default_title_suffix = serializers.CharField(
        max_length=100,
        required=False,
        allow_blank=True,
        trim_whitespace=False,
        help_text="Appended to all page titles. Use {{company_name}} or {{tagline}} from Branding settings."
    )

    class Meta:
        model = MetaTagDefaults
        fields = [
            'id', 'company_name', 'tagline',
            'default_title_suffix', 'resolved_title_suffix', 'default_description',
            'default_og_image', 'default_og_image_url',
            'google_site_verification', 'bing_site_verification',
            'google_analytics_id', 'google_tag_manager_id',
            'updated_at',
        ]
        read_only_fields = ['id', 'updated_at', 'default_og_image_url', 'resolved_title_suffix', 'company_name', 'tagline']

    def _get_branding(self):
        """Get branding settings (cached per request)."""
        if not hasattr(self, '_branding_cache'):
            self._branding_cache = BrandingSettings.get_settings()
        return self._branding_cache

    def get_company_name(self, obj):
        """Get company name from BrandingSettings."""
        return self._get_branding().company_name

    def get_tagline(self, obj):
        """Get tagline from BrandingSettings."""
        return self._get_branding().tagline

    def get_default_og_image_url(self, obj):
        if obj.default_og_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.default_og_image.url)
            return obj.default_og_image.url
        return None

    def get_resolved_title_suffix(self, obj):
        """Return the title suffix with variables replaced from BrandingSettings."""
        branding = self._get_branding()
        suffix = obj.default_title_suffix or ''
        suffix = suffix.replace('{{company_name}}', branding.company_name or '')
        suffix = suffix.replace('{{tagline}}', branding.tagline or '')
        return suffix


class PageSEOSerializer(serializers.ModelSerializer):
    """Serializer for page-specific SEO settings."""
    og_image_url = serializers.SerializerMethodField()

    class Meta:
        model = PageSEO
        fields = [
            'id', 'path', 'name', 'title', 'description',
            'og_image', 'og_image_url',
            'title_template', 'description_template',
            'noindex', 'canonical_url',
            'include_in_sitemap', 'sitemap_priority',
            'is_active', 'is_system', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'og_image_url', 'is_system', 'created_at', 'updated_at']

    def get_og_image_url(self, obj):
        if obj.og_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.og_image.url)
            return obj.og_image.url
        return None

    def validate_path(self, value):
        # Ensure path starts with /
        if not value.startswith('/'):
            value = '/' + value
        # Check for duplicates
        instance = self.instance
        if PageSEO.objects.filter(path=value).exclude(pk=instance.pk if instance else None).exists():
            raise serializers.ValidationError("A page SEO entry with this path already exists.")
        return value


class PageSEOPublicSerializer(serializers.ModelSerializer):
    """Public serializer for page SEO (only returns active entries)."""
    og_image_url = serializers.SerializerMethodField()

    class Meta:
        model = PageSEO
        fields = [
            'path', 'title', 'description', 'og_image_url',
            'title_template', 'description_template',
            'noindex', 'canonical_url',
        ]

    def get_og_image_url(self, obj):
        if obj.og_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.og_image.url)
            return obj.og_image.url
        return None
