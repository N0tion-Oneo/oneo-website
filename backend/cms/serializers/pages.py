"""Serializers for Legal Document (Page) model."""
from rest_framework import serializers
from ..models import Page


class LegalDocumentListSerializer(serializers.ModelSerializer):
    """Minimal serializer for legal document listings."""
    class Meta:
        model = Page
        fields = ['id', 'title', 'slug', 'document_type', 'service_type', 'status', 'version', 'effective_date', 'updated_at']


class LegalDocumentDetailSerializer(serializers.ModelSerializer):
    """Full serializer for legal document detail view."""
    created_by_name = serializers.SerializerMethodField()
    updated_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Page
        fields = [
            'id', 'title', 'slug', 'document_type', 'service_type', 'content',
            'version', 'effective_date',
            'meta_title', 'meta_description', 'og_image',
            'status', 'published_at',
            'created_by', 'created_by_name', 'updated_by', 'updated_by_name',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by', 'updated_by']

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.email
        return None

    def get_updated_by_name(self, obj):
        if obj.updated_by:
            return obj.updated_by.get_full_name() or obj.updated_by.email
        return None


class LegalDocumentCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating legal documents."""
    class Meta:
        model = Page
        fields = [
            'title', 'slug', 'document_type', 'service_type', 'content',
            'version', 'effective_date',
            'meta_title', 'meta_description', 'og_image',
            'status', 'published_at',
        ]

    def validate_slug(self, value):
        instance = self.instance
        if Page.objects.filter(slug=value).exclude(pk=instance.pk if instance else None).exists():
            raise serializers.ValidationError("A document with this slug already exists.")
        return value


class LegalDocumentPublicSerializer(serializers.ModelSerializer):
    """Serializer for public legal document view (published pages only)."""
    class Meta:
        model = Page
        fields = [
            'title', 'slug', 'document_type', 'service_type', 'content',
            'version', 'effective_date',
            'meta_title', 'meta_description', 'og_image', 'published_at',
        ]


# Keep old names as aliases for backwards compatibility
PageListSerializer = LegalDocumentListSerializer
PageDetailSerializer = LegalDocumentDetailSerializer
PageCreateUpdateSerializer = LegalDocumentCreateUpdateSerializer
PagePublicSerializer = LegalDocumentPublicSerializer
