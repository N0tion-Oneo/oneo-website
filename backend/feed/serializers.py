"""Serializers for Feed models."""
from rest_framework import serializers
from django.contrib.contenttypes.models import ContentType
from .models import FeedPost, PostType, PostStatus, Comment


def get_image_url(image_field, request):
    """Helper to get full URL for image fields."""
    if image_field:
        if request:
            return request.build_absolute_uri(image_field.url)
        return image_field.url
    return None


class CompanyEmbedSerializer(serializers.Serializer):
    """Minimal company info for feed posts."""
    id = serializers.UUIDField(read_only=True)
    name = serializers.CharField(read_only=True)
    slug = serializers.CharField(read_only=True)
    logo = serializers.SerializerMethodField()

    def get_logo(self, obj):
        if obj.logo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.logo.url)
            return obj.logo.url
        return None


class AuthorEmbedSerializer(serializers.Serializer):
    """Minimal author info for feed posts."""
    id = serializers.UUIDField(read_only=True)
    full_name = serializers.CharField(read_only=True)
    role = serializers.CharField(read_only=True)


class JobEmbedSerializer(serializers.Serializer):
    """Minimal job info for job announcements."""
    id = serializers.UUIDField(read_only=True)
    title = serializers.CharField(read_only=True)
    slug = serializers.CharField(read_only=True)
    seniority = serializers.CharField(read_only=True)
    job_type = serializers.CharField(read_only=True)
    work_mode = serializers.CharField(read_only=True)
    location_display = serializers.SerializerMethodField()
    salary_display = serializers.SerializerMethodField()

    def get_location_display(self, obj):
        parts = []
        if obj.location_city:
            parts.append(obj.location_city.name if hasattr(obj.location_city, 'name') else str(obj.location_city))
        if obj.location_country:
            parts.append(obj.location_country.name if hasattr(obj.location_country, 'name') else str(obj.location_country))
        return ', '.join(parts) if parts else None

    def get_salary_display(self, obj):
        if not obj.salary_visible:
            return None
        if obj.salary_min and obj.salary_max:
            return f"{obj.salary_currency} {obj.salary_min:,} - {obj.salary_max:,}"
        elif obj.salary_min:
            return f"{obj.salary_currency} {obj.salary_min:,}+"
        return None


class FeedPostListSerializer(serializers.ModelSerializer):
    """Serializer for feed list view."""
    company = CompanyEmbedSerializer(read_only=True)
    author = AuthorEmbedSerializer(read_only=True)
    job = JobEmbedSerializer(read_only=True)
    featured_image = serializers.SerializerMethodField()
    excerpt = serializers.CharField(read_only=True)
    post_type_display = serializers.CharField(source='get_post_type_display', read_only=True)
    comment_count = serializers.SerializerMethodField()

    class Meta:
        model = FeedPost
        fields = [
            'id', 'post_type', 'post_type_display', 'title', 'content', 'excerpt',
            'featured_image', 'featured_image_alt',
            'company', 'author', 'job',
            'status', 'published_at', 'created_at',
            'comment_count',
        ]

    def get_featured_image(self, obj):
        return get_image_url(obj.featured_image, self.context.get('request'))

    def get_comment_count(self, obj):
        # Use annotated value if available (from list_feed), otherwise fall back to property
        if hasattr(obj, '_comment_count') and obj._comment_count is not None:
            return obj._comment_count
        return obj.comment_count


class FeedPostDetailSerializer(serializers.ModelSerializer):
    """Full serializer for feed post detail."""
    company = CompanyEmbedSerializer(read_only=True)
    author = AuthorEmbedSerializer(read_only=True)
    job = JobEmbedSerializer(read_only=True)
    featured_image = serializers.SerializerMethodField()
    post_type_display = serializers.CharField(source='get_post_type_display', read_only=True)

    class Meta:
        model = FeedPost
        fields = [
            'id', 'post_type', 'post_type_display', 'title', 'content', 'content_blocks',
            'featured_image', 'featured_image_alt',
            'company', 'author', 'job',
            'status', 'published_at', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_featured_image(self, obj):
        return get_image_url(obj.featured_image, self.context.get('request'))


class FeedPostCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating feed posts."""
    company_id = serializers.UUIDField(write_only=True, required=False)

    class Meta:
        model = FeedPost
        fields = [
            'post_type', 'title', 'content', 'content_blocks',
            'featured_image', 'featured_image_alt',
            'status', 'published_at', 'company_id',
        ]

    def validate(self, data):
        post_type = data.get('post_type', PostType.UPDATE)

        # Articles require a title
        if post_type == PostType.ARTICLE and not data.get('title'):
            raise serializers.ValidationError({
                'title': 'Title is required for articles.'
            })

        # Updates require content
        if post_type == PostType.UPDATE and not data.get('content'):
            raise serializers.ValidationError({
                'content': 'Content is required for quick updates.'
            })

        return data

    def create(self, validated_data):
        company_id = validated_data.pop('company_id', None)
        if company_id:
            from companies.models import Company
            validated_data['company'] = Company.objects.get(id=company_id)
        return super().create(validated_data)


class FeedPostUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating feed posts."""

    class Meta:
        model = FeedPost
        fields = [
            'title', 'content', 'content_blocks',
            'featured_image', 'featured_image_alt',
            'status', 'published_at',
        ]

    def validate(self, data):
        instance = self.instance
        post_type = instance.post_type if instance else data.get('post_type')

        # Articles require a title
        if post_type == PostType.ARTICLE:
            title = data.get('title', getattr(instance, 'title', ''))
            if not title:
                raise serializers.ValidationError({
                    'title': 'Title is required for articles.'
                })

        return data


# =============================================================================
# Comment Serializers
# =============================================================================

class CommentAuthorSerializer(serializers.Serializer):
    """Minimal author info for comments."""
    id = serializers.UUIDField(read_only=True)
    full_name = serializers.CharField(read_only=True)
    role = serializers.CharField(read_only=True)


class CommentSerializer(serializers.ModelSerializer):
    """Serializer for comment list/detail views."""
    author = CommentAuthorSerializer(read_only=True)
    reply_count = serializers.IntegerField(read_only=True)
    replies = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = [
            'id', 'content', 'author', 'parent',
            'reply_count', 'replies',
            'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'author', 'is_active', 'created_at', 'updated_at']

    def get_replies(self, obj):
        """Get nested replies (only 1 level deep to avoid infinite recursion)."""
        if obj.parent is not None:
            # Don't nest replies of replies
            return []
        replies = obj.replies.filter(is_active=True).select_related('author')[:5]
        return CommentSerializer(replies, many=True, context=self.context).data


class CommentCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating comments."""
    content_type = serializers.CharField(write_only=True)
    object_id = serializers.UUIDField(write_only=True)

    class Meta:
        model = Comment
        fields = ['content', 'parent', 'content_type', 'object_id']

    def validate_content_type(self, value):
        """Validate content_type and convert to ContentType instance."""
        # Accept format: "app_label.model_name" e.g., "feed.feedpost"
        try:
            app_label, model = value.lower().split('.')
            ct = ContentType.objects.get(app_label=app_label, model=model)
            return ct
        except (ValueError, ContentType.DoesNotExist):
            raise serializers.ValidationError(
                f"Invalid content_type: {value}. Use format 'app_label.model_name'"
            )

    def validate(self, data):
        # Verify the object exists
        content_type = data['content_type']
        object_id = data['object_id']

        model_class = content_type.model_class()
        if not model_class.objects.filter(pk=object_id).exists():
            raise serializers.ValidationError({
                'object_id': f"Object with id {object_id} does not exist."
            })

        # If replying to a comment, verify parent is for same object
        parent = data.get('parent')
        if parent:
            if parent.content_type != content_type or parent.object_id != object_id:
                raise serializers.ValidationError({
                    'parent': "Parent comment must be on the same object."
                })

        return data

    def create(self, validated_data):
        validated_data['author'] = self.context['request'].user
        return super().create(validated_data)


class CommentUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating comments (content only)."""

    class Meta:
        model = Comment
        fields = ['content']
