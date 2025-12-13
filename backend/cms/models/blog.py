"""Blog posts and articles."""
import uuid
from django.db import models
from django.conf import settings
from .base import SluggedModel, SEOFields, PublishableModel, BlockContentModel


class BlogPost(SluggedModel, SEOFields, PublishableModel, BlockContentModel):
    """
    Blog articles and news posts.

    Time-based content with author, categories, and tags.
    Supports featured posts and view counting.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # URL prefix for automatic redirects
    URL_PREFIX = '/blog/'

    excerpt = models.TextField(blank=True, help_text="Short summary for listings")

    # Media
    featured_image = models.ImageField(upload_to='cms/blog/', blank=True, null=True)
    featured_image_alt = models.CharField(max_length=200, blank=True)

    # Categorization
    category = models.CharField(max_length=100, blank=True)
    tags = models.JSONField(default=list, blank=True)

    # Flags
    is_featured = models.BooleanField(default=False)

    # Author
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='cms_blog_posts',
    )

    # Analytics
    view_count = models.PositiveIntegerField(default=0)

    # Related FAQs for this blog post
    faqs = models.ManyToManyField(
        'FAQ',
        blank=True,
        related_name='blog_posts',
        help_text="FAQs to display on this blog post"
    )

    class Meta:
        db_table = 'cms_blog_posts'
        ordering = ['-published_at', '-created_at']

    def increment_views(self):
        self.view_count += 1
        self.save(update_fields=['view_count'])
