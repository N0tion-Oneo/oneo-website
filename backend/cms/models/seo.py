"""SEO management models - Redirects and meta tags."""
import json
import os
import uuid
from django.db import models
from django.conf import settings


class RedirectType(models.TextChoices):
    PERMANENT = '301', '301 Permanent Redirect'
    TEMPORARY = '302', '302 Temporary Redirect'
    GONE = '410', '410 Gone (Deleted)'


class Redirect(models.Model):
    """
    URL redirects and gone markers for SEO.

    Manages 301/302 redirects for moved pages and 410 Gone for deleted pages.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    source_path = models.CharField(
        max_length=500,
        help_text="Path to redirect from (e.g., /old-page)"
    )
    destination_url = models.CharField(
        max_length=500,
        blank=True,
        default='',
        help_text="URL to redirect to (leave empty for 410 Gone)"
    )
    redirect_type = models.CharField(
        max_length=3,
        choices=RedirectType.choices,
        default=RedirectType.PERMANENT
    )
    is_active = models.BooleanField(default=True)
    is_regex = models.BooleanField(
        default=False,
        help_text="Treat source path as a regular expression"
    )
    # Track if this was auto-generated (e.g., from slug change)
    is_auto_generated = models.BooleanField(
        default=False,
        help_text="True if automatically created from slug change"
    )

    # Tracking
    hit_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'cms_redirects'
        ordering = ['source_path']
        unique_together = ['source_path']

    def __str__(self):
        if self.redirect_type == RedirectType.GONE:
            return f"{self.source_path} -> 410 Gone"
        return f"{self.source_path} -> {self.destination_url} ({self.redirect_type})"

    def increment_hits(self):
        self.hit_count += 1
        self.save(update_fields=['hit_count'])


class RobotsTxt(models.Model):
    """
    Robots.txt content management.

    Single instance model for managing robots.txt content.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    content = models.TextField(
        default="User-agent: *\nAllow: /\n\nSitemap: https://example.com/sitemap.xml",
        help_text="Content for robots.txt file"
    )

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'cms_robots_txt'
        verbose_name = 'Robots.txt'
        verbose_name_plural = 'Robots.txt'

    def save(self, *args, **kwargs):
        # Ensure only one instance exists
        if not self.pk and RobotsTxt.objects.exists():
            existing = RobotsTxt.objects.first()
            self.pk = existing.pk
        super().save(*args, **kwargs)

    @classmethod
    def get_content(cls):
        instance = cls.objects.first()
        if instance:
            return instance.content
        return "User-agent: *\nAllow: /"


class MetaTagDefaults(models.Model):
    """
    Default meta tags for pages without custom SEO settings.

    Single instance model for site-wide SEO defaults.
    Branding info (company_name, tagline) comes from BrandingSettings.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Default meta tags
    default_title_suffix = models.CharField(
        max_length=100,
        default=" | {{company_name}}",
        help_text="Appended to all page titles. Use {{company_name}} or {{tagline}} from Branding settings."
    )
    default_description = models.TextField(
        blank=True,
        help_text="Default meta description when page doesn't have one"
    )
    default_og_image = models.ImageField(
        upload_to='cms/seo/',
        blank=True,
        null=True,
        help_text="Default Open Graph image for social sharing"
    )

    # Verification codes
    google_site_verification = models.CharField(
        max_length=100,
        blank=True,
        help_text="Google Search Console verification code"
    )
    bing_site_verification = models.CharField(
        max_length=100,
        blank=True,
        help_text="Bing Webmaster Tools verification code"
    )

    # Analytics
    google_analytics_id = models.CharField(
        max_length=50,
        blank=True,
        help_text="Google Analytics measurement ID (e.g., G-XXXXXXXXXX)"
    )
    google_tag_manager_id = models.CharField(
        max_length=50,
        blank=True,
        help_text="Google Tag Manager container ID (e.g., GTM-XXXXXXX)"
    )

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'cms_meta_tag_defaults'
        verbose_name = 'Meta Tag Defaults'
        verbose_name_plural = 'Meta Tag Defaults'

    def save(self, *args, **kwargs):
        # Ensure only one instance exists
        if not self.pk and MetaTagDefaults.objects.exists():
            existing = MetaTagDefaults.objects.first()
            self.pk = existing.pk
        super().save(*args, **kwargs)


class PageSEO(models.Model):
    """
    SEO settings for specific routes/pages.

    Allows admins to configure SEO meta tags for any page in the application,
    including static pages like Home, Candidates, Companies, Jobs, etc.
    These settings are fetched by the frontend based on the current route.

    For wildcard routes (e.g., /jobs/*), supports programmatic SEO templates
    with variables like {{job.title}}, {{job.company_name}}, etc.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Route identification
    path = models.CharField(
        max_length=500,
        unique=True,
        help_text="URL path (e.g., '/', '/candidates', '/jobs'). Use '*' suffix for pattern matching (e.g., '/jobs/*')"
    )
    name = models.CharField(
        max_length=200,
        help_text="Friendly name for this page (e.g., 'Home Page', 'Candidates Directory')"
    )

    # SEO Meta Tags (static - for non-wildcard pages)
    title = models.CharField(
        max_length=200,
        blank=True,
        help_text="Page title (without suffix). Leave blank to use page name."
    )
    description = models.TextField(
        max_length=320,
        blank=True,
        help_text="Meta description for search engines (max 160 chars recommended)"
    )
    og_image = models.ImageField(
        upload_to='cms/seo/pages/',
        blank=True,
        null=True,
        help_text="Open Graph image for social sharing"
    )

    # Programmatic SEO Templates (for wildcard routes like /jobs/*)
    # These templates use variables like {{job.title}}, {{candidate.headline}}, etc.
    # Content-specific SEO (meta_title, meta_description) takes priority over templates
    title_template = models.CharField(
        max_length=300,
        blank=True,
        help_text="Template for dynamic titles. Use {{variable}} syntax. E.g., '{{job.title}} at {{job.company_name}}'"
    )
    description_template = models.TextField(
        max_length=500,
        blank=True,
        help_text="Template for dynamic descriptions. E.g., 'Apply for {{job.title}} at {{job.company_name}}. {{job.summary}}'"
    )

    # Additional SEO options
    noindex = models.BooleanField(
        default=False,
        help_text="Prevent search engines from indexing this page"
    )
    canonical_url = models.URLField(
        max_length=500,
        blank=True,
        help_text="Canonical URL if different from the page URL"
    )

    # Sitemap settings
    include_in_sitemap = models.BooleanField(
        default=True,
        help_text="Include this page in the sitemap"
    )
    sitemap_priority = models.DecimalField(
        max_digits=2,
        decimal_places=1,
        default=0.5,
        help_text="Priority in sitemap (0.0 to 1.0). Higher = more important."
    )

    # Status
    is_active = models.BooleanField(
        default=True,
        help_text="Enable SEO settings for this page"
    )

    # System page (auto-generated, cannot be deleted)
    is_system = models.BooleanField(
        default=False,
        help_text="System pages are auto-generated and cannot be deleted"
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'cms_page_seo'
        verbose_name = 'Page SEO'
        verbose_name_plural = 'Page SEO Settings'
        ordering = ['path']

    def __str__(self):
        return f"{self.name} ({self.path})"

    @property
    def og_image_url(self):
        if self.og_image:
            return self.og_image.url
        return None

    @classmethod
    def _load_seo_routes(cls):
        """
        Load SEO routes from the shared JSON file.
        This file is maintained in the frontend and shared with the backend.

        To add new pages:
        1. Add route to frontend/src/config/seoRoutes.ts
        2. Update shared/seo-routes.json
        3. Click "Sync Pages" in CMS > SEO > Page SEO
        """
        # Path to shared SEO routes JSON file
        json_path = os.path.join(settings.BASE_DIR, '..', 'shared', 'seo-routes.json')

        if not os.path.exists(json_path):
            # Fallback: return empty list if file doesn't exist
            return []

        with open(json_path, 'r') as f:
            routes = json.load(f)

        return routes

    @classmethod
    def sync_system_pages(cls):
        """
        Synchronize system pages from the shared SEO routes registry.
        Reads from shared/seo-routes.json which is maintained in the frontend.

        Creates new entries for pages that don't exist.
        Does NOT overwrite existing SEO settings (preserves admin customizations).
        Returns a tuple of (created_count, existing_count).
        """
        created = 0
        existing = 0

        routes = cls._load_seo_routes()

        for route in routes:
            path = route.get('path')
            name = route.get('name')
            description = route.get('description', '')
            priority = route.get('sitemapPriority', 0.5)
            include_sitemap = route.get('includeInSitemap', True)
            title_template = route.get('titleTemplate', '')
            description_template = route.get('descriptionTemplate', '')

            # For non-wildcard pages, use name as the SEO title
            # For wildcard pages (e.g., /jobs/*), leave title blank as they use templates
            is_wildcard = path.endswith('*')
            seo_title = '' if is_wildcard else name

            page, was_created = cls.objects.get_or_create(
                path=path,
                defaults={
                    'name': name,
                    'title': seo_title,
                    'description': description,
                    'sitemap_priority': priority,
                    'include_in_sitemap': include_sitemap,
                    'title_template': title_template,
                    'description_template': description_template,
                    'is_system': True,
                    'is_active': True,
                }
            )
            if was_created:
                created += 1
            else:
                # Update existing page if needed
                updates = []
                # Mark as system if it matches a system path
                if not page.is_system:
                    page.is_system = True
                    updates.append('is_system')
                # Fill in missing title for non-wildcard pages
                if not is_wildcard and not page.title and name:
                    page.title = name
                    updates.append('title')
                # Fill in missing description
                if not page.description and description:
                    page.description = description
                    updates.append('description')
                if updates:
                    page.save(update_fields=updates)
                existing += 1

        return created, existing
