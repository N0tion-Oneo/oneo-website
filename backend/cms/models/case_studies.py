"""Case studies and success stories."""
import uuid
from django.db import models
from .base import SluggedModel, SEOFields, PublishableModel, BlockContentModel


class CaseStudy(SluggedModel, SEOFields, PublishableModel, BlockContentModel):
    """
    Case study showcasing successful placement/partnership.

    Portfolio content with metrics, testimonials, and client info.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # URL prefix for automatic redirects
    URL_PREFIX = '/case-studies/'

    excerpt = models.TextField(blank=True, help_text="Short summary for listings")

    # Client info
    client_name = models.CharField(max_length=200, blank=True, help_text="Can be anonymized")
    industry = models.CharField(max_length=100, blank=True)

    # Key metrics/achievements
    highlights = models.JSONField(
        default=list,
        blank=True,
        help_text="Key metrics as [{label: string, value: string}]"
    )

    # Media
    featured_image = models.ImageField(upload_to='cms/case-studies/', blank=True, null=True)
    client_logo = models.ImageField(upload_to='cms/case-studies/logos/', blank=True, null=True)

    # Testimonial
    testimonial_quote = models.TextField(blank=True)
    testimonial_author = models.CharField(max_length=200, blank=True)
    testimonial_role = models.CharField(max_length=200, blank=True)

    # Flags
    is_featured = models.BooleanField(default=False)

    class Meta:
        db_table = 'cms_case_studies'
        ordering = ['-published_at', '-created_at']
        verbose_name_plural = 'Case Studies'
