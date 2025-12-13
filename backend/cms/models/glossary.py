"""Glossary terms and definitions."""
import uuid
from django.db import models
from .base import SluggedModel, SEOFields, BlockContentModel


class GlossaryTerm(SluggedModel, SEOFields, BlockContentModel):
    """
    Glossary term with definition.

    Reference content for industry terminology.
    Supports cross-linking between related terms.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # URL prefix for automatic redirects
    URL_PREFIX = '/glossary/'

    # 'content' field from BlockContentModel stores the definition
    definition_plain = models.TextField(blank=True, help_text="Plain text for SEO/search")

    # Related terms for cross-linking
    related_terms = models.ManyToManyField('self', blank=True, symmetrical=True)

    # Status
    is_active = models.BooleanField(default=True)

    # Related FAQs for this glossary term
    faqs = models.ManyToManyField(
        'FAQ',
        blank=True,
        related_name='glossary_terms',
        help_text="FAQs to display on this glossary term"
    )

    class Meta:
        db_table = 'cms_glossary_terms'
        ordering = ['title']

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = self.generate_unique_slug('title')
        super().save(*args, **kwargs)
