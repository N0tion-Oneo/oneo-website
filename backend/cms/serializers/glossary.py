"""Serializers for GlossaryTerm model."""
from rest_framework import serializers
from ..models import GlossaryTerm, FAQ


class EmbeddedFAQSerializer(serializers.ModelSerializer):
    """Minimal FAQ serializer for embedding in glossary terms."""
    class Meta:
        model = FAQ
        fields = ['id', 'question', 'content', 'answer_plain']


class GlossaryTermListSerializer(serializers.ModelSerializer):
    """Minimal serializer for glossary listings."""
    class Meta:
        model = GlossaryTerm
        fields = ['id', 'title', 'slug', 'definition_plain', 'is_active']


class GlossaryTermDetailSerializer(serializers.ModelSerializer):
    """Full serializer for glossary term detail."""
    related_terms = GlossaryTermListSerializer(many=True, read_only=True)
    faqs = EmbeddedFAQSerializer(many=True, read_only=True)
    faq_ids = serializers.SerializerMethodField()

    class Meta:
        model = GlossaryTerm
        fields = [
            'id', 'title', 'slug', 'content', 'definition_plain',
            'related_terms', 'meta_title', 'meta_description', 'og_image',
            'is_active', 'created_at', 'updated_at', 'faqs', 'faq_ids',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_faq_ids(self, obj):
        return list(obj.faqs.values_list('id', flat=True))


class GlossaryTermCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating glossary terms."""
    related_term_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        write_only=True,
    )
    faq_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        write_only=True,
    )

    class Meta:
        model = GlossaryTerm
        fields = [
            'title', 'slug', 'content', 'definition_plain',
            'related_term_ids', 'faq_ids', 'meta_title', 'meta_description', 'og_image', 'is_active',
        ]

    def validate_slug(self, value):
        instance = self.instance
        if GlossaryTerm.objects.filter(slug=value).exclude(pk=instance.pk if instance else None).exists():
            raise serializers.ValidationError("A glossary term with this slug already exists.")
        return value

    def create(self, validated_data):
        related_term_ids = validated_data.pop('related_term_ids', [])
        faq_ids = validated_data.pop('faq_ids', [])
        term = super().create(validated_data)
        if related_term_ids:
            term.related_terms.set(GlossaryTerm.objects.filter(id__in=related_term_ids))
        if faq_ids:
            term.faqs.set(FAQ.objects.filter(id__in=faq_ids, is_active=True))
        return term

    def update(self, instance, validated_data):
        related_term_ids = validated_data.pop('related_term_ids', None)
        faq_ids = validated_data.pop('faq_ids', None)
        term = super().update(instance, validated_data)
        if related_term_ids is not None:
            term.related_terms.set(GlossaryTerm.objects.filter(id__in=related_term_ids))
        if faq_ids is not None:
            term.faqs.set(FAQ.objects.filter(id__in=faq_ids, is_active=True))
        return term


class GlossaryTermPublicSerializer(serializers.ModelSerializer):
    """Serializer for public glossary view (active terms only)."""
    related_terms = serializers.SerializerMethodField()
    faqs = serializers.SerializerMethodField()

    class Meta:
        model = GlossaryTerm
        fields = [
            'title', 'slug', 'content', 'definition_plain',
            'related_terms', 'meta_title', 'meta_description', 'og_image',
            'faqs',
        ]

    def get_related_terms(self, obj):
        return [
            {'title': t.title, 'slug': t.slug}
            for t in obj.related_terms.filter(is_active=True)
        ]

    def get_faqs(self, obj):
        """Return only active FAQs assigned to this term."""
        active_faqs = obj.faqs.filter(is_active=True)
        return EmbeddedFAQSerializer(active_faqs, many=True).data
