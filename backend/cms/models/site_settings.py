"""Site Settings model for global CMS configuration."""
import uuid
from django.db import models
from .base import TimestampedModel


class SiteSettings(TimestampedModel):
    """
    Singleton model for site-wide settings.
    Stores configuration for analytics, robots.txt, llms.txt, and sitemap.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Analytics Settings
    ga_measurement_id = models.CharField(
        max_length=50,
        blank=True,
        help_text="Google Analytics 4 Measurement ID (e.g., G-XXXXXXXXXX)"
    )
    gtm_container_id = models.CharField(
        max_length=50,
        blank=True,
        help_text="Google Tag Manager Container ID (e.g., GTM-XXXXXXX)"
    )
    enable_analytics = models.BooleanField(
        default=True,
        help_text="Enable/disable analytics tracking globally"
    )

    # Robots.txt Settings
    robots_txt_content = models.TextField(
        blank=True,
        default="""User-agent: *
Allow: /
Allow: /jobs
Allow: /candidates
Allow: /companies
Allow: /blog
Allow: /pages
Allow: /contact

Disallow: /dashboard
Disallow: /api
Disallow: /login
Disallow: /signup
Disallow: /settings

Sitemap: https://oneo.com/sitemap.xml""",
        help_text="Content of robots.txt file"
    )

    # LLMs.txt Settings
    llms_txt_content = models.TextField(
        blank=True,
        help_text="Content of llms.txt file for AI/LLM agents"
    )

    # Sitemap Settings
    sitemap_enabled = models.BooleanField(default=True)
    sitemap_include_pages = models.BooleanField(default=True)
    sitemap_include_blog = models.BooleanField(default=True)
    sitemap_include_jobs = models.BooleanField(default=True)
    sitemap_include_candidates = models.BooleanField(default=True)
    sitemap_include_companies = models.BooleanField(default=True)
    sitemap_include_glossary = models.BooleanField(default=True)
    sitemap_include_case_studies = models.BooleanField(default=True)

    # Site Meta Info (used in sitemap, structured data, etc.)
    site_name = models.CharField(max_length=100, default="Oneo")
    site_url = models.URLField(default="https://oneo.com")
    site_description = models.TextField(
        blank=True,
        default="Oneo is a modern recruitment platform that connects talented candidates with great companies."
    )

    class Meta:
        verbose_name = "Site Settings"
        verbose_name_plural = "Site Settings"

    def __str__(self):
        return "Site Settings"

    def save(self, *args, **kwargs):
        # Ensure only one instance exists (singleton pattern)
        if not self.pk and SiteSettings.objects.exists():
            # Update existing instance instead
            existing = SiteSettings.objects.first()
            self.pk = existing.pk
        super().save(*args, **kwargs)

    @classmethod
    def get_settings(cls):
        """Get or create the singleton settings instance."""
        settings, _ = cls.objects.get_or_create(pk=cls.objects.first().pk if cls.objects.exists() else None)
        return settings
