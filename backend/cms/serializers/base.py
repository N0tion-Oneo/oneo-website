"""Base serializers for CMS."""
from rest_framework import serializers


def get_image_url(image_field, request):
    """Helper to get full URL for image fields."""
    if image_field:
        if request:
            return request.build_absolute_uri(image_field.url)
        return image_field.url
    return None


class SEOFieldsMixin(serializers.Serializer):
    """Mixin for SEO fields."""
    meta_title = serializers.CharField(max_length=70, required=False, allow_blank=True)
    meta_description = serializers.CharField(max_length=160, required=False, allow_blank=True)
    og_image = serializers.ImageField(required=False, allow_null=True)


class TimestampsMixin(serializers.Serializer):
    """Mixin for timestamp fields (read-only)."""
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)
