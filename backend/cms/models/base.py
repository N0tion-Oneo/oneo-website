"""Abstract base models for CMS content types."""
import uuid
from django.db import models
from django.utils.text import slugify


class ContentStatus(models.TextChoices):
    DRAFT = 'draft', 'Draft'
    PUBLISHED = 'published', 'Published'
    ARCHIVED = 'archived', 'Archived'


class TimestampedModel(models.Model):
    """Adds created_at and updated_at timestamps."""
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class SluggedModel(TimestampedModel):
    """Adds title and auto-generated unique slug with automatic redirect on change."""
    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=200, unique=True)

    # URL prefix for automatic redirects (override in subclass)
    URL_PREFIX = ''

    class Meta:
        abstract = True

    def __str__(self):
        return self.title

    def generate_unique_slug(self, source_field='title'):
        source = getattr(self, source_field)
        base_slug = slugify(source)
        slug = base_slug
        counter = 1
        while self.__class__.objects.filter(slug=slug).exclude(pk=self.pk).exists():
            slug = f"{base_slug}-{counter}"
            counter += 1
        return slug

    def save(self, *args, **kwargs):
        # Track slug changes for automatic redirects
        old_slug = None
        if self.pk:
            try:
                old_instance = self.__class__.objects.get(pk=self.pk)
                old_slug = old_instance.slug
            except self.__class__.DoesNotExist:
                pass

        if not self.slug:
            self.slug = self.generate_unique_slug()

        super().save(*args, **kwargs)

        # Create automatic redirect if slug changed
        if old_slug and old_slug != self.slug and self.URL_PREFIX:
            self._create_slug_redirect(old_slug)

    def _create_slug_redirect(self, old_slug):
        """Create a 301 redirect from old slug to new slug."""
        from .seo import Redirect, RedirectType
        from ..middleware import RedirectMiddleware

        old_path = f"{self.URL_PREFIX}{old_slug}"
        new_path = f"{self.URL_PREFIX}{self.slug}"

        # Check if redirect already exists for this source
        existing = Redirect.objects.filter(source_path=old_path).first()
        if existing:
            # Update existing redirect to point to new location
            existing.destination_url = new_path
            existing.is_auto_generated = True
            existing.save()
        else:
            # Create new redirect
            Redirect.objects.create(
                source_path=old_path,
                destination_url=new_path,
                redirect_type=RedirectType.PERMANENT,
                is_active=True,
                is_auto_generated=True,
            )

        # Clear redirect cache
        RedirectMiddleware.clear_cache()


class SEOFields(models.Model):
    """Adds SEO-related fields."""
    meta_title = models.CharField(max_length=70, blank=True, help_text="SEO title (max 70 chars)")
    meta_description = models.CharField(max_length=160, blank=True, help_text="SEO description (max 160 chars)")
    og_image = models.ImageField(upload_to='cms/og/', blank=True, null=True)

    class Meta:
        abstract = True


class PublishableModel(models.Model):
    """Adds publishing status and date."""
    status = models.CharField(
        max_length=20,
        choices=ContentStatus.choices,
        default=ContentStatus.DRAFT,
    )
    published_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        abstract = True

    @property
    def is_published(self):
        return self.status == ContentStatus.PUBLISHED


class BlockContentModel(models.Model):
    """Adds Editor.js block content field."""
    content = models.JSONField(default=dict, blank=True, help_text="Editor.js JSON blocks")

    class Meta:
        abstract = True
