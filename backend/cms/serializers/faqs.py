"""Serializers for FAQ and FAQCategory models."""
from rest_framework import serializers
from ..models import FAQ, FAQCategory


class FAQCategorySerializer(serializers.ModelSerializer):
    """Serializer for FAQ categories."""
    faq_count = serializers.SerializerMethodField()

    class Meta:
        model = FAQCategory
        fields = ['id', 'name', 'slug', 'description', 'order', 'is_active', 'faq_count']
        read_only_fields = ['id']

    def get_faq_count(self, obj):
        return obj.faqs.filter(is_active=True).count()


class FAQCategoryCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating FAQ categories."""
    class Meta:
        model = FAQCategory
        fields = ['name', 'slug', 'description', 'order', 'is_active']


class FAQSerializer(serializers.ModelSerializer):
    """Full serializer for FAQs."""
    category_name = serializers.SerializerMethodField()

    class Meta:
        model = FAQ
        fields = [
            'id', 'question', 'content', 'answer_plain',
            'category', 'category_name', 'order',
            'is_active', 'is_featured', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_category_name(self, obj):
        return obj.category.name if obj.category else None


class FAQCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating FAQs."""
    class Meta:
        model = FAQ
        fields = [
            'question', 'content', 'answer_plain',
            'category', 'order', 'is_active', 'is_featured',
        ]


class FAQPublicSerializer(serializers.ModelSerializer):
    """Serializer for public FAQ view (active FAQs only)."""
    category_name = serializers.SerializerMethodField()

    class Meta:
        model = FAQ
        fields = ['id', 'question', 'content', 'category', 'category_name', 'order']

    def get_category_name(self, obj):
        return obj.category.name if obj.category else None


class FAQCategoryWithFAQsSerializer(serializers.ModelSerializer):
    """Category with nested FAQs for grouped display."""
    faqs = FAQPublicSerializer(many=True, source='active_faqs')

    class Meta:
        model = FAQCategory
        fields = ['id', 'name', 'slug', 'description', 'order', 'faqs']

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        ret['faqs'] = FAQPublicSerializer(
            instance.faqs.filter(is_active=True).order_by('order'),
            many=True
        ).data
        return ret
