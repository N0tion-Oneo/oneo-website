"""Site Settings serializers."""
from rest_framework import serializers
from cms.models import SiteSettings


class SiteSettingsSerializer(serializers.ModelSerializer):
    """Full site settings serializer for admin use."""

    class Meta:
        model = SiteSettings
        fields = [
            'id',
            # Analytics
            'ga_measurement_id',
            'gtm_container_id',
            'enable_analytics',
            # Robots.txt
            'robots_txt_content',
            # LLMs.txt
            'llms_txt_content',
            # Sitemap
            'sitemap_enabled',
            'sitemap_include_pages',
            'sitemap_include_blog',
            'sitemap_include_jobs',
            'sitemap_include_candidates',
            'sitemap_include_companies',
            'sitemap_include_glossary',
            'sitemap_include_case_studies',
            # Site meta
            'site_name',
            'site_url',
            'site_description',
            # Timestamps
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class AnalyticsSettingsSerializer(serializers.ModelSerializer):
    """Analytics-specific settings serializer."""

    class Meta:
        model = SiteSettings
        fields = [
            'ga_measurement_id',
            'gtm_container_id',
            'enable_analytics',
        ]


class RobotsTxtSerializer(serializers.ModelSerializer):
    """Robots.txt settings serializer."""

    class Meta:
        model = SiteSettings
        fields = ['robots_txt_content']


class LLMsTxtSerializer(serializers.ModelSerializer):
    """LLMs.txt settings serializer."""

    class Meta:
        model = SiteSettings
        fields = ['llms_txt_content']


class SitemapSettingsSerializer(serializers.ModelSerializer):
    """Sitemap configuration serializer."""

    class Meta:
        model = SiteSettings
        fields = [
            'sitemap_enabled',
            'sitemap_include_pages',
            'sitemap_include_blog',
            'sitemap_include_jobs',
            'sitemap_include_candidates',
            'sitemap_include_companies',
            'sitemap_include_glossary',
            'sitemap_include_case_studies',
            'site_url',
        ]


class PublicAnalyticsSettingsSerializer(serializers.ModelSerializer):
    """Public analytics settings (for frontend to load GA)."""

    class Meta:
        model = SiteSettings
        fields = [
            'ga_measurement_id',
            'gtm_container_id',
            'enable_analytics',
        ]
