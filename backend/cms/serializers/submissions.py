"""Serializers for NewsletterSubscriber model.

Note: Contact form submissions now use the Lead model (companies app).
See companies.serializers.ContactFormSerializer for the public form.
"""
from rest_framework import serializers
from ..models import NewsletterSubscriber


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
