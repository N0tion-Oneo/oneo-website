"""Serializers for BlogPost model."""
from rest_framework import serializers
from ..models import BlogPost, FAQ


def get_image_url(image_field, request):
    """Helper to get full URL for image fields."""
    if image_field:
        if request:
            return request.build_absolute_uri(image_field.url)
        return image_field.url
    return None


class EmbeddedFAQSerializer(serializers.ModelSerializer):
    """Minimal FAQ serializer for embedding in blog/glossary."""
    class Meta:
        model = FAQ
        fields = ['id', 'question', 'content', 'answer_plain']


class BlogPostListSerializer(serializers.ModelSerializer):
    """Minimal serializer for blog listings."""
    author_name = serializers.SerializerMethodField()
    featured_image = serializers.SerializerMethodField()

    class Meta:
        model = BlogPost
        fields = [
            'id', 'title', 'slug', 'excerpt', 'featured_image', 'featured_image_alt',
            'category', 'tags', 'is_featured', 'author_name', 'published_at', 'view_count',
        ]

    def get_author_name(self, obj):
        if obj.author:
            return obj.author.get_full_name() or obj.author.email
        return None

    def get_featured_image(self, obj):
        return get_image_url(obj.featured_image, self.context.get('request'))


class BlogPostDetailSerializer(serializers.ModelSerializer):
    """Full serializer for blog detail view."""
    author_name = serializers.SerializerMethodField()
    featured_image = serializers.SerializerMethodField()
    og_image = serializers.SerializerMethodField()
    faqs = EmbeddedFAQSerializer(many=True, read_only=True)
    faq_ids = serializers.SerializerMethodField()

    class Meta:
        model = BlogPost
        fields = [
            'id', 'title', 'slug', 'content', 'excerpt',
            'featured_image', 'featured_image_alt', 'category', 'tags',
            'meta_title', 'meta_description', 'og_image',
            'status', 'is_featured', 'author', 'author_name',
            'published_at', 'view_count', 'created_at', 'updated_at',
            'faqs', 'faq_ids',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'view_count']

    def get_faq_ids(self, obj):
        return list(obj.faqs.values_list('id', flat=True))

    def get_author_name(self, obj):
        if obj.author:
            return obj.author.get_full_name() or obj.author.email
        return None

    def get_featured_image(self, obj):
        return get_image_url(obj.featured_image, self.context.get('request'))

    def get_og_image(self, obj):
        return get_image_url(obj.og_image, self.context.get('request'))


class BlogPostCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating blog posts."""
    faq_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        write_only=True,
    )

    class Meta:
        model = BlogPost
        fields = [
            'title', 'slug', 'content', 'excerpt',
            'featured_image', 'featured_image_alt', 'category', 'tags',
            'meta_title', 'meta_description', 'og_image',
            'status', 'is_featured', 'published_at', 'faq_ids',
        ]

    def validate_slug(self, value):
        instance = self.instance
        if BlogPost.objects.filter(slug=value).exclude(pk=instance.pk if instance else None).exists():
            raise serializers.ValidationError("A blog post with this slug already exists.")
        return value

    def create(self, validated_data):
        faq_ids = validated_data.pop('faq_ids', [])
        post = super().create(validated_data)
        if faq_ids:
            post.faqs.set(FAQ.objects.filter(id__in=faq_ids, is_active=True))
        return post

    def update(self, instance, validated_data):
        faq_ids = validated_data.pop('faq_ids', None)
        post = super().update(instance, validated_data)
        if faq_ids is not None:
            post.faqs.set(FAQ.objects.filter(id__in=faq_ids, is_active=True))
        return post


class BlogPostPublicSerializer(serializers.ModelSerializer):
    """Serializer for public blog view (published posts only)."""
    author_name = serializers.SerializerMethodField()
    featured_image = serializers.SerializerMethodField()
    og_image = serializers.SerializerMethodField()
    faqs = serializers.SerializerMethodField()

    class Meta:
        model = BlogPost
        fields = [
            'id', 'title', 'slug', 'content', 'excerpt',
            'featured_image', 'featured_image_alt', 'category', 'tags',
            'meta_title', 'meta_description', 'og_image',
            'author_name', 'published_at', 'created_at', 'updated_at',
            'faqs',
        ]

    def get_author_name(self, obj):
        if obj.author:
            return obj.author.get_full_name() or obj.author.email
        return None

    def get_featured_image(self, obj):
        return get_image_url(obj.featured_image, self.context.get('request'))

    def get_og_image(self, obj):
        return get_image_url(obj.og_image, self.context.get('request'))

    def get_faqs(self, obj):
        """Return only active FAQs assigned to this post."""
        active_faqs = obj.faqs.filter(is_active=True)
        return EmbeddedFAQSerializer(active_faqs, many=True).data
