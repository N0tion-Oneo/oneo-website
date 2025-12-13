"""FAQs and FAQ categories."""
import uuid
from django.db import models
from django.utils.text import slugify
from .base import TimestampedModel, BlockContentModel


class FAQCategory(TimestampedModel):
    """
    Category for grouping related FAQs.

    FAQs are displayed grouped by category in accordion format.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'cms_faq_categories'
        ordering = ['order', 'name']
        verbose_name_plural = 'FAQ Categories'

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class FAQ(TimestampedModel, BlockContentModel):
    """
    Frequently Asked Question.

    Question with rich-text answer (Editor.js blocks).
    Can be categorized and ordered within category.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    question = models.CharField(max_length=500)
    # 'content' field from BlockContentModel stores the answer
    answer_plain = models.TextField(blank=True, help_text="Plain text for SEO/search")

    # Organization
    category = models.ForeignKey(
        FAQCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='faqs',
    )
    order = models.PositiveIntegerField(default=0)

    # Status
    is_active = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False, help_text="Show in highlights/homepage")

    class Meta:
        db_table = 'cms_faqs'
        ordering = ['category__order', 'order']
        verbose_name = 'FAQ'
        verbose_name_plural = 'FAQs'

    def __str__(self):
        return self.question[:100]
