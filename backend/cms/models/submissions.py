"""Form submissions (contact form, newsletter)."""
import uuid
from django.db import models
from .base import TimestampedModel


class ContactSubmission(TimestampedModel):
    """
    Contact form submission.

    Stores messages from the public contact form.
    Admin can mark as read/replied and add notes.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Contact info
    name = models.CharField(max_length=200)
    email = models.EmailField()
    phone = models.CharField(max_length=50, blank=True)
    company = models.CharField(max_length=200, blank=True)

    # Message
    subject = models.CharField(max_length=200, blank=True)
    message = models.TextField()

    # Tracking
    source_page = models.CharField(max_length=200, blank=True, help_text="Page where form was submitted")

    # Admin status
    is_read = models.BooleanField(default=False)
    is_replied = models.BooleanField(default=False)
    notes = models.TextField(blank=True, help_text="Internal notes")

    class Meta:
        db_table = 'cms_contact_submissions'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} - {self.subject or 'No subject'}"


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
