"""Feed models for private content stream."""
import uuid
from django.db import models
from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.utils import timezone


class PostType(models.TextChoices):
    """Types of feed posts."""
    ARTICLE = 'article', 'Article'
    UPDATE = 'update', 'Quick Update'
    JOB_ANNOUNCEMENT = 'job_announcement', 'Job Announcement'


class PostStatus(models.TextChoices):
    """Publishing status for feed posts."""
    DRAFT = 'draft', 'Draft'
    PUBLISHED = 'published', 'Published'


class FeedPost(models.Model):
    """
    Unified feed post model for all content types.

    Supports:
    - Articles: Long-form content with Editor.js blocks
    - Quick Updates: Short status-like posts
    - Job Announcements: Auto-generated when jobs are published
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Author & Company
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='feed_posts',
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='feed_posts',
    )

    # Content type
    post_type = models.CharField(
        max_length=20,
        choices=PostType.choices,
        default=PostType.UPDATE,
    )

    # Content fields
    title = models.CharField(
        max_length=200,
        blank=True,
        help_text='Required for articles, optional for updates',
    )
    content = models.TextField(
        blank=True,
        help_text='Plain text for updates (max ~500 chars recommended)',
    )
    content_blocks = models.JSONField(
        null=True,
        blank=True,
        help_text='Editor.js JSON blocks for articles',
    )

    # Media
    featured_image = models.ImageField(
        upload_to='feed/',
        blank=True,
        null=True,
    )
    featured_image_alt = models.CharField(
        max_length=200,
        blank=True,
    )

    # For job announcements
    job = models.ForeignKey(
        'jobs.Job',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='feed_posts',
        help_text='Linked job for job_announcement posts',
    )

    # Publishing
    status = models.CharField(
        max_length=20,
        choices=PostStatus.choices,
        default=PostStatus.DRAFT,
    )
    published_at = models.DateTimeField(null=True, blank=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'feed_posts'
        ordering = ['-published_at', '-created_at']
        indexes = [
            models.Index(fields=['-published_at', '-created_at']),
            models.Index(fields=['company', '-published_at']),
            models.Index(fields=['post_type', '-published_at']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        if self.title:
            return f"{self.get_post_type_display()}: {self.title}"
        return f"{self.get_post_type_display()} by {self.company.name}"

    def save(self, *args, **kwargs):
        # Auto-set published_at when publishing
        if self.status == PostStatus.PUBLISHED and not self.published_at:
            self.published_at = timezone.now()
        super().save(*args, **kwargs)

    @property
    def is_published(self):
        return self.status == PostStatus.PUBLISHED

    @property
    def excerpt(self):
        """Generate excerpt from content."""
        if self.post_type == PostType.UPDATE:
            return self.content[:200] if self.content else ''
        elif self.content_blocks:
            # Extract text from first paragraph block
            for block in self.content_blocks.get('blocks', []):
                if block.get('type') == 'paragraph':
                    text = block.get('data', {}).get('text', '')
                    return text[:200] if text else ''
        return ''

    @property
    def comment_count(self):
        """Get the number of comments on this post."""
        ct = ContentType.objects.get_for_model(self.__class__)
        return Comment.objects.filter(
            content_type=ct,
            object_id=self.id,
            is_active=True
        ).count()


class Comment(models.Model):
    """
    Universal comment model using GenericForeignKey.

    Can be attached to any model (FeedPost, BlogPost, CaseStudy, etc.)
    by using content_type and object_id.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Generic relation fields
    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        related_name='comments',
    )
    object_id = models.UUIDField()
    content_object = GenericForeignKey('content_type', 'object_id')

    # Author
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='feed_comments',
    )

    # Content
    content = models.TextField(
        help_text='Comment text (max 1000 chars recommended)',
    )

    # Threading
    parent = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='replies',
        help_text='Parent comment for threaded replies',
    )

    # Status
    is_active = models.BooleanField(
        default=True,
        help_text='Soft delete flag - inactive comments are hidden',
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'feed_comments'
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['content_type', 'object_id']),
            models.Index(fields=['author', '-created_at']),
            models.Index(fields=['parent']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return f"Comment by {self.author} on {self.content_type.model}"

    @property
    def reply_count(self):
        """Get the number of active replies to this comment."""
        return self.replies.filter(is_active=True).count()
