"""Legal documents (Terms & Conditions, Privacy Policy, etc.)."""
import uuid
from django.db import models
from django.conf import settings
from .base import SluggedModel, SEOFields, PublishableModel, BlockContentModel


class LegalDocumentType(models.TextChoices):
    TERMS = 'terms', 'Terms & Conditions'
    PRIVACY = 'privacy', 'Privacy Policy'
    COOKIES = 'cookies', 'Cookie Policy'
    ACCEPTABLE_USE = 'acceptable_use', 'Acceptable Use Policy'
    OTHER = 'other', 'Other Legal Document'


class Page(SluggedModel, SEOFields, PublishableModel, BlockContentModel):
    """
    Legal documents like Terms & Conditions, Privacy Policy, etc.

    These are single-instance pages identified by slug (e.g., /terms, /privacy).
    Content is managed via Editor.js block editor.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # URL prefix for automatic redirects
    URL_PREFIX = '/legal/'

    document_type = models.CharField(
        max_length=20,
        choices=LegalDocumentType.choices,
        default=LegalDocumentType.OTHER,
    )

    # Version tracking for legal documents
    version = models.CharField(max_length=20, blank=True, help_text="e.g., 1.0, 2.1")
    effective_date = models.DateField(null=True, blank=True, help_text="When this version takes effect")

    # Tracking
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='cms_pages_created',
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='cms_pages_updated',
    )

    class Meta:
        db_table = 'cms_pages'
        ordering = ['title']
