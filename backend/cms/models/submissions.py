"""Form submissions (newsletter only - contact form now uses Lead model)."""
import uuid
from django.db import models
from .base import TimestampedModel


class NewsletterSubscriber(TimestampedModel):
    """
    Newsletter subscriber.

    Tracks email signups from footer/newsletter forms.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    email = models.EmailField(unique=True)
    name = models.CharField(max_length=200, blank=True)

    # Status
    is_active = models.BooleanField(default=True)
    confirmed_at = models.DateTimeField(null=True, blank=True)
    unsubscribed_at = models.DateTimeField(null=True, blank=True)

    # Source tracking
    source = models.CharField(max_length=100, blank=True, help_text="Where they signed up")

    class Meta:
        db_table = 'cms_newsletter_subscribers'
        ordering = ['-created_at']

    def __str__(self):
        return self.email
