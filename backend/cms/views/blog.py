"""Views for BlogPost model."""
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiParameter

from users.models import UserRole
from ..models import BlogPost, ContentStatus
from ..serializers import (
    BlogPostListSerializer,
    BlogPostDetailSerializer,
    BlogPostCreateUpdateSerializer,
    BlogPostPublicSerializer,
)


def is_staff_user(user):
    return user.role in [UserRole.ADMIN, UserRole.RECRUITER]


# =============================================================================
# Admin/Staff Endpoints
# =============================================================================

@extend_schema(
    responses={200: BlogPostListSerializer(many=True)},
    tags=['CMS - Blog (Admin)'],
    parameters=[
        OpenApiParameter(name='category', description='Filter by category', required=False, type=str),
        OpenApiParameter(name='status', description='Filter by status', required=False, type=str),
        OpenApiParameter(name='is_featured', description='Filter by featured', required=False, type=bool),
    ],
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_blog_posts(request):
    """List all blog posts (admin/staff only)."""
    if not is_staff_user(request.user):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    posts = BlogPost.objects.all()

    category = request.query_params.get('category')
    if category:
        posts = posts.filter(category=category)

    status_filter = request.query_params.get('status')
    if status_filter:
        posts = posts.filter(status=status_filter)

    is_featured = request.query_params.get('is_featured')
    if is_featured is not None:
        posts = posts.filter(is_featured=is_featured.lower() == 'true')

    serializer = BlogPostListSerializer(posts, many=True, context={'request': request})
    return Response(serializer.data)


@extend_schema(
    responses={200: BlogPostDetailSerializer},
    tags=['CMS - Blog (Admin)'],
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_blog_post(request, post_id):
    """Get blog post by ID (admin/staff only)."""
    if not is_staff_user(request.user):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    try:
        post = BlogPost.objects.get(id=post_id)
    except BlogPost.DoesNotExist:
        return Response({'error': 'Blog post not found'}, status=status.HTTP_404_NOT_FOUND)

    serializer = BlogPostDetailSerializer(post, context={'request': request})
    return Response(serializer.data)


@extend_schema(
    request=BlogPostCreateUpdateSerializer,
    responses={201: BlogPostDetailSerializer},
    tags=['CMS - Blog (Admin)'],
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_blog_post(request):
    """Create a new blog post (admin/staff only)."""
    if not is_staff_user(request.user):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    serializer = BlogPostCreateUpdateSerializer(data=request.data)
    if serializer.is_valid():
        post = serializer.save(author=request.user)
        if post.status == ContentStatus.PUBLISHED and not post.published_at:
            post.published_at = timezone.now()
            post.save()
        return Response(BlogPostDetailSerializer(post, context={'request': request}).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    request=BlogPostCreateUpdateSerializer,
    responses={200: BlogPostDetailSerializer},
    tags=['CMS - Blog (Admin)'],
)
@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def update_blog_post(request, post_id):
    """Update a blog post (admin/staff only)."""
    if not is_staff_user(request.user):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    try:
        post = BlogPost.objects.get(id=post_id)
    except BlogPost.DoesNotExist:
        return Response({'error': 'Blog post not found'}, status=status.HTTP_404_NOT_FOUND)

    serializer = BlogPostCreateUpdateSerializer(
        post, data=request.data, partial=request.method == 'PATCH'
    )
    if serializer.is_valid():
        post = serializer.save()
        if post.status == ContentStatus.PUBLISHED and not post.published_at:
            post.published_at = timezone.now()
            post.save()
        return Response(BlogPostDetailSerializer(post, context={'request': request}).data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    responses={204: None},
    tags=['CMS - Blog (Admin)'],
)
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_blog_post(request, post_id):
    """Delete a blog post (admin/staff only)."""
    if not is_staff_user(request.user):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    try:
        post = BlogPost.objects.get(id=post_id)
    except BlogPost.DoesNotExist:
        return Response({'error': 'Blog post not found'}, status=status.HTTP_404_NOT_FOUND)

    post.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# =============================================================================
# Public Endpoints
# =============================================================================

@extend_schema(
    responses={200: BlogPostPublicSerializer(many=True)},
    tags=['CMS - Blog (Public)'],
    parameters=[
        OpenApiParameter(name='category', description='Filter by category', required=False, type=str),
        OpenApiParameter(name='tag', description='Filter by tag', required=False, type=str),
        OpenApiParameter(name='featured', description='Only featured posts', required=False, type=bool),
    ],
)
@api_view(['GET'])
@permission_classes([AllowAny])
def list_public_blog_posts(request):
    """List published blog posts (public)."""
    posts = BlogPost.objects.filter(status=ContentStatus.PUBLISHED)

    category = request.query_params.get('category')
    if category:
        posts = posts.filter(category=category)

    tag = request.query_params.get('tag')
    if tag:
        posts = posts.filter(tags__contains=[tag])

    featured = request.query_params.get('featured')
    if featured is not None:
        posts = posts.filter(is_featured=featured.lower() == 'true')

    serializer = BlogPostPublicSerializer(posts, many=True, context={'request': request})
    return Response(serializer.data)


@extend_schema(
    responses={200: BlogPostPublicSerializer},
    tags=['CMS - Blog (Public)'],
    parameters=[
        OpenApiParameter(name='preview', description='Preview mode (staff only)', required=False, type=bool),
    ],
)
@api_view(['GET'])
@permission_classes([AllowAny])
def get_public_blog_post(request, slug):
    """Get blog post by slug. Preview mode allows staff to view unpublished posts."""
    preview = request.query_params.get('preview', '').lower() == 'true'

    # Preview mode - staff can view any status
    if preview:
        if not request.user.is_authenticated or not is_staff_user(request.user):
            return Response({'error': 'Preview requires staff authentication'}, status=status.HTTP_403_FORBIDDEN)
        try:
            post = BlogPost.objects.get(slug=slug)
        except BlogPost.DoesNotExist:
            return Response({'error': 'Blog post not found'}, status=status.HTTP_404_NOT_FOUND)
    else:
        # Public mode - only published posts
        try:
            post = BlogPost.objects.get(slug=slug, status=ContentStatus.PUBLISHED)
        except BlogPost.DoesNotExist:
            return Response({'error': 'Blog post not found'}, status=status.HTTP_404_NOT_FOUND)
        post.increment_views()

    serializer = BlogPostPublicSerializer(post, context={'request': request})
    return Response(serializer.data)


@extend_schema(
    responses={200: dict},
    tags=['CMS - Blog (Public)'],
)
@api_view(['GET'])
@permission_classes([AllowAny])
def get_blog_categories(request):
    """Get list of blog categories with post counts."""
    posts = BlogPost.objects.filter(status=ContentStatus.PUBLISHED)
    categories = posts.values_list('category', flat=True).distinct()
    result = []
    for cat in categories:
        if cat:
            count = posts.filter(category=cat).count()
            result.append({'name': cat, 'count': count})
    return Response(result)
