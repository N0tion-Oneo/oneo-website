"""Serializers for ContactSubmission and NewsletterSubscriber models."""
from rest_framework import serializers
from ..models import ContactSubmission, NewsletterSubscriber


class ContactSubmissionSerializer(serializers.ModelSerializer):
    """Full serializer for contact submissions (admin view)."""
    class Meta:
        model = ContactSubmission
        fields = [
            'id', 'name', 'email', 'phone', 'company',
            'subject', 'message', 'source_page',
            'is_read', 'is_replied', 'notes', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class ContactSubmissionCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating contact submissions (public form)."""
    class Meta:
        model = ContactSubmission
        fields = ['name', 'email', 'phone', 'company', 'subject', 'message', 'source_page']


class ContactSubmissionUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating contact submission status (admin)."""
    class Meta:
        model = ContactSubmission
        fields = ['is_read', 'is_replied', 'notes']


class NewsletterSubscriberSerializer(serializers.ModelSerializer):
    """Full serializer for newsletter subscribers (admin view)."""
    class Meta:
        model = NewsletterSubscriber
        fields = [
            'id', 'email', 'name', 'is_active',
            'confirmed_at', 'unsubscribed_at', 'source', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class NewsletterSubscribeSerializer(serializers.ModelSerializer):
    """Serializer for newsletter signup (public form)."""
    class Meta:
        model = NewsletterSubscriber
        fields = ['email', 'name', 'source']

    def validate_email(self, value):
        if NewsletterSubscriber.objects.filter(email=value, is_active=True).exists():
            raise serializers.ValidationError("This email is already subscribed.")
        return value
