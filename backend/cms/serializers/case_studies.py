"""Serializers for CaseStudy model."""
from rest_framework import serializers
from ..models import CaseStudy
from .base import get_image_url


class CaseStudyListSerializer(serializers.ModelSerializer):
    """Minimal serializer for case study listings."""
    featured_image = serializers.SerializerMethodField()
    client_logo = serializers.SerializerMethodField()

    class Meta:
        model = CaseStudy
        fields = [
            'id', 'title', 'slug', 'excerpt', 'client_name', 'industry',
            'featured_image', 'client_logo', 'is_featured', 'status', 'published_at',
        ]

    def get_featured_image(self, obj):
        return get_image_url(obj.featured_image, self.context.get('request'))

    def get_client_logo(self, obj):
        return get_image_url(obj.client_logo, self.context.get('request'))


class CaseStudyDetailSerializer(serializers.ModelSerializer):
    """Full serializer for case study detail."""
    featured_image = serializers.SerializerMethodField()
    client_logo = serializers.SerializerMethodField()
    og_image = serializers.SerializerMethodField()

    class Meta:
        model = CaseStudy
        fields = [
            'id', 'title', 'slug', 'content', 'excerpt',
            'client_name', 'industry', 'highlights',
            'featured_image', 'client_logo',
            'testimonial_quote', 'testimonial_author', 'testimonial_role',
            'meta_title', 'meta_description', 'og_image',
            'status', 'is_featured', 'published_at', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_featured_image(self, obj):
        return get_image_url(obj.featured_image, self.context.get('request'))

    def get_client_logo(self, obj):
        return get_image_url(obj.client_logo, self.context.get('request'))

    def get_og_image(self, obj):
        return get_image_url(obj.og_image, self.context.get('request'))


class CaseStudyCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating case studies."""
    class Meta:
        model = CaseStudy
        fields = [
            'title', 'slug', 'content', 'excerpt',
            'client_name', 'industry', 'highlights',
            'featured_image', 'client_logo',
            'testimonial_quote', 'testimonial_author', 'testimonial_role',
            'meta_title', 'meta_description', 'og_image',
            'status', 'is_featured', 'published_at',
        ]

    def validate_slug(self, value):
        instance = self.instance
        if CaseStudy.objects.filter(slug=value).exclude(pk=instance.pk if instance else None).exists():
            raise serializers.ValidationError("A case study with this slug already exists.")
        return value


class CaseStudyPublicSerializer(serializers.ModelSerializer):
    """Serializer for public case study view (published only)."""
    featured_image = serializers.SerializerMethodField()
    client_logo = serializers.SerializerMethodField()
    og_image = serializers.SerializerMethodField()

    class Meta:
        model = CaseStudy
        fields = [
            'title', 'slug', 'content', 'excerpt',
            'client_name', 'industry', 'highlights',
            'featured_image', 'client_logo',
            'testimonial_quote', 'testimonial_author', 'testimonial_role',
            'meta_title', 'meta_description', 'og_image', 'published_at',
        ]

    def get_featured_image(self, obj):
        return get_image_url(obj.featured_image, self.context.get('request'))

    def get_client_logo(self, obj):
        return get_image_url(obj.client_logo, self.context.get('request'))

    def get_og_image(self, obj):
        return get_image_url(obj.og_image, self.context.get('request'))
