"""Views for Feed API."""
from django.utils import timezone
from django.db.models import Count, Q, OuterRef, Subquery
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from drf_spectacular.utils import extend_schema, OpenApiParameter

from django.contrib.contenttypes.models import ContentType
from users.models import UserRole
from companies.models import CompanyUser, CompanyUserRole
from .models import FeedPost, PostStatus, PostType, Comment
from .serializers import (
    FeedPostListSerializer,
    FeedPostDetailSerializer,
    FeedPostCreateSerializer,
    FeedPostUpdateSerializer,
    CommentSerializer,
    CommentCreateSerializer,
    CommentUpdateSerializer,
)


class FeedPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 50


def is_staff_user(user):
    """Check if user is admin or recruiter."""
    return user.role in [UserRole.ADMIN, UserRole.RECRUITER]


def is_client_user(user):
    """Check if user is a client."""
    return user.role == UserRole.CLIENT


def get_user_company(user):
    """Get the company associated with a client user."""
    membership = user.company_memberships.select_related('company').first()
    return membership.company if membership else None


def can_user_create_post(user, company=None):
    """Check if user can create a post for a company."""
    # Staff can create posts for any company
    if is_staff_user(user):
        return True

    # Clients can only create for their own company
    if is_client_user(user):
        user_company = get_user_company(user)
        if user_company and (company is None or company.id == user_company.id):
            # Check if user has editor or admin role in company
            membership = user.company_memberships.filter(company=user_company).first()
            if membership and membership.role in [CompanyUserRole.ADMIN, CompanyUserRole.EDITOR]:
                return True

    return False


def can_user_edit_post(user, post):
    """Check if user can edit a specific post."""
    # Staff can edit any post
    if is_staff_user(user):
        return True

    # Author can edit their own posts
    if post.author_id == user.id:
        return True

    # Client company admins/editors can edit company posts
    if is_client_user(user):
        user_company = get_user_company(user)
        if user_company and post.company_id == user_company.id:
            membership = user.company_memberships.filter(company=user_company).first()
            if membership and membership.role in [CompanyUserRole.ADMIN, CompanyUserRole.EDITOR]:
                return True

    return False


def can_user_delete_post(user, post):
    """Check if user can delete a specific post."""
    # Staff can delete any post
    if is_staff_user(user):
        return True

    # Author can delete their own posts
    if post.author_id == user.id:
        return True

    # Client company admins can delete company posts
    if is_client_user(user):
        user_company = get_user_company(user)
        if user_company and post.company_id == user_company.id:
            membership = user.company_memberships.filter(company=user_company).first()
            if membership and membership.role == CompanyUserRole.ADMIN:
                return True

    return False


# =============================================================================
# Feed List/Read Endpoints (All Authenticated Users)
# =============================================================================

@extend_schema(
    parameters=[
        OpenApiParameter(name='post_type', description='Filter by post type (article, update, job_announcement)', type=str),
        OpenApiParameter(name='company', description='Filter by company ID', type=str),
        OpenApiParameter(name='page', description='Page number', type=int),
        OpenApiParameter(name='page_size', description='Number of items per page (max 50)', type=int),
    ],
    responses={200: FeedPostListSerializer(many=True)},
    tags=['Feed'],
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_feed(request):
    """
    List published feed posts.

    All authenticated users can view the feed.
    Supports filtering by post_type and company.
    """
    # Get ContentType for FeedPost to count comments
    feedpost_ct = ContentType.objects.get_for_model(FeedPost)

    # Build comment count subquery (use different name to avoid conflict with model property)
    comment_count_subquery = Comment.objects.filter(
        content_type=feedpost_ct,
        object_id=OuterRef('id'),
        is_active=True
    ).values('object_id').annotate(count=Count('id')).values('count')

    posts = FeedPost.objects.filter(
        status=PostStatus.PUBLISHED
    ).select_related('company', 'author', 'job').annotate(
        _comment_count=Subquery(comment_count_subquery)
    ).order_by('-published_at', '-created_at')

    # Apply filters
    post_type = request.query_params.get('post_type')
    if post_type:
        posts = posts.filter(post_type=post_type)

    company_id = request.query_params.get('company')
    if company_id:
        posts = posts.filter(company_id=company_id)

    # Paginate
    paginator = FeedPagination()
    page = paginator.paginate_queryset(posts, request)

    serializer = FeedPostListSerializer(page, many=True, context={'request': request})
    return paginator.get_paginated_response(serializer.data)


@extend_schema(
    responses={200: FeedPostDetailSerializer},
    tags=['Feed'],
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_feed_post(request, post_id):
    """Get a single feed post by ID."""
    try:
        post = FeedPost.objects.select_related('company', 'author', 'job').get(
            id=post_id,
            status=PostStatus.PUBLISHED
        )
    except FeedPost.DoesNotExist:
        return Response({'error': 'Post not found'}, status=status.HTTP_404_NOT_FOUND)

    serializer = FeedPostDetailSerializer(post, context={'request': request})
    return Response(serializer.data)


# =============================================================================
# Create/Update/Delete Endpoints (Clients & Staff)
# =============================================================================

@extend_schema(
    request=FeedPostCreateSerializer,
    responses={201: FeedPostDetailSerializer},
    tags=['Feed'],
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_feed_post(request):
    """
    Create a new feed post.

    - Staff can create posts for any company (or their associated company)
    - Clients can only create posts for their own company
    """
    # Determine company
    company_id = request.data.get('company_id')
    company = None

    if company_id:
        from companies.models import Company
        try:
            company = Company.objects.get(id=company_id)
        except Company.DoesNotExist:
            return Response({'error': 'Company not found'}, status=status.HTTP_404_NOT_FOUND)
    elif is_client_user(request.user):
        company = get_user_company(request.user)
        if not company:
            return Response(
                {'error': 'No company associated with your account'},
                status=status.HTTP_400_BAD_REQUEST
            )
    elif is_staff_user(request.user):
        # Staff can use their associated company if they have one
        company = get_user_company(request.user)
        if not company:
            # For staff without a company, try to get the platform company
            from companies.models import Company
            company = Company.objects.filter(is_platform=True).first()
            if not company:
                # Fallback to first company if no platform company exists
                company = Company.objects.first()

    if not company:
        return Response(
            {'error': 'Company is required. Please create a company first or provide company_id.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Check permissions
    if not can_user_create_post(request.user, company):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    serializer = FeedPostCreateSerializer(data=request.data)
    if serializer.is_valid():
        post = serializer.save(author=request.user, company=company)

        # Auto-set published_at if publishing
        if post.status == PostStatus.PUBLISHED and not post.published_at:
            post.published_at = timezone.now()
            post.save()

        return Response(
            FeedPostDetailSerializer(post, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    request=FeedPostUpdateSerializer,
    responses={200: FeedPostDetailSerializer},
    tags=['Feed'],
)
@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_feed_post(request, post_id):
    """
    Update a feed post.

    - Staff can edit any post
    - Authors can edit their own posts
    - Client company admins/editors can edit company posts
    """
    try:
        post = FeedPost.objects.select_related('company', 'author').get(id=post_id)
    except FeedPost.DoesNotExist:
        return Response({'error': 'Post not found'}, status=status.HTTP_404_NOT_FOUND)

    # Job announcements cannot be edited
    if post.post_type == PostType.JOB_ANNOUNCEMENT:
        return Response(
            {'error': 'Job announcements cannot be edited'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Check permissions
    if not can_user_edit_post(request.user, post):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    serializer = FeedPostUpdateSerializer(post, data=request.data, partial=True)
    if serializer.is_valid():
        post = serializer.save()

        # Auto-set published_at if transitioning to published
        if post.status == PostStatus.PUBLISHED and not post.published_at:
            post.published_at = timezone.now()
            post.save()

        return Response(
            FeedPostDetailSerializer(post, context={'request': request}).data
        )

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    responses={204: None},
    tags=['Feed'],
)
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_feed_post(request, post_id):
    """
    Delete a feed post.

    - Staff can delete any post
    - Authors can delete their own posts
    - Client company admins can delete company posts
    """
    try:
        post = FeedPost.objects.get(id=post_id)
    except FeedPost.DoesNotExist:
        return Response({'error': 'Post not found'}, status=status.HTTP_404_NOT_FOUND)

    # Check permissions
    if not can_user_delete_post(request.user, post):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    post.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# =============================================================================
# My Posts (for clients to see their company's posts)
# =============================================================================

@extend_schema(
    parameters=[
        OpenApiParameter(name='status', description='Filter by status (draft, published)', type=str),
    ],
    responses={200: FeedPostListSerializer(many=True)},
    tags=['Feed'],
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_my_posts(request):
    """
    List posts for the current user's company (clients) or all posts (staff).

    Includes drafts for editing purposes.
    """
    if is_staff_user(request.user):
        # Staff see all posts
        posts = FeedPost.objects.select_related('company', 'author', 'job').all()
    elif is_client_user(request.user):
        # Clients see their company's posts
        company = get_user_company(request.user)
        if not company:
            return Response({'error': 'No company associated'}, status=status.HTTP_400_BAD_REQUEST)
        posts = FeedPost.objects.filter(company=company).select_related('company', 'author', 'job')
    else:
        # Candidates don't have posts
        return Response([])

    # Apply status filter
    status_filter = request.query_params.get('status')
    if status_filter:
        posts = posts.filter(status=status_filter)

    posts = posts.order_by('-created_at')

    serializer = FeedPostListSerializer(posts, many=True, context={'request': request})
    return Response(serializer.data)


@extend_schema(
    responses={200: FeedPostDetailSerializer},
    tags=['Feed'],
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_my_post(request, post_id):
    """
    Get a single post for editing (includes drafts).

    Staff can access any post, clients only their company's posts.
    """
    try:
        post = FeedPost.objects.select_related('company', 'author', 'job').get(id=post_id)
    except FeedPost.DoesNotExist:
        return Response({'error': 'Post not found'}, status=status.HTTP_404_NOT_FOUND)

    # Check access
    if not is_staff_user(request.user):
        if is_client_user(request.user):
            user_company = get_user_company(request.user)
            if not user_company or post.company_id != user_company.id:
                return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        else:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    serializer = FeedPostDetailSerializer(post, context={'request': request})
    return Response(serializer.data)


# =============================================================================
# Comment Endpoints
# =============================================================================

class CommentPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 50


@extend_schema(
    parameters=[
        OpenApiParameter(name='content_type', description='Content type (e.g., feed.feedpost)', type=str, required=True),
        OpenApiParameter(name='object_id', description='Object ID (UUID)', type=str, required=True),
        OpenApiParameter(name='page', description='Page number', type=int),
    ],
    responses={200: CommentSerializer(many=True)},
    tags=['Comments'],
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_comments(request):
    """
    List comments for a specific object.

    Requires content_type and object_id query parameters.
    """
    content_type_str = request.query_params.get('content_type')
    object_id = request.query_params.get('object_id')

    if not content_type_str or not object_id:
        return Response(
            {'error': 'content_type and object_id are required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Parse content type
    try:
        app_label, model = content_type_str.lower().split('.')
        ct = ContentType.objects.get(app_label=app_label, model=model)
    except (ValueError, ContentType.DoesNotExist):
        return Response(
            {'error': f'Invalid content_type: {content_type_str}'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Get comments (only top-level, replies are nested)
    comments = Comment.objects.filter(
        content_type=ct,
        object_id=object_id,
        parent__isnull=True,
        is_active=True
    ).select_related('author').prefetch_related('replies__author').order_by('-created_at')

    # Paginate
    paginator = CommentPagination()
    page = paginator.paginate_queryset(comments, request)

    serializer = CommentSerializer(page, many=True, context={'request': request})
    return paginator.get_paginated_response(serializer.data)


@extend_schema(
    request=CommentCreateSerializer,
    responses={201: CommentSerializer},
    tags=['Comments'],
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_comment(request):
    """
    Create a new comment.

    All authenticated users can comment.
    """
    serializer = CommentCreateSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        comment = serializer.save()
        return Response(
            CommentSerializer(comment, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    request=CommentUpdateSerializer,
    responses={200: CommentSerializer},
    tags=['Comments'],
)
@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_comment(request, comment_id):
    """
    Update a comment.

    Only the author can update their own comment.
    """
    try:
        comment = Comment.objects.get(id=comment_id, is_active=True)
    except Comment.DoesNotExist:
        return Response({'error': 'Comment not found'}, status=status.HTTP_404_NOT_FOUND)

    # Only author can edit
    if comment.author_id != request.user.id:
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    serializer = CommentUpdateSerializer(comment, data=request.data, partial=True)
    if serializer.is_valid():
        comment = serializer.save()
        return Response(CommentSerializer(comment, context={'request': request}).data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    responses={204: None},
    tags=['Comments'],
)
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_comment(request, comment_id):
    """
    Soft-delete a comment.

    Author can delete their own comments, staff can delete any.
    """
    try:
        comment = Comment.objects.get(id=comment_id, is_active=True)
    except Comment.DoesNotExist:
        return Response({'error': 'Comment not found'}, status=status.HTTP_404_NOT_FOUND)

    # Author or staff can delete
    if comment.author_id != request.user.id and not is_staff_user(request.user):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    # Soft delete
    comment.is_active = False
    comment.save()
    return Response(status=status.HTTP_204_NO_CONTENT)
